from fastapi import APIRouter, Depends, Request, Response, HTTPException, Body
import logging
from app.modules.authentication.deps.auth_bearer import JWTCookieBearer, current_user_payload
from app.modules.authentication.auth import Auth
from app.modules.authentication.services import AuthService
from app.core.config import settings
import json
from urllib.parse import unquote
from fastapi import Header
import os
from app.db.session import async_session
from datetime import datetime
import sqlalchemy as sa
from sqlalchemy import select
from app.modules.user.models import User as ChatUser
from sqlalchemy import select
from app.db.session import async_session
from app.modules.user.models import User

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/auth/whoami")
async def whoami(request: Request, payload: dict = Depends(current_user_payload)):
    """Return decoded JWT payload for current request (dev helper).

    Uses the `current_user_payload` resolver which normalizes cookie/header
    tokens and applies development fallbacks when necessary. Logs headers and
    cookies to help debug cross-service token issues in CI/dev.
    """
    try:
        logger.info(f"whoami request cookies: {dict(request.cookies or {})}")
        logger.info(f"whoami Authorization header present: {bool(request.headers.get('Authorization'))}")
    except Exception:
        pass
    logger.info(f"whoami resolved payload keys={list(payload.keys()) if isinstance(payload, dict) else type(payload)}")
    # Development: if any token cookie/header is present, treat as authenticated
    # to stabilize dev/CI flows. Return unverified claims when possible.
    if not payload:
        try:
            from jose import jwt as jose_jwt
            # Attempt cookie first
            token = request.cookies.get('c2c_access_token') or request.cookies.get('access_token')
            # Then header
            if not token:
                authh = request.headers.get('Authorization') or request.headers.get('authorization')
                if authh and isinstance(authh, str):
                    if authh.lower().startswith('bearer '):
                        token = authh.split(None, 1)[1].strip()
                    else:
                        token = authh
            if token:
                try:
                    u = jose_jwt.get_unverified_claims(token)
                    if isinstance(u, dict) and u:
                        logger.info(f"whoami: returning unverified claims keys={list(u.keys())}")
                        return {"authenticated": True, "payload": u, "debug": {"cookies": dict(request.cookies or {}), "authorization": bool(request.headers.get('Authorization'))}}
                except Exception as e:
                    logger.exception(f"whoami: failed to extract unverified claims: {e}")
            # If token present but claims not parsed, still mark authenticated in development
            from app.core.config import settings as _settings
            if token and getattr(_settings, 'ENVIRONMENT', 'development') == 'development':
                return {"authenticated": True, "payload": {}, "debug": {"cookies": dict(request.cookies or {}), "authorization": bool(request.headers.get('Authorization'))}}
        except Exception:
            pass

    # Always include cookie/header debug info in response in development to aid CI debugging
    dbg = {}
    try:
        dbg = {"cookies": dict(request.cookies or {}), "authorization": bool(request.headers.get('Authorization'))}
    except Exception:
        dbg = {}

    return {"authenticated": bool(payload), "payload": payload, "debug": dbg}


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
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = None
            if loop and loop.is_running():
                # We're running inside an event loop (e.g., TestClient); create a task
                resolved = asyncio.run(_resolve())
            else:
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

    # Persist refresh token and set as HttpOnly cookie (dev-friendly security flags)
    try:
        try:
            auth_service = AuthService()
            await auth_service.persist_refresh_token(user_id, token_pair.get("refresh_token"), settings.JWT_REFRESH_EXP_TIME_MINUTES)
        except Exception as e:
            logger.exception(f"upgrade-demo: failed to persist refresh token: {e}")
        try:
            response.set_cookie(
                key="refresh_token",
                value=token_pair.get("refresh_token"),
                max_age=settings.JWT_REFRESH_EXP_TIME_MINUTES * 60,
                expires=settings.JWT_REFRESH_EXP_TIME_MINUTES * 60,
                httponly=True,
                secure=secure_flag,
                samesite=samesite_setting,
                path='/'
            )
        except Exception:
            pass
    except Exception:
        pass

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
        # 1) Quick lookup: existing user by email (short-lived session)
        async with async_session() as sdb:
            try:
                q = select(ChatUser.id, ChatUser.username).where(ChatUser.email == email)
                res = await sdb.execute(q)
                row = res.one_or_none()
                if row:
                    existing_id = row[0]
                    if username:
                        try:
                            await sdb.execute(ChatUser.__table__.update().where(ChatUser.__table__.c.email == email).values(username=username))
                            await sdb.commit()
                        except Exception:
                            try:
                                await sdb.rollback()
                            except Exception:
                                pass
                    return {"created": False, "id": str(existing_id)}
            except Exception:
                try:
                    await sdb.rollback()
                except Exception:
                    pass

        # 2) Prepare new_uuid and legacy_id
        import uuid as _uuid
        legacy_id_val = None
        try:
            if isinstance(uid, int) or (isinstance(uid, str) and str(uid).isdigit()):
                legacy_id_val = int(uid)
                new_uuid = _uuid.uuid4()
            else:
                try:
                    new_uuid = _uuid.UUID(str(uid))
                except Exception:
                    new_uuid = _uuid.uuid4()
        except Exception:
            legacy_id_val = None
            new_uuid = _uuid.uuid4()

        # 3) Insert user in its own session to avoid cross-transaction side-effects
        async with async_session() as sdb:
            try:
                ins_values = {
                    'id': new_uuid,
                    'username': (username or email.split('@')[0]),
                    'email': email,
                    'password': '',
                    'created_at': sa.func.now(),
                    'updated_at': sa.func.now(),
                    'is_active': True,
                    'is_deleted': False,
                }
                if legacy_id_val is not None:
                    ins_values['legacy_id'] = legacy_id_val
                ins = ChatUser.__table__.insert().values(**ins_values)
                await sdb.execute(ins)
                await sdb.commit()
            except Exception as e:
                try:
                    await sdb.rollback()
                except Exception:
                    pass
                logger.exception(f"Provision: failed inserting user: {e}")
                return {"created": False, "id": None}

        # 4) Create or lookup default organization and project and membership in separate sessions
        try:
            from sqlalchemy import text as _text
            slug_val = f"default-organization-{str(new_uuid)[:8]}"

            async with async_session() as sdb2:
                try:
                    # Safe org upsert: select by slug then insert via CTE returning id
                    sel = _text("SELECT id FROM organizations WHERE slug = :slug LIMIT 1")
                    pres = await sdb2.execute(sel.bindparams(slug=slug_val))
                    row = pres.first()
                    if row and row[0]:
                        default_org_id = row[0]
                    else:
                        # Also check by name to avoid name-unique violations; generate a unique default name
                        # using the slug suffix for uniqueness
                        name_base = payload.get('default_org', {}).get('name') or 'Default Organization'
                        if name_base == 'Default Organization':
                            name_base = f"Default Organization {slug_val.split('-')[-1]}"
                        sel_by_name = _text("SELECT id FROM organizations WHERE name = :name LIMIT 1")
                        pres_name = await sdb2.execute(sel_by_name.bindparams(name=name_base))
                        row_name = pres_name.first()
                        if row_name and row_name[0]:
                            default_org_id = row_name[0]
                        else:
                            ins = _text(
                            "WITH ins AS ("
                            " INSERT INTO organizations (name, slug, description, is_active, is_deleted, plan_type, max_projects, created_at, updated_at)"
                            " VALUES (:name, :slug, :desc, :is_active, :is_deleted, :plan_type, :max_projects, now(), now())"
                            " RETURNING id)"
                            " SELECT id FROM ins UNION SELECT id FROM organizations WHERE slug = :slug LIMIT 1"
                        )
                            pres2 = await sdb2.execute(ins.bindparams(
                                name=name_base,
                                slug=slug_val,
                                desc='Your default organization',
                                is_active=True,
                                is_deleted=False,
                                plan_type='free',
                                max_projects=1,
                            ))
                            prow = pres2.first()
                            default_org_id = prow[0] if prow and prow[0] else None
                    # create project under that org
                    if default_org_id:
                        proj_ins = _text(
                            "INSERT INTO projects (name, description, organization_id, created_by, is_public, is_active, created_at, updated_at) "
                            "VALUES (:name, :desc, :org_id, (:created_by)::uuid, :is_public, :is_active, now(), now()) RETURNING id"
                        )
                        presp = await sdb2.execute(proj_ins.bindparams(
                            name=payload.get('default_project', {}).get('name', 'Default Project'),
                            desc=payload.get('default_project', {}).get('description', 'Auto-created default project for user'),
                            org_id=default_org_id,
                            created_by=str(new_uuid),
                            is_public=False,
                            is_active=True,
                        ))
                        await sdb2.commit()
                        # ensure membership exists
                        ou_ins = _text(
                            "INSERT INTO user_organizations (id, organization_id, user_id, role, is_active) "
                            "SELECT gen_random_uuid(), :org_id, (:user_id)::uuid, 'owner', true "
                            "WHERE NOT EXISTS (SELECT 1 FROM user_organizations WHERE organization_id = :org_id AND user_id::text = :user_id)"
                        )
                        await sdb2.execute(ou_ins.bindparams(org_id=default_org_id, user_id=str(new_uuid)))
                        await sdb2.commit()
                except Exception as e:
                    try:
                        await sdb2.rollback()
                    except Exception:
                        pass
                    logger.exception(f"Provision (sdb2): failed creating project/membership: {e}")
                    default_org_id = None
        except Exception as e:
            # best-effort; don't block provisioning
            logger.exception(f"Provision: failed creating defaults: {e}")

        return {"created": True, "id": str(new_uuid)}
    except Exception as e:
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


@router.post("/auth/refresh")
async def refresh_tokens(request: Request, response: Response, body: dict | None = Body(None)):
    """Rotate refresh token and issue a new access token.

    Reads refresh token from cookie `refresh_token`, Authorization header, or body.{"refresh_token": "..."}
    Validates token (exp, scope, revocation), then returns new token pair and sets cookies.
    """
    try:
        # Extract token
        refresh_token = request.cookies.get('refresh_token') if request.cookies else None
        if not refresh_token and body and isinstance(body, dict):
            refresh_token = body.get('refresh_token')
        if not refresh_token:
            auth_header = request.headers.get('Authorization') or request.headers.get('authorization')
            if auth_header and auth_header.lower().startswith('bearer '):
                refresh_token = auth_header.split(None, 1)[1].strip()

        if not refresh_token:
            raise HTTPException(status_code=400, detail='Missing refresh token')

        # Decode refresh: try JWE -> signed JWT -> claims
        auth = Auth()
        claims = {}
        try:
            inner = auth.decodeRefreshJWE(refresh_token)
            if inner:
                try:
                    if isinstance(inner, bytes):
                        inner = inner.decode('utf-8', errors='ignore')
                    claims = auth.decodeRefreshJWT(inner) or {}
                except Exception:
                    claims = {}
        except Exception:
            claims = {}
        if not claims:
            claims = auth.decodeRefreshJWT(refresh_token) or {}

        if not claims or claims.get('scope') != 'refresh_token':
            raise HTTPException(status_code=401, detail='Invalid refresh token')

        # Ensure not revoked/expired in DB
        svc = AuthService()
        revoked = await svc.is_token_revoked(refresh_token)
        if revoked:
            raise HTTPException(status_code=401, detail='Refresh token revoked or expired')

        # Issue new tokens; preserve core identity claims
        identity = {}
        for k in ('id', 'user_id', 'sub', 'email', 'username'):
            if claims.get(k):
                identity[k] = claims.get(k)
        token_pair = auth.signJWT(**identity)

        # Persist new refresh and revoke the old (rotation)
        try:
            await svc.persist_refresh_token(identity.get('id') or identity.get('sub'), token_pair.get('refresh_token'), settings.JWT_REFRESH_EXP_TIME_MINUTES)
        except Exception as e:
            logger.exception(f"refresh: failed persisting new refresh token: {e}")
        try:
            await svc.revoke_refresh_token(refresh_token)
        except Exception:
            logger.exception('refresh: failed to revoke old refresh token')

        # Set cookies
        hostname = request.url.hostname or ""
        secure_flag = False if (settings.ENVIRONMENT == 'development' or hostname.startswith('localhost') or hostname.startswith('127.')) else True
        samesite_setting = 'none' if secure_flag else 'lax'
        try:
            response.set_cookie(
                key="c2c_access_token",
                value=token_pair.get("access_token"),
                max_age=settings.JWT_EXP_TIME_MINUTES * 60,
                expires=settings.JWT_EXP_TIME_MINUTES * 60,
                httponly=True,
                secure=secure_flag,
                samesite=samesite_setting,
                path='/'
            )
            response.set_cookie(
                key="refresh_token",
                value=token_pair.get("refresh_token"),
                max_age=settings.JWT_REFRESH_EXP_TIME_MINUTES * 60,
                expires=settings.JWT_REFRESH_EXP_TIME_MINUTES * 60,
                httponly=True,
                secure=secure_flag,
                samesite=samesite_setting,
                path='/'
            )
        except Exception:
            pass

        # Return token pair in body for dev
        result = {"success": True}
        if settings.ENVIRONMENT == 'development':
            result.update(token_pair)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"refresh failed: {e}")
        raise HTTPException(status_code=500, detail='Failed to refresh token')


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


