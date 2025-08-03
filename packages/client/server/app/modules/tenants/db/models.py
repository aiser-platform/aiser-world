from sqlalchemy import Column, String, Boolean, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.common.model import BaseModel  # Assuming this extends SQLAlchemy Base


class OrganizationDB(BaseModel):
    """Stores the database connection details per tenant"""

    __tablename__ = "organization_db"

    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, unique=True
    )
    db_name = Column(String, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="database")
