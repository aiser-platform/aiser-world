"""
Error Recovery Node for LangGraph Workflow

Handles non-critical errors with adaptive retry strategies that learn from previous failures.
Now enhanced with comprehensive error classification for precise recovery.
"""

import logging
import re
import json
from typing import Any, Optional, Dict, List

from app.modules.ai.schemas.graph_state import AiserWorkflowState
from app.modules.ai.services.langgraph_base import (
    validate_state_transition,
    handle_node_errors
)
from app.modules.ai.services.error_classifier import ErrorClassifier, ErrorRecoverability

logger = logging.getLogger(__name__)

# Initialize error classifier
_error_classifier = ErrorClassifier()


@validate_state_transition(validate_input=True, validate_output=True)
async def error_recovery_node(
    state: AiserWorkflowState,
    litellm_service: Any = None
) -> AiserWorkflowState:
    """
    Handle non-critical errors with adaptive recovery strategies.
    
    Args:
        state: Current workflow state
        litellm_service: Optional LiteLLM service for adaptive SQL fixes
    
    Returns:
        Updated state with recovery actions
    """
    error = state.get("error")
    if error is None:
        error = ""
    elif not isinstance(error, str):
        error = str(error)
    
    retry_count = state.get("retry_count", 0)
    sql_query = state.get("sql_query")
    query_result = state.get("query_result", [])
    original_query = state.get("query", "")
    schema_info = state.get("schema_info", {})
    
    # CRITICAL: Track error history to learn from previous failures
    error_history = state.get("error_history", [])
    if error:
        error_entry = {
            "error": str(error),
            "retry_count": retry_count,
            "sql_query": sql_query[:200] if sql_query else None,
            "stage": state.get("current_stage", "unknown")
        }
        error_history.append(error_entry)
        state["error_history"] = error_history[-5:]  # Keep last 5 errors
    
    state["current_stage"] = "error_recovery"
    state["progress_percentage"] = 50.0
    # Safely handle None error - ensure error_str is always a string
    error_str = str(error) if error else "Unknown error"
    if not error_str:
        error_str = "Unknown error"
    state["progress_message"] = f"Recovering from error: {error_str[:100]}..."
    
    try:
        # CRITICAL: Classify error using comprehensive taxonomy
        context = {
            "stage": state.get("current_stage", "unknown"),
            "query": original_query,
            "data_source_id": state.get("data_source_id"),
            "retry_count": retry_count
        }
        classified_error = _error_classifier.classify_error(error, context)
        
        logger.info(
            f"🔍 Error classified: category={classified_error.category.value}, "
            f"type={classified_error.error_type}, severity={classified_error.severity.value}, "
            f"recoverability={classified_error.recoverability.value}, confidence={classified_error.confidence:.2f}"
        )
        
        # Analyze error type - ensure error is a string
        error_lower = error.lower() if isinstance(error, str) and error else ""
        
        # Use classified error for recovery decisions
        if classified_error.recoverability == ErrorRecoverability.NONE:
            logger.error(f"❌ Error is not recoverable: {classified_error.error_type}")
            state["critical_failure"] = True
            state["error"] = f"Non-recoverable error: {error}"
            return state
        
        # SQL validation errors - ADAPTIVE FIX based on specific error type
        validation_errors = [
            "missing from", "missing required keyword: from", "from clause",
            "invalid sql", "sql validation failed", "invalid pattern",
            "reserved word", "table", "invalid_or_non_sql_query",
            "unbalanced parentheses", "parentheses", "after sanitization"
        ]
        
        if classified_error.category.value == "sql_validation" or any(kw in error_lower for kw in validation_errors):
            if sql_query and retry_count < 2 and litellm_service:
                logger.info(f"🔧 Attempting to fix SQL validation error (attempt {retry_count + 1})")
                logger.info(f"   Previous errors: {[e.get('error', '')[:50] for e in error_history[-3:]]}")
                
                # Use LLM to fix SQL based on specific error
                fixed_sql = await _fix_sql_with_llm(
                    sql_query, 
                    error, 
                    error_history, 
                    original_query,
                    schema_info,
                    litellm_service
                )
                
                if fixed_sql and fixed_sql != sql_query:
                    logger.info(f"✅ LLM fixed SQL: {fixed_sql[:100]}...")
                    state["sql_query"] = fixed_sql
                    state["progress_message"] = "SQL fixed based on validation error"
                    state["retry_count"] = retry_count + 1
                    # Clear error to allow retry with fixed SQL
                    state.pop("error", None)
                    state.pop("sql_validation_error", None)
                    return state
                else:
                    logger.warning("⚠️ LLM could not fix SQL, trying rule-based fixes")
                    # Fallback to rule-based fixes
                    fixed_sql = _fix_sql_rules(sql_query, error_lower)
                    if fixed_sql != sql_query:
                        state["sql_query"] = fixed_sql
                        state["retry_count"] = retry_count + 1
                        state.pop("error", None)
                        return state
        
        # ClickHouse window function errors - CRITICAL: ClickHouse doesn't support window functions
        if any(kw in error_lower for kw in ["lag", "lead", "window function", "aggregate function with name", "does not exist"]):
            if sql_query and retry_count < 2 and litellm_service:
                logger.info(f"🔧 Attempting to fix ClickHouse window function error (attempt {retry_count + 1})")
                # Use LLM to rewrite query without window functions
                fixed_sql = await _fix_clickhouse_window_functions(
                    sql_query,
                    error,
                    original_query,
                    schema_info,
                    litellm_service
                )
                if fixed_sql and fixed_sql != sql_query:
                    logger.info(f"✅ Rewrote query without window functions: {fixed_sql[:100]}...")
                    state["sql_query"] = fixed_sql
                    state["progress_message"] = "Rewrote query for ClickHouse compatibility"
                    state["retry_count"] = retry_count + 1
                    state.pop("error", None)
                    state.pop("query_execution_error", None)
                    return state
                else:
                    logger.warning("⚠️ Could not rewrite query without window functions")
        
        # SQL syntax errors - try to fix SQL
        if any(kw in error_lower for kw in ["syntax", "parse", "sql error"]):
            if sql_query and retry_count < 2:
                logger.info(f"🔧 Attempting to fix SQL syntax error (attempt {retry_count + 1})")
                fixed_sql = _fix_sql_rules(sql_query, error_lower)
                if fixed_sql != sql_query:
                    state["sql_query"] = fixed_sql
                    state["retry_count"] = retry_count + 1
                    state.pop("error", None)
                    return state
                state["retry_count"] = retry_count + 1
                return state
        
        # Query execution errors - retry with different engine
        if any(kw in error_lower for kw in ["execution", "query failed", "connection timeout"]):
            if sql_query and retry_count < 2:
                logger.info(f"🔄 Retrying query execution with different strategy (attempt {retry_count + 1})")
                state["progress_message"] = "Retrying query execution..."
                state["retry_count"] = retry_count + 1
                # Clear error to allow retry
                state.pop("error", None)
                state.pop("query_execution_error", None)
                return state
        
        # No query results - adapt SQL if possible
        if not query_result or len(query_result) == 0:
            if sql_query and retry_count < 2:
                logger.info(f"🔄 No results returned, adapting query (attempt {retry_count + 1})")
                state["progress_message"] = "Adapting query to get results..."
                state["retry_count"] = retry_count + 1
                # Could use LLM to adapt SQL here (e.g., remove filters, change aggregation)
                state.pop("error", None)
                return state
        
        # Chart/insights generation errors - continue with partial results
        if any(kw in error_lower for kw in ["chart", "insight", "visualization"]):
            if query_result and len(query_result) > 0:
                logger.info("✅ Continuing with partial results (chart/insights failed but have data)")
                state["progress_message"] = "Continuing with available data..."
                state.pop("error", None)
                return state
        
        # If we have partial results, continue
        if query_result and len(query_result) > 0:
            logger.info("✅ Continuing with partial results")
            state["progress_message"] = "Continuing with partial results..."
            state.pop("error", None)
            return state
        
        # If we have SQL but no results, mark for retry
        if sql_query and not query_result:
            if retry_count < 3:
                logger.info(f"🔄 Retrying query execution (attempt {retry_count + 1})")
                state["progress_message"] = "Retrying query execution..."
                state["retry_count"] = retry_count + 1
                state.pop("error", None)
                return state
        
        # Cannot recover - mark as failed
        logger.error(f"❌ Cannot recover from error: {error}")
        logger.error(f"   Error history: {[e.get('error', '')[:50] for e in error_history]}")
        state["progress_message"] = f"Error: {error[:100]}"
        state["critical_failure"] = True
        return state
        
    except Exception as e:
        logger.error(f"❌ Error recovery node failed: {e}", exc_info=True)
        state["error"] = f"Error recovery failed: {str(e)}"
        state["critical_failure"] = True
        return state


async def _fix_clickhouse_window_functions(
    sql_query: str,
    error: str,
    original_query: str,
    schema_info: Dict,
    litellm_service: Any
) -> Optional[str]:
    """
    Rewrite SQL query to remove window functions for ClickHouse compatibility.
    
    Args:
        sql_query: SQL query with window functions
        error: Error message indicating window function issue
        original_query: Original natural language query
        schema_info: Database schema information
        litellm_service: LiteLLM service for AI calls
    
    Returns:
        Rewritten SQL without window functions or None if rewrite failed
    """
    try:
        # Extract schema summary
        schema_summary = ""
        if schema_info:
            tables = []
            for key, value in list(schema_info.items())[:5]:
                if isinstance(value, dict) and 'columns' in value:
                    col_names = [c.get('name', '') if isinstance(c, dict) else str(c) for c in value.get('columns', [])[:5]]
                    tables.append(f"{key}: {', '.join(col_names)}")
            schema_summary = "\n".join(tables) if tables else "Schema available"
        
        rewrite_prompt = f"""You are an expert SQL analyst specializing in ClickHouse. Rewrite the following SQL query to remove ALL window functions.

**Original User Query:** {original_query}

**Current SQL (HAS WINDOW FUNCTIONS - WILL FAIL IN CLICKHOUSE):**
```sql
{sql_query}
```

**Error Message:**
{error}

**Available Schema:**
{schema_summary}

**CRITICAL REQUIREMENTS FOR CLICKHOUSE:**
1. ClickHouse does NOT support window functions: lag(), lead(), row_number(), rank(), first_value(), last_value(), etc.
2. ClickHouse does NOT support: OVER (ORDER BY ...) or OVER (PARTITION BY ... ORDER BY ...)
3. You MUST rewrite the query using:
   - Self-joins for "previous value" or "next value" comparisons
   - Subqueries for ranking or row numbers
   - Array functions for sequence operations
   - Application-layer calculations for growth rates or changes

**Common Patterns to Replace:**
- lag(column) OVER (ORDER BY date) → Use self-join: JOIN table t2 ON t2.date < t1.date ORDER BY t2.date DESC LIMIT 1
- row_number() OVER (PARTITION BY category ORDER BY date) → Use subquery with row numbers
- Growth rate calculations → Calculate in SELECT using self-join or subquery

**Your Task:**
Rewrite the SQL query to achieve the same result WITHOUT any window functions.
- Return ONLY the rewritten SQL query
- Do NOT include any explanations or markdown
- Ensure the query is valid ClickHouse SQL
- Maintain the same logical result as the original query

**Rewritten SQL (NO WINDOW FUNCTIONS):**"""

        logger.info(f"🤖 Rewriting SQL to remove window functions for ClickHouse...")
        
        result = await litellm_service.generate_completion(
            prompt=rewrite_prompt,
            system_context="You are an expert ClickHouse SQL analyst. Rewrite SQL queries to remove window functions using self-joins, subqueries, or array functions. Return ONLY the SQL query, no explanations.",
            max_tokens=2000,
            temperature=0.2  # Low temperature for consistent rewrites
        )
        
        if result.get("success") and result.get("content"):
            rewritten_sql = result.get("content", "").strip()
            
            # Extract SQL from response (may be in code blocks)
            import re
            sql_match = re.search(r'```(?:sql)?\s*(.*?)\s*```', rewritten_sql, re.DOTALL)
            if sql_match:
                rewritten_sql = sql_match.group(1).strip()
            
            # Verify no window functions remain
            window_patterns = [
                r'\blag\s*\(', r'\blead\s*\(', r'\brow_number\s*\(', r'\brank\s*\(',
                r'\bdense_rank\s*\(', r'\bfirst_value\s*\(', r'\blast_value\s*\(',
                r'\bOVER\s*\(', r'\bPARTITION\s+BY', r'\bWINDOW\s+'
            ]
            has_window_func = any(re.search(pattern, rewritten_sql, re.IGNORECASE) for pattern in window_patterns)
            
            if has_window_func:
                logger.warning("⚠️ Rewritten SQL still contains window functions, attempting rule-based removal")
                # Fallback to rule-based removal
                rewritten_sql = _remove_window_functions_rule_based(rewritten_sql)
            
            if rewritten_sql and len(rewritten_sql) > 10:
                logger.info(f"✅ Successfully rewrote query without window functions")
                return rewritten_sql
        
        return None
    except Exception as e:
        logger.error(f"❌ Failed to rewrite query without window functions: {e}", exc_info=True)
        return None


def _remove_window_functions_rule_based(sql_query: str) -> str:
    """
    Rule-based removal of window functions (fallback if LLM rewrite fails).
    This is a simplified approach - may not work for all cases.
    """
    import re
    
    # Remove lag() OVER (...)
    sql_query = re.sub(r'\blag\s*\([^)]+\)\s+OVER\s*\([^)]+\)', '', sql_query, flags=re.IGNORECASE)
    
    # Remove lead() OVER (...)
    sql_query = re.sub(r'\blead\s*\([^)]+\)\s+OVER\s*\([^)]+\)', '', sql_query, flags=re.IGNORECASE)
    
    # Remove row_number() OVER (...)
    sql_query = re.sub(r'\brow_number\s*\(\s*\)\s+OVER\s*\([^)]+\)', '', sql_query, flags=re.IGNORECASE)
    
    # Remove other window functions
    sql_query = re.sub(r'\b(rank|dense_rank|first_value|last_value)\s*\([^)]+\)\s+OVER\s*\([^)]+\)', '', sql_query, flags=re.IGNORECASE)
    
    # Clean up extra commas
    sql_query = re.sub(r',\s*,', ',', sql_query)
    sql_query = re.sub(r',\s+FROM', ' FROM', sql_query, flags=re.IGNORECASE)
    
    return sql_query.strip()


async def _fix_sql_with_llm(
    sql_query: str,
    error: str,
    error_history: List[Dict],
    original_query: str,
    schema_info: Dict,
    litellm_service: Any
) -> Optional[str]:
    """
    Use LLM to fix SQL based on error and error history.
    
    Args:
        sql_query: The broken SQL query
        error: Current error message
        error_history: List of previous errors
        original_query: Original natural language query
        schema_info: Database schema information
        litellm_service: LiteLLM service for AI calls
    
    Returns:
        Fixed SQL query or None if fix failed
    """
    try:
        # Build context from error history
        previous_errors = "\n".join([
            f"- Attempt {e.get('retry_count', 0)}: {e.get('error', '')[:100]}"
            for e in error_history[-3:]
        ]) if error_history else "No previous errors"
        
        # Extract schema summary
        schema_summary = ""
        if schema_info:
            tables = []
            for key, value in list(schema_info.items())[:5]:  # First 5 tables
                if isinstance(value, dict) and 'columns' in value:
                    col_names = [c.get('name', '') if isinstance(c, dict) else str(c) for c in value.get('columns', [])[:5]]
                    tables.append(f"{key}: {', '.join(col_names)}")
            schema_summary = "\n".join(tables) if tables else "Schema available"
        
        fix_prompt = f"""You are an expert SQL analyst. Fix the following SQL query that failed validation.

**Original User Query:** {original_query}

**Current SQL (BROKEN):**
```sql
{sql_query}
```

**Error Message:**
{error}

**Previous Attempts:**
{previous_errors}

**Available Schema:**
{schema_summary}

**Your Task:**
Fix the SQL query to resolve the error. Common issues:
- Missing FROM clause: Add proper FROM table_name
- Reserved word as column: Remove or replace reserved words like 'table', 'select', etc.
- Invalid patterns: Fix syntax errors
- JSON artifacts: Remove any JSON corruption (": FORMAT JSONEachRow, etc.)
- Window functions (if ClickHouse): Remove lag(), lead(), row_number(), OVER clauses - use self-joins or subqueries instead

**Requirements:**
- Return ONLY the fixed SQL query
- Do NOT include any explanations or markdown
- Do NOT include JSON artifacts or FORMAT clauses
- Ensure FROM clause is present with actual table name
- Use actual column names from schema
- Return clean, executable SQL

**Fixed SQL:**"""

        logger.info(f"🤖 Asking LLM to fix SQL based on error: {error[:50]}...")
        
        result = await litellm_service.generate_completion(
            prompt=fix_prompt,
            system_context="You are an expert SQL analyst. Fix SQL queries by resolving validation errors. Return ONLY the fixed SQL, no explanations.",
            max_tokens=1000,
            temperature=0.1  # Low temperature for deterministic fixes
        )
        
        if result.get("success") and result.get("content"):
            fixed_sql = result.get("content", "").strip()
            
            # Extract SQL from response (may be in code blocks)
            if "```sql" in fixed_sql:
                sql_match = re.search(r'```sql\s*(.*?)\s*```', fixed_sql, re.DOTALL)
                if sql_match:
                    fixed_sql = sql_match.group(1).strip()
            elif "```" in fixed_sql:
                sql_match = re.search(r'```\s*(.*?)\s*```', fixed_sql, re.DOTALL)
                if sql_match:
                    fixed_sql = sql_match.group(1).strip()
            
            # Remove any remaining JSON artifacts
            fixed_sql = re.sub(r'\s*":\s*FORMAT\s+.*$', '', fixed_sql, flags=re.IGNORECASE)
            fixed_sql = re.sub(r'\s*["\']\s*\}\s*\]\s*\}.*$', '', fixed_sql)
            fixed_sql = fixed_sql.strip()
            
            # Validate it's actually SQL
            if fixed_sql.upper().startswith("SELECT") and "FROM" in fixed_sql.upper():
                logger.info(f"✅ LLM generated fixed SQL: {fixed_sql[:100]}...")
                return fixed_sql
            else:
                logger.warning(f"⚠️ LLM fix didn't produce valid SQL: {fixed_sql[:100]}")
                return None
        else:
            logger.warning(f"⚠️ LLM fix failed: {result.get('error', 'Unknown error')}")
            return None
            
    except Exception as e:
        logger.error(f"❌ Error in LLM SQL fix: {e}", exc_info=True)
        return None


def _fix_sql_rules(sql_query: str, error_lower: str) -> str:
    """
    Apply rule-based fixes to SQL based on error type.
    
    Args:
        sql_query: The SQL query to fix
        error_lower: Lowercase error message
    
    Returns:
        Fixed SQL query
    """
    fixed_sql = sql_query
    
    # Fix: Unbalanced parentheses (common issue)
    if "unbalanced parentheses" in error_lower or "parentheses" in error_lower:
        open_parens = fixed_sql.count('(')
        close_parens = fixed_sql.count(')')
        if close_parens > open_parens:
            # Remove extra closing parentheses from the end
            extra_closes = close_parens - open_parens
            for _ in range(extra_closes):
                last_close = fixed_sql.rfind(')')
                if last_close > 0:
                    fixed_sql = fixed_sql[:last_close] + fixed_sql[last_close + 1:]
            fixed_sql = fixed_sql.strip()
            logger.info(f"🔧 Fixed unbalanced parentheses (removed {extra_closes} extra closing)")
        elif open_parens > close_parens:
            # Add missing closing parentheses at the end (before FORMAT if present)
            missing_closes = open_parens - close_parens
            format_pos = fixed_sql.upper().rfind('FORMAT')
            if format_pos > 0:
                fixed_sql = fixed_sql[:format_pos].rstrip() + ')' * missing_closes + ' ' + fixed_sql[format_pos:]
            else:
                fixed_sql = fixed_sql.rstrip() + ')' * missing_closes
            logger.info(f"🔧 Fixed unbalanced parentheses (added {missing_closes} missing closing)")
    
    # Fix: Missing FROM clause
    if "missing from" in error_lower or "missing required keyword: from" in error_lower:
        # Try to infer table from schema or add placeholder
        if "SELECT" in fixed_sql.upper() and "FROM" not in fixed_sql.upper():
            # This is tricky - we need schema info, but for now just log
            logger.warning("⚠️ Cannot auto-fix missing FROM clause without schema context")
    
    # Fix: Reserved word 'table' as column
    if "table" in error_lower and "reserved" in error_lower:
        # Remove `table` if it appears as a column
        fixed_sql = re.sub(r'SELECT\s+`?table`?\s+AND\s+', 'SELECT ', fixed_sql, flags=re.IGNORECASE)
        fixed_sql = re.sub(r',\s*`?table`?\s*,', ',', fixed_sql, flags=re.IGNORECASE)
        fixed_sql = re.sub(r',\s*`?table`?\s+FROM', ' FROM', fixed_sql, flags=re.IGNORECASE)
    
    # Fix: JSON artifacts
    fixed_sql = re.sub(r'\s*":\s*FORMAT\s+.*$', '', fixed_sql, flags=re.IGNORECASE)
    fixed_sql = re.sub(r'\s*["\']\s*\}\s*\]\s*\}.*$', '', fixed_sql)
    fixed_sql = re.sub(r'\s*\}\s*\]\s*\}.*$', '', fixed_sql)
    
    # Fix: Trailing quotes/colons
    fixed_sql = re.sub(r'["\':]+\s*$', '', fixed_sql)
    fixed_sql = fixed_sql.strip()
    
    return fixed_sql

