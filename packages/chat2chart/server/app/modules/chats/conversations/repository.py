from app.modules.chats.conversations.schemas import (
    ConversationSchema,
    ConversationUpdateSchema,
)
from app.common.repository import BaseRepository
from app.modules.chats.conversations.models import ChatConversation


class ConversationRepository(
    BaseRepository[ChatConversation, ConversationSchema, ConversationUpdateSchema]
):
    def __init__(self):
        super().__init__(ChatConversation)
