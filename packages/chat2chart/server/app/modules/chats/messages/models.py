from app.common.model import BaseModel
from sqlalchemy import UUID, Column, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
import uuid


class ChatMessage(BaseModel):
    """
    Represents a message in a chat conversation.

    Attributes:
        conversation_id (UUID): ID of the conversation this message belongs to
        query (Text): The user's input/question
        answer (Text): The response/answer to the query
        error (String): Error message if any
        status (String): Current status of the message
        ai_metadata (JSONB): AI response metadata (chart config, insights, recommendations)
        metadata (JSONB): Additional message metadata in JSON format
    """

    __tablename__ = "message"

    # Override the ID field to use UUID
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Message content
    query = Column(Text, nullable=True)
    answer = Column(Text, nullable=True)

    # Status and metadata
    error = Column(String, nullable=True)
    status = Column(String, nullable=True)
    
    # CRITICAL: AI metadata for preserving chart config, insights, recommendations
    ai_metadata = Column(JSONB, nullable=True)
    message_metadata = Column("metadata", JSONB, nullable=True)  # Use column name override

    # Foreign Key relationship
    conversation_id = Column(UUID, ForeignKey("conversation.id"), nullable=False)

    # Relationship reference
    # conversation = relationship("ChatConversation", back_populates="messages")
