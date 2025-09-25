from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import uuid
from sqlalchemy.orm import relationship
from app.common.model import BaseModel


class DeviceSession(BaseModel):
    __tablename__ = "device_sessions"

    id = Column(Integer, primary_key=True)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    device_id = Column(String(255), nullable=False)
    device_type = Column(String(50))
    device_name = Column(String(100))
    ip_address = Column(String(45))
    user_agent = Column(String(255))
    last_active = Column(DateTime, default=datetime.now)
    is_active = Column(Boolean, default=True)
    refresh_token = Column(String(1000), nullable=False)
    refresh_token_revoked = Column(Boolean, default=False)
    refresh_token_expires_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="device_sessions")
