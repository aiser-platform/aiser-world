from sqlalchemy import Column, Integer, String, DateTime, UUID, Boolean, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.common.model import BaseModel



class User(BaseModel):
    __tablename__ = "users"

    # Use UUID as primary key for consistency (migrating from integer)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    legacy_id = Column(Integer, unique=True, nullable=True)  # Keep for migration
    username = Column(String(100), nullable=True, unique=True)
    email = Column(String(255), nullable=False, unique=True)
    password = Column(Text, nullable=True)
    
    # Profile fields that exist in database
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)  # Profile photo URL
    phone = Column(String(50), nullable=True)
    bio = Column(Text, nullable=True)
    website = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    timezone = Column(String(50), nullable=True, default="UTC")
    
    # Authentication and account state
    role = Column(String(50), default="user")
    status = Column(String(50), default="active")
    tenant_id = Column(String(50), default="default")
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    verification_attempts = Column(Integer, default=0)
    verification_sent_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    is_deleted = Column(Boolean, default=False)
    
    # Migration fields
    old_id = Column(Integer, nullable=True)  # Old integer ID
    id_new = Column(UUID(as_uuid=True), nullable=True)  # Migration field
    
    # Relationships
    user_organizations = relationship("UserOrganization", back_populates="user")
    owned_projects = relationship("Project", back_populates="owner")
