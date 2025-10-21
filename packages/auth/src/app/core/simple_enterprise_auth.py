from typing import Optional, Dict, Any
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from app.core.database import get_db
from app.modules.user.models import User

logger = logging.getLogger(__name__)
security = HTTPBearer()


class SimpleUserInfo:
    """Simple user information for enterprise auth"""

    def __init__(self, user: User):
        self.user_id = str(user.id)
        self.username = user.username
        self.email = user.email
        self.is_verified = user.is_verified
        self.is_active = user.is_active
        self.roles = ["member"]  # Default role
        self.provider = "internal"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "username": self.username,
            "email": self.email,
            "is_verified": self.is_verified,
            "is_active": self.is_active,
            "roles": self.roles,
            "provider": self.provider,
        }


class SimpleEnterpriseAuthService:
    """Simplified enterprise authentication service"""

    def __init__(self):
        self.auth_mode = "internal"

    def authenticate_user(
        self, username: str, password: str, db: Session
    ) -> Dict[str, Any]:
        """Simple authentication - check user exists (demo mode)"""
        try:
            # Find user by username or email
            user = (
                db.query(User)
                .filter((User.username == username) | (User.email == username))
                .first()
            )

            if not user:
                return {
                    "success": False,
                    "error_message": "User not found",
                    "error_code": "USER_NOT_FOUND",
                }

            if not user.is_active:
                return {
                    "success": False,
                    "error_message": "User is inactive",
                    "error_code": "USER_INACTIVE",
                }

            # For demo purposes, skip password verification
            # In production, you would verify the password here

            # For demo, we'll create a simple token (in production, use proper JWT)
            simple_token = f"demo_token_{user.id}_{datetime.utcnow().timestamp()}"

            user_info = SimpleUserInfo(user)

            return {
                "success": True,
                "access_token": simple_token,
                "token_type": "bearer",
                "expires_in": 3600,
                "user_info": user_info,
            }

        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return {
                "success": False,
                "error_message": "Authentication failed",
                "error_code": "AUTH_ERROR",
            }

    async def validate_token(self, token: str, db: Session) -> Optional[SimpleUserInfo]:
        """Simple token validation - extract user ID from demo token"""
        try:
            logger.debug(f"Validating token: {token}")
            
            if not token.startswith("demo_token_"):
                logger.debug("Token does not start with 'demo_token_'")
                return None

            # Extract user ID from demo token
            parts = token.split("_")
            if len(parts) < 3:
                logger.debug(f"Token has insufficient parts: {len(parts)}")
                return None

            user_id = parts[2]
            logger.debug(f"Extracted user_id: {user_id}")
            
            user = db.query(User).filter(User.id == user_id).first()
            logger.debug(f"User query result: {user}")

            if not user or not user.is_active:
                logger.debug(f"User not found or inactive: user={user}, is_active={user.is_active if user else 'N/A'}")
                return None

            logger.debug(f"Token validation successful for user: {user.username}")
            return SimpleUserInfo(user)

        except Exception as e:
            logger.error(f"Token validation error: {e}")
            return None


# Global service instance
_simple_auth_service: Optional[SimpleEnterpriseAuthService] = None


def get_simple_enterprise_auth_service() -> SimpleEnterpriseAuthService:
    """Get the global simple enterprise authentication service"""
    global _simple_auth_service

    if _simple_auth_service is None:
        _simple_auth_service = SimpleEnterpriseAuthService()

    return _simple_auth_service


async def get_current_user_simple(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> SimpleUserInfo:
    """Get current authenticated user (simple version)"""
    auth_service = get_simple_enterprise_auth_service()

    user_info = await auth_service.validate_token(credentials.credentials, db)

    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user_info
