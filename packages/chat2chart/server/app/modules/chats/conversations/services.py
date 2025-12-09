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
from typing import Optional

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

    async def get(self, id: str, retry_count: int = 0) -> Optional[ChatConversation]:
        """
        Retrieve a conversation by UUID (overrides base method to handle UUID strings)
        Includes retry logic for newly created conversations that may not be immediately available
        """
        try:
            # Convert string UUID to UUID object if needed
            if isinstance(id, str):
                try:
                    uuid_obj = uuid.UUID(id)
                except ValueError:
                    logger.error(f"Invalid UUID format: {id}")
                    return None
            else:
                uuid_obj = id
            
            result = await self.repository.get(uuid_obj)
            
            # If not found and this is a retry, wait a bit and try again (for newly created conversations)
            if not result and retry_count < 2:
                import asyncio
                await asyncio.sleep(0.1 * (retry_count + 1))  # 0.1s, 0.2s delays
                logger.info(f"Retrying conversation fetch (attempt {retry_count + 1}): {id}")
                return await self.get(id, retry_count + 1)
            
            if not result:
                logger.warning(f"Conversation not found after {retry_count + 1} attempts: {id}")
            return result
        except Exception as e:
            logger.error(f"Failed to get conversation: {str(e)}")
            return None

    async def create(self, obj_in: ConversationSchema, user_id: Optional[str] = None) -> ChatConversation:
        """
        Create a new conversation and ensure it's committed and immediately available
        CRITICAL: user_id is required for tenant isolation - stored in both user_id column and metadata
        """
        try:
            if not user_id:
                raise ValueError("user_id is required to create a conversation")
            
            # Store user_id in metadata as well (for backward compatibility)
            import json
            metadata = {}
            if obj_in.json_metadata:
                try:
                    metadata = json.loads(obj_in.json_metadata) if isinstance(obj_in.json_metadata, str) else obj_in.json_metadata
                except:
                    metadata = {}
            
            metadata['user_id'] = str(user_id)
            obj_in.json_metadata = json.dumps(metadata)
            
            # CRITICAL: Set user_id directly in the conversation object for proper tenant isolation
            # This ensures the conversation table has user_id column populated
            conversation_data = obj_in.model_dump() if hasattr(obj_in, 'model_dump') else obj_in.dict()
            conversation_data['user_id'] = user_id  # Store as UUID string, will be converted by SQLAlchemy
            
            # Create using repository with user_id embedded
            result = await self.repository.create(conversation_data)
            conversation_id = str(result.id) if hasattr(result, 'id') else 'unknown'
            logger.info(f"✅ Created conversation: {conversation_id}")
            
            # Verify the conversation can be retrieved immediately (with retry)
            # This ensures the transaction is fully committed
            import asyncio
            for attempt in range(3):
                try:
                    verified = await self.get(conversation_id)
                    if verified:
                        logger.info(f"✅ Verified conversation exists: {conversation_id}")
                        break
                    elif attempt < 2:
                        await asyncio.sleep(0.05 * (attempt + 1))  # 0.05s, 0.1s delays
                        logger.info(f"⏳ Retrying verification (attempt {attempt + 1}): {conversation_id}")
                    else:
                        logger.warning(f"⚠️ Conversation created but not immediately retrievable: {conversation_id}")
                except Exception as verify_error:
                    logger.warning(f"⚠️ Verification attempt {attempt + 1} failed: {verify_error}")
                    if attempt < 2:
                        await asyncio.sleep(0.05 * (attempt + 1))
            
            return result
        except Exception as e:
            logger.error(f"Failed to create conversation: {str(e)}")
            raise e

    async def get_conversation(
        self,
        conversation_id: str,
        offset: int,
        limit: int,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        user_id: Optional[str] = None,
    ) -> SpecificConversationResponseSchema:
        try:
            # Validate UUID format and convert to UUID object
            try:
                uuid_obj = uuid.UUID(conversation_id)
            except ValueError:
                raise Exception(
                    f"Invalid conversation ID format: {conversation_id}. Expected UUID format."
                )

            # Use the service's get method which includes retry logic
            conversation = await self.get(conversation_id)
            
            if not conversation:
                logger.error(f"Conversation not found: {conversation_id} (UUID: {uuid_obj})")
                raise Exception("Conversation not found")
            
            # SECURITY: Verify user owns this conversation
            if user_id:
                if not await self._verify_conversation_ownership(conversation_id, user_id):
                    logger.warning(f"User {user_id} attempted to access conversation {conversation_id} without ownership")
                    raise Exception("Access denied: You do not have permission to access this conversation")
            
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
        """Add a message to a conversation with full AI metadata preservation"""
        try:
            # Validate UUID format
            try:
                uuid_obj = uuid.UUID(conversation_id)
            except ValueError:
                logger.error(f"Invalid conversation ID format: {conversation_id}")
                raise Exception(
                    f"Invalid conversation ID format: {conversation_id}. Expected UUID format."
                )
            
            # Verify conversation exists
            conversation = await self.repository.get(uuid_obj)
            if not conversation:
                logger.error(f"Conversation not found when adding message: {conversation_id}")
                raise Exception("Conversation not found")

            # CRITICAL: Extract and preserve ALL AI metadata
            ai_metadata = message.get("ai_metadata", {})
            message_metadata = message.get("metadata", {})
            
            # Create message with full metadata preservation
            message_data = {
                "conversation_id": conversation_id,
                "query": message.get("query") if message.get("role") == "user" else (
                    message.get("content", "") if message.get("role") == "user" else None
                ),
                "answer": message.get("answer") if message.get("role") == "assistant" else (
                    message.get("content", "") if message.get("role") == "assistant" else None
                ),
                "status": "completed",
                "ai_metadata": ai_metadata,
                "message_metadata": message_metadata
            }
            
            logger.info(f"💾 Saving message with AI metadata: {len(str(ai_metadata))} bytes, has chart: {'echarts_config' in ai_metadata}")

            created_message = await self.__messages_repository.create(message_data)

            # Update conversation metadata if needed
            if message.get("update_conversation_metadata"):
                update_data = ConversationUpdateSchema(
                    json_metadata=message.get("conversation_metadata")
                )
                await self.update_conversation(conversation_id, update_data)

            return created_message

        except Exception as e:
            logger.error(f"Failed to add message to conversation: {str(e)}", exc_info=True)
            raise e
    
    async def get_all_by_user(
        self,
        user_id: str,
        offset: int = 0,
        limit: int = 50,
        search_query: Optional[str] = None,
        sort_by: Optional[str] = None,
        sort_order: Optional[str] = None,
    ):
        """Get all conversations for a specific user (via projects or metadata)"""
        try:
            from app.db.session import async_session
            import sqlalchemy as sa
            from app.modules.chats.conversations.models import ChatConversation
            from app.common.schemas import ListResponseSchema, PaginationSchema
            
            async with async_session() as session:
                # Convert user_id to UUID if it's a string
                import uuid as uuid_lib
                try:
                    user_uuid = uuid_lib.UUID(user_id) if isinstance(user_id, str) else user_id
                except (ValueError, TypeError):
                    # If user_id is not a valid UUID, try as string comparison
                    user_uuid = user_id
                
                # CRITICAL: Query ONLY conversations owned by this user using user_id column
                # Strict tenant isolation at database level - no cross-user access
                query = sa.text("""
                    SELECT c.*
                    FROM conversation c
                    WHERE c.user_id = :user_id
                    AND (c.is_deleted = FALSE OR c.is_deleted IS NULL)
                    AND (c.is_active = TRUE OR c.is_active IS NULL)
                    ORDER BY c.updated_at DESC NULLS LAST
                    LIMIT :limit_val OFFSET :offset_val
                """)
                
                result = await session.execute(query, {
                    'user_id': user_uuid,
                    'limit_val': limit,
                    'offset_val': offset
                })
                
                conversations = []
                for row in result:
                    conv_dict = dict(row._mapping)
                    conversations.append(ConversationResponseSchema.model_validate(conv_dict))
                
                # Get total count - use same filter as main query
                count_query = sa.text("""
                    SELECT COUNT(c.id)
                    FROM conversation c
                    WHERE c.user_id = :user_id
                    AND (c.is_deleted = FALSE OR c.is_deleted IS NULL)
                    AND (c.is_active = TRUE OR c.is_active IS NULL)
                """)
                
                count_result = await session.execute(count_query, {
                    'user_id': user_uuid
                })
                total = count_result.scalar() or 0
                
                pagination = PaginationSchema(
                    total=total,
                    offset=offset,
                    limit=limit,
                    has_more=(offset + limit) < total
                )
                
                return ListResponseSchema(
                    items=conversations,
                    pagination=pagination
                )
        except Exception as e:
            logger.error(f"Failed to get conversations for user {user_id}: {str(e)}")
            raise e
    
    async def delete_conversation(self, conversation_id: str) -> bool:
        """
        Soft delete a conversation - only marks as deleted, doesn't remove from database.
        Also soft deletes all associated messages.
        
        Args:
            conversation_id: UUID string of the conversation to delete
            
        Returns:
            True if successful, False otherwise
        """
        try:
            from app.db.session import async_session
            from sqlalchemy import text
            import uuid as uuid_lib
            from datetime import datetime, timezone
            
            # Validate UUID format
            try:
                conversation_uuid = uuid_lib.UUID(conversation_id)
            except ValueError:
                logger.error(f"Invalid conversation_id format: {conversation_id}")
                return False
            
            async with async_session() as session:
                # Soft delete conversation
                delete_conv_query = text("""
                    UPDATE conversation
                    SET is_deleted = TRUE,
                        deleted_at = :deleted_at,
                        updated_at = :updated_at
                    WHERE id = :conversation_id
                    AND (is_deleted = FALSE OR is_deleted IS NULL)
                """)
                
                now = datetime.now(timezone.utc)
            result = await session.execute(delete_conv_query, {
                'conversation_id': conversation_uuid,
                'deleted_at': now,
                'updated_at': now
            })
            
            # CRITICAL: Validate that conversation was actually deleted
            if result.rowcount == 0:
                logger.warning(f"⚠️ Conversation {conversation_id} not found or already deleted (rowcount: {result.rowcount})")
                return False
                
            # Also soft delete all messages in this conversation
            delete_messages_query = text("""
                UPDATE chat_message
                SET is_deleted = TRUE,
                    deleted_at = :deleted_at,
                    updated_at = :updated_at
                WHERE conversation_id = :conversation_id
                AND (is_deleted = FALSE OR is_deleted IS NULL)
            """)
            
            msg_result = await session.execute(delete_messages_query, {
                'conversation_id': conversation_uuid,
                'deleted_at': now,
                'updated_at': now
            })
            
            await session.commit()
            
            logger.info(f"✅ Soft deleted conversation {conversation_id} and {msg_result.rowcount} messages")
            
            # Invalidate cache
            try:
                from app.modules.chats.conversations.cache_service import ConversationCacheService
                await ConversationCacheService.invalidate_conversation(conversation_id)
            except Exception as cache_error:
                logger.warning(f"Failed to invalidate cache: {cache_error}")
            
            return True
                
        except Exception as e:
            logger.error(f"Failed to delete conversation {conversation_id}: {str(e)}", exc_info=True)
            return False
    
    async def update_conversation(self, conversation_id: str, obj_in: ConversationUpdateSchema) -> Optional[ChatConversation]:
        """Update a conversation by UUID (overrides base method to handle UUID strings)"""
        try:
            import uuid
            uuid_obj = uuid.UUID(conversation_id)
            
            # Use repository's update method directly with UUID
            from app.db.session import async_session
            from sqlalchemy import update as sql_update
            
            async with async_session() as session:
                # Get update data
                if hasattr(obj_in, "model_dump"):
                    update_data = obj_in.model_dump(exclude_unset=True)
                elif hasattr(obj_in, "dict"):
                    update_data = obj_in.dict(exclude_unset=True)
                else:
                    update_data = {}
                
                # Remove None values
                update_data = {k: v for k, v in update_data.items() if v is not None}
                
                if not update_data:
                    # No updates to apply
                    return await self.get(conversation_id)
                
                # Update the conversation
                stmt = sql_update(ChatConversation).where(
                    ChatConversation.id == uuid_obj
                ).values(**update_data).execution_options(synchronize_session="fetch")
                
                await session.execute(stmt)
                await session.commit()
                
                # Return updated conversation
                return await self.get(conversation_id)
        except Exception as e:
            logger.error(f"Failed to update conversation: {str(e)}")
            raise e
    
    async def _verify_conversation_ownership(self, conversation_id: str, user_id: str) -> bool:
        """
        Verify that a user owns a conversation
        CRITICAL: Uses user_id column for strict tenant isolation
        """
        try:
            from app.db.session import async_session
            import sqlalchemy as sa
            
            async with async_session() as session:
                # Convert user_id to UUID for comparison
                import uuid as uuid_lib
                try:
                    user_uuid = uuid_lib.UUID(user_id) if isinstance(user_id, str) else user_id
                    conv_uuid = uuid_lib.UUID(conversation_id) if isinstance(conversation_id, str) else conversation_id
                except (ValueError, TypeError):
                    logger.error(f"Invalid UUID format: user_id={user_id}, conversation_id={conversation_id}")
                    return False
                
                # CRITICAL: Check user_id column directly for strict tenant isolation
                query = sa.text("""
                    SELECT COUNT(*) > 0 as owns
                    FROM conversation c
                    WHERE c.id = :conversation_id
                    AND c.user_id = :user_id
                    AND (c.is_deleted = FALSE OR c.is_deleted IS NULL)
                """)
                
                result = await session.execute(query, {
                    'conversation_id': conv_uuid,
                    'user_id': user_uuid
                })
                
                owns = result.scalar()
                owns_bool = bool(owns)
                
                if not owns_bool:
                    logger.warning(f"User {user_id} does NOT own conversation {conversation_id}")
                
                return owns_bool
        except Exception as e:
            logger.error(f"Failed to verify conversation ownership: {str(e)}")
            return False
