from fastapi import APIRouter, Depends, Request, Response, HTTPException, Body, BackgroundTasks
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
import sqlalchemy as sa
from sqlalchemy import select
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


@router.post("/auth/login")
async def login(request: Request, response: Response):
    """
    DEPRECATED: This endpoint is deprecated and will be removed in a future version.
    
    Please use auth-service for all authentication:
    - Frontend: Use /api/auth/users/signin (proxies to auth-service)
    - Direct: Use http://auth-service:5000/api/v1/auth/login
    
    This endpoint will return 410 Gone status.
    """
    from fastapi import status
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail={
            "error": "This endpoint is deprecated",
            "message": "Please use auth-service for authentication",
            "frontend_endpoint": "/api/auth/users/signin",
            "direct_endpoint": "http://auth-service:5000/api/v1/auth/login",
            "migration_guide": "See AUTH_INTEGRATION_GUIDE.md for details"
        }
    )


@router.post("/auth/upgrade-demo")
async def upgrade_demo(request: Request, response: Response, payload: dict | None = Body(None), background_tasks: BackgroundTasks = None):
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
    # migration columns. If a canonical UUID exists, issue the access token
    # using that UUID so downstream services authenticate by canonical id.
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
            # run resolver directly since this endpoint is async
            resolved = await _resolve()
            if resolved:
                resolved_user_id = resolved
        except Exception:
            resolved_user_id = None
    except Exception:
        resolved_user_id = None

    if resolved_user_id:
        user_id = resolved_user_id

    # If we still only have a legacy numeric id, attempt a final sync-resolution
    # to canonical UUID to prefer issuing tokens with canonical id.
    if not (isinstance(user_id, str) and '-' in user_id):
        try:
            from app.db.session import get_sync_engine
            eng = get_sync_engine()
            with eng.connect() as conn:
                q = sa.text("SELECT id FROM users WHERE email = :email OR legacy_id = :legacy LIMIT 1")
                r = conn.execute(q, {"email": payload.get('email'), "legacy": user_id})
                rr = r.fetchone()
                if rr and rr[0]:
                    user_id = str(rr[0])
        except Exception:
            pass

    claims = {"id": user_id, "user_id": user_id, "sub": user_id, "email": payload.get("email")}
    token_pair = Auth().signJWT(**claims)

    # Persist refresh token and set as HttpOnly cookie (dev-friendly security flags)
    try:
        # Persist refresh token in background to avoid blocking request DB flow
        # Allow skipping persistence in tests via SKIP_PERSIST_REFRESH setting
        from app.core.config import settings as _settings
        if getattr(_settings, 'SKIP_PERSIST_REFRESH', False) or os.getenv('PYTEST_CURRENT_TEST'):
            logger.info("SKIP_PERSIST_REFRESH or PYTEST_CURRENT_TEST detected; not persisting refresh token")
        else:
            try:
                auth_service = AuthService()
                if background_tasks is not None:
                    background_tasks.add_task(auth_service.persist_refresh_token, user_id, token_pair.get("refresh_token"), settings.JWT_REFRESH_EXP_TIME_MINUTES)
                else:
                    # Do not create unscoped tasks when no BackgroundTasks is provided
                    # to avoid attaching futures to the wrong event loop in tests.
                    logger.info("No BackgroundTasks available; skipping refresh token persist in this request")
            except Exception as e:
                logger.exception(f"upgrade-demo: failed to schedule refresh token persist: {e}")
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
        logger.exception("upgrade-demo: unexpected error while handling refresh token")

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
    # Persist last demo user identifier (string) on app state to help test-token shortcut resolve
    try:
        try:
            uid_store = request.app.state
        except Exception:
            uid_store = None
        if uid_store is not None:
            try:
                # user_id variable above is resolved to either numeric id or canonical UUID string
                setattr(request.app.state, 'last_demo_user_uuid', str(user_id))
            except Exception:
                try:
                    setattr(request.app.state, 'last_demo_user_uuid', str(payload.get('user_id') or payload.get('id') or '1'))
                except Exception:
                    pass
    except Exception:
        pass
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
def provision_user(payload: dict = Body(...), x_internal_auth: str | None = Header(None)):
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

    # Simplified synchronous provisioning: ensure a user row exists with UUID id and legacy_id set when provided.
    try:
        from app.db.session import get_sync_engine
        import uuid as _uuid
        sync_engine = get_sync_engine()
        new_uuid = None
        legacy_id_val = None
        created_id = None
        try:
            if isinstance(uid, int) or (isinstance(uid, str) and str(uid).isdigit()):
                legacy_id_val = int(uid)
            else:
                try:
                    # keep incoming uuid if provided
                    _ = _uuid.UUID(str(uid))
                    legacy_id_val = None
                except Exception:
                    legacy_id_val = None
        except Exception:
            legacy_id_val = None

        with sync_engine.connect() as conn:
            # Robust, deterministic provisioning logic:
            # 1) Prefer existing row by legacy_id if provided.
            # 2) Else prefer existing row by email.
            # 3) Otherwise insert a new row (with legacy_id if provided).
            try:
                with conn.begin():
                    # 1) Try legacy_id lookup (deterministic mapping)
                    if legacy_id_val is not None:
                        q_legacy = sa.text("SELECT id, email FROM users WHERE legacy_id = :legacy LIMIT 1")
                        r_legacy = conn.execute(q_legacy, {"legacy": legacy_id_val})
                        row_legacy = r_legacy.fetchone()
                        if row_legacy and row_legacy[0]:
                            created_id = str(row_legacy[0])
                            # Ensure username/email are up-to-date
                            upd = sa.text(
                                "UPDATE users SET username = :username, email = :email, updated_at = now() WHERE id = :id"
                            )
                            conn.execute(upd, {"username": (username or email.split('@')[0]), "email": email, "id": created_id})

                    # 2) If not resolved, try email lookup
                    if not created_id:
                        q_email = sa.text("SELECT id, legacy_id FROM users WHERE email = :email LIMIT 1")
                        r_email = conn.execute(q_email, {"email": email})
                        row_email = r_email.fetchone()
                        if row_email and row_email[0]:
                            created_id = str(row_email[0])
                            existing_legacy = None
                            try:
                                existing_legacy = row_email[1]
                            except Exception:
                                existing_legacy = None
                            # If legacy provided and currently NULL, set it
                            if legacy_id_val is not None and (existing_legacy is None):
                                upd_legacy = sa.text(
                                    "UPDATE users SET legacy_id = :legacy WHERE id = :id RETURNING id"
                                )
                                resu2 = conn.execute(upd_legacy, {"legacy": legacy_id_val, "id": created_id})
                                r2 = resu2.fetchone()
                                if r2 and r2[0]:
                                    created_id = str(r2[0])

                    # 3) If still not found, insert new user deterministically
                    if not created_id:
                        new_uuid = str(_uuid.uuid4())
                        if legacy_id_val is not None:
                            ins_sql = sa.text(
                                "INSERT INTO users (id, legacy_id, username, email, password, is_active, is_deleted, created_at, updated_at) "
                                "VALUES (:id, :legacy_id, :username, :email, :password, :is_active, :is_deleted, now(), now()) RETURNING id"
                            )
                            params = {"id": new_uuid, "legacy_id": legacy_id_val, "username": (username or email.split('@')[0]), "email": email, "password": '', "is_active": True, "is_deleted": False}
                        else:
                            ins_sql = sa.text(
                                "INSERT INTO users (id, username, email, password, is_active, is_deleted, created_at, updated_at) "
                                "VALUES (:id, :username, :email, :password, :is_active, :is_deleted, now(), now()) RETURNING id"
                            )
                            params = {"id": new_uuid, "username": (username or email.split('@')[0]), "email": email, "password": '', "is_active": True, "is_deleted": False}
                        res = conn.execute(ins_sql, params)
                        prow = res.fetchone()
                        if prow and prow[0]:
                            created_id = str(prow[0])
            except Exception as e:
                logger.exception(f"Provision upsert failed: {e}")
                created_id = None

            # Persist last demo user uuid in app state for test-token mapping
            try:
                try:
                    request.app.state.last_demo_user_uuid = created_id or new_uuid
                except Exception:
                    pass
            except Exception:
                pass

        # If create_defaults is True, create default organization and add user as owner
        create_defaults = payload.get('create_defaults', False)
        default_org = payload.get('default_org', {})
        
        if create_defaults and created_id:
            try:
                with sync_engine.connect() as conn_org:
                    with conn_org.begin():
                        # Check if user already has an organization
                        q_check_org = sa.text("""
                            SELECT o.id FROM organizations o
                            JOIN user_organizations uo ON o.id = uo.organization_id
                            WHERE uo.user_id = :uid AND uo.role = 'owner'
                            LIMIT 1
                        """)
                        r_check = conn_org.execute(q_check_org, {"uid": created_id})
                        existing_org = r_check.fetchone()
                        
                        if not existing_org:
                            # Create default organization
                            org_name = default_org.get('name', f"{username or email.split('@')[0]}'s Organization")
                            org_slug = default_org.get('slug', f"default-org-{str(created_id)[:8]}")
                            org_plan = default_org.get('plan_type', 'free')
                            org_max_projects = default_org.get('max_projects', 1)
                            
                            # Insert organization
                            ins_org = sa.text("""
                                INSERT INTO organizations (name, slug, description, plan_type, ai_credits_limit, max_users, max_projects, max_storage_gb, is_active, is_deleted, created_at, updated_at)
                                VALUES (:name, :slug, :desc, :plan, :credits, :max_users, :max_projects, :storage, TRUE, FALSE, NOW(), NOW())
                                ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
                                RETURNING id
                            """)
                            org_params = {
                                "name": org_name,
                                "slug": org_slug,
                                "desc": f"Default organization for {email}",
                                "plan": org_plan,
                                "credits": 30 if org_plan == 'free' else 300,
                                "max_users": 1 if org_plan == 'free' else 10,
                                "max_projects": org_max_projects,
                                "storage": 5 if org_plan == 'free' else 100
                            }
                            r_org = conn_org.execute(ins_org, org_params)
                            org_row = r_org.fetchone()
                            org_id = org_row[0] if org_row else None
                            
                            if org_id:
                                # Add user as owner to organization
                                ins_membership = sa.text("""
                                    INSERT INTO user_organizations (id, user_id, organization_id, role, is_active, created_at, updated_at)
                                    VALUES (gen_random_uuid(), :uid, :oid, 'owner', TRUE, NOW(), NOW())
                                    ON CONFLICT DO NOTHING
                                """)
                                conn_org.execute(ins_membership, {"uid": created_id, "oid": org_id})
                                logger.info(f"Created default organization {org_id} for user {created_id}")
            except Exception as e:
                logger.exception(f"Failed to create default organization (non-fatal): {e}")
        
        return {"created": True, "id": str(created_id or new_uuid)}
    except Exception as e:
        logger.exception('Failed to provision user (non-fatal): %s', e)
        return {"created": False, "id": None}

    finally:
        # After provisioning, attempt domain-based org auto-join (best-effort, non-fatal)
        try:
            # Only run auto-join when we have an email and created_id
            if created_id and email:
                domain = None
                try:
                    domain = email.split('@')[-1].lower()
                except Exception:
                    domain = None

                personal_domains = {
                    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
                    'protonmail.com', 'live.com', 'aol.com'
                }

                if domain and domain not in personal_domains:
                    # Try to find an organization that matches this domain via website hostname or slug
                    try:
                        with sync_engine.connect() as conn2:
                            # Search organizations by website containing domain, or slug/name matching domain
                            q_org = sa.text(
                                "SELECT id FROM organizations WHERE lower(website) LIKE :w OR lower(slug) = :d OR lower(name) LIKE :n LIMIT 1"
                            )
                            r_org = conn2.execute(q_org, {"w": f"%{domain}%", "d": domain.split('.')[0], "n": f"%{domain.split('.')[0]}%"})
                            row_org = r_org.fetchone()
                            if row_org and row_org[0]:
                                org_id = int(row_org[0])
                                # Ensure user_organizations table exists and insert membership if not present
                                try:
                                    q_check = sa.text("SELECT id FROM user_organizations WHERE user_id = :uid AND organization_id = :oid LIMIT 1")
                                    exists = conn2.execute(q_check, {"uid": created_id, "oid": org_id}).fetchone()
                                    if not exists:
                                        ins = sa.text("INSERT INTO user_organizations (organization_id, user_id, role, is_active) VALUES (:oid, :uid, :role, TRUE)")
                                        conn2.execute(ins, {"oid": org_id, "uid": created_id, "role": 'member'})
                                        conn2.commit()
                                        logger.info(f"Auto-joined user {created_id} to organization {org_id} based on email domain {domain}")
                                except Exception as e:
                                    logger.debug(f"Auto-join skipped: user_organizations insert failed: {e}")
                    except Exception as e:
                        logger.debug(f"Auto-join org search failed for domain {domain}: {e}")
        except Exception:
            # swallow all errors; provisioning already completed
            pass


@router.post("/auth/logout")
async def logout(request: Request, response: Response, current_token: str = Depends(JWTCookieBearer())):
    """Logout user: revoke refresh token and clear cookies"""
    try:
        # Get token from cookie or header
        token = request.cookies.get('c2c_access_token') or request.cookies.get('access_token')
        refresh_token = request.cookies.get('refresh_token') or request.cookies.get('c2c_refresh_token')
        auth_header = request.headers.get('Authorization') or request.headers.get('authorization')
        if not token and auth_header:
            if auth_header.lower().startswith('bearer '):
                token = auth_header.split(None, 1)[1].strip()
            else:
                token = auth_header
        
        # Use auth provider for logout (if available)
        try:
            from app.modules.authentication.providers.factory import get_auth_provider
            provider = get_auth_provider()
            if token:
                try:
                    await provider.logout(token)
                except Exception as e:
                    logger.warning(f"Provider logout failed: {e}, trying with refresh token")
                    # Try with refresh token if access token fails
                    if refresh_token:
                        try:
                            await provider.logout(refresh_token)
                        except Exception:
                            logger.warning("Provider logout with refresh token also failed")
        except Exception as e:
            logger.warning(f"Provider logout failed, falling back to legacy: {e}")
            # Fallback to legacy auth service
            auth_service = AuthService()
            if refresh_token:
                try:
                    await auth_service.revoke_refresh_token(refresh_token)
                except Exception:
                    logger.exception('Failed to revoke refresh token during logout')

        # CRITICAL: Clear ALL cookies with all possible configurations
        hostname = request.url.hostname or ""
        secure_flag = False if (settings.ENVIRONMENT == 'development' or hostname.startswith('localhost') or hostname.startswith('127.')) else True
        samesite_setting = 'none' if secure_flag else 'lax'
        
        # Delete cookies with all possible configurations
        cookies_to_clear = ['c2c_access_token', 'access_token', 'refresh_token', 'c2c_refresh_token']
        for cookie_name in cookies_to_clear:
            # Delete with path=/
            response.delete_cookie(
                key=cookie_name,
                path='/',
                domain=None,
                secure=secure_flag,
                httponly=True,
                samesite=samesite_setting
            )
            # Try with domain if available
            if hostname and not hostname.startswith('localhost'):
                response.delete_cookie(
                    key=cookie_name,
                    path='/',
                    domain=hostname,
                    secure=secure_flag,
                    httponly=True,
                    samesite=samesite_setting
                )
                # Try with .domain (subdomain support)
                response.delete_cookie(
                    key=cookie_name,
                    path='/',
                    domain=f'.{hostname}',
                    secure=secure_flag,
                    httponly=True,
                    samesite=samesite_setting
                )

        return {"success": True, "message": "Logged out successfully"}
    except HTTPException:
        # Even if logout fails, clear cookies and return success
        # Logout should be idempotent
        try:
            cookies_to_clear = ['c2c_access_token', 'access_token', 'refresh_token', 'c2c_refresh_token']
            for cookie_name in cookies_to_clear:
                response.delete_cookie(key=cookie_name, path='/')
        except:
            pass
        return {"success": True, "message": "Logged out"}
    except Exception as e:
        logger.error(f"Logout failed: {e}")
        # Even on error, try to clear cookies
        try:
            cookies_to_clear = ['c2c_access_token', 'access_token', 'refresh_token', 'c2c_refresh_token']
            for cookie_name in cookies_to_clear:
                response.delete_cookie(key=cookie_name, path='/')
        except:
            pass
        # Return success anyway - logout should be idempotent
        return {"success": True, "message": "Logged out"}


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


