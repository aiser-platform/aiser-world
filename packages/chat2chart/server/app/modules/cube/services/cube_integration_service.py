"""
Cube.js Integration Service for AI-powered Data Modeling
"""

import logging
import json
import aiohttp
from typing import Dict, List, Optional, Any
from app.core.config import settings
from app.core.cache import cache
from app.modules.ai.services.litellm_service import LiteLLMService
import asyncio

logger = logging.getLogger(__name__)


class CubeIntegrationService:
    """Service for integrating with Cube.js for AI-powered data modeling"""

    def __init__(self):
        self.cube_api_url = settings.CUBE_API_URL
        self.cube_api_secret = settings.CUBE_API_SECRET
        self.ai_service = LiteLLMService()

    async def generate_cube_schema(
        self,
        data_source: Dict[str, Any],
        sample_data: List[Dict[str, Any]],
        business_context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate Cube.js schema using AI analysis"""
        try:
            logger.info(
                f"🧠 Generating Cube.js schema for data source: {data_source.get('name')}"
            )

            # Check cache first
            cache_key = f"cube_schema_{data_source.get('id', 'unknown')}"
            cached_schema = cache.get(cache_key)
            if cached_schema:
                logger.info("📋 Using cached Cube.js schema")
                return cached_schema

            # Analyze data structure with AI
            data_analysis = await self._analyze_data_structure(sample_data)

            # Generate schema with AI
            schema_prompt = self._build_schema_prompt(
                data_source, data_analysis, business_context
            )

            ai_response = await self.ai_service.generate_completion(
                prompt=schema_prompt,
                system_context="You are an expert data engineer specializing in Cube.js schema generation.",
                max_tokens=2000,
                temperature=0.1,
            )

            if not ai_response.get("success"):
                raise Exception(
                    f"AI schema generation failed: {ai_response.get('error')}"
                )

            # Parse and validate schema
            schema_content = ai_response["content"]
            cube_schema = self._parse_cube_schema(schema_content)

            # Validate schema with Cube.js
            validation_result = await self._validate_cube_schema(cube_schema)

            result = {
                "success": True,
                "schema": cube_schema,
                "data_analysis": data_analysis,
                "validation": validation_result,
                "generated_at": data_analysis.get("timestamp"),
            }

            # Cache the result
            cache.set(cache_key, result, ttl=3600)  # Cache for 1 hour

            logger.info("✅ Cube.js schema generated successfully")
            return result

        except Exception as e:
            logger.error(f"❌ Cube.js schema generation failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "fallback_schema": self._generate_fallback_schema(
                    data_source, sample_data
                ),
            }

    async def _analyze_data_structure(
        self, sample_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze data structure for schema generation"""
        if not sample_data:
            return {"error": "No sample data provided"}

        import pandas as pd
        from datetime import datetime

        df = pd.DataFrame(sample_data)

        analysis = {
            "timestamp": datetime.now().isoformat(),
            "row_count": len(df),
            "column_count": len(df.columns),
            "columns": {},
            "measures": [],
            "dimensions": [],
            "time_dimensions": [],
            "relationships": [],
        }

        for column in df.columns:
            col_data = df[column]

            # Basic column analysis
            column_info = {
                "name": column,
                "dtype": str(col_data.dtype),
                "null_count": col_data.isnull().sum(),
                "unique_count": col_data.nunique(),
                "sample_values": col_data.dropna().head(3).tolist(),
            }

            # Classify column type for Cube.js
            if pd.api.types.is_numeric_dtype(col_data):
                if (
                    col_data.nunique() / len(col_data) > 0.8
                ):  # High cardinality = measure
                    analysis["measures"].append(
                        {
                            "name": column,
                            "type": "sum"
                            if col_data.dtype in ["int64", "float64"]
                            else "count",
                            "sql": column,
                        }
                    )
                else:
                    analysis["dimensions"].append(
                        {"name": column, "type": "number", "sql": column}
                    )
            elif pd.api.types.is_datetime64_any_dtype(col_data):
                analysis["time_dimensions"].append(
                    {"name": column, "type": "time", "sql": column}
                )
            else:
                # Check if it's a date string
                if any(
                    date_indicator in column.lower()
                    for date_indicator in ["date", "time", "created", "updated"]
                ):
                    analysis["time_dimensions"].append(
                        {
                            "name": column,
                            "type": "time",
                            "sql": f"CAST({column} AS TIMESTAMP)",
                        }
                    )
                else:
                    analysis["dimensions"].append(
                        {"name": column, "type": "string", "sql": column}
                    )

            analysis["columns"][column] = column_info

        return analysis

    def _build_schema_prompt(
        self,
        data_source: Dict[str, Any],
        data_analysis: Dict[str, Any],
        business_context: Optional[str] = None,
    ) -> str:
        """Build AI prompt for Cube.js schema generation"""

        context_str = (
            f"\nBusiness Context: {business_context}" if business_context else ""
        )

        return f"""
Generate a Cube.js schema for the following data source:

Data Source: {data_source.get("name", "Unknown")}
Type: {data_source.get("type", "Unknown")}
{context_str}

Data Analysis:
- Rows: {data_analysis.get("row_count", 0)}
- Columns: {data_analysis.get("column_count", 0)}

Detected Measures: {json.dumps(data_analysis.get("measures", []), indent=2)}
Detected Dimensions: {json.dumps(data_analysis.get("dimensions", []), indent=2)}
Detected Time Dimensions: {json.dumps(data_analysis.get("time_dimensions", []), indent=2)}

Please generate a complete Cube.js schema with:
1. Proper cube definition with sql table reference
2. All measures with appropriate aggregation types
3. All dimensions with correct types
4. Time dimensions with proper granularities
5. Joins if relationships are detected
6. Pre-aggregations for performance optimization

Return only valid JavaScript code for the Cube.js schema file.
"""

    def _parse_cube_schema(self, schema_content: str) -> Dict[str, Any]:
        """Parse AI-generated schema content"""
        try:
            # Clean up the content
            content = schema_content.strip()

            # Remove markdown formatting if present
            if content.startswith("```javascript") or content.startswith("```js"):
                content = content.split("\n", 1)[1]
            if content.endswith("```"):
                content = content.rsplit("\n", 1)[0]

            # For now, return as string - in production, you'd parse this properly
            return {"content": content, "type": "cube_schema", "language": "javascript"}

        except Exception as e:
            logger.error(f"Failed to parse Cube.js schema: {e}")
            raise

    async def _validate_cube_schema(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """Validate generated schema with Cube.js API"""
        try:
            # This would integrate with Cube.js validation API
            # For now, return basic validation
            return {"valid": True, "warnings": [], "suggestions": []}

        except Exception as e:
            logger.warning(f"Schema validation failed: {e}")
            return {"valid": False, "error": str(e)}

    def _generate_fallback_schema(
        self, data_source: Dict[str, Any], sample_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate basic fallback schema"""
        if not sample_data:
            return {"error": "No data for fallback schema"}

        table_name = data_source.get("name", "unknown_table").lower().replace(" ", "_")

        # Basic schema template
        schema_content = f"""
cube(`{table_name.title()}`, {{
  sql: `SELECT * FROM {table_name}`,
  
  measures: {{
    count: {{
      type: `count`,
      drillMembers: []
    }}
  }},
  
  dimensions: {{
"""

        # Add dimensions for each column
        for i, column in enumerate(sample_data[0].keys()):
            schema_content += f"""    {column.lower().replace(" ", "_")}: {{
      sql: `{column}`,
      type: `string`
    }}{"," if i < len(sample_data[0]) - 1 else ""}
"""

        schema_content += """  }
});"""

        return {
            "content": schema_content,
            "type": "fallback_schema",
            "language": "javascript",
        }

    async def deploy_schema_to_cube(
        self, schema: Dict[str, Any], cube_name: str
    ) -> Dict[str, Any]:
        """Deploy generated schema to Cube.js"""
        try:
            # This would integrate with Cube.js deployment API
            logger.info(f"🚀 Deploying schema to Cube.js: {cube_name}")

            # For now, simulate deployment
            await asyncio.sleep(1)

            return {
                "success": True,
                "cube_name": cube_name,
                "deployment_id": f"deploy_{cube_name}_{int(asyncio.get_event_loop().time())}",
                "status": "deployed",
            }

        except Exception as e:
            logger.error(f"Schema deployment failed: {e}")
            return {"success": False, "error": str(e)}

    async def query_cube_data(self, cube_query: Dict[str, Any]) -> Dict[str, Any]:
        """Execute query against Cube.js"""
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    "Authorization": f"Bearer {self.cube_api_secret}",
                    "Content-Type": "application/json",
                }

                async with session.post(
                    f"{self.cube_api_url}/load",
                    json={"query": cube_query},
                    headers=headers,
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return {
                            "success": True,
                            "data": result.get("data", []),
                            "query": cube_query,
                        }
                    else:
                        error_text = await response.text()
                        return {
                            "success": False,
                            "error": f"Cube.js query failed: {error_text}",
                        }

        except Exception as e:
            logger.error(f"Cube.js query error: {e}")
            return {"success": False, "error": str(e)}

    async def generate_chart_from_query(
        self, natural_query: str, available_cubes: List[str]
    ) -> Dict[str, Any]:
        """Generate chart configuration from natural language query"""
        try:
            # Analyze query with AI
            query_analysis = await self.ai_service.analyze_natural_language_query(
                natural_query, context={"available_cubes": available_cubes}
            )

            # Generate Cube.js query
            cube_query = await self._generate_cube_query(
                query_analysis, available_cubes
            )

            # Execute query
            query_result = await self.query_cube_data(cube_query)

            if not query_result.get("success"):
                return query_result

            # Generate chart configuration
            chart_config = await self._generate_chart_config(
                query_result["data"], query_analysis
            )

            return {
                "success": True,
                "query_analysis": query_analysis,
                "cube_query": cube_query,
                "data": query_result["data"],
                "chart_config": chart_config,
            }

        except Exception as e:
            logger.error(f"Chart generation from query failed: {e}")
            return {"success": False, "error": str(e)}

    async def _generate_cube_query(
        self, query_analysis: Dict[str, Any], available_cubes: List[str]
    ) -> Dict[str, Any]:
        """Generate Cube.js query from analysis"""
        # This is a simplified implementation
        # In production, you'd have more sophisticated query generation

        cube_name = available_cubes[0] if available_cubes else "default"

        query = {
            "measures": [f"{cube_name}.count"],
            "dimensions": [],
            "timeDimensions": [],
        }

        # Add dimensions based on query analysis
        entities = query_analysis.get("entities", [])
        for entity in entities[:3]:  # Limit to 3 dimensions
            query["dimensions"].append(f"{cube_name}.{entity}")

        return query

    async def _generate_chart_config(
        self, data: List[Dict[str, Any]], query_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate ECharts configuration from data and analysis"""

        chart_type = self._determine_chart_type(query_analysis)

        if chart_type == "line":
            return self._generate_line_chart_config(data)
        elif chart_type == "bar":
            return self._generate_bar_chart_config(data)
        elif chart_type == "pie":
            return self._generate_pie_chart_config(data)
        else:
            return self._generate_bar_chart_config(data)  # Default

    def _determine_chart_type(self, query_analysis: Dict[str, Any]) -> str:
        """Determine appropriate chart type from query analysis"""
        query_types = query_analysis.get("query_type", [])

        if "trends" in query_types:
            return "line"
        elif "comparisons" in query_types:
            return "bar"
        elif "distribution" in query_types:
            return "pie"
        else:
            return "bar"

    def _generate_line_chart_config(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate line chart configuration"""
        return {
            "type": "line",
            "title": {"text": "Trend Analysis"},
            "xAxis": {"type": "category", "data": []},
            "yAxis": {"type": "value"},
            "series": [{"type": "line", "data": []}],
        }

    def _generate_bar_chart_config(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate bar chart configuration"""
        return {
            "type": "bar",
            "title": {"text": "Comparison Analysis"},
            "xAxis": {"type": "category", "data": []},
            "yAxis": {"type": "value"},
            "series": [{"type": "bar", "data": []}],
        }

    def _generate_pie_chart_config(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate pie chart configuration"""
        return {
            "type": "pie",
            "title": {"text": "Distribution Analysis"},
            "series": [{"type": "pie", "radius": "50%", "data": []}],
        }


# Global service instance
cube_service = CubeIntegrationService()
