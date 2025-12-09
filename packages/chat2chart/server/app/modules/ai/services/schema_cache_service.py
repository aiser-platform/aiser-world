"""
Schema Cache Service - Intelligent caching for data source schemas.

This service provides efficient schema caching to avoid redundant schema retrieval
on every query. Schemas are cached per data source with TTL and invalidation support.
"""

import json
import logging
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class SchemaCacheService:
    """
    Service for caching data source schemas to improve performance.
    
    Features:
    - In-memory cache with TTL (Time To Live)
    - Per-data-source caching
    - Automatic invalidation on data source updates
    - Schema versioning support
    - Memory-efficient storage
    """
    
    def __init__(self, default_ttl_hours: int = 24):
        """
        Initialize schema cache service.
        
        Args:
            default_ttl_hours: Default TTL for cached schemas in hours (default: 24)
        """
        self._cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl_hours = default_ttl_hours
        self._cache_stats = {
            "hits": 0,
            "misses": 0,
            "invalidations": 0
        }
        logger.info(f"✅ SchemaCacheService initialized with TTL: {default_ttl_hours} hours")
    
    def _get_cache_key(self, data_source_id: str) -> str:
        """Generate cache key for data source."""
        return f"schema:{data_source_id}"
    
    def _is_expired(self, cached_item: Dict[str, Any]) -> bool:
        """Check if cached item is expired."""
        if "expires_at" not in cached_item:
            return True
        expires_at = cached_item["expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        return datetime.now(timezone.utc) > expires_at
    
    def get_schema(self, data_source_id: str) -> Optional[Dict[str, Any]]:
        """
        Get cached schema for data source.
        
        Args:
            data_source_id: ID of the data source
            
        Returns:
            Cached schema dict if available and not expired, None otherwise
        """
        cache_key = self._get_cache_key(data_source_id)
        
        if cache_key not in self._cache:
            self._cache_stats["misses"] += 1
            logger.debug(f"📊 Schema cache miss for {data_source_id}")
            return None
        
        cached_item = self._cache[cache_key]
        
        if self._is_expired(cached_item):
            # Remove expired item
            del self._cache[cache_key]
            self._cache_stats["misses"] += 1
            logger.debug(f"📊 Schema cache expired for {data_source_id}")
            return None
        
        self._cache_stats["hits"] += 1
        logger.debug(f"✅ Schema cache hit for {data_source_id}")
        return cached_item.get("schema")
    
    def set_schema(
        self, 
        data_source_id: str, 
        schema: Dict[str, Any], 
        ttl_hours: Optional[int] = None
    ) -> None:
        """
        Cache schema for data source.
        
        Args:
            data_source_id: ID of the data source
            schema: Schema dictionary to cache
            ttl_hours: TTL in hours (uses default if not provided)
        """
        cache_key = self._get_cache_key(data_source_id)
        ttl = ttl_hours or self.default_ttl_hours
        expires_at = datetime.now(timezone.utc) + timedelta(hours=ttl)
        
        # Store schema with metadata
        self._cache[cache_key] = {
            "schema": schema,
            "data_source_id": data_source_id,
            "cached_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": expires_at,
            "ttl_hours": ttl,
            "schema_hash": self._compute_schema_hash(schema)
        }
        
        logger.info(f"✅ Cached schema for {data_source_id} (TTL: {ttl}h, expires: {expires_at.isoformat()})")
    
    def invalidate(self, data_source_id: str) -> None:
        """
        Invalidate cached schema for data source.
        
        Args:
            data_source_id: ID of the data source to invalidate
        """
        cache_key = self._get_cache_key(data_source_id)
        if cache_key in self._cache:
            del self._cache[cache_key]
            self._cache_stats["invalidations"] += 1
            logger.info(f"🗑️ Invalidated schema cache for {data_source_id}")
    
    def invalidate_all(self) -> None:
        """Invalidate all cached schemas."""
        count = len(self._cache)
        self._cache.clear()
        self._cache_stats["invalidations"] += count
        logger.info(f"🗑️ Invalidated all schema caches ({count} items)")
    
    def _compute_schema_hash(self, schema: Dict[str, Any]) -> str:
        """Compute hash of schema for change detection."""
        schema_str = json.dumps(schema, sort_keys=True)
        return hashlib.md5(schema_str.encode()).hexdigest()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        total_requests = self._cache_stats["hits"] + self._cache_stats["misses"]
        hit_rate = (self._cache_stats["hits"] / total_requests * 100) if total_requests > 0 else 0
        
        return {
            **self._cache_stats,
            "total_requests": total_requests,
            "hit_rate_percent": round(hit_rate, 2),
            "cached_items": len(self._cache),
            "default_ttl_hours": self.default_ttl_hours
        }
    
    def cleanup_expired(self) -> int:
        """
        Remove expired cache entries.
        
        Returns:
            Number of entries removed
        """
        expired_keys = [
            key for key, item in self._cache.items()
            if self._is_expired(item)
        ]
        
        for key in expired_keys:
            del self._cache[key]
        
        if expired_keys:
            logger.info(f"🧹 Cleaned up {len(expired_keys)} expired schema cache entries")
        
        return len(expired_keys)


# Global singleton instance
_schema_cache_service: Optional[SchemaCacheService] = None


def get_schema_cache_service() -> SchemaCacheService:
    """Get or create global schema cache service instance."""
    global _schema_cache_service
    if _schema_cache_service is None:
        _schema_cache_service = SchemaCacheService(default_ttl_hours=24)
    return _schema_cache_service

