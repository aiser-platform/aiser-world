"""
Context-Aware Agent Selection System
Inspired by intelligent code understanding and collaborative AI

This system provides intelligent agent selection based on:
- Code context analysis
- User behavior patterns
- Task complexity assessment
- Real-time performance metrics
"""

import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
from dataclasses import dataclass
from enum import Enum

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_core.language_models import BaseLanguageModel

logger = logging.getLogger(__name__)


class TaskComplexity(Enum):
    """Task complexity levels inspired by Cursor's task assessment."""
    SIMPLE = "simple"           # Single agent, <2s response
    MODERATE = "moderate"       # 1-2 agents, 2-5s response
    COMPLEX = "complex"         # 2+ agents, 5-15s response
    ENTERPRISE = "enterprise"   # Multi-agent collaboration, 15s+ response


class UserBehaviorPattern(Enum):
    """User behavior patterns for personalized agent selection."""
    EXPLORER = "explorer"       # Likes to discover new features
    ANALYST = "analyst"        # Focuses on data analysis
    VISUALIZER = "visualizer"  # Prefers charts and dashboards
    DEVELOPER = "developer"    # Wants SQL and technical details
    EXECUTIVE = "executive"    # Needs high-level insights


@dataclass
class ContextMetrics:
    """Context metrics for intelligent agent selection."""
    query_length: int
    technical_terms: int
    visualization_keywords: int
    analysis_keywords: int
    sql_keywords: int
    business_keywords: int
    user_expertise_level: float  # 0.0 to 1.0
    session_duration: int  # seconds
    previous_agent_preferences: Dict[str, float]
    success_rate_by_agent: Dict[str, float]


class IntelligentContextAnalyzer:
    """
    Analyzes user context and behavior patterns to optimize agent selection.
    Inspired by Cursor's codebase understanding and Replit's user behavior analysis.
    """
    
    def __init__(self, llm: BaseLanguageModel):
        self.llm = llm
        self.user_patterns: Dict[str, UserBehaviorPattern] = {}
        self.agent_performance_history: Dict[str, List[Dict[str, Any]]] = {}
        
        # Technical term patterns
        self.technical_terms = {
            'sql', 'query', 'database', 'table', 'join', 'select', 'where', 'group by',
            'aggregate', 'index', 'schema', 'migration', 'api', 'endpoint', 'json',
            'xml', 'csv', 'parquet', 'dataframe', 'pandas', 'numpy'
        }
        
        self.visualization_keywords = {
            'chart', 'graph', 'plot', 'visualize', 'dashboard', 'bar', 'line', 'pie',
            'scatter', 'heatmap', 'histogram', 'trend', 'comparison', 'distribution'
        }
        
        self.analysis_keywords = {
            'analyze', 'insight', 'trend', 'pattern', 'correlation', 'regression',
            'statistical', 'forecast', 'prediction', 'anomaly', 'outlier'
        }
        
        self.business_keywords = {
            'revenue', 'profit', 'sales', 'customer', 'market', 'growth', 'kpi',
            'roi', 'conversion', 'retention', 'churn', 'segmentation', 'funnel'
        }
    
    async def analyze_context(
        self, 
        query: str, 
        user_id: str, 
        session_data: Dict[str, Any],
        conversation_history: List[BaseMessage]
    ) -> ContextMetrics:
        """
        Analyze user context to determine optimal agent selection strategy.
        """
        # Basic query analysis
        query_lower = query.lower()
        technical_count = sum(1 for term in self.technical_terms if term in query_lower)
        viz_count = sum(1 for term in self.visualization_keywords if term in query_lower)
        analysis_count = sum(1 for term in self.analysis_keywords if term in query_lower)
        sql_count = sum(1 for term in ['sql', 'query', 'select', 'where'] if term in query_lower)
        business_count = sum(1 for term in self.business_keywords if term in query_lower)
        
        # User behavior pattern analysis
        await self._analyze_user_pattern(user_id, conversation_history)
        
        # Performance history analysis
        success_rates = self._calculate_agent_success_rates(user_id)
        
        # Session context
        session_duration = session_data.get('duration_seconds', 0)
        user_expertise = await self._assess_user_expertise(user_id, conversation_history)
        
        return ContextMetrics(
            query_length=len(query),
            technical_terms=technical_count,
            visualization_keywords=viz_count,
            analysis_keywords=analysis_count,
            sql_keywords=sql_count,
            business_keywords=business_count,
            user_expertise_level=user_expertise,
            session_duration=session_duration,
            previous_agent_preferences=self._get_user_preferences(user_id),
            success_rate_by_agent=success_rates
        )
    
    async def _analyze_user_pattern(self, user_id: str, history: List[BaseMessage]) -> UserBehaviorPattern:
        """Analyze user behavior pattern from conversation history."""
        if user_id not in self.user_patterns:
            # Analyze recent conversations to determine pattern
            pattern_analysis = await self._llm_analyze_pattern(history)
            self.user_patterns[user_id] = pattern_analysis
        return self.user_patterns[user_id]
    
    async def _llm_analyze_pattern(self, history: List[BaseMessage]) -> UserBehaviorPattern:
        """Use LLM to analyze user behavior pattern."""
        if not history:
            return UserBehaviorPattern.ANALYST  # Default
        
        # Create analysis prompt
        recent_queries = [msg.content for msg in history[-10:] if isinstance(msg, HumanMessage)]
        analysis_prompt = f"""
        Analyze the user's behavior pattern based on these recent queries:
        {json.dumps(recent_queries, indent=2)}
        
        Classify the user as one of these patterns:
        - EXPLORER: Likes to discover new features, asks "what can you do?"
        - ANALYST: Focuses on data analysis, asks for insights and trends
        - VISUALIZER: Prefers charts and dashboards, asks for visualizations
        - DEVELOPER: Wants SQL and technical details, asks for code/queries
        - EXECUTIVE: Needs high-level insights, asks for summaries and recommendations
        
        Respond with just the pattern name.
        """
        
        try:
            response = await self.llm.ainvoke([HumanMessage(content=analysis_prompt)])
            pattern_name = response.content.strip().upper()
            return UserBehaviorPattern(pattern_name)
        except Exception as e:
            logger.warning(f"Failed to analyze user pattern: {e}")
            return UserBehaviorPattern.ANALYST
    
    async def _assess_user_expertise(self, user_id: str, history: List[BaseMessage]) -> float:
        """Assess user's technical expertise level (0.0 to 1.0)."""
        if not history:
            return 0.5  # Default moderate expertise
        
        # Analyze technical terms usage
        technical_queries = 0
        total_queries = 0
        
        for msg in history[-20:]:  # Last 20 messages
            if isinstance(msg, HumanMessage):
                total_queries += 1
                query_lower = msg.content.lower()
                if any(term in query_lower for term in self.technical_terms):
                    technical_queries += 1
        
        if total_queries == 0:
            return 0.5
        
        technical_ratio = technical_queries / total_queries
        
        # Map to expertise level
        if technical_ratio > 0.7:
            return 0.9  # High expertise
        elif technical_ratio > 0.4:
            return 0.7  # Moderate-high expertise
        elif technical_ratio > 0.2:
            return 0.5  # Moderate expertise
        else:
            return 0.3  # Low expertise
    
    def _calculate_agent_success_rates(self, user_id: str) -> Dict[str, float]:
        """Calculate success rates for each agent based on historical performance."""
        if user_id not in self.agent_performance_history:
            return {"nl2sql": 0.8, "chart_generation": 0.8, "insights": 0.8}
        
        history = self.agent_performance_history[user_id]
        agent_stats = {}
        
        for agent_id in ["nl2sql", "chart_generation", "insights"]:
            agent_history = [h for h in history if h.get("agent_id") == agent_id]
            if agent_history:
                success_count = sum(1 for h in agent_history if h.get("success", False))
                agent_stats[agent_id] = success_count / len(agent_history)
            else:
                agent_stats[agent_id] = 0.8  # Default success rate
        
        return agent_stats
    
    def _get_user_preferences(self, user_id: str) -> Dict[str, float]:
        """Get user's historical agent preferences."""
        # This would be loaded from user preferences in a real implementation
        return {"nl2sql": 0.3, "chart_generation": 0.4, "insights": 0.3}
    
    def record_agent_performance(
        self, 
        user_id: str, 
        agent_id: str, 
        success: bool, 
        execution_time: float,
        user_satisfaction: Optional[float] = None
    ):
        """Record agent performance for learning and optimization."""
        if user_id not in self.agent_performance_history:
            self.agent_performance_history[user_id] = []
        
        self.agent_performance_history[user_id].append({
            "agent_id": agent_id,
            "success": success,
            "execution_time": execution_time,
            "user_satisfaction": user_satisfaction,
            "timestamp": datetime.now(timezone.utc)
        })
        
        # Keep only last 100 records per user
        if len(self.agent_performance_history[user_id]) > 100:
            self.agent_performance_history[user_id] = self.agent_performance_history[user_id][-100:]


class SmartAgentRouter:
    """
    Intelligent agent router that learns from user behavior and optimizes selection.
    Combines best practices from Cursor, Replit, and GitHub Copilot.
    """
    
    def __init__(self, llm: BaseLanguageModel):
        self.llm = llm
        self.context_analyzer = IntelligentContextAnalyzer(llm)
        self.routing_cache: Dict[str, Dict[str, Any]] = {}
        self.performance_optimizer = PerformanceOptimizer()
        
        # Agent capabilities matrix
        self.agent_capabilities = {
            "nl2sql": {
                "strengths": ["sql_generation", "data_querying", "technical_analysis"],
                "best_for": ["sql", "query", "database", "technical"],
                "complexity_range": [TaskComplexity.SIMPLE, TaskComplexity.MODERATE],
                "user_patterns": [UserBehaviorPattern.DEVELOPER, UserBehaviorPattern.ANALYST]
            },
            "chart_generation": {
                "strengths": ["visualization", "dashboard_creation", "data_presentation"],
                "best_for": ["chart", "graph", "visualize", "dashboard"],
                "complexity_range": [TaskComplexity.SIMPLE, TaskComplexity.MODERATE, TaskComplexity.COMPLEX],
                "user_patterns": [UserBehaviorPattern.VISUALIZER, UserBehaviorPattern.EXECUTIVE]
            },
            "insights": {
                "strengths": ["business_analysis", "trend_identification", "recommendations"],
                "best_for": ["insight", "analysis", "trend", "recommendation"],
                "complexity_range": [TaskComplexity.MODERATE, TaskComplexity.COMPLEX, TaskComplexity.ENTERPRISE],
                "user_patterns": [UserBehaviorPattern.ANALYST, UserBehaviorPattern.EXECUTIVE]
            },
            "collaboration": {
                "strengths": ["multi_agent_coordination", "complex_task_decomposition"],
                "best_for": ["comprehensive", "complete", "full_analysis", "dashboard"],
                "complexity_range": [TaskComplexity.COMPLEX, TaskComplexity.ENTERPRISE],
                "user_patterns": [UserBehaviorPattern.EXPLORER, UserBehaviorPattern.EXECUTIVE]
            }
        }
    
    async def route_query_intelligently(
        self,
        query: str,
        user_id: str,
        context: Dict[str, Any],
        conversation_history: List[BaseMessage]
    ) -> Dict[str, Any]:
        """
        Intelligently route query using context analysis and performance optimization.
        """
        # Check cache first (like Cursor's intelligent caching)
        cache_key = self._generate_cache_key(query, user_id)
        if cache_key in self.routing_cache:
            cached_decision = self.routing_cache[cache_key]
            if self._is_cache_valid(cached_decision):
                logger.info(f"Using cached routing decision for user {user_id}")
                return cached_decision["decision"]
        
        # Analyze context
        context_metrics = await self.context_analyzer.analyze_context(
            query, user_id, context, conversation_history
        )
        
        # Determine task complexity
        complexity = self._assess_task_complexity(query, context_metrics)
        
        # Get user behavior pattern
        user_pattern = context_metrics.previous_agent_preferences
        
        # Generate intelligent routing decision
        routing_decision = await self._generate_routing_decision(
            query, context_metrics, complexity, user_pattern
        )
        
        # Cache the decision
        self.routing_cache[cache_key] = {
            "decision": routing_decision,
            "timestamp": datetime.now(timezone.utc),
            "ttl": 300  # 5 minutes TTL
        }
        
        # Optimize based on performance history
        optimized_decision = self.performance_optimizer.optimize_decision(
            routing_decision, context_metrics
        )
        
        return optimized_decision
    
    def _assess_task_complexity(self, query: str, metrics: ContextMetrics) -> TaskComplexity:
        """Assess task complexity based on query characteristics using intelligent analysis."""
        # Use LLM for more accurate complexity assessment, with heuristics as fallback
        complexity_indicators = {
            "simple": metrics.query_length < 50 and metrics.technical_terms < 2 and metrics.sql_keywords < 1,
            "moderate": metrics.query_length < 200 and metrics.technical_terms < 5 and metrics.sql_keywords < 3,
            "complex": metrics.query_length < 500 and metrics.technical_terms < 10 and metrics.sql_keywords < 5,
            "enterprise": True  # Default for complex enterprise scenarios
        }
        
        # Check for enterprise complexity indicators
        enterprise_keywords = ['dashboard', 'comprehensive', 'complete', 'full analysis', 'multi-table', 
                              'join', 'aggregate', 'trend', 'forecast', 'correlation', 'anomaly']
        query_lower = query.lower()
        has_enterprise_keywords = any(kw in query_lower for kw in enterprise_keywords)
        
        if has_enterprise_keywords or metrics.query_length > 500:
            return TaskComplexity.ENTERPRISE
        elif complexity_indicators["simple"]:
            return TaskComplexity.SIMPLE
        elif complexity_indicators["moderate"]:
            return TaskComplexity.MODERATE
        else:
            return TaskComplexity.COMPLEX
    
    async def _generate_routing_decision(
        self,
        query: str,
        metrics: ContextMetrics,
        complexity: TaskComplexity,
        user_preferences: Dict[str, float]
    ) -> Dict[str, Any]:
        """Generate routing decision using LLM and heuristics."""
        
        # Build intelligent routing prompt
        routing_prompt = self._build_smart_routing_prompt(
            query, metrics, complexity, user_preferences
        )
        
        try:
            # Get LLM routing decision
            response = await self.llm.ainvoke([
                SystemMessage(content=routing_prompt),
                HumanMessage(content=f"Route this query intelligently: {query}")
            ])
            
            # Parse LLM response
            decision = self._parse_llm_routing_response(response.content)
            
            # Apply heuristics and user preferences
            optimized_decision = self._apply_heuristics_and_preferences(
                decision, metrics, user_preferences
            )
            
            return optimized_decision
            
        except Exception as e:
            logger.warning(f"LLM routing failed, using heuristic fallback: {e}")
            # Fallback to heuristic routing when LLM fails
            return self._generate_heuristic_routing_decision(query, metrics, complexity, user_preferences)
    
    def _generate_heuristic_routing_decision(
        self,
        query: str,
        metrics: ContextMetrics,
        complexity: TaskComplexity,
        user_preferences: Dict[str, float]
    ) -> Dict[str, Any]:
        """Generate routing decision using simple heuristics when LLM fails."""
        query_lower = query.lower()
        
        # Simple keyword-based routing
        if any(word in query_lower for word in ['sql', 'query', 'select', 'from', 'where', 'join', 'table']):
            primary_agent = "nl2sql"
            collaborating_agents = ["insights"]
        elif any(word in query_lower for word in ['chart', 'graph', 'visualization', 'plot', 'bar', 'line', 'pie']):
            primary_agent = "chart_generation"
            collaborating_agents = ["insights"]
        elif any(word in query_lower for word in ['analyze', 'analysis', 'insight', 'trend', 'pattern', 'summary']):
            primary_agent = "insights"
            collaborating_agents = ["nl2sql", "chart_generation"]
        else:
            # Default to insights for general queries
            primary_agent = "insights"
            collaborating_agents = []
        
        # Determine execution strategy based on complexity
        if complexity == TaskComplexity.SIMPLE:
            execution_strategy = "sequential"
        elif complexity == TaskComplexity.MODERATE:
            execution_strategy = "collaborative"
        else:
            execution_strategy = "parallel"
        
        return {
            "primary_agent": primary_agent,
            "collaborating_agents": collaborating_agents,
            "execution_strategy": execution_strategy,
            "confidence": 0.7,  # Lower confidence for heuristic routing
            "reasoning": f"Heuristic routing based on keywords: {query_lower[:50]}...",
            "routing_method": "heuristic_fallback"
        }

    def _build_smart_routing_prompt(
        self,
        query: str,
        metrics: ContextMetrics,
        complexity: TaskComplexity,
        user_preferences: Dict[str, float]
    ) -> str:
        """Build intelligent routing prompt with context awareness."""
        
        prompt_parts = [
            "You are an intelligent agent router for a data analytics platform.",
            "Your task is to select the optimal agent(s) based on comprehensive context analysis.",
            "",
            "Query Analysis:",
            f"- Length: {metrics.query_length} characters",
            f"- Technical terms: {metrics.technical_terms}",
            f"- Visualization keywords: {metrics.visualization_keywords}",
            f"- Analysis keywords: {metrics.analysis_keywords}",
            f"- SQL keywords: {metrics.sql_keywords}",
            f"- Business keywords: {metrics.business_keywords}",
            "",
            "User Context:",
            f"- Expertise level: {metrics.user_expertise_level:.2f}",
            f"- Session duration: {metrics.session_duration} seconds",
            f"- Agent preferences: {user_preferences}",
            f"- Success rates: {metrics.success_rate_by_agent}",
            "",
            "Task Complexity:",
            f"- Level: {complexity.value}",
            "",
            "Available Agents:",
        ]
        
        for agent_id, capabilities in self.agent_capabilities.items():
            prompt_parts.append(f"- {agent_id}: {capabilities['strengths']}")
            prompt_parts.append(f"  Best for: {capabilities['best_for']}")
            prompt_parts.append(f"  Complexity: {[c.value for c in capabilities['complexity_range']]}")
            prompt_parts.append(f"  User patterns: {[p.value for p in capabilities['user_patterns']]}")
            prompt_parts.append("")
        
        prompt_parts.extend([
            "Routing Rules:",
            "1. Consider user expertise level - beginners need simpler agents",
            "2. Respect user preferences and success rates",
            "3. Match complexity to appropriate agents",
            "4. Use collaboration for complex tasks",
            "5. Optimize for user satisfaction and performance",
            "",
            "Response Format (JSON):",
            "{",
            '  "primary_agent": "agent_id",',
            '  "collaborating_agents": ["agent_id1", "agent_id2"],',
            '  "execution_strategy": "sequential|parallel|collaborative",',
            '  "reasoning": "detailed explanation",',
            '  "confidence": 0.0-1.0,',
            '  "estimated_time_seconds": 5-30,',
            '  "user_satisfaction_prediction": 0.0-1.0',
            "}"
        ])
        
        return "\n".join(prompt_parts)
    
    def _parse_llm_routing_response(self, response: str) -> Dict[str, Any]:
        """Parse LLM routing response with error handling."""
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
                # Try to find JSON in the entire response using regex
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
            
            # Parse JSON with better error handling
            try:
                decision = json.loads(json_str)
            except json.JSONDecodeError as json_error:
                logger.warning(f"JSON decode error at position {json_error.pos}: {json_error.msg}")
                logger.debug(f"Problematic JSON string: {json_str[max(0, json_error.pos-50):json_error.pos+50]}")
                raise
            
            # Validate and set defaults
            return {
                "primary_agent": decision.get("primary_agent", "insights"),
                "collaborating_agents": decision.get("collaborating_agents", []),
                "execution_strategy": decision.get("execution_strategy", "sequential"),
                "reasoning": decision.get("reasoning", "LLM routing decision"),
                "confidence": max(0.0, min(1.0, decision.get("confidence", 0.7))),
                "estimated_time_seconds": max(5, min(30, decision.get("estimated_time_seconds", 10))),
                "user_satisfaction_prediction": max(0.0, min(1.0, decision.get("user_satisfaction_prediction", 0.8)))
            }
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.warning(f"Failed to parse LLM routing response: {e}")
            logger.debug(f"Response was: {response[:200]}...")
        
        # Fallback to default
        return {
            "primary_agent": "insights",
            "collaborating_agents": [],
            "execution_strategy": "sequential",
            "reasoning": "Fallback routing due to parsing error",
            "confidence": 0.5,
            "estimated_time_seconds": 10,
            "user_satisfaction_prediction": 0.7
        }
    
    def _apply_heuristics_and_preferences(
        self,
        decision: Dict[str, Any],
        metrics: ContextMetrics,
        user_preferences: Dict[str, float]
    ) -> Dict[str, Any]:
        """Apply heuristics and user preferences to optimize routing decision."""
        
        # Adjust based on user expertise
        if metrics.user_expertise_level < 0.4:  # Beginner
            # Prefer simpler agents
            if decision["primary_agent"] == "collaboration":
                decision["primary_agent"] = "insights"
                decision["collaborating_agents"] = []
                decision["execution_strategy"] = "sequential"
                decision["reasoning"] += " (Simplified for beginner user)"
        
        # Adjust based on user preferences
        primary_agent = decision["primary_agent"]
        if primary_agent in user_preferences:
            preference_score = user_preferences[primary_agent]
            if preference_score < 0.3:  # User doesn't prefer this agent
                # Find better alternative
                best_agent = max(user_preferences.items(), key=lambda x: x[1])[0]
                if best_agent != primary_agent:
                    decision["primary_agent"] = best_agent
                    decision["reasoning"] += f" (Adjusted based on user preference for {best_agent})"
        
        # Adjust based on success rates
        success_rates = metrics.success_rate_by_agent
        if primary_agent in success_rates and success_rates[primary_agent] < 0.6:
            # Agent has low success rate, try alternative
            best_success_agent = max(success_rates.items(), key=lambda x: x[1])[0]
            if best_success_agent != primary_agent:
                decision["primary_agent"] = best_success_agent
                decision["reasoning"] += f" (Adjusted based on success rate for {best_success_agent})"
        
        return decision
    
    def _heuristic_routing_fallback(
        self,
        query: str,
        metrics: ContextMetrics,
        complexity: TaskComplexity
    ) -> Dict[str, Any]:
        """Heuristic routing fallback when LLM fails."""
        
        query_lower = query.lower()
        
        # Simple keyword-based routing with context awareness
        if any(term in query_lower for term in ["sql", "query", "select", "database"]):
            primary_agent = "nl2sql"
        elif any(term in query_lower for term in ["chart", "graph", "visualize", "dashboard"]):
            primary_agent = "chart_generation"
        elif any(term in query_lower for term in ["insight", "analysis", "trend", "recommendation"]):
            primary_agent = "insights"
        else:
            primary_agent = "insights"  # Default
        
        # Determine collaboration based on complexity
        collaborating_agents = []
        execution_strategy = "sequential"
        
        if complexity in [TaskComplexity.COMPLEX, TaskComplexity.ENTERPRISE]:
            if primary_agent == "chart_generation":
                collaborating_agents = ["insights"]
                execution_strategy = "collaborative"
            elif primary_agent == "insights":
                collaborating_agents = ["chart_generation"]
                execution_strategy = "collaborative"
        
        return {
            "primary_agent": primary_agent,
            "collaborating_agents": collaborating_agents,
            "execution_strategy": execution_strategy,
            "reasoning": f"Heuristic routing based on keywords and complexity {complexity.value}",
            "confidence": 0.6,
            "estimated_time_seconds": 10,
            "user_satisfaction_prediction": 0.7
        }
    
    def _generate_cache_key(self, query: str, user_id: str) -> str:
        """Generate cache key for routing decisions."""
        import hashlib
        # Create a hash of query + user_id for caching
        content = f"{query.lower()}:{user_id}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def _is_cache_valid(self, cached_item: Dict[str, Any]) -> bool:
        """Check if cached routing decision is still valid."""
        ttl = cached_item.get("ttl", 300)
        timestamp = cached_item.get("timestamp")
        if not timestamp:
            return False
        
        age = (datetime.now(timezone.utc) - timestamp).total_seconds()
        return age < ttl


class PerformanceOptimizer:
    """
    Performance optimizer inspired by GitHub Copilot's efficiency patterns.
    Optimizes agent selection based on historical performance data.
    """
    
    def __init__(self):
        self.performance_history: Dict[str, List[Dict[str, Any]]] = {}
        self.optimization_rules = self._initialize_optimization_rules()
    
    def _initialize_optimization_rules(self) -> Dict[str, Any]:
        """Initialize performance optimization rules."""
        return {
            "max_execution_time": 15.0,  # seconds
            "min_success_rate": 0.7,
            "preferred_agents_by_complexity": {
                "simple": ["insights", "chart_generation"],
                "moderate": ["chart_generation", "insights", "nl2sql"],
                "complex": ["collaboration", "insights", "chart_generation"],
                "enterprise": ["collaboration"]
            }
        }
    
    def optimize_decision(
        self,
        decision: Dict[str, Any],
        metrics: ContextMetrics
    ) -> Dict[str, Any]:
        """Optimize routing decision based on performance data."""
        
        # Apply performance-based optimizations
        optimized_decision = decision.copy()
        
        # Check if primary agent meets performance criteria
        primary_agent = decision["primary_agent"]
        if primary_agent in metrics.success_rate_by_agent:
            success_rate = metrics.success_rate_by_agent[primary_agent]
            if success_rate < self.optimization_rules["min_success_rate"]:
                # Find better performing agent
                best_agent = max(metrics.success_rate_by_agent.items(), key=lambda x: x[1])[0]
                if best_agent != primary_agent:
                    optimized_decision["primary_agent"] = best_agent
                    optimized_decision["reasoning"] += f" (Optimized: switched to {best_agent} for better performance)"
        
        # Optimize execution strategy based on complexity
        complexity = self._assess_complexity_from_metrics(metrics)
        preferred_agents = self.optimization_rules["preferred_agents_by_complexity"].get(complexity, [])
        
        if preferred_agents and primary_agent not in preferred_agents:
            # Suggest preferred agent for this complexity level
            suggested_agent = preferred_agents[0]
            optimized_decision["reasoning"] += f" (Suggestion: {suggested_agent} typically performs better for {complexity} tasks)"
        
        return optimized_decision
    
    def _assess_complexity_from_metrics(self, metrics: ContextMetrics) -> str:
        """Assess complexity from context metrics."""
        if metrics.query_length < 50 and metrics.technical_terms < 2:
            return "simple"
        elif metrics.query_length < 200 and metrics.technical_terms < 5:
            return "moderate"
        elif metrics.query_length < 500 and metrics.technical_terms < 10:
            return "complex"
        else:
            return "enterprise"
    
    def record_performance(
        self,
        user_id: str,
        agent_id: str,
        execution_time: float,
        success: bool,
        user_satisfaction: Optional[float] = None
    ):
        """Record performance data for optimization."""
        if user_id not in self.performance_history:
            self.performance_history[user_id] = []
        
        self.performance_history[user_id].append({
            "agent_id": agent_id,
            "execution_time": execution_time,
            "success": success,
            "user_satisfaction": user_satisfaction,
            "timestamp": datetime.now(timezone.utc)
        })
        
        # Keep only recent history
        if len(self.performance_history[user_id]) > 50:
            self.performance_history[user_id] = self.performance_history[user_id][-50:]
