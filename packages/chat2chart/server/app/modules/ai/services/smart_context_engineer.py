"""
Smart Context Engineering Service

This service provides intelligent context engineering to enhance AI responses with:
- User behavior pattern analysis
- Query intent understanding
- Business context awareness
- Domain-specific knowledge injection
- Conversation history summarization
- Personalized response adaptation
"""

import json
import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum
from sqlalchemy import text

logger = logging.getLogger(__name__)


class UserExpertiseLevel(Enum):
    """User expertise levels for context adaptation"""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class QueryIntent(Enum):
    """Query intent categories"""
    EXPLORATORY = "exploratory"  # "Show me data", "What do we have?"
    ANALYTICAL = "analytical"  # "Analyze trends", "Find patterns"
    DECISION_SUPPORT = "decision_support"  # "Should we...", "What should I do?"
    REPORTING = "reporting"  # "Generate report", "Summary of..."
    VISUALIZATION = "visualization"  # "Create chart", "Show graph"
    COMPARISON = "comparison"  # "Compare X and Y", "Difference between"
    FORECASTING = "forecasting"  # "Predict", "Forecast", "Trend"
    DIAGNOSTIC = "diagnostic"  # "Why did...", "What caused..."


@dataclass
class ContextProfile:
    """User context profile for personalized responses"""
    user_id: str
    expertise_level: UserExpertiseLevel = UserExpertiseLevel.INTERMEDIATE
    preferred_detail_level: str = "moderate"  # minimal, moderate, detailed
    preferred_chart_types: List[str] = field(default_factory=lambda: ["bar", "line"])
    business_domain: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    query_patterns: Dict[str, int] = field(default_factory=dict)
    successful_interactions: int = 0
    failed_interactions: int = 0


class SmartContextEngineer:
    """
    Intelligent context engineering service that adapts AI responses based on:
    - User expertise and preferences
    - Query intent and complexity
    - Business domain and context
    - Conversation history
    - Data source characteristics
    """
    
    def __init__(self, litellm_service: Any = None, async_session_factory: Any = None):
        self.litellm_service = litellm_service
        self.async_session_factory = async_session_factory
        self.user_profiles: Dict[str, ContextProfile] = {}
        self.domain_knowledge: Dict[str, Dict[str, Any]] = {}
        self._initialize_domain_knowledge()
    
    def _initialize_domain_knowledge(self):
        """Initialize domain-specific knowledge bases"""
        self.domain_knowledge = {
            "retail": {
                "key_metrics": ["revenue", "sales", "inventory", "customer_lifetime_value"],
                "common_queries": ["sales by region", "top products", "customer segments"],
                "chart_preferences": ["bar", "line", "pie"]
            },
            "finance": {
                "key_metrics": ["revenue", "expenses", "profit", "cash_flow"],
                "common_queries": ["revenue trends", "expense analysis", "profit margins"],
                "chart_preferences": ["line", "bar", "area"]
            },
            "healthcare": {
                "key_metrics": ["patient_count", "treatment_outcomes", "cost_per_patient"],
                "common_queries": ["patient outcomes", "treatment effectiveness", "cost analysis"],
                "chart_preferences": ["bar", "line", "scatter"]
            },
            "manufacturing": {
                "key_metrics": ["production_volume", "quality_metrics", "downtime"],
                "common_queries": ["production efficiency", "quality trends", "equipment performance"],
                "chart_preferences": ["line", "bar", "heatmap"]
            }
        }
    
    async def analyze_query_intent(self, query: str, conversation_history: Optional[List[Dict]] = None) -> QueryIntent:
        """Analyze query intent using LLM and pattern matching"""
        query_lower = query.lower()
        
        # Pattern-based intent detection
        if any(word in query_lower for word in ["show", "display", "what", "list", "give me"]):
            return QueryIntent.EXPLORATORY
        elif any(word in query_lower for word in ["analyze", "find patterns", "trend", "insight"]):
            return QueryIntent.ANALYTICAL
        elif any(word in query_lower for word in ["should", "recommend", "what should", "advice"]):
            return QueryIntent.DECISION_SUPPORT
        elif any(word in query_lower for word in ["report", "summary", "overview"]):
            return QueryIntent.REPORTING
        elif any(word in query_lower for word in ["chart", "graph", "visualize", "plot"]):
            return QueryIntent.VISUALIZATION
        elif any(word in query_lower for word in ["compare", "vs", "versus", "difference"]):
            return QueryIntent.COMPARISON
        elif any(word in query_lower for word in ["predict", "forecast", "trend", "future"]):
            return QueryIntent.FORECASTING
        elif any(word in query_lower for word in ["why", "what caused", "reason", "diagnose"]):
            return QueryIntent.DIAGNOSTIC
        
        # Use LLM for more nuanced intent detection
        if self.litellm_service:
            try:
                intent_prompt = f"""Analyze this query and determine its primary intent:

Query: "{query}"

Conversation context: {json.dumps(conversation_history[-3:] if conversation_history else [], indent=2)}

Return ONLY one of these intents:
- exploratory: User wants to see/explore data
- analytical: User wants analysis, patterns, insights
- decision_support: User needs help making a decision
- reporting: User wants a report or summary
- visualization: User wants a chart/graph
- comparison: User wants to compare things
- forecasting: User wants predictions/forecasts
- diagnostic: User wants to understand why something happened

Intent:"""
                
                result = await self.litellm_service.generate_completion(
                    prompt=intent_prompt,
                    system_context="You are an expert at understanding user intent in data analytics queries.",
                    max_tokens=50,
                    temperature=0.3
                )
                
                intent_str = result.get("content", "").strip().lower()
                for intent in QueryIntent:
                    if intent.value in intent_str:
                        return intent
            except Exception as e:
                logger.warning(f"LLM intent detection failed: {e}")
        
        # Default to analytical
        return QueryIntent.ANALYTICAL
    
    async def build_smart_context(
        self,
        query: str,
        user_id: str,
        organization_id: str,
        data_source_id: Optional[str] = None,
        conversation_history: Optional[List[Dict]] = None,
        business_domain: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Build intelligent context for AI operations.
        
        Returns comprehensive context including:
        - Query intent
        - User profile and preferences (from onboarding)
        - Organization info (from onboarding)
        - Business domain knowledge
        - Conversation summary
        - Data source characteristics
        - Response style preferences
        
        OPTIMIZED: Only fetches essential data, summarizes to save tokens
        """
        # Fetch user profile and onboarding data from database (token-efficient)
        user_profile = await self._fetch_user_profile_from_db(user_id, organization_id)
        
        # Analyze query intent
        query_intent = await self.analyze_query_intent(query, conversation_history)
        
        # Summarize conversation history
        conversation_summary = self._summarize_conversation(conversation_history or [])
        
        # Get domain knowledge
        domain_knowledge = self._get_domain_knowledge(business_domain or user_profile.business_domain)
        
        # Build response style preferences
        response_style = self._build_response_style(user_profile, query_intent)
        
        # Build comprehensive context (OPTIMIZED: concise, token-efficient)
        smart_context = {
            "query_intent": query_intent.value,
            "user_profile": {
                "expertise": user_profile.expertise_level.value,  # Shortened key
                "role": user_profile.role or "employee",
                "domain": user_profile.business_domain or "general"
            },
            "domain_knowledge": domain_knowledge,  # Already filtered by domain
            "conversation_summary": conversation_summary[:200] if len(conversation_summary) > 200 else conversation_summary,  # Truncate
            "response_style": {
                "tone": response_style.get("tone", "professional"),
                "detail": "minimal" if user_profile.expertise_level == UserExpertiseLevel.EXPERT else "moderate",
                "technical": user_profile.expertise_level in [UserExpertiseLevel.ADVANCED, UserExpertiseLevel.EXPERT]
            },
            "hints": self._generate_contextual_hints(query, query_intent, domain_knowledge)[:3]  # Max 3 hints
        }
        
        logger.info(f"🧠 Smart context built: intent={query_intent.value}, expertise={user_profile.expertise_level.value}, domain={business_domain}")
        
        return smart_context
    
    async def _fetch_user_profile_from_db(self, user_id: str, organization_id: str) -> ContextProfile:
        """Fetch user profile from database with onboarding data (token-efficient)"""
        # Check cache first
        if user_id in self.user_profiles:
            return self.user_profiles[user_id]
        
        # Default profile
        profile = ContextProfile(user_id=user_id)
        
        # Fetch from database if session factory available
        if self.async_session_factory:
            try:
                async with self.async_session_factory() as session:
                    # Fetch user with onboarding data (only essential fields)
                    result = await session.execute(
                        text("""
                            SELECT 
                                u.id, u.email, u.username, u.role,
                                u.onboarding_data,
                                o.name as org_name, o.plan_type,
                                o.settings as org_settings
                            FROM users u
                            LEFT JOIN organizations o ON o.id = u.organization_id
                            WHERE u.id = $1 AND u.is_active = TRUE AND u.is_deleted = FALSE
                            LIMIT 1
                        """),
                        (user_id,)
                    )
                    row = result.fetchone()
                    
                    if row:
                        # Parse onboarding data (token-efficient: only extract key fields)
                        onboarding_data = {}
                        if row[4]:  # onboarding_data column
                            try:
                                import json
                                onboarding_data = json.loads(row[4]) if isinstance(row[4], str) else row[4]
                            except Exception:
                                pass
                        
                        # Extract key info from onboarding data (comprehensive personalization)
                        personal = onboarding_data.get("personal", {})
                        goals = onboarding_data.get("goals", {})
                        
                        # Role from onboarding or user table
                        profile.role = personal.get("role") or row[3] or "employee"
                        profile.department = personal.get("company") or ""
                        
                        # Extract business domain from onboarding (industry)
                        industry = personal.get("industry") or ""
                        if industry:
                            profile.business_domain = industry.lower()
                        
                        # Extract experience level for AI adaptation
                        experience_level = goals.get("experienceLevel") or personal.get("dataExperience") or ""
                        if experience_level:
                            if experience_level in ["expert", "advanced"]:
                                profile.expertise_level = UserExpertiseLevel.ADVANCED
                            elif experience_level == "intermediate":
                                profile.expertise_level = UserExpertiseLevel.INTERMEDIATE
                            else:
                                profile.expertise_level = UserExpertiseLevel.BEGINNER
                        else:
                            # Fallback: Determine expertise from role
                            role_lower = profile.role.lower()
                            if any(term in role_lower for term in ["admin", "manager", "director", "executive"]):
                                profile.expertise_level = UserExpertiseLevel.ADVANCED
                            elif any(term in role_lower for term in ["analyst", "engineer", "developer"]):
                                profile.expertise_level = UserExpertiseLevel.INTERMEDIATE
                            else:
                                profile.expertise_level = UserExpertiseLevel.BEGINNER
                        
                        # Extract primary use case for query intent hints
                        primary_use_case = goals.get("primaryGoal") or personal.get("primaryUseCase") or ""
                        if primary_use_case:
                            # Store in profile for AI context
                            if not hasattr(profile, 'preferences'):
                                profile.preferences = {}
                            profile.preferences['primary_use_case'] = primary_use_case
                        
                        # Extract goals for feature recommendations
                        user_goals = goals.get("goals") or []
                        if user_goals:
                            if not hasattr(profile, 'preferences'):
                                profile.preferences = {}
                            profile.preferences['goals'] = user_goals
                        
                        # Extract data frequency for usage patterns
                        data_frequency = goals.get("dataFrequency") or ""
                        if data_frequency:
                            if not hasattr(profile, 'preferences'):
                                profile.preferences = {}
                            profile.preferences['data_frequency'] = data_frequency
                        
                        logger.info(f"✅ Loaded user profile from DB: role={profile.role}, domain={profile.business_domain}, expertise={profile.expertise_level.value}")
            except Exception as e:
                logger.warning(f"⚠️ Failed to fetch user profile from DB: {e}, using defaults")
        
        # Cache profile
        self.user_profiles[user_id] = profile
        return profile
    
    def _get_user_profile(self, user_id: str) -> ContextProfile:
        """Get cached user profile or create default"""
        if user_id not in self.user_profiles:
            self.user_profiles[user_id] = ContextProfile(user_id=user_id)
        return self.user_profiles[user_id]
    
    def _summarize_conversation(self, history: List[Dict]) -> str:
        """Summarize conversation history for context"""
        if not history or len(history) == 0:
            return "No previous conversation."
        
        # Take last 5 messages
        recent = history[-5:]
        summary_parts = []
        
        for msg in recent:
            role = msg.get("role", "unknown")
            content = msg.get("content", "")[:100]  # Truncate
            summary_parts.append(f"{role}: {content}...")
        
        return "\n".join(summary_parts)
    
    def _get_domain_knowledge(self, domain: Optional[str]) -> Dict[str, Any]:
        """Get domain-specific knowledge"""
        if domain and domain.lower() in self.domain_knowledge:
            return self.domain_knowledge[domain.lower()]
        return {}
    
    def _build_response_style(
        self,
        user_profile: ContextProfile,
        query_intent: QueryIntent
    ) -> Dict[str, Any]:
        """Build response style based on user profile and query intent"""
        style = {
            "tone": "professional",
            "detail_level": user_profile.preferred_detail_level,
            "include_sql": user_profile.expertise_level in [UserExpertiseLevel.ADVANCED, UserExpertiseLevel.EXPERT],
            "include_explanations": user_profile.expertise_level in [UserExpertiseLevel.BEGINNER, UserExpertiseLevel.INTERMEDIATE],
            "chart_emphasis": query_intent == QueryIntent.VISUALIZATION,
            "insight_emphasis": query_intent in [QueryIntent.ANALYTICAL, QueryIntent.DECISION_SUPPORT],
            "actionable_focus": query_intent == QueryIntent.DECISION_SUPPORT
        }
        
        # Adjust based on intent
        if query_intent == QueryIntent.EXPLORATORY:
            style["tone"] = "friendly"
            style["include_explanations"] = True
        elif query_intent == QueryIntent.DECISION_SUPPORT:
            style["tone"] = "consultative"
            style["actionable_focus"] = True
        
        return style
    
    def _generate_contextual_hints(
        self,
        query: str,
        query_intent: QueryIntent,
        domain_knowledge: Dict[str, Any]
    ) -> List[str]:
        """Generate contextual hints for better AI responses"""
        hints = []
        
        # Intent-based hints
        if query_intent == QueryIntent.DECISION_SUPPORT:
            hints.append("Focus on actionable recommendations and next steps")
        elif query_intent == QueryIntent.ANALYTICAL:
            hints.append("Provide deep insights and pattern analysis")
        elif query_intent == QueryIntent.VISUALIZATION:
            hints.append("Prioritize chart generation and visual clarity")
        
        # Domain-based hints
        if domain_knowledge:
            key_metrics = domain_knowledge.get("key_metrics", [])
            if key_metrics:
                hints.append(f"Consider domain-specific metrics: {', '.join(key_metrics[:3])}")
        
        return hints
    
    async def enhance_prompt_with_context(
        self,
        base_prompt: str,
        smart_context: Dict[str, Any]
    ) -> str:
        """Enhance prompt with smart context"""
        context_section = f"""
CONTEXT FOR RESPONSE GENERATION:

Query Intent: {smart_context['query_intent']}
User Expertise: {smart_context['user_profile']['expertise_level']}
Detail Level: {smart_context['user_profile']['preferred_detail_level']}
Response Style: {json.dumps(smart_context['response_style'], indent=2)}

Contextual Hints:
{chr(10).join(f"- {hint}" for hint in smart_context.get('contextual_hints', []))}

Conversation Summary:
{smart_context.get('conversation_summary', 'No previous conversation')}

IMPORTANT INSTRUCTIONS:
- Adapt your response style to match the user's expertise level
- Use {"technical terms" if smart_context['personalization']['use_technical_terms'] else "simple, clear language"}
- {"Include detailed explanations" if smart_context['personalization']['include_explanations'] else "Be concise and direct"}
- Focus on {smart_context['response_style'].get('actionable_focus', False) and 'actionable insights and recommendations' or 'clear data presentation'}
"""
        
        return f"{base_prompt}\n\n{context_section}"
    
    def update_user_profile(
        self,
        user_id: str,
        interaction_success: bool,
        query_type: Optional[str] = None
    ):
        """Update user profile based on interaction"""
        profile = self._get_user_profile(user_id)
        
        if interaction_success:
            profile.successful_interactions += 1
        else:
            profile.failed_interactions += 1
        
        if query_type:
            profile.query_patterns[query_type] = profile.query_patterns.get(query_type, 0) + 1
        
        # Adjust expertise level based on success rate
        total = profile.successful_interactions + profile.failed_interactions
        if total > 10:
            success_rate = profile.successful_interactions / total
            if success_rate > 0.8:
                # Increment expertise level (handle enum properly)
                current_level = profile.expertise_level
                if current_level == UserExpertiseLevel.BEGINNER:
                    profile.expertise_level = UserExpertiseLevel.INTERMEDIATE
                elif current_level == UserExpertiseLevel.INTERMEDIATE:
                    profile.expertise_level = UserExpertiseLevel.ADVANCED
                elif current_level == UserExpertiseLevel.ADVANCED:
                    profile.expertise_level = UserExpertiseLevel.EXPERT
                # EXPERT stays EXPERT
        
        self.user_profiles[user_id] = profile


# Global singleton
_smart_context_engineer: Optional[SmartContextEngineer] = None


def get_smart_context_engineer(litellm_service: Any = None, async_session_factory: Any = None) -> SmartContextEngineer:
    """Get or create global smart context engineer instance"""
    global _smart_context_engineer
    if _smart_context_engineer is None:
        _smart_context_engineer = SmartContextEngineer(
            litellm_service=litellm_service,
            async_session_factory=async_session_factory
        )
    return _smart_context_engineer

