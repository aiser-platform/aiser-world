"""
Unified Chart and Insights Agent

This agent combines chart generation and insights generation into a single LLM call
to prevent context drift, reduce token usage, and improve consistency.
"""

import json
import logging
import re
import time
from typing import Any, Dict, List, Optional
from datetime import datetime
import asyncio
import os

from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import BaseTool

from app.modules.ai.services.litellm_service import LiteLLMService
from app.modules.chats.schemas import (
    AgentContextSchema,
    UserRole
)

logger = logging.getLogger(__name__)


class UnifiedChartInsightsAgent:
    """
    Unified agent that generates both chart configuration and business insights
    in a single LLM call to prevent context drift and improve efficiency.
    """
    
    def __init__(
        self,
        litellm_service: LiteLLMService,
        chart_agent: Any,  # IntelligentChartGenerationAgent
        insights_agent: Any  # BusinessInsightsAgent
    ):
        object.__setattr__(self, 'litellm_service', litellm_service)
        self.chart_agent = chart_agent
        self.insights_agent = insights_agent
        
        # Initialize unified tools (combine chart and insights tools)
        self.tools = self._initialize_tools()
        
        # Initialize unified agent
        self.agent = self._initialize_agent()
        
        # Circuit-breaker / metrics for unified agent
        self._failure_timestamps: List[float] = []
        self._failure_window_seconds: int = 300  # 5 minutes window
        self._failure_threshold: int = 3  # Failures within window to trip breaker
    
    def _initialize_tools(self) -> List[BaseTool]:
        """Initialize tools from both chart and insights agents."""
        tools = []
        
        # Get tools from chart agent
        if hasattr(self.chart_agent, 'tools'):
            tools.extend(self.chart_agent.tools)
        
        # Get tools from insights agent
        if hasattr(self.insights_agent, 'tools'):
            tools.extend(self.insights_agent.tools)
        
        return tools
    
    def _initialize_agent(self) -> AgentExecutor:
        """Initialize the unified agent."""
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert data visualization and business intelligence analyst. Your job is to generate BOTH a complete ECharts 6 chart configuration AND comprehensive business insights from the same data in a single, coherent analysis.

**Your Dual Task:**
1. **Chart Generation**: Create a production-ready ECharts 6 configuration that best visualizes the data
2. **Business Insights**: Generate actionable insights, recommendations, and an executive summary

**Why Unified Analysis:**
- Chart and insights should be aligned - the chart visualizes what the insights explain
- Single context prevents information drift between separate calls
- More efficient and cost-effective
- Better consistency between visualization and narrative

**Chart Generation Guidelines:**
- Use `analyze_data_for_chart` tool to understand data structure
- Use `generate_echarts_config` tool to create the chart configuration
- Consider: data types, relationships, business question, user role
- Generate complete ECharts 6 config (title, tooltip, legend, xAxis, yAxis, series, etc.)

**Insights Generation Guidelines:**
- Use `statistical_analysis` tool to analyze the data
- Use `generate_business_insights` tool to create insights
- Generate role-appropriate insights (executive/manager/analyst/employee)
- Provide actionable recommendations with priorities
- Create a comprehensive executive summary

**Output Format (STRICT - VALIDATE AGAINST `UnifiedChartInsightsOutput` Pydantic MODEL):**
Return ONLY a single valid JSON object that conforms to the `UnifiedChartInsightsOutput` Pydantic model (no surrounding text, no markdown).
Required top-level keys and types:
- `chart_config` (object|null): a complete ECharts 6 `option` object (title, tooltip, legend, xAxis, yAxis, series, etc.) or `null` if not produced.
- `insights` (array): list of insight objects; each insight must include:
  - `type` (string): one of `trend|kpi|anomaly|data_quality|segment`
  - `title` (string)
  - `description` (string)
  - `confidence` (number 0.0-1.0)
  - `impact` (string: `low|medium|high`)
  - `recommendations` (array of short strings)
- `recommendations` (array): prioritized short recommendation strings (can be empty)
- `executive_summary` (string): 1-2 sentence summary referencing the chart type and key finding

Formatting rules:
- The `sql_query` or any SQL text, if present in fields, must include real newlines (do NOT emit escaped `\\n` sequences).
- Do not include any free-form narrative outside the JSON object.
- If you cannot generate a field, set it to `null` or an empty array as appropriate (do NOT write explanation outside JSON).

Example output (MUST be valid JSON; must validate against `UnifiedChartInsightsOutput`):
```json
{
  "chart_config": {
    "title": {"text": "Customers by Year"},
    "tooltip": {"trigger": "axis"},
    "legend": {"data": ["Customers"]},
    "xAxis": {"type": "category", "data": ["2020","2021","2022","2023","2024"]},
    "yAxis": {"type": "value"},
    "series": [{"name":"Customers","type":"line","data":[612,700,800,900,956]}]
  },
  "insights": [
    {
      "type": "trend",
      "title": "Upward growth 2020-2024",
      "description": "Customer counts rose steadily from 612 in 2020 to 956 in 2024.",
      "confidence": 0.9,
      "impact": "medium",
      "recommendations": ["Investigate acquisition channels", "Optimize retention"]
    }
  ],
  "recommendations": ["Review marketing spend in 2024", "Investigate 2025 churn drivers"],
  "executive_summary": "Customers increased 2020-2024, peak in 2024; investigate retention for recent dip."
}
```

Important:
- Chart and insights MUST be aligned — insights should explain what the chart shows.
- Use the same inferred schema and terminology for both outputs.
- The assistant MUST ensure the JSON passes Pydantic validation; if validation fails, return only a `{"error":"validation_failed","details":"<short error>"}` JSON object (do NOT include raw LLM text).
"""),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad")
        ])
        
        llm = self.litellm_service.get_llm()
        agent = create_tool_calling_agent(llm, self.tools, prompt)
        
        # CRITICAL: Create custom callback handler to identify agent in logs
        from langchain_core.callbacks import BaseCallbackHandler
        
        class AgentIdentifierCallback(BaseCallbackHandler):
            def __init__(self, agent_name: str):
                super().__init__()
                self.agent_name = agent_name
            
            def on_chain_start(self, serialized: Dict[str, Any], inputs: Dict[str, Any], **kwargs) -> None:
                logger.info("🤖 [UNIFIED_CHART_INSIGHTS_AGENT] Entering AgentExecutor chain")
            
            def on_chain_end(self, outputs: Dict[str, Any], **kwargs) -> None:
                logger.info("✅ [UNIFIED_CHART_INSIGHTS_AGENT] Finished AgentExecutor chain")
        
        callback = AgentIdentifierCallback("unified_chart_insights")
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
            
            # Infer type
            numeric_count = sum(1 for v in sample_values if isinstance(v, (int, float)) or (isinstance(v, str) and v.replace('.', '', 1).replace('-', '', 1).isdigit()))
            date_count = sum(1 for v in sample_values if isinstance(v, (datetime, str)) and self._is_date_like(str(v)))
            
            if numeric_count / len(sample_values) > 0.8:
                schema[column_name] = {
                    "type": "numeric",
                    "nullable": any(row.get(column_name) is None for row in data[:20]),
                    "sample_values": sample_values[:3]
                }
            elif date_count / len(sample_values) > 0.8:
                schema[column_name] = {
                    "type": "date",
                    "nullable": any(row.get(column_name) is None for row in data[:20]),
                    "sample_values": sample_values[:3]
                }
            else:
                schema[column_name] = {
                    "type": "categorical",
                    "nullable": any(row.get(column_name) is None for row in data[:20]),
                    "unique_values": len(set(sample_values)),
                    "sample_values": sample_values[:3]
                }
        
        return schema
    
    def _is_date_like(self, value: str) -> bool:
        """Check if string looks like a date."""
        date_formats = [
            "%Y-%m-%d",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S",
            "%m/%d/%Y",
            "%d/%m/%Y"
        ]
        for fmt in date_formats:
            try:
                datetime.strptime(value[:19], fmt)
                return True
            except Exception:
                continue
        return False
    
    async def generate_chart_and_insights(
        self,
        data: List[Dict],
        query_intent: str = "",
        title: str = "",
        context: Optional[AgentContextSchema] = None,
        query_result_schema: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate both chart configuration and insights in a single LLM call.
        
        Args:
            data: Query result data
            query_intent: User's query/intent
            title: Chart title
            context: Agent context with business context, user role, etc.
            query_result_schema: Schema of query results (column types, relationships)
            
        Returns:
            Dictionary with both chart_config and insights
        """
        if not data or len(data) == 0:
            return {
                "success": False,
                "error": "no_data",
                "message": "No data available"
            }
        
        start_time = time.time()
        
        try:
            # Infer schema if not provided
            if query_result_schema is None:
                query_result_schema = self._infer_data_schema(data)
                logger.info(f"📊 Inferred schema: {len(query_result_schema)} columns")
            
            # Prepare data summary with schema information
            sample_data = data[:20] if len(data) > 20 else data
            {
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
            
            # Build comprehensive prompt with schema information
            agent_input = {
                "input": f"""Generate BOTH a complete ECharts 6 chart configuration AND comprehensive business insights from this data.

**User Query/Intent:** {query_intent or "Visualize and analyze the data"}
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
1. Use tools to analyze the data structure and characteristics
2. Generate a complete ECharts 6 configuration that best visualizes this data
3. Generate comprehensive business insights that explain what the chart shows
4. Ensure chart and insights are aligned and consistent

**Output Requirements:**
- Chart config must be complete, valid ECharts 6 JSON
- Insights must be role-appropriate and actionable
- Executive summary should reference the chart type and key findings
- Chart and insights must tell the same story

Return a JSON object with: chart_config, insights, recommendations, executive_summary""",
                "chat_history": []
            }
            # Append format instructions from Pydantic schema to encourage strict JSON output
            try:
                from app.modules.ai.utils.structured_output import StructuredOutputHandler
                from app.modules.ai.schemas.agent_outputs import UnifiedChartInsightsOutput

                fmt_handler = StructuredOutputHandler(UnifiedChartInsightsOutput)
                fmt_instructions = fmt_handler.get_format_instructions()
                agent_input["input"] = f"{agent_input['input']}\n\nFormat instructions:\n{fmt_instructions}"
            except Exception:
                # If structured handler unavailable, proceed without format instructions
                pass
            
            # Circuit-breaker: prune old failure timestamps and check threshold
            try:
                now_ts = time.time()
                self._failure_timestamps = [t for t in getattr(self, "_failure_timestamps", []) if now_ts - t <= getattr(self, "_failure_window_seconds", 300)]
                if len(self._failure_timestamps) >= getattr(self, "_failure_threshold", 3):
                    logger.warning("⚠️ UnifiedChartInsightsAgent circuit breaker OPEN - skipping unified call")
                    # Fallback immediately to separate agents
                    chart_result = await self.chart_agent.generate_chart(data, query_intent, title, context)
                    insights_result = await self.insights_agent.generate_insights(
                        data, query_intent, context.user_role if context else UserRole.EMPLOYEE, context
                    )
                    return {
                        "success": True,
                        "primary_chart": chart_result.get("primary_chart"),
                        "echarts_config": chart_result.get("echarts_config"),
                        "insights": insights_result.get("insights", []),
                        "recommendations": insights_result.get("recommendations", []),
                        "executive_summary": insights_result.get("executive_summary"),
                        "generation_method": "circuit_breaker_fallback"
                    }
            except Exception:
                # If any error inspecting circuit state, continue to try unified agent
                pass

            logger.info(f"🤖 [UNIFIED_CHART_INSIGHTS_AGENT] Executing unified chart+insights agent for {len(data)} rows")
            try:
                # Use a bounded timeout to avoid blocking the request indefinitely
                # Timeout is configurable via UNIFIED_AGENT_TIMEOUT (seconds) and scales with input size
                base_timeout = int(os.getenv("UNIFIED_AGENT_TIMEOUT", "60"))
                # Add 10s per 500 rows as a simple heuristic for larger payloads
                size_bonus = max(0, (len(data) // 500) * 10)
                timeout_seconds = float(base_timeout + size_bonus)
                result = await asyncio.wait_for(self.agent.ainvoke(agent_input), timeout=timeout_seconds)
                logger.info("✅ [UNIFIED_CHART_INSIGHTS_AGENT] Agent execution completed")
            except asyncio.TimeoutError:
                logger.warning("⏱️ Unified agent timed out, falling back to separate agents")
                try:
                    from app.modules.ai.utils import metrics
                    metrics.inc_unified_failure()
                except Exception:
                    pass
                # Fallback immediately to separate agents
                chart_result = await self.chart_agent.generate_chart(data, query_intent, title, context)
                insights_result = await self.insights_agent.generate_insights(
                    data, query_intent, context.user_role if context else UserRole.EMPLOYEE, context
                )
                return {
                    "success": True,
                    "primary_chart": chart_result.get("primary_chart"),
                    "echarts_config": chart_result.get("echarts_config"),
                    "insights": insights_result.get("insights", []),
                    "recommendations": insights_result.get("recommendations", []),
                    "executive_summary": insights_result.get("executive_summary"),
                    "generation_method": "fallback_timeout"
                }
            
            # Extract both chart and insights from result
            agent_output = result.get("output", "")
            
            # OPTION: Try structured output parsing first (if enabled)
            use_structured_outputs = True  # Feature flag
            chart_config = None
            insights = []
            recommendations = []
            executive_summary = None
            
            if use_structured_outputs:
                try:
                    from app.modules.ai.utils.structured_output import StructuredOutputHandler
                    from app.modules.ai.schemas.agent_outputs import UnifiedChartInsightsOutput
                    
                    handler = StructuredOutputHandler(UnifiedChartInsightsOutput)
                    structured_output, error_info = handler.parse_output(agent_output)
                    
                    if structured_output:
                        # Successfully parsed - extract all components
                        chart_config = structured_output.chart_config.model_dump() if hasattr(structured_output.chart_config, 'model_dump') else structured_output.chart_config.dict()
                        insights = [i.model_dump() if hasattr(i, 'model_dump') else i.dict() if hasattr(i, 'dict') else i for i in structured_output.insights]
                        recommendations = [r.model_dump() if hasattr(r, 'model_dump') else r.dict() if hasattr(r, 'dict') else r for r in structured_output.recommendations]
                        executive_summary = structured_output.executive_summary
                        logger.info("✅ Structured output parsing succeeded for unified agent")
                    else:
                        logger.warning(f"⚠️ Structured output parsing failed: {error_info.get('error_type', 'unknown') if error_info else 'unknown'}, attempting constrained regeneration")
                        try:
                            fmt_instructions = fmt_handler.get_format_instructions()
                            regen_prompt = f"""The previous output could not be parsed as valid JSON for the unified chart+insights schema. Original output:\n\n{agent_output}\n\nPlease RETURN ONLY the single JSON object that conforms exactly to the UnifiedChartInsightsOutput Pydantic model. Do NOT include any explanation or text outside the JSON. Follow these format instructions exactly:\n\n{fmt_instructions}\n\nReturn only the JSON object."""
                            regen_resp = await self.litellm_service.generate_completion(prompt=regen_prompt, system_context="Return only the JSON that validates against UnifiedChartInsightsOutput.", max_tokens=1200, temperature=0.05)
                            if regen_resp.get('success'):
                                regen_content = regen_resp.get('content', '')
                                structured_output, error_info = handler.parse_output(regen_content)
                                if structured_output:
                                    chart_config = structured_output.chart_config.model_dump() if hasattr(structured_output.chart_config, 'model_dump') else structured_output.chart_config.dict()
                                    insights = [i.model_dump() if hasattr(i, 'model_dump') else i.dict() if hasattr(i, 'dict') else i for i in structured_output.insights]
                                    recommendations = [r.model_dump() if hasattr(r, 'model_dump') else r.dict() if hasattr(r, 'dict') else r for r in structured_output.recommendations]
                                    executive_summary = structured_output.executive_summary
                                    logger.info("✅ Regenerated structured output parsed successfully for unified agent")
                                else:
                                    logger.warning("⚠️ Regeneration did not produce valid structured JSON; falling back to JSON/text extraction")
                            else:
                                logger.warning(f"⚠️ Regeneration call failed: {regen_resp.get('error')}")
                        except Exception as regen_err:
                            logger.debug(f"Unified agent regeneration attempt failed: {regen_err}")
                except Exception as structured_error:
                    logger.debug(f"Structured output parsing not available: {structured_error}, using JSON extraction")
            
            # Fallback to JSON extraction if structured parsing failed or not enabled
            if not chart_config:
                try:
                    # Look for JSON in the output - try multiple patterns
                    json_match = None
                    if "```json" in agent_output:
                        json_match = re.search(r'```json\s*(.*?)\s*```', agent_output, re.DOTALL)
                    elif "chart_config" in agent_output.lower() or "echarts" in agent_output.lower():
                        # Look for chart_config or echarts_config in JSON
                        json_match = re.search(r'\{[\s\S]*"(?:chart_config|echarts_config|primary_chart)"[\s\S]*\}', agent_output, re.DOTALL)
                    elif "{" in agent_output:
                        # Look for any JSON object (but prefer ones with chart-related keys)
                        json_match = re.search(r'\{[\s\S]*"title"[\s\S]*"series"[\s\S]*\}', agent_output, re.DOTALL)
                        if not json_match:
                            json_match = re.search(r'\{.*\}', agent_output, re.DOTALL)
                    
                    if json_match:
                        json_str = json_match.group(1) if json_match.groups() else json_match.group(0)
                        # Sanitize common JS artifacts (functions, comments) that break JSON parsing
                        try:
                            # Remove single-line comments
                            json_str = re.sub(r'//.*?\\n', '\\n', json_str)
                            # Replace JS function(...) { ... } blocks with a placeholder string
                            json_str = re.sub(r'function\\s*\\([^\\)]*\\)\\s*\\{[\\s\\S]*?\\}', '\"__FUNCTION_PLACEHOLDER__\"', json_str)
                        except Exception:
                            pass
                        parsed = json.loads(json_str)
                        chart_config = parsed.get("chart_config") or parsed.get("echarts_config") or parsed.get("primary_chart")
                        insights = parsed.get("insights", [])
                        recommendations = parsed.get("recommendations", [])
                        executive_summary = parsed.get("executive_summary")
                        logger.info("✅ Extracted chart and insights from JSON in unified agent output")
                except Exception as parse_error:
                    logger.warning(f"⚠️ Could not parse unified response as JSON: {parse_error}")
                    try:
                        from app.modules.ai.utils import metrics
                        metrics.inc_unified_failure()
                    except Exception:
                        pass
                    # Fallback: try to extract chart and insights separately from text
                    try:
                        chart_config = self.chart_agent._extract_chart_config_from_result(agent_output)
                    except Exception:
                        chart_config = None
                    # Also try to extract insights from text
                    if not insights:
                        # Look for insights patterns in text
                        insights_match = re.search(r'(?:insights|recommendations)[:\s]*\[(.*?)\]', agent_output, re.IGNORECASE | re.DOTALL)
                        if insights_match:
                            try:
                                insights_parsed = json.loads(f"[{insights_match.group(1)}]")
                                insights = insights_parsed
                            except Exception:
                                pass
            
            # CRITICAL: Only use fallback if chart_config is still None or empty after all extraction attempts
            # This prevents generating multiple chart configs
            if not chart_config or (isinstance(chart_config, dict) and len(chart_config) == 0):
                logger.warning("⚠️ Chart config not found in unified response after all extraction attempts, using chart agent fallback")
                chart_result = await self.chart_agent.generate_chart(data, query_intent, title, context)
                chart_config = chart_result.get("primary_chart") or chart_result.get("echarts_config")
            else:
                logger.info(f"✅ Chart config found in unified response: type={type(chart_config)}, is_dict={isinstance(chart_config, dict)}")
            
            # CRITICAL: Only use fallback if insights is still empty after all extraction attempts
            if not insights or (isinstance(insights, list) and len(insights) == 0):
                logger.warning("⚠️ Insights not found in unified response after all extraction attempts, using insights agent fallback")
                insights_result = await self.insights_agent.generate_insights(data, query_intent, context.user_role if context else UserRole.EMPLOYEE, context)
                insights = insights_result.get("insights", [])
                recommendations = insights_result.get("recommendations", [])
                executive_summary = insights_result.get("executive_summary")
            else:
                logger.info(f"✅ Insights found in unified response: {len(insights)} insights, {len(recommendations)} recommendations")
            
            execution_time = int((time.time() - start_time) * 1000)
            
            return {
                "success": True,
                "primary_chart": chart_config,
                "echarts_config": chart_config,
                "insights": insights,
                "recommendations": recommendations,
                "executive_summary": executive_summary,
                "execution_time_ms": execution_time,
                "generation_method": "unified"  # Indicate unified generation
            }
            
        except Exception as e:
            logger.error(f"❌ Unified chart+insights generation failed: {e}", exc_info=True)
            # Fallback to separate agents
            logger.info("🔄 Falling back to separate chart and insights agents")
            try:
                chart_result = await self.chart_agent.generate_chart(data, query_intent, title, context)
                insights_result = await self.insights_agent.generate_insights(
                    data, query_intent, context.user_role if context else UserRole.EMPLOYEE, context
                )
                return {
                    "success": True,
                    "primary_chart": chart_result.get("primary_chart"),
                    "echarts_config": chart_result.get("echarts_config"),
                    "insights": insights_result.get("insights", []),
                    "recommendations": insights_result.get("recommendations", []),
                    "executive_summary": insights_result.get("executive_summary"),
                    "generation_method": "fallback_separate"
                }
            except Exception as fallback_error:
                logger.error(f"❌ Fallback also failed: {fallback_error}")
                return {
                    "success": False,
                    "error": str(e),
                    "fallback_error": str(fallback_error)
                }

