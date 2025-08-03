from typing import Optional
from app.common.schemas import BaseSchema
from pydantic import BaseModel, EmailStr, HttpUrl, Field


class OrganizationBase(BaseModel):
    name: str = Field(..., description="Organization name")
    description: Optional[str] = Field(None, description="Organization description")
    address: Optional[str] = Field(None, description="Organization address")
    phone: Optional[str] = Field(None, description="Organization phone number")
    email: Optional[EmailStr] = Field(None, description="Organization email address")
    website: Optional[HttpUrl] = Field(None, description="Organization website URL")


class OrganizationCreateSchema(OrganizationBase):
    pass


class OrganizationUpdateSchema(BaseModel):
    name: Optional[str] = Field(None, description="Organization name")
    description: Optional[str] = Field(None, description="Organization description")
    address: Optional[str] = Field(None, description="Organization address")
    phone: Optional[str] = Field(None, description="Organization phone number")
    email: Optional[EmailStr] = Field(None, description="Organization email address")
    website: Optional[HttpUrl] = Field(None, description="Organization website URL")


class OrganizationResponseSchema(OrganizationBase, BaseSchema):
    pass
