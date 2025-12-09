"""
LangChain Memory Service for PostgreSQL Integration

This service bridges LangChain memory modules with PostgreSQL storage,
providing persistent conversation memory and context enrichment.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from langchain_core.memory import BaseMemory
from sqlalchemy.future import select

from app.modules.chats.schemas import (
    AgentContextSchema,
    LangChainMemorySchema,
    EntityMemorySchema
)
from app.modules.chats.conversations.models import ChatConversation
from app.modules.chats.messages.models import ChatMessage

logger = logging.getLogger(__name__)


class PostgreSQLChatMemory(BaseMemory):
    """
    Custom LangChain memory implementation that stores conversation memory in PostgreSQL.
    
    This class extends BaseChatMemory to provide persistent storage of conversation
    history, summaries, and entity tracking using the existing PostgreSQL schema.
    """
    
    def __init__(
        self,
        conversation_id: UUID,
        async_session_factory: Any,  # Changed to async_session_factory
        context_window: int = 10,
        memory_type: str = "buffer"
    ):
        super().__init__()
        self.conversation_id = conversation_id
        self.async_session_factory = async_session_factory  # Changed to async_session_factory
        self.context_window = context_window
        self.memory_type = memory_type
        self._memory_data: Optional[LangChainMemorySchema] = None
        
    @property
    def memory_variables(self) -> List[str]:
        """Return the list of memory variables that this memory class will provide."""
        return ["chat_history", "conversation_summary", "entities"]
    
    async def load_memory_variables(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Load memory variables from PostgreSQL.
        
        Args:
            inputs: Input variables (not used in this implementation)
            
        Returns:
            Dictionary containing memory variables
        """
        try:
            memory_data = await self._get_memory_data()
            
            # Get recent messages for chat history
            chat_history = await self._get_recent_messages()
            
            # Extract conversation summary
            conversation_summary = ""
            if memory_data.conversation_summary:
                conversation_summary = memory_data.conversation_summary.summary
            
            # Extract entities
            entities = {}
            for entity in memory_data.entity_memory:
                if entity.entity_type not in entities:
                    entities[entity.entity_type] = []
                entities[entity.entity_type].append(entity.entity_name)
            
            return {
                "chat_history": chat_history,
                "conversation_summary": conversation_summary,
                "entities": entities
            }
            
        except Exception as e:
            logger.error(f"Error loading memory variables: {e}")
            return {
                "chat_history": [],
                "conversation_summary": "",
                "entities": {}
            }
    
    async def save_context(self, inputs: Dict[str, Any], outputs: Dict[str, str]) -> None:
        """
        Save context to PostgreSQL.
        
        Args:
            inputs: Input variables containing user message
            outputs: Output variables containing AI response
        """
        try:
            # Extract user message and AI response
            user_message = inputs.get("input", "")
            ai_response = outputs.get("output", "")
            
            if not user_message or not ai_response:
                logger.warning("Missing user message or AI response, skipping save")
                return
            
            # Add messages to conversation
            await self._add_user_message(user_message)
            await self._add_ai_message(ai_response)
            
            # Update memory data
            await self._update_memory_data()
            
            # Check if we need to summarize (every 20 messages)
            if await self._should_summarize():
                await self._create_conversation_summary()
                
        except Exception as e:
            logger.error(f"Error saving context: {e}")
    
    async def clear(self) -> None:
        """Clear memory from PostgreSQL."""
        try:
            async with self.async_session_factory() as session:
                result = await session.execute(
                    select(ChatConversation).filter(
                        ChatConversation.id == self.conversation_id
                    )
                )
                conversation = result.scalar_one_or_none()
                
                if conversation:
                    conversation.langchain_memory = None
                    await session.commit()
                    
            self._memory_data = None
            logger.info(f"Cleared memory for conversation {self.conversation_id}")
            
        except Exception as e:
            logger.error(f"Error clearing memory: {e}")
    
    async def _get_memory_data(self) -> LangChainMemorySchema:
        """Get memory data from PostgreSQL or create default."""
        if self._memory_data is None:
            try:
                async with self.async_session_factory() as session:
                    result = await session.execute(
                        select(ChatConversation).filter(
                            ChatConversation.id == self.conversation_id
                        )
                    )
                    conversation = result.scalar_one_or_none()
                    
                    if conversation and conversation.langchain_memory:
                        # Load existing memory data
                        memory_dict = conversation.langchain_memory
                        self._memory_data = LangChainMemorySchema(**memory_dict)
                    else:
                        # Create new memory data
                        self._memory_data = LangChainMemorySchema(
                            context_window=self.context_window,
                            memory_type=self.memory_type
                        )
                        
            except Exception as e:
                logger.error(f"Error loading memory data: {e}")
                self._memory_data = LangChainMemorySchema(
                    context_window=self.context_window,
                    memory_type=self.memory_type
                )
                
        return self._memory_data
    
    async def _get_recent_messages(self) -> List[Tuple[str, str]]:
        """Get recent messages for chat history."""
        try:
            async with self.async_session_factory() as session:
                result = await session.execute(
                    select(ChatMessage)
                    .filter(ChatMessage.conversation_id == self.conversation_id)
                    .order_by(ChatMessage.created_at.desc())
                    .limit(self.context_window)
                )
                messages = result.scalars().all()
                
                # Convert to (role, content) tuples
                chat_history = []
                for message in reversed(messages):  # Reverse to get chronological order
                    if message.query:
                        chat_history.append(("human", message.query))
                    if message.answer:
                        chat_history.append(("ai", message.answer))
                        
                return chat_history
                
        except Exception as e:
            logger.error(f"Error getting recent messages: {e}")
            return []
    
    async def _add_user_message(self, message: str) -> None:
        """Add user message to conversation."""
        try:
            async with self.async_session_factory() as session:
                chat_message = ChatMessage(
                    conversation_id=self.conversation_id,
                    query=message,
                    status="completed"
                )
                session.add(chat_message)
                await session.commit()
                
        except Exception as e:
            logger.error(f"Error adding user message: {e}")
    
    async def _add_ai_message(self, message: str) -> None:
        """Add AI message to conversation."""
        try:
            async with self.async_session_factory() as session:
                # Find the last message and update it with AI response
                result = await session.execute(
                    select(ChatMessage)
                    .filter(ChatMessage.conversation_id == self.conversation_id)
                    .order_by(ChatMessage.created_at.desc())
                    .limit(1)
                )
                last_message = result.scalar_one_or_none()
                
                if last_message:
                    last_message.answer = message
                    await session.commit()
                else:
                    # Create new message if none exists
                    chat_message = ChatMessage(
                        conversation_id=self.conversation_id,
                        answer=message,
                        status="completed"
                    )
                    session.add(chat_message)
                    await session.commit()
                    
        except Exception as e:
            logger.error(f"Error adding AI message: {e}")
    
    async def _update_memory_data(self) -> None:
        """Update memory data in PostgreSQL."""
        try:
            if self._memory_data:
                self._memory_data.updated_at = datetime.utcnow()
                
                async with self.async_session_factory() as session:
                    result = await session.execute(
                        select(ChatConversation).filter(
                            ChatConversation.id == self.conversation_id
                        )
                    )
                    conversation = result.scalar_one_or_none()
                    
                    if conversation:
                        conversation.langchain_memory = self._memory_data.dict()
                        await session.commit()
                        
        except Exception as e:
            logger.error(f"Error updating memory data: {e}")
    
    async def _should_summarize(self) -> bool:
        """Check if conversation should be summarized."""
        try:
            async with self.async_session_factory() as session:
                result = await session.execute(
                    select(ChatMessage)
                    .filter(ChatMessage.conversation_id == self.conversation_id)
                )
                message_count = len(result.scalars().all()) # Count messages
                
                # Summarize every 20 messages
                return message_count % 20 == 0
                
        except Exception as e:
            logger.error(f"Error checking if should summarize: {e}")
            return False
    
    async def _create_conversation_summary(self) -> None:
        """Create conversation summary using AI."""
        try:
            # Get conversation history
            chat_history = await self._get_recent_messages()
            
            if not chat_history:
                return
            
            # Create summary using AI (this would integrate with LiteLLM service)
            # For now, create a simple summary
            summary_text = f"Conversation with {len(chat_history)} messages covering various topics."
            
            # Update memory data with summary
            if self._memory_data:
                self._memory_data.conversation_summary = ConversationSummarySchema(
                    summary=summary_text,
                    key_topics=["data analysis", "charts", "insights"],
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                self._memory_data.last_summarized_at = datetime.utcnow()
                
                await self._update_memory_data()
                
        except Exception as e:
            logger.error(f"Error creating conversation summary: {e}")


class LangChainMemoryService:
    """
    Service for managing LangChain memory integration with PostgreSQL.
    
    This service provides high-level methods for creating, managing, and using
    LangChain memory instances with the existing PostgreSQL schema.
    """
    
    def __init__(self, async_session_factory: Any): # Changed to async_session_factory
        self.async_session_factory = async_session_factory
    
    def create_conversation_memory(
        self,
        conversation_id: UUID,
        context_window: int = 10,
        memory_type: str = "buffer"
    ) -> PostgreSQLChatMemory:
        """
        Create a new conversation memory instance.
        
        Args:
            conversation_id: UUID of the conversation
            context_window: Number of recent messages to keep in context
            memory_type: Type of memory (buffer, summary, or hybrid)
            
        Returns:
            PostgreSQLChatMemory instance
        """
        return PostgreSQLChatMemory(
            conversation_id=conversation_id,
            async_session_factory=self.async_session_factory,
            context_window=context_window,
            memory_type=memory_type
        )
    
    async def get_conversation_context(self, conversation_id: UUID) -> Optional[AgentContextSchema]:
        """
        Get agent context for a conversation.
        
        Args:
            conversation_id: UUID of the conversation
            
        Returns:
            AgentContextSchema or None if not found
        """
        try:
            async with self.async_session_factory() as session:
                result = await session.execute(
                    select(ChatConversation).filter(
                        ChatConversation.id == conversation_id
                    )
                )
                conversation = result.scalar_one_or_none()
                
                if conversation and conversation.agent_context:
                    return AgentContextSchema(**conversation.agent_context)
                    
                return None
                
        except Exception as e:
            logger.error(f"Error getting conversation context: {e}")
            return None
    
    async def update_conversation_context(
        self,
        conversation_id: UUID,
        context: AgentContextSchema
    ) -> bool:
        """
        Update agent context for a conversation.
        
        Args:
            conversation_id: UUID of the conversation
            context: Updated context data
            
        Returns:
            True if successful, False otherwise
        """
        try:
            async with self.async_session_factory() as session:
                result = await session.execute(
                    select(ChatConversation).filter(
                        ChatConversation.id == conversation_id
                    )
                )
                conversation = result.scalar_one_or_none()
                
                if conversation:
                    conversation.agent_context = context.dict()
                    await session.commit()
                    return True
                    
                return False
                
        except Exception as e:
            logger.error(f"Error updating conversation context: {e}")
            return False
    
    async def add_entity_to_memory(
        self,
        conversation_id: UUID,
        entity: EntityMemorySchema
    ) -> bool:
        """
        Add an entity to conversation memory.
        
        Args:
            conversation_id: UUID of the conversation
            entity: Entity to add
            
        Returns:
            True if successful, False otherwise
        """
        try:
            memory_service = self.create_conversation_memory(conversation_id)
            memory_data = await memory_service._get_memory_data()
            
            # Check if entity already exists
            existing_entity = None
            for existing in memory_data.entity_memory:
                if (existing.entity_type == entity.entity_type and 
                    existing.entity_name == entity.entity_name):
                    existing_entity = existing
                    break
            
            if existing_entity:
                # Update existing entity
                existing_entity.mention_count += 1
                existing_entity.last_mentioned = datetime.utcnow()
            else:
                # Add new entity
                memory_data.entity_memory.append(entity)
            
            await memory_service._update_memory_data()
            return True
            
        except Exception as e:
            logger.error(f"Error adding entity to memory: {e}")
            return False
    
    async def get_conversation_entities(self, conversation_id: UUID) -> List[EntityMemorySchema]:
        """
        Get all entities tracked in conversation memory.
        
        Args:
            conversation_id: UUID of the conversation
            
        Returns:
            List of EntityMemorySchema objects
        """
        try:
            memory_service = self.create_conversation_memory(conversation_id)
            memory_data = await memory_service._get_memory_data()
            return memory_data.entity_memory
            
        except Exception as e:
            logger.error(f"Error getting conversation entities: {e}")
            return []
    
    async def clear_conversation_memory(self, conversation_id: UUID) -> bool:
        """
        Clear all memory for a conversation.
        
        Args:
            conversation_id: UUID of the conversation
            
        Returns:
            True if successful, False otherwise
        """
        try:
            memory_service = self.create_conversation_memory(conversation_id)
            await memory_service.clear()
            return True
            
        except Exception as e:
            logger.error(f"Error clearing conversation memory: {e}")
            return False
    
    async def load_memory_from_db(self, conversation_id: UUID) -> Optional[LangChainMemorySchema]:
        """
        Load memory state from database for a conversation.
        
        Args:
            conversation_id: UUID of the conversation
            
        Returns:
            LangChainMemorySchema or None if not found
        """
        try:
            async with self.async_session_factory() as session:
                result = await session.execute(
                    select(ChatConversation).filter(
                        ChatConversation.id == conversation_id
                    )
                )
                conversation = result.scalar_one_or_none()
                
                if conversation and conversation.langchain_memory:
                    # Load existing memory data
                    memory_dict = conversation.langchain_memory
                    return LangChainMemorySchema(**memory_dict)
                else:
                    # Return None if no memory exists
                    return None
                    
        except Exception as e:
            logger.error(f"Error loading memory from database: {e}")
            return None
    
    def initialize_new_memory(self) -> LangChainMemorySchema:
        """
        Initialize a new memory state.
        
        Returns:
            New LangChainMemorySchema instance
        """
        return LangChainMemorySchema(
            conversation_summary=None,
            entity_memory=[],
            context_window=10,
            memory_type="buffer",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
    
    async def save_memory_to_db(
        self, 
        conversation_id: UUID, 
        memory_state: LangChainMemorySchema
    ) -> bool:
        """
        Save memory state to database.
        
        Args:
            conversation_id: UUID of the conversation
            memory_state: Memory state to save
            
        Returns:
            True if successful, False otherwise
        """
        try:
            async with self.async_session_factory() as session:
                result = await session.execute(
                    select(ChatConversation).filter(
                        ChatConversation.id == conversation_id
                    )
                )
                conversation = result.scalar_one_or_none()
                
                if conversation:
                    # Update memory state - serialize datetime objects for JSON compatibility
                    memory_dict = memory_state.dict() if hasattr(memory_state, 'dict') else memory_state.model_dump()
                    
                    # CRITICAL: Serialize datetime objects to ISO format strings for JSON compatibility
                    def serialize_datetime(obj):
                        """Recursively serialize datetime objects in dict."""
                        if isinstance(obj, datetime):
                            return obj.isoformat()
                        elif isinstance(obj, dict):
                            return {k: serialize_datetime(v) for k, v in obj.items()}
                        elif isinstance(obj, list):
                            return [serialize_datetime(item) for item in obj]
                        return obj
                    
                    memory_dict = serialize_datetime(memory_dict)
                    conversation.langchain_memory = memory_dict
                    await session.commit()
                    return True
                else:
                    logger.warning(f"Conversation {conversation_id} not found, cannot save memory")
                    return False
                    
        except Exception as e:
            logger.error(f"Error saving memory to database: {e}")
            return False
    
    async def load_agent_context_from_db(self, conversation_id: UUID) -> Optional[AgentContextSchema]:
        """
        Load agent context from database for a conversation.
        
        Args:
            conversation_id: UUID of the conversation
            
        Returns:
            AgentContextSchema or None if not found
        """
        try:
            async with self.async_session_factory() as session:
                result = await session.execute(
                    select(ChatConversation).filter(
                        ChatConversation.id == conversation_id
                    )
                )
                conversation = result.scalar_one_or_none()
                
                if conversation and conversation.agent_context:
                    # Load existing agent context
                    context_dict = conversation.agent_context
                    return AgentContextSchema(**context_dict)
                else:
                    # Return None if no context exists
                    return None
                    
        except Exception as e:
            logger.error(f"Error loading agent context from database: {e}")
            return None
    
    def initialize_new_agent_context(
        self,
        user_id: str,
        user_role: str = "analyst",
        organization_id: str = "default-org",
        project_id: Optional[str] = None,
        data_sources: Optional[List[str]] = None
    ) -> AgentContextSchema:
        """
        Initialize a new agent context.
        
        Args:
            user_id: User ID
            user_role: User role (default: "analyst")
            organization_id: Organization ID
            project_id: Optional project ID
            data_sources: List of data source IDs
            
        Returns:
            New AgentContextSchema instance
        """
        from app.modules.chats.schemas import UserRole as UR
        
        # Map string role to UserRole enum
        role_mapping = {
            "admin": UR.ADMIN,
            "manager": UR.MANAGER,
            "analyst": UR.ANALYST,
            "employee": UR.EMPLOYEE,
            "viewer": UR.VIEWER
        }
        user_role_enum = role_mapping.get(user_role.lower(), UR.EMPLOYEE)
        
        return AgentContextSchema(
            user_id=user_id,
            user_role=user_role_enum,
            organization_id=organization_id,
            project_id=project_id,
            data_sources=data_sources or [],
            permissions={"read": True, "write": False},
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
    
    async def save_agent_context_to_db(
        self,
        conversation_id: UUID,
        agent_context: AgentContextSchema
    ) -> bool:
        """
        Save agent context to database.
        
        Args:
            conversation_id: UUID of the conversation
            agent_context: Agent context to save
            
        Returns:
            True if successful, False otherwise
        """
        try:
            async with self.async_session_factory() as session:
                result = await session.execute(
                    select(ChatConversation).filter(
                        ChatConversation.id == conversation_id
                    )
                )
                conversation = result.scalar_one_or_none()
                
                if conversation:
                    # Update agent context
                    context_dict = agent_context.dict() if hasattr(agent_context, 'dict') else agent_context.model_dump()
                    
                    # CRITICAL: Serialize datetime objects to ISO strings for JSONB storage
                    def serialize_datetime(obj):
                        """Recursively serialize datetime objects to ISO format strings"""
                        if isinstance(obj, datetime):
                            return obj.isoformat()
                        elif isinstance(obj, dict):
                            return {k: serialize_datetime(v) for k, v in obj.items()}
                        elif isinstance(obj, list):
                            return [serialize_datetime(item) for item in obj]
                        return obj
                    
                    context_dict = serialize_datetime(context_dict)
                    
                    conversation.agent_context = context_dict
                    await session.commit()
                    return True
                else:
                    logger.warning(f"Conversation {conversation_id} not found, cannot save agent context")
                    return False
                    
        except Exception as e:
            logger.error(f"Error saving agent context to database: {e}", exc_info=True)
            return False

