"""
Organization Schemas
Pydantic models for organization-related API requests and responses
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class OrganizationBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None

class OrganizationCreate(OrganizationBase):
    plan_type: str = "free"

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None

class OrganizationResponse(OrganizationBase):
    id: str
    is_active: bool
    plan_type: str
    ai_credits_used: int
    ai_credits_limit: int
    max_users: int
    max_projects: int
    max_storage_gb: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
