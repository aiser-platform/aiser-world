from enum import Enum
from typing import Dict, List, Optional, Any
from datetime import datetime

from app.modules.chats.conversations.schemas import ConversationSchema
from app.modules.chats.messages.schemas import MessageResponseSchema
from pydantic import BaseModel, Field


# Data source related schemas
class DataType(str, Enum):
    FILE = "file"
    DATABASE = "database"


class FileDataSchema(BaseModel):
    uuid_filename: str
    filename: str
    content_type: str


class DatabaseDataSchema(BaseModel):
    database_id: str
    database_schema: str
    tables: List[str]  # Explicitly typing the list


class ChatDatasourceSchema(BaseModel):
    data_type: DataType = Field(..., description="Type of data")
    file: Optional[FileDataSchema] = Field(None, description="File data")
    database: Optional[DatabaseDataSchema] = Field(None, description="Database data")


# Chat related schemas
class ChatSchema(BaseModel):
    prompt: str = Field(..., description="User prompt")
    system_context: Optional[str] = Field(
        None, description="System context", exclude=True
    )
    history: Optional[List[Dict]] = Field(None, description="Chat history")

    json_metadata: Optional[Dict] = Field(None, description="Additional metadata")

    datasource: Optional[ChatDatasourceSchema] = Field(
        None, description="Data source information"
    )

    conversation_id: Optional[str] = Field(None, description="Conversation identifier")
    message_id: Optional[str] = Field(None, description="Message identifier")
    predecessor_node_id: Optional[str] = Field(
        None, description="Predecessor node ID", exclude=True
    )


class ChatResponseSchema(BaseModel):
    conversation: ConversationSchema
    message: MessageResponseSchema


# Agent Context Schema for LangGraph and AI agents
class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    ANALYST = "analyst"
    EMPLOYEE = "employee"
    VIEWER = "viewer"


class AgentContextSchema(BaseModel):
    """Schema for agent context in multi-agent AI workflows"""
    user_id: str = Field(..., description="User ID")
    user_role: UserRole = Field(default=UserRole.EMPLOYEE, description="User role")
    organization_id: Optional[str] = Field(None, description="Organization ID")
    project_id: Optional[str] = Field(None, description="Project ID")
    data_source_id: Optional[str] = Field(None, description="Data source ID")
    conversation_id: Optional[str] = Field(None, description="Conversation ID")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")


class LangChainMemorySchema(BaseModel):
    """Schema for LangChain memory state"""
    messages: List[Dict[str, Any]] = Field(default_factory=list, description="Conversation messages")
    summary: Optional[str] = Field(None, description="Conversation summary")
    entities: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Extracted entities")


class ConversationSummarySchema(BaseModel):
    """Schema for conversation summary"""
    summary: str = Field(..., description="Summary text")
    key_topics: List[str] = Field(default_factory=list, description="Key topics discussed")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")


class EntityMemorySchema(BaseModel):
    """Schema for entity memory"""
    entities: Dict[str, Any] = Field(default_factory=dict, description="Extracted entities")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")


class ReasoningStepSchema(BaseModel):
    """Schema for reasoning steps in AI agent workflows"""
    step_number: int = Field(..., description="Step number in the reasoning process")
    step_type: str = Field(..., description="Type of reasoning step (e.g., 'analysis', 'query_generation', 'validation')")
    description: str = Field(..., description="Description of the reasoning step")
    input_data: Optional[Dict[str, Any]] = Field(None, description="Input data for this step")
    output_data: Optional[Dict[str, Any]] = Field(None, description="Output data from this step")
    confidence: Optional[float] = Field(None, description="Confidence score for this step (0.0-1.0)")
    timestamp: Optional[str] = Field(None, description="Timestamp when this step was executed")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata for this step")
