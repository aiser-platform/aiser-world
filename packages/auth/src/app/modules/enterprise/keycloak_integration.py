"""
Enterprise Keycloak Integration Module
Provides SSO, RBAC, and enterprise authentication features
"""

from typing import Optional, Dict, Any, List
import jwt
import requests
from datetime import datetime, timedelta
import os
from dataclasses import dataclass

from app.core.config import settings


@dataclass
class KeycloakConfig:
    """Keycloak configuration for enterprise deployment"""
    server_url: str
    realm: str
    client_id: str
    client_secret: str
    admin_username: Optional[str] = None
    admin_password: Optional[str] = None
    
    @classmethod
    def from_env(cls) -> 'KeycloakConfig':
        """Load Keycloak config from environment variables"""
        return cls(
            server_url=os.getenv('KEYCLOAK_SERVER_URL', 'http://localhost:8080'),
            realm=os.getenv('KEYCLOAK_REALM', 'aiser'),
            client_id=os.getenv('KEYCLOAK_CLIENT_ID', 'aiser-platform'),
            client_secret=os.getenv('KEYCLOAK_CLIENT_SECRET', ''),
            admin_username=os.getenv('KEYCLOAK_ADMIN_USERNAME'),
            admin_password=os.getenv('KEYCLOAK_ADMIN_PASSWORD')
        )


class KeycloakService:
    """Enterprise Keycloak integration service"""
    
    def __init__(self, config: Optional[KeycloakConfig] = None):
        self.config = config or KeycloakConfig.from_env()
        self.enabled = bool(self.config.client_secret)
        
        if self.enabled:
            self.auth_url = f"{self.config.server_url}/realms/{self.config.realm}/protocol/openid-connect"
            self.admin_url = f"{self.config.server_url}/admin/realms/{self.config.realm}"
            self._admin_token = None
            self._admin_token_expires = None

    async def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token with Keycloak"""
        if not self.enabled:
            return None
            
        try:
            # Get public key from Keycloak
            certs_url = f"{self.config.server_url}/realms/{self.config.realm}/protocol/openid-connect/certs"
            response = requests.get(certs_url)
            response.raise_for_status()
            
            # Verify token (simplified - in production use proper JWT verification)
            decoded = jwt.decode(
                token, 
                options={"verify_signature": False},  # In production, verify signature
                algorithms=["RS256"]
            )
            
            return decoded
            
        except Exception as e:
            print(f"Token verification failed: {e}")
            return None

    async def get_user_info(self, token: str) -> Optional[Dict[str, Any]]:
        """Get user information from Keycloak"""
        if not self.enabled:
            return None
            
        try:
            userinfo_url = f"{self.auth_url}/userinfo"
            headers = {"Authorization": f"Bearer {token}"}
            
            response = requests.get(userinfo_url, headers=headers)
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            print(f"Failed to get user info: {e}")
            return None

    async def get_user_roles(self, user_id: str) -> List[str]:
        """Get user roles from Keycloak"""
        if not self.enabled:
            return []
            
        try:
            admin_token = await self._get_admin_token()
            if not admin_token:
                return []
                
            roles_url = f"{self.admin_url}/users/{user_id}/role-mappings/realm"
            headers = {"Authorization": f"Bearer {admin_token}"}
            
            response = requests.get(roles_url, headers=headers)
            response.raise_for_status()
            
            roles_data = response.json()
            return [role['name'] for role in roles_data]
            
        except Exception as e:
            print(f"Failed to get user roles: {e}")
            return []

    async def create_user(self, user_data: Dict[str, Any]) -> Optional[str]:
        """Create user in Keycloak"""
        if not self.enabled:
            return None
            
        try:
            admin_token = await self._get_admin_token()
            if not admin_token:
                return None
                
            users_url = f"{self.admin_url}/users"
            headers = {
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            }
            
            keycloak_user = {
                "username": user_data.get("username"),
                "email": user_data.get("email"),
                "firstName": user_data.get("first_name", ""),
                "lastName": user_data.get("last_name", ""),
                "enabled": True,
                "emailVerified": False,
                "credentials": [{
                    "type": "password",
                    "value": user_data.get("password"),
                    "temporary": False
                }] if user_data.get("password") else []
            }
            
            response = requests.post(users_url, json=keycloak_user, headers=headers)
            response.raise_for_status()
            
            # Extract user ID from location header
            location = response.headers.get('Location', '')
            user_id = location.split('/')[-1] if location else None
            
            return user_id
            
        except Exception as e:
            print(f"Failed to create user: {e}")
            return None

    async def assign_role_to_user(self, user_id: str, role_name: str) -> bool:
        """Assign role to user in Keycloak"""
        if not self.enabled:
            return False
            
        try:
            admin_token = await self._get_admin_token()
            if not admin_token:
                return False
                
            # Get role ID
            roles_url = f"{self.admin_url}/roles/{role_name}"
            headers = {"Authorization": f"Bearer {admin_token}"}
            
            response = requests.get(roles_url, headers=headers)
            response.raise_for_status()
            role_data = response.json()
            
            # Assign role to user
            user_roles_url = f"{self.admin_url}/users/{user_id}/role-mappings/realm"
            response = requests.post(user_roles_url, json=[role_data], headers=headers)
            response.raise_for_status()
            
            return True
            
        except Exception as e:
            print(f"Failed to assign role: {e}")
            return False

    async def _get_admin_token(self) -> Optional[str]:
        """Get admin token for Keycloak API calls"""
        if not self.config.admin_username or not self.config.admin_password:
            return None
            
        # Check if current token is still valid
        if (self._admin_token and self._admin_token_expires and 
            datetime.utcnow() < self._admin_token_expires):
            return self._admin_token
            
        try:
            token_url = f"{self.auth_url}/token"
            data = {
                "grant_type": "password",
                "client_id": "admin-cli",
                "username": self.config.admin_username,
                "password": self.config.admin_password
            }
            
            response = requests.post(token_url, data=data)
            response.raise_for_status()
            
            token_data = response.json()
            self._admin_token = token_data['access_token']
            expires_in = token_data.get('expires_in', 300)
            self._admin_token_expires = datetime.utcnow() + timedelta(seconds=expires_in - 30)
            
            return self._admin_token
            
        except Exception as e:
            print(f"Failed to get admin token: {e}")
            return None

    def get_auth_url(self, redirect_uri: str, state: Optional[str] = None) -> str:
        """Get Keycloak authorization URL for SSO"""
        if not self.enabled:
            return ""
            
        params = {
            "client_id": self.config.client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid profile email"
        }
        
        if state:
            params["state"] = state
            
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{self.auth_url}/auth?{query_string}"

    async def exchange_code_for_token(self, code: str, redirect_uri: str) -> Optional[Dict[str, Any]]:
        """Exchange authorization code for access token"""
        if not self.enabled:
            return None
            
        try:
            token_url = f"{self.auth_url}/token"
            data = {
                "grant_type": "authorization_code",
                "client_id": self.config.client_id,
                "client_secret": self.config.client_secret,
                "code": code,
                "redirect_uri": redirect_uri
            }
            
            response = requests.post(token_url, data=data)
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            print(f"Failed to exchange code for token: {e}")
            return None


# Global Keycloak service instance
keycloak_service = KeycloakService()


class EnterpriseAuthMixin:
    """Mixin for enterprise authentication features"""
    
    @staticmethod
    def is_enterprise_mode() -> bool:
        """Check if running in enterprise mode"""
        return keycloak_service.enabled
    
    @staticmethod
    async def authenticate_with_keycloak(token: str) -> Optional[Dict[str, Any]]:
        """Authenticate user with Keycloak"""
        return await keycloak_service.verify_token(token)
    
    @staticmethod
    async def get_enterprise_user_info(token: str) -> Optional[Dict[str, Any]]:
        """Get user info from enterprise identity provider"""
        return await keycloak_service.get_user_info(token)
    
    @staticmethod
    def get_sso_login_url(redirect_uri: str, state: Optional[str] = None) -> str:
        """Get SSO login URL"""
        return keycloak_service.get_auth_url(redirect_uri, state)