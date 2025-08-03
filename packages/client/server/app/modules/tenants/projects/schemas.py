from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field
from app.common.schemas import BaseSchema


class ProjectBase(BaseModel):
    """Base schema for Project with common attributes"""

    name: str = Field(..., description="Project name")
    description: Optional[str] = Field(None, description="Project description")
    is_active: Optional[bool] = Field(True, description="Project active status")


class ProjectCreateSchema(ProjectBase):
    """Schema for creating a new project"""

    pass


class ProjectUpdateSchema(BaseModel):
    """Schema for updating an existing project"""

    name: Optional[str] = Field(None, description="Project name")
    description: Optional[str] = Field(None, description="Project description")
    is_active: Optional[bool] = Field(None, description="Project active status")


class ProjectResponseSchema(ProjectBase, BaseSchema):
    """Schema for project responses, includes base fields and metadata"""

    id: UUID
    organization_id: UUID
    schema_name: str

    class Config:
        from_attributes = True
        orm_mode = True
