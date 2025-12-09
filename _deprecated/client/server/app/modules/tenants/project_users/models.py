from app.modules.tenants.constants.tenant_enums import ProjectRole
from sqlalchemy import Column, ForeignKey
from sqlalchemy.dialects.postgresql import ENUM, UUID
from sqlalchemy.orm import relationship

from app.common.model import BaseModel  # Assuming this extends SQLAlchemy Base


class ProjectUser(BaseModel):
    """Maps external users to specific projects with roles"""

    __tablename__ = "project_user"

    user_id = Column(UUID(as_uuid=True), nullable=False)  # External User Service
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), primary_key=True)
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    role = Column(
        ENUM(ProjectRole, name="project_role_enum", create_type=False), nullable=False
    )

    # Relationships
    project = relationship("Project", back_populates="project_users")
