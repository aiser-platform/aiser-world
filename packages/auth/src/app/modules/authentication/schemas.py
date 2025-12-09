from typing import Optional

from pydantic import AnyHttpUrl, BaseModel, EmailStr, Field


class SignUpRequest(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=128)
    verification_url: Optional[AnyHttpUrl] = Field(None, description="Verification URL")


class SignUpResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    is_verified: bool = False
    message: Optional[str] = None


class SignInRequest(BaseModel):
    identifier: str = Field(..., description="User username or email address")
    password: str
    fallback_url: Optional[str] = None


class SignInResponse(BaseModel):
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_in: Optional[int] = None
    fallback_url: Optional[str] = None
    message: Optional[str] = None
    user: Optional[dict] = None  # Add user information


class VerifyEmailRequest(BaseModel):
    token: str = Field(..., description="Email verification token")
    redirect_url: Optional[AnyHttpUrl] = None


class VerifyEmailResponse(BaseModel):
    message: str = Field(..., description="Response message")
    verified: bool = Field(default=False, description="Verification status")
    redirect_url: Optional[AnyHttpUrl] = Field(
        None, description="Redirect URL after verification"
    )
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_in: Optional[int] = None


class ResendVerificationRequest(BaseModel):
    email: EmailStr = Field(..., description="Email address to resend verification")
    verification_url: Optional[AnyHttpUrl] = None


class ResendVerificationResponse(BaseModel):
    message: str = Field(..., description="Response message")
    retry_after: Optional[int] = Field(None, description="Seconds to wait before retry")


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class RefreshTokenResponse(BaseModel):
    access_token: str
    expires_in: int


class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    reset_url: Optional[AnyHttpUrl] = None


class ForgotPasswordResponse(BaseModel):
    message: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


class ResetPasswordResponse(BaseModel):
    message: str
