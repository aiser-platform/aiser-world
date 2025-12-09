"""
NL2SQL Node for LangGraph Workflow

Migrates EnhancedNL2SQLAgent functionality to LangGraph node.
"""

import json
import logging
import re
from typing import Any, Optional, Dict

from app.modules.ai.schemas.graph_state import AiserWorkflowState
from app.modules.ai.services.langgraph_base import (
    validate_state_transition,
    handle_node_errors
)
from app.modules.ai.schemas.agent_outputs import SQLGenerationOutput
from app.modules.chats.schemas import UserRole

logger = logging.getLogger(__name__)


def _extract_query_intent(query: str, sql_query: str) -> Dict[str, Any]:
    """
    Extract query intent from natural language query and generated SQL.
    
    This intent will be used by chart generation and insights agents to:
    - Select appropriate chart types
    - Generate contextual insights
    - Refine visualization based on data structure
    
    Returns:
        Dict with intent analysis including:
        - aggregation_type: avg, sum, count, max, min, none
        - grouping: list of grouping dimensions
        - time_series: bool, time_granularity (month, year, day, etc.)
        - filtering: bool, filter_count
        - chart_type_suggestion: bar, line, pie, gauge, scatter, etc.
        - is_kpi: bool (single value result)
        - is_comparison: bool (comparing categories)
    """
    query_lower = query.lower()
    sql_upper = sql_query.upper() if sql_query else ""
    
    intent = {
        "aggregation_type": None,
        "grouping": [],
        "time_series": False,
        "time_granularity": None,
        "filtering": False,
        "filter_count": 0,
        "chart_type_suggestion": None,
        "is_kpi": False,
        "is_comparison": False,
        "dimension_count": 0,
        "metric_count": 0
    }
    
    # Detect aggregation type from query and SQL
    if any(word in query_lower for word in ['average', 'avg', 'mean']):
        intent["aggregation_type"] = "avg"
    elif any(word in query_lower for word in ['total', 'sum']):
        intent["aggregation_type"] = "sum"
    elif any(word in query_lower for word in ['count', 'number of']):
        intent["aggregation_type"] = "count"
    elif any(word in query_lower for word in ['maximum', 'max', 'highest']):
        intent["aggregation_type"] = "max"
    elif any(word in query_lower for word in ['minimum', 'min', 'lowest']):
        intent["aggregation_type"] = "min"
    else:
        # Check SQL for aggregation functions
        if "AVG(" in sql_upper:
            intent["aggregation_type"] = "avg"
        elif "SUM(" in sql_upper:
            intent["aggregation_type"] = "sum"
        elif "COUNT(" in sql_upper:
            intent["aggregation_type"] = "count"
        elif "MAX(" in sql_upper:
            intent["aggregation_type"] = "max"
        elif "MIN(" in sql_upper:
            intent["aggregation_type"] = "min"
    
    # Detect grouping from query and SQL
    if "group by" in sql_upper:
        # Extract GROUP BY columns from SQL
        group_by_match = re.search(r'GROUP\s+BY\s+([^ORDER\s]+)', sql_upper, re.IGNORECASE | re.DOTALL)
        if group_by_match:
            group_columns = [col.strip() for col in group_by_match.group(1).split(',')]
            intent["grouping"] = group_columns
            intent["dimension_count"] = len(group_columns)
    
    # Detect "by X" patterns in query
    if " by " in query_lower:
        intent["is_comparison"] = True
        # Extract dimension after "by"
        by_match = re.search(r'by\s+([^\s]+)', query_lower)
        if by_match and by_match.group(1) not in intent["grouping"]:
            intent["grouping"].append(by_match.group(1))
    
    # Detect time series
    time_keywords = {
        'month': 'month',
        'year': 'year',
        'week': 'week',
        'day': 'day',
        'quarter': 'quarter',
        'per month': 'month',
        'per year': 'year',
        'over time': 'auto',
        'trend': 'auto'
    }
    
    for keyword, granularity in time_keywords.items():
        if keyword in query_lower:
            intent["time_series"] = True
            intent["time_granularity"] = granularity
            break
    
    # Check SQL for date functions
    if any(func in sql_upper for func in ['TOMONTH(', 'TOYEAR(', 'TODAY(', 'NOW(', 'DATE(']):
        intent["time_series"] = True
        if 'TOMONTH(' in sql_upper:
            intent["time_granularity"] = "month"
        elif 'TOYEAR(' in sql_upper:
            intent["time_granularity"] = "year"
    
    # Detect filtering
    if "WHERE" in sql_upper:
        intent["filtering"] = True
        # Count WHERE conditions (approximate)
        where_clause = re.search(r'WHERE\s+(.+?)(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|$)', sql_upper, re.IGNORECASE | re.DOTALL)
        if where_clause:
            # Count AND/OR operators as proxy for condition count
            conditions = where_clause.group(1)
            intent["filter_count"] = conditions.count(' AND ') + conditions.count(' OR ') + 1
    
    # Suggest chart type based on intent
    if intent["aggregation_type"] and not intent["grouping"] and not intent["time_series"]:
        # Single KPI
        intent["is_kpi"] = True
        intent["chart_type_suggestion"] = "gauge"
    elif intent["time_series"]:
        # Time series - use line chart
        intent["chart_type_suggestion"] = "line"
    elif intent["is_comparison"] and len(intent["grouping"]) == 1:
        # Single dimension comparison - bar chart
        intent["chart_type_suggestion"] = "bar"
    elif len(intent["grouping"]) == 0 and intent["aggregation_type"]:
        # Single metric, no grouping - gauge or number
        intent["is_kpi"] = True
        intent["chart_type_suggestion"] = "gauge"
    elif len(intent["grouping"]) >= 2:
        # Multi-dimensional - bar or stacked bar
        intent["chart_type_suggestion"] = "bar"
    else:
        # Default to bar chart
        intent["chart_type_suggestion"] = "bar"
    
    # Count metrics (aggregation functions in SQL)
    metric_patterns = ['AVG(', 'SUM(', 'COUNT(', 'MAX(', 'MIN(']
    intent["metric_count"] = sum(1 for pattern in metric_patterns if pattern in sql_upper)
    
    return intent


@validate_state_transition(validate_input=True, validate_output=True, snapshot_after=True)
@handle_node_errors(retry_on_error=True, max_retries=2)
async def nl2sql_node(
    state: AiserWorkflowState,
    litellm_service: Any,
    data_service: Any,
    multi_query_service: Any,
    async_session_factory: Optional[Any] = None
) -> AiserWorkflowState:
    """
    Generate SQL from natural language query using EnhancedNL2SQLAgent.
    
    Args:
        state: Current workflow state
        litellm_service: LiteLLM service
        data_service: Data service for schema access
        multi_query_service: Multi-engine query service
        async_session_factory: Optional async session factory
    
    Returns:
        Updated state with SQL query
    """
    query = state.get("query", "")
    data_source_id = state.get("data_source_id")
    agent_context = state.get("agent_context", {})
    
    try:
        # Update progress - NL2SQL step (10-20%)
        state["progress_percentage"] = 10.0
        state["progress_message"] = "Converting natural language to SQL..."
        
        # Import and initialize NL2SQL agent
        from app.modules.ai.agents.nl2sql_agent import EnhancedNL2SQLAgent
        
        nl2sql_agent = EnhancedNL2SQLAgent(
            litellm_service=litellm_service,
            data_service=data_service,
            multi_query_service=multi_query_service,
            async_session_factory=async_session_factory
        )
        
        # Generate SQL
        logger.info(f"🔍 Generating SQL for query: {query[:100]}...")
        
        # Convert agent_context dict to AgentContextSchema if needed
        from app.modules.chats.schemas import AgentContextSchema
        if isinstance(agent_context, dict):
            try:
                agent_context = AgentContextSchema(**agent_context)
            except Exception as e:
                # Fallback: create minimal context
                logger.warning(f"Failed to create AgentContextSchema from dict: {e}, creating fallback")
                user_role_str = agent_context.get("user_role", "employee")
                # Convert string to UserRole enum
                try:
                    user_role_enum = UserRole(user_role_str) if isinstance(user_role_str, str) else user_role_str
                except (ValueError, TypeError):
                    # Default to EMPLOYEE if conversion fails
                    user_role_enum = UserRole.EMPLOYEE
                
                agent_context = AgentContextSchema(
                    user_id=agent_context.get("user_id", "anonymous"),
                    user_role=user_role_enum,
                    organization_id=agent_context.get("organization_id", "default"),
                    project_id=agent_context.get("project_id"),
                    data_sources=agent_context.get("data_sources", []),
                    permissions=agent_context.get("permissions", {"read": True, "write": True}),
                    analysis_mode=agent_context.get("analysis_mode", "standard")
                )
        
        # CRITICAL: Fetch schema info BEFORE generating SQL to ensure agent has full context
        schema_info = None
        if data_source_id and data_service:
            try:
                # The agent will fetch schema internally, but we can also fetch it here for logging
                logger.info(f"📊 Fetching schema for data source: {data_source_id}")
                # Schema will be fetched by the agent's _get_schema_info method
            except Exception as e:
                logger.warning(f"⚠️ Could not fetch schema info: {e}")
        
        # Convert conversation_history from dict format to tuple format expected by agent
        conversation_history_raw = state.get("conversation_history", [])
        conversation_history_tuples = []
        if conversation_history_raw:
            for msg in conversation_history_raw:
                if isinstance(msg, dict):
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    if role and content:
                        # Convert to (role, content) tuple
                        conversation_history_tuples.append((role, content))
                elif isinstance(msg, (list, tuple)) and len(msg) == 2:
                    # Already in tuple format
                    conversation_history_tuples.append(tuple(msg))
        
        logger.info(f"📚 Using {len(conversation_history_tuples)} conversation history messages for context")
        
        sql_result = await nl2sql_agent.generate_sql(
            natural_language_query=query,
            data_source_id=data_source_id,
            context=agent_context,
            conversation_history=conversation_history_tuples if conversation_history_tuples else None,
            schema_info=schema_info  # Agent will fetch if None
        )
        
        # CRITICAL: Log what we received from the agent
        logger.warning(f"🔍 NL2SQL_NODE received sql_result type: {type(sql_result)}, is_string: {isinstance(sql_result, str)}")
        if isinstance(sql_result, str):
            logger.warning(f"🔍 sql_result is STRING, first 200 chars: {sql_result[:200]}")
        
        # Parse result (should be SQLGenerationOutput or dict or JSON string)
        if isinstance(sql_result, str):
            # CRITICAL: sql_result is a JSON string - parse it first
            import json as json_lib
            try:
                sql_result = json_lib.loads(sql_result)
                logger.warning(f"✅ Parsed sql_result from JSON string")
            except:
                logger.error(f"❌ Failed to parse sql_result as JSON: {sql_result[:100]}")
                raise ValueError(f"Cannot parse sql_result as JSON: {sql_result[:100]}")
        
        if isinstance(sql_result, dict):
            # CRITICAL: Extract SQL query - handle case where entire dict might be stored
            sql_query = sql_result.get("sql_query") or sql_result.get("sql")
            # If sql_query is still a dict (nested), extract the actual SQL string
            if isinstance(sql_query, dict):
                sql_query = sql_query.get("sql_query") or sql_query.get("sql") or str(sql_query)
            explanation = sql_result.get("explanation", "")
            confidence = sql_result.get("confidence", 0.8)
            validation_result = sql_result.get("validation_result", {})
            reasoning_steps = sql_result.get("reasoning_steps", [])
            error = sql_result.get("error")
        elif hasattr(sql_result, "sql_query"):
            # Pydantic model
            sql_query = sql_result.sql_query
            explanation = sql_result.explanation
            confidence = sql_result.confidence
            validation_result = sql_result.validation_result
            reasoning_steps = sql_result.reasoning_steps
            error = sql_result.error
        else:
            raise ValueError(f"Unexpected SQL result type: {type(sql_result)}")
        
        # CRITICAL: Ensure sql_query is a string, not a dict/JSON object
        if isinstance(sql_query, dict):
            # If it's a dict, try to extract SQL from it
            sql_query = sql_query.get("sql_query") or sql_query.get("sql") or ""
            logger.warning(f"⚠️ SQL query was a dict, extracted: {sql_query[:100] if sql_query else 'empty'}...")
        
        # CRITICAL: If sql_query is still not a string, convert it
        if not isinstance(sql_query, str):
            sql_query = str(sql_query) if sql_query else ""
            logger.warning(f"⚠️ SQL query was not a string (type: {type(sql_query)}), converted to string")
        
        # CRITICAL: Check if the entire JSON object is embedded in sql_query
        # Look for pattern: "sql_query": "SELECT ... FORMAT JSONEachRow", "dialect": "clickhouse", ...
        if '"sql_query"' in sql_query and ('"dialect"' in sql_query or '"explanation"' in sql_query):
            # The entire SQLGenerationOutput JSON might be in sql_query - try to parse it
            import json as json_lib
            try:
                parsed = json_lib.loads(sql_query)
                if isinstance(parsed, dict) and parsed.get("sql_query"):
                    extracted_sql = parsed["sql_query"]
                    sql_query = extracted_sql
                    logger.warning(f"✅ Parsed JSON and extracted SQL: {sql_query[:100]}...")
            except (json_lib.JSONDecodeError, ValueError):
                # Not valid JSON - try regex extraction with better pattern
                # Use a pattern that finds the next field marker to know where the value ends
                match = re.search(r'"sql_query"\s*:\s*"((?:[^"\\]|\\.)*?)"\s*,\s*"', sql_query)
                if match:
                    extracted_sql = match.group(1)
                    extracted_sql = extracted_sql.replace('\\"', '"').replace('\\\\', '\\').replace('\\n', '\n')
                    sql_query = extracted_sql
                    logger.warning(f"✅ Regex extracted SQL: {sql_query[:100]}...")
        
        # CRITICAL: Extract SQL from JSON if it's embedded in JSON string - be very aggressive
        if sql_query:
            import json
            import re
            
            # Step 1: Remove JSON artifacts FIRST (before extraction)
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
            if re.search(r'SELECT\s+[^F]*?`?table`?\s+AND', sql_query, re.IGNORECASE):
                sql_query = re.sub(r'`?table`?\s+AND\s+', '', sql_query, flags=re.IGNORECASE)
                logger.warning("⚠️ Removed invalid 'table AND' pattern from SQL")
            
            if re.search(r'SELECT\s+`table`\s*$', sql_query, re.IGNORECASE):
                logger.error("❌ SQL contains invalid 'SELECT `table`' pattern (reserved word as column)")
                state["error"] = "SQL query contains invalid pattern: 'table' is a reserved word"
                return state
            
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
            
            # CRITICAL: Remove any trailing JSON artifacts
            sql_query = re.sub(r'\s*["\']\s*\}\s*\]\s*\}.*$', '', sql_query)
            sql_query = re.sub(r'\s*\}\s*\]\s*\}.*$', '', sql_query)
            
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
        
        # Update state with SQL - CRITICAL: Only set SQL if it's valid (not placeholder)
        if sql_query and isinstance(sql_query, str) and sql_query.strip():
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
                error_msg = "SQL generation failed - placeholder SQL template detected. The AI agent could not access the actual database schema to generate a real query."
                state["error"] = error_msg
                state["sql_query"] = None  # Explicitly set to None to prevent execution
                logger.error(f"❌ {error_msg}: {sql_query[:100]}...")
            else:
                # CRITICAL: Final sanitization before storing in state
                # Apply Pydantic validator logic to ensure clean SQL
                import re
                # Remove any remaining corruption
                sql_query = re.sub(r'(id){3,}', ' ', sql_query, flags=re.IGNORECASE)
                sql_query = re.sub(r'([A-Za-z0-9_]+)(id){3,}([A-Za-z0-9_]+)', r'\1 \3', sql_query, flags=re.IGNORECASE)
                sql_query = re.sub(r'(id){3,}([A-Za-z0-9_]+)', r'\2', sql_query, flags=re.IGNORECASE)
                sql_query = re.sub(r'([A-Za-z0-9_]+)(id){3,}', r'\1', sql_query, flags=re.IGNORECASE)
                sql_query = re.sub(r'\b(id){3,}\b', ' ', sql_query, flags=re.IGNORECASE)
                sql_query = re.sub(r'id{3,}', ' ', sql_query, flags=re.IGNORECASE)
                # Normalize whitespace
                sql_query = re.sub(r'\s+', ' ', sql_query)
                sql_query = sql_query.strip()
                
                state["sql_query"] = sql_query
                
                # CRITICAL: Extract query intent for chart generation and insights
                query_intent = _extract_query_intent(query, sql_query)
                state["query_intent"] = query_intent
                logger.info(f"🎯 Query intent extracted: {json.dumps(query_intent, default=str)}")
                
                state["current_stage"] = "nl2sql_complete"
                state["progress_percentage"] = 20.0
                state["progress_message"] = "SQL query generated successfully"
                
                # Update execution metadata
                metadata = state.get("execution_metadata", {})
                metadata["confidence_scores"] = metadata.get("confidence_scores", {})
                metadata["confidence_scores"]["sql_generation"] = confidence
                if reasoning_steps:
                    metadata["reasoning_steps"] = reasoning_steps
                state["execution_metadata"] = metadata
                
                logger.info(f"✅ SQL generated: {sql_query[:100]}...")
        else:
            error_msg = error or "SQL generation failed - no SQL returned"
            state["error"] = error_msg
            state["sql_query"] = None  # Explicitly set to None
            logger.error(f"❌ SQL generation failed: {error_msg}")
        
        return state
        
    except Exception as e:
        logger.error(f"❌ NL2SQL node failed: {e}", exc_info=True)
        state["error"] = f"NL2SQL error: {str(e)}"
        return state

