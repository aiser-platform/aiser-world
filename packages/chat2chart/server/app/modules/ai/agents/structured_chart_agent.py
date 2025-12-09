"""
Structured Chart Generation Agent using Pydantic Models

This is an example implementation showing how to use Pydantic models with
LangChain's StructuredOutputParser for robust, type-safe chart generation.
"""

import json
import logging
import time
from typing import Dict, List, Optional, Any

from langchain_core.output_parsers import StrOutputParser

from app.modules.ai.services.litellm_service import LiteLLMService
from app.modules.ai.schemas.agent_outputs import (
    ChartGenerationOutput,
    ChartType
)
from app.modules.ai.utils.structured_output import StructuredOutputHandler
from app.modules.chats.schemas import AgentContextSchema

logger = logging.getLogger(__name__)


class StructuredChartGenerationAgent:
    """
    Chart Generation Agent using Pydantic models for structured outputs.
    
    This ensures:
    - Type safety and validation
    - Guaranteed field presence
    - Robust error handling
    - Complete field tracking
    """
    
    def __init__(self, litellm_service: LiteLLMService):
        object.__setattr__(self, 'litellm_service', litellm_service)
        self.output_handler = StructuredOutputHandler(ChartGenerationOutput)
    
    async def generate_chart(
        self,
        data: List[Dict],
        query_intent: str = "",
        title: str = "",
        context: Optional[AgentContextSchema] = None
    ) -> Dict[str, Any]:
        """
        Generate chart using structured output parsing.
        
        Returns:
            Dict with structured ChartGenerationOutput and metadata
        """
        start_time = time.time()
        
        try:
            # Prepare data summary
            sample_data = data[:20] if len(data) > 20 else data
            {
                "total_rows": len(data),
                "columns": list(data[0].keys()) if data else [],
                "sample_data": sample_data
            }
            
            # Build prompt with format instructions
            base_prompt = f"""Generate an optimal ECharts 6 configuration for this data visualization request.

**User Query/Intent:** {query_intent or "Visualize the data"}
**Chart Title:** {title or "Data Visualization"}

**Data Summary:**
- Total rows: {len(data)}
- Columns: {', '.join(data[0].keys()) if data else 'N/A'}

**Sample Data (first {len(sample_data)} rows):**
{json.dumps(sample_data, indent=2, default=str)}

**Your Task:**
1. Analyze the data structure and characteristics
2. Determine the optimal chart type based on data AND user intent
3. Generate a complete, valid ECharts 6 configuration
4. Provide reasoning for your chart type selection
5. Calculate confidence score (0-1) based on data quality and chart appropriateness

**Requirements:**
- Chart config must be complete with title, tooltip, legend (if needed), xAxis, yAxis, series
- Chart type must be one of: bar, line, pie, scatter, area, heatmap, radar, gauge, funnel
- Confidence must be between 0.0 and 1.0
- Reasoning must explain why this chart type is optimal for the data and query"""
            
            # Create prompt with format instructions
            prompt = self.output_handler.create_prompt_with_schema(base_prompt)
            
            # Get LLM
            llm = self.litellm_service.get_llm()
            
            # Create chain: prompt -> llm -> parse
            chain = (
                prompt
                | llm
                | StrOutputParser()
            )
            
            # Execute chain
            logger.info(f"🤖 Executing structured chart generation for {len(data)} rows")
            llm_output = await chain.ainvoke({"input": query_intent or "Visualize the data"})
            
            # Parse structured output
            structured_output, error_info = self.output_handler.parse_output(llm_output)
            
            if structured_output:
                # Successfully parsed structured output
                execution_time = int((time.time() - start_time) * 1000)
                
                # Convert Pydantic model to dict for return
                result_dict = structured_output.model_dump()
                
                # Ensure echarts_config is accessible
                if "echarts_config" in result_dict:
                    echarts_config_dict = result_dict["echarts_config"]
                    if isinstance(echarts_config_dict, dict):
                        result_dict["primary_chart"] = echarts_config_dict
                        result_dict["echarts_config"] = echarts_config_dict
                
                logger.info(f"✅ Structured chart generation complete: type={result_dict.get('chart_type')}, confidence={result_dict.get('confidence')}, time={execution_time}ms")
                
                return {
                    **result_dict,
                    "execution_time_ms": execution_time,
                    "parsing_success": True,
                    "missing_fields": []
                }
            else:
                # Parsing failed - use fallback
                logger.warning(f"⚠️ Structured output parsing failed: {error_info}")
                return self._generate_fallback_result(data, title, error_info, start_time)
        
        except Exception as e:
            logger.error(f"❌ Structured chart generation error: {e}", exc_info=True)
            return self._generate_fallback_result(data, title, {"error": str(e)}, start_time)
    
    def _generate_fallback_result(
        self,
        data: List[Dict],
        title: str,
        error_info: Dict[str, Any],
        start_time: float
    ) -> Dict[str, Any]:
        """Generate fallback result when structured parsing fails."""
        # Create a minimal valid chart config
        echarts_config = {
            "title": {"text": title or "Chart", "show": True},
            "tooltip": {"trigger": "axis"},
            "xAxis": {"type": "category", "data": []},
            "yAxis": {"type": "value"},
            "series": [{"name": "Data", "type": "bar", "data": []}]
        }
        
        if data and len(data) > 0:
            # Try to create a simple bar chart
            first_row = data[0]
            if isinstance(first_row, dict):
                keys = list(first_row.keys())
                if len(keys) >= 2:
                    # Use first column as x-axis, second as y-axis
                    x_data = [str(row.get(keys[0], "")) for row in data[:10]]
                    y_data = [row.get(keys[1], 0) for row in data[:10]]
                    echarts_config["xAxis"]["data"] = x_data
                    echarts_config["series"][0]["data"] = y_data
        
        execution_time = int((time.time() - start_time) * 1000)
        
        return {
            "success": True,
            "chart_type": ChartType.BAR,
            "echarts_config": echarts_config,
            "primary_chart": echarts_config,
            "chart_title": title or "Chart",
            "confidence": 0.5,
            "reasoning": "Fallback chart generated due to parsing error",
            "data_summary": {"total_rows": len(data), "columns": list(data[0].keys()) if data else []},
            "error": error_info.get("error", "Structured output parsing failed"),
            "execution_time_ms": execution_time,
            "parsing_success": False,
            "parsing_error": error_info,
            "missing_fields": ["structured_parsing"]  # Indicate structured parsing failed
        }

