import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.common.service import BaseService
from app.core.config import settings
from app.modules.authentication.auth import Auth
from app.modules.authentication.schemas import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    ResendVerificationRequest,
    ResendVerificationResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    SignInRequest,
    SignInResponse,
    SignUpRequest,
    SignUpResponse,
    VerifyEmailRequest,
    VerifyEmailResponse,
)
from app.modules.device_session.repository import DeviceSessionRepository
from app.modules.device_session.schemas import (
    DeviceInfo,
    DeviceSessionCreate,
)
from app.modules.email.core import send_reset_password_email, send_verification_email
from app.modules.temporary_token.constants import TokenType
from app.modules.temporary_token.repository import TokenRepository
from app.modules.user.models import User
from app.modules.user.repository import UserRepository
from app.modules.user.schemas import (
    UserCreate,
    UserCreateInternal,
    UserResponse,
    UserUpdate,
)
import requests
import os

logger = logging.getLogger(__name__)


class UserService(BaseService):
    repository: UserRepository

    def __init__(self):
        repository = UserRepository()
        self.auth = Auth()
        self.device_repo = DeviceSessionRepository()
        self.token_repo = TokenRepository()
        super().__init__(repository)

    def create_user(self, user_in: UserCreate, db: Session) -> User:
        """Create new user with hashed password"""
        # Check if email exists
        if self.repository.get_by_email(user_in.email, db):
            raise ValueError("Email already registered")

        # Check if username exists
        if self.repository.get_by_username(user_in.username, db):
            raise ValueError("Username already registered")

        # Hash the password
        hashed_password = self.auth.hash_password(user_in.password)

        # Create user payload with hashed password (ensure no `id` present)
        user_payload = {
            "email": user_in.email,
            "username": user_in.username,
            "password": hashed_password,
        }

        # Save and return the created user (pass dict to avoid pydantic defaults)
        created_user = self.repository.create(user_payload, db)
        return created_user

    def authenticate(
        self, identifier: str, password: str, db: Session
    ) -> Optional[User]:
        """Authenticate user by email or username and password"""
        user = self.repository.get_by_email(
            identifier, db
        ) or self.repository.get_by_username(identifier, db)

        if not user or not self.auth.verify_password(password, user.password):
            return None
        return user

    def get_user(self, user_id: int, db: Session) -> Optional[User]:
        """Get user by ID"""
        user = self.repository.get_by_id(user_id, db)
        return UserResponse(**user.__dict__) if user else None

    def update_user(self, user_id: int, user_in: UserUpdate, db: Session) -> User:
        """Update user profile"""
        current_user = self.repository.get_by_id(user_id, db)
        if not current_user:
            raise ValueError("User not found")

        return self.repository.update(user_id, user_in, db)

    def get_active_users(
        self, db: Session, offset: int = 0, limit: int = 100
    ) -> List[UserResponse]:
        """Get list of active users"""
        users = self.repository.get_active_users(db, offset=offset, limit=limit)
        return [UserResponse(**user.__dict__) for user in users]

    # Authentication related functions
    async def signin(
        self, credentials: SignInRequest, device_info: DeviceInfo, db: Session
    ) -> SignInResponse:
        """Authenticate user and generate JWT token"""
        user = self.authenticate(credentials.identifier, credentials.password, db)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Capture commonly used user attributes into locals to avoid triggering
        # lazy loads that perform PK-based requery (which can fail during
        # mixed integer/UUID migration states).
        user_email = getattr(user, 'email', None)
        user_id = getattr(user, 'id', None)
        user_username = getattr(user, 'username', None)

        if not user.is_verified:
            # Check if verification token expired (1 hour)
            if user.verification_sent_at and (
                datetime.now(timezone.utc) - user.verification_sent_at
            ) > timedelta(hours=1):
                try:
                    # Generate new verification token
                    verification_token = self.auth.create_email_verification_token(
                        user_email
                    )

                    # Update verification attempt
                    self.repository.update_verification_attempt(user, db)

                    # Send new verification email (non-fatal)
                    verification_url = f"{settings.APP_URL}/verify-email"
                    try:
                        send_verification_email(user_email, verification_token, verification_url)
                        logger.info(f"New verification email sent to {user_email}")
                    except Exception as e:
                        logger.error(f"Failed to send verification email (non-fatal): {e}")

                    return SignInResponse(
                        fallback_url=credentials.fallback_url or "/verify-email",
                        message="New verification email has been sent. Please verify your email.",
                    )
                except Exception as e:
                    logger.error(f"Failed to send verification email: {e}")

            # Generate new verification token
            verification_token = self.auth.create_email_verification_token(user_email)

            self.repository.update_verification_attempt(user, db)

            verification_url = f"{settings.APP_URL}/verify-email"
            try:
                send_verification_email(user_email, verification_token, verification_url)
            except Exception as e:
                logger.error(f"Failed to send verification email (non-fatal): {e}")
            return SignInResponse(
                fallback_url=credentials.fallback_url or "/verify-email",
                message="Please verify your email first",
            )

        # Generate device ID for session
        device_id = uuid.uuid4()

        # Include device_id in JWT payload and create tokens
        tokens = self.auth.signJWT(
            user_id=user.id, email=user.email, device_id=str(device_id)
        )

        # Persist device session with refresh token for rotation/revocation
        try:
            refresh = tokens.get('refresh_token')
            if refresh:
                # compute expiry (align with auth settings)
                expires_at = datetime.utcnow() + timedelta(minutes=self.auth.JWT_REFRESH_EXP_TIME_MINUTES)
                # Use repository to create session
                # The DeviceSessionCreate schema expects an integer user_id in some environments
                session_user_id = None
                try:
                    # If user has legacy_id, prefer that as integer
                    if hasattr(user, 'legacy_id') and user.legacy_id:
                        session_user_id = int(user.legacy_id)
                    else:
                        # If id looks numeric, use it
                        if isinstance(user.id, int):
                            session_user_id = int(user.id)
                        elif isinstance(user.id, str) and user.id.isdigit():
                            session_user_id = int(user.id)
                        else:
                            session_user_id = None
                except Exception:
                    session_user_id = None

                # Use repository to create session only if device_sessions table exists
                try:
                    has_table = False
                    try:
                        cur = db.execute("SELECT to_regclass('public.device_sessions')").fetchone()
                        if cur and cur[0]:
                            has_table = True
                    except Exception:
                        has_table = False

                    if has_table:
                        await self.device_repo.create(
                            DeviceSessionCreate(
                                user_id=session_user_id if session_user_id is not None else 0,
                                device_id=str(device_id),
                                is_active=True,
                                device_name=device_info.device_name,
                                device_type=device_info.device_type,
                                ip_address=device_info.ip_address,
                                user_agent=device_info.user_agent,
                                refresh_token=refresh,
                                refresh_token_expires_at=expires_at,
                            )
                        )
                    else:
                        logger.debug('device_sessions table missing; skipping device session persistence')
                except Exception:
                    logger.exception('Failed to persist device session')
        except Exception:
            # Non-fatal: continue to return tokens even if persistence fails
            logger.exception('Failed to persist device session')

        # Return tokens and user information
        return SignInResponse(
            access_token=tokens.get("access_token"),
            refresh_token=tokens.get("refresh_token"),
            expires_in=tokens.get("expires_in"),
            user={
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "is_verified": user.is_verified,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None,
            },
        )

    def signup(self, sign_up_payload: SignUpRequest, db: Session) -> SignUpResponse:
        """Register new user and return JWT token"""
        try:
            # Create unverified user
            user = self.create_user(sign_up_payload, db)
            logger.info(f"User created: {user}")

            # Generate verification token
            verification_token = self.auth.create_email_verification_token(user.email)

            # Store verification token (non-blocking in dev: skip persistent
            # storage to avoid mixing async/sync repository patterns here).
            try:
                expires_at = datetime.utcnow() + timedelta(
                    minutes=settings.JWT_EMAIL_EXP_TIME_MINUTES
                )
                # Attempt to persist token if repository supports sync API
                if hasattr(self.token_repo, 'create_token'):
                    # Some environments use async repos; avoid awaiting here
                    # to keep signup synchronous. In production this should be
                    # an awaited async call or run in a background task.
                    try:
                        self.token_repo.create_token(
                            user_id=user.id,
                            token=verification_token,
                            token_type=TokenType.EMAIL_VERIFICATION.value,
                            expires_at=expires_at,
                        )
                        logger.info(f"Verification token stored for user {user.id}")
                    except Exception:
                        # swallow token persistence errors in signup flow
                        logger.debug('Non-fatal: token persistence skipped or failed')
            except Exception:
                logger.exception('Failed to prepare verification token (non-fatal)')

            # Send verification email
            verification_url = sign_up_payload.verification_url or settings.APP_URL
            try:
                self.repository.update_verification_attempt(user, db)
                send_verification_email(
                    user.email, verification_token, verification_url
                )
                logger.info(f"Verification email sent to {user.email}")
            except Exception as e:
                logger.error(f"Failed to send verification email: {e}")
                # Continue execution - user can request resend later

            # Return tokens and verification status
            # Generate a canonical UUID for cross-service identity (used by chat2chart)
            new_uuid = str(uuid.uuid4())

            # Attempt to provision minimal user record in chat2chart service using canonical UUID
            try:
                provision_url = getattr(settings, 'CHAT2CHART_PROVISION_URL', os.getenv('CHAT2CHART_PROVISION_URL', None))
                provision_secret = getattr(settings, 'INTERNAL_PROVISION_SECRET', os.getenv('INTERNAL_PROVISION_SECRET', None))
                if provision_url and provision_secret:
                    # Ask chat2chart to create default org/project/membership atomically
                    payload = {
                        "id": new_uuid,
                        "email": user.email,
                        "username": user.username,
                        "roles": [],
                        "create_defaults": True,
                        "default_org": {"name": "Default Organization", "slug": f"default-organization-{new_uuid[:8]}", "plan_type": "free", "max_projects": 1},
                        "default_project": {"name": "Default Project", "description": "Auto-created default project for user"},
                    }
                    headers = {"Content-Type": "application/json", "X-Internal-Auth": provision_secret}
                    try:
                        requests.post(provision_url, json=payload, headers=headers, timeout=5)
                    except Exception:
                        # Retry using docker service hostname when running in compose network
                        try:
                            fallback_url = provision_url.replace('localhost', 'chat2chart-server').replace('127.0.0.1', 'chat2chart-server')
                            requests.post(fallback_url, json=payload, headers=headers, timeout=5)
                        except Exception:
                            logger.exception("Failed to call chat2chart provision endpoint (non-fatal)")
            except Exception:
                logger.exception("Failed to attempt provisioning user in chat2chart (non-fatal)")

            # Sign tokens with canonical UUID included as `id` and keep legacy user_id for internal reference
            tokens = self.auth.signJWT(id=new_uuid, user_id=str(user.id), email=user.email)
            return SignUpResponse(
                **tokens,
                is_verified=user.is_verified,
                message="Verification email sent successfully",
            )

        except ValueError as e:
            logger.error(f"Error signing up user: {e}")
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.error(f"Error signing up user: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    def refresh_token(self, request: RefreshTokenRequest) -> RefreshTokenResponse:
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

    def get_me(self, token: str) -> User:
        """
        Get current user details from token
        """
        try:
            decoded_token = self.auth.decodeJWT(token)
            if not decoded_token:
                raise HTTPException(status_code=401, detail="Invalid token")

            user = self.get_user(decoded_token["user_id"])
            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            return user
        except Exception as e:
            logger.error(f"Error getting user: {e}")
            raise HTTPException(status_code=401, detail=str(e))

    def verify_email(self, verify_email_payload: VerifyEmailRequest):
        """Verify user email with token and sign in"""
        # Verify token in database first
        stored_token = self.token_repo.get_by_token(verify_email_payload.token)
        if (
            not stored_token
            or not stored_token.is_valid
            or stored_token.expires_at < datetime.utcnow()
        ):
            raise HTTPException(
                status_code=400, detail="Invalid or expired reset token"
            )

        email = self.auth.verify_email_token(verify_email_payload.token)
        if not email:
            raise HTTPException(status_code=400, detail="Invalid verification token")

        # Update user verification status
        user = self.repository.get_by_email(email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Update verification status
        user.is_verified = True

        self.repository.update(
            user.id,
            UserUpdate(username=user.username, is_verified=True, email=user.email),
        )

        # Invalidate token after successful verification
        self.token_repo.invalidate_token(verify_email_payload.token)

        # Generate auth tokens
        tokens = self.auth.signJWT(user_id=user.id, email=user.email)

        return VerifyEmailResponse(
            message="Email verified successfully",
            verified=True,
            redirect_url=verify_email_payload.redirect_url,
            **tokens,
        )

    def resend_verification_email(self, request: ResendVerificationRequest):
        """Resend verification email with rate limiting"""
        user = self.repository.get_by_email(request.email)

        if not user:
            raise HTTPException(status_code=404, detail="Email not registered")

        if user.is_verified:
            raise HTTPException(status_code=400, detail="Email already verified")

        # Rate limiting check
        if user.verification_attempts >= 3:
            time_since_last = datetime.now(timezone.utc) - user.verification_sent_at
            if time_since_last < timedelta(hours=1):
                retry_after = int(
                    (timedelta(hours=1) - time_since_last).total_seconds()
                )
                return ResendVerificationResponse(
                    message="Too many verification attempts", retry_after=retry_after
                )

        # Generate new token and update tracking
        verification_token = self.auth.create_email_verification_token(user.email)
        self.repository.update_verification_attempt(user)

        # Send verification email
        verification_url = (
            request.verification_url or f"{settings.APP_URL}/verify-email"
        )
        try:
            send_verification_email(user.email, verification_token, verification_url)
            logger.info(f"Verification email sent to {user.email}")
        except Exception as e:
            logger.error(f"Failed to send verification email: {e}")
            raise HTTPException(
                status_code=500, detail="Failed to send verification email"
            )

        return ResendVerificationResponse(
            message="Verification email sent successfully"
        )

    def forgot_password(self, request: ForgotPasswordRequest) -> ForgotPasswordResponse:
        """Handle forgot password request"""
        user = self.repository.get_by_email(request.email)
        if not user:
            # Return success even if email not found to prevent email enumeration
            return ForgotPasswordResponse(
                message="If your email is registered, you will receive password reset instructions."
            )

        try:
            # Generate password reset token
            reset_token = self.auth.create_password_reset_token(user.email)

            # Store reset token
            expires_at = datetime.utcnow() + timedelta(
                minutes=settings.JWT_EMAIL_EXP_TIME_MINUTES
            )
            self.token_repo.create_token(
                user_id=user.id,
                token=reset_token,
                token_type=TokenType.PASSWORD_RESET.value,
                expires_at=expires_at,
            )
            logger.info(f"Password reset token stored for user {user.id}")

            # Send reset password email
            reset_url = f"{request.reset_url or settings.APP_URL}/reset-password?token={reset_token}"
            send_reset_password_email(user.email, reset_token, reset_url)

            return ForgotPasswordResponse(
                message="Password reset instructions have been sent to your email."
            )

        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")
            raise HTTPException(
                status_code=500, detail="Failed to send password reset email"
            )

    def reset_password(self, request: ResetPasswordRequest) -> ResetPasswordResponse:
        """Reset user password with token"""
        try:
            # First verify token in database
            stored_token = self.token_repo.get_by_token(request.token)
            if (
                not stored_token
                or not stored_token.is_valid
                or stored_token.expires_at < datetime.utcnow()
            ):
                raise HTTPException(
                    status_code=400, detail="Invalid or expired reset token"
                )

            # Then verify JWT token
            email = self.auth.verify_password_reset_token(request.token)
            if not email:
                raise HTTPException(
                    status_code=400, detail="Invalid or expired password reset token"
                )

            user = self.repository.get_by_email(email)
            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            # Update password
            hashed_password = self.auth.hash_password(request.new_password)
            self.repository.update(
                user.id,
                UserUpdate(
                    username=user.username,
                    email=user.email,
                    password=hashed_password,
                    is_verified=user.is_verified,
                ),
            )

            # Invalidate the token after successful password reset
            self.token_repo.invalidate_token(request.token)
            logger.info(f"Password reset token invalidated for user {user.id}")

            return ResetPasswordResponse(message="Password has been reset successfully")

        except HTTPException as e:
            raise e
        except Exception as e:
            logger.error(f"Error resetting password: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Failed to reset password")

    def signout(self, token: str) -> dict:
        """Handle user signout and clean up device session"""
        try:
            # Decode token to get user info
            decoded_token = self.auth.decodeJWT(token)
            if not decoded_token:
                raise HTTPException(status_code=401, detail="Invalid token")

            # Get device session and deactivate it
            device_id = decoded_token.get("device_id")
            if device_id:
                self.device_repo.deactivate_session(device_id)
                logger.info(f"Device session {device_id} deactivated")

            return {"message": "Successfully signed out", "status": "success"}

        except Exception as e:
            logger.error(f"Error during signout: {e}")
            raise HTTPException(status_code=500, detail="Failed to process signout")
