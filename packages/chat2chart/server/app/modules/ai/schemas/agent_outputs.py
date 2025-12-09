"""
Pydantic Models for Structured AI Agent Outputs

This module defines Pydantic models for all AI agent outputs to ensure:
- Type safety and validation
- Guaranteed field presence
- Robust data flow between agents
- Complete field tracking and error detection
"""

from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum


class ChartType(str, Enum):
    """Supported chart types"""
    BAR = "bar"
    LINE = "line"
    PIE = "pie"
    SCATTER = "scatter"
    AREA = "area"
    HEATMAP = "heatmap"
    RADAR = "radar"
    GAUGE = "gauge"
    FUNNEL = "funnel"
    TREE = "tree"
    SUNBURST = "sunburst"
    TREEMAP = "treemap"
    CANDLESTICK = "candlestick"
    MAP = "map"


class EChartsAxisConfig(BaseModel):
    """ECharts axis configuration"""
    type: str = Field(..., description="Axis type: category, value, time, log")
    name: Optional[str] = Field(None, description="Axis name")
    data: Optional[List[Any]] = Field(None, description="Category data for category axis")
    min: Optional[Union[int, float, str]] = Field(None, description="Minimum value")
    max: Optional[Union[int, float, str]] = Field(None, description="Maximum value")
    position: Optional[str] = Field(None, description="Axis position: bottom, top, left, right")


class EChartsSeriesConfig(BaseModel):
    """ECharts series configuration"""
    name: str = Field(..., description="Series name")
    type: str = Field(..., description="Series type: bar, line, pie, scatter, etc.")
    data: List[Any] = Field(..., description="Series data")
    yAxisIndex: Optional[int] = Field(None, description="Y-axis index for dual-axis charts")
    smooth: Optional[bool] = Field(None, description="Whether to smooth the line")
    stack: Optional[str] = Field(None, description="Stack name for stacked charts")
    radius: Optional[Union[str, List[str]]] = Field(None, description="Pie chart radius")
    center: Optional[List[str]] = Field(None, description="Pie chart center position")


class EChartsConfigModel(BaseModel):
    """Complete ECharts 6 configuration model"""
    title: Dict[str, Any] = Field(..., description="Chart title configuration")
    tooltip: Dict[str, Any] = Field(..., description="Tooltip configuration")
    legend: Optional[Dict[str, Any]] = Field(None, description="Legend configuration")
    xAxis: Optional[Union[Dict[str, Any], List[Dict[str, Any]]]] = Field(None, description="X-axis configuration")
    yAxis: Optional[Union[Dict[str, Any], List[Dict[str, Any]]]] = Field(None, description="Y-axis configuration")
    series: List[Dict[str, Any]] = Field(..., description="Series configuration array")
    grid: Optional[Dict[str, Any]] = Field(None, description="Grid configuration")
    color: Optional[List[str]] = Field(None, description="Color palette")
    dataZoom: Optional[Dict[str, Any]] = Field(None, description="Data zoom configuration")
    visualMap: Optional[Dict[str, Any]] = Field(None, description="Visual mapping configuration")
    
    @validator('title')
    def validate_title(cls, v):
        """Ensure title has text property"""
        if isinstance(v, dict):
            if 'text' not in v:
                v['text'] = 'Chart'
            if 'show' not in v:
                v['show'] = True
        return v
    
    @validator('series')
    def validate_series(cls, v):
        """Ensure series is non-empty"""
        if not v or len(v) == 0:
            raise ValueError("Series array cannot be empty")
        return v


class ChartGenerationOutput(BaseModel):
    """Structured output from Chart Generation Agent"""
    success: bool = Field(..., description="Whether chart generation succeeded")
    chart_type: ChartType = Field(..., description="Type of chart generated")
    echarts_config: EChartsConfigModel = Field(..., description="Complete ECharts 6 configuration")
    chart_title: str = Field(..., description="Chart title")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score 0-1")
    reasoning: str = Field(..., description="Reasoning for chart type selection")
    data_summary: Dict[str, Any] = Field(..., description="Summary of data used for chart")
    error: Optional[str] = Field(None, description="Error message if generation failed")
    execution_time_ms: Optional[int] = Field(None, description="Execution time in milliseconds")
    
    class Config:
        use_enum_values = True
    
    def is_meaningful(self) -> bool:
        """Check if output is meaningful - chart config exists"""
        return bool(self.echarts_config and self.success)


class InsightItem(BaseModel):
    """Individual insight item"""
    title: str = Field(..., description="Insight title")
    description: str = Field(..., description="Detailed insight description")
    impact: str = Field(..., description="Impact level: high, medium, low")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score 0-1")
    category: Optional[str] = Field(None, description="Insight category")
    data_points: Optional[List[Any]] = Field(None, description="Supporting data points")


class RecommendationItem(BaseModel):
    """Individual recommendation item"""
    title: str = Field(..., description="Recommendation title")
    description: str = Field(..., description="Detailed recommendation description")
    priority: str = Field(..., description="Priority: high, medium, low")
    effort: str = Field(..., description="Effort required: high, medium, low")
    impact: str = Field(..., description="Expected impact: high, medium, low")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score 0-1")


class InsightsOutput(BaseModel):
    """Structured output from Insights Agent"""
    success: bool = Field(..., description="Whether insights generation succeeded")
    insights: List[InsightItem] = Field(..., description="List of business insights")
    recommendations: List[RecommendationItem] = Field(..., description="List of recommendations")
    executive_summary: str = Field(..., description="Executive summary text")
    confidence_scores: Dict[str, float] = Field(..., description="Confidence scores by category")
    data_summary: Dict[str, Any] = Field(..., description="Summary of analyzed data")
    error: Optional[str] = Field(None, description="Error message if generation failed")
    execution_time_ms: Optional[int] = Field(None, description="Execution time in milliseconds")
    
    def is_meaningful(self) -> bool:
        """Check if output is meaningful - any insights, recommendations, or summary"""
        return any([
            bool(self.insights and len(self.insights) > 0),
            bool(self.recommendations and len(self.recommendations) > 0),
            bool(self.executive_summary and len(self.executive_summary.strip()) > 50)
        ])


class SQLGenerationOutput(BaseModel):
    """Structured output from NL2SQL Agent"""
    success: bool = Field(..., description="Whether SQL generation succeeded")
    sql_query: str = Field(..., description="Generated SQL query")
    explanation: str = Field(..., description="Business explanation of the SQL query")
    validation_result: Dict[str, Any] = Field(..., description="SQL validation results")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score 0-1")
    reasoning_steps: List[Dict[str, Any]] = Field(..., description="Reasoning steps taken")
    error: Optional[str] = Field(None, description="Error message if generation failed")
    execution_time_ms: Optional[int] = Field(None, description="Execution time in milliseconds")
    
    @validator('sql_query')
    def validate_sql_not_empty(cls, v):
        """
        Ensure SQL query is not empty and clean corruption patterns.
        This is the SINGLE place where SQL sanitization happens at the model level.
        """
        import re
        import json
        
        # CRITICAL: Handle case where v might be a dict (entire JSON object)
        if isinstance(v, dict):
            v = v.get("sql_query") or v.get("sql") or ""
        
        # Ensure v is a string
        if not isinstance(v, str):
            v = str(v) if v else ""
        
        if not v or not v.strip():
            raise ValueError("SQL query cannot be empty")
        
        # CRITICAL: Extract SQL from JSON if embedded - be very aggressive
        sql = v.strip()
        
        # CRITICAL: First check if this is an entire JSON object that was serialized as a string
        # Look for pattern: "sql_query": "SELECT ...
        if '"sql_query"' in sql and '"dialect"' in sql and '"explanation"' in sql:
            # This looks like the entire SQLGenerationOutput JSON was stringified
            # Extract the sql_query field value more carefully - find the next JSON field marker
            import json as json_module
            try:
                # Try to parse as JSON first
                parsed = json_module.loads(sql)
                if isinstance(parsed, dict) and parsed.get("sql_query"):
                    sql = parsed["sql_query"].strip()
                    logger.warning(f"⚠️ Extracted SQL from JSON by parsing: {sql[:80]}...")
            except (json_module.JSONDecodeError, ValueError):
                # Fallback: Extract using find-next-field pattern
                # Find "sql_query": " and then find where the value ends (at ", ")
                start_idx = sql.find('"sql_query"')
                if start_idx >= 0:
                    value_start = sql.find(':', start_idx) + 1
                    # Skip whitespace
                    while value_start < len(sql) and sql[value_start] in ' \t':
                        value_start += 1
                    # Should be at opening quote
                    if value_start < len(sql) and sql[value_start] == '"':
                        value_start += 1
                        # Find closing quote (accounting for escapes)
                        value_end = value_start
                        while value_end < len(sql):
                            if sql[value_end] == '\\' and value_end + 1 < len(sql):
                                value_end += 2
                            elif sql[value_end] == '"':
                                break
                            else:
                                value_end += 1
                        if value_end < len(sql):
                            extracted = sql[value_start:value_end]
                            # Unescape
                            extracted = extracted.replace('\\n', '\n').replace('\\t', '\t').replace('\\r', '\r')
                            extracted = extracted.replace('\\"', '"').replace('\\\\', '\\')
                            sql = extracted.strip()
                            logger.warning(f"⚠️ Extracted SQL from JSON by position: {sql[:80]}...")
        
        # If still contains JSON markers, try to extract SELECT block only
        if '"dialect"' in sql or '"explanation"' in sql or '","' in sql:
            # Extract just the SELECT ... FROM ... part
            sql_match = re.search(r'(SELECT\s+[^"]*?FROM\s+[^"]*?)(?:\s*",|$)', sql, re.IGNORECASE | re.DOTALL)
            if sql_match:
                sql = sql_match.group(1).strip()
                preview = sql[:80]
                logger.warning(f"⚠️ Extracted SELECT block from JSON-mixed content: {preview}...")
        
        # Final cleanup: extract complete SQL block - handle SQL with string literals
        # CRITICAL: Extract SQL that includes FROM clause - stop at JSON artifacts, not at quotes in SQL
        # Pattern 1: Try to match complete SQL including FROM, WHERE, GROUP BY, ORDER BY, LIMIT
        if not any(marker in sql for marker in ['"dialect"', '"explanation"', '"validation_result"']):
            # No JSON markers - use standard extraction
            sql_match = re.search(r'(SELECT\s+.*?FROM\s+.*?)(?:\s*["\']\s*\}\s*\]\s*\}|\s*\}\s*\]\s*\}\s*FORMAT|$)', sql, re.IGNORECASE | re.DOTALL)
            if sql_match:
                sql = sql_match.group(1).strip()
                logger.debug("✅ Extracted complete SQL block with FROM clause")
            else:
                # Pattern 2: Fallback - extract SELECT block, stopping at JSON artifacts
                sql_match = re.search(r'(SELECT\s+.*?)(?:\s*["\']\s*\}\s*\]\s*\}|\s*\}\s*\]\s*\}\s*FORMAT|$)', sql, re.IGNORECASE | re.DOTALL)
                if sql_match:
                    sql = sql_match.group(1).strip()
                    logger.debug("✅ Extracted SQL block (FROM may be missing - will be validated)")
        
        # CRITICAL: Remove JSON artifacts BEFORE removing quotes
        # Remove trailing JSON artifacts (e.g., " } ] } FORMAT JSONEachRow")
        sql = re.sub(r'\s*["\']\s*\}\s*\]\s*\}\s*FORMAT.*$', '', sql, flags=re.IGNORECASE)
        sql = re.sub(r'\s*\}\s*\]\s*\}\s*FORMAT.*$', '', sql, flags=re.IGNORECASE)
        sql = re.sub(r'\s*["\']\s*\}\s*\]\s*\}.*$', '', sql)
        sql = re.sub(r'\s*\}\s*\]\s*\}.*$', '', sql)
        
        # ULTRA-AGGRESSIVE: Remove anything after "FORMAT" keyword - it's always garbage
        # Also catch patterns like ": FORMAT JSONEachRow" or " FORMAT JSONEachRow"
        sql = re.sub(r'\s*":\s*FORMAT\s+.*$', '', sql, flags=re.IGNORECASE)
        sql = re.sub(r'\s*"\s*FORMAT\s+.*$', '', sql, flags=re.IGNORECASE)
        sql = re.sub(r'\s*FORMAT\s+.*$', '', sql, flags=re.IGNORECASE)
        
        # Remove any trailing JSON-like artifacts (quotes with comma/colon)
        sql = re.sub(r'\s*["\']\s*[,:]\s*.*$', '', sql)  # Remove trailing quotes with comma/colon
        sql = re.sub(r'\s*[,:]\s*["\'].*$', '', sql)  # Remove trailing comma/colon with quotes
        
        # Final check: if SQL ends with a quote or colon, remove it
        if sql and (sql.endswith('"') or sql.endswith("'") or sql.endswith(':')):
            # Find the last valid SQL character (semicolon, or end of statement)
            last_semicolon = sql.rfind(';')
            if last_semicolon > 0:
                sql = sql[:last_semicolon + 1].strip()
            else:
                # Remove trailing quotes/colons
                sql = re.sub(r'["\':]+\s*$', '', sql).strip()
        
        # Remove surrounding quotes if present (but preserve SQL content)
        if (sql.startswith('"') and sql.endswith('"')) or (sql.startswith("'") and sql.endswith("'")):
            sql = sql[1:-1]
        
        # CRITICAL: Remove "idididididididididididid" corruption pattern - MULTIPLE PASSES
        # Pass 1: Remove all instances of repeated "id" (case-insensitive)
        sql = re.sub(r'(id){3,}', ' ', sql, flags=re.IGNORECASE)
        # Pass 2: Remove corruption between words (e.g., "SELECTididididididididididididFROM")
        sql = re.sub(r'([A-Za-z0-9_]+)(id){3,}([A-Za-z0-9_]+)', r'\1 \3', sql, flags=re.IGNORECASE)
        # Pass 3: Remove corruption at start of words
        sql = re.sub(r'(id){3,}([A-Za-z0-9_]+)', r'\2', sql, flags=re.IGNORECASE)
        # Pass 4: Remove corruption at end of words
        sql = re.sub(r'([A-Za-z0-9_]+)(id){3,}', r'\1', sql, flags=re.IGNORECASE)
        # Pass 5: Handle standalone corruption
        sql = re.sub(r'\b(id){3,}\b', ' ', sql, flags=re.IGNORECASE)
        # Pass 6: Final cleanup - remove any remaining corruption
        sql = re.sub(r'id{3,}', ' ', sql, flags=re.IGNORECASE)
        
        # Unescape common JSON escape sequences
        sql = sql.replace('\\\\n', '\n').replace('\\\\r', '\r').replace('\\\\t', '\t')
        sql = sql.replace('\\n', '\n').replace('\\r', '\r').replace('\\t', '\t')
        
        # Normalize whitespace - but preserve newlines in SQL
        sql = re.sub(r'[ \t]+', ' ', sql)  # Collapse spaces and tabs
        sql = re.sub(r'\n\s*\n', '\n', sql)  # Collapse multiple newlines
        sql = sql.strip()
        
        return sql
    
    def is_meaningful(self) -> bool:
        """Check if output is meaningful - SQL query exists"""
        return bool(self.sql_query and self.sql_query.strip())


class QueryExecutionOutput(BaseModel):
    """Structured output from Query Execution"""
    success: bool = Field(..., description="Whether query execution succeeded")
    data: List[Dict[str, Any]] = Field(..., description="Query result data")
    row_count: int = Field(..., ge=0, description="Number of rows returned")
    column_count: int = Field(..., ge=0, description="Number of columns")
    execution_time_ms: float = Field(..., ge=0, description="Execution time in milliseconds")
    error: Optional[str] = Field(None, description="Error message if execution failed")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    
    def is_meaningful(self) -> bool:
        """Check if output is meaningful - has data or actionable error"""
        if self.success and self.data and len(self.data) > 0:
            return True
        if self.error and any(kw in self.error.lower() for kw in ["group by", "table not found", "column", "syntax"]):
            return True
        return False


class UnifiedChartInsightsOutput(BaseModel):
    """Structured output from Unified Chart+Insights Agent"""
    success: bool = Field(..., description="Whether generation succeeded")
    chart_config: EChartsConfigModel = Field(..., description="ECharts configuration")
    insights: List[InsightItem] = Field(..., description="Business insights")
    recommendations: List[RecommendationItem] = Field(..., description="Recommendations")
    executive_summary: str = Field(..., description="Executive summary")
    confidence_scores: Dict[str, float] = Field(..., description="Confidence scores")
    error: Optional[str] = Field(None, description="Error message if generation failed")
    execution_time_ms: Optional[int] = Field(None, description="Execution time in milliseconds")
    
    def is_meaningful(self) -> bool:
        """Check if output is meaningful - any component exists"""
        return any([
            bool(self.chart_config),
            bool(self.insights and len(self.insights) > 0),
            bool(self.recommendations and len(self.recommendations) > 0),
            bool(self.executive_summary and len(self.executive_summary.strip()) > 50)
        ])


class AgentResultMetadata(BaseModel):
    """Metadata for agent execution results"""
    agent_id: str = Field(..., description="Agent identifier")
    agent_type: str = Field(..., description="Agent type: nl2sql, chart_generation, insights, unified")
    execution_time_ms: int = Field(..., ge=0, description="Execution time in milliseconds")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Execution timestamp")
    model_used: Optional[str] = Field(None, description="LLM model used")
    tokens_used: Optional[int] = Field(None, description="Tokens consumed")
    success: bool = Field(..., description="Whether execution succeeded")
    error: Optional[str] = Field(None, description="Error message if failed")
    missing_fields: List[str] = Field(default_factory=list, description="Fields that were expected but missing")
    partial_success: bool = Field(False, description="Whether partial results were obtained")


class CompleteAgentOutput(BaseModel):
    """Complete structured output from orchestrator combining all agents"""
    success: bool = Field(..., description="Overall success status")
    query: str = Field(..., description="Original user query")
    sql_query: Optional[SQLGenerationOutput] = Field(None, description="SQL generation result")
    query_execution: Optional[QueryExecutionOutput] = Field(None, description="Query execution result")
    chart: Optional[ChartGenerationOutput] = Field(None, description="Chart generation result")
    insights: Optional[InsightsOutput] = Field(None, description="Insights generation result")
    narration: str = Field(..., description="Natural language narration/summary")
    follow_up_questions: List[str] = Field(default_factory=list, description="Follow-up questions")
    metadata: AgentResultMetadata = Field(..., description="Execution metadata")
    missing_components: List[str] = Field(default_factory=list, description="Components that failed or are missing")
    
    def get_all_fields_status(self) -> Dict[str, bool]:
        """Get status of all expected fields"""
        return {
            "sql_query": self.sql_query is not None and self.sql_query.success if self.sql_query else False,
            "query_execution": self.query_execution is not None and self.query_execution.success if self.query_execution else False,
            "chart": self.chart is not None and self.chart.success if self.chart else False,
            "insights": self.insights is not None and self.insights.success if self.insights else False,
            "narration": bool(self.narration and len(self.narration.strip()) > 0),
            "follow_up_questions": len(self.follow_up_questions) > 0
        }
    
    def get_missing_fields(self) -> List[str]:
        """Get list of missing or failed fields"""
        status = self.get_all_fields_status()
        missing = [field for field, present in status.items() if not present]
        return missing + self.missing_components
    
    def is_meaningful(self) -> bool:
        """Check if output is meaningful - ANY component exists (OR logic)"""
        return any([
            bool(self.sql_query and self.sql_query.success if self.sql_query else False),
            bool(self.query_execution and self.query_execution.success if self.query_execution else False),
            bool(self.chart and self.chart.success if self.chart else False),
            bool(self.insights and self.insights.success if self.insights else False),
            bool(self.narration and len(self.narration.strip()) > 50),
            len(self.follow_up_questions) > 0
        ])

