"""
Automatic Prompt Tuning Service

This service automatically improves prompts based on feedback and performance metrics.
Can be easily enabled/disabled via feature flag.
"""

import logging
from typing import Dict, List, Optional, Any
from app.modules.ai.services.self_improving_feedback import SelfImprovingFeedbackService

logger = logging.getLogger(__name__)


class PromptTuningService:
    """
    Service for automatic prompt tuning based on feedback.
    
    Features:
    - Analyze performance patterns
    - Suggest prompt improvements
    - Apply prompt variations
    - A/B test prompt effectiveness
    """
    
    def __init__(self, feedback_service: SelfImprovingFeedbackService, enabled: bool = False):
        """
        Initialize prompt tuning service.
        
        Args:
            feedback_service: Self-improving feedback service
            enabled: Whether prompt tuning is enabled (feature flag)
        """
        self.feedback_service = feedback_service
        self.enabled = enabled
        self.prompt_variations = {}  # Store prompt variations and their performance
        logger.info(f"📝 Prompt tuning service initialized: enabled={enabled}")
    
    def is_enabled(self) -> bool:
        """Check if prompt tuning is enabled."""
        return self.enabled
    
    def enable(self):
        """Enable prompt tuning."""
        self.enabled = True
        logger.info("✅ Prompt tuning enabled")
    
    def disable(self):
        """Disable prompt tuning."""
        self.enabled = False
        logger.info("⏸️ Prompt tuning disabled")
    
    def analyze_prompt_performance(self, agent_id: str) -> Dict[str, Any]:
        """
        Analyze prompt performance for an agent.
        
        Args:
            agent_id: Agent identifier
            
        Returns:
            Performance analysis with suggestions
        """
        if not self.enabled:
            return {"enabled": False, "message": "Prompt tuning is disabled"}
        
        try:
            performance = self.feedback_service.get_agent_performance(agent_id)
            error_patterns = self.feedback_service.get_error_patterns(limit=5)
            suggestions = self.feedback_service.suggest_improvements(agent_id)
            
            # Analyze which errors are most common
            common_errors = [p["error_type"] for p in error_patterns[:3]]
            
            return {
                "enabled": True,
                "agent_id": agent_id,
                "success_rate": performance.get("success_rate", 0),
                "common_errors": common_errors,
                "suggestions": suggestions,
                "field_completion_rates": performance.get("field_completion_rates", {}),
                "recommendations": self._generate_prompt_recommendations(agent_id, common_errors, suggestions)
            }
        except Exception as e:
            logger.error(f"Error analyzing prompt performance: {e}", exc_info=True)
            return {"enabled": True, "error": str(e)}
    
    def _generate_prompt_recommendations(
        self,
        agent_id: str,
        common_errors: List[str],
        suggestions: List[str]
    ) -> List[str]:
        """Generate prompt improvement recommendations."""
        recommendations = []
        
        # Error-based recommendations
        if "validation_error" in common_errors:
            recommendations.append("Add more explicit format instructions to prompt")
        if "json_decode_error" in common_errors:
            recommendations.append("Emphasize JSON format requirements in prompt")
        if "timeout" in common_errors:
            recommendations.append("Add instructions to generate simpler/quicker responses")
        if "not_found" in common_errors:
            recommendations.append("Improve schema context in prompt")
        
        # Suggestion-based recommendations
        for suggestion in suggestions:
            if "low success rate" in suggestion.lower():
                recommendations.append("Review and improve prompt clarity and examples")
            if "slow execution" in suggestion.lower():
                recommendations.append("Optimize prompt to reduce token usage")
            if "completion rate" in suggestion.lower():
                recommendations.append("Add explicit field requirements to prompt")
        
        return recommendations
    
    def get_optimized_prompt(
        self,
        agent_id: str,
        base_prompt: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Get optimized prompt based on performance analysis.
        
        Args:
            agent_id: Agent identifier
            base_prompt: Base prompt template
            context: Additional context
            
        Returns:
            Optimized prompt (or base prompt if tuning disabled)
        """
        if not self.enabled:
            return base_prompt
        
        try:
            analysis = self.analyze_prompt_performance(agent_id)
            
            # Apply optimizations based on analysis
            optimized_prompt = base_prompt
            
            # Add format instructions if validation errors are common
            if "validation_error" in analysis.get("common_errors", []):
                optimized_prompt += "\n\nIMPORTANT: You must return your response in the exact format specified. Follow the schema precisely."
            
            # Add JSON emphasis if JSON errors are common
            if "json_decode_error" in analysis.get("common_errors", []):
                optimized_prompt += "\n\nCRITICAL: Return valid JSON only. Do not include markdown code blocks unless explicitly requested."
            
            # Add speed instructions if timeouts are common
            if "timeout" in analysis.get("common_errors", []):
                optimized_prompt += "\n\nOPTIMIZATION: Generate concise, efficient responses. Focus on essential information only."
            
            # Add field requirements if completion rates are low
            field_rates = analysis.get("field_completion_rates", {})
            missing_fields = [field for field, rate in field_rates.items() if rate < 90]
            if missing_fields:
                optimized_prompt += f"\n\nREQUIRED FIELDS: You must include these fields in your response: {', '.join(missing_fields)}"
            
            if optimized_prompt != base_prompt:
                logger.info(f"📝 Optimized prompt for {agent_id} based on performance analysis")
            
            return optimized_prompt
        except Exception as e:
            logger.debug(f"Prompt optimization not available: {e}, using base prompt")
            return base_prompt

