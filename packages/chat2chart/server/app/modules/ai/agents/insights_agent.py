"""
Business Insights and Recommendations Agent

This agent generates actionable business insights with confidence scores and recommendations,
adapting to user roles and providing executive summaries.
"""

import json
import logging
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

import importlib

from app.modules.ai.services.litellm_service import LiteLLMService  # noqa: E402
from app.modules.chats.schemas import (
    AgentContextSchema,
    ReasoningStepSchema,
    UserRole,
)  # noqa: E402

try:
    from sqlalchemy.orm import sessionmaker
except Exception:
    sessionmaker = Any  # type: ignore

# Stubs
class _StubChatPromptTemplate:
    @classmethod
    def from_messages(cls, *args, **kwargs):
        return cls()

    def format(self, *args, **kwargs):
        return ""

class _StubMessagesPlaceholder:
    pass

class _StubBaseTool:
    pass

class _StubAgentExecutor:
    pass

# Try direct imports first (preferred method)
try:
    from langchain.agents import AgentExecutor, create_tool_calling_agent
    from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain_core.tools import BaseTool
    _LANGCHAIN_AVAILABLE = True
except ImportError:
    # Fallback to dynamic imports if direct imports fail
    _LANGCHAIN_AVAILABLE = False
    try:
        _langchain_agents = importlib.import_module('langchain.agents')
        AgentExecutor = getattr(_langchain_agents, 'AgentExecutor', _StubAgentExecutor)
        create_tool_calling_agent = getattr(_langchain_agents, 'create_tool_calling_agent', None)

        _langchain_messages = importlib.import_module('langchain_core.messages')
        HumanMessage = getattr(_langchain_messages, 'HumanMessage', dict)
        AIMessage = getattr(_langchain_messages, 'AIMessage', dict)
        SystemMessage = getattr(_langchain_messages, 'SystemMessage', dict)

        _langchain_prompts = importlib.import_module('langchain_core.prompts')
        ChatPromptTemplate = getattr(_langchain_prompts, 'ChatPromptTemplate', _StubChatPromptTemplate)
        MessagesPlaceholder = getattr(_langchain_prompts, 'MessagesPlaceholder', _StubMessagesPlaceholder)

        _langchain_tools = importlib.import_module('langchain_core.tools')
        BaseTool = getattr(_langchain_tools, 'BaseTool', _StubBaseTool)
        _LANGCHAIN_AVAILABLE = True
    except Exception:
        AgentExecutor = _StubAgentExecutor  # type: ignore
        create_tool_calling_agent = None
        HumanMessage = AIMessage = SystemMessage = dict  # type: ignore
        ChatPromptTemplate = _StubChatPromptTemplate  # type: ignore
        MessagesPlaceholder = _StubMessagesPlaceholder  # type: ignore
        BaseTool = _StubBaseTool  # type: ignore

logger = logging.getLogger(__name__)

# Log LangChain availability status after logger is defined
if not _LANGCHAIN_AVAILABLE:
    logger.warning(
        "⚠️ LangChain dependencies not available for InsightsAgent. Agent will use fallback mode."
    )
else:
    logger.debug("✅ LangChain components available for InsightsAgent")


class StatisticalAnalysisTool(BaseTool):
    """Tool for performing statistical analysis on data."""
    
    def __init__(self, **kwargs):
        super().__init__(
            name="statistical_analysis",
            description="Perform statistical analysis on data to identify patterns, trends, and anomalies.",
            **kwargs
        )
    
    def _run(self, data: str, analysis_type: str = "comprehensive") -> str:
        """Perform statistical analysis on data."""
        try:
            # Handle empty or invalid data - but don't return hardcoded JSON
            # Instead, return a message that the LLM can use to generate intelligent response
            if not data or data.strip() == "" or data.strip() == "[]":
                return "NO_DATA_PROVIDED: The user requested analysis but no dataset is connected. Please provide guidance on what analysis would be helpful, what patterns to look for, and how to connect their data source."
            
            # Parse data if it's JSON string
            if isinstance(data, str):
                try:
                    # Try to parse as JSON
                    parsed_data = json.loads(data)
                    if not parsed_data or (isinstance(parsed_data, list) and len(parsed_data) == 0):
                        return "EMPTY_DATASET: The query returned no data. Please provide guidance on what might be wrong and how to fix it."
                    data = parsed_data
                except json.JSONDecodeError:
                    # If not JSON, check for error messages
                    if "NO_DATA" in data.upper() or "EMPTY" in data.upper() or "NOT FOUND" in data.upper():
                        return f"DATA_SOURCE_ISSUE: {data}. Please provide helpful guidance on resolving this issue."
                    # If it's a plain string that's not JSON, try to use it as-is
                    return f"INVALID_DATA_FORMAT: Received data that couldn't be parsed. Raw data: {data[:200]}"
            
            if not isinstance(data, list) or len(data) == 0:
                return "EMPTY_DATASET: No data available for analysis. Please provide guidance."
            
            # Perform analysis based on type
            if analysis_type == "comprehensive":
                results = self._comprehensive_analysis(data)
            elif analysis_type == "trend":
                results = self._trend_analysis(data)
            elif analysis_type == "anomaly":
                results = self._anomaly_analysis(data)
            else:
                results = self._basic_analysis(data)
            
            # CRITICAL: Return concise summary instead of full JSON dump to save tokens
            # Only include essential statistics
            concise_results = {
                "row_count": results.get("data_summary", {}).get("total_rows", 0),
                "key_metrics": {},
                "trends": results.get("trends", {}),
                "anomalies": results.get("anomalies", {})
            }
            
            # Extract key numeric metrics (mean, min, max) for first numeric column only
            numeric_analysis = results.get("numeric_analysis", {})
            if numeric_analysis:
                first_col = list(numeric_analysis.keys())[0]
                stats = numeric_analysis[first_col]
                concise_results["key_metrics"] = {
                    first_col: {
                        "mean": round(stats.get("mean", 0), 2),
                        "min": stats.get("min", 0),
                        "max": stats.get("max", 0)
                    }
                }
            
            return f"Statistical Analysis Results:\n{json.dumps(concise_results, indent=2)}"
            
        except Exception as e:
            logger.error(f"Error in statistical analysis: {e}")
            return f"Statistical analysis failed: {str(e)}"
    
    def _comprehensive_analysis(self, data: List[Dict]) -> Dict[str, Any]:
        """Perform comprehensive statistical analysis."""
        analysis = {
            "data_summary": self._data_summary(data),
            "numeric_analysis": self._numeric_analysis(data),
            "categorical_analysis": self._categorical_analysis(data),
            "correlations": self._correlation_analysis(data),
            "trends": self._trend_analysis(data),
            "anomalies": self._anomaly_analysis(data)
        }
        
        return analysis
    
    def _data_summary(self, data: List[Dict]) -> Dict[str, Any]:
        """Generate data summary."""
        return {
            "total_rows": len(data),
            "total_columns": len(data[0]) if data else 0,
            "column_names": list(data[0].keys()) if data else [],
            "data_types": self._get_column_types(data)
        }
    
    def _numeric_analysis(self, data: List[Dict]) -> Dict[str, Any]:
        """Analyze numeric columns."""
        numeric_cols = self._get_numeric_columns(data)
        analysis = {}
        
        for col in numeric_cols:
            values = [float(row[col]) for row in data if row[col] is not None]
            if values:
                analysis[col] = {
                    "count": len(values),
                    "mean": sum(values) / len(values),
                    "median": sorted(values)[len(values)//2],
                    "min": min(values),
                    "max": max(values),
                    "std_dev": self._calculate_std_dev(values),
                    "range": max(values) - min(values)
                }
        
        return analysis
    
    def _categorical_analysis(self, data: List[Dict]) -> Dict[str, Any]:
        """Analyze categorical columns."""
        categorical_cols = self._get_categorical_columns(data)
        analysis = {}
        
        for col in categorical_cols:
            values = [row[col] for row in data if row[col] is not None]
            if values:
                value_counts = {}
                for value in values:
                    value_counts[value] = value_counts.get(value, 0) + 1
                
                analysis[col] = {
                    "unique_values": len(value_counts),
                    "most_common": max(value_counts.items(), key=lambda x: x[1]),
                    "value_distribution": value_counts
                }
        
        return analysis
    
    def _correlation_analysis(self, data: List[Dict]) -> Dict[str, Any]:
        """Analyze correlations between numeric columns."""
        numeric_cols = self._get_numeric_columns(data)
        correlations = {}
        
        for i, col1 in enumerate(numeric_cols):
            for col2 in numeric_cols[i+1:]:
                correlation = self._calculate_correlation(data, col1, col2)
                if correlation is not None:
                    correlations[f"{col1}_vs_{col2}"] = correlation
        
        return correlations
    
    def _trend_analysis(self, data: List[Dict]) -> Dict[str, Any]:
        """Analyze trends in the data."""
        trends = {}
        
        # Look for time-based trends
        date_cols = self._get_date_columns(data)
        numeric_cols = self._get_numeric_columns(data)
        
        for date_col in date_cols:
            for num_col in numeric_cols:
                trend = self._calculate_trend(data, date_col, num_col)
                if trend:
                    trends[f"{num_col}_over_{date_col}"] = trend
        
        return trends
    
    def _anomaly_analysis(self, data: List[Dict]) -> Dict[str, Any]:
        """Detect anomalies in the data."""
        anomalies = {}
        numeric_cols = self._get_numeric_columns(data)
        
        for col in numeric_cols:
            values = [float(row[col]) for row in data if row[col] is not None]
            if len(values) > 10:  # Need sufficient data for anomaly detection
                outliers = self._detect_outliers(values)
                if outliers:
                    anomalies[col] = {
                        "outlier_count": len(outliers),
                        "outlier_indices": outliers,
                        "outlier_values": [values[i] for i in outliers]
                    }
        
        return anomalies
    
    def _basic_analysis(self, data: List[Dict]) -> Dict[str, Any]:
        """Perform basic analysis."""
        return {
            "row_count": len(data),
            "column_count": len(data[0]) if data else 0,
            "numeric_columns": self._get_numeric_columns(data),
            "categorical_columns": self._get_categorical_columns(data)
        }
    
    def _get_column_types(self, data: List[Dict]) -> Dict[str, str]:
        """Get data types for each column."""
        types = {}
        if not data:
            return types
        
        for key in data[0].keys():
            sample_values = [row.get(key) for row in data[:10]]
            if self._is_numeric_column(sample_values):
                types[key] = "numeric"
            elif self._is_date_column(sample_values):
                types[key] = "date"
            else:
                types[key] = "categorical"
        
        return types
    
    def _get_numeric_columns(self, data: List[Dict]) -> List[str]:
        """Get list of numeric columns."""
        numeric_cols = []
        if not data:
            return numeric_cols
        
        for key in data[0].keys():
            sample_values = [row.get(key) for row in data[:10]]
            if self._is_numeric_column(sample_values):
                numeric_cols.append(key)
        
        return numeric_cols
    
    def _get_categorical_columns(self, data: List[Dict]) -> List[str]:
        """Get list of categorical columns."""
        categorical_cols = []
        if not data:
            return categorical_cols
        
        for key in data[0].keys():
            sample_values = [row.get(key) for row in data[:10]]
            if not self._is_numeric_column(sample_values) and not self._is_date_column(sample_values):
                categorical_cols.append(key)
        
        return categorical_cols
    
    def _get_date_columns(self, data: List[Dict]) -> List[str]:
        """Get list of date columns."""
        date_cols = []
        if not data:
            return date_cols
        
        for key in data[0].keys():
            sample_values = [row.get(key) for row in data[:10]]
            if self._is_date_column(sample_values):
                date_cols.append(key)
        
        return date_cols
    
    def _is_numeric_column(self, sample_values: List[Any]) -> bool:
        """Check if column contains numeric values."""
        numeric_count = 0
        for value in sample_values:
            if value is not None:
                try:
                    float(value)
                    numeric_count += 1
                except (ValueError, TypeError):
                    pass
        
        return numeric_count / len(sample_values) > 0.8 if sample_values else False
    
    def _is_date_column(self, sample_values: List[Any]) -> bool:
        """Check if column contains date values."""
        date_count = 0
        for value in sample_values:
            if value is not None:
                try:
                    datetime.fromisoformat(str(value).replace('Z', '+00:00'))
                    date_count += 1
                except (ValueError, TypeError):
                    pass
        
        return date_count / len(sample_values) > 0.8 if sample_values else False
    
    def _calculate_std_dev(self, values: List[float]) -> float:
        """Calculate standard deviation."""
        if len(values) < 2:
            return 0.0
        
        mean = sum(values) / len(values)
        variance = sum((x - mean) ** 2 for x in values) / len(values)
        return variance ** 0.5
    
    def _calculate_correlation(self, data: List[Dict], col1: str, col2: str) -> Optional[float]:
        """Calculate correlation between two numeric columns."""
        values1 = [float(row[col1]) for row in data if row[col1] is not None]
        values2 = [float(row[col2]) for row in data if row[col2] is not None]
        
        if len(values1) != len(values2) or len(values1) < 2:
            return None
        
        # Simple correlation calculation
        mean1 = sum(values1) / len(values1)
        mean2 = sum(values2) / len(values2)
        
        numerator = sum((x - mean1) * (y - mean2) for x, y in zip(values1, values2))
        denominator = (sum((x - mean1) ** 2 for x in values1) * sum((y - mean2) ** 2 for y in values2)) ** 0.5
        
        if denominator == 0:
            return None
        
        return numerator / denominator
    
    def _calculate_trend(self, data: List[Dict], date_col: str, num_col: str) -> Optional[Dict[str, Any]]:
        """Calculate trend for a numeric column over time."""
        # Simplified trend calculation
        values = [float(row[num_col]) for row in data if row[num_col] is not None]
        if len(values) < 2:
            return None
        
        # Simple linear trend
        first_half = values[:len(values)//2]
        second_half = values[len(values)//2:]
        
        if first_half and second_half:
            first_avg = sum(first_half) / len(first_half)
            second_avg = sum(second_half) / len(second_half)
            
            trend_direction = "upward" if second_avg > first_avg else "downward"
            trend_strength = abs(second_avg - first_avg) / first_avg if first_avg != 0 else 0
            
            return {
                "direction": trend_direction,
                "strength": trend_strength,
                "first_half_avg": first_avg,
                "second_half_avg": second_avg
            }
        
        return None
    
    def _detect_outliers(self, values: List[float]) -> List[int]:
        """Detect outliers using IQR method."""
        if len(values) < 4:
            return []
        
        sorted_values = sorted(values)
        q1_index = len(sorted_values) // 4
        q3_index = 3 * len(sorted_values) // 4
        
        q1 = sorted_values[q1_index]
        q3 = sorted_values[q3_index]
        iqr = q3 - q1
        
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        outliers = []
        for i, value in enumerate(values):
            if value < lower_bound or value > upper_bound:
                outliers.append(i)
        
        return outliers
    
    async def _arun(self, data: str, analysis_type: str = "comprehensive") -> str:
        """Async version of statistical analysis."""
        # Ensure we return a string, not a coroutine
        result = self._run(data, analysis_type)
        return result if isinstance(result, str) else str(result)


class BusinessInsightsTool(BaseTool):
    """Tool for generating business insights from analysis results."""
    
    def __init__(self, **kwargs):
        super().__init__(
            name="generate_business_insights",
            description="Generate concise business insights and recommendations from analysis results. Keep analysis_results brief (max 200 chars) - focus on essentials only.",
            **kwargs
        )
    
    def _run(self, analysis_results: str, user_role: str = "employee", context: str = "") -> str:
        """Generate business insights from analysis results."""
        try:
            # Parse analysis results if it's JSON string
            if isinstance(analysis_results, str):
                # CRITICAL: Extract JSON from string that may have prefixes (e.g., "Statistical Analysis Results:\n{...}")
                # Try to find JSON object in the string
                json_str = analysis_results.strip()
                
                # If string starts with text before JSON, try to extract JSON
                if not json_str.startswith('{') and not json_str.startswith('['):
                    # Look for first { or [ character
                    json_start = -1
                    for i, char in enumerate(json_str):
                        if char in ['{', '[']:
                            json_start = i
                            break
                    if json_start >= 0:
                        json_str = json_str[json_start:]
                        logger.debug(f"Extracted JSON from prefixed string: {json_str[:100]}...")
                
                try:
                    analysis_results = json.loads(json_str)
                except json.JSONDecodeError as e:
                    # Try to extract JSON from markdown code blocks
                    import re
                    json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', json_str, re.DOTALL)
                    if json_match:
                        try:
                            analysis_results = json.loads(json_match.group(1))
                            logger.debug("Successfully extracted JSON from code block")
                        except json.JSONDecodeError:
                            logger.warning(f"⚠️ Invalid analysis results format (even after code block extraction). Error: {e}, Value: {str(analysis_results)[:200]}")
                            # Return a helpful message instead of error string
                            return "Analysis data format issue - please check data structure"
                    else:
                        # If it's plain text, convert to structured format
                        logger.info(f"💡 Analysis results is plain text, converting to structured format: {str(analysis_results)[:100]}...")
                        # Create a structured dict from plain text
                        analysis_results = {
                            "text_summary": analysis_results,
                            "numeric_analysis": {},
                            "trends": {},
                            "anomalies": {},
                            "correlations": {}
                        }
            
            # Ensure analysis_results is a dict
            if not isinstance(analysis_results, dict):
                logger.warning(f"⚠️ analysis_results is not a dict, converting: {type(analysis_results)}")
                analysis_results = {
                    "text_summary": str(analysis_results),
                    "numeric_analysis": {},
                    "trends": {},
                    "anomalies": {},
                    "correlations": {}
                }
            
            # Generate insights based on user role
            insights = self._generate_role_based_insights(analysis_results, user_role)
            
            # Generate recommendations
            recommendations = self._generate_recommendations(analysis_results, user_role)
            
            # Generate executive summary if needed
            executive_summary = None
            if user_role in ["admin", "manager"]:
                executive_summary = self._generate_executive_summary(insights, recommendations)
            
            result = {
                "insights": insights,
                "recommendations": recommendations,
                "executive_summary": executive_summary,
                "confidence_scores": self._calculate_confidence_scores(insights)
            }
            
            return f"Business Insights:\n{json.dumps(result, indent=2)}"
            
        except Exception as e:
            logger.error(f"Error generating business insights: {e}")
            return f"Business insights generation failed: {str(e)}"
    
    def _generate_role_based_insights(self, analysis_results: Dict[str, Any], user_role: str) -> List[Dict[str, Any]]:
        """Generate insights based on user role."""
        insights = []
        
        # Extract key findings from analysis
        numeric_analysis = analysis_results.get("numeric_analysis", {})
        trends = analysis_results.get("trends", {})
        anomalies = analysis_results.get("anomalies", {})
        correlations = analysis_results.get("correlations", {})
        text_summary = analysis_results.get("text_summary", "")
        
        # If we have structured data, use it
        if numeric_analysis or trends or anomalies:
            # Generate insights based on role
            if user_role == "admin":
                insights.extend(self._generate_executive_insights(numeric_analysis, trends, anomalies))
            elif user_role == "manager":
                insights.extend(self._generate_manager_insights(numeric_analysis, trends, anomalies))
            elif user_role == "analyst":
                insights.extend(self._generate_analyst_insights(numeric_analysis, trends, anomalies, correlations))
            else:
                insights.extend(self._generate_employee_insights(numeric_analysis, trends))
        elif text_summary:
            # Extract insights from text summary when structured data is not available
            insights.extend(self._extract_insights_from_text(text_summary, user_role))
        
        return insights
    
    def _extract_insights_from_text(self, text_summary: str, user_role: str) -> List[Dict[str, Any]]:
        """Extract insights from plain text summary when structured data is not available."""
        insights = []
        
        # Simple pattern matching to extract key insights from text
        import re
        
        # Look for percentage changes, trends, spikes
        percentage_pattern = r'([+-]?\d+\.?\d*%)'
        spike_pattern = r'(spike|surge|jump|increase|decrease|drop|fall)'
        mean_pattern = r'mean[=:]?\s*([\d,]+\.?\d*)'
        variance_pattern = r'(volatile|variance|stable|consistent)'
        
        # Extract percentage changes
        percentages = re.findall(percentage_pattern, text_summary)
        if percentages:
            insights.append({
                "type": "trend",
                "title": "Significant changes detected",
                "description": f"Data shows {', '.join(percentages[:3])} changes in key metrics",
                "confidence": 0.7,
                "impact": "medium"
            })
        
        # Extract spikes/anomalies
        if re.search(spike_pattern, text_summary, re.IGNORECASE):
            insights.append({
                "type": "anomaly",
                "title": "Unusual patterns detected",
                "description": "Data shows spikes or unusual variations that may require investigation",
                "confidence": 0.6,
                "impact": "high"
            })
        
        # Extract volatility mentions
        if re.search(variance_pattern, text_summary, re.IGNORECASE):
            insights.append({
                "type": "data_quality",
                "title": "Data stability analysis",
                "description": text_summary[:150] + "..." if len(text_summary) > 150 else text_summary,
                "confidence": 0.65,
                "impact": "medium"
            })
        
        # If no patterns found, create a general insight from the summary
        if not insights and text_summary:
            insights.append({
                "type": "trend",
                "title": "Data analysis summary",
                "description": text_summary[:200] + "..." if len(text_summary) > 200 else text_summary,
                "confidence": 0.6,
                "impact": "medium"
            })
        
        return insights
    
    def _generate_executive_insights(self, numeric_analysis: Dict, trends: Dict, anomalies: Dict) -> List[Dict[str, Any]]:
        """Generate high-level executive insights."""
        insights = []
        
        # Key performance indicators
        for col, stats in numeric_analysis.items():
            if "revenue" in col.lower() or "sales" in col.lower():
                insights.append({
                    "type": "kpi",
                    "title": f"{col.title()} Performance",
                    "description": f"Average {col}: {stats['mean']:.2f}, Range: {stats['min']:.2f} - {stats['max']:.2f}",
                    "confidence": 0.8,
                    "impact": "high"
                })
        
        # Trend insights
        for trend_key, trend_data in trends.items():
            if trend_data.get("strength", 0) > 0.1:  # Significant trend
                insights.append({
                    "type": "trend",
                    "title": f"Trend in {trend_key}",
                    "description": f"Significant {trend_data['direction']} trend detected",
                    "confidence": 0.7,
                    "impact": "medium"
                })
        
        # Anomaly insights
        for col, anomaly_data in anomalies.items():
            if anomaly_data.get("outlier_count", 0) > 0:
                insights.append({
                    "type": "anomaly",
                    "title": f"Anomalies in {col}",
                    "description": f"Found {anomaly_data['outlier_count']} outliers requiring attention",
                    "confidence": 0.9,
                    "impact": "high"
                })
        
        return insights
    
    def _generate_manager_insights(self, numeric_analysis: Dict, trends: Dict, anomalies: Dict) -> List[Dict[str, Any]]:
        """Generate operational manager insights."""
        insights = []
        
        # Operational metrics
        for col, stats in numeric_analysis.items():
            insights.append({
                "type": "operational",
                "title": f"{col.title()} Analysis",
                "description": f"Mean: {stats['mean']:.2f}, Std Dev: {stats['std_dev']:.2f}",
                "confidence": 0.8,
                "impact": "medium"
            })
        
        return insights
    
    def _generate_analyst_insights(self, numeric_analysis: Dict, trends: Dict, anomalies: Dict, correlations: Dict) -> List[Dict[str, Any]]:
        """Generate detailed analyst insights."""
        insights = []
        
        # Statistical insights
        for col, stats in numeric_analysis.items():
            insights.append({
                "type": "statistical",
                "title": f"{col.title()} Statistics",
                "description": f"Count: {stats['count']}, Mean: {stats['mean']:.2f}, Median: {stats['median']:.2f}",
                "confidence": 0.9,
                "impact": "low"
            })
        
        # Correlation insights
        for corr_key, corr_value in correlations.items():
            if abs(corr_value) > 0.5:  # Strong correlation
                insights.append({
                    "type": "correlation",
                    "title": f"Correlation: {corr_key}",
                    "description": f"Strong correlation ({corr_value:.2f}) detected",
                    "confidence": 0.8,
                    "impact": "medium"
                })
        
        return insights
    
    def _generate_employee_insights(self, numeric_analysis: Dict, trends: Dict) -> List[Dict[str, Any]]:
        """Generate simplified employee insights."""
        insights = []
        
        # Simple insights
        for col, stats in numeric_analysis.items():
            insights.append({
                "type": "simple",
                "title": f"{col.title()} Overview",
                "description": f"Average value: {stats['mean']:.2f}",
                "confidence": 0.7,
                "impact": "low"
            })
        
        return insights
    
    def _generate_recommendations(self, analysis_results: Dict[str, Any], user_role: str) -> List[Dict[str, Any]]:
        """Generate actionable recommendations."""
        recommendations = []
        
        # Extract key findings
        trends = analysis_results.get("trends", {})
        anomalies = analysis_results.get("anomalies", {})
        text_summary = analysis_results.get("text_summary", "")
        
        # If we have structured data, use it
        if trends or anomalies:
            # Generate recommendations based on findings
            for trend_key, trend_data in trends.items():
                if trend_data.get("strength", 0) > 0.1:
                    recommendations.append({
                        "title": f"Address {trend_data['direction']} trend in {trend_key}",
                        "description": f"Investigate the {trend_data['direction']} trend and take appropriate action",
                        "priority": "high" if trend_data.get("strength", 0) > 0.2 else "medium",
                        "effort": "medium",
                        "impact": "high"
                    })
            
            for col, anomaly_data in anomalies.items():
                if anomaly_data.get("outlier_count", 0) > 0:
                    recommendations.append({
                        "title": f"Investigate anomalies in {col}",
                        "description": f"Review {anomaly_data['outlier_count']} outliers for data quality issues",
                        "priority": "high",
                        "effort": "low",
                        "impact": "medium"
                    })
        elif text_summary:
            # Generate recommendations from text summary
            import re
            # Look for percentage changes or spikes
            if re.search(r'([+-]?\d+\.?\d*%)', text_summary):
                recommendations.append({
                    "title": "Investigate significant changes",
                    "description": "Review the data changes identified in the analysis to understand root causes",
                    "priority": "high",
                    "effort": "medium",
                    "impact": "high"
                })
            if re.search(r'(spike|surge|volatile)', text_summary, re.IGNORECASE):
                recommendations.append({
                    "title": "Drill into top contributors",
                    "description": "Segment by top customers/products/regions to identify main drivers of changes",
                    "priority": "medium",
                    "effort": "medium",
                    "impact": "high"
                })
        
        return recommendations
    
    def _generate_executive_summary(self, insights: List[Dict], recommendations: List[Dict]) -> Dict[str, Any]:
        """Generate executive summary."""
        high_impact_insights = [i for i in insights if i.get("impact") == "high"]
        high_priority_recommendations = [r for r in recommendations if r.get("priority") == "high"]
        
        return {
            "key_findings": len(insights),
            "high_impact_findings": len(high_impact_insights),
            "recommendations": len(recommendations),
            "high_priority_actions": len(high_priority_recommendations),
            "summary": f"Analysis identified {len(insights)} key findings with {len(high_impact_insights)} high-impact items requiring immediate attention."
        }
    
    def _calculate_confidence_scores(self, insights: List[Dict]) -> Dict[str, float]:
        """Calculate confidence scores for insights."""
        if not insights:
            return {}
        
        total_confidence = sum(insight.get("confidence", 0) for insight in insights)
        avg_confidence = total_confidence / len(insights)
        
        return {
            "overall_confidence": avg_confidence,
            "high_confidence_insights": len([i for i in insights if i.get("confidence", 0) > 0.8]),
            "medium_confidence_insights": len([i for i in insights if 0.5 <= i.get("confidence", 0) <= 0.8]),
            "low_confidence_insights": len([i for i in insights if i.get("confidence", 0) < 0.5])
        }
    
    async def _arun(self, analysis_results: str, user_role: str = "employee", context: str = "") -> str:
        """Async version of business insights generation."""
        # Ensure we return a string, not a coroutine
        result = self._run(analysis_results, user_role, context)
        return result if isinstance(result, str) else str(result)


class BusinessInsightsAgent:
    """
    Business Insights and Recommendations Agent.
    
    This agent generates actionable business insights with confidence scores,
    adapting to user roles and providing executive summaries.
    """
    
    # Type-hint for linter/static analysis
    litellm_service: Optional[LiteLLMService] = None

    def __init__(
        self,
        litellm_service: LiteLLMService,
        session_factory: sessionmaker
    ):
        object.__setattr__(self, 'litellm_service', litellm_service)
        self.session_factory = session_factory
        
        # Initialize tools
        self.tools = self._initialize_tools()
        
        # Initialize agent
        self.agent = self._initialize_agent()
    
    def _initialize_tools(self) -> List[BaseTool]:
        """Initialize tools for insights agent."""
        tools = []
        
        tools.append(StatisticalAnalysisTool())
        tools.append(BusinessInsightsTool())
        
        return tools
    
    def _initialize_agent(self) -> AgentExecutor:
        """Initialize the insights agent."""
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert business analyst specializing in enterprise data analysis and decision support. Your job is to generate actionable, trustworthy insights and recommendations from complex enterprise data.

**Enterprise Analysis Expertise:**
- Understand business context and industry-specific patterns
- Handle messy, incomplete, or inconsistent enterprise data
- Identify meaningful patterns vs. noise in large datasets
- Provide context-aware insights that drive business decisions
- Consider data quality, confidence, and limitations
- Generate insights appropriate for different organizational roles
- Connect data patterns to business outcomes and recommendations

**Guidelines:**
1. Perform comprehensive statistical analysis, but focus on BUSINESS MEANING, not just numbers
2. Generate role-appropriate insights:
   - **Executive**: High-level strategic insights, KPIs, trends, business impact
   - **Manager**: Operational insights, team performance, actionable recommendations
   - **Analyst**: Detailed analysis, data quality, methodology, deep dives
   - **Employee**: Relevant, actionable insights for their role
3. Provide actionable recommendations with:
   - Clear priority (high/medium/low) based on business impact
   - Effort estimates (low/medium/high) for implementation
   - Expected outcomes and success metrics
4. Calculate confidence scores based on:
   - Data quality and completeness
   - Sample size and statistical significance
   - Business context alignment
   - Historical accuracy
5. Generate executive summaries that are:
   - Concise but comprehensive
   - Focused on business impact
   - Action-oriented
   - Trustworthy and transparent about limitations
6. Always consider:
   - Data quality issues and their impact on insights
   - Potential biases or limitations in the analysis
   - Alternative interpretations of the data
   - Business context and industry best practices

**Available tools:**
- statistical_analysis: OPTIONAL - Perform statistical analysis on data (only if detailed metrics needed)
- generate_business_insights: Generate concise business insights and recommendations

**CRITICAL Tool Usage Rules:**
1. **Call `generate_business_insights` ONLY ONCE** - do not invoke multiple times
2. **For most cases**: Skip `statistical_analysis` and call `generate_business_insights` directly with a concise data summary (max 200 chars)
3. **If you use `statistical_analysis`**: Pass concise results (not full JSON) to `generate_business_insights`
4. Keep analysis_results brief - focus on essentials (row count, key metrics, trends)

**Output Requirements (MANDATORY):**
- Return ONLY valid JSON (no extra commentary) with the following keys:
  - `insights`: array of objects with fields: type, title, description, confidence, impact
  - `recommendations`: array of objects with fields: title, description, priority, effort, impact, confidence
  - `executive_summary`: string (1-3 sentences, business-focused)
  - `confidence_scores`: object with overall and per-insight confidence
  - `success`: boolean

Example (use this literal example as a GUIDELINE; do not interpolate template variables from it):
{{
  "success": true,
  "executive_summary": "Customer registrations grew YoY with 2024 highest; 2025 drop needs investigation.",
  "insights": [
    {{"type": "trend", "title": "Registrations up 2020-2024", "description": "Registration counts increased steadily from 612 to 956", "confidence": 0.85, "impact": "medium"}}
  ],
  "recommendations": [
    {{"title": "Investigate 2025 drop", "description": "Check marketing and source channels for 2025", "priority": "high", "effort": "medium", "impact": "high", "confidence": 0.75}}
  ],
  "confidence_scores": {{"overall": 0.8}}
}}

**Always return JSON following the schema above.**

**Always use these tools efficiently to ensure comprehensive, trustworthy analysis that drives business decisions.**"""),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad")
        ])
        
        llm = self.litellm_service.get_llm()
        
        # CRITICAL: Wrap LLM to remove api_version from all calls
        # LangChain's AgentExecutor may pass api_version to LiteLLM
        if hasattr(llm, 'bind') or hasattr(llm, 'invoke'):
            # Create a wrapper that intercepts all method calls
            class SafeLLMWrapper:
                """Wrapper that removes api_version from all LLM calls"""
                def __init__(self, wrapped_llm):
                    self._wrapped = wrapped_llm
                    # Copy all attributes
                    for attr in dir(wrapped_llm):
                        if not attr.startswith('_') and attr not in ['bind', 'invoke', 'astream', 'ainvoke', 'stream', '__call__']:
                            try:
                                setattr(self, attr, getattr(wrapped_llm, attr))
                            except:
                                pass
                
                def bind(self, **kwargs):
                    kwargs.pop('api_version', None)
                    if 'extra_headers' in kwargs and isinstance(kwargs['extra_headers'], dict):
                        kwargs['extra_headers'].pop('api-version', None)
                    return self._wrapped.bind(**kwargs) if hasattr(self._wrapped, 'bind') else self._wrapped
                
                def invoke(self, *args, **kwargs):
                    kwargs.pop('api_version', None)
                    if 'extra_headers' in kwargs and isinstance(kwargs['extra_headers'], dict):
                        kwargs['extra_headers'].pop('api-version', None)
                    return self._wrapped.invoke(*args, **kwargs) if hasattr(self._wrapped, 'invoke') else self._wrapped(*args, **kwargs)
                
                async def ainvoke(self, *args, **kwargs):
                    kwargs.pop('api_version', None)
                    if 'extra_headers' in kwargs and isinstance(kwargs['extra_headers'], dict):
                        kwargs['extra_headers'].pop('api-version', None)
                    return await self._wrapped.ainvoke(*args, **kwargs) if hasattr(self._wrapped, 'ainvoke') else self._wrapped(*args, **kwargs)
                
                def stream(self, *args, **kwargs):
                    kwargs.pop('api_version', None)
                    if 'extra_headers' in kwargs and isinstance(kwargs['extra_headers'], dict):
                        kwargs['extra_headers'].pop('api-version', None)
                    return self._wrapped.stream(*args, **kwargs) if hasattr(self._wrapped, 'stream') else self._wrapped(*args, **kwargs)
                
                async def astream(self, *args, **kwargs):
                    kwargs.pop('api_version', None)
                    if 'extra_headers' in kwargs and isinstance(kwargs['extra_headers'], dict):
                        kwargs['extra_headers'].pop('api-version', None)
                    return self._wrapped.astream(*args, **kwargs) if hasattr(self._wrapped, 'astream') else self._wrapped(*args, **kwargs)
                
                def __call__(self, *args, **kwargs):
                    kwargs.pop('api_version', None)
                    if 'extra_headers' in kwargs and isinstance(kwargs['extra_headers'], dict):
                        kwargs['extra_headers'].pop('api-version', None)
                    return self._wrapped(*args, **kwargs)
            
            llm = SafeLLMWrapper(llm)
            logger.debug("✅ Wrapped LLM to remove api_version in BusinessInsightsAgent")
        
        agent = create_tool_calling_agent(llm, self.tools, prompt)
        
        # CRITICAL: Create custom callback handler to identify agent in logs
        from langchain_core.callbacks import BaseCallbackHandler
        
        class AgentIdentifierCallback(BaseCallbackHandler):
            def __init__(self, agent_name: str):
                super().__init__()
                self.agent_name = agent_name
            
            def on_chain_start(self, serialized: Dict[str, Any], inputs: Dict[str, Any], **kwargs) -> None:
                logger.info("🤖 [INSIGHTS_AGENT] Entering AgentExecutor chain")
            
            def on_chain_end(self, outputs: Dict[str, Any], **kwargs) -> None:
                logger.info("✅ [INSIGHTS_AGENT] Finished AgentExecutor chain")
        
        callback = AgentIdentifierCallback("insights")
        agent_executor = AgentExecutor(
            agent=agent, 
            tools=self.tools, 
            verbose=True,
            callbacks=[callback]
        )
        
        return agent_executor
    
    async def generate_insights(
        self,
        data: List[Dict],
        query_context: str = "",
        user_role: UserRole = UserRole.EMPLOYEE,
        context: AgentContextSchema = None
    ) -> Dict[str, Any]:
        """
        Generate business insights and recommendations from data.
        
        Args:
            data: Data to analyze
            query_context: Context of the user's query
            user_role: User's role for role-appropriate insights
            context: User context for personalization
            
        Returns:
            Insights and recommendations with metadata
        """
        # CRITICAL: Validate input using Pydantic model
        try:
            from app.modules.ai.utils.input_validation import InputValidator
            validated_input, validation_error = InputValidator.validate_insights_input(
                data=data,
                query_context=query_context,
                user_role=user_role.value if hasattr(user_role, 'value') else str(user_role),
                context=context.model_dump() if context and hasattr(context, 'model_dump') else (context.dict() if context and hasattr(context, 'dict') else None)
            )
            
            if validation_error:
                logger.warning(f"⚠️ Insights generation input validation failed: {validation_error}")
            else:
                # Use validated input
                data = validated_input.data
                query_context = validated_input.query_context
                user_role = UserRole(validated_input.user_role)  # Convert back to enum
                logger.debug("✅ Insights generation input validated successfully")
        except Exception as validation_exception:
            logger.debug(f"Input validation not available: {validation_exception}, proceeding without validation")
        
        start_time = time.time()
        reasoning_steps = []
        
        try:
            # Step 1: Perform statistical analysis
            analysis_step = ReasoningStepSchema(
                step_number=1,
                step_id="statistical_analysis",
                step_type="statistical_analysis",
                description="Performing comprehensive statistical analysis on data",
                confidence=0.9
            )
            reasoning_steps.append(analysis_step)
            
            # Step 2: Generate business insights
            insights_step = ReasoningStepSchema(
                step_number=2,
                step_id="insights_generation",
                step_type="insights_generation",
                description="Generating role-appropriate business insights",
                confidence=0.8
            )
            reasoning_steps.append(insights_step)
            
            # Use agent to analyze data and generate insights
            if not data or len(data) == 0:
                # Handle case when no real data is available
                agent_input = {
                    "input": f"""
Query context: {query_context}
User role: {user_role}

The user is asking for sales data analysis for the last month, but no actual data is currently connected. 
Please provide:

1. **Data Requirements Analysis**: What specific sales data would be needed to answer this query
2. **Recommended Data Sources**: Suggest the types of data sources that should be connected
3. **Analysis Framework**: Outline the analysis approach that would be used once data is available
4. **Sample Insights**: Provide examples of insights that could be generated with proper data
5. **Next Steps**: Clear guidance on how to connect data sources and proceed

Focus on being helpful and educational while explaining what analysis would be possible with real data.
""",
                "chat_history": []
                }
            # Append format instructions derived from Pydantic schema to the prompt to encourage strict JSON output
            try:
                from app.modules.ai.utils.structured_output import StructuredOutputHandler
                from app.modules.ai.schemas.agent_outputs import InsightsOutput

                fmt_handler = StructuredOutputHandler(InsightsOutput)
                fmt_instructions = fmt_handler.get_format_instructions()
                agent_input["input"] = f"{agent_input['input']}\n\nFormat instructions:\n{fmt_instructions}"
            except Exception:
                pass
            
            # If we have real data, also use agent to analyze it and generate insights
            if data and len(data) > 0:
                agent_input = {
                    "input": f"""
Data to analyze (first 20 rows): {json.dumps(data[:20], indent=2)}
Query context: {query_context}
User role: {user_role}

Please perform statistical analysis as needed and generate BUSINESS INSIGHTS and ACTIONABLE RECOMMENDATIONS.

MANDATORY OUTPUT (RETURN ONLY VALID JSON):
{{
  "success": true,
  "executive_summary": "<1-3 sentence business-focused summary>",
  "insights": [
    {{"type":"trend|kpi|anomaly|data_quality","title":"","description":"","confidence":0.0,"impact":"low|medium|high"}}
  ],
  "recommendations": [
    {{"title":"","description":"","priority":"high|medium|low","effort":"low|medium|high","impact":"high|medium|low","confidence":0.0}}
  ],
  "confidence_scores": {{"overall": 0.0}}
}}

REQUIREMENTS:
- Provide at least 2 recommendations (if applicable) with priority and effort.
- Executive summary must reference chart type/key finding and be actionable.
- Keep descriptions concise and factual. Use data-derived metrics when possible.
- Do NOT include any surrounding markdown/text—return only the JSON object above.

Now generate the JSON output based on the sample data and the query above.
""",
                    "chat_history": []
                }
            
            # Execute agent
            logger.info(f"🤖 [INSIGHTS_AGENT] Executing LLM-based insights generation agent for {len(data)} rows")
            result = await self.agent.ainvoke(agent_input)
            logger.info("✅ [INSIGHTS_AGENT] Agent execution completed")
            
            # OPTION: Try structured output parsing first (if enabled)
            use_structured_outputs = True  # Feature flag
            insights_result = None
            
            if use_structured_outputs:
                try:
                    from app.modules.ai.utils.structured_output import StructuredOutputHandler
                    from app.modules.ai.schemas.agent_outputs import InsightsOutput
                    
                    handler = StructuredOutputHandler(InsightsOutput)
                    agent_output = result.get("output", "")
                    structured_output, error_info = handler.parse_output(agent_output)
                    
                    if structured_output:
                        # Successfully parsed - convert to dict
                        insights_result = {
                            "insights": structured_output.insights if hasattr(structured_output.insights[0], 'model_dump') else [i.model_dump() if hasattr(i, 'model_dump') else i.dict() if hasattr(i, 'dict') else i for i in structured_output.insights],
                            "recommendations": structured_output.recommendations if hasattr(structured_output.recommendations[0], 'model_dump') else [r.model_dump() if hasattr(r, 'model_dump') else r.dict() if hasattr(r, 'dict') else r for r in structured_output.recommendations],
                            "executive_summary": structured_output.executive_summary,
                            "confidence_scores": structured_output.confidence_scores,
                            "parsing_success": True
                        }
                        logger.info("✅ Structured output parsing succeeded for insights agent")
                    else:
                        logger.warning(f"⚠️ Structured output parsing failed: {error_info.get('error_type', 'unknown') if error_info else 'unknown'}, falling back to text extraction")
                except Exception as structured_error:
                    logger.debug(f"Structured output parsing not available: {structured_error}, using text extraction")
            
            # Fallback to text extraction if structured parsing failed or not enabled
            if not insights_result:
                insights_result = self._extract_insights_from_result(result.get("output", ""))
            
            # Step 3: Generate recommendations
            recommendations_step = ReasoningStepSchema(
                step_number=3,
                step_id="recommendations_generation",
                step_type="recommendations_generation",
                description="Generating actionable recommendations",
                confidence=0.7
            )
            reasoning_steps.append(recommendations_step)
            
            recommendations = self._generate_recommendations(insights_result, user_role)
            
            # Step 4: Generate executive summary if needed
            summary_step = ReasoningStepSchema(
                step_number=4,
                step_id="executive_summary",
                step_type="executive_summary",
                description="Generating executive summary for senior roles",
                confidence=0.8
            )
            reasoning_steps.append(summary_step)
            
            executive_summary = None
            if user_role in [UserRole.ADMIN, UserRole.MANAGER]:
                executive_summary = self._generate_executive_summary(insights_result, recommendations)

            # If executive_summary or recommendations are missing/too short, synthesize using LLM
            try:
                need_synthesis = False
                if not executive_summary or (isinstance(executive_summary, str) and len(executive_summary.strip()) < 80):
                    need_synthesis = True
                if not recommendations or len(recommendations) == 0:
                    need_synthesis = True

                if need_synthesis and getattr(self, 'litellm_service', None):
                    synth_prompt = f"""
You are an expert business analyst. Produce a concise executive summary (2-3 sentences) and up to 3 actionable recommendations with priority and effort.

Input data summary (JSON):\nInsights: {json.dumps(insights_result.get('insights', []), default=str)}\nExisting recommendations: {json.dumps(recommendations, default=str)}\nQuery context: {query_context}\nUser role: {user_role}

Return ONLY valid JSON with keys: executive_summary (string), recommendations (array of objects with title, description, priority, effort, confidence). Example:\n{{"executive_summary":"...","recommendations":[{{"title":"...","description":"...","priority":"high","effort":"medium","confidence":0.8}}]}}
"""
                    synth_resp = await self.litellm_service.generate_completion(
                        prompt=synth_prompt,
                        system_context="You are a concise BI analyst. Return strict JSON only.",
                        max_tokens=400,
                        temperature=0.2
                    )
                    content = synth_resp.get('content','').strip()
                    # Extract JSON from content
                    try:
                        import re as _re
                        js = content
                        if '```json' in js:
                            m = _re.search(r'```json\s*(\{[\s\S]*\})\s*```', js, _re.DOTALL)
                            if m:
                                js = m.group(1)
                        else:
                            m = _re.search(r'(\{[\s\S]*\})', js, _re.DOTALL)
                            if m:
                                js = m.group(1)
                        parsed = json.loads(js)
                        if parsed.get('executive_summary'):
                            executive_summary = parsed.get('executive_summary')
                        if parsed.get('recommendations') and isinstance(parsed.get('recommendations'), list):
                            recommendations = parsed.get('recommendations')
                        logger.info('✅ Synthesized executive_summary and recommendations via LLM')
                    except Exception as synth_err:
                        logger.debug(f'Could not parse synthesized JSON: {synth_err} - content: {content[:200]}')
            except Exception as outer_synth_err:
                logger.debug(f'LLM-based synthesis failed: {outer_synth_err}')
            
            execution_time = int((time.time() - start_time) * 1000)

            # FINAL FALLBACKS: Ensure executive_summary and recommendations exist for frontend
            if not executive_summary or (isinstance(executive_summary, str) and len(executive_summary.strip()) < 20):
                # Try to synthesize short summary from insights
                try:
                    insights_list = insights_result.get("insights", []) if insights_result else []
                    if insights_list and isinstance(insights_list, list) and len(insights_list) > 0:
                        top = insights_list[0]
                        if isinstance(top, dict):
                            executive_summary = top.get("description") or top.get("title") or str(top)
                        else:
                            executive_summary = str(top)
                    else:
                        # Fallback from data: mention row count
                        row_count = len(data) if data and isinstance(data, list) else 0
                        executive_summary = f"Analysis completed. Found {row_count} row(s)."
                except Exception:
                    executive_summary = "Analysis completed."

            if not recommendations or len(recommendations) == 0:
                # Try to synthesize 2-3 actionable recommendations via LLM
                try:
                    rec_prompt = f"""
You are an expert BI consultant. Given the following insights (JSON) and query context, produce up to 3 actionable recommendations as a JSON array. Each recommendation must include: title, description, priority (high|medium|low), effort (low|medium|high), impact (high|medium|low), confidence (0.0-1.0).

Insights: {json.dumps(insights_result.get('insights', []), default=str)}
Query context: {query_context}

Return ONLY a JSON array, e.g.:
[{{"title":"...","description":"...","priority":"high","effort":"medium","impact":"high","confidence":0.85}}]
"""
                    rec_resp = await self.litellm_service.generate_completion(
                        prompt=rec_prompt,
                        system_context="You are concise and return strict JSON.",
                        max_tokens=300,
                        temperature=0.2
                    )
                    rec_content = rec_resp.get('content','').strip()
                    # extract JSON array
                    import re as _re
                    arr = None
                    if '```json' in rec_content:
                        m = _re.search(r'```json\s*(\[.*\])\s*```', rec_content, _re.DOTALL)
                        if m:
                            arr = json.loads(m.group(1))
                    else:
                        m = _re.search(r'(\[\s*\{[\s\S]*\}\s*\])', rec_content, _re.DOTALL)
                        if m:
                            arr = json.loads(m.group(1))

                    if arr and isinstance(arr, list) and len(arr) > 0:
                        recommendations = arr
                        logger.info('✅ Generated recommendations via LLM')
                    else:
                        raise ValueError('No recs parsed')
                except Exception as e:
                    logger.debug(f'LLM recommendation generation failed: {e}')
                    # Rule-based fallback: derive recommendations from data if possible
                    try:
                        recommendations = []
                        if data and isinstance(data, list) and len(data) >= 2:
                            # Attempt simple YOY change detection for numeric total_spend
                            try:
                                # find numeric column name for spend
                                first_row = data[0]
                                spend_col = None
                                for k, v in first_row.items():
                                    if isinstance(v, (int, float)) or (isinstance(v, str) and v.replace('.', '', 1).isdigit()):
                                        if 'spend' in k or 'amount' in k or 'total' in k:
                                            spend_col = k
                                            break
                                if spend_col:
                                    # use last two rows to compute change
                                    row_earlier = data[0]
                                    row_later = data[-1]
                                    earlier = float(str(row_earlier.get(spend_col, 0)))
                                    later = float(str(row_later.get(spend_col, 0)))
                                    if earlier != 0:
                                        pct = (later - earlier) / earlier
                                    else:
                                        pct = 0.0
                                    recommendations.append({
                                        "title": "Investigate year-over-year spend change",
                                        "description": f"Total spend changed by {pct*100:.1f}% between the earliest and latest periods in your query. Investigate drivers (top customers, product mix, discounts).",
                                        "priority": "high" if abs(pct) > 0.2 else "medium",
                                        "effort": "medium",
                                        "impact": "high" if abs(pct) > 0.2 else "medium",
                                        "confidence": 0.6
                                    })
                            except Exception:
                                pass

                        # Generic recommendation to validate data pipelines
                        if len(recommendations) == 0:
                            recommendations.append({
                                "title": "Validate data sources and investigate anomalies",
                                "description": "Check data pipelines and investigate any unexpected drops or spikes; review filters and time ranges.",
                                "priority": "medium",
                                "effort": "medium",
                                "impact": "medium",
                                "confidence": 0.5
                            })
                    except Exception as fallback_err:
                        logger.debug(f'Rule-based recommendation generation failed: {fallback_err}')
                        recommendations = [
                            {
                                "title": "Validate data sources and investigate anomalies",
                                "description": "Check data pipelines and investigate any unexpected drops or spikes; review filters and time ranges.",
                                "priority": "medium",
                                "effort": "medium",
                                "impact": "medium",
                                "confidence": 0.5
                            }
                        ]

            # Ensure at least 2 recommendations for frontend UI
            try:
                if recommendations and isinstance(recommendations, list) and len(recommendations) == 1:
                    recommendations.append({
                        "title": "Drill into top contributors",
                        "description": "Segment by top customers/products/regions to identify main drivers of spend change.",
                        "priority": "medium",
                        "effort": "low",
                        "impact": "high",
                        "confidence": 0.5
                    })
            except Exception:
                pass

            return {
                "insights": insights_result.get("insights", []),
                "recommendations": recommendations,
                "executive_summary": executive_summary,
                "confidence_scores": insights_result.get("confidence_scores", {}),
                "reasoning_steps": [step.dict() for step in reasoning_steps],
                "execution_time_ms": execution_time,
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Error generating insights: {e}")
            
            # Fallback to simple insights
            fallback_insights = self._generate_fallback_insights(data, user_role)
            
            return {
                "insights": fallback_insights,
                "recommendations": [],
                "executive_summary": None,
                "confidence_scores": {"overall_confidence": 0.3},
                "reasoning_steps": [step.dict() for step in reasoning_steps],
                "execution_time_ms": int((time.time() - start_time) * 1000),
                "success": False,
                "error": str(e)
            }
    
    def _extract_insights_from_result(self, result_text: str) -> Dict[str, Any]:
        """Extract insights from agent result."""
        try:
            import re
            # Look for JSON insights in the result
            json_pattern = r'```json\s*(.*?)\s*```'
            match = re.search(json_pattern, result_text, re.DOTALL | re.IGNORECASE)
            if match:
                return json.loads(match.group(1))
            
            # Look for insights section
            insights_pattern = r'"insights":\s*\[(.*?)\]'
            match = re.search(insights_pattern, result_text, re.DOTALL)
            if match:
                return {"insights": json.loads("[" + match.group(1) + "]")}
            
            # If result_text is plain narrative, convert to a single insight
            cleaned = result_text.strip()
            if cleaned:
                # Truncate long narratives for description
                desc = cleaned if len(cleaned) < 1000 else cleaned[:1000] + "..."
                return {
                    "insights": [
                        {
                            "type": "data_summary",
                            "title": "Narrative Insight",
                            "description": desc,
                            "confidence": 0.5,
                            "impact": "medium"
                        }
                    ],
                    "confidence_scores": {"overall": 0.5}
                }

            # Return default structure
            return {"insights": [], "confidence_scores": {}}
            
        except Exception as e:
            logger.error(f"Error extracting insights: {e}")
            return {"insights": [], "confidence_scores": {}}
    
    def _generate_recommendations(self, insights_result: Dict[str, Any], user_role: UserRole) -> List[Dict[str, Any]]:
        """Generate recommendations based on insights."""
        recommendations = []
        
        insights = insights_result.get("insights", [])
        
        # Generate recommendations based on insights
        for insight in insights:
            if insight.get("impact") == "high":
                recommendations.append({
                    "title": f"Address {insight.get('title', 'Key Finding')}",
                    "description": f"Take action on: {insight.get('description', '')}",
                    "priority": "high",
                    "effort": "medium",
                    "impact": "high",
                    "confidence": insight.get("confidence", 0.7)
                })
        
        return recommendations
    
    def _generate_executive_summary(self, insights_result: Dict[str, Any], recommendations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate executive summary."""
        insights = insights_result.get("insights", [])
        
        high_impact_insights = [i for i in insights if i.get("impact") == "high"]
        high_priority_recommendations = [r for r in recommendations if r.get("priority") == "high"]
        
        return {
            "key_findings": len(insights),
            "high_impact_findings": len(high_impact_insights),
            "recommendations": len(recommendations),
            "high_priority_actions": len(high_priority_recommendations),
            "summary": f"Analysis identified {len(insights)} key findings with {len(high_impact_insights)} high-impact items requiring immediate attention.",
            "next_steps": [
                "Review high-impact findings",
                "Prioritize recommendations",
                "Assign action owners",
                "Set implementation timeline"
            ]
        }
    
    def _generate_fallback_insights(self, data: List[Dict], user_role: UserRole) -> List[Dict[str, Any]]:
        """Generate fallback insights when main analysis fails."""
        insights = []
        
        if not data:
            return insights
        
        # Basic insights
        insights.append({
            "type": "data_summary",
            "title": "Data Overview",
            "description": f"Dataset contains {len(data)} rows and {len(data[0])} columns",
            "confidence": 0.5,
            "impact": "low"
        })
        
        # Role-specific fallback insights
        if user_role == UserRole.ADMIN:
            insights.append({
                "type": "executive",
                "title": "High-Level Summary",
                "description": "Data analysis completed with basic insights",
                "confidence": 0.3,
                "impact": "medium"
            })
        elif user_role == UserRole.MANAGER:
            insights.append({
                "type": "operational",
                "title": "Operational Summary",
                "description": "Basic operational insights available",
                "confidence": 0.4,
                "impact": "low"
            })
        
        return insights

