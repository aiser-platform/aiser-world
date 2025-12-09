"""
Self-Improving Feedback System for AI Agents

This service implements a feedback loop that:
- Tracks agent performance metrics
- Learns from successes and failures
- Adjusts prompts and strategies based on feedback
- Improves accuracy and efficiency over time
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from collections import defaultdict
from app.modules.ai.services.litellm_service import LiteLLMService

logger = logging.getLogger(__name__)


class SelfImprovingFeedbackService:
    """
    Service for tracking and learning from agent performance.
    
    Features:
    - Performance metrics tracking
    - Success/failure pattern analysis
    - Adaptive prompt tuning
    - Confidence score calibration
    - Error pattern recognition
    """
    
    def __init__(self, litellm_service: LiteLLMService):
        self.litellm_service = litellm_service
        # In-memory metrics (in production, use database)
        self.metrics = {
            "agent_success_rates": defaultdict(lambda: {"success": 0, "total": 0}),
            "error_patterns": defaultdict(int),
            "confidence_scores": defaultdict(list),
            "execution_times": defaultdict(list),
            "field_completion_rates": defaultdict(lambda: defaultdict(int)),
            "user_feedback": []
        }
    
    def record_agent_result(
        self,
        agent_id: str,
        success: bool,
        execution_time_ms: int,
        confidence: Optional[float] = None,
        error: Optional[str] = None,
        fields_present: Optional[Dict[str, bool]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Record agent execution result for learning.
        
        Args:
            agent_id: Agent identifier
            success: Whether execution succeeded
            execution_time_ms: Execution time
            confidence: Confidence score if available
            error: Error message if failed
            fields_present: Field presence tracking
            metadata: Additional metadata
        """
        # Update success rate
        self.metrics["agent_success_rates"][agent_id]["total"] += 1
        if success:
            self.metrics["agent_success_rates"][agent_id]["success"] += 1
        
        # Track execution time
        self.metrics["execution_times"][agent_id].append(execution_time_ms)
        # Keep only last 1000 entries
        if len(self.metrics["execution_times"][agent_id]) > 1000:
            self.metrics["execution_times"][agent_id] = self.metrics["execution_times"][agent_id][-1000:]
        
        # Track confidence scores
        if confidence is not None:
            self.metrics["confidence_scores"][agent_id].append(confidence)
            if len(self.metrics["confidence_scores"][agent_id]) > 1000:
                self.metrics["confidence_scores"][agent_id] = self.metrics["confidence_scores"][agent_id][-1000:]
        
        # Track error patterns
        if error:
            error_key = self._categorize_error(error)
            self.metrics["error_patterns"][error_key] += 1
        
        # Track field completion
        if fields_present:
            for field, present in fields_present.items():
                if present:
                    self.metrics["field_completion_rates"][agent_id][field] += 1
        
        logger.debug(f"📊 Recorded result for {agent_id}: success={success}, time={execution_time_ms}ms")
    
    def get_agent_performance(self, agent_id: str) -> Dict[str, Any]:
        """Get performance metrics for an agent."""
        success_rate = self.metrics["agent_success_rates"][agent_id]
        total = success_rate["total"]
        
        if total == 0:
            return {"success_rate": 0.0, "total_executions": 0}
        
        success_count = success_rate["success"]
        success_rate_pct = (success_count / total) * 100
        
        # Calculate average execution time
        execution_times = self.metrics["execution_times"][agent_id]
        avg_time = sum(execution_times) / len(execution_times) if execution_times else 0
        
        # Calculate average confidence
        confidences = self.metrics["confidence_scores"][agent_id]
        avg_confidence = sum(confidences) / len(confidences) if confidences else None
        
        # Field completion rates
        field_rates = {}
        field_counts = self.metrics["field_completion_rates"][agent_id]
        for field, count in field_counts.items():
            field_rates[field] = (count / total) * 100
        
        return {
            "agent_id": agent_id,
            "success_rate": success_rate_pct,
            "total_executions": total,
            "success_count": success_count,
            "failure_count": total - success_count,
            "average_execution_time_ms": avg_time,
            "average_confidence": avg_confidence,
            "field_completion_rates": field_rates
        }
    
    def get_error_patterns(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get most common error patterns."""
        patterns = sorted(
            self.metrics["error_patterns"].items(),
            key=lambda x: x[1],
            reverse=True
        )[:limit]
        
        return [{"error_type": k, "count": v} for k, v in patterns]
    
    def suggest_improvements(self, agent_id: str) -> List[str]:
        """Suggest improvements based on performance metrics."""
        suggestions = []
        performance = self.get_agent_performance(agent_id)
        
        # Check success rate
        if performance["success_rate"] < 80:
            suggestions.append(f"⚠️ Low success rate ({performance['success_rate']:.1f}%) - consider prompt improvements or fallback strategies")
        
        # Check execution time
        if performance["average_execution_time_ms"] > 5000:
            suggestions.append(f"⚠️ Slow execution ({performance['average_execution_time_ms']:.0f}ms) - consider optimization or caching")
        
        # Check field completion
        for field, rate in performance["field_completion_rates"].items():
            if rate < 90:
                suggestions.append(f"⚠️ Low {field} completion rate ({rate:.1f}%) - check extraction logic")
        
        # Check error patterns
        error_patterns = self.get_error_patterns(5)
        if error_patterns:
            top_error = error_patterns[0]
            if top_error["count"] > 10:
                suggestions.append(f"⚠️ Common error: {top_error['error_type']} ({top_error['count']} occurrences) - consider specific handling")
        
        return suggestions
    
    def _categorize_error(self, error: str) -> str:
        """Categorize error for pattern analysis."""
        error_lower = error.lower()
        
        if "timeout" in error_lower:
            return "timeout"
        elif "validation" in error_lower or "invalid" in error_lower:
            return "validation_error"
        elif "not found" in error_lower or "missing" in error_lower:
            return "not_found"
        elif "permission" in error_lower or "access" in error_lower:
            return "permission_error"
        elif "connection" in error_lower or "connect" in error_lower:
            return "connection_error"
        elif "syntax" in error_lower or "parse" in error_lower:
            return "syntax_error"
        elif "schema" in error_lower or "table" in error_lower:
            return "schema_error"
        else:
            return "other_error"
    
    def record_user_feedback(
        self,
        query: str,
        result_satisfactory: bool,
        feedback_text: Optional[str] = None,
        agent_id: Optional[str] = None
    ):
        """Record user feedback for learning."""
        feedback = {
            "query": query,
            "satisfactory": result_satisfactory,
            "feedback_text": feedback_text,
            "agent_id": agent_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        self.metrics["user_feedback"].append(feedback)
        
        # Keep only last 1000 feedback entries
        if len(self.metrics["user_feedback"]) > 1000:
            self.metrics["user_feedback"] = self.metrics["user_feedback"][-1000:]
        
        logger.info(f"📝 Recorded user feedback: satisfactory={result_satisfactory}, agent={agent_id}")
    
    def get_learning_insights(self) -> Dict[str, Any]:
        """Get insights for system improvement."""
        all_agents = list(self.metrics["agent_success_rates"].keys())
        agent_performances = {agent: self.get_agent_performance(agent) for agent in all_agents}
        
        # Overall success rate
        total_success = sum(p["success_count"] for p in agent_performances.values())
        total_executions = sum(p["total_executions"] for p in agent_performances.values())
        overall_success_rate = (total_success / total_executions * 100) if total_executions > 0 else 0
        
        # Most problematic agent
        worst_agent = min(agent_performances.items(), key=lambda x: x[1]["success_rate"]) if agent_performances else None
        
        # Most common errors
        error_patterns = self.get_error_patterns(5)
        
        # User feedback summary
        feedback = self.metrics["user_feedback"]
        satisfactory_count = sum(1 for f in feedback if f.get("satisfactory"))
        feedback_rate = (satisfactory_count / len(feedback) * 100) if feedback else None
        
        return {
            "overall_success_rate": overall_success_rate,
            "total_executions": total_executions,
            "agent_count": len(all_agents),
            "worst_performing_agent": worst_agent[0] if worst_agent else None,
            "worst_agent_success_rate": worst_agent[1]["success_rate"] if worst_agent else None,
            "top_errors": error_patterns,
            "user_satisfaction_rate": feedback_rate,
            "total_feedback": len(feedback)
        }

