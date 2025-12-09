"""
Chart Generation Node for LangGraph Workflow

Generates ECharts configuration from query results.
"""

import logging
from typing import Any, Optional, List, Dict

from app.modules.ai.schemas.graph_state import AiserWorkflowState
from app.modules.ai.services.langgraph_base import (
    validate_state_transition,
    handle_node_errors
)

logger = logging.getLogger(__name__)


@validate_state_transition(validate_input=True, validate_output=True)
@handle_node_errors(retry_on_error=True, max_retries=2)
async def chart_generation_node(
    state: AiserWorkflowState,
    litellm_service: Any,
    session_factory: Any = None
) -> AiserWorkflowState:
    """
    Generate chart from query results.
    
    Args:
        state: Current workflow state
        litellm_service: LiteLLM service
        session_factory: SQLAlchemy session factory (optional)
    
    Returns:
        Updated state with chart configuration
    """
    query_result = state.get("query_result", [])
    query = state.get("query", "")
    
    # CRITICAL: Check if we already have a valid chart config from file analysis
    existing_config = state.get("echarts_config")
    if existing_config and isinstance(existing_config, dict):
        # Validate the config has series with data
        series = existing_config.get("series", [])
        if series and isinstance(series, list) and len(series) > 0:
            # Check if series has data
            first_series = series[0] if isinstance(series[0], dict) else {}
            if first_series.get("data") and len(first_series.get("data", [])) > 0:
                logger.info("✅ Using existing valid chart config from file analysis")
                state["current_stage"] = "chart_generated"
                state["progress_percentage"] = 80.0
                state["progress_message"] = "Chart ready from file analysis"
                return state
    
    # CRITICAL: Only generate chart if we have query results
    if not query_result or not isinstance(query_result, list) or len(query_result) == 0:
        error_msg = "Cannot generate chart: no query result data available"
        logger.warning(f"⚠️ {error_msg}")
        state["error"] = error_msg
        state["chart_generation_error"] = error_msg
        # CRITICAL: Still set a user-friendly message
        state["message"] = "I couldn't generate a chart because there's no data available. Please check your data source."
        state["analysis"] = state["message"]
        state["narration"] = state["message"]
        return state
    
    try:
        # Import chart generation agent
        from app.modules.ai.agents.chart_generation_agent import IntelligentChartGenerationAgent
        from sqlalchemy.orm import sessionmaker
        from app.db.session import get_sync_session, get_sync_engine
        
        # CRITICAL: IntelligentChartGenerationAgent requires session_factory, not chart_service
        if session_factory is None:
            # Create a default sessionmaker if not provided
            try:
                sync_session = get_sync_session()
                if hasattr(sync_session, 'bind') and sync_session.bind:
                    session_factory = sessionmaker(bind=sync_session.bind)
                else:
                    # Fallback to engine
                    engine = get_sync_engine()
                    session_factory = sessionmaker(bind=engine)
            except Exception as e:
                logger.warning(f"⚠️ Could not create session_factory: {e}")
                # Last resort: create minimal sessionmaker
                engine = get_sync_engine()
                session_factory = sessionmaker(bind=engine)
        
        chart_agent = IntelligentChartGenerationAgent(
            litellm_service=litellm_service,
            session_factory=session_factory
        )
        
        logger.info(f"📊 Generating chart from {len(query_result)} rows of data")
        
        # Generate chart
        chart_result = await chart_agent.generate_chart(
            data=query_result,
            query_intent=query,
            title=state.get("chart_title") or query,
            context=None,  # Can be enhanced with agent_context
            use_llm_based=True
        )
        
        # Extract chart config
        if isinstance(chart_result, dict):
            echarts_config = chart_result.get("echarts_config") or chart_result.get("primary_chart")
            chart_type = chart_result.get("chart_type") or "bar"
            chart_title = chart_result.get("chart_title") or query
            
            if echarts_config:
                state["echarts_config"] = echarts_config
                state["chart_data"] = query_result
                state["chart_type"] = chart_type
                state["chart_title"] = chart_title
                state["current_stage"] = "chart_generated"
                state["progress_percentage"] = 80.0
                state["progress_message"] = f"Chart generated: {chart_type}"
                
                # Update execution metadata
                metadata = state.get("execution_metadata", {})
                metadata["confidence_scores"] = metadata.get("confidence_scores", {})
                metadata["confidence_scores"]["chart_generation"] = chart_result.get("confidence", 0.8)
                state["execution_metadata"] = metadata
                
                logger.info(f"✅ Chart generated: {chart_type}")
            else:
                error_msg = chart_result.get("error", "Chart generation failed - no config returned")
                state["error"] = error_msg
                state["chart_generation_error"] = error_msg
                logger.error(f"❌ Chart generation failed: {error_msg}")
        else:
            error_msg = "Chart generation returned unexpected format"
            state["error"] = error_msg
            state["chart_generation_error"] = error_msg
            logger.error(f"❌ {error_msg}")
        
        return state
        
    except Exception as e:
        logger.error(f"❌ Chart generation node failed: {e}", exc_info=True)
        error_msg = f"Chart generation error: {str(e)}"
        state["error"] = error_msg
        state["chart_generation_error"] = str(e)
        state["current_stage"] = "chart_generation_error"
        # CRITICAL: Ensure user gets a message even on failure
        from app.modules.ai.services.langgraph_orchestrator import _make_error_user_friendly
        user_message = _make_error_user_friendly(error_msg, {"query": state.get("query", "")})
        state["message"] = user_message
        state["analysis"] = user_message
        state["narration"] = user_message
        return state

