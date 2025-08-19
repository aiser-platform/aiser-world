from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
# JWT will be handled by the auth providers
from datetime import datetime, timedelta
import logging

from app.core.auth_providers import (
    BaseAuthProvider, AuthProviderFactory, AuthProvider, 
    UserInfo, AuthenticationResult
)
# For now, we'll use a simple config until enterprise_config is properly set up
from app.core.config import settings
from app.core.database import get_db
from app.modules.user.models import User

logger = logging.getLogger(__name__)
security = HTTPBearer()


class EnterpriseAuthService:
    """Enterprise authentication service with multi-provider support"""
    
    def __init__(self):
        # For now, use internal auth mode
        self.auth_mode = "internal"
    
    async def authenticate_user(self, username: str, password: str, db: Session) -> AuthenticationResult:
        """Authenticate user with configured provider"""
        try:
            # Authenticate with external provider
            auth_result = await self.auth_provider.authenticate(username, password)
            
            if not auth_result.success:
                return auth_result
            
            # Sync user to local database if auto-provisioning is enabled
            if self.config.auth.auto_provision_users and auth_result.user_info:
                local_user = await self._sync_user_to_local_db(auth_result.user_info, db)
                
                # Update user info with local user ID
                auth_result.user_info.user_id = str(local_user.id)
            
            # Log successful authentication
            if self.config.security.audit_logging:
                await self._log_auth_event("LOGIN_SUCCESS", auth_result.user_info, db)
            
            return auth_result
            
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            
            # Log failed authentication
            if self.config.security.audit_logging:
                await self._log_auth_event("LOGIN_FAILED", None, db, error=str(e))
            
            return AuthenticationResult(
                success=False,
                error_message="Authentication failed",
                error_code="AUTH_ERROR"
            )
    
    async def validate_token(self, token: str, db: Session) -> Optional[UserInfo]:
        """Validate authentication token"""
        try:
            user_info = await self.auth_provider.validate_token(token)
            
            if user_info and self.config.auth.auto_provision_users:
                # Ensure user exists in local database
                local_user = await self._get_or_create_local_user(user_info, db)
                user_info.user_id = str(local_user.id)
            
            return user_info
            
        except Exception as e:
            logger.error(f"Token validation error: {e}")
            return None
    
    async def refresh_token(self, refresh_token: str) -> AuthenticationResult:
        """Refresh authentication token"""
        return await self.auth_provider.refresh_token(refresh_token)
    
    async def logout_user(self, token: str, db: Session) -> bool:
        """Logout user and invalidate token"""
        try:
            # Get user info before logout
            user_info = await self.validate_token(token, db)
            
            # Logout from provider
            success = await self.auth_provider.logout(token)
            
            # Log logout event
            if self.config.security.audit_logging and user_info:
                await self._log_auth_event("LOGOUT", user_info, db)
            
            return success
            
        except Exception as e:
            logger.error(f"Logout error: {e}")
            return False
    
    async def _sync_user_to_local_db(self, user_info: UserInfo, db: Session) -> User:
        """Sync external user to local database"""
        # Check if user already exists
        existing_user = db.query(User).filter(
            (User.email == user_info.email) | 
            (User.username == user_info.username)
        ).first()
        
        if existing_user:
            # Update existing user
            existing_user.email = user_info.email
            existing_user.username = user_info.username
            existing_user.is_verified = user_info.is_verified
            existing_user.updated_at = datetime.utcnow()
            
            # Update external provider info
            if not hasattr(existing_user, 'external_provider'):
                existing_user.external_provider = user_info.provider.value
                existing_user.external_id = user_info.external_id
            
            db.commit()
            return existing_user
        
        else:
            # Create new user
            new_user = User(
                username=user_info.username,
                email=user_info.email,
                password="",  # No password for external users
                is_verified=user_info.is_verified,
                is_active=True,
                external_provider=user_info.provider.value,
                external_id=user_info.external_id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            db.add(new_user)
            db.flush()  # Get the ID
            
            # Auto-assign to default organization if configured
            await self._assign_default_organization(new_user, user_info, db)
            
            db.commit()
            return new_user
    
    async def _get_or_create_local_user(self, user_info: UserInfo, db: Session) -> User:
        """Get existing user or create new one"""
        return await self._sync_user_to_local_db(user_info, db)
    
    async def _assign_default_organization(self, user: User, user_info: UserInfo, db: Session):
        """Assign user to default organization"""
        # This would be implemented based on your business logic
        # For now, we'll skip this step
        pass
    
    async def _log_auth_event(self, event_type: str, user_info: Optional[UserInfo], db: Session, error: Optional[str] = None):
        """Log authentication events for audit purposes"""
        # This would be implemented to log to an audit table
        # For now, we'll just log to the application logger
        if user_info:
            logger.info(f"Auth event: {event_type} for user {user_info.username}")
        else:
            logger.warning(f"Auth event: {event_type} - {error}")


# Global enterprise auth service instance
_enterprise_auth_service: Optional[EnterpriseAuthService] = None


def get_enterprise_auth_service() -> EnterpriseAuthService:
    """Get the global enterprise authentication service"""
    global _enterprise_auth_service
    
    if _enterprise_auth_service is None:
        _enterprise_auth_service = EnterpriseAuthService()
    
    return _enterprise_auth_service


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> UserInfo:
    """Get current authenticated user"""
    auth_service = get_enterprise_auth_service()
    
    user_info = await auth_service.validate_token(credentials.credentials, db)
    
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user_info


async def get_current_active_user(
    current_user: UserInfo = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> UserInfo:
    """Get current active user"""
    # Check if user is active in local database
    local_user = db.query(User).filter(User.id == int(current_user.user_id)).first()
    
    if not local_user or not local_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    return current_user


# Optional dependencies for different permission levels
async def get_admin_user(
    current_user: UserInfo = Depends(get_current_active_user)
) -> UserInfo:
    """Require admin user"""
    if "admin" not in current_user.roles and "owner" not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return current_user


async def get_owner_user(
    current_user: UserInfo = Depends(get_current_active_user)
) -> UserInfo:
    """Require owner user"""
    if "owner" not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner access required"
        )
    
    return current_user