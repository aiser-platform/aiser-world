from typing import Dict, List, Optional

from app.modules.chats.schemas import ChatDatasourceSchema
from pydantic import BaseModel, Field


class AIFlowSchema(BaseModel):
    """Model for AI flow"""

    prompt: str = Field(..., description="User prompt")
    system_context: Optional[str] = Field(
        None, description="System context for the chat"
    )
    history: Optional[List[Dict]] = Field(None, description="Chat history")
    json_metadata: Optional[Dict] = Field(None, description="Additional metadata")
    datasource: Optional[ChatDatasourceSchema] = Field(
        None, description="Data source information"
    )
    conversation_id: Optional[str] = Field(None, description="Conversation identifier")
    message_id: Optional[str] = Field(None, description="Message identifier")
    predecessor_node_id: Optional[str] = Field(None, description="Predecessor node ID")
