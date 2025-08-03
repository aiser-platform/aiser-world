from typing import Optional
from pydantic import BaseModel, Field, UUID4
from app.common.schemas import BaseSchema
from app.modules.tenants.constants.tenant_enums import OrganizationRole


class OrganizationUserBase(BaseModel):
    """Base schema for Organization-User relationship"""

    user_id: UUID4 = Field(..., description="External user service ID")
    tenant_id: UUID4 = Field(..., description="Organization/Tenant ID")
    role: OrganizationRole = Field(..., description="User's role in the organization")


class OrganizationUserCreateSchema(OrganizationUserBase):
    """Schema for creating a new organization-user relationship"""

    pass


class OrganizationUserUpdateSchema(BaseModel):
    """Schema for updating an existing organization-user relationship"""

    role: Optional[OrganizationRole] = Field(
        None, description="User's role in the organization"
    )


class OrganizationUserResponseSchema(OrganizationUserBase, BaseSchema):
    """Schema for organization-user responses"""

    class Config:
        from_attributes = True


class OrganizationUserDetailResponseSchema(OrganizationUserResponseSchema):
    """Extended schema with user and organization details"""

    username: str = Field(..., description="User's username")
    email: str = Field(..., description="User's email")
    organization_name: str = Field(..., description="Organization name")
    is_active: bool = Field(..., description="User's active status in organization")
