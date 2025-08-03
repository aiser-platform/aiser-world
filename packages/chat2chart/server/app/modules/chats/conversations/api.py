from typing import Annotated
from app.common.schemas import ListResponseSchema
from app.common.utils.query_params import BaseFilterParams
from app.common.utils.search_query import create_search_query
from fastapi import APIRouter, Depends, HTTPException, status

from .schemas import ConversationResponseSchema, SpecificConversationResponseSchema
from .services import ConversationService

router = APIRouter()
service = ConversationService()


@router.get("/", response_model=ListResponseSchema[ConversationResponseSchema])
async def get_conversations(params: Annotated[BaseFilterParams, Depends()]):
    try:
        search_query = create_search_query(params.search, params.search_columns)

        result = await service.get_all(
            offset=params.offset,
            limit=params.limit,
            search_query=search_query,
            sort_by=params.sort_by,
            sort_order=params.sort_order,
        )
        return result
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
):
    try:
        result = await service.get_conversation(
            conversation_id, offset, limit, sort_by, sort_order
        )

        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
