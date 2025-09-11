"""
User Schemas
Pydantic models for user-related API requests and responses
"""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    avatar: Optional[str] = None


class UserCreate(UserBase):
    password: str
    role: str = "user"


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    avatar: Optional[str] = None


class UserResponse(UserBase):
    id: str
    role: str
    is_active: bool
    is_verified: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
