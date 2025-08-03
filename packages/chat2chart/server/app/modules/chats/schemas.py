from enum import Enum
from typing import Dict, List, Optional

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
