from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
import logging

from app.core.database import get_db
from app.core.simple_enterprise_config import get_simple_enterprise_config
from app.core.simple_enterprise_auth import get_simple_enterprise_auth_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/enterprise/auth", tags=["Enterprise Authentication"])
security = HTTPBearer()


class LoginRequest(BaseModel):
    username: str
    password: str
    remember_me: bool = False


class LoginResponse(BaseModel):
    success: bool
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_in: Optional[int] = None
    user: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    error_code: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ConfigResponse(BaseModel):
    auth_mode: str
    enable_sso: bool
    require_mfa: bool
    session_timeout_minutes: int
    deployment_mode: str
    organization_name: str


@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest, http_request: Request, db: Session = Depends(get_db)
):
    """Authenticate user with configured provider"""
    try:
        auth_service = get_simple_enterprise_auth_service()

        # Authenticate user
        auth_result = await auth_service.authenticate_user(
            request.username, request.password, db
        )

        if auth_result.success:
            return LoginResponse(
                success=True,
                access_token=auth_result.access_token,
                refresh_token=auth_result.refresh_token,
                expires_in=auth_result.expires_in,
                user=auth_result.user_info.to_dict() if auth_result.user_info else None,
            )
        else:
            return LoginResponse(
                success=False,
                error_message=auth_result.error_message,
                error_code=auth_result.error_code,
            )

    except Exception as e:
        logger.error(f"Login error: {e}")
        return LoginResponse(
            success=False,
            error_message="Internal server error",
            error_code="INTERNAL_ERROR",
        )


@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(request: RefreshTokenRequest):
    """Refresh access token"""
    try:
        auth_service = get_simple_enterprise_auth_service()

        auth_result = await auth_service.refresh_token(request.refresh_token)

        if auth_result.success:
            return LoginResponse(
                success=True,
                access_token=auth_result.access_token,
                refresh_token=auth_result.refresh_token,
                expires_in=auth_result.expires_in,
            )
        else:
            return LoginResponse(
                success=False,
                error_message=auth_result.error_message,
                error_code=auth_result.error_code,
            )

    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        return LoginResponse(
            success=False,
            error_message="Internal server error",
            error_code="INTERNAL_ERROR",
        )


@router.get("/config", response_model=ConfigResponse)
async def get_auth_config():
    """Get authentication configuration for frontend"""
    try:
        config = get_simple_enterprise_config()

        return ConfigResponse(
            auth_mode=config.auth_mode.value,
            enable_sso=config.enable_sso,
            require_mfa=config.require_mfa,
            session_timeout_minutes=config.session_timeout_minutes,
            deployment_mode=config.deployment_mode.value,
            organization_name=config.organization_name,
        )

    except Exception as e:
        logger.error(f"Get config error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get configuration",
        )


@router.get("/health")
async def health_check():
    """Health check endpoint for auth service"""
    try:
        config = get_simple_enterprise_config()

        return {
            "status": "healthy",
            "auth_mode": config.auth_mode.value,
            "deployment_mode": config.deployment_mode.value,
            "organization": config.organization_name,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }
