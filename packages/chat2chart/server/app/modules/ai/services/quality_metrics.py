"""
Quality Metrics and Confidence Scoring Service

Provides quality metrics and confidence scoring for AI agent outputs to ensure:
- Trustworthy results
- Accurate confidence estimates
- Quality-based routing decisions
- Performance optimization
"""

import logging
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)


class QualityMetricsService:
    """
    Service for calculating quality metrics and confidence scores.
    
    Features:
    - Confidence score calculation
    - Quality metrics (completeness, accuracy, relevance)
    - Trust scoring
    - Performance metrics
    """
    
    @staticmethod
    def calculate_confidence_score(
        agent_id: str,
        result: Dict[str, Any],
        execution_time_ms: int,
        historical_success_rate: Optional[float] = None,
        feedback_service: Optional[Any] = None
    ) -> float:
        """
        Calculate confidence score for agent result.
        
        Args:
            agent_id: Agent identifier
            result: Agent result dictionary
            execution_time_ms: Execution time
            historical_success_rate: Historical success rate (0-1)
            
        Returns:
            Confidence score (0-1)
        """
        confidence = 0.5  # Base confidence
        
        # Factor 1: Success flag
        if result.get("success", False):
            confidence += 0.2
        else:
            confidence -= 0.3
        
        # Factor 2: Historical success rate (from feedback service if available)
        if historical_success_rate is None and feedback_service:
            try:
                performance = feedback_service.get_agent_performance(agent_id)
                historical_success_rate = performance.get("success_rate", 80) / 100.0
            except Exception:
                historical_success_rate = 0.8  # Default
        elif historical_success_rate is None:
            historical_success_rate = 0.8  # Default
        
        confidence += historical_success_rate * 0.2
        
        # Factor 3: Execution time (faster = more confident, up to a point)
        if execution_time_ms < 2000:
            confidence += 0.1
        elif execution_time_ms > 10000:
            confidence -= 0.1
        
        # Factor 4: Field completeness
        required_fields = {
            "nl2sql": ["sql_query"],
            "chart_generation": ["echarts_config", "primary_chart"],
            "insights": ["insights", "executive_summary"],
            "unified": ["chart_config", "insights"]
        }
        
        agent_fields = required_fields.get(agent_id, [])
        if agent_fields:
            present_count = sum(1 for field in agent_fields if result.get(field))
            completeness = present_count / len(agent_fields)
            confidence += completeness * 0.2
        
        # Factor 5: Error presence
        if result.get("error"):
            confidence -= 0.2
        
        # Clamp to [0, 1]
        confidence = max(0.0, min(1.0, confidence))
        
        return confidence
    
    @staticmethod
    def calculate_quality_metrics(
        result: Dict[str, Any],
        expected_fields: List[str],
        data_quality: Optional[Dict[str, Any]] = None
    ) -> Dict[str, float]:
        """
        Calculate quality metrics for agent result.
        
        Args:
            result: Agent result dictionary
            expected_fields: List of expected field names
            data_quality: Data quality information
            
        Returns:
            Dictionary of quality metrics (0-1 scale)
        """
        metrics = {}
        
        # Completeness: How many expected fields are present
        present_fields = sum(1 for field in expected_fields if result.get(field))
        metrics["completeness"] = present_fields / len(expected_fields) if expected_fields else 0.0
        
        # Accuracy: Based on validation results
        validation_result = result.get("validation_result", {})
        if validation_result:
            is_valid = validation_result.get("valid", False)
            metrics["accuracy"] = 1.0 if is_valid else 0.5
        else:
            metrics["accuracy"] = 0.7  # Unknown, assume moderate
        
        # Relevance: Based on query match (if available)
        query_match = result.get("query_match_score", None)
        if query_match is not None:
            metrics["relevance"] = query_match
        else:
            metrics["relevance"] = 0.8  # Assume relevant
        
        # Data Quality: Based on input data quality
        if data_quality:
            metrics["data_quality"] = data_quality.get("quality_score", 0.7)
        else:
            metrics["data_quality"] = 0.7
        
        # Overall quality: Weighted average
        weights = {
            "completeness": 0.3,
            "accuracy": 0.3,
            "relevance": 0.2,
            "data_quality": 0.2
        }
        metrics["overall_quality"] = sum(
            metrics[key] * weights.get(key, 0) 
            for key in metrics.keys() 
            if key != "overall_quality"
        )
        
        return metrics
    
    @staticmethod
    def calculate_trust_score(
        result: Dict[str, Any],
        confidence: float,
        quality_metrics: Dict[str, float],
        user_feedback: Optional[float] = None
    ) -> float:
        """
        Calculate trust score for result.
        
        Args:
            result: Agent result
            confidence: Confidence score (0-1)
            quality_metrics: Quality metrics dictionary
            user_feedback: User feedback score (0-1) if available
            
        Returns:
            Trust score (0-1)
        """
        # Base trust from confidence
        trust = confidence * 0.4
        
        # Add quality metrics
        overall_quality = quality_metrics.get("overall_quality", 0.7)
        trust += overall_quality * 0.4
        
        # Add user feedback if available
        if user_feedback is not None:
            trust += user_feedback * 0.2
        else:
            trust += 0.1  # Neutral feedback assumption
        
        # Penalize errors
        if result.get("error"):
            trust -= 0.2
        
        # Clamp to [0, 1]
        trust = max(0.0, min(1.0, trust))
        
        return trust
    
    @staticmethod
    def assess_data_quality(data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Assess quality of input data.
        
        Args:
            data: List of data rows
            
        Returns:
            Data quality assessment
        """
        if not data or len(data) == 0:
            return {
                "quality_score": 0.0,
                "row_count": 0,
                "issues": ["empty_data"]
            }
        
        issues = []
        quality_score = 1.0
        
        # Check row count
        row_count = len(data)
        if row_count == 0:
            issues.append("no_rows")
            quality_score = 0.0
        elif row_count < 5:
            issues.append("very_few_rows")
            quality_score -= 0.2
        elif row_count > 10000:
            issues.append("too_many_rows")
            quality_score -= 0.1
        
        # Check data consistency
        if row_count > 0:
            first_row_keys = set(data[0].keys())
            inconsistent_rows = 0
            null_counts = {}
            
            for i, row in enumerate(data[:100]):  # Check first 100 rows
                if not isinstance(row, dict):
                    inconsistent_rows += 1
                    continue
                
                row_keys = set(row.keys())
                if row_keys != first_row_keys:
                    inconsistent_rows += 1
                
                # Count nulls
                for key, value in row.items():
                    if value is None:
                        null_counts[key] = null_counts.get(key, 0) + 1
            
            if inconsistent_rows > 0:
                inconsistency_rate = inconsistent_rows / min(100, row_count)
                issues.append(f"inconsistent_structure_{inconsistency_rate:.2f}")
                quality_score -= inconsistency_rate * 0.3
            
            # Check for high null rates
            for key, null_count in null_counts.items():
                null_rate = null_count / min(100, row_count)
                if null_rate > 0.5:
                    issues.append(f"high_null_rate_{key}")
                    quality_score -= 0.1
        
        quality_score = max(0.0, min(1.0, quality_score))
        
        return {
            "quality_score": quality_score,
            "row_count": row_count,
            "column_count": len(data[0].keys()) if data else 0,
            "issues": issues
        }

