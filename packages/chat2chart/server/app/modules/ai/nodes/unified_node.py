"""
Unified Chart and Insights Node for LangGraph Workflow

Generates both chart and insights in a single LLM call for efficiency.
"""

import json
import logging
import re
from typing import Any, Optional, List, Dict

from app.modules.ai.schemas.graph_state import AiserWorkflowState
from app.modules.ai.services.langgraph_base import (
    validate_state_transition,
    handle_node_errors
)

logger = logging.getLogger(__name__)


def normalize_insights(items: List) -> List[Dict[str, Any]]:
    """Convert string insights to dictionary format - module-level function"""
    if not isinstance(items, list):
        return []
    normalized = []
    for idx, item in enumerate(items):
        if isinstance(item, str):
            # Convert string to dictionary
            normalized.append({
                "type": "general",
                "title": f"Insight {idx + 1}",
                "description": item,
                "confidence": 0.7,
                "impact": "medium"
            })
        elif isinstance(item, dict):
            normalized.append(item)
    return normalized


@validate_state_transition(validate_input=True, validate_output=True)
@handle_node_errors(retry_on_error=True, max_retries=2)
async def unified_chart_insights_node(
    state: AiserWorkflowState,
    litellm_service: Any,
    session_factory: Any = None
) -> AiserWorkflowState:
    """
    Generate both chart and insights together from query results.
    
    Args:
        state: Current workflow state
        litellm_service: LiteLLM service
        session_factory: SQLAlchemy session factory for database access
    
    Returns:
        Updated state with chart and insights
    """
    query_result = state.get("query_result", [])
    query = state.get("query", "")
    agent_context = state.get("agent_context", {})
    
    # CRITICAL: Only generate if we have query results
    if not query_result or not isinstance(query_result, list) or len(query_result) == 0:
        error_msg = "Cannot generate chart/insights: no query result data available"
        logger.warning(f"⚠️ {error_msg}")
        state["error"] = error_msg
        state["chart_generation_error"] = error_msg
        state["insights_generation_error"] = error_msg
        return state
    
    try:
        # Import unified agent
        from app.modules.ai.agents.unified_chart_insights_agent import UnifiedChartInsightsAgent
        from app.modules.ai.agents.chart_generation_agent import IntelligentChartGenerationAgent
        from app.modules.ai.agents.insights_agent import BusinessInsightsAgent
        from app.modules.chats.schemas import AgentContextSchema
        
        # CRITICAL: Both agents require session_factory
        from sqlalchemy.orm import sessionmaker
        
        if session_factory is None:
            # Create a default sessionmaker if not provided
            from app.db.session import get_sync_session
            try:
                sync_session = get_sync_session()
                if hasattr(sync_session, 'bind') and sync_session.bind:
                    session_factory = sessionmaker(bind=sync_session.bind)
                else:
                    from app.db.session import get_sync_engine
                    engine = get_sync_engine()
                    if engine:
                        session_factory = sessionmaker(bind=engine)
            except Exception as e:
                logger.error(f"❌ Failed to create session_factory: {e}")
                state["error"] = "Failed to initialize agents: session_factory required"
                return state
        
        if session_factory is None:
            logger.error("❌ session_factory is None - cannot initialize agents")
            state["error"] = "Failed to initialize agents: session_factory required"
            return state
        
        # Build agent context if available
        context = None
        if agent_context:
            try:
                context = AgentContextSchema(**agent_context)
            except Exception:
                context = None
        
        logger.info(f"🎯 Generating unified chart+insights from {len(query_result)} rows of data using LLM")
        
        # Get query intent from state (extracted during NL2SQL)
        query_intent = state.get("query_intent", {})
        chart_type_suggestion = query_intent.get("chart_type_suggestion", "bar")
        is_kpi = query_intent.get("is_kpi", False)
        is_time_series = query_intent.get("time_series", False)
        aggregation_type = query_intent.get("aggregation_type")
        grouping = query_intent.get("grouping", [])
        
        logger.info(f"📊 Query intent: chart_type={chart_type_suggestion}, is_kpi={is_kpi}, time_series={is_time_series}, aggregation={aggregation_type}")
        
        # STEP 1: Use direct LLM calls via LiteLLM for chart generation and insights
        unified_result = None
        try:
            # Prepare data summary for LLM
            data_sample = query_result[:20] if len(query_result) > 20 else query_result
            cols = list(query_result[0].keys()) if query_result else []
            
            # Get optimized SQL query from state (if available) for context
            sql_query = state.get("sql_query", "")
            sql_context = ""
            if sql_query:
                sql_context = f"""
**SQL Query Used:**
```sql
{sql_query}
```
This query was optimized for the data source and executed successfully."""
            
            # Create comprehensive prompt for unified generation with query intent
            chart_prompt = f"""You are an expert data visualization and business intelligence analyst.

**User Query:** {query}
{sql_context}
**Query Intent Analysis:**
- Suggested Chart Type: {chart_type_suggestion}
- Is KPI (single value): {is_kpi}
- Is Time Series: {is_time_series}
- Aggregation Type: {aggregation_type or 'none'}
- Grouping Dimensions: {', '.join(grouping) if grouping else 'none'}
- Dimension Count: {query_intent.get('dimension_count', 0)}
- Metric Count: {query_intent.get('metric_count', 0)}

**Data Summary:**
- Rows: {len(query_result)}
- Columns: {', '.join(cols)}
- Sample data (first {len(data_sample)} rows): {json.dumps(data_sample, default=str)}

**Your Task:**
1. Generate a complete ECharts 6 configuration that best visualizes this data
2. Generate meaningful business insights and recommendations aligned with query intent
3. Create an executive summary that answers the user's question

**Chart Requirements (Context-Aware):**
- Primary chart type suggestion: {chart_type_suggestion} (based on query intent analysis)
- Refine chart type based on actual data structure and result set
- For KPIs (single value): Use gauge or number chart
- For time series: Use line chart with time on x-axis
- For comparisons: Use bar chart with categories on x-axis
- For multi-dimensional: Consider stacked bar or grouped bar
- Include complete ECharts config: title, tooltip, legend, xAxis, yAxis, series, etc.
- Format currency values properly ($X,XXX.XX)
- Make it interactive and professional

**Insights Requirements:**
- Analyze the actual data, not generic statements
- For "average by X": Show which category has highest/lowest, calculate variance
- Provide actionable recommendations based on findings
- Executive summary should directly answer the user's question

**Output Format (STRICT JSON - MUST FOLLOW THIS EXACT STRUCTURE):**
{{
  "echarts_config": {{
    "type": "bar|line|pie|gauge|...",
    "title": {{"text": "...", "left": "left"}},
    "tooltip": {{...}},
    "legend": {{"top": 28, "data": [...]}},
    "xAxis": {{"type": "category", "data": [...]}},
    "yAxis": {{"type": "value"}},
    "series": [{{"data": [...], "type": "bar|line|..."}}]
  }},
  "insights": [
    {{
      "type": "kpi|trend|anomaly",
      "title": "Meaningful title based on data",
      "description": "Specific insight about the data",
      "confidence": 0.9,
      "impact": "high|medium|low"
    }}
  ],
  "recommendations": [
    {{
      "title": "Actionable recommendation",
      "description": "Specific action based on findings",
      "priority": "high|medium|low",
      "impact": "high|medium|low"
    }}
  ],
  "executive_summary": "Direct answer to user's question with actual values from data"
}}

**CRITICAL FORMAT RULES:**
- "insights" MUST be an array of objects (NOT strings). Each object MUST have: type, title, description, confidence, impact
- "recommendations" MUST be an array of objects (NOT strings). Each object MUST have: title, description, priority, impact
- Do NOT return insights or recommendations as plain strings - they MUST be objects with the required fields
- Return ONLY valid JSON - no markdown, no explanations, no text outside the JSON object"""
            
            # Call LLM for unified generation
            logger.info("🤖 Calling LLM for unified chart+insights generation")
            llm_result = await litellm_service.generate_completion(
                prompt=chart_prompt,
                system_context="You are an expert data analyst. Return ONLY valid JSON conforming to the specified format. Do not include any text outside the JSON.",
                max_tokens=4000,
                temperature=0.3
            )
            
            if llm_result.get("success") and llm_result.get("content"):
                # Parse LLM response
                content = llm_result.get("content", "").strip()
                
                # CRITICAL: Handle empty or whitespace-only content
                if not content or len(content.strip()) == 0:
                    logger.warning("⚠️ Empty content from LLM in unified_node, will use fallback")
                    raise ValueError("Empty content from LLM response")
                
                # Extract JSON from response
                import json as json_lib
                unified_result = None
                
                def extract_json_from_text(text: str) -> Optional[Dict]:
                    """Extract and parse JSON from text with proper brace balancing."""
                    # First, try to find JSON in markdown code blocks
                    json_block_pattern = r'```(?:json)?\s*(\{[\s\S]*?\})\s*```'
                    match = re.search(json_block_pattern, text, re.DOTALL)
                    if match:
                        json_str = match.group(1)
                    else:
                        # Find the first opening brace
                        first_brace = text.find('{')
                        if first_brace == -1:
                            return None
                        
                        # Balance braces to find the complete JSON object
                        brace_count = 0
                        start_pos = first_brace
                        end_pos = first_brace
                        
                        for i, char in enumerate(text[first_brace:], start=first_brace):
                            if char == '{':
                                brace_count += 1
                            elif char == '}':
                                brace_count -= 1
                                if brace_count == 0:
                                    end_pos = i + 1
                                    break
                        
                        if brace_count != 0:
                            # Unbalanced braces - try to fix by finding the last closing brace
                            last_brace = text.rfind('}')
                            if last_brace > first_brace:
                                json_str = text[first_brace:last_brace + 1]
                            else:
                                return None
                        else:
                            json_str = text[start_pos:end_pos]
                    
                    # Clean up common JSON issues
                    # Remove trailing commas before closing braces/brackets
                    json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
                    # Remove comments (not standard JSON but sometimes LLMs add them)
                    json_str = re.sub(r'//.*?$', '', json_str, flags=re.MULTILINE)
                    json_str = re.sub(r'/\*.*?\*/', '', json_str, flags=re.DOTALL)
                    
                    try:
                        return json_lib.loads(json_str)
                    except json_lib.JSONDecodeError as e:
                        logger.debug(f"JSON parse error after cleaning: {e}, JSON snippet: {json_str[:200]}")
                        # Try one more time with more aggressive cleaning
                        try:
                            # Remove any non-printable characters except newlines and tabs
                            json_str_clean = ''.join(char for char in json_str if char.isprintable() or char in '\n\t')
                            return json_lib.loads(json_str_clean)
                        except json_lib.JSONDecodeError:
                            return None
                
                try:
                    # Try parsing as direct JSON first
                    unified_result = json_lib.loads(content)
                except json_lib.JSONDecodeError as e:
                    logger.warning(f"⚠️ Direct JSON parse failed: {e}, trying extraction methods")
                    # Use robust extraction
                    unified_result = extract_json_from_text(content)
                    
                    if not unified_result:
                        logger.error(f"❌ No valid JSON found in LLM response. Content length: {len(content)}, first 200 chars: {content[:200]}")
                        # Log more context for debugging
                        if len(content) > 500:
                            error_pos = 214  # Common error position from logs
                            logger.error(f"Content around error position (char {error_pos}): {content[max(0, error_pos-50):min(len(content), error_pos+50)]}")
                        raise ValueError("No valid JSON found in LLM response")
                
                # CRITICAL: Validate and fix structure IMMEDIATELY after parsing (fix at source)
                if isinstance(unified_result, dict):
                    # Fix insights if they're strings instead of objects
                    if "insights" in unified_result:
                        insights_raw = unified_result["insights"]
                        if isinstance(insights_raw, list):
                            fixed_insights = []
                            for idx, item in enumerate(insights_raw):
                                if isinstance(item, str):
                                    # Convert string to proper object structure
                                    fixed_insights.append({
                                        "type": "general",
                                        "title": f"Insight {idx + 1}",
                                        "description": item,
                                        "confidence": 0.7,
                                        "impact": "medium"
                                    })
                                    logger.warning(f"⚠️ Fixed insight {idx + 1}: converted string to object")
                                elif isinstance(item, dict):
                                    fixed_insights.append(item)
                            unified_result["insights"] = fixed_insights
                    
                    # Fix recommendations if they're strings instead of objects
                    if "recommendations" in unified_result:
                        recommendations_raw = unified_result["recommendations"]
                        if isinstance(recommendations_raw, list):
                            fixed_recommendations = []
                            for idx, item in enumerate(recommendations_raw):
                                if isinstance(item, str):
                                    # Convert string to proper object structure
                                    fixed_recommendations.append({
                                        "title": f"Recommendation {idx + 1}",
                                        "description": item,
                                        "priority": "medium",
                                        "impact": "medium"
                                    })
                                    logger.warning(f"⚠️ Fixed recommendation {idx + 1}: converted string to object")
                                elif isinstance(item, dict):
                                    fixed_recommendations.append(item)
                            unified_result["recommendations"] = fixed_recommendations
                
                logger.info("✅ LLM unified generation succeeded")
            elif not llm_result.get("success"):
                error_msg = llm_result.get('error', 'Unknown error')
                logger.warning(f"⚠️ LLM unified generation failed: {error_msg}")
                # Re-raise to trigger fallback
                raise ValueError(f"LLM generation failed: {error_msg}")
            else:
                # Empty content case
                logger.warning("⚠️ LLM returned success but no content")
                raise ValueError("Empty content from LLM response")
                # If it's an empty content error, try a simpler retry with reduced tokens
                if 'Empty content' in error_msg and litellm_service:
                    logger.info("🔄 Retrying with simpler prompt due to empty content")
                    try:
                        # Simpler prompt with fewer requirements
                        simple_prompt = f"""Generate a JSON response with chart config and insights for this query: {query}

Data sample (first 3 rows): {json.dumps(query_result[:3] if query_result else [], default=str)}

Return JSON with:
- echarts_config: Basic chart configuration
- insights: At least 2 insights about the data
- executive_summary: One sentence summary

JSON only, no other text."""
                        
                        retry_result = await litellm_service.generate_completion(
                            prompt=simple_prompt,
                            system_context="You are a data analyst. Return ONLY valid JSON. No explanations, no markdown, just JSON.",
                            max_tokens=2000,
                            temperature=0.2
                        )
                        
                        if retry_result.get("success") and retry_result.get("content"):
                            content = retry_result.get("content", "").strip()
                            if content and len(content) > 10:  # Ensure we have actual content
                                try:
                                    # Use same robust parsing as main path
                                    unified_result = None
                                    try:
                                        unified_result = json.loads(content)
                                    except json.JSONDecodeError:
                                        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
                                        if json_match:
                                            unified_result = json.loads(json_match.group(1))
                                        else:
                                            json_match = re.search(r'\{[\s\S]{20,}\}', content, re.DOTALL)
                                            if json_match:
                                                json_str = json_match.group(0)
                                                # Balance braces
                                                open_braces = json_str.count('{')
                                                close_braces = json_str.count('}')
                                                if open_braces > close_braces:
                                                    json_str += '}' * (open_braces - close_braces)
                                                elif close_braces > open_braces:
                                                    for _ in range(close_braces - open_braces):
                                                        json_str = json_str.rsplit('}', 1)[0]
                                                unified_result = json.loads(json_str)
                                    
                                    # Validate and fix structure
                                    if isinstance(unified_result, dict):
                                        if "insights" in unified_result and isinstance(unified_result["insights"], list):
                                            unified_result["insights"] = [
                                                item if isinstance(item, dict) else {
                                                    "type": "general", "title": f"Insight {i+1}", "description": str(item),
                                                    "confidence": 0.7, "impact": "medium"
                                                } for i, item in enumerate(unified_result["insights"])
                                            ]
                                        if "recommendations" in unified_result and isinstance(unified_result["recommendations"], list):
                                            unified_result["recommendations"] = [
                                                item if isinstance(item, dict) else {
                                                    "title": f"Recommendation {i+1}", "description": str(item),
                                                    "priority": "medium", "impact": "medium"
                                                } for i, item in enumerate(unified_result["recommendations"])
                                            ]
                                        logger.info("✅ Retry succeeded with simpler prompt")
                                    else:
                                        logger.warning("⚠️ Retry returned non-dict result, using fallback")
                                        unified_result = None
                                except (json.JSONDecodeError, ValueError) as retry_parse_err:
                                    logger.warning(f"⚠️ Retry response not valid JSON: {retry_parse_err}, using fallback")
                                    unified_result = None
                            else:
                                logger.warning(f"⚠️ Retry returned empty or too short content (length: {len(content) if content else 0})")
                                unified_result = None
                        else:
                            error_msg = retry_result.get('error', 'Unknown')
                            logger.warning(f"⚠️ Retry also failed: {error_msg}")
                            if 'Empty content' in error_msg:
                                logger.warning("⚠️ Retry also returned empty content - will use intelligent fallback")
                            unified_result = None
                    except Exception as retry_err:
                        logger.warning(f"⚠️ Retry attempt failed: {retry_err}")
                        unified_result = None
                else:
                    unified_result = None
                
        except Exception as gen_err:
            logger.warning(f"⚠️ LLM unified generation failed: {gen_err}, will try fallback", exc_info=True)
            unified_result = None
        
        # Extract results from LLM response
        if isinstance(unified_result, dict):
            # Handle both "echarts_config" and "chart_config" keys
            chart_config = unified_result.get("echarts_config") or unified_result.get("chart_config")
            # Extract insights and recommendations - CRITICAL: Normalize before assigning to state
            insights_raw = unified_result.get("insights", [])
            recommendations_raw = unified_result.get("recommendations", [])
            executive_summary = unified_result.get("executive_summary", "")
            
            # CRITICAL: Always normalize insights/recommendations before state assignment
            # Even if they were "fixed" during parsing, ensure they're proper dicts
            insights = normalize_insights(insights_raw) if isinstance(insights_raw, list) else []
            recommendations = normalize_insights(recommendations_raw) if isinstance(recommendations_raw, list) else []
            
            # Final safety check: ensure they're lists (normalize_insights should handle this, but double-check)
            if not isinstance(insights, list):
                insights = []
            if not isinstance(recommendations, list):
                recommendations = []
            
            # Update state with chart from LLM
            if chart_config:
                state["echarts_config"] = chart_config
                state["chart_data"] = query_result
                state["chart_type"] = chart_config.get("type") or unified_result.get("chart_type", "bar")
                state["chart_title"] = chart_config.get("title", {}).get("text") or query
                logger.info("✅ LLM chart config generated")
            else:
                logger.warning("⚠️ LLM did not return chart_config")
            
            # Update state with insights from LLM (CRITICAL: normalize again before assignment as final safety check)
            if insights or recommendations or executive_summary:
                # FINAL SAFETY: Normalize one more time before state assignment to catch any edge cases
                state["insights"] = normalize_insights(insights) if isinstance(insights, list) else []
                state["recommendations"] = normalize_insights(recommendations) if isinstance(recommendations, list) else []
                state["executive_summary"] = executive_summary if isinstance(executive_summary, str) else ""
                
                # Log if normalization changed anything (for debugging)
                if len(state["insights"]) != len(insights) or any(isinstance(i, str) for i in insights if isinstance(insights, list)):
                    logger.warning(f"⚠️ Normalization converted {len(insights) - len(state['insights'])} string insights to dicts")
                
                logger.info(f"✅ LLM insights generated: {len(state['insights'])} insights, {len(state['recommendations'])} recommendations")
            else:
                logger.warning("⚠️ LLM did not return insights")
            
            # If we got at least one component from LLM, mark as complete
            if chart_config or insights or recommendations or executive_summary:
                state["current_stage"] = "unified_chart_insights_complete"
                # Update progress - Chart & Insights Generation step (60-90%)
                state["progress_percentage"] = 90.0
                state["progress_message"] = f"Chart and insights generated: {len(state.get('insights', []))} insights"
                
                # Update execution metadata
                metadata = state.get("execution_metadata", {})
                metadata["confidence_scores"] = metadata.get("confidence_scores", {})
                metadata["generation_method"] = "llm_direct"
                state["execution_metadata"] = metadata
                logger.info("✅ LLM unified generation completed successfully")
            else:
                logger.warning("⚠️ LLM returned empty result, will use fallback")
                unified_result = None  # Trigger fallback
        else:
            logger.warning("⚠️ LLM returned non-dict result, will use fallback")
            unified_result = None  # Trigger fallback
        
        # Fallback: If no chart generated but we have data, create a smart default chart
        # Use query intent from NL2SQL node for context-aware chart generation
        if not state.get("echarts_config") and query_result and len(query_result) > 0:
            logger.info("💡 No chart config generated, creating context-aware chart from query results using query intent")
            try:
                # Smart fallback: Use query intent + data structure for chart generation
                if len(query_result) > 0 and isinstance(query_result[0], dict):
                    cols = list(query_result[0].keys())
                    
                    # Intelligent column detection
                    numeric_cols = []
                    text_cols = []
                    date_cols = []
                    
                    for col in cols:
                        sample_values = [row.get(col) for row in query_result[:10] if row.get(col) is not None]
                        if sample_values:
                            if any(isinstance(v, (int, float)) for v in sample_values):
                                numeric_cols.append(col)
                            elif any(word in col.lower() for word in ['date', 'time', 'month', 'year', 'week', 'day']):
                                date_cols.append(col)
                            else:
                                text_cols.append(col)
                    
                    # Use query intent from state (extracted during NL2SQL)
                    # Refine based on actual data structure
                    suggested_chart_type = query_intent.get("chart_type_suggestion", "bar")
                    is_kpi_from_intent = query_intent.get("is_kpi", False)
                    is_time_series_from_intent = query_intent.get("time_series", False)
                    
                    # Refine based on actual result set
                    actual_is_kpi = len(query_result) == 1 and len(numeric_cols) == 1
                    actual_is_time_series = len(date_cols) > 0 or is_time_series_from_intent
                    
                    # Use intent suggestion, but refine based on actual data
                    if actual_is_kpi:
                        final_chart_type = "gauge"
                    elif actual_is_time_series:
                        final_chart_type = "line"
                    elif suggested_chart_type:
                        final_chart_type = suggested_chart_type
                    else:
                        final_chart_type = "bar"
                    
                    logger.info(f"📊 Chart type: intent={suggested_chart_type}, refined={final_chart_type}, is_kpi={actual_is_kpi}, time_series={actual_is_time_series}")
                    
                    # Use query intent to determine chart structure
                    # For aggregation with grouping queries, use category as x-axis and metric as y-axis
                    has_grouping = query_intent.get("grouping") and len(query_intent.get("grouping", [])) > 0
                    has_aggregation = query_intent.get("aggregation_type") is not None
                    is_comparison = query_intent.get("is_comparison", False)
                    
                    if (has_aggregation and has_grouping) or (is_comparison and numeric_cols and text_cols):
                        # Average by category query - use category as x, metric as y
                        x_col = text_cols[0]  # Category column (e.g., status)
                        y_col = numeric_cols[0]  # Metric column (e.g., average spend)
                        x_vals = [str(row.get(x_col, "")) for row in query_result]
                        y_vals = []
                        for row in query_result:
                            try:
                                val = row.get(y_col)
                                if val is not None:
                                    y_vals.append(float(val))
                                else:
                                    y_vals.append(0)
                            except (ValueError, TypeError):
                                y_vals.append(0)
                        
                        # Create chart based on query intent and refined type
                        chart_type = final_chart_type if final_chart_type != "gauge" else "bar"  # Use bar for grouped data, not gauge
                        state["echarts_config"] = {
                            "type": chart_type,
                            "title": {"text": query or f"Average {y_col.replace('_', ' ').title()} by {x_col.replace('_', ' ').title()}", "left": "left", "top": "top", "textStyle": {"fontSize": 13}},
                            "tooltip": {
                                "trigger": "axis",
                                "backgroundColor": "rgba(0, 0, 0, 0.75)",
                                "borderColor": "#ccc",
                                "textStyle": {"color": "#fff"},
                                "axisPointer": {"type": "shadow"},
                                "formatter": "{b}<br/>" + y_col.replace('_', ' ').title() + ": ${c:,.2f}"
                            },
                            "legend": {"top": 28, "data": [y_col.replace('_', ' ').title()]},
                            "grid": {"top": 60, "right": 30, "bottom": 50, "left": 60},
                            "xAxis": {
                                "type": "category",
                                "data": x_vals,
                                "axisLabel": {"rotate": 45 if len(x_vals) > 5 else 0, "interval": 0}
                            },
                            "yAxis": {
                                "type": "value",
                                "axisLabel": {
                                    "formatter": "${value}"
                                }
                            },
                            "series": [{
                                "data": y_vals,
                                "type": "bar",
                                "name": y_col.replace('_', ' ').title(),
                                "itemStyle": {"color": "#1890ff"},
                                "label": {
                                    "show": True,
                                    "position": "top",
                                    "formatter": "${c:,.2f}"
                                }
                            }],
                            "animationDuration": 800,
                            "animationEasing": "cubicOut"
                        }
                        state["chart_data"] = query_result
                        state["chart_type"] = chart_type
                        logger.info(f"✅ Smart bar chart created for average by category: {x_col} vs {y_col}")
                    elif len(cols) >= 2:
                        # Default: use first column as x, second as y
                        x_col = cols[0]
                        y_col = cols[1]
                        x_vals = [str(row.get(x_col, "")) for row in query_result]
                        y_vals = []
                        for row in query_result:
                            try:
                                val = row.get(y_col)
                                if val is not None:
                                    y_vals.append(float(val))
                                else:
                                    y_vals.append(0)
                            except (ValueError, TypeError):
                                y_vals.append(0)
                        
                        # Determine chart type: KPI, line (for time series), or bar
                        chart_type = "bar"
                        if is_kpi:
                            # For KPI: display as gauge or big number
                            chart_type = "gauge"
                            kpi_value = y_vals[0] if y_vals else 0
                            state["echarts_config"] = {
                                "type": "gauge",
                                "title": {"text": query or "KPI", "left": "left", "top": "top", "textStyle": {"fontSize": 13}},
                                "tooltip": {"formatter": "{b} : {c}"},
                                "gauge": {
                                    "startAngle": 200,
                                    "endAngle": -20,
                                    "radius": "75%",
                                    "center": ["50%", "50%"],
                                    "min": 0,
                                    "max": max(100, kpi_value * 1.5),
                                    "splitNumber": 10,
                                    "axisLine": {
                                        "lineStyle": {
                                            "width": 30,
                                            "color": [[0.3, "#67e0eb"], [0.7, "#37b7ff"], [1, "#fd666d"]]
                                        }
                                    },
                                    "progress": {"itemStyle": {"color": "#1890ff"}},
                                    "detail": {"valueAnimation": True, "formatter": "{value}", "textStyle": {"fontSize": 20}}
                                },
                                "series": [{
                                    "type": "gauge",
                                    "startAngle": 200,
                                    "endAngle": -20,
                                    "progress": {"show": True},
                                    "itemStyle": {"color": "#1890ff"},
                                    "axisLine": {
                                        "lineStyle": {
                                            "width": 30,
                                            "color": [[0.3, "#67e0eb"], [0.7, "#37b7ff"], [1, "#fd666d"]]
                                        }
                                    },
                                    "axisTick": {"distance": -30, "length": 8, "lineStyle": {"color": "#fff", "width": 2}},
                                    "splitLine": {"distance": -30, "length": 30, "lineStyle": {"color": "#fff", "width": 4}},
                                    "axisLabel": {"color": "auto", "distance": 40, "fontSize": 16},
                                    "detail": {"valueAnimation": True, "formatter": "{value}", "textStyle": {"fontSize": 20}},
                                    "data": [{"value": kpi_value, "name": y_col}]
                                }]
                            }
                        elif is_time_series:
                            chart_type = "line"
                            state["echarts_config"] = {
                                "type": "line",
                                "title": {"text": query or "Time Series", "left": "left", "top": "top", "textStyle": {"fontSize": 13}},
                                "tooltip": {
                                    "trigger": "axis",
                                    "backgroundColor": "rgba(0, 0, 0, 0.75)",
                                    "borderColor": "#ccc",
                                    "textStyle": {"color": "#fff"}
                                },
                                "legend": {"top": 28, "data": [y_col]},
                                "grid": {"top": 60, "right": 30, "bottom": 50, "left": 60},
                                "xAxis": {"type": "category", "data": x_vals, "axisLabel": {"rotate": 45 if len(x_vals) > 5 else 0}},
                                "yAxis": {"type": "value"},
                                "series": [{
                                    "data": y_vals,
                                    "type": "line",
                                    "name": y_col,
                                    "smooth": True,
                                    "itemStyle": {"color": "#1890ff"},
                                    "areaStyle": {"color": "rgba(24, 144, 255, 0.2)"}
                                }],
                                "animationDuration": 800,
                                "animationEasing": "cubicOut"
                            }
                        else:
                            # Default: bar chart
                            state["echarts_config"] = {
                                "type": "bar",
                                "title": {"text": query or "Data Visualization", "left": "left", "top": "top", "textStyle": {"fontSize": 13}},
                                "tooltip": {
                                    "trigger": "axis",
                                    "backgroundColor": "rgba(0, 0, 0, 0.75)",
                                    "borderColor": "#ccc",
                                    "textStyle": {"color": "#fff"},
                                    "axisPointer": {"type": "shadow"}
                                },
                                "legend": {"top": 28, "data": [y_col]},
                                "grid": {"top": 60, "right": 30, "bottom": 50, "left": 60},
                                "xAxis": {
                                    "type": "category",
                                    "data": x_vals,
                                    "axisLabel": {"rotate": 45 if len(x_vals) > 5 else 0}
                                },
                                "yAxis": {"type": "value"},
                                "series": [{
                                    "data": y_vals,
                                    "type": "bar",
                                    "name": y_col,
                                    "itemStyle": {"color": "#1890ff"}
                                }],
                                "animationDuration": 800,
                                "animationEasing": "cubicOut"
                            }
                        
                        state["chart_data"] = query_result
                        state["chart_type"] = chart_type
                        logger.info(f"✅ Smart chart created: {chart_type}")
            except Exception as chart_fallback_err:
                logger.warning(f"⚠️ Default chart fallback failed: {chart_fallback_err}")
        
        # CRITICAL: Always generate insights and executive summary when query execution is successful
        # Generate intelligent, meaningful insights from the actual data
        if not state.get("insights") and query_result and len(query_result) > 0:
            logger.info("💡 Generating intelligent insights from query results")
            try:
                insights = []
                recommendations = []
                executive_summary = ""
                
                if len(query_result) > 0 and isinstance(query_result[0], dict):
                    cols = list(query_result[0].keys())
                    row_count = len(query_result)
                    
                    # Intelligent analysis of the data
                    numeric_cols = []
                    text_cols = []
                    date_cols = []
                    
                    for col in cols:
                        sample_values = [row.get(col) for row in query_result[:10] if row.get(col) is not None]
                        if sample_values:
                            if any(isinstance(v, (int, float)) for v in sample_values):
                                numeric_cols.append(col)
                            elif any('date' in col.lower() or 'time' in col.lower() or 'month' in col.lower() or 'year' in col.lower() for _ in [col]):
                                date_cols.append(col)
                            else:
                                text_cols.append(col)
                    
                    # Analyze query intent from the query text
                    query_lower = query.lower()
                    is_average_query = 'average' in query_lower or 'avg' in query_lower or 'mean' in query_lower
                    is_sum_query = 'sum' in query_lower or 'total' in query_lower
                    is_count_query = 'count' in query_lower or 'number' in query_lower
                    is_by_query = 'by' in query_lower or 'group' in query_lower
                    is_time_query = any(word in query_lower for word in ['month', 'year', 'week', 'day', 'time', 'date'])
                    
                    # Generate meaningful executive summary based on query and data
                    if row_count == 1:
                        # Single row result - extract key metrics
                        values = {k: v for k, v in query_result[0].items() if v is not None}
                        if values:
                            # Find the most relevant metric
                            metric_col = None
                            for col in numeric_cols:
                                if col in values:
                                    metric_col = col
                                    break
                            
                            if metric_col:
                                value = values[metric_col]
                                # Format the value nicely
                                if isinstance(value, float):
                                    if value >= 1000000:
                                        formatted_value = f"${value/1000000:.2f}M"
                                    elif value >= 1000:
                                        formatted_value = f"${value/1000:.2f}K"
                                    else:
                                        formatted_value = f"${value:,.2f}"
                                else:
                                    formatted_value = str(value)
                                
                                executive_summary = f"The {metric_col.replace('_', ' ').title()} is {formatted_value}"
                            else:
                                key_item = list(values.items())[0]
                                executive_summary = f"Analysis shows {key_item[0].replace('_', ' ').title()}: {key_item[1]}"
                    else:
                        # Multiple rows - analyze patterns
                        if is_average_query and numeric_cols and text_cols:
                            # Average by category query
                            category_col = text_cols[0] if text_cols else None
                            metric_col = numeric_cols[0] if numeric_cols else None
                            
                            if category_col and metric_col:
                                # Calculate averages by category
                                category_totals = {}
                                category_counts = {}
                                
                                for row in query_result:
                                    cat = str(row.get(category_col, 'Unknown'))
                                    val = row.get(metric_col)
                                    if val is not None:
                                        try:
                                            val_float = float(val)
                                            category_totals[cat] = category_totals.get(cat, 0) + val_float
                                            category_counts[cat] = category_counts.get(cat, 0) + 1
                                        except (ValueError, TypeError):
                                            pass
                                
                                if category_totals:
                                    # Find highest and lowest
                                    category_avgs = {cat: total / category_counts[cat] for cat, total in category_totals.items()}
                                    sorted_cats = sorted(category_avgs.items(), key=lambda x: x[1], reverse=True)
                                    
                                    if len(sorted_cats) > 0:
                                        highest_cat, highest_avg = sorted_cats[0]
                                        lowest_cat, lowest_avg = sorted_cats[-1]
                                        
                                        # Format values
                                        def format_currency(v):
                                            if v >= 1000000:
                                                return f"${v/1000000:.2f}M"
                                            elif v >= 1000:
                                                return f"${v/1000:.2f}K"
                                            else:
                                                return f"${v:,.2f}"
                                        
                                        executive_summary = f"Average {metric_col.replace('_', ' ')} varies by {category_col.replace('_', ' ')}: {highest_cat} has the highest at {format_currency(highest_avg)}, while {lowest_cat} has the lowest at {format_currency(lowest_avg)}"
                                        
                                        # Generate meaningful insights
                                        insights.append({
                                            "type": "kpi",
                                            "title": f"Highest Average: {highest_cat}",
                                            "description": f"{highest_cat} shows the highest average {metric_col.replace('_', ' ')} at {format_currency(highest_avg)}",
                                            "confidence": 0.9,
                                            "impact": "high"
                                        })
                                        
                                        if len(sorted_cats) > 1:
                                            insights.append({
                                                "type": "trend",
                                                "title": f"Variation Across {category_col.replace('_', ' ').title()}s",
                                                "description": f"Average {metric_col.replace('_', ' ')} ranges from {format_currency(lowest_avg)} ({lowest_cat}) to {format_currency(highest_avg)} ({highest_cat}), showing {len(sorted_cats)} distinct categories",
                                                "confidence": 0.85,
                                                "impact": "medium"
                                            })
                                            
                                            # Calculate variance
                                            all_avgs = list(category_avgs.values())
                                            if len(all_avgs) > 1:
                                                mean_avg = sum(all_avgs) / len(all_avgs)
                                                variance = sum((x - mean_avg) ** 2 for x in all_avgs) / len(all_avgs)
                                                std_dev = variance ** 0.5
                                                
                                                if std_dev > mean_avg * 0.3:
                                                    insights.append({
                                                        "type": "anomaly",
                                                        "title": "High Variability Detected",
                                                        "description": f"Significant variation in {metric_col.replace('_', ' ')} across {category_col.replace('_', ' ')}s suggests different performance levels",
                                                        "confidence": 0.8,
                                                        "impact": "high"
                                                    })
                                        
                                        # Generate actionable recommendations
                                        recommendations.append({
                                            "title": f"Investigate {highest_cat} Performance",
                                            "description": f"Analyze why {highest_cat} has the highest average {metric_col.replace('_', ' ')} to identify best practices that could be applied to other categories",
                                            "priority": "high",
                                            "impact": "high"
                                        })
                                        
                                        if len(sorted_cats) > 1:
                                            recommendations.append({
                                                "title": f"Address {lowest_cat} Gap",
                                                "description": f"Review {lowest_cat} to understand why it has the lowest average and develop strategies to improve performance",
                                                "priority": "high",
                                                "impact": "high"
                                            })
                        elif numeric_cols:
                            # General numeric analysis
                            metric_col = numeric_cols[0]
                            values = [float(row.get(metric_col, 0)) for row in query_result if row.get(metric_col) is not None]
                            
                            if values:
                                avg_val = sum(values) / len(values)
                                max_val = max(values)
                                min_val = min(values)
                                
                                def format_currency(v):
                                    if v >= 1000000:
                                        return f"${v/1000000:.2f}M"
                                    elif v >= 1000:
                                        return f"${v/1000:.2f}K"
                                    else:
                                        return f"${v:,.2f}"
                                
                                executive_summary = f"Average {metric_col.replace('_', ' ')} is {format_currency(avg_val)} across {row_count} records, ranging from {format_currency(min_val)} to {format_currency(max_val)}"
                                
                                insights.append({
                                    "type": "kpi",
                                    "title": f"Average {metric_col.replace('_', ' ').title()}",
                                    "description": f"The average {metric_col.replace('_', ' ')} is {format_currency(avg_val)} with a range from {format_currency(min_val)} to {format_currency(max_val)}",
                                    "confidence": 0.9,
                                    "impact": "high"
                                })
                                
                                if max_val > avg_val * 1.5:
                                    insights.append({
                                        "type": "anomaly",
                                        "title": "Outliers Detected",
                                        "description": f"Maximum value ({format_currency(max_val)}) is significantly higher than average, indicating potential outliers or exceptional cases",
                                        "confidence": 0.8,
                                        "impact": "medium"
                                    })
                        else:
                            # Generic summary
                            executive_summary = f"Analysis of {row_count} records across {len(cols)} dimensions"
                    
                    # If no insights generated yet, add basic ones
                    if not insights:
                        insights.append({
                            "type": "data_quality",
                            "title": "Data Analysis Complete",
                            "description": f"Successfully analyzed {row_count} records with {len(cols)} columns",
                            "confidence": 0.9,
                            "impact": "medium"
                        })
                    
                    # If no recommendations, add generic one
                    if not recommendations:
                        recommendations.append({
                            "title": "Explore Further",
                            "description": "Consider drilling down into specific dimensions or time periods for deeper insights",
                            "priority": "medium",
                            "impact": "medium"
                        })
                
                # Update state with insights - ALWAYS set, even if empty
                # CRITICAL: Normalize insights to ensure they're dictionaries, not strings
                state["insights"] = normalize_insights(insights) if isinstance(insights, list) and insights else []
                state["recommendations"] = normalize_insights(recommendations) if isinstance(recommendations, list) and recommendations else []
                if executive_summary:
                    state["executive_summary"] = executive_summary
                elif query_result and len(query_result) > 0:
                    # Ensure we always have an executive summary
                    row_count = len(query_result)
                    state["executive_summary"] = f"Analysis completed for {row_count} record{'s' if row_count != 1 else ''}."
                
                logger.info(f"✅ Intelligent insights generated: {len(state['insights'])} insights, {len(state['recommendations'])} recommendations")
            except Exception as insights_err:
                logger.warning(f"⚠️ Intelligent insights generation failed: {insights_err}", exc_info=True)
                # CRITICAL: Ensure insights are always set, even on error - normalize existing ones
                existing_insights = state.get("insights", [])
                existing_recommendations = state.get("recommendations", [])
                state["insights"] = normalize_insights(existing_insights) if isinstance(existing_insights, list) else []
                state["recommendations"] = normalize_insights(existing_recommendations) if isinstance(existing_recommendations, list) else []
                if not state.get("executive_summary") and query_result and len(query_result) > 0:
                    state["executive_summary"] = f"Analysis completed for {len(query_result)} record{'s' if len(query_result) != 1 else ''}."
        
        # FINAL CHECK: Ensure insights are always present in state
        if "insights" not in state or not state["insights"]:
            state["insights"] = [{
                "type": "data_quality",
                "title": "Analysis Complete",
                "description": f"Successfully processed query: {query}",
                "confidence": 0.9,
                "impact": "medium"
            }]
            logger.info("✅ Added default insight to ensure state completeness")
        
        if "recommendations" not in state or not state["recommendations"]:
            state["recommendations"] = [{
                "title": "Explore Further",
                "description": "Consider refining your query or exploring different dimensions for deeper insights",
                "priority": "medium",
                "impact": "medium"
            }]
        
        if not state.get("executive_summary"):
            state["executive_summary"] = f"Analysis completed for your query: {query}"
        
        # CRITICAL: Final normalization before returning state (ensures validator never sees strings)
        # Normalize any existing insights/recommendations one final time
        if "insights" in state:
            state["insights"] = normalize_insights(state["insights"]) if isinstance(state.get("insights"), list) else []
        if "recommendations" in state:
            state["recommendations"] = normalize_insights(state["recommendations"]) if isinstance(state.get("recommendations"), list) else []
        
        return state
        
    except Exception as e:
        logger.error(f"❌ Unified chart+insights node failed: {e}", exc_info=True)
        state["error"] = f"Unified generation error: {str(e)}"
        state["chart_generation_error"] = str(e)
        state["insights_generation_error"] = str(e)
        
        # CRITICAL: Ensure insights are always set, even on critical error
        if "insights" not in state or not state["insights"]:
            state["insights"] = [{
                "type": "data_quality",
                "title": "Analysis Encountered Issues",
                "description": f"An error occurred during analysis: {str(e)[:100]}",
                "confidence": 0.5,
                "impact": "low"
            }]
        
        if "recommendations" not in state or not state["recommendations"]:
            state["recommendations"] = [{
                "title": "Retry Analysis",
                "description": "Please try rephrasing your query or try again later",
                "priority": "medium",
                "impact": "medium"
            }]
        
        if not state.get("executive_summary"):
            query = state.get("query", "your query")
            state["executive_summary"] = f"Analysis encountered an error while processing: {query}"
        
        return state

