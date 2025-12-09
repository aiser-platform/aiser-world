from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import uuid
from sqlalchemy.orm import relationship
from app.common.model import BaseModel


class DeviceSession(BaseModel):
    __tablename__ = "device_sessions"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    device_id = Column(String(255), nullable=False)
    device_type = Column(String(50))
    device_name = Column(String(100))
    ip_address = Column(String(45))
    user_agent = Column(String(255))
    last_active = Column(DateTime, default=datetime.now)
    last_active_at = Column(DateTime, default=datetime.now)
    is_active = Column(Boolean, default=True)
    # Persist refresh token metadata to support rotation and revocation
    refresh_token = Column(String(2048), nullable=False)
    refresh_token_revoked = Column(Boolean, default=False)
    refresh_token_expires_at = Column(DateTime, nullable=True)

    # Relationships
    # Define relationship to User if available; in some migration/test contexts the
    # User model may not be importable at module import time, so guard to avoid
    # raising during registry configuration.
    try:
        from app.modules.user.models import User  # noqa: F401
        user = relationship("User", back_populates="device_sessions")
    except Exception:
        # Relationship will be configured later when models are imported in app startup
        user = None

