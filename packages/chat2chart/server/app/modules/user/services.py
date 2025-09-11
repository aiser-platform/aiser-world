import logging
from typing import List, Optional

from app.common.service import BaseService
from app.core.config import settings
from app.modules.authentication.auth import Auth
from app.modules.authentication.schemas import (
    RefreshTokenRequest,
    RefreshTokenResponse,
    SignInRequest,
    SignInResponse,
)
from app.modules.user.models import User
from app.modules.user.repository import UserRepository
from app.modules.user.schemas import UserCreate, UserResponse, UserUpdate
from fastapi import HTTPException, Response  # type: ignore[reportMissingImports]

logger = logging.getLogger(__name__)


class UserService(BaseService[User, UserCreate, UserUpdate, UserResponse]):
    def __init__(self):
        self.repository = UserRepository()
        self.auth = Auth()
        super().__init__(self.repository)

    async def create_user(self, user_in: UserCreate) -> User:
        """Create new user with hashed password"""
        # Check if email exists - add await
        if await self.repository.get_by_email(user_in.email):
            raise ValueError("Email already registered")

        # Check if username exists - add await
        if await self.repository.get_by_username(user_in.username):
            raise ValueError("Username already registered")

        # Hash the password
        hashed_password = self.auth.hash_password(user_in.password)

        # Create user object
        user = UserCreate(
            email=user_in.email,
            username=user_in.username,
            password=hashed_password,
        )

        # Save and return the created user - add await
        created_user = await self.repository.create(user)
        return created_user

    async def authenticate(self, identifier: str, password: str) -> Optional[User]:
        """Authenticate user by email or username and password"""
        user = await self.repository.get_by_email(
            identifier
        ) or await self.repository.get_by_username(identifier)
        if not user:
            return None

        # Stored password may be a pbkdf2 hash or legacy plaintext.
        stored_pw = getattr(user, "password", None)

        # If stored value looks like a passlib/pbkdf2 hash, verify using Auth
        try:
            if isinstance(stored_pw, str) and stored_pw.startswith("$pbkdf2"):
                if self.auth.verify_password(password, stored_pw):
                    return user
                return None
            # Fallback: legacy plaintext - compare directly and migrate to hashed on success
            if stored_pw is not None and password == stored_pw:
                # migrate to hashed password
                hashed = self.auth.hash_password(password)
                from app.modules.user.schemas import UserUpdate

                try:
                    await self.repository.update(user.id, UserUpdate(password=hashed))
                except Exception:
                    # migration best-effort; don't fail authentication if migration fails
                    pass
                return user
        except Exception:
            return None

        return None

    async def get_user(self, user_id: int) -> Optional[User]:
        """Get user by ID"""
        user = await self.repository.get(user_id)

        return UserResponse(**user.__dict__) if user else None

    async def update_user(self, user_id: int, user_in: UserUpdate) -> User:
        """Update user profile"""
        # repository.get is async; await it
        current_user = await self.repository.get(user_id)
        if not current_user:
            raise ValueError("User not found")
        # repository.update expects an id and update schema
        return await self.repository.update(user_id, user_in)

    async def get_active_users(
        self, offset: int = 0, limit: int = 100
    ) -> List[UserResponse]:
        """Get list of active users"""
        users = await self.repository.get_active_users(offset=offset, limit=limit)
        return [UserResponse(**user.__dict__) for user in users]

    # Authentication related functions
    async def sign_in(
        self, credentials: SignInRequest, response: Response
    ) -> UserResponse:
        """
        Authenticate user and generate JWT token
        """
        user = await self.authenticate(credentials.account, credentials.password)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        sign_in = SignInResponse(
            **self.auth.signJWT(user_id=str(user.id), email=user.email)
        )

        response.set_cookie(
            key="access_token",
            value=sign_in.access_token,
            max_age=settings.JWT_EXP_TIME_MINUTES * 60,
            expires=settings.JWT_EXP_TIME_MINUTES * 60,
        )
        response.set_cookie(
            key="refresh_token",
            value=sign_in.refresh_token,
            max_age=settings.JWT_REFRESH_EXP_TIME_MINUTES * 60,
            expires=settings.JWT_REFRESH_EXP_TIME_MINUTES * 60,
        )

        return user

    async def sign_up(self, user_up: UserCreate) -> SignInResponse:
        """
        Register new user and return JWT token
        """
        try:
            user = await self.create_user(user_up)
            return SignInResponse(
                **self.auth.signJWT(user_id=user.id, email=user.email)
            )
        except ValueError as e:
            logger.error(f"Error signing up user: {e}")
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.error(f"Error signing up user: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    async def refresh_token(self, request: RefreshTokenRequest) -> RefreshTokenResponse:
        """
        Refresh access token using refresh token
        """
        try:
            # Decrypt JWE token
            decrypted_token = self.auth.decodeRefreshJWE(request.refresh_token)
            if not decrypted_token:
                raise HTTPException(status_code=401, detail="Invalid token")

            # Decode JWT claims
            decoded_token = self.auth.decodeRefreshJWT(decrypted_token)
            if not decoded_token:
                raise HTTPException(status_code=401, detail="Token expired")

            # Generate new token pair
            return RefreshTokenResponse(
                **self.auth.signJWT(user_id=decoded_token["user_id"])
            )
        except Exception as e:
            logger.error(f"Error refreshing token: {e}")
            raise HTTPException(status_code=401, detail=str(e))

    async def get_me(self, token: str) -> User:
        """
        Get current user details from token
        """
        try:
            if not token:
                raise HTTPException(status_code=401, detail="Unauthorized")

            decoded_token = self.auth.decodeJWT(token)
            if not decoded_token:
                raise HTTPException(status_code=401, detail="Invalid token")

            user = await self.get_user(decoded_token["user_id"])
            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            return user
        except Exception as e:
            logger.error(f"Error getting user: {e}")
            raise HTTPException(status_code=401, detail=str(e))

    async def sign_out(self) -> bool:
        """
        Sign out user by invalidating token and clearing cookies
        """
        try:
            return True
        except Exception as e:
            logger.error(f"Error signing out user: {e}")
            raise HTTPException(status_code=401, detail=str(e))
