from sqlalchemy import Column, String, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.common.model import BaseModel  # Assuming this extends SQLAlchemy Base


class Project(BaseModel):
    """Represents an individual project"""

    __tablename__ = "projects"

    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Moved from OrganizationProject
    organization_id = Column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    schema_name = Column(String, nullable=False)  # Schema within the tenant DB

    # Relationships
    organization = relationship("Organization", back_populates="projects")
    users = relationship("ProjectUser", back_populates="project")
    # Add other relationships as needed
