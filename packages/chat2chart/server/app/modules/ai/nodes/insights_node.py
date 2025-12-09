"""
Insights Generation Node for LangGraph Workflow

Generates business insights from query results.
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
    """Convert string insights to dictionary format"""
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


def _generate_intelligent_insights(query_result: List[Dict], query: str) -> Dict[str, Any]:
    """
    Generate intelligent, meaningful insights from query results.
    
    Returns:
        Dict with 'insights', 'recommendations', and 'executive_summary'
    """
    insights = []
    recommendations = []
    executive_summary = ""
    
    if not query_result or len(query_result) == 0:
        return {"insights": insights, "recommendations": recommendations, "executive_summary": executive_summary}
    
    if not isinstance(query_result[0], dict):
        return {"insights": insights, "recommendations": recommendations, "executive_summary": executive_summary}
    
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
            elif any(word in col.lower() for word in ['date', 'time', 'month', 'year', 'week', 'day']):
                date_cols.append(col)
            else:
                text_cols.append(col)
    
    # Analyze query intent
    query_lower = query.lower()
    is_average_query = 'average' in query_lower or 'avg' in query_lower or 'mean' in query_lower
    is_by_query = 'by' in query_lower or 'group' in query_lower
    
    # Generate meaningful executive summary
    if row_count == 1:
        values = {k: v for k, v in query_result[0].items() if v is not None}
        if values:
            metric_col = None
            for col in numeric_cols:
                if col in values:
                    metric_col = col
                    break
            
            if metric_col:
                value = values[metric_col]
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
        if is_average_query and is_by_query and numeric_cols and text_cols:
            category_col = text_cols[0]
            metric_col = numeric_cols[0]
            
            if category_col and metric_col:
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
                    category_avgs = {cat: total / category_counts[cat] for cat, total in category_totals.items()}
                    sorted_cats = sorted(category_avgs.items(), key=lambda x: x[1], reverse=True)
                    
                    if len(sorted_cats) > 0:
                        highest_cat, highest_avg = sorted_cats[0]
                        lowest_cat, lowest_avg = sorted_cats[-1]
                        
                        def format_currency(v):
                            if v >= 1000000:
                                return f"${v/1000000:.2f}M"
                            elif v >= 1000:
                                return f"${v/1000:.2f}K"
                            else:
                                return f"${v:,.2f}"
                        
                        executive_summary = f"Average {metric_col.replace('_', ' ')} varies by {category_col.replace('_', ' ')}: {highest_cat} has the highest at {format_currency(highest_avg)}, while {lowest_cat} has the lowest at {format_currency(lowest_avg)}"
                        
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
                                "description": f"Average {metric_col.replace('_', ' ')} ranges from {format_currency(lowest_avg)} ({lowest_cat}) to {format_currency(highest_avg)} ({highest_cat})",
                                "confidence": 0.85,
                                "impact": "medium"
                            })
                            
                            recommendations.append({
                                "title": f"Investigate {highest_cat} Performance",
                                "description": f"Analyze why {highest_cat} has the highest average to identify best practices",
                                "priority": "high",
                                "impact": "high"
                            })
                            
                            recommendations.append({
                                "title": f"Address {lowest_cat} Gap",
                                "description": f"Review {lowest_cat} to understand the performance gap and develop improvement strategies",
                                "priority": "high",
                                "impact": "high"
                            })
        elif numeric_cols:
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
        else:
            executive_summary = f"Analysis of {row_count} records across {len(cols)} dimensions"
    
    # Fallback if no insights generated
    if not insights:
        insights.append({
            "type": "data_quality",
            "title": "Data Analysis Complete",
            "description": f"Successfully analyzed {row_count} records with {len(cols)} columns",
            "confidence": 0.9,
            "impact": "medium"
        })
    
    if not recommendations:
        recommendations.append({
            "title": "Explore Further",
            "description": "Consider drilling down into specific dimensions for deeper insights",
            "priority": "medium",
            "impact": "medium"
        })
    
    return {
        "insights": insights,
        "recommendations": recommendations,
        "executive_summary": executive_summary
    }


@validate_state_transition(validate_input=True, validate_output=True)
@handle_node_errors(retry_on_error=True, max_retries=2)
async def insights_node(
    state: AiserWorkflowState,
    litellm_service: Any,
    session_factory: Any = None
) -> AiserWorkflowState:
    """
    Generate business insights from query results.
    
    Args:
        state: Current workflow state
        litellm_service: LiteLLM service
    
    Returns:
        Updated state with insights
    """
    query_result = state.get("query_result", [])
    query = state.get("query", "")
    agent_context = state.get("agent_context", {})
    
    # CRITICAL: Normalize any existing insights in state (in case they're strings from previous nodes)
    existing_insights = state.get("insights", [])
    existing_recommendations = state.get("recommendations", [])
    if existing_insights:
        state["insights"] = normalize_insights(existing_insights) if isinstance(existing_insights, list) else []
    if existing_recommendations:
        state["recommendations"] = normalize_insights(existing_recommendations) if isinstance(existing_recommendations, list) else []
    
    # CRITICAL: Only generate insights if we have query results
    if not query_result or not isinstance(query_result, list) or len(query_result) == 0:
        error_msg = "Cannot generate insights: no query result data available"
        logger.warning(f"⚠️ {error_msg}")
        state["error"] = error_msg
        state["insights_generation_error"] = error_msg
        return state
    
    try:
        # Import insights agent
        from app.modules.ai.agents.insights_agent import BusinessInsightsAgent
        from app.modules.chats.schemas import AgentContextSchema
        from sqlalchemy.orm import sessionmaker
        
        # CRITICAL: BusinessInsightsAgent requires session_factory
        if session_factory is None:
            # Create a default sessionmaker if not provided
            from app.db.session import get_sync_session, get_sync_engine
            try:
                sync_session = get_sync_session()
                if hasattr(sync_session, 'bind') and sync_session.bind:
                    session_factory = sessionmaker(bind=sync_session.bind)
                else:
                    # Fallback to engine
                    engine = get_sync_engine()
                    session_factory = sessionmaker(bind=engine)
            except Exception as e:
                logger.warning(f"⚠️ Could not create session_factory from get_sync_session: {e}")
                session_factory = None
        
        if session_factory is None:
            logger.warning("⚠️ No session_factory provided for BusinessInsightsAgent, creating fallback")
            # Fallback: create a minimal sessionmaker
            try:
                from app.db.session import get_sync_engine
                engine = get_sync_engine()
                session_factory = sessionmaker(bind=engine)
            except Exception:
                logger.error("❌ Failed to create session_factory for BusinessInsightsAgent")
                state["error"] = "Failed to initialize insights agent: session_factory required"
                return state
        
        # CRITICAL: Wrap litellm_service to remove api_version before passing to BusinessInsightsAgent
        # BusinessInsightsAgent uses LangChain which may pass api_version to LiteLLM
        from app.modules.ai.services.litellm_service import LiteLLMService
        
        # Create a wrapper that ensures api_version is never passed
        class SafeLiteLLMService:
            """Wrapper around LiteLLMService that ensures api_version is never passed"""
            def __init__(self, wrapped_service):
                self._wrapped = wrapped_service
                # Copy all attributes
                for attr in dir(wrapped_service):
                    if not attr.startswith('_'):
                        try:
                            setattr(self, attr, getattr(wrapped_service, attr))
                        except:
                            pass
            
            async def generate_completion(self, *args, **kwargs):
                """Remove api_version from kwargs before calling wrapped service"""
                kwargs.pop('api_version', None)
                if 'extra_headers' in kwargs and isinstance(kwargs['extra_headers'], dict):
                    kwargs['extra_headers'].pop('api-version', None)
                return await self._wrapped.generate_completion(*args, **kwargs)
        
        safe_litellm = SafeLiteLLMService(litellm_service)
        
        insights_agent = BusinessInsightsAgent(litellm_service=safe_litellm, session_factory=session_factory)
        
        # Build agent context if available
        context = None
        if agent_context:
            try:
                context = AgentContextSchema(**agent_context)
            except Exception:
                context = None
        
        logger.info(f"💡 Generating insights from {len(query_result)} rows of data")
        
        # Generate insights with error handling for api_version
        try:
            insights_result = await insights_agent.generate_insights(
                data=query_result,
                query_context=query,
                context=context
            )
        except TypeError as e:
            if 'api_version' in str(e):
                logger.error(f"❌ api_version error in insights generation: {e}")
                # Fallback to direct LLM call
                logger.warning("⚠️ Falling back to direct LLM call for insights")
                raise  # Let the fallback logic handle it
            else:
                raise
        
        # Extract insights
        if isinstance(insights_result, dict):
            insights = insights_result.get("insights", [])
            recommendations = insights_result.get("recommendations", [])
            executive_summary = insights_result.get("executive_summary", "")
            
            if insights or recommendations or executive_summary:
                state["insights"] = normalize_insights(insights) if isinstance(insights, list) else []
                state["recommendations"] = normalize_insights(recommendations) if isinstance(recommendations, list) else []
                state["executive_summary"] = executive_summary
                state["current_stage"] = "insights_generated"
                state["progress_percentage"] = 90.0
                state["progress_message"] = f"Insights generated: {len(insights)} insights, {len(recommendations)} recommendations"
                
                # Update execution metadata
                metadata = state.get("execution_metadata", {})
                metadata["confidence_scores"] = metadata.get("confidence_scores", {})
                metadata["confidence_scores"]["insights_generation"] = insights_result.get("confidence_scores", {}).get("overall", 0.8)
                state["execution_metadata"] = metadata
                
                logger.info(f"✅ Insights generated: {len(insights)} insights, {len(recommendations)} recommendations")
            else:
                # CRITICAL: Use LLM fallback if agent failed but we have data
                logger.warning("⚠️ Insights agent returned no insights, using LLM fallback")
                if query_result and len(query_result) > 0:
                    try:
                        # Use direct LLM call for insights generation
                        data_sample = query_result[:20] if len(query_result) > 20 else query_result
                        cols = list(query_result[0].keys()) if query_result else []
                        
                        insights_prompt = f"""You are an expert business intelligence analyst.

**User Query:** {query}

**Data Summary:**
- Rows: {len(query_result)}
- Columns: {', '.join(cols)}
- Sample data: {json.dumps(data_sample, default=str)}

**Your Task:**
Generate meaningful business insights, recommendations, and an executive summary that directly answers the user's question.

**Requirements:**
- Analyze the actual data, not generic statements
- For "average by X" queries: Show which category has highest/lowest, calculate variance
- Provide actionable recommendations based on findings
- Executive summary should directly answer the user's question with actual values

**Output Format (JSON only):**
{{
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
}}"""
                        
                        llm_result = await litellm_service.generate_completion(
                            prompt=insights_prompt,
                            system_context="You are an expert data analyst. Return ONLY valid JSON conforming to the specified format. Do not include any text outside the JSON.",
                            max_tokens=3000,
                            temperature=0.3
                        )
                        
                        if llm_result.get("success") and llm_result.get("content"):
                            content = llm_result.get("content", "").strip()
                            try:
                                intelligent_result = json.loads(content)
                            except json.JSONDecodeError:
                                json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
                                if json_match:
                                    intelligent_result = json.loads(json_match.group(1))
                                else:
                                    json_match = re.search(r'\{[\s\S]*\}', content, re.DOTALL)
                                    if json_match:
                                        intelligent_result = json.loads(json_match.group(0))
                                    else:
                                        raise ValueError("No valid JSON found")
                            
                            insights = intelligent_result.get("insights", [])
                            recommendations = intelligent_result.get("recommendations", [])
                            executive_summary = intelligent_result.get("executive_summary", "")
                            
                            state["insights"] = normalize_insights(insights) if isinstance(insights, list) else []
                            state["recommendations"] = normalize_insights(recommendations) if isinstance(recommendations, list) else []
                            state["executive_summary"] = executive_summary if isinstance(executive_summary, str) else ""
                            state["current_stage"] = "insights_generated"
                            state["progress_percentage"] = 90.0
                            state["progress_message"] = f"LLM fallback insights generated: {len(state['insights'])} insights"
                            logger.info(f"✅ LLM fallback insights generated: {len(state['insights'])} insights, {len(state['recommendations'])} recommendations")
                        else:
                            # Final fallback to intelligent analysis if LLM fails
                            logger.warning("⚠️ LLM fallback failed, using intelligent analysis")
                            intelligent_result = _generate_intelligent_insights(query_result, query)
                            state["insights"] = normalize_insights(intelligent_result.get("insights", []))
                            state["recommendations"] = normalize_insights(intelligent_result.get("recommendations", []))
                            state["executive_summary"] = intelligent_result["executive_summary"]
                            state["current_stage"] = "insights_generated"
                            state["progress_percentage"] = 90.0
                            state["progress_message"] = f"Intelligent fallback insights generated: {len(intelligent_result['insights'])} insights"
                    except Exception as llm_err:
                        logger.warning(f"⚠️ LLM fallback failed: {llm_err}, using intelligent analysis", exc_info=True)
                        intelligent_result = _generate_intelligent_insights(query_result, query)
                        state["insights"] = normalize_insights(intelligent_result.get("insights", []))
                        state["recommendations"] = normalize_insights(intelligent_result.get("recommendations", []))
                        state["executive_summary"] = intelligent_result.get("executive_summary", "")
                        state["current_stage"] = "insights_generated"
                        state["progress_percentage"] = 90.0
                        state["progress_message"] = f"Intelligent fallback insights generated: {len(intelligent_result['insights'])} insights"
                else:
                    error_msg = insights_result.get("error", "Insights generation failed - no insights returned")
                    state["error"] = error_msg
                    state["insights_generation_error"] = error_msg
                    logger.error(f"❌ Insights generation failed: {error_msg}")
        else:
            # CRITICAL: Generate intelligent fallback insights if format is unexpected but we have data
            logger.warning("⚠️ Insights generation returned unexpected format, generating intelligent fallback insights")
            if query_result and len(query_result) > 0:
                intelligent_result = _generate_intelligent_insights(query_result, query)
                insights = intelligent_result["insights"]
                recommendations = intelligent_result["recommendations"]
                executive_summary = intelligent_result["executive_summary"]
                
                state["insights"] = normalize_insights(insights) if isinstance(insights, list) else []
                state["recommendations"] = normalize_insights(recommendations) if isinstance(recommendations, list) else []
                state["executive_summary"] = executive_summary
                state["current_stage"] = "insights_generated"
                state["progress_percentage"] = 90.0
                state["progress_message"] = f"Intelligent fallback insights generated: {len(insights)} insights"
                logger.info(f"✅ Intelligent fallback insights generated: {len(insights)} insights, {len(recommendations)} recommendations")
            else:
                error_msg = "Insights generation returned unexpected format"
                state["error"] = error_msg
                state["insights_generation_error"] = error_msg
                logger.error(f"❌ {error_msg}")
        
        return state
        
    except Exception as e:
        logger.error(f"❌ Insights generation node failed: {e}", exc_info=True)
        # CRITICAL: Generate intelligent fallback insights even on error if we have data
        query_result = state.get("query_result", [])
        query = state.get("query", "")
        if query_result and len(query_result) > 0:
            logger.warning("⚠️ Generating intelligent fallback insights after error")
            intelligent_result = _generate_intelligent_insights(query_result, query)
            insights = intelligent_result["insights"]
            recommendations = intelligent_result["recommendations"]
            executive_summary = intelligent_result["executive_summary"]
            
            state["insights"] = normalize_insights(insights) if isinstance(insights, list) else []
            state["recommendations"] = normalize_insights(recommendations) if isinstance(recommendations, list) else []
            state["executive_summary"] = executive_summary
            state["current_stage"] = "insights_generated"
            state["progress_percentage"] = 95.0
            state["progress_message"] = f"Intelligent fallback insights generated: {len(insights)} insights"
            logger.info(f"✅ Intelligent fallback insights generated after error: {len(insights)} insights, {len(recommendations)} recommendations")
        else:
            state["error"] = f"Insights generation error: {str(e)}"
            state["insights_generation_error"] = str(e)
        return state

