"""
Intelligent Chart Generation Agent

This agent auto-generates optimal ECharts configurations based on data characteristics
and user intent, with chart type recommendations and dashboard integration.
"""

import json
import logging
import re
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.modules.ai.services.litellm_service import LiteLLMService  # noqa: E402
from app.modules.chats.schemas import (
    AgentContextSchema,
    ReasoningStepSchema,
)  # noqa: E402

# Default placeholders to satisfy static analysis prior to dynamic imports
AgentExecutor = None
create_tool_calling_agent = None
HumanMessage = AIMessage = SystemMessage = dict

# Lightweight BaseTool fallback so agent tools can be constructed when LangChain isn't available.
class _SimpleBaseTool:
    def __init__(self, name: str = None, description: str = None, **kwargs):
        self.name = name
        self.description = description
        for k, v in kwargs.items():
            setattr(self, k, v)
    @classmethod
    def from_messages(cls, *args, **kwargs):
        # Minimal compatibility with ChatPromptTemplate.from_messages
        return cls()

    def format(self, *args, **kwargs):
        # Return empty string or joined human message if present
        try:
            # If 'input' in kwargs, return it for simple usage
            if "input" in kwargs:
                return str(kwargs.get("input") or "")
        except Exception:
            pass
        return ""

BaseTool = _SimpleBaseTool
ChatPromptTemplate = MessagesPlaceholder = _SimpleBaseTool  # minimal placeholders

# Attempt to import LangChain components - use direct imports first, fallback to dynamic
try:
    # Try direct imports first (preferred method)
    from langchain.agents import AgentExecutor, create_tool_calling_agent
    from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain_core.tools import BaseTool
    _LANGCHAIN_AVAILABLE = True
except ImportError as e:
    # Fallback to dynamic imports if direct imports fail
    _LANGCHAIN_AVAILABLE = False
    try:
        import importlib
        _langchain_agents = importlib.import_module("langchain.agents")
        AgentExecutor = getattr(_langchain_agents, "AgentExecutor", AgentExecutor)
        create_tool_calling_agent = getattr(_langchain_agents, "create_tool_calling_agent", create_tool_calling_agent)

        _langchain_messages = importlib.import_module("langchain_core.messages")
        HumanMessage = getattr(_langchain_messages, "HumanMessage", HumanMessage)
        AIMessage = getattr(_langchain_messages, "AIMessage", AIMessage)
        SystemMessage = getattr(_langchain_messages, "SystemMessage", SystemMessage)

        _langchain_prompts = importlib.import_module("langchain_core.prompts")
        ChatPromptTemplate = getattr(_langchain_prompts, "ChatPromptTemplate", ChatPromptTemplate)
        MessagesPlaceholder = getattr(_langchain_prompts, "MessagesPlaceholder", MessagesPlaceholder)

        _langchain_tools = importlib.import_module("langchain_core.tools")
        BaseTool = getattr(_langchain_tools, "BaseTool", BaseTool)
        _LANGCHAIN_AVAILABLE = True
    except Exception as _langchain_import_error:
        # Keep None values for later checks
        AgentExecutor = None
        create_tool_calling_agent = None
        _LANGCHAIN_AVAILABLE = False

try:
    from sqlalchemy.orm import sessionmaker
except Exception:
    sessionmaker = Any  # type: ignore

logger = logging.getLogger(__name__)

# Log LangChain availability status after logger is defined
if not _LANGCHAIN_AVAILABLE:
    logger.warning(
        "⚠️ LangChain dependencies not available for ChartGenerationAgent. Agent will use fallback mode."
    )
else:
    logger.debug("✅ LangChain components available for ChartGenerationAgent")


class ChartAnalysisTool(BaseTool):
    """Tool for analyzing data characteristics to determine optimal chart types using LLM-based intent recognition."""
    
    def __init__(self, litellm_service: Optional[LiteLLMService] = None, **kwargs):
        # Defensive: ensure litellm_service isn't forwarded to BaseTool (pydantic) via kwargs
        if 'litellm_service' in kwargs:
            litellm_service = kwargs.pop('litellm_service')
        # Use object.__setattr__ to avoid pydantic/BaseTool field validation
        object.__setattr__(self, 'litellm_service', litellm_service)
        try:
            super().__init__(
                name="analyze_data_for_chart",
                description="Analyze data structure and characteristics using LLM to recommend optimal chart types with confidence scores. Returns recommendations sorted by confidence (highest first).",
                **kwargs
            )
        except Exception:
            # Fallback when BaseTool doesn't accept kwargs (minimal stub)
            self.name = "analyze_data_for_chart"
            self.description = "Analyze data structure and characteristics using LLM to recommend optimal chart types with confidence scores. Returns recommendations sorted by confidence (highest first)."
            for k, v in kwargs.items():
                setattr(self, k, v)
    
    def _run(self, data: str, query_intent: str = "") -> str:
        """Analyze data and recommend chart types."""
        try:
            # Parse data if it's JSON string
            if isinstance(data, str):
                try:
                    data = json.loads(data)
                except json.JSONDecodeError:
                    return "Invalid data format. Please provide valid JSON data."
            
            if not isinstance(data, list) or len(data) == 0:
                return "No data available for chart generation"
            
            # Analyze data characteristics
            analysis = self._analyze_data_characteristics(data)
            
            # Determine optimal chart types
            chart_recommendations = self._recommend_chart_types(analysis, query_intent)
            
            return f"Data Analysis:\n{json.dumps(analysis, indent=2)}\n\nChart Recommendations:\n{json.dumps(chart_recommendations, indent=2)}"
            
        except Exception as e:
            logger.error(f"Error analyzing data for chart: {e}")
            return f"Data analysis failed: {str(e)}"
    
    def _analyze_data_characteristics(self, data: List[Dict]) -> Dict[str, Any]:
        """Analyze data characteristics."""
        analysis = {
            "row_count": len(data),
            "column_count": len(data[0]) if data else 0,
            "column_types": {},
            "numeric_columns": [],
            "categorical_columns": [],
            "date_columns": [],
            "has_time_series": False,
            "data_distribution": {}
        }
        
        if not data:
            return analysis
        
        # Analyze columns
        for key in data[0].keys():
            column_type = self._determine_column_type([row.get(key) for row in data[:10]])
            analysis["column_types"][key] = column_type
            
            if column_type == "numeric":
                analysis["numeric_columns"].append(key)
            elif column_type == "categorical":
                analysis["categorical_columns"].append(key)
            elif column_type == "date":
                analysis["date_columns"].append(key)
        
        # Check for time series
        if analysis["date_columns"] and analysis["numeric_columns"]:
            analysis["has_time_series"] = True
        
        # Analyze data distribution
        for col in analysis["numeric_columns"]:
            values = [float(row[col]) for row in data if row[col] is not None]
            if values:
                analysis["data_distribution"][col] = {
                    "min": min(values),
                    "max": max(values),
                    "avg": sum(values) / len(values),
                    "range": max(values) - min(values)
                }
        
        return analysis
    
    def _determine_column_type(self, sample_values: List[Any]) -> str:
        """Determine the type of a column based on sample values."""
        if not sample_values:
            return "unknown"
        
        # Check for numeric values
        numeric_count = 0
        for value in sample_values:
            if value is not None:
                try:
                    float(value)
                    numeric_count += 1
                except (ValueError, TypeError):
                    pass
        
        if numeric_count / len(sample_values) > 0.8:
            return "numeric"
        
        # Check for date values
        date_count = 0
        for value in sample_values:
            if value is not None:
                try:
                    datetime.fromisoformat(str(value).replace('Z', '+00:00'))
                    date_count += 1
                except (ValueError, TypeError):
                    pass
        
        if date_count / len(sample_values) > 0.8:
            return "date"
        
        # Default to categorical
        return "categorical"
    
    def _recommend_chart_types(self, analysis: Dict[str, Any], query_intent: str) -> List[Dict[str, Any]]:
        """Recommend chart types based on data analysis."""
        recommendations = []
        
        # Time series charts
        if analysis["has_time_series"]:
            recommendations.append({
                "chart_type": "line",
                "confidence": 0.9,
                "reason": "Data contains time series with numeric values",
                "title": "Time Series Line Chart"
            })
        
        # Bar charts for categorical data
        if analysis["categorical_columns"] and analysis["numeric_columns"]:
            recommendations.append({
                "chart_type": "bar",
                "confidence": 0.8,
                "reason": "Good for comparing categories with numeric values",
                "title": "Bar Chart"
            })
        
        # Pie charts for proportions
        if len(analysis["categorical_columns"]) == 1 and len(analysis["numeric_columns"]) == 1:
            recommendations.append({
                "chart_type": "pie",
                "confidence": 0.7,
                "reason": "Good for showing proportions of categories",
                "title": "Pie Chart"
            })
        
        # Scatter plots for correlations
        if len(analysis["numeric_columns"]) >= 2:
            recommendations.append({
                "chart_type": "scatter",
                "confidence": 0.8,
                "reason": "Good for showing correlations between numeric variables",
                "title": "Scatter Plot"
            })
        
        # Heatmap for multiple dimensions
        if len(analysis["categorical_columns"]) >= 2 and analysis["numeric_columns"]:
            recommendations.append({
                "chart_type": "heatmap",
                "confidence": 0.7,
                "reason": "Good for showing relationships between multiple categories",
                "title": "Heatmap"
            })
        
        # Sort by confidence
        recommendations.sort(key=lambda x: x["confidence"], reverse=True)
        
        return recommendations
    
    async def _arun(self, data: str, query_intent: str = "") -> str:
        """Async version of data analysis."""
        # Ensure we return a string, not a coroutine
        result = self._run(data, query_intent)
        return result if isinstance(result, str) else str(result)


class EChartsConfigGeneratorTool(BaseTool):
    """Tool for generating ECharts configurations using LLM reasoning."""
    
    def __init__(self, litellm_service: Optional[LiteLLMService] = None, **kwargs):
        # Defensive: remove litellm_service from kwargs so BaseTool doesn't see unexpected field
        if 'litellm_service' in kwargs:
            litellm_service = kwargs.pop('litellm_service')
        # Set litellm_service without triggering pydantic attribute checks
        object.__setattr__(self, 'litellm_service', litellm_service)
        from pydantic import BaseModel, Field
        
        # Define explicit args_schema using Pydantic to enforce parameter structure
        class EChartsConfigArgs(BaseModel):
            """Schema for generate_echarts_config tool arguments."""
            data: str = Field(description="JSON string of the data to visualize (required)")
            chart_type: str = Field(default="auto", description="Type of chart: bar, line, pie, scatter, etc. (optional, default 'auto')")
            title: str = Field(default="", description="Chart title (optional)")
            analysis: str = Field(default="", description="Analysis context or instructions (optional)")
        
        try:
            super().__init__(
            name="generate_echarts_config",
                description="""Generate a complete ECharts 6 configuration based on data, chart type, and business context.

Parameters (use EXACTLY these names):
- data (required): JSON string of the data to visualize
- chart_type (optional, default "auto"): Type of chart (bar, line, pie, scatter, etc.)
- title (optional): Chart title
- analysis (optional): Analysis context or instructions

Example usage:
generate_echarts_config(data='[{"year":2024,"value":100}]', chart_type='bar', title='Sales by Year', analysis='Show year-over-year comparison')

DO NOT add extra parameters or variations. Use only: data, chart_type, title, analysis.""",
                args_schema=EChartsConfigArgs,
            **kwargs
        )
        except Exception:
            self.name = "generate_echarts_config"
            self.description = "Generate a complete ECharts 6 configuration based on data, chart type, and business context."
            self.args_schema = EChartsConfigArgs
            for k, v in kwargs.items():
                setattr(self, k, v)
    
    def _run(self, data: str = "", chart_type: str = "auto", title: str = "", analysis: str = "", **kwargs) -> str:
        """Generate ECharts configuration.
        
        Args:
            data: JSON string or data to visualize
            chart_type: Type of chart (auto, bar, line, pie, etc.)
            title: Chart title
            analysis: Analysis context or instructions
            **kwargs: Additional parameters (ignored to handle LLM variations)
        """
        try:
            # CRITICAL: Handle unexpected parameters from LLM (e.g., "analysis?")
            # Filter out any parameters that aren't in our signature
            # LangChain tools may pass extra parameters that the LLM generated
            
            # CRITICAL: chart_type is required by signature but may not be provided by LangChain
            # Make it optional with default "auto" to infer from data
            if not chart_type or chart_type == "":
                chart_type = "auto"
            
            # Handle data parameter - might come from kwargs if LLM structures it differently
            if not data and kwargs:
                data = kwargs.get("data", kwargs.get("data_str", ""))
            
            # Handle analysis parameter - might come from kwargs
            if not analysis and kwargs:
                analysis = kwargs.get("analysis", kwargs.get("analysis_text", ""))
            
            # Handle title parameter - might come from kwargs
            if not title and kwargs:
                title = kwargs.get("title", kwargs.get("chart_title", ""))
            
            # Log any unexpected parameters for debugging (but don't fail)
            unexpected_params = {k: v for k, v in kwargs.items() if k not in ["data", "data_str", "analysis", "analysis_text", "title", "chart_title", "chart_type"]}
            if unexpected_params:
                logger.debug(f"⚠️ EChartsConfigGeneratorTool._run received unexpected parameters (ignored): {list(unexpected_params.keys())}")
            
            # Handle empty or invalid data gracefully
            if not data or data.strip() == "":
                # Return a basic error configuration if no data (as JSON string)
                error_config = self._generate_default_chart_config(
                    None, 
                    title, 
                    error_message="No data available for chart generation. Please ensure your data source is connected and contains data."
                )
                return json.dumps(error_config)

            # Parse data if it's a JSON string, otherwise assume it's already List[Dict]
            parsed_data_list: Optional[List[Dict]] = None
            if isinstance(data, str):
                try:
                    # Try parsing directly first
                    parsed_data = json.loads(data)
                    
                    # CRITICAL: Handle different JSON formats
                    if isinstance(parsed_data, list):
                        # Already List[Dict] format - perfect
                        parsed_data_list = parsed_data
                    elif isinstance(parsed_data, dict):
                        # Object with arrays format: {"years": [...], "values": [...]}
                        # Convert to List[Dict] format: [{"year": "2024", "value": 100}, ...]
                        logger.info("⚠️ Data is in object-with-arrays format, converting to List[Dict]")
                        keys = list(parsed_data.keys())
                        if keys:
                            # Get length of first array
                            first_key = keys[0]
                            first_array = parsed_data[first_key]
                            if isinstance(first_array, list):
                                length = len(first_array)
                                # Convert to List[Dict]
                                parsed_data_list = []
                                for i in range(length):
                                    row = {}
                                    for key in keys:
                                        array = parsed_data.get(key, [])
                                        if isinstance(array, list) and i < len(array):
                                            row[key] = array[i]
                                    if row:
                                        parsed_data_list.append(row)
                                logger.info(f"✅ Converted object-with-arrays to List[Dict]: {len(parsed_data_list)} rows")
                            else:
                                logger.warning(f"⚠️ First value is not an array: {type(first_array)}")
                        else:
                            logger.warning("⚠️ Empty object, cannot convert")
                except json.JSONDecodeError:
                    # If that fails, try unescaping (handle double-encoded JSON)
                    try:
                        # Remove escaped quotes and try again
                        unescaped = data.replace('\\"', '"').replace("\\'", "'")
                        parsed_data = json.loads(unescaped)
                        if isinstance(parsed_data, list):
                            parsed_data_list = parsed_data
                    except (json.JSONDecodeError, AttributeError):
                        # If still fails, try one more time with string replacement
                        try:
                            # Handle cases where JSON is wrapped in quotes
                            if data.startswith('"') and data.endswith('"'):
                                parsed_data = json.loads(data[1:-1])
                                if isinstance(parsed_data, list):
                                    parsed_data_list = parsed_data
                            else:
                                # Last resort: check for error messages
                                if "NO_DATA" in data.upper() or "EMPTY" in data.upper() or "NOT FOUND" in data.upper():
                                    error_config = self._generate_default_chart_config(
                                        None,
                                        title,
                                        error_message="Your data source appears to be empty or not connected. Please check your data source connection."
                                    )
                                    return json.dumps(error_config)
                                error_config = self._generate_default_chart_config(
                                    None,
                                    title,
                                    error_message="Invalid data format provided for chart generation. Please ensure your query returns valid data."
                                )
                                return json.dumps(error_config)
                        except json.JSONDecodeError:
                            # Don't return error message as string - return a valid chart config with error
                            error_config = self._generate_default_chart_config(
                                None,
                                title,
                                error_message="Invalid data format provided for chart generation. Please ensure your query returns valid data."
                            )
                            # Return as JSON string (tool expects string return)
                            return json.dumps(error_config)
            
            # Validate parsed data
            if not parsed_data_list or len(parsed_data_list) == 0:
                # Return valid chart config with error message (as JSON string for tool)
                error_config = self._generate_default_chart_config(
                    None,
                    title,
                    error_message="The query returned no data. Please try a different query or check your data source."
                )
                return json.dumps(error_config)
            
            # Now 'parsed_data_list' is guaranteed to be List[Dict]
            data_list = parsed_data_list
            
            # LLM-based generation: Use LLM to generate the complete config if available
            if self.litellm_service:
                try:
                    # Use LLM to generate the complete ECharts config
                    llm_prompt = f"""Generate a complete ECharts 6 configuration for this data.

Chart Type: {chart_type}
Title: {title}
Analysis: {analysis}

Data Structure:
- Columns: {', '.join(data_list[0].keys()) if data_list and len(data_list) > 0 and isinstance(data_list[0], dict) else 'N/A'}
- Sample data (first 5 rows): {json.dumps(data_list[:5], indent=2, default=str) if data_list else '[]'}

Generate a complete, valid ECharts 6 JSON configuration with:
- title (object with text and show)
- tooltip (appropriate for chart type)
- legend (if multiple series)
- xAxis and yAxis (appropriate types)
- series (with name, type, data)
- Any other relevant options (grid, color, etc.)

Return ONLY valid JSON, no markdown code blocks or extra text."""
                    
                    # Note: generate_completion is async, but _run is sync
                    # We'll use sync version or make this async-aware
                    import asyncio
                    try:
                        loop = asyncio.get_event_loop()
                        if loop.is_running():
                            # If we're in an async context, we can't use sync LLM call
                            # Fall back to rule-based
                            logger.debug("Cannot use async LLM in sync _run, using rule-based generation")
                        else:
                            # Use active_model from litellm_service (respects user selection)
                            # Don't hardcode model preferences - let user's selection be used
                            preferred_model = None
                            try:
                                if hasattr(self, 'litellm_service') and self.litellm_service:
                                    # Use active_model if set, otherwise None (will use default in generate_completion)
                                    preferred_model = getattr(self.litellm_service, 'active_model', None)
                                    logger.info(f"🎯 Chart generation using model: {preferred_model or 'default'}")
                            except Exception:
                                preferred_model = None

                            llm_response = loop.run_until_complete(
                                self.litellm_service.generate_completion(
                                    prompt=llm_prompt,
                                    system_context="You are an ECharts 6 expert. Generate complete, valid ECharts configurations as JSON only.",
                                    max_tokens=2000,
                                    temperature=0.05,
                                    model_id=preferred_model  # Will use active_model if None
                                )
                            )
                            
                            if llm_response.get("success"):
                                content = llm_response.get("content", "").strip()
                                # Extract JSON from response
                                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                                if json_match:
                                    try:
                                        config = json.loads(json_match.group(0))
                                        if isinstance(config, dict) and "series" in config:
                                            logger.info("✅ LLM-generated ECharts config via tool")
                                            return f"ECharts Configuration:\n{json.dumps(config, indent=2)}"
                                    except json.JSONDecodeError:
                                        pass
                    except (RuntimeError, AttributeError):
                        # No event loop or can't use async in sync context
                        logger.debug("Cannot use async LLM in sync context, using rule-based generation")
                except Exception as llm_error:
                    logger.debug(f"LLM-based config generation in tool failed: {llm_error}, using fallback")
            
            # Fallback to rule-based generation if LLM not available or failed
            if chart_type == "line":
                config = self._generate_line_chart_config(data_list, title)
            elif chart_type == "bar":
                config = self._generate_bar_chart_config(data_list, title)
            elif chart_type == "pie":
                config = self._generate_pie_chart_config(data_list, title)
            elif chart_type == "scatter":
                config = self._generate_scatter_chart_config(data_list, title)
            elif chart_type == "heatmap":
                config = self._generate_heatmap_config(data_list, title)
            else:
                config = self._generate_default_chart_config(data_list, title)
            
            return f"ECharts Configuration:\n{json.dumps(config, indent=2)}"
            
        except Exception as e:
            logger.error(f"Error generating ECharts config: {e}", exc_info=True)
            # Always return a JSON-serializable dictionary as JSON string, even on error
            # Handle case where data might be a string or None
            parsed_data = None
            if isinstance(data, str):
                try:
                    parsed_data = json.loads(data)
                except Exception:
                    pass
            elif isinstance(data, list):
                parsed_data = data
            error_config = self._generate_default_chart_config(parsed_data, title, error_message=f"Chart generation failed: {str(e)}")
            return json.dumps(error_config)
    
    def _generate_line_chart_config(self, data: List[Dict], title: str) -> Dict[str, Any]:
        """Generate line chart configuration."""
        # Find date and numeric columns
        date_col = None
        numeric_cols = []
        
        for key in data[0].keys():
            if self._is_date_column([row.get(key) for row in data[:5]]):
                date_col = key
            elif self._is_numeric_column([row.get(key) for row in data[:5]]):
                numeric_cols.append(key)
        
        if not date_col or not numeric_cols:
            return self._generate_default_chart_config(data, title)
        
        # Prepare data
        x_data = [row[date_col] for row in data]
        series_data = []
        
        for col in numeric_cols:
            series_data.append({
                "name": col,
                "type": "line",
                "data": [row[col] for row in data]
            })
        
        return {
            "title": {"text": title or "Line Chart"},
            "tooltip": {"trigger": "axis"},
            "legend": {"data": numeric_cols},
            "xAxis": {
                "type": "category",
                "data": x_data
            },
            "yAxis": {"type": "value"},
            "series": series_data
        }
    
    def _generate_bar_chart_config(self, data: List[Dict], title: str) -> Dict[str, Any]:
        """Generate bar chart configuration."""
        # Find categorical and numeric columns
        categorical_cols = []
        numeric_cols = []
        
        for key in data[0].keys():
            if self._is_numeric_column([row.get(key) for row in data[:5]]):
                numeric_cols.append(key)
            else:
                categorical_cols.append(key)
        
        if not categorical_cols or not numeric_cols:
            return self._generate_default_chart_config(data, title)
        
        # Use first categorical column as x-axis
        x_col = categorical_cols[0]
        y_col = numeric_cols[0]
        
        x_data = [row[x_col] for row in data]
        y_data = [row[y_col] for row in data]
        
        return {
            "title": {"text": title or "Bar Chart"},
            "tooltip": {"trigger": "axis"},
            "xAxis": {
                "type": "category",
                "data": x_data
            },
            "yAxis": {"type": "value"},
            "series": [{
                "name": y_col,
                "type": "bar",
                "data": y_data
            }]
        }
    
    def _generate_pie_chart_config(self, data: List[Dict], title: str) -> Dict[str, Any]:
        """Generate pie chart configuration."""
        # Find categorical and numeric columns
        categorical_cols = []
        numeric_cols = []
        
        for key in data[0].keys():
            if self._is_numeric_column([row.get(key) for row in data[:5]]):
                numeric_cols.append(key)
            else:
                categorical_cols.append(key)
        
        if not categorical_cols or not numeric_cols:
            return self._generate_default_chart_config(data, title)
        
        # Use first categorical and numeric columns
        label_col = categorical_cols[0]
        value_col = numeric_cols[0]
        
        pie_data = [{"name": row[label_col], "value": row[value_col]} for row in data]
        
        return {
            "title": {"text": title or "Pie Chart"},
            "tooltip": {"trigger": "item"},
            "series": [{
                "name": value_col,
                "type": "pie",
                "data": pie_data
            }]
        }
    
    def _generate_scatter_chart_config(self, data: List[Dict], title: str) -> Dict[str, Any]:
        """Generate scatter plot configuration."""
        # Find numeric columns
        numeric_cols = []
        
        for key in data[0].keys():
            if self._is_numeric_column([row.get(key) for row in data[:5]]):
                numeric_cols.append(key)
        
        if len(numeric_cols) < 2:
            return self._generate_default_chart_config(data, title)
        
        # Use first two numeric columns
        x_col = numeric_cols[0]
        y_col = numeric_cols[1]
        
        scatter_data = [[row[x_col], row[y_col]] for row in data]
        
        return {
            "title": {"text": title or "Scatter Plot"},
            "tooltip": {"trigger": "item"},
            "xAxis": {"type": "value"},
            "yAxis": {"type": "value"},
            "series": [{
                "name": f"{x_col} vs {y_col}",
                "type": "scatter",
                "data": scatter_data
            }]
        }
    
    def _generate_heatmap_config(self, data: List[Dict], title: str) -> Dict[str, Any]:
        """Generate heatmap configuration."""
        # Simplified heatmap - in production, you'd implement proper heatmap logic
        return self._generate_default_chart_config(data, title)
    
    def _generate_default_chart_config(self, data: Optional[List[Dict]] = None, title: str = "Chart", error_message: Optional[str] = None) -> Dict[str, Any]:
        """Generate default chart configuration with proper ECharts structure."""
        config = {
            "title": {
                "text": title or "Chart",
                "show": False  # Hide title by default, let frontend handle it
            },
            "tooltip": {
                "trigger": "axis",
                "axisPointer": {
                    "type": "shadow"
                }
            },
            "grid": {
                "left": "3%",
                "right": "4%",
                "bottom": "3%",
                "containLabel": True
            },
            "series": [{
                "name": "Data",
                "type": "bar",
                "data": []
            }]
        }
        
        # If data provided, try to extract basic structure
        if data and len(data) > 0:
            first_row = data[0]
            if isinstance(first_row, dict):
                keys = list(first_row.keys())
                if len(keys) >= 2:
                    config["xAxis"] = {
                        "type": "category",
                        "data": [str(row.get(keys[0], "")) for row in data[:20]]  # Limit to 20 for performance
                    }
                    config["yAxis"] = {"type": "value"}
                    config["series"][0]["data"] = [row.get(keys[1], 0) for row in data[:20]]
                    config["series"][0]["name"] = keys[1]
        
        if error_message:
            config["error"] = error_message
        
        return config
    
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
    
    def _infer_data_schema(self, data: List[Dict]) -> Dict[str, Any]:
        """Infer schema from query results data."""
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
            date_count = sum(1 for v in sample_values if self._is_date_column([v]))
            
            if numeric_count / len(sample_values) > 0.8:
                schema[column_name] = {"type": "numeric", "nullable": False}
            elif date_count / len(sample_values) > 0.8:
                schema[column_name] = {"type": "date", "nullable": False}
            else:
                schema[column_name] = {"type": "string", "nullable": False}
        
        return schema
    
    async def _arun(self, data: str = "", chart_type: str = "auto", title: str = "", analysis: str = "", **kwargs) -> str:
        """Async version of ECharts config generation.
        
        Args:
            data: JSON string or data to visualize
            chart_type: Type of chart (auto, bar, line, pie, etc.)
            title: Chart title
            analysis: Analysis context or instructions
            **kwargs: Additional parameters (ignored to handle LLM variations)
        """
        # CRITICAL: Handle unexpected parameters from LLM (e.g., "analysis?")
        # Filter out any parameters that aren't in our signature
        # LangChain tools may pass extra parameters that the LLM generated
        
        # CRITICAL: chart_type is required by signature but may not be provided by LangChain
        # Make it optional with default "auto" to infer from data
        if not chart_type or chart_type == "":
            chart_type = "auto"
        
        # Handle data parameter - might come from kwargs if LLM structures it differently
        if not data and kwargs:
            data = kwargs.get("data", kwargs.get("data_str", ""))
        
        # Handle analysis parameter - might come from kwargs
        if not analysis and kwargs:
            analysis = kwargs.get("analysis", kwargs.get("analysis_text", ""))
        
        # Handle title parameter - might come from kwargs
        if not title and kwargs:
            title = kwargs.get("title", kwargs.get("chart_title", ""))
        
        # Log any unexpected parameters for debugging (but don't fail)
        unexpected_params = {k: v for k, v in kwargs.items() if k not in ["data", "data_str", "analysis", "analysis_text", "title", "chart_title", "chart_type"]}
        if unexpected_params:
            logger.debug(f"⚠️ EChartsConfigGeneratorTool received unexpected parameters (ignored): {list(unexpected_params.keys())}")
        
        # For async, we can use the LLM service directly if available
        if self.litellm_service:
            try:
                # Parse data if needed
                parsed_data = data
                if isinstance(data, str):
                    try:
                        parsed_data = json.loads(data)
                    except json.JSONDecodeError:
                        pass
                
                if isinstance(parsed_data, list) and len(parsed_data) > 0:
                    # Use LLM to generate config
                    llm_prompt = f"""Generate a complete ECharts 6 configuration.

Chart Type: {chart_type}
Title: {title}
Analysis: {analysis}

Data: {json.dumps(parsed_data[:10], indent=2, default=str)}

Return ONLY valid JSON configuration."""
                    # Append Pydantic format instructions if available to encourage strict JSON output
                    try:
                        from app.modules.ai.utils.structured_output import StructuredOutputHandler
                        from app.modules.ai.schemas.agent_outputs import EChartsConfigModel
                        fmt_handler = StructuredOutputHandler(EChartsConfigModel)
                        fmt_instructions = fmt_handler.get_format_instructions()
                        llm_prompt = f"{llm_prompt}\n\nFormat instructions:\n{fmt_instructions}"
                    except Exception:
                        pass
                    
                    # Use active_model from litellm_service (respects user selection)
                    # Don't hardcode model preferences - let user's selection be used
                    preferred_model = None
                    try:
                        if hasattr(self, 'litellm_service') and self.litellm_service:
                            # Use active_model if set, otherwise None (will use default in generate_completion)
                            preferred_model = getattr(self.litellm_service, 'active_model', None)
                            logger.info(f"🎯 Chart generation (async) using model: {preferred_model or 'default'}")
                    except Exception:
                        preferred_model = None

                    llm_response = await self.litellm_service.generate_completion(
                        prompt=llm_prompt,
                        system_context="Generate complete ECharts 6 JSON configurations. RETURN ONLY VALID JSON.",
                        max_tokens=2000,
                        temperature=0.05,
                        model_id=preferred_model  # Will use active_model if None
                    )
                    
                    if llm_response.get("success"):
                        content = llm_response.get("content", "").strip()
                        json_match = re.search(r'\{.*\}', content, re.DOTALL)
                        if json_match:
                            try:
                                config = json.loads(json_match.group(0))
                                if isinstance(config, dict):
                                    return f"ECharts Configuration:\n{json.dumps(config, indent=2)}"
                            except json.JSONDecodeError:
                                pass
            except Exception as e:
                logger.debug(f"Async LLM config generation failed: {e}")
        
        # Fallback to sync _run (pass kwargs to handle any unexpected parameters)
        result = self._run(data, chart_type, title, analysis, **kwargs)
        return result if isinstance(result, str) else str(result)


class IntelligentChartGenerationAgent:
    """
    Intelligent Chart Generation Agent for optimal ECharts configurations.
    
    This agent analyzes data characteristics and user intent to generate
    the most appropriate chart visualizations with ECharts 6.
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
        """Initialize tools for chart generation agent."""
        tools = []
        
        tools.append(ChartAnalysisTool())
        # Pass litellm_service to enable LLM-based config generation in tool
        tools.append(EChartsConfigGeneratorTool(litellm_service=self.litellm_service))
        
        return tools
    
    def _initialize_agent(self) -> AgentExecutor:
        """Initialize the chart generation agent."""
        messages = [
            ("system", """You are an expert data visualization specialist specializing in enterprise business intelligence dashboards. Your job is to create optimal, production-ready ECharts 6 configurations using AI reasoning.

**CRITICAL: Tool Usage Rules**
When calling the `generate_echarts_config` tool, you MUST use EXACTLY these parameters:
- `data`: (required) The data as a JSON string
- `chart_type`: (optional, default "auto") The type of chart (bar, line, pie, scatter, etc.)
- `title`: (optional) The chart title
- `analysis`: (optional) Analysis context or instructions

DO NOT add extra parameters like "analysis?" or any other variations. Only use the exact parameter names listed above.
**CRITICAL: Call `generate_echarts_config` ONLY ONCE - do not invoke it multiple times.**

**Your Role:**
You are an AI agent that uses tools and reasoning to generate complete ECharts configurations. You should:
1. **FIRST**: Use the `analyze_data_for_chart` tool to understand data characteristics and get chart type recommendations
   - This tool uses LLM-based intent recognition and returns recommended chart types with confidence scores
   - **ALWAYS use the recommendation with HIGHEST confidence** for the chart_type parameter
   - The confidence scores are from LLM analysis - trust them for optimal results
2. **THEN**: Use the `generate_echarts_config` tool ONCE to create the actual chart configuration
   - **Call `generate_echarts_config` ONLY ONCE** - one call is sufficient, do not invoke multiple times
   - When calling `generate_echarts_config`, use ONLY: data, chart_type, title, analysis
   - `chart_type` should be the chart type with **HIGHEST confidence** from recommendations (e.g., "bar", "line", "pie") OR "auto" if no recommendation fits
   - `data` comes from query execution results (already provided)
   - Do NOT add question marks, extra parameters, or variations
   - Do NOT call `generate_echarts_config` multiple times
3. BUT: You can also generate the complete ECharts config directly in your response if you have enough information (without using tools)

**Enterprise Visualization Expertise:**
- Handle large datasets with proper aggregation and sampling strategies
- Create charts that tell business stories, not just display data
- Understand business context (KPIs, metrics, trends, comparisons)
- Optimize for performance (lazy loading, data sampling, efficient rendering)
- Design for different user roles (executive dashboards, analyst tools, operational reports)
- Handle time-series data, multi-dimensional analysis, and drill-down capabilities
- Ensure accessibility and responsive design

**ECharts 6 Configuration Requirements:**
Your output MUST be a complete, valid ECharts 6 configuration JSON object with:
- `title`: Chart title object with `text` and `show` properties
- `tooltip`: Tooltip configuration (usually `{{"trigger": "axis"}}` or `{{"trigger": "item"}}`)
- `legend`: Legend configuration if multiple series
- `xAxis`: X-axis configuration (type: "category" or "value" or "time")
- `yAxis`: Y-axis configuration (type: "value")
- `series`: Array of series objects with `name`, `type`, `data` properties
- Optional: `grid`, `color`, `dataZoom`, etc. for better UX

**Guidelines:**
1. ALWAYS generate a COMPLETE ECharts configuration - don't just recommend, actually create it
2. Consider the business question being answered, not just the data structure
3. Use appropriate chart types based on data AND intent (line for trends, bar for comparisons, pie for proportions, etc.)
4. Ensure configurations are responsive, interactive, and performant
5. Handle edge cases (empty data, outliers, missing values) gracefully
6. Consider user experience (tooltips, legends, axis labels, color schemes)
7. If you use tools, synthesize their outputs into a complete config

**Available tools:**
- `analyze_data_for_chart`: Analyze data structure and recommend chart types (use this to understand the data)
- `generate_echarts_config`: Generate ECharts configuration (use this OR generate directly)

**Output Format:**
Provide your final ECharts configuration as valid JSON. You can either:
1. Use the tools and then provide the complete config in your response
2. Generate the complete config directly based on your analysis

**CRITICAL:** Always end your response with a complete, valid ECharts 6 JSON configuration that can be directly used by the frontend."""),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad")
        ]
        try:
            prompt = ChatPromptTemplate.from_messages(messages)
        except Exception:
            # Fallback: simple concatenation of system and human messages
            sys_msg = messages[0][1] if messages and isinstance(messages[0], tuple) else ""
            human_msg = "{input}"
            prompt = sys_msg + "\n\n" + human_msg
        
        llm = self.litellm_service.get_llm()
        # If LangChain tool-calling agent factory is unavailable, provide a safe stub
        if not callable(create_tool_calling_agent) or AgentExecutor is None:
            logger.warning("⚠️ LangChain create_tool_calling_agent or AgentExecutor unavailable, using local stub agent")
            class _AgentStub:
                def __init__(self, tools):
                    self.tools = tools
                async def ainvoke(self, inputs):
                    # Minimal stub: attempt to run EChartsConfigGeneratorTool with available data if present
                    try:
                        # Try to find JSON data inside the 'input' string
                        text = inputs.get("input") if isinstance(inputs, dict) else ""
                        import re, json
                        m = re.search(r'\{[\s\S]*"sample_data"[\s\S]*\}', text)
                        data_payload = None
                        if m:
                            # try to parse sample_data inside the JSON-like block
                            try:
                                parsed_block = json.loads(m.group(0))
                                data_payload = parsed_block.get("sample_data") or parsed_block.get("sample_rows") or None
                            except Exception:
                                data_payload = None
                        # Fallback: no structured sample found - return empty output to trigger rule-based fallback
                        return {"output": "" if not data_payload else json.dumps({"series": [], "data_sample_used": True})}
                    except Exception as e:
                        logger.debug(f"AgentStub.ainvoke failed: {e}")
                        return {"output": ""}
            agent = _AgentStub(self.tools)
        else:
            agent = create_tool_calling_agent(llm, self.tools, prompt)
        
        # CRITICAL: Create custom callback handler to identify agent in logs
        from langchain_core.callbacks import BaseCallbackHandler
        
        class AgentIdentifierCallback(BaseCallbackHandler):
            def __init__(self, agent_name: str):
                super().__init__()
                self.agent_name = agent_name
            
            def on_chain_start(self, serialized: Dict[str, Any], inputs: Dict[str, Any], **kwargs) -> None:
                logger.info("🤖 [CHART_GENERATION_AGENT] Entering AgentExecutor chain")
            
            def on_chain_end(self, outputs: Dict[str, Any], **kwargs) -> None:
                logger.info("✅ [CHART_GENERATION_AGENT] Finished AgentExecutor chain")
        
        # CRITICAL: Handle case when AgentExecutor is None (LangChain unavailable)
        # NOTE: This is only used by the old orchestrator. LangGraph uses nodes instead.
        if AgentExecutor is None:
            logger.warning("⚠️ AgentExecutor is None - LangChain not available. Chart generation agent will use fallback mode.")
            # Return a stub agent executor that can still be used for basic operations
            class _StubAgentExecutor:
                def __init__(self, tools):
                    self.tools = tools
                    self.agent = None
                
                async def ainvoke(self, inputs):
                    logger.warning("⚠️ Chart generation agent stub called - LangChain not available")
                    return {"output": "Chart generation requires LangChain. Please install langchain package."}
            
            return _StubAgentExecutor(self.tools)
        
        callback = AgentIdentifierCallback("chart_generation")
        agent_executor = AgentExecutor(
            agent=agent, 
            tools=self.tools, 
            verbose=True,
            callbacks=[callback]
        )
        
        return agent_executor
    
    def _infer_data_schema(self, data: List[Dict]) -> Dict[str, Any]:
        """Infer schema from query results data."""
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
            
            # Infer type - use helper methods from EChartsConfigGeneratorTool
            numeric_count = sum(1 for v in sample_values if isinstance(v, (int, float)) or (isinstance(v, str) and v.replace('.', '', 1).replace('-', '', 1).isdigit()))
            # Check if date-like
            date_count = 0
            for v in sample_values:
                try:
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
    
    async def generate_chart(
        self,
        data: List[Dict],
        query_intent: str = "",
        title: str = "",
        context: Optional[AgentContextSchema] = None,
        use_llm_based: bool = True  # Use LLM-based chart generation by default
    ) -> Dict[str, Any]:
        """
        Generate optimal chart configuration from data.
        
        Args:
            data: Data to visualize
            query_intent: User's intent or query context
            title: Chart title
            context: User context for personalization
            use_llm_based: Use LLM-based generation (replaces hard-coded logic)
            
        Returns:
            Chart configuration with metadata
        """
        # CRITICAL: Validate input using Pydantic model
        validation_error_var = None
        try:
            from app.modules.ai.utils.input_validation import InputValidator
            validated_input, validation_error = InputValidator.validate_chart_input(
                data=data,
                query_intent=query_intent,
                title=title,
                context=context.model_dump() if context and hasattr(context, 'model_dump') else (context.dict() if context and hasattr(context, 'dict') else None)
            )

            validation_error_var = validation_error
            if validation_error:
                logger.warning(f"⚠️ Chart generation input validation failed: {validation_error}")
                # Continue with validation error logged, but use original inputs
                # This allows graceful degradation
            else:
                # Use validated input (guard in case validated_input is None)
                if validated_input is not None:
                    try:
                        data = validated_input.data
                        query_intent = validated_input.query_intent
                        title = validated_input.title
                        logger.debug("✅ Chart generation input validated successfully")
                    except Exception as assign_exc:
                        logger.debug(f"⚠️ Unable to apply validated input attributes: {assign_exc}")
        except Exception as validation_exception:
            validation_error_var = str(validation_exception)
            logger.debug(f"Input validation not available: {validation_exception}, proceeding without validation")
        
        # CRITICAL: Validate data first (fallback check)
        if not data or len(data) == 0:
            return {
                "success": False,
                "error": "no_data",
                "message": "No data available for chart generation",
                "user_message": "I couldn't generate a chart because your query returned no data. Please try a different question or check your data source connection.",
                "primary_chart": None,
                "echarts_config": None,
                "input_validation_error": validation_error_var if 'validation_error_var' in locals() else None
            }
        
        # Use LLM-based generation if enabled (replaces hard-coded logic)
        # DISABLED for now - use existing reliable method
        # if use_llm_based:
        #     try:
        #         from app.modules.ai.agents.llm_based_chart_agent import LLMBasedChartAgent
        #         llm_agent = LLMBasedChartAgent(self.litellm_service)
        #         result = await llm_agent.generate_chart(
        #             data=data,
        #             query_intent=query_intent,
        #             title=title,
        #             context=context
        #         )
        #         
        #         if result.get("success"):
        #             logger.info(f"✅ LLM-based chart generated: type={result.get('chart_type')}, confidence={result.get('confidence')}")
        #             return result
        #         else:
        #             logger.warning(f"⚠️ LLM-based chart generation failed: {result.get('error')}, falling back to traditional method")
        #     except Exception as e:
        #         logger.warning(f"⚠️ LLM-based chart agent not available: {e}, using traditional method")
        
        # LLM-based generation using LangChain agent (AI-native approach)
        start_time = time.time()
        reasoning_steps = []
        
        try:
            # Step 1: Use LLM agent to analyze data and generate full ECharts config
            analysis_step = ReasoningStepSchema(
                step_number=1,
                step_id="llm_data_analysis",
                step_type="llm_data_analysis",
                description="LLM analyzing data characteristics and business context",
                confidence=0.9
            )
            reasoning_steps.append(analysis_step)
            
            # Prepare comprehensive prompt for LLM agent
            # Include sample data (first 20 rows for context, but not all to save tokens)
            sample_data = data[:20] if len(data) > 20 else data
            
            # Infer query result schema for better chart generation
            query_result_schema = self._infer_data_schema(data) if data and len(data) > 0 else {}
            logger.info(f"📊 Inferred query result schema: {len(query_result_schema)} columns with types")
            
            data_summary = {
                "total_rows": len(data),
                "sample_rows": len(sample_data),
                "columns": list(data[0].keys()) if data else [],
                "column_schema": query_result_schema,  # ADDED: Schema information
                "sample_data": sample_data
            }
            
            # Build context-aware prompt
            business_context = ""
            if context is not None and hasattr(context, 'business_context') and context.business_context:
                business_context = f"\nBusiness Context: {context.business_context}"
            
            user_role_context = ""
            if context is not None and hasattr(context, 'user_role') and context.user_role:
                user_role_context = f"\nUser Role: {context.user_role.value if hasattr(context.user_role, 'value') else context.user_role}"
            
            # CRITICAL: Check if chart recommendations with confidence scores are already available from summary analysis
            chart_recommendations_context = ""
            highest_confidence_chart_type = None
            if context is not None and hasattr(context, 'chart_recommendations') and context.chart_recommendations:
                chart_recs = context.chart_recommendations
                if isinstance(chart_recs, list) and len(chart_recs) > 0:
                    # Sort by confidence (highest first)
                    sorted_recs = sorted(chart_recs, key=lambda x: x.get("confidence", 0), reverse=True)
                    highest = sorted_recs[0]
                    highest_confidence_chart_type = highest.get("chart_type")
                    chart_recommendations_context = f"""

**CRITICAL: Chart Recommendations from Summary Analysis (USE HIGHEST CONFIDENCE):**
{json.dumps(sorted_recs[:3], indent=2, default=str)}

**IMPORTANT:** Use the chart type with HIGHEST confidence ({highest_confidence_chart_type} with {highest.get('confidence', 0):.2f}) for the chart_type parameter.
These recommendations are from LLM analysis - trust them for optimal results.
Do NOT call `analyze_data_for_chart` again - use these existing recommendations."""
                    logger.info(f"✅ Using existing chart recommendations from summary analysis: {highest_confidence_chart_type} (confidence: {highest.get('confidence', 0):.2f})")
            
            agent_input = {
                "input": f"""Generate an optimal ECharts 6 configuration for this data visualization request.
{chart_recommendations_context}

**User Query/Intent:** {query_intent or "Visualize the data"}
**Chart Title:** {title or "Data Visualization"}
{business_context}
{user_role_context}

**Data Summary:**
- Total rows: {len(data)}
- Columns: {', '.join(data[0].keys()) if data else 'N/A'}

**Query Result Schema (IMPORTANT for accurate chart generation):**
{json.dumps(query_result_schema, indent=2, default=str)}

This schema tells you:
- Column data types (numeric, date, categorical)
- Which columns are nullable
- Sample values for each column
- Unique value counts for categorical columns

**Sample Data (first {len(sample_data)} rows):**
{json.dumps(sample_data, indent=2, default=str)}

**Your Task:**
1. **IF chart recommendations are provided above**: Use the chart type with HIGHEST confidence directly - do NOT call `analyze_data_for_chart` again
   - The recommendations above are from summary analysis with confidence scores
   - Use the highest confidence chart type for the chart_type parameter
   - Skip the `analyze_data_for_chart` tool call to avoid redundancy
2. **IF no chart recommendations provided**: Use the `analyze_data_for_chart` tool to understand the data structure and get chart type recommendations
   - This tool uses LLM-based intent recognition and returns recommended chart types with confidence scores
   - **ALWAYS use the recommendation with HIGHEST confidence** for the chart_type parameter
   - The confidence scores are from LLM analysis - trust them for optimal results
3. **THEN**: Based on the analysis and recommendations, use the `generate_echarts_config` tool ONCE to create a complete, production-ready ECharts 6 configuration
   **CRITICAL**: 
   - Call `generate_echarts_config` ONLY ONCE - do not invoke it multiple times
   - When calling `generate_echarts_config`, use ONLY these exact parameters:
     - `data`: The data as JSON string (from query execution results)
     - `chart_type`: The chart type with HIGHEST confidence from recommendations (e.g., "bar", "line", "pie") OR "auto" if no recommendation fits
     - `title`: The chart title
     - `analysis`: Analysis context or instructions
   - DO NOT add extra parameters or variations like "analysis?" or any other names.
   - DO NOT call `generate_echarts_config` multiple times - one call is sufficient
3. Consider:
   - The business question being answered (from query intent)
   - Data characteristics (types, relationships, distributions)
   - Best chart type for the data AND the question
   - User experience (tooltips, legends, colors, interactivity)
   - Performance (data sampling if needed, efficient rendering)
   - Dashboard integration (responsive, consistent styling)

**Important:**
- Generate a COMPLETE ECharts 6 configuration (title, tooltip, legend, xAxis, yAxis, series, etc.)
- The configuration must be valid JSON that can be directly used by ECharts
- Consider the business context and user intent, not just the data structure
- Ensure the chart tells a story and helps with decision-making

**Output Format:**
Provide the complete ECharts configuration as valid JSON. Use the tools to help you, but generate the final config yourself based on your analysis.""",
                "chat_history": []
            }
            
            # Execute LLM agent (it will use tools and generate the config)
            logger.info(f"🤖 [CHART_GENERATION_AGENT] Executing LLM-based chart generation agent for {len(data)} rows")
            logger.info(f"   Input: {len(agent_input.get('input', ''))} chars")
            result = await self.agent.ainvoke(agent_input)
            logger.info("✅ [CHART_GENERATION_AGENT] Agent execution completed")
            
            # Extract chart configuration from agent result
            # The agent should have generated a complete ECharts config
            agent_output = result.get("output", "")
            logger.info(f"📊 Agent output length: {len(agent_output)} chars")
            
            # OPTION: Try structured output parsing first (if enabled)
            # This provides type safety and guaranteed fields
            use_structured_outputs = True  # Feature flag - can be made configurable
            chart_config = None
            parsing_success = False
            
            if use_structured_outputs:
                try:
                    from app.modules.ai.utils.structured_output import StructuredOutputHandler
                    from app.modules.ai.schemas.agent_outputs import ChartGenerationOutput
                    
                    handler = StructuredOutputHandler(ChartGenerationOutput)
                    structured_output, error_info = handler.parse_output(agent_output)
                    
                    if structured_output:
                        # Successfully parsed structured output - guaranteed fields
                        chart_config = structured_output.echarts_config.model_dump() if hasattr(structured_output.echarts_config, 'model_dump') else structured_output.echarts_config.dict()
                        parsing_success = True
                        logger.info(f"✅ Structured output parsing succeeded: type={structured_output.chart_type}, confidence={structured_output.confidence}")
                    else:
                        logger.warning(f"⚠️ Structured output parsing failed: {error_info.get('error_type', 'unknown') if error_info else 'unknown'}, falling back to text extraction")
                except Exception as structured_error:
                    logger.debug(f"Structured output parsing not available: {structured_error}, using text extraction")
            
            # Fallback to text extraction if structured parsing failed or not enabled
            if not chart_config:
                chart_config = self._extract_chart_config_from_result(agent_output)
            
            # CRITICAL: Validate the extracted config using ECharts validation
            from app.modules.ai.utils.echarts_validation import validate_echarts_config
            if chart_config:
                is_valid, error_msg, validated_config = validate_echarts_config(chart_config, strict=False)
                if is_valid and validated_config:
                    chart_config = validated_config
                    logger.info("✅ Chart config validated successfully")
                else:
                    logger.warning(f"⚠️ Chart config failed validation: {error_msg}, using fallback")
                    chart_config = self._generate_fallback_chart(data, title)
            else:
                logger.warning("⚠️ LLM agent did not generate chart config, using fallback")
                chart_config = self._generate_fallback_chart(data, title)
            
            # Step 2: Optimize for dashboard integration (lightweight post-processing)
            optimization_step = ReasoningStepSchema(
                step_number=2,
                step_id="dashboard_optimization",
                step_type="dashboard_optimization",
                description="Optimizing LLM-generated chart for dashboard integration",
                confidence=0.8
            )
            reasoning_steps.append(optimization_step)
            
            # Light optimization (just ensure required fields, don't override LLM decisions)
            optimized_config = self._optimize_for_dashboard(chart_config)
            
            # Step 3: Generate alternative chart types (OPTIMIZED: Skip to save tokens)
            # Alternative charts are nice-to-have but not essential - skip LLM call
            alternatives_step = ReasoningStepSchema(
                step_number=3,
                step_id="alternative_charts",
                step_type="alternative_charts",
                description="Skipped alternative chart generation (cost optimization)",
                confidence=0.0
            )
            reasoning_steps.append(alternatives_step)
            
            # OPTIMIZATION: Skip alternative chart generation to save 1 LLM call
            # Primary chart is sufficient for user needs
            alternative_configs = []
            logger.info("⏭️ Skipping alternative chart generation (cost optimization - saved 1 LLM call)")
            
            # If we want to add alternatives in the future, we can do it without LLM:
            # - Use rule-based suggestions based on chart type
            # - Or make it optional via parameter
            # For now, skip to optimize cost
            
            # Calculate execution time
            execution_time = int((time.time() - start_time) * 1000)
            
            logger.info(f"✅ LLM-based chart generation complete: type={optimized_config.get('series', [{}])[0].get('type', 'unknown') if optimized_config.get('series') else 'unknown'}, time={execution_time}ms")
            
            return {
                "primary_chart": optimized_config,
                "echarts_config": optimized_config,  # Ensure echarts_config is set
                "alternative_charts": alternative_configs,
                "recommendations": self._generate_chart_recommendations(data),
                "reasoning_steps": [step.dict() for step in reasoning_steps],
                "execution_time_ms": execution_time,
                "success": True,
                "generation_method": "llm_based"  # Indicate LLM-based generation
            }
            
        except Exception as e:
            logger.error(f"Error generating chart: {e}", exc_info=True)
            
            # Fallback to simple chart - always return something
            try:
                # Use _generate_default_chart_config directly (it handles errors)
                fallback_config = self._generate_default_chart_config(data, title, str(e))
            except Exception as fallback_error:
                logger.error(f"Fallback chart generation also failed: {fallback_error}")
                # Last resort - return minimal valid chart without error message
                fallback_config = self._generate_default_chart_config(data, title)
            
            return {
                "primary_chart": fallback_config,
                "echarts_config": fallback_config,  # Ensure echarts_config is set
                "alternative_charts": [],
                "recommendations": [],
                "reasoning_steps": [step.dict() for step in reasoning_steps] if reasoning_steps else [],
                "execution_time_ms": int((time.time() - start_time) * 1000),
                "success": True,  # Still successful with fallback
                "is_fallback": True,
                "error": str(e)
            }
    
    def _extract_chart_config_from_result(self, result_text: str) -> Dict[str, Any]:
        """Extract chart configuration from agent result, making parsing more robust."""
        logger.info("Attempting to extract chart config from result_text (first 500 chars):\n%s", result_text[:500])

        try:
            import re
            import json
            from app.modules.ai.utils.echarts_validation import fix_json_string, validate_echarts_config
        except Exception:
            import re
            import json  # fallback if validation helpers not present
            def fix_json_string(s):
                return s
            def validate_echarts_config(cfg, strict=False):
                return (isinstance(cfg, dict) and 'series' in cfg, '', cfg if isinstance(cfg, dict) else None)

        # 1) Try fenced JSON blocks
        json_match = re.search(r'```json\s*(\{[\s\S]*?\})\s*```', result_text, re.IGNORECASE)
        if not json_match:
            # 2) Try plain JSON object containing "series"
            json_match = re.search(r'(\{[\s\S]*"series"[\s\S]*?\})', result_text, re.DOTALL | re.IGNORECASE)

        if not json_match:
            # 3) Try to find JSON after a label like "ECharts Configuration:"
            json_match = re.search(r'(?:ECharts Configuration|echarts_config|chart config)[:\s]*(\{[\s\S]*\})', result_text, re.IGNORECASE)

        if not json_match:
            return {}

        raw_json = json_match.group(1)
        fixed = fix_json_string(raw_json)
        try:
            cfg = json.loads(fixed)
        except json.JSONDecodeError:
            # Last attempt: remove trailing commas then parse
            fixed = re.sub(r',\s*}', '}', fixed)
            fixed = re.sub(r',\s*\]', ']', fixed)
            try:
                cfg = json.loads(fixed)
            except Exception:
                return {}

        is_valid, err_msg, validated = validate_echarts_config(cfg, strict=False)
        if is_valid and validated:
            return validated
        return {}