from pydantic import BaseModel, Field


class SignInRequest(BaseModel):
    account: str
    password: str = Field(..., min_length=8, max_length=128)


class SignInResponse(BaseModel):
    access_token: str
    expires_in: int
    refresh_token: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class RefreshTokenResponse(BaseModel):
    access_token: str
    expires_in: int
