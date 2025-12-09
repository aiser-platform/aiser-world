"""
Redis caching service for conversations and messages
Provides fast access to frequently accessed conversation data
"""

import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

from app.core.cache import cache

logger = logging.getLogger(__name__)

# Cache TTLs (in seconds)
CONVERSATION_CACHE_TTL = 300  # 5 minutes
CONVERSATION_LIST_CACHE_TTL = 60  # 1 minute
MESSAGE_CACHE_TTL = 600  # 10 minutes


class ConversationCacheService:
    """Service for caching conversation data in Redis"""
    
    @staticmethod
    def _get_conversation_key(conversation_id: str) -> str:
        """Generate cache key for a conversation"""
        return f"conv:{conversation_id}"
    
    @staticmethod
    def _get_conversation_list_key(user_id: str, offset: int = 0, limit: int = 50) -> str:
        """Generate cache key for conversation list"""
        return f"conv_list:{user_id}:{offset}:{limit}"
    
    @staticmethod
    def _get_message_key(message_id: str) -> str:
        """Generate cache key for a message"""
        return f"msg:{message_id}"
    
    @staticmethod
    def _get_conversation_messages_key(conversation_id: str) -> str:
        """Generate cache key for conversation messages"""
        return f"conv_msgs:{conversation_id}"
    
    @classmethod
    async def get_conversation(cls, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get conversation from cache"""
        try:
            if not cache or not cache.redis_client:
                return None
            
            key = cls._get_conversation_key(conversation_id)
            cached = cache.get(key)
            
            if cached:
                logger.debug(f"✅ Cache hit for conversation {conversation_id}")
                return cached
            
            logger.debug(f"❌ Cache miss for conversation {conversation_id}")
            return None
        except Exception as e:
            logger.warning(f"⚠️ Error getting conversation from cache: {e}")
            return None
    
    @classmethod
    async def set_conversation(cls, conversation_id: str, conversation_data: Dict[str, Any], ttl: Optional[int] = None) -> bool:
        """Cache a conversation"""
        try:
            if not cache or not cache.redis_client:
                return False
            
            key = cls._get_conversation_key(conversation_id)
            ttl = ttl or CONVERSATION_CACHE_TTL
            
            # Ensure datetime objects are serialized
            serializable_data = cls._make_serializable(conversation_data)
            
            success = cache.set(key, serializable_data, ttl)
            if success:
                logger.debug(f"✅ Cached conversation {conversation_id} (TTL: {ttl}s)")
            return success
        except Exception as e:
            logger.warning(f"⚠️ Error caching conversation: {e}")
            return False
    
    @classmethod
    async def get_conversation_list(cls, user_id: str, offset: int = 0, limit: int = 50) -> Optional[List[Dict[str, Any]]]:
        """Get conversation list from cache"""
        try:
            if not cache or not cache.redis_client:
                return None
            
            key = cls._get_conversation_list_key(user_id, offset, limit)
            cached = cache.get(key)
            
            if cached:
                logger.debug(f"✅ Cache hit for conversation list (user: {user_id}, offset: {offset}, limit: {limit})")
                return cached
            
            return None
        except Exception as e:
            logger.warning(f"⚠️ Error getting conversation list from cache: {e}")
            return None
    
    @classmethod
    async def set_conversation_list(cls, user_id: str, conversations: List[Dict[str, Any]], offset: int = 0, limit: int = 50, ttl: Optional[int] = None) -> bool:
        """Cache conversation list"""
        try:
            if not cache or not cache.redis_client:
                return False
            
            key = cls._get_conversation_list_key(user_id, offset, limit)
            ttl = ttl or CONVERSATION_LIST_CACHE_TTL
            
            # Ensure datetime objects are serialized
            serializable_data = [cls._make_serializable(conv) for conv in conversations]
            
            success = cache.set(key, serializable_data, ttl)
            if success:
                logger.debug(f"✅ Cached conversation list (user: {user_id}, count: {len(conversations)}, TTL: {ttl}s)")
            return success
        except Exception as e:
            logger.warning(f"⚠️ Error caching conversation list: {e}")
            return False
    
    @classmethod
    async def get_messages(cls, conversation_id: str) -> Optional[List[Dict[str, Any]]]:
        """Get messages for a conversation from cache"""
        try:
            if not cache or not cache.redis_client:
                return None
            
            key = cls._get_conversation_messages_key(conversation_id)
            cached = cache.get(key)
            
            if cached:
                logger.debug(f"✅ Cache hit for messages (conversation: {conversation_id})")
                return cached
            
            return None
        except Exception as e:
            logger.warning(f"⚠️ Error getting messages from cache: {e}")
            return None
    
    @classmethod
    async def set_messages(cls, conversation_id: str, messages: List[Dict[str, Any]], ttl: Optional[int] = None) -> bool:
        """Cache messages for a conversation"""
        try:
            if not cache or not cache.redis_client:
                return False
            
            key = cls._get_conversation_messages_key(conversation_id)
            ttl = ttl or MESSAGE_CACHE_TTL
            
            # Ensure datetime objects are serialized
            serializable_data = [cls._make_serializable(msg) for msg in messages]
            
            success = cache.set(key, serializable_data, ttl)
            if success:
                logger.debug(f"✅ Cached messages (conversation: {conversation_id}, count: {len(messages)}, TTL: {ttl}s)")
            return success
        except Exception as e:
            logger.warning(f"⚠️ Error caching messages: {e}")
            return False
    
    @classmethod
    async def invalidate_conversation(cls, conversation_id: str) -> bool:
        """Invalidate cache for a conversation and its messages"""
        try:
            if not cache or not cache.redis_client:
                return False
            
            # Delete conversation
            conv_key = cls._get_conversation_key(conversation_id)
            cache.delete(conv_key)
            
            # Delete messages
            msgs_key = cls._get_conversation_messages_key(conversation_id)
            cache.delete(msgs_key)
            
            # Invalidate conversation lists (pattern match)
            # Note: This is a best-effort - we can't easily invalidate all user lists
            # In production, consider using tags or a more sophisticated invalidation strategy
            
            logger.debug(f"✅ Invalidated cache for conversation {conversation_id}")
            return True
        except Exception as e:
            logger.warning(f"⚠️ Error invalidating conversation cache: {e}")
            return False
    
    @classmethod
    async def invalidate_user_conversation_lists(cls, user_id: str) -> bool:
        """Invalidate all conversation lists for a user"""
        try:
            if not cache or not cache.redis_client:
                return False
            
            # Delete all conversation list keys for this user
            pattern = f"conv_list:{user_id}:*"
            cleared = cache.clear_pattern(pattern)
            
            logger.debug(f"✅ Invalidated conversation lists for user {user_id} ({cleared} keys)")
            return True
        except Exception as e:
            logger.warning(f"⚠️ Error invalidating user conversation lists: {e}")
            return False
    
    @staticmethod
    def _make_serializable(obj: Any) -> Any:
        """Convert datetime and other non-serializable objects to strings"""
        from uuid import UUID
        
        # Handle UUID objects
        if isinstance(obj, UUID):
            return str(obj)
        
        # Handle SQLAlchemy models and DeclarativeMeta
        if hasattr(obj, '__class__') and hasattr(obj.__class__, '__module__'):
            # Check if it's a SQLAlchemy model
            if 'sqlalchemy' in str(type(obj)) or 'DeclarativeMeta' in str(type(obj)):
                # Convert SQLAlchemy model to dict
                if hasattr(obj, '__dict__'):
                    # Get only the column values, not relationships
                    result = {}
                    for key, value in obj.__dict__.items():
                        if not key.startswith('_'):
                            result[key] = ConversationCacheService._make_serializable(value)
                    return result
                else:
                    return str(obj)
        
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, dict):
            return {k: ConversationCacheService._make_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [ConversationCacheService._make_serializable(item) for item in obj]
        elif isinstance(obj, (set, frozenset)):
            return [ConversationCacheService._make_serializable(item) for item in obj]
        elif hasattr(obj, '__dict__'):
            # Only convert to dict if it's not a SQLAlchemy model (already handled above)
            return ConversationCacheService._make_serializable(obj.__dict__)
        elif hasattr(obj, '__class__') and 'sqlalchemy' in str(type(obj)):
            # Fallback for SQLAlchemy objects
            return str(obj)
        else:
            return obj


