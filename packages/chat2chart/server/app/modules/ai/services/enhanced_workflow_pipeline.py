"""
Enhanced Enterprise Workflow Pipeline

This module provides a robust, transparent, and efficient end-to-end pipeline
for converting natural language queries to insights and charts with:
- Multi-engine query execution
- Structured output validation
- Progress tracking and transparency
- Metadata and transformation tracking
- Once-and-only-once principle enforcement
- Enterprise-grade error handling
"""

import json
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Callable, Tuple
from enum import Enum
from dataclasses import dataclass, field, asdict

logger = logging.getLogger(__name__)


class PipelineStage(Enum):
    """Pipeline execution stages for progress tracking"""
    VALIDATION = "validation"
    SCHEMA_RETRIEVAL = "schema_retrieval"
    SQL_GENERATION = "sql_generation"
    QUERY_EXECUTION = "query_execution"
    DATA_VALIDATION = "data_validation"
    CHART_GENERATION = "chart_generation"
    INSIGHTS_GENERATION = "insights_generation"
    NARRATION_SYNTHESIS = "narration_synthesis"
    RESULT_COMBINATION = "result_combination"
    COMPLETE = "complete"


@dataclass
class PipelineProgress:
    """Track pipeline execution progress"""
    stage: PipelineStage = PipelineStage.VALIDATION
    progress_percent: float = 0.0
    current_step: str = ""
    completed_steps: List[str] = field(default_factory=list)
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    stage_started_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def update(self, stage: PipelineStage, step: str, metadata: Optional[Dict[str, Any]] = None):
        """Update progress to new stage"""
        if self.stage != stage:
            if self.stage_started_at:
                duration = (datetime.now(timezone.utc) - self.stage_started_at).total_seconds()
                self.metadata[f"{self.stage.value}_duration"] = duration
            self.completed_steps.append(self.current_step)
            self.stage = stage
            self.stage_started_at = datetime.now(timezone.utc)
        
        self.current_step = step
        if metadata:
            self.metadata.update(metadata)
        
        # Calculate progress percentage
        stage_weights = {
            PipelineStage.VALIDATION: 5,
            PipelineStage.SCHEMA_RETRIEVAL: 10,
            PipelineStage.SQL_GENERATION: 15,
            PipelineStage.QUERY_EXECUTION: 20,
            PipelineStage.DATA_VALIDATION: 10,
            PipelineStage.CHART_GENERATION: 15,
            PipelineStage.INSIGHTS_GENERATION: 15,
            PipelineStage.NARRATION_SYNTHESIS: 5,
            PipelineStage.RESULT_COMBINATION: 5,
            PipelineStage.COMPLETE: 100
        }
        self.progress_percent = sum(
            stage_weights.get(s, 0) for s in PipelineStage 
            if s in self.completed_steps or s == stage
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response"""
        result = asdict(self)
        result['stage'] = self.stage.value
        result['started_at'] = self.started_at.isoformat()
        if self.stage_started_at:
            result['stage_started_at'] = self.stage_started_at.isoformat()
        return result


@dataclass
class TransformationMetadata:
    """Track data transformations and operations"""
    operation: str
    input_shape: Optional[tuple] = None
    output_shape: Optional[tuple] = None
    execution_time_ms: float = 0.0
    engine_used: Optional[str] = None
    rows_processed: Optional[int] = None
    columns_processed: Optional[List[str]] = None
    transformations_applied: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class EnhancedWorkflowPipeline:
    """
    Enterprise-grade workflow pipeline with transparency, validation, and efficiency.
    
    Features:
    - Multi-engine query execution (DuckDB, Cube.js, Spark, Direct SQL, Pandas)
    - Structured output validation
    - Progress tracking
    - Transformation metadata
    - Once-and-only-once principle
    - Enterprise error handling
    """
    
    def __init__(
        self,
        orchestrator: Any,
        multi_query_service: Any,
        schema_cache: Any,
        query_cache: Any
    ):
        self.orchestrator = orchestrator
        self.multi_query_service = multi_query_service
        self.schema_cache = schema_cache
        self.query_cache = query_cache
        self._execution_tracker: Dict[str, bool] = {}  # Track what's been executed
    
    async def execute_workflow(
        self,
        query: str,
        data_source_id: str,
        agent_context: Any,
        progress_callback: Optional[Callable[[PipelineProgress], None]] = None,
        smart_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute complete workflow with transparency and validation.
        
        Args:
            query: Natural language query
            data_source_id: Data source ID
            agent_context: Agent context with user/org/project info
            progress_callback: Optional callback for progress updates
            
        Returns:
            Complete result with all components, metadata, and progress
        """
        f"{data_source_id}:{hash(query)}"
        progress = PipelineProgress()
        
        try:
            # Stage 1: Validation
            progress.update(PipelineStage.VALIDATION, "Validating data source and query")
            if progress_callback:
                progress_callback(progress)
            
            validation_result = await self._validate_inputs(query, data_source_id, agent_context)
            if not validation_result["valid"]:
                return {
                    "success": False,
                    "error": validation_result["error"],
                    "user_message": validation_result["user_message"],
                    "progress": progress.to_dict()
                }
            
            # Stage 2: Schema Retrieval (with caching)
            progress.update(PipelineStage.SCHEMA_RETRIEVAL, "Retrieving data source schema")
            if progress_callback:
                progress_callback(progress)
            
            schema = await self._get_schema_cached(data_source_id)
            if schema:
                object.__setattr__(agent_context, 'schema', schema)
            
            # Stage 3: SQL Generation
            progress.update(PipelineStage.SQL_GENERATION, "Generating SQL query from natural language")
            if progress_callback:
                progress_callback(progress)
            
            sql_result = await self.orchestrator.nl2sql_agent.generate_sql(
                natural_language_query=query,
                data_source_id=data_source_id,
                context=agent_context,
                schema_info=schema
            )
            
            if not sql_result.get("success") or not sql_result.get("sql_query"):
                return {
                    "success": False,
                    "error": sql_result.get("error", "SQL generation failed"),
                    "user_message": sql_result.get("user_message", "I couldn't generate SQL for your question."),
                    "progress": progress.to_dict(),
                    "sql_generation_metadata": sql_result.get("metadata", {})
                }
            
            sql_query = sql_result["sql_query"]
            progress.metadata["sql_query"] = sql_query
            progress.metadata["sql_generation_time_ms"] = sql_result.get("execution_time", 0) * 1000
            
            # Stage 4: Query Execution (using MultiEngineQueryService)
            progress.update(PipelineStage.QUERY_EXECUTION, "Executing query with optimal engine")
            if progress_callback:
                progress_callback(progress)
            
            query_result, query_metadata = await self._execute_query_optimized(
                sql_query=sql_query,
                data_source_id=data_source_id,
                agent_context=agent_context
            )
            
            # CRITICAL: If query execution fails, check if it's a critical error that should stop execution
            if not query_result.get("success"):
                error_msg = str(query_result.get("error", "")).lower()
                
                # Check for critical errors that indicate data source/schema issues
                critical_errors = [
                    "data source not found",
                    "data source",
                    "schema",
                    "table not found",
                    "no tables",
                    "connection",
                    "permission denied",
                    "access denied"
                ]
                
                is_critical = any(keyword in error_msg for keyword in critical_errors)
                
                if is_critical:
                    logger.error(f"❌ Critical query execution failure: {query_result.get('error')} - stopping execution immediately")
                    return {
                        "success": False,
                        "error": query_result.get("error", "Query execution failed"),
                        "user_message": f"I couldn't execute your query: {query_result.get('error', 'Unknown error')}. Please check your data source connection and try again.",
                        "sql_query": sql_query,  # Include SQL for debugging
                        "progress": progress.to_dict(),
                        "query_metadata": query_metadata.to_dict(),
                        "critical_failure": True  # Indicate this is a critical failure
                    }
                else:
                    # Non-critical error (e.g., SQL syntax) - return partial success with SQL
                    logger.warning(f"⚠️ Query execution failed (non-critical): {query_result.get('error')}")
                    return {
                        "success": False,
                        "error": query_result.get("error", "Query execution failed"),
                        "user_message": f"I generated SQL for your query, but execution failed: {query_result.get('error', 'Unknown error')}. The SQL query is available below.",
                        "sql_query": sql_query,
                        "progress": progress.to_dict(),
                        "query_metadata": query_metadata.to_dict(),
                        "partial_success": True
                    }
            
            query_data = query_result.get("data", [])
            progress.metadata["query_rows"] = len(query_data)
            progress.metadata["query_engine"] = query_metadata.engine_used
            progress.metadata["query_execution_time_ms"] = query_metadata.execution_time_ms
            
            # Store in agent_context for downstream agents
            object.__setattr__(agent_context, 'query_results', query_data)
            
            # Stage 5: Data Validation
            progress.update(PipelineStage.DATA_VALIDATION, "Validating query results")
            if progress_callback:
                progress_callback(progress)
            
            validation = self._validate_query_data(query_data)
            if not validation["valid"]:
                return {
                    "success": False,
                    "error": validation["error"],
                    "user_message": validation["user_message"],
                    "progress": progress.to_dict()
                }
            
            # Stage 6 & 7: Unified Chart and Insights Generation (OPTIMIZED: Single LLM call)
            progress.update(PipelineStage.CHART_GENERATION, "Generating chart and insights")
            if progress_callback:
                progress_callback(progress)
            
            # OPTIMIZATION: Use unified agent to generate both chart and insights in one call
            # This prevents context drift and reduces token usage
            unified_result = await self._generate_unified_chart_and_insights(
                query_data, query, agent_context
            )
            
            # Extract chart and insights from unified result
            # CRITICAL: Check if unified agent actually generated chart config (not just success flag)
            unified_has_chart = bool(
                unified_result.get("primary_chart") or 
                unified_result.get("echarts_config") or 
                unified_result.get("chart_config")
            )
            unified_has_insights = bool(
                unified_result.get("insights") or 
                unified_result.get("executive_summary") or 
                unified_result.get("recommendations")
            )
            
            if unified_result.get("success") and unified_result.get("generation_method") == "unified" and (unified_has_chart or unified_has_insights):
                chart_result = {
                    "success": True,
                    "primary_chart": unified_result.get("primary_chart"),
                    "echarts_config": unified_result.get("echarts_config") or unified_result.get("chart_config"),
                    "chart_config": unified_result.get("chart_config") or unified_result.get("echarts_config"),
                    "agent_id": "chart_generation",
                    "generation_method": "unified"
                }
                insights_result = {
                    "success": True,
                    "insights": unified_result.get("insights", []),
                    "recommendations": unified_result.get("recommendations", []),
                    "executive_summary": unified_result.get("executive_summary"),
                    "agent_id": "insights",
                    "generation_method": "unified"
                }
                logger.info(f"✅ Used unified agent (1 LLM call for chart + insights): has_chart={unified_has_chart}, has_insights={unified_has_insights}")
            else:
                # Fallback to separate agents if unified fails or doesn't have components
                logger.warning(f"⚠️ Unified agent failed or incomplete (success={unified_result.get('success')}, has_chart={unified_has_chart}, has_insights={unified_has_insights}), falling back to separate agents")
                import asyncio
                chart_task = self._generate_chart_with_metadata(
                    query_data, query, agent_context
                )
                insights_task = self._generate_insights_with_metadata(
                    query_data, query, agent_context
                )
                
                chart_result, insights_result = await asyncio.gather(
                    chart_task, insights_task, return_exceptions=True
                )
            
            if isinstance(chart_result, Exception):
                chart_result = {"success": False, "error": str(chart_result)}
            if isinstance(insights_result, Exception):
                insights_result = {"success": False, "error": str(insights_result)}
            
            # Stage 8: Narration Synthesis (OPTIMIZED: Skip if executive summary exists)
            progress.update(PipelineStage.NARRATION_SYNTHESIS, "Synthesizing natural language narration")
            if progress_callback:
                progress_callback(progress)
            
            # Ensure chart_result and insights_result are dicts (not exceptions)
            chart_result_dict = chart_result if isinstance(chart_result, dict) else {"success": False, "error": str(chart_result) if chart_result else "Unknown error"}
            insights_result_dict = insights_result if isinstance(insights_result, dict) else {"success": False, "error": str(insights_result) if insights_result else "Unknown error"}
            
            # OPTIMIZATION: Use executive summary as narration if available (saves 1 LLM call)
            executive_summary = insights_result_dict.get("executive_summary")
            if executive_summary and isinstance(executive_summary, str) and len(executive_summary) > 50:
                # Executive summary is comprehensive enough - use it as narration
                narration = executive_summary
                logger.info("✅ Using executive summary as narration (cost optimization - saved 1 LLM call)")
            elif executive_summary and isinstance(executive_summary, dict) and executive_summary.get("text"):
                narration = executive_summary.get("text")
                logger.info("✅ Using executive summary text as narration (cost optimization - saved 1 LLM call)")
            else:
                # Generate narration only if no executive summary available
                narration = await self._synthesize_narration(
                    query=query,
                    query_data=query_data,
                    chart_result=chart_result_dict,
                    insights_result=insights_result_dict,
                    smart_context=smart_context
                )
            
            # Stage 9: Result Combination
            progress.update(PipelineStage.RESULT_COMBINATION, "Combining all results")
            if progress_callback:
                progress_callback(progress)
            
            # CRITICAL: Extract chart config - prioritize primary_chart
            # Check multiple locations and handle both dict and string formats
            chart_config = (
                chart_result_dict.get("primary_chart") or 
                chart_result_dict.get("echarts_config") or 
                chart_result_dict.get("chart_config")
            )
            
            # If chart_config is a dict with nested primary_chart, extract it
            if chart_config and isinstance(chart_config, dict) and chart_config.get("primary_chart"):
                chart_config = chart_config.get("primary_chart")
                logger.info("✅ Extracted nested primary_chart from chart config")
            
            # CRITICAL: If chart config is a string (JSON), try to parse it
            if chart_config and isinstance(chart_config, str):
                import re
                import json
                # Try to extract JSON from string
                json_match = re.search(r'\{[\s\S]*"title"[\s\S]*"series"[\s\S]*\}', chart_config, re.DOTALL)
                if json_match:
                    try:
                        chart_config = json.loads(json_match.group(0))
                        logger.info("✅ Parsed chart config from JSON string in enhanced pipeline")
                    except json.JSONDecodeError:
                        # Try to find JSON after "ECharts Configuration:" or similar
                        json_match2 = re.search(r'(?:ECharts Configuration|chart config|echarts_config)[:\s]*(\{[\s\S]*\})', chart_config, re.IGNORECASE | re.DOTALL)
                        if json_match2:
                            try:
                                chart_config = json.loads(json_match2.group(1))
                                logger.info("✅ Parsed chart config from prefixed JSON string in enhanced pipeline")
                            except json.JSONDecodeError:
                                logger.warning("⚠️ Failed to parse chart config JSON string in enhanced pipeline")
            
            logger.info(f"📊 Chart config extracted: {bool(chart_config)}, type: {type(chart_config)}")
            if chart_config:
                if isinstance(chart_config, dict):
                    logger.info(f"📊 Chart config keys: {list(chart_config.keys())}")
                else:
                    logger.warning(f"⚠️ Chart config is not a dict: {type(chart_config)}")
            
            final_result = {
                "success": True,
                "sql_query": sql_query,
                "query_result": {
                    "success": True,
                    "data": query_data,
                    "row_count": len(query_data),
                    "columns": list(query_data[0].keys()) if query_data else []
                },
                "echarts_config": chart_config,  # Use extracted chart config
                "chart_data": query_data,
                "insights": insights_result_dict.get("insights", []),
                "recommendations": insights_result_dict.get("recommendations", []),
                "narration": narration,
                "metadata": {
                    "pipeline_used": "enhanced",  # CRITICAL: Mark as enhanced pipeline
                    "sql_generation": sql_result.get("metadata", {}),
                    "query_execution": query_metadata.to_dict(),
                    "chart_generation": chart_result_dict.get("metadata", {}),
                    "insights_generation": insights_result_dict.get("metadata", {}),
                    "transformations": [
                        query_metadata.to_dict(),
                        chart_result_dict.get("transformation_metadata", {}),
                        insights_result_dict.get("transformation_metadata", {})
                    ]
                },
                "progress": progress.to_dict()
            }
            
            # Stage 10: Complete
            progress.update(PipelineStage.COMPLETE, "Workflow complete")
            if progress_callback:
                progress_callback(progress)
            
            # CRITICAL: Log what was generated (same format as standard flow)
            logger.info("🤖 ENHANCED PIPELINE EXECUTION SUMMARY:")
            logger.info(f"  - SQL Query: {bool(sql_query)}")
            # Use actual query_data length (dynamic, not hardcoded)
            actual_row_count = len(query_data) if query_data else 0
            logger.info(f"  - Query Result: {bool(query_data)} ({actual_row_count} rows)")
            logger.info(f"  - Chart Config: {bool(chart_config)}")
            logger.info(f"  - Insights: {len(insights_result_dict.get('insights', []))} items")
            logger.info(f"  - Recommendations: {len(insights_result_dict.get('recommendations', []))} items")
            logger.info(f"  - Narration: {bool(narration)} ({len(narration) if narration else 0} chars)")
            
            # CRITICAL: Use unified extraction to ensure consistent format
            from app.modules.ai.utils.result_extraction import extract_structured_components
            
            # Extract using unified function (for consistency with standard flow)
            extracted = extract_structured_components(
                result=final_result,
                primary_result=None,
                collaborating_results=None
            )
            
            # Use actual query result row count (dynamic, not hardcoded)
            query_result_data = extracted.get('query_result', {})
            if isinstance(query_result_data, dict):
                actual_row_count = len(query_result_data.get('data', [])) if query_result_data.get('data') else 0
            elif isinstance(query_result_data, list):
                actual_row_count = len(query_result_data)
            else:
                actual_row_count = 0
            
            logger.info("📦 UNIFIED EXTRACTION RESULTS (Enhanced Pipeline):")
            logger.info(f"  - SQL Query: {bool(extracted['sql_query'])}")
            logger.info(f"  - Query Result: {bool(extracted['query_result'])} ({actual_row_count} rows)")
            logger.info(f"  - Chart Config: {bool(extracted['echarts_config'])}")
            logger.info(f"  - Insights: {len(extracted['insights'])} items")
            logger.info(f"  - Recommendations: {len(extracted['recommendations'])} items")
            logger.info(f"  - Narration: {bool(extracted['narration'])}")
            
            # Ensure all extracted components are in final_result
            if extracted["sql_query"] and not final_result.get("sql_query"):
                final_result["sql_query"] = extracted["sql_query"]
            if extracted["query_result"] and not final_result.get("query_result"):
                final_result["query_result"] = extracted["query_result"]
            if extracted["echarts_config"] and not final_result.get("echarts_config"):
                final_result["echarts_config"] = extracted["echarts_config"]
            if extracted["insights"] and not final_result.get("insights"):
                final_result["insights"] = extracted["insights"]
            if extracted["recommendations"] and not final_result.get("recommendations"):
                final_result["recommendations"] = extracted["recommendations"]
            if extracted["narration"] and not final_result.get("narration"):
                final_result["narration"] = extracted["narration"]
            
            logger.info(f"✅ Enhanced pipeline result: success={final_result.get('success')}, has_all_components={all([final_result.get('sql_query'), final_result.get('echarts_config'), final_result.get('insights') or final_result.get('narration')])}")
            
            return final_result
            
        except Exception as e:
            logger.error(f"Workflow execution failed: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "user_message": "I encountered an error processing your request. Please try again.",
                "progress": progress.to_dict()
            }
    
    async def _validate_inputs(
        self,
        query: str,
        data_source_id: str,
        agent_context: Any
    ) -> Dict[str, Any]:
        """Validate inputs before processing"""
        if not query or not query.strip():
            return {
                "valid": False,
                "error": "Query is required",
                "user_message": "Please provide a question or query."
            }
        
        if not data_source_id:
            return {
                "valid": False,
                "error": "Data source is required",
                "user_message": "Please select a data source to query."
            }
        
        # Check data source exists (use cache if available)
        # This is already done in orchestrator, but we validate here too
        
        return {"valid": True}
    
    async def _get_schema_cached(self, data_source_id: str) -> Optional[Dict[str, Any]]:
        """Get schema with caching"""
        # Check cache first
        cached_schema = self.schema_cache.get_schema(data_source_id)
        if cached_schema:
            return cached_schema
        
        # Fetch and cache
        from app.modules.data.services.data_connectivity_service import DataConnectivityService
        data_service = DataConnectivityService()
        
        schema_result = await data_service.get_source_schema(data_source_id)
        if schema_result.get('success'):
            schema = schema_result.get('schema', {})
            self.schema_cache.set_schema(data_source_id, schema, ttl_hours=24)
            return schema
        
        return None
    
    async def _execute_query_optimized(
        self,
        sql_query: str,
        data_source_id: str,
        agent_context: Any
    ) -> Tuple[Dict[str, Any], TransformationMetadata]:
        """
        Execute query using MultiEngineQueryService for optimal engine selection.
        
        Returns:
            Tuple of (query_result_dict, transformation_metadata)
        """
        start_time = time.time()
        
        # Check query cache first
        cached_result = self.query_cache.get_result(data_source_id, sql_query)
        if cached_result:
            metadata = TransformationMetadata(
                operation="query_execution",
                execution_time_ms=(time.time() - start_time) * 1000,
                engine_used="cache",
                rows_processed=len(cached_result.get("data", [])),
                metadata={"cached": True}
            )
            return cached_result, metadata
        
        # Get data source info
        from app.modules.data.services.data_connectivity_service import DataConnectivityService
        data_service = DataConnectivityService()
        data_source = await data_service.get_data_source_by_id(data_source_id)
        
        if not data_source:
            return {
                "success": False,
                "error": "Data source not found"
            }, TransformationMetadata(operation="query_execution", execution_time_ms=0)
        
        # Use MultiEngineQueryService for optimal engine selection
        try:
            query_result = await self.multi_query_service.execute_query(
                query=sql_query,
                data_source=data_source,
                optimization=True
            )
            
            execution_time_ms = (time.time() - start_time) * 1000
            
            # Cache successful results
            if query_result.get("success"):
                self.query_cache.set_result(
                    data_source_id, sql_query, query_result, ttl_minutes=30
                )
            
            query_data = query_result.get("data", [])
            num_rows = len(query_data)
            num_cols = len(query_data[0]) if query_data and isinstance(query_data[0], dict) else 0
            columns = list(query_data[0].keys()) if query_data and isinstance(query_data[0], dict) else []
            
            metadata = TransformationMetadata(
                operation="query_execution",
                input_shape=(None, None),  # SQL query
                output_shape=(num_rows, num_cols),
                execution_time_ms=execution_time_ms,
                engine_used=query_result.get("engine", "unknown"),
                rows_processed=num_rows,
                columns_processed=columns,
                metadata={
                    "engine": query_result.get("engine"),
                    "cached": False,
                    "optimization_used": True
                }
            )
            
            return query_result, metadata
            
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "data": []
            }, TransformationMetadata(
                operation="query_execution",
                execution_time_ms=(time.time() - start_time) * 1000,
                metadata={"error": str(e)}
            )
    
    def _validate_query_data(self, data: List[Dict]) -> Dict[str, Any]:
        """Validate query result data"""
        if not data:
            return {
                "valid": False,
                "error": "No data returned",
                "user_message": "Your query returned no results. Please try a different question or check your data source."
            }
        
        if not isinstance(data, list):
            return {
                "valid": False,
                "error": "Invalid data format",
                "user_message": "The query returned data in an unexpected format."
            }
        
        if len(data) == 0:
            return {
                "valid": False,
                "error": "Empty result set",
                "user_message": "Your query returned no rows. Please adjust your query or check your data."
            }
        
        return {"valid": True}
    
    async def _generate_chart_with_metadata(
        self,
        data: List[Dict],
        query: str,
        agent_context: Any
    ) -> Dict[str, Any]:
        """Generate chart with transformation metadata and data sanitization"""
        start_time = time.time()
        
        # Validate data before chart generation
        if not data or len(data) == 0:
            return {
                "success": False,
                "error": "no_data",
                "message": "No data available for chart generation",
                "user_message": "I couldn't generate a chart because your query returned no data. Please try a different question.",
                "primary_chart": None,
                "echarts_config": None,
                "metadata": {
                    "execution_time_ms": int((time.time() - start_time) * 1000),
                    "error": "no_data"
                }
            }
        
        result = await self.orchestrator.chart_agent.generate_chart(
            data=data,
            query_intent=query,
            title="Chart Analysis",
            context=agent_context,
            use_llm_based=False  # Use existing reliable method
        )
        
        execution_time_ms = (time.time() - start_time) * 1000
        
        # Add transformation metadata
        result["transformation_metadata"] = TransformationMetadata(
            operation="chart_generation",
            input_shape=(len(data), len(data[0]) if data else 0),
            execution_time_ms=execution_time_ms,
            rows_processed=len(data),
            columns_processed=list(data[0].keys()) if data else [],
            metadata={
                "chart_type": result.get("primary_chart", {}).get("chart_type") if isinstance(result.get("primary_chart"), dict) else "unknown",
                "has_primary_chart": bool(result.get("primary_chart"))
            }
        ).to_dict()
        
        return result
    
    async def _generate_insights_with_metadata(
        self,
        data: List[Dict],
        query: str,
        agent_context: Any
    ) -> Dict[str, Any]:
        """Generate insights with transformation metadata"""
        start_time = time.time()
        
        result = await self.orchestrator.insights_agent.generate_insights(
            data=data,
            query_context=query,
            user_role=agent_context.user_role,
            context=agent_context
        )
        
        execution_time_ms = (time.time() - start_time) * 1000
        
        # Add transformation metadata
        result["transformation_metadata"] = TransformationMetadata(
            operation="insights_generation",
            input_shape=(len(data), len(data[0]) if data else 0),
            execution_time_ms=execution_time_ms,
            rows_processed=len(data),
            columns_processed=list(data[0].keys()) if data else [],
            metadata={
                "insights_count": len(result.get("insights", [])),
                "recommendations_count": len(result.get("recommendations", []))
            }
        ).to_dict()
        
        return result
    
    async def _generate_unified_chart_and_insights(
        self,
        data: List[Dict],
        query: str,
        agent_context: Any
    ) -> Dict[str, Any]:
        """Generate both chart and insights using unified agent (single LLM call)."""
        try:
            # Check if unified agent is available
            if not hasattr(self.orchestrator, 'unified_agent'):
                # Initialize unified agent if not exists
                from app.modules.ai.agents.unified_chart_insights_agent import UnifiedChartInsightsAgent
                self.orchestrator.unified_agent = UnifiedChartInsightsAgent(
                    litellm_service=self.orchestrator.litellm_service,
                    chart_agent=self.orchestrator.chart_agent,
                    insights_agent=self.orchestrator.insights_agent
                )
                logger.info("✅ Initialized unified chart+insights agent")
            
            # Infer query result schema
            query_result_schema = self._infer_query_result_schema(data)
            
            # Generate both chart and insights in one call
            result = await self.orchestrator.unified_agent.generate_chart_and_insights(
                data=data,
                query_intent=query,
                title="Chart Analysis",
                context=agent_context,
                query_result_schema=query_result_schema
            )
            
            return result
        except Exception as e:
            logger.warning(f"⚠️ Unified agent failed: {e}, will fallback to separate agents")
            return {"success": False, "error": str(e), "generation_method": "failed"}
    
    def _infer_query_result_schema(self, data: List[Dict]) -> Dict[str, Any]:
        """Infer schema from query results data."""
        if not data or len(data) == 0:
            return {}
        
        schema = {}
        first_row = data[0]
        
        for column_name in first_row.keys():
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
    
    async def _synthesize_narration(
        self,
        query: str,
        query_data: List[Dict],
        chart_result: Dict[str, Any],
        insights_result: Dict[str, Any],
        smart_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Synthesize natural language narration with smart context engineering"""
        try:
            # Extract key information
            insights = insights_result.get("insights", [])
            recommendations = insights_result.get("recommendations", [])
            executive_summary = insights_result.get("executive_summary", "")
            
            # AI-NATIVE: Build comprehensive context for LLM synthesis
            chart_type = "visualization"
            if chart_result.get("primary_chart"):
                chart_config = chart_result.get("primary_chart")
                if isinstance(chart_config, dict):
                    series = chart_config.get("series", [])
                    if series and isinstance(series, list) and len(series) > 0:
                        chart_type = series[0].get("type", "chart")
            
            data_summary = f"Query returned {len(query_data)} rows of data" if query_data else "Query executed but returned no data rows"
            
            # Build AI-native synthesis prompt
            base_prompt = f"""You are an expert data analytics assistant. Synthesize a clear, natural language response.

**User's Question:** {query}
**Data Summary:** {data_summary}
**Chart Generated:** {chart_type.title()} chart
**Key Insights:** {json.dumps(insights[:5], indent=2) if insights else "No specific insights."}
**Recommendations:** {json.dumps(recommendations[:3], indent=2) if recommendations else "No specific recommendations."}
**Executive Summary:** {executive_summary if executive_summary else "Analysis completed."}

Provide a 2-3 paragraph response that:
1. Directly answers the user's question
2. Highlights key findings
3. Explains what the chart shows
4. Provides actionable insights

Use natural, professional language. Return ONLY the narration text, no markdown."""
            
            # Enhance with smart context if available
            if smart_context and hasattr(self.orchestrator, 'litellm_service'):
                from app.modules.ai.services.smart_context_engineer import get_smart_context_engineer
                context_engineer = get_smart_context_engineer(self.orchestrator.litellm_service)
                enhanced_prompt = await context_engineer.enhance_prompt_with_context(base_prompt, smart_context)
            else:
                enhanced_prompt = base_prompt
            
            # Use LLM to synthesize if available
            if hasattr(self.orchestrator, 'litellm_service'):
                synthesis_result = await self.orchestrator.litellm_service.generate_completion(
                    prompt=enhanced_prompt,
                    system_context="You are a helpful data analytics assistant. Provide clear, actionable insights.",
                    max_tokens=500,
                    temperature=0.7
                )
                
                narration = synthesis_result.get("content", "").strip()
                
                # Parse structured JSON if present
                try:
                    if narration.startswith("{") or narration.startswith("```json"):
                        # Try to extract JSON
                        import re
                        json_match = re.search(r'\{[^{}]*"narration"[^{}]*\}', narration, re.DOTALL)
                        if json_match:
                            parsed = json.loads(json_match.group())
                            narration = parsed.get("narration", narration)
                except Exception:
                    pass
                
                return narration
            
            # Fallback to simple synthesis
            if executive_summary:
                return executive_summary
            elif insights:
                return f"Based on the data analysis, here are the key findings: {', '.join(insights[:3])}"
            else:
                return f"I analyzed {len(query_data)} rows of data for your question: '{query}'. The results are displayed in the chart above."
                
        except Exception as e:
            logger.warning(f"Narration synthesis failed: {e}, using fallback")
            return f"I've analyzed your data and generated insights for: '{query}'"

