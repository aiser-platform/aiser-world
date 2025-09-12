from app.common.schemas import BaseSchema
from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class UserBase(BaseModel):
    username: Optional[str] = None
    email: EmailStr = Field(...)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)


class UserUpdate(UserBase):
    username: Optional[str] = None
    email: EmailStr = Field(None)
    password: str = Field(None, min_length=8, max_length=128)
    # Allow `name` updates in tests and external callers
    name: Optional[str] = None


class UserResponse(UserBase):
    # In some places tests/mock services return `name` instead of `username`.
    # Make `username` optional here and accept `name` to remain compatible.
    username: Optional[str] = None
    name: Optional[str] = None


class SignInRequest(BaseModel):
    email: EmailStr = Field(...)
    password: str = Field(..., min_length=1)


class SignInResponse(BaseModel):
    access_token: str
    token_type: str = Field(default="bearer")
