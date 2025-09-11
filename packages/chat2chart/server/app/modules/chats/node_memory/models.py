from typing import Optional

from app.common.model import BaseModel
from sqlalchemy import UUID, Column, String


class ChatNode(BaseModel):
    """
    Represents a node in a chat conversation.

    Attributes:
        id (UUID): Unique identifier for the chat node
        conversation_id (UUID): ID of the conversation this node belongs to
        message_id (UUID): Optional ID of the associated message
        predecessor_node_id (UUID): Optional ID of the previous node
        node_key (str): Unique key for the node
        node_name (str): Name of the node
        input (str): Input data for the node
        output (str): Output data from the node
        execution_metadata (str): Metadata about node execution
    """

    __tablename__ = "chat_node"

    conversation_id: UUID = Column(UUID, nullable=False)
    message_id: Optional[UUID] = Column(UUID, nullable=True)
    predecessor_node_id: Optional[UUID] = Column(UUID, nullable=True)

    node_key: str = Column(String, nullable=False)
    node_name: str = Column(String, nullable=False)

    input: str = Column(String, nullable=False)
    output: str = Column(String, nullable=False)

    execution_metadata: str = Column(String, nullable=False)
