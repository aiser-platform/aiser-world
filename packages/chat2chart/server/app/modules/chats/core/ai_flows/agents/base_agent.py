import json
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List

from app.core.config import settings
from app.modules.chats.node_memory.models import ChatNode
from app.modules.chats.node_memory.repository import ChatNodeRepository
from app.modules.chats.node_memory.schemas import ChatNodeSchema
from openai import AsyncOpenAI
from openai.types.chat import ChatCompletion

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    def __init__(
        self,
        name: str,
        system_prompt: str,
        model_id: str = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        predecessor_node_id: str = None,
        save_memory: bool = True,
        conversation_id: str = None,
        message_id: str = None,
    ):
        """Initialize the base agent with configuration and memory settings.

        Args:
            name: Agent identifier name
            system_prompt: The system instruction for the AI
            model_id: OpenAI model identifier (defaults to settings)
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens in response
            predecessor_node_id: ID of previous node in conversation
            save_memory: Whether to persist conversations
            conversation_id: ID of the conversation thread
            message_id: Unique message identifier
        """
        # Repository setup
        self.__node_repository = ChatNodeRepository()

        # Core settings
        self._name = name
        self._system_prompt = system_prompt
        self._model_name = model_id or settings.OPENAI_MODEL_ID
        self._temperature = temperature
        self._max_tokens = max_tokens

        # Response
        self._completion_response: ChatCompletion = None

        # Memory management
        self._memories = []
        self._save_memory = save_memory
        self._predecessor_node_id = predecessor_node_id

        # Conversation tracking
        self._conversation_id = conversation_id
        self._message_id = message_id

        # OpenAI client
        self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def completion(
        self, user_prompt: str, messages: List[Dict[str, str]] = []
    ) -> str:
        """Get completion from OpenAI API and save to memory if enabled."""
        try:
            # Load existing memories if any
            await self._load_node_memory()

            result, response = await self._get_openai_response(user_prompt, messages)

            self._completion_response = response

            if self._save_memory:
                await self._save_completion_to_memory(user_prompt, result, response)

            return result
        except Exception as e:
            logger.error(f"Error getting completion: {e}")
            raise

    async def _get_openai_response(
        self, user_prompt: str, messages: List[Dict[str, str]]
    ) -> tuple:
        """Make API call to OpenAI."""
        response = await self._client.chat.completions.create(
            model=self._model_name,
            max_tokens=self._max_tokens,
            temperature=self._temperature,
            messages=[
                {"role": "system", "content": self._system_prompt},
                *messages,
                {"role": "user", "content": user_prompt},
            ],
        )
        return response.choices[0].message.content, response

    async def _save_completion_to_memory(
        self, user_prompt: str, result: str, response: ChatCompletion
    ) -> None:
        """Save completion result to memory."""
        data = ChatNodeSchema(
            conversation_id=self._conversation_id,
            message_id=self._message_id,
            node_key=self._name,
            node_name=self._name,
            input=user_prompt,
            output=result,
            execution_metadata=json.dumps(response.usage.to_dict(), indent=4),
            predecessor_node_id=self._predecessor_node_id,
        )
        await self._save_node_memory(data)

    @abstractmethod
    async def execute(
        self, user_prompt: str, messages: List[Dict[str, str]] = []
    ) -> Any:
        pass

    async def tool_execute(
        self, user_prompt: str = None, assistant_content: str = None
    ) -> Any:
        pass

    async def _save_node_memory(self, data: ChatNodeSchema):
        """Save node data to repository."""
        try:
            memory = await self.__node_repository.create(data)
            self._predecessor_node_id = memory.id
            return memory
        except Exception as e:
            logger.error(f"Error saving node memory: {e}")
            raise

    async def _load_node_memory(self):
        """Load memories from repository."""
        try:
            memories: List[ChatNode] = await self.__node_repository.get_nodes_by_key(
                node_key=self._name, conversation_id=self._conversation_id
            )

            self._memories.extend(
                [
                    item
                    for memory in memories
                    for item in [
                        {"role": "user", "content": memory.input},
                        {"role": "assistant", "content": memory.output},
                    ]
                ]
            )

            return memories
        except Exception as e:
            logger.error(f"Error loading node memory: {e}")
            raise
