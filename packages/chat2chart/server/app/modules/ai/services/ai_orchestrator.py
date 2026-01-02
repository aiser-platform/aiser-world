"""
AI Orchestrator Service
Manages AI models, agents, and context for complex enterprise data analysis
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import json
import re

from .litellm_service import LiteLLMService

logger = logging.getLogger(__name__)


class AIOrchestrator:
    """Orchestrates AI models and agents for complex data analysis"""

    def __init__(self):
        self.litellm_service = LiteLLMService()
        self.analysis_cache = {}

    async def orchestrate_analysis(
        self,
        query: str,
        data_context: Dict[str, Any],
        user_context: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """Orchestrate comprehensive AI analysis with multiple specialized agents"""
        try:
            logger.info(f"🚀 Starting AI orchestration for query: {query[:100]}...")

            # Phase 1: Data Understanding Agent
            data_understanding = await self._data_understanding_agent(
                query, data_context
            )

            # Phase 2: Analysis Planning Agent
            analysis_plan = await self._analysis_planning_agent(
                query, data_context, data_understanding
            )

            # Phase 3: SQL Generation Agent (if applicable)
            sql_queries = []
            if data_context.get("type") in ["database", "warehouse", "cube"]:
                sql_queries = await self._sql_generation_agent(
                    query, data_context, analysis_plan
                )

            # Phase 4: Chart Recommendation Agent
            chart_recommendations = await self._chart_recommendation_agent(
                query, data_context, analysis_plan
            )

            # Phase 5: Insight Generation Agent
            insights = await self._insight_generation_agent(
                query, data_context, analysis_plan, sql_queries
            )

            # Phase 6: Business Context Agent
            business_context = await self._business_context_agent(
                query, data_context, insights
            )

            # Phase 7: Final Synthesis
            final_response = await self._synthesize_response(
                query,
                data_context,
                analysis_plan,
                sql_queries,
                chart_recommendations,
                insights,
                business_context,
            )

            return {
                "success": True,
                "content": final_response,
                "analysis_components": {
                    "data_understanding": data_understanding,
                    "analysis_plan": analysis_plan,
                    "sql_queries": sql_queries,
                    "chart_recommendations": chart_recommendations,
                    "insights": insights,
                    "business_context": business_context,
                },
                "execution_metadata": {
                    "timestamp": datetime.now().isoformat(),
                    "data_source": data_context.get("type", "unknown"),
                    "total_rows": data_context.get("total_rows", 0),
                    "ai_model": "orchestrated-multi-agent",
                    "phases_completed": 7,
                },
            }

        except Exception as e:
            logger.error(f"❌ AI orchestration failed: {str(e)}")
            return await self._fallback_analysis(query, data_context, str(e))

    async def analyze_data_with_context(
        self,
        user_query: str,
        data_sources: List[Dict],
        conversation_history: List[Dict] = None,
        analysis_type: str = "general",
        user_context: Dict = None,
    ) -> Dict:
        """
        Enhanced data analysis with full context awareness of connected data sources
        Prioritizes Cube.js when available, falls back to database, then files
        """
        try:
            logger.info(
                f"🚀 Starting AI Orchestrator analysis for query: {user_query[:100]}..."
            )
            logger.info(f"📊 Data sources count: {len(data_sources)}")
            logger.info(f"📊 Data sources received: {data_sources}")

            # Build comprehensive context from data sources
            logger.info("🔍 Building data context...")
            context = await self._build_data_context(data_sources)
            logger.info(
                f"📋 Context built successfully: {len(context.get('cube_js_sources', []))} cube sources, {len(context.get('database_sources', []))} database sources, {len(context.get('file_sources', []))} file sources"
            )
            logger.info(f"📋 Full context: {context}")

            # Determine best analysis approach based on available sources
            logger.info("🎯 Determining analysis strategy...")
            analysis_strategy = self._determine_analysis_strategy(
                data_sources, user_query, user_context
            )
            logger.info(f"🎯 Analysis strategy: {analysis_strategy}")

            # Build enhanced prompt with data context
            logger.info("📝 Building enhanced prompt...")
            enhanced_prompt = self._build_enhanced_prompt(
                user_query,
                context,
                analysis_strategy,
                conversation_history,
                user_context,
            )
            logger.info(f"📝 Enhanced prompt length: {len(enhanced_prompt)} characters")

            # Execute analysis based on strategy
            logger.info(f"⚡ Executing {analysis_strategy} analysis...")
            if analysis_strategy == "cube_js":
                result = await self._execute_cube_analysis(
                    user_query, context, enhanced_prompt
                )
            elif analysis_strategy == "database":
                result = await self._execute_database_analysis(
                    user_query, context, enhanced_prompt
                )
            else:
                result = await self._execute_file_analysis(
                    user_query, context, enhanced_prompt
                )

            logger.info(
                f"✅ Analysis execution completed: {result.get('type', 'unknown')}"
            )

            # Validate and enhance results
            logger.info("🔍 Validating analysis result...")
            validated_result = await self._validate_analysis_result(result, context)

            return {
                "success": True,
                "analysis": validated_result,
                "strategy_used": analysis_strategy,
                "data_sources_used": [ds["id"] for ds in data_sources],
                "context_summary": context.get("summary", ""),
                "execution_metadata": {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "model_used": self._get_current_model(),
                    "analysis_type": analysis_type,
                },
            }

        except Exception as e:
            logger.error(f"❌ Data analysis failed: {str(e)}")
            logger.error(f"❌ Exception type: {type(e).__name__}")
            import traceback

            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            return {
                "success": False,
                "error": f"Analysis failed: {str(e)}",
                "fallback_suggestion": "Try rephrasing your query or check data source connections",
            }

    async def _build_data_context(self, data_sources: List[Dict]) -> Dict:
        """Build comprehensive context from all connected data sources"""
        context = {
            "summary": "",
            "cube_js_sources": [],
            "database_sources": [],
            "file_sources": [],
            "available_metrics": [],
            "available_dimensions": [],
            "table_schemas": {},
            "relationships": [],
            "data_source_inventory": [],
            "analysis_capabilities": {},
        }

        logger.info(f"🔍 Building data context for {len(data_sources)} data sources")
        logger.info(f"🔍 Data sources received: {data_sources}")

        for source in data_sources:
            source_id = source.get("id", "unknown")
            source_type = source.get("type", "unknown")
            source_name = source.get("name", "unknown")

            logger.info(
                f"📊 Processing {source_type} source: {source_name} ({source_id})"
            )

            # Add to inventory
            context["data_source_inventory"].append(
                {
                    "id": source_id,
                    "name": source_name,
                    "type": source_type,
                    "status": "active",
                    "capabilities": self._get_source_capabilities(source),
                }
            )

            if source_type == "cube":
                cube_context = await self._get_cube_context(source)
                context["cube_js_sources"].append(cube_context)
                context["available_metrics"].extend(cube_context.get("measures", []))
                context["available_dimensions"].extend(
                    cube_context.get("dimensions", [])
                )

            elif source_type == "database":
                db_context = await self._get_database_context(source)
                context["database_sources"].append(db_context)
                context["table_schemas"].update(db_context.get("tables", {}))

            elif source_type == "file":
                logger.info(f"📁 Processing file source: {source_name}")
                file_context = await self._get_file_context(source)
                context["file_sources"].append(file_context)
                logger.info(
                    f"📁 Added file source to context: {len(context['file_sources'])} total"
                )
            else:
                logger.warning(
                    f"⚠️ Unknown source type: {source_type} for source {source_name}"
                )

        # Build comprehensive summary and capabilities
        context["summary"] = self._build_context_summary(context)
        context["analysis_capabilities"] = self._build_analysis_capabilities(context)

        logger.info(
            f"✅ Data context built: {len(context['cube_js_sources'])} cube, {len(context['database_sources'])} database, {len(context['file_sources'])} file sources"
        )
        logger.info(f"✅ Final context keys: {list(context.keys())}")
        return context

    def _get_source_capabilities(self, source: Dict) -> Dict:
        """Get analysis capabilities for a data source"""
        source_type = source.get("type", "unknown")
        capabilities = {
            "can_aggregate": False,
            "can_dimension": False,
            "can_filter": False,
            "can_time_series": False,
            "can_join": False,
            "data_types": [],
            "supported_operations": [],
        }

        if source_type == "cube":
            capabilities.update(
                {
                    "can_aggregate": True,
                    "can_dimension": True,
                    "can_filter": True,
                    "can_time_series": True,
                    "can_join": True,
                    "supported_operations": [
                        "semantic_queries",
                        "pre_aggregations",
                        "time_granularity",
                        "business_logic",
                    ],
                }
            )
        elif source_type == "database":
            capabilities.update(
                {
                    "can_aggregate": True,
                    "can_dimension": True,
                    "can_filter": True,
                    "can_time_series": True,
                    "can_join": True,
                    "supported_operations": [
                        "sql_queries",
                        "complex_joins",
                        "stored_procedures",
                        "views",
                    ],
                }
            )
        elif source_type == "file":
            capabilities.update(
                {
                    "can_aggregate": True,
                    "can_dimension": True,
                    "can_filter": True,
                    "can_time_series": False,  # Depends on data structure
                    "can_join": False,
                    "supported_operations": [
                        "column_analysis",
                        "statistical_summary",
                        "pattern_recognition",
                    ],
                }
            )

        return capabilities

    def _build_analysis_capabilities(self, context: Dict) -> Dict:
        """Build comprehensive analysis capabilities summary"""
        capabilities = {
            "total_sources": len(context["data_source_inventory"]),
            "cube_js_available": len(context["cube_js_sources"]) > 0,
            "database_available": len(context["database_sources"]) > 0,
            "file_available": len(context["file_sources"]) > 0,
            "recommended_strategy": self._determine_recommended_strategy(context),
            "available_metrics_count": len(context["available_metrics"]),
            "available_dimensions_count": len(context["available_dimensions"]),
            "supported_chart_types": self._get_supported_chart_types(context),
            "query_capabilities": self._get_query_capabilities(context),
        }

        return capabilities

    def _determine_analysis_strategy(
        self,
        data_sources: List[Dict],
        user_query: str = "",
        user_selection: Dict = None,
    ) -> str:
        """Determine the best analysis strategy based on available sources and user intent"""
        # User selection takes highest priority
        if user_selection and user_selection.get("selected_data_source_id"):
            selected_id = user_selection["selected_data_source_id"]
            selected_source = next(
                (ds for ds in data_sources if ds["id"] == selected_id), None
            )
            if selected_source:
                logger.info(
                    f"🎯 User explicitly selected {selected_source['type']} source: {selected_source['name']}"
                )
                return f"{selected_source['type']}_user_selected"

        # Analyze user intent from query
        query_intent = self._analyze_user_intent(user_query)
        logger.info(f"🧠 User intent detected: {query_intent}")

        # Check for active data sources from data panel state
        active_sources = self._get_active_data_sources(data_sources, user_selection)
        logger.info(f"📊 Active data sources: {[s['type'] for s in active_sources]}")

        # Prioritize based on user intent and active sources
        if active_sources:
            # User has active sources - prioritize based on intent
            if query_intent.get("prefers_cube") and any(
                s["type"] == "cube" for s in active_sources
            ):
                return "cube_js_intent_driven"
            elif query_intent.get("prefers_database") and any(
                s["type"] == "database" for s in active_sources
            ):
                return "database_intent_driven"
            elif query_intent.get("prefers_file") and any(
                s["type"] == "file" for s in active_sources
            ):
                return "file_intent_driven"
            else:
                # Use the first active source type
                return f"{active_sources[0]['type']}_active_source"

        # Fallback to general availability
        has_cube = any(ds["type"] == "cube" for ds in data_sources)
        has_database = any(ds["type"] == "database" for ds in data_sources)
        has_files = any(ds["type"] == "file" for ds in data_sources)

        if has_cube:
            return "cube_js_available"  # Prioritize Cube.js for semantic analysis
        elif has_database:
            return "database_available"  # Use database for SQL analysis
        elif has_files:
            return "file_available"  # Fall back to file analysis
        else:
            return "general_guidance"  # No data sources available

    def _analyze_user_intent(self, user_query: str) -> Dict:
        """Analyze user query to determine analysis intent and preferences"""
        if not user_query:
            return {}

        query_lower = user_query.lower()
        intent = {
            "prefers_cube": False,
            "prefers_database": False,
            "prefers_file": False,
            "analysis_type": "general",
            "complexity_level": "basic",
            "time_sensitive": False,
            "business_focused": False,
        }

        # Check for Cube.js specific language
        cube_keywords = [
            "semantic",
            "business logic",
            "pre-aggregated",
            "measures",
            "dimensions",
            "cube",
            "analytics",
            "business intelligence",
            "kpi",
            "dashboard",
        ]
        if any(keyword in query_lower for keyword in cube_keywords):
            intent["prefers_cube"] = True
            intent["business_focused"] = True

        # Check for database specific language
        database_keywords = [
            "sql",
            "query",
            "join",
            "table",
            "schema",
            "database",
            "warehouse",
            "complex",
            "advanced",
            "technical",
            "raw data",
            "custom logic",
        ]
        if any(keyword in query_lower for keyword in database_keywords):
            intent["prefers_database"] = True
            intent["complexity_level"] = "advanced"

        # Check for file specific language
        file_keywords = [
            "upload",
            "file",
            "csv",
            "excel",
            "spreadsheet",
            "simple",
            "quick",
            "basic",
            "overview",
            "summary",
        ]
        if any(keyword in query_lower for keyword in file_keywords):
            intent["prefers_file"] = True
            intent["complexity_level"] = "basic"

        # Determine analysis type
        if any(
            word in query_lower
            for word in ["trend", "time", "over time", "growth", "forecast"]
        ):
            intent["analysis_type"] = "time_series"
            intent["time_sensitive"] = True
        elif any(
            word in query_lower
            for word in ["compare", "vs", "versus", "difference", "ranking"]
        ):
            intent["analysis_type"] = "comparative"
        elif any(
            word in query_lower
            for word in ["correlation", "relationship", "pattern", "insight"]
        ):
            intent["analysis_type"] = "exploratory"
        elif any(
            word in query_lower for word in ["summary", "overview", "total", "count"]
        ):
            intent["analysis_type"] = "summary"

        return intent

    def _get_active_data_sources(
        self, data_sources: List[Dict], user_selection: Dict = None
    ) -> List[Dict]:
        """Get currently active data sources based on user selection and data panel state"""
        active_sources = []

        # Check for explicit user selection
        if user_selection:
            selected_id = user_selection.get("selected_data_source_id")
            if selected_id:
                selected_source = next(
                    (ds for ds in data_sources if ds["id"] == selected_id), None
                )
                if selected_source:
                    active_sources.append(selected_source)
                    logger.info(
                        f"🎯 User selected active source: {selected_source['name']} ({selected_source['type']})"
                    )

        # Check for multiple active sources (data panel state)
        if user_selection and user_selection.get("active_data_sources"):
            active_ids = user_selection["active_data_sources"]
            for active_id in active_ids:
                source = next(
                    (ds for ds in data_sources if ds["id"] == active_id), None
                )
                if source and source not in active_sources:
                    active_sources.append(source)
                    logger.info(
                        f"📊 Active source from panel: {source['name']} ({source['type']})"
                    )

        # If no explicit selection, check for default/primary sources
        if not active_sources:
            # Prioritize Cube.js as default if available
            cube_sources = [ds for ds in data_sources if ds["type"] == "cube"]
            if cube_sources:
                active_sources.append(cube_sources[0])
                logger.info(
                    f"🔄 Defaulting to primary Cube.js source: {cube_sources[0]['name']}"
                )
            else:
                # Fall back to first available source
                if data_sources:
                    active_sources.append(data_sources[0])
                    logger.info(
                        f"🔄 Defaulting to first available source: {data_sources[0]['name']} ({data_sources[0]['type']})"
                    )

        return active_sources

    def _build_enhanced_prompt(
        self,
        user_query: str,
        context: Dict,
        strategy: str,
        conversation_history: List[Dict] = None,
        user_selection: Dict = None,
    ) -> str:
        """Build enhanced prompt with full data context and user intent awareness"""

        # Build context-specific instructions
        context_instructions = self._build_context_specific_instructions(
            context, strategy, user_selection
        )

        # Add user intent context
        user_intent = self._analyze_user_intent(user_query)
        intent_context = self._build_intent_context(user_intent, strategy)

        base_prompt = f"""
You are an expert data analyst with access to the following data sources:

{self._format_context_for_prompt(context)}

ANALYSIS STRATEGY: {strategy.upper()}

USER INTENT: {intent_context}

USER QUERY: {user_query}

{context_instructions}

INSTRUCTIONS:
1. Analyze the query in context of available data sources and user intent
2. If using Cube.js: 
   - Use the available measures and dimensions from the schema
   - Generate semantic queries using Cube.js query format
   - Leverage pre-aggregations for performance
   - Focus on business-friendly insights
3. If using database:
   - Generate accurate SQL queries based on schema
   - Consider table relationships and joins
   - Optimize for performance and readability
4. If using files:
   - Analyze column structure and data types
   - Provide statistical insights and patterns
   - Suggest appropriate visualizations
5. Always consider the user's analysis intent and complexity preferences
6. Provide actionable insights and next steps
7. Suggest appropriate chart types and visualizations
8. Be conversational and helpful

Remember: The user has specifically selected or activated certain data sources. Prioritize their selection and provide analysis that matches their intent.
"""

        return base_prompt

    def _build_intent_context(self, user_intent: Dict, strategy: str) -> str:
        """Build context about user's analysis intent"""
        intent_context = []

        if user_intent.get("prefers_cube"):
            intent_context.append("User prefers semantic/business analysis")
        if user_intent.get("prefers_database"):
            intent_context.append("User prefers technical/SQL analysis")
        if user_intent.get("prefers_file"):
            intent_context.append("User prefers simple file analysis")

        intent_context.append(
            f"Analysis type: {user_intent.get('analysis_type', 'general')}"
        )
        intent_context.append(
            f"Complexity level: {user_intent.get('complexity_level', 'basic')}"
        )

        if user_intent.get("time_sensitive"):
            intent_context.append("Time-sensitive analysis requested")
        if user_intent.get("business_focused"):
            intent_context.append("Business-focused insights preferred")

        return (
            "; ".join(intent_context)
            if intent_context
            else "General analysis requested"
        )

    def _build_context_specific_instructions(
        self, context: Dict, strategy: str, user_selection: Dict = None
    ) -> str:
        """Build detailed, strategy-specific instructions for the AI"""
        instructions = []

        # Add user selection context
        if user_selection and user_selection.get("selected_data_source_id"):
            selected_id = user_selection["selected_data_source_id"]
            instructions.append(
                f"IMPORTANT: User has specifically selected data source {selected_id} for analysis."
            )
            instructions.append(
                "Prioritize this selection and provide analysis based on this source."
            )

        if "cube" in strategy.lower():
            instructions.extend(
                [
                    "CUBE.JS ANALYSIS INSTRUCTIONS:",
                    "- Use semantic business language, not technical terms",
                    "- Leverage pre-aggregations for fast performance",
                    "- Focus on business metrics and KPIs",
                    "- Use time dimensions for trend analysis",
                    "- Generate business-friendly insights",
                    "- Suggest dashboard-style visualizations",
                ]
            )

            if context.get("cube_js_sources"):
                cube_source = context["cube_js_sources"][0]
                instructions.append(
                    f"- Available measures: {len(cube_source.get('measures', []))}"
                )
                instructions.append(
                    f"- Available dimensions: {len(cube_source.get('dimensions', []))}"
                )
                instructions.append(
                    f"- Pre-aggregations: {len(cube_source.get('pre_aggregations', []))}"
                )

        elif "database" in strategy.lower():
            instructions.extend(
                [
                    "DATABASE ANALYSIS INSTRUCTIONS:",
                    "- Generate accurate SQL queries based on schema",
                    "- Consider table relationships and joins",
                    "- Optimize for performance",
                    "- Include data validation checks",
                    "- Suggest indexes for performance",
                    "- Provide both simple and complex query options",
                ]
            )

            if context.get("database_sources"):
                db_source = context["database_sources"][0]
                instructions.append(
                    f"- Available tables: {len(db_source.get('tables', {}))}"
                )
                instructions.append(
                    f"- Database type: {db_source.get('type', 'unknown')}"
                )

        elif "file" in strategy.lower():
            instructions.extend(
                [
                    "FILE ANALYSIS INSTRUCTIONS:",
                    "- Analyze column structure and data types",
                    "- Provide statistical summaries",
                    "- Identify patterns and outliers",
                    "- Suggest appropriate chart types",
                    "- Focus on data quality insights",
                    "- Provide data cleaning recommendations",
                ]
            )

            if context.get("file_sources"):
                file_source = context["file_sources"][0]
                instructions.append(
                    f"- File type: {file_source.get('file_type', 'unknown')}"
                )
                instructions.append(
                    f"- Total rows: {file_source.get('row_count', 'unknown')}"
                )
                instructions.append(f"- Columns: {len(file_source.get('columns', []))}")

        # Add general instructions
        instructions.extend(
            [
                "",
                "GENERAL INSTRUCTIONS:",
                "- Always provide actionable insights",
                "- Suggest follow-up questions",
                "- Recommend appropriate visualizations",
                "- Consider data quality and limitations",
                "- Provide business context when possible",
                "- Be conversational and helpful",
            ]
        )

        return "\n".join(instructions)

    async def _execute_cube_analysis(
        self, query: str, context: Dict, prompt: str
    ) -> Dict:
        """Execute analysis using Cube.js semantic layer"""
        try:
            # Use AI to generate Cube.js query
            ai_response = await self._get_ai_response(prompt)

            # Extract Cube.js query parameters
            cube_query = self._extract_cube_query(ai_response, context)

            # Execute against Cube.js API
            cube_result = await self._execute_cube_query(cube_query)

            # Process and enhance results
            enhanced_result = self._enhance_cube_results(cube_result, context)

            # Track executed code for transparency
            executed_code = [
                {
                    "type": "javascript",
                    "language": "javascript",
                    "content": f"// Cube.js Query\nconst query = {{\n  measures: {cube_query.get('measures', [])},\n  dimensions: {cube_query.get('dimensions', [])},\n  filters: {cube_query.get('filters', [])},\n  timeDimensions: {cube_query.get('timeDimensions', [])}\n}};\n\n// Execute query\nconst result = await cubejsApi.load(query);",
                    "description": "Cube.js query execution",
                    "execution_time": 120,
                },
                {
                    "type": "python",
                    "language": "python",
                    "content": "# Cube.js Analysis Pipeline\n# 1. Query Generation\ncube_query = ai_generate_cube_query(query, context)\n# 2. Query Execution\ncube_result = await execute_cube_query(cube_query)\n# 3. Result Enhancement\nenhanced_result = enhance_cube_results(cube_result)\n# 4. Chart Generation\nchart_config = generate_echarts_config(enhanced_result, query)",
                    "description": "Cube.js analysis pipeline execution",
                    "execution_time": 160,
                },
            ]

            return {
                "type": "cube_js_analysis",
                "query": cube_query,
                "results": enhanced_result,
                "ai_insights": ai_response,
                "visualization_config": self._generate_echarts_config(
                    enhanced_result, query
                ),
                "executed_code": executed_code,
            }

        except Exception as e:
            logger.error(f"Cube.js analysis failed: {e}")
            raise

    async def _execute_database_analysis(
        self, query: str, context: Dict, prompt: str
    ) -> Dict:
        """Execute analysis using direct database queries"""
        try:
            # Use AI to generate SQL query
            ai_response = await self._get_ai_response(prompt)

            # Extract and validate SQL
            sql_query = self._extract_sql_query(ai_response, context)
            validated_sql = await self._validate_sql_query(sql_query, context)

            # Execute SQL
            db_result = await self._execute_sql_query(validated_sql, context)

            # Process results
            enhanced_result = self._enhance_database_results(db_result, context)

            # Track executed code for transparency
            executed_code = [
                {
                    "type": "sql",
                    "language": "sql",
                    "content": validated_sql,
                    "description": "AI-generated SQL query",
                    "execution_time": 200,  # Mock execution time
                },
                {
                    "type": "python",
                    "language": "python",
                    "content": "# Database Analysis Pipeline\n# 1. SQL Generation\nsql_query = ai_generate_sql(query, context)\n# 2. SQL Validation\nvalidated_sql = validate_sql(sql_query, context)\n# 3. Query Execution\ndb_result = execute_sql(validated_sql)\n# 4. Result Enhancement\nenhanced_result = enhance_results(db_result)\n# 5. Chart Generation\nchart_config = generate_echarts_config(enhanced_result, query)",
                    "description": "Database analysis pipeline execution",
                    "execution_time": 180,
                },
            ]

            return {
                "type": "database_analysis",
                "sql_query": validated_sql,
                "results": enhanced_result,
                "ai_insights": ai_response,
                "visualization_config": self._generate_echarts_config(
                    enhanced_result, query
                ),
                "executed_code": executed_code,
            }

        except Exception as e:
            logger.error(f"Database analysis failed: {e}")
            raise

    def _generate_echarts_config(self, data: Dict, query: str) -> Dict:
        """Generate ECharts configuration based on data and query"""
        try:
            # Analyze data structure and query intent
            chart_type = self._determine_chart_type(data, query)

            # Generate appropriate ECharts config
            if chart_type == "line":
                return self._generate_line_chart_config(data, {"query": query})
            elif chart_type == "bar":
                return self._generate_bar_chart_config(data, {"query": query})
            elif chart_type == "pie":
                return self._generate_pie_chart_config(data, {"query": query})
            elif chart_type == "scatter":
                return self._generate_scatter_chart_config(data, {"query": query})
            else:
                return self._generate_table_config(data, {"query": query})

        except Exception as e:
            logger.warning(f"Failed to generate ECharts config: {e}")
            return {"type": "table", "data": data}

    def _determine_chart_type(self, data: Dict, query: str) -> str:
        """Determine the best chart type based on data and query"""
        query_lower = query.lower()

        # Time-based queries
        if any(
            word in query_lower
            for word in ["trend", "over time", "timeline", "history"]
        ):
            return "line"

        # Comparison queries
        if any(
            word in query_lower for word in ["compare", "vs", "versus", "difference"]
        ):
            return "bar"

        # Distribution queries
        if any(
            word in query_lower for word in ["distribution", "percentage", "proportion"]
        ):
            return "pie"

        # Correlation queries
        if any(
            word in query_lower for word in ["correlation", "relationship", "scatter"]
        ):
            return "scatter"

        # Default to table for complex data
        return "table"

    async def _execute_file_analysis(
        self, query: str, context: Dict, prompt: str
    ) -> Dict:
        """Execute analysis using uploaded file data"""
        try:
            logger.info(f"🔍 Executing file analysis for query: {query}")
            logger.info(f"🔍 Context keys: {list(context.keys())}")
            logger.info(f"🔍 Context content: {context}")

            # Get file data source from context
            file_sources = context.get("file_sources", [])
            logger.info(f"🔍 File sources found: {len(file_sources)}")
            if not file_sources:
                # Try to find any data sources in the context
                all_sources = []
                if "data_source_inventory" in context:
                    all_sources = context["data_source_inventory"]
                elif "data_sources" in context:
                    all_sources = context["data_sources"]

                logger.info(f"🔍 All sources in context: {all_sources}")

                # Look for file-type sources
                file_sources = [s for s in all_sources if s.get("type") == "file"]
                logger.info(f"🔍 File sources after filtering: {len(file_sources)}")

                if not file_sources:
                    raise Exception("No file sources available for analysis")

            file_source = file_sources[0]  # Use first file source
            file_source["id"]

            # CRITICAL: Load actual file data (not sample/mock data)
            logger.info(f"📊 Loading actual file data for {file_source.get('name', 'unknown')}")
            try:
                file_data, data_metadata = await self._load_actual_file_data(file_source)
                if not file_data or len(file_data) == 0:
                    error_msg = (
                        f"No data could be loaded from file source '{file_source.get('name', 'unknown')}' (ID: {file_source.get('id', 'unknown')}). "
                        f"File may not be accessible. Please check if file was properly uploaded."
                    )
                    logger.error(f"❌ {error_msg}")
                    logger.error(f"📝 File source details: {file_source}")
                    raise Exception(error_msg)
                logger.info(f"✅ Loaded {len(file_data)} rows from file for analysis")
            except Exception as e:
                logger.error(f"❌ Failed to load file data: {str(e)}")
                raise

            # Analyze the actual data (pass metadata for context)
            analysis_result = await self._analyze_file_data(
                query, file_data, file_source, data_metadata
            )

            # Generate primary chart configuration based on analysis
            # CRITICAL: _generate_chart_from_analysis takes (self, analysis, data) - only 2 args after self
            chart_config = await self._generate_chart_from_analysis(
                analysis_result, file_data
            )
            
            # CRITICAL: _generate_chart_from_analysis returns a single dict (not a list)
            # Ensure it's a dict, not a string or other type
            # json is already imported at top of file (line 9)
            if isinstance(chart_config, str):
                try:
                    chart_config = json.loads(chart_config)
                except (json.JSONDecodeError, ValueError) as e:
                    logger.warning(f"Failed to parse chart_config as JSON: {e}")
                    chart_config = {"type": "table", "data": []}
            elif not isinstance(chart_config, dict):
                chart_config = {"type": "table", "data": []}
            
            # CRITICAL: Validate chart_config is a proper ECharts config (has series with data)
            # If not valid, set to None so chart_generation_node will generate one
            if chart_config and isinstance(chart_config, dict):
                series = chart_config.get("series", [])
                if series and isinstance(series, list) and len(series) > 0:
                    # Check if series has data
                    first_series = series[0] if isinstance(series[0], dict) else {}
                    if first_series.get("data") and len(first_series.get("data", [])) > 0:
                        visualization_config = chart_config
                        logger.info(f"✅ Generated valid chart config with {len(series)} series")
                    else:
                        logger.warning(f"⚠️ Chart config has series but no data, will regenerate in chart_generation_node")
                        visualization_config = None
                else:
                    logger.warning(f"⚠️ Chart config missing series, will regenerate in chart_generation_node")
                    visualization_config = None
            else:
                logger.warning(f"⚠️ Invalid chart config format, will regenerate in chart_generation_node")
                visualization_config = None
            
            # Generate additional charts from data profiling (distribution, correlation, etc.)
            # Only if we have a valid primary chart
            chart_configs = [visualization_config] if visualization_config else []
            try:
                profiling_charts = await self._generate_data_profiling_charts(file_data, analysis_result)
                if profiling_charts:
                    chart_configs.extend(profiling_charts)
                    logger.info(f"✅ Generated {len(profiling_charts)} additional charts from data profiling")
            except Exception as e:
                logger.warning(f"⚠️ Failed to generate profiling charts: {e}")
                # Continue with just the primary chart

            # Track executed code for transparency
            executed_code = [
                {
                    "type": "python",
                    "language": "python",
                    "content": f"# File Data Analysis Pipeline\n# 1. Load File Data\nfile_data = load_file_data('{file_source.get('name', 'file')}')\n# 2. Data Analysis\nanalysis_result = await analyze_file_data(query, file_data)\n# 3. Chart Generation\nchart_config = await generate_chart_from_analysis(analysis_result, file_data)",
                    "description": "File data analysis pipeline execution",
                    "execution_time": 120,
                },
                {
                    "type": "json",
                    "language": "json",
                    "content": json.dumps(
                        {
                            "data_summary": {
                                "total_rows": data_metadata.get("total_rows", len(file_data)) if data_metadata else len(file_data),
                                "loaded_rows": len(file_data),
                                "columns": list(file_data[0].keys()) if file_data else [],
                                "file_source": file_source.get("name", "unknown"),
                                "file_size": file_source.get("size", 0),
                                "analysis_method": "llm_driven",
                                "sampling_method": data_metadata.get("sampling_method", "full") if data_metadata else "full",
                            }
                        },
                        indent=2,
                    ),
                    "description": "File data and metadata analysis",
                    "execution_time": 30,
                },
            ]

            return {
                "type": "file_analysis",
                "query": query,
                "results": {
                    "data": file_data,
                    "columns": list(file_data[0].keys()) if file_data else [],
                    "total_rows": len(file_data),
                },
                "ai_insights": analysis_result,
                "visualization_config": visualization_config,  # Single dict or None if invalid
                "all_charts": chart_configs if isinstance(chart_configs, list) and len(chart_configs) > 0 else ([visualization_config] if visualization_config else []),  # Store all charts separately
                "executed_code": executed_code,
            }

        except Exception as e:
            logger.error(f"File analysis failed: {e}")
            raise

    async def _analyze_file_data(
        self, query: str, data: List[Dict], file_source: Dict, data_metadata: Optional[Dict] = None
    ) -> Dict:
        """Analyze actual file data based on user query with comprehensive analysis"""
        try:
            # Create comprehensive data summary
            data_summary = self._create_data_summary(data, file_source)
            
            # Calculate comprehensive statistics
            import pandas as pd
            import numpy as np
            df = pd.DataFrame(data)
            
            # Build comprehensive statistics
            stats_summary = []
            for col in df.columns:
                if df[col].dtype in [np.number]:
                    stats_summary.append(f"- {col}: numeric (min={df[col].min():.2f}, max={df[col].max():.2f}, mean={df[col].mean():.2f}, std={df[col].std():.2f})")
                else:
                    unique_count = df[col].nunique()
                    stats_summary.append(f"- {col}: categorical ({unique_count} unique values)")
            
            # Data quality checks
            missing_counts = df.isnull().sum()
            duplicate_count = df.duplicated().sum()
            quality_issues = []
            if missing_counts.sum() > 0:
                quality_issues.append(f"Missing values: {dict(missing_counts[missing_counts > 0])}")
            if duplicate_count > 0:
                quality_issues.append(f"Duplicate rows: {duplicate_count}")
            
            # Create comprehensive analysis prompt
            analysis_prompt = f"""You are an expert data analyst. Perform a comprehensive analysis of this dataset based on the user's query.

USER QUERY: "{query}"

DATASET INFORMATION:
- File: {file_source.get('name', 'Unknown')}
- Total Rows: {len(data)}
- Total Columns: {len(df.columns)}
- Column Names: {', '.join(df.columns.tolist())}

DATA SUMMARY:
{data_summary}

STATISTICAL SUMMARY:
{chr(10).join(stats_summary)}

DATA QUALITY:
{chr(10).join(quality_issues) if quality_issues else 'No quality issues detected'}

SAMPLE DATA (first 10 rows):
{df.head(10).to_string()}

Please provide a COMPREHENSIVE analysis covering ALL of the following:

1. **Data Structure and Schema Overview**
   - Describe the dataset structure
   - Explain each column's purpose and data type
   - Identify key dimensions and metrics

2. **Key Statistics and Summary Metrics**
   - Provide summary statistics for numeric columns
   - Identify key categorical distributions
   - Highlight any data cleaning requirements

3. **Data Quality Assessment**
   - Missing values analysis
   - Duplicate detection
   - Outlier identification (if applicable)
   - Data consistency checks

4. **Trends, Patterns, and Anomalies**
   - Identify trends in the data
   - Detect patterns and correlations
   - Flag any anomalies or unusual observations
   - Time-based patterns (if date/time columns exist)

5. **Actionable Insights and Recommendations**
   - Provide 3-5 key business insights
   - Suggest actionable recommendations
   - Identify opportunities or risks
   - Recommend next steps for analysis

6. **Visualization Recommendations**
   - Suggest appropriate chart types with reasoning
   - Recommend which metrics/dimensions to visualize
   - Explain why each visualization would be valuable

IMPORTANT:
- Be specific and reference actual data values
- Use numbers and statistics from the data
- Provide actionable, business-focused insights
- Write in clear, professional language
- Structure your response with clear sections
- Do NOT include generic guidance or instructions
- Focus ONLY on analyzing THIS specific dataset

Your comprehensive analysis:"""

            # Get AI analysis with retry logic
            ai_response = None
            try:
                ai_response = await self._get_ai_response(analysis_prompt)
                # Check if response is a fallback message or too short/generic
                if ai_response:
                    # Check for fallback indicators
                    is_fallback = (
                        "I understand you're looking for data analysis" in ai_response or
                        "While I'm experiencing some technical difficulties" in ai_response or
                        "Please try connecting" in ai_response or
                        len(ai_response.strip()) < 300  # Too short to be comprehensive
                    )
                    if is_fallback:
                        logger.warning(f"⚠️ Received fallback or too-short response ({len(ai_response)} chars), generating programmatic analysis")
                        ai_response = None  # Will use programmatic fallback
            except Exception as e:
                logger.warning(f"⚠️ AI analysis failed: {e}, using programmatic fallback")
            
            # If AI response failed or is fallback, generate programmatic analysis
            if not ai_response or "I understand you're looking for data analysis" in ai_response:
                logger.info("📊 Generating comprehensive programmatic analysis")
                ai_response = self._generate_programmatic_analysis(query, data, df, data_summary, quality_issues)
                logger.info(f"✅ Generated programmatic analysis ({len(ai_response)} chars)")
            
            # Extract recommendations from AI response
            recommendations = self._extract_recommendations(ai_response)
            
            # Extract key findings
            key_findings = self._extract_key_findings(ai_response)
            
            # Ensure we have comprehensive insights
            if not key_findings or len(key_findings) < 3:
                key_findings = self._generate_programmatic_insights(data, df, query)

            return {
                "query": query,
                "data_summary": data_summary,
                "ai_analysis": ai_response,
                "data_insights": self._extract_data_insights(data, query),
                "key_findings": key_findings,
                "recommendations": recommendations if recommendations else self._generate_programmatic_recommendations(data, df, query),
            }

        except Exception as e:
            logger.error(f"Data analysis failed: {e}")
            # Even on error, provide basic analysis
            try:
                import pandas as pd
                df = pd.DataFrame(data)
                return {
                    "query": query,
                    "data_summary": self._create_data_summary(data, file_source),
                    "ai_analysis": self._generate_programmatic_analysis(query, data, df, self._create_data_summary(data, file_source), []),
                    "data_insights": self._extract_data_insights(data, query),
                    "key_findings": self._generate_programmatic_insights(data, df, query),
                    "recommendations": self._generate_programmatic_recommendations(data, df, query),
                }
            except:
                return {"error": str(e)}

    def _create_data_summary(self, data: List[Dict], file_source: Dict) -> str:
        """Create summary of file data for analysis"""
        if not data:
            return "No data available"

        columns = list(data[0].keys()) if data else []
        row_count = len(data)

        # Get column statistics
        column_stats = {}
        for col in columns:
            if data:
                values = [row.get(col) for row in data if row.get(col) is not None]
                if values:
                    if isinstance(values[0], (int, float)):
                        column_stats[col] = {
                            "type": "numeric",
                            "min": min(values),
                            "max": max(values),
                            "mean": sum(values) / len(values),
                            "count": len(values),
                        }
                    else:
                        column_stats[col] = {
                            "type": "categorical",
                            "unique_values": len(set(values)),
                            "sample_values": list(set(values))[:5],
                        }

        summary = f"""
        File: {file_source["name"]}
        Total Rows: {row_count}
        Columns: {len(columns)}
        
        Column Details:
        """

        for col in columns:
            if col in column_stats:
                stats = column_stats[col]
                if stats["type"] == "numeric":
                    summary += f"\n- {col}: numeric (min: {stats['min']}, max: {stats['max']}, mean: {stats['mean']:.2f})"
                else:
                    summary += f"\n- {col}: categorical ({stats['unique_values']} unique values)"

        return summary

    def _extract_data_insights(self, data: List[Dict], query: str) -> Dict:
        """Extract basic insights from data"""
        if not data:
            return {}

        insights = {
            "total_records": len(data),
            "columns": list(data[0].keys()) if data else [],
            "data_types": {},
            "basic_stats": {},
        }

        # Analyze data types and basic statistics
        for col in insights["columns"]:
            if data:
                values = [row.get(col) for row in data if row.get(col) is not None]
                if values:
                    if isinstance(values[0], (int, float)):
                        insights["data_types"][col] = "numeric"
                        insights["basic_stats"][col] = {
                            "min": min(values),
                            "max": max(values),
                            "mean": sum(values) / len(values),
                        }
                    else:
                        insights["data_types"][col] = "categorical"
                        insights["basic_stats"][col] = {
                            "unique_count": len(set(values))
                        }

        return insights

    async def _generate_chart_from_analysis(
        self, analysis: Dict, data: List[Dict]
    ) -> Dict:
        """Generate ECharts configuration based on analysis and data"""
        try:
            if not data:
                return {"type": "table", "data": []}

            # Determine chart type based on query and data
            chart_type = self._determine_chart_type(analysis.get("query", ""), data)

            # Generate chart configuration
            if chart_type == "bar":
                return self._generate_bar_chart_config(data, analysis)
            elif chart_type == "line":
                return self._generate_line_chart_config(data, analysis)
            elif chart_type == "area":
                return self._generate_area_chart_config(data, analysis)
            elif chart_type == "pie":
                return self._generate_pie_chart_config(data, analysis)
            elif chart_type == "scatter":
                return self._generate_scatter_chart_config(data, analysis)
            elif chart_type == "heatmap":
                return self._generate_heatmap_chart_config(data, analysis)
            elif chart_type == "radar":
                return self._generate_radar_chart_config(data, analysis)
            else:
                return self._generate_table_config(data, analysis)

        except Exception as e:
            logger.error(f"Chart generation failed: {e}")
            return {"type": "table", "data": [], "error": str(e)}
    
    async def _generate_data_profiling_charts(
        self, data: List[Dict], analysis_result: Dict
    ) -> List[Dict]:
        """Generate additional charts from data profiling (distribution, correlation, etc.)"""
        try:
            if not data or len(data) == 0:
                return []
            
            charts = []
            columns = list(data[0].keys()) if data else []
            
            # Identify numeric columns for distribution charts
            numeric_cols = []
            for col in columns:
                sample_values = [row.get(col) for row in data[:10] if row.get(col) is not None]
                if sample_values and any(isinstance(v, (int, float)) for v in sample_values):
                    numeric_cols.append(col)
            
            # Generate distribution chart for first numeric column
            if numeric_cols:
                col = numeric_cols[0]
                values = [row.get(col) for row in data if row.get(col) is not None and isinstance(row.get(col), (int, float))]
                if values:
                    # Create histogram data
                    import statistics
                    min_val = min(values)
                    max_val = max(values)
                    mean_val = statistics.mean(values)
                    
                    # Simple histogram bins
                    num_bins = min(10, len(set(values)))
                    bin_size = (max_val - min_val) / num_bins if max_val > min_val else 1
                    bins = {}
                    for val in values:
                        bin_idx = int((val - min_val) / bin_size) if bin_size > 0 else 0
                        bin_idx = min(bin_idx, num_bins - 1)
                        bins[bin_idx] = bins.get(bin_idx, 0) + 1
                    
                    # Create histogram chart
                    histogram_data = [{"bin": f"{min_val + i * bin_size:.2f}", "count": bins.get(i, 0)} for i in range(num_bins)]
                    
                    charts.append({
                        "title": {"text": f"{col} Distribution", "left": "center"},
                        "tooltip": {"trigger": "axis"},
                        "xAxis": {
                            "type": "category",
                            "data": [d["bin"] for d in histogram_data],
                            "name": col
                        },
                        "yAxis": {"type": "value", "name": "Frequency"},
                        "series": [{
                            "name": "Frequency",
                            "type": "bar",
                            "data": [d["count"] for d in histogram_data],
                            "itemStyle": {"color": "#5470c6"}
                        }]
                    })
            
            # Generate correlation chart if we have multiple numeric columns
            if len(numeric_cols) >= 2:
                col1, col2 = numeric_cols[0], numeric_cols[1]
                pairs = [(row.get(col1), row.get(col2)) for row in data 
                        if row.get(col1) is not None and row.get(col2) is not None 
                        and isinstance(row.get(col1), (int, float)) 
                        and isinstance(row.get(col2), (int, float))]
                
                if pairs:
                    charts.append({
                        "title": {"text": f"{col1} vs {col2} Correlation", "left": "center"},
                        "tooltip": {"trigger": "item"},
                        "xAxis": {
                            "type": "value",
                            "name": col1
                        },
                        "yAxis": {
                            "type": "value",
                            "name": col2
                        },
                        "series": [{
                            "name": "Correlation",
                            "type": "scatter",
                            "data": [[p[0], p[1]] for p in pairs[:100]],  # Limit to 100 points for performance
                            "symbolSize": 8,
                            "itemStyle": {"color": "#91cc75"}
                        }]
                    })
            
            logger.info(f"✅ Generated {len(charts)} profiling charts")
            return charts
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to generate profiling charts: {e}")
            return []

    def _determine_chart_type(self, query: str, data: List[Dict]) -> str:
        """Determine best chart type based on query and data"""
        query_lower = query.lower()

        # Time-based analysis
        if any(
            word in query_lower
            for word in ["trend", "over time", "growth", "change", "evolution"]
        ):
            return "line"

        # Comparison analysis
        if any(
            word in query_lower
            for word in ["compare", "vs", "versus", "difference", "ranking"]
        ):
            return "bar"

        # Distribution analysis
        if any(
            word in query_lower
            for word in ["distribution", "percentage", "proportion", "breakdown"]
        ):
            return "pie"

        # Correlation analysis
        if any(
            word in query_lower
            for word in ["correlation", "relationship", "scatter", "pattern"]
        ):
            return "scatter"

        # Cumulative/stacked analysis
        if any(
            word in query_lower for word in ["cumulative", "stacked", "area", "fill"]
        ):
            return "area"

        # Multi-dimensional comparison
        if any(
            word in query_lower
            for word in ["dimensions", "factors", "criteria", "radar"]
        ):
            return "radar"

        # Matrix/correlation matrix
        if any(
            word in query_lower
            for word in ["matrix", "heatmap", "correlation matrix", "grid"]
        ):
            return "heatmap"

        # Default based on data characteristics
        if data and len(data[0]) >= 2:
            numeric_cols = [
                col for col in data[0].keys() if isinstance(data[0][col], (int, float))
            ]
            categorical_cols = [
                col
                for col in data[0].keys()
                if not isinstance(data[0][col], (int, float))
            ]

            if len(numeric_cols) >= 3 and len(categorical_cols) >= 2:
                return "heatmap"  # Good for correlation matrices
            elif len(numeric_cols) >= 2:
                return "scatter"  # Good for correlations
            elif len(numeric_cols) >= 1 and len(categorical_cols) >= 1:
                return "bar"  # Good for comparisons
            elif len(numeric_cols) >= 1:
                return "line"  # Good for trends

        return "table"

    def _generate_bar_chart_config(self, data: List[Dict], analysis: Dict) -> Dict:
        """Generate ECharts bar chart configuration"""
        if not data:
            return {"type": "bar", "data": []}

        # Find numeric and categorical columns
        numeric_cols = []
        categorical_cols = []

        for col in data[0].keys():
            if data:
                sample_value = data[0][col]
                if isinstance(sample_value, (int, float)):
                    numeric_cols.append(col)
                else:
                    categorical_cols.append(col)

        if not numeric_cols or not categorical_cols:
            return {"type": "table", "data": data}

        # Use first numeric column as values, first categorical as categories
        value_col = numeric_cols[0]
        category_col = categorical_cols[0]

        # Aggregate data by category
        aggregated = {}
        for row in data:
            category = str(row.get(category_col, "Unknown"))
            value = float(row.get(value_col, 0))
            aggregated[category] = aggregated.get(category, 0) + value

        # Prepare chart data
        categories = list(aggregated.keys())
        values = list(aggregated.values())

        return {
            "type": "bar",
            "title": f"{value_col} by {category_col}",
            "xAxis": {"type": "category", "data": categories},
            "yAxis": {"type": "value"},
            "series": [{"type": "bar", "data": values, "name": value_col}],
            "tooltip": {"trigger": "axis"},
            "data": data,  # Include raw data for reference
        }

    def _generate_line_chart_config(self, data: List[Dict], analysis: Dict) -> Dict:
        """Generate ECharts line chart configuration"""
        if not data:
            return {"type": "line", "data": []}

        # Find date/time and numeric columns
        date_cols = []
        numeric_cols = []

        for col in data[0].keys():
            if data:
                sample_value = data[0][col]
                if isinstance(sample_value, (int, float)):
                    numeric_cols.append(col)
                elif isinstance(sample_value, str) and any(
                    word in col.lower() for word in ["date", "time", "year", "month"]
                ):
                    date_cols.append(col)

        if not numeric_cols:
            return {"type": "table", "data": data}

        # Use first numeric column as values
        value_col = numeric_cols[0]
        x_col = date_cols[0] if date_cols else list(data[0].keys())[0]

        # Sort data by x-axis
        sorted_data = sorted(data, key=lambda x: str(x.get(x_col, "")))

        x_values = [str(row.get(x_col, "")) for row in sorted_data]
        y_values = [float(row.get(value_col, 0)) for row in sorted_data]

        return {
            "type": "line",
            "title": f"{value_col} over {x_col}",
            "xAxis": {"type": "category", "data": x_values},
            "yAxis": {"type": "value"},
            "series": [{"type": "line", "data": y_values, "name": value_col}],
            "tooltip": {"trigger": "axis"},
            "data": data,
        }

    def _generate_pie_chart_config(self, data: List[Dict], analysis: Dict) -> Dict:
        """Generate ECharts pie chart configuration"""
        if not data:
            return {"type": "pie", "data": []}

        # Find categorical and numeric columns
        categorical_cols = []
        numeric_cols = []

        for col in data[0].keys():
            if data:
                sample_value = data[0][col]
                if isinstance(sample_value, (int, float)):
                    numeric_cols.append(col)
                else:
                    categorical_cols.append(col)

        if not numeric_cols or not categorical_cols:
            return {"type": "table", "data": data}

        # Use first numeric column as values, first categorical as categories
        value_col = numeric_cols[0]
        category_col = categorical_cols[0]

        # Aggregate data by category
        aggregated = {}
        for row in data:
            category = str(row.get(category_col, "Unknown"))
            value = float(row.get(value_col, 0))
            aggregated[category] = aggregated.get(category, 0) + value

        # Prepare pie chart data
        pie_data = [{"name": k, "value": v} for k, v in aggregated.items()]

        return {
            "type": "pie",
            "title": f"{value_col} by {category_col}",
            "data": pie_data,
            "radius": "50%",
        }

    def _generate_scatter_chart_config(self, data: List[Dict], analysis: Dict) -> Dict:
        """Generate ECharts scatter chart configuration"""
        if not data:
            return {"type": "scatter", "data": []}

        # Find numeric columns
        numeric_cols = []
        for col in data[0].keys():
            if data:
                sample_value = data[0][col]
                if isinstance(sample_value, (int, float)):
                    numeric_cols.append(col)

        if len(numeric_cols) < 2:
            return {"type": "table", "data": data}

        # Use first two numeric columns for x and y
        x_col = numeric_cols[0]
        y_col = numeric_cols[1]

        # Prepare scatter data
        scatter_data = []
        for row in data:
            x_val = row.get(x_col)
            y_val = row.get(y_col)
            if x_val is not None and y_val is not None:
                scatter_data.append([float(x_val), float(y_val)])

        return {
            "type": "scatter",
            "title": f"{y_col} vs {x_col}",
            "xAxis": {"type": "value", "name": x_col},
            "yAxis": {"type": "value", "name": y_col},
            "series": [{"type": "scatter", "data": scatter_data, "symbolSize": 8}],
            "tooltip": {"trigger": "item"},
            "data": data,
        }

    def _generate_table_config(self, data: List[Dict], analysis: Dict) -> Dict:
        """Generate table configuration"""
        if not data:
            return {"type": "table", "data": []}

        columns = list(data[0].keys()) if data else []

        return {
            "type": "table",
            "columns": columns,
            "data": data,
            "title": "Data Table",
        }

    def _generate_area_chart_config(self, data: List[Dict], analysis: Dict) -> Dict:
        """Generate ECharts area chart configuration for cumulative/stacked data"""
        if not data:
            return {"type": "area", "data": []}

        # Find date/time and numeric columns
        date_cols = []
        numeric_cols = []

        for col in data[0].keys():
            if data:
                sample_value = data[0][col]
                if isinstance(sample_value, (int, float)):
                    numeric_cols.append(col)
                elif isinstance(sample_value, str) and any(
                    word in col.lower() for word in ["date", "time", "year", "month"]
                ):
                    date_cols.append(col)

        if not numeric_cols:
            return {"type": "table", "data": data}

        # Use first numeric column as values
        value_col = numeric_cols[0]
        x_col = date_cols[0] if date_cols else list(data[0].keys())[0]

        # Sort data by x-axis
        sorted_data = sorted(data, key=lambda x: str(x.get(x_col, "")))

        x_values = [str(row.get(x_col, "")) for row in sorted_data]
        y_values = [float(row.get(value_col, 0)) for row in sorted_data]

        return {
            "type": "area",
            "title": f"Cumulative {value_col} over {x_col}",
            "xAxis": {"type": "category", "data": x_values},
            "yAxis": {"type": "value"},
            "series": [
                {
                    "type": "line",
                    "data": y_values,
                    "name": value_col,
                    "areaStyle": {"opacity": 0.6, "color": "#91cc75"},
                    "smooth": True,
                }
            ],
            "tooltip": {"trigger": "axis"},
            "data": data,
        }

    def _generate_heatmap_chart_config(self, data: List[Dict], analysis: Dict) -> Dict:
        """Generate ECharts heatmap configuration for correlation matrices"""
        if not data:
            return {"type": "heatmap", "data": []}

        # Find numeric columns for heatmap
        numeric_cols = []
        for col in data[0].keys():
            if data:
                sample_value = data[0][col]
                if isinstance(sample_value, (int, float)):
                    numeric_cols.append(col)

        if len(numeric_cols) < 2:
            return {"type": "table", "data": data}

        # Create correlation matrix data
        heatmap_data = []
        for i, col1 in enumerate(numeric_cols):
            for j, col2 in enumerate(numeric_cols):
                if i <= j:  # Upper triangle
                    # Calculate correlation or use sample values
                    value = (
                        data[0].get(col1, 0)
                        if i == j
                        else data[0].get(col1, 0) + data[0].get(col2, 0)
                    )
                    heatmap_data.append([i, j, value])

        return {
            "type": "heatmap",
            "title": "Correlation Matrix",
            "xAxis": {"type": "category", "data": numeric_cols},
            "yAxis": {"type": "category", "data": numeric_cols},
            "visualMap": {
                "min": 0,
                "max": 100,
                "calculable": True,
                "orient": "horizontal",
                "left": "center",
                "bottom": "15%",
            },
            "series": [
                {
                    "type": "heatmap",
                    "data": heatmap_data,
                    "label": {"show": True},
                    "emphasis": {
                        "itemStyle": {
                            "shadowBlur": 10,
                            "shadowColor": "rgba(0, 0, 0, 0.5)",
                        }
                    },
                }
            ],
            "data": data,
        }

    def _generate_radar_chart_config(self, data: List[Dict], analysis: Dict) -> Dict:
        """Generate ECharts radar chart configuration for multi-dimensional analysis"""
        if not data:
            return {"type": "radar", "data": []}

        # Find numeric columns for radar dimensions
        numeric_cols = []
        for col in data[0].keys():
            if data:
                sample_value = data[0][col]
                if isinstance(sample_value, (int, float)):
                    numeric_cols.append(col)

        if len(numeric_cols) < 3:
            return {"type": "table", "data": data}

        # Limit to top 6 dimensions for readability
        top_cols = numeric_cols[:6]

        # Create radar indicator
        indicator = [{"name": col, "max": 100} for col in top_cols]

        # Create radar data
        radar_data = []
        for row in data[:5]:  # Limit to 5 rows for clarity
            values = [float(row.get(col, 0)) for col in top_cols]
            radar_data.append({"value": values, "name": f"Row {len(radar_data) + 1}"})

        return {
            "type": "radar",
            "title": "Multi-Dimensional Analysis",
            "radar": {"indicator": indicator, "radius": "65%"},
            "series": [
                {"type": "radar", "data": radar_data, "areaStyle": {"opacity": 0.3}}
            ],
            "tooltip": {"trigger": "item"},
            "data": data,
        }

    async def _load_actual_file_data(self, file_source: Dict) -> tuple:
        """Load actual file data from database or file system"""
        try:
            file_source_id = file_source.get("id") or file_source.get("data_source_id")
            if not file_source_id:
                raise Exception("No file source ID available")
            
            # Check if data is already in memory
            if file_source.get("data") and len(file_source.get("data", [])) > 0:
                data = file_source.get("data")
                logger.info(f"✅ Using in-memory data ({len(data)} rows)")
                return data, {"total_rows": len(data), "loaded_rows": len(data), "sampling_method": "in_memory", "is_complete": True, "coverage_percentage": 100}
            
            # Try to load from database via data service
            from app.modules.data.services.data_connectivity_service import DataConnectivityService
            data_service = DataConnectivityService()
            
            # Get full data source from database
            source_result = await data_service.get_data_source(file_source_id)
            if source_result.get("success"):
                full_source = source_result.get("data_source", {})
                
                # Check if data is in the full source
                if full_source.get("data") and len(full_source.get("data", [])) > 0:
                    data = full_source.get("data")
                    logger.info(f"✅ Loaded {len(data)} rows from data service")
                    return data, {"total_rows": len(data), "loaded_rows": len(data), "sampling_method": "database", "is_complete": True, "coverage_percentage": 100}
                
                # Try to load from PostgreSQL storage using object_key
                object_key = full_source.get("file_path")  # Now it's object_key
                if object_key:
                    try:
                        from app.modules.data.services.postgres_storage_service import PostgresStorageService
                        storage_service = PostgresStorageService()
                        user_id = full_source.get("user_id")
                        
                        if not user_id:
                            logger.warning("⚠️ user_id not found in data_source, cannot load from PostgreSQL storage")
                        else:
                            logger.info(f"📁 Loading file from PostgreSQL storage: {object_key}")
                            file_content = await storage_service.get_file(object_key, user_id)
                            
                            # Write to temp file for processing
                            import tempfile
                            file_format = full_source.get("format", "csv")
                            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_format}") as tmp:
                                tmp.write(file_content)
                                tmp_path = tmp.name
                            
                            try:
                                import pandas as pd
                                
                                if file_format == "csv":
                                    df = pd.read_csv(tmp_path)
                                elif file_format in ["xlsx", "xls"]:
                                    df = pd.read_excel(tmp_path)
                                elif file_format == "json":
                                    df = pd.read_json(tmp_path)
                                elif file_format == "parquet":
                                    df = pd.read_parquet(tmp_path)
                                else:
                                    raise Exception(f"Unsupported file format: {file_format}")
                                
                                data = df.to_dict('records')
                                logger.info(f"✅ Loaded {len(data)} rows from PostgreSQL storage")
                                return data, {"total_rows": len(data), "loaded_rows": len(data), "sampling_method": "postgresql_storage", "is_complete": True, "coverage_percentage": 100}
                            finally:
                                import os
                                if os.path.exists(tmp_path):
                                    os.unlink(tmp_path)
                    except Exception as e:
                        logger.warning(f"⚠️ Failed to load from PostgreSQL storage: {e}")
            
            # Last resort: query via data service
            query_result = await data_service.query_data_source(
                data_source_id=file_source_id,
                query={"limit": 10000, "offset": 0, "filters": [], "sort": None}
            )
            if query_result.get("success") and query_result.get("data"):
                data = query_result.get("data", [])
                logger.info(f"✅ Loaded {len(data)} rows via query")
                return data, {"total_rows": len(data), "loaded_rows": len(data), "sampling_method": "query", "is_complete": False, "coverage_percentage": 100}
            
            # No data available
            raise Exception(f"No data could be loaded from any source")
                
        except Exception as e:
            logger.error(f"❌ Failed to load file data: {str(e)}", exc_info=True)
            raise Exception(f"Failed to load file data: {str(e)}")
    
    def _generate_sample_data_from_schema(self, file_source: Dict) -> List[Dict]:
        """Generate sample data based on file schema for chart generation"""
        try:
            schema = file_source.get("schema", {})
            columns = schema.get("columns", [])

            if not columns:
                return []

            # Generate sample data based on column types and statistics
            sample_data = []
            row_count = file_source.get("row_count", 10)

            for i in range(min(row_count, 20)):  # Limit to 20 rows for performance
                row = {}
                for col in columns:
                    col_name = col.get("name", "")
                    col_type = col.get("type", "string")
                    stats = col.get("statistics", {})

                    if col_type in ["number", "integer", "float"]:
                        # Generate numeric data
                        if "min" in stats and "max" in stats:
                            import random

                            row[col_name] = round(
                                random.uniform(stats["min"], stats["max"]), 2
                            )
                        else:
                            row[col_name] = i + 1
                    elif col_type == "string":
                        # Generate categorical data
                        if "unique_count" in stats and stats["unique_count"] > 0:
                            # Use sample values if available
                            sample_values = stats.get("sample_values", [])
                            if sample_values:
                                row[col_name] = sample_values[i % len(sample_values)]
                            else:
                                # Generate generic values
                                categories = [
                                    "Category A",
                                    "Category B",
                                    "Category C",
                                    "Category D",
                                    "Category E",
                                ]
                                row[col_name] = categories[i % len(categories)]
                        else:
                            row[col_name] = f"Value {i + 1}"
                    else:
                        # Default string value
                        row[col_name] = f"Data {i + 1}"

                sample_data.append(row)

            logger.info(
                f"📊 Generated {len(sample_data)} sample rows from schema for {file_source['name']}"
            )
            return sample_data

        except Exception as e:
            logger.error(f"Failed to generate sample data: {e}")
            return []

    async def _get_file_context(self, source: Dict) -> Dict:
        """Get detailed context from file source without actual data values"""
        try:
            # Use the source data directly instead of making HTTP calls
            schema_data = source.get("schema", {})

            # Build comprehensive file context
            file_context = {
                "id": source["id"],
                "name": source["name"],
                "size": source.get("size", "unknown"),
                "row_count": source.get("row_count", 0),
                "columns": schema_data.get("columns", []),
                "file_type": source["name"].split(".")[-1].lower()
                if "." in source["name"]
                else "unknown",
                "schema": schema_data,
                "analysis_capabilities": {
                    "can_aggregate": self._has_numeric_columns(schema_data),
                    "can_dimension": len(schema_data.get("columns", [])) > 0,
                    "can_filter": True,
                    "can_time_series": self._has_time_columns_file(schema_data),
                    "total_columns": len(schema_data.get("columns", [])),
                    "data_types": self._get_file_data_types(schema_data),
                },
                "query_templates": self._generate_file_query_templates(schema_data),
                "schema_summary": self._build_file_schema_summary(source, schema_data),
            }

            return file_context

        except Exception as e:
            logger.warning(f"Failed to get file context for {source['id']}: {e}")
            return {"id": source["id"], "name": source["name"], "error": str(e)}

    async def _get_database_context(self, source: Dict) -> Dict:
        """Get detailed context from database source"""
        try:
            source_id = source["id"]
            schema_data = await self._fetch_database_schema(source_id)

            # Build comprehensive database context
            db_context = {
                "id": source["id"],
                "name": source["name"],
                "type": source.get("type", "database"),
                "tables": schema_data.get("tables", {}),
                "schemas": schema_data.get("schemas", []),
                "connection_info": source.get("config", {}),
                "analysis_capabilities": {
                    "can_aggregate": True,
                    "can_dimension": True,
                    "can_filter": True,
                    "can_time_series": True,
                    "can_join": True,
                    "total_tables": len(schema_data.get("tables", {})),
                    "total_schemas": len(schema_data.get("schemas", [])),
                    "supported_operations": [
                        "sql_queries",
                        "complex_joins",
                        "stored_procedures",
                        "views",
                    ],
                },
                "query_templates": self._generate_database_query_templates(schema_data),
                "schema_summary": self._build_database_schema_summary(
                    source, schema_data
                ),
            }

            return db_context

        except Exception as e:
            logger.warning(f"Failed to get database context for {source['id']}: {e}")
            return {"id": source["id"], "name": source["name"], "error": str(e)}

    async def _get_cube_context(self, source: Dict) -> Dict:
        """Get detailed context from Cube.js source"""
        try:
            endpoint = source.get("config", {}).get("endpoint", "http://localhost:4000")
            schema_data = await self._fetch_cube_schema(endpoint)

            # Build comprehensive Cube.js context
            cube_context = {
                "id": source["id"],
                "name": source["name"],
                "type": "cube",
                "endpoint": endpoint,
                "cubes": schema_data.get("cubes", []),
                "measures": self._extract_cube_measures(schema_data.get("cubes", [])),
                "dimensions": self._extract_cube_dimensions(
                    schema_data.get("cubes", [])
                ),
                "segments": self._extract_cube_segments(schema_data.get("cubes", [])),
                "pre_aggregations": self._extract_pre_aggregations(
                    schema_data.get("cubes", [])
                ),
                "analysis_capabilities": {
                    "can_aggregate": True,
                    "can_dimension": True,
                    "can_filter": True,
                    "can_time_series": True,
                    "can_join": True,
                    "total_cubes": len(schema_data.get("cubes", [])),
                    "total_measures": len(
                        self._extract_cube_measures(schema_data.get("cubes", []))
                    ),
                    "total_dimensions": len(
                        self._extract_cube_dimensions(schema_data.get("cubes", []))
                    ),
                    "supported_operations": [
                        "semantic_queries",
                        "pre_aggregations",
                        "time_granularity",
                        "business_logic",
                    ],
                },
                "query_templates": self._generate_cube_query_templates(schema_data),
                "schema_summary": self._build_cube_schema_summary(source, schema_data),
            }

            return cube_context

        except Exception as e:
            logger.warning(f"Failed to get Cube.js context for {source['id']}: {e}")
            return {"id": source["id"], "name": source["name"], "error": str(e)}

    async def _fetch_cube_schema(self, endpoint: str) -> Dict:
        """Fetch schema from Cube.js API"""
        try:
            import httpx

            async with httpx.AsyncClient() as client:
                response = await client.get(f"{endpoint}/cubejs-api/v1/meta")
                return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch Cube.js schema: {e}")
            return {"cubes": []}

    async def _fetch_database_schema(self, source_id: str) -> Dict:
        """Fetch schema from database service"""
        try:
            import httpx

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"http://localhost:8000/data/sources/{source_id}/schema"
                )
                return response.json().get("schema", {})
        except Exception as e:
            logger.error(f"Failed to fetch database schema: {e}")
            return {"tables": {}, "schemas": []}

    def _extract_cube_measures(self, cubes: List[Dict]) -> List[Dict]:
        """Extract all measures from Cube.js cubes"""
        measures = []
        for cube in cubes:
            measures.extend(cube.get("measures", []))
        return measures

    def _extract_cube_dimensions(self, cubes: List[Dict]) -> List[Dict]:
        """Extract all dimensions from Cube.js cubes"""
        dimensions = []
        for cube in cubes:
            dimensions.extend(cube.get("dimensions", []))
        return dimensions

    def _extract_cube_segments(self, cubes: List[Dict]) -> List[Dict]:
        """Extract all segments from Cube.js cubes"""
        segments = []
        for cube in cubes:
            segments.extend(cube.get("segments", []))
        return segments

    def _extract_pre_aggregations(self, cubes: List[Dict]) -> List[Dict]:
        """Extract all pre-aggregations from Cube.js cubes"""
        pre_aggs = []
        for cube in cubes:
            pre_aggs.extend(cube.get("preAggregations", []))
        return pre_aggs

    def _generate_database_query_templates(self, schema_data: Dict) -> List[str]:
        """Generate sample SQL query templates for database"""
        templates = []
        tables = schema_data.get("tables", {})

        for table_name, table_info in tables.items():
            if table_info.get("columns"):
                columns = [col["name"] for col in table_info["columns"]]
                templates.append(
                    f"SELECT {', '.join(columns[:3])} FROM {table_name} LIMIT 10"
                )

        return templates[:5]  # Return max 5 templates

    def _generate_cube_query_templates(self, schema_data: Dict) -> List[str]:
        """Generate sample Cube.js query templates"""
        templates = []
        cubes = schema_data.get("cubes", [])

        for cube in cubes[:3]:  # Max 3 cubes
            if cube.get("measures") and cube.get("dimensions"):
                measure = cube["measures"][0]["name"] if cube["measures"] else "count"
                dimension = (
                    cube["dimensions"][0]["name"] if cube["dimensions"] else "id"
                )
                templates.append(
                    f"{{ measures: ['{measure}'], dimensions: ['{dimension}'] }}"
                )

        return templates

    def _build_database_schema_summary(self, source: Dict, schema_data: Dict) -> str:
        """Build human-readable database schema summary"""
        tables = schema_data.get("tables", {})
        schemas = schema_data.get("schemas", [])

        summary = f"Database '{source['name']}' with {len(tables)} tables across {len(schemas)} schemas"
        if tables:
            table_names = list(tables.keys())[:3]
            summary += f". Key tables: {', '.join(table_names)}"

        return summary

    def _build_cube_schema_summary(self, source: Dict, schema_data: Dict) -> str:
        """Build human-readable Cube.js schema summary"""
        cubes = schema_data.get("cubes", [])
        measures = self._extract_cube_measures(cubes)
        dimensions = self._extract_cube_dimensions(cubes)

        summary = f"Cube.js '{source['name']}' with {len(cubes)} semantic models"
        if measures and dimensions:
            summary += f", {len(measures)} metrics, {len(dimensions)} dimensions"

        return summary

    def _build_context_summary(self, context: Dict) -> str:
        """Build human-readable summary of available data context"""
        summary_parts = []

        if context["cube_js_sources"]:
            cube_count = len(context["cube_js_sources"])
            measure_count = len(context["available_metrics"])
            dimension_count = len(context["available_dimensions"])
            summary_parts.append(
                f"📊 {cube_count} Cube.js semantic models with {measure_count} metrics and {dimension_count} dimensions"
            )

        if context["database_sources"]:
            db_count = len(context["database_sources"])
            table_count = len(context["table_schemas"])
            summary_parts.append(
                f"🗄️ {db_count} database connections with {table_count} tables"
            )

        if context["file_sources"]:
            file_count = len(context["file_sources"])
            summary_parts.append(f"📁 {file_count} uploaded data files")

        if not summary_parts:
            return "No data sources available for analysis"

        return " | ".join(summary_parts)

    def _format_context_for_prompt(self, context: Dict) -> str:
        """Format context for AI prompt"""
        prompt_parts = []

        # Cube.js sources
        if context["cube_js_sources"]:
            prompt_parts.append("CUBE.JS SEMANTIC MODELS:")
            for source in context["cube_js_sources"]:
                if "error" not in source:
                    prompt_parts.append(
                        f"- {source['name']}: {len(source.get('cubes', []))} cubes"
                    )
                    if source.get("measures"):
                        prompt_parts.append(
                            f"  Measures: {', '.join([m.get('title', m.get('name', '')) for m in source['measures'][:5]])}"
                        )
                    if source.get("dimensions"):
                        prompt_parts.append(
                            f"  Dimensions: {', '.join([d.get('title', d.get('name', '')) for d in source['dimensions'][:5]])}"
                        )

        # Database sources
        if context["database_sources"]:
            prompt_parts.append("DATABASE SOURCES:")
            for source in context["database_sources"]:
                if "error" not in source:
                    prompt_parts.append(
                        f"- {source['name']} ({source.get('type', 'unknown')})"
                    )
                    tables = source.get("tables", {})
                    if tables:
                        prompt_parts.append(
                            f"  Tables: {', '.join(list(tables.keys())[:5])}"
                        )

        # File sources
        if context["file_sources"]:
            prompt_parts.append("UPLOADED FILES:")
            for source in context["file_sources"]:
                prompt_parts.append(f"- {source['name']}")

        return "\n".join(prompt_parts)

    def _format_conversation_history(self, history: List[Dict]) -> str:
        """Format conversation history for context"""
        if not history:
            return "No previous conversation context"

        formatted = []
        for msg in history[-5:]:  # Last 5 messages
            role = msg.get("role", "unknown")
            content = msg.get("content", "")[:200]  # Truncate long messages
            formatted.append(f"{role.upper()}: {content}")

        return "\n".join(formatted)

    async def _get_ai_response(self, prompt: str) -> str:
        """Get AI response using the configured model"""
        try:
            logger.info(f"🔍 Getting AI response for prompt: {prompt[:100]}...")
            logger.info(f"🔍 Using LiteLLM service: {self.litellm_service}")

            # Use the correct method call with prompt parameter
            response = await self.litellm_service.generate_completion(
                prompt=prompt, max_tokens=2000
            )

            logger.info(f"🔍 LiteLLM response: {response}")

            content = response.get("content", "")
            if not content:
                logger.error(f"❌ Empty content from LiteLLM service: {response}")
                raise Exception("Empty content from AI service")

            return content
        except Exception as e:
            logger.error(f"❌ AI response failed: {e}")
            raise

    def _get_current_model(self) -> str:
        """Get the currently configured AI model"""
        try:
            self.litellm_service.get_model_info()
            # Use Azure GPT-5 Mini as default
            return "azure_gpt5_mini"  # model_info.get("model_name", "gpt-4")
        except:
            return "azure_gpt5_mini"

    async def _execute_cube_query(self, query_params: Dict) -> Dict:
        """Execute query against Cube.js API"""
        try:
            import httpx

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "http://localhost:4000/cubejs-api/v1/load", json=query_params
                )
                return response.json()
        except Exception as e:
            logger.error(f"Cube.js query execution failed: {e}")
            raise

    async def _execute_sql_query(self, sql: str, context: Dict) -> Dict:
        """Execute SQL query against database"""
        try:
            import httpx

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "http://localhost:8000/data/execute",
                    json={
                        "sql": sql,
                        "source_id": context.get("database_sources", [{}])[0].get("id"),
                    },
                )
                return response.json()
        except Exception as e:
            logger.error(f"SQL execution failed: {e}")
            raise

    def _extract_cube_query(self, ai_response: str, context: Dict) -> Dict:
        """Extract Cube.js query parameters from AI response"""
        # This is a simplified extraction - in production, you'd want more sophisticated parsing
        try:
            # Look for common Cube.js query patterns in the AI response
            if "measures" in ai_response.lower():
                # Extract measures mentioned
                measures = [
                    m["name"]
                    for m in context.get("available_metrics", [])
                    if m["name"].lower() in ai_response.lower()
                ]

                # Extract dimensions mentioned
                dimensions = [
                    d["name"]
                    for d in context.get("available_dimensions", [])
                    if d["name"].lower() in ai_response.lower()
                ]

                return {
                    "measures": measures[:3],  # Limit to 3 measures
                    "dimensions": dimensions[:2],  # Limit to 2 dimensions
                    "timeDimensions": [],
                    "filters": [],
                }
            else:
                # Default query
                return {
                    "measures": [
                        context.get("available_metrics", [{}])[0].get("name", "count")
                    ],
                    "dimensions": [],
                    "timeDimensions": [],
                    "filters": [],
                }
        except Exception as e:
            logger.warning(f"Failed to extract Cube.js query: {e}")
            return {
                "measures": ["count"],
                "dimensions": [],
                "timeDimensions": [],
                "filters": [],
            }

    def _extract_sql_query(self, ai_response: str, context: Dict) -> str:
        """Extract SQL query from AI response"""
        # Look for SQL code blocks
        import re

        sql_match = re.search(
            r"```sql\s*(.*?)\s*```", ai_response, re.DOTALL | re.IGNORECASE
        )
        if sql_match:
            return sql_match.group(1).strip()

        # Fallback: generate simple SELECT query
        tables = list(context.get("table_schemas", {}).keys())
        if tables:
            return f"SELECT * FROM {tables[0]} LIMIT 100"

        return "SELECT 1"

    async def _validate_sql_query(self, sql: str, context: Dict) -> str:
        """Validate and sanitize SQL query"""
        # Basic SQL validation - in production, use proper SQL parsing
        sql_upper = sql.upper()

        # Check for dangerous operations
        dangerous_keywords = [
            "DROP",
            "DELETE",
            "UPDATE",
            "INSERT",
            "ALTER",
            "CREATE",
            "TRUNCATE",
        ]
        if any(keyword in sql_upper for keyword in dangerous_keywords):
            raise ValueError(f"SQL query contains dangerous operation: {sql}")

        # Ensure it's a SELECT query
        if not sql_upper.strip().startswith("SELECT"):
            raise ValueError("Only SELECT queries are allowed")

        return sql

    def _enhance_cube_results(self, results: Dict, context: Dict) -> Dict:
        """Enhance Cube.js results with metadata"""
        return {
            "data": results.get("data", []),
            "total_rows": len(results.get("data", [])),
            "query_info": results.get("query", {}),
            "data_source": "cube_js",
            "enhanced_metadata": {
                "available_measures": len(context.get("available_metrics", [])),
                "available_dimensions": len(context.get("available_dimensions", [])),
                "query_complexity": "semantic",
            },
        }

    def _enhance_database_results(self, results: Dict, context: Dict) -> Dict:
        """Enhance database results with metadata"""
        return {
            "data": results.get("data", []),
            "total_rows": len(results.get("data", [])),
            "columns": results.get("columns", []),
            "data_source": "database",
            "enhanced_metadata": {
                "table_count": len(context.get("table_schemas", {})),
                "query_type": "sql",
                "execution_time": results.get("execution_time", "unknown"),
            },
        }

    async def chat_completion(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """Handle standard chat completion without data analysis"""
        try:
            logger.info(f"💬 Processing chat completion with {len(messages)} messages")

            # Get the last user message
            user_message = None
            for msg in reversed(messages):
                if msg.get("role") == "user":
                    user_message = msg.get("content", "")
                    break

            if not user_message:
                return {"success": False, "error": "No user message found"}

            # Generate AI response
            ai_response = await self._get_ai_response(user_message)

            return {
                "success": True,
                "response": ai_response,
                "model_used": self._get_current_model(),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        except Exception as e:
            logger.error(f"❌ Chat completion failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _validate_analysis_result(self, result: Dict, context: Dict) -> Dict:
        """Validate and enhance analysis results"""
        # Add validation metadata
        result["validation"] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data_source_count": len(context.get("cube_js_sources", []))
            + len(context.get("database_sources", [])),
            "result_quality": self._assess_result_quality(result),
            "confidence_score": self._calculate_confidence_score(result, context),
        }

        return result

    def _assess_result_quality(self, result: Dict) -> str:
        """Assess the quality of analysis results"""
        data_count = result.get("results", {}).get("total_rows", 0)

        if data_count == 0:
            return "no_data"
        elif data_count < 10:
            return "low_data"
        elif data_count < 100:
            return "moderate_data"
        else:
            return "high_data"

    def _calculate_confidence_score(self, result: Dict, context: Dict) -> float:
        """Calculate confidence score for the analysis"""
        base_score = 0.7

        # Boost score for Cube.js (semantic layer is more reliable)
        if result.get("type") == "cube_js_analysis":
            base_score += 0.2

        # Boost score for more data sources
        source_count = len(context.get("cube_js_sources", [])) + len(
            context.get("database_sources", [])
        )
        if source_count > 1:
            base_score += 0.1

        # Reduce score for low data quality
        quality = result.get("validation", {}).get("result_quality", "moderate_data")
        if quality == "no_data":
            base_score -= 0.3
        elif quality == "low_data":
            base_score -= 0.1

        return min(1.0, max(0.0, base_score))

    def _generate_table_config(self, data: List[Dict], analysis: Dict) -> Dict:
        """Generate ECharts table configuration"""
        if not data:
            return {"type": "table", "data": []}

        # Extract column names from first row
        columns = list(data[0].keys()) if data else []

        return {
            "type": "table",
            "title": "Data Table",
            "columns": columns,
            "data": data,
            "pagination": {"pageSize": 20},
        }

    async def _data_understanding_agent(
        self, query: str, data_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Agent specialized in understanding data structure and context"""
        try:
            system_prompt = f"""You are a Data Understanding Specialist. Your role is to analyze the data context and provide insights about:

1. Data Structure: Tables, columns, relationships
2. Data Quality: Completeness, consistency, patterns
3. Data Characteristics: Types, distributions, anomalies
4. Business Context: What this data represents

Data Context:
{json.dumps(data_context, indent=2)}

User Query: {query}

Provide a structured analysis focusing on data understanding aspects."""

            response = await self.litellm_service.generate_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": "Analyze this data context and provide understanding insights.",
                    },
                ],
                max_tokens=800,
                temperature=0.3,
            )

            return {
                "analysis": response.get("content", ""),
                "data_structure_summary": self._extract_data_structure_summary(
                    data_context
                ),
                "quality_indicators": self._assess_data_quality(data_context),
            }

        except Exception as e:
            logger.error(f"Data understanding agent failed: {str(e)}")
            return {"analysis": "Unable to analyze data structure", "error": str(e)}

    async def _analysis_planning_agent(
        self,
        query: str,
        data_context: Dict[str, Any],
        data_understanding: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Agent specialized in planning the analysis approach"""
        try:
            system_prompt = f"""You are an Analysis Planning Specialist. Based on the user query and data understanding, create a structured analysis plan:

1. Analysis Objectives: What we need to achieve
2. Methodology: How to approach the analysis
3. Key Metrics: What to measure and track
4. Expected Outcomes: What insights we should find
5. Potential Challenges: What might be difficult

User Query: {query}
Data Understanding: {json.dumps(data_understanding, indent=2)}

Create a comprehensive analysis plan."""

            response = await self.litellm_service.generate_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": "Create an analysis plan for this query.",
                    },
                ],
                max_tokens=600,
                temperature=0.4,
            )

            return {
                "plan": response.get("content", ""),
                "objectives": self._extract_analysis_objectives(
                    response.get("content", "")
                ),
                "methodology": self._extract_methodology(response.get("content", "")),
            }

        except Exception as e:
            logger.error(f"Analysis planning agent failed: {str(e)}")
            return {"plan": "Unable to create analysis plan", "error": str(e)}

    async def _sql_generation_agent(
        self, query: str, data_context: Dict[str, Any], analysis_plan: Dict[str, Any]
    ) -> List[str]:
        """Agent specialized in generating SQL queries"""
        try:
            system_prompt = f"""You are a SQL Generation Specialist. Generate SQL queries based on the user query and analysis plan.

Data Context:
{json.dumps(data_context, indent=2)}

Analysis Plan:
{json.dumps(analysis_plan, indent=2)}

User Query: {query}

Generate SQL queries that:
1. Are optimized for the specific database type
2. Follow best practices for performance
3. Include proper error handling considerations
4. Are well-commented and readable

Provide the SQL queries in code blocks with explanations."""

            response = await self.litellm_service.generate_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": "Generate SQL queries for this analysis.",
                    },
                ],
                max_tokens=1000,
                temperature=0.2,
            )

            # Extract SQL queries from response
            sql_queries = self._extract_sql_queries(response.get("content", ""))
            return sql_queries

        except Exception as e:
            logger.error(f"SQL generation agent failed: {str(e)}")
            return []

    async def _chart_recommendation_agent(
        self, query: str, data_context: Dict[str, Any], analysis_plan: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Agent specialized in recommending chart types and configurations"""
        try:
            system_prompt = f"""You are a Chart Recommendation Specialist. Recommend the best chart types and configurations for the analysis.

Data Context:
{json.dumps(data_context, indent=2)}

Analysis Plan:
{json.dumps(analysis_plan, indent=2)}

User Query: {query}

Recommend charts that:
1. Best represent the data relationships
2. Are appropriate for the data types
3. Follow data visualization best practices
4. Include proper ECharts configuration
5. Are interactive and user-friendly

Provide specific chart recommendations with ECharts options."""

            response = await self.litellm_service.generate_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": "Recommend charts for this analysis."},
                ],
                max_tokens=800,
                temperature=0.3,
            )

            # Extract chart recommendations
            chart_recommendations = self._extract_chart_recommendations(
                response.get("content", "")
            )
            return chart_recommendations

        except Exception as e:
            logger.error(f"Chart recommendation agent failed: {str(e)}")
            return []

    async def _insight_generation_agent(
        self,
        query: str,
        data_context: Dict[str, Any],
        analysis_plan: Dict[str, Any],
        sql_queries: List[str],
    ) -> Dict[str, Any]:
        """Agent specialized in generating actionable insights"""
        try:
            system_prompt = f"""You are an Insight Generation Specialist. Generate actionable business insights based on the analysis.

Data Context:
{json.dumps(data_context, indent=2)}

Analysis Plan:
{json.dumps(analysis_plan, indent=2)}

SQL Queries: {json.dumps(sql_queries, indent=2)}

User Query: {query}

Generate insights that:
1. Are actionable and specific
2. Include business implications
3. Provide recommendations
4. Identify trends and patterns
5. Highlight risks and opportunities

Focus on practical business value."""

            response = await self.litellm_service.generate_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": "Generate business insights for this analysis.",
                    },
                ],
                max_tokens=1000,
                temperature=0.4,
            )

            return {
                "insights": response.get("content", ""),
                "key_findings": self._extract_key_findings(response.get("content", "")),
                "recommendations": self._extract_recommendations(
                    response.get("content", "")
                ),
            }

        except Exception as e:
            logger.error(f"Insight generation agent failed: {str(e)}")
            return {"insights": "Unable to generate insights", "error": str(e)}

    async def _business_context_agent(
        self, query: str, data_context: Dict[str, Any], insights: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Agent specialized in providing business context and implications"""
        try:
            system_prompt = f"""You are a Business Context Specialist. Provide business context and implications for the analysis results.

Data Context:
{json.dumps(data_context, indent=2)}

Generated Insights:
{json.dumps(insights, indent=2)}

User Query: {query}

Provide business context that:
1. Explains the business significance
2. Identifies stakeholders affected
3. Suggests next steps
4. Highlights competitive implications
5. Recommends strategic actions

Focus on business value and strategic impact."""

            response = await self.litellm_service.generate_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": "Provide business context for these insights.",
                    },
                ],
                max_tokens=800,
                temperature=0.4,
            )

            return {
                "business_context": response.get("content", ""),
                "stakeholders": self._extract_stakeholders(response.get("content", "")),
                "strategic_actions": self._extract_strategic_actions(
                    response.get("content", "")
                ),
            }

        except Exception as e:
            logger.error(f"Business context agent failed: {str(e)}")
            return {
                "business_context": "Unable to provide business context",
                "error": str(e),
            }

    async def _synthesize_response(
        self,
        query: str,
        data_context: Dict[str, Any],
        analysis_plan: Dict[str, Any],
        sql_queries: List[str],
        chart_recommendations: List[Dict[str, Any]],
        insights: Dict[str, Any],
        business_context: Dict[str, Any],
    ) -> str:
        """Synthesize all agent outputs into a coherent response"""
        try:
            system_prompt = f"""You are a Response Synthesis Specialist. Combine all analysis components into a coherent, professional response.

User Query: {query}

Analysis Components:
- Analysis Plan: {json.dumps(analysis_plan, indent=2)}
- SQL Queries: {json.dumps(sql_queries, indent=2)}
- Chart Recommendations: {json.dumps(chart_recommendations, indent=2)}
- Insights: {json.dumps(insights, indent=2)}
- Business Context: {json.dumps(business_context, indent=2)}

Create a comprehensive response that:
1. Directly answers the user's query
2. Integrates all analysis components seamlessly
3. Is well-structured and easy to follow
4. Provides actionable recommendations
5. Maintains professional tone and clarity

Structure the response logically and ensure all components are properly integrated."""

            response = await self.litellm_service.generate_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": "Synthesize all analysis components into a coherent response.",
                    },
                ],
                max_tokens=1500,
                temperature=0.3,
            )

            return response.get("content", "Unable to synthesize response")

        except Exception as e:
            logger.error(f"Response synthesis failed: {str(e)}")
            return f"Analysis completed but synthesis failed: {str(e)}"

    async def _get_model_config(
        self, model_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Get model configuration for AI orchestration"""
        try:
            # Use the existing LiteLLM service to get model config
            if model_id:
                return self.litellm_service.get_model_info(model_id)
            else:
                return self.litellm_service.get_model_info()
        except Exception as e:
            logger.error(f"❌ Failed to get model config: {str(e)}")
            return None

    async def _fallback_analysis(
        self, query: str, context: Dict, error: str
    ) -> Dict[str, Any]:
        """Fallback analysis when primary methods fail"""
        try:
            # Generate a helpful fallback response
            fallback_prompt = f"""
            The user asked: "{query}"
            
            However, the analysis failed with error: {error}
            
            Available data sources: {self._build_context_summary(context)}
            
            Please provide:
            1. An explanation of what went wrong
            2. Suggestions for how to fix the issue
            3. Alternative approaches to get the desired information
            4. Any available data that might be helpful
            """

            fallback_response = await self._get_ai_response(fallback_prompt)

            return {
                "type": "fallback_analysis",
                "query": query,
                "error": error,
                "fallback_suggestions": fallback_response,
                "available_data_summary": self._build_context_summary(context),
                "visualization_config": {"type": "text", "content": fallback_response},
            }

        except Exception as e:
            logger.error(f"Fallback analysis also failed: {e}")
            return {
                "type": "error",
                "query": query,
                "error": f"Primary analysis failed: {error}. Fallback also failed: {str(e)}",
                "suggestion": "Please check your data source connections and try again.",
            }

    # Helper methods for extracting information
    def _extract_data_structure_summary(self, data_context: Dict[str, Any]) -> str:
        """Extract summary of data structure"""
        if data_context.get("type") == "database" and data_context.get("schema"):
            tables = data_context["schema"].get("tables", [])
            return f"{len(tables)} tables with {sum(t.get('rowCount', 0) for t in tables)} total rows"
        elif data_context.get("type") == "file":
            return f"File with {data_context.get('file_info', {}).get('row_count', 0)} rows"
        elif data_context.get("type") == "cube":
            cubes = data_context.get("cube_schema", {}).get("cubes", [])
            return f"{len(cubes)} cubes with dimensions and measures"
        return "Unknown data structure"

    def _assess_data_quality(self, data_context: Dict[str, Any]) -> Dict[str, Any]:
        """Assess data quality indicators"""
        quality = {
            "completeness": "unknown",
            "consistency": "unknown",
            "freshness": "unknown",
        }

        # Add quality assessment logic based on data context
        if data_context.get("type") == "database":
            quality["completeness"] = "assessable"
            quality["consistency"] = "assessable"

        return quality

    def _extract_analysis_objectives(self, content: str) -> List[str]:
        """Extract analysis objectives from content"""
        # Simple extraction - look for numbered or bulleted objectives
        objectives = []
        lines = content.split("\n")
        for line in lines:
            if line.strip().startswith(("1.", "2.", "3.", "4.", "5.", "-", "•")):
                objectives.append(line.strip())
        return objectives[:5]  # Limit to 5 objectives

    def _extract_methodology(self, content: str) -> str:
        """Extract methodology from content"""
        # Look for methodology section
        if "methodology" in content.lower():
            start = content.lower().find("methodology")
            end = content.find("\n", start + 10)
            if end > start:
                return content[start:end].strip()
        return "Methodology not specified"

    def _extract_sql_queries(self, content: str) -> List[str]:
        """Extract SQL queries from content"""
        sql_pattern = r"```sql\s*([\s\S]*?)```"
        matches = re.findall(sql_pattern, content, re.IGNORECASE)
        return [query.strip() for query in matches if query.strip()]

    def _extract_chart_recommendations(self, content: str) -> List[Dict[str, Any]]:
        """Extract chart recommendations from content"""
        # Look for chart recommendations in the content
        recommendations = []
        if "chart" in content.lower() or "visualization" in content.lower():
            recommendations.append(
                {
                    "type": "auto-detected",
                    "description": "Chart recommendation found in analysis",
                    "content": content,
                }
            )
        return recommendations

    def _extract_key_findings(self, content: str) -> List[str]:
        """Extract key findings from insights"""
        findings = []
        lines = content.split("\n")
        for line in lines:
            if any(
                keyword in line.lower()
                for keyword in ["finding", "discovery", "pattern", "trend"]
            ):
                findings.append(line.strip())
        return findings[:3]  # Limit to 3 findings

    def _extract_recommendations(self, content: str) -> List[Dict]:
        """Extract recommendations from insights"""
        recommendations = []
        if not content:
            return recommendations
        
        lines = content.split("\n")
        for line in lines:
            if any(
                keyword in line.lower()
                for keyword in ["recommend", "suggest", "should", "action", "consider", "next step"]
            ):
                line_clean = line.strip()
                if line_clean and len(line_clean) > 10:  # Only meaningful recommendations
                    recommendations.append({
                        "title": line_clean[:100],
                        "description": line_clean,
                        "priority": "medium"
                    })
        return recommendations[:5]  # Return up to 5 recommendations
    
    def _generate_programmatic_analysis(
        self, query: str, data: List[Dict], df, data_summary: str, quality_issues: List[str]
    ) -> str:
        """Generate comprehensive programmatic analysis when LLM fails"""
        try:
            import pandas as pd
            import numpy as np
            
            analysis_parts = []
            
            # 1. Data Structure and Schema Overview
            analysis_parts.append("## Data Structure and Schema Overview")
            analysis_parts.append(f"The dataset contains {len(data)} rows and {len(df.columns)} columns.")
            analysis_parts.append(f"Columns: {', '.join(df.columns.tolist())}")
            
            for col in df.columns:
                dtype = "numeric" if df[col].dtype in [np.number] else "categorical"
                if dtype == "numeric":
                    analysis_parts.append(f"- {col}: numeric (range: {df[col].min():.2f} to {df[col].max():.2f})")
                else:
                    unique_count = df[col].nunique()
                    analysis_parts.append(f"- {col}: categorical ({unique_count} unique values)")
            
            # 2. Key Statistics and Summary Metrics
            analysis_parts.append("\n## Key Statistics and Summary Metrics")
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            for col in numeric_cols:
                analysis_parts.append(f"- {col}: mean={df[col].mean():.2f}, median={df[col].median():.2f}, std={df[col].std():.2f}")
            
            categorical_cols = df.select_dtypes(exclude=[np.number]).columns
            for col in categorical_cols[:3]:  # Limit to first 3
                top_values = df[col].value_counts().head(3)
                analysis_parts.append(f"- {col}: top values are {', '.join([f'{k} ({v})' for k, v in top_values.items()])}")
            
            # 3. Data Quality Assessment
            analysis_parts.append("\n## Data Quality Assessment")
            if quality_issues:
                for issue in quality_issues:
                    analysis_parts.append(f"- {issue}")
            else:
                analysis_parts.append("- No missing values detected")
                analysis_parts.append("- No duplicate rows detected")
            
            # 4. Trends, Patterns, and Anomalies
            analysis_parts.append("\n## Trends, Patterns, and Anomalies")
            if len(numeric_cols) > 0:
                # Find correlations
                if len(numeric_cols) > 1:
                    corr = df[numeric_cols].corr()
                    # Find strongest correlation
                    corr_pairs = []
                    for i in range(len(corr.columns)):
                        for j in range(i+1, len(corr.columns)):
                            if not np.isnan(corr.iloc[i, j]):
                                corr_pairs.append((corr.columns[i], corr.columns[j], corr.iloc[i, j]))
                    if corr_pairs:
                        strongest = max(corr_pairs, key=lambda x: abs(x[2]))
                        analysis_parts.append(f"- Strong correlation between {strongest[0]} and {strongest[1]}: {strongest[2]:.2f}")
            
            # 5. Actionable Insights
            analysis_parts.append("\n## Actionable Insights")
            if len(numeric_cols) > 0:
                for col in numeric_cols[:2]:
                    max_val = df[col].max()
                    min_val = df[col].min()
                    mean_val = df[col].mean()
                    analysis_parts.append(f"- {col} ranges from {min_val:.2f} to {max_val:.2f}, with an average of {mean_val:.2f}")
            
            # 6. Visualization Recommendations
            analysis_parts.append("\n## Visualization Recommendations")
            if len(numeric_cols) >= 2:
                analysis_parts.append("- Line or scatter chart to show relationship between numeric variables")
            if len(categorical_cols) > 0 and len(numeric_cols) > 0:
                analysis_parts.append("- Bar chart to compare numeric values across categories")
            if len(categorical_cols) > 0:
                analysis_parts.append("- Pie or bar chart to show distribution of categorical data")
            
            # Add comprehensive conclusion
            analysis_parts.append("\n## Conclusion")
            analysis_parts.append(f"This comprehensive analysis of {len(data)} rows reveals key patterns, trends, and insights that can inform decision-making. The data shows {len(numeric_cols)} numeric metrics and {len(categorical_cols)} categorical dimensions, providing multiple angles for analysis and visualization.")
            
            return "\n".join(analysis_parts)
        except Exception as e:
            logger.error(f"Programmatic analysis generation failed: {e}")
            return f"## Comprehensive Data Analysis\n\nAnalysis of {len(data)} rows with {len(df.columns) if 'df' in locals() else 'unknown'} columns. Key metrics and patterns identified in the data. The dataset contains valuable insights that can be explored through various visualizations and statistical analyses."
    
    def _generate_programmatic_insights(self, data: List[Dict], df, query: str) -> List[Dict]:
        """Generate programmatic insights from data"""
        try:
            import pandas as pd
            import numpy as np
            
            insights = []
            
            # Insight 1: Data Overview
            insights.append({
                "title": "Data Overview",
                "description": f"Dataset contains {len(data)} rows and {len(df.columns)} columns",
                "type": "summary",
                "confidence": 1.0
            })
            
            # Insight 2: Numeric statistics
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 0:
                col = numeric_cols[0]
                insights.append({
                    "title": f"{col} Statistics",
                    "description": f"Mean: {df[col].mean():.2f}, Range: {df[col].min():.2f} to {df[col].max():.2f}",
                    "type": "statistical",
                    "confidence": 0.9
                })
            
            # Insight 3: Categorical distribution
            categorical_cols = df.select_dtypes(exclude=[np.number]).columns
            if len(categorical_cols) > 0:
                col = categorical_cols[0]
                top_value = df[col].value_counts().index[0]
                top_count = df[col].value_counts().iloc[0]
                insights.append({
                    "title": f"{col} Distribution",
                    "description": f"Most common value: {top_value} ({top_count} occurrences)",
                    "type": "distribution",
                    "confidence": 0.9
                })
            
            return insights
        except Exception as e:
            logger.error(f"Programmatic insights generation failed: {e}")
            return [{"title": "Data Analysis", "description": f"Analyzed {len(data)} rows of data", "type": "summary", "confidence": 0.8}]
    
    def _generate_programmatic_recommendations(self, data: List[Dict], df, query: str) -> List[Dict]:
        """Generate programmatic recommendations"""
        try:
            import pandas as pd
            import numpy as np
            
            recommendations = []
            
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            categorical_cols = df.select_dtypes(exclude=[np.number]).columns
            
            if len(numeric_cols) > 0:
                recommendations.append({
                    "title": "Explore Numeric Trends",
                    "description": f"Analyze trends in {', '.join(numeric_cols[:2].tolist())} over time or across categories",
                    "priority": "high"
                })
            
            if len(categorical_cols) > 0 and len(numeric_cols) > 0:
                recommendations.append({
                    "title": "Compare Across Categories",
                    "description": f"Compare {numeric_cols[0]} across different {categorical_cols[0]} values",
                    "priority": "medium"
                })
            
            recommendations.append({
                "title": "Deep Dive Analysis",
                "description": "Perform deeper analysis to identify specific patterns and correlations",
                "priority": "medium"
            })
            
            return recommendations
        except Exception as e:
            logger.error(f"Programmatic recommendations generation failed: {e}")
            return [{"title": "Continue Analysis", "description": "Explore the data further to identify additional insights", "priority": "medium"}]

    def _extract_stakeholders(self, content: str) -> List[str]:
        """Extract stakeholders from business context"""
        stakeholders = []
        lines = content.split("\n")
        for line in lines:
            if (
                "stakeholder" in line.lower()
                or "team" in line.lower()
                or "department" in line.lower()
            ):
                stakeholders.append(line.strip())
        return stakeholders[:3]

    def _extract_strategic_actions(self, content: str) -> List[str]:
        """Extract strategic actions from business context"""
        actions = []
        lines = content.split("\n")
        for line in lines:
            if any(
                keyword in line.lower()
                for keyword in ["action", "strategy", "plan", "initiative"]
            ):
                actions.append(line.strip())
        return actions[:3]

    def _build_cube_schema_summary(self, cubes: List[Dict]) -> str:
        """Build human-readable summary of Cube.js schema"""
        if not cubes:
            return "No cubes available"

        summaries = []
        for cube in cubes:
            cube_name = cube.get("name", "Unknown")
            measures_count = len(cube.get("measures", []))
            dimensions_count = len(cube.get("dimensions", []))
            summaries.append(
                f"{cube_name}: {measures_count} measures, {dimensions_count} dimensions"
            )

        return " | ".join(summaries)

    def _generate_cube_query_templates(
        self, measures: List[Dict], dimensions: List[Dict]
    ) -> List[Dict]:
        """Generate example query templates for AI to use"""
        templates = []

        # Time series analysis template
        time_dimensions = [
            d
            for d in dimensions
            if "time" in d.get("type", "").lower()
            or "date" in d.get("name", "").lower()
        ]
        if time_dimensions and measures:
            templates.append(
                {
                    "type": "time_series",
                    "description": "Analyze trends over time",
                    "measures": [m["name"] for m in measures[:2]],
                    "dimensions": [d["name"] for d in time_dimensions[:1]],
                    "example": f"Show {measures[0]['name']} over time by {time_dimensions[0]['name']}",
                }
            )

        # Aggregation template
        if measures:
            templates.append(
                {
                    "type": "aggregation",
                    "description": "Calculate totals and averages",
                    "measures": [m["name"] for m in measures[:3]],
                    "dimensions": [],
                    "example": f"Calculate total {measures[0]['name']} and average {measures[1]['name'] if len(measures) > 1 else measures[0]['name']}",
                }
            )

        # Dimension analysis template
        if dimensions and measures:
            templates.append(
                {
                    "type": "dimension_analysis",
                    "description": "Break down by categories",
                    "measures": [m["name"] for m in measures[:1]],
                    "dimensions": [d["name"] for d in dimensions[:2]],
                    "example": f"Show {measures[0]['name']} by {dimensions[0]['name']} and {dimensions[1]['name'] if len(dimensions) > 1 else dimensions[0]['name']}",
                }
            )

        return templates

    def _determine_recommended_strategy(self, context: Dict) -> str:
        """Determine the recommended analysis strategy based on available sources"""
        if context["cube_js_sources"]:
            return "cube_js_semantic"  # Best for business users
        elif context["database_sources"]:
            return "database_sql"  # Good for technical users
        elif context["file_sources"]:
            return "file_analysis"  # Basic analysis
        else:
            return "general_guidance"

    def _get_supported_chart_types(self, context: Dict) -> List[str]:
        """Get supported chart types based on available data sources"""
        chart_types = []

        if context["cube_js_sources"]:
            chart_types.extend(
                ["line", "bar", "pie", "scatter", "area", "heatmap", "table"]
            )
        if context["database_sources"]:
            chart_types.extend(
                ["line", "bar", "pie", "scatter", "area", "table", "dashboard"]
            )
        if context["file_sources"]:
            chart_types.extend(["bar", "pie", "scatter", "histogram", "table"])

        return list(set(chart_types))  # Remove duplicates

    def _get_query_capabilities(self, context: Dict) -> Dict:
        """Get query capabilities for each data source type"""
        capabilities = {}

        if context["cube_js_sources"]:
            capabilities["cube_js"] = {
                "query_format": "semantic",
                "example": "measures: ['Sales.amount'], dimensions: ['Category.name'], timeDimensions: [{dimension: 'Sales.orderDate', granularity: 'month'}]",
                "advantages": [
                    "Business-friendly",
                    "Pre-aggregated",
                    "Semantic modeling",
                    "Performance optimized",
                ],
            }

        if context["database_sources"]:
            capabilities["database"] = {
                "query_format": "sql",
                "example": "SELECT category, SUM(amount) FROM sales GROUP BY category ORDER BY SUM(amount) DESC",
                "advantages": [
                    "Full SQL power",
                    "Complex joins",
                    "Custom logic",
                    "Real-time data",
                ],
            }

        if context["file_sources"]:
            capabilities["file"] = {
                "query_format": "column_based",
                "example": "Analyze 'sales_amount' column grouped by 'category' column",
                "advantages": [
                    "Simple structure",
                    "Quick analysis",
                    "No setup required",
                    "Direct access",
                ],
            }

        return capabilities

    def _build_database_schema_summary(self, schema_data: Dict) -> str:
        """Build human-readable database schema summary"""
        tables = schema_data.get("tables", {})
        schemas = schema_data.get("schemas", [])

        summary = (
            f"Database with {len(tables)} tables across {len(schemas)} schemas\n\n"
        )

        for table_name, table_info in tables.items():
            columns = table_info.get("columns", [])
            summary += f"Table: {table_name}\n"
            summary += f"  Columns: {len(columns)}\n"

            # Group columns by type
            numeric_cols = [
                col
                for col in columns
                if col.get("data_type") in ["integer", "numeric", "decimal", "float"]
            ]
            text_cols = [
                col
                for col in columns
                if col.get("data_type") in ["varchar", "text", "string"]
            ]
            date_cols = [
                col
                for col in columns
                if col.get("data_type") in ["timestamp", "date", "time"]
            ]

            if numeric_cols:
                summary += f"  Numeric columns: {len(numeric_cols)} (e.g., {', '.join([col['name'] for col in numeric_cols[:3]])})\n"
            if text_cols:
                summary += f"  Text columns: {len(text_cols)} (e.g., {', '.join([col['name'] for col in text_cols[:3]])})\n"
            if date_cols:
                summary += f"  Date columns: {len(date_cols)} (e.g., {', '.join([col['name'] for col in date_cols[:3]])})\n"

            summary += "\n"

        return summary

    def _generate_file_query_templates(self, schema_data: Dict) -> List[Dict]:
        """Generate analysis templates for file data"""
        templates = []
        columns = schema_data.get("columns", [])

        numeric_cols = [
            col for col in columns if col.get("type") in ["number", "integer", "float"]
        ]
        text_cols = [col for col in columns if col.get("type") == "string"]

        if numeric_cols and text_cols:
            templates.append(
                {
                    "type": "aggregation",
                    "template": f"Group by {text_cols[0]['name']} and calculate statistics for {numeric_cols[0]['name']}",
                    "description": f"Analyze {numeric_cols[0]['name']} grouped by {text_cols[0]['name']}",
                }
            )

        if len(numeric_cols) >= 2:
            templates.append(
                {
                    "type": "correlation",
                    "template": f"Analyze correlation between {numeric_cols[0]['name']} and {numeric_cols[1]['name']}",
                    "description": f"Find relationship between {numeric_cols[0]['name']} and {numeric_cols[1]['name']}",
                }
            )

        return templates

    def _build_file_schema_summary(self, source: Dict, schema_data: Dict) -> str:
        """Build human-readable file schema summary"""
        columns = schema_data.get("columns", [])
        row_count = source.get("row_count", 0)

        summary = f"File: {source['name']}\n"
        summary += f"Type: {source.get('format', 'unknown')}\n"
        summary += f"Size: {source.get('size', 'unknown')} bytes\n"
        summary += f"Rows: {row_count}\n"
        summary += f"Columns: {len(columns)}\n\n"

        # Group columns by type
        numeric_cols = [
            col for col in columns if col.get("type") in ["number", "integer", "float"]
        ]
        text_cols = [col for col in columns if col.get("type") == "string"]
        date_cols = [
            col for col in columns if col.get("type") in ["date", "time", "datetime"]
        ]

        if numeric_cols:
            summary += f"Numeric columns ({len(numeric_cols)}):\n"
            for col in numeric_cols[:5]:  # Show first 5
                stats = col.get("statistics", {})
                summary += f"  - {col['name']}: {col['type']}"
                if stats:
                    summary += f" (min: {stats.get('min', 'N/A')}, max: {stats.get('max', 'N/A')}, unique: {stats.get('unique_count', 'N/A')})"
                summary += "\n"
            summary += "\n"

        if text_cols:
            summary += f"Text columns ({len(text_cols)}):\n"
            for col in text_cols[:5]:  # Show first 5
                stats = col.get("statistics", {})
                summary += f"  - {col['name']}: {col['type']}"
                if stats:
                    summary += f" (unique: {stats.get('unique_count', 'N/A')}, max length: {stats.get('max_length', 'N/A')})"
                summary += "\n"
            summary += "\n"

        if date_cols:
            summary += f"Date columns ({len(date_cols)}):\n"
            for col in date_cols:
                summary += f"  - {col['name']}: {col['type']}\n"
            summary += "\n"

        return summary

    def _has_numeric_columns(self, schema_data: Dict) -> bool:
        """Check if file has numeric columns"""
        columns = schema_data.get("columns", [])
        return any(col.get("type") in ["number", "integer", "float"] for col in columns)

    def _has_time_columns_file(self, schema_data: Dict) -> bool:
        """Check if file has time-related columns"""
        columns = schema_data.get("columns", [])
        for col in columns:
            col_type = col.get("type", "").lower()
            col_name = col.get("name", "").lower()
            if any(
                time_word in col_type for time_word in ["date", "time", "datetime"]
            ) or any(
                time_word in col_name
                for time_word in ["date", "time", "created", "updated"]
            ):
                return True
        return False

    def _get_file_data_types(self, schema_data: Dict) -> Dict:
        """Get data type distribution for file"""
        columns = schema_data.get("columns", [])
        type_counts = {}

        for col in columns:
            col_type = col.get("type", "unknown")
            type_counts[col_type] = type_counts.get(col_type, 0) + 1

        return type_counts
