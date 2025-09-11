"""
Simple Chat Service for testing
"""

import json
import logging
from uuid import uuid4
from datetime import datetime

from app.modules.chats.conversations.repository import ConversationRepository
from app.modules.chats.conversations.schemas import ConversationSchema
from app.modules.chats.messages import MessageRepository, MessageResponseSchema
from app.modules.chats.schemas import ChatResponseSchema, ChatSchema
from app.modules.ai.services.litellm_service import LiteLLMService

logger = logging.getLogger(__name__)


class SimpleChatService:
    """
    Simple Chat Service for testing basic functionality
    """

    def __init__(self):
        self.conversation_repository = ConversationRepository()
        self.message_repository = MessageRepository()
        self.litellm_service = LiteLLMService()

    async def chat(self, data: ChatSchema) -> ChatResponseSchema:
        """
        Simple chat processing
        """
        try:
            conversation_id = data.conversation_id or str(uuid4())

            # Create or get conversation - always use ConversationSchema for response
            conversation_for_response = ConversationSchema(
                id=conversation_id,
                title=f"Chat {conversation_id[:8]}",
                json_metadata=json.dumps({}),
            )

            # Try to create in database but don't fail if it doesn't work
            if data.conversation_id:
                try:
                    await self.conversation_repository.get_by_id(conversation_id)
                except:
                    pass
            else:
                try:
                    conversation_data = ConversationSchema(
                        id=conversation_id,
                        title=f"Chat {conversation_id[:8]}",
                        json_metadata=json.dumps({}),
                    )
                    await self.conversation_repository.create(conversation_data)
                except Exception as e:
                    logger.warning(f"Could not create conversation: {e}")

            # Generate AI response using LiteLLM
            try:
                system_context = "You are Aiser, an AI assistant specialized in data visualization and analytics. You help users analyze data, create charts, and generate insights. Be helpful, concise, and professional."

                ai_response = await self.litellm_service.generate_completion(
                    prompt=data.prompt,
                    system_context=system_context,
                    max_tokens=1000,
                    temperature=0.7,
                )

                if ai_response.get("success"):
                    response_text = ai_response["content"]
                    logger.info("✅ LiteLLM response generated successfully")
                else:
                    logger.warning(f"LiteLLM failed: {ai_response.get('error')}")
                    response_text = "Hello! I'm your AI assistant for data visualization and analytics. How can I help you today?"

            except Exception as e:
                logger.warning(f"LiteLLM service error: {e}")
                response_text = "Hello! I'm your AI assistant for data visualization and analytics. How can I help you today?"

            # Create message
            message_data = {
                "id": str(uuid4()),
                "query": data.prompt,
                "answer": response_text,
                "status": "completed",
                "conversation_id": conversation_id,
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
                "is_active": True,
                "is_deleted": False,
                "error": None,
            }

            try:
                message = await self.message_repository.create(message_data)
            except Exception as e:
                logger.warning(f"Could not save message: {e}")
                message = MessageResponseSchema(**message_data)

            return ChatResponseSchema(
                conversation=conversation_for_response, message=message
            )

        except Exception as e:
            logger.error(f"Simple chat processing failed: {str(e)}")

            # Create fallback response
            fallback_conversation = ConversationSchema(
                id=conversation_id, title="Chat Session", json_metadata=json.dumps({})
            )

            fallback_message = MessageResponseSchema(
                id=str(uuid4()),
                query=data.prompt,
                answer="I apologize, but I encountered an issue processing your request. Please try again.",
                status="error",
                conversation_id=conversation_id,
                created_at=datetime.now(),
                updated_at=datetime.now(),
                is_active=True,
                is_deleted=False,
                error=str(e),
            )

            return ChatResponseSchema(
                conversation=fallback_conversation, message=fallback_message
            )
