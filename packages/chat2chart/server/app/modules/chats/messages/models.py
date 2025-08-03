from app.common.model import BaseModel
from sqlalchemy import JSON, UUID, Column, ForeignKey, String, Text
from sqlalchemy.orm import relationship


class ChatMessage(BaseModel):
    """
    Represents a message in a chat conversation.

    Attributes:
        conversation_id (UUID): ID of the conversation this message belongs to
        query (Text): The user's input/question
        answer (Text): The response/answer to the query
        error (String): Error message if any
        status (String): Current status of the message
        message (JSON): Additional message data in JSON format
    """

    __tablename__ = "message"

    # Message content
    query = Column(Text, nullable=True)
    answer = Column(Text, nullable=True)

    # Status and metadata
    error = Column(String, nullable=True)
    status = Column(String, nullable=True)

    # Foreign Key relationship
    conversation_id = Column(UUID, ForeignKey("conversation.id"), nullable=False)

    # Relationship reference
    # conversation = relationship("ChatConversation", back_populates="messages")
