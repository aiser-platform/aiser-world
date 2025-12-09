from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
from app.modules.authentication.deps.auth_bearer import JWTCookieBearer
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/conversations/")
async def get_conversations(
    current_token: str = Depends(JWTCookieBearer()),
    limit: int = 10,
    offset: int = 0
):
    """Get conversations for the authenticated user"""
    try:
        # For now, return empty conversations list
        # This prevents the frontend error while the conversations feature is being developed
        return {
            "items": [],
            "pagination": {
                "total": 0,
                "offset": offset,
                "limit": limit,
                "has_more": False,
                "total_pages": 1,
                "current_page": 1,
            }
        }
    except Exception as e:
        logger.error(f"Error fetching conversations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch conversations"
        )

@router.post("/conversations/")
async def create_conversation(
    current_token: str = Depends(JWTCookieBearer()),
    title: Optional[str] = None
):
    """Create a new conversation"""
    try:
        # For now, return a mock conversation
        return {
            "id": "mock-conversation-id",
            "title": title or "New Conversation",
            "created_at": "2025-10-15T10:00:00Z",
            "updated_at": "2025-10-15T10:00:00Z",
            "is_active": True,
            "is_deleted": False,
            "json_metadata": None
        }
    except Exception as e:
        logger.error(f"Error creating conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create conversation"
        )
