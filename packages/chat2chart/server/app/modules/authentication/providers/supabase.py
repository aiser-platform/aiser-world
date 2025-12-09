"""
Supabase Auth Provider

Uses Supabase Auth for cloud SaaS deployments.
Requires: pip install supabase
"""

import os
import logging
from typing import Dict, Any, Optional
from fastapi import HTTPException, status

from .base import AuthProvider

logger = logging.getLogger(__name__)


class SupabaseAuthProvider(AuthProvider):
    """Provider that uses Supabase Auth"""
    
    def __init__(self):
        try:
            from supabase import create_client, Client
        except ImportError:
            raise ImportError(
                "Supabase provider requires 'supabase' package. "
                "Install it with: pip install supabase"
            )
        
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_ANON_KEY')
        self.supabase_service_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError(
                "Supabase provider requires SUPABASE_URL and SUPABASE_ANON_KEY environment variables"
            )
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        logger.info("SupabaseAuthProvider initialized")
    
    async def login(self, identifier: str, password: str) -> Dict[str, Any]:
        """Authenticate user via Supabase"""
        logger.info(f"Supabase login attempt for identifier: {identifier[:10]}...")
        
        try:
            # Supabase sign_in_with_password expects email
            response = self.supabase.auth.sign_in_with_password({
                "email": identifier,  # Supabase uses email for authentication
                "password": password
            })
            
            if not response.user or not response.session:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials"
                )
            
            user = response.user
            session = response.session
            
            return {
                'access_token': session.access_token,
                'refresh_token': session.refresh_token,
                'expires_in': session.expires_in or 3600,
                'user': self.normalize_user_data({
                    'id': user.id,
                    'email': user.email,
                    'username': user.user_metadata.get('username') or user.email.split('@')[0],
                    'is_verified': user.email_confirmed_at is not None,
                    'user_metadata': user.user_metadata,
                })
            }
        except Exception as e:
            logger.error(f"Supabase login failed: {e}")
            if "Invalid login credentials" in str(e) or "Email not confirmed" in str(e):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials or email not verified"
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Authentication failed: {str(e)}"
            )
    
    async def logout(self, token: str) -> bool:
        """Logout user via Supabase"""
        logger.info("Supabase logout request")
        
        try:
            # Set the access token for this request
            self.supabase.auth.set_session(token, None)
            self.supabase.auth.sign_out()
            return True
        except Exception as e:
            logger.warning(f"Supabase logout failed: {e}")
            # Logout is idempotent, so return True even on error
            return True
    
    async def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify token via Supabase"""
        try:
            # Use get_user to verify token
            user = self.supabase.auth.get_user(token)
            if user and user.user:
                return self.normalize_user_data({
                    'id': user.user.id,
                    'email': user.user.email,
                    'username': user.user.user_metadata.get('username') or user.user.email.split('@')[0],
                    'is_verified': user.user.email_confirmed_at is not None,
                })
            return None
        except Exception as e:
            logger.debug(f"Supabase token verification failed: {e}")
            return None
    
    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token via Supabase"""
        logger.info("Supabase token refresh request")
        
        try:
            response = self.supabase.auth.refresh_session(refresh_token)
            
            if not response.session:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid refresh token"
                )
            
            session = response.session
            return {
                'access_token': session.access_token,
                'refresh_token': session.refresh_token,
                'expires_in': session.expires_in or 3600
            }
        except Exception as e:
            logger.error(f"Supabase token refresh failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to refresh token"
            )
    
    async def get_user_info(self, token: str) -> Dict[str, Any]:
        """Get user info via Supabase"""
        try:
            user = self.supabase.auth.get_user(token)
            if not user or not user.user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token"
                )
            
            return self.normalize_user_data({
                'id': user.user.id,
                'email': user.user.email,
                'username': user.user.user_metadata.get('username') or user.user.email.split('@')[0],
                'is_verified': user.user.email_confirmed_at is not None,
            })
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Supabase get_user_info failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to get user information"
            )
    
    async def signup(self, email: str, username: str, password: str, **kwargs) -> Dict[str, Any]:
        """Signup new user via Supabase"""
        logger.info(f"Supabase signup attempt for email: {email[:10]}...")
        
        try:
            response = self.supabase.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {
                        "username": username
                    }
                }
            })
            
            if not response.user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to create user"
                )
            
            user = response.user
            session = response.session  # May be None if email confirmation required
            
            return {
                'user': self.normalize_user_data({
                    'id': user.id,
                    'email': user.email,
                    'username': username,
                    'is_verified': user.email_confirmed_at is not None,
                }),
                'access_token': session.access_token if session else None,
                'refresh_token': session.refresh_token if session else None,
                'is_verified': user.email_confirmed_at is not None,
                'message': 'User created successfully. Please check your email to verify your account.' if not user.email_confirmed_at else 'User created and verified successfully.'
            }
        except Exception as e:
            logger.error(f"Supabase signup failed: {e}")
            error_msg = str(e)
            if "User already registered" in error_msg or "already exists" in error_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="User already exists"
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Signup failed: {error_msg}"
            )



