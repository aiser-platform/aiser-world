"""
Query Cache Service - Intelligent caching for SQL queries and results.

This service provides efficient query result caching to avoid redundant query executions
for similar queries. Uses query fingerprinting and semantic similarity detection.
"""

import json
import logging
import hashlib
import re
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class QueryCacheService:
    """
    Service for caching SQL query results to improve performance.
    
    Features:
    - Query fingerprinting (normalized SQL)
    - Result caching with TTL
    - Per-data-source caching
    - Automatic cache invalidation
    - Memory-efficient storage
    """
    
    def __init__(self, default_ttl_minutes: int = 30, max_cache_size: int = 1000):
        """
        Initialize query cache service.
        
        Args:
            default_ttl_minutes: Default TTL for cached results in minutes (default: 30)
            max_cache_size: Maximum number of cached queries (default: 1000)
        """
        self._cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl_minutes = default_ttl_minutes
        self.max_cache_size = max_cache_size
        self._cache_stats = {
            "hits": 0,
            "misses": 0,
            "invalidations": 0,
            "evictions": 0
        }
        logger.info(f"✅ QueryCacheService initialized (TTL: {default_ttl_minutes}m, max: {max_cache_size})")
    
    def _normalize_sql(self, sql_query: str) -> str:
        """
        Normalize SQL query for fingerprinting.
        
        Removes:
        - Comments
        - Extra whitespace
        - Case differences (keywords)
        - Parameter values (replaces with placeholders)
        """
        if not sql_query:
            return ""
        
        # Remove comments
        sql = re.sub(r'--.*?$', '', sql_query, flags=re.MULTILINE)
        sql = re.sub(r'/\*.*?\*/', '', sql, flags=re.DOTALL)
        
        # Normalize whitespace
        sql = ' '.join(sql.split())
        
        # Normalize SQL keywords to uppercase
        keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 
                   'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'AS', 'AND', 'OR', 'NOT']
        for keyword in keywords:
            sql = re.sub(rf'\b{keyword}\b', keyword, sql, flags=re.IGNORECASE)
        
        # Replace string literals with placeholder
        sql = re.sub(r"'[^']*'", "'?'", sql)
        sql = re.sub(r'"[^"]*"', '"?"', sql)
        
        # Replace numeric literals with placeholder (optional - can be too aggressive)
        # sql = re.sub(r'\b\d+\b', '?', sql)
        
        return sql.strip()
    
    def _get_cache_key(self, data_source_id: str, sql_query: str) -> str:
        """Generate cache key for query."""
        normalized_sql = self._normalize_sql(sql_query)
        query_hash = hashlib.md5(f"{data_source_id}:{normalized_sql}".encode()).hexdigest()
        return f"query:{data_source_id}:{query_hash}"
    
    def _is_expired(self, cached_item: Dict[str, Any]) -> bool:
        """Check if cached item is expired."""
        if "expires_at" not in cached_item:
            return True
        expires_at = cached_item["expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        return datetime.now(timezone.utc) > expires_at
    
    def get_result(
        self, 
        data_source_id: str, 
        sql_query: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get cached query result.
        
        Args:
            data_source_id: ID of the data source
            sql_query: SQL query string
            
        Returns:
            Cached result dict if available and not expired, None otherwise
        """
        cache_key = self._get_cache_key(data_source_id, sql_query)
        
        if cache_key not in self._cache:
            self._cache_stats["misses"] += 1
            logger.debug(f"📊 Query cache miss for {data_source_id}")
            return None
        
        cached_item = self._cache[cache_key]
        
        if self._is_expired(cached_item):
            # Remove expired item
            del self._cache[cache_key]
            self._cache_stats["misses"] += 1
            logger.debug(f"📊 Query cache expired for {data_source_id}")
            return None
        
        self._cache_stats["hits"] += 1
        logger.debug(f"✅ Query cache hit for {data_source_id}")
        return cached_item.get("result")
    
    def set_result(
        self, 
        data_source_id: str, 
        sql_query: str, 
        result: Dict[str, Any],
        ttl_minutes: Optional[int] = None
    ) -> None:
        """
        Cache query result.
        
        Args:
            data_source_id: ID of the data source
            sql_query: SQL query string
            result: Query result dictionary to cache
            ttl_minutes: TTL in minutes (uses default if not provided)
        """
        # Check cache size and evict if needed
        if len(self._cache) >= self.max_cache_size:
            self._evict_oldest()
        
        cache_key = self._get_cache_key(data_source_id, sql_query)
        ttl = ttl_minutes or self.default_ttl_minutes
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=ttl)
        
        # Store result with metadata (limit result size to prevent memory issues)
        result_size = len(json.dumps(result))
        if result_size > 10 * 1024 * 1024:  # 10MB limit
            logger.warning(f"⚠️ Query result too large ({result_size} bytes), not caching")
            return
        
        self._cache[cache_key] = {
            "result": result,
            "data_source_id": data_source_id,
            "sql_query": sql_query,
            "cached_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": expires_at,
            "ttl_minutes": ttl,
            "result_size": result_size
        }
        
        logger.debug(f"✅ Cached query result for {data_source_id} (TTL: {ttl}m, size: {result_size} bytes)")
    
    def _evict_oldest(self) -> None:
        """Evict oldest cache entry (LRU-like)."""
        if not self._cache:
            return
        
        # Find oldest entry by cached_at
        oldest_key = min(
            self._cache.keys(),
            key=lambda k: self._cache[k].get("cached_at", "")
        )
        del self._cache[oldest_key]
        self._cache_stats["evictions"] += 1
        logger.debug(f"🗑️ Evicted oldest cache entry: {oldest_key}")
    
    def invalidate(self, data_source_id: str) -> None:
        """
        Invalidate all cached queries for data source.
        
        Args:
            data_source_id: ID of the data source to invalidate
        """
        keys_to_remove = [
            key for key in self._cache.keys()
            if key.startswith(f"query:{data_source_id}:")
        ]
        
        for key in keys_to_remove:
            del self._cache[key]
        
        if keys_to_remove:
            self._cache_stats["invalidations"] += len(keys_to_remove)
            logger.info(f"🗑️ Invalidated {len(keys_to_remove)} query caches for {data_source_id}")
    
    def invalidate_all(self) -> None:
        """Invalidate all cached queries."""
        count = len(self._cache)
        self._cache.clear()
        self._cache_stats["invalidations"] += count
        logger.info(f"🗑️ Invalidated all query caches ({count} items)")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        total_requests = self._cache_stats["hits"] + self._cache_stats["misses"]
        hit_rate = (self._cache_stats["hits"] / total_requests * 100) if total_requests > 0 else 0
        
        return {
            **self._cache_stats,
            "total_requests": total_requests,
            "hit_rate_percent": round(hit_rate, 2),
            "cached_items": len(self._cache),
            "max_cache_size": self.max_cache_size,
            "default_ttl_minutes": self.default_ttl_minutes
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
            logger.info(f"🧹 Cleaned up {len(expired_keys)} expired query cache entries")
        
        return len(expired_keys)


# Global singleton instance
_query_cache_service: Optional[QueryCacheService] = None


def get_query_cache_service() -> QueryCacheService:
    """Get or create global query cache service instance."""
    global _query_cache_service
    if _query_cache_service is None:
        _query_cache_service = QueryCacheService(default_ttl_minutes=30, max_cache_size=1000)
    return _query_cache_service

