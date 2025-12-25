from app.common.model import BaseModel
from sqlalchemy import Column, String, Text, UUID as SQLAlchemyUUID, Boolean
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
import uuid


class ChatConversation(BaseModel):
    __tablename__ = "conversation"

    # Override the ID field to use UUID
    id = Column(PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # CRITICAL: user_id column for user ownership
    user_id = Column(PostgreSQLUUID(as_uuid=True), nullable=False, index=True)

    # Basic information
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=True)
    type = Column(String(20), nullable=True)

    # Metadata
    json_metadata = Column(Text, nullable=True)

    # One-to-Many relationship with messages
    # messages = relationship(
    #     "ChatMessage", back_populates="conversation", cascade="all, delete-orphan"
    # )
