from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.core.simple_enterprise_auth import (
    get_simple_enterprise_auth_service,
    get_current_user_simple,
    SimpleUserInfo,
)
from app.modules.user.models import User

router = APIRouter(prefix="/enterprise", tags=["enterprise"])
security = HTTPBearer()


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: Optional[int] = None
    user: Dict[str, Any]


class ConfigResponse(BaseModel):
    deployment_mode: str
    organization_name: str
    auth_mode: str
    features: Dict[str, Any]


@router.post("/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Enterprise login endpoint"""
    auth_service = get_simple_enterprise_auth_service()

    result = auth_service.authenticate_user(
        login_data.username, login_data.password, db
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=result.get("error_message", "Authentication failed"),
            headers={"WWW-Authenticate": "Bearer"},
        )

    return LoginResponse(
        access_token=result["access_token"],
        refresh_token=None,
        expires_in=result.get("expires_in"),
        user=result["user_info"].to_dict() if result.get("user_info") else {},
    )


@router.post("/auth/logout")
async def logout(
    current_user: SimpleUserInfo = Depends(get_current_user_simple),
    db: Session = Depends(get_db),
):
    """Enterprise logout endpoint"""
    # For demo, just return success
    return {"message": "Logged out successfully"}


@router.get("/auth/me")
async def get_me(current_user: SimpleUserInfo = Depends(get_current_user_simple)):
    """Get current user information"""
    return current_user.to_dict()


@router.get("/config", response_model=ConfigResponse)
def get_enterprise_config():
    """Get enterprise configuration (public info only)"""
    return ConfigResponse(
        deployment_mode="cloud",
        organization_name="Aiser Enterprise",
        auth_mode="internal",
        features={
            "sso_enabled": False,
            "mfa_required": False,
            "audit_logging": True,
            "local_models": False,
            "data_privacy_mode": False,
        },
    )


@router.get("/health")
def health_check():
    """Enterprise health check endpoint"""
    return {
        "status": "healthy",
        "deployment_mode": "cloud",
        "auth_provider": "internal",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "database_tables": [
            "users",
            "organizations",
            "projects",
            "roles",
            "subscriptions",
        ],
    }


@router.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    """Test database connection"""
    try:
        # Simple query to test database
        user_count = db.query(User).count()
        return {"status": "success", "user_count": user_count}
    except Exception as e:
        return {"status": "error", "error": str(e)}
