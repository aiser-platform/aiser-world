"""
Keycloak Auth Provider

Uses Keycloak for on-premise deployments.
Requires: pip install python-keycloak
"""

import os
import logging
from typing import Dict, Any, Optional
from fastapi import HTTPException, status

from .base import AuthProvider

logger = logging.getLogger(__name__)


class KeycloakAuthProvider(AuthProvider):
    """Provider that uses Keycloak OIDC"""
    
    def __init__(self):
        try:
            from keycloak import KeycloakOpenID
        except ImportError:
            raise ImportError(
                "Keycloak provider requires 'python-keycloak' package. "
                "Install it with: pip install python-keycloak"
            )
        
        self.server_url = os.getenv('KEYCLOAK_SERVER_URL')
        self.realm = os.getenv('KEYCLOAK_REALM', 'aiser')
        self.client_id = os.getenv('KEYCLOAK_CLIENT_ID')
        self.client_secret = os.getenv('KEYCLOAK_CLIENT_SECRET')
        
        if not self.server_url or not self.client_id:
            raise ValueError(
                "Keycloak provider requires KEYCLOAK_SERVER_URL and KEYCLOAK_CLIENT_ID environment variables"
            )
        
        self.keycloak = KeycloakOpenID(
            server_url=self.server_url,
            client_id=self.client_id,
            realm_name=self.realm,
            client_secret_key=self.client_secret
        )
        logger.info(f"KeycloakAuthProvider initialized for realm: {self.realm}")
    
    async def login(self, identifier: str, password: str) -> Dict[str, Any]:
        """Authenticate user via Keycloak"""
        logger.info(f"Keycloak login attempt for identifier: {identifier[:10]}...")
        
        try:
            # Keycloak token method expects username and password
            token = self.keycloak.token(identifier, password)
            
            if not token or 'access_token' not in token:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials"
                )
            
            # Get user info from token
            user_info = self.keycloak.userinfo(token['access_token'])
            
            return {
                'access_token': token['access_token'],
                'refresh_token': token['refresh_token'],
                'expires_in': token.get('expires_in', 3600),
                'user': self.normalize_user_data({
                    'id': user_info.get('sub'),
                    'email': user_info.get('email'),
                    'username': user_info.get('preferred_username') or user_info.get('username'),
                    'is_verified': user_info.get('email_verified', False),
                    'user_metadata': user_info,
                })
            }
        except Exception as e:
            logger.error(f"Keycloak login failed: {e}")
            error_msg = str(e).lower()
            if "invalid" in error_msg or "unauthorized" in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials"
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Authentication failed: {str(e)}"
            )
    
    async def logout(self, token: str) -> bool:
        """Logout user via Keycloak"""
        logger.info("Keycloak logout request")
        
        try:
            # Keycloak logout requires refresh token, but we can try with access token
            # In practice, you'd want to store the refresh token for proper logout
            self.keycloak.logout(token)
            return True
        except Exception as e:
            logger.warning(f"Keycloak logout failed: {e}")
            # Logout is idempotent
            return True
    
    async def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify token via Keycloak"""
        try:
            # Decode token to verify it
            token_info = self.keycloak.decode_token(token)
            if not token_info:
                return None
            
            # Get user info
            user_info = self.keycloak.userinfo(token)
            return self.normalize_user_data({
                'id': user_info.get('sub'),
                'email': user_info.get('email'),
                'username': user_info.get('preferred_username') or user_info.get('username'),
                'is_verified': user_info.get('email_verified', False),
            })
        except Exception as e:
            logger.debug(f"Keycloak token verification failed: {e}")
            return None
    
    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token via Keycloak"""
        logger.info("Keycloak token refresh request")
        
        try:
            token = self.keycloak.refresh_token(refresh_token)
            
            if not token or 'access_token' not in token:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid refresh token"
                )
            
            return {
                'access_token': token['access_token'],
                'refresh_token': token['refresh_token'],
                'expires_in': token.get('expires_in', 3600)
            }
        except Exception as e:
            logger.error(f"Keycloak token refresh failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to refresh token"
            )
    
    async def get_user_info(self, token: str) -> Dict[str, Any]:
        """Get user info via Keycloak"""
        try:
            user_info = self.keycloak.userinfo(token)
            return self.normalize_user_data({
                'id': user_info.get('sub'),
                'email': user_info.get('email'),
                'username': user_info.get('preferred_username') or user_info.get('username'),
                'is_verified': user_info.get('email_verified', False),
            })
        except Exception as e:
            logger.error(f"Keycloak get_user_info failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to get user information"
            )
    
    async def signup(self, email: str, username: str, password: str, **kwargs) -> Dict[str, Any]:
        """
        Signup new user via Keycloak
        
        Note: Keycloak user creation typically requires admin privileges.
        This method assumes you have a Keycloak admin client configured.
        """
        logger.info(f"Keycloak signup attempt for email: {email[:10]}...")
        
        try:
            from keycloak import KeycloakAdmin
            
            # Get admin credentials from environment
            admin_username = os.getenv('KEYCLOAK_ADMIN_USERNAME', 'admin')
            admin_password = os.getenv('KEYCLOAK_ADMIN_PASSWORD', 'admin')
            
            # Create admin client
            keycloak_admin = KeycloakAdmin(
                server_url=self.server_url,
                username=admin_username,
                password=admin_password,
                realm_name=self.realm,
                verify=True
            )
            
            # Create user in Keycloak
            user_id = keycloak_admin.create_user({
                "email": email,
                "username": username,
                "enabled": True,
                "emailVerified": False,  # Require email verification
                "credentials": [{
                    "type": "password",
                    "value": password,
                    "temporary": False
                }]
            })
            
            # Get the created user
            user = keycloak_admin.get_user(user_id)
            
            return {
                'user': self.normalize_user_data({
                    'id': user_id,
                    'email': email,
                    'username': username,
                    'is_verified': user.get('emailVerified', False),
                }),
                'access_token': None,  # User needs to login after signup
                'refresh_token': None,
                'is_verified': user.get('emailVerified', False),
                'message': 'User created successfully. Please verify your email and login.'
            }
        except Exception as e:
            logger.error(f"Keycloak signup failed: {e}")
            error_msg = str(e).lower()
            if "exists" in error_msg or "duplicate" in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="User already exists"
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Signup failed: {str(e)}"
            )



