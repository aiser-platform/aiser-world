from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class OrganizationBase(BaseModel):
    name: str = Field(..., description="Organization name")
    description: Optional[str] = Field(None, description="Organization description")
    slug: Optional[str] = Field(None, description="Organization slug")
    logo_url: Optional[str] = Field(None, description="Organization logo URL")
    website: Optional[str] = Field(None, description="Organization website")
    plan_type: str = Field("free", description="Plan type: free, pro, enterprise")
    max_projects: int = Field(1, description="Maximum number of projects allowed")
    max_users: int = Field(100, description="Maximum number of users allowed")
    max_storage_gb: int = Field(100, description="Maximum storage in GB")


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    plan_type: Optional[str] = None
    max_projects: Optional[int] = None
    max_users: Optional[int] = None
    max_storage_gb: Optional[int] = None
    is_active: Optional[bool] = None


class OrganizationResponse(OrganizationBase):
    id: int
    is_active: bool
    is_deleted: bool
    ai_credits_used: int
    ai_credits_limit: int
    trial_ends_at: Optional[datetime] = None
    is_trial_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ProjectBase(BaseModel):
    name: str = Field(..., description="Project name")
    description: Optional[str] = Field(None, description="Project description")
    is_public: bool = Field(False, description="Whether the project is public")
    settings: Optional[Dict[str, Any]] = Field(None, description="Project settings")


class ProjectCreate(ProjectBase):
    organization_id: int = Field(..., description="Organization ID")


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    settings: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class ProjectResponse(ProjectBase):
    id: int
    organization_id: int
    created_by: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ProjectWithDataSources(ProjectResponse):
    data_source_count: int = Field(0, description="Number of data sources in project")
    conversation_count: int = Field(0, description="Number of conversations in project")


class ProjectDataSourceBase(BaseModel):
    data_source_id: str = Field(..., description="Data source ID")
    data_source_type: str = Field(..., description="Data source type")


class ProjectDataSourceCreate(ProjectDataSourceBase):
    project_id: int = Field(..., description="Project ID")


class ProjectDataSourceResponse(ProjectDataSourceBase):
    id: str
    project_id: int
    is_active: bool
    added_at: datetime
    
    class Config:
        from_attributes = True


class ProjectConversationBase(BaseModel):
    conversation_id: str = Field(..., description="Conversation ID")


class ProjectConversationCreate(ProjectConversationBase):
    project_id: int = Field(..., description="Project ID")


class ProjectConversationResponse(ProjectConversationBase):
    id: str
    project_id: int
    is_active: bool
    added_at: datetime
    
    class Config:
        from_attributes = True


class UserProjectAccess(BaseModel):
    """User's access to projects"""
    user_id: str
    organization_id: int
    role: str = Field(..., description="User role in organization")
    projects: List[ProjectResponse] = Field(default_factory=list)
    can_create_projects: bool = Field(False, description="Whether user can create new projects")
    max_projects_allowed: int = Field(1, description="Maximum projects user can create")


class ProjectSummary(BaseModel):
    """Summary of project for dashboard"""
    id: int
    name: str
    description: Optional[str]
    data_source_count: int
    conversation_count: int
    last_activity: Optional[datetime]
    is_active: bool
    created_at: datetime


class OrganizationSummary(BaseModel):
    """Summary of organization for dashboard"""
    id: int
    name: str
    plan_type: str
    project_count: int
    user_count: int
    max_projects: int
    is_active: bool
