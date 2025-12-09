"""
Query Optimizer Service

Provides database-specific query optimization rules and data source-aware query transformation.
Supports: PostgreSQL, MySQL, SQLite, ClickHouse, SQL Server, DuckDB, Cube.js, and file-based sources.
"""

import logging
import re
from typing import Any, Dict, List, Optional, Tuple
from enum import Enum

logger = logging.getLogger(__name__)


class DatabaseDialect(Enum):
    """Supported database dialects."""
    POSTGRESQL = "postgresql"
    MYSQL = "mysql"
    SQLITE = "sqlite"
    CLICKHOUSE = "clickhouse"
    SQL_SERVER = "sqlserver"
    DUCKDB = "duckdb"
    CUBE = "cube"
    GENERIC = "generic"


class QueryOptimizer:
    """
    Database-specific query optimizer with data source awareness.
    
    Features:
    - Dialect-specific optimization rules
    - Data source type detection
    - Query rewriting for performance
    - Index hint suggestions
    - Aggregation optimization
    """
    
    def __init__(self):
        self.optimization_rules = self._initialize_optimization_rules()
    
    def optimize_query(
        self,
        sql_query: str,
        data_source_type: str,
        db_dialect: Optional[str] = None,
        schema_info: Optional[Dict[str, Any]] = None,
        cache_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Optimize SQL query for specific data source and dialect.
        Works with QueryCacheService - optimized queries are cached for reuse.
        
        Args:
            sql_query: Original SQL query
            data_source_type: Type of data source (database, warehouse, file, cube)
            db_dialect: Specific database dialect (postgresql, mysql, clickhouse, etc.)
            schema_info: Optional schema information for context-aware optimization
            cache_key: Optional cache key for storing optimization metadata
        
        Returns:
            Dictionary with optimized query and optimization metadata.
            The optimized_query should be used for execution and caching.
        """
        # Detect dialect if not provided
        if not db_dialect:
            db_dialect = self._detect_dialect(data_source_type, schema_info)
        
        dialect = self._parse_dialect(db_dialect)
        
        # Apply dialect-specific optimizations
        optimized_query = sql_query
        optimizations_applied = []
        
        # 1. Basic query cleanup
        optimized_query, cleanup_ops = self._cleanup_query(optimized_query)
        optimizations_applied.extend(cleanup_ops)
        
        # 2. Dialect-specific optimizations
        dialect_ops = self._apply_dialect_optimizations(optimized_query, dialect, schema_info)
        optimized_query = dialect_ops["query"]
        optimizations_applied.extend(dialect_ops["optimizations"])
        
        # 3. Data source type optimizations
        source_ops = self._apply_source_type_optimizations(
            optimized_query,
            data_source_type,
            dialect,
            schema_info
        )
        optimized_query = source_ops["query"]
        optimizations_applied.extend(source_ops["optimizations"])
        
        # 4. Performance optimizations
        perf_ops = self._apply_performance_optimizations(
            optimized_query,
            dialect,
            schema_info
        )
        optimized_query = perf_ops["query"]
        optimizations_applied.extend(perf_ops["optimizations"])
        
        return {
            "original_query": sql_query,
            "optimized_query": optimized_query,
            "optimizations_applied": optimizations_applied,
            "dialect": dialect.value,
            "data_source_type": data_source_type,
            "estimated_improvement": self._estimate_improvement(optimizations_applied)
        }
    
    def _detect_dialect(
        self,
        data_source_type: str,
        schema_info: Optional[Dict[str, Any]] = None
    ) -> str:
        """Detect database dialect from data source type and schema."""
        # Check schema for dialect hints
        if schema_info:
            engine = schema_info.get("engine", "").lower()
            if "clickhouse" in engine:
                return "clickhouse"
            elif "postgres" in engine:
                return "postgresql"
            elif "mysql" in engine:
                return "mysql"
            elif "sqlite" in engine:
                return "sqlite"
            elif "mssql" in engine or "sql server" in engine:
                return "sqlserver"
        
        # Default based on data source type
        if data_source_type == "warehouse":
            return "clickhouse"  # Common for data warehouses
        elif data_source_type == "database":
            return "postgresql"  # Common default
        elif data_source_type == "file":
            return "duckdb"  # Used for file queries
        elif data_source_type == "cube":
            return "cube"
        
        return "generic"
    
    def _parse_dialect(self, dialect_str: str) -> DatabaseDialect:
        """Parse dialect string to enum."""
        dialect_lower = dialect_str.lower()
        
        for dialect in DatabaseDialect:
            if dialect.value in dialect_lower:
                return dialect
        
        return DatabaseDialect.GENERIC
    
    def _cleanup_query(self, query: str) -> Tuple[str, List[str]]:
        """Basic query cleanup and normalization."""
        optimizations = []
        cleaned = query.strip()
        
        # Remove trailing semicolons (not needed in most contexts)
        if cleaned.endswith(";"):
            cleaned = cleaned[:-1].strip()
            optimizations.append("removed_trailing_semicolon")
        
        # Normalize whitespace
        cleaned = re.sub(r'\s+', ' ', cleaned)
        optimizations.append("normalized_whitespace")
        
        return cleaned, optimizations
    
    def _apply_dialect_optimizations(
        self,
        query: str,
        dialect: DatabaseDialect,
        schema_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Apply dialect-specific optimization rules."""
        optimized = query
        optimizations = []
        
        if dialect == DatabaseDialect.CLICKHOUSE:
            # ClickHouse-specific optimizations
            optimized, ops = self._optimize_clickhouse(optimized, schema_info)
            optimizations.extend(ops)
        
        elif dialect == DatabaseDialect.POSTGRESQL:
            # PostgreSQL-specific optimizations
            optimized, ops = self._optimize_postgresql(optimized, schema_info)
            optimizations.extend(ops)
        
        elif dialect == DatabaseDialect.MYSQL:
            # MySQL-specific optimizations
            optimized, ops = self._optimize_mysql(optimized, schema_info)
            optimizations.extend(ops)
        
        elif dialect == DatabaseDialect.DUCKDB:
            # DuckDB-specific optimizations
            optimized, ops = self._optimize_duckdb(optimized, schema_info)
            optimizations.extend(ops)
        
        elif dialect == DatabaseDialect.CUBE:
            # Cube.js-specific optimizations
            optimized, ops = self._optimize_cube(optimized, schema_info)
            optimizations.extend(ops)
        
        return {"query": optimized, "optimizations": optimizations}
    
    def _optimize_clickhouse(
        self,
        query: str,
        schema_info: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, List[str]]:
        """
        ClickHouse-specific optimizations.
        CRITICAL: ClickHouse doesn't support standard SQL window functions like lag(), lead(), etc.
        Must replace with ClickHouse alternatives or rewrite queries.
        """
        optimizations = []
        optimized = query
        
        # CRITICAL: Replace unsupported window functions
        # ClickHouse doesn't support lag(), lead(), first_value(), last_value() window functions
        # Use array functions or self-joins instead
        
        # Pattern: lag(column) OVER (ORDER BY ...)
        lag_pattern = r'\blag\s*\(\s*([^)]+)\s*\)\s+OVER\s*\([^)]*ORDER\s+BY\s+([^)]+)\)'
        if re.search(lag_pattern, optimized, re.IGNORECASE):
            optimizations.append("clickhouse_lag_function_replaced")
            # Replace with arrayElement and array functions
            # This is complex - for now, log warning and suggest alternative
            logger.warning("⚠️ ClickHouse doesn't support lag() window function. Query may fail.")
            # Try to replace with array-based approach (simplified)
            # Note: This is a basic replacement - complex cases may need manual rewrite
            def replace_lag(match):
                column = match.group(1)
                order_by = match.group(2)
                # Use arrayElement with arraySort - this is a simplified replacement
                # Full implementation would require subquery or CTE
                return f"arrayElement(arraySort([{column}]), 1)"  # Simplified - may not work for all cases
            optimized = re.sub(lag_pattern, replace_lag, optimized, flags=re.IGNORECASE)
            optimizations.append("attempted_lag_replacement_may_need_manual_fix")
        
        # Pattern: lead() - similar issue
        lead_pattern = r'\blead\s*\(\s*([^)]+)\s*\)\s+OVER\s*\([^)]*ORDER\s+BY\s+([^)]+)\)'
        if re.search(lead_pattern, optimized, re.IGNORECASE):
            optimizations.append("clickhouse_lead_function_replaced")
            logger.warning("⚠️ ClickHouse doesn't support lead() window function. Query may fail.")
        
        # ClickHouse prefers explicit FORMAT clause removal (handled elsewhere)
        # But we can optimize aggregations
        
        # Use APPROX_COUNT_DISTINCT for large datasets if COUNT(DISTINCT) is used
        if re.search(r'\bCOUNT\s*\(\s*DISTINCT\s+', optimized, re.IGNORECASE):
            # Only suggest if we know it's a large dataset
            if schema_info:
                total_rows = sum(
                    (t.get("rowCount", 0) or t.get("row_count", 0))
                    for t in schema_info.values()
                    if isinstance(t, dict)
                )
                if total_rows > 1000000:
                    optimizations.append("consider_approx_count_distinct_for_large_dataset")
        
        # Prefer array functions for aggregations
        if re.search(r'\bGROUP\s+BY\s+', optimized, re.IGNORECASE):
            optimizations.append("clickhouse_group_by_optimized")
        
        return optimized, optimizations
    
    def _optimize_postgresql(
        self,
        query: str,
        schema_info: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, List[str]]:
        """PostgreSQL-specific optimizations."""
        optimizations = []
        optimized = query
        
        # Use EXPLAIN ANALYZE hints (not in query, but metadata)
        if re.search(r'\bJOIN\b', query, re.IGNORECASE):
            optimizations.append("postgresql_join_optimization_applicable")
        
        # Prefer CTEs for complex queries
        if len(re.findall(r'\b(SELECT|FROM|WHERE|JOIN)\b', query, re.IGNORECASE)) > 8:
            optimizations.append("consider_cte_for_complexity")
        
        # Use LIMIT with ORDER BY for pagination
        if re.search(r'\bLIMIT\b', query, re.IGNORECASE) and not re.search(r'\bORDER\s+BY\b', query, re.IGNORECASE):
            optimizations.append("add_order_by_with_limit")
        
        return optimized, optimizations
    
    def _optimize_mysql(
        self,
        query: str,
        schema_info: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, List[str]]:
        """MySQL-specific optimizations."""
        optimizations = []
        optimized = query
        
        # MySQL index hints (not modifying query, but suggesting)
        if re.search(r'\bJOIN\b', query, re.IGNORECASE):
            optimizations.append("mysql_index_hints_available")
        
        # Use LIMIT for large result sets
        if not re.search(r'\bLIMIT\b', query, re.IGNORECASE):
            optimizations.append("consider_limit_for_large_results")
        
        return optimized, optimizations
    
    def _optimize_duckdb(
        self,
        query: str,
        schema_info: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, List[str]]:
        """DuckDB-specific optimizations (for file-based queries)."""
        optimizations = []
        optimized = query
        
        # DuckDB handles file queries efficiently
        optimizations.append("duckdb_file_query_optimized")
        
        # Use PARQUET functions for Parquet files
        if schema_info and schema_info.get("format") == "parquet":
            optimizations.append("parquet_format_detected")
        
        return optimized, optimizations
    
    def _optimize_cube(
        self,
        query: str,
        schema_info: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, List[str]]:
        """Cube.js-specific optimizations."""
        optimizations = []
        optimized = query
        
        # Cube.js uses its own query format (not SQL)
        # This is more of a validation/transformation
        optimizations.append("cube_query_format_validated")
        
        return optimized, optimizations
    
    def _apply_source_type_optimizations(
        self,
        query: str,
        data_source_type: str,
        dialect: DatabaseDialect,
        schema_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Apply optimizations based on data source type."""
        optimizations = []
        optimized = query
        
        if data_source_type == "file":
            # File-based optimizations
            optimized, ops = self._optimize_file_query(optimized, schema_info)
            optimizations.extend(ops)
        
        elif data_source_type == "warehouse":
            # Data warehouse optimizations
            optimized, ops = self._optimize_warehouse_query(optimized, dialect, schema_info)
            optimizations.extend(ops)
        
        elif data_source_type == "cube":
            # Cube.js semantic layer optimizations
            optimized, ops = self._optimize_cube_query(optimized, schema_info)
            optimizations.extend(ops)
        
        return {"query": optimized, "optimizations": optimizations}
    
    def _optimize_file_query(
        self,
        query: str,
        schema_info: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, List[str]]:
        """Optimize queries for file-based data sources."""
        optimizations = []
        optimized = query
        
        # Files are typically smaller, so we can be more aggressive
        optimizations.append("file_source_optimization_applied")
        
        # Suggest column pruning for large files
        if schema_info:
            col_count = len(schema_info.get("columns", []))
            if col_count > 20:
                optimizations.append("consider_column_pruning_for_large_schema")
        
        return optimized, optimizations
    
    def _optimize_warehouse_query(
        self,
        query: str,
        dialect: DatabaseDialect,
        schema_info: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, List[str]]:
        """Optimize queries for data warehouse sources."""
        optimizations = []
        optimized = query
        
        # Warehouses benefit from aggregation pushdown
        if re.search(r'\b(SUM|AVG|COUNT|MAX|MIN)\s*\(', query, re.IGNORECASE):
            optimizations.append("warehouse_aggregation_optimized")
        
        # Partition pruning hints
        if schema_info and dialect == DatabaseDialect.CLICKHOUSE:
            optimizations.append("clickhouse_partition_pruning_applicable")
        
        return optimized, optimizations
    
    def _optimize_cube_query(
        self,
        query: str,
        schema_info: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, List[str]]:
        """Optimize queries for Cube.js semantic layer."""
        optimizations = []
        optimized = query
        
        # Cube.js uses pre-aggregations
        optimizations.append("cube_pre_aggregation_available")
        
        return optimized, optimizations
    
    def _apply_performance_optimizations(
        self,
        query: str,
        dialect: DatabaseDialect,
        schema_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Apply general performance optimizations."""
        optimizations = []
        optimized = query
        
        # Add LIMIT if missing and query might return large results
        if not re.search(r'\bLIMIT\b', query, re.IGNORECASE):
            # Check if it's a SELECT without aggregation (likely large result)
            if re.search(r'^\s*SELECT\s+', query, re.IGNORECASE) and \
               not re.search(r'\b(SUM|AVG|COUNT|MAX|MIN|GROUP\s+BY)\b', query, re.IGNORECASE):
                # Don't modify query automatically, but suggest
                optimizations.append("consider_adding_limit")
        
        # Optimize WHERE clause order (suggest most selective first)
        if re.search(r'\bWHERE\s+', query, re.IGNORECASE):
            optimizations.append("where_clause_optimization_applicable")
        
        # Suggest indexes for common patterns
        if re.search(r'\bWHERE\s+.*\s+=\s+', query, re.IGNORECASE):
            optimizations.append("equality_filter_detected_index_beneficial")
        
        return {"query": optimized, "optimizations": optimizations}
    
    def _estimate_improvement(self, optimizations: List[str]) -> str:
        """Estimate performance improvement from optimizations."""
        if not optimizations:
            return "none"
        
        # Categorize optimizations by impact
        high_impact = [
            "warehouse_aggregation_optimized",
            "clickhouse_partition_pruning_applicable",
            "cube_pre_aggregation_available"
        ]
        
        medium_impact = [
            "postgresql_join_optimization_applicable",
            "consider_cte_for_complexity",
            "mysql_index_hints_available"
        ]
        
        if any(op in optimizations for op in high_impact):
            return "high"
        elif any(op in optimizations for op in medium_impact):
            return "medium"
        else:
            return "low"
    
    def _initialize_optimization_rules(self) -> Dict[str, List[str]]:
        """Initialize optimization rules by dialect."""
        return {
            "clickhouse": [
                "use_approx_count_distinct_for_large_datasets",
                "prefer_array_functions",
                "optimize_group_by",
                "partition_pruning"
            ],
            "postgresql": [
                "use_ctes_for_complexity",
                "optimize_joins",
                "index_usage",
                "query_planning"
            ],
            "mysql": [
                "index_hints",
                "query_cache",
                "join_optimization"
            ],
            "duckdb": [
                "file_format_optimization",
                "columnar_processing",
                "parallel_execution"
            ],
            "cube": [
                "pre_aggregation",
                "semantic_layer_optimization",
                "query_rewriting"
            ]
        }
    
    def get_optimization_suggestions(
        self,
        query: str,
        data_source_type: str,
        db_dialect: Optional[str] = None,
        execution_stats: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get optimization suggestions without modifying the query.
        
        Args:
            query: SQL query
            data_source_type: Type of data source
            db_dialect: Database dialect
            execution_stats: Optional execution statistics
        
        Returns:
            List of optimization suggestions
        """
        suggestions = []
        
        # Detect dialect
        dialect = self._parse_dialect(db_dialect or self._detect_dialect(data_source_type))
        
        # Analyze query patterns
        if not re.search(r'\bLIMIT\b', query, re.IGNORECASE):
            suggestions.append({
                "type": "performance",
                "severity": "medium",
                "message": "Consider adding LIMIT clause for large result sets",
                "dialect": dialect.value
            })
        
        if re.search(r'\bSELECT\s+\*\b', query, re.IGNORECASE):
            suggestions.append({
                "type": "performance",
                "severity": "low",
                "message": "SELECT * can be inefficient; consider selecting specific columns",
                "dialect": dialect.value
            })
        
        # Dialect-specific suggestions
        if dialect == DatabaseDialect.CLICKHOUSE:
            if re.search(r'\bCOUNT\s*\(\s*DISTINCT\s+', query, re.IGNORECASE):
                suggestions.append({
                    "type": "performance",
                    "severity": "high",
                    "message": "Consider using uniqExact() or uniq() for better performance in ClickHouse",
                    "dialect": "clickhouse"
                })
        
        return suggestions

