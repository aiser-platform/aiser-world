"""
Schema Optimizer Service

Optimizes database schema representation for LLM consumption while minimizing token usage.
Works with SchemaCacheService to optimize cached schemas for specific queries.
Provides intelligent schema summarization, relevance filtering, and hierarchical representation.
"""

import logging
from typing import Any, Dict, List, Optional, Set, Tuple
from collections import defaultdict

logger = logging.getLogger(__name__)

# Token estimation constants (approximate)
TOKEN_PER_TABLE = 50  # Approximate tokens per table
TOKEN_PER_COLUMN = 5  # Approximate tokens per column
CHARS_PER_TOKEN = 4  # Rough character-to-token ratio


class SchemaOptimizer:
    """
    Optimizes schema representation for LLM while maintaining accuracy.
    Works with SchemaCacheService - optimizes cached schemas for specific queries.
    
    Features:
    - Token-aware schema summarization (adaptive token budget)
    - Relevance-based table/column filtering
    - Hierarchical schema representation
    - Relationship inference
    - Data type normalization
    - Query-aware optimization
    """
    
    def __init__(
        self,
        max_tokens: Optional[int] = None,
        model_context_window: Optional[int] = None
    ):
        """
        Initialize schema optimizer.
        
        Args:
            max_tokens: Optional max tokens for schema (if None, calculated adaptively)
            model_context_window: Optional model context window size for adaptive calculation
        """
        # Adaptive token budget: use 30% of context window, or default to 4000
        if max_tokens is None:
            if model_context_window:
                # Use 30% of context window for schema, but cap at reasonable limits
                max_tokens = min(int(model_context_window * 0.3), 8000)
                max_tokens = max(max_tokens, 2000)  # Minimum 2000 tokens
            else:
                max_tokens = 4000  # Default fallback
        
        self.max_tokens = max_tokens
        self.model_context_window = model_context_window
        logger.info(f"✅ SchemaOptimizer initialized (max_tokens: {max_tokens}, adaptive: {model_context_window is not None})")
    
    def optimize_schema_for_query(
        self,
        schema_info: Dict[str, Any],
        query: str,
        query_intent: Optional[Dict[str, Any]] = None,
        available_tokens: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Optimize schema representation for a specific query.
        Works with SchemaCacheService - takes cached schema and optimizes for query.
        
        Args:
            schema_info: Full schema information (typically from SchemaCacheService)
            query: Natural language query
            query_intent: Optional query intent analysis
            available_tokens: Optional available token budget (overrides max_tokens if provided)
        
        Returns:
            Optimized schema dictionary with token-efficient representation
        """
        # Use provided token budget or fall back to instance default
        token_budget = available_tokens if available_tokens is not None else self.max_tokens
        
        # Step 1: Extract query keywords and intent
        query_keywords = self._extract_query_keywords(query)
        intent_type = query_intent.get("aggregation_type", "general") if query_intent else "general"
        
        # Step 2: Score and rank tables by relevance
        table_scores = self._score_tables_by_relevance(
            schema_info, 
            query_keywords, 
            intent_type
        )
        
        # Step 3: Select most relevant tables within token budget
        selected_tables = self._select_tables_within_budget(
            schema_info,
            table_scores,
            token_budget
        )
        
        # Step 4: Build optimized schema representation
        optimized_schema = self._build_optimized_schema(
            schema_info,
            selected_tables,
            query_keywords
        )
        
        # Step 5: Add schema relationships and metadata
        optimized_schema["relationships"] = self._infer_relationships(
            schema_info,
            selected_tables
        )
        optimized_schema["summary"] = self._generate_schema_summary(
            schema_info,
            selected_tables
        )
        
        estimated_tokens = self._estimate_tokens(optimized_schema)
        logger.info(
            f"📊 Schema optimized: {len(selected_tables)}/{len(self._get_all_tables(schema_info))} tables selected "
            f"(estimated tokens: {estimated_tokens}/{token_budget})"
        )
        
        return optimized_schema
    
    @staticmethod
    def estimate_schema_tokens(schema_str: str) -> int:
        """
        Estimate token count from schema string.
        Can be used to determine if optimization is needed.
        
        Args:
            schema_str: Schema as string
        
        Returns:
            Estimated token count
        """
        return len(schema_str) // CHARS_PER_TOKEN
    
    def _extract_query_keywords(self, query: str) -> Set[str]:
        """Extract relevant keywords from query for schema matching."""
        import re
        
        # Normalize query
        query_lower = query.lower()
        
        # Extract potential table/column names (words that might match schema)
        # Remove common stop words
        stop_words = {
            "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
            "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
            "been", "being", "have", "has", "had", "do", "does", "did", "will",
            "would", "should", "could", "may", "might", "must", "can", "what",
            "which", "who", "where", "when", "why", "how", "show", "get", "give"
        }
        
        # Extract meaningful words (2+ chars, not stop words)
        words = re.findall(r'\b[a-z_][a-z0-9_]{1,}\b', query_lower)
        keywords = {w for w in words if w not in stop_words and len(w) > 2}
        
        # Add common business terms that might map to columns
        business_terms = {
            "sales", "revenue", "profit", "cost", "price", "amount", "total",
            "customer", "order", "product", "item", "date", "time", "year",
            "month", "day", "status", "type", "category", "region", "country",
            "city", "state", "name", "id", "number", "count", "quantity"
        }
        
        # Add business terms that appear in query
        keywords.update({term for term in business_terms if term in query_lower})
        
        return keywords
    
    def _score_tables_by_relevance(
        self,
        schema_info: Dict[str, Any],
        query_keywords: Set[str],
        intent_type: str
    ) -> Dict[str, float]:
        """Score tables by relevance to query."""
        table_scores = {}
        all_tables = self._get_all_tables(schema_info)
        
        for table_name, table_info in all_tables.items():
            score = 0.0
            
            # Score based on table name match
            table_name_lower = table_name.lower()
            table_name_parts = set(table_name_lower.replace("_", " ").split())
            
            # Exact or partial table name match
            for keyword in query_keywords:
                if keyword in table_name_lower:
                    score += 10.0
                if keyword in table_name_parts:
                    score += 5.0
            
            # Score based on column name matches
            columns = table_info.get("columns", [])
            if isinstance(columns, list):
                column_matches = 0
                for col in columns:
                    col_name = col.get("name", "") if isinstance(col, dict) else str(col)
                    col_name_lower = col_name.lower()
                    
                    for keyword in query_keywords:
                        if keyword in col_name_lower:
                            column_matches += 1
                            score += 2.0
                
                # Bonus for multiple column matches
                if column_matches > 3:
                    score += 5.0
            
            # Score based on intent type
            if intent_type == "aggregation":
                # Prefer tables with numeric columns
                numeric_cols = sum(
                    1 for col in columns
                    if isinstance(col, dict) and 
                    col.get("type", "").lower() in ("int", "float", "decimal", "number", "numeric", "bigint", "double")
                )
                if numeric_cols > 0:
                    score += 3.0
            
            elif intent_type == "time_series":
                # Prefer tables with date/time columns
                date_cols = sum(
                    1 for col in columns
                    if isinstance(col, dict) and
                    col.get("type", "").lower() in ("date", "datetime", "timestamp", "time")
                )
                if date_cols > 0:
                    score += 5.0
            
            # Score based on row count (larger tables might be more important)
            row_count = table_info.get("rowCount", 0) or table_info.get("row_count", 0)
            if row_count > 10000:
                score += 2.0
            
            # Normalize score
            table_scores[table_name] = score
        
        return table_scores
    
    def _select_tables_within_budget(
        self,
        schema_info: Dict[str, Any],
        table_scores: Dict[str, float],
        max_tokens: int
    ) -> List[str]:
        """Select most relevant tables within token budget."""
        # Sort tables by score (descending)
        sorted_tables = sorted(
            table_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        selected = []
        token_budget = max_tokens
        
        for table_name, score in sorted_tables:
            if score <= 0:
                continue  # Skip irrelevant tables
            
            # Estimate tokens for this table
            table_info = self._get_table_info(schema_info, table_name)
            if not table_info:
                continue
            
            table_tokens = self._estimate_table_tokens(table_name, table_info)
            
            if table_tokens <= token_budget:
                selected.append(table_name)
                token_budget -= table_tokens
            else:
                # If we can't fit full table, try to fit with reduced columns
                reduced_tokens = self._estimate_table_tokens(table_name, table_info, max_columns=5)
                if reduced_tokens <= token_budget:
                    selected.append(table_name)
                    token_budget -= reduced_tokens
                    # Mark for column reduction
                    table_info["_reduce_columns"] = True
        
        # Always include at least the top table if any exist
        if not selected and sorted_tables:
            top_table = sorted_tables[0][0]
            selected.append(top_table)
        
        return selected
    
    def _build_optimized_schema(
        self,
        schema_info: Dict[str, Any],
        selected_tables: List[str],
        query_keywords: Set[str]
    ) -> Dict[str, Any]:
        """Build optimized schema representation."""
        optimized = {
            "tables": {},
            "metadata": {
                "total_tables": len(self._get_all_tables(schema_info)),
                "selected_tables": len(selected_tables),
                "optimization_applied": True
            }
        }
        
        for table_name in selected_tables:
            table_info = self._get_table_info(schema_info, table_name)
            if not table_info:
                continue
            
            # Build optimized table representation
            optimized_table = {
                "name": table_name,
                "columns": [],
                "row_count": table_info.get("rowCount") or table_info.get("row_count", 0)
            }
            
            # Select relevant columns
            columns = table_info.get("columns", [])
            if isinstance(columns, list):
                # Check if we need to reduce columns
                reduce_columns = table_info.get("_reduce_columns", False)
                max_cols = 5 if reduce_columns else 20
                
                # Score columns by relevance
                column_scores = []
                for col in columns:
                    col_name = col.get("name", "") if isinstance(col, dict) else str(col)
                    col_type = col.get("type", "") if isinstance(col, dict) else "unknown"
                    
                    score = 0.0
                    col_name_lower = col_name.lower()
                    
                    # Score based on keyword match
                    for keyword in query_keywords:
                        if keyword in col_name_lower:
                            score += 5.0
                    
                    # Prefer common important columns
                    if col_name_lower in ("id", "name", "date", "created_at", "updated_at"):
                        score += 3.0
                    
                    # Prefer numeric columns for aggregations
                    if col_type.lower() in ("int", "float", "decimal", "number", "numeric"):
                        score += 2.0
                    
                    column_scores.append((col, score))
                
                # Sort by score and select top columns
                column_scores.sort(key=lambda x: x[1], reverse=True)
                selected_columns = [col for col, _ in column_scores[:max_cols]]
                
                # Format columns
                for col in selected_columns:
                    if isinstance(col, dict):
                        optimized_table["columns"].append({
                            "name": col.get("name", "unknown"),
                            "type": col.get("type", "unknown"),
                            "nullable": col.get("nullable", True)
                        })
                    else:
                        optimized_table["columns"].append({
                            "name": str(col),
                            "type": "unknown",
                            "nullable": True
                        })
            
            optimized["tables"][table_name] = optimized_table
        
        return optimized
    
    def _infer_relationships(
        self,
        schema_info: Dict[str, Any],
        selected_tables: List[str]
    ) -> List[Dict[str, Any]]:
        """Infer relationships between tables based on naming patterns."""
        relationships = []
        
        # Look for foreign key patterns (table_id, table_name, etc.)
        all_tables = {name: self._get_table_info(schema_info, name) for name in selected_tables}
        
        for table_name, table_info in all_tables.items():
            if not table_info or not isinstance(table_info, dict):
                continue
            columns = table_info.get("columns", [])
            if not isinstance(columns, list):
                continue
            
            for col in columns:
                col_name = col.get("name", "") if isinstance(col, dict) else str(col)
                col_name_lower = col_name.lower()
                
                # Check if column name suggests a relationship
                # Pattern: other_table_id, other_table_name, etc.
                for other_table in selected_tables:
                    if other_table == table_name:
                        continue
                    
                    other_table_lower = other_table.lower()
                    # Remove schema prefix if present
                    other_table_base = other_table_lower.split(".")[-1]
                    
                    # Check for foreign key patterns
                    if f"{other_table_base}_id" in col_name_lower or \
                       f"{other_table_base}id" in col_name_lower:
                        relationships.append({
                            "from_table": table_name,
                            "to_table": other_table,
                            "via_column": col_name,
                            "type": "likely_foreign_key",
                            "confidence": 0.7
                        })
        
        return relationships
    
    def _generate_schema_summary(
        self,
        schema_info: Dict[str, Any],
        selected_tables: List[str]
    ) -> str:
        """Generate a concise schema summary."""
        total_tables = len(self._get_all_tables(schema_info))
        total_rows = sum(
            (self._get_table_info(schema_info, name) or {}).get("rowCount", 0) or
            (self._get_table_info(schema_info, name) or {}).get("row_count", 0)
            for name in selected_tables
        )
        
        summary = f"Schema contains {total_tables} tables. "
        summary += f"Selected {len(selected_tables)} most relevant tables "
        summary += f"with ~{total_rows:,} total rows for this query."
        
        return summary
    
    def format_schema_for_llm(
        self,
        optimized_schema: Dict[str, Any],
        format_style: str = "structured"
    ) -> str:
        """
        Format optimized schema for LLM consumption.
        
        Args:
            optimized_schema: Optimized schema dictionary
            format_style: "structured" (hierarchical) or "compact" (token-efficient)
        
        Returns:
            Formatted schema string
        """
        if format_style == "compact":
            return self._format_compact(optimized_schema)
        else:
            return self._format_structured(optimized_schema)
    
    def _format_structured(self, schema: Dict[str, Any]) -> str:
        """Format schema in structured, readable format."""
        parts = []
        
        # Add summary
        if "summary" in schema:
            parts.append(f"📊 {schema['summary']}\n")
        
        # Add tables
        tables = schema.get("tables", {})
        for table_name, table_info in tables.items():
            parts.append(f"\n📋 TABLE: {table_name}")
            if table_info.get("row_count"):
                parts.append(f"   Rows: {table_info['row_count']:,}")
            
            columns = table_info.get("columns", [])
            if columns:
                parts.append("   COLUMNS:")
                for col in columns:
                    col_name = col.get("name", "unknown")
                    col_type = col.get("type", "unknown")
                    nullable = "NULL" if col.get("nullable", True) else "NOT NULL"
                    parts.append(f"     • {col_name} ({col_type}) {nullable}")
        
        # Add relationships
        relationships = schema.get("relationships", [])
        if relationships:
            parts.append("\n🔗 RELATIONSHIPS:")
            for rel in relationships[:5]:  # Limit to top 5
                parts.append(
                    f"   {rel['from_table']}.{rel['via_column']} → {rel['to_table']} "
                    f"(confidence: {rel['confidence']:.1f})"
                )
        
        return "\n".join(parts)
    
    def _format_compact(self, schema: Dict[str, Any]) -> str:
        """Format schema in compact, token-efficient format."""
        parts = []
        
        tables = schema.get("tables", {})
        for table_name, table_info in tables.items():
            # Compact table representation
            row_count = table_info.get("row_count", 0)
            columns = table_info.get("columns", [])
            
            col_names = [col.get("name", "") for col in columns[:10]]  # Limit columns
            col_str = ", ".join(col_names)
            if len(columns) > 10:
                col_str += f" (+{len(columns) - 10} more)"
            
            parts.append(f"{table_name}({row_count:,} rows): {col_str}")
        
        return "\n".join(parts)
    
    # Helper methods
    
    def _get_all_tables(self, schema_info: Dict[str, Any]) -> Dict[str, Any]:
        """Extract all tables from schema info."""
        tables = {}
        
        for key, value in schema_info.items():
            # Skip schema-only keys (like 'aiser_warehouse' without table)
            if isinstance(value, dict):
                # Check if it's a table (has columns, rowCount, or engine)
                if 'columns' in value or 'rowCount' in value or 'engine' in value or 'row_count' in value:
                    tables[key] = value
                # Also check nested structure
                elif isinstance(value, dict):
                    for nested_key, nested_value in value.items():
                        if isinstance(nested_value, dict) and ('columns' in nested_value or 'rowCount' in nested_value):
                            tables[f"{key}.{nested_key}"] = nested_value
        
        return tables
    
    def _get_table_info(self, schema_info: Dict[str, Any], table_name: str) -> Optional[Dict[str, Any]]:
        """Get table information by name."""
        all_tables = self._get_all_tables(schema_info)
        if all_tables:
            return all_tables.get(table_name)
        return None
    
    def _estimate_table_tokens(
        self,
        table_name: str,
        table_info: Dict[str, Any],
        max_columns: Optional[int] = None
    ) -> int:
        """Estimate token count for a table representation."""
        tokens = TOKEN_PER_TABLE  # Base tokens for table
        
        columns = table_info.get("columns", [])
        if isinstance(columns, list):
            col_count = len(columns)
            if max_columns:
                col_count = min(col_count, max_columns)
            tokens += col_count * TOKEN_PER_COLUMN
        
        # Add tokens for table name
        tokens += len(table_name.split()) * 2
        
        return tokens
    
    def _estimate_tokens(self, schema: Dict[str, Any]) -> int:
        """Estimate total token count for schema representation."""
        tokens = 100  # Base tokens for metadata
        
        tables = schema.get("tables", {})
        for table_name, table_info in tables.items():
            tokens += self._estimate_table_tokens(table_name, table_info)
        
        # Add tokens for relationships
        relationships = schema.get("relationships", [])
        tokens += len(relationships) * 10
        
        return tokens

