from typing import Annotated
from app.common.schemas import ListResponseSchema
from app.common.utils.query_params import BaseFilterParams
from app.common.utils.search_query import create_search_query
from fastapi import APIRouter, Depends, HTTPException, status
from app.modules.authentication.deps.auth_bearer import JWTCookieBearer
import logging

from .schemas import (
    ConversationResponseSchema,
    SpecificConversationResponseSchema,
    ConversationSchema,
    ConversationUpdateSchema,
)
from .services import ConversationService

logger = logging.getLogger(__name__)

router = APIRouter()
service = ConversationService()


@router.get("/", response_model=ListResponseSchema[ConversationResponseSchema])
async def get_conversations(
    params: Annotated[BaseFilterParams, Depends()],
    current_token: dict = Depends(JWTCookieBearer())
):
    """Get conversations for the authenticated user only"""
    try:
        # Extract user_id from token
        user_id = current_token.get('id') or current_token.get('user_id') or current_token.get('sub')
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )
        
        # Get conversations filtered by user_id
        # Note: search_query in get_all_by_user expects a string, not a dict
        search_query_str = params.search if params.search else None
        
        result = await service.get_all_by_user(
            user_id=str(user_id),
            offset=params.offset,
            limit=params.limit,
            search_query=search_query_str,
            sort_by=params.sort_by,
            sort_order=params.sort_order,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/{conversation_id}", response_model=SpecificConversationResponseSchema)
async def get_conversation(
    conversation_id: str,
    offset: int = 0,
    limit: int = 100,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    current_token: dict = Depends(JWTCookieBearer())
):
    """Get a specific conversation - only if user owns it"""
    try:
        # Extract user_id from token
        user_id = current_token.get('id') or current_token.get('user_id') or current_token.get('sub')
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )
        
        # Get conversation and verify ownership
        result = await service.get_conversation(
            conversation_id, offset, limit, sort_by, sort_order, user_id=str(user_id)
        )

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/", response_model=ConversationResponseSchema)
async def create_conversation(
    conversation: ConversationSchema,
    current_token: dict = Depends(JWTCookieBearer())
):
    """Create a new conversation for the authenticated user"""
    try:
        # Extract user_id from token
        user_id = current_token.get('id') or current_token.get('user_id') or current_token.get('sub')
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )
        
        result = await service.create(conversation, user_id=str(user_id))
        return result
    except HTTPException:
        raise
    except Exception as e:
        # Log full exception with traceback for easier debugging in dev
        import logging, traceback
        logging.getLogger(__name__).exception(f"Failed to create conversation: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.put("/{conversation_id}", response_model=ConversationResponseSchema)
async def update_conversation(
    conversation_id: str,
    conversation: ConversationUpdateSchema,
    current_token: dict = Depends(JWTCookieBearer())
):
    """Update an existing conversation - only if user owns it"""
    try:
        # Extract user_id from token
        user_id = current_token.get('id') or current_token.get('user_id') or current_token.get('sub')
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )
        
        # Verify ownership before updating
        if not await service._verify_conversation_ownership(conversation_id, str(user_id)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to update this conversation"
            )
        
        # Use custom update method that handles UUID
        result = await service.update_conversation(conversation_id, conversation)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        return ConversationResponseSchema.model_validate(result.__dict__)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_token: dict = Depends(JWTCookieBearer())
):
    """Delete (soft delete) a conversation - only if user owns it"""
    try:
        # Extract user_id from token
        user_id = current_token.get('id') or current_token.get('user_id') or current_token.get('sub')
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )
        
        # Verify ownership before deleting
        if not await service._verify_conversation_ownership(conversation_id, str(user_id)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to delete this conversation"
            )
        
        # Delete conversation (soft delete)
        result = await service.delete_conversation(conversation_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        return {"success": True, "message": "Conversation deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/{conversation_id}/messages")
async def add_message_to_conversation(
    conversation_id: str,
    message: dict,
    current_token: dict = Depends(JWTCookieBearer())
):
    """Add a message to an existing conversation - only if user owns it"""
    try:
        # Extract user_id from token
        user_id = current_token.get('id') or current_token.get('user_id') or current_token.get('sub')
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )
        
        # Verify ownership before adding message
        if not await service._verify_conversation_ownership(conversation_id, str(user_id)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to add messages to this conversation"
            )
        
        result = await service.add_message(conversation_id, message)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
