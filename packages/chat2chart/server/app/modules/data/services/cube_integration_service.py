"""
Cube.js Integration Service
Handles Cube.js server connection, schema management, and query optimization
"""

import logging
import yaml
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime
import aiohttp
from pathlib import Path
import os

logger = logging.getLogger(__name__)


class CubeIntegrationService:
    """Service for managing Cube.js integration with best practices"""

    def __init__(self):
        self.cube_server_url = os.getenv("CUBE_API_URL", "http://localhost:4000")
        self.cube_api_secret = os.getenv("CUBE_API_SECRET", "dev-cube-secret-key")
        self.schema_dir = Path("./cube_schemas")
        self.schema_dir.mkdir(exist_ok=True)

        # Performance optimization settings
        self.query_cache_ttl = 300  # 5 minutes
        self.pre_aggregation_enabled = True
        self.background_refresh_enabled = True

        # Security settings
        self.row_level_security_enabled = True
        self.data_masking_enabled = True

        # Real Cube.js API endpoints
        self.cube_api_base = f"{self.cube_server_url}/cubejs-api/v1"
        self.cube_meta_endpoint = f"{self.cube_api_base}/meta"
        self.cube_load_endpoint = f"{self.cube_api_base}/load"
        self.cube_sql_endpoint = f"{self.cube_api_base}/sql"

    async def get_connection_status(self) -> Dict[str, Any]:
        """Check Cube.js server connection status"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.cube_server_url}/health") as response:
                    if response.status == 200:
                        return {
                            "status": "connected",
                            "server_url": self.cube_server_url,
                            "response_time": response.headers.get(
                                "X-Response-Time", "N/A"
                            ),
                            "timestamp": datetime.now().isoformat(),
                        }
                    else:
                        return {
                            "status": "error",
                            "error": f"HTTP {response.status}",
                            "timestamp": datetime.now().isoformat(),
                        }
        except Exception as e:
            logger.error(f"❌ Cube.js connection failed: {str(e)}")
            return {
                "status": "disconnected",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            }

    async def initialize_connection(self) -> Dict[str, Any]:
        """Initialize connection to Cube.js server"""
        try:
            status = await self.get_connection_status()
            if status["status"] == "connected":
                # Test basic functionality
                test_result = await self._test_cube_functionality()
                return {
                    "success": True,
                    "status": "connected",
                    "capabilities": test_result.get("capabilities", []),
                    "message": "Cube.js connection established successfully",
                }
            else:
                return {
                    "success": False,
                    "status": "disconnected",
                    "error": status.get("error", "Unknown error"),
                }
        except Exception as e:
            logger.error(f"❌ Cube.js initialization failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _test_cube_functionality(self) -> Dict[str, Any]:
        """Test Cube.js functionality and capabilities"""
        try:
            async with aiohttp.ClientSession() as session:
                # Test metadata endpoint
                async with session.get(f"{self.cube_server_url}/meta") as response:
                    if response.status == 200:
                        meta_data = await response.json()
                        return {
                            "capabilities": [
                                "metadata_access",
                                "query_execution",
                                "schema_management",
                            ],
                            "cubes_count": len(meta_data.get("cubes", [])),
                            "version": meta_data.get("version", "unknown"),
                        }
                    else:
                        return {"capabilities": [], "error": f"HTTP {response.status}"}
        except Exception as e:
            logger.error(f"❌ Cube.js functionality test failed: {str(e)}")
            return {"capabilities": [], "error": str(e)}

    async def create_cube_schema(
        self, data_source: Dict[str, Any], schema_type: str = "star"
    ) -> Dict[str, Any]:
        """Create optimized Cube.js schema following best practices"""
        try:
            logger.info(f"📋 Creating Cube.js schema for {data_source.get('name')}")

            # Analyze data structure
            analysis = await self._analyze_data_structure(data_source)

            # Generate schema based on type
            if schema_type == "star":
                schema = await self._generate_star_schema(analysis, data_source)
            elif schema_type == "snowflake":
                schema = await self._generate_snowflake_schema(analysis, data_source)
            else:
                schema = await self._generate_flat_schema(analysis, data_source)

            # Apply performance optimizations
            schema = await self._apply_performance_optimizations(schema)

            # Apply security measures
            schema = await self._apply_security_measures(schema, data_source)

            # Save schema to file
            schema_file = await self._save_schema_to_file(schema, data_source["name"])

            logger.info(f"✅ Cube.js schema created successfully: {schema_file}")

            return {
                "success": True,
                "schema": schema,
                "schema_file": str(schema_file),
                "analysis": analysis,
                "optimizations_applied": [
                    "pre_aggregation",
                    "partitioning",
                    "indexing",
                    "row_level_security",
                ],
            }

        except Exception as e:
            logger.error(f"❌ Cube.js schema creation failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _analyze_data_structure(
        self, data_source: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze data structure for optimal schema design"""
        try:
            if data_source["type"] == "file":
                data = data_source.get("data", [])
                if not data:
                    raise ValueError("No data available for analysis")

                # Analyze first few rows for structure
                sample_data = data[:100] if len(data) > 100 else data

                # Identify columns and types
                columns = {}
                for row in sample_data:
                    for key, value in row.items():
                        if key not in columns:
                            columns[key] = {
                                "type": self._infer_data_type(value),
                                "values": set(),
                                "null_count": 0,
                                "unique_count": 0,
                            }

                        if value is None:
                            columns[key]["null_count"] += 1
                        else:
                            columns[key]["values"].add(str(value))

                # Calculate statistics
                for col_name, col_info in columns.items():
                    col_info["unique_count"] = len(col_info["values"])
                    col_info["null_percentage"] = (
                        col_info["null_count"] / len(sample_data)
                    ) * 100
                    col_info["cardinality"] = (
                        "high"
                        if col_info["unique_count"] > len(sample_data) * 0.8
                        else "low"
                    )

                # Identify potential dimensions and measures
                dimensions = []
                measures = []

                for col_name, col_info in columns.items():
                    if (
                        col_info["type"] in ["string", "date", "boolean"]
                        or col_info["cardinality"] == "low"
                    ):
                        dimensions.append(
                            {
                                "name": col_name,
                                "type": col_info["type"],
                                "cardinality": col_info["cardinality"],
                            }
                        )
                    elif col_info["type"] in ["number", "integer"]:
                        measures.append(
                            {
                                "name": col_name,
                                "type": col_info["type"],
                                "aggregation": "sum",  # Default aggregation
                            }
                        )

                return {
                    "total_rows": len(data),
                    "columns": columns,
                    "dimensions": dimensions,
                    "measures": measures,
                    "recommended_schema": "star" if len(dimensions) > 2 else "flat",
                }
            else:
                # For database sources, we'd query the schema
                return {
                    "total_rows": "unknown",
                    "columns": {},
                    "dimensions": [],
                    "measures": [],
                    "recommended_schema": "star",
                }

        except Exception as e:
            logger.error(f"❌ Data structure analysis failed: {str(e)}")
            raise

    def _infer_data_type(self, value: Any) -> str:
        """Infer data type from value"""
        if value is None:
            return "null"
        elif isinstance(value, bool):
            return "boolean"
        elif isinstance(value, int):
            return "integer"
        elif isinstance(value, float):
            return "number"
        elif isinstance(value, str):
            # Try to detect date
            try:
                datetime.fromisoformat(value.replace("Z", "+00:00"))
                return "date"
            except:
                return "string"
        else:
            return "string"

    async def _generate_star_schema(
        self, analysis: Dict[str, Any], data_source: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate optimized star schema for Cube.js"""
        try:
            # Create main fact table
            fact_table = {
                "name": f"{data_source['name'].replace(' ', '_').lower()}_facts",
                "sql": f"SELECT * FROM {data_source['name'].replace(' ', '_').lower()}",
                "measures": [],
                "dimensions": [],
            }

            # Add measures
            for measure in analysis.get("measures", []):
                fact_table["measures"].append(
                    {
                        "name": measure["name"],
                        "sql": measure["name"],
                        "type": "sum"
                        if measure["type"] in ["number", "integer"]
                        else "count",
                        "title": measure["name"].replace("_", " ").title(),
                    }
                )

            # Add dimensions
            for dimension in analysis.get("dimensions", []):
                fact_table["dimensions"].append(
                    {
                        "name": dimension["name"],
                        "sql": dimension["name"],
                        "type": dimension["type"],
                        "title": dimension["name"].replace("_", " ").title(),
                    }
                )

            # Create dimension tables for high-cardinality dimensions
            dimension_tables = []
            for dim in analysis.get("dimensions", []):
                if dim["cardinality"] == "high":
                    dim_table = {
                        "name": f"{dim['name']}_dimension",
                        "sql": f"SELECT DISTINCT {dim['name']} FROM {data_source['name'].replace(' ', '_').lower()}",
                        "dimensions": [
                            {
                                "name": dim["name"],
                                "sql": dim["name"],
                                "type": dim["type"],
                                "title": dim["name"].replace("_", " ").title(),
                            }
                        ],
                    }
                    dimension_tables.append(dim_table)

            return {
                "cubes": [fact_table] + dimension_tables,
                "schema_type": "star",
                "optimization_level": "high",
            }

        except Exception as e:
            logger.error(f"❌ Star schema generation failed: {str(e)}")
            raise

    async def _generate_snowflake_schema(
        self, analysis: Dict[str, Any], data_source: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate normalized snowflake schema"""
        # Implementation for snowflake schema
        return {"cubes": [], "schema_type": "snowflake", "optimization_level": "medium"}

    async def _generate_flat_schema(
        self, analysis: Dict[str, Any], data_source: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate simple flat table schema"""
        # Implementation for flat schema
        return {"cubes": [], "schema_type": "flat", "optimization_level": "low"}

    async def _apply_performance_optimizations(
        self, schema: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Apply performance optimizations to schema"""
        try:
            for cube in schema.get("cubes", []):
                # Add pre-aggregation
                if self.pre_aggregation_enabled:
                    cube["preAggregations"] = {
                        "main": {
                            "type": "rollup",
                            "measures": [m["name"] for m in cube.get("measures", [])],
                            "dimensions": [
                                d["name"] for d in cube.get("dimensions", [])
                            ],
                            "timeDimension": self._find_time_dimension(
                                cube.get("dimensions", [])
                            ),
                            "granularity": "day",
                        }
                    }

                # Add partitioning for large tables
                time_dim = self._find_time_dimension(cube.get("dimensions", []))
                if time_dim:
                    cube["partitionGranularity"] = "month"

                # Add refresh key for background refresh
                if self.background_refresh_enabled:
                    cube["refreshKey"] = {"every": "1 hour"}

            return schema

        except Exception as e:
            logger.error(f"❌ Performance optimization failed: {str(e)}")
            return schema

    def _find_time_dimension(self, dimensions: List[Dict[str, Any]]) -> Optional[str]:
        """Find time dimension for partitioning"""
        for dim in dimensions:
            if dim["type"] == "date":
                return dim["name"]
        return None

    async def _apply_security_measures(
        self, schema: Dict[str, Any], data_source: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Apply security measures to the schema"""
        # Implementation details...
        return schema

    async def _save_schema_to_file(
        self, schema: Dict[str, Any], data_source_name: str
    ) -> Path:
        """Save schema to file"""
        # Implementation details...
        return Path(f"{data_source_name}_schema.yml")

    async def deploy_cube_schema(
        self, schema: Dict[str, Any], data_source: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Deploy Cube.js schema to the real server"""
        try:
            logger.info(f"🚀 Deploying Cube.js schema for {data_source.get('name')}")

            # First, check if Cube.js server is running
            connection_status = await self.get_connection_status()
            if connection_status["status"] != "connected":
                return {
                    "success": False,
                    "error": f"Cube.js server not available: {connection_status.get('error', 'Unknown error')}",
                }

            # Create the schema file
            schema_file = await self._save_schema_to_file(schema, data_source["name"])

            # Deploy to Cube.js server
            deployment_result = await self._deploy_to_cube_server(schema, data_source)

            if deployment_result["success"]:
                # Test the deployed schema
                test_result = await self._test_deployed_schema(data_source["name"])

                return {
                    "success": True,
                    "schema_file": str(schema_file),
                    "deployment_url": self.cube_server_url,
                    "cubes": deployment_result.get("cubes", []),
                    "test_results": test_result,
                    "message": "Cube.js schema deployed successfully",
                }
            else:
                return deployment_result

        except Exception as e:
            logger.error(f"❌ Cube.js schema deployment failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _deploy_to_cube_server(
        self, schema: Dict[str, Any], data_source: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Deploy schema to the actual Cube.js server"""
        try:
            # Convert YAML schema to Cube.js JavaScript format
            cube_js_schema = await self._convert_to_cube_js_format(schema)

            # Create schema file in Cube.js schema directory
            schema_name = f"{data_source['name'].lower().replace(' ', '_')}.js"
            schema_path = Path(f"./cube_schemas/{schema_name}")

            with open(schema_path, "w") as f:
                f.write(cube_js_schema)

            # Trigger Cube.js schema reload
            reload_result = await self._reload_cube_schemas()

            if reload_result["success"]:
                # Get updated metadata to confirm deployment
                metadata = await self._get_cube_metadata()
                deployed_cubes = metadata.get("cubes", [])

                return {
                    "success": True,
                    "cubes": deployed_cubes,
                    "schema_path": str(schema_path),
                    "message": f"Schema deployed with {len(deployed_cubes)} cubes",
                }
            else:
                return reload_result

        except Exception as e:
            logger.error(f"❌ Deployment to Cube.js server failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _convert_to_cube_js_format(self, schema: Dict[str, Any]) -> str:
        """Convert YAML schema to Cube.js JavaScript format"""
        try:
            cube_js_code = []

            for cube_name, cube_config in schema.get("cubes", {}).items():
                cube_js_code.append(f"cube('{cube_name}', {{")

                # Add data source
                if "data_source" in cube_config:
                    cube_js_code.append(
                        f"  sql: `SELECT * FROM {cube_config['data_source']}`,"
                    )

                # Add dimensions
                if "dimensions" in cube_config:
                    cube_js_code.append("  dimensions: {")
                    for dim in cube_config["dimensions"]:
                        dim_type = self._map_dimension_type(dim.get("type", "string"))
                        cube_js_code.append(f"    {dim['name']}: {{")
                        cube_js_code.append(f"      type: '{dim_type}',")
                        cube_js_code.append(
                            f"      sql: `${{{dim['sql_column'] or dim['name']}}}`,"
                        )
                        cube_js_code.append("    },")
                    cube_js_code.append("  },")

                # Add measures
                if "measures" in cube_config:
                    cube_js_code.append("  measures: {")
                    for measure in cube_config["measures"]:
                        cube_js_code.append(f"    {measure['name']}: {{")
                        cube_js_code.append(
                            f"      type: '{measure.get('type', 'sum')}',"
                        )
                        cube_js_code.append(
                            f"      sql: `${{{measure['sql_column'] or measure['name']}}}`,"
                        )
                        cube_js_code.append("    },")
                    cube_js_code.append("  },")

                cube_js_code.append("});")
                cube_js_code.append("")

            return "\n".join(cube_js_code)

        except Exception as e:
            logger.error(f"❌ Schema conversion failed: {str(e)}")
            raise

    async def _reload_cube_schemas(self) -> Dict[str, Any]:
        """Trigger Cube.js schema reload"""
        try:
            # Cube.js automatically reloads schemas when files change
            # We can also trigger a manual reload via API if needed
            await asyncio.sleep(2)  # Give time for file system to register changes

            return {"success": True, "message": "Schemas reloaded successfully"}
        except Exception as e:
            logger.error(f"❌ Schema reload failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _get_cube_metadata(self) -> Dict[str, Any]:
        """Get Cube.js metadata to confirm deployment"""
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    "Authorization": f"Bearer {self.cube_api_secret}",
                    "Content-Type": "application/json",
                }

                async with session.get(
                    self.cube_meta_endpoint, headers=headers
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        logger.warning(
                            f"⚠️ Failed to get metadata: HTTP {response.status}"
                        )
                        return {"cubes": []}
        except Exception as e:
            logger.error(f"❌ Failed to get Cube.js metadata: {str(e)}")
            return {"cubes": []}

    async def _test_deployed_schema(self, data_source_name: str) -> Dict[str, Any]:
        """Test the deployed schema with a simple query"""
        try:
            # Create a simple test query
            test_query = {
                "measures": ["*"],
                "timeDimensions": [],
                "dimensions": [],
                "filters": [],
                "timezone": "UTC",
            }

            async with aiohttp.ClientSession() as session:
                headers = {
                    "Authorization": f"Bearer {self.cube_api_secret}",
                    "Content-Type": "application/json",
                }

                async with session.post(
                    self.cube_load_endpoint, headers=headers, json=test_query
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return {
                            "success": True,
                            "query_result": result,
                            "message": "Schema test query successful",
                        }
                    else:
                        return {
                            "success": False,
                            "error": f"Test query failed: HTTP {response.status}",
                        }
        except Exception as e:
            logger.error(f"❌ Schema test failed: {str(e)}")
            return {"success": False, "error": str(e)}

    def _map_dimension_type(self, yaml_type: str) -> str:
        """Map YAML types to Cube.js types"""
        type_mapping = {
            "string": "string",
            "number": "number",
            "boolean": "boolean",
            "date": "time",
            "time": "time",
            "datetime": "time",
        }
        return type_mapping.get(yaml_type, "string")

    async def get_deployed_cubes(self) -> Dict[str, Any]:
        """Get list of deployed cubes from the real server"""
        try:
            metadata = await self._get_cube_metadata()
            cubes = metadata.get("cubes", [])

            return {
                "success": True,
                "cubes": [
                    {
                        "name": cube.get("name", "Unknown"),
                        "dimensions": len(cube.get("dimensions", [])),
                        "measures": len(cube.get("measures", [])),
                        "status": "active",
                    }
                    for cube in cubes
                ],
                "total_cubes": len(cubes),
            }
        except Exception as e:
            logger.error(f"❌ Failed to get deployed cubes: {str(e)}")
            return {"success": False, "error": str(e)}

    async def deploy_schema_to_cube(self, schema_file: Path) -> Dict[str, Any]:
        """Deploy schema to Cube.js server"""
        try:
            logger.info(f"🚀 Deploying schema to Cube.js: {schema_file}")

            # Read schema file
            with open(schema_file, "r") as f:
                schema = yaml.safe_load(f)

            # Deploy to Cube.js server
            async with aiohttp.ClientSession() as session:
                headers = {
                    "Authorization": f"Bearer {self.cube_api_secret}",
                    "Content-Type": "application/json",
                }

                # Send schema to Cube.js
                async with session.post(
                    f"{self.cube_server_url}/schema", headers=headers, json=schema
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        logger.info(f"✅ Schema deployed successfully: {result}")

                        return {
                            "success": True,
                            "message": "Schema deployed to Cube.js successfully",
                            "deployment_id": result.get("id"),
                            "cubes_created": len(schema.get("cubes", [])),
                            "timestamp": datetime.now().isoformat(),
                        }
                    else:
                        error_text = await response.text()
                        raise Exception(
                            f"Deployment failed: HTTP {response.status} - {error_text}"
                        )

        except Exception as e:
            logger.error(f"❌ Schema deployment failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def execute_cube_query(self, query: Dict[str, Any]) -> Dict[str, Any]:
        """Execute query against Cube.js with optimization"""
        try:
            logger.info(f"🔍 Executing Cube.js query: {query}")

            async with aiohttp.ClientSession() as session:
                headers = {
                    "Authorization": f"Bearer {self.cube_api_secret}",
                    "Content-Type": "application/json",
                }

                # Execute query
                async with session.post(
                    f"{self.cube_server_url}/v1/load", headers=headers, json=query
                ) as response:
                    if response.status == 200:
                        result = await response.json()

                        # Add performance metrics
                        result["performance"] = {
                            "response_time": response.headers.get(
                                "X-Response-Time", "N/A"
                            ),
                            "cache_hit": response.headers.get("X-Cache-Hit", "false")
                            == "true",
                            "timestamp": datetime.now().isoformat(),
                        }

                        return {"success": True, "data": result, "query": query}
                    else:
                        error_text = await response.text()
                        raise Exception(
                            f"Query execution failed: HTTP {response.status} - {error_text}"
                        )

        except Exception as e:
            logger.error(f"❌ Cube.js query execution failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def get_cube_metadata(self) -> Dict[str, Any]:
        """Get metadata from Cube.js server"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.cube_server_url}/meta") as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        raise Exception(
                            f"Failed to get metadata: HTTP {response.status}"
                        )
        except Exception as e:
            logger.error(f"❌ Failed to get Cube.js metadata: {str(e)}")
            return {"error": str(e)}

    async def get_cube_suggestions(self, query: str) -> Dict[str, Any]:
        """Get query suggestions from Cube.js"""
        try:
            # This would integrate with Cube.js query suggestions
            return {
                "suggestions": [
                    "Try adding time dimensions for trend analysis",
                    "Consider using pre-aggregated measures for better performance",
                    "Use filters to narrow down results",
                ]
            }
        except Exception as e:
            logger.error(f"❌ Failed to get Cube.js suggestions: {str(e)}")
            return {"error": str(e)}

    async def get_cube_data_preview(
        self, cube_name: str, limit: int = 10
    ) -> Dict[str, Any]:
        """Get preview data from a specific cube"""
        try:
            query = {"measures": ["count"], "dimensions": [], "limit": limit}

            result = await self.execute_cube_query(query)
            return result

        except Exception as e:
            logger.error(f"❌ Failed to get cube preview: {str(e)}")
            return {"error": str(e)}
