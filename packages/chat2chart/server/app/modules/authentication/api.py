from fastapi import APIRouter, Depends, Request, Response, HTTPException, Body
import logging
from app.modules.authentication.deps.auth_bearer import JWTCookieBearer
from app.modules.authentication.auth import Auth
from app.modules.authentication.services import AuthService
from app.core.config import settings
import json
from urllib.parse import unquote
from fastapi import Header
import os
from app.db.session import async_session
from datetime import datetime
from sqlalchemy import select
from app.modules.user.models import User as ChatUser
from sqlalchemy import select
from app.db.session import async_session
from app.modules.user.models import User

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/auth/whoami")
async def whoami(current_token: str = Depends(JWTCookieBearer())):
    """Return decoded JWT payload for current request (dev helper)."""
    payload = Auth().decodeJWT(current_token) or {}
    return {"authenticated": bool(payload), "payload": payload}


@router.get("/auth/whoami-raw")
async def whoami_raw(request: Request):
    """Return raw cookies and Authorization header for debugging CORS/cookies."""
    return {
        "cookies": dict(request.cookies or {}),
        "authorization": request.headers.get("authorization"),
    }


@router.post("/auth/echo")
async def auth_echo(payload: dict | None = Body(None)):
    """Dev helper: echo back the received JSON body to validate POST handling."""
    return {"received": payload}


@router.post("/auth/upgrade-demo")
async def upgrade_demo(request: Request, response: Response, payload: dict | None = Body(None)):
    """Dev helper: upgrade demo_token_* / user cookie into a real c2c_access_token JWT.

    This endpoint is ONLY enabled when ENVIRONMENT == 'development'. It reads the
    `user` cookie (URL-encoded JSON) or demo access_token and issues a real JWT
    (sets `c2c_access_token`). Useful to migrate browser sessions in dev.
    """
    if settings.ENVIRONMENT != "development":
        raise HTTPException(status_code=403, detail="Not allowed in this environment")

    cookies = request.cookies or {}
    # Log masked cookie keys for diagnostics (do not log full token values)
    try:
        cookie_keys = list(cookies.keys())
        logger.info(f"upgrade-demo called - cookies present: {cookie_keys}")
    except Exception:
        logger.info("upgrade-demo called - failed to read cookies")

    user_cookie = cookies.get("user")
    demo_token = cookies.get("access_token")
    # Allow passing demo token or user payload in request body for cases where cookie is on frontend origin
    # Also log the incoming body for diagnostics (mask token values)
    try:
        body_json = payload or (await request.json() if request._body is None else payload)
    except Exception:
        body_json = payload
    try:
        if isinstance(body_json, dict):
            body_keys = list(body_json.keys())
            logger.info(f"upgrade-demo body keys: {body_keys}")
            # Mask demo token length for diagnostics
            if body_json.get('demo_token'):
                dt = str(body_json.get('demo_token'))
                logger.info(f"upgrade-demo received demo_token (len={len(dt)})")
            if body_json.get('user'):
                logger.info("upgrade-demo received user payload in body")
        else:
            logger.info("upgrade-demo received non-dict body")
    except Exception:
        logger.info("upgrade-demo: failed to log body")

    if body_json:
        if not demo_token and body_json.get("demo_token"):
            demo_token = body_json.get("demo_token")
        if not user_cookie and body_json.get("user"):
            user_cookie = body_json.get("user")

    if not user_cookie and not demo_token:
        # Provide more helpful debug detail for dev flows
        logger.warning("upgrade-demo missing both user cookie and demo_token; incoming cookies: %s", list(cookies.keys()))
        raise HTTPException(status_code=400, detail="No demo cookie or demo token provided - ensure the browser sent the legacy demo cookies or include them in the request body as {demo_token,user}")

    payload = {}
    # Try to parse user cookie first (it's URL-encoded JSON in many dev flows)
    if user_cookie:
        try:
            raw = unquote(user_cookie)
            payload = json.loads(raw)
        except Exception:
            payload = {}

    # If payload lacks id, try to infer from demo token pattern demo_token_<id>_...
    if not payload.get("user_id") and demo_token:
        try:
            # demo_token_6_... -> extract 6
            parts = demo_token.split("_")
            if len(parts) >= 3 and parts[0] == "demo" and parts[1] == "token":
                # parts[2] may be id or with prefix, attempt to parse
                maybe_id = parts[2]
                if maybe_id.isdigit():
                    payload["user_id"] = maybe_id
                else:
                    # try to strip trailing
                    digits = ''.join([c for c in maybe_id if c.isdigit()])
                    if digits:
                        payload["user_id"] = digits
        except Exception:
            pass

    if not payload.get("user_id"):
        raise HTTPException(status_code=400, detail="Could not resolve demo user id")

    # Build minimal claims and issue JWT
    # Attempt to resolve the demo legacy id to the canonical UUID present in
    # this service's users table (chat2chart DB). Prefer email/username, then
    # legacy numeric id. This keeps the dev flow clean without adding new
    # migration columns.
    user_id = str(payload.get("user_id"))
    resolved_user_id = None
    try:
        # try email/username/legacy lookup in local users table
        maybe_int = None
        try:
            maybe_int = int(payload.get("user_id"))
        except Exception:
            maybe_int = None

        async def _resolve():
            async with async_session() as sdb:
                q = None
                if payload.get("email"):
                    q = select(User).where(User.email == payload.get("email"))
                elif payload.get("username"):
                    q = select(User).where(User.username == payload.get("username"))
                elif maybe_int is not None:
                    # Many installs kept legacy integer id; user model may have legacy_id
                    try:
                        q = select(User).where(User.legacy_id == maybe_int)
                    except Exception:
                        q = None

                if q is not None:
                    pres = await sdb.execute(q)
                    u = pres.scalar_one_or_none()
                    if u:
                        return str(u.id)
            return None

        try:
            # run resolver
            import asyncio
            resolved = asyncio.get_event_loop().run_until_complete(_resolve())
            if resolved:
                resolved_user_id = resolved
        except Exception:
            resolved_user_id = None
    except Exception:
        resolved_user_id = None

    if resolved_user_id:
        user_id = resolved_user_id

    claims = {"id": user_id, "user_id": user_id, "sub": user_id, "email": payload.get("email")}
    token_pair = Auth().signJWT(**claims)

    # Set namespaced cookie and remove legacy demo cookie
    hostname = request.url.hostname or ""
    secure_flag = False if (settings.ENVIRONMENT == 'development' or hostname.startswith('localhost') or hostname.startswith('127.')) else True
    # Browsers require SameSite=None only when Secure=True. For local dev over HTTP use 'lax'.
    samesite_setting = 'none' if secure_flag else 'lax'
    response.set_cookie(
        key="c2c_access_token",
        value=token_pair["access_token"],
        max_age=settings.JWT_EXP_TIME_MINUTES * 60,
        expires=settings.JWT_EXP_TIME_MINUTES * 60,
        httponly=True,
        secure=secure_flag,
        samesite=samesite_setting,
        path='/'
    )
    # Try to delete legacy demo cookie on server domain
    try:
        response.delete_cookie("access_token", path='/')
        response.delete_cookie("user", path='/')
    except Exception:
        pass

    # Return token in body for dev so client can set cookie if cross-site cookies are blocked
    result = {"upgraded": True, "user_id": user_id}
    if settings.ENVIRONMENT == 'development':
        result["access_token"] = token_pair.get("access_token")
        result["refresh_token"] = token_pair.get("refresh_token")
    return result


@router.post("/internal/provision-user")
async def provision_user(payload: dict = Body(...), x_internal_auth: str | None = Header(None)):
    """Internal endpoint: provision or upsert a minimal user record in chat2chart DB.

    Expected payload: {"id": "<uuid>", "email": "...", "username": "...", "roles": [..]}
    Protect with `X-Internal-Auth` header containing a shared secret (ENV: INTERNAL_PROVISION_SECRET).
    This endpoint is idempotent and safe for retries.
    """
    # Simple auth for internal calls. Construct allowed secrets from multiple
    # sources so dev and CI flows can provision without needing a secret in every
    # runtime (we still require a secret in production).
    cfg_secret = getattr(settings, 'INTERNAL_PROVISION_SECRET', '')
    env_secret = os.getenv('INTERNAL_PROVISION_SECRET', '')
    allowed_secrets = set()
    if cfg_secret:
        allowed_secrets.add(cfg_secret)
    if env_secret:
        allowed_secrets.add(env_secret)
    # In development accept a well-known fallback to reduce friction
    if settings.ENVIRONMENT == 'development':
        allowed_secrets.add('dev-internal-secret')

    if not x_internal_auth or x_internal_auth not in allowed_secrets:
        raise HTTPException(status_code=403, detail="Forbidden")

    uid = payload.get('id')
    email = payload.get('email')
    username = payload.get('username')

    if not uid or not email:
        raise HTTPException(status_code=400, detail='Missing id or email')

    try:
        async with async_session() as db:
            # Try to find existing user by email using a minimal column projection.
            # Some development databases may be mid-migration and miss newer columns
            # (e.g. legacy_id). Selecting only safe columns avoids Datatype/Column
            # mismatch errors when the model expects fields the DB doesn't have.
            try:
                q = select(ChatUser.id, ChatUser.username, ChatUser.email).where(ChatUser.email == email)
                res = await db.execute(q)
                row = res.one_or_none()
                if row:
                    existing_id = row[0]
                    # Update username if changed using a targeted update to avoid loading missing cols
                    if username:
                        await db.execute(
                            ChatUser.__table__.update().where(ChatUser.__table__.c.email == email).values(username=username)
                        )
                        await db.commit()
                    return {"created": False, "id": str(existing_id)}
            except Exception:
                # Fallback: try full ORM lookup but tolerate schema mismatch errors
                try:
                    q = select(ChatUser).where(ChatUser.email == email)
                    res = await db.execute(q)
                    u = res.scalar_one_or_none()
                    if u:
                        changed = False
                        if username and getattr(u, 'username', None) != username:
                            u.username = username
                            changed = True
                        if changed:
                            await db.commit()
                            await db.refresh(u)
                        return {"created": False, "id": str(u.id)}
                except Exception:
                    # swallow and proceed to create new user
                    pass

            # Create new user with provided UUID and ensure default org/project/ownership
            from sqlalchemy.dialects.postgresql import UUID as PG_UUID
            import uuid as _uuid
            try:
                new_uuid = _uuid.UUID(str(uid))
            except Exception:
                new_uuid = _uuid.uuid4()

            # Use a targeted INSERT to avoid touching missing optional columns
            now = datetime.utcnow()
            ins = ChatUser.__table__.insert().values(
                id=new_uuid,
                username=(username or email.split('@')[0]),
                email=email,
                password='',
                created_at=now,
                updated_at=now,
                is_active=True,
                is_deleted=False,
            )
            await db.execute(ins)
            await db.commit()

            # Ensure default organization and project are created for this user and membership is added
            try:
                from app.modules.projects.services import ProjectService, OrganizationService
                # best-effort: create default organization and project and add membership
                try:
                    org_svc = OrganizationService()
                    default_org = await org_svc.create_default_organization(str(new_uuid))
                except Exception:
                    default_org = None

                if default_org:
                    try:
                        proj_svc = ProjectService()
                        new_proj = await proj_svc.create_project({"name":"Default Project","description":"Auto-created default project for user","organization_id": default_org.id}, str(new_uuid))
                    except Exception:
                        pass
            except Exception:
                pass

            # Read back the created user id
            return {"created": True, "id": str(new_uuid)}
    except Exception as e:
        # Do not propagate provisioning failures to caller; provision is
        # best-effort. Return created=False so upstream callers can continue.
        logger.exception('Failed to provision user (non-fatal): %s', e)
        return {"created": False, "id": None}


@router.post("/auth/logout")
async def logout(request: Request, response: Response, current_token: str = Depends(JWTCookieBearer())):
    """Logout user: revoke refresh token and clear cookies"""
    try:
        # Attempt to revoke persisted refresh token (if present)
        auth_service = AuthService()
        # Try cookie first
        refresh_token = request.cookies.get('refresh_token')
        # Fallback: Authorization header may contain bearer refresh token (rare)
        if not refresh_token:
            auth_header = request.headers.get('Authorization') or request.headers.get('authorization')
            if auth_header and auth_header.lower().startswith('bearer '):
                refresh_token = auth_header.split(None, 1)[1].strip()

        if refresh_token:
            try:
                await auth_service.revoke_refresh_token(refresh_token)
            except Exception:
                logger.exception('Failed to revoke refresh token during logout')

        # Clear cookies
        response.delete_cookie('c2c_access_token', path='/')
        response.delete_cookie('refresh_token', path='/')

        return {"success": True, "message": "Logged out"}
    except Exception as e:
        logger.error(f"Logout failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auth/dev-create-dashboard")
async def dev_create_dashboard(request: Request, payload: dict | None = Body(None)):
    """Dev-only helper: create a dashboard for an inferred demo user.

    Accepts a minimal dashboard payload in the body or a legacy `demo_token` / `user` value
    to infer the user id. Only enabled when ENVIRONMENT == 'development'. Returns the
    created dashboard JSON on success.
    """
    if settings.ENVIRONMENT != "development":
        raise HTTPException(status_code=403, detail="Not allowed in this environment")

    cookies = request.cookies or {}
    user_cookie = cookies.get("user")
    demo_token = cookies.get("access_token")
    body = payload or {}

    if not demo_token and body.get("demo_token"):
        demo_token = body.get("demo_token")
    if not user_cookie and body.get("user"):
        user_cookie = body.get("user")

    resolved = {}
    if user_cookie:
        try:
            raw = unquote(user_cookie)
            resolved = json.loads(raw)
        except Exception:
            resolved = {}

    if not resolved.get("user_id") and demo_token:
        try:
            parts = demo_token.split("_")
            if len(parts) >= 3 and parts[0] == "demo" and parts[1] == "token":
                maybe_id = parts[2]
                digits = ''.join([c for c in maybe_id if c.isdigit()])
                if digits:
                    resolved["user_id"] = digits
        except Exception:
            pass

    if not resolved.get("user_id"):
        raise HTTPException(status_code=400, detail="Could not resolve demo user id")

    user_id = str(resolved.get("user_id"))

    # Build dashboard payload from request body (best-effort)
    dash_payload = {
        "name": body.get("name", "Dev Dashboard"),
        "description": body.get("description"),
        "layout_config": body.get("layout_config") or {},
        "theme_config": body.get("theme_config") or {},
        "global_filters": body.get("global_filters") or {"items": []},
        "refresh_interval": body.get("refresh_interval") or 300,
        "is_public": bool(body.get("is_public", False)),
        "is_template": bool(body.get("is_template", False)),
        "project_id": body.get("project_id")
    }

    try:
        from app.modules.charts.services.dashboard_service import DashboardService
        from app.db.session import async_session
        from app.modules.charts.schemas import DashboardCreateSchema

        schema = DashboardCreateSchema.model_validate(dash_payload)
        async with async_session() as db:
            svc = DashboardService(db)
            created = await svc.create_dashboard(schema, int(user_id))
            return {"success": True, "dashboard": created}
    except Exception as e:
        logger.exception("Dev create dashboard failed")
        raise HTTPException(status_code=500, detail=str(e))


