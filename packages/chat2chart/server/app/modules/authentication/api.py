from fastapi import APIRouter, Depends, Request, Response, HTTPException, Body
import logging
from app.modules.authentication.deps.auth_bearer import JWTCookieBearer
from app.modules.authentication.auth import Auth
from app.core.config import settings
import json
from urllib.parse import unquote

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
    user_id = str(payload.get("user_id"))
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


