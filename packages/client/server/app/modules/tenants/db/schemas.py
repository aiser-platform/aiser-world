from typing import Optional
from pydantic import BaseModel, Field, UUID4, validator
from app.common.schemas import BaseSchema


class OrganizationDBBase(BaseModel):
    """Base schema for Organization Database settings"""

    tenant_id: UUID4 = Field(..., description="Organization/Tenant unique identifier")
    db_name: str = Field(
        ...,
        description="Database name for this organization",
        min_length=3,
        max_length=63,
    )

    @validator("db_name")
    def validate_db_name(cls, v):
        """Validate database name follows PostgreSQL naming rules"""
        if not v.isalnum() and "_" not in v:
            raise ValueError(
                "Database name must contain only alphanumeric characters and underscores"
            )
        if not v[0].isalpha():
            raise ValueError("Database name must start with a letter")
        return v.lower()


class OrganizationDBCreate(OrganizationDBBase):
    """Schema for creating a new organization database"""

    pass


class OrganizationDBUpdate(BaseModel):
    """Schema for updating organization database settings"""

    db_name: Optional[str] = Field(
        None, description="New database name", min_length=3, max_length=63
    )

    @validator("db_name")
    def validate_db_name(cls, v):
        if v is None:
            return v
        if not v.isalnum() and "_" not in v:
            raise ValueError(
                "Database name must contain only alphanumeric characters and underscores"
            )
        if not v[0].isalpha():
            raise ValueError("Database name must start with a letter")
        return v.lower()


class OrganizationDBResponse(OrganizationDBBase, BaseSchema):
    """Schema for organization database responses"""

    is_active: bool = Field(True, description="Database connection status")

    class Config:
        from_attributes = True
