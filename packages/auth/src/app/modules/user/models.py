from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.modules.authentication.models import UserAuthentication

from app.common.model import Base, BaseModel


class User(BaseModel, UserAuthentication):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(50), nullable=False)
    email = Column(String(100), nullable=False)

    is_verified = Column(Boolean, default=False, nullable=False, server_default="false")
    verification_attempts = Column(
        Integer, default=0, nullable=False, server_default="0"
    )
    verification_sent_at = Column(DateTime, nullable=True, default=None)
