from app.common.service import BaseService
from app.modules.chats.conversations.models import ChatConversation
from app.modules.chats.conversations.repository import ConversationRepository
from app.modules.chats.conversations.schemas import (
    ConversationResponseSchema,
    ConversationSchema,
    ConversationUpdateSchema,
    SpecificConversationResponseSchema,
)
from app.modules.chats.messages.repository import MessageRepository
import logging

logger = logging.getLogger(__name__)


class ConversationService(
    BaseService[
        ChatConversation,
        ConversationSchema,
        ConversationUpdateSchema,
        ConversationResponseSchema,
    ]
):
    def __init__(self):
        repository = ConversationRepository()
        self.__messages_repository = MessageRepository()
        super().__init__(repository)

    async def get_conversation(
        self,
        conversation_id: str,
        offset: int,
        limit: int,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> SpecificConversationResponseSchema:
        try:
            conversation = await self.repository.get(conversation_id)
            messages = await self.__messages_repository.get_all(
                offset,
                limit,
                sort_by=sort_by,
                sort_order=sort_order,
                filter_query={"conversation_id": conversation_id},
            )
            pagination = await self.__messages_repository.get_pagination_info(
                offset, limit, filter_query={"conversation_id": conversation_id}
            )

            if not conversation:
                raise Exception("Conversation not found")

            return SpecificConversationResponseSchema(
                conversation=ConversationResponseSchema.model_validate(
                    conversation.__dict__
                ),
                messages=messages,
                pagination=pagination,
            )
        except Exception as e:
            logger.error(f"Failed to get conversation: {str(e)}")
            raise e
            # raise Exception("Failed to get conversation")
