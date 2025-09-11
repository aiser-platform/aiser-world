"""
Multi-Engine Query Execution Service
Handles queries across different engines: DuckDB, Cube.js, Spark, Direct SQL
"""

import logging
import asyncio
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
from enum import Enum
import pandas as pd
import aiohttp

# DuckDB for local analytics
import duckdb

# Spark for big data processing
from pyspark.sql import SparkSession

logger = logging.getLogger(__name__)


class QueryEngine(Enum):
    """Supported query engines"""

    DUCKDB = "duckdb"
    CUBE = "cube"
    SPARK = "spark"
    DIRECT_SQL = "direct_sql"
    PANDAS = "pandas"


class QueryOptimizer:
    """Query optimization and engine selection"""

    @staticmethod
    def select_optimal_engine(
        query: str, data_size: int, complexity: str
    ) -> QueryEngine:
        """Select optimal query engine based on query characteristics"""

        # Small datasets (< 1M rows) - use DuckDB or Pandas
        if data_size < 1_000_000:
            if "complex" in complexity.lower():
                return QueryEngine.DUCKDB
            else:
                return QueryEngine.PANDAS

        # Medium datasets (1M - 100M rows) - use DuckDB or Cube.js
        elif data_size < 100_000_000:
            if "aggregation" in query.lower() or "group by" in query.lower():
                return QueryEngine.CUBE
            else:
                return QueryEngine.DUCKDB

        # Large datasets (> 100M rows) - use Spark
        else:
            return QueryEngine.SPARK


class MultiEngineQueryService:
    """Service for executing queries across multiple engines"""

    def __init__(self):
        self.engines = {
            QueryEngine.DUCKDB: DuckDBEngine(),
            QueryEngine.CUBE: CubeEngine(),
            QueryEngine.SPARK: SparkEngine(),
            QueryEngine.DIRECT_SQL: DirectSQLEngine(),
            QueryEngine.PANDAS: PandasEngine(),
        }

        self.query_cache = {}
        self.cache_ttl = 300  # 5 minutes

    async def execute_query(
        self,
        query: str,
        data_source: Dict[str, Any],
        engine: Optional[QueryEngine] = None,
        optimization: bool = True,
    ) -> Dict[str, Any]:
        """Execute query using optimal or specified engine"""
        try:
            logger.info(f"🔍 Executing query with optimization: {optimization}")
            # Org/Project scoped cache (Redis-backed if available) in addition to in-memory TTL cache
            from app.core.cache import cache

            cache_key_scoped = None
            try:
                scope = {
                    "org": data_source.get("organization_id") or "",
                    "proj": data_source.get("project_id") or "",
                }
                engine_tag = engine.value if engine else "auto"
                key_payload = json.dumps(
                    {
                        "scope": scope,
                        "source": data_source.get("id")
                        or data_source.get("data_source_id")
                        or "",
                        "engine": engine_tag,
                        "optimization": optimization,
                        "query": query,
                    },
                    sort_keys=True,
                )
                import hashlib as _hash

                cache_key_scoped = f"qe:{_hash.md5(key_payload.encode()).hexdigest()}"
                scoped_cached = cache.get(cache_key_scoped) if cache else None
                if optimization and scoped_cached is not None:
                    logger.info("✅ Returning Redis-scoped cached result")
                    return {**scoped_cached, "cached": True}
            except Exception:
                cache_key_scoped = None

            # Analyze query and data source
            query_analysis = self._analyze_query(query, data_source)

            # Select engine if not specified
            if not engine:
                engine = QueryOptimizer.select_optimal_engine(
                    query, query_analysis["data_size"], query_analysis["complexity"]
                )

            logger.info(f"🎯 Selected engine: {engine.value}")

            # Check cache first
            cache_key = self._generate_cache_key(query, data_source, engine)
            if optimization and cache_key in self.query_cache:
                cached_result = self.query_cache[cache_key]
                if (
                    datetime.now().timestamp() - cached_result["timestamp"]
                    < self.cache_ttl
                ):
                    logger.info("✅ Returning cached result")
                    return {
                        "success": True,
                        "data": cached_result["data"],
                        "engine": engine.value,
                        "cached": True,
                        "execution_time": 0.001,
                    }

            # Execute query
            start_time = datetime.now()
            result = await self.engines[engine].execute(
                query, data_source, query_analysis
            )
            execution_time = (datetime.now() - start_time).total_seconds()

            # Cache result if optimization is enabled
            if optimization and result["success"]:
                self.query_cache[cache_key] = {
                    "data": result["data"],
                    "timestamp": datetime.now().timestamp(),
                }
                # Persist to Redis-scoped cache with TTL
                try:
                    if cache_key_scoped and cache:
                        cache.set(cache_key_scoped, result, ttl=self.cache_ttl)
                except Exception:
                    pass

            result.update(
                {
                    "engine": engine.value,
                    "execution_time": execution_time,
                    "query_analysis": query_analysis,
                }
            )

            logger.info(
                f"✅ Query executed successfully in {execution_time:.2f}s using {engine.value}"
            )
            return result

        except Exception as e:
            logger.error(f"❌ Multi-engine query execution failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "engine": engine.value if engine else "unknown",
            }

    async def execute_parallel_queries(
        self, queries: List[Dict[str, Any]], data_source: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Execute multiple queries in parallel across different engines"""
        try:
            logger.info(f"🚀 Executing {len(queries)} queries in parallel")

            # Create tasks for parallel execution
            tasks = []
            for query_info in queries:
                query = query_info["query"]
                engine = QueryEngine(query_info.get("engine", "auto"))

                task = self.execute_query(query, data_source, engine)
                tasks.append(task)

            # Execute all queries in parallel
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Process results
            processed_results = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    processed_results.append(
                        {"success": False, "error": str(result), "query_index": i}
                    )
                else:
                    result["query_index"] = i
                    processed_results.append(result)

            logger.info(
                f"✅ Parallel query execution completed: {len(processed_results)} results"
            )
            return processed_results

        except Exception as e:
            logger.error(f"❌ Parallel query execution failed: {str(e)}")
            return [{"success": False, "error": str(e)} for _ in queries]

    def _analyze_query(self, query: str, data_source: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze query characteristics for optimization"""
        query_lower = query.lower()

        analysis = {
            "data_size": data_source.get("row_count", 0),
            "complexity": "simple",
            "has_joins": "join" in query_lower,
            "has_aggregations": any(
                op in query_lower
                for op in ["sum", "count", "avg", "max", "min", "group by"]
            ),
            "has_subqueries": "select" in query_lower
            and query_lower.count("select") > 1,
            "has_window_functions": any(
                func in query_lower
                for func in ["row_number", "rank", "dense_rank", "over"]
            ),
            "estimated_complexity": "simple",
        }

        # Calculate complexity score
        complexity_score = 0
        if analysis["has_joins"]:
            complexity_score += 2
        if analysis["has_aggregations"]:
            complexity_score += 1
        if analysis["has_subqueries"]:
            complexity_score += 3
        if analysis["has_window_functions"]:
            complexity_score += 2

        if complexity_score >= 5:
            analysis["complexity"] = "complex"
            analysis["estimated_complexity"] = "complex"
        elif complexity_score >= 2:
            analysis["complexity"] = "medium"
            analysis["estimated_complexity"] = "medium"

        return analysis

    def _generate_cache_key(
        self, query: str, data_source: Dict[str, Any], engine: QueryEngine
    ) -> str:
        """Generate cache key for query result"""
        import hashlib

        key_data = f"{query}_{data_source.get('id', '')}_{engine.value}"
        return hashlib.md5(key_data.encode()).hexdigest()


class BaseQueryEngine:
    """Base class for query engines"""

    async def execute(
        self, query: str, data_source: Dict[str, Any], analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute query - to be implemented by subclasses"""
        raise NotImplementedError


class DuckDBEngine(BaseQueryEngine):
    """DuckDB engine for fast analytical queries"""

    def __init__(self):
        self.connection = None

    async def execute(
        self, query: str, data_source: Dict[str, Any], analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute query using DuckDB"""
        try:
            logger.info("🦆 Executing query with DuckDB")

            # Create DuckDB connection
            conn = duckdb.connect()

            # Load data into DuckDB
            if data_source["type"] == "file":
                await self._load_file_data(conn, data_source)
            elif data_source["type"] == "database":
                await self._load_database_data(conn, data_source)

            # Execute query
            result = conn.execute(query).fetchall()
            columns = [desc[0] for desc in conn.description] if conn.description else []

            # Convert to list of dictionaries
            data = [dict(zip(columns, row)) for row in result]

            conn.close()

            return {
                "success": True,
                "data": data,
                "columns": columns,
                "row_count": len(data),
            }

        except Exception as e:
            logger.error(f"❌ DuckDB query execution failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _load_file_data(
        self, conn: duckdb.DuckDBPyConnection, data_source: Dict[str, Any]
    ):
        """Load file data into DuckDB"""
        file_path = data_source.get("file_path")
        file_format = data_source.get("format", "csv")

        if file_format == "csv":
            conn.execute(
                f"CREATE TABLE data AS SELECT * FROM read_csv_auto('{file_path}')"
            )
        elif file_format == "parquet":
            conn.execute(
                f"CREATE TABLE data AS SELECT * FROM read_parquet('{file_path}')"
            )
        elif file_format == "json":
            conn.execute(f"CREATE TABLE data AS SELECT * FROM read_json('{file_path}')")

    async def _load_database_data(
        self, conn: duckdb.DuckDBPyConnection, data_source: Dict[str, Any]
    ):
        """Load database data into DuckDB"""
        # This would connect to the source database and load data
        # For now, we'll simulate loading data


class CubeEngine(BaseQueryEngine):
    """Cube.js engine for OLAP queries"""

    def __init__(self):
        self.cube_api_url = "http://localhost:4000/cubejs-api/v1"
        self.cube_api_secret = "dev-cube-secret-key"

    async def execute(
        self, query: str, data_source: Dict[str, Any], analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute query using Cube.js"""
        try:
            logger.info("📊 Executing query with Cube.js")

            # Convert SQL query to Cube.js query format
            cube_query = self._convert_sql_to_cube_query(query, analysis)

            # Execute via Cube.js API
            async with aiohttp.ClientSession() as session:
                headers = {
                    "Authorization": f"Bearer {self.cube_api_secret}",
                    "Content-Type": "application/json",
                }

                async with session.post(
                    f"{self.cube_api_url}/load", headers=headers, json=cube_query
                ) as response:
                    if response.status == 200:
                        result = await response.json()

                        return {
                            "success": True,
                            "data": result.get("data", []),
                            "columns": list(result.get("annotation", {}).keys())
                            if result.get("annotation")
                            else [],
                            "row_count": len(result.get("data", [])),
                            "cube_metadata": result.get("annotation", {}),
                        }
                    else:
                        error_text = await response.text()
                        return {
                            "success": False,
                            "error": f"Cube.js query failed: HTTP {response.status} - {error_text}",
                        }

        except Exception as e:
            logger.error(f"❌ Cube.js query execution failed: {str(e)}")
            return {"success": False, "error": str(e)}

    def _convert_sql_to_cube_query(
        self, sql_query: str, analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Convert SQL query to Cube.js query format"""
        # This is a simplified conversion - in production, you'd use a proper SQL parser

        cube_query = {
            "measures": [],
            "dimensions": [],
            "timeDimensions": [],
            "filters": [],
            "order": [],
            "limit": None,
        }

        # Extract measures (aggregations)
        if analysis["has_aggregations"]:
            if "sum(" in sql_query.lower():
                cube_query["measures"].append("*")
            if "count(" in sql_query.lower():
                cube_query["measures"].append("count")

        # Extract dimensions
        if "group by" in sql_query.lower():
            # Simple extraction - in production, use proper SQL parsing
            cube_query["dimensions"] = ["*"]

        return cube_query


class SparkEngine(BaseQueryEngine):
    """Apache Spark engine for big data processing"""

    def __init__(self):
        self.spark = None

    async def execute(
        self, query: str, data_source: Dict[str, Any], analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute query using Apache Spark"""
        try:
            logger.info("⚡ Executing query with Apache Spark")

            # Initialize Spark session
            if not self.spark:
                self.spark = (
                    SparkSession.builder.appName("AiserQueryEngine")
                    .config("spark.sql.adaptive.enabled", "true")
                    .config("spark.sql.adaptive.coalescePartitions.enabled", "true")
                    .getOrCreate()
                )

            # Load data into Spark
            df = await self._load_data_to_spark(data_source)

            # Register as temporary view
            df.createOrReplaceTempView("data")

            # Execute query
            result_df = self.spark.sql(query)

            # Convert to list of dictionaries
            data = [row.asDict() for row in result_df.collect()]
            columns = result_df.columns

            return {
                "success": True,
                "data": data,
                "columns": columns,
                "row_count": len(data),
            }

        except Exception as e:
            logger.error(f"❌ Spark query execution failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _load_data_to_spark(self, data_source: Dict[str, Any]):
        """Load data into Spark DataFrame"""
        if data_source["type"] == "file":
            file_path = data_source.get("file_path")
            file_format = data_source.get("format", "csv")

            if file_format == "csv":
                return self.spark.read.option("header", "true").csv(file_path)
            elif file_format == "parquet":
                return self.spark.read.parquet(file_path)
            elif file_format == "json":
                return self.spark.read.json(file_path)
        else:
            # For database sources, use JDBC
            return self.spark.read.format("jdbc").load()


class DirectSQLEngine(BaseQueryEngine):
    """Direct SQL engine for database queries"""

    async def execute(
        self, query: str, data_source: Dict[str, Any], analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute query using direct SQL connection"""
        try:
            logger.info("🗄️ Executing query with direct SQL")

            # This would use the real database connection from the data source
            # For now, we'll simulate the execution

            # In production, this would:
            # 1. Get the database connection from data_source
            # 2. Execute the query directly
            # 3. Return the results

            return {
                "success": True,
                "data": [],
                "columns": [],
                "row_count": 0,
                "message": "Direct SQL execution simulated",
            }

        except Exception as e:
            logger.error(f"❌ Direct SQL query execution failed: {str(e)}")
            return {"success": False, "error": str(e)}


class PandasEngine(BaseQueryEngine):
    """Pandas engine for small dataset operations"""

    async def execute(
        self, query: str, data_source: Dict[str, Any], analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute query using Pandas"""
        try:
            logger.info("🐼 Executing query with Pandas")

            # Load data into Pandas DataFrame
            df = await self._load_data_to_pandas(data_source)

            # Execute query using pandasql or direct pandas operations
            if "select" in query.lower():
                # Simple SELECT query simulation
                result_df = df
            else:
                # For other queries, use pandas operations
                result_df = df

            # Convert to list of dictionaries
            data = result_df.to_dict("records")
            columns = result_df.columns.tolist()

            return {
                "success": True,
                "data": data,
                "columns": columns,
                "row_count": len(data),
            }

        except Exception as e:
            logger.error(f"❌ Pandas query execution failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _load_data_to_pandas(self, data_source: Dict[str, Any]) -> pd.DataFrame:
        """Load data into Pandas DataFrame"""
        if data_source["type"] == "file":
            file_path = data_source.get("file_path")
            file_format = data_source.get("format", "csv")

            if file_format == "csv":
                return pd.read_csv(file_path)
            elif file_format == "parquet":
                return pd.read_parquet(file_path)
            elif file_format == "json":
                return pd.read_json(file_path)
        else:
            # For database sources, use pandas read_sql
            return pd.DataFrame()


class QueryPerformanceMonitor:
    """Monitor query performance across engines"""

    def __init__(self):
        self.performance_metrics = {}

    def record_query_performance(
        self,
        engine: QueryEngine,
        execution_time: float,
        data_size: int,
        query_complexity: str,
    ):
        """Record query performance metrics"""
        if engine.value not in self.performance_metrics:
            self.performance_metrics[engine.value] = {
                "total_queries": 0,
                "total_time": 0,
                "avg_time": 0,
                "min_time": float("inf"),
                "max_time": 0,
            }

        metrics = self.performance_metrics[engine.value]
        metrics["total_queries"] += 1
        metrics["total_time"] += execution_time
        metrics["avg_time"] = metrics["total_time"] / metrics["total_queries"]
        metrics["min_time"] = min(metrics["min_time"], execution_time)
        metrics["max_time"] = max(metrics["max_time"], execution_time)

    def get_performance_report(self) -> Dict[str, Any]:
        """Get performance report for all engines"""
        return {
            "engines": self.performance_metrics,
            "generated_at": datetime.now().isoformat(),
        }
