import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.core.config import settings
from app.modules.authentication import (
    RefreshTokenRequest,
    RefreshTokenResponse,
    SignInRequest,
    SignInResponse,
)
from app.modules.authentication.decoractors.auth_cookies import handle_auth_cookies
from app.modules.authentication.deps.auth_bearer import CookieTokenDep, JWTCookie
from app.modules.authentication.schemas import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResendVerificationRequest,
    ResendVerificationResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    SignUpRequest,
    VerifyEmailRequest,
    VerifyEmailResponse,
)
from app.modules.device_session.schemas import DeviceInfo
from app.modules.user.deps import CurrentUser
from app.modules.user.schemas import UserCreate, UserResponse, UserUpdate
from app.modules.user.services import UserService

logger = logging.getLogger(__name__)

router = APIRouter()
service = UserService()


@router.get(
    "/",
)
async def get_users(offset: int = 0, limit: int = 100):
    try:
        return await service.get_active_users(offset, limit)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/")
async def create_user(item: UserCreate, token: str = CookieTokenDep):
    try:
        return await service.create_user(item)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{user_id}", response_model=UserResponse)
async def get_one_user(user_id: str, token: str = CookieTokenDep):
    try:
        user = service.get_user(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.put("/{user_id}", response_model=UserResponse, dependencies=[CookieTokenDep])
async def update_user(user_id: str, user_in: UserUpdate):
    try:
        return await service.update_user(user_id, user_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{user_id}", dependencies=[CookieTokenDep])
async def delete_user(user_id: str):
    try:
        user = service.get_user(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )
        return {"message": "User deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/me/")
async def get_me(current_user: CurrentUser = Depends(CurrentUser.from_token)):
    """Get current user profile"""
    try:
        user = await current_user.get_user()
        return user
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/signin", response_model=SignInResponse)
@handle_auth_cookies()
async def sign_in(
    credentials: SignInRequest,
    request: Request,
    response: Response,
) -> SignInResponse:
    """Sign in user and set auth cookies"""
    # Get device info
    device_info = DeviceInfo(
        device_type=request.headers.get("sec-ch-ua-platform", "unknown"),
        device_name=request.headers.get("sec-ch-ua", "unknown"),
        user_agent=request.headers.get("user-agent", "unknown"),
        ip_address=request.client.host,
    )

    # Get sign in response
    sign_in_response = await service.signin(credentials, device_info)

    return sign_in_response


@router.post("/signup", response_model=SignInResponse)
async def sign_up(user_in: SignUpRequest):
    try:
        return await service.signup(user_in)
    except ValueError as e:
        raise e
    except Exception as e:
        raise e


@router.post("/refresh-token", response_model=RefreshTokenResponse)
async def refresh_token(request: RefreshTokenRequest):
    try:
        return await service.refresh_token(request)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )


@router.post("/verify-email", response_model=VerifyEmailResponse)
@handle_auth_cookies()
async def verify_email(request: VerifyEmailRequest, response: Response):
    """Verify user email and sign in"""
    try:
        return await service.verify_email(request)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/resend-verification", response_model=ResendVerificationResponse)
async def resend_verification(request: ResendVerificationRequest):
    """Resend verification email"""
    try:
        return await service.resend_verification_email(request)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/signout")
async def signout(response: Response, token: str = Depends(JWTCookie())):
    """Signout user and clear auth cookies"""
    try:
        # Clear auth cookies
        response.delete_cookie(
            key="access_token",
            path="/",
            secure=settings.COOKIE_SECURE,
            httponly=settings.COOKIE_HTTPONLY,
            samesite=settings.COOKIE_SAMESITE,
        )
        response.delete_cookie(
            key="refresh_token",
            path="/",
            secure=settings.COOKIE_SECURE,
            httponly=settings.COOKIE_HTTPONLY,
            samesite=settings.COOKIE_SAMESITE,
        )

        # Get user info from token and deactivate session
        return await service.signout(token)

    except Exception as e:
        logger.error(f"Signout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process signout",
        )


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(request: ForgotPasswordRequest):
    """Request password reset email"""
    try:
        return await service.forgot_password(request)
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Forgot password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process forgot password request",
        )


@router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(request: ResetPasswordRequest):
    """Reset password using token"""
    try:
        return await service.reset_password(request)
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Reset password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password",
        )
