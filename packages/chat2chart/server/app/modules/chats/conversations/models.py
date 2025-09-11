from app.common.model import BaseModel
from sqlalchemy import Column, String, Text, UUID
import uuid


class ChatConversation(BaseModel):
    __tablename__ = "conversation"

    # Override the ID field to use UUID
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Basic information
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)

    # Metadata
    json_metadata = Column(Text, nullable=True)

    # One-to-Many relationship with messages
    # messages = relationship(
    #     "ChatMessage", back_populates="conversation", cascade="all, delete-orphan"
    # )
