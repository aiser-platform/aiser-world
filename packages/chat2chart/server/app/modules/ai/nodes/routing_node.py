"""
Routing Node for LangGraph Workflow

Intelligently routes queries to appropriate workflow paths using LiteLLM.
"""

import json
import logging
import re
from typing import Dict, Any

from app.modules.ai.schemas.graph_state import AiserWorkflowState
from app.modules.ai.services.langgraph_base import (
    validate_state_transition,
    handle_node_errors
)
from app.modules.chats.schemas import AgentContextSchema, LangChainMemorySchema

logger = logging.getLogger(__name__)


@validate_state_transition(validate_input=True, validate_output=True, snapshot_after=True)
@handle_node_errors()
async def route_query_node(
    state: AiserWorkflowState,
    litellm_service: Any,
    context_service: Any = None
) -> AiserWorkflowState:
    """
    Route query to appropriate workflow path using LiteLLM for intelligent routing.
    
    Args:
        state: Current workflow state
        litellm_service: LiteLLM service for LLM calls
        context_service: Optional context enrichment service
    
    Returns:
        Updated state with routing decision
    """
    query = state.get("query", "")
    data_source_id = state.get("data_source_id")
    agent_context_dict = state.get("agent_context", {})
    analysis_mode = agent_context_dict.get("analysis_mode", "standard")
    
    # CRITICAL: If no data_source_id, act as supervisor/coordinator for conversational mode
    if not data_source_id:
        logger.warning("⚠️ No data_source_id provided - supervisor agent will handle conversational mode")
        state["current_stage"] = "supervisor_conversational"
        state["progress_percentage"] = 5.0
        state["progress_message"] = "Supervisor agent analyzing request..."
        # Supervisor agent: Intelligent conversational AI that can coordinate with other agents
        try:
            # Use the provided litellm_service instead of creating a new one
            if not litellm_service:
                from app.modules.ai.services.litellm_service import LiteLLMService
                litellm = LiteLLMService()
            else:
                litellm = litellm_service
            
            # Supervisor system prompt: AI that can coordinate, plan, and have conversations
            supervisor_prompt = """You are an AI Supervisor and Coordinator for the Aiser data analytics platform. Your role is to:

1. **Intelligent Conversation**: Have natural, helpful conversations with users about their data analysis needs
2. **Planning & Coordination**: When users ask about data analysis, help them understand what's needed and plan the analysis
3. **Agent Management**: You coordinate with specialized AI agents (SQL generation, chart creation, insights) but can work independently for conversations
4. **Context Awareness**: Understand when users need data analysis (requires data source) vs. general questions (can answer directly)

**Current Situation**: The user has not selected a data source yet. You can:
- Answer general questions about data analysis, the platform, or best practices
- Help users understand what data sources they need
- Guide users on how to formulate good data analysis questions
- Have natural conversations about their business needs

**When Data Source is Available**: You coordinate with specialized agents:
- NL2SQL Agent: Converts questions to SQL queries
- Chart Generation Agent: Creates visualizations
- Insights Agent: Generates business insights

**Your Response Style**: Be helpful, clear, and conversational. If the user asks a data analysis question without a data source, explain what's needed and offer to help once they select a data source."""
            
            response = await litellm.generate_completion(
                prompt=query,
                system_context=supervisor_prompt,
                max_tokens=800,
                temperature=0.7
            )
            if response.get("success") and response.get("content"):
                content = response.get("content", "")
                # Enhance response to be more supervisor-like
                if "data" in query.lower() or "analyze" in query.lower() or "chart" in query.lower() or "insight" in query.lower():
                    enhanced_content = f"{content}\n\n💡 **To perform data analysis**, please select a data source from the Data Sources panel. Once selected, I can coordinate with my specialized agents to:\n- Generate SQL queries from your questions\n- Create visualizations and charts\n- Provide business insights and recommendations"
                else:
                    enhanced_content = content
                
                state["message"] = enhanced_content
                state["narration"] = enhanced_content
                state["current_stage"] = "supervisor_conversational_complete"
                state["progress_percentage"] = 100.0
                state["progress_message"] = "Supervisor agent response generated"
                logger.info("✅ Supervisor agent generated conversational response (no data source)")
            else:
                # Fallback if LLM returns empty or fails
                error_msg = response.get("error", "Empty response")
                logger.warning(f"⚠️ Supervisor LLM response failed: {error_msg}")
                state["error"] = f"Failed to generate supervisor response: {error_msg}"
                state["message"] = f"I understand you're asking: {query}. To perform data analysis, please select a data source first. I'm here to help coordinate the analysis once you do!"
                state["narration"] = state["message"]
        except Exception as e:
            logger.error(f"❌ Supervisor agent response generation failed: {e}", exc_info=True)
            state["message"] = f"I understand you're asking: {query}. To perform data analysis, please select a data source first. I'm here to help coordinate the analysis once you do!"
            state["narration"] = state["message"]
        return state
    
    try:
        # Update progress
        state["progress_percentage"] = 5.0
        state["progress_message"] = "Analyzing query and routing to appropriate workflow..."
        
        # Build routing prompt
        routing_prompt = _build_routing_prompt(query, agent_context_dict, analysis_mode)
        
        # Get LLM routing decision using LiteLLM
        messages = [
            {"role": "system", "content": routing_prompt},
            {"role": "user", "content": f"Route this query: {query}"}
        ]
        
        response = await litellm_service.generate_completion(
            messages=messages,
            model_id=None,  # Use default model
            temperature=0.3,  # Low temperature for deterministic routing
            max_tokens=1000  # Increased to prevent max_tokens errors
        )
        
        # Parse routing decision
        # response is a dict with 'content' key from generate_completion
        if isinstance(response, dict):
            response_content = response.get("content", "")
            if not response_content and response.get("success", False):
                # Try to get the actual content from the response
                response_content = str(response)
        else:
            response_content = str(response)
        
        routing_decision = _parse_routing_decision(response_content)
        
        # Update state with routing decision
        metadata = state.get("execution_metadata", {})
        metadata["routing_decision"] = routing_decision
        state["execution_metadata"] = metadata
        
        # Update progress
        state["progress_percentage"] = 10.0
        state["progress_message"] = f"Query routed to {routing_decision.get('primary_agent', 'nl2sql')} agent"
        
        # Set routing flags in state
        primary_agent = routing_decision.get("primary_agent", "nl2sql")
        
        # Determine if we need SQL generation
        if primary_agent == "nl2sql" or "sql" in query.lower() or state.get("data_source_id"):
            # Need SQL generation
            state["current_stage"] = "routed_to_nl2sql"
        elif primary_agent == "chart_generation" or any(kw in query.lower() for kw in ["chart", "graph", "visualize", "plot"]):
            # Direct chart generation
            state["current_stage"] = "routed_to_chart"
        elif primary_agent == "insights" or any(kw in query.lower() for kw in ["insight", "analyze", "trend", "recommendation"]):
            # Direct insights
            state["current_stage"] = "routed_to_insights"
        else:
            # Default: need SQL
            state["current_stage"] = "routed_to_nl2sql"
        
        logger.info(f"✅ Query routed: {primary_agent}, strategy: {routing_decision.get('execution_strategy')}")
        
        return state
        
    except Exception as e:
        logger.error(f"❌ Routing failed: {e}", exc_info=True)
        state["error"] = f"Routing error: {str(e)}"
        # Default to NL2SQL path
        state["current_stage"] = "routed_to_nl2sql"
        return state


def _build_routing_prompt(
    query: str,
    agent_context: Dict[str, Any],
    analysis_mode: str = "standard"
) -> str:
    """Build comprehensive routing prompt with context."""
    
    available_agents = {
        "nl2sql": {
            "name": "SQL Query Agent",
            "description": "Converts natural language to SQL queries and executes them",
            "capabilities": ["sql_generation", "query_execution", "data_analysis"]
        },
        "chart_generation": {
            "name": "Chart Generation Agent",
            "description": "Creates visualizations and charts from data",
            "capabilities": ["visualization", "chart_creation", "data_visualization"]
        },
        "insights": {
            "name": "Business Insights Agent",
            "description": "Generates business insights and recommendations",
            "capabilities": ["insight_generation", "trend_analysis", "recommendations"]
        }
    }
    
    prompt_parts = [
        "You are an intelligent agent router for a multi-agent AI system.",
        "Your task is to analyze user queries and determine which agent(s) should handle them.",
        "",
        "Available Agents:",
    ]
    
    for agent_id, agent_info in available_agents.items():
        prompt_parts.append(f"- {agent_id}: {agent_info['description']}")
        prompt_parts.append(f"  Capabilities: {', '.join(agent_info['capabilities'])}")
        prompt_parts.append("")
    
    prompt_parts.extend([
        "Context Information:",
        f"- User Role: {agent_context.get('user_role', 'user')}",
        f"- Organization: {agent_context.get('organization_id', 'unknown')}",
        f"- Analysis Mode: {analysis_mode}",
        "",
        "Routing Rules:",
        "1. If query requires data from database/warehouse → use nl2sql",
        "2. If query asks for visualization/chart → use chart_generation (may need nl2sql first)",
        "3. If query asks for insights/analysis/recommendations → use insights (may need data first)",
        "4. Most queries will need nl2sql → execute_query → chart → insights workflow",
        "",
        "Response Format (JSON only, no markdown):",
        "{",
        '  "primary_agent": "nl2sql|chart_generation|insights",',
        '  "execution_strategy": "sequential",',
        '  "reasoning": "brief explanation",',
        '  "confidence": 0.0-1.0',
        "}"
    ])
    
    return "\n".join(prompt_parts)


def _parse_routing_decision(response: str) -> Dict[str, Any]:
    """Parse LLM routing decision from response."""
    try:
        # Clean the response - remove markdown code blocks if present
        cleaned_response = response.strip()
        if '```json' in cleaned_response:
            cleaned_response = cleaned_response.split('```json')[1].split('```')[0].strip()
        elif '```' in cleaned_response:
            cleaned_response = cleaned_response.split('```')[1].split('```')[0].strip()
        
        # Extract JSON from response
        json_start = cleaned_response.find('{')
        json_end = cleaned_response.rfind('}') + 1
        if json_start == -1 or json_end == 0:
            # Try regex to find JSON
            json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', cleaned_response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
            else:
                raise ValueError("No JSON found in response")
        else:
            json_str = cleaned_response[json_start:json_end]
        
        # Clean JSON string
        json_str = re.sub(r',\s*}', '}', json_str)
        json_str = re.sub(r',\s*]', ']', json_str)
        
        # Parse JSON
        decision = json.loads(json_str)
        
        # Validate and set defaults
        return {
            "primary_agent": decision.get("primary_agent", "nl2sql"),
            "execution_strategy": decision.get("execution_strategy", "sequential"),
            "reasoning": decision.get("reasoning", "Default routing"),
            "confidence": decision.get("confidence", 0.7)
        }
    except (json.JSONDecodeError, KeyError, ValueError) as e:
        logger.warning(f"Failed to parse routing decision: {e}")
        logger.debug(f"Response was: {response[:200]}...")
    
    # Fallback to default routing
    return {
        "primary_agent": "nl2sql",
        "execution_strategy": "sequential",
        "reasoning": "Fallback routing due to parsing error",
        "confidence": 0.5
    }

