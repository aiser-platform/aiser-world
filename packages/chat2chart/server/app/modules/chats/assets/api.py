"""
API endpoints for saved assets (Asset Library)
"""

from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.modules.authentication.deps.auth_bearer import JWTCookieBearer
from app.modules.chats.assets.schemas import (
    SavedAssetSchema,
    SavedAssetResponseSchema,
    AssetListResponseSchema
)
from app.modules.chats.assets.services import AssetService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Assets"])
service = AssetService()


@router.post("", response_model=SavedAssetResponseSchema)
@router.post("/", response_model=SavedAssetResponseSchema)
async def save_asset(
    asset: SavedAssetSchema,
    current_token: dict = Depends(JWTCookieBearer())
):
    """Save an asset (chart, insight, query, etc.) to the library"""
    try:
        result = await service.create_asset(asset)
        logger.info(f"✅ Saved asset: {result.id} ({result.asset_type})")
        return result
    except Exception as e:
        logger.error(f"Failed to save asset: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("", response_model=AssetListResponseSchema)
@router.get("/", response_model=AssetListResponseSchema)
async def get_assets(
    conversation_id: Optional[str] = None,
    asset_type: Optional[str] = None,
    data_source_id: Optional[str] = None,
    offset: int = 0,
    limit: int = 50,
    current_token: dict = Depends(JWTCookieBearer())
):
    """Get saved assets with optional filters"""
    try:
        filters = {}
        if conversation_id:
            filters["conversation_id"] = conversation_id
        if asset_type:
            filters["asset_type"] = asset_type
        if data_source_id:
            filters["data_source_id"] = data_source_id
        
        result = await service.get_assets(
            filters=filters,
            offset=offset,
            limit=limit
        )
        return result
    except Exception as e:
        logger.error(f"Failed to get assets: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{asset_id}", response_model=SavedAssetResponseSchema)
async def get_asset(
    asset_id: str,
    current_token: dict = Depends(JWTCookieBearer())
):
    """Get a specific asset by ID"""
    try:
        result = await service.get_asset(asset_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Asset not found"
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get asset: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/{asset_id}")
async def delete_asset(
    asset_id: str,
    current_token: dict = Depends(JWTCookieBearer())
):
    """Delete (soft delete) an asset"""
    try:
        result = await service.delete_asset(asset_id)
        return result
    except Exception as e:
        logger.error(f"Failed to delete asset: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

