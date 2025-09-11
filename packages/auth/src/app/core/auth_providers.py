"""
Authentication Provider Abstraction Layer
Supports multiple authentication providers: Keycloak, Internal JWT, Azure AD, etc.
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from pydantic import BaseModel


class AuthProvider(str, Enum):
    INTERNAL = "internal"
    KEYCLOAK = "keycloak"
    AZURE_AD = "azure_ad"
    OKTA = "okta"
    LDAP = "ldap"
    SAML = "saml"


class UserInfo(BaseModel):
    user_id: str
    email: str
    username: str
    full_name: str = ""
    roles: List[str] = []
    groups: List[str] = []
    provider: AuthProvider
    external_id: Optional[str] = None
    is_verified: bool = True
    last_login: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "email": self.email,
            "username": self.username,
            "full_name": self.full_name,
            "roles": self.roles,
            "groups": self.groups,
            "provider": self.provider.value,
            "external_id": self.external_id,
            "is_verified": self.is_verified,
            "last_login": self.last_login.isoformat() if self.last_login else None,
        }


class AuthenticationResult(BaseModel):
    success: bool
    user_info: Optional[UserInfo] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_in: Optional[int] = None  # seconds
    error_message: Optional[str] = None
    error_code: Optional[str] = None


class BaseAuthProvider(ABC):
    """Base class for all authentication providers"""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.provider_type = self.get_provider_type()

    @abstractmethod
    def get_provider_type(self) -> AuthProvider:
        """Return the provider type"""

    @abstractmethod
    async def authenticate(self, username: str, password: str) -> AuthenticationResult:
        """Authenticate user with username/password"""

    @abstractmethod
    async def validate_token(self, token: str) -> Optional[UserInfo]:
        """Validate authentication token and return user info"""

    @abstractmethod
    async def refresh_token(self, refresh_token: str) -> AuthenticationResult:
        """Refresh authentication token"""

    @abstractmethod
    async def logout(self, token: str) -> bool:
        """Logout user and invalidate token"""

    @abstractmethod
    async def get_user_info(self, user_id: str) -> Optional[UserInfo]:
        """Get user information by user ID"""


class KeycloakAuthProvider(BaseAuthProvider):
    """Keycloak authentication provider"""

    def get_provider_type(self) -> AuthProvider:
        return AuthProvider.KEYCLOAK

    async def authenticate(self, username: str, password: str) -> AuthenticationResult:
        """Authenticate using Keycloak"""
        try:
            import httpx

            server_url = self.config.get("server_url")
            realm = self.config.get("realm")
            client_id = self.config.get("client_id")
            client_secret = self.config.get("client_secret")

            # Keycloak token endpoint
            token_url = f"{server_url}/realms/{realm}/protocol/openid-connect/token"

            # Request access token
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    token_url,
                    data={
                        "grant_type": "password",
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "username": username,
                        "password": password,
                        "scope": "openid profile email",
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )

                if response.status_code == 200:
                    token_data = response.json()

                    # Get user info from token
                    user_info = await self._get_user_info_from_token(
                        token_data["access_token"]
                    )

                    return AuthenticationResult(
                        success=True,
                        user_info=user_info,
                        access_token=token_data["access_token"],
                        refresh_token=token_data.get("refresh_token"),
                        expires_in=token_data.get("expires_in"),
                    )
                else:
                    error_data = response.json()
                    return AuthenticationResult(
                        success=False,
                        error_message=error_data.get(
                            "error_description", "Authentication failed"
                        ),
                        error_code=error_data.get("error", "KEYCLOAK_ERROR"),
                    )

        except Exception as e:
            return AuthenticationResult(
                success=False,
                error_message=f"Keycloak authentication error: {str(e)}",
                error_code="KEYCLOAK_CONNECTION_ERROR",
            )

    async def validate_token(self, token: str) -> Optional[UserInfo]:
        """Validate Keycloak token"""
        try:
            return await self._get_user_info_from_token(token)
        except Exception as e:
            print(f"Token validation error: {e}")
            return None

    async def refresh_token(self, refresh_token: str) -> AuthenticationResult:
        """Refresh Keycloak token"""
        try:
            import httpx

            server_url = self.config.get("server_url")
            realm = self.config.get("realm")
            client_id = self.config.get("client_id")
            client_secret = self.config.get("client_secret")

            token_url = f"{server_url}/realms/{realm}/protocol/openid-connect/token"

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    token_url,
                    data={
                        "grant_type": "refresh_token",
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "refresh_token": refresh_token,
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )

                if response.status_code == 200:
                    token_data = response.json()
                    return AuthenticationResult(
                        success=True,
                        access_token=token_data["access_token"],
                        refresh_token=token_data.get("refresh_token"),
                        expires_in=token_data.get("expires_in"),
                    )
                else:
                    return AuthenticationResult(
                        success=False,
                        error_message="Token refresh failed",
                        error_code="REFRESH_FAILED",
                    )

        except Exception as e:
            return AuthenticationResult(
                success=False,
                error_message=f"Token refresh error: {str(e)}",
                error_code="REFRESH_ERROR",
            )

    async def logout(self, token: str) -> bool:
        """Logout from Keycloak"""
        try:
            import httpx

            server_url = self.config.get("server_url")
            realm = self.config.get("realm")

            logout_url = f"{server_url}/realms/{realm}/protocol/openid-connect/logout"

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    logout_url, headers={"Authorization": f"Bearer {token}"}
                )

                return response.status_code in [200, 204]

        except Exception as e:
            print(f"Logout error: {e}")
            return False

    async def get_user_info(self, user_id: str) -> Optional[UserInfo]:
        """Get user info from Keycloak"""
        # This would require admin token to access Keycloak admin API
        # For now, return None
        return None

    async def _get_user_info_from_token(self, token: str) -> UserInfo:
        """Extract user info from Keycloak token"""
        import jwt

        # Decode token without verification for now (in production, verify signature)
        decoded_token = jwt.decode(token, options={"verify_signature": False})

        return UserInfo(
            user_id=decoded_token.get("sub"),
            email=decoded_token.get("email", ""),
            username=decoded_token.get("preferred_username", ""),
            full_name=decoded_token.get("name", ""),
            roles=decoded_token.get("realm_access", {}).get("roles", []),
            groups=decoded_token.get("groups", []),
            provider=AuthProvider.KEYCLOAK,
            external_id=decoded_token.get("sub"),
            is_verified=decoded_token.get("email_verified", False),
            last_login=datetime.utcnow(),
        )


class InternalAuthProvider(BaseAuthProvider):
    """Internal JWT-based authentication provider"""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.jwt_secret = config.get("jwt_secret", "your-secret-key")
        self.jwt_algorithm = config.get("jwt_algorithm", "HS256")
        self.jwt_expiration_hours = config.get("jwt_expiration_hours", 24)

    def get_provider_type(self) -> AuthProvider:
        return AuthProvider.INTERNAL

    async def authenticate(self, username: str, password: str) -> AuthenticationResult:
        """Authenticate using internal user database"""
        try:
            # Import here to avoid circular imports
            from app.modules.user.models import User
            from app.core.database import get_db
            from passlib.context import CryptContext

            # Get database session
            db = next(get_db())

            # Find user by username or email
            user = (
                db.query(User)
                .filter((User.username == username) | (User.email == username))
                .first()
            )

            if not user:
                return AuthenticationResult(
                    success=False,
                    error_message="Invalid credentials",
                    error_code="INVALID_CREDENTIALS",
                )

            # Verify password
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            if not user.password or not pwd_context.verify(password, user.password):
                return AuthenticationResult(
                    success=False,
                    error_message="Invalid credentials",
                    error_code="INVALID_CREDENTIALS",
                )

            # Check if user is active
            if not user.is_active:
                return AuthenticationResult(
                    success=False,
                    error_message="Account is inactive",
                    error_code="ACCOUNT_INACTIVE",
                )

            # Generate JWT token
            access_token = self._create_access_token(user)
            refresh_token = self._create_refresh_token(user)

            # Create user info
            user_info = UserInfo(
                user_id=str(user.id),
                email=user.email,
                username=user.username,
                provider=AuthProvider.INTERNAL,
                is_verified=user.is_verified,
                last_login=datetime.utcnow(),
            )

            # Update last login
            user.updated_at = datetime.utcnow()
            db.commit()

            return AuthenticationResult(
                success=True,
                user_info=user_info,
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=self.jwt_expiration_hours * 3600,
            )

        except Exception as e:
            return AuthenticationResult(
                success=False,
                error_message=f"Authentication error: {str(e)}",
                error_code="INTERNAL_ERROR",
            )

    async def validate_token(self, token: str) -> Optional[UserInfo]:
        """Validate JWT token"""
        try:
            import jwt
            from app.modules.user.models import User
            from app.core.database import get_db

            # Decode JWT token
            payload = jwt.decode(
                token, self.jwt_secret, algorithms=[self.jwt_algorithm]
            )
            user_id = payload.get("sub")

            if not user_id:
                return None

            # Get user from database
            db = next(get_db())
            user = db.query(User).filter(User.id == int(user_id)).first()

            if not user or not user.is_active:
                return None

            return UserInfo(
                user_id=str(user.id),
                email=user.email,
                username=user.username,
                provider=AuthProvider.INTERNAL,
                is_verified=user.is_verified,
            )

        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
        except Exception as e:
            print(f"Token validation error: {e}")
            return None

    async def refresh_token(self, refresh_token: str) -> AuthenticationResult:
        """Refresh JWT token"""
        try:
            import jwt
            from app.modules.user.models import User
            from app.core.database import get_db

            # Decode refresh token
            payload = jwt.decode(
                refresh_token, self.jwt_secret, algorithms=[self.jwt_algorithm]
            )
            user_id = payload.get("sub")
            token_type = payload.get("type")

            if not user_id or token_type != "refresh":
                return AuthenticationResult(
                    success=False,
                    error_message="Invalid refresh token",
                    error_code="INVALID_TOKEN",
                )

            # Get user from database
            db = next(get_db())
            user = db.query(User).filter(User.id == int(user_id)).first()

            if not user or not user.is_active:
                return AuthenticationResult(
                    success=False,
                    error_message="User not found or inactive",
                    error_code="USER_INACTIVE",
                )

            # Generate new tokens
            new_access_token = self._create_access_token(user)
            new_refresh_token = self._create_refresh_token(user)

            return AuthenticationResult(
                success=True,
                access_token=new_access_token,
                refresh_token=new_refresh_token,
                expires_in=self.jwt_expiration_hours * 3600,
            )

        except jwt.ExpiredSignatureError:
            return AuthenticationResult(
                success=False,
                error_message="Refresh token expired",
                error_code="TOKEN_EXPIRED",
            )
        except jwt.InvalidTokenError:
            return AuthenticationResult(
                success=False,
                error_message="Invalid refresh token",
                error_code="INVALID_TOKEN",
            )
        except Exception as e:
            return AuthenticationResult(
                success=False,
                error_message=f"Token refresh error: {str(e)}",
                error_code="REFRESH_ERROR",
            )

    async def logout(self, token: str) -> bool:
        """Logout user (for JWT, we just return True as tokens are stateless)"""
        # In a production system, you might want to maintain a blacklist of tokens
        return True

    async def get_user_info(self, user_id: str) -> Optional[UserInfo]:
        """Get user info from internal database"""
        try:
            from app.modules.user.models import User
            from app.core.database import get_db

            db = next(get_db())
            user = db.query(User).filter(User.id == int(user_id)).first()

            if not user:
                return None

            return UserInfo(
                user_id=str(user.id),
                email=user.email,
                username=user.username,
                provider=AuthProvider.INTERNAL,
                is_verified=user.is_verified,
            )

        except Exception as e:
            print(f"Get user info error: {e}")
            return None

    def _create_access_token(self, user) -> str:
        """Create JWT access token"""
        import jwt

        payload = {
            "sub": str(user.id),
            "email": user.email,
            "username": user.username,
            "type": "access",
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(hours=self.jwt_expiration_hours),
        }

        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)

    def _create_refresh_token(self, user) -> str:
        """Create JWT refresh token"""
        import jwt

        payload = {
            "sub": str(user.id),
            "type": "refresh",
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow()
            + timedelta(days=30),  # Refresh tokens last 30 days
        }

        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)


class AuthProviderFactory:
    """Factory for creating authentication providers"""

    @staticmethod
    def create_provider(
        provider_type: AuthProvider, config: Dict[str, Any]
    ) -> BaseAuthProvider:
        """Create an authentication provider instance"""
        if provider_type == AuthProvider.KEYCLOAK:
            return KeycloakAuthProvider(config)
        elif provider_type == AuthProvider.INTERNAL:
            return InternalAuthProvider(config)
        else:
            raise ValueError(f"Unsupported authentication provider: {provider_type}")

    @staticmethod
    def get_available_providers() -> List[AuthProvider]:
        """Get list of available authentication providers"""
        return [AuthProvider.INTERNAL, AuthProvider.KEYCLOAK]
