from datetime import datetime, timedelta
from uuid import uuid4
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Request, Response

from app.core.config import settings
from app.modules.authentication.auth import Auth
from app.modules.device_session.repository import DeviceSessionRepository
from app.modules.device_session.schemas import DeviceSessionCreate


router = APIRouter(prefix="/auth", tags=["auth"])


def _secure_cookie_flags(hostname: Optional[str] = None):
    host = (hostname or "").lower()
    secure_flag = not (settings.ENVIRONMENT == "development" or host.startswith("localhost") or host.startswith("127."))
    samesite_setting = "none" if secure_flag else "lax"
    return secure_flag, samesite_setting


@router.post("/refresh")
async def refresh_tokens(request: Request, response: Response, body: dict | None = Body(None)):
    """Rotate refresh token and issue a new access token.

    Sources refresh token from cookie `refresh_token`, Authorization header, or JSON body.
    Uses DeviceSession to revoke the old token and persist the new one (best-effort).
    """
    # 1) Extract incoming refresh token
    refresh_token: Optional[str] = None
    try:
        refresh_token = (request.cookies or {}).get("refresh_token")
    except Exception:
        refresh_token = None
    if not refresh_token and body and isinstance(body, dict):
        refresh_token = body.get("refresh_token")
    if not refresh_token:
        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            refresh_token = auth_header.split(None, 1)[1].strip()

    if not refresh_token:
        raise HTTPException(status_code=400, detail="Missing refresh token")

    # 2) Decode and validate the refresh token
    auth = Auth()
    claims = auth.decodeRefreshJWT(refresh_token) or {}
    if not claims or claims.get("scope") != "refresh_token":
        # Accept JWE fallback if decodeRefreshJWT failed and the token was JWE (not used currently)
        inner = auth.decodeRefreshJWE(refresh_token) or {}
        if isinstance(inner, (bytes, str)):
            try:
                claims = auth.decodeRefreshJWT(inner if isinstance(inner, str) else inner.decode("utf-8", errors="ignore")) or {}
            except Exception:
                claims = {}
    if not claims or claims.get("scope") != "refresh_token":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    # 3) Rotate: issue a new token pair based on identity claims
    identity = {k: v for k, v in claims.items() if k in ("id", "user_id", "sub", "email", "username") and v is not None}
    token_pair = auth.signJWT(**identity)

    # 4) Persist new refresh token (best effort) and revoke the old
    try:
        repo = DeviceSessionRepository()
        try:
            await repo.revoke_by_token(refresh_token)
        except Exception:
            # ignore if not present
            pass
        try:
            # Build a new device session row; device info best-effort
            exp_at = datetime.utcnow() + timedelta(minutes=settings.JWT_REFRESH_EXP_TIME_MINUTES)
            create = DeviceSessionCreate(
                user_id=identity.get("id") or identity.get("sub") or identity.get("user_id"),
                device_id=uuid4(),
                device_type="web",
                device_name="browser",
                ip_address=(request.client.host if request and request.client else None),
                user_agent=request.headers.get("user-agent") if request else None,
                is_active=True,
                refresh_token=token_pair.get("refresh_token"),
                refresh_token_expires_at=exp_at,
            )
            await repo.create(create)
        except Exception:
            # tolerate schema/type mismatches across envs
            pass
    except Exception:
        # Do not block rotation on persistence issues
        pass

    # 5) Set cookies for access and refresh
    secure_flag, samesite = _secure_cookie_flags(request.url.hostname if request and request.url else None)
    try:
        response.set_cookie(
            key="access_token",
            value=token_pair.get("access_token"),
            max_age=settings.JWT_EXP_TIME_MINUTES * 60,
            expires=settings.JWT_EXP_TIME_MINUTES * 60,
            httponly=True,
            secure=secure_flag,
            samesite=samesite,
            path="/",
        )
        response.set_cookie(
            key="refresh_token",
            value=token_pair.get("refresh_token"),
            max_age=settings.JWT_REFRESH_EXP_TIME_MINUTES * 60,
            expires=settings.JWT_REFRESH_EXP_TIME_MINUTES * 60,
            httponly=True,
            secure=secure_flag,
            samesite=samesite,
            path="/",
        )
    except Exception:
        pass

    # 6) Return tokens in dev for convenience
    result = {"success": True}
    if settings.ENVIRONMENT == "development":
        result.update(token_pair)
    return result


@router.post("/logout")
async def logout(request: Request, response: Response):
    """Logout: revoke refresh token and clear cookies."""
    refresh_token: Optional[str] = None
    try:
        refresh_token = (request.cookies or {}).get("refresh_token")
    except Exception:
        refresh_token = None
    if not refresh_token:
        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            refresh_token = auth_header.split(None, 1)[1].strip()

    # Revoke in repository (best-effort)
    try:
        if refresh_token:
            repo = DeviceSessionRepository()
            await repo.revoke_by_token(refresh_token)
    except Exception:
        pass

    # Clear cookies
    try:
        response.delete_cookie("access_token", path="/")
        response.delete_cookie("refresh_token", path="/")
    except Exception:
        pass
    return {"success": True}


