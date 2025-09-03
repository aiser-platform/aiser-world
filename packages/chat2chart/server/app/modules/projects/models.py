from app.common.model import BaseModel
from sqlalchemy import Column, String, Text, UUID, Boolean, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

# Import models from other modules to avoid circular imports
from app.modules.chats.conversations.models import ChatConversation
from app.modules.user.models import User


class Organization(BaseModel):
    """Organization model for multi-tenant support"""
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    slug = Column(String(50), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    logo_url = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    plan_type = Column(String(20), default="free")  # free, pro,team, enterprise
    ai_credits_used = Column(Integer, default=0)
    ai_credits_limit = Column(Integer, default=50)
    trial_ends_at = Column(DateTime, nullable=True)
    is_trial_active = Column(Boolean, default=True)
    max_users = Column(Integer, default=100)
    max_projects = Column(Integer, default=1)  # Free users get 1 project
    max_storage_gb = Column(Integer, default=100)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Override BaseModel columns that don't exist in actual table
    deleted_at = None  # This column doesn't exist in the actual table
    
    # Relationships
    projects = relationship("Project", back_populates="organization", cascade="all, delete-orphan")
    users = relationship("OrganizationUser", back_populates="organization", cascade="all, delete-orphan")


class OrganizationUser(BaseModel):
    """Many-to-many relationship between organizations and users"""
    __tablename__ = "user_organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)  # Fixed: should be "users.id" not "user.id"
    role = Column(String(50), default="member")  # owner, admin, member
    is_active = Column(Boolean, default=True)
    
    # Relationships
    organization = relationship("Organization", back_populates="users")
    user = relationship("User", back_populates="organizations")


class Project(BaseModel):
    """Project model for organizing data sources and analyses"""
    __tablename__ = "projects"

    # Override BaseModel columns to match actual database schema
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Project settings
    is_public = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    settings = Column(Text, nullable=True)  # JSON string for project settings
    
    # Timestamps - override BaseModel defaults
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
    
    # Override BaseModel columns that don't exist in actual table
    is_deleted = None  # This column doesn't exist in the actual table
    
    # Relationships
    organization = relationship("Organization", back_populates="projects")
    owner = relationship("User", back_populates="owned_projects")
    data_sources = relationship("ProjectDataSource", back_populates="project", cascade="all, delete-orphan")
    conversations = relationship("ProjectConversation", back_populates="project", cascade="all, delete-orphan")


class ProjectDataSource(BaseModel):
    """Many-to-many relationship between projects and data sources"""
    __tablename__ = "project_data_source"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    data_source_id = Column(String(255), nullable=False)  # Reference to data source
    data_source_type = Column(String(50), nullable=False)  # file, database, cube, etc.
    is_active = Column(Boolean, default=True)
    added_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="data_sources")


class ProjectConversation(BaseModel):
    """Many-to-many relationship between projects and conversations"""
    __tablename__ = "project_conversation"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversation.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    added_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="conversations")
    conversation = relationship("ChatConversation")


# Note: User and ChatConversation models are defined in their respective modules
# This file only contains project-specific models
