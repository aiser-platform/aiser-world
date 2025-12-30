"""
LangGraph Multi-Agent Orchestrator for Aiser Platform

Enterprise-grade workflow orchestration using LangGraph StateGraph with:
- Explicit graph-based workflow definition
- Built-in retry mechanisms with exponential backoff
- Full observability (callbacks + streaming)
- Type-safe state management with Pydantic validation
- State versioning and audit trails
"""

import json
import logging
import re
import time
from typing import Any, Dict, List, Optional, Callable
from datetime import datetime

try:
    from langgraph.graph import StateGraph, END, START
    from langgraph.checkpoint.memory import MemorySaver
    from langgraph.prebuilt import ToolNode
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.error("❌ LangGraph not available. Install with: pip install langgraph>=0.2.0")

from app.modules.ai.schemas.graph_state import (
    AiserWorkflowState,
    AiserWorkflowStateValidator,
    migrate_state,
    validate_state_version
)
from app.modules.ai.services.langgraph_base import (
    BaseLangGraphNode,
    validate_state_transition,
    handle_node_errors,
    get_retry_config,
    StateSnapshotManager,
    emit_state_event,
    RETRY_CONFIGS
)
from app.modules.ai.services.litellm_service import LiteLLMService
from app.modules.chats.schemas import AgentContextSchema, LangChainMemorySchema

logger = logging.getLogger(__name__)


def _make_error_user_friendly(error_msg: str, context: Optional[Dict[str, Any]] = None) -> str:
    """
    Convert technical error messages into user-friendly, actionable messages.
    
    Args:
        error_msg: Technical error message
        context: Optional context (query, stage, etc.)
    
    Returns:
        User-friendly error message
    """
    if not error_msg:
        return "I encountered an issue while processing your request. Please try rephrasing your question."
    
    error_lower = error_msg.lower()
    query = context.get("query", "") if context else ""
    
    # SQL generation errors
    if "sql" in error_lower and ("generation" in error_lower or "failed" in error_lower):
        if "missing from" in error_lower or "from clause" in error_lower:
            return f"I couldn't determine which data table to use for your question: '{query}'. Could you be more specific about what data you'd like to analyze? For example, 'show me sales by region' or 'what are the top products'."
        elif "table" in error_lower and ("not found" in error_lower or "unknown" in error_lower):
            return f"I couldn't find the data table you're asking about. Could you clarify which data source or table you'd like me to analyze? You can check your connected data sources in the settings."
        elif "reserved word" in error_lower:
            return f"I had trouble understanding your question. Could you rephrase it? For example, instead of using technical terms, try asking 'show me sales data' or 'what are the top customers'."
        elif "placeholder" in error_lower or "template" in error_lower:
            return f"I need more information to answer your question. Could you specify which data table or data source you'd like me to analyze?"
        else:
            return f"I had trouble converting your question into a database query. Could you try rephrasing it? For example, 'show me sales by month' or 'what are the top 10 products'."
    
    # Query execution errors
    if "query execution" in error_lower or "execution failed" in error_lower:
        if "connection" in error_lower or "timeout" in error_lower:
            return "I couldn't connect to your data source right now. Please check that your data source is connected and try again. If the problem persists, you may need to reconnect your data source."
        elif "syntax error" in error_lower:
            return "There was an issue with the database query. I'll try a different approach. Could you rephrase your question or try asking something simpler?"
        elif "table" in error_lower and "not found" in error_lower:
            return f"The data table I tried to access doesn't exist or isn't available. Could you check your data sources and make sure the data you're asking about is connected?"
        else:
            return "I encountered an issue while retrieving your data. Please try again, or rephrase your question if the issue persists."
    
    # Validation errors
    if "validation" in error_lower or "invalid" in error_lower:
        if "sql" in error_lower:
            return "I generated a query that wasn't valid. Let me try a different approach. Could you rephrase your question?"
        elif "results" in error_lower:
            return "The data I retrieved wasn't in the expected format. I'll try again with a different approach."
        else:
            return "I encountered a validation issue. Please try rephrasing your question."
    
    # Chart/insights generation errors
    if "chart" in error_lower and ("generation" in error_lower or "failed" in error_lower):
        return "I successfully retrieved your data, but had trouble creating a visualization. The data is available below - you can view it in table format."
    
    if "insights" in error_lower and ("generation" in error_lower or "failed" in error_lower):
        return "I successfully retrieved your data and created a chart, but had trouble generating insights. The chart and data are available below."
    
    # No results errors
    if "no results" in error_lower or "empty" in error_lower or "no data" in error_lower:
        return f"Your question '{query}' didn't return any results. This could mean:\n• The data doesn't exist for your criteria\n• Your filters are too restrictive\n• The data source needs to be refreshed\n\nTry adjusting your question or checking your data source."
    
    # Timeout errors
    if "timeout" in error_lower or "timed out" in error_lower:
        return "Your request took too long to process. This might be because:\n• The data source is slow to respond\n• Your query is very complex\n• The data set is very large\n\nTry simplifying your question or breaking it into smaller parts."
    
    # Generic fallback - make it conversational
    if "error" in error_lower or "failed" in error_lower or "exception" in error_lower:
        return f"I encountered an issue while processing your question: '{query}'. Please try rephrasing it or check that your data sources are properly connected. If the problem persists, try asking a simpler question."
    
    # If it's already user-friendly, return as-is
    return error_msg


class LangGraphMultiAgentOrchestrator:
    """
    Enterprise-grade multi-agent orchestrator using LangGraph.
    
    Replaces LangChain-based RobustMultiAgentOrchestrator with:
    - Explicit graph-based workflow
    """
    
    async def _save_user_message_immediately(
        self,
        conversation_id: str,
        user_query: str
    ) -> None:
        """Save user message immediately when query starts (before workflow)"""
        if not conversation_id or not self.async_session_factory:
            return
        
        try:
            import uuid as uuid_lib
            from app.modules.chats.conversations.models import ChatConversation
            from app.modules.chats.messages.models import ChatMessage
            from sqlalchemy import select
            
            # Validate UUID format
            try:
                conversation_uuid = uuid_lib.UUID(conversation_id)
            except ValueError:
                logger.warning(f"Invalid conversation_id format for saving user message: {conversation_id}")
                return
            
            async_gen = self.async_session_factory()
            session = await async_gen.__anext__()
            try:
                # Ensure conversation exists
                conv_result = await session.execute(
                    select(ChatConversation).filter(ChatConversation.id == conversation_uuid)
                )
                conversation = conv_result.scalar_one_or_none()
                
                if not conversation:
                    # Create conversation if it doesn't exist
                    conversation = ChatConversation(
                        id=conversation_uuid,
                        title=user_query[:50] if user_query else f"Chat {conversation_id[:8]}",
                        description=None,
                        json_metadata=None
                    )
                    session.add(conversation)
                    await session.flush()
                    logger.info(f"📝 Created new conversation: {conversation_id}")
                
                # Save user message immediately
                user_message = ChatMessage(
                    conversation_id=conversation_uuid,
                    query=user_query,
                    answer=None,
                    status="processing"  # Mark as processing
                )
                session.add(user_message)
                await session.commit()
                
                logger.info(f"💾 Saved user message immediately for conversation {conversation_id}")
            except Exception as e:
                await session.rollback()
                raise
            finally:
                try:
                    await async_gen.aclose()
                except (StopAsyncIteration, RuntimeError, GeneratorExit):
                    pass
        except Exception as e:
            logger.error(f"⚠️ Failed to save user message immediately (non-critical): {e}")
            # Don't fail the workflow if message saving fails
    
    async def _save_conversation_messages(
        self,
        conversation_id: str,
        user_query: str,
        ai_response: str,
        result: Dict[str, Any]
    ) -> None:
        """
        Save user query and AI response to conversation messages atomically.
        
        CRITICAL: Both messages saved in single transaction to prevent message loss.
        
        Args:
            conversation_id: Conversation UUID
            user_query: User's query
            ai_response: AI's response
            result: Full result dictionary
        """
        if not conversation_id or not self.async_session_factory:
            return
        
        try:
            import uuid as uuid_lib
            from app.modules.chats.conversations.models import ChatConversation
            from app.modules.chats.messages.models import ChatMessage
            from sqlalchemy import select
            
            # Validate UUID format
            try:
                conversation_uuid = uuid_lib.UUID(conversation_id)
            except ValueError:
                logger.warning(f"Invalid conversation_id format for saving: {conversation_id}")
                return
            
            # CRITICAL: get_async_session is an async generator, iterate it correctly
            async_gen = self.async_session_factory()
            session = await async_gen.__anext__()
            try:
                # Ensure conversation exists
                conv_result = await session.execute(
                    select(ChatConversation).filter(ChatConversation.id == conversation_uuid)
                )
                conversation = conv_result.scalar_one_or_none()
                
                if not conversation:
                    # Create conversation if it doesn't exist
                    conversation = ChatConversation(
                        id=conversation_uuid,
                        title=user_query[:50] if user_query else f"Chat {conversation_id[:8]}",
                        description=None,
                        json_metadata=None
                    )
                    session.add(conversation)
                    await session.flush()
                    logger.info(f"📝 Created new conversation: {conversation_id}")
                
                # CRITICAL: Check if user message already exists (from _save_user_message_immediately)
                # to avoid duplicates - check by query text AND recent timestamp
                from datetime import datetime, timedelta
                recent_threshold = datetime.utcnow() - timedelta(seconds=30)
                
                existing_user_msg = await session.execute(
                    select(ChatMessage).filter(
                        ChatMessage.conversation_id == conversation_uuid,
                        ChatMessage.query == user_query,
                        ChatMessage.answer == None,
                        ChatMessage.is_active == True,
                        ChatMessage.created_at >= recent_threshold
                    ).order_by(ChatMessage.created_at.desc()).limit(1)
                )
                existing_user = existing_user_msg.scalar_one_or_none()
                
                if not existing_user:
                    # Also check for any user message with same query in last 5 seconds (more aggressive dedupe)
                    very_recent_threshold = datetime.utcnow() - timedelta(seconds=5)
                    very_recent_msg = await session.execute(
                        select(ChatMessage).filter(
                            ChatMessage.conversation_id == conversation_uuid,
                            ChatMessage.query == user_query,
                            ChatMessage.is_active == True,
                            ChatMessage.created_at >= very_recent_threshold
                        ).order_by(ChatMessage.created_at.desc()).limit(1)
                    )
                    existing_user = very_recent_msg.scalar_one_or_none()
                
                # ===== ATOMIC TRANSACTION: Save both messages together =====
                if not existing_user:
                    # Save user message only if it doesn't exist
                    user_message = ChatMessage(
                        conversation_id=conversation_uuid,
                        query=user_query,
                        answer=None,
                        status="completed"
                    )
                    session.add(user_message)
                    await session.flush()
                    logger.debug(f"💾 Saved user message in _save_conversation_messages")
                else:
                    # Update existing user message status if it was "processing"
                    if existing_user.status == "processing":
                        existing_user.status = "completed"
                        await session.flush()
                        logger.debug(f"💾 Updated existing user message status to completed (prevented duplicate)")
                
                # Save AI response message
                # Include full response with SQL, chart config, insights if available
                ai_response_full = ai_response
                if result.get("sql_query"):
                    ai_response_full += f"\n\n**SQL Query:**\n```sql\n{result.get('sql_query')}\n```"
                if result.get("insights"):
                    ai_response_full += f"\n\n**Key Insights:**\n" + "\n".join([
                        f"- {insight.get('title', '') if isinstance(insight, dict) else str(insight)}"
                        for insight in result.get("insights", [])[:5]
                    ])
                
                # CRITICAL: Save AI metadata (chart config, insights, recommendations, etc.)
                ai_metadata = {}
                if result.get("echarts_config"):
                    ai_metadata["echarts_config"] = result.get("echarts_config")
                if result.get("chartConfig"):
                    ai_metadata["chartConfig"] = result.get("chartConfig")
                if result.get("insights"):
                    ai_metadata["insights"] = result.get("insights")
                if result.get("recommendations"):
                    ai_metadata["recommendations"] = result.get("recommendations")
                if result.get("sql_query"):
                    ai_metadata["sql_query"] = result.get("sql_query")
                if result.get("query_result"):
                    ai_metadata["query_result_count"] = len(result.get("query_result", []))
                if result.get("execution_metadata"):
                    ai_metadata["execution_metadata"] = result.get("execution_metadata")
                
                # CRITICAL: Enhanced duplicate detection and success validation
                # Check for recent AI messages with same content (within last 30 seconds for streaming)
                from datetime import datetime, timedelta
                recent_threshold = datetime.utcnow() - timedelta(seconds=30)  # Increased window for streaming
                
                # Determine if this is a successful response (has content, chart, insights, or query result)
                has_content = bool(ai_response and ai_response.strip())
                has_chart = bool(ai_metadata and ai_metadata.get('echarts_config'))
                has_insights = bool(ai_metadata and ai_metadata.get('insights'))
                has_query_result = bool(ai_metadata and ai_metadata.get('query_result_count', 0) > 0)
                is_successful = has_content or has_chart or has_insights or has_query_result
                
                # Skip saving if response is empty placeholder message
                is_placeholder = (
                    "Processing your request" in (ai_response or "") or
                    "No data visualization available" in (ai_response or "") or
                    "The query was processed, but no chart or data results were generated" in (ai_response or "") or
                    (ai_response or "").strip() == ""
                )
                
                if is_placeholder and not is_successful:
                    logger.warning(f"⚠️ Skipping placeholder/empty AI response (no meaningful content)")
                    return
                
                existing_ai_msg = await session.execute(
                    select(ChatMessage).filter(
                        ChatMessage.conversation_id == conversation_uuid,
                        ChatMessage.query == None,
                        ChatMessage.is_active == True,
                        ChatMessage.created_at >= recent_threshold
                    ).order_by(ChatMessage.created_at.desc()).limit(1)
                )
                existing_ai = existing_ai_msg.scalar_one_or_none()
                
                # Enhanced duplicate detection: check by content similarity AND metadata
                if existing_ai and ai_response:
                    # Check if answer is similar (first 200 chars match for better detection)
                    existing_answer_start = (existing_ai.answer or "")[:200]
                    new_answer_start = ai_response[:200]
                    existing_has_chart = bool(existing_ai.ai_metadata and existing_ai.ai_metadata.get('echarts_config'))
                    new_has_chart = bool(has_chart)
                    
                    # Check if content is identical
                    content_matches = (
                        existing_answer_start == new_answer_start and 
                        existing_has_chart == new_has_chart
                    )
                    
                    if content_matches:
                        # Only skip if BOTH responses are not successful
                        # If one is successful, always update to the successful one
                        existing_status = existing_ai.status or "unknown"
                        if is_successful or existing_status != "completed":
                            # Update with current (better or successful) response
                            logger.info(f"💾 Updating with better quality response (was {existing_status})")
                            existing_ai.answer = ai_response_full
                            existing_ai.ai_metadata = ai_metadata if ai_metadata else existing_ai.ai_metadata
                            existing_ai.status = "completed"
                            await session.commit()
                        else:
                            # Both are unsuccessful/fallback - skip to avoid duplicate fallbacks
                            logger.debug(f"💾 Skipping duplicate fallback response (already have similar content)")
                    else:
                        # Different content - create new message
                        ai_message = ChatMessage(
                            conversation_id=conversation_uuid,
                            query=None,
                            answer=ai_response_full,
                            status="completed",
                            ai_metadata=ai_metadata if ai_metadata else None
                        )
                        session.add(ai_message)
                        await session.commit()
                        logger.info(f"💾 Saved new AI message to conversation {conversation_id} (successful: {is_successful})")
                elif not existing_ai:
                    # No recent AI message - create new one (only if successful)
                    if is_successful:
                        ai_message = ChatMessage(
                            conversation_id=conversation_uuid,
                            query=None,
                            answer=ai_response_full,
                            status="completed",
                            ai_metadata=ai_metadata if ai_metadata else None
                        )
                        session.add(ai_message)
                        await session.commit()
                        logger.info(f"💾 Saved new AI message to conversation {conversation_id} (chart: {has_chart}, insights: {len(ai_metadata.get('insights', [])) if ai_metadata else 0})")
                    else:
                        logger.warning(f"⚠️ Skipping empty/unsuccessful AI response (no meaningful content)")
                else:
                    # Recent message exists but content is different - update it if new one is better
                    if is_successful:
                        existing_ai.answer = ai_response_full
                        existing_ai.ai_metadata = ai_metadata if ai_metadata else existing_ai.ai_metadata
                        existing_ai.status = "completed"
                        await session.commit()
                        logger.info(f"💾 Updated existing AI message with better content")
                    else:
                        logger.debug(f"💾 Skipping update - new response is not more successful than existing")
            except Exception as e:
                await session.rollback()
                raise
            finally:
                # Clean up the async generator - try to close it
                try:
                    await async_gen.aclose()
                except (StopAsyncIteration, RuntimeError, GeneratorExit):
                    pass
        except Exception as e:
            logger.error(f"❌ Failed to save conversation messages: {e}", exc_info=True)
            # Don't fail the workflow if message saving fails
    
    async def _get_conversation_history(self, conversation_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Retrieve conversation history from database for context.
        
        Args:
            conversation_id: Conversation UUID
            limit: Maximum number of messages to retrieve
        
        Returns:
            List of conversation messages as dicts with role and content
        """
        if not conversation_id:
            return []
        
        if not self.async_session_factory:
            logger.warning("async_session_factory not available, returning empty history")
            return []
        
        try:
            from app.modules.chats.messages.models import ChatMessage
            from sqlalchemy import select
            import uuid as uuid_lib
            
            # Validate UUID format
            try:
                conversation_uuid = uuid_lib.UUID(conversation_id)
            except ValueError:
                logger.warning(f"Invalid conversation_id format: {conversation_id}")
                return []
            
            # CRITICAL: get_async_session is an async generator, iterate it correctly
            async_gen = self.async_session_factory()
            session = await async_gen.__anext__()
            try:
                stmt = (
                    select(ChatMessage)
                    .filter(
                        ChatMessage.conversation_id == conversation_uuid,
                        ChatMessage.is_active == True
                    )
                    .order_by(ChatMessage.created_at.asc())
                    .limit(limit)
                )
                result = await session.execute(stmt)
                messages_db = result.scalars().all()
                
                history: List[Dict[str, Any]] = []
                for msg_db in messages_db:
                    # ChatMessage has query (user input) and answer (assistant response)
                    # If query exists, it's a user message; if answer exists, it's an assistant message
                    if msg_db.query:
                        history.append({
                            "role": "user",
                            "content": msg_db.query
                        })
                    if msg_db.answer:
                        # Truncate AI messages to save memory for LLM context
                        content = msg_db.answer
                        if len(content) > 500:
                            content = content[:497] + "..."
                        history.append({
                            "role": "assistant",
                            "content": content
                        })
                
                logger.info(f"📚 Loaded {len(history)} messages for conversation {conversation_id}")
                return history
            except Exception as e:
                await session.rollback()
                raise
            finally:
                # Clean up the async generator
                try:
                    await async_gen.aclose()
                except (StopAsyncIteration, RuntimeError, GeneratorExit):
                    pass
        except Exception as e:
            logger.error(f"❌ Error loading conversation history for {conversation_id}: {e}", exc_info=True)
            return []
    
    def __init__(
        self,
        async_session_factory: Optional[Any] = None,
        sync_session_factory: Optional[Any] = None,
        litellm_service: Optional[LiteLLMService] = None,
        data_service: Optional[Any] = None,
        multi_query_service: Optional[Any] = None,
        chart_service: Optional[Any] = None
    ):
        if not LANGGRAPH_AVAILABLE:
            raise ImportError("LangGraph is not available. Install with: pip install langgraph>=0.2.0")
        
        self.async_session_factory = async_session_factory
        self.sync_session_factory = sync_session_factory
        self.litellm_service = litellm_service or LiteLLMService()
        self.data_service = data_service
        self.multi_query_service = multi_query_service
        self.chart_service = chart_service
        
        # Initialize services (same as old orchestrator)
        try:
            from app.modules.ai.services.performance_monitor import PerformanceMonitor
            from app.modules.ai.services.langchain_memory_service import LangChainMemoryService
            from app.modules.ai.services.context_enrichment_service import ContextEnrichmentService
            
            if self.async_session_factory:
                self.memory_service = LangChainMemoryService(self.async_session_factory)
                self.context_service = ContextEnrichmentService(self.async_session_factory)
                self.performance_monitor = PerformanceMonitor()
            else:
                self.memory_service = None
                self.context_service = None
                self.performance_monitor = None
        except Exception as e:
            logger.warning(f"⚠️ Some services not available: {e}")
            self.memory_service = None
            self.context_service = None
            self.performance_monitor = None
        
        # Initialize agents (will be imported in nodes)
        self.nl2sql_agent = None  # Will be lazy-loaded in nodes
        self.chart_agent = None
        self.insights_agent = None
        self.unified_agent = None
        
        # Initialize graph
        self.graph = self._build_graph()
        
        # Compile graph with checkpointing for state persistence
        self.checkpointer = MemorySaver()
        self.compiled_graph = self.graph.compile(checkpointer=self.checkpointer)
        
        logger.info("✅ LangGraphMultiAgentOrchestrator initialized")
    
    def _build_graph(self) -> StateGraph:
        """
        Build the LangGraph StateGraph with all nodes and edges.
        
        Graph structure:
        START → RouteQuery → [Conditional Branch]
                              ├─→ ValidateSQL → ExecuteQuery → GenerateChart → GenerateInsights → END
                              ├─→ DirectChart (if no SQL needed)
                              └─→ DirectInsights (if no data needed)
        """
        # Create StateGraph with AiserWorkflowState
        workflow = StateGraph(AiserWorkflowState)
        
        # Add nodes (will be implemented in separate files)
        # LangGraph nodes must be async callables that take only state
        # We create async wrapper functions that bind self and call the instance methods
        # Apply decorators in the wrappers to ensure proper state validation
        @validate_state_transition(validate_input=True, validate_output=True, snapshot_after=True)
        @handle_node_errors()
        async def route_wrapper(state: AiserWorkflowState) -> AiserWorkflowState:
            return await self._route_query_node(state)
        
        @validate_state_transition(validate_input=True, validate_output=True)
        async def validate_sql_wrapper(state: AiserWorkflowState) -> AiserWorkflowState:
            return await self._validate_sql_node(state)
        
        @validate_state_transition(validate_input=True, validate_output=True, snapshot_after=True)
        @handle_node_errors(retry_on_error=True, max_retries=2)
        async def nl2sql_wrapper(state: AiserWorkflowState) -> AiserWorkflowState:
            return await self._nl2sql_node(state)
        
        @validate_state_transition(validate_input=True, validate_output=True, snapshot_after=True)
        @handle_node_errors(retry_on_error=True, max_retries=3)
        async def execute_query_wrapper(state: AiserWorkflowState) -> AiserWorkflowState:
            return await self._execute_query_node(state)
        
        @validate_state_transition(validate_input=True, validate_output=True)
        @handle_node_errors(retry_on_error=True, max_retries=2)
        async def generate_chart_wrapper(state: AiserWorkflowState) -> AiserWorkflowState:
            return await self._generate_chart_node(state)
        
        @validate_state_transition(validate_input=True, validate_output=True)
        @handle_node_errors(retry_on_error=True, max_retries=2)
        async def generate_insights_wrapper(state: AiserWorkflowState) -> AiserWorkflowState:
            return await self._generate_insights_node(state, session_factory=self.sync_session_factory)
        
        @validate_state_transition(validate_input=True, validate_output=True)
        @handle_node_errors(retry_on_error=True, max_retries=2)
        async def unified_wrapper(state: AiserWorkflowState) -> AiserWorkflowState:
            return await self._unified_chart_insights_node(state)
        
        @validate_state_transition(validate_input=True, validate_output=True)
        async def error_recovery_wrapper(state: AiserWorkflowState) -> AiserWorkflowState:
            return await self._error_recovery_node(state)
        
        @validate_state_transition(validate_input=True, validate_output=True)
        async def critical_failure_wrapper(state: AiserWorkflowState) -> AiserWorkflowState:
            return await self._critical_failure_node(state)
        
        # CRITICAL: Import and use deep_file_analysis_node instead of deprecated file_analysis
        from app.modules.ai.nodes.deep_file_analysis_node import deep_file_analysis_node
        
        workflow.add_node("route_query", route_wrapper)
        workflow.add_node("validate_sql", validate_sql_wrapper)
        workflow.add_node("nl2sql", nl2sql_wrapper)
        workflow.add_node("execute_query", execute_query_wrapper)
        workflow.add_node("generate_chart", generate_chart_wrapper)
        workflow.add_node("generate_insights", generate_insights_wrapper)
        workflow.add_node("unified_chart_insights", unified_wrapper)
        workflow.add_node("error_recovery", error_recovery_wrapper)
        workflow.add_node("critical_failure", critical_failure_wrapper)
        workflow.add_node("deep_file_analysis", deep_file_analysis_node)  # Use deep_file_analysis for all file sources
        
        # Define edges
        workflow.set_entry_point("route_query")
        
        # Route query node determines next step
        workflow.add_conditional_edges(
            "route_query",
            self._route_condition,
            {
                "nl2sql": "nl2sql",
                "direct_chart": "generate_chart",
                "direct_insights": "generate_insights",
                "deep_file_analysis": "deep_file_analysis",  # Route ALL file sources to deep_file_analysis
                "conversational_end": "conversational_end",  # Route to conversational end node
                "error": "error_recovery"
            }
        )
        
        # Deep file analysis path - goes directly to END (already includes charts, insights, and recommendations)
        workflow.add_edge("deep_file_analysis", END)
        
        # NL2SQL path
        workflow.add_edge("nl2sql", "validate_sql")
        workflow.add_conditional_edges(
            "validate_sql",
            self._validate_condition,
            {
                "valid": "execute_query",
                "invalid": "error_recovery",
                "critical": "critical_failure"
            }
        )
        
        # Add conversational endpoint for no-data-source queries
        @validate_state_transition(validate_input=True, validate_output=True)
        async def conversational_end_wrapper(state: AiserWorkflowState) -> AiserWorkflowState:
            """End node for conversational mode - ensures message is set"""
            if not state.get("message") and not state.get("narration"):
                # Fallback message if supervisor didn't set one
                query = state.get("query", "")
                default_message = f"I understand you're asking: {query}. To perform data analysis, please select a data source first. I'm here to help coordinate the analysis once you do!"
                state["message"] = default_message
                state["narration"] = default_message
                state["analysis"] = default_message  # CRITICAL: Also set analysis field
            # Ensure all message fields are set
            if not state.get("analysis"):
                state["analysis"] = state.get("message") or state.get("narration") or ""
            state["progress_percentage"] = 100.0
            state["progress_message"] = "Conversational response complete"
            logger.info(f"✅ Conversational end node: message={state.get('message', '')[:50]}...")
            return state
        
        workflow.add_node("conversational_end", conversational_end_wrapper)
        workflow.add_edge("conversational_end", END)  # Connect conversational_end to END
        
        # After query execution, validate results then decide on chart/insights
        workflow.add_node("validate_results", self._validate_results_node)
        workflow.add_edge("execute_query", "validate_results")
        workflow.add_conditional_edges(
            "validate_results",
            self._post_validation_condition,
            {
                "unified": "unified_chart_insights",
                "separate": "generate_chart",  # Fallback to separate if unified fails
                "retry_query": "execute_query",  # Retry query execution
                "error": "error_recovery",
                "critical": "critical_failure"
            }
        )
        
        # Chart generation path
        workflow.add_edge("generate_chart", "generate_insights")
        
        # Unified path with fallback to separate
        workflow.add_conditional_edges(
            "unified_chart_insights",
            self._unified_fallback_condition,
            {
                "success": END,
                "fallback_chart": "generate_chart",  # Fallback to separate chart
                "fallback_insights": "generate_insights",  # Fallback to separate insights
                "error": "error_recovery"
            }
        )
        
        # Insights path (after chart or standalone)
        workflow.add_edge("generate_insights", END)
        
        # Error handling paths
        workflow.add_conditional_edges(
            "error_recovery",
            self._error_recovery_condition,
            {
                "retry": "nl2sql",  # Retry SQL generation (not routing to avoid loops)
                "continue": "generate_insights",  # Continue with partial results
                "conversational_end": "conversational_end",  # Route to conversational end node
                "fail": "critical_failure"
            }
        )
        workflow.add_edge("critical_failure", END)
        
        # Configure retry mechanisms with exponential backoff
        # LangGraph handles retries via add_retry_edges or node-level retry decorators
        # We'll use conditional retry logic in nodes themselves for more control
        
        return workflow
    
    def _route_condition(self, state: AiserWorkflowState) -> str:
        """Conditional routing after route_query node"""
        if state.get("critical_failure", False):
            return "error"
        if state.get("error"):
            return "error"
        
        data_source_id = state.get("data_source_id")
        
        # Check analysis_mode - only route to deep_file_analysis if explicitly "deep"
        execution_metadata = state.get("execution_metadata", {})
        analysis_mode = execution_metadata.get("analysis_mode") or state.get("analysis_mode", "standard")
        
        if analysis_mode == "deep":
            # Only route to deep analysis if explicitly requested
            logger.info(f"📊 Deep analysis mode detected - routing to deep file analysis")
            state["current_stage"] = "routed_to_deep_file_analysis"
            return "deep_file_analysis"
        
        # For file sources with standard mode, continue to normal SQL path
        # Log data source type for debugging but don't use it for routing
        if data_source_id:
            try:
                if self.data_service and hasattr(self.data_service, 'data_sources') and data_source_id in self.data_service.data_sources:
                    source_info = self.data_service.data_sources[data_source_id]
                    source_type = source_info.get('type', '').lower() if isinstance(source_info, dict) else str(getattr(source_info, 'type', '')).lower()
                    logger.debug(f"📊 Data source type: {source_type}, analysis_mode: {analysis_mode}")
            except Exception as e:
                logger.debug(f"Could not check data source type: {e}")
        
        # CRITICAL: If no data_source_id, use conversational mode (no SQL generation)
        if not data_source_id:
            logger.warning("⚠️ No data_source_id provided - using conversational mode only")
            # Check if supervisor already handled it
            if state.get("current_stage") == "supervisor_conversational_complete":
                return "conversational_end"
            # Ensure message is set for conversational mode
            if not state.get("message") and not state.get("narration"):
                query = state.get("query", "")
                default_message = f"I understand you're asking: {query}. To perform data analysis, please select a data source first. I'm here to help coordinate the analysis once you do!"
                state["message"] = default_message
                state["narration"] = default_message
                state["analysis"] = default_message  # CRITICAL: Also set analysis field
            state["current_stage"] = "conversational"
            state["progress_percentage"] = 100.0
            state["progress_message"] = "Conversational response generated"
            return "conversational_end"
        
        # Check routing decision from route_query_node
        current_stage = state.get("current_stage", "")
        if current_stage == "routed_to_chart":
            return "direct_chart"
        elif current_stage == "routed_to_insights":
            return "direct_insights"
        elif current_stage == "routed_to_nl2sql" or current_stage == "":
            # Need SQL generation
            if state.get("sql_query"):
                # Already has SQL, skip NL2SQL and go to validation
                return "nl2sql"  # Will go to validate_sql
            return "nl2sql"
        
        # Default: need SQL generation
        return "nl2sql"
    
    def _validate_condition(self, state: AiserWorkflowState) -> str:
        """Conditional routing after validate_sql node"""
        if state.get("critical_failure", False):
            return "critical"
        if state.get("error") and "syntax" in str(state.get("error", "")).lower():
            return "invalid"
        if state.get("sql_query"):
            return "valid"
        return "invalid"
    
    def _post_validation_condition(self, state: AiserWorkflowState) -> str:
        """Conditional routing after validate_results node - wait for query results"""
        if state.get("critical_failure", False):
            return "critical"
        if state.get("error") and any(kw in str(state.get("error", "")).lower() for kw in ["connection", "auth", "permission"]):
            return "critical"
        
        # CRITICAL: Check if we have query result data before proceeding
        query_result = state.get("query_result")
        if query_result and isinstance(query_result, list) and len(query_result) > 0:
            # Has data - try unified first, fallback to separate
            return "unified"
        
        # No query results - check retry count to prevent infinite loops
        retry_count = state.get("retry_count", 0)
        metadata = state.get("execution_metadata", {})
        if not metadata:
            metadata = {}
            state["execution_metadata"] = metadata
        execution_retry_count = metadata.get("query_execution_retry_count", 0)
        
        # CRITICAL: Prevent infinite loops - limit retries strictly
        if execution_retry_count >= 2:
            # Too many retries - fail gracefully
            logger.error(f"❌ Query execution retried {execution_retry_count} times with no results - failing")
            state["error"] = "Query executed but returned no results after multiple retries"
            return "error"
        
        # Only retry if we have SQL and haven't exceeded retry limit
        if state.get("sql_query") and execution_retry_count < 2:
            # Increment execution retry count BEFORE retrying
            metadata["query_execution_retry_count"] = execution_retry_count + 1
            state["execution_metadata"] = metadata
            # Also increment general retry_count
            state["retry_count"] = retry_count + 1
            # Retry query execution with adapted SQL if needed
            logger.warning(f"⚠️ No query results, retrying query execution (attempt {execution_retry_count + 1}/2, retry_count={retry_count + 1})")
            return "retry_query"
        
        # If we have SQL but no results after retries, it's an error
        if state.get("sql_query") and not query_result:
            state["error"] = "Query executed but returned no results after retries"
            return "error"
        
        # If no SQL and no results, error
        if not state.get("sql_query"):
            state["error"] = "No SQL query available for execution"
            return "error"
        
        return "error"
    
    def _unified_fallback_condition(self, state: AiserWorkflowState) -> str:
        """Conditional routing after unified_chart_insights - fallback to separate if needed"""
        if state.get("critical_failure", False):
            return "error"
        
        # Check if unified generation succeeded
        has_chart = bool(state.get("echarts_config"))
        has_insights = bool(state.get("insights") or state.get("recommendations") or state.get("executive_summary"))
        
        if has_chart and has_insights:
            # Both succeeded
            return "success"
        elif has_chart and not has_insights:
            # Chart succeeded but insights failed - fallback to insights only
            logger.warning("⚠️ Unified chart succeeded but insights failed, falling back to insights generation")
            return "fallback_insights"
        elif not has_chart and has_insights:
            # Insights succeeded but chart failed - fallback to chart only
            logger.warning("⚠️ Unified insights succeeded but chart failed, falling back to chart generation")
            return "fallback_chart"
        else:
            # Both failed - try error recovery
            logger.error("❌ Unified generation failed for both chart and insights")
            return "error"
    
    def _error_recovery_condition(self, state: AiserWorkflowState) -> str:
        """Conditional routing for error recovery"""
        # If no data_source_id, return conversational response
        if not state.get("data_source_id"):
            logger.info("✅ No data_source_id - returning conversational response")
            if not state.get("message"):
                state["message"] = state.get("query", "")
            state["current_stage"] = "conversational_complete"
            return "conversational"
        
        retry_count = state.get("retry_count", 0)
        metadata = state.get("execution_metadata", {})
        if not metadata:
            metadata = {}
            state["execution_metadata"] = metadata
        error_recovery_count = metadata.get("error_recovery_count", 0)
        
        # CRITICAL: Prevent infinite loops - check error_recovery_count FIRST
        if error_recovery_count >= 2:
            logger.error(f"❌ Error recovery limit reached ({error_recovery_count} attempts) - failing")
            return "fail"
        
        # Increment error recovery count BEFORE any retry decision
        metadata["error_recovery_count"] = error_recovery_count + 1
        state["execution_metadata"] = metadata
        logger.info(f"🔄 Error recovery: attempt {error_recovery_count + 1}/2, retry_count={retry_count}")
        
        # Prevent infinite loops - only retry if we haven't retried too many times
        if retry_count < 2 and state.get("sql_query") is None:
            # Only retry if we don't have SQL yet
            state["retry_count"] = retry_count + 1
            logger.info(f"🔄 Error recovery: retrying SQL generation (attempt {retry_count + 1}/2)")
            return "retry"
        
        # If we have query results, continue with insights
        if state.get("query_result") and len(state.get("query_result", [])) > 0:
            logger.info("✅ Error recovery: continuing with partial results")
            return "continue"  # Has partial results, continue
        
        # If we have SQL but no results, and haven't retried too much, try execution again
        if state.get("sql_query") and retry_count < 2:
            state["retry_count"] = retry_count + 1
            logger.info(f"🔄 Error recovery: retrying query execution (attempt {retry_count + 1}/2)")
            return "retry"
        
        # Otherwise, fail
        logger.warning(f"⚠️ Error recovery: retry_count={retry_count}, error_recovery_count={error_recovery_count}, failing")
        return "fail"
    
    # Node implementations (imported from nodes package)
    # LangGraph nodes must only take state as parameter - we use functools.partial to bind services
    async def _route_query_node(self, state: AiserWorkflowState) -> AiserWorkflowState:
        """Route query to appropriate workflow path"""
        from app.modules.ai.nodes.routing_node import route_query_node
        # Node function is decorated, so it only accepts state - services are accessed via closure
        # We need to call it with only state, but the node function needs services
        # Solution: Pass services via state or use a different approach
        # Actually, the decorator allows **kwargs, so we can pass services as kwargs
        return await route_query_node(state, litellm_service=self.litellm_service, context_service=self.context_service)
    
    async def _validate_sql_node(self, state: AiserWorkflowState) -> AiserWorkflowState:
        """Validate SQL before execution"""
        from app.modules.ai.nodes.validation_node import validate_sql_node
        # Pass services as kwargs (decorator wrapper expects func(state, **kwargs))
        return await validate_sql_node(state, data_service=self.data_service)
    
    async def _validate_results_node(self, state: AiserWorkflowState) -> AiserWorkflowState:
        """Validate query results before chart/insights generation"""
        from app.modules.ai.nodes.validation_node import validate_results_node
        return await validate_results_node(state)
    
    async def _nl2sql_node(self, state: AiserWorkflowState) -> AiserWorkflowState:
        """Generate SQL from natural language"""
        from app.modules.ai.nodes.nl2sql_node import nl2sql_node
        # Pass services as kwargs (decorator wrapper expects func(state, **kwargs))
        return await nl2sql_node(
            state,
            litellm_service=self.litellm_service,
            data_service=self.data_service,
            multi_query_service=self.multi_query_service,
            async_session_factory=self.async_session_factory
        )
    
    async def _execute_query_node(self, state: AiserWorkflowState) -> AiserWorkflowState:
        """Execute SQL query with ClickHouse HTTP fallback"""
        from app.modules.ai.nodes.query_execution_node import query_execution_node
        # CRITICAL: Check if multi_query_service is available
        if self.multi_query_service is None:
            logger.error("❌ Multi-query service not initialized - cannot execute SQL queries")
            state["error"] = "Query execution service not available"
            state["current_stage"] = "query_execution_error"
            return state
        # Pass services as kwargs (decorator wrapper expects func(state, **kwargs))
        return await query_execution_node(
            state,
            multi_query_service=self.multi_query_service,
            data_service=self.data_service,
            async_session_factory=self.async_session_factory
        )
    
    async def _generate_chart_node(self, state: AiserWorkflowState) -> AiserWorkflowState:
        """Generate chart from query results"""
        from app.modules.ai.nodes.chart_generation_node import chart_generation_node
        # Pass services as kwargs (decorator wrapper expects func(state, **kwargs))
        # CRITICAL: chart_generation_node needs session_factory, not chart_service
        return await chart_generation_node(
            state,
            litellm_service=self.litellm_service,
            session_factory=self.sync_session_factory
        )
    
    async def _generate_insights_node(self, state: AiserWorkflowState, session_factory: Any = None) -> AiserWorkflowState:
        """Generate insights from query results"""
        from app.modules.ai.nodes.insights_node import insights_node
        # Pass services as kwargs (decorator wrapper expects func(state, **kwargs))
        return await insights_node(
            state,
            litellm_service=self.litellm_service,
            session_factory=session_factory or self.sync_session_factory
        )
    
    async def _unified_chart_insights_node(self, state: AiserWorkflowState) -> AiserWorkflowState:
        """Generate chart and insights together"""
        from app.modules.ai.nodes.unified_node import unified_chart_insights_node
        # Pass services as kwargs (decorator wrapper expects func(state, **kwargs))
        return await unified_chart_insights_node(
            state,
            litellm_service=self.litellm_service,
            session_factory=self.sync_session_factory
        )
    
    async def _error_recovery_node(self, state: AiserWorkflowState) -> AiserWorkflowState:
        """Handle non-critical errors"""
        from app.modules.ai.nodes.error_recovery_node import error_recovery_node
        # Node function is decorated with validate_state_transition
        # The decorator wrapper signature is: wrapper(state, **kwargs)
        # So we pass litellm_service as a keyword argument
        # The wrapper will forward it: func(state, **kwargs) -> error_recovery_node(state, litellm_service=...)
        return await error_recovery_node(state, litellm_service=self.litellm_service)
    
    async def _critical_failure_node(self, state: AiserWorkflowState) -> AiserWorkflowState:
        """Handle critical failures"""
        state["current_stage"] = "critical_failure"
        state["critical_failure"] = True
        state["progress_percentage"] = 0.0
        state["progress_message"] = f"Critical failure: {state.get('error', 'Unknown error')}"
        logger.error(f"❌ Critical failure: {state.get('error')}")
        return state
    
    async def _file_analysis_node(self, state: AiserWorkflowState) -> AiserWorkflowState:
        """
        DEPRECATED: This node is replaced by deep_file_analysis_node.
        All file sources should route to deep_file_analysis instead.
        This method redirects to deep_file_analysis_node to maintain backward compatibility.
        """
        logger.warning("⚠️ DEPRECATED: _file_analysis_node called - redirecting to deep_file_analysis_node")
        
        # Route to deep_file_analysis instead
        from app.modules.ai.nodes.deep_file_analysis_node import deep_file_analysis_node
        return await deep_file_analysis_node(state)
    
    def _build_initial_state(
        self,
        query: str,
        conversation_id: str,
        user_id: str,
        organization_id: str,
        data_source_id: Optional[str] = None,
        analysis_mode: str = "standard",
        model: Optional[str] = None
    ) -> AiserWorkflowState:
        """
        Build initial workflow state for LangGraph execution.
        
        Args:
            query: User's natural language query
            conversation_id: Conversation ID
            user_id: User ID
            organization_id: Organization ID
            data_source_id: Optional data source ID
            analysis_mode: Analysis mode (standard/deep)
        
        Returns:
            Initial AiserWorkflowState dictionary
        """
        from datetime import datetime
        
        return {
            "state_version": "1.0",
            "query": query,
            "data_source_id": data_source_id,
            "sql_query": None,
            "query_result": None,
            "query_result_columns": None,
            "query_result_row_count": None,
            "query_execution_error": None,
            "echarts_config": None,
            "chart_data": None,
            "chart_type": None,
            "chart_title": None,
            "chart_generation_error": None,
            "insights": [],
            "recommendations": [],
            "executive_summary": None,
            "insights_generation_error": None,
            "execution_metadata": {
                "status": "running",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "execution_time_ms": 0,
                "model_used": model or (self.litellm_service.active_model if hasattr(self.litellm_service, 'active_model') else None) or (getattr(self.litellm_service, 'default_model', None) if hasattr(self.litellm_service, 'default_model') else None) or "unknown",
                "analysis_mode": analysis_mode,
                "confidence_scores": {},
                "routing_decision": {},
                "node_history": [],
                "retry_count": 0,
                "error_count": 0,
                "query_execution_retry_count": 0,
                "error_recovery_count": 0,
                "analysis_mode": analysis_mode
            },
            "current_stage": "start",
            "retry_count": 0,
            "node_history": [],
            "error": None,
            "critical_failure": False,
            "progress_percentage": 0.0,
            "progress_message": "Starting analysis...",
            "agent_context": {
                "user_id": user_id or "anonymous",
                "organization_id": organization_id or "default",
                "project_id": None,
                "conversation_id": conversation_id
            },
            "conversation_history": [],
            "user_id": user_id,
            "organization_id": organization_id,
            "project_id": None,
            "conversation_id": conversation_id,
            "workflow_complete": False
        }
    
    async def execute_streaming(
        self,
        query: str,
        conversation_id: str,
        user_id: str,
        organization_id: str,
        data_source_id: Optional[str] = None,
        analysis_mode: str = "standard",
        model: Optional[str] = None
    ):
        """Execute workflow with streaming state updates for SSE"""
        # Initialize state
        initial_state = self._build_initial_state(
            query=query,
            conversation_id=conversation_id,
            user_id=user_id,
            organization_id=organization_id,
            data_source_id=data_source_id,
            analysis_mode=analysis_mode,
            model=model
        )
        
        # CRITICAL: Include thread_id in configurable for checkpointer
        config = {
            "configurable": {"thread_id": conversation_id or "default_thread"},
            "recursion_limit": 50
        }
        
        # Enhanced streaming with LangGraph's multiple modes
        # Use 'updates' mode to get state deltas (more efficient) and 'values' for full state
        try:
            # Stream state updates - use default mode (compatible with all LangGraph versions)
            # Initialize streaming state tracker
            streaming_state = initial_state.copy()
            
            async for state_update in self.compiled_graph.astream(initial_state, config):
                if isinstance(state_update, dict) and state_update:
                    # Get the node name and its state update
                    node_name = list(state_update.keys())[-1]
                    node_state = list(state_update.values())[-1]
                    
                    # Update streaming state with latest state
                    streaming_state.update(node_state)
                    final_state = streaming_state.copy()
                    
                    # Add event metadata
                    final_state['event_type'] = 'progress'
                    final_state['node_name'] = node_name
                    
                    # CRITICAL: Ensure reasoning_steps are included in execution_metadata for streaming
                    if 'execution_metadata' not in final_state:
                        final_state['execution_metadata'] = {}
                    
                    # Update reasoning steps from current stage
                    current_stage = final_state.get('current_stage', '')
                    progress_message = final_state.get('progress_message', '')
                    progress_percentage = final_state.get('progress_percentage', 0)
                    
                    if current_stage or progress_message:
                        if 'reasoning_steps' not in final_state['execution_metadata']:
                            final_state['execution_metadata']['reasoning_steps'] = []
                        
                        # Update or add reasoning step for current stage
                        existing_step = None
                        for step in final_state['execution_metadata']['reasoning_steps']:
                            if step.get('step') == current_stage.replace('_', ' ').title():
                                existing_step = step
                                break
                        
                        if existing_step:
                            existing_step['description'] = progress_message
                            existing_step['status'] = 'processing' if not final_state.get('workflow_complete') else 'complete'
                            existing_step['percentage'] = progress_percentage
                        else:
                            final_state['execution_metadata']['reasoning_steps'].append({
                                'step': current_stage.replace('_', ' ').title() if current_stage else 'Processing',
                                'description': progress_message,
                                'status': 'processing' if not final_state.get('workflow_complete') else 'complete',
                                'percentage': progress_percentage
                            })
                    
                    # Yield state update immediately for real-time progress
                    yield final_state
                    
                    # Check for completion
                    if final_state.get('workflow_complete'):
                        break
            
            # Ensure final state is yielded
            final_state = streaming_state.copy()
            final_state['event_type'] = 'complete'
            final_state['workflow_complete'] = True
            # Mark all reasoning steps as complete
            if 'execution_metadata' in final_state and 'reasoning_steps' in final_state['execution_metadata']:
                for step in final_state['execution_metadata']['reasoning_steps']:
                    if step.get('status') == 'processing':
                        step['status'] = 'complete'
            yield final_state
                
        except Exception as stream_error:
            logger.error(f"❌ Streaming error: {stream_error}", exc_info=True)
            # Yield error state
            error_state = streaming_state.copy() if 'streaming_state' in locals() else initial_state.copy()
            error_state['event_type'] = 'error'
            error_state['error'] = str(stream_error)
            yield error_state
    
    async def execute(
        self,
        query: str,
        conversation_id: str,
        user_id: str,
        organization_id: str,
        project_id: Optional[str] = None,
        data_source_id: Optional[str] = None,
        analysis_mode: str = "standard",
        agent_context: Optional[AgentContextSchema] = None,
        memory_state: Optional[LangChainMemorySchema] = None,
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Execute workflow with given parameters.
        
        Args:
            query: User's natural language query
            conversation_id: Conversation ID
            user_id: User ID
            organization_id: Organization ID
            project_id: Optional project ID
            data_source_id: Optional data source ID
            analysis_mode: Analysis mode (standard/enhanced)
            agent_context: Optional agent context
            memory_state: Optional memory state
        
        Returns:
            Result dictionary with all workflow outputs
        """
        start_time = time.time()
        
        # CRITICAL: Save user message immediately when query starts (before workflow)
        if conversation_id:
            try:
                await self._save_user_message_immediately(conversation_id, query)
            except Exception as e:
                logger.warning(f"⚠️ Failed to save user message immediately (non-critical): {e}")
        
        try:
            # CRITICAL: Retrieve conversation history for context
            conversation_history = await self._get_conversation_history(conversation_id, limit=10)
            logger.info(f"📚 Conversation context: {len(conversation_history)} previous messages loaded")
            
            # Initialize state using _build_initial_state (includes model and analysis_mode)
            initial_state = self._build_initial_state(
                query=query,
                conversation_id=conversation_id,
                user_id=user_id,
                organization_id=organization_id,
                data_source_id=data_source_id,
                analysis_mode=analysis_mode,
                model=model
            )
            
            # Override with conversation history and agent context if provided
            initial_state["conversation_history"] = conversation_history
            if agent_context:
                initial_state["agent_context"] = agent_context.model_dump()
            if project_id:
                if "agent_context" not in initial_state:
                    initial_state["agent_context"] = {}
                initial_state["agent_context"]["project_id"] = project_id
            
            # Validate initial state (handle None values)
            validator = AiserWorkflowStateValidator.from_typed_dict(initial_state)
            initial_state = validator.to_typed_dict()
            
            # Execute graph with increased recursion limit to prevent premature termination
            config = {
                "configurable": {"thread_id": conversation_id},
                "recursion_limit": 50  # Increase from default 25 to allow more complex workflows
            }
            final_state = None
            node_count = 0
            logger.info(f"🚀 Starting LangGraph workflow for query: {query[:100]}...")
            
            # Collect all state updates to get final state
            async for state_update in self.compiled_graph.astream(initial_state, config):
                # state_update is a dict of {node_name: state}
                if isinstance(state_update, dict) and state_update:
                    node_count += 1
                    # Get the last node's output (most recent state)
                    final_state = list(state_update.values())[-1]
                    node_name = list(state_update.keys())[-1] if state_update else "unknown"
                    
                    # Update progress in real-time for observability - log at INFO level
                    current_progress = final_state.get("progress_percentage", 0.0)
                    current_message = final_state.get("progress_message", "Processing...")
                    current_stage = final_state.get("current_stage", "unknown")
                    logger.info(f"📊 [{node_count}] Node: {node_name} | Progress: {current_progress}% | {current_message} | Stage: {current_stage}")
                    
                    # Log errors immediately if they occur
                    if final_state.get("error"):
                        logger.error(f"❌ Error at node {node_name} ({current_stage}): {final_state.get('error')}")
                    if final_state.get("critical_failure", False):
                        logger.error(f"❌ Critical failure at node {node_name} ({current_stage})")
                    
                    # Log SQL query if generated
                    if final_state.get("sql_query") and not hasattr(self, '_sql_logged'):
                        logger.info(f"✅ SQL generated: {final_state.get('sql_query')[:200]}...")
                        self._sql_logged = True
                    
                    # Log query results if available
                    if final_state.get("query_result") and isinstance(final_state.get("query_result"), list):
                        row_count = len(final_state.get("query_result", []))
                        if row_count > 0 and not hasattr(self, '_results_logged'):
                            logger.info(f"✅ Query executed: {row_count} rows returned")
                            self._results_logged = True
            
            # Ensure we have a final state
            if final_state is None:
                final_state = initial_state
                error_msg = "Graph execution did not return final state - workflow may have timed out or failed silently"
                final_state["error"] = error_msg
                logger.error(f"❌ {error_msg}")
                logger.error(f"❌ Initial state: query={initial_state.get('query', 'N/A')[:100]}, data_source_id={initial_state.get('data_source_id', 'N/A')}")
            
            # Convert to result format
            execution_time_ms = int((time.time() - start_time) * 1000)
            execution_metadata = final_state.get("execution_metadata", {})
            execution_metadata["execution_time_ms"] = execution_time_ms
            execution_metadata["status"] = "completed" if not final_state.get("error") else "failed"
            final_state["execution_metadata"] = execution_metadata
            
            # Final progress update
            if not final_state.get("error"):
                final_state["progress_percentage"] = 100.0
                final_state["progress_message"] = "Workflow completed successfully"
            else:
                final_state["progress_percentage"] = final_state.get("progress_percentage", 0.0)
                final_state["progress_message"] = f"Workflow failed: {final_state.get('error', 'Unknown error')[:100]}"
            
            # Build response matching frontend expectations
            executive_summary = final_state.get("executive_summary") or ""
            query_text = final_state.get("query", "")
            
            # Create narration/analysis text (will be built later)
            narration_parts = []
            # CRITICAL: Safely check insights and recommendations - ensure they're lists, not methods
            insights = final_state.get("insights", [])
            recommendations = final_state.get("recommendations", [])
            
            # Ensure insights and recommendations are lists, not methods or other types
            if insights and not isinstance(insights, list):
                if callable(insights):
                    logger.error(f"❌ Insights is a method, not a list: {type(insights)}")
                    insights = []
                else:
                    try:
                        insights = list(insights) if hasattr(insights, '__iter__') else []
                    except Exception:
                        insights = []
            
            if recommendations and not isinstance(recommendations, list):
                if callable(recommendations):
                    logger.error(f"❌ Recommendations is a method, not a list: {type(recommendations)}")
                    recommendations = []
                else:
                    try:
                        recommendations = list(recommendations) if hasattr(recommendations, '__iter__') else []
                    except Exception:
                        recommendations = []
            
            # CRITICAL: Normalize insights to ensure they're dictionaries, not strings
            def normalize_insights_list(items):
                """Convert string insights to dictionary format"""
                if not isinstance(items, list):
                    return []
                normalized = []
                for idx, item in enumerate(items):
                    if isinstance(item, str):
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
            
            insights = normalize_insights_list(insights)
            recommendations = normalize_insights_list(recommendations)
            
            # Build natural, human-like response that directly answers the user's question
            query_result_count = final_state.get("query_result_row_count") or 0
            if not query_result_count:
                query_results = final_state.get("query_result")
                query_result_count = len(query_results) if query_results and isinstance(query_results, (list, dict)) else 0
            
            # Generate proper natural language response using LLM if we have results
            executive_summary = final_state.get("executive_summary")
            narration = final_state.get("narration") or final_state.get("message") or None
            
            # CRITICAL: Check if this is conversational mode (narration already set by routing_node/conversational_end)
            # In conversational mode, we should preserve the existing narration
            current_stage = final_state.get("current_stage", "")
            is_conversational_complete = (
                current_stage == "supervisor_conversational_complete" or 
                current_stage == "conversational" or
                "conversational" in current_stage.lower()
            )
            
            # Try to generate a conversational response using LLM
            # Only generate new narration if we have query results AND we're not in conversational mode
            if query_result_count > 0 and self.litellm_service and not is_conversational_complete:
                try:
                    # Prepare context for natural language response generation
                    query_intent = final_state.get("query_intent", {})
                    chart_type = final_state.get("chart_type", "chart")
                    
                    # Build prompt for natural language response
                    nl_prompt = f"""You are Aiser AI, an expert data analytics assistant. Generate a natural, conversational response that directly answers the user's question.

**User's Question:** {query_text}

**Query Analysis:**
- Query Intent: {query_intent.get('aggregation_type', 'analysis')} with {query_intent.get('dimension_count', 0)} dimensions
- Results: {query_result_count} data point{'s' if query_result_count != 1 else ''}
- Chart Type: {chart_type}

**Key Findings:**
{executive_summary if executive_summary and len(executive_summary) > 20 else 'Analysis completed successfully'}

**Top Insights:**
{chr(10).join([f"- {insight.get('title', '') if isinstance(insight, dict) else str(insight)[:50]}: {insight.get('description', '')[:100] if isinstance(insight, dict) else ''}" for insight in (insights[:3] if insights else [])]) if insights else 'No specific insights yet'}

**Your Task:**
Write a natural, conversational response (2-3 sentences) that:
1. Directly answers the user's question in the first sentence
2. Provides key findings or context
3. Mentions that a chart and detailed insights are available below

Be conversational, professional, and helpful. Write as if you're speaking directly to the user.

Example format:
"Based on the data, [direct answer to question]. [Key finding or context]. I've created a [chart type] chart and detailed insights below to help you understand the results better."

Return ONLY the response text, no markdown, no quotes."""
                    
                    nl_result = await self.litellm_service.generate_completion(
                        prompt=nl_prompt,
                        system_context="You are Aiser AI, a helpful data analytics assistant. Generate natural, conversational responses that directly answer user questions.",
                        max_tokens=300,
                        temperature=0.7
                    )
                    
                    if nl_result.get("success") and nl_result.get("content"):
                        narration = nl_result.get("content", "").strip()
                        # Clean up any markdown or quotes
                        narration = narration.strip('"').strip("'").strip()
                        if narration.startswith("```"):
                            # Remove markdown code blocks
                            narration = re.sub(r'```[a-z]*\n?', '', narration).strip()
                        logger.info(f"✅ Generated natural language response: {len(narration)} chars")
                    else:
                        logger.warning("⚠️ LLM natural language generation failed, using fallback")
                except Exception as nl_err:
                    logger.warning(f"⚠️ Natural language generation error: {nl_err}, using fallback")
            
            # Fallback: Use executive summary or build from parts
            # CRITICAL: Only run fallback if we're NOT in conversational mode OR narration is truly missing
            # This preserves narration set by routing_node/conversational_end for conversational routes
            if not is_conversational_complete and (not narration or len(narration.strip()) < 20):
                if executive_summary and isinstance(executive_summary, str) and len(executive_summary.strip()) > 20:
                    narration = executive_summary
                else:
                    # Build natural response from parts
                    if query_result_count > 0:
                        narration_parts.append(f"Based on your question about {query_text.lower()}, I've analyzed {query_result_count} data point{'s' if query_result_count != 1 else ''}.")
                    else:
                        narration_parts.append(f"I've processed your query: {query_text}.")
                    
                    # Add insights in natural language
                    if insights and isinstance(insights, list) and len(insights) > 0:
                        # CRITICAL: Handle both dict and string insights
                        first_insight = insights[0]
                        if isinstance(first_insight, dict):
                            insight_title = first_insight.get('title', '')
                        else:
                            insight_title = str(first_insight)[:50]
                        
                        if len(insights) == 1:
                            narration_parts.append(f"Key finding: {insight_title}.")
                        else:
                            narration_parts.append(f"I've identified {len(insights)} key insights from the data.")
                    
                    # Add recommendations naturally
                    if recommendations and isinstance(recommendations, list) and len(recommendations) > 0:
                        # CRITICAL: Handle both dict and string recommendations
                        first_rec = recommendations[0]
                        if isinstance(first_rec, dict):
                            rec_title = first_rec.get('title', '')
                        else:
                            rec_title = str(first_rec)[:50]
                        
                        if len(recommendations) == 1:
                            narration_parts.append(f"Recommendation: {rec_title}.")
                        else:
                            narration_parts.append(f"I have {len(recommendations)} recommendations to help you take action.")
                    
                    narration = " ".join(narration_parts) if narration_parts else f"I've completed the analysis for: {query_text}"
            
            # CRITICAL: If there's an error, convert to user-friendly message
            if final_state.get("error") or final_state.get("critical_failure", False):
                technical_error = final_state.get("error", "Unknown error occurred")
                # Convert technical error to user-friendly message
                user_friendly_error = _make_error_user_friendly(
                    technical_error,
                    context={"query": query_text, "stage": final_state.get("current_stage", "unknown")}
                )
                
                # If we don't have a good narration, use the user-friendly error
                if not narration or narration == query_text or len(narration.strip()) < 20:
                    narration = user_friendly_error
                else:
                    # Append error contextually
                    narration = f"{narration}\n\n{user_friendly_error}"
                
                # Log technical error for debugging, but send user-friendly message
                logger.error(f"❌ Workflow failed with error: {technical_error}")
                logger.info(f"💬 User-friendly error message: {user_friendly_error[:100]}...")
            
            result = {
                "success": not final_state.get("critical_failure", False) and not final_state.get("error"),
                "query": query_text,
                "message": narration,  # Frontend expects 'message' field
                "sql_query": final_state.get("sql_query"),
                "query_result": final_state.get("query_result", []),  # Direct array for frontend compatibility
                "query_result_data": final_state.get("query_result", []),  # Alias
                "query_result_row_count": final_state.get("query_result_row_count", 0),
                "query_result_columns": final_state.get("query_result_columns", []),
                # CRITICAL: Include progress for frontend real-time updates
                "progress": {
                    "percentage": final_state.get("progress_percentage", 100.0),
                    "message": final_state.get("progress_message", "Completed"),
                    "stage": final_state.get("current_stage", "complete")
                },
                "echarts_config": final_state.get("echarts_config"),
                "chart_config": final_state.get("echarts_config"),  # Alias for backward compatibility
                "chart_data": final_state.get("chart_data"),
                "insights": insights if isinstance(insights, list) else [],
                "recommendations": recommendations if isinstance(recommendations, list) else [],
                "executive_summary": executive_summary if executive_summary and isinstance(executive_summary, str) else None,  # Send separately
                "narration": narration,
                "analysis": narration,
                "execution_metadata": final_state.get("execution_metadata", {}),
                "error": final_state.get("error"),
                "conversation_id": conversation_id,
                "ai_engine": "LangGraph Multi-Agent Framework"  # Identify LangGraph orchestrator
            }
            
            logger.info(f"✅ LangGraph workflow completed in {execution_time_ms}ms after {node_count} nodes")
            logger.info(f"✅ Final progress: {final_state.get('progress_percentage', 0.0)}% - {final_state.get('progress_message', 'N/A')}")
            logger.info(f"✅ Success: {result.get('success')}, Has SQL: {bool(result.get('sql_query'))}, Has Results: {bool(result.get('query_result'))}, Has Chart: {bool(result.get('echarts_config'))}, Has Insights: {bool(result.get('insights'))}")
            
            # CRITICAL: Save messages to database for non-streaming requests
            # This ensures AI responses are persisted, updating user messages from "processing" to "completed"
            if conversation_id:
                try:
                    narration = result.get("narration") or result.get("message") or result.get("analysis", "")
                    result_dict = {
                        "success": result.get("success", True),
                        "echarts_config": result.get("echarts_config"),
                        "insights": result.get("insights", []),
                        "recommendations": result.get("recommendations", []),
                        "sql_query": result.get("sql_query"),
                        "query_result": result.get("query_result"),
                        "execution_metadata": result.get("execution_metadata", {})
                    }
                    await self._save_conversation_messages(conversation_id, query, narration, result_dict)
                    logger.info(f"✅ Saved messages for non-streaming request in conversation {conversation_id}")
                except Exception as save_error:
                    logger.error(f"⚠️ Failed to save messages for non-streaming request (non-critical): {save_error}")
            
            return result
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ LangGraph workflow failed: {error_msg}", exc_info=True)
            logger.error(f"❌ Exception type: {type(e).__name__}")
            logger.error(f"❌ Query: {query[:200]}")
            logger.error(f"❌ Data source ID: {data_source_id}")
            
            # Provide user-friendly error message
            user_message = f"Failed to analyze request: {error_msg[:200]}"
            if "timeout" in error_msg.lower() or "timed out" in error_msg.lower():
                user_message = "Request timed out. The query may be too complex or the data source may be slow. Please try a simpler query or check your data source connection."
            elif "connection" in error_msg.lower() or "connect" in error_msg.lower():
                user_message = "Connection error. Please check your data source connection and try again."
            elif "recursion" in error_msg.lower():
                user_message = "Workflow exceeded maximum steps. The query may be too complex. Please try a simpler query."
            
            return {
                "success": False,
                "error": error_msg,
                "query": query,
                "message": user_message,  # User-friendly message
                "execution_metadata": {
                    "status": "failed",
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "execution_time_ms": int((time.time() - start_time) * 1000),
                    "error": error_msg,
                    "error_type": type(e).__name__
                },
                "progress": {
                    "percentage": 0.0,
                    "message": f"Workflow failed: {error_msg[:100]}",
                    "stage": "error"
                }
            }
    
    def _get_partial_results(self, state: AiserWorkflowState) -> Dict[str, Any]:
        """
        Extract partial results from state for progress updates.
        
        Args:
            state: Current workflow state
        
        Returns:
            Dictionary with partial results information
        """
        return {
            "sql_query": state.get("sql_query"),
            "query_result_row_count": state.get("query_result_row_count"),
            "has_chart": bool(state.get("echarts_config")),
            "insights_count": len(state.get("insights", [])),
            "recommendations_count": len(state.get("recommendations", []))
        }
    
    async def _yield_final_result(
        self,
        final_state: AiserWorkflowState,
        query: str,
        conversation_id: str
    ) -> Dict[str, Any]:
        """
        Constructs the final result dictionary for streaming.
        This consolidates logic for both execute() and stream_workflow() final output.
        
        Args:
            final_state: Final workflow state
            query: Original user query
            conversation_id: Conversation ID
        
        Returns:
            Final result dictionary ready to be yielded
        """
        # Build final result similar to execute() method
        query_text = final_state.get("query", "")
        insights_raw = final_state.get("insights", [])
        recommendations_raw = final_state.get("recommendations", [])
        executive_summary = final_state.get("executive_summary")

        # CRITICAL: Normalize insights to ensure they're dictionaries, not strings
        def normalize_insights_list(items):
            """Convert string insights to dictionary format"""
            if not isinstance(items, list):
                return []
            normalized = []
            for idx, item in enumerate(items):
                if isinstance(item, str):
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

        insights = normalize_insights_list(insights_raw)
        recommendations = normalize_insights_list(recommendations_raw)

        # Generate natural language response (same as execute method)
        narration = None
        query_result_row_count = final_state.get("query_result_row_count") or 0
        
        # OPTIMIZATION: Skip LLM narration call if we already have executive_summary or good insights
        # This saves 1 LLM call and improves performance
        has_good_summary = executive_summary and isinstance(executive_summary, str) and len(executive_summary.strip()) > 50
        has_good_insights = insights and isinstance(insights, list) and len(insights) > 0
        
        # Only call LLM for narration if we don't have a good summary/insights
        # This is a performance optimization - saves ~1-2 seconds per request
        if query_result_row_count > 0 and self.litellm_service and not has_good_summary and not has_good_insights:
            try:
                query_intent = final_state.get("query_intent", {})
                chart_type = final_state.get("chart_type", "chart")

                nl_prompt = f"""You are Aicser AI, an expert data analytics assistant. Generate a natural, conversational response that directly answers the user's question.

**User's Question:** {query_text}

**Query Analysis:**
- Query Intent: {query_intent.get('aggregation_type', 'analysis')} with {query_intent.get('dimension_count', 0)} dimensions
- Results: {query_result_row_count} data point{'s' if query_result_row_count != 1 else ''}
- Chart Type: {chart_type}

**Your Task:**
Write a natural, conversational response (2-3 sentences) that directly answers the user's question.

Return ONLY the response text, no markdown, no quotes."""

                nl_result = await self.litellm_service.generate_completion(
                    prompt=nl_prompt,
                    system_context="You are Aicser AI, a helpful data analytics assistant. Generate natural, conversational responses that directly answer user questions.",
                    max_tokens=200,  # Reduced from 300 for faster response
                    temperature=0.5  # Reduced from 0.7 for more deterministic responses
                )

                if nl_result.get("success") and nl_result.get("content"):
                    narration = nl_result.get("content", "").strip()
                    narration = narration.strip('"').strip("'").strip()
                    if narration.startswith("```"):
                        narration = re.sub(r'```[a-z]*\n?', '', narration).strip()
                    logger.info(f"✅ Generated natural language response: {len(narration)} chars")
                else:
                    logger.warning("⚠️ LLM natural language generation failed, using fallback")
            except Exception as nl_err:
                logger.warning(f"⚠️ Natural language generation error: {nl_err}, using fallback")
        else:
            # Use executive summary or insights if available (performance optimization)
            if has_good_summary:
                narration = executive_summary
                logger.info(f"✅ Using executive summary as narration (saved 1 LLM call)")
            elif has_good_insights:
                # Build narration from first insight
                first_insight = insights[0]
                if isinstance(first_insight, dict):
                    insight_title = first_insight.get('title', '')
                    insight_desc = first_insight.get('description', '')[:100]
                    narration = f"Based on your query, {insight_title}. {insight_desc}"
                else:
                    narration = f"Based on your query, I've identified key insights from the data."
                logger.info(f"✅ Built narration from insights (saved 1 LLM call)")

        # CRITICAL: For conversational mode (no data_source_id), ensure we have a message
        # Check if this is conversational mode (no data_source_id and no query results)
        data_source_id = final_state.get("data_source_id")
        if not data_source_id and not narration:
            # Use the message/analysis from conversational_end node
            narration = final_state.get("message") or final_state.get("analysis") or final_state.get("narration") or ""
            if not narration or len(narration.strip()) < 10:
                query = final_state.get("query", "")
                narration = f"I understand you're asking: {query}. To perform data analysis, please select a data source first. I'm here to help coordinate the analysis once you do!"
                logger.info(f"✅ Generated conversational response for no data_source_id: {narration[:50]}...")
        
        # Fallback: Use executive summary or build from parts
        if not narration or len(narration.strip()) < 20:
            if executive_summary and isinstance(executive_summary, str) and len(executive_summary.strip()) > 20:
                narration = executive_summary
            else:
                narration_parts = []
                if query_result_row_count > 0:
                    narration_parts.append(f"Based on your question about {query_text.lower()}, I've analyzed {query_result_row_count} data point{'s' if query_result_row_count != 1 else ''}.")
                else:
                    narration_parts.append(f"I've processed your query: {query_text}.")

                if insights and isinstance(insights, list) and len(insights) > 0:
                    first_insight = insights[0]
                    if isinstance(first_insight, dict):
                        insight_title = first_insight.get('title', '')
                    else:
                        insight_title = str(first_insight)[:50]
                    if len(insights) == 1:
                        narration_parts.append(f"Key finding: {insight_title}.")
                    else:
                        narration_parts.append(f"I've identified {len(insights)} key insights from the data.")

                if recommendations and isinstance(recommendations, list) and len(recommendations) > 0:
                    first_rec = recommendations[0]
                    if isinstance(first_rec, dict):
                        rec_title = first_rec.get('title', '')
                    else:
                        rec_title = str(first_rec)[:50]
                    if len(recommendations) == 1:
                        narration_parts.append(f"Recommendation: {rec_title}.")
                    else:
                        narration_parts.append(f"I have {len(recommendations)} recommendations to help you take action.")
                
                narration = " ".join(narration_parts) if narration_parts else f"I've completed the analysis for: {query_text}"

        if not narration or len(narration.strip()) < 10:
            narration = f"I've completed the analysis for: {query_text}. Results are available below."

        # CRITICAL: If there's an error, convert to user-friendly message
        if final_state.get("error") or final_state.get("critical_failure", False):
            technical_error = final_state.get("error", "Unknown error occurred")
            user_friendly_error = _make_error_user_friendly(
                technical_error,
                context={"query": query_text, "stage": final_state.get("current_stage", "unknown")}
            )
            if not narration or narration == query_text or len(narration.strip()) < 20:
                narration = user_friendly_error
            else:
                narration = f"{narration}\n\n{user_friendly_error}"
            logger.error(f"❌ Workflow failed with error: {technical_error}")
            logger.info(f"💬 User-friendly error message: {user_friendly_error[:100]}...")

        # CRITICAL: Ensure we always have a message, even for conversational mode
        final_message = narration or final_state.get("message") or final_state.get("analysis") or f"I've processed your query: {query_text}."
        
        result = {
            "type": "complete",  # Mark as complete event
            "success": not final_state.get("critical_failure", False) and not final_state.get("error"),
            "query": query_text,
            "message": final_message,  # Frontend expects 'message' field - ALWAYS set
            "narration": narration or final_message,  # Also include narration
            "analysis": final_state.get("analysis") or final_message,  # Also include analysis
            "sql_query": final_state.get("sql_query"),
            "query_result": final_state.get("query_result", []),  # Direct array for frontend compatibility
            "query_result_data": final_state.get("query_result", []),  # Alias
            "query_result_row_count": final_state.get("query_result_row_count", 0),
            "query_result_columns": final_state.get("query_result_columns", []),
            "progress": {
                "percentage": final_state.get("progress_percentage", 100.0),
                "message": final_state.get("progress_message", "Completed"),
                "stage": final_state.get("current_stage", "complete")
            },
            "echarts_config": final_state.get("echarts_config"),
            "chart_config": final_state.get("echarts_config"),  # Alias for backward compatibility
            "chart_data": final_state.get("chart_data"),
            "insights": insights if isinstance(insights, list) else [],
            "recommendations": recommendations if isinstance(recommendations, list) else [],
            "executive_summary": executive_summary if executive_summary and isinstance(executive_summary, str) else None,
            "narration": narration,
            "analysis": narration,
            "execution_metadata": final_state.get("execution_metadata", {}),
            # CRITICAL: Ensure deep_analysis_charts are included in execution_metadata for frontend
            "deep_analysis_charts": final_state.get("execution_metadata", {}).get("deep_analysis_charts") if isinstance(final_state.get("execution_metadata"), dict) else None,
            "error": final_state.get("error"),
            "conversation_id": conversation_id,
            "ai_engine": "LangGraph Multi-Agent Framework",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        # CRITICAL: Ensure execution_metadata includes deep_analysis_charts for frontend compatibility
        if isinstance(result.get("execution_metadata"), dict):
            exec_meta = result["execution_metadata"]
            if "deep_analysis_charts" not in exec_meta and result.get("deep_analysis_charts"):
                exec_meta["deep_analysis_charts"] = result["deep_analysis_charts"]

        logger.info(f"✅ Final result: success={result['success']}, error={result.get('error')}")
        return result
    
    async def stream_workflow(
        self,
        query: str,
        conversation_id: str,
        user_id: str,
        organization_id: str,
        project_id: Optional[str] = None,
        data_source_id: Optional[str] = None,
        analysis_mode: str = "standard",
        agent_context: Optional[AgentContextSchema] = None,
        memory_state: Optional[LangChainMemorySchema] = None
    ):
        """
        Stream workflow execution for SSE (Server-Sent Events) support.
        
        Yields progress updates as the workflow executes.
        
        Args:
            query: User's natural language query
            conversation_id: Conversation ID
            user_id: User ID
            organization_id: Organization ID
            project_id: Optional project ID
            data_source_id: Optional data source ID
            analysis_mode: Analysis mode (standard/enhanced)
            agent_context: Optional agent context
            memory_state: Optional memory state
        
        Yields:
            Progress updates as dictionaries with progress_percentage, progress_message, stage, and partial results
        """
        try:
            # CRITICAL: Retrieve conversation history for context
            conversation_history = await self._get_conversation_history(conversation_id, limit=10)
            logger.info(f"📚 Conversation context (streaming): {len(conversation_history)} previous messages loaded")
            
            # Initialize state (same as execute)
            initial_state: AiserWorkflowState = {
                "state_version": "1.0",
                "query": query,
                "data_source_id": data_source_id,
                "sql_query": None,
                "query_result": None,
                "query_result_columns": None,
                "query_result_row_count": None,
                "query_execution_error": None,
                "echarts_config": None,
                "chart_data": None,
                "chart_type": None,
                "chart_title": None,
                "chart_generation_error": None,
                "insights": [],
                "recommendations": [],
                "executive_summary": None,
                "insights_generation_error": None,
                "execution_metadata": {
                    "status": "running",
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "execution_time_ms": 0,
                    "model_used": self.litellm_service.active_model or "unknown",
                    "confidence_scores": {},
                    "routing_decision": {},
                    "node_history": [],
                    "retry_count": 0,
                    "error_count": 0,
                    "query_execution_retry_count": 0,  # Track query execution retries separately
                    "error_recovery_count": 0  # Track error recovery attempts separately
                },
                "current_stage": "start",
                "retry_count": 0,
                "node_history": [],
                "error": None,
                "critical_failure": False,
                "progress_percentage": 0.0,
                "progress_message": "Starting analysis...",
                "agent_context": agent_context.model_dump() if agent_context else {
                    "user_id": user_id or "anonymous",
                    "organization_id": organization_id or "default",
                    "project_id": project_id,
                    "conversation_id": conversation_id
                },
                "conversation_history": conversation_history,  # Use retrieved history
                "user_id": user_id,
                "organization_id": organization_id,
                "project_id": project_id,
                "conversation_id": conversation_id,
                "state_snapshots": []
            }

            # Validate initial state
            validator = AiserWorkflowStateValidator.from_typed_dict(initial_state)
            initial_state = validator.to_typed_dict()

            last_yielded_percentage = -1.0
            last_yielded_stage = ""
            last_yielded_error = False
            last_state = None  # Track last state for completion check after loop
            completed = False  # Track if we've sent complete event
            
            # Stream through the workflow graph using values mode for better progress tracking
            async for update in self.compiled_graph.astream(
                initial_state,
                config={"configurable": {"thread_id": conversation_id}},
                stream_mode="values"  # Stream state values, not chunks
            ):
                # Store last state for potential completion check after loop
                last_state = update
                
                # Extract meaningful progress information
                progress_percentage = update.get("progress_percentage", 0.0)
                progress_message = update.get("progress_message", "")
                current_stage = update.get("current_stage", "")
                
                # CRITICAL: Check for completion FIRST on every state update (not just when yielding progress)
                # This ensures we catch completion even if progress conditions aren't met
                is_complete = (
                    current_stage == "complete" or
                    current_stage.endswith("_complete") or  # e.g., "unified_chart_insights_complete"
                    update.get("critical_failure") or
                    (progress_percentage >= 90.0 and 
                     update.get("echarts_config") is not None) or  # Has chart config and high progress
                    (progress_percentage >= 90.0 and 
                     update.get("insights") is not None and len(update.get("insights", [])) > 0)  # Has insights and high progress
                )
                
                if is_complete and not completed:
                    # Workflow is complete - yield final result
                    final_state = update.copy() if isinstance(update, dict) else update
                    # Ensure progress is at 100% for final result
                    final_state["progress_percentage"] = 100.0
                    final_state["current_stage"] = "complete"
                    final_state["progress_message"] = "Analysis complete!"
                    
                    # CRITICAL: Save messages in real-time when workflow completes
                    if conversation_id:
                        try:
                            narration = final_state.get("narration") or final_state.get("message") or final_state.get("analysis", "")
                            result_dict = {
                                "success": final_state.get("success", True),
                                "echarts_config": final_state.get("echarts_config"),
                                "insights": final_state.get("insights", []),
                                "recommendations": final_state.get("recommendations", []),
                                "sql_query": final_state.get("sql_query"),
                                "query_result": final_state.get("query_result"),
                                "execution_metadata": final_state.get("execution_metadata", {})
                            }
                            await self._save_conversation_messages(conversation_id, query, narration, result_dict)
                            logger.info(f"✅ Saved messages in real-time for conversation {conversation_id}")
                        except Exception as save_error:
                            logger.error(f"⚠️ Failed to save messages in real-time (non-critical): {save_error}")
                    
                    final_result = await self._yield_final_result(final_state, query, conversation_id)
                    logger.info("🌊 Yielding final complete event to frontend")
                    yield final_result
                    completed = True
                    break  # End the streaming loop
                
                # Only yield meaningful progress updates (not every state change)
                # But only if we haven't completed yet
                if not completed and (progress_percentage > last_yielded_percentage or 
                    current_stage != last_yielded_stage or
                    (update.get("error") and not last_yielded_error)):  # Always yield a new error
                    
                    # REMOVED: Incremental message saving to prevent duplicates
                    # Final message will be saved in _save_conversation_messages when workflow completes
                    # This prevents duplicate AI messages from being created during streaming
                    
                    logger.debug(f"🌊 Yielding progress update for stage: {current_stage}, percentage: {progress_percentage}, message: {progress_message}")
                    
                    # Extract reasoning steps from execution_metadata for real-time display
                    execution_metadata = update.get("execution_metadata", {})
                    reasoning_steps = execution_metadata.get("reasoning_steps") if isinstance(execution_metadata, dict) else None
                    
                    progress_update = {
                        "type": "progress",
                        "progress": {
                            "percentage": progress_percentage,
                            "message": progress_message,
                            "stage": current_stage
                        },
                        "percentage": progress_percentage,  # Also include at top level for compatibility
                        "message": progress_message,  # Also include at top level for compatibility
                        "stage": current_stage,  # Also include at top level for compatibility
                        "node": current_stage,  # Which node is currently executing
                        "partial_results": self._get_partial_results(update),
                        "reasoning_steps": reasoning_steps,  # Include reasoning steps for real-time display
                        "execution_metadata": {
                            "reasoning_steps": reasoning_steps
                        } if reasoning_steps else {},
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "error": update.get("error")  # Include error in progress update if present
                    }
                    
                    yield progress_update
                    last_yielded_percentage = progress_percentage
                    last_yielded_stage = current_stage
                    if update.get("error"):
                        last_yielded_error = True
            
            # CRITICAL: After loop ends, check if we need to send completion event
            # This handles cases where the stream ends without triggering completion check
            if not completed and last_state:
                logger.warning("⚠️ Stream ended without completion check, checking last state for completion")
                current_stage = last_state.get("current_stage", "")
                progress_percentage = last_state.get("progress_percentage", 0.0)
                is_complete = (
                    current_stage == "complete" or
                    current_stage.endswith("_complete") or
                    last_state.get("critical_failure") or
                    (progress_percentage >= 90.0 and 
                     last_state.get("echarts_config") is not None) or
                    (progress_percentage >= 90.0 and 
                     last_state.get("insights") is not None and len(last_state.get("insights", [])) > 0)
                )
                
                if is_complete:
                    final_state = last_state.copy() if isinstance(last_state, dict) else last_state
                    final_state["progress_percentage"] = 100.0
                    final_state["current_stage"] = "complete"
                    final_state["progress_message"] = "Analysis complete!"
                    
                    # CRITICAL: Save messages even if completion check happens after loop
                    if conversation_id:
                        try:
                            narration = final_state.get("narration") or final_state.get("message") or final_state.get("analysis", "")
                            result_dict = {
                                "success": final_state.get("success", True),
                                "echarts_config": final_state.get("echarts_config"),
                                "insights": final_state.get("insights", []),
                                "recommendations": final_state.get("recommendations", []),
                                "sql_query": final_state.get("sql_query"),
                                "query_result": final_state.get("query_result"),
                                "execution_metadata": final_state.get("execution_metadata", {})
                            }
                            await self._save_conversation_messages(conversation_id, query, narration, result_dict)
                            logger.info(f"✅ Saved messages after stream end for conversation {conversation_id}")
                        except Exception as save_error:
                            logger.error(f"⚠️ Failed to save messages after stream end (non-critical): {save_error}")
                    
                    final_result = await self._yield_final_result(final_state, query, conversation_id)
                    logger.info("🌊 Yielding final complete event after stream end")
                    yield final_result
                    completed = True
                else:
                    # Stream ended but workflow might not be complete - still try to save messages
                    logger.warning(f"⚠️ Stream ended but workflow may not be complete. Last stage: {current_stage}, progress: {progress_percentage}%")
                    
                    # CRITICAL: Still save messages even if workflow didn't complete properly
                    if conversation_id and last_state:
                        try:
                            narration = last_state.get("narration") or last_state.get("message") or last_state.get("analysis", "") or f"Processed query: {query}"
                            result_dict = {
                                "success": not last_state.get("critical_failure", False),
                                "echarts_config": last_state.get("echarts_config"),
                                "insights": last_state.get("insights", []),
                                "recommendations": last_state.get("recommendations", []),
                                "sql_query": last_state.get("sql_query"),
                                "query_result": last_state.get("query_result"),
                                "execution_metadata": last_state.get("execution_metadata", {})
                            }
                            await self._save_conversation_messages(conversation_id, query, narration, result_dict)
                            logger.info(f"✅ Saved messages for incomplete workflow in conversation {conversation_id}")
                        except Exception as save_error:
                            logger.error(f"⚠️ Failed to save messages for incomplete workflow (non-critical): {save_error}")
                    
        except Exception as e:
            logger.error(f"❌ Critical streaming error outside workflow: {e}", exc_info=True)
            # Ensure a complete error event is sent in case of critical workflow failure
            error_update = {
                "type": "complete",
                "success": False,
                "query": query,
                "message": _make_error_user_friendly(str(e), {"query": query, "stage": "critical_failure"}),
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            yield error_update

