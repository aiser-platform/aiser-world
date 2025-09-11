from app.modules.tenants.constants.tenant_enums import OrganizationRole
from sqlalchemy import Column, ForeignKey
from sqlalchemy.dialects.postgresql import ENUM, UUID

from app.common.model import BaseModel  # Assuming this extends SQLAlchemy Base


class OrganizationUser(BaseModel):
    """Maps external users to organizations and assigns roles"""

    __tablename__ = "organization_user"

    user_id = Column(UUID(as_uuid=True), nullable=False)  # External User Service
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), primary_key=True
    )
    role = Column(
        ENUM(OrganizationRole, name="organization_role_enum", create_type=False),
        nullable=False,
    )
