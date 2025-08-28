from sqlalchemy import Column, Integer, String, DateTime, UUID, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.common.model import BaseModel


class User(BaseModel):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), nullable=False, unique=True)
    email = Column(String(100), nullable=False, unique=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    organizations = relationship("OrganizationUser", back_populates="user")
    owned_projects = relationship("Project", back_populates="owner")
