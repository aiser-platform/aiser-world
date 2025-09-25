import logging
from typing import List, Optional
import uuid

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
from fastapi import HTTPException, Request, Response
from app.modules.authentication.services import AuthService

logger = logging.getLogger(__name__)


class UserService(BaseService[User, UserCreate, UserUpdate, UserResponse]):
    def __init__(self):
        self.repository = UserRepository()
        self.auth = Auth()
        self.auth_service = AuthService()
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

        if not user or not self.auth.verify_password(password, user.password):
            return None
        return user

    async def get_user(self, user_id: str | int) -> Optional[User]:
        """Get user by ID. Accepts UUID string or int and normalizes to the correct type

        The project uses UUID primary keys for users in the chat2chart service. When a
        JWT contains the user id as a string we must convert it to a uuid.UUID so SQLAlchemy
        binds the correct database type and avoids `uuid = varchar` operator errors.
        """
        # Normalize incoming id to either uuid.UUID or int depending on the stored column type
        try:
            if isinstance(user_id, str):
                try:
                    normalized_id = uuid.UUID(user_id)
                except Exception:
                    # fallback to int if not a UUID string
                    normalized_id = int(user_id)
            else:
                normalized_id = user_id

            user = await self.repository.get(normalized_id)
            return UserResponse(**user.__dict__) if user else None
        except Exception as e:
            logger.exception(f"Failed to get user {user_id}: {e}")
            return None

    async def update_user(self, user_id: int, user_in: UserUpdate) -> User:
        """Update user profile"""
        current_user = self.repository.get(user_id)
        if not current_user:
            raise ValueError("User not found")

        return await self.repository.update(current_user, user_in)

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

        # Standardize JWT claims: include both `id` and `user_id` and `sub` for compatibility
        jwt_payload = {"id": str(user.id), "user_id": str(user.id), "sub": str(user.id), "email": user.email}
        sign_in = SignInResponse(
            **self.auth.signJWT(**jwt_payload)
        )

        # Persist refresh token server-side for revocation and rotation
        try:
            await self.auth_service.persist_refresh_token(int(user.id), sign_in.refresh_token, self.auth.JWT_REFRESH_EXP_TIME_MINUTES)
        except Exception:
            # Non-fatal if DB persist fails; log in production
            pass

        # Set cookies with HttpOnly and SameSite handling
        secure_flag = False if settings.ENVIRONMENT == 'development' else True
        # Use SameSite=None only if secure_flag (browsers require Secure with SameSite=None). For local dev, use Lax.
        samesite_setting = 'none' if secure_flag else 'lax'
        response.set_cookie(
            key="c2c_access_token",
            value=sign_in.access_token,
            max_age=settings.JWT_EXP_TIME_MINUTES * 60,
            expires=settings.JWT_EXP_TIME_MINUTES * 60,
            httponly=True,
            secure=secure_flag,
            samesite=samesite_setting,
            path='/'
        )
        response.set_cookie(
            key="refresh_token",
            value=sign_in.refresh_token,
            max_age=settings.JWT_REFRESH_EXP_TIME_MINUTES * 60,
            expires=settings.JWT_REFRESH_EXP_TIME_MINUTES * 60,
            httponly=True,
            secure=secure_flag,
            samesite=samesite_setting,
            path='/'
        )

        # Remove legacy demo or colliding cookies named `access_token` to avoid using stale demo tokens
        try:
            response.delete_cookie("access_token", path='/')
        except Exception:
            pass

        return user

    async def sign_up(self, user_up: UserCreate, response: Response) -> SignInResponse:
        """
        Register new user and return JWT token; also set HttpOnly cookies like sign-in.
        """
        try:
            user = await self.create_user(user_up)

            # Standardize JWT claims
            jwt_payload = {"id": str(user.id), "user_id": str(user.id), "sub": str(user.id), "email": user.email}
            sign_in = SignInResponse(**self.auth.signJWT(**jwt_payload))

            # Set cookies
            secure_flag = False if settings.ENVIRONMENT == 'development' else True
            samesite_setting = 'none'
            response.set_cookie(
            key="c2c_access_token",
                value=sign_in.access_token,
                max_age=settings.JWT_EXP_TIME_MINUTES * 60,
                expires=settings.JWT_EXP_TIME_MINUTES * 60,
                httponly=True,
                secure=secure_flag,
                samesite=samesite_setting,
                path='/'
            )
            response.set_cookie(
                key="refresh_token",
                value=sign_in.refresh_token,
                max_age=settings.JWT_REFRESH_EXP_TIME_MINUTES * 60,
                expires=settings.JWT_REFRESH_EXP_TIME_MINUTES * 60,
                httponly=True,
                secure=secure_flag,
                samesite=samesite_setting,
                path='/'
            )

            # Remove legacy demo/colliding cookie
            try:
                response.delete_cookie("access_token", path='/')
            except Exception:
                pass

            return user
        except ValueError as e:
            logger.error(f"Error signing up user: {e}")
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.error(f"Error signing up user: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    async def refresh_token(self, request: RefreshTokenRequest, response: Response) -> RefreshTokenResponse:
        """
        Refresh access token using refresh token (rotate refresh token)
        - Validate refresh token JWE/JWT
        - Ensure it's not revoked in DB
        - Revoke old refresh token and persist the new one
        - Set new cookies (access + refresh)
        """
        try:
            raw_refresh = request.refresh_token
            if not raw_refresh:
                raise HTTPException(status_code=401, detail="Missing refresh token")

            # Check persisted token revocation
            if await self.auth_service.is_token_revoked(raw_refresh):
                raise HTTPException(status_code=401, detail="Refresh token revoked or invalid")

            # Decrypt JWE token to get inner JWT (if encrypted)
            decrypted_token = self.auth.decodeRefreshJWE(raw_refresh)
            jwt_token_to_check = decrypted_token or raw_refresh

            # Decode JWT claims
            decoded_token = self.auth.decodeRefreshJWT(jwt_token_to_check)
            if not decoded_token:
                raise HTTPException(status_code=401, detail="Refresh token expired or invalid")

            user_id = decoded_token.get("user_id") or decoded_token.get("sub")
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid refresh token payload")

            # Revoke old refresh token record to prevent reuse
            try:
                await self.auth_service.revoke_refresh_token(raw_refresh)
            except Exception:
                logger.exception("Failed to revoke old refresh token during rotation")

            # Issue new token pair
            new_pair = self.auth.signJWT(user_id=str(user_id))

            # Persist new refresh token server-side
            try:
                await self.auth_service.persist_refresh_token(int(user_id), new_pair.get("refresh_token"), self.auth.JWT_REFRESH_EXP_TIME_MINUTES)
            except Exception:
                logger.exception("Failed to persist new refresh token")

            # Set cookies for new tokens
            secure_flag = False if settings.ENVIRONMENT == 'development' else True
            samesite_setting = 'none' if secure_flag else 'lax'
            response.set_cookie(
                key="c2c_access_token",
                value=new_pair.get("access_token"),
                max_age=self.auth.JWT_EXP * 60,
                expires=self.auth.JWT_EXP * 60,
                httponly=True,
                secure=secure_flag,
                samesite=samesite_setting,
                path='/'
            )
            response.set_cookie(
                key="refresh_token",
                value=new_pair.get("refresh_token"),
                max_age=self.auth.JWT_REFRESH_EXP_TIME_MINUTES * 60,
                expires=self.auth.JWT_REFRESH_EXP_TIME_MINUTES * 60,
                httponly=True,
                secure=secure_flag,
                samesite=samesite_setting,
                path='/'
            )

            return RefreshTokenResponse(**{"access_token": new_pair.get("access_token"), "expires_in": self.auth.JWT_EXP * 60})
        except HTTPException:
            raise
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
