"""
Schemas for saved assets
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID


class SavedAssetSchema(BaseModel):
    """Schema for creating/updating a saved asset"""
    conversation_id: Optional[str] = None  # Optional: required for chat context, optional for query-editor
    message_id: Optional[str] = None
    asset_type: str = Field(..., description="Type: 'chart', 'insight', 'recommendation', 'query', 'export'")
    title: str
    content: Dict[str, Any]
    thumbnail: Optional[str] = None
    data_source_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class SavedAssetResponseSchema(BaseModel):
    """Schema for returning a saved asset"""
    id: str
    conversation_id: Optional[str] = None  # Optional: may be None for query-editor charts
    message_id: Optional[str] = None
    asset_type: str
    title: str
    content: Dict[str, Any]
    thumbnail: Optional[str] = None
    data_source_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = Field(None, alias="asset_metadata")
    created_at: datetime
    updated_at: datetime
    is_active: bool
    is_deleted: bool
    
    class Config:
        from_attributes = True
        populate_by_name = True  # Allow both 'metadata' and 'asset_metadata' to work


class AssetListResponseSchema(BaseModel):
    """Schema for listing assets"""
    items: List[SavedAssetResponseSchema]
    total: int
    offset: int
    limit: int


