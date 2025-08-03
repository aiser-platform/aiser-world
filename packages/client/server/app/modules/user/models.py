from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.modules.authentication.models import UserAuthentication

from app.common.model import BaseModel


class User(BaseModel, UserAuthentication):
    __tablename__ = "users"

    username = Column(String(50), nullable=False)
    email = Column(String(100), nullable=False)
