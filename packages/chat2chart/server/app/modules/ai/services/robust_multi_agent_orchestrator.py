"""
Robust AI Multi-Agent Framework using LangChain

This implements a truly intelligent multi-agent system with:
- Dynamic agent selection via LLM routing
- Agent collaboration and communication
- Tool-based agent capabilities
- Memory and context sharing
- Adaptive behavior based on conversation history
"""

import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Callable
from uuid import UUID

from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import BaseTool
from langchain_core.language_models import BaseLanguageModel
from sqlalchemy import select

from app.modules.ai.services.performance_monitor import PerformanceMonitor
from app.modules.ai.services.langchain_memory_service import LangChainMemoryService
from app.modules.ai.services.context_enrichment_service import ContextEnrichmentService
from app.modules.ai.services.litellm_service import LiteLLMService
from app.modules.ai.agents.nl2sql_agent import EnhancedNL2SQLAgent
from app.modules.ai.agents.chart_generation_agent import IntelligentChartGenerationAgent
from app.modules.ai.agents.insights_agent import BusinessInsightsAgent
from app.modules.chats.schemas import (
    AIMetadataSchema,
    ReasoningStepSchema,
    ModelInfoSchema,
    TokenUsageSchema,
    LangChainMemorySchema,
    AgentContextSchema
)
import uuid

try:
    from app.modules.ai.services.llm_monitor import LLMMonitor
except Exception:
    LLMMonitor = None
    logging.getLogger(__name__).warning('LLMMonitor module not present; proceeding without LLM monitoring')

from app.modules.chats.messages.models import ChatMessage

logger = logging.getLogger(__name__)


class IntelligentAgentRouter:
    """
    LLM-based agent router that intelligently selects and coordinates agents.
    This replaces hard-coded routing with dynamic, context-aware agent selection.
    """
    
    def __init__(self, llm: BaseLanguageModel):
        self.llm = llm
        self.available_agents = {
            "nl2sql": {
                "name": "SQL Query Agent",
                "description": "Converts natural language to SQL queries and executes them",
                "capabilities": ["sql_generation", "query_execution", "data_analysis"],
                "tools": ["sql_generator", "query_executor", "schema_analyzer"]
            },
            "chart_generation": {
                "name": "Chart Generation Agent", 
                "description": "Creates visualizations and charts from data",
                "capabilities": ["visualization", "chart_creation", "data_visualization"],
                "tools": ["chart_generator", "data_processor", "visualization_optimizer"]
            },
            "insights": {
                "name": "Business Insights Agent",
                "description": "Generates business insights and recommendations",
                "capabilities": ["insight_generation", "trend_analysis", "recommendations"],
                "tools": ["insight_generator", "trend_analyzer", "recommendation_engine"]
            },
            "data_analysis": {
                "name": "Data Analysis Agent",
                "description": "Performs statistical analysis and data exploration",
                "capabilities": ["statistical_analysis", "data_exploration", "pattern_recognition"],
                "tools": ["statistical_analyzer", "pattern_detector", "data_explorer"]
            },
            "collaboration": {
                "name": "Collaboration Agent",
                "description": "Coordinates multiple agents for complex tasks",
                "capabilities": ["agent_coordination", "task_decomposition", "result_synthesis"],
                "tools": ["agent_coordinator", "task_planner", "result_synthesizer"]
            }
        }
    
    async def route_query(
        self, 
        query: str, 
        context: AgentContextSchema, 
        memory: LangChainMemorySchema,
        conversation_history: List[BaseMessage],
        analysis_mode: str = "standard"
    ) -> Dict[str, Any]:
        """
        Intelligently route query to appropriate agent(s) using LLM reasoning.
        """
        # Build routing prompt with context
        routing_prompt = self._build_routing_prompt(query, context, memory, conversation_history, analysis_mode)
        
        # Get LLM routing decision
        routing_response = await self.llm.ainvoke([
            SystemMessage(content=routing_prompt),
            HumanMessage(content=f"Route this query: {query}")
        ])
        
        # Parse routing decision
        routing_decision = self._parse_routing_decision(routing_response.content)
        
        return routing_decision
    
    def _build_routing_prompt(
        self, 
        query: str, 
        context: AgentContextSchema, 
        memory: LangChainMemorySchema,
        conversation_history: List[BaseMessage],
        analysis_mode: str = "standard"
    ) -> str:
        """Build comprehensive routing prompt with context."""
        
        prompt_parts = [
            "You are an intelligent agent router for a multi-agent AI system.",
            "Your task is to analyze user queries and determine which agent(s) should handle them.",
            "",
            "Available Agents:",
        ]
        
        for agent_id, agent_info in self.available_agents.items():
            prompt_parts.append(f"- {agent_id}: {agent_info['description']}")
            prompt_parts.append(f"  Capabilities: {', '.join(agent_info['capabilities'])}")
            prompt_parts.append(f"  Tools: {', '.join(agent_info['tools'])}")
            prompt_parts.append("")
        
        prompt_parts.extend([
            "Context Information:",
            f"- User Role: {context.user_role}",
            f"- Organization: {context.organization_id}",
            f"- Project: {context.project_id or 'None'}",
            f"- Available Data Sources: {len(context.data_sources)}",
            f"- User Permissions: {list(context.permissions.keys())}",
            f"- Requested Analysis Mode: {analysis_mode}", # Add analysis mode to context
            "",
            "Routing Rules:",
            "1. Analyze the query intent and complexity",
            "2. Consider user role and permissions",
            "3. Determine if single agent or multi-agent collaboration is needed",
            "4. Consider conversation history for context",
            "5. Select the most appropriate agent(s) and execution strategy, *prioritizing agents that align with the requested Analysis Mode*",
            "",
            "Response Format (JSON):",
            "{",
            '  "primary_agent": "agent_id",',
            '  "collaborating_agents": ["agent_id1", "agent_id2"],',
            '  "execution_strategy": "sequential|parallel|collaborative",',
            '  "reasoning": "explanation of routing decision",',
            '  "confidence": 0.0-1.0,',
            '  "estimated_complexity": "simple|moderate|complex"',
            "}"
        ])
        
        return "\n".join(prompt_parts)
    
    def _parse_routing_decision(self, response: str) -> Dict[str, Any]:
        """Parse LLM routing decision from response."""
        try:
            import re
            # Clean the response - remove markdown code blocks if present
            cleaned_response = response.strip()
            if '```json' in cleaned_response:
                cleaned_response = cleaned_response.split('```json')[1].split('```')[0].strip()
            elif '```' in cleaned_response:
                cleaned_response = cleaned_response.split('```')[1].split('```')[0].strip()
            
            # Extract JSON from response - try multiple strategies
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
            
            # Clean JSON string - remove trailing commas and fix common issues
            json_str = re.sub(r',\s*}', '}', json_str)  # Remove trailing commas before }
            json_str = re.sub(r',\s*]', ']', json_str)  # Remove trailing commas before ]
            
            # Parse JSON
                decision = json.loads(json_str)
                
                # Validate and set defaults
                return {
                    "primary_agent": decision.get("primary_agent", "insights"),
                    "collaborating_agents": decision.get("collaborating_agents", []),
                    "execution_strategy": decision.get("execution_strategy", "sequential"),
                    "reasoning": decision.get("reasoning", "Default routing"),
                    "confidence": decision.get("confidence", 0.7),
                    "estimated_complexity": decision.get("estimated_complexity", "moderate")
                }
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.warning(f"Failed to parse routing decision: {e}")
            logger.debug(f"Response was: {response[:200]}...")
        
        # Fallback to default routing
        return {
            "primary_agent": "insights",
            "collaborating_agents": [],
            "execution_strategy": "sequential", 
            "reasoning": "Fallback routing due to parsing error",
            "confidence": 0.5,
            "estimated_complexity": "moderate"
        }


class AgentTool(BaseTool):
    """Base class for agent tools with enhanced capabilities."""
    
    # Declare agent_id as a class attribute to avoid Pydantic validation errors
    agent_id: str = ""
    
    def __init__(self, name: str, description: str, agent_id: Optional[str] = None):
        super().__init__(name=name, description=description)
        # Set agent_id after super().__init__ to ensure it's properly set
        # Use object.__setattr__ to bypass Pydantic validation if needed
        object.__setattr__(self, 'agent_id', agent_id or "")
        object.__setattr__(self, '_agent_id', agent_id or "")
        object.__setattr__(self, '_execution_count', 0)
        object.__setattr__(self, '_success_count', 0)
    
    def _run(self, *args, **kwargs) -> str:
        """Synchronous execution."""
        raise NotImplementedError("Use async execution")
    
    async def _arun(self, *args, **kwargs) -> str:
        """Asynchronous execution."""
        self.execution_count += 1
        try:
            result = await self.execute(*args, **kwargs)
            self.success_count += 1
            return result
        except Exception as e:
            logger.error(f"Tool {self.name} execution failed: {e}")
            return f"Tool execution failed: {str(e)}"
    
    async def execute(self, *args, **kwargs) -> str:
        """Tool-specific execution logic."""
        raise NotImplementedError("Subclasses must implement execute method")
    
    @property
    def success_rate(self) -> float:
        """Calculate tool success rate."""
        if self.execution_count == 0:
            return 0.0
        return self.success_count / self.execution_count


class SQLGenerationTool(AgentTool):
    """Tool for generating SQL queries from natural language."""
    
    def __init__(self, nl2sql_agent):
        super().__init__(
            name="sql_generator",
            description="Generate SQL queries from natural language descriptions",
            agent_id="nl2sql"
        )
        self._nl2sql_agent = nl2sql_agent
    
    async def execute(self, query: str, context: Dict[str, Any]) -> str:
        """Generate SQL query from natural language."""
        try:
            result = await self._nl2sql_agent.generate_sql_query(
                query=query,
                agent_context=context.get("agent_context"),
                memory_state=context.get("memory_state")
            )
            
            if result.get("success"):
                return f"SQL Query Generated: {result.get('sql_query')}\nExplanation: {result.get('explanation')}"
            else:
                return f"SQL Generation Failed: {result.get('error')}"
                
        except Exception as e:
            return f"SQL generation error: {str(e)}"


class ChartGenerationTool(AgentTool):
    """Tool for generating charts and visualizations."""
    
    def __init__(self, chart_agent):
        super().__init__(
            name="chart_generator", 
            description="Generate charts and visualizations from data",
            agent_id="chart_generation"
        )
        self._chart_agent = chart_agent
    
    async def execute(self, query: str, context: Dict[str, Any]) -> str:
        """Generate chart from natural language."""
        try:
            result = await self._chart_agent.generate_chart(
                query=query,
                agent_context=context.get("agent_context"),
                memory_state=context.get("memory_state")
            )
            
            if result.get("success"):
                return f"Chart Generated: {result.get('chart_description')}\nConfiguration: Available"
            else:
                return f"Chart Generation Failed: {result.get('error')}"
                
        except Exception as e:
            return f"Chart generation error: {str(e)}"


class InsightGenerationTool(AgentTool):
    """Tool for generating business insights."""
    
    def __init__(self, insights_agent):
        super().__init__(
            name="insight_generator",
            description="Generate business insights and recommendations",
            agent_id="insights"
        )
        self._insights_agent = insights_agent
    
    async def execute(self, query: str, context: Dict[str, Any]) -> str:
        """Generate insights from natural language."""
        try:
            result = await self._insights_agent.generate_insights(
                query=query,
                agent_context=context.get("agent_context"),
                memory_state=context.get("memory_state")
            )
            
            if result.get("success"):
                insights = result.get("insights_list", [])
                recommendations = result.get("recommendations", [])
                return f"Insights Generated: {len(insights)} insights, {len(recommendations)} recommendations"
            else:
                return f"Insight Generation Failed: {result.get('error')}"
                
        except Exception as e:
            return f"Insight generation error: {str(e)}"


class CollaborationTool(AgentTool):
    """Tool for coordinating multiple agents."""
    
    def __init__(self, orchestrator):
        super().__init__(
            name="agent_coordinator",
            description="Coordinate multiple agents for complex tasks",
            agent_id="collaboration"
        )
        self._orchestrator = orchestrator
    
    async def execute(self, query: str, context: Dict[str, Any]) -> str:
        """Coordinate multiple agents for complex tasks."""
        try:
            # Decompose complex task into subtasks
            subtasks = await self._decompose_task(query, context)
            
            # Execute subtasks with appropriate agents
            results = []
            for subtask in subtasks:
                agent_result = await self._execute_subtask(subtask, context)
                results.append(agent_result)
            
            # Synthesize results
            synthesis = await self._synthesize_results(results, query)
            
            return f"Collaboration Complete: {len(subtasks)} subtasks executed\nSynthesis: {synthesis}"
            
        except Exception as e:
            return f"Collaboration error: {str(e)}"
    
    async def _decompose_task(self, query: str, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Decompose complex task into subtasks."""
        # This would use LLM to break down complex queries
        return [
            {"task": "analyze_data", "agent": "data_analysis", "description": "Analyze the data"},
            {"task": "generate_insights", "agent": "insights", "description": "Generate insights"},
            {"task": "create_visualization", "agent": "chart_generation", "description": "Create visualization"}
        ]
    
    async def _execute_subtask(self, subtask: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute individual subtask with appropriate agent."""
        # Route to appropriate agent based on subtask
        agent_id = subtask["agent"]
        # Implementation would call the specific agent
        return {"agent": agent_id, "result": "Subtask completed", "success": True}
    
    async def _synthesize_results(self, results: List[Dict[str, Any]], original_query: str) -> str:
        """Synthesize results from multiple agents."""
        # Use LLM to synthesize results from multiple agents
        return "Synthesized insights from multiple agents"


class RobustMultiAgentOrchestrator:
    """
    Robust multi-agent orchestrator using LangChain with intelligent routing,
    agent collaboration, and dynamic tool selection.
    """
    
    def __init__(
        self,
        async_session_factory: Optional[Any] = None,  # For async operations
        sync_session_factory: Optional[Any] = None,  # For sync operations like RBAC, Memory, Context
        litellm_service: Any = None,
        data_service: Any = None,
        multi_query_service: Any = None,
        chart_service: Any = None
    ):
        self.async_session_factory = async_session_factory
        self.sync_session_factory = sync_session_factory
        self.litellm_service = litellm_service or LiteLLMService()
        self.data_service = data_service
        self.multi_query_service = multi_query_service
        self.chart_service = chart_service
        
        # Initialize enhanced workflow pipeline if available
        try:
            from app.modules.ai.services.enhanced_workflow_pipeline import EnhancedWorkflowPipeline
            from app.modules.ai.services.schema_cache_service import get_schema_cache_service
            from app.modules.ai.services.query_cache_service import get_query_cache_service
            self.enhanced_pipeline = EnhancedWorkflowPipeline(
                orchestrator=self,
                multi_query_service=multi_query_service,
                schema_cache=get_schema_cache_service(),
                query_cache=get_query_cache_service()
            )
            logger.info("✅ Enhanced workflow pipeline initialized")
        except Exception as e:
            logger.warning(f"⚠️ Enhanced pipeline not available: {e}")
            self.enhanced_pipeline = None
        
        # Ensure Azure is preferred if available (BEFORE creating LLM)
        if self.litellm_service and self.litellm_service.azure_api_key and self.litellm_service.azure_endpoint:
            if not self.litellm_service.active_model or not self.litellm_service.active_model.startswith('azure_'):
                self.litellm_service.active_model = 'azure_gpt5_mini'
                logger.info("🎯 Setting active model to Azure GPT-5 Mini (Azure credentials available)")
        
        # Initialize services that might require a session factory
        if self.async_session_factory: # Changed to async_session_factory
            self.memory_service = LangChainMemoryService(self.async_session_factory)
            self.context_service = ContextEnrichmentService(self.async_session_factory)
            self.performance_monitor = PerformanceMonitor() # Removed session_factory
        else:
            # Use None for services that require session factory
            self.memory_service = None
            self.context_service = None
            self.performance_monitor = None
        
        # Initialize LLM for routing and coordination (will use active_model which is now Azure)
        self.llm = self._create_llm()
        
        # Initialize intelligent router with context analysis
        from app.modules.ai.services.intelligent_context_analyzer import SmartAgentRouter
        self.router = SmartAgentRouter(self.llm)
        
        # Initialize agents with zero data-copy support
        self.nl2sql_agent = EnhancedNL2SQLAgent(litellm_service, data_service, multi_query_service, async_session_factory) # Use async_session_factory
        try:
        self.chart_agent = IntelligentChartGenerationAgent(litellm_service, chart_service)
        except Exception as chart_init_error:
            logger.error(f"❌ Failed to initialize IntelligentChartGenerationAgent: {chart_init_error}", exc_info=True)
            # Fallback stub to avoid crashing orchestrator when agent initialization fails
            class _ChartAgentStub:
                def __init__(self, error_msg: str = ""):
                    self.error_msg = str(error_msg)
                async def generate_chart(self, data, query_intent="", title="", context=None, use_llm_based: bool = False):
                    # Return a minimal default chart config so the rest of the pipeline can proceed
                    return {
                        "success": False,
                        "error": f"Chart agent unavailable: {self.error_msg}",
                        "primary_chart": {
                            "title": {"text": title or "Chart", "left": "center"},
                            "tooltip": {"trigger": "axis"},
                            "xAxis": {"type": "category", "data": []},
                            "yAxis": {"type": "value"},
                            "series": []
                        },
                        "echarts_config": {
                            "title": {"text": title or "Chart", "left": "center"},
                            "tooltip": {"trigger": "axis"},
                            "xAxis": {"type": "category", "data": []},
                            "yAxis": {"type": "value"},
                            "series": []
                        }
                    }
                def _extract_chart_config_from_result(self, result_text: str):
                    # Best-effort: try to extract JSON object from text, otherwise return None
                    try:
                        m = re.search(r'\\{[\\s\\S]*\\}', result_text, re.DOTALL)
                        if m:
                            js = m.group(0)
                            # sanitize functions/comments
                            js = re.sub(r'//.*?\\n', '\\n', js)
                            js = re.sub(r'function\\s*\\([^\\)]*\\)\\s*\\{[\\s\\S]*?\\}', '\"__FUNCTION_PLACEHOLDER__\"', js)
                            return json.loads(js)
                    except Exception:
                        return None
                    return None
            self.chart_agent = _ChartAgentStub(chart_init_error)
        self.insights_agent = BusinessInsightsAgent(litellm_service, async_session_factory) # Use async_session_factory
        
        # Initialize tools
        self.tools = self._initialize_tools()
        
        # Create agent executor with tools
        self.agent_executor = self._create_agent_executor()
        
        # Start performance monitoring if available
        if self.performance_monitor:
            self.performance_monitor.start_monitoring()
    
    def update_model(self, model_id: str) -> bool:
        """Update the active model for all components."""
        try:
            # Update the LiteLLM service
            success = self.litellm_service.set_active_model(model_id)
            if success:
                # Update the LLM instance for router
                self.llm = self._create_llm()
                # Update the router with new LLM
                from app.modules.ai.services.intelligent_context_analyzer import SmartAgentRouter
                self.router = SmartAgentRouter(self.llm)
                
                # CRITICAL: Update agents' LLM instances
                # Agents use litellm_service.get_llm() which should use active_model, but let's be explicit
                if hasattr(self.nl2sql_agent, 'litellm_service'):
                    self.nl2sql_agent.litellm_service.set_active_model(model_id)
                if hasattr(self.chart_agent, 'litellm_service'):
                    self.chart_agent.litellm_service.set_active_model(model_id)
                if hasattr(self.insights_agent, 'litellm_service'):
                    self.insights_agent.litellm_service.set_active_model(model_id)
                
                logger.info(f"🔄 Updated orchestrator to use model: {model_id}")
                logger.info("   - Router LLM updated")
                logger.info(f"   - All agents updated to use model: {model_id}")
                return True
            else:
                logger.warning(f"⚠️ Failed to set active model: {model_id}")
            return False
        except Exception as e:
            logger.error(f"Failed to update model: {e}", exc_info=True)
            return False
        
        logger.info("🚀 Robust Multi-Agent Orchestrator initialized with intelligent routing")
    
    def _create_llm(self) -> BaseLanguageModel:
        """Create LLM instance for routing and coordination."""
        # Use the LiteLLM service's get_llm method which returns a LangChain-compatible LLM
        # This will use the active model if set, otherwise the default model
        return self.litellm_service.get_llm()
    
    def _initialize_tools(self) -> List[AgentTool]:
        """Initialize all available tools."""
        tools = [
            SQLGenerationTool(self.nl2sql_agent),
            ChartGenerationTool(self.chart_agent),
            InsightGenerationTool(self.insights_agent),
            CollaborationTool(self)
        ]
        return tools
    
    def _create_agent_executor(self) -> AgentExecutor:
        """Create agent executor with tools."""
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an intelligent AI assistant that can coordinate multiple specialized agents.
            
            You have access to the following tools:
            {tools}
            
            Use these tools to help users with their data analysis needs.
            When you need to coordinate multiple agents, use the agent_coordinator tool.
            
            Always provide clear explanations of your reasoning and the steps you're taking."""),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        
        agent = create_tool_calling_agent(self.llm, self.tools, prompt)
        return AgentExecutor(agent=agent, tools=self.tools, verbose=True)
    
    async def analyze_query(
        self,
        query: str,
        conversation_id: str,
        user_id: str,
        organization_id: str,
        project_id: Optional[str] = None,
        data_source_id: Optional[str] = None,
        analysis_type: str = "general",
        analysis_mode: str = "standard",  # Add analysis_mode here
        use_enhanced_pipeline: bool = True,  # Use enhanced pipeline by default
        progress_callback: Optional[Callable] = None  # Progress callback for real-time updates
    ) -> Dict[str, Any]:
        """
        Analyze query using robust multi-agent framework with intelligent routing.
        """
        start_time = time.time()
        reasoning_steps = []
        request_id = str(uuid.uuid4())
        
        # Fetch conversation history for context (if conversation_id exists)
        actual_conversation_history = []
        if conversation_id:
            try:
                actual_conversation_history = await self._get_conversation_history(UUID(conversation_id))
                logger.info(f"Retrieved {len(actual_conversation_history)} messages from conversation history for {conversation_id}")
            except Exception as e:
                logger.warning(f"Failed to load conversation history for {conversation_id}: {e}")
        
        try:
            # Step 0: Input Validation (CRITICAL for security and robustness)
            try:
                # Validate query input
                if not query or not query.strip():
                    return {
                        "success": False,
                        "error": "empty_query",
                        "message": "Query cannot be empty",
                        "user_message": "Please provide a question or query to analyze."
                    }
                
                # Basic query sanitization
                query = query.strip()[:2000]  # Limit length
                logger.debug(f"✅ Query input validated: {len(query)} chars")
            except Exception as validation_exception:
                logger.debug(f"Input validation not available: {validation_exception}")
            
            # Step 1: RBAC Validation - removed, always allow
            # Organization/RBAC context removed - all users have permission
            has_permission = True
            
            # CRITICAL: If no data_source_id, use conversational AI (simple LLM)
            # Path 3/4 (Standard Flow) requires data_source_id to execute SQL
            # If no data source, user is asking conversational questions, not data analysis
            if not data_source_id:
                logger.info("💬 No data source provided - using conversational AI (simple LLM)")
                # Use simple LLM for conversational responses
                try:
                    # Ensure conversation_id is a UUID for history lookup (handle string UUIDs)
                    conversation_history = []
                    if hasattr(self, '_get_conversation_history'):
                        try:
                            from uuid import UUID as _UUID
                            conv_uuid = _UUID(conversation_id) if conversation_id else None
                            if conv_uuid:
                                conversation_history = await self._get_conversation_history(conv_uuid)
                        except Exception as _conv_err:
                            logger.debug(f"Could not parse conversation_id to UUID for history: {_conv_err}")
                    conversational_response = await self.litellm_service.generate_completion(
                        prompt=f"User: {query}\n\nProvide a helpful, conversational response.",
                        system_context="You are Aiser, an AI assistant for data analytics. Answer questions conversationally and helpfully. If the user needs data analysis, suggest they connect a data source.",
                        max_tokens=1000,
                        temperature=0.7
                    )
                    if conversational_response.get("success"):
                        return {
                            "success": True,
                            "message": conversational_response.get("content", ""),
                            "narration": conversational_response.get("content", ""),
                            "analysis": conversational_response.get("content", ""),
                            "metadata": {
                                "pipeline_used": "conversational",
                                "generation_method": "simple_llm",
                                "reasoning_steps": []
                            }
                        }
                except Exception as conv_error:
                    logger.warning(f"⚠️ Conversational AI failed: {conv_error}, falling back to standard response")
                    return {
                        "success": False,
                        "message": "I'd be happy to help! To analyze your data, please connect a data source first. You can do this from the Data Sources panel.",
                        "error": "No data source provided",
                        "metadata": {
                            "pipeline_used": "conversational",
                            "generation_method": "fallback"
                        }
                    }
            
            # OPTIMIZATION: Use enhanced pipeline if available and enabled
            # CRITICAL: At this point, we have data_source_id (checked above)
            if use_enhanced_pipeline and self.enhanced_pipeline:
                logger.info("🚀 Using enhanced workflow pipeline for enterprise-grade execution")
                try:
                    # Load context and memory first
                    conversation_uuid = UUID(conversation_id)
                    if self.memory_service:
                        memory_state = await self.memory_service.load_memory_from_db(conversation_uuid)
                        if not memory_state:
                            memory_state = self.memory_service.initialize_new_memory()
                            await self.memory_service.save_memory_to_db(conversation_uuid, memory_state)
                    else:
                        from app.modules.chats.schemas import LangChainMemorySchema
                        memory_state = LangChainMemorySchema(
                            conversation_id=str(conversation_uuid),
                            conversation_summary=None,
                            recent_messages=[],
                            created_at=datetime.now(timezone.utc),
                            updated_at=datetime.now(timezone.utc)
                        )
                    
                    # Build agent context
                    if self.memory_service:
                        agent_context = await self.memory_service.load_agent_context_from_db(conversation_uuid)
                        if not agent_context:
                            agent_context = self.memory_service.initialize_new_agent_context(
                                user_id=user_id,
                                user_role="analyst",
                                organization_id=organization_id,
                                project_id=project_id,
                                data_sources=[data_source_id] if data_source_id else []
                            )
                            await self.memory_service.save_agent_context_to_db(conversation_uuid, agent_context)
                    else:
                        from app.modules.chats.schemas import AgentContextSchema
                        agent_context = AgentContextSchema(
                            user_id=user_id,
                            organization_id=organization_id,
                            project_id=project_id,
                            user_role="analyst",
                            permissions={"read": True, "write": True},
                            data_sources=[data_source_id] if data_source_id else [],
                            business_context=None,
                            conversation_history=[]
                        )
                    
                    # CRITICAL: Log which path will be used
                    logger.info("🔀 EXECUTION PATH DECISION:")
                    logger.info(f"  - use_enhanced_pipeline: {use_enhanced_pipeline}")
                    logger.info(f"  - data_source_id: {data_source_id}")
                    execution_path = "ENHANCED PIPELINE" if (use_enhanced_pipeline and data_source_id) else "STANDARD FLOW"
                    logger.info(f"  - Will use: {execution_path}")
                    
                    # OPTIMIZATION: Build smart context ONLY for complex queries (cost optimization)
                    # Simple queries don't need expensive context engineering
                    smart_context = None
                    query_complexity = len(query.split())  # Simple heuristic
                    is_complex_query = query_complexity > 10 or any(word in query.lower() for word in ["analyze", "compare", "trend", "forecast", "insight"])
                    
                    if is_complex_query and self.litellm_service:
                        try:
                            from app.modules.ai.services.smart_context_engineer import get_smart_context_engineer
                            context_engineer = get_smart_context_engineer(
                                litellm_service=self.litellm_service,
                                async_session_factory=self.async_session_factory
                            )
                            smart_context = await context_engineer.build_smart_context(
                                query=query,
                                user_id=user_id,
                                organization_id=organization_id,
                                data_source_id=data_source_id,
                                conversation_history=actual_conversation_history
                            )
                            logger.info(f"🧠 Smart context built for complex query: intent={smart_context.get('query_intent')}")
                        except Exception as context_error:
                            logger.warning(f"⚠️ Smart context building failed: {context_error}")
                    else:
                        logger.debug("⏭️ Skipping smart context for simple query (cost optimization)")
                    
                    # Execute via enhanced pipeline with progress callback
                    logger.info("🚀 Using ENHANCED PIPELINE for query execution")
                    pipeline_result = await self.enhanced_pipeline.execute_workflow(
                        query=query,
                        data_source_id=str(data_source_id) if data_source_id is not None else "",
                        agent_context=agent_context,
                        progress_callback=progress_callback,  # Pass progress callback
                        smart_context=smart_context
                    )
                    
                    # CRITICAL: Log enhanced pipeline results
                    logger.info(f"📊 Enhanced pipeline returned: success={pipeline_result.get('success')}")
                    logger.info(f"   Components: SQL={bool(pipeline_result.get('sql_query'))}, Chart={bool(pipeline_result.get('echarts_config'))}, Insights={bool(pipeline_result.get('insights'))}, Narration={bool(pipeline_result.get('narration'))}")
                    
                    # CRITICAL: Normalize enhanced pipeline result using unified extraction
                    # This ensures consistent format and proper component extraction
                    from app.modules.ai.utils.result_extraction import normalize_result_structure
                    
                    normalized_result = normalize_result_structure(pipeline_result)
                    logger.info("✅ Normalized enhanced pipeline result using unified extraction")
                    logger.info(f"   Normalized Components: SQL={bool(normalized_result.get('sql_query'))}, Chart={bool(normalized_result.get('echarts_config'))}, Insights={bool(normalized_result.get('insights'))}, Narration={bool(normalized_result.get('narration'))}")
                    
                    # CRITICAL: Ensure enhanced pipeline result has same structure as standard flow
                    # This ensures _combine_results can extract components correctly
                    # Enhanced pipeline already structures results correctly, but ensure metadata is set
                    if not normalized_result.get("metadata"):
                        normalized_result["metadata"] = {}
                    normalized_result["metadata"]["pipeline_used"] = "enhanced"
                    # Determine generation method from result
                    has_chart = bool(normalized_result.get("echarts_config"))
                    has_insights = bool(normalized_result.get("insights"))
                    if has_chart and has_insights:
                        normalized_result["metadata"]["generation_method"] = pipeline_result.get("metadata", {}).get("generation_method", "unified")
                    else:
                        normalized_result["metadata"]["generation_method"] = "separate"
                    
                    # Update memory if successful
                    if normalized_result.get("success") and self.memory_service:
                        await self._update_conversation_memory(
                            conversation_uuid, query, normalized_result.get("narration", ""), memory_state
                        )
                    
                    # CRITICAL: Standardize return value name - use final_result for consistency
                    # Enhanced pipeline already has complete result, just standardize the name
                    execution_time = int((time.time() - start_time) * 1000)
                    final_result = {
                        **normalized_result,
                        "metadata": {
                            **normalized_result.get("metadata", {}),
                            "execution_time_ms": execution_time,
                            "pipeline_used": "enhanced",
                            "reasoning_steps": reasoning_steps
                        }
                    }

                    # If enhanced pipeline produced SQL but did not execute it, attempt execution
                    try:
                        comps = final_result.get("metadata", {}).get("components_generated", {}) if isinstance(final_result.get("metadata", {}), dict) else {}
                        if final_result.get("sql_query") and not final_result.get("query_result") and self.multi_query_service and self.data_service:
                            logger.info("🔁 Enhanced pipeline produced SQL but no query_result: attempting execution via MultiEngineQueryService (auto-default)")
                            try:
                                ds = await self.data_service.get_data_source_by_id(data_source_id)
                                if ds:
                                    # Unescape common escaped sequences that may remain from LLM output
                                    sql_to_exec = final_result["sql_query"]
                                    if isinstance(sql_to_exec, str):
                                        sql_to_exec = sql_to_exec.strip()
                                        # Remove surrounding quotes if present
                                        if (sql_to_exec.startswith('"') and sql_to_exec.endswith('"')) or (sql_to_exec.startswith("'") and sql_to_exec.endswith("'")):
                                            sql_to_exec = sql_to_exec[1:-1]
                                        # Replace common escaped sequences
                                        sql_to_exec = sql_to_exec.replace("\\\\n", "\\n").replace("\\n", "\n").replace("\\\\t", "\\t").replace("\\t", "\t").replace('\\"', '"').replace("\\'", "'")
                                        sql_to_exec = sql_to_exec.strip()
                                    logger.debug(f"Executing SQL via MultiEngineQueryService (repr): {repr(sql_to_exec)}")
                                    exec_res = await self.multi_query_service.execute_query(query=sql_to_exec, data_source=ds, optimization=True)
                                    # Retry logic: if execution failed, attempt aggressive sanitization and try once more
                                    if not exec_res.get("success"):
                                        try:
                                            logger.warning("⚠️ Initial auto-execution failed; attempting aggressive sanitize+retry")
                                            import re as _re
                                            # Aggressive cleanup: remove backslashes, strip trailing non-SQL, keep first SELECT block
                                            aggressive = sql_to_exec.replace('\\\\', '').replace('\\n', '\n').replace('\\t', '\t')
                                            
                                            # CRITICAL: Remove "idididididididididididid" corruption pattern
                                            # Pattern: "id" as a group repeated 3+ times
                                            aggressive = _re.sub(r'(id){3,}', ' ', aggressive, flags=_re.IGNORECASE)
                                            aggressive = _re.sub(r'([A-Za-z]+)(id){3,}([A-Za-z]+)', r'\1 \3', aggressive, flags=_re.IGNORECASE)
                                            aggressive = _re.sub(r'(id){3,}([A-Za-z]+)', r'\2', aggressive, flags=_re.IGNORECASE)
                                            aggressive = _re.sub(r'([A-Za-z]+)(id){3,}', r'\1', aggressive, flags=_re.IGNORECASE)
                                            
                                            sel = _re.search(r'(?i)(\bSELECT\b[\s\S]*?;)', aggressive)
                                            if sel:
                                                aggressive = sel.group(1)
                                            # Remove any non-printable characters
                                            aggressive = _re.sub(r'[^\x09\x0A\x0D\x20-\x7E]', ' ', aggressive).strip()
                                            # Normalize whitespace
                                            aggressive = _re.sub(r'\s+', ' ', aggressive)
                                            logger.debug(f"Retry SQL (repr): {repr(aggressive)}")
                                            exec_res = await self.multi_query_service.execute_query(query=aggressive, data_source=ds, optimization=True)
                                        except Exception as retry_err:
                                            logger.debug(f"Retry execution failed: {retry_err}")
                                        # If still failing and target is ClickHouse, try direct HTTP execution as last-resort
                                        if not exec_res.get("success"):
                                            try:
                                                ds_db_type = (ds.get('db_type') or ds.get('type') or '').lower()
                                                if ds_db_type == 'clickhouse':
                                                    import httpx, json, re as _re2
                                                    conn = ds.get('connection_info') or ds.get('config') or {}
                                                    host = conn.get('host') or ds.get('host') or 'localhost'
                                                    port = int(conn.get('port', 8123) or 8123)
                                                    database = conn.get('database') or ds.get('database') or 'default'
                                                    username = conn.get('username') or conn.get('user') or ''
                                                    password = conn.get('password') or ''
                                                    url = f"http://{host}:{port}/"
                                                    # Prepare final query for HTTP: aggressive cleaning
                                                    final_q = aggressive if 'aggressive' in locals() else sql_to_exec
                                                    if isinstance(final_q, str):
                                                        final_q = final_q.strip()
                                                        final_q = final_q.replace('\\\\', '').replace('\\n', '\n').replace('\\t', '\t')
                                                        
                                                        # CRITICAL: Remove "idididididididididididid" corruption pattern
                                                        # Pattern: "id" as a group repeated 3+ times
                                                        final_q = _re2.sub(r'(id){3,}', ' ', final_q, flags=_re2.IGNORECASE)
                                                        final_q = _re2.sub(r'([A-Za-z]+)(id){3,}([A-Za-z]+)', r'\1 \3', final_q, flags=_re2.IGNORECASE)
                                                        final_q = _re2.sub(r'(id){3,}([A-Za-z]+)', r'\2', final_q, flags=_re2.IGNORECASE)
                                                        final_q = _re2.sub(r'([A-Za-z]+)(id){3,}', r'\1', final_q, flags=_re2.IGNORECASE)
                                                        
                                                        # Extract first SELECT block
                                                        m = _re2.search(r'(?i)(\bSELECT\b[\s\S]*?;)', final_q)
                                                        if m:
                                                            final_q = m.group(1)
                                                        # Remove non-printables
                                                        final_q = _re2.sub(r'[^\x09\x0A\x0D\x20-\x7E]', ' ', final_q).strip()
                                                        # Normalize whitespace
                                                        final_q = _re2.sub(r'\s+', ' ', final_q)
                                                    # Ensure FORMAT JSONEachRow
                                                    if not _re2.search(r'\bFORMAT\s+JSONEACHROW', final_q, _re2.IGNORECASE):
                                                        final_q = final_q.rstrip(';').strip() + ' FORMAT JSONEachRow'
                                                    logger.info("🔁 Attempting ClickHouse HTTP fallback execution")
                                                    async with httpx.AsyncClient(timeout=30.0) as client:
                                                        resp = await client.post(url, params={"database": database}, content=final_q.encode('utf-8'), auth=(username, password) if username else None, headers={'Content-Type': 'text/plain; charset=utf-8'})
                                                        if resp.status_code == 200:
                                                            rows = []
                                                            for ln in resp.text.splitlines():
                                                                ln = ln.strip()
                                                                if not ln:
                                                                    continue
                                                                try:
                                                                    rows.append(json.loads(ln))
                                                                except Exception:
                                                                    continue
                                                            exec_res = {"success": True, "data": rows, "columns": list(rows[0].keys()) if rows else [], "row_count": len(rows), "engine": "clickhouse_http_fallback"}
                                                            logger.info("✅ ClickHouse HTTP fallback execution succeeded")
                                                        else:
                                                            logger.warning(f"ClickHouse HTTP fallback failed: {resp.status_code} - {resp.text[:500]}")
                                            except Exception as ch_err:
                                                logger.debug(f"ClickHouse HTTP fallback failed: {ch_err}")
                                    if exec_res.get("success"):
                                        final_result["query_result"] = {
                                            "success": True,
                                            "data": exec_res.get("data", []),
                                            "row_count": exec_res.get("row_count", len(exec_res.get("data", []))),
                                            "columns": exec_res.get("columns", [])
                                        }
                                        final_result["chart_data"] = final_result.get("query_result", {}).get("data")
                                        final_result.setdefault("metadata", {}).setdefault("components_generated", {})["query_executed"] = True
                                        logger.info("✅ Auto-execution succeeded via MultiEngineQueryService")
                                        # Try generating chart automatically if not present
                                        if not final_result.get("echarts_config") and self.chart_service:
                                            try:
                                                chart_resp = await self.chart_service.generate_chart_from_query(
                                                    data=final_result["query_result"]["data"],
                                                    query_analysis={"sql": final_result.get("sql_query"), "explanation": final_result.get("explanation", "")},
                                                    options={}
                                                )
                                                final_result["echarts_config"] = chart_resp.get("chart_config")
                                                final_result.setdefault("metadata", {}).setdefault("components_generated", {})["chart"] = bool(final_result.get("echarts_config"))
                                                final_result["chart_data"] = final_result["query_result"]["data"]
                                                logger.info("✅ Auto-chart generation succeeded")
                                            except Exception as chart_err:
                                                logger.warning(f"Auto chart generation failed: {chart_err}")
                                        # Try generating insights automatically if not present
                                        if not final_result.get("insights") and hasattr(self, "insights_agent"):
                                            try:
                                                insights_resp = await self.insights_agent.generate_insights(final_result["query_result"]["data"], query, context=agent_context if 'agent_context' in locals() else None)
                                                if isinstance(insights_resp, dict):
                                                    final_result["insights"] = insights_resp.get("insights", [])
                                                    final_result["recommendations"] = insights_resp.get("recommendations", [])
                                                    final_result.setdefault("metadata", {}).setdefault("components_generated", {})["insights"] = bool(final_result.get("insights"))
                                                    logger.info("✅ Auto insights generation succeeded")
                                            except Exception as ins_err:
                                                logger.warning(f"Auto insights generation failed: {ins_err}")
                            except Exception as exec_error:
                                logger.warning(f"Auto execution via MultiEngineQueryService failed: {exec_error}")
                    except Exception:
                        # Non-critical; continue returning final_result
                        pass
                    
                    # CRITICAL: Log final result components before returning
                    logger.info("📤 FINAL RESULT (Enhanced Pipeline):")
                    logger.info(f"   Success: {final_result.get('success')}")
                    logger.info(f"   SQL Query: {bool(final_result.get('sql_query'))}")
                    logger.info(f"   Query Result: {bool(final_result.get('query_result'))}")
                    logger.info(f"   Chart Config: {bool(final_result.get('echarts_config'))}")
                    logger.info(f"   Insights: {len(final_result.get('insights', []))} items")
                    logger.info(f"   Narration: {bool(final_result.get('narration'))}")
                    
                    return final_result
                except Exception as pipeline_error:
                    logger.warning(f"⚠️ Enhanced pipeline failed, falling back to standard flow: {pipeline_error}")
                    # Fall through to standard flow
            
            # Step 2: Load context and memory (standard flow)
            conversation_uuid = UUID(conversation_id)
            if self.memory_service:
                memory_state = await self.memory_service.load_memory_from_db(conversation_uuid)
                if not memory_state:
                    memory_state = self.memory_service.initialize_new_memory()
                    await self.memory_service.save_memory_to_db(conversation_uuid, memory_state)
            else:
                # Fallback: create simple memory state for development
                from app.modules.chats.schemas import LangChainMemorySchema
                memory_state = LangChainMemorySchema(
                    conversation_id=str(conversation_uuid),
                    conversation_summary=None,
                    recent_messages=[],
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc)
                )

            if self.memory_service:
                agent_context = await self.memory_service.load_agent_context_from_db(conversation_uuid)
                if not agent_context:
                    agent_context = self.memory_service.initialize_new_agent_context(
                        user_id=user_id,
                        user_role="analyst",
                        organization_id=organization_id,
                        project_id=project_id,
                        data_sources=[data_source_id] if data_source_id else []
                    )
                    await self.memory_service.save_agent_context_to_db(conversation_uuid, agent_context)
                    logger.info(f"✅ Created new agent context with data source: {data_source_id}")
                else:
                    # Ensure data_source_id is in the agent context's data_sources list
                    if data_source_id and data_source_id not in agent_context.data_sources:
                        agent_context.data_sources.append(data_source_id)
                        await self.memory_service.save_agent_context_to_db(conversation_uuid, agent_context)
                        logger.info(f"✅ Added data source {data_source_id} to agent context")
            else:
                # Fallback: create simple agent context for development
                from app.modules.chats.schemas import AgentContextSchema
                agent_context = AgentContextSchema(
                    user_id=user_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    user_role="analyst",  # Use valid enum value
                    permissions={"read": True, "write": True},  # Use dict format
                    data_sources=[data_source_id] if data_source_id else [],
                    business_context=None,
                    conversation_history=[]
                )
                logger.info(f"✅ Created fallback agent context with data source: {data_source_id}")
            
            # CRITICAL: Early data source validation - prevent agent execution if data source is invalid
            # OPTIMIZATION: Use schema cache to avoid redundant schema retrieval
            data_source_valid = False
            data_source_schema = None
            if data_source_id:
                try:
                    from app.modules.data.services.data_connectivity_service import DataConnectivityService
                    from app.modules.ai.services.schema_cache_service import get_schema_cache_service
                    
                    schema_cache = get_schema_cache_service()
                    
                    # OPTIMIZATION: Check cache first
                    data_source_schema = schema_cache.get_schema(data_source_id)
                    if data_source_schema:
                        logger.info(f"✅ Using cached schema for {data_source_id}: {len(data_source_schema)} tables/objects")
                    
                    data_service_check = DataConnectivityService()
                    source = await data_service_check.get_data_source_by_id(data_source_id)
                    if source:
                        data_source_valid = True
                        logger.info(f"✅ Valid data source found: {data_source_id}, type: {source.get('type', 'unknown')}")
                        
                        # OPTIMIZATION: Check cache FIRST before fetching
                        from app.modules.ai.services.schema_cache_service import get_schema_cache_service
                        schema_cache = get_schema_cache_service()
                        cached_schema = schema_cache.get_schema(data_source_id)
                        
                        if cached_schema:
                            logger.info(f"✅ Using cached schema for {data_source_id} (cache hit)")
                            data_source_schema = cached_schema
                        # Only fetch schema if not in cache
                        elif not data_source_schema:
                            try:
                                logger.info(f"📊 Cache miss for {data_source_id}, fetching schema...")
                                schema_result = await data_service_check.get_source_schema(data_source_id)
                                if schema_result.get('success'):
                                    # Handle both dict format and tables array format
                                    data_source_schema = schema_result.get('schema', {})
                                    
                                    # If schema is empty but we have tables array, transform it
                                    if not data_source_schema and schema_result.get('tables'):
                                        logger.info("📊 Transforming tables array to dict format")
                                        data_source_schema = {}
                                        for table_info in schema_result.get('tables', []):
                                            if isinstance(table_info, dict):
                                                table_name = table_info.get('name', '')
                                                if table_name:
                                                    data_source_schema[table_name] = {
                                                        'columns': table_info.get('columns', []),
                                                        'engine': table_info.get('engine', ''),
                                                        'schema': table_info.get('schema', ''),
                                                        'rowCount': table_info.get('rowCount', 0)
                                                    }
                                        logger.info(f"✅ Transformed {len(data_source_schema)} tables to dict format")
                                    
                                    # Ensure we have a dict with table names as keys
                                    if not isinstance(data_source_schema, dict):
                                        logger.warning(f"⚠️ Schema is not a dict: {type(data_source_schema)}, converting")
                                        data_source_schema = {}
                                    
                                    # Summarize schema if too large (e.g., >50 tables or >100KB)
                                    schema_size = len(str(data_source_schema))
                                    if schema_size > 100000:  # ~100KB
                                        logger.info(f"📊 Schema is large ({schema_size} bytes), will summarize for LLM")
                                        # Keep only essential info: table names, key columns
                                        summarized_schema = {}
                                        for table_name, table_info in list(data_source_schema.items())[:50]:  # Limit to 50 tables
                                            if isinstance(table_info, dict):
                                                summarized_schema[table_name] = {
                                                    "columns": table_info.get("columns", [])[:20] if isinstance(table_info.get("columns"), list) else table_info.get("columns", {})
                                                }
                                        data_source_schema = summarized_schema
                                        logger.info(f"📊 Summarized schema: {len(summarized_schema)} tables")
                                    else:
                                        logger.info(f"📊 Schema retrieved: {len(data_source_schema)} tables/objects")
                                        # Log table names for debugging
                                        if data_source_schema:
                                            table_names = list(data_source_schema.keys())[:10]
                                            logger.info(f"📊 Sample tables: {table_names}")
                                    
                                    # OPTIMIZATION: Cache the schema for future queries
                                    schema_cache.set_schema(data_source_id, data_source_schema, ttl_hours=24)
                                    logger.info(f"✅ Cached schema for {data_source_id} (will reuse for 24h)")
                            except Exception as schema_error:
                                logger.warning(f"⚠️ Could not retrieve schema: {schema_error}, will proceed without schema")
                                data_source_schema = {}
                            
                            # CRITICAL: If schema is still empty, try to fetch live schema directly
                            if not data_source_schema or (isinstance(data_source_schema, dict) and len(data_source_schema) == 0):
                                logger.warning(f"⚠️ Schema is empty after retrieval, attempting to fetch live schema for {data_source_id}")
                                try:
                                    live_schema_result = await data_service_check.get_database_schema(data_source_id)
                                    if live_schema_result.get('success') and live_schema_result.get('schema'):
                                        # Use the schema directly (it should already be in dict format from get_database_schema)
                                        live_schema_dict = live_schema_result.get('schema', {})
                                        # Check if it needs transformation (has 'tables' array but no table-name keys)
                                        if isinstance(live_schema_dict, dict) and 'tables' in live_schema_dict:
                                            # Use the data service's transformation method
                                            transformed = data_service_check._transform_schema_to_dict_format({
                                                'success': True,
                                                'tables': live_schema_dict.get('tables', []),
                                                'schema': live_schema_dict
                                            })
                                            data_source_schema = transformed.get('schema', live_schema_dict)
                                        else:
                                            data_source_schema = live_schema_dict
                                        # Cache the fetched schema for future use
                                        schema_cache.set_schema(data_source_id, data_source_schema)
                                        logger.info(f"✅ Fetched live schema and cached: {len(data_source_schema)} tables/objects")
                                    else:
                                        logger.warning(f"⚠️ Live schema fetch failed: {live_schema_result.get('error', 'Unknown error')}")
                                except Exception as live_schema_error:
                                    logger.warning(f"⚠️ Failed to fetch live schema: {live_schema_error}")
                        
                        # CRITICAL: Validate schema has tables before proceeding
                        # Check if schema has actual table data (not just metadata)
                        schema_has_tables = False
                        if isinstance(data_source_schema, dict):
                            # Check for direct table keys (dict format)
                            table_keys = [k for k in data_source_schema.keys() if k not in ['tables', 'schemas', 'last_updated', 'total_rows', 'source_name', 'source_type', 'metadata']]
                            if table_keys:
                                schema_has_tables = True
                                logger.info(f"✅ Schema validation passed: {len(table_keys)} tables found in dict format")
                            # Check for tables array
                            elif data_source_schema.get('tables') and isinstance(data_source_schema.get('tables'), list) and len(data_source_schema.get('tables', [])) > 0:
                                schema_has_tables = True
                                logger.info(f"✅ Schema validation passed: {len(data_source_schema.get('tables', []))} tables found in array format")
                        
                        if not schema_has_tables:
                            logger.error(f"❌ Schema validation failed: No tables found in schema for {data_source_id}")
                            logger.error(f"   Schema keys: {list(data_source_schema.keys()) if isinstance(data_source_schema, dict) else 'not a dict'}")
                            logger.error(f"   Schema type: {type(data_source_schema)}")
                            data_source_valid = False
                        else:
                            logger.info(f"✅ Reused cached schema for {data_source_id} (cache hit)")
                    else:
                        logger.warning(f"⚠️ Data source {data_source_id} not found - will return user-friendly error")
                        data_source_valid = False
                except Exception as ds_error:
                    logger.error(f"❌ Error validating data source {data_source_id}: {ds_error}", exc_info=True)
                    data_source_valid = False
            
            # CRITICAL: Don't return early if data source is invalid - allow agents to try anyway
            # Schema validation warnings don't mean SQL execution will fail
            # The database might have tables even if schema fetch failed
            if data_source_id and not data_source_valid:
                logger.warning(f"⚠️ Data source {data_source_id} schema validation failed, but allowing agents to proceed")
                logger.warning("   Schema might be empty due to fetch issues, but database may still be accessible")
                logger.warning("   Will attempt SQL generation and execution - database will return actual errors if needed")
                # Don't return early - let agents try to generate SQL and execute it
                # The database will provide real feedback if tables don't exist
            
            # CRITICAL: Ensure data_source_id is always in agent_context.data_sources (even if schema validation failed)
            # This allows SQL execution to proceed - the database will validate tables exist
            if data_source_id:
                if data_source_id not in agent_context.data_sources:
                    agent_context.data_sources.append(data_source_id)
                    logger.info(f"✅ Added data source {data_source_id} to agent context data_sources")
                logger.info(f"✅ Agent context data_sources: {agent_context.data_sources}")
                
                # Store schema in agent_context for NL2SQL agent (even if empty - agent will handle it)
                if not hasattr(agent_context, 'schema'):
                    object.__setattr__(agent_context, 'schema', {})
                object.__setattr__(agent_context, 'schema', data_source_schema or {})
                if data_source_schema:
                    logger.info(f"✅ Added schema to agent context: {len(data_source_schema)} tables/objects")
                else:
                    logger.warning("⚠️ Schema is empty - NL2SQL agent will proceed without schema (database will validate)")
            elif not data_source_id:
                logger.warning("⚠️ No data_source_id provided - will use conversational mode only")
            
            # Enrich context
            if self.context_service:
                enriched_agent_context = await self.context_service.enrich_agent_context(
                    agent_context=agent_context,
                    user_id=user_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    data_source_id=data_source_id
                )
                agent_context = enriched_agent_context
                # Re-check data_sources after enrichment
                if data_source_id and data_source_id not in agent_context.data_sources:
                    agent_context.data_sources.append(data_source_id)
                    logger.info(f"✅ Added data source {data_source_id} after enrichment")
            else:
                # Fallback: use the basic agent context as-is
                pass
            
            # Step 3: Intelligent Agent Routing
            routing_step = ReasoningStepSchema(
                step_id="intelligent_routing",
                step_type="agent_routing",
                description="Using LLM to intelligently route query to appropriate agent(s)",
                confidence=0.9
            )
            reasoning_steps.append(routing_step)
            
            # Get conversation history for context
            conversation_history = await self._get_conversation_history(conversation_uuid)
            
            # Route query intelligently
            logger.info(f"🎯 Routing query: {query} (analysis_mode: {analysis_mode})")
            routing_decision = await self.router.route_query_intelligently(
                query=query,
                user_id=user_id,
                context={
                    "organization_id": organization_id,
                    "project_id": project_id,
                    "data_source_id": data_source_id,
                    "user_role": agent_context.user_role,
                    "permissions": agent_context.permissions,
                    "analysis_mode": analysis_mode  # Include analysis_mode in context instead
                },
                conversation_history=conversation_history
            )
            
            logger.info(f"🎯 Routing decision: {routing_decision}")
            routing_step.output_data = routing_decision
            routing_step.confidence = routing_decision["confidence"]
            
            # Step 4: Execute with appropriate strategy
            execution_step = ReasoningStepSchema(
                step_id="agent_execution",
                step_type="agent_execution",
                description=f"Executing with {routing_decision['execution_strategy']} strategy",
                confidence=routing_decision["confidence"]
            )
            reasoning_steps.append(execution_step)
            
            # Execute based on routing decision
            logger.info(f"🚀 Executing with strategy: {routing_decision['execution_strategy']}")
            logger.info(f"🚀 Primary agent: {routing_decision.get('primary_agent', 'unknown')}")
            logger.info(f"🚀 Collaborating agents: {routing_decision.get('collaborating_agents', [])}")
            logger.info(f"🚀 Agent context data sources: {agent_context.data_sources}")
            
            if routing_decision["execution_strategy"] == "collaborative":
                result = await self._execute_collaborative(query, routing_decision, agent_context, memory_state)
            elif routing_decision["execution_strategy"] == "parallel":
                result = await self._execute_parallel(query, routing_decision, agent_context, memory_state)
            else:  # sequential
                result = await self._execute_sequential(query, routing_decision, agent_context, memory_state)
            
            logger.info(f"🚀 Execution result: {result}")
            
            # Step 5: Update memory and create metadata
            if result.get("success"):
                await self._update_conversation_memory(conversation_uuid, query, result["result"], memory_state)
            
            execution_time = int((time.time() - start_time) * 1000)
            
            metadata = AIMetadataSchema(
                reasoning_steps=reasoning_steps,
                confidence_scores={"overall": routing_decision["confidence"]},
                model_info=ModelInfoSchema(
                    model_name=self.litellm_service.default_model or "gpt-4o-mini",
                    provider="litellm",
                    temperature=0.7
                ),
                token_usage=TokenUsageSchema(),
                execution_time_ms=execution_time,
                agent_type=f"multi_agent_{routing_decision['execution_strategy']}",
                success=result.get("success", False),
                error_message=result.get("error"),
                fallback_used=False
            )
            
            # Record performance metrics
            if self.performance_monitor:
                self.performance_monitor.record_ai_request(
                    request_id=request_id,
                    user_id=user_id,
                    organization_id=organization_id,
                    start_time=start_time,
                    end_time=time.time(),
                    success=result.get("success", False),
                    metadata={
                        "routing_decision": routing_decision,
                        "execution_strategy": routing_decision["execution_strategy"],
                        "agents_used": [routing_decision["primary_agent"]] + routing_decision["collaborating_agents"]
                    }
                )
            
            # CRITICAL: Use unified extraction to normalize result structure
            # This ensures consistent format regardless of execution path
            from app.modules.ai.utils.result_extraction import normalize_result_structure
            
            # Normalize the result to ensure consistent structure
            normalized_result = normalize_result_structure(result)
            
            # Build final result with normalized components
            final_result = {
                "result": normalized_result.get("result", result.get("result", "")),
                "metadata": metadata.dict(),
                "context": agent_context.dict(),
                "memory_variables": memory_state.dict(),
                "routing_decision": routing_decision,
                # CRITICAL: Add all normalized components at top level
                "sql_query": normalized_result.get("sql_query"),
                "query_result": normalized_result.get("query_result"),
                "echarts_config": normalized_result.get("echarts_config"),
                "chart_data": normalized_result.get("chart_data"),
                "insights": normalized_result.get("insights", []),
                "recommendations": normalized_result.get("recommendations", []),
                "narration": normalized_result.get("narration"),
                "analysis": normalized_result.get("analysis"),
                "success": normalized_result.get("success", result.get("success", True))
            }
            
            # Also preserve original result fields if not already set
            if isinstance(result, dict):
                for key in ["sql_query", "query_result", "echarts_config", "chart_config", "primary_chart", 
                           "chart_data", "insights", "recommendations", "narration", "analysis"]:
                    if key in result and not final_result.get(key):
                        final_result[key] = result[key]
                
                # Also add metadata fields that might contain these
                if "metadata" in result:
                    result_metadata = result["metadata"]
                    if isinstance(result_metadata, dict):
                        # Add primary_agent_result and collaborating_results to metadata
                        if "primary_agent_result" in result_metadata:
                            if "primary_agent_result" not in final_result["metadata"]:
                                final_result["metadata"]["primary_agent_result"] = result_metadata["primary_agent_result"]
                        if "collaborating_results" in result_metadata:
                            if "collaborating_results" not in final_result["metadata"]:
                                final_result["metadata"]["collaborating_results"] = result_metadata["collaborating_results"]
            
            logger.info(f"📊 Final result keys: {list(final_result.keys())}")
            logger.info(f"📊 Final result has echarts_config: {bool(final_result.get('echarts_config'))}")
            logger.info(f"📊 Final result has narration: {bool(final_result.get('narration'))}")
            logger.info(f"📊 Final result has insights: {len(final_result.get('insights', []))}")
            logger.info(f"📊 Final result success: {final_result.get('success')}")
            
            return final_result
            
        except Exception as e:
            logger.error(f"Multi-agent orchestrator error: {e}")
            return {
                "result": f"An error occurred: {str(e)}",
                "metadata": self._create_error_metadata(reasoning_steps, start_time, str(e)),
                "error": str(e)
            }
    
    async def _execute_sequential(
        self, 
        query: str, 
        routing_decision: Dict[str, Any], 
        agent_context: AgentContextSchema, 
        memory_state: LangChainMemorySchema
    ) -> Dict[str, Any]:
        """Execute agents sequentially with failure resilience."""
        primary_agent = routing_decision["primary_agent"]
        collaborating_agents = routing_decision["collaborating_agents"]
        
        # Execute primary agent first
        primary_result = await self._execute_agent(primary_agent, query, agent_context, memory_state, conversation_history=[])

        # Detect if primary agent returned a clarification/choice request (LLM asked user to disambiguate)
        try:
            result_text = ""
            if isinstance(primary_result, dict):
                result_text = str(primary_result.get("result") or primary_result.get("output") or "")
            elif isinstance(primary_result, str):
                result_text = primary_result
            # Look for common clarification patterns
            if result_text:
                import re as _re
                clarify_patterns = [
                    r'\bdo you mean\b',
                    r'\breply with one of\b',
                    r'\bplease specify\b',
                    r'\bwhich of\b',
                    r'\bchoose one\b',
                    r'\bwould you like\b'
                ]
                if any(_re.search(p, result_text, _re.IGNORECASE) for p in clarify_patterns):
                    logger.info("⚠️ Primary agent requested clarification - halting pipeline and returning clarification to user")
                    # Return a structured clarify response and stop further execution
                    return {
                        "success": False,
                        "clarification_required": True,
                        "clarification_prompt": result_text.strip(),
                        "primary_result": primary_result
                    }
        except Exception as clarify_err:
            logger.debug(f"Clarification detection failed: {clarify_err}")
        
        # Extract SQL query and execute it if NL2SQL agent generated SQL
        # CRITICAL: Execute SQL even if success=False (schema validation warnings don't prevent execution)
        # OPTIMIZATION: Check query cache before executing
        sql_query = None
        query_data = None  # Standardized: use query_data (same as enhanced pipeline)
        if primary_agent == "nl2sql":
            # Extract SQL query even if success=False (schema warnings don't mean SQL is invalid)
            sql_query = primary_result.get("sql_query")
            if not sql_query:
                # Also check result field (some agents return SQL there)
                result_text = primary_result.get("result", "")
                if isinstance(result_text, str) and "SELECT" in result_text.upper():
                    # Try to extract SQL from result text
                    import re
                    sql_match = re.search(r'SELECT.*?(?:;|$)', result_text, re.IGNORECASE | re.DOTALL)
                    if sql_match:
                        sql_query = sql_match.group(0).strip()
                        logger.info(f"✅ Extracted SQL from result text: {sql_query[:100]}...")
            
            if sql_query:
                # CRITICAL: Validate SQL is not placeholder/template BEFORE execution
                sql_lower = str(sql_query).lower()
                # Check for ALL placeholder patterns: table_name, column_name, WHERE condition, AVG(column_name), etc.
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
                    logger.error(f"❌ Rejected placeholder SQL in RobustMultiAgentOrchestrator: {str(sql_query)[:100]}...")
                    primary_result["error"] = "SQL generation failed - placeholder SQL template detected (not a real query). Please ensure the AI agent has access to the actual database schema."
                    primary_result["sql_query"] = None  # Clear placeholder SQL
                    primary_result["critical_failure"] = True
                    sql_query = None  # Prevent execution
                    logger.error("❌ CRITICAL: Placeholder SQL detected - this should not happen if LangGraph orchestrator is being used!")
                
                if sql_query:  # Only proceed if SQL is valid
                    try:
                        data_source_id = agent_context.data_sources[0] if agent_context.data_sources else None
                        if data_source_id:
                            # OPTIMIZATION: Check query cache first
                            from app.modules.ai.services.query_cache_service import get_query_cache_service
                            query_cache = get_query_cache_service()
                            # SQL is already cleaned by Pydantic validator (SQLGenerationOutput.validate_sql_not_empty)
                            # No additional sanitization needed - trust the model validation
                            sanitized_sql = sql_query.strip() if isinstance(sql_query, str) else sql_query

                            cached_result = query_cache.get_result(data_source_id, sanitized_sql)
                            if cached_result:
                                logger.info(f"✅ Using cached query result for {data_source_id} (cache hit)")
                                query_data = cached_result.get("data", [])
                            else:
                                logger.info(f"🔍 Executing SQL from NL2SQL agent: {str(sanitized_sql)[:100]}...")
                                query_result = await self.nl2sql_agent.execute_query(
                                    sql_query=sanitized_sql,
                                    data_source_id=data_source_id,
                                    context=agent_context
                                )
                                if query_result.get("success"):
                                    query_data = query_result.get("data", [])
                                    logger.info(f"✅ SQL execution successful: {len(query_data)} rows")
                                    
                                    # CRITICAL: Store query_result in primary_result for _combine_results to recognize it
                                    primary_result["query_result"] = {
                                        "success": True,
                                        "data": query_data,
                                        "row_count": len(query_data),
                                        "columns": list(query_data[0].keys()) if query_data and isinstance(query_data[0], dict) else []
                                    }
                                    logger.info(f"✅ Stored query_result in primary_result: {len(query_data)} rows")
                                    
                                    # CRITICAL: If SQL executed successfully, clear any critical failure flags
                                    # Schema validation warnings are not critical if SQL execution succeeds
                                    if primary_result.get("critical_failure"):
                                        logger.info("✅ SQL execution succeeded despite schema warnings - clearing critical failure flag")
                                        primary_result["critical_failure"] = False
                                        primary_result["success"] = True  # Mark as successful since SQL executed
                                    
                                    # OPTIMIZATION: Cache the query result for future similar queries
                                    query_cache.set_result(data_source_id, sanitized_sql, query_result, ttl_minutes=30)
                                    logger.debug("✅ Cached query result (will reuse for 30m)")
                                else:
                                    error_msg = str(query_result.get('error', '')).lower()
                                    logger.error(f"❌ SQL execution failed: {query_result.get('error')}")
                                    
                                    # CRITICAL: Check if error is due to placeholder SQL
                                    sql_lower = str(sql_query).lower() if sql_query else ""
                                    
                                    # CRITICAL: Reject placeholder SQL even if execution "fails"
                                    if "table_name" in sql_lower or "where condition" in sql_lower or "column_name" in sql_lower:
                                        logger.error(f"❌ Placeholder SQL detected in execution error: {str(sql_query)[:100]}...")
                                        primary_result["error"] = "SQL generation failed - placeholder SQL template detected"
                                        primary_result["critical_failure"] = True
                                        primary_result["sql_query"] = None  # Clear placeholder SQL
                                    elif "unknown table" in error_msg and "table_name" in error_msg:
                                        # This is definitely a placeholder SQL error
                                        logger.error(f"❌ Placeholder SQL execution error: {error_msg}")
                                        primary_result["error"] = "SQL generation failed - placeholder SQL template detected"
                                        primary_result["critical_failure"] = True
                                        primary_result["sql_query"] = None
                                    else:
                                        # CRITICAL: Store SQL query in primary_result even if execution failed
                                        # This ensures it's recognized as meaningful result
                                        if sql_query and not primary_result.get("sql_query"):
                                            primary_result["sql_query"] = sql_query
                                            logger.info("✅ Stored SQL query in primary_result despite execution failure")
                                        
                                        # CRITICAL: Check if this is a critical error that should stop execution
                                        # Only mark as critical if SQL execution actually failed (not just schema validation warnings)
                                        critical_keywords = [
                                            "data source not found",
                                            "connection",
                                            "permission denied",
                                            "access denied",
                                            "authentication",
                                            "cannot connect",
                                            "connection refused",
                                            "timeout"
                                        ]
                                        
                                        # Don't treat "table not found" or "schema" as critical if they're just validation warnings
                                        # These are often false positives when schema cache is empty but SQL still works
                                        if any(keyword in error_msg for keyword in critical_keywords):
                                            logger.error("❌ Critical SQL execution error detected - stopping execution immediately")
                                            # Mark primary as failed critically to prevent downstream agents
                                            primary_result["success"] = False
                                            primary_result["error"] = query_result.get('error')
                                            primary_result["critical_failure"] = True
                                        else:
                                            # Non-critical error (e.g., SQL syntax, table not found in execution)
                                            # CRITICAL: Even if SQL execution fails, the SQL query itself is meaningful
                                            # Store it and allow downstream agents to try generating chart from SQL structure
                                            logger.warning(f"⚠️ SQL execution failed (non-critical): {query_result.get('error')}")
                                            logger.warning("   SQL query is still meaningful - will attempt chart generation from SQL structure")
                                            primary_result["critical_failure"] = False
                                            # Store error for user feedback but don't block downstream agents
                                            primary_result["sql_execution_error"] = query_result.get('error')
                            
                            # Store query results in agent_context for downstream agents
                            if query_data:
                                if not hasattr(agent_context, 'query_results') or agent_context.query_results is None:
                                    object.__setattr__(agent_context, 'query_results', [])
                                object.__setattr__(agent_context, 'query_results', query_data)
                                logger.info(f"✅ Set query_results in agent_context: {len(query_data)} rows")
                    except Exception as exec_error:
                        logger.error(f"❌ SQL execution error: {exec_error}")
        
        # CRITICAL: Only mark as critical failure if:
        # 1. Explicitly marked as critical_failure AND SQL execution failed
        # 2. OR SQL execution failed with a critical connection/auth error
        # BUT: If SQL executed successfully (even with schema warnings), allow downstream agents
        primary_failed_critically = False
        if primary_result.get("critical_failure"):
            # Only treat as critical if we don't have successful query results
            if not query_data or len(query_data) == 0:
                primary_failed_critically = True
                logger.warning("⚠️ Primary failed critically and no query results - skipping downstream agents")
            else:
                # SQL executed successfully despite critical flag - clear it
                logger.info("✅ SQL executed successfully despite critical flag - allowing downstream agents")
                primary_result["critical_failure"] = False
                primary_failed_critically = False
        elif not primary_result.get("success") and primary_result.get("error"):
            # Check if error is truly critical (connection/auth issues, not schema validation warnings)
            error_msg = str(primary_result.get("error", "")).lower()
            critical_keywords = [
                "data source not found",
                "connection",
                "permission denied",
                "access denied",
                "authentication",
                "cannot connect",
                "connection refused",
                "timeout"
            ]
            # Only mark as critical if it's a connection/auth error AND we have no query results
            if any(keyword in error_msg for keyword in critical_keywords) and (not query_data or len(query_data) == 0):
                primary_failed_critically = True
                logger.warning("⚠️ Critical error and no query results - skipping downstream agents")
            else:
                # Schema validation warnings or SQL syntax errors are not critical if we have data
                primary_failed_critically = False
        
        # Execute collaborating agents if needed (skip if primary failed critically)
        # CRITICAL: Run downstream agents if we have query results OR if we have SQL query (even if execution failed)
        # This ensures chart/insights can be generated from SQL structure when execution fails
        collaborating_results = []
        has_data = query_data and len(query_data) > 0
        has_sql = sql_query and sql_query.strip()
        
        if has_data:
            # We have data - OPTIMIZATION: Try unified agent first (1 LLM call), fallback to separate agents
            logger.info(f"✅ Query results available ({len(query_data) if query_data else 0} rows)")
            chart_agent_needed = "chart_generation" in collaborating_agents
            insights_agent_needed = "insights" in collaborating_agents
            
            # CRITICAL: Use unified agent if both chart and insights are needed (prevents redundancy)
            if chart_agent_needed and insights_agent_needed:
                # Try unified agent first (1 LLM call instead of 2)
                unified_success = False
                # Initialize defaults to prevent "possibly unbound" errors
                chart_result = {"success": False, "error": "Chart generation not executed", "agent_id": "chart_generation"}
                insights_result = {"success": False, "error": "Insights generation not executed", "agent_id": "insights"}
                try:
                    from app.modules.ai.agents.unified_chart_insights_agent import UnifiedChartInsightsAgent
                    
                    # Initialize unified agent if not exists
                    if not hasattr(self, 'unified_agent') or self.unified_agent is None:
                        self.unified_agent = UnifiedChartInsightsAgent(
                            litellm_service=self.litellm_service,
                            chart_agent=self.chart_agent,
                            insights_agent=self.insights_agent
                        )
                        logger.info("✅ Initialized unified chart+insights agent")
                    
                    # Infer query result schema for better generation
                    # CRITICAL: Ensure query_data is not None before passing
                    if query_data is None:
                        query_data = []
                    query_result_schema = self._infer_query_result_schema(query_data)
                    
                    logger.info(f"⚡ Using unified agent (1 LLM call for chart + insights) with {len(query_data)} rows")
                    unified_result = await self.unified_agent.generate_chart_and_insights(
                        data=query_data,
                        query_intent=query,
                        title="Chart Analysis",
                        context=agent_context,
                        query_result_schema=query_result_schema
                    )
                    
                    if unified_result.get("success") and (unified_result.get("chart_config") or unified_result.get("primary_chart") or unified_result.get("echarts_config")):
                        # Unified agent succeeded - extract both chart and insights
                        unified_success = True
                        chart_result = {
                            "success": True,
                            "primary_chart": unified_result.get("primary_chart") or unified_result.get("chart_config") or unified_result.get("echarts_config"),
                            "echarts_config": unified_result.get("echarts_config") or unified_result.get("chart_config") or unified_result.get("primary_chart"),
                            "agent_id": "chart_generation",
                            "generation_method": "unified",
                            # CRITICAL: Include chart recommendations with confidence scores from unified analysis
                            "chart_recommendations": unified_result.get("chart_recommendations", []),
                            "chart_type": unified_result.get("chart_type")  # Highest confidence chart type
                        }
                        insights_result = {
                            "success": True,
                            "insights": unified_result.get("insights", []),
                            "recommendations": unified_result.get("recommendations", []),
                            "executive_summary": unified_result.get("executive_summary"),
                            "agent_id": "insights",
                            "generation_method": "unified",
                            # CRITICAL: Include chart recommendations from summary analysis
                            "chart_recommendations": unified_result.get("chart_recommendations", [])
                        }
                        logger.info("✅ Unified agent succeeded - extracted chart and insights (saved 1 LLM call)")
                        # Log chart recommendations if available
                        if unified_result.get("chart_recommendations"):
                            _chart_recs = unified_result.get('chart_recommendations') or []
                            logger.info(f"📊 Chart recommendations from unified analysis: {len(_chart_recs)} types")
                            for rec in _chart_recs[:3]:  # Top 3
                                logger.info(f"   - {rec.get('chart_type', 'unknown')}: {rec.get('confidence', 0):.2f} ({rec.get('reason', 'N/A')})")
                    else:
                        logger.warning("⚠️ Unified agent returned but no chart config found, falling back to separate agents")
                except Exception as unified_error:
                    logger.warning(f"⚠️ Unified agent failed: {unified_error}, falling back to separate agents")
                
                # Fallback to separate agents if unified failed
                if not unified_success:
                    logger.info("⚡ Executing chart and insights agents separately (unified failed or not available)")
                    try:
                        # Prefer deterministic chart-first two-step flow:
                        # 1) Generate chart config from full query_data (deterministic)
                        # 2) Compute compact aggregates and pass to insights agent for concise insights
                        data_list = query_data if isinstance(query_data, list) else []

                        # Step 1: Chart generation
                        logger.info("📊 Generating chart config first (two-step flow)")
                        chart_task = self._execute_agent_with_data("chart_generation", query, agent_context, memory_state, data_list)
                        chart_result = await chart_task

                        # Build compact summary for insights (small footprint)
                        def _build_compact_summary(rows):
                            summary = {"total_rows": len(rows), "columns": [], "top_values": {}}
                            if not rows:
                                return [summary]
                            cols = list(rows[0].keys())
                            summary["columns"] = cols
                            # Compute basic aggregates for numeric columns and top N
                            numeric_cols = []
                            for c in cols:
                                sample_vals = [r.get(c) for r in rows[:50] if r.get(c) is not None]
                                if any(isinstance(v, (int, float)) or (isinstance(v, str) and str(v).replace('.', '', 1).replace('-', '', 1).isdigit()) for v in sample_vals):
                                    numeric_cols.append(c)
                            for c in numeric_cols[:3]:
                                vals = [float(v) for v in rows[:200] if rows and rows[0].get(c) is not None and str(rows[0].get(c)).replace('.', '', 1).replace('-', '', 1).isdigit()]
                                try:
                                    vals = [float(r.get(c)) for r in rows if r.get(c) is not None and str(r.get(c)).replace('.', '', 1).replace('-', '', 1).isdigit()]
                                except Exception:
                                    vals = []
                                if vals:
                                    vals_sorted = sorted(vals, reverse=True)
                                    summary["top_values"][c] = {"max": vals_sorted[0], "median": vals_sorted[len(vals_sorted)//2] if len(vals_sorted)>0 else None, "count": len(vals)}
                            # For time-like columns, compute min/max if present
                            return [summary]

                        compact_summary = _build_compact_summary(data_list)

                        # Step 2: Insights generation using compact summary to keep LLM prompt small
                        logger.info("🧠 Generating insights from compact summary (two-step flow)")
                        insights_task = self._execute_agent_with_data("insights", query, agent_context, memory_state, compact_summary)
                        insights_result = await insights_task
                        
                        # Handle exceptions
                        if isinstance(chart_result, Exception):
                            logger.error(f"❌ Chart agent exception: {chart_result}")
                            chart_result = {"success": False, "error": str(chart_result), "agent_id": "chart_generation"}
                        if isinstance(insights_result, Exception):
                            logger.error(f"❌ Insights agent exception: {insights_result}")
                            insights_result = {"success": False, "error": str(insights_result), "agent_id": "insights"}
                    except Exception as parallel_error:
                        logger.error(f"❌ Parallel execution failed: {parallel_error}, falling back to sequential")
                        # Fallback to sequential
                        # CRITICAL: Ensure query_data is not None
                        data_list = query_data if query_data is not None else []
                        chart_result = await self._execute_agent_with_data("chart_generation", query, agent_context, memory_state, data_list)
                        insights_result = await self._execute_agent_with_data("insights", query, agent_context, memory_state, data_list)
                
                # CRITICAL: Ensure chart_result and insights_result are defined before use
                # Initialize defaults to prevent "possibly unbound" errors
                if not unified_success:
                    # These are set in the fallback block above, but ensure they're always defined
                    if 'chart_result' not in locals() or chart_result is None:
                        chart_result = {"success": False, "error": "Chart generation not executed", "agent_id": "chart_generation"}
                    if 'insights_result' not in locals() or insights_result is None:
                        insights_result = {"success": False, "error": "Insights generation not executed", "agent_id": "insights"}
                else:
                    # Unified agent succeeded - chart_result and insights_result are already set above
                    pass
                
                # Add to results in order
        for agent_id in collaborating_agents:
                    if agent_id == "chart_generation":
                        collaborating_results.append(chart_result)
                    elif agent_id == "insights":
                        collaborating_results.append(insights_result)
                    else:
                        # Other agents execute normally
                        try:
                            agent_result = await self._execute_agent(agent_id, query, agent_context, memory_state, conversation_history=[])
            collaborating_results.append(agent_result)
                        except Exception as agent_error:
                            logger.warning(f"⚠️ Collaborating agent {agent_id} failed: {agent_error}")
                            collaborating_results.append({
                                "success": False,
                                "result": f"Agent {agent_id} encountered an error",
                                "error": str(agent_error),
                                "agent_id": agent_id
                            })
            else:
                # Sequential execution for other cases
                for agent_id in collaborating_agents:
                    try:
                        if agent_id in ["chart_generation", "insights"] and query_data:
                            logger.info(f"📊 Passing {len(query_data)} rows to {agent_id} agent")
                            agent_result = await self._execute_agent_with_data(agent_id, query, agent_context, memory_state, query_data)
                        else:
                            agent_result = await self._execute_agent(agent_id, query, agent_context, memory_state, conversation_history=[])
                        collaborating_results.append(agent_result)
                    except Exception as agent_error:
                        logger.warning(f"⚠️ Collaborating agent {agent_id} failed: {agent_error}")
                        collaborating_results.append({
                            "success": False,
                            "result": f"Agent {agent_id} encountered an error",
                            "error": str(agent_error),
                            "agent_id": agent_id
                        })
        elif not primary_failed_critically:
            # No query results - CRITICAL: Try to generate chart/insights from SQL structure if available
            for agent_id in collaborating_agents:
                # CRITICAL: For chart/insights agents, even if no data, try to generate from SQL structure
                if agent_id in ["chart_generation", "insights"]:
                    if has_sql:
                        logger.warning(f"⚠️ {agent_id} agent: No query results, but SQL available - attempting generation from SQL structure")
                        # Pass empty data but include SQL query in context for structure-based generation
                        try:
                            # Store SQL in agent_context for agents to use
                            if not hasattr(agent_context, 'sql_query'):
                                object.__setattr__(agent_context, 'sql_query', sql_query)
                            # Try to generate chart/insights from SQL structure (agent will handle empty data)
                            agent_result = await self._execute_agent_with_data(agent_id, query, agent_context, memory_state, [])
                            collaborating_results.append(agent_result)
                        except Exception as agent_error:
                            logger.warning(f"⚠️ {agent_id} agent failed with SQL structure: {agent_error}")
                            collaborating_results.append({
                                "success": False,
                                "result": f"I couldn't generate {agent_id} because the query execution failed. The SQL query is available below.",
                                "error": str(agent_error),
                                "agent_id": agent_id,
                                "sql_query": sql_query  # Include SQL for user reference
                            })
                    else:
                        logger.warning(f"⚠️ Skipping {agent_id} agent - no query results and no SQL available (saving tokens)")
                        collaborating_results.append({
                            "success": False,
                            "agent_id": agent_id,
                            "error": "no_data_available",
                            "result": f"{agent_id} requires query results, but no data is available. Please run a query that returns data first.",
                            "message": f"I need data to generate {agent_id}. Please ensure your query returns results first."
                        })
                    continue
                
                # Only run non-data-dependent agents
                try:
                    agent_result = await self._execute_agent(agent_id, query, agent_context, memory_state, conversation_history=[])
                    collaborating_results.append(agent_result)
                except Exception as agent_error:
                    logger.warning(f"⚠️ Collaborating agent {agent_id} failed: {agent_error}")
                    collaborating_results.append({
                        "success": False,
                        "result": f"Agent {agent_id} encountered an error",
                        "error": str(agent_error),
                        "agent_id": agent_id
                    })
        else:
            logger.error("❌ Skipping ALL collaborating agents due to critical failure - saving tokens")
            logger.error(f"   Primary result success: {primary_result.get('success')}")
            logger.error(f"   Primary result error: {primary_result.get('error')}")
            logger.error(f"   SQL query available: {bool(sql_query)}")
            logger.error(f"   Query result data available: {bool(query_data)}")
            # Add placeholder results for skipped agents
            for agent_id in collaborating_agents:
                collaborating_results.append({
                    "success": False,
                    "result": f"Skipped due to critical failure: {primary_result.get('error', 'Unknown error')}",
                    "error": primary_result.get("error", "Primary agent failed critically"),
                    "agent_id": agent_id
                })
        
        # CRITICAL: Ensure SQL query is in primary_result for _combine_results to recognize it
        if sql_query and not primary_result.get("sql_query"):
            primary_result["sql_query"] = sql_query
            logger.info("✅ Added sql_query to primary_result for meaningful result check")
        
        # CRITICAL: Ensure query results are in primary_result for _combine_results to recognize them
        # (This is a backup - query_result should already be stored above when SQL executes)
        if query_data and len(query_data) > 0:
            if not primary_result.get("query_result"):
                primary_result["query_result"] = {
                    "success": True,
                    "data": query_data,
                    "row_count": len(query_data),
                    "columns": list(query_data[0].keys()) if query_data and isinstance(query_data[0], dict) else []
                }
                logger.info(f"✅ Added query_result to primary_result: {len(query_data)} rows (backup)")
            # Also ensure SQL is stored if we have query results
            if sql_query and not primary_result.get("sql_query"):
                primary_result["sql_query"] = sql_query
                logger.info("✅ Added sql_query to primary_result (we have query results)")
        
        # CRITICAL: Log which agents ran and what they produced BEFORE _combine_results
        logger.info("🤖 AGENT EXECUTION SUMMARY:")
        logger.info(f"  Primary Agent: {routing_decision.get('primary_agent', 'unknown')}")
        logger.info(f"    - SQL Query: {bool(primary_result.get('sql_query'))}")
        logger.info(f"    - Query Result: {bool(primary_result.get('query_result'))}")
        logger.info(f"    - Success: {primary_result.get('success')}")
        logger.info(f"  Collaborating Agents: {len(collaborating_results)}")
        for i, collab in enumerate(collaborating_results):
            agent_id = collab.get("agent_id", "unknown")
            logger.info(f"    Agent {i+1}: {agent_id}")
            logger.info(f"      - Success: {collab.get('success')}")
            if agent_id == "chart_generation":
                has_chart = bool(collab.get('primary_chart') or collab.get('echarts_config') or collab.get('chart_config'))
                logger.info(f"      - Chart Config: {has_chart}")
                if has_chart:
                    chart = collab.get('primary_chart') or collab.get('echarts_config') or collab.get('chart_config')
                    logger.info(f"        Chart type: {type(chart)}, keys: {list(chart.keys()) if isinstance(chart, dict) else 'not a dict'}")
            elif agent_id == "insights":
                has_insights = bool(collab.get('insights'))
                has_summary = bool(collab.get('executive_summary'))
                has_recs = bool(collab.get('recommendations'))
                # CRITICAL: Safely get insights and recommendations - ensure they're lists
                insights_list = collab.get('insights', [])
                recs_list = collab.get('recommendations', [])
                
                # Ensure they're lists, not methods
                if insights_list and not isinstance(insights_list, list):
                    if callable(insights_list):
                        logger.error(f"❌ Insights is a method in {agent_id}: {type(insights_list)}")
                        insights_list = []
                    else:
                        try:
                            insights_list = list(insights_list) if hasattr(insights_list, '__iter__') else []
                        except Exception:
                            insights_list = []
                
                if recs_list and not isinstance(recs_list, list):
                    if callable(recs_list):
                        logger.error(f"❌ Recommendations is a method in {agent_id}: {type(recs_list)}")
                        recs_list = []
                    else:
                        try:
                            recs_list = list(recs_list) if hasattr(recs_list, '__iter__') else []
                        except Exception:
                            recs_list = []
                
                logger.info(f"      - Insights: {has_insights} ({len(insights_list) if isinstance(insights_list, list) else 0} items)")
                logger.info(f"      - Executive Summary: {has_summary}")
                logger.info(f"      - Recommendations: {has_recs} ({len(recs_list) if isinstance(recs_list, list) else 0} items)")
        
        # CRITICAL: Use unified extraction FIRST to extract all components
        # This is the single source of truth for result extraction
        from app.modules.ai.utils.result_extraction import extract_structured_components
        
        # Extract components using unified function BEFORE _combine_results
        extracted = extract_structured_components(
            result={"sql_query": primary_result.get("sql_query"), "query_result": primary_result.get("query_result")},
            primary_result=primary_result,
            collaborating_results=collaborating_results
        )
        
        # Use actual query result row count (dynamic, not hardcoded)
        query_result_data = extracted.get('query_result', {})
        if isinstance(query_result_data, dict):
            actual_row_count = len(query_result_data.get('data', [])) if query_result_data.get('data') else 0
        elif isinstance(query_result_data, list):
            actual_row_count = len(query_result_data)
        else:
            actual_row_count = 0
        
        logger.info("📦 UNIFIED EXTRACTION RESULTS:")
        logger.info(f"  - SQL Query: {bool(extracted['sql_query'])}")
        logger.info(f"  - Query Result: {bool(extracted['query_result'])} ({actual_row_count} rows)")
        logger.info(f"  - Chart Config: {bool(extracted['echarts_config'])}")
        logger.info(f"  - Insights: {len(extracted['insights'])} items")
        logger.info(f"  - Recommendations: {len(extracted['recommendations'])} items")
        logger.info(f"  - Narration: {bool(extracted['narration'])}")
        
        # Combine results (will handle failures gracefully)
        combined_result = await self._combine_results(primary_result, collaborating_results, query)
        
        # CRITICAL: Ensure all extracted components are in combined_result at top level
        # This guarantees components are available even if _combine_results missed them
        # CRITICAL: Also check extracted dict from earlier extraction
        if extracted["sql_query"] and not combined_result.get("sql_query"):
            combined_result["sql_query"] = extracted["sql_query"]
            logger.info("✅ Added sql_query to combined_result from extracted dict")
        if extracted["query_result"] and not combined_result.get("query_result"):
            combined_result["query_result"] = extracted["query_result"]
            logger.info("✅ Added query_result to combined_result from extracted dict")
        if extracted["echarts_config"] and not combined_result.get("echarts_config"):
            combined_result["echarts_config"] = extracted["echarts_config"]
            logger.info("✅ Added echarts_config to combined_result from extracted dict")
        if extracted["chart_data"] and not combined_result.get("chart_data"):
            combined_result["chart_data"] = extracted["chart_data"]
        if extracted["insights"] and not combined_result.get("insights"):
            combined_result["insights"] = extracted["insights"]
            logger.info("✅ Added insights to combined_result from extracted dict")
        if extracted["recommendations"] and not combined_result.get("recommendations"):
            combined_result["recommendations"] = extracted["recommendations"]
        if extracted["narration"] and not combined_result.get("narration"):
            combined_result["narration"] = extracted["narration"]
            logger.info("✅ Added narration to combined_result from extracted dict")
        
        # CRITICAL: Standardize return value name - use final_result for consistency
        # This ensures all paths return the same variable name
        final_result = combined_result

        # AUTO-EXEC: If running in standard mode and we have validated SQL but no query_result,
        # attempt a safe auto-execution via MultiEngineQueryService (auto-default).
        try:
            comps = final_result.get("execution_metadata", {}).get("components_generated", {}) if isinstance(final_result.get("execution_metadata", {}), dict) else {}
            if analysis_mode == "standard" and final_result.get("sql_query") and not final_result.get("query_result") and self.multi_query_service and self.data_service:
                logger.info("🔁 Standard flow produced SQL but no query_result: attempting auto-execution via MultiEngineQueryService")
                try:
                    ds = await self.data_service.get_data_source_by_id(data_source_id)
                    if ds:
                        sql_to_exec = final_result.get("sql_query")
                        if isinstance(sql_to_exec, str):
                            sql_to_exec = sql_to_exec.strip()
                            # Remove surrounding quotes if present
                            if (sql_to_exec.startswith('"') and sql_to_exec.endswith('"')) or (sql_to_exec.startswith("'") and sql_to_exec.endswith("'")):
                                sql_to_exec = sql_to_exec[1:-1]
                            # Unescape common escaped sequences
                            sql_to_exec = sql_to_exec.replace("\\\\n", "\\n").replace("\\n", "\n").replace("\\\\t", "\\t").replace("\\t", "\t").replace('\\"', '"').replace("\\'", "'").strip()
                        logger.debug(f"Standard flow executing SQL via MultiEngineQueryService (repr): {repr(sql_to_exec)}")
                        exec_res = await self.multi_query_service.execute_query(query=sql_to_exec, data_source=ds, optimization=True)
                        if exec_res.get("success"):
                            final_result["query_result"] = {
                                "success": True,
                                "data": exec_res.get("data", []),
                                "row_count": exec_res.get("row_count", len(exec_res.get("data", []))),
                                "columns": exec_res.get("columns", [])
                            }
                            final_result["chart_data"] = final_result.get("query_result", {}).get("data")
                            final_result.setdefault("execution_metadata", {}).setdefault("components_generated", {})["query_executed"] = True
                            logger.info("✅ Standard auto-execution succeeded via MultiEngineQueryService")
                            # Auto-generate chart if missing
                            if not final_result.get("echarts_config") and self.chart_service:
                                try:
                                    chart_resp = await self.chart_service.generate_chart_from_query(
                                        data=final_result["query_result"]["data"],
                                        query_analysis={"sql": final_result.get("sql_query"), "explanation": final_result.get("explanation", "")},
                                        options={}
                                    )
                                    final_result["echarts_config"] = chart_resp.get("chart_config")
                                    final_result.setdefault("execution_metadata", {}).setdefault("components_generated", {})["chart"] = bool(final_result.get("echarts_config"))
                                    final_result["chart_data"] = final_result["query_result"]["data"]
                                    logger.info("✅ Standard auto-chart generation succeeded")
                                except Exception as chart_err:
                                    logger.warning(f"Standard auto chart generation failed: {chart_err}")
                            # Auto-generate insights if missing
                            if not final_result.get("insights") and hasattr(self, "insights_agent"):
                                try:
                                    insights_resp = await self.insights_agent.generate_insights(final_result["query_result"]["data"], query, context=agent_context if 'agent_context' in locals() else None)
                                    if isinstance(insights_resp, dict):
                                        final_result["insights"] = insights_resp.get("insights", [])
                                        final_result["recommendations"] = insights_resp.get("recommendations", [])
                                        final_result.setdefault("execution_metadata", {}).setdefault("components_generated", {})["insights"] = bool(final_result.get("insights"))
                                        logger.info("✅ Standard auto insights generation succeeded")
                                except Exception as ins_err:
                                    logger.warning(f"Standard auto insights generation failed: {ins_err}")
                except Exception as exec_error:
                    logger.warning(f"Standard auto execution via MultiEngineQueryService failed: {exec_error}")
        except Exception:
            # Non-critical - continue returning final_result
            pass
        
        # CRITICAL: Log final result components before returning
        logger.info("📤 FINAL RESULT (Standard Flow):")
        logger.info(f"   Success: {final_result.get('success')}")
        logger.info(f"   SQL Query: {bool(final_result.get('sql_query'))}")
        logger.info(f"   Query Result: {bool(final_result.get('query_result'))}")
        logger.info(f"   Chart Config: {bool(final_result.get('echarts_config'))}")
        logger.info(f"   Insights: {len(final_result.get('insights', []))} items")
        logger.info(f"   Narration: {bool(final_result.get('narration'))}")
        
        return final_result
    
    async def _execute_parallel(
        self, 
        query: str, 
        routing_decision: Dict[str, Any], 
        agent_context: AgentContextSchema, 
        memory_state: LangChainMemorySchema
    ) -> Dict[str, Any]:
        """Execute agents in parallel."""
        import asyncio
        
        agents_to_execute = [routing_decision["primary_agent"]] + routing_decision["collaborating_agents"]
        
        # Execute all agents in parallel
        tasks = [
            self._execute_agent(agent_id, query, agent_context, memory_state, conversation_history=[])
            for agent_id in agents_to_execute
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Combine parallel results
        combined_result = await self._combine_parallel_results(results)
        
        return combined_result
    
    async def _execute_collaborative(
        self, 
        query: str, 
        routing_decision: Dict[str, Any], 
        agent_context: AgentContextSchema, 
        memory_state: LangChainMemorySchema
    ) -> Dict[str, Any]:
        """Execute agents collaboratively - use sequential execution with proper result combination."""
        logger.info(f"🔄 Executing collaborative workflow for query: {query[:100]}...")
        
        # For collaborative execution, use sequential with enhanced synthesis
        # This ensures all agents run and results are properly combined
        primary_agent = routing_decision.get("primary_agent", "nl2sql")
        collaborating_agents = routing_decision.get("collaborating_agents", [])
        
        # Execute primary agent first
        logger.info(f"🎯 Executing primary agent: {primary_agent}")
        # Note: conversation_history not available in this scope, will use empty list
        primary_result = await self._execute_agent(primary_agent, query, agent_context, memory_state, conversation_history=[])
        
        # Extract SQL and execute query if available
        sql_query = None
        query_result_data = None
        
        if primary_result.get("success"):
            sql_query = primary_result.get("sql_query") or primary_result.get("result")
            if sql_query and isinstance(sql_query, str) and sql_query.strip().upper().startswith("SELECT"):
                try:
                    # Get data_source_id from agent_context
                    exec_data_source_id = None
                    if agent_context and hasattr(agent_context, 'data_sources') and agent_context.data_sources:
                        exec_data_source_id = agent_context.data_sources[0]
                    
                    if not exec_data_source_id:
                        logger.warning("⚠️ Cannot execute SQL: no data_source_id available")
                    else:
                        logger.info(f"🔍 Executing SQL from primary agent: {sql_query[:100]}...")
                        query_result = await self.nl2sql_agent.execute_query(
                            sql_query=sql_query,
                            data_source_id=exec_data_source_id,
                            context={}
                        )
                        if query_result and query_result.get("success") and query_result.get("data"):
                            query_result_data = query_result.get("data")
                            # Store in agent_context for downstream agents
                            if agent_context:
                                object.__setattr__(agent_context, "query_results", query_result_data)
                            row_count = len(query_result_data) if query_result_data else 0
                            logger.info(f"✅ Query executed: {row_count} rows")
                except Exception as exec_error:
                    logger.warning(f"SQL execution failed: {exec_error}")
        
        # Execute collaborating agents with query results
        collaborating_results = []
        if query_result_data and len(query_result_data) > 0:
            # Execute chart and insights in parallel
            chart_agent_needed = "chart_generation" in collaborating_agents
            insights_agent_needed = "insights" in collaborating_agents
            
            if chart_agent_needed and insights_agent_needed:
                logger.info(f"⚡ Executing chart and insights agents in parallel with {len(query_result_data)} rows")
                import asyncio
                try:
                    chart_task = self._execute_agent_with_data("chart_generation", query, agent_context, memory_state, query_result_data)
                    insights_task = self._execute_agent_with_data("insights", query, agent_context, memory_state, query_result_data)
                    chart_result, insights_result = await asyncio.gather(chart_task, insights_task, return_exceptions=True)
                    
                    if isinstance(chart_result, Exception):
                        chart_result = {"success": False, "error": str(chart_result), "agent_id": "chart_generation"}
                    if isinstance(insights_result, Exception):
                        insights_result = {"success": False, "error": str(insights_result), "agent_id": "insights"}
                    
                    for agent_id in collaborating_agents:
                        if agent_id == "chart_generation":
                            collaborating_results.append(chart_result)
                        elif agent_id == "insights":
                            collaborating_results.append(insights_result)
                except Exception as parallel_error:
                    logger.error(f"❌ Parallel execution failed: {parallel_error}, falling back to sequential")
                    # Fallback to sequential
                    for agent_id in collaborating_agents:
                        try:
                            if agent_id in ["chart_generation", "insights"] and query_result_data:
                                agent_result = await self._execute_agent_with_data(agent_id, query, agent_context, memory_state, query_result_data)
                            else:
                                agent_result = await self._execute_agent(agent_id, query, agent_context, memory_state, conversation_history=[])
                            collaborating_results.append(agent_result)
                        except Exception as agent_error:
                            logger.warning(f"⚠️ Collaborating agent {agent_id} failed: {agent_error}")
                            collaborating_results.append({
                                "success": False,
                                "result": f"Agent {agent_id} encountered an error",
                                "error": str(agent_error),
                                "agent_id": agent_id
                            })
            else:
                # Sequential execution for other cases
                for agent_id in collaborating_agents:
                    try:
                        if agent_id in ["chart_generation", "insights"] and query_result_data:
                            agent_result = await self._execute_agent_with_data(agent_id, query, agent_context, memory_state, query_result_data)
                        else:
                            agent_result = await self._execute_agent(agent_id, query, agent_context, memory_state, conversation_history=[])
                        collaborating_results.append(agent_result)
                    except Exception as agent_error:
                        logger.warning(f"⚠️ Collaborating agent {agent_id} failed: {agent_error}")
                        collaborating_results.append({
                            "success": False,
                            "result": f"Agent {agent_id} encountered an error",
                            "error": str(agent_error),
                            "agent_id": agent_id
                        })
        else:
            # No query results, execute agents normally
            for agent_id in collaborating_agents:
                try:
                    agent_result = await self._execute_agent(agent_id, query, agent_context, memory_state, conversation_history=[])
                    collaborating_results.append(agent_result)
                except Exception as agent_error:
                    logger.warning(f"⚠️ Collaborating agent {agent_id} failed: {agent_error}")
                    collaborating_results.append({
                        "success": False,
                        "result": f"Agent {agent_id} encountered an error",
                        "error": str(agent_error),
                        "agent_id": agent_id
                    })
        
        # Combine results with proper synthesis
        combined_result = await self._combine_results(primary_result, collaborating_results, query)
        
        # Add SQL query and query results
        if sql_query:
            combined_result["sql_query"] = sql_query
        if query_result_data:
            combined_result["query_result"] = {"success": True, "data": query_result_data}
        
        logger.info(f"✅ Collaborative execution complete: SQL={bool(sql_query)}, Chart={bool(combined_result.get('echarts_config'))}, Narration={bool(combined_result.get('narration'))}")
        
        return combined_result
    
    async def _execute_agent(
        self, 
        agent_id: str, 
        query: str, 
        agent_context: AgentContextSchema, 
        memory_state: LangChainMemorySchema,
        conversation_history: Optional[List[BaseMessage]] = None
    ) -> Dict[str, Any]:
        """Execute a specific agent."""
        try:
            logger.info(f"🤖 Executing agent: {agent_id} with query: {query}")
            logger.info(f"🤖 Agent context: {agent_context}")
            
            if agent_id == "nl2sql":
                # Get data source ID from context
                data_source_id = None
                if agent_context.data_sources:
                    data_source_id = agent_context.data_sources[0]  # Use first data source
                    logger.info(f"🤖 Using data source: {data_source_id}")
                else:
                    # No data source available - return user-friendly error
                    logger.warning("🤖 No data source available for NL2SQL agent")
                    return {
                        "success": False,
                        "result": "I need access to a connected data source to generate SQL queries. Please connect a data source first.",
                        "error": "Data source required for NL2SQL operations",
                        "user_message": "To answer your question, I need access to your data. Please connect a data source in the settings, then try again.",
                        "requires_data_source": True
                    }
                
                # CRITICAL: Check if data source is a file type - if so, use direct data analysis instead of SQL
                data_source_type = None
                if self.data_service:
                    try:
                        source_info = await self.data_service.get_data_source_by_id(data_source_id)
                        if source_info:
                            data_source_type = source_info.get('type', '').lower()
                            logger.info(f"🤖 Data source type: {data_source_type}")
                            
                            # For file sources, use direct data analysis instead of SQL generation
                            if data_source_type == 'file':
                                logger.info(f"📊 File data source detected - using direct data analysis instead of SQL")
                                from app.modules.ai.services.ai_orchestrator import AIOrchestrator
                                file_orchestrator = AIOrchestrator()
                                
                                # Build file source context
                                file_context = {
                                    "file_sources": [source_info],
                                    "data_sources": [source_info],
                                    "data_source_inventory": [source_info]
                                }
                                
                                # Execute file analysis with actual data
                                file_analysis_result = await file_orchestrator._execute_file_analysis(
                                    query=query,
                                    context=file_context,
                                    prompt=query
                                )
                                
                                # Transform file analysis result to match expected format
                                return {
                                    "success": True,
                                    "result": file_analysis_result.get("ai_insights", {}).get("ai_analysis", "Analysis complete"),
                                    "sql_query": None,  # No SQL for file analysis
                                    "query_result": file_analysis_result.get("results", {}).get("data", []),
                                    "echarts_config": file_analysis_result.get("visualization_config", {}),
                                    "insights": [file_analysis_result.get("ai_insights", {})],
                                    "recommendations": [],
                                    "agent_id": "file_analysis",
                                    "execution_metadata": {
                                        "analysis_type": "file_direct_analysis",
                                        "data_rows_analyzed": len(file_analysis_result.get("results", {}).get("data", [])),
                                        "components_generated": {
                                            "chart": bool(file_analysis_result.get("visualization_config")),
                                            "insights": bool(file_analysis_result.get("ai_insights")),
                                            "sql": False
                                        }
                                    }
                                }
                    except Exception as e:
                        logger.warning(f"⚠️ Failed to check data source type: {e}, proceeding with SQL generation")
                
                # Get schema from agent_context if available
                schema_info = None
                if hasattr(agent_context, 'schema') and agent_context.schema:
                    schema_info = agent_context.schema
                    logger.info(f"🤖 Using schema from agent context: {len(schema_info)} tables/objects")
                
                try:
                result = await self.nl2sql_agent.generate_sql(
                    natural_language_query=query,
                    data_source_id=data_source_id,
                        context=agent_context,
                        conversation_history=conversation_history or [],
                        schema_info=schema_info
                )
                    logger.info(f"🤖 NL2SQL agent result: success={result.get('success')}, has_sql={bool(result.get('sql_query'))}")
                return result
                except Exception as nl2sql_error:
                    logger.error(f"❌ NL2SQL agent exception: {nl2sql_error}", exc_info=True)
                    return {
                        "success": False,
                        "result": f"I encountered an issue generating SQL: {str(nl2sql_error)}. Please check your data source connection and try again.",
                        "error": str(nl2sql_error),
                        "user_message": "I had trouble generating SQL for your question. Please verify your data source is connected and accessible."
                    }
            elif agent_id == "chart_generation":
                # CRITICAL: Chart generation REQUIRES query results - no data, no chart
                # This is cost-efficient and logical - charts need data to visualize
                data = None
                
                # Check for query results - this is the ONLY valid path
                if hasattr(agent_context, 'query_results') and agent_context.query_results and len(agent_context.query_results) > 0:
                    data = agent_context.query_results
                    logger.info(f"🤖 Chart agent: Using {len(data)} rows from query results")
                        else:
                    # No query results - skip chart agent to save tokens
                    logger.warning("⚠️ Chart agent: No query results available, skipping to save tokens")
                    return {
                        "success": False,
                        "agent_id": "chart_generation",
                        "error": "no_data_available",
                        "result": "I need query results to generate a chart. Please ensure your query returns data first.",
                        "message": "No data available for chart generation. Please run a query that returns results, then I can create a visualization."
                    }
                
                # Generate chart from actual data
                result = await self.chart_agent.generate_chart(
                    data=data,
                    query_intent=query,
                    title="Chart Analysis",
                    context=agent_context
                )
                
                logger.info(f"🤖 Chart agent result: success={result.get('success')}, has_primary_chart={bool(result.get('primary_chart'))}")
                # Ensure agent_id is set for proper extraction
                if isinstance(result, dict):
                    result["agent_id"] = "chart_generation"
                return result
            elif agent_id == "insights":
                # CRITICAL: Only run insights agent if we have actual data
                # Don't waste tokens on agents that will fail
                data = []
                # Check if query results are available (from NL2SQL execution)
                if hasattr(agent_context, 'query_results') and agent_context.query_results:
                    if isinstance(agent_context.query_results, list) and len(agent_context.query_results) > 0:
                        data = agent_context.query_results
                        logger.info(f"🤖 Insights agent - using query results: {len(data)} rows")
                        else:
                        logger.warning("⚠️ Insights agent: Query results empty or invalid, skipping to save tokens")
                        return {
                            "success": False,
                            "agent_id": "insights",
                            "error": "no_data_available",
                            "result": "I need data to generate insights. Please ensure your query returns results first.",
                            "user_message": "No data available for insights generation. Please run a query that returns data, then I can provide insights."
                        }
                else:
                    # No query results - skip insights agent to save tokens
                    logger.warning("⚠️ Insights agent: No query results available, skipping to save tokens")
                    return {
                        "success": False,
                        "agent_id": "insights",
                        "error": "no_data_available",
                        "result": "I need query results to generate insights. Please run a SQL query first.",
                        "user_message": "To generate insights, I need data from a query. Please ask a question that requires data analysis first."
                    }
                
                # Validate data format before passing to agent
                if isinstance(data, str):
                    if "NO_DATA" in data.upper() or "NO RAW DATA" in data.upper() or "NOT FOUND" in data.upper():
                        logger.warning("⚠️ Insights agent: Invalid data format detected, skipping")
                        return {
                            "success": False,
                            "agent_id": "insights",
                            "error": "invalid_data_format",
                            "result": "The data format is invalid. Please ensure your query returns valid data.",
                            "user_message": "I couldn't process the data. Please check your query and data source connection."
                        }
                
                if not isinstance(data, list) or len(data) == 0:
                    logger.warning("⚠️ Insights agent: No valid data, skipping")
                    return {
                        "success": False,
                        "agent_id": "insights",
                        "error": "no_data_available",
                        "result": "No data available for insights generation.",
                        "user_message": "I need data to generate insights. Please ensure your query returns results."
                    }
                
                result = await self.insights_agent.generate_insights(
                    data=data,
                    query_context=query,
                    user_role=agent_context.user_role,
                    context=agent_context
                )
                logger.info(f"🤖 Insights agent result: success={result.get('success')}, has_insights={bool(result.get('insights'))}, has_recommendations={bool(result.get('recommendations'))}")
                # Ensure agent_id is set for proper extraction
                if isinstance(result, dict):
                    result["agent_id"] = "insights"
                return result
            else:
                logger.error(f"🤖 Unknown agent: {agent_id}")
                return {"success": False, "error": f"Unknown agent: {agent_id}"}
        except Exception as e:
            logger.error(f"Agent {agent_id} execution failed: {e}")
            return {
                "success": False, 
                "result": "I encountered an issue while processing your request. Please try again or check your data source connection.",
                "error": str(e)
            }
    
    async def _execute_agent_with_data(
        self, 
        agent_id: str, 
        query: str, 
        agent_context: AgentContextSchema, 
        memory_state: LangChainMemorySchema,
        data: List[Dict]
    ) -> Dict[str, Any]:
        """Execute agent with pre-fetched data (for chart and insights agents)."""
        try:
            if agent_id == "chart_generation":
                result = await self.chart_agent.generate_chart(
                    data=data,
                    query_intent=query,
                    title="Chart Analysis",
                    context=agent_context
                )
                logger.info(f"🤖 Chart agent result: success={result.get('success')}, has_primary_chart={bool(result.get('primary_chart'))}")
                # Ensure agent_id is set for proper extraction
                if isinstance(result, dict):
                    result["agent_id"] = "chart_generation"
                return result
            elif agent_id == "insights":
                result = await self.insights_agent.generate_insights(
                    data=data,
                    query_context=query,
                    user_role=agent_context.user_role,
                    context=agent_context
                )
                logger.info(f"🤖 Insights agent result: success={result.get('success')}, has_insights={bool(result.get('insights'))}, has_recommendations={bool(result.get('recommendations'))}, has_executive_summary={bool(result.get('executive_summary'))}")
                logger.info(f"🤖 Insights agent result keys: {list(result.keys()) if isinstance(result, dict) else 'not a dict'}")
                # Ensure agent_id is set for proper extraction
                if isinstance(result, dict):
                    result["agent_id"] = "insights"
                    # CRITICAL: Log the actual insights structure
                    if result.get("insights"):
                        insights = result.get("insights")
                        logger.info(f"📊 Insights type: {type(insights)}, is_list: {isinstance(insights, list)}, len: {len(insights) if isinstance(insights, list) else 'N/A'}")
                    if result.get("executive_summary"):
                        exec_sum = result.get("executive_summary")
                        logger.info(f"📊 Executive summary type: {type(exec_sum)}, is_str: {isinstance(exec_sum, str)}, len: {len(str(exec_sum)) if exec_sum else 0}")
                return result
            else:
                # Fallback to regular execution
                return await self._execute_agent(agent_id, query, agent_context, memory_state, conversation_history=[])
        except Exception as e:
            logger.error(f"Agent {agent_id} execution with data failed: {e}")
            return {
                "success": False,
                "result": f"Agent {agent_id} encountered an error",
                "error": str(e)
            }
    
    async def _combine_results(self, primary_result: Dict[str, Any], collaborating_results: List[Dict[str, Any]], original_query: str = "") -> Dict[str, Any]:
        """Combine results from multiple agents.
        
        Args:
            primary_result: Result from primary agent
            collaborating_results: Results from collaborating agents
            original_query: The original user query for context
        """
        try:
            # CRITICAL: Log what we received for debugging
            logger.info("🔍 _combine_results called with:")
            logger.info(f"  Primary result keys: {list(primary_result.keys())}, success={primary_result.get('success')}")
            logger.info(f"  Collaborating results count: {len(collaborating_results)}")
            for i, collab in enumerate(collaborating_results):
                agent_id = collab.get("agent_id", "unknown")
                logger.info(f"  Collab {i+1} ({agent_id}): keys={list(collab.keys())}, success={collab.get('success')}")
                if agent_id == "chart_generation":
                    logger.info(f"    Chart: primary_chart={bool(collab.get('primary_chart'))}, echarts_config={bool(collab.get('echarts_config'))}, chart_config={bool(collab.get('chart_config'))}")
                if agent_id == "insights":
                    logger.info(f"    Insights: insights={bool(collab.get('insights'))}, executive_summary={bool(collab.get('executive_summary'))}, recommendations={bool(collab.get('recommendations'))}")
            
            # CRITICAL: Use unified extraction FIRST (before individual checks)
            # This is the single source of truth - if it finds components, we have meaningful results
            from app.modules.ai.utils.result_extraction import extract_structured_components
            
            # CRITICAL: Build a combined result dict from primary and collaborating results
            # This ensures unified extraction can find all components
            # IMPORTANT: Also extract from collaborating_results to ensure we don't miss anything
            combined_result_dict = {}
            if primary_result:
                combined_result_dict.update({
                    "sql_query": primary_result.get("sql_query"),
                    "query_result": primary_result.get("query_result"),
                    "echarts_config": primary_result.get("echarts_config") or primary_result.get("primary_chart"),
                    "insights": primary_result.get("insights", []),
                    "narration": primary_result.get("narration") or primary_result.get("analysis"),
                    "executive_summary": primary_result.get("executive_summary")
                })
            
            # CRITICAL: Also extract components from collaborating_results BEFORE calling unified extraction
            # This ensures we don't miss components that are only in collaborating_results
            for collab_result in collaborating_results:
                agent_id = collab_result.get("agent_id", "unknown")
                # Extract chart config from collaborating results
                if not combined_result_dict.get("echarts_config"):
                    chart_config = (
                        collab_result.get("primary_chart") or
                        collab_result.get("echarts_config") or
                        collab_result.get("chart_config") or
                        (collab_result.get("result", {}).get("primary_chart") if isinstance(collab_result.get("result"), dict) else None) or
                        (collab_result.get("result", {}).get("echarts_config") if isinstance(collab_result.get("result"), dict) else None)
                    )
                    if chart_config:
                        combined_result_dict["echarts_config"] = chart_config
                        logger.info(f"✅ Found chart config in collaborating result ({agent_id}) before unified extraction")
                
                # Extract insights from collaborating results
                if not combined_result_dict.get("insights"):
                    insights = (
                        collab_result.get("insights") or
                        (collab_result.get("result", {}).get("insights") if isinstance(collab_result.get("result"), dict) else None)
                    )
                    if insights and isinstance(insights, list) and len(insights) > 0:
                        combined_result_dict["insights"] = insights
                        logger.info(f"✅ Found insights in collaborating result ({agent_id}) before unified extraction")
                
                # Extract narration from collaborating results
                if not combined_result_dict.get("narration"):
                    narration = (
                        collab_result.get("executive_summary") or
                        collab_result.get("narration") or
                        collab_result.get("analysis") or
                        (collab_result.get("result", {}).get("executive_summary") if isinstance(collab_result.get("result"), dict) else None) or
                        (collab_result.get("result", {}).get("narration") if isinstance(collab_result.get("result"), dict) else None)
                    )
                    if narration:
                        if isinstance(narration, dict):
                            narration = narration.get("text") or narration.get("summary") or narration.get("content") or str(narration)
                        if isinstance(narration, str) and len(narration.strip()) > 50:
                            combined_result_dict["narration"] = narration
                            logger.info(f"✅ Found narration in collaborating result ({agent_id}) before unified extraction")
                
                # Extract recommendations from collaborating results
                if not combined_result_dict.get("recommendations"):
                    recs = (
                        collab_result.get("recommendations") or
                        (collab_result.get("result", {}).get("recommendations") if isinstance(collab_result.get("result"), dict) else None)
                    )
                    if recs and isinstance(recs, list) and len(recs) > 0:
                        combined_result_dict["recommendations"] = recs
                        logger.info(f"✅ Found recommendations in collaborating result ({agent_id}) before unified extraction")
            
            # Extract components from all results using unified extraction
            # CRITICAL: Now combined_result_dict has components from both primary and collaborating results
            pre_extracted = extract_structured_components(
                result=combined_result_dict,  # CRITICAL: Now includes components from collaborating_results
                primary_result=primary_result,
                collaborating_results=collaborating_results
            )
            
            # CRITICAL: Meaningful result = ANY component exists (OR logic, not AND)
            # User can benefit from SQL alone, or Chart alone, or Insights alone, etc.
            # Check at SOURCE (agent results) not just final_result for robustness
            # This ensures we catch components even if extraction fails later
            
            # Check ALL possible locations (source-first approach):
            # 1. pre_extracted (from unified extraction)
            # 2. combined_result_dict (extracted from collaborating_results BEFORE unified extraction)
            # 3. primary_result (direct check at source)
            # 4. collaborating_results (direct check at source as fallback)
            
            has_components = any([
                pre_extracted.get("sql_query") or combined_result_dict.get("sql_query") or primary_result.get("sql_query"),  # SQL alone is meaningful
                pre_extracted.get("query_result") or combined_result_dict.get("query_result") or primary_result.get("query_result"),  # Query results alone are meaningful
                pre_extracted.get("echarts_config") or combined_result_dict.get("echarts_config"),  # Chart is meaningful
                pre_extracted.get("insights") or combined_result_dict.get("insights"),  # Insights are meaningful
                pre_extracted.get("narration") or combined_result_dict.get("narration")  # Narration is meaningful
            ])
            
            # CRITICAL: Also check at SOURCE (agent results directly) for robustness
            # This catches components even if extraction/transformation fails
            if not has_components:
                # Check primary_result directly
                if primary_result.get("sql_query") or primary_result.get("query_result"):
                    has_components = True
                    logger.info("✅ Found meaningful component in primary_result at source")
                
                # Check collaborating_results directly
                for collab_result in collaborating_results:
                    agent_id = collab_result.get("agent_id", "unknown")
                    if (collab_result.get("primary_chart") or 
                        collab_result.get("echarts_config") or 
                        collab_result.get("chart_config") or
                        collab_result.get("insights") or
                        collab_result.get("executive_summary") or
                        collab_result.get("narration")):
                        has_components = True
                        logger.info(f"✅ Found meaningful component in {agent_id} result at source")
                        break
            
            # CRITICAL: Also check collaborating_results directly for chart config (if not found in pre_extracted or combined_result_dict)
            # This is a fallback to ensure we catch chart config even if unified extraction missed it
            if not has_components or not (pre_extracted.get("echarts_config") or combined_result_dict.get("echarts_config")):
                for collab_result in collaborating_results:
                    agent_id = collab_result.get("agent_id", "unknown")
                    # Check for chart config in collaborating results
                    chart_config = (
                        collab_result.get("primary_chart") or
                        collab_result.get("echarts_config") or
                        collab_result.get("chart_config") or
                        (collab_result.get("result", {}).get("primary_chart") if isinstance(collab_result.get("result"), dict) else None) or
                        (collab_result.get("result", {}).get("echarts_config") if isinstance(collab_result.get("result"), dict) else None)
                    )
                    if chart_config and isinstance(chart_config, dict) and len(chart_config) > 0:
                        has_components = True
                        logger.info(f"✅ Found chart config in collaborating result ({agent_id}) - marking as meaningful")
                        # Add to combined_result_dict so unified extraction can find it
                        if not combined_result_dict.get("echarts_config"):
                            combined_result_dict["echarts_config"] = chart_config
                        break
                    # Check for insights
                    insights = collab_result.get("insights") or (collab_result.get("result", {}).get("insights") if isinstance(collab_result.get("result"), dict) else None)
                    if insights and isinstance(insights, list) and len(insights) > 0:
                        has_components = True
                        logger.info(f"✅ Found insights in collaborating result ({agent_id}) - marking as meaningful")
                        break
            
            # CRITICAL: Also check if query_result has actual data (not just empty dict)
            query_result = pre_extracted.get("query_result") or combined_result_dict.get("query_result") or primary_result.get("query_result")
            if query_result:
                if isinstance(query_result, dict):
                    query_data = query_result.get("data", [])
                    if query_data and len(query_data) > 0:
                        has_components = True  # We have actual data rows
                        logger.info(f"✅ Found query result with {len(query_data)} rows - marking as meaningful")
                elif isinstance(query_result, list) and len(query_result) > 0:
                    has_components = True  # We have actual data rows
                    logger.info(f"✅ Found query result with {len(query_result)} rows - marking as meaningful")
            
            has_meaningful_result = has_components
            
            # CRITICAL: Log what we found for debugging
            if has_meaningful_result:
                logger.info("✅ HAS MEANINGFUL RESULTS - Components found:")
                logger.info(f"   - SQL Query: {bool(pre_extracted.get('sql_query') or combined_result_dict.get('sql_query') or primary_result.get('sql_query'))}")
                logger.info(f"   - Query Result: {bool(pre_extracted.get('query_result') or combined_result_dict.get('query_result') or primary_result.get('query_result'))}")
                logger.info(f"   - Chart Config: {bool(pre_extracted.get('echarts_config') or combined_result_dict.get('echarts_config'))}")
                logger.info(f"   - Insights: {bool(pre_extracted.get('insights') or combined_result_dict.get('insights'))}")
                logger.info(f"   - Narration: {bool(pre_extracted.get('narration') or combined_result_dict.get('narration'))}")
            else:
                logger.warning("⚠️ NO MEANINGFUL RESULTS - Checking why:")
                logger.warning(f"   - pre_extracted SQL: {bool(pre_extracted.get('sql_query'))}")
                logger.warning(f"   - pre_extracted Chart: {bool(pre_extracted.get('echarts_config'))}")
                logger.warning(f"   - pre_extracted Insights: {bool(pre_extracted.get('insights'))}")
                logger.warning(f"   - combined_result_dict Chart: {bool(combined_result_dict.get('echarts_config'))}")
                logger.warning(f"   - primary_result SQL: {bool(primary_result.get('sql_query'))}")
                logger.warning(f"   - primary_result Query Result: {bool(primary_result.get('query_result'))}")
                for i, collab in enumerate(collaborating_results):
                    agent_id = collab.get("agent_id", "unknown")
                    logger.warning(f"   - collab {i+1} ({agent_id}): chart={bool(collab.get('primary_chart') or collab.get('echarts_config'))}, insights={bool(collab.get('insights'))}")
            meaningful_results = []
            
            if has_components:
                # Use actual query result row count (dynamic)
                query_result_data = pre_extracted.get('query_result', {})
                if isinstance(query_result_data, dict):
                    actual_row_count = len(query_result_data.get('data', [])) if query_result_data.get('data') else 0
                elif isinstance(query_result_data, list):
                    actual_row_count = len(query_result_data)
                else:
                    actual_row_count = 0
                
                logger.info("✅ Unified extraction found components → HAS MEANINGFUL RESULTS")
                logger.info(f"   - SQL Query: {bool(pre_extracted.get('sql_query'))}")
                logger.info(f"   - Chart Config: {bool(pre_extracted.get('echarts_config'))}")
                logger.info(f"   - Insights: {len(pre_extracted.get('insights', []))} items")
                logger.info(f"   - Narration: {bool(pre_extracted.get('narration'))}")
                logger.info(f"   - Query Result: {bool(pre_extracted.get('query_result'))} ({actual_row_count} rows)")
                # Add extracted components to meaningful_results for processing
                meaningful_results.append(("Unified Extraction", pre_extracted))
            else:
                logger.warning("⚠️ Unified extraction found NO components")
                logger.warning(f"   - SQL Query: {bool(pre_extracted.get('sql_query'))}")
                logger.warning(f"   - Chart Config: {bool(pre_extracted.get('echarts_config'))}")
                logger.warning(f"   - Insights: {len(pre_extracted.get('insights', []))} items")
                logger.warning(f"   - Narration: {bool(pre_extracted.get('narration'))}")
                # Use actual query result row count (dynamic)
                query_result_data = pre_extracted.get('query_result', {})
                if isinstance(query_result_data, dict):
                    actual_row_count = len(query_result_data.get('data', [])) if query_result_data.get('data') else 0
                elif isinstance(query_result_data, list):
                    actual_row_count = len(query_result_data)
                else:
                    actual_row_count = 0
                logger.warning(f"   - Query Result: {bool(pre_extracted.get('query_result'))} ({actual_row_count} rows)")
            
            # Also check individual results (for additional context, but unified extraction is authoritative)
            def _is_meaningful_result(result: Dict[str, Any]) -> bool:
                """Check if result contains meaningful data (not just success flag)"""
                # CRITICAL: Check for structured data FIRST, even if success=False
                # This handles cases where chart/SQL/insights exist but success flag is wrong
                
                # Helper to check if value is non-empty
                def _is_non_empty(value):
                    if value is None:
                        return False
                    if isinstance(value, (list, dict, str)):
                        # For dict, check if it has keys (not just empty dict)
                        # CRITICAL: Don't check if ALL values are None - chart configs can have None values for optional fields
                        if isinstance(value, dict):
                            # Just check if dict has keys - even if some values are None, it's still meaningful
                            return len(value) > 0
                        # For list, check if it has items
                        if isinstance(value, list):
                            return len(value) > 0
                        # For string, check if it's not empty/whitespace
                        if isinstance(value, str):
                            return len(value.strip()) > 0
                        return len(value) > 0 if value else False
                    return bool(value)
                
                # DEBUG: Log what we're checking
                agent_id = result.get("agent_id", "unknown")
                logger.debug(f"🔍 Checking meaningful result for {agent_id}: keys={list(result.keys())}")
                
                # Check for structured data (chart, insights, SQL, query results) - check regardless of success flag
                # CRITICAL: Check multiple locations for chart config
                chart_config = (
                    result.get("primary_chart") or 
                    result.get("echarts_config") or 
                    result.get("chart_config") or
                    (result.get("result", {}).get("primary_chart") if isinstance(result.get("result"), dict) else None) or
                    (result.get("result", {}).get("echarts_config") if isinstance(result.get("result"), dict) else None) or
                    (result.get("result", {}).get("chart_config") if isinstance(result.get("result"), dict) else None)
                )
                
                # CRITICAL: If chart not found in dict fields, try extracting from result string (JSON)
                if not chart_config or not isinstance(chart_config, dict):
                    result_text = result.get("result", "")
                    if isinstance(result_text, str) and result_text.strip():
                        # Try to extract JSON chart config from text
                        import re
                        import json
                        # Look for JSON object in the text (ECharts config typically has "title" and "series")
                        json_match = re.search(r'\{[\s\S]*"title"[\s\S]*"series"[\s\S]*\}', result_text, re.DOTALL)
                        if json_match:
                            try:
                                chart_config = json.loads(json_match.group(0))
                                logger.info(f"✅ Extracted chart config from result text (JSON string) in {agent_id}")
                            except json.JSONDecodeError:
                                # Try to find JSON after "ECharts Configuration:" or similar
                                json_match2 = re.search(r'(?:ECharts Configuration|chart config|echarts_config)[:\s]*(\{[\s\S]*\})', result_text, re.IGNORECASE | re.DOTALL)
                                if json_match2:
                                    try:
                                        chart_config = json.loads(json_match2.group(1))
                                        logger.info(f"✅ Extracted chart config from prefixed result text in {agent_id}")
                                    except json.JSONDecodeError:
                                        pass
                
                if chart_config and _is_non_empty(chart_config):
                    logger.info(f"✅ Found chart config in {agent_id} result (success={result.get('success')}): type={type(chart_config)}, is_dict={isinstance(chart_config, dict)}, keys={list(chart_config.keys()) if isinstance(chart_config, dict) else 'N/A'}")
                    return True
                elif chart_config:
                    logger.warning(f"⚠️ Chart config found but empty in {agent_id}: {chart_config}")
                
                # Check insights - must be non-empty
                insights = result.get("insights")
                exec_summary = result.get("executive_summary")
                recommendations = result.get("recommendations")
                # Also check nested locations
                if not insights and isinstance(result.get("result"), dict):
                    insights = result.get("result", {}).get("insights")
                if not exec_summary and isinstance(result.get("result"), dict):
                    exec_summary = result.get("result", {}).get("executive_summary")
                if not recommendations and isinstance(result.get("result"), dict):
                    recommendations = result.get("result", {}).get("recommendations")
                
                if _is_non_empty(insights) or _is_non_empty(exec_summary) or _is_non_empty(recommendations):
                    logger.info(f"✅ Found insights/recommendations in {agent_id} result: insights={bool(insights)} (type={type(insights)}, len={len(insights) if isinstance(insights, list) else 'N/A'}), exec_summary={bool(exec_summary)} (type={type(exec_summary)}, len={len(str(exec_summary)) if exec_summary else 0}), recs={bool(recommendations)} (type={type(recommendations)}, len={len(recommendations) if isinstance(recommendations, list) else 'N/A'}), success={result.get('success')}")
                    return True
                elif insights or exec_summary or recommendations:
                    logger.warning(f"⚠️ Insights/recommendations found but empty in {agent_id}: insights={insights}, exec_summary={exec_summary}, recs={recommendations}")
                
                # CRITICAL: SQL query is meaningful even if execution failed (user can see the SQL)
                sql_query = result.get("sql_query")
                if sql_query and isinstance(sql_query, str) and sql_query.strip():
                    logger.debug(f"✅ Found SQL query in result (success={result.get('success')})")
                    return True
                
                query_result = result.get("query_result")
                data = result.get("data")
                if (_is_non_empty(query_result) or _is_non_empty(data)):
                    logger.debug(f"✅ Found query result/data in result (success={result.get('success')})")
                    return True
                # Also check if there's an error message that's user-friendly (not just "failed")
                error = result.get("error")
                if error and isinstance(error, str):
                    error_msg = error.lower()
                    # If error contains actionable info (like "GROUP BY" or "table not found"), it's meaningful
                    if any(keyword in error_msg for keyword in ["group by", "table", "column", "syntax", "not found"]):
                        logger.debug("✅ Found actionable error message in result")
                        return True
                
                # Check nested result field
                nested_result = result.get("result")
                if isinstance(nested_result, dict):
                    if nested_result.get("primary_chart") or nested_result.get("echarts_config"):
                        logger.debug(f"✅ Found chart config in nested result (success={result.get('success')})")
                        return True
                    if nested_result.get("insights") or nested_result.get("executive_summary"):
                        logger.debug(f"✅ Found insights in nested result (success={result.get('success')})")
                        return True
                    if nested_result.get("sql_query"):
                        logger.debug(f"✅ Found SQL in nested result (success={result.get('success')})")
                        return True
                    if nested_result.get("data"):
                        logger.debug(f"✅ Found data in nested result (success={result.get('success')})")
                        return True
                
                # Check for text result - CRITICAL: Only check success flag for text results, not structured data
                # If we got here, structured data checks above didn't find anything, so check text
                text_result = result.get("result")
                if text_result and isinstance(text_result, str) and text_result.strip() and text_result.strip() != "No result":
                    # Check if text contains chart config or insights indicators
                    text_lower = text_result.lower()
                    if ("echarts configuration" in text_lower or 
                        ("chart" in text_lower and "{" in text_result) or
                        "summary" in text_lower or 
                        ("analysis" in text_lower and len(text_result) > 50)):
                        logger.info(f"✅ Found meaningful text result with chart/insights indicators in {agent_id}: {text_lower[:100]}")
                        return True
                    # If text is long enough, it's meaningful
                    if len(text_result.strip()) > 100:
                        logger.info(f"✅ Found meaningful text result (long text) in {agent_id}: {len(text_result)} chars")
                        return True
                
                # CRITICAL: Only check success flag for text results - if we have structured data, we already returned True above
                # If we get here with no structured data and no meaningful text, check success flag
                if not result.get("success"):
                    logger.debug(f"⚠️ {agent_id} result not meaningful: no structured data, no meaningful text, success=False")
                    return False
                
                # If success=True but no structured data or meaningful text, still not meaningful
                logger.debug(f"⚠️ {agent_id} result not meaningful: success=True but no structured data or meaningful text")
                return False
            
            # Also check individual results (for additional context, but unified extraction is authoritative)
            # This is just for logging - unified extraction already determined if we have meaningful results
            if _is_meaningful_result(primary_result):
                if not has_meaningful_result:
                    has_meaningful_result = True
                meaningful_results.append(("Primary", primary_result))
                logger.info(f"✅ Primary result is meaningful: success={primary_result.get('success')}, has_sql={bool(primary_result.get('sql_query'))}, has_chart={bool(primary_result.get('primary_chart') or primary_result.get('echarts_config'))}, has_insights={bool(primary_result.get('insights'))}")
            
            # Check collaborating results
            for i, result in enumerate(collaborating_results):
                if _is_meaningful_result(result):
                    if not has_meaningful_result:
                        has_meaningful_result = True
                    meaningful_results.append((f"Collaborating {i+1}", result))
                    agent_id = result.get("agent_id", "unknown")
                    logger.info(f"✅ Collaborating result {i+1} ({agent_id}) is meaningful: has_chart={bool(result.get('primary_chart') or result.get('echarts_config'))}, has_insights={bool(result.get('insights'))}, has_recommendations={bool(result.get('recommendations'))}")
            
            # CRITICAL: Print FINAL RESULT structure before checking meaningful
            logger.info("=" * 80)
            logger.info("📦 FINAL RESULT STRUCTURE (before meaningful check):")
            logger.info("  Primary Result:")
            logger.info(f"    - Keys: {list(primary_result.keys())}")
            logger.info(f"    - Success: {primary_result.get('success')}")
            logger.info(f"    - SQL Query: {bool(primary_result.get('sql_query'))} ({len(primary_result.get('sql_query', '')) if primary_result.get('sql_query') else 0} chars)")
            logger.info(f"    - Query Result: {bool(primary_result.get('query_result'))}")
            if primary_result.get('query_result'):
                qr = primary_result.get('query_result')
                if isinstance(qr, dict):
                    logger.info(f"      - Has data: {bool(qr.get('data'))} ({len(qr.get('data', []))} rows)")
                elif isinstance(qr, list):
                    logger.info(f"      - Data rows: {len(qr)}")
            
            logger.info(f"  Collaborating Results ({len(collaborating_results)}):")
            for i, result in enumerate(collaborating_results):
                agent_id = result.get('agent_id', 'unknown')
                logger.info(f"    [{i+1}] {agent_id}:")
                logger.info(f"      - Success: {result.get('success')}")
                logger.info(f"      - Keys: {list(result.keys())}")
                if agent_id == "chart_generation":
                    logger.info(f"      - primary_chart: {bool(result.get('primary_chart'))} (type: {type(result.get('primary_chart'))})")
                    logger.info(f"      - echarts_config: {bool(result.get('echarts_config'))} (type: {type(result.get('echarts_config'))})")
                    logger.info(f"      - chart_config: {bool(result.get('chart_config'))}")
                    if result.get('primary_chart'):
                        pc = result.get('primary_chart')
                        if isinstance(pc, dict):
                            logger.info(f"        primary_chart keys: {list(pc.keys())}")
                    if result.get('echarts_config'):
                        ec = result.get('echarts_config')
                        if isinstance(ec, dict):
                            logger.info(f"        echarts_config keys: {list(ec.keys())}")
                if agent_id == "insights" or "insights" in str(agent_id).lower():
                    logger.info(f"      - insights: {bool(result.get('insights'))} (type: {type(result.get('insights'))})")
                    logger.info(f"      - executive_summary: {bool(result.get('executive_summary'))} (type: {type(result.get('executive_summary'))})")
                    logger.info(f"      - recommendations: {bool(result.get('recommendations'))}")
                    if result.get('insights'):
                        ins = result.get('insights')
                        if isinstance(ins, list):
                            logger.info(f"        insights count: {len(ins)}")
                    if result.get('executive_summary'):
                        es = result.get('executive_summary')
                        if isinstance(es, str):
                            logger.info(f"        executive_summary length: {len(es)} chars")
                        elif isinstance(es, dict):
                            logger.info(f"        executive_summary keys: {list(es.keys())}")
            
            logger.info("  Pre-extracted (unified extraction):")
            logger.info(f"    - SQL Query: {bool(pre_extracted.get('sql_query'))}")
            logger.info(f"    - Query Result: {bool(pre_extracted.get('query_result'))}")
            logger.info(f"    - Chart Config: {bool(pre_extracted.get('echarts_config'))}")
            logger.info(f"    - Insights: {bool(pre_extracted.get('insights'))}")
            logger.info(f"    - Narration: {bool(pre_extracted.get('narration'))}")
            
            logger.info("  Combined Result Dict (from collaborating_results):")
            logger.info(f"    - SQL Query: {bool(combined_result_dict.get('sql_query'))}")
            logger.info(f"    - Query Result: {bool(combined_result_dict.get('query_result'))}")
            logger.info(f"    - Chart Config: {bool(combined_result_dict.get('echarts_config'))}")
            logger.info(f"    - Insights: {bool(combined_result_dict.get('insights'))}")
            logger.info(f"    - Narration: {bool(combined_result_dict.get('narration'))}")
            
            logger.info(f"  Has Meaningful Result: {has_meaningful_result}")
            logger.info("=" * 80)
            
            # If no meaningful results after unified extraction, use fallback
            if not has_meaningful_result:
                logger.warning("⚠️ No meaningful results from agents (even after unified extraction), using fallback response")
                logger.warning(f"Primary result keys: {list(primary_result.keys())}, success={primary_result.get('success')}")
                
                for i, result in enumerate(collaborating_results):
                    agent_id = result.get('agent_id', 'unknown')
                    logger.warning(f"Collaborating {i+1} ({agent_id}): success={result.get('success')}")
                    if agent_id == "chart_generation":
                        logger.warning(f"  Chart: primary_chart={bool(result.get('primary_chart'))}, echarts_config={bool(result.get('echarts_config'))}")
                    if agent_id == "insights":
                        logger.warning(f"  Insights: insights={bool(result.get('insights'))}, executive_summary={bool(result.get('executive_summary'))}")
                
                # Final attempt: try to extract components directly
                extracted_components = {}
                for result in [primary_result] + collaborating_results:
                    agent_id = result.get('agent_id', 'unknown')
                    # Try to extract chart - check ALL possible locations
                    if not extracted_components.get("echarts_config"):
                        chart = (
                            result.get("primary_chart") or 
                            result.get("echarts_config") or 
                            result.get("chart_config") or
                            (result.get("result", {}).get("primary_chart") if isinstance(result.get("result"), dict) else None) or
                            (result.get("result", {}).get("echarts_config") if isinstance(result.get("result"), dict) else None) or
                            (result.get("result", {}).get("chart_config") if isinstance(result.get("result"), dict) else None)
                        )
                        # CRITICAL: Also check if result is a string containing JSON chart config
                        if not chart or not isinstance(chart, dict):
                            result_text = result.get("result", "")
                            if isinstance(result_text, str) and result_text.strip():
                                # Try to extract JSON chart config from text
                                import re
                                import json
                                # Look for JSON object in the text (ECharts config typically has "title" and "series")
                                json_match = re.search(r'\{[\s\S]*"title"[\s\S]*"series"[\s\S]*\}', result_text, re.DOTALL)
                                if json_match:
                                    try:
                                        chart = json.loads(json_match.group(0))
                                        logger.info("✅ FINAL ATTEMPT: Extracted chart config from result text (JSON string)")
                                    except json.JSONDecodeError:
                                        # Try to find JSON after "ECharts Configuration:" or similar
                                        json_match2 = re.search(r'(?:ECharts Configuration|chart config|echarts_config)[:\s]*(\{[\s\S]*\})', result_text, re.IGNORECASE | re.DOTALL)
                                        if json_match2:
                                            try:
                                                chart = json.loads(json_match2.group(1))
                                                logger.info("✅ FINAL ATTEMPT: Extracted chart config from prefixed result text")
                                            except json.JSONDecodeError:
                                                pass
                        if chart and isinstance(chart, dict) and len(chart) > 0:
                            extracted_components["echarts_config"] = chart
                            logger.info(f"✅ FINAL ATTEMPT: Found chart in {agent_id} result")
                    # Try to extract insights - check ALL possible locations
                    if not extracted_components.get("insights"):
                        insights = (
                            result.get("insights") or
                            (result.get("result", {}).get("insights") if isinstance(result.get("result"), dict) else None)
                        )
                        if insights and isinstance(insights, list) and len(insights) > 0:
                            extracted_components["insights"] = insights
                            logger.info(f"✅ Found insights in fallback extraction from {agent_id}")
                    # Try to extract SQL - check ALL possible locations
                    if not extracted_components.get("sql_query"):
                        sql = (
                            result.get("sql_query") or
                            (result.get("result", {}).get("sql_query") if isinstance(result.get("result"), dict) else None)
                        )
                        if sql and isinstance(sql, str) and sql.strip():
                            extracted_components["sql_query"] = sql
                            logger.info(f"✅ Found SQL in fallback extraction from {agent_id}")
                    # Try to extract narration - check ALL possible locations
                    if not extracted_components.get("narration"):
                        narration = (
                            result.get("executive_summary") or 
                            result.get("narration") or 
                            result.get("analysis") or
                            (result.get("result", {}).get("executive_summary") if isinstance(result.get("result"), dict) else None) or
                            (result.get("result", {}).get("narration") if isinstance(result.get("result"), dict) else None) or
                            (result.get("result", {}).get("analysis") if isinstance(result.get("result"), dict) else None)
                        )
                        if narration:
                            # Handle both string and dict formats
                            if isinstance(narration, dict):
                                narration = narration.get("text") or narration.get("summary") or narration.get("content") or str(narration)
                            if isinstance(narration, str) and len(narration.strip()) > 50:
                                extracted_components["narration"] = narration
                                logger.info(f"✅ Found narration in fallback extraction from {agent_id}")
                    # Try to extract recommendations
                    if not extracted_components.get("recommendations"):
                        recs = (
                            result.get("recommendations") or
                            (result.get("result", {}).get("recommendations") if isinstance(result.get("result"), dict) else None)
                        )
                        if recs and isinstance(recs, list) and len(recs) > 0:
                            extracted_components["recommendations"] = recs
                            logger.info(f"✅ Found recommendations in fallback extraction from {agent_id}")
                
                # If we found components in fallback extraction, use them instead of full fallback
                if extracted_components:
                    logger.info(f"✅ Fallback extraction found components: {list(extracted_components.keys())}")
                    # Mark as meaningful and add to meaningful_results
                    has_meaningful_result = True
                    meaningful_results.append(("Fallback Extraction", extracted_components))
                    # CRITICAL: Build proper response with extracted components (don't use _create_fallback_response)
                    # This ensures components are properly structured for the chat endpoint
                    combined_result = {
                        "success": True,  # Mark as success since we have components
                        "sql_query": extracted_components.get("sql_query") or primary_result.get("sql_query"),
                        "query_result": primary_result.get("query_result") or {"success": True, "data": []},
                        "echarts_config": extracted_components.get("echarts_config"),
                        "chart_data": extracted_components.get("chart_data") or primary_result.get("query_result", {}).get("data") if isinstance(primary_result.get("query_result"), dict) else None,
                        "insights": extracted_components.get("insights", []),
                        "recommendations": extracted_components.get("recommendations", []),
                        "narration": extracted_components.get("narration") or "Analysis completed successfully. Please see the chart and insights below.",
                        "analysis": extracted_components.get("narration") or "Analysis completed successfully.",
                        "result": extracted_components.get("narration") or "Analysis completed successfully.",
                        "metadata": {
                            "extraction_method": "fallback_extraction",
                            "components_found": list(extracted_components.keys()),
                            "primary_result_success": primary_result.get("success"),
                            "collaborating_results_count": len(collaborating_results)
                        }
                    }
                    # CRITICAL: Standardize return value name - use final_result for consistency
                    final_result = combined_result
                    
                    logger.info(f"✅ Built final result from fallback extraction: success=True, components={list(extracted_components.keys())}")
                    logger.info(f"📊 Final result: has_sql={bool(final_result.get('sql_query'))}, has_chart={bool(final_result.get('echarts_config'))}, has_insights={bool(final_result.get('insights'))}, has_narration={bool(final_result.get('narration'))}")
                    logger.info("📤 FINAL RESULT (Fallback Extraction):")
                    logger.info(f"   Success: {final_result.get('success')}")
                    logger.info(f"   SQL Query: {bool(final_result.get('sql_query'))}")
                    logger.info(f"   Query Result: {bool(final_result.get('query_result'))}")
                    logger.info(f"   Chart Config: {bool(final_result.get('echarts_config'))}")
                    logger.info(f"   Insights: {len(final_result.get('insights', []))} items")
                    logger.info(f"   Narration: {bool(final_result.get('narration'))}")
                    
                    return final_result
                
                # No components found - use full fallback
                logger.warning("⚠️ No components found in fallback extraction, using full fallback response")
                return self._create_fallback_response(primary_result, collaborating_results)
            
            # CRITICAL: If unified extraction found components, use them directly
            # Don't rely on LLM synthesis if we already have structured components
            if has_meaningful_result and pre_extracted and any([
                pre_extracted.get("sql_query"),
                pre_extracted.get("echarts_config"),
                pre_extracted.get("insights"),
                pre_extracted.get("narration")
            ]):
                # Build combined result from unified extraction (most reliable)
                # Use actual query result row count (dynamic, not hardcoded)
                query_result_data = pre_extracted.get("query_result", {})
                if isinstance(query_result_data, dict):
                    actual_row_count = len(query_result_data.get("data", [])) if query_result_data.get("data") else 0
                elif isinstance(query_result_data, list):
                    actual_row_count = len(query_result_data)
                else:
                    actual_row_count = 0
                
                combined_result = {
                    "success": True,  # We have components, so success=True
                    "sql_query": pre_extracted.get("sql_query"),
                    "query_result": pre_extracted.get("query_result"),
                    "echarts_config": pre_extracted.get("echarts_config"),
                    "chart_data": pre_extracted.get("chart_data"),
                    "insights": pre_extracted.get("insights", []),
                    "recommendations": pre_extracted.get("recommendations", []),
                    "narration": pre_extracted.get("narration") or pre_extracted.get("executive_summary"),
                    "analysis": pre_extracted.get("narration") or pre_extracted.get("executive_summary"),
                    "result": pre_extracted.get("narration") or pre_extracted.get("executive_summary") or "Analysis completed successfully.",
                    "metadata": {
                        "extraction_method": "unified_extraction",
                        "components_found": [k for k, v in pre_extracted.items() if v and k not in ["chart_data"]],
                        "primary_result_success": primary_result.get("success"),
                        "collaborating_results_count": len(collaborating_results),
                        "query_row_count": actual_row_count  # Dynamic row count
                    }
                }
                # CRITICAL: Standardize return value name - use final_result for consistency
                final_result = combined_result
                
                logger.info(f"✅ Built final result from unified extraction: success=True, components={final_result['metadata']['components_found']}, row_count={actual_row_count}")
                logger.info(f"📊 Final result: has_sql={bool(final_result.get('sql_query'))}, has_chart={bool(final_result.get('echarts_config'))}, has_insights={bool(final_result.get('insights'))}, has_narration={bool(final_result.get('narration'))}")
                logger.info("📤 FINAL RESULT (_combine_results):")
                logger.info(f"   Success: {final_result.get('success')}")
                logger.info(f"   SQL Query: {bool(final_result.get('sql_query'))}")
                logger.info(f"   Query Result: {bool(final_result.get('query_result'))}")
                logger.info(f"   Chart Config: {bool(final_result.get('echarts_config'))}")
                logger.info(f"   Insights: {len(final_result.get('insights', []))} items")
                logger.info(f"   Narration: {bool(final_result.get('narration'))}")
                
                return final_result
            
            # Fallback: Use LLM to synthesize only meaningful results
            # CRITICAL: Build summary from structured data, not just "result" field
            results_summary_parts = []
            for label, result in meaningful_results:
                # Extract text result if available
                text_result = result.get("result", "")
                if text_result and isinstance(text_result, str) and text_result.strip():
                    results_summary_parts.append(f"{label} Agent Result:\n{text_result}")
                else:
                    # Build summary from structured fields
                    summary_parts = []
                    if result.get("sql_query"):
                        summary_parts.append(f"SQL Query: {result.get('sql_query')}")
                    if result.get("primary_chart") or result.get("echarts_config"):
                        summary_parts.append("Chart generated successfully")
                    if result.get("insights"):
                        insights = result.get("insights", [])
                        if isinstance(insights, list):
                            summary_parts.append(f"Insights: {len(insights)} insights generated")
                        else:
                            summary_parts.append("Insights generated")
                    if result.get("executive_summary"):
                        summary_parts.append(f"Summary: {result.get('executive_summary')[:200]}...")
                    if result.get("recommendations"):
                        recs = result.get("recommendations", [])
                        if isinstance(recs, list):
                            summary_parts.append(f"Recommendations: {len(recs)} recommendations")
                        else:
                            summary_parts.append("Recommendations generated")
                    if summary_parts:
                        results_summary_parts.append(f"{label} Agent Result:\n" + "\n".join(summary_parts))
            
            results_summary = "\n\n".join(results_summary_parts) if results_summary_parts else "Agents completed successfully."
            
            # OPTIMIZATION: Enhanced synthesis prompt with structured output request
            synthesis_prompt = f"""You are a helpful, conversational data analytics assistant. Synthesize the following agent results into a clear, natural, and helpful response for the user.

User's question: {original_query}

Agent results:
{results_summary}

Your task:
1. Provide a natural, conversational response that DIRECTLY answers the user's question: "{original_query}"
2. Present findings clearly and understandably
3. Use simple, professional language
4. Use markdown ONLY for:
   - Headings (## for sections)
   - Lists (- or * for bullet points)
   - Bold (**text**) for emphasis
   - Code blocks (```sql ... ```) ONLY for SQL queries
5. DO NOT wrap regular text in code blocks
6. Focus on actionable insights and what the data tells us
7. Be concise but complete - 2-3 paragraphs is usually enough
8. If there are errors, explain them in user-friendly terms

IMPORTANT: Your response should be a complete answer to the user's question, not just a summary of what agents did. Write as if you're explaining the findings directly to the user.

Return your response as a JSON object with this structure:
{{
    "narration": "Your complete answer to the user's question (2-3 paragraphs, natural language, use markdown only for formatting as specified above)",
    "key_points": ["Key finding 1", "Key finding 2", "Key finding 3"],
    "summary": "One-sentence summary"
}}

Return ONLY valid JSON, no markdown code blocks or extra text."""
            
            synthesis_response = await self.litellm_service.generate_completion(
                prompt=synthesis_prompt,
                system_context="You are a professional data analytics assistant. Provide clear, well-formatted responses that directly answer user questions about data analysis.",
                max_tokens=1500,
                temperature=0.7  # Use lower temperature for more consistent, professional responses
            )
            
            synthesized_content = synthesis_response.get("content", "").strip()
            
            # OPTIMIZATION: Parse structured JSON response if available
            structured_response = None
            if synthesized_content:
                try:
                    # Try to parse as JSON (may be wrapped in markdown code blocks)
                    cleaned_content = synthesized_content
                    if "```json" in cleaned_content:
                        json_match = re.search(r'```json\s*(.*?)\s*```', cleaned_content, re.DOTALL)
                        if json_match:
                            cleaned_content = json_match.group(1)
                    elif "```" in cleaned_content:
                        # Try to extract JSON from any code block
                        json_match = re.search(r'```[a-z]*\s*(.*?)\s*```', cleaned_content, re.DOTALL)
                        if json_match:
                            cleaned_content = json_match.group(1)
                    
                    # json is imported at top of file
                    structured_response = json.loads(cleaned_content)
                    if structured_response.get("narration"):
                        synthesized_content = structured_response.get("narration")
                        logger.info("✅ Parsed structured JSON response from LLM")
                except (json.JSONDecodeError, AttributeError) as e:
                    logger.debug(f"Response not in JSON format, using as-is: {e}")
                    # Continue with plain text response
            
            # If synthesis failed or returned empty, try to create a meaningful response from results
            if not synthesized_content or len(synthesized_content) < 50:
                logger.warning("Synthesis returned empty or too short content, creating response from results")
                # json is already imported at top of file
                # Try to extract meaningful information from agent results
                response_parts = []
                
                # Extract SQL query if available
                if primary_result.get("sql_query"):
                    response_parts.append(f"**SQL Query Generated:**\n```sql\n{primary_result.get('sql_query')}\n```")
                
                # Extract query results if available - check multiple locations
                data = None
                if primary_result.get("query_result"):
                    if isinstance(primary_result.get("query_result"), dict):
                        data = primary_result.get("query_result", {}).get("data")
                    elif isinstance(primary_result.get("query_result"), list):
                        data = primary_result.get("query_result")
                elif primary_result.get("data"):
                    data = primary_result.get("data")
                
                # Also check collaborating results
                if not data:
                    for result in collaborating_results:
                        if result.get("query_result"):
                            if isinstance(result.get("query_result"), dict):
                                data = result.get("query_result", {}).get("data")
                            elif isinstance(result.get("query_result"), list):
                                data = result.get("query_result")
                            if data:
                                break
                        elif result.get("data"):
                            data = result.get("data")
                            if data:
                                break
                
                if data and len(data) > 0:
                    # Format the data nicely
                    if isinstance(data, list) and len(data) > 0:
                        first_row = data[0]
                        if isinstance(first_row, dict):
                            # Create a summary of the data
                            row_count = len(data)
                            list(first_row.keys())[:5]  # Show first 5 columns
                            response_parts.append(f"**Query Results:**\nFound {row_count} row(s) with {len(first_row)} column(s).")
                            if row_count == 1:
                                # Show the single row
                                response_parts.append(f"```json\n{json.dumps(first_row, indent=2)}\n```")
                            else:
                                # Show sample row
                                response_parts.append(f"Sample row:\n```json\n{json.dumps(first_row, indent=2)}\n```")
                
                # Extract chart config if available - check primary_chart first (chart agent returns this)
                chart_config = None
                for result in [primary_result] + collaborating_results:
                    if result.get("primary_chart"):
                        chart_config = result.get("primary_chart")
                        response_parts.append("**Chart Generated:** A visualization has been created for your data.")
                        break
                    elif result.get("chart_config") or result.get("echarts_config"):
                        chart_config = result.get("chart_config") or result.get("echarts_config")
                        response_parts.append("**Chart Generated:** A visualization has been created for your data.")
                        break
                
                # Extract insights if available
                insights = []
                for result in [primary_result] + collaborating_results:
                    if result.get("insights"):
                        insights.extend(result.get("insights", []))
                
                if insights:
                    response_parts.append("**Key Insights:**")
                    for insight in insights[:3]:  # Show top 3 insights
                        if isinstance(insight, dict):
                            response_parts.append(f"- {insight.get('title', '')}: {insight.get('description', '')}")
                        else:
                            response_parts.append(f"- {insight}")
                
                # If we have meaningful parts, combine them
                if response_parts:
                    synthesized_content = "\n\n".join(response_parts)
                else:
                    # Last resort: use fallback
                    return self._create_fallback_response(primary_result, collaborating_results)
            
            # CRITICAL: Extract all components BEFORE building combined_result
            # This ensures chart, insights, SQL are included even if synthesis fails
            
            # Extract SQL query
            extracted_sql = None
            if primary_result.get("sql_query"):
                extracted_sql = primary_result.get("sql_query")
            else:
                for result in collaborating_results:
                    if result.get("sql_query"):
                        extracted_sql = result.get("sql_query")
                        break
            
            # Extract chart config - check all locations intelligently
            extracted_chart = None
            for result in [primary_result] + collaborating_results:
                # Check structured fields first
                if result.get("primary_chart"):
                    extracted_chart = result.get("primary_chart")
                    logger.info(f"✅ Found chart config in {result.get('agent_id', 'unknown')} (primary_chart)")
                    break
                elif result.get("echarts_config"):
                    extracted_chart = result.get("echarts_config")
                    logger.info(f"✅ Found chart config in {result.get('agent_id', 'unknown')} (echarts_config)")
                    break
                elif result.get("chart_config"):
                    extracted_chart = result.get("chart_config")
                    logger.info(f"✅ Found chart config in {result.get('agent_id', 'unknown')} (chart_config)")
                    break
                
                # CRITICAL: Also check text result field for "ECharts Configuration:" prefix
                # LangChain agents often return text with JSON embedded
                result_text = result.get("result", "")
                if isinstance(result_text, str) and ("ECharts Configuration:" in result_text or "echarts" in result_text.lower()):
                    logger.info(f"🔍 Found ECharts text in {result.get('agent_id', 'unknown')} result field, extracting JSON...")
                    try:
                        # Try to extract JSON from text (handles "ECharts Configuration: {...}" format)
                        # re is imported at top of file
                        json_match = None
                        if "ECharts Configuration:" in result_text:
                            # Look for JSON after "ECharts Configuration:"
                            json_match = re.search(r'ECharts Configuration:\s*(\{.*\})', result_text, re.DOTALL | re.IGNORECASE)
                        elif "{" in result_text:
                            # Fallback: look for any JSON object
                            json_match = re.search(r'(\{.*"series".*\})', result_text, re.DOTALL)
                        
                        if json_match:
                            json_str = json_match.group(1).strip()
                            try:
                                from app.modules.ai.utils.echarts_validation import fix_json_string, validate_echarts_config
                                json_str = fix_json_string(json_str)
                                chart_config = json.loads(json_str)
                                # CRITICAL: Validate the extracted chart config
                                is_valid, error_msg, validated_config = validate_echarts_config(chart_config, strict=False)
                                if is_valid and validated_config:
                                    extracted_chart = validated_config
                                    logger.info(f"✅ Extracted and validated chart config from text result in {result.get('agent_id', 'unknown')}")
                                    break
                                else:
                                    logger.warning(f"⚠️ Extracted chart config failed validation: {error_msg}")
                            except json.JSONDecodeError as e:
                                logger.warning(f"⚠️ JSON decode error: {e}")
                    except (json.JSONDecodeError, AttributeError) as e:
                        logger.debug(f"Could not extract chart config from text: {e}")
                        continue
            
            # Extract insights and recommendations
            extracted_insights = []
            extracted_recommendations = []
            extracted_narration = None
            
            for result in [primary_result] + collaborating_results:
                # Extract insights
                if result.get("insights"):
                    insights = result.get("insights")
                    if isinstance(insights, list):
                        extracted_insights.extend(insights)
                    else:
                        extracted_insights.append(insights)
                
                # CRITICAL: Also check text result field for insights/narration
                # LangChain agents often return text like "Summary analysis - Data: 6 yearly rows..."
                result_text = result.get("result", "")
                agent_id = result.get("agent_id", "")
                if isinstance(result_text, str) and len(result_text.strip()) > 50:
                    # If this is an insights agent and we don't have narration yet, use the text as narration
                    if not extracted_narration and ("insights" in agent_id.lower() or "summary" in result_text.lower() or "analysis" in result_text.lower()):
                        logger.info(f"🔍 Found insights/narration text in {agent_id} result field, extracting...")
                        # The text itself is the narration/executive summary
                        extracted_narration = result_text.strip()
                        logger.info(f"✅ Extracted narration from text result in {agent_id}: {len(result_text)} chars")
                
                # Extract recommendations
                if result.get("recommendations"):
                    recs = result.get("recommendations")
                    if isinstance(recs, list):
                        extracted_recommendations.extend(recs)
                    else:
                        extracted_recommendations.append(recs)
                
                # Extract narration - prioritize executive_summary from insights agent
                if not extracted_narration:
                    if agent_id == "insights" or "insights" in str(agent_id).lower():
                        # Try multiple fields for narration - check all possible locations
                        # CRITICAL: executive_summary might be a dict with text inside, or a string
                        exec_summary = result.get("executive_summary")
                        if exec_summary:
                            if isinstance(exec_summary, dict):
                                # Extract text from dict
                                extracted_narration = exec_summary.get("text") or exec_summary.get("summary") or exec_summary.get("content") or str(exec_summary)
                            elif isinstance(exec_summary, str):
                                extracted_narration = exec_summary
                            if extracted_narration:
                                logger.info(f"✅ Extracted narration from insights agent (executive_summary): {len(str(extracted_narration))} chars")
                        
                        # Also check nested result field
                        if not extracted_narration:
                            nested_result = result.get("result")
                            if isinstance(nested_result, dict):
                                nested_exec = nested_result.get("executive_summary")
                                if nested_exec:
                                    if isinstance(nested_exec, dict):
                                        extracted_narration = nested_exec.get("text") or nested_exec.get("summary") or str(nested_exec)
                                    elif isinstance(nested_exec, str):
                                        extracted_narration = nested_exec
                                    if extracted_narration:
                                        logger.info(f"✅ Extracted narration from nested result (executive_summary): {len(str(extracted_narration))} chars")
                            
                        # Fallback to other fields
                        if not extracted_narration:
                            if result.get("analysis"):
                                extracted_narration = result.get("analysis")
                                if extracted_narration:
                                    logger.info(f"✅ Extracted narration from insights agent (analysis): {len(str(extracted_narration))} chars")
                            elif result.get("summary"):
                                extracted_narration = result.get("summary")
                                if extracted_narration:
                                    logger.info(f"✅ Extracted narration from insights agent (summary): {len(str(extracted_narration))} chars")
                            elif result.get("narration"):
                                extracted_narration = result.get("narration")
                                if extracted_narration:
                                    logger.info(f"✅ Extracted narration from insights agent (narration): {len(str(extracted_narration))} chars")
                        
                        # CRITICAL: If still no narration, check if insights list contains narrative text
                        if not extracted_narration and result.get("insights"):
                            insights_list = result.get("insights", [])
                            if isinstance(insights_list, list) and len(insights_list) > 0:
                                # Combine first 2-3 insights into narration
                                narration_parts = []
                                for insight in insights_list[:3]:
                                    if isinstance(insight, dict):
                                        desc = insight.get("description", "") or insight.get("title", "")
                                        if desc:
                                            narration_parts.append(desc)
                                    elif isinstance(insight, str):
                                        narration_parts.append(insight)
                                if narration_parts:
                                    extracted_narration = " ".join(narration_parts)
                                    logger.info(f"✅ Extracted narration from insights list: {len(extracted_narration)} chars")
                        
                        # CRITICAL: If still no narration, use result text as fallback
                        if not extracted_narration and result.get("result"):
                            result_text = result.get("result", "")
                            if isinstance(result_text, str) and len(result_text.strip()) > 50:
                                extracted_narration = result_text.strip()
                                logger.info(f"✅ Extracted narration from result text (fallback): {len(extracted_narration)} chars")
                            else:
                                result_str = result.get("result")
                                if isinstance(result_str, str) and result_str.strip():
                                    extracted_narration = result_str
                                    logger.info(f"✅ Extracted narration from insights agent (result): {len(str(extracted_narration))} chars")
            
            # Use extracted narration if available, otherwise use synthesized content
            final_narration = extracted_narration or synthesized_content
            
            # Build comprehensive result with all extracted components
            combined_result = {
                "success": True,
                "result": final_narration,  # Use final narration
                "narration": final_narration,  # Explicit narration field
                "metadata": {
                    "primary_agent_result": primary_result,
                    "collaborating_results": collaborating_results,
                    "synthesis_used": True,
                    "structured_response": structured_response  # Include parsed JSON if available
                }
            }
            
            # Extract and include key_points and summary from structured response
            if structured_response:
                combined_result["key_points"] = structured_response.get("key_points", [])
                combined_result["summary"] = structured_response.get("summary", "")
            
            # Add all extracted components
            if extracted_sql:
                combined_result["sql_query"] = extracted_sql
            if extracted_chart:
                combined_result["echarts_config"] = extracted_chart
            # CRITICAL: Ensure narration is always set (even if extracted_narration is None, use synthesized_content)
            if extracted_narration:
                combined_result["narration"] = extracted_narration
                combined_result["executive_summary"] = extracted_narration  # Also set as executive_summary
                combined_result["analysis"] = extracted_narration  # Also set as analysis
                logger.info(f"✅ Added extracted narration to combined_result: {len(extracted_narration)} chars")
            elif synthesized_content:
                combined_result["narration"] = synthesized_content
                combined_result["analysis"] = synthesized_content
                logger.info(f"✅ Added synthesized narration to combined_result: {len(synthesized_content)} chars")
            if extracted_insights:
                combined_result["insights"] = extracted_insights
            if extracted_recommendations:
                combined_result["recommendations"] = extracted_recommendations
            
            # Query results
            if primary_result.get("query_result"):
                combined_result["query_result"] = primary_result.get("query_result")
            
            insights_len = len(extracted_insights) if extracted_insights and isinstance(extracted_insights, list) else 0
            recs_len = len(extracted_recommendations) if extracted_recommendations and isinstance(extracted_recommendations, list) else 0
            narration_len = len(str(final_narration)) if final_narration else 0
            logger.info(f"📊 Combined result: SQL={bool(combined_result.get('sql_query'))}, Chart={bool(combined_result.get('echarts_config'))}, Insights={insights_len}, Narration={narration_len}, Recommendations={recs_len}")
            
            # CRITICAL: Calculate quality metrics and confidence scores
            try:
                from app.modules.ai.services.quality_metrics import QualityMetricsService
                
                # Calculate quality metrics
                expected_fields = ["sql_query", "query_result", "echarts_config", "insights", "narration"]
                quality_metrics = QualityMetricsService.calculate_quality_metrics(
                    result=combined_result,
                    expected_fields=expected_fields
                )
                
                # Calculate confidence
                execution_time = combined_result.get("execution_metadata", {}).get("execution_time_ms", 0)
                if not execution_time:
                    execution_time = sum(
                        r.get("execution_time_ms", 0) 
                        for r in [primary_result] + collaborating_results
                    )
                
                confidence = QualityMetricsService.calculate_confidence_score(
                    agent_id="orchestrator",
                    result=combined_result,
                    execution_time_ms=execution_time,
                    historical_success_rate=0.85  # TODO: Get from feedback service
                )
                
                # Calculate trust score
                trust_score = QualityMetricsService.calculate_trust_score(
                    result=combined_result,
                    confidence=confidence,
                    quality_metrics=quality_metrics
                )
                
                # Add to result
                combined_result["quality_metrics"] = quality_metrics
                combined_result["confidence_score"] = confidence
                combined_result["trust_score"] = trust_score
                
                logger.info(f"📊 Quality: completeness={quality_metrics.get('completeness', 0):.2f}, overall={quality_metrics.get('overall_quality', 0):.2f}, confidence={confidence:.2f}, trust={trust_score:.2f}")
            except Exception as metrics_error:
                logger.debug(f"Quality metrics calculation not available: {metrics_error}")
            
            # CRITICAL: Record feedback for self-improvement
            try:
                feedback_service = getattr(self, 'feedback_service', None)
                if feedback_service:
                    # Record orchestrator result
                    fields_present = {
                        "sql_query": bool(combined_result.get("sql_query")),
                        "query_result": bool(combined_result.get("query_result")),
                        "echarts_config": bool(combined_result.get("echarts_config")),
                        "insights": bool(combined_result.get("insights")),
                        "narration": bool(combined_result.get("narration"))
                    }
                    execution_time = combined_result.get("execution_metadata", {}).get("execution_time_ms", 0)
                    if not execution_time:
                        execution_time = sum(r.get("execution_time_ms", 0) for r in [primary_result] + collaborating_results)
                    
                    feedback_service.record_agent_result(
                        agent_id="orchestrator",
                        success=combined_result.get("success", True),
                        execution_time_ms=execution_time,
                        confidence=combined_result.get("confidence_score"),
                        fields_present=fields_present
                    )
                    
                    # Record individual agent results
                    for result in [primary_result] + collaborating_results:
                        agent_id = result.get("agent_id", "unknown")
                        if agent_id != "unknown":
                            feedback_service.record_agent_result(
                                agent_id=agent_id,
                                success=result.get("success", False),
                                execution_time_ms=result.get("execution_time_ms", 0),
                                confidence=result.get("confidence"),
                                error=result.get("error")
                            )
            except Exception as feedback_error:
                logger.debug(f"Feedback recording not available: {feedback_error}")
            
            # CRITICAL: Print FINAL RESULT before returning
            logger.info("=" * 80)
            logger.info("📤 FINAL RESULT FROM _combine_results (LLM synthesis):")
            logger.info(f"  Success: {combined_result.get('success')}")
            logger.info(f"  SQL Query: {bool(combined_result.get('sql_query'))}")
            logger.info(f"  Query Result: {bool(combined_result.get('query_result'))}")
            logger.info(f"  Chart Config: {bool(combined_result.get('echarts_config'))}")
            logger.info(f"  Insights: {len(combined_result.get('insights', []))} items")
            logger.info(f"  Recommendations: {len(combined_result.get('recommendations', []))} items")
            logger.info(f"  Narration: {bool(combined_result.get('narration'))} ({len(combined_result.get('narration', '')) if combined_result.get('narration') else 0} chars)")
            logger.info(f"  All Keys: {list(combined_result.keys())}")
            logger.info("=" * 80)
            
            # CRITICAL: Standardize return value name
            final_result = combined_result
            return final_result
        except Exception as e:
            logger.warning(f"LLM synthesis failed: {e}, using fallback response")
            # Fallback: Provide meaningful response based on agent results
            fallback_result = self._create_fallback_response(primary_result, collaborating_results)
            
            # CRITICAL: Print FINAL RESULT before returning
            logger.info("=" * 80)
            logger.info("📤 FINAL RESULT FROM _combine_results (fallback):")
            logger.info(f"  Success: {fallback_result.get('success')}")
            logger.info(f"  SQL Query: {bool(fallback_result.get('sql_query'))}")
            logger.info(f"  Query Result: {bool(fallback_result.get('query_result'))}")
            logger.info(f"  Chart Config: {bool(fallback_result.get('echarts_config'))}")
            logger.info(f"  Insights: {len(fallback_result.get('insights', []))} items")
            logger.info(f"  Narration: {bool(fallback_result.get('narration'))}")
            logger.info(f"  All Keys: {list(fallback_result.keys())}")
            logger.info("=" * 80)
            
            final_result = fallback_result
            return final_result
    
    def _infer_query_result_schema(self, data: List[Dict]) -> Dict[str, Any]:
        """Infer schema from query results data (helper for unified agent)."""
        if not data or len(data) == 0:
            return {}
        
        schema = {}
        first_row = data[0]
        
        for column_name in first_row.keys():
            # Sample values to infer type
            sample_values = [row.get(column_name) for row in data[:20] if row.get(column_name) is not None]
            
            if not sample_values:
                schema[column_name] = {"type": "unknown", "nullable": True}
                continue
            
            # Infer type
            numeric_count = sum(1 for v in sample_values if isinstance(v, (int, float)) or (isinstance(v, str) and v.replace('.', '', 1).replace('-', '', 1).isdigit()))
            date_count = 0
            for v in sample_values:
                try:
                    from datetime import datetime
                    datetime.fromisoformat(str(v).replace('Z', '+00:00'))
                    date_count += 1
                except (ValueError, TypeError):
                    pass
            
            if numeric_count / len(sample_values) > 0.8:
                schema[column_name] = {"type": "numeric", "nullable": False}
            elif date_count / len(sample_values) > 0.8:
                schema[column_name] = {"type": "date", "nullable": False}
            else:
                schema[column_name] = {"type": "string", "nullable": False}
        
        return schema
    
    def _create_fallback_response(self, primary_result: Dict[str, Any], collaborating_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create a meaningful fallback response when LLM synthesis fails."""
        import json
        # Check if any agent provided meaningful results
        meaningful_text_results = []
        response_parts = []
        
        # Extract SQL query if available
        sql_query = primary_result.get("sql_query")
        if not sql_query:
            for result in collaborating_results:
                if result.get("sql_query"):
                    sql_query = result.get("sql_query")
                    break
        
        if sql_query:
            response_parts.append(f"**SQL Query:**\n```sql\n{sql_query}\n```")
        
        # Extract query results
        data = None
        if primary_result.get("query_result"):
            if isinstance(primary_result.get("query_result"), dict):
                data = primary_result.get("query_result", {}).get("data")
            elif isinstance(primary_result.get("query_result"), list):
                data = primary_result.get("query_result")
        elif primary_result.get("data"):
            data = primary_result.get("data")
        
        if not data:
        for result in collaborating_results:
                if result.get("query_result"):
                    if isinstance(result.get("query_result"), dict):
                        data = result.get("query_result", {}).get("data")
                    elif isinstance(result.get("query_result"), list):
                        data = result.get("query_result")
                    if data:
                        break
                elif result.get("data"):
                    data = result.get("data")
                    if data:
                        break
        
        if data and len(data) > 0:
            if isinstance(data, list) and len(data) > 0:
                first_row = data[0]
                if isinstance(first_row, dict):
                    response_parts.append(f"**Results:** Found {len(data)} row(s).")
                    if len(data) == 1:
                        response_parts.append(f"```json\n{json.dumps(first_row, indent=2)}\n```")
                    else:
                        response_parts.append(f"Sample:\n```json\n{json.dumps(first_row, indent=2)}\n```")
        
        # Extract chart config - check primary_chart first (chart agent returns this)
        chart_config = None
        for result in [primary_result] + collaborating_results:
            if result.get("primary_chart"):
                chart_config = result.get("primary_chart")
                response_parts.append("**Chart:** Visualization generated successfully.")
                break
            elif result.get("chart_config") or result.get("echarts_config"):
                chart_config = result.get("chart_config") or result.get("echarts_config")
                response_parts.append("**Chart:** Visualization generated successfully.")
                break
        
        # Extract insights
        insights = []
        for result in [primary_result] + collaborating_results:
            if result.get("insights"):
                insights.extend(result.get("insights", []))
        
        if insights:
            response_parts.append("**Insights:**")
            for insight in insights[:3]:
                if isinstance(insight, dict):
                    response_parts.append(f"- {insight.get('title', '')}: {insight.get('description', '')}")
                else:
                    response_parts.append(f"- {insight}")
        
        # Check for text results
        if primary_result.get("success") and primary_result.get("result") and str(primary_result.get("result", "")).strip() and primary_result.get("result") != "No result":
            meaningful_text_results.append(str(primary_result.get("result")))
        
        for result in collaborating_results:
            if result.get("success") and result.get("result") and str(result.get("result", "")).strip() and result.get("result") != "No result":
                meaningful_text_results.append(str(result.get("result")))
        
        if response_parts:
            # Use structured response parts
            combined_text = "\n\n".join(response_parts)
            fallback_result = {
                "success": True,
                "result": combined_text,
                "narration": combined_text,  # Include narration for frontend
                "metadata": {
                    "primary_agent_result": primary_result,
                    "collaborating_results": collaborating_results,
                    "fallback_used": True
                }
            }
            
            # CRITICAL: Extract and include all components (chart, insights, SQL, etc.)
            if sql_query:
                fallback_result["sql_query"] = sql_query
            if chart_config:
                fallback_result["echarts_config"] = chart_config
            if data:
                fallback_result["query_result"] = {"success": True, "data": data}
            if insights:
                fallback_result["insights"] = insights if isinstance(insights, list) else [insights]
            
            # Also extract from primary and collaborating results directly
            for result in [primary_result] + collaborating_results:
                if not fallback_result.get("sql_query") and result.get("sql_query"):
                    fallback_result["sql_query"] = result.get("sql_query")
                if not fallback_result.get("echarts_config"):
                    chart = result.get("primary_chart") or result.get("echarts_config") or result.get("chart_config")
                    if chart:
                        fallback_result["echarts_config"] = chart
                if not fallback_result.get("insights") and result.get("insights"):
                    fallback_result["insights"] = result.get("insights") if isinstance(result.get("insights"), list) else [result.get("insights")]
                if not fallback_result.get("query_result") and result.get("query_result"):
                    fallback_result["query_result"] = result.get("query_result")
            
            logger.info(f"📊 Fallback response: SQL={bool(fallback_result.get('sql_query'))}, Chart={bool(fallback_result.get('echarts_config'))}, Insights={len(fallback_result.get('insights', []))}, Narration={len(combined_text)}")
            return fallback_result
        elif meaningful_text_results:
            # Combine meaningful text results
            combined_text = "\n\n".join(meaningful_text_results)
            fallback_result = {
                "success": True,
                "result": combined_text,
                "narration": combined_text,  # Include narration for frontend
                "metadata": {
                    "primary_agent_result": primary_result,
                    "collaborating_results": collaborating_results,
                    "fallback_used": True
                }
            }
            
            # CRITICAL: Extract components even from text-only results
            for result in [primary_result] + collaborating_results:
                if not fallback_result.get("sql_query") and result.get("sql_query"):
                    fallback_result["sql_query"] = result.get("sql_query")
                if not fallback_result.get("echarts_config"):
                    chart = result.get("primary_chart") or result.get("echarts_config") or result.get("chart_config")
                    if chart:
                        fallback_result["echarts_config"] = chart
                if not fallback_result.get("insights") and result.get("insights"):
                    fallback_result["insights"] = result.get("insights") if isinstance(result.get("insights"), list) else [result.get("insights")]
                if not fallback_result.get("query_result") and result.get("query_result"):
                    fallback_result["query_result"] = result.get("query_result")
            
            return fallback_result
        else:
            # No meaningful results - provide helpful, user-friendly guidance
            error_messages = []
            if not primary_result.get("success"):
                error_msg = primary_result.get('error', 'Unknown error')
                result_msg = primary_result.get('result', '')
                if error_msg:
                    error_messages.append(f"Primary agent: {error_msg}")
                elif result_msg and result_msg != "No result":
                    error_messages.append(f"Primary agent: {result_msg}")
            
            for i, result in enumerate(collaborating_results):
                if not result.get("success"):
                    error_msg = result.get('error', 'Unknown error')
                    result_msg = result.get('result', '')
                    if error_msg:
                        error_messages.append(f"Agent {i+1}: {error_msg}")
                    elif result_msg and result_msg != "No result":
                        error_messages.append(f"Agent {i+1}: {result_msg}")
            
            error_summary = "\n- " + "\n- ".join(error_messages) if error_messages else "All agents returned no results."
            
            # Clean up error messages - remove API key details and format nicely
            clean_error_summary = error_summary
            if "API key" in error_summary or "401" in error_summary:
                clean_error_summary = "Authentication error: Please check your AI model API key configuration in the settings."
            elif "Data source not found" in error_summary or "Data source" in error_summary:
                clean_error_summary = "Data source connection issue: Please verify your data source is connected and accessible."
            else:
                # Remove excessive details and format cleanly
                clean_error_summary = error_summary.replace("\n- ", "\n").strip()
            
            return {
                "success": False,
                "result": f"I encountered an issue while processing your request.\n\n**What happened:**\n{clean_error_summary}\n\n**How to fix:**\n1. Check your data source connection - Ensure your ClickHouse data source is properly connected\n2. Verify your query - Make sure your question is clear and specific\n3. Try again - Sometimes a retry resolves temporary issues\n\n**If the problem persists:**\n- Check the data source connection status in the Data Sources panel\n- Verify you have the correct permissions\n- Try a simpler query first to test the connection\n\nI'm here to help analyze your data once the connection is established.",
                "error": clean_error_summary,
                "metadata": {
                    "primary_agent_result": primary_result,
                    "collaborating_results": collaborating_results,
                    "fallback_used": True
                }
            }
    
    def _generate_fallback_chart_from_sql(self, sql_query: str, user_query: str) -> Dict[str, Any]:
        """Generate a basic chart configuration from SQL query structure (AI-native fallback)."""
        try:
            # Analyze SQL to infer chart structure
            chart_type = "bar"  # Default
            title = "Data Visualization"
            
            # Infer chart type from SQL
            sql_upper = sql_query.upper()
            if "COUNT" in sql_upper or "SUM" in sql_upper or "AVG" in sql_upper:
                if "GROUP BY" in sql_upper:
                    chart_type = "bar"
                else:
                    chart_type = "bar"
            elif "ORDER BY" in sql_upper and "DATE" in sql_upper:
                chart_type = "line"
            
            # Generate basic chart config
            chart_config = {
                "title": {
                    "text": title,
                    "show": True
                },
                "tooltip": {
                    "trigger": "axis" if chart_type in ["line", "bar"] else "item"
                },
                "xAxis": {
                    "type": "category" if chart_type in ["line", "bar"] else "value",
                    "data": []
                },
                "yAxis": {
                    "type": "value"
                },
                "series": [{
                    "name": "Data",
                    "type": chart_type,
                    "data": []
                }]
            }
            
            return {
                "success": True,
                "primary_chart": chart_config,
                "echarts_config": chart_config,
                "agent_id": "chart_generation",
                "message": "Generated basic chart structure from SQL query. Chart will display once query executes successfully.",
                "metadata": {
                    "generated_from": "sql_query_fallback",
                    "has_data": False,
                    "chart_type": chart_type
                }
            }
        except Exception as e:
            logger.error(f"Error generating fallback chart from SQL: {e}")
            return {
                "success": False,
                "agent_id": "chart_generation",
                "error": str(e),
                "message": "Could not generate chart structure from SQL query."
            }
    
    async def _combine_parallel_results(self, results: List[Any]) -> Dict[str, Any]:
        """Combine results from parallel execution.
        
        Args:
            results: List of results from parallel execution, may include exceptions
        """
        # Filter out exceptions and only keep successful dict results
        successful_results: List[Dict[str, Any]] = []
        for r in results:
            if isinstance(r, Exception):
                logger.warning(f"Exception in parallel execution: {r}")
                continue
            if isinstance(r, dict) and r.get("success"):
                successful_results.append(r)
        
        if not successful_results:
            return {"success": False, "error": "All parallel executions failed"}
        
        # Combine successful results
        combined_text = "\n\n".join([r.get("result", "") for r in successful_results])
        
        return {
            "success": True,
            "result": combined_text,
            "metadata": {"parallel_results": successful_results}
        }
    
    async def _get_conversation_history(self, conversation_uuid: UUID, limit: int = 10) -> List[BaseMessage]:
        """Get conversation history for context, with truncation to manage memory."""
        if not conversation_uuid:
            return []
        
        if not self.async_session_factory:
            logger.warning("async_session_factory not available, returning empty history")
            return []
        
        try:
            async with self.async_session_factory() as session:
                stmt = (
                    select(ChatMessage)
                    .filter(ChatMessage.conversation_id == conversation_uuid, ChatMessage.is_active, not ChatMessage.is_deleted)
                    .order_by(ChatMessage.created_at.asc())
                    .limit(limit)
                )
                result = await session.execute(stmt)
                messages_db = result.scalars().all()
                
                history: List[BaseMessage] = []
                for msg_db in messages_db:
                    if msg_db.role == "user":
                        history.append(HumanMessage(content=msg_db.query))
                    elif msg_db.role == "assistant":
                        # Truncate AI messages to save memory for LLM context
                        content = msg_db.answer or msg_db.content or ""
                        if len(content) > 500: # Arbitrary limit for truncation
                            content = content[:497] + "..."
                        history.append(AIMessage(content=content))
                
                logger.info(f"Loaded {len(history)} messages for conversation {conversation_uuid}")
                return history
        except Exception as e:
            logger.error(f"Error loading conversation history for {conversation_uuid}: {e}", exc_info=True)
        return []
    
    async def _update_conversation_memory(
        self, 
        conversation_uuid: UUID, 
        query: str, 
        result: str, 
        memory_state: LangChainMemorySchema
    ):
        """Update conversation memory with new interaction."""
        if memory_state.conversation_summary:
            memory_state.conversation_summary.summary = (
                f"User asked: '{query}'. AI responded with: '{result[:100]}...'"
            )
        memory_state.updated_at = datetime.now(timezone.utc)
        if self.memory_service:
            await self.memory_service.save_memory_to_db(conversation_uuid, memory_state)
    
    def _create_error_metadata(self, reasoning_steps: List[ReasoningStepSchema], start_time: float, error_message: str) -> Dict[str, Any]:
        """Create error metadata."""
        return AIMetadataSchema(
            reasoning_steps=reasoning_steps,
            confidence_scores={"overall": 0.0},
            model_info=ModelInfoSchema(
                model_name="error_handler",
                provider="internal",
                temperature=0.0
            ),
            token_usage=TokenUsageSchema(),
            execution_time_ms=int((time.time() - start_time) * 1000),
            agent_type="error_handler",
            success=False,
            error_message=error_message,
            fallback_used=True
        ).dict()
