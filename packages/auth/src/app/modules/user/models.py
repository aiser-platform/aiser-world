from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import uuid
from sqlalchemy.orm import relationship

from app.modules.authentication.models import UserAuthentication

from app.common.model import BaseModel
# Import organization-related models so SQLAlchemy can resolve relationships
# during mapper initialization and avoid import-order issues.


class User(BaseModel, UserAuthentication):
    __tablename__ = "users"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    legacy_id = Column(Integer, unique=True, nullable=True)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(100), unique=True, nullable=False)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    role = Column(String(50), default="user", nullable=False)
    status = Column(String(50), default="active", nullable=False)
    tenant_id = Column(String(50), default="default", nullable=False)

    is_verified = Column(Boolean, default=False, nullable=False)
    verification_attempts = Column(Integer, default=0, nullable=False)
    verification_sent_at = Column(DateTime, nullable=True)
    last_login_at = Column(DateTime, nullable=True)

    # Relationships - these will be populated when the models are imported
    user_organizations = relationship(
        "UserOrganization", back_populates="user", lazy="dynamic"
    )
    user_projects = relationship("UserProject", back_populates="user", lazy="dynamic")
    billing_transactions = relationship(
        "BillingTransaction", back_populates="user", lazy="dynamic"
    )
    ai_usage_logs = relationship("AIUsageLog", back_populates="user", lazy="dynamic")
    device_sessions = relationship(
        "DeviceSession", back_populates="user", lazy="dynamic"
    )
    temporary_tokens = relationship(
        "TemporaryToken", back_populates="user", lazy="dynamic"
    )
