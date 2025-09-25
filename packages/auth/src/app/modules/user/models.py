from sqlalchemy import Boolean, Column, DateTime, Integer, String
import uuid
from sqlalchemy.orm import relationship

from app.modules.authentication.models import UserAuthentication

from app.common.model import BaseModel


class User(BaseModel, UserAuthentication):
    __tablename__ = "users"

    # Use a flexible textual primary key in dev to tolerate mixed integer/UUID
    # during migration. We store UUID strings here; legacy integer ids remain
    # usable via repository lookup logic until full migration completes.
    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), nullable=False)
    email = Column(String(100), nullable=False)

    is_verified = Column(Boolean, default=False, nullable=False, server_default="false")
    verification_attempts = Column(
        Integer, default=0, nullable=False, server_default="0"
    )
    verification_sent_at = Column(DateTime, nullable=True, default=None)

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
