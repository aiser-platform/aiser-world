"""
Optimization Integration Service

Integrates SchemaOptimizer, QueryOptimizer, and ErrorClassifier with existing caching services.
Provides unified interface for schema and query optimization that works seamlessly with:
- SchemaCacheService (schema caching)
- QueryCacheService (query result caching)
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

from app.modules.ai.services.schema_optimizer import SchemaOptimizer
from app.modules.ai.services.query_optimizer import QueryOptimizer
from app.modules.ai.services.schema_cache_service import get_schema_cache_service
from app.modules.ai.services.query_cache_service import get_query_cache_service

logger = logging.getLogger(__name__)


class OptimizationIntegration:
    """
    Unified integration service for schema and query optimization.
    
    Coordinates between:
    - SchemaCacheService: Caches full schemas
    - SchemaOptimizer: Optimizes cached schemas for specific queries
    - QueryOptimizer: Optimizes SQL queries before execution
    - QueryCacheService: Caches optimized query results
    """
    
    def __init__(
        self,
        schema_optimizer: Optional[SchemaOptimizer] = None,
        query_optimizer: Optional[QueryOptimizer] = None,
        model_context_window: Optional[int] = None
    ):
        """
        Initialize optimization integration.
        
        Args:
            schema_optimizer: Optional SchemaOptimizer instance (creates default if None)
            query_optimizer: Optional QueryOptimizer instance (creates default if None)
            model_context_window: Optional model context window for adaptive token calculation
        """
        self.schema_cache = get_schema_cache_service()
        self.query_cache = get_query_cache_service()
        self.schema_optimizer = schema_optimizer or SchemaOptimizer(model_context_window=model_context_window)
        self.query_optimizer = query_optimizer or QueryOptimizer()
        self.model_context_window = model_context_window
        
        logger.info("✅ OptimizationIntegration initialized")
    
    async def get_optimized_schema(
        self,
        data_source_id: str,
        query: str,
        query_intent: Optional[Dict[str, Any]] = None,
        available_tokens: Optional[int] = None,
        fetch_if_missing: bool = True,
        data_service: Optional[Any] = None
    ) -> Tuple[Dict[str, Any], bool]:
        """
        Get optimized schema for query, using cache when possible.
        
        Args:
            data_source_id: Data source ID
            query: Natural language query
            query_intent: Optional query intent analysis
            available_tokens: Optional token budget (adaptive if None)
            fetch_if_missing: Whether to fetch schema if not in cache
            data_service: Optional data service for fetching schema
        
        Returns:
            Tuple of (optimized_schema_dict, from_cache)
        """
        # Step 1: Get schema from cache
        cached_schema = self.schema_cache.get_schema(data_source_id)
        
        if cached_schema:
            logger.debug(f"✅ Using cached schema for {data_source_id}")
            # Step 2: Optimize cached schema for this specific query
            optimized_schema = self.schema_optimizer.optimize_schema_for_query(
                schema_info=cached_schema,
                query=query,
                query_intent=query_intent,
                available_tokens=available_tokens
            )
            return optimized_schema, True
        
        # Cache miss - fetch schema if requested
        if fetch_if_missing and data_service:
            try:
                logger.info(f"📊 Cache miss for {data_source_id}, fetching schema...")
                # Fetch schema from data service
                schema = await self._fetch_schema(data_service, data_source_id)
                if schema:
                    # Cache the full schema
                    self.schema_cache.set_schema(data_source_id, schema, ttl_hours=24)
                    logger.info(f"✅ Fetched and cached schema for {data_source_id}")
                    
                    # Optimize for query
                    optimized_schema = self.schema_optimizer.optimize_schema_for_query(
                        schema_info=schema,
                        query=query,
                        query_intent=query_intent,
                        available_tokens=available_tokens
                    )
                    return optimized_schema, False
            except Exception as e:
                logger.warning(f"⚠️ Failed to fetch schema for {data_source_id}: {e}")
        
        # Return empty schema if fetch failed
        return {}, False
    
    def optimize_and_cache_query(
        self,
        sql_query: str,
        data_source_id: str,
        data_source_type: str,
        db_dialect: Optional[str] = None,
        schema_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Optimize SQL query and prepare for caching.
        The optimized query should be used for execution and caching.
        
        Args:
            sql_query: Original SQL query
            data_source_id: Data source ID
            data_source_type: Type of data source
            db_dialect: Optional database dialect
            schema_info: Optional schema information
        
        Returns:
            Optimization result with optimized_query (use this for execution)
        """
        # Check cache first (using original query for cache key)
        cached_result = self.query_cache.get_result(data_source_id, sql_query)
        if cached_result:
            logger.debug(f"✅ Query cache hit for {data_source_id}")
            return {
                "original_query": sql_query,
                "optimized_query": sql_query,  # Use original if cached
                "from_cache": True,
                "cached_result": cached_result
            }
        
        # Optimize query
        optimization_result = self.query_optimizer.optimize_query(
            sql_query=sql_query,
            data_source_type=data_source_type,
            db_dialect=db_dialect,
            schema_info=schema_info
        )
        
        # Note: Cache the result AFTER execution (in query_execution_node)
        # The optimized_query should be used for execution
        return {
            **optimization_result,
            "from_cache": False
        }
    
    def format_optimized_schema_for_llm(
        self,
        optimized_schema: Dict[str, Any],
        format_style: str = "structured"
    ) -> str:
        """
        Format optimized schema for LLM prompt.
        
        Args:
            optimized_schema: Optimized schema dictionary
            format_style: "structured" or "compact"
        
        Returns:
            Formatted schema string for LLM
        """
        return self.schema_optimizer.format_schema_for_llm(
            optimized_schema,
            format_style=format_style
        )
    
    def should_optimize_schema(
        self,
        schema_str: str,
        available_tokens: Optional[int] = None
    ) -> Tuple[bool, int]:
        """
        Determine if schema needs optimization based on token count.
        
        Args:
            schema_str: Schema as string
            available_tokens: Optional available token budget
        
        Returns:
            Tuple of (should_optimize, estimated_tokens)
        """
        estimated_tokens = SchemaOptimizer.estimate_schema_tokens(schema_str)
        token_limit = available_tokens or self.schema_optimizer.max_tokens
        
        should_optimize = estimated_tokens > token_limit * 0.8  # Optimize if >80% of limit
        
        return should_optimize, estimated_tokens
    
    async def _fetch_schema(
        self,
        data_service: Any,
        data_source_id: str
    ) -> Optional[Dict[str, Any]]:
        """Fetch schema from data service."""
        try:
            if hasattr(data_service, 'get_data_source_schema'):
                schema = await data_service.get_data_source_schema(data_source_id)
                return schema
            elif hasattr(data_service, 'get_schema'):
                schema = await data_service.get_schema(data_source_id)
                return schema
            else:
                logger.warning(f"⚠️ Data service doesn't have schema fetching method")
                return None
        except Exception as e:
            logger.error(f"❌ Error fetching schema: {e}", exc_info=True)
            return None


# Global singleton instance
_optimization_integration: Optional[OptimizationIntegration] = None


def get_optimization_integration(
    model_context_window: Optional[int] = None
) -> OptimizationIntegration:
    """
    Get or create global optimization integration instance.
    
    Args:
        model_context_window: Optional model context window for adaptive token calculation
    
    Returns:
        OptimizationIntegration instance
    """
    global _optimization_integration
    if _optimization_integration is None:
        _optimization_integration = OptimizationIntegration(
            model_context_window=model_context_window
        )
    return _optimization_integration


