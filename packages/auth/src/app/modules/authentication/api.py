from datetime import datetime, timedelta
from uuid import uuid4
from typing import Optional

import sqlalchemy as sa
from fastapi import APIRouter, Body, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
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
    """Logout: revoke refresh token and clear ALL cookies."""
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

    # Clear ALL cookies - CRITICAL for security
    secure_flag, samesite = _secure_cookie_flags(request.url.hostname if request and request.url else None)
    try:
        # Clear all possible cookie names
        response.delete_cookie("access_token", path="/", secure=secure_flag, samesite=samesite)
        response.delete_cookie("c2c_access_token", path="/", secure=secure_flag, samesite=samesite)
        response.delete_cookie("refresh_token", path="/", secure=secure_flag, samesite=samesite)
        # Also set expired cookies to ensure they're cleared
        response.set_cookie("access_token", "", max_age=0, expires=0, path="/", secure=secure_flag, samesite=samesite)
        response.set_cookie("c2c_access_token", "", max_age=0, expires=0, path="/", secure=secure_flag, samesite=samesite)
        response.set_cookie("refresh_token", "", max_age=0, expires=0, path="/", secure=secure_flag, samesite=samesite)
    except Exception as e:
        logger.warning(f"Error clearing cookies: {e}")
    return {"success": True}


@router.post("/login")
async def login(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """Login endpoint that authenticates user and returns JWT tokens"""
    # Always read from request body
    body = await request.json()
    username = body.get("username", "") if body else ""
    email = body.get("email", "") if body else ""
    password = body.get("password", "") if body else ""

    # Use username or email as identifier
    user_identifier = username if username else email
    
    if not user_identifier:
        raise HTTPException(status_code=400, detail="Must provide either username or email")

    user_query = sa.text("""
        SELECT id, username, email, password, role, status, tenant_id,
               is_active, is_verified, verification_attempts, verification_sent_at,
               created_at, updated_at, last_login_at, deleted_at, is_deleted,
               first_name, last_name, legacy_id, id_new, new_id
        FROM users
        WHERE (username = :identifier OR email = :identifier)
    """)
    result = db.execute(user_query, {"identifier": user_identifier})
    user_row = result.fetchone()

    if not user_row:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Verify password
    import logging
    logger = logging.getLogger(__name__)
    
    def _get_row_val(row, key):
        try:
            return getattr(row, key)
        except Exception:
            try:
                return row[key]
            except Exception:
                try:
                    return (row._mapping or {}).get(key)
                except Exception:
                    return None
    
    hashed_pw = _get_row_val(user_row, 'password')
    logger.info(f"Verifying password for user {user_identifier}")
    
    if not password or not hashed_pw or not Auth().verify_password(password, hashed_pw):
        logger.warning(f"Password verification failed for user {user_identifier}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Create user object from row
    user = type('User', (), {
        'id': _get_row_val(user_row, 'id'),
        'username': _get_row_val(user_row, 'username'),
        'email': _get_row_val(user_row, 'email'),
        'password': _get_row_val(user_row, 'password'),
        'role': _get_row_val(user_row, 'role'),
        'status': _get_row_val(user_row, 'status'),
        'tenant_id': _get_row_val(user_row, 'tenant_id'),
        'is_active': _get_row_val(user_row, 'is_active'),
        'is_verified': _get_row_val(user_row, 'is_verified'),
        'verification_attempts': _get_row_val(user_row, 'verification_attempts'),
        'verification_sent_at': _get_row_val(user_row, 'verification_sent_at'),
        'created_at': _get_row_val(user_row, 'created_at'),
        'updated_at': _get_row_val(user_row, 'updated_at'),
        'last_login_at': _get_row_val(user_row, 'last_login_at'),
        'deleted_at': _get_row_val(user_row, 'deleted_at'),
        'is_deleted': _get_row_val(user_row, 'is_deleted'),
        'first_name': _get_row_val(user_row, 'first_name'),
        'last_name': _get_row_val(user_row, 'last_name'),
        'legacy_id': _get_row_val(user_row, 'legacy_id'),
    })

    # Generate tokens
    token_pair = Auth().signJWT(id=user.id, email=user.email, username=user.username, role=user.role)

    # Persist device session
    try:
        repo = DeviceSessionRepository()
        exp_at = datetime.utcnow() + timedelta(minutes=settings.JWT_REFRESH_EXP_TIME_MINUTES)
        device_type = "web"
        device_name = "browser"
        ip_address = request.client.host if request and request.client else None
        user_agent = request.headers.get("user-agent") if request else None

        create = DeviceSessionCreate(
            user_id=str(user.id),
            device_id=str(uuid4()),
            device_type=device_type,
            device_name=device_name,
            ip_address=ip_address,
            user_agent=user_agent,
            is_active=True,
            refresh_token=token_pair.get("refresh_token"),
            refresh_token_expires_at=exp_at,
        )
        await repo.create(create)
    except Exception as e:
        logger.exception("Error persisting device session: %s", e)

    # CRITICAL: Clear old cookies FIRST to prevent session hijacking
    secure_flag, samesite = _secure_cookie_flags(request.url.hostname if request and request.url else None)
    try:
        # Delete all existing auth cookies before setting new ones
        response.delete_cookie("access_token", path="/", secure=secure_flag, samesite=samesite)
        response.delete_cookie("c2c_access_token", path="/", secure=secure_flag, samesite=samesite)
        response.delete_cookie("refresh_token", path="/", secure=secure_flag, samesite=samesite)
    except Exception:
        pass
    
    # Set new cookies - Set both access_token and c2c_access_token for compatibility with chat2chart service
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
        key="c2c_access_token",
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
    result = {"success": True}
    if settings.ENVIRONMENT == "development":
        result.update(token_pair)
    return result


