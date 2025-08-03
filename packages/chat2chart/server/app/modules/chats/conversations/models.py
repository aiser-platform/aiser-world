from app.common.model import BaseModel
from sqlalchemy import Column, String, Text
from sqlalchemy.orm import relationship


class ChatConversation(BaseModel):
    __tablename__ = "conversation"

    # Basic information
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)

    # Metadata
    json_metadata = Column(Text, nullable=True)

    # One-to-Many relationship with messages
    # messages = relationship(
    #     "ChatMessage", back_populates="conversation", cascade="all, delete-orphan"
    # )
