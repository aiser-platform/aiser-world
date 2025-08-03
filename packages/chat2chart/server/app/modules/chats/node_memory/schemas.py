from typing import Optional

from app.common.schemas import BaseSchema
from pydantic import BaseModel, Field


class ChatNode(BaseModel):
    # Identifiers
    conversation_id: str = Field(
        ..., description="Unique identifier for the conversation"
    )
    message_id: Optional[str] = Field(None, description="Optional message identifier")
    predecessor_node_id: Optional[str] = Field(
        None, description="ID of the previous node in the chain"
    )

    # Node information
    node_key: str = Field(..., description="Unique key for the node")
    node_name: str = Field(..., description="Name of the node")

    # Content
    input: str = Field(..., description="Input content for the node")
    output: str = Field(..., description="Output content from the node")

    # Metadata
    execution_metadata: str = Field(..., description="Metadata about node execution")


class ChatNodeSchema(ChatNode):
    pass


class ChatNodeUpdateSchema(BaseModel):
    # Identifiers
    conversation_id: Optional[str] = Field(
        None, description="Unique identifier for the conversation"
    )
    message_id: Optional[str] = Field(None, description="Optional message identifier")
    predecessor_node_id: Optional[str] = Field(
        None, description="ID of the previous node in the chain"
    )

    # Node information
    node_key: Optional[str] = Field(None, description="Unique key for the node")
    node_name: Optional[str] = Field(None, description="Name of the node")

    # Content
    input: Optional[str] = Field(None, description="Input content for the node")
    output: Optional[str] = Field(None, description="Output content from the node")

    # Metadata
    execution_metadata: Optional[str] = Field(
        None, description="Metadata about node execution"
    )


class ChatNodeResponseSchema(ChatNode, BaseSchema):
    pass
