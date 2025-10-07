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
import sqlalchemy as sa

# DuckDB for local analytics
import duckdb
import shutil
import importlib.util

# Spark for big data processing - import lazily inside SparkEngine to avoid heavy startup at import time

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

        # Normalize inputs to avoid TypeErrors when values are None or unexpected
        try:
            ds = int(data_size) if data_size is not None else 0
        except Exception:
            ds = 0
        comp = (complexity or "").lower()

        # Small datasets (< 1M rows) - prefer DuckDB for reliable SQL support
        # DuckDB is fast and supports full SQL so use it as the default for small/medium datasets
        if ds < 1_000_000:
            return QueryEngine.DUCKDB

        # Medium datasets (1M - 100M rows) - use DuckDB or Cube.js
        elif ds < 100_000_000:
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
        # Instantiate lightweight engines eagerly; delay Spark engine until needed
        self.engines = {
            QueryEngine.DUCKDB: DuckDBEngine(),
            QueryEngine.CUBE: CubeEngine(),
            QueryEngine.DIRECT_SQL: DirectSQLEngine(),
            QueryEngine.PANDAS: PandasEngine(),
        }

        self.query_cache = {}
        self.cache_ttl = 300  # 5 minutes

    def _is_spark_available(self) -> bool:
        """Detect whether Spark (pyspark) and a Java runtime are available.

        This is a lightweight local check to avoid attempting to start Spark
        in environments where Java or pyspark are not installed.
        """
        try:
            # Check for pyspark package
            if importlib.util.find_spec("pyspark") is None:
                logger.debug("pyspark package not found")
                return False

            # Check for Java runtime or JAVA_HOME
            if shutil.which("java") is None and not ("JAVA_HOME" in __import__("os").environ):
                logger.debug("Java runtime not found and JAVA_HOME not set")
                return False

            return True
        except Exception as e:
            logger.debug(f"Spark availability check failed: {e}")
            return False

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

            # Validate data_source schema if file-based and ensure sample_data columns exist
            if data_source.get('type') == 'file':
                sample = data_source.get('sample_data') or data_source.get('data')
                if sample and isinstance(sample, list) and len(sample) > 0:
                    # Check if user referenced a table name in SQL (common mistake)
                    # If query references a table not present in inline data, warn early
                    # Simple heuristic: extract FROM <identifier>
                    import re
                    m = re.search(r"from\s+([a-zA-Z0-9_\.]+)", query.lower())
                    if m:
                        table_name = m.group(1)
                        # inline file data should be queried as 'data' table in DuckDB path
                        if table_name not in ("data", "_aiser_inline_df"):
                            logger.warning(f"Query references table '{table_name}' but inline file data uses 'data' — rewriting query to use 'data' if possible")
                            # Attempt a best-effort rewrite: replace occurrences of the referenced table with 'data'
                            try:
                                import re as _re
                                # Replace exact table occurrences (word-boundary). Keep original for audit.
                                rewritten = _re.sub(rf"\b{_re.escape(table_name)}\b", 'data', query, flags=_re.IGNORECASE)
                                if rewritten != query:
                                    logger.info(f"Rewritten query for inline file source: {rewritten}")
                                    query_analysis['original_query'] = query
                                    query = rewritten
                                query_analysis['note'] = f"Query referenced table '{table_name}' and was rewritten to 'data' for inline file sources"
                            except Exception as _e:
                                logger.debug(f"Failed to rewrite query table name: {_e}")

            # Select engine if not specified
            if not engine:
                engine = QueryOptimizer.select_optimal_engine(
                    query, query_analysis["data_size"], query_analysis["complexity"]
                )
            # If DuckDB was selected but the data source is a remote database, prefer Direct SQL
            if engine == QueryEngine.DUCKDB and data_source.get("type") == "database":
                logger.info("DuckDB selected but data source is a remote database; switching to Direct SQL engine for safety")
                engine = QueryEngine.DIRECT_SQL

            # remember selected engine value for error handling
            selected_engine_value = engine.value if engine else "unknown"
            logger.info(f"🎯 Selected engine: {selected_engine_value}")

            # Check cache first
            cache_key = self._generate_cache_key(query, data_source, engine)
            if optimization and cache_key in self.query_cache:
                cached_result = self.query_cache[cache_key]
                try:
                    ts = cached_result.get("timestamp")
                    if ts is not None and isinstance(ts, (int, float)):
                        if datetime.now().timestamp() - ts < self.cache_ttl:
                            logger.info("✅ Returning cached result")
                            return {
                                "success": True,
                                "data": cached_result.get("data"),
                                "engine": engine.value,
                                "cached": True,
                                "execution_time": 0.001,
                            }
                except Exception:
                    # Ignore cache errors and continue
                    logger.warning("Cache entry invalid or expired; ignoring cached result")

            # Ensure Spark engine is instantiated lazily to avoid import/startup costs
            if engine == QueryEngine.SPARK:
                # Check availability before instantiating
                if not self._is_spark_available():
                    msg = (
                        "Spark engine requested but Spark (pyspark/Java) is not available in this environment. "
                        "Configure Spark cluster or set JAVA_HOME and install pyspark."
                    )
                    logger.error(msg)
                    return {"success": False, "error": msg, "engine": "spark"}
                if QueryEngine.SPARK not in self.engines:
                    self.engines[QueryEngine.SPARK] = SparkEngine()

            # Execute query
            start_time = datetime.now()
            result = await self.engines[engine].execute(query, data_source, query_analysis)
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
                "engine": selected_engine_value if 'selected_engine_value' in locals() else (engine.value if engine else "unknown"),
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

        # Prefer inline/sample data when available (avoids IO errors when file_path is missing)
        inline_data = data_source.get("data") or data_source.get("sample_data")
        # If inline_data missing, try to load persisted sample_data directly from DB
        if not inline_data:
            try:
                def fetch_sample_from_db(source_id: str):
                    from app.db.session import get_sync_engine
                    import sqlalchemy as _sa
                    eng = get_sync_engine()
                    with eng.connect() as conn:
                        r = conn.execute(_sa.text("SELECT sample_data FROM data_sources WHERE id = :id LIMIT 1"), {"id": source_id})
                        row = r.fetchone()
                        if row:
                            return row[0]
                    return None

                sample = await asyncio.to_thread(fetch_sample_from_db, data_source.get('id'))
                if sample:
                    inline_data = sample
                    # attach back to data_source for downstream use
                    try:
                        data_source['sample_data'] = sample
                        data_source['data'] = sample
                    except Exception:
                        pass
            except Exception as e:
                logger.debug(f"Failed to fetch persisted sample_data for {data_source.get('id')}: {e}")
        if inline_data and isinstance(inline_data, (list, tuple)) and len(inline_data) > 0:
            try:
                # Convert inline rows to a pandas DataFrame and create DuckDB table
                df = pd.DataFrame(inline_data)
                conn.register("_aiser_inline_df", df)
                conn.execute("CREATE TABLE data AS SELECT * FROM _aiser_inline_df")
                return
            except Exception as e:
                logger.warning(f"Failed to load inline sample data into DuckDB, falling back to file_path: {e}")

        # Fallback to reading from file_path if provided
        if not file_path:
            raise Exception("No data available for file data source: missing file_path and no inline sample data")

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
        pass


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

            # Initialize Spark session; if not available, raise a clear advisory
            if not self.spark:
                try:
                    self.spark = (
                        SparkSession.builder.appName("AiserQueryEngine")
                        .config("spark.sql.adaptive.enabled", "true")
                        .config("spark.sql.adaptive.coalescePartitions.enabled", "true")
                        .getOrCreate()
                    )
                except Exception as e:
                    msg = (
                        "Spark initialization failed. Ensure a Spark cluster or gateway is available. "
                        "For enterprise, connect via Livy/Thrift/JDBC or configure Spark on Kubernetes/EMR/Databricks. "
                        f"Error: {e}"
                    )
                    logger.error(msg)
                    return {"success": False, "error": msg}

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
            logger.info("🗄️ Executing query with Direct SQL engine")

            # Extract connection info from data_source
            conn_info = data_source.get('connection_info') or data_source.get('metadata') or {}

            # Prefer a full connection URI if provided
            conn_uri = conn_info.get('uri') or conn_info.get('connection_string') or conn_info.get('connection_string_uri')

            if not conn_uri:
                # Try to build a SQLAlchemy URL from common fields
                db_type = (conn_info.get('db_type') or conn_info.get('type') or data_source.get('db_type') or 'postgresql').lower()
                user = conn_info.get('username') or conn_info.get('user')
                password = conn_info.get('password') or conn_info.get('pass')
                host = conn_info.get('host') or conn_info.get('hostname') or 'localhost'
                port = conn_info.get('port')
                database = conn_info.get('database') or conn_info.get('db')

                if not database:
                    raise Exception("Direct SQL requires a database name in connection_info. Please provide one of: 'database', 'db', or a full 'uri/connection_string' in the data source connection_info")

                driver = 'psycopg2' if db_type.startswith('postgres') else ''
                if driver:
                    scheme = f"postgresql+{driver}"
                else:
                    scheme = db_type

                auth = ''
                if user:
                    auth = user
                    if password:
                        auth += f":{password}"
                    auth += '@'

                hostpart = host
                if port:
                    hostpart = f"{host}:{port}"

                conn_uri = f"{scheme}://{auth}{hostpart}/{database}"

            # Run blocking DB calls in a thread to avoid blocking the event loop
            def run_sync_query(uri: str, sql: str) -> Dict[str, Any]:
                try:
                    eng = sa.create_engine(uri)
                    with eng.connect() as conn:
                        res = conn.execute(sa.text(sql))
                        try:
                            cols = list(res.keys())
                        except Exception:
                            cols = []
                        rows = []
                        try:
                            fetched = res.fetchall()
                            for row in fetched:
                                # support RowProxy and tuples
                                if hasattr(row, '_mapping'):
                                    rows.append(dict(row._mapping))
                                else:
                                    rows.append(dict(zip(cols, row)))
                        except Exception:
                            # no rows to fetch (e.g., DDL) - return empty
                            rows = []
                    try:
                        eng.dispose()
                    except Exception:
                        pass
                    return {"success": True, "data": rows, "columns": cols, "row_count": len(rows)}
                except Exception as e:
                    return {"success": False, "error": str(e)}

            result = await asyncio.to_thread(run_sync_query, conn_uri, query)

            if result.get('success'):
                return {
                    "success": True,
                    "data": result.get('data', []),
                    "columns": result.get('columns', []),
                    "row_count": result.get('row_count', 0),
                }
            else:
                return {"success": False, "error": result.get('error')}

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

            if df is None or (hasattr(df, 'empty') and df.empty):
                return {"success": False, "error": "No data available to run the query (empty DataFrame)"}

            # If SQL is provided, try to execute it against the DataFrame using DuckDB (safe, fast)
            q_lower = (query or "").lower()
            if "select" in q_lower:
                conn = duckdb.connect()
                try:
                    # register dataframe for SQL execution
                    conn.register("_aiser_inline_df", df)
                    try:
                        # execute user SQL; user may reference 'data' or inline table names
                        result_df = conn.execute(query).df()
                    except Exception:
                        # Attempt a best-effort rewrite: map unknown table references to the inline table
                        import re as _re
                        m = _re.search(r"from\s+([a-zA-Z0-9_\.]+)", query, _re.IGNORECASE)
                        if m:
                            tbl = m.group(1)
                            rewritten = _re.sub(rf"\b{_re.escape(tbl)}\b", "_aiser_inline_df", query, flags=_re.IGNORECASE)
                            result_df = conn.execute(rewritten).df()
                        else:
                            raise
                finally:
                    conn.close()
            else:
                # No SQL - return the loaded dataframe as-is (limited to first 1000 rows for safety)
                result_df = df.head(1000)

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
        # File-based sources: prefer inline/sample data, then persisted sample_data in DB, then file_path
        if data_source["type"] == "file":
            inline_data = data_source.get("data") or data_source.get("sample_data")

            # Inline list/dict/string handling
            if inline_data is not None:
                try:
                    # list/tuple of rows
                    if isinstance(inline_data, (list, tuple)):
                        return pd.DataFrame(inline_data)

                    # single dict representing a row or column-oriented dict
                    if isinstance(inline_data, dict):
                        return pd.DataFrame([inline_data])

                    # string (CSV content) - try parse
                    if isinstance(inline_data, str):
                        import io, json as _json
                        try:
                            return pd.read_csv(io.StringIO(inline_data))
                        except Exception:
                            try:
                                parsed = _json.loads(inline_data)
                                if isinstance(parsed, (list, dict)):
                                    return pd.DataFrame(parsed)
                            except Exception:
                                logger.warning("Inline string data could not be parsed as CSV or JSON")
                except Exception as e:
                    logger.warning(f"Failed to convert inline sample data to DataFrame: {e}")

            # Attempt to fetch persisted sample_data from database (server-side storage)
            try:
                def fetch_sample_from_db(source_id: str):
                    from app.db.session import get_sync_engine
                    import sqlalchemy as _sa
                    eng = get_sync_engine()
                    with eng.connect() as conn:
                        r = conn.execute(_sa.text("SELECT sample_data FROM data_sources WHERE id = :id LIMIT 1"), {"id": source_id})
                        row = r.fetchone()
                        if row:
                            return row[0]
                    return None

                sample = await asyncio.to_thread(fetch_sample_from_db, data_source.get('id'))
                if sample is not None:
                    try:
                        if isinstance(sample, (list, tuple)):
                            return pd.DataFrame(sample)
                        if isinstance(sample, dict):
                            return pd.DataFrame([sample])
                        if isinstance(sample, str):
                            import io, json as _json
                            try:
                                return pd.read_csv(io.StringIO(sample))
                            except Exception:
                                try:
                                    parsed = _json.loads(sample)
                                    return pd.DataFrame(parsed)
                                except Exception:
                                    logger.warning("Persisted sample_data string could not be parsed")
                    except Exception as e:
                        logger.warning(f"Failed to convert persisted sample_data to DataFrame: {e}")
            except Exception:
                logger.debug("Failed to fetch persisted sample_data; continuing to file_path fallback")

            # Fallback to file_path
            file_path = data_source.get("file_path")
            file_format = data_source.get("format", "csv")

            if not file_path:
                raise Exception("No data available for file data source: missing file_path and no inline or persisted sample data")

            try:
                if file_format == "csv":
                    return pd.read_csv(file_path)
                elif file_format == "parquet":
                    return pd.read_parquet(file_path)
                elif file_format == "json":
                    return pd.read_json(file_path)
                else:
                    # try csv by default
                    return pd.read_csv(file_path)
            except Exception as e:
                raise Exception(f"Failed to read file at {file_path}: {e}")

        # Database sources: try to use SQLAlchemy connection and load a table or run provided query
        elif data_source["type"] == "database" or data_source.get('type') == 'enterprise_connector':
            conn_info = data_source.get('connection_info') or data_source.get('metadata') or {}

            # Prefer a full connection URI
            conn_uri = conn_info.get('uri') or conn_info.get('connection_string') or conn_info.get('connection_string_uri')
            if not conn_uri:
                db_type = (conn_info.get('db_type') or conn_info.get('type') or data_source.get('db_type') or 'postgresql').lower()
                user = conn_info.get('username') or conn_info.get('user')
                password = conn_info.get('password') or conn_info.get('pass')
                host = conn_info.get('host') or conn_info.get('hostname') or 'localhost'
                port = conn_info.get('port')
                database = conn_info.get('database') or conn_info.get('db')

                if not database:
                    raise Exception("Database data source requires a 'database' in connection_info or a full connection URI")

                driver = 'psycopg2' if db_type.startswith('postgres') else ''
                scheme = f"postgresql+{driver}" if driver else db_type

                auth = ''
                if user:
                    auth = user
                    if password:
                        auth += f":{password}"
                    auth += '@'

                hostpart = host
                if port:
                    hostpart = f"{host}:{port}"

                conn_uri = f"{scheme}://{auth}{hostpart}/{database}"

            # If a default table is provided, load it, otherwise attempt to run a lightweight SELECT (expecting user to pick table)
            table = data_source.get('table') or conn_info.get('table')
            try:
                eng = sa.create_engine(conn_uri)
                if table:
                    df = pd.read_sql_table(table, eng)
                else:
                    # fallback: try to read a small sample using a generic query - user should select a table for heavier operations
                    df = pd.read_sql_query('SELECT * FROM information_schema.tables LIMIT 0', eng)
                try:
                    eng.dispose()
                except Exception:
                    pass
                return df
            except Exception as e:
                raise Exception(f"Failed to load data from database source: {e}")

        else:
            raise Exception(f"Unsupported data source type for Pandas engine: {data_source.get('type')}")


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
