from datetime import datetime

import sqlalchemy
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import uuid
from sqlalchemy.orm import relationship

from app.common.model import BaseModel
from app.modules.temporary_token.constants import TokenType


class TemporaryToken(BaseModel):
    __tablename__ = "temporary_tokens"

    id = Column(Integer, primary_key=True)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token = Column(String(255), nullable=False, unique=True)
    token_type = Column(sqlalchemy.Enum(TokenType), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    is_valid = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="temporary_tokens")
