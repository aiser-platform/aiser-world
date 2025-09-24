from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.common.model import BaseModel


class RefreshToken(BaseModel):
    __tablename__ = 'refresh_tokens'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    token = Column(String(1024), nullable=False, unique=True)
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    revoked = Column(Boolean, default=False)

    user = relationship('User')

from sqlalchemy import Column, String


class UserAuthentication:
    password = Column(String(256), nullable=False)
