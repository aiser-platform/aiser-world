from typing import Dict, List, Optional

from app.common.schemas import BaseSchema, PaginationSchema
from app.modules.chats.messages.schemas import MessageResponseSchema

# from app.modules.chats.schemas import ChatDatasourceSchema
from pydantic import BaseModel, Field


class BaseConversation(BaseModel):
    """Base model with common fields for chat-to-chart conversations"""

    title: str = Field(..., description="Title of the conversation")

    json_metadata: Optional[str] = Field(None, description="Metadata in JSON format")


class ConversationSchema(BaseConversation):
    """Model for creating a new conversation"""

    id: Optional[str] = Field(None, description="Unique identifier")


class ConversationUpdateSchema(BaseModel):
    """Model for updating an existing conversation"""

    title: Optional[str] = Field(None, description="Updated title")

    json_metadata: Optional[str] = Field(None, description="Updated metadata")


class ConversationResponseSchema(BaseConversation, BaseSchema):
    """Model for conversation response"""

    pass


class SpecificConversationResponseSchema(BaseModel):
    """Model for conversation response with messages"""

    conversation: ConversationResponseSchema = Field(
        ..., description="Conversation details"
    )
    messages: List[MessageResponseSchema] = Field(..., description="List of messages")
    pagination: PaginationSchema = Field(..., description="Pagination information")
