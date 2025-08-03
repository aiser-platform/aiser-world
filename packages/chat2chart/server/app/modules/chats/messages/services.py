from app.common.service import BaseService
from app.modules.chats.messages.models import ChatMessage
from app.modules.chats.messages.repository import MessageRepository
from app.modules.chats.messages.schemas import (
    MessageCreateSchema,
    MessageUpdateSchema,
    MessageResponseSchema,
)


class MessageService(
    BaseService[
        ChatMessage, MessageCreateSchema, MessageUpdateSchema, MessageResponseSchema
    ]
):
    def __init__(self):
        repository = MessageRepository()
        super().__init__(repository)
