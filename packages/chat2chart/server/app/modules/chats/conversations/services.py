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
import uuid

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
            # Validate UUID format
            try:
                uuid.UUID(conversation_id)
            except ValueError:
                raise Exception(f"Invalid conversation ID format: {conversation_id}. Expected UUID format.")
            
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

    async def add_message(self, conversation_id: str, message: dict):
        """Add a message to a conversation"""
        try:
            # Validate UUID format
            try:
                uuid.UUID(conversation_id)
            except ValueError:
                raise Exception(f"Invalid conversation ID format: {conversation_id}. Expected UUID format.")
            
            # Verify conversation exists
            conversation = await self.repository.get(conversation_id)
            if not conversation:
                raise Exception("Conversation not found")
            
            # Create message using the message repository
            message_data = {
                "conversation_id": conversation_id,
                "query": message.get("role") == "user" and message.get("content", "") or None,
                "answer": message.get("role") == "assistant" and message.get("content", "") or None,
                "status": "completed"
            }
            
            created_message = await self.__messages_repository.create(message_data)
            
            # Update conversation metadata if needed
            if message.get("update_conversation_metadata"):
                update_data = ConversationUpdateSchema(
                    json_metadata=message.get("conversation_metadata")
                )
                await self.update(conversation_id, update_data)
            
            return created_message
            
        except Exception as e:
            logger.error(f"Failed to add message to conversation: {str(e)}")
            raise e
