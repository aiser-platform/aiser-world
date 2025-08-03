from app.common.schemas import BaseSchema
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    username: str = Field(...)
    email: EmailStr = Field(...)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)


class UserUpdate(UserBase):
    email: EmailStr = Field(None)
    password: str = Field(None, min_length=8, max_length=128)


class UserResponse(UserBase):
    pass
