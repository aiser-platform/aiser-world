from typing import Optional
from pydantic import BaseModel, EmailStr, Field
import uuid


class UserBase(BaseModel):
    username: str = Field(...)
    email: EmailStr = Field(...)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)


class UserCreateInternal(UserBase):
    password: str = Field(...)  # For hashed passwords - no length validation


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = Field(None)
    password: Optional[str] = Field(None, min_length=8, max_length=128)
    is_verified: Optional[bool] = Field(None)


class UserResponse(UserBase):
    id: str  # Changed from int to str to handle UUID

    def __init__(self, **user):
        super().__init__(**user)
