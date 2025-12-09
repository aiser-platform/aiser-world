"""
Service for managing saved assets
"""

from typing import Dict, Any, Optional, List
from app.modules.chats.assets.models import SavedAsset
from app.modules.chats.assets.schemas import (
    SavedAssetSchema,
    SavedAssetResponseSchema,
    AssetListResponseSchema
)
from app.common.repository import BaseRepository
from app.common.service import BaseService
import logging
import uuid

logger = logging.getLogger(__name__)


def _serialize_asset(asset_obj: SavedAsset) -> Dict[str, Any]:
    """Normalize SQLAlchemy asset instance into JSON-serializable dict."""
    data = dict(asset_obj.__dict__)
    data.pop("_sa_instance_state", None)
    for key in ("id", "conversation_id", "message_id"):
        value = data.get(key)
        if value is not None:
            data[key] = str(value)
    return data


class AssetRepository(BaseRepository[SavedAsset, SavedAssetSchema, SavedAssetSchema]):
    """Repository for saved assets"""
    
    def __init__(self):
        super().__init__(SavedAsset)


class AssetService:
    """Service for managing saved assets"""
    
    def __init__(self):
        self.repository = AssetRepository()
    
    async def create_asset(self, asset: SavedAssetSchema) -> SavedAssetResponseSchema:
        """Create a new saved asset"""
        try:
            from app.db.session import async_session
            from app.modules.chats.assets.models import SavedAsset
            
            async with async_session() as db:
                # CRITICAL: Validate and convert UUIDs safely
                conversation_id_uuid = None
                if asset.conversation_id:
                    try:
                        conversation_id_uuid = uuid.UUID(asset.conversation_id)
                    except (ValueError, TypeError) as e:
                        logger.warning(f"Invalid conversation_id format: {asset.conversation_id}, error: {e}")
                        # Don't fail - conversation_id is optional for query-editor charts
                        conversation_id_uuid = None
                
                message_id_uuid = None
                if asset.message_id:
                    try:
                        message_id_uuid = uuid.UUID(asset.message_id)
                    except (ValueError, TypeError) as e:
                        logger.warning(f"Invalid message_id format: {asset.message_id}, error: {e}")
                        # Don't fail - message_id is optional
                        message_id_uuid = None
                
                asset_obj = SavedAsset(
                    id=uuid.uuid4(),
                    conversation_id=conversation_id_uuid,
                    message_id=message_id_uuid,
                    asset_type=asset.asset_type,
                    title=asset.title,
                    content=asset.content,
                    thumbnail=asset.thumbnail,
                    data_source_id=asset.data_source_id,
                    asset_metadata=asset.metadata or {}
                )
                db.add(asset_obj)
                await db.commit()
                await db.refresh(asset_obj)
                
                return SavedAssetResponseSchema.model_validate(_serialize_asset(asset_obj))
        except Exception as e:
            logger.error(f"Failed to create asset: {e}")
            raise
    
    async def get_asset(self, asset_id: str) -> Optional[SavedAssetResponseSchema]:
        """Get an asset by ID"""
        try:
            asset = await self.repository.get(asset_id)
            if not asset:
                return None
            return SavedAssetResponseSchema.model_validate(_serialize_asset(asset))
        except Exception as e:
            logger.error(f"Failed to get asset: {e}")
            raise
    
    async def get_assets(
        self,
        filters: Dict[str, Any],
        offset: int = 0,
        limit: int = 50
    ) -> AssetListResponseSchema:
        """Get assets with filters"""
        try:
            # Build filter query
            filter_query = {"is_active": True, "is_deleted": False}
            filter_query.update(filters)
            
            # Get assets
            assets = await self.repository.get_all(
                offset=offset,
                limit=limit,
                sort_by="created_at",
                sort_order="desc",
                filter_query=filter_query
            )
            
            # Get total count
            pagination = await self.repository.get_pagination_info(
                offset, limit, filter_query=filter_query
            )
            
            # Convert to response format
            items = [SavedAssetResponseSchema.model_validate(_serialize_asset(asset)) for asset in assets]
            
            return AssetListResponseSchema(
                items=items,
                total=pagination.get("total", len(items)),
                offset=offset,
                limit=limit
            )
        except Exception as e:
            logger.error(f"Failed to get assets: {e}")
            raise
    
    async def delete_asset(self, asset_id: str) -> Dict[str, Any]:
        """Soft delete an asset"""
        try:
            from app.db.session import async_session
            from app.modules.chats.assets.models import SavedAsset
            from sqlalchemy import update as sql_update
            
            async with async_session() as db:
                update_stmt = sql_update(SavedAsset).where(
                    SavedAsset.id == uuid.UUID(asset_id)
                ).values(
                    is_deleted=True,
                    is_active=False
                )
                result = await db.execute(update_stmt)
                await db.commit()
                
                if result.rowcount > 0:
                    return {"success": True, "message": "Asset deleted successfully"}
                else:
                    return {"success": False, "message": "Asset not found"}
        except Exception as e:
            logger.error(f"Failed to delete asset: {e}")
            raise


