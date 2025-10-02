from sqlalchemy import Column, Integer, String, DateTime, UUID, Boolean, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.common.model import BaseModel



class User(BaseModel):
    __tablename__ = "users"

    # Use UUID primary key (modernized). Keep legacy_id for migration compatibility.
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    legacy_id = Column(Integer, unique=True, nullable=True)
    username = Column(String(50), nullable=False, unique=True)
    email = Column(String(100), nullable=False, unique=True)

    # Additional profile fields required by frontend
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    bio = Column(Text, nullable=True)
    avatar = Column(String(512), nullable=True)
    website = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    timezone = Column(String(64), nullable=True)
    onboarding_data = Column(JSON, nullable=True)
    onboarding_completed_at = Column(DateTime(timezone=True), nullable=True)

    # Password hash stored for authentication
    password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    organizations = relationship("OrganizationUser", back_populates="user")
    owned_projects = relationship("Project", back_populates="owner")
