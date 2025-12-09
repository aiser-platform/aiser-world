"""
Validation Nodes for LangGraph Workflow

Early error detection for SQL and query results.
"""

import logging
import re
from typing import Any, Optional

from app.modules.ai.schemas.graph_state import AiserWorkflowState
from app.modules.ai.services.langgraph_base import (
    validate_state_transition,
    handle_node_errors
)

logger = logging.getLogger(__name__)


@validate_state_transition(validate_input=True, validate_output=True)
async def validate_sql_node(
    state: AiserWorkflowState,
    data_service: Any = None
) -> AiserWorkflowState:
    """
    Validate SQL before execution to catch errors early.
    
    Args:
        state: Current workflow state
        data_service: Optional data service for schema validation
    
    Returns:
        Updated state with validation results
    """
    sql_query = state.get("sql_query", "")
    
    if not sql_query:
        state["error"] = "No SQL query to validate"
        return state
    
    try:
        # Update progress - SQL Validation step (20-30%)
        state["progress_percentage"] = 20.0
        state["progress_message"] = "Validating SQL query..."
        
        # CRITICAL: Clean SQL before validation - extract complete SQL, then remove JSON artifacts
        import re
        
        # Step 1: Remove JSON artifacts FIRST (before extraction) to prevent them from interfering
        # Remove common JSON corruption patterns
        sql_query = re.sub(r'\s*":\s*FORMAT\s+JSONEachRow.*$', '', sql_query, flags=re.IGNORECASE | re.DOTALL)
        sql_query = re.sub(r'\s*"\s*FORMAT\s+JSONEachRow.*$', '', sql_query, flags=re.IGNORECASE | re.DOTALL)
        sql_query = re.sub(r'\s*["\']\s*\}\s*\]\s*\}\s*FORMAT.*$', '', sql_query, flags=re.IGNORECASE | re.DOTALL)
        sql_query = re.sub(r'\s*\}\s*\]\s*\}\s*FORMAT.*$', '', sql_query, flags=re.IGNORECASE | re.DOTALL)
        sql_query = re.sub(r'\s*["\']\s*\}\s*\]\s*\}.*$', '', sql_query, flags=re.DOTALL)
        sql_query = re.sub(r'\s*\}\s*\]\s*\}.*$', '', sql_query, flags=re.DOTALL)
        
        # Step 2: Extract complete SQL - use balanced parentheses matching to avoid cutting off SQL
        # CRITICAL: Find SELECT start, then match until JSON artifacts, respecting parentheses balance
        select_start = re.search(r'\bSELECT\b', sql_query, re.IGNORECASE)
        if select_start:
            start_pos = select_start.start()
            # Find the end by looking for JSON artifacts, but respect parentheses balance
            paren_depth = 0
            in_string = False
            string_char = None
            end_pos = len(sql_query)
            
            for i in range(start_pos, len(sql_query)):
                char = sql_query[i]
                
                # Track string literals (to ignore parentheses inside strings)
                if char in ('"', "'") and (i == start_pos or sql_query[i-1] != '\\'):
                    if not in_string:
                        in_string = True
                        string_char = char
                    elif char == string_char:
                        in_string = False
                        string_char = None
                    continue
                
                if not in_string:
                    if char == '(':
                        paren_depth += 1
                    elif char == ')':
                        paren_depth -= 1
                    # Check for JSON artifacts (only when parentheses are balanced)
                    elif paren_depth == 0:
                        # Look ahead for JSON patterns
                        remaining = sql_query[i:]
                        if re.match(r'\s*["\']\s*[,:]\s*["\']', remaining) or \
                           re.match(r'\s*["\']\s*\}\s*\]\s*\}', remaining) or \
                           re.match(r'\s*\}\s*\]\s*\}', remaining) or \
                           re.match(r'\s*":\s*FORMAT', remaining, re.IGNORECASE):
                            end_pos = i
                            break
            
            extracted = sql_query[start_pos:end_pos].strip()
            if extracted and extracted.upper().startswith("SELECT"):
                sql_query = extracted
                logger.info("✅ Extracted SQL using balanced parentheses matching")
            else:
                # Fallback to simpler pattern if balanced matching failed
                sql_match = re.search(r'(SELECT\s+.*?\s+FROM\s+[^\s,;]+(?:\.[^\s,;]+)?)', sql_query, re.IGNORECASE | re.DOTALL)
                if sql_match:
                    sql_query = sql_match.group(1).strip()
                    logger.info("✅ Extracted SQL with FROM clause (fallback pattern)")
        else:
            logger.warning("⚠️ No SELECT found in SQL query")
        
        # Step 3: Remove reserved word corruption (e.g., `table` as column name)
        # Fix: SELECT `table` AND columns -> this is invalid, remove `table` if it's not a real table
        # Check if "table" appears as a column (SELECT `table` or SELECT table)
        if re.search(r'SELECT\s+[^F]*?`?table`?\s+AND', sql_query, re.IGNORECASE):
            # This is corruption - "table" is a reserved word being used incorrectly
            # Remove "table AND" pattern
            sql_query = re.sub(r'`?table`?\s+AND\s+', '', sql_query, flags=re.IGNORECASE)
            logger.warning("⚠️ Removed invalid 'table AND' pattern from SQL")
        
        # Fix: SELECT `table` (without AND) - this is also likely corruption
        if re.search(r'SELECT\s+`table`\s*$', sql_query, re.IGNORECASE):
            # This is incomplete/corrupted SQL
            logger.error("❌ SQL contains invalid 'SELECT `table`' pattern (reserved word as column)")
            state["error"] = "SQL query contains invalid pattern: 'table' is a reserved word and cannot be used as a column name"
            return state
        
        # Step 4: Final cleanup - remove any remaining JSON artifacts
        sql_query = re.sub(r'\s*["\']\s*[,:]\s*.*$', '', sql_query)  # Remove trailing quotes with comma/colon
        sql_query = re.sub(r'\s*[,:]\s*["\'].*$', '', sql_query)  # Remove trailing comma/colon with quotes
        sql_query = sql_query.strip()
        
        # Log the cleaned SQL for debugging
        logger.debug(f"🔍 Cleaned SQL for validation: {sql_query[:200]}...")
        
        # Basic SQL validation
        sql_upper = sql_query.upper().strip()
        
        # Check for SELECT statement
        if not sql_upper.startswith("SELECT"):
            state["error"] = "SQL query must start with SELECT"
            logger.error("❌ SQL validation failed: query does not start with SELECT")
            return state
        
        # Check for common SQL injection patterns (basic)
        dangerous_patterns = [
            r';\s*DROP\s+TABLE',
            r';\s*DELETE\s+FROM',
            r';\s*TRUNCATE',
            r';\s*ALTER\s+TABLE',
            r';\s*CREATE\s+TABLE',
            r';\s*INSERT\s+INTO',
            r';\s*UPDATE\s+',
            r';\s*EXEC\s*\(',
            r';\s*EXECUTE\s*\(',
        ]
        
        for pattern in dangerous_patterns:
            if re.search(pattern, sql_query, re.IGNORECASE):
                state["error"] = "SQL query contains potentially dangerous operations"
                state["critical_failure"] = True
                logger.error(f"❌ SQL validation failed: dangerous pattern detected: {pattern}")
                return state
        
        # Check for balanced parentheses - CRITICAL: Fix or fail
        open_parens = sql_query.count('(')
        close_parens = sql_query.count(')')
        if open_parens != close_parens:
            logger.warning(f"⚠️ Unbalanced parentheses in SQL (open: {open_parens}, close: {close_parens})")
            original_sql = sql_query
            
            # Try to fix by removing extra closing parentheses from the end (most common issue)
            if close_parens > open_parens:
                extra_closes = close_parens - open_parens
                # Remove extra closing parentheses from the end, but preserve FORMAT clause
                format_pos = sql_query.upper().rfind('FORMAT')
                if format_pos > 0:
                    # Remove from before FORMAT
                    before_format = sql_query[:format_pos]
                    after_format = sql_query[format_pos:]
                    for _ in range(extra_closes):
                        last_close = before_format.rfind(')')
                        if last_close > 0:
                            before_format = before_format[:last_close] + before_format[last_close + 1:]
                    sql_query = before_format.strip() + ' ' + after_format
                else:
                    # Remove from end
                    for _ in range(extra_closes):
                        last_close = sql_query.rfind(')')
                        if last_close > 0:
                            sql_query = sql_query[:last_close] + sql_query[last_close + 1:]
                logger.info(f"🔧 Removed {extra_closes} extra closing parentheses")
            elif open_parens > close_parens:
                # Add missing closing parentheses before FORMAT if present
                missing_closes = open_parens - close_parens
                format_pos = sql_query.upper().rfind('FORMAT')
                if format_pos > 0:
                    sql_query = sql_query[:format_pos].rstrip() + ')' * missing_closes + ' ' + sql_query[format_pos:]
                else:
                    sql_query = sql_query.rstrip() + ')' * missing_closes
                logger.info(f"🔧 Added {missing_closes} missing closing parentheses")
            
            # Update state with fixed SQL
            state["sql_query"] = sql_query.strip()
            
            # Re-check balance
            open_parens = sql_query.count('(')
            close_parens = sql_query.count(')')
            
            # If still unbalanced after fix attempt, try error recovery
            if open_parens != close_parens:
                logger.warning(f"⚠️ Still unbalanced after fix (open: {open_parens}, close: {close_parens}), will trigger error recovery")
                # Don't fail immediately - let error recovery node try to fix it
                state["sql_validation_warning"] = f"Unbalanced parentheses detected (open: {open_parens}, close: {close_parens}) - will attempt automatic fix"
                # Continue to allow error recovery to handle it
            else:
                logger.info(f"✅ Successfully fixed unbalanced parentheses")
        
        # Check for basic SQL structure
        required_keywords = ["SELECT", "FROM"]
        for keyword in required_keywords:
            if keyword not in sql_upper:
                state["error"] = f"SQL query missing required keyword: {keyword}"
                logger.error(f"❌ SQL validation failed: missing {keyword}")
                logger.error(f"   SQL query: {sql_query[:500]}")
                # Try to provide helpful error message
                if keyword == "FROM":
                    state["error"] = "SQL query missing required keyword: FROM. Every SELECT query must have a FROM clause specifying the table name."
                return state
        
        # CRITICAL: Verify FROM clause has an actual table name (not just the keyword)
        from_match = re.search(r'FROM\s+([^\s,\(\)]+)', sql_upper)
        if not from_match:
            state["error"] = "SQL query has FROM keyword but no table name specified"
            logger.error(f"❌ SQL validation failed: FROM clause missing table name")
            logger.error(f"   SQL query: {sql_query[:500]}")
            return state
        
        # Check for invalid SQL patterns (e.g., "SELECT `table` AND columns")
        invalid_patterns = [
            r'SELECT\s+`table`',  # Reserved word as column
            r'SELECT\s+table\s+AND',  # "table AND" is invalid
            r'SELECT\s+.*?\s+AND\s+columns',  # "AND columns" is invalid
            r'FROM\s+`table`',  # Reserved word as table
            r'FROM\s+table\s+AND',  # Invalid FROM clause
        ]
        
        for pattern in invalid_patterns:
            if re.search(pattern, sql_query, re.IGNORECASE):
                state["error"] = f"SQL query contains invalid pattern: {pattern}"
                logger.error(f"❌ SQL validation failed: invalid pattern detected: {pattern}")
                logger.error(f"   SQL: {sql_query[:200]}")
                return state
        
        # Check that FROM is followed by a valid table name (not reserved words)
        from_match = re.search(r'FROM\s+([^\s,\(\)]+)', sql_upper)
        if from_match:
            table_name = from_match.group(1).strip('`"\'')
            reserved_words = ['TABLE', 'SELECT', 'WHERE', 'GROUP', 'ORDER', 'HAVING', 'AND', 'OR', 'NOT']
            if table_name.upper() in reserved_words:
                state["error"] = f"SQL query uses reserved word '{table_name}' as table name - invalid SQL"
                logger.error(f"❌ SQL validation failed: reserved word used as table name: {table_name}")
                logger.error(f"   SQL: {sql_query[:200]}")
                return state
        
        # SQL is valid
        state["current_stage"] = "sql_validated"
        state["progress_percentage"] = 30.0
        state["progress_message"] = "SQL query validated successfully"
        logger.info("✅ SQL validation passed")
        
        return state
        
    except Exception as e:
        logger.error(f"❌ SQL validation node failed: {e}", exc_info=True)
        state["error"] = f"SQL validation error: {str(e)}"
        return state


@validate_state_transition(validate_input=True, validate_output=True)
async def validate_results_node(
    state: AiserWorkflowState
) -> AiserWorkflowState:
    """
    Validate query results before chart/insights generation.
    
    Args:
        state: Current workflow state
    
    Returns:
        Updated state with validation results
    """
    query_result = state.get("query_result", [])
    
    try:
        # Update progress
        # Update progress - Results Validation step (50-60%)
        state["progress_percentage"] = 50.0
        state["progress_message"] = "Validating query results..."
        
        # CRITICAL: Check if query execution completed successfully first
        query_execution_error = state.get("query_execution_error")
        if query_execution_error:
            # Query execution failed - don't validate results
            state["error"] = f"Query execution failed: {query_execution_error}"
            logger.error(f"❌ Results validation skipped: query execution failed - {query_execution_error}")
            return state
        
        # Check if we have results
        # CRITICAL: Wait for execution to complete - if query_result is None, execution might still be in progress
        if query_result is None:
            # Execution might not have completed yet - this shouldn't happen in LangGraph, but handle it
            logger.warning("⚠️ Query result is None - execution may not have completed")
            state["error"] = "Query execution not completed - no results available"
            return state
        
        if not isinstance(query_result, list):
            # Query result might be a dict with error info
            if isinstance(query_result, dict):
                error_msg = query_result.get("error", "Query execution returned unexpected format")
                state["error"] = f"Query execution error: {error_msg}"
                logger.error(f"❌ Results validation failed: query execution returned error - {error_msg}")
            else:
                state["error"] = f"Query results are not in expected format (list), got {type(query_result)}"
                logger.error(f"❌ Results validation failed: not a list, got {type(query_result)}")
            return state
        
        if len(query_result) == 0:
            state["error"] = "Query returned no results"
            logger.warning("⚠️ Query returned no results")
            # Not critical - might be valid empty result
            return state
        
        # Check if results have consistent structure
        if len(query_result) > 0:
            first_row_keys = set(query_result[0].keys()) if isinstance(query_result[0], dict) else set()
            
            for i, row in enumerate(query_result[1:10]):  # Check first 10 rows
                if not isinstance(row, dict):
                    state["error"] = f"Query result row {i+2} is not a dictionary"
                    logger.error(f"❌ Results validation failed: row {i+2} is not a dict")
                    return state
                
                row_keys = set(row.keys())
                if row_keys != first_row_keys:
                    logger.warning(f"⚠️ Inconsistent column structure in row {i+2}")
                    # Not critical, but log it
        
        # Results are valid
        state["current_stage"] = "results_validated"
        state["progress_percentage"] = 60.0
        state["progress_message"] = f"Query results validated: {len(query_result)} rows"
        logger.info(f"✅ Results validation passed: {len(query_result)} rows")
        
        return state
        
    except Exception as e:
        logger.error(f"❌ Results validation node failed: {e}", exc_info=True)
        state["error"] = f"Results validation error: {str(e)}"
        return state

