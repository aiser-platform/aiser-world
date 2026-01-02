from typing import Optional, Dict, Any
from uuid import UUID

from app.common.schemas import BaseSchema
from pydantic import BaseModel, ConfigDict, Field


# Base schema with common attributes
class MessageBase(BaseModel):
    query: Optional[str] = Field(
        default=None, description="The input query text from the user"
    )
    answer: Optional[str] = Field(
        default=None, description="The response text generated for the query"
    )
    error: Optional[str] = Field(
        default=None, description="Error message if any occurred during processing"
    )
    status: Optional[str] = Field(
        default=None,
        description="Current status of the message (e.g., 'pending', 'completed', 'error')",
    )
    conversation_id: UUID = Field(
        ..., description="UUID of the conversation this message belongs to"
    )

    model_config = ConfigDict(from_attributes=True, json_encoders={UUID: str})


# Schema for creating a new message
class MessageCreateSchema(MessageBase):
    pass


# Schema for updating a message
class MessageUpdateSchema(BaseModel):
    query: Optional[str] = Field(default=None, description="Updated query text")
    answer: Optional[str] = Field(default=None, description="Updated response text")
    error: Optional[str] = Field(default=None, description="Updated error message")
    status: Optional[str] = Field(default=None, description="Updated status")


# Schema for reading a message (includes id and timestamps)
class MessageResponseSchema(MessageBase, BaseSchema):
    """Schema for message response with all fields including metadata"""
    ai_metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="AI response metadata (chart config, insights, recommendations, SQL queries, execution metadata)"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional message metadata"
    )
