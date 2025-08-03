import json
import logging
from uuid import uuid4

from app.modules.chats.conversations.repository import ConversationRepository
from app.modules.chats.conversations.schemas import (
    ConversationSchema,
    ConversationUpdateSchema,
)
from app.modules.chats.core.ai_flows import AIManager
from app.modules.chats.messages import MessageRepository, MessageResponseSchema
from app.modules.chats.schemas import ChatResponseSchema, ChatSchema

logger = logging.getLogger(__name__)


class ChatService:
    def __init__(self):
        self.__conversation_id = None
        self.__message_id = None

        self.__conversation_response = None
        self.__message_response = None

        self.__conversation_repository = ConversationRepository()
        self.__message_repository = MessageRepository()
        self.__ai_manager = None

    async def chat(self, data: ChatSchema) -> ChatResponseSchema:
        """
        Process a chat interaction by managing conversation and message storage.

        Returns:
            dict: {'conversation': ConversationSchema, 'message': MessageResponseSchema}

        Raises:
            Exception: If conversation or message processing fails
        """
        try:
            self.__data = data.model_copy()
            self.__conversation_id = self.__data.conversation_id or str(uuid4())
            self.__data.conversation_id = self.__conversation_id
            self.__message_id = str(uuid4())
            self.__data.message_id = self.__message_id
            self.__ai_manager = AIManager(self.__data)

        except Exception as e:
            logger.error(f"Chat initialization failed: {str(e)}")
            raise Exception("Failed to initialize chat")

        try:
            await self.__ai_manager.process_query()
            await self.conversation()
            await self.save_message()

            conversation = self.get_conversation_response()
            message = self.get_message_response()

            return ChatResponseSchema(conversation=conversation, message=message)

        except Exception as e:
            logger.error(f"Chat processing failed: {str(e)}")
            raise Exception("Failed to process chat request") from e

    async def conversation(self):
        try:
            conversation = await self.__conversation_repository.get(
                self.__conversation_id
            )

            if not conversation:
                conversation = await self.__new_conversion()
            else:
                model = ConversationUpdateSchema(
                    json_metadata=json.dumps(self.__data.json_metadata, indent=4),
                )
                conversation = await self.__conversation_repository.update(
                    self.__conversation_id, model
                )

            self.__set_conversation_response(
                ConversationSchema(
                    id=self.__conversation_id,
                    title=conversation.title,
                    json_metadata=conversation.json_metadata,
                )
            )

            return conversation

        except Exception as e:
            logger.error(f"Exception: {e}")
            raise e

    async def save_message(self):
        try:
            answer = self.__ai_manager.get_response()

            messageData = {
                "id": self.__message_id,
                "conversation_id": self.__conversation_id,
                "query": self.__data.prompt,
                "answer": answer,
                "error": None,
                "status": None,
            }
            message = await self.__message_repository.create(messageData)

            if not message:
                logger.error("Failed to store message")
                raise Exception("Failed to store message")

            self.__set_message_response(
                MessageResponseSchema(
                    id=self.__message_id,
                    conversation_id=message.conversation_id,
                    query=message.query,
                    answer=message.answer,
                    error=message.error,
                    status=message.status,
                )
            )

            return message

        except Exception as e:
            logger.error(f"Exception: {e}")
            raise e

    async def __new_conversion(self):
        title = None
        try:
            title_completion = await self.__ai_manager.title_handler()
            title = title_completion["response"]

        except Exception as e:
            logger.error(f"Exception: {e}")

        conversationData = ConversationSchema(
            id=self.__conversation_id,
            json_metadata=json.dumps(self.__data.json_metadata, indent=4),
            title=(title if title else "New conversation"),
        )

        conversation = await self.__conversation_repository.create(conversationData)

        if not conversation:
            logger.error("Failed to create conversation")
            raise Exception("Failed to create conversation")

        return conversation

    def __set_conversation_response(self, conversation):
        self.__conversation_response = conversation

    def __set_message_response(self, message):
        self.__message_response = message

    def get_conversation_response(self):
        return self.__conversation_response

    def get_message_response(self):
        return self.__message_response
