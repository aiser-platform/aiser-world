"""
Asset models for saved charts, insights, and queries
"""

from app.common.model import BaseModel
from sqlalchemy import Column, String, Text, UUID, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
import uuid


class SavedAsset(BaseModel):
    """
    Represents a saved asset (chart, insight, query, etc.) from AI interactions.
    
    Attributes:
        conversation_id (UUID): ID of the conversation this asset belongs to
        message_id (UUID): ID of the message that generated this asset
        asset_type (String): Type of asset ('chart', 'insight', 'recommendation', 'query', 'export')
        title (String): User-friendly title for the asset
        content (JSONB): Asset content (chart config, insight text, query SQL, etc.)
        thumbnail (Text): Optional thumbnail URL or base64 image
        data_source_id (String): ID of the data source used
        asset_metadata (JSONB): Additional metadata (tags, description, etc.) - stored as 'metadata' in DB
    """
    
    __tablename__ = "saved_asset"
    
    # Override the ID field to use UUID
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Relationships
    conversation_id = Column(UUID, ForeignKey("conversation.id"), nullable=True)  # Optional: for query-editor charts
    message_id = Column(UUID, ForeignKey("message.id"), nullable=True)
    
    # Asset information
    asset_type = Column(String, nullable=False)  # 'chart', 'insight', 'recommendation', 'query', 'export'
    title = Column(String, nullable=False)
    content = Column(JSONB, nullable=False)  # Chart config, insight dict, query SQL, etc.
    thumbnail = Column(Text, nullable=True)
    
    # Context
    data_source_id = Column(String, nullable=True)
    # Use asset_metadata as Python attribute, but map to 'metadata' column in DB
    # SQLAlchemy reserves 'metadata' as a class attribute, so we can't use it directly
    asset_metadata = Column("metadata", JSONB, nullable=True)  # Tags, description, export format, etc.


