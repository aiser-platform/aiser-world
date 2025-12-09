"""
Deep File Analysis Node for LangGraph Workflow

Implements multi-step analysis workflow for file data sources:
1. Data Profiling (statistical summaries)
2. Analysis Planning (break query into sub-questions)
3. Multi-Query Execution (run multiple SQL queries)
4. Result Synthesis (combine into comprehensive report)
"""

import logging
import json
from typing import Any, Dict, List, Optional
import duckdb
import pandas as pd

from app.modules.ai.schemas.graph_state import AiserWorkflowState
from app.modules.ai.services.litellm_service import LiteLLMService

logger = logging.getLogger(__name__)


async def deep_file_analysis_node(state: AiserWorkflowState) -> AiserWorkflowState:
    """
    Deep file analysis node that performs comprehensive multi-step analysis.
    
    Workflow:
    1. Profiling: Run statistical profile queries (SUMMARIZE, DISTINCT counts, etc.)
    2. Planning: LLM breaks user query into sub-questions
    3. Execution: Run multiple SQL queries in parallel via MultiEngineQueryService
    4. Use existing unified_chart_insights_node for chart/insights/recommendations generation
    
    This reuses the battle-tested unified node instead of custom synthesis logic.
    """
    try:
        logger.info("🔬 Starting deep file analysis workflow")
        
        data_source_id = state.get("data_source_id")
        query = state.get("query", "")
        
        if not data_source_id:
            state["error"] = "No data source ID provided for deep file analysis"
            state["current_stage"] = "deep_analysis_error"
            return state
        
        # Get data source info
        from app.modules.data.services.data_connectivity_service import DataConnectivityService
        data_service = DataConnectivityService()
        data_source = await data_service.get_data_source_by_id(data_source_id)
        
        if not data_source:
            state["error"] = f"Data source {data_source_id} not found"
            state["current_stage"] = "deep_analysis_error"
            return state
        
        if data_source.get("type") != "file":
            logger.warning(f"⚠️ Deep file analysis called for non-file data source: {data_source.get('type')}")
            # Fallback to regular analysis
            state["current_stage"] = "deep_analysis_skipped"
            return state
        
        # Get model from state or use default
        execution_metadata = state.get("execution_metadata", {})
        model = execution_metadata.get("model_used") or state.get("model") or None
        
        # Ensure execution_metadata and reasoning_steps exist
        if "execution_metadata" not in state:
            state["execution_metadata"] = {}
        if "reasoning_steps" not in state["execution_metadata"] or state["execution_metadata"]["reasoning_steps"] is None:
            state["execution_metadata"]["reasoning_steps"] = []
        
        reasoning_steps = state["execution_metadata"]["reasoning_steps"]
        
        # Step 1: Data Profiling
        logger.info("📊 Step 1: Running data profiling...")
        state["progress_message"] = "Analyzing data structure and statistics..."
        state["progress_percentage"] = 20.0
        state["current_stage"] = "deep_analysis_profiling"
        reasoning_steps.append({
            "step": "Data Profiling",
            "description": "Analyzing data structure, statistics, and data quality metrics",
            "status": "processing"
        })
        
        profile_result = await _run_data_profiling(data_source)
        if reasoning_steps and len(reasoning_steps) > 0:
            reasoning_steps[-1]["status"] = "complete"
        state["progress_percentage"] = 30.0
        
        # Step 2: Analysis Planning (Break query into sub-questions)
        logger.info("🧠 Step 2: Planning analysis strategy...")
        state["progress_message"] = "Planning comprehensive analysis strategy..."
        state["progress_percentage"] = 40.0
        state["current_stage"] = "deep_analysis_planning"
        reasoning_steps.append({
            "step": "Analysis Planning",
            "description": "Breaking query into sub-questions and creating execution plan",
            "status": "processing"
        })
        
        analysis_plan = await _create_analysis_plan(query, profile_result, data_source, model=model)
        if reasoning_steps and len(reasoning_steps) > 0:
            reasoning_steps[-1]["status"] = "complete"
        state["progress_percentage"] = 50.0
        
        # Step 3: Execute Multiple Queries
        logger.info("⚡ Step 3: Executing analysis queries...")
        state["progress_message"] = f"Executing {len(analysis_plan.get('sub_questions', []))} analysis queries..."
        state["progress_percentage"] = 60.0
        state["current_stage"] = "deep_analysis_execution"
        if "reasoning_steps" not in state["execution_metadata"] or state["execution_metadata"]["reasoning_steps"] is None:
            state["execution_metadata"]["reasoning_steps"] = []
        reasoning_steps = state["execution_metadata"]["reasoning_steps"]
        reasoning_steps.append({
            "step": "Query Execution",
            "description": f"Running {len(analysis_plan.get('sub_questions', []))} SQL queries in parallel",
            "status": "processing"
        })
        
        query_results = await _execute_analysis_queries(analysis_plan, data_source)
        if reasoning_steps and len(reasoning_steps) > 0:
            reasoning_steps[-1]["status"] = "complete"
        state["progress_percentage"] = 80.0
        
        # Step 4: Generate multiple charts (one per query result) + unified insights/recommendations
        logger.info("🎨 Step 4: Generating charts per result and insights via unified node...")
        state["progress_message"] = "Generating visualizations and insights..."
        state["progress_percentage"] = 90.0
        state["current_stage"] = "deep_analysis_synthesis"
        if "reasoning_steps" not in state["execution_metadata"] or state["execution_metadata"]["reasoning_steps"] is None:
            state["execution_metadata"]["reasoning_steps"] = []
        reasoning_steps = state["execution_metadata"]["reasoning_steps"]
        reasoning_steps.append({
            "step": "Chart & Insights Generation",
            "description": "Generating one chart per query result, plus insights and recommendations",
            "status": "processing"
        })
        
        # Generate ONE CHART per query result
        deep_analysis_charts = []
        combined_data = []
        
        from app.modules.ai.agents.chart_generation_agent import IntelligentChartGenerationAgent
        
        for idx, qr in enumerate(query_results):
            result = qr.get("result", {})
            if not result or result.get("success") is False:
                logger.debug(f"⏭️ Skipping chart for failed query: {result.get('error', 'Unknown')}")
                continue
            
            chart_data = result.get("data", [])
            if not chart_data or len(chart_data) == 0:
                logger.debug(f"⏭️ Skipping chart - no data for: {qr.get('question', 'Unknown')}")
                continue
            
            # Add to combined data for insights generation
            if isinstance(chart_data, list):
                combined_data.extend(chart_data)
            
            # Generate chart for THIS specific query result
            try:
                chart_state = {
                    "query": qr.get("question", "Analysis Result"),
                    "query_result": chart_data,
                    "sql_query": qr.get("sql", ""),
                    "data_source_id": state.get("data_source_id")
                }
                
                # Use IntelligentChartGenerationAgent to generate chart
                try:
                    from app.modules.data.services.multi_engine_query_service import MultiEngineQueryService
                    chart_agent = IntelligentChartGenerationAgent(MultiEngineQueryService())
                    chart_result = await chart_agent.generate_chart_config(
                        query=qr.get("question", ""),
                        query_result=chart_data
                    )
                    if chart_result and chart_result.get("echarts_config"):
                        deep_analysis_charts.append({
                            "title": qr.get("question", f"Chart {idx + 1}"),
                            "type": chart_result.get("chart_type", "bar"),
                            "option": chart_result["echarts_config"]
                        })
                        logger.info(f"✅ Generated chart for: {qr.get('question', 'Result')}")
                except Exception as chart_agent_error:
                    logger.debug(f"Chart agent generation failed, using fallback: {chart_agent_error}")
                    # Fallback: Use basic chart generation
                    basic_chart = _generate_basic_chart_config(
                        data=chart_data,
                        title=qr.get("question", f"Chart {idx + 1}"),
                        chart_type="bar"
                    )
                    if basic_chart and basic_chart.get("option"):
                        deep_analysis_charts.append(basic_chart)
                        logger.info(f"✅ Generated fallback chart for: {qr.get('question', 'Result')}")
                        
            except Exception as e:
                logger.error(f"❌ Failed to generate chart for '{qr.get('question', 'Unknown')}': {e}", exc_info=True)
        
        # Store all generated charts in deep_analysis_charts for carousel
        if deep_analysis_charts:
            if "execution_metadata" not in state:
                state["execution_metadata"] = {}
            state["execution_metadata"]["deep_analysis_charts"] = deep_analysis_charts
            # Also set primary chart (first one)
            if deep_analysis_charts and deep_analysis_charts[0].get("option"):
                state["echarts_config"] = deep_analysis_charts[0]["option"]
        
        # Now use unified node on COMBINED data to generate insights/recommendations
        state["query_result"] = combined_data
        
        from app.modules.ai.nodes.unified_node import unified_chart_insights_node
        state = await unified_chart_insights_node(state)
        
        # IMPORTANT: Preserve deep_analysis_charts from our multi-chart generation
        if deep_analysis_charts and "execution_metadata" in state:
            state["execution_metadata"]["deep_analysis_charts"] = deep_analysis_charts
        
        if reasoning_steps and len(reasoning_steps) > 0:
            reasoning_steps[-1]["status"] = "complete"
        state["progress_message"] = "Deep analysis complete"
        state["progress_percentage"] = 100.0
        state["current_stage"] = "deep_analysis_complete"
        logger.info("✅ Deep file analysis complete with unified node")
        
        return state
        
    except Exception as e:
        logger.error(f"❌ Deep file analysis node failed: {e}", exc_info=True)
        state["error"] = f"Deep file analysis failed: {str(e)}"
        state["current_stage"] = "deep_analysis_error"
        state["progress_message"] = f"Analysis error: {str(e)}"
        return state


async def _run_data_profiling(data_source: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run statistical profiling queries to understand data structure.
    Returns a profile dictionary with column statistics, data quality metrics, etc.
    """
    try:
        file_path = data_source.get("file_path")
        file_format = data_source.get("format", "csv")
        schema = data_source.get("schema", {})
        
        # Check if DuckDB tables are already created (multi-sheet Excel)
        duckdb_tables = schema.get("duckdb_tables") if isinstance(schema, dict) else None
        
        conn = duckdb.connect()
        profile = {
            "columns": [],
            "row_count": 0,
            "data_quality": {},
            "statistical_summary": {}
        }
        
        try:
            # Load file data if not already loaded
            if not duckdb_tables:
                if not file_path:
                    raise Exception("No file_path available for data profiling")
                
                if file_format == "csv":
                    safe_path = file_path.replace("'", "''") if file_path else ""
                    conn.execute(f"CREATE TABLE IF NOT EXISTS data AS SELECT * FROM read_csv_auto('{safe_path}')")
                elif file_format == "parquet":
                    safe_path = file_path.replace("'", "''") if file_path else ""
                    conn.execute(f"CREATE TABLE IF NOT EXISTS data AS SELECT * FROM read_parquet('{safe_path}')")
                elif file_format in ("xlsx", "xls"):
                    # Use pandas to read Excel and register with DuckDB
                    try:
                        df = pd.read_excel(file_path, engine='openpyxl', sheet_name=0)  # Read first sheet
                        conn.register("_excel_df", df)
                        conn.execute("CREATE TABLE IF NOT EXISTS data AS SELECT * FROM _excel_df")
                        logger.info(f"✅ Loaded Excel file into DuckDB: {len(df)} rows, {len(df.columns)} columns")
                    except Exception as excel_error:
                        logger.error(f"❌ Failed to load Excel file: {excel_error}")
                        raise Exception(f"Excel file processing failed: {str(excel_error)}")
                else:
                    raise Exception(f"Unsupported file format: {file_format}")
                table_name = "data"
            else:
                # Use first sheet table
                table_name = list(duckdb_tables.values())[0]
                conn.execute(f"CREATE OR REPLACE VIEW data AS SELECT * FROM {table_name}")
            
            # Get row count
            row_count = conn.execute("SELECT COUNT(*) FROM data").fetchone()[0]
            profile["row_count"] = row_count
            
            # Get column info
            columns_info = conn.execute("DESCRIBE data").fetchall()
            column_names = [col[0] for col in columns_info]
            
            # For each column, get statistical summary
            for col_name, col_type in columns_info:
                col_profile = {
                    "name": col_name,
                    "type": col_type,
                    "null_count": 0,
                    "distinct_count": 0,
                    "min": None,
                    "max": None,
                    "avg": None,
                    "sample_values": []
                }
                
                try:
                    # Null count
                    null_result = conn.execute(f"SELECT COUNT(*) FROM data WHERE {col_name} IS NULL").fetchone()
                    col_profile["null_count"] = null_result[0] if null_result else 0
                    
                    # Distinct count
                    distinct_result = conn.execute(f"SELECT COUNT(DISTINCT {col_name}) FROM data").fetchone()
                    col_profile["distinct_count"] = distinct_result[0] if distinct_result else 0
                    
                    # For numeric columns, get min/max/avg
                    if "INT" in col_type.upper() or "DOUBLE" in col_type.upper() or "FLOAT" in col_type.upper() or "DECIMAL" in col_type.upper():
                        try:
                            stats = conn.execute(f"""
                                SELECT 
                                    MIN({col_name}) as min_val,
                                    MAX({col_name}) as max_val,
                                    AVG({col_name}) as avg_val
                                FROM data
                                WHERE {col_name} IS NOT NULL
                            """).fetchone()
                            if stats:
                                col_profile["min"] = stats[0]
                                col_profile["max"] = stats[1]
                                col_profile["avg"] = float(stats[2]) if stats[2] is not None else None
                        except Exception as e:
                            logger.debug(f"Could not get numeric stats for {col_name}: {e}")
                    
                    # Sample values (most common)
                    try:
                        sample = conn.execute(f"""
                            SELECT {col_name}, COUNT(*) as cnt
                            FROM data
                            WHERE {col_name} IS NOT NULL
                            GROUP BY {col_name}
                            ORDER BY cnt DESC
                            LIMIT 5
                        """).fetchall()
                        col_profile["sample_values"] = [row[0] for row in sample]
                    except Exception as e:
                        logger.debug(f"Could not get sample values for {col_name}: {e}")
                    
                except Exception as col_error:
                    logger.warning(f"Error profiling column {col_name}: {col_error}")
                
                profile["columns"].append(col_profile)
            
            # Data quality metrics
            profile["data_quality"] = {
                "total_rows": row_count,
                "total_columns": len(column_names),
                "columns_with_nulls": sum(1 for col in profile["columns"] if col["null_count"] > 0),
                "columns_with_duplicates": sum(1 for col in profile["columns"] if col["distinct_count"] < row_count and col["distinct_count"] > 0)
            }
            
            conn.close()
            logger.info(f"✅ Data profiling complete: {row_count} rows, {len(column_names)} columns")
            
        except Exception as e:
            logger.error(f"❌ Data profiling failed: {e}")
            conn.close()
            raise
        
        return profile
        
    except Exception as e:
        logger.error(f"❌ Data profiling error: {e}", exc_info=True)
        return {"error": str(e)}


async def _create_analysis_plan(query: str, profile: Dict[str, Any], data_source: Dict[str, Any], model: Optional[str] = None) -> Dict[str, Any]:
    """
    Use LLM to create an analysis plan, breaking the user query into sub-questions.
    Returns a plan with multiple SQL queries to execute.
    """
    try:
        from app.modules.ai.services.litellm_service import LiteLLMService
        litellm_service = LiteLLMService()
        
        # Use model from parameter, or get default from litellm_service
        if not model:
            # Try to get active model from litellm_service
            model = getattr(litellm_service, 'active_model', None) or getattr(litellm_service, 'default_model', None)
            if not model:
                # Fallback: use environment variable or default
                import os
                model = os.getenv('DEFAULT_LLM_MODEL', None)
        
        # Build context for LLM
        columns_info = "\n".join([
            f"- {col['name']} ({col['type']}): nulls={col['null_count']}, distinct={col['distinct_count']}, "
            f"range=[{col.get('min', 'N/A')}, {col.get('max', 'N/A')}]"
            for col in profile.get("columns", [])[:20]  # Limit to first 20 columns
        ])
        
        prompt = f"""You are a data analyst. Given a user query and data profile, create a comprehensive analysis plan.

User Query: {query}

Data Profile:
- Total Rows: {profile.get('row_count', 0)}
- Columns: {len(profile.get('columns', []))}
- Column Details:
{columns_info}

Data Quality:
- Columns with nulls: {profile.get('data_quality', {}).get('columns_with_nulls', 0)}
- Columns with duplicates: {profile.get('data_quality', {}).get('columns_with_duplicates', 0)}

Create an analysis plan that breaks the user query into 3-5 sub-questions, each requiring a SQL query.
For each sub-question, provide:
1. The question/purpose
2. The SQL query (using table name 'data')
3. Expected output type (chart type, metric, etc.)

Return a JSON object with this structure:
{{
    "sub_questions": [
        {{
            "question": "What is the question this query answers?",
            "sql": "SELECT ... FROM data WHERE ...",
            "output_type": "line_chart|bar_chart|table|metric",
            "priority": 1
        }}
    ],
    "overall_strategy": "Brief description of the analysis approach"
}}"""

        # Call generate_completion without model if None (will use service default)
        call_kwargs = {
            "prompt": prompt,
            "temperature": 0.3,
            "max_tokens": 2000
        }
        if model:
            call_kwargs["model"] = model
        
        response = await litellm_service.generate_completion(**call_kwargs)
        
        if not response.get("success") or not response.get("content"):
            logger.warning("⚠️ LLM failed to generate analysis plan, using fallback")
            # Fallback: create simple plan
            return {
                "sub_questions": [
                    {
                        "question": "Basic data summary",
                        "sql": "SELECT COUNT(*) as total_rows FROM data",
                        "output_type": "metric",
                        "priority": 1
                    }
                ],
                "overall_strategy": "Basic analysis"
            }
        
        # Parse JSON response
        try:
            content = response["content"]
            # Extract JSON from markdown code blocks if present
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            plan = json.loads(content)
            logger.info(f"✅ Analysis plan created: {len(plan.get('sub_questions', []))} sub-questions")
            return plan
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ Failed to parse analysis plan JSON: {e}")
            logger.error(f"Response content: {response['content'][:500]}")
            # Fallback plan
            return {
                "sub_questions": [
                    {
                        "question": "Basic data summary",
                        "sql": "SELECT COUNT(*) as total_rows FROM data",
                        "output_type": "metric",
                        "priority": 1
                    }
                ],
                "overall_strategy": "Basic analysis"
            }
        
    except Exception as e:
        logger.error(f"❌ Analysis planning failed: {e}", exc_info=True)
        # Return minimal fallback plan
        return {
            "sub_questions": [
                {
                    "question": "Basic data summary",
                    "sql": "SELECT COUNT(*) as total_rows FROM data",
                    "output_type": "metric",
                    "priority": 1
                }
            ],
            "overall_strategy": "Basic analysis"
        }


async def _execute_analysis_queries(plan: Dict[str, Any], data_source: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Execute all SQL queries from the analysis plan using MultiEngineQueryService.
    This ensures proper engine selection (DuckDB for files) and consistent error handling.
    Returns a list of query results.
    """
    try:
        from app.modules.data.services.multi_engine_query_service import MultiEngineQueryService
        
        results = []
        sub_questions = plan.get("sub_questions", [])
        
        if not sub_questions:
            logger.warning("⚠️ No sub-questions in analysis plan")
            return []
        
        # Initialize query service
        query_service = MultiEngineQueryService()
        
        # Execute queries in parallel using asyncio
        import asyncio
        tasks = []
        for sq in sub_questions:
            sql = sq.get("sql", "").strip()
            if not sql:
                continue
            
            # Use MultiEngineQueryService.execute_query which will:
            # 1. Automatically select DuckDB for file sources
            # 2. Handle file loading (CSV, Parquet, Excel with multi-sheet support)
            # 3. Provide proper error handling and caching
            task = query_service.execute_query(
                query=sql,
                data_source=data_source,
                engine=None,  # Let service auto-select (will choose DuckDB for files)
                optimization=True
            )
            tasks.append((task, sq))
        
        # Wait for all queries to complete
        for task, sq in tasks:
            try:
                result = await task
                
                # Extract data from result
                if result.get("success"):
                    query_data = result.get("data", [])
                    query_columns = result.get("columns", [])
                    
                    results.append({
                        "question": sq.get("question", ""),
                        "output_type": sq.get("output_type", "table"),
                        "priority": sq.get("priority", 1),
                        "result": {
                            "success": True,
                            "data": query_data,
                            "columns": query_columns,
                            "row_count": len(query_data),
                            "engine": result.get("engine", "unknown")
                        }
                    })
                    logger.info(f"✅ Executed query via {result.get('engine', 'unknown')}: {sq.get('question', '')[:50]}... ({len(query_data)} rows)")
                else:
                    error_msg = result.get("error", "Unknown error")
                    logger.error(f"❌ Query execution failed for question '{sq.get('question', '')}': {error_msg}")
                    results.append({
                        "question": sq.get("question", ""),
                        "output_type": sq.get("output_type", "table"),
                        "priority": sq.get("priority", 1),
                        "result": {
                            "success": False,
                            "error": error_msg,
                            "engine": result.get("engine", "unknown")
                        }
                    })
                    
            except Exception as e:
                logger.error(f"❌ Query execution exception for question '{sq.get('question', '')}': {e}", exc_info=True)
                results.append({
                    "question": sq.get("question", ""),
                    "output_type": sq.get("output_type", "table"),
                    "priority": sq.get("priority", 1),
                    "result": {"success": False, "error": str(e)}
                })
        
        # Sort by priority
        results.sort(key=lambda x: x.get("priority", 999))
        
        logger.info(f"✅ Executed {len(results)} analysis queries via MultiEngineQueryService")
        return results
        
    except Exception as e:
        logger.error(f"❌ Query execution failed: {e}", exc_info=True)
        return []


def _generate_basic_chart_config(data: List[Dict[str, Any]], title: str, chart_type: str) -> Dict[str, Any]:
    """
    Generate a basic ECharts configuration from data.
    This is a fallback when IntelligentChartGenerationAgent is not available.
    
    Returns dict with "option" key containing ECharts config
    """
    if not data or len(data) == 0:
        logger.warning(f"Cannot generate chart - no data provided")
        return {}
    
    try:
        # Get column names from first row
        columns = list(data[0].keys()) if data else []
        if len(columns) < 1:
            logger.warning(f"Cannot generate chart - data has no columns")
            return {}
        
        # Use first two columns for X and Y
        x_column = columns[0]
        y_column = columns[1] if len(columns) > 1 else columns[0]
        
        x_data = []
        y_data = []
        
        for row in data:
            x_val = row.get(x_column)
            y_val = row.get(y_column)
            # Convert to appropriate types
            try:
                if isinstance(y_val, (int, float)):
                    y_data.append(y_val)
                else:
                    y_data.append(float(y_val) if y_val else 0)
            except (ValueError, TypeError):
                y_data.append(0)
            x_data.append(str(x_val) if x_val else "")
        
        # Build ECharts configuration
        echarts_option = {
            "title": {
                "text": title,
                "left": "center",
                "textStyle": {
                    "fontSize": 14,
                    "fontWeight": "bold"
                }
            },
            "tooltip": {
                "trigger": "axis" if chart_type == "line" else "item",
                "formatter": "{b}: {c}"
            },
            "grid": {
                "left": "10%",
                "right": "10%",
                "bottom": "10%",
                "containLabel": True
            },
            "xAxis": {
                "type": "category",
                "data": x_data,
                "name": x_column
            },
            "yAxis": {
                "type": "value",
                "name": y_column
            },
            "series": [{
                "name": y_column,
                "type": chart_type if chart_type in ["bar", "line", "scatter"] else "bar",
                "data": y_data,
                "smooth": True if chart_type == "line" else False
            }],
            "color": ["#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de"]
        }
        
        return {
            "title": title,
            "type": chart_type,
            "option": echarts_option
        }
        
    except Exception as e:
        logger.error(f"Error generating chart config: {e}", exc_info=True)
        return {}

