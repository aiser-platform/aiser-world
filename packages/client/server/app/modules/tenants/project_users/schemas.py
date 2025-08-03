from typing import Optional
from pydantic import BaseModel, Field, UUID4
from app.common.schemas import BaseSchema
from app.modules.tenants.constants.tenant_enums import ProjectRole


class ProjectUserBase(BaseModel):
    """Base schema for Project-User relationship"""

    user_id: UUID4 = Field(..., description="External user service ID")
    project_id: UUID4 = Field(..., description="Project ID")
    tenant_id: UUID4 = Field(..., description="Organization/Tenant ID")
    role: ProjectRole = Field(..., description="User's role in the project")


class ProjectUserCreate(ProjectUserBase):
    """Schema for creating a new project-user relationship"""

    pass


class ProjectUserUpdate(BaseModel):
    """Schema for updating an existing project-user relationship"""

    role: Optional[ProjectRole] = Field(None, description="User's role in the project")


class ProjectUserResponse(ProjectUserBase, BaseSchema):
    """Schema for project-user responses"""

    class Config:
        from_attributes = True


class ProjectUserDetailResponse(ProjectUserResponse):
    """Extended schema with user and project details"""

    username: str = Field(..., description="User's username")
    email: str = Field(..., description="User's email")
    project_name: str = Field(..., description="Project name")
    organization_name: str = Field(..., description="Organization name")
    is_active: bool = Field(..., description="User's active status in project")
