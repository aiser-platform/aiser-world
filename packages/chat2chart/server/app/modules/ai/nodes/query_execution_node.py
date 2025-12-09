"""
Query Execution Node for LangGraph Workflow

Wraps MultiEngineQueryService with ClickHouse HTTP fallback.
"""

import logging
import aiohttp
from typing import Any, Optional, Dict

from app.modules.ai.schemas.graph_state import AiserWorkflowState
from app.modules.ai.services.langgraph_base import (
    validate_state_transition,
    handle_node_errors
)

logger = logging.getLogger(__name__)


@validate_state_transition(validate_input=True, validate_output=True, snapshot_after=True)
@handle_node_errors(retry_on_error=True, max_retries=3)
async def query_execution_node(
    state: AiserWorkflowState,
    multi_query_service: Any,
    data_service: Any,
    async_session_factory: Optional[Any] = None
) -> AiserWorkflowState:
    """
    Execute SQL query using MultiEngineQueryService with ClickHouse HTTP fallback.
    
    Args:
        state: Current workflow state
        multi_query_service: Multi-engine query service
        data_service: Data service for data source retrieval
        async_session_factory: Optional async session factory
    
    Returns:
        Updated state with query results
    """
    sql_query = state.get("sql_query")
    data_source_id = state.get("data_source_id")
    
    # CRITICAL: Ensure sql_query is a string, not a dict/JSON object
    if isinstance(sql_query, dict):
        # Extract SQL from dict
        sql_query = sql_query.get("sql_query") or sql_query.get("sql") or ""
        logger.warning(f"⚠️ SQL query was a dict in query_execution_node, extracted: {sql_query[:100] if sql_query else 'empty'}...")
    
    if not isinstance(sql_query, str):
        sql_query = str(sql_query) if sql_query else ""
        logger.warning(f"⚠️ SQL query was not a string (type: {type(state.get('sql_query'))}), converted")
    
    # CRITICAL: Extract SQL from JSON if embedded - be very aggressive
    if sql_query:
        import json
        import re
        
        # First, try to extract SQL block directly (most reliable)
        sql_match = re.search(r'(SELECT\s+[^;{}]+(?:;[^;{}]*)*)', sql_query, re.IGNORECASE | re.DOTALL)
        if sql_match:
            sql_query = sql_match.group(1).strip()
            logger.info("✅ Extracted SQL using pattern matching")
        
        # If still looks like JSON, try parsing
        if sql_query.strip().startswith('{') or '"sql_query"' in sql_query or '" }' in sql_query:
            try:
                # Try to find and extract JSON object
                json_match = re.search(r'\{[^{}]*"sql_query"[^{}]*\}', sql_query, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group(0))
                    if isinstance(parsed, dict) and parsed.get("sql_query"):
                        sql_query = parsed.get("sql_query")
                        logger.info("✅ Extracted SQL from JSON object")
            except (json.JSONDecodeError, ValueError):
                # Try regex extraction of sql_query field
                match = re.search(r'"sql_query"\s*:\s*"([^"]+)"', sql_query)
                if match:
                    sql_query = match.group(1)
                    logger.info("✅ Extracted SQL from JSON string using regex")
        
        # CRITICAL: Remove any trailing JSON artifacts (e.g., " } ] } FORMAT JSONEachRow")
        # Remove anything after the SQL that looks like JSON closing braces or FORMAT clause
        sql_query = re.sub(r'\s*["\']\s*\}\s*\]\s*\}\s*FORMAT.*$', '', sql_query, flags=re.IGNORECASE)
        sql_query = re.sub(r'\s*\}\s*\]\s*\}\s*FORMAT.*$', '', sql_query, flags=re.IGNORECASE)
        
        # ULTRA-AGGRESSIVE: Remove ": FORMAT JSONEachRow" pattern (this is ALWAYS garbage)
        # This pattern appears when JSON artifacts leak into SQL
        sql_query = re.sub(r'\s*":\s*FORMAT\s+JSONEachRow.*$', '', sql_query, flags=re.IGNORECASE)
        sql_query = re.sub(r'\s*"\s*FORMAT\s+JSONEachRow.*$', '', sql_query, flags=re.IGNORECASE)
        sql_query = re.sub(r'\s*FORMAT\s+JSONEachRow.*$', '', sql_query, flags=re.IGNORECASE)
        
        # Remove any remaining JSON-like artifacts at the end
        sql_query = re.sub(r'\s*["\']\s*[,:]\s*.*$', '', sql_query)  # Remove trailing quotes with comma/colon
        sql_query = re.sub(r'\s*[,:]\s*["\'].*$', '', sql_query)  # Remove trailing comma/colon with quotes
        
        sql_query = sql_query.strip()
        
        # Final check: if SQL ends with a quote or JSON artifact, remove it
        if sql_query and (sql_query.endswith('"') or sql_query.endswith("'") or sql_query.endswith('}')):
            # Find the last valid SQL character (semicolon, or end of statement)
            last_semicolon = sql_query.rfind(';')
            if last_semicolon > 0:
                sql_query = sql_query[:last_semicolon + 1].strip()
            else:
                # Remove trailing quotes/braces
                sql_query = re.sub(r'["\'}]+\s*$', '', sql_query).strip()
    
    # CRITICAL: Validate SQL is not placeholder/template
    if not sql_query or not isinstance(sql_query, str) or not sql_query.strip():
        state["error"] = "No SQL query to execute"
        state["query_execution_error"] = "No SQL query provided or invalid format"
        return state
    
    # CRITICAL: Reject placeholder SQL templates - check for ALL patterns
    sql_lower = sql_query.lower()
    placeholder_patterns = [
        "table_name",
        "where condition",
        "column_name",
        "avg(column_name)",
        "sum(column_name)",
        "count(column_name)",
        "select * from table_name",
        "from table_name where"
    ]
    if any(pattern in sql_lower for pattern in placeholder_patterns):
        error_msg = f"Invalid placeholder SQL detected - cannot execute template query. The AI agent needs access to the actual database schema."
        state["error"] = error_msg
        state["query_execution_error"] = error_msg
        logger.error(f"❌ {error_msg}: {sql_query[:100]}...")
        return state
    
    if not data_source_id:
        state["error"] = "No data source ID provided"
        state["query_execution_error"] = "Data source ID required for query execution"
        return state
    
    try:
        # Update progress
        # Update progress - Query Execution step (30-50%)
        state["progress_percentage"] = 30.0
        state["progress_message"] = "Executing SQL query..."
        
        # Get data source
        # DataConnectivityService.get_data_source_by_id() only takes source_id as parameter
        if hasattr(data_service, 'get_data_source_by_id'):
            try:
                data_source = await data_service.get_data_source_by_id(data_source_id)
            except Exception as e:
                logger.error(f"❌ Failed to get data source: {e}")
                state["error"] = f"Failed to retrieve data source: {str(e)}"
                return state
        else:
            state["error"] = "Cannot retrieve data source - service unavailable"
            return state
        
        if not data_source:
            state["error"] = f"Data source {data_source_id} not found"
            state["query_execution_error"] = f"Data source not found: {data_source_id}"
            return state
        
        # Check if ClickHouse - use HTTP fallback
        source_type = data_source.get("type") or data_source.get("source_type", "").lower()
        if "clickhouse" in source_type.lower():
            # Try ClickHouse HTTP execution first
            result = await _execute_clickhouse_http(
                sql_query,
                data_source,
                state.get("user_id")
            )
            
            if result.get("success"):
                # Update state with results
                state["query_result"] = result.get("data", [])
                state["query_result_columns"] = result.get("columns", [])
                # Ensure row_count is never None
                row_count = result.get("row_count") or 0
                if row_count == 0 and state["query_result"]:
                    row_count = len(state["query_result"])
                state["query_result_row_count"] = row_count
                state["current_stage"] = "query_executed"
                logger.info(f"✅ ClickHouse HTTP query executed: {row_count} rows")
                return state
            else:
                # CRITICAL: Preserve error code for error recovery
                error_code = result.get("error", "Query execution failed")
                error_message = result.get("error_message", error_code)
                # Use error_message but include error code for recovery detection
                full_error = f"{error_code}: {error_message}" if error_code != error_message else error_message
                state["error"] = full_error
                state["query_execution_error"] = full_error
                logger.warning(f"⚠️ ClickHouse HTTP failed: {full_error}")
                # Don't fallback if it's a validation error - let error recovery handle it
                if "invalid_or_non_sql_query" in error_code:
                    logger.info("🔄 Validation error detected - routing to error recovery")
                    return state
                # Fallback to multi-engine service for other errors
                logger.info("🔄 Falling back to multi-engine service")
        
        # CRITICAL: Check if multi_query_service is available
        if multi_query_service is None:
            error_msg = "Multi-query service not available. Cannot execute SQL query."
            logger.error(f"❌ {error_msg}")
            state["error"] = error_msg
            state["current_stage"] = "query_execution_error"
            state["progress_message"] = error_msg
            return state
        
        # Execute via multi-engine service
        logger.info(f"🔍 Executing query via multi-engine service: {sql_query[:100]}...")
        
        execution_result = await multi_query_service.execute_query(
            query=sql_query,
            data_source=data_source,
            engine=None,  # Auto-select engine
            optimization=True
        )
        
        if execution_result.get("success"):
            # Update state with results
            data = execution_result.get("data", [])
            state["query_result"] = data
            state["query_result_columns"] = execution_result.get("columns", [])
            # Ensure row_count is never None
            row_count = execution_result.get("row_count") or len(data) if data else 0
            state["query_result_row_count"] = row_count
            state["current_stage"] = "query_executed"
            state["progress_percentage"] = 50.0
            state["progress_message"] = f"Query executed successfully: {row_count} rows returned"
            
            # Update execution metadata
            metadata = state.get("execution_metadata", {})
            metadata["execution_time_ms"] = metadata.get("execution_time_ms", 0) + execution_result.get("execution_time_ms", 0)
            # Reset query_execution_retry_count on successful execution to allow fresh retries if needed
            if "query_execution_retry_count" in metadata:
                metadata["query_execution_retry_count"] = 0
            state["execution_metadata"] = metadata
            
            logger.info(f"✅ Query executed: {state['query_result_row_count']} rows")
        else:
            error_msg = execution_result.get("error", "Query execution failed")
            state["error"] = error_msg
            state["query_execution_error"] = error_msg
            logger.error(f"❌ Query execution failed: {error_msg}")
        
        return state
        
    except Exception as e:
        logger.error(f"❌ Query execution node failed: {e}", exc_info=True)
        state["error"] = f"Query execution error: {str(e)}"
        state["query_execution_error"] = str(e)
        return state


async def _execute_clickhouse_http(
    sql_query: str,
    data_source: Dict[str, Any],
    user_id: str
) -> Dict[str, Any]:
    """
    Execute ClickHouse query via HTTP interface with fallback hosts.
    
    Args:
        sql_query: SQL query to execute
        data_source: Data source configuration
        user_id: User ID for credential access
    
    Returns:
        Execution result dictionary
    """
    # CRITICAL: Log input SQL before processing
    sql_preview = sql_query[:300] if sql_query else 'EMPTY'
    has_json = ('"sql_query"' in sql_query) if isinstance(sql_query, str) else False
    logger.warning(f"🔍 QUERY_EXECUTION_NODE INPUT - SQL: {sql_preview}")
    logger.warning(f"🔍 SQL type: {type(sql_query)}, has_json_markers: {has_json}")
    
    connection_config = data_source.get("connection_config", {})
    if not isinstance(connection_config, dict):
        return {"success": False, "error": "Invalid connection_config"}
    
    # Extract connection details
    host = connection_config.get("host") or connection_config.get("hostname", "localhost")
    port = connection_config.get("port", 8123)
    database = connection_config.get("database") or connection_config.get("db", "default")
    username = connection_config.get("username") or connection_config.get("user", "default")
    password = connection_config.get("password", "")
    
    # CRITICAL: Final SQL sanitization before execution - be very aggressive
    import re
    
    # CRITICAL: Check if the entire JSON object is embedded in sql_query
    # Look for pattern: "sql_query": "SELECT ... FORMAT JSONEachRow", "dialect": "clickhouse", ...
    if '"sql_query"' in sql_query and '"dialect"' in sql_query:
        # The entire SQLGenerationOutput JSON is in sql_query - extract just the SQL
        json_match = re.search(r'"sql_query"\s*:\s*"([^"]+(?:\\.[^"]*)*)"', sql_query)
        if json_match:
            extracted_sql = json_match.group(1)
            # Unescape JSON escapes
            extracted_sql = extracted_sql.replace('\\"', '"').replace('\\\\', '\\').replace('\\n', '\n')
            sql_query = extracted_sql
            logger.warning(f"⚠️ Entire JSON object was in sql_query, extracted SQL: {sql_query[:100]}...")
    
    # CRITICAL: Extract SQL using balanced parentheses matching to avoid cutting off SQL
    # Find SELECT start, then match until JSON artifacts, respecting parentheses balance
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
            logger.debug("✅ Extracted SQL using balanced parentheses matching before ClickHouse execution")
        else:
            # Fallback to simpler pattern
            sql_match = re.search(r'(SELECT\s+.*?\s+FROM\s+[^\s,;]+)', sql_query, re.IGNORECASE | re.DOTALL)
            if sql_match:
                sql_query = sql_match.group(1).strip()
                logger.warning("⚠️ Extracted SQL with FROM clause (fallback pattern)")
    else:
        logger.warning("⚠️ No SELECT found in SQL query")
    
    # Remove any remaining JSON artifacts (e.g., " } ] } FORMAT JSONEachRow")
    sql_query = re.sub(r'\s*["\']\s*\}\s*\]\s*\}\s*FORMAT.*$', '', sql_query, flags=re.IGNORECASE)
    sql_query = re.sub(r'\s*\}\s*\]\s*\}\s*FORMAT.*$', '', sql_query, flags=re.IGNORECASE)
    sql_query = re.sub(r'\s*["\']\s*\}\s*\]\s*\}.*$', '', sql_query)
    sql_query = re.sub(r'\s*\}\s*\]\s*\}.*$', '', sql_query)
    
    # CRITICAL: Remove any JSON field separators if they exist
    # Pattern: , "dialect": "clickhouse" ... should be removed
    sql_query = re.sub(r'\s*,\s*"[^"]+"\s*:', '', sql_query)
    
    # Remove any remaining corruption
    sql_query = re.sub(r'(id){3,}', ' ', sql_query, flags=re.IGNORECASE)
    
    # Remove any trailing non-SQL content (only JSON artifacts, not SQL quotes)
    # Only remove if we see JSON-like patterns at the end
    if re.search(r'(": FORMAT|": "dialect"|"dialect":|"validation_result"|}\s*\]\s*})', sql_query):
        # There are JSON artifacts - extract just the SQL part
        sql_match = re.search(r'(SELECT\s+.*?(?:LIMIT\s+\d+)?)\s*["\']?\s*(?::|}).*$', sql_query, re.IGNORECASE | re.DOTALL)
        if sql_match:
            sql_query = sql_match.group(1).strip()
            logger.debug(f"✅ Removed JSON artifacts from end of SQL")
    
    # CRITICAL: Remove trailing JSON artifact pattern if it exists
    # Pattern: ": FORMAT JSONEachRow or ", "dialect" etc at the END
    sql_query = re.sub(r'"\s*:\s*FORMAT\s+JSONEachRow.*$', '', sql_query, flags=re.IGNORECASE)
    sql_query = re.sub(r'"\s*,\s*"(dialect|validation|explanation|reasoning)".*$', '', sql_query, flags=re.IGNORECASE)
    sql_query = re.sub(r'"\s*,\s*\{.*$', '', sql_query)  # Remove JSON objects at end
    
    # Normalize whitespace
    sql_query = re.sub(r'\s+', ' ', sql_query)
    sql_query = sql_query.strip()
    
    # CRITICAL: Check for balanced parentheses before final validation
    open_parens = sql_query.count('(')
    close_parens = sql_query.count(')')
    if open_parens != close_parens:
        # Try to fix by removing extra closing parentheses
        if close_parens > open_parens:
            extra_closes = close_parens - open_parens
            for _ in range(extra_closes):
                last_close = sql_query.rfind(')')
                if last_close > 0:
                    sql_query = sql_query[:last_close] + sql_query[last_close + 1:]
            sql_query = sql_query.strip()
            logger.info(f"🔧 Fixed unbalanced parentheses in ClickHouse execution (removed {extra_closes} extra closing)")
        
        # Re-check after fix
        open_parens = sql_query.count('(')
        close_parens = sql_query.count(')')
        if open_parens != close_parens:
            error_msg = f"Query failed basic SQL validation after sanitization - unbalanced parentheses (open: {open_parens}, close: {close_parens})"
            logger.error(f"❌ {error_msg}")
            return {"success": False, "error": "invalid_or_non_sql_query", "error_message": error_msg}
    
    # CRITICAL: Final validation - ensure we have valid SQL
    if not sql_query or not sql_query.strip().upper().startswith("SELECT"):
        error_msg = f"Invalid SQL after sanitization: {sql_query[:100]}"
        logger.error(f"❌ {error_msg}")
        return {"success": False, "error": "invalid_or_non_sql_query", "error_message": error_msg}
    
    # CRITICAL: Remove any trailing periods, semicolons, or JSON artifacts before adding FORMAT
    sql_query = sql_query.rstrip(';').rstrip('.').strip()
    
    # Remove any existing malformed FORMAT clause
    sql_query = re.sub(r'\s*\.\s*FORMAT\s+\w+.*$', '', sql_query, flags=re.IGNORECASE)
    sql_query = re.sub(r'\s*":\s*FORMAT\s+\w+.*$', '', sql_query, flags=re.IGNORECASE)
    sql_query = re.sub(r'\s*"\s*FORMAT\s+\w+.*$', '', sql_query, flags=re.IGNORECASE)
    sql_query = sql_query.strip()
    
    # Ensure SQL has FORMAT JSONEachRow for SELECT queries (only if not already present)
    if "FORMAT" not in sql_query.upper():
        sql_query = f"{sql_query.rstrip(';').rstrip('.').strip()} FORMAT JSONEachRow"
    
    # Try multiple host fallbacks
    hosts_to_try = [
        "127.0.0.1",
        "localhost",
        host,
        "host.docker.internal"
    ]
    
    for attempt_host in hosts_to_try:
        try:
            url = f"http://{attempt_host}:{port}/"
            
            # Prepare auth
            auth = aiohttp.BasicAuth(username, password) if username and password else None
            
            # Prepare query params
            params = {
                "database": database,
                "query": sql_query
            }
            if username:
                params["user"] = username
            if password:
                params["password"] = password
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    params=params,
                    auth=auth,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status == 200:
                        # Parse JSONEachRow format
                        text = await response.text()
                        if text.strip():
                            lines = [line.strip() for line in text.strip().split('\n') if line.strip()]
                            import json
                            data = [json.loads(line) for line in lines if line]
                            
                            # Extract columns from first row
                            columns = list(data[0].keys()) if data else []
                            
                            return {
                                "success": True,
                                "data": data,
                                "columns": columns,
                                "row_count": len(data),
                                "execution_time_ms": 0  # ClickHouse HTTP doesn't provide timing
                            }
                        else:
                            return {
                                "success": True,
                                "data": [],
                                "columns": [],
                                "row_count": 0
                            }
                    elif response.status == 403:
                        logger.warning(f"⚠️ ClickHouse HTTP 403 (auth failed) on {attempt_host}")
                        continue  # Try next host
                    elif response.status == 400:
                        error_text = await response.text()
                        logger.error(f"❌ ClickHouse HTTP 400 on {attempt_host}: {error_text[:200]}")
                        return {"success": False, "error": f"ClickHouse syntax error: {error_text[:200]}"}
                    else:
                        logger.warning(f"⚠️ ClickHouse HTTP {response.status} on {attempt_host}")
                        continue  # Try next host
        except aiohttp.ClientError as e:
            logger.warning(f"⚠️ ClickHouse HTTP connection failed on {attempt_host}: {e}")
            continue  # Try next host
        except Exception as e:
            logger.warning(f"⚠️ ClickHouse HTTP error on {attempt_host}: {e}")
            continue  # Try next host
    
    return {"success": False, "error": "All ClickHouse HTTP attempts failed"}

