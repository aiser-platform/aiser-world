from app.common.repository import BaseRepository
from app.modules.chats.messages.models import ChatMessage
from app.modules.chats.messages.schemas import MessageCreateSchema, MessageUpdateSchema


class MessageRepository(
    BaseRepository[ChatMessage, MessageCreateSchema, MessageUpdateSchema]
):
    def __init__(self):
        super().__init__(ChatMessage)

    async def get_conversation_messages(
        self, conversation_id: str, offset: int, limit: int
    ):
        try:
            query = self._build_base_query().filter(
                ChatMessage.conversation_id == conversation_id
            )
            query = self._apply_pagination(query, offset, limit)

            result = await self._execute_and_fetch_all(query)

            await self.get_pagination_info(query)

            return result
        except Exception as e:
            # Log the error here if needed
            raise Exception(f"Error getting conversation messages: {str(e)}")
