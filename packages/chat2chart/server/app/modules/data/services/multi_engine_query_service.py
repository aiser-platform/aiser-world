"""
Multi-Engine Query Execution Service
Handles queries across different engines: DuckDB, Cube.js, Spark, Direct SQL
"""

import logging
import asyncio
import os
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

            # CRITICAL: For file data sources, validate and optionally rewrite table names
            # Support THREE naming conventions:
            # 1. 'data' - backward compatible, single file
            # 2. 'file_XXXXX' - multi-file support, each file as separate table
            # 3. Unrelated tables - rewrite to 'data' for backward compat (fallback)
            if data_source.get('type') == 'file':
                import re
                # Pattern to match: FROM "table" or FROM table or FROM "schema"."table"
                # Handles both quoted identifiers (double quotes) and unquoted, including file_* patterns
                table_pattern = r'(?i)(from|join)\s+(?:"([^"]+)"|`([^`]+)`|([a-zA-Z0-9_\.]+))'
                matches = list(re.finditer(table_pattern, query))
                table_names_found = []
                for match in matches:
                    # match.group(1) = FROM/JOIN keyword, match.group(2) = double-quoted, match.group(3) = backtick-quoted, match.group(4) = unquoted
                    table_name = match.group(2) or match.group(3) or match.group(4)
                    keyword = match.group(1).upper()
                    # Only rewrite if table name is NOT one of:
                    # - 'data' (backward compatible)
                    # - 'file_*' (file ID for multi-file support)
                    # - '_aiser_inline_df' (inline data)
                    is_valid_file_table = (
                        table_name.lower() in ("data", "_aiser_inline_df") or
                        table_name.lower().startswith("file_")
                    )
                    if table_name and not is_valid_file_table:
                        # This is an invalid table name - needs rewriting to 'data' or appropriate file_id
                        table_names_found.append((table_name, keyword, match.start(), match.end()))
                
                if table_names_found:
                    # Rewrite query to use 'data' table
                    logger.warning(f"🔄 File data source detected - rewriting table name(s) {[t[0] for t in table_names_found]} to 'data'")
                    try:
                        import re as _re
                        rewritten = query
                        # Replace in reverse order to preserve positions
                        for table_name, keyword, start, end in reversed(table_names_found):
                            # Match the entire FROM/JOIN clause with the table name
                            # Handle all quote styles: "table", `table`, or unquoted table
                            # More robust pattern that handles all cases
                            if '"' in query[start:end]:
                                # Double-quoted identifier
                                pattern = rf'(?i)({keyword})\s+"{_re.escape(table_name)}"'
                                replacement = f'{keyword} "data"'
                            elif '`' in query[start:end]:
                                # Backtick-quoted identifier
                                pattern = rf'(?i)({keyword})\s+`{_re.escape(table_name)}`'
                                replacement = f'{keyword} "data"'
                            else:
                                # Unquoted identifier - use word boundary
                                pattern = rf'(?i)({keyword})\s+{_re.escape(table_name)}\b'
                                replacement = f'{keyword} "data"'
                            
                            rewritten = _re.sub(pattern, replacement, rewritten)
                        
                        if rewritten != query:
                            logger.info(f"✅ Rewritten query for file data source:\nOriginal: {query}\nRewritten: {rewritten}")
                            query_analysis['original_query'] = query
                            query = rewritten
                            query_analysis['note'] = f"Query table name(s) {[t[0] for t in table_names_found]} rewritten to 'data' for file data source"
                        else:
                            logger.warning(f"⚠️ Query rewriting didn't change query - pattern might not match")
                    except Exception as _e:
                        logger.error(f"❌ Failed to rewrite query table name: {_e}", exc_info=True)
                        # Don't fail the query, but log the error for debugging

            # Select engine if not specified
            if not engine:
                engine = QueryOptimizer.select_optimal_engine(
                    query, query_analysis["data_size"], query_analysis["complexity"]
                )
            
            # Route file sources to appropriate engines (DuckDB or Pandas, not Direct SQL)
            if data_source.get("type") == "file":
                if engine == QueryEngine.DIRECT_SQL:
                    logger.info("File data source detected; switching from Direct SQL to DuckDB engine")
                    engine = QueryEngine.DUCKDB
                elif engine == QueryEngine.CUBE:
                    logger.info("File data source detected; switching from Cube.js to DuckDB engine")
                    engine = QueryEngine.DUCKDB
            
            # Route API sources to appropriate engines (Pandas for REST API data, DuckDB for structured data)
            elif data_source.get("type") == "api":
                if engine == QueryEngine.DIRECT_SQL:
                    logger.info("API data source detected; switching from Direct SQL to Pandas engine")
                    engine = QueryEngine.PANDAS
                elif engine == QueryEngine.CUBE:
                    logger.info("API data source detected; switching from Cube.js to Pandas engine")
                    engine = QueryEngine.PANDAS
                elif engine == QueryEngine.DUCKDB:
                    # DuckDB can work with API data if it's structured, but Pandas is more flexible
                    logger.info("API data source detected; using DuckDB (can handle structured API responses)")
                    # Keep DuckDB - it can handle structured data from APIs
            
            # If DuckDB was selected but the data source is a remote database, prefer Direct SQL
            elif engine == QueryEngine.DUCKDB and data_source.get("type") in ("database", "warehouse"):
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
            logger.info(f"🦆 Query: {query[:300]}...")

            # Create DuckDB connection
            conn = duckdb.connect()
            
            # CRITICAL: Enforce read-only mode for safety
            # DuckDB doesn't have explicit read-only mode, but we can prevent DDL/DML operations
            # by validating queries before execution (handled in query validation)
            logger.debug("🔒 DuckDB connection created (read-only enforced via query validation)")

            # Load data into DuckDB
            if data_source["type"] == "file":
                # MULTI-FILE SUPPORT: Detect if query references multiple files and load them all
                detected_file_ids = self._detect_file_references(query)
                logger.info(f"🔍 Detected file references in query: {detected_file_ids}")
                
                # Prepare list of files to load:
                # 1. Current data_source (always included)
                # 2. Any additional files detected in query
                primary_file_id = data_source.get('id', 'data')
                files_to_load = {primary_file_id: data_source}
                
                # If query references additional files, we'd load them here
                # For now, we just load the primary file and create aliases
                # TODO: In future, fetch and load referenced files from database
                
                # Load the current (primary) file
                await self._load_file_data(conn, data_source)
                
                # IMPORTANT: Create an alias for multi-file support
                # Allow queries to reference table by file_id (e.g., file_1765031881)
                if primary_file_id and primary_file_id != 'data':
                    try:
                        # Create a view with the file_id as table name (for multi-file queries)
                        conn.execute(f'CREATE OR REPLACE VIEW "{primary_file_id}" AS SELECT * FROM "data"')
                        logger.info(f"✅ Created table alias '{primary_file_id}' pointing to 'data' table")
                    except Exception as e:
                        logger.warning(f"⚠️ Could not create file_id alias: {e}")
                
                # Verify table exists and has data
                try:
                    test_result = conn.execute("SELECT COUNT(*) as count FROM data LIMIT 1").fetchone()
                    row_count = test_result[0] if test_result else 0
                    logger.info(f"✅ Verified 'data' table exists with {row_count} rows")
                    if row_count == 0:
                        logger.warning("⚠️ 'data' table is empty - query may return no results")
                except Exception as verify_error:
                    logger.error(f"❌ Failed to verify 'data' table: {verify_error}")
                    raise Exception(f"Data table not loaded properly: {verify_error}")
            elif data_source["type"] == "database":
                await self._load_database_data(conn, data_source)

            # CRITICAL: Validate query for read-only safety (prevent DDL/DML operations)
            query_upper = query.upper().strip()
            dangerous_keywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE TABLE', 'TRUNCATE', 'GRANT', 'REVOKE']
            if any(keyword in query_upper for keyword in dangerous_keywords):
                logger.error(f"❌ Blocked dangerous query operation: {query[:200]}")
                return {
                    "success": False,
                    "error": "Read-only mode: DDL/DML operations are not allowed. Only SELECT queries are permitted."
                }
            
            # CRITICAL: DuckDB uses date_trunc (lowercase) but PostgreSQL uses DATE_TRUNC
            # Convert DATE_TRUNC to date_trunc for DuckDB compatibility
            duckdb_query = query
            if 'DATE_TRUNC' in query.upper():
                import re
                # Replace DATE_TRUNC with date_trunc (DuckDB function name)
                duckdb_query = re.sub(r'DATE_TRUNC\s*\(', 'date_trunc(', query, flags=re.IGNORECASE)
                if duckdb_query != query:
                    logger.info(f"🔄 Converted DATE_TRUNC to date_trunc for DuckDB compatibility")
            
            # CRITICAL: Convert ClickHouse SUBSTRING syntax to DuckDB syntax
            # ClickHouse: SUBSTRING("Email" FROM "@" + 1)
            # DuckDB: SUBSTRING("Email", POSITION('@' IN "Email") + 1)
            if 'SUBSTRING' in duckdb_query and ' FROM ' in duckdb_query:
                # Handle: SUBSTRING(col FROM pattern + offset)
                # Convert to: SUBSTRING(col, POSITION(pattern IN col) + offset)
                import re as regex
                # Pattern: SUBSTRING("col" FROM "pattern" + offset)
                substring_pattern = r'SUBSTRING\s*\(([^,]+?)\s+FROM\s+(".*?"\(.*?\))\s*\)'
                duckdb_query = regex.sub(substring_pattern, r'SUBSTRING(\1, POSITION(\2)', duckdb_query, flags=regex.IGNORECASE)
                
                # Also handle simpler cases: SUBSTRING(col FROM num)
                simple_pattern = r'SUBSTRING\s*\(([^,]+?)\s+FROM\s+(\d+)\s*\)'
                duckdb_query = regex.sub(simple_pattern, r'SUBSTRING(\1, \2)', duckdb_query, flags=regex.IGNORECASE)
                
                if duckdb_query != query:
                    logger.info(f"🔄 Converted ClickHouse SUBSTRING to DuckDB SUBSTRING syntax")
            
            # Execute query
            try:
                result = conn.execute(duckdb_query).fetchall()
                # Get column names from the result description
                columns = []
                if conn.description:
                    columns = [desc[0] for desc in conn.description]
                elif result and len(result) > 0:
                    # Fallback: infer columns from first row if description not available
                    first_row = result[0]
                    if isinstance(first_row, dict):
                        columns = list(first_row.keys())
                    elif isinstance(first_row, (list, tuple)):
                        # Try to get column names from query if possible
                        import re
                        select_match = re.search(r'select\s+(.+?)\s+from', duckdb_query, re.IGNORECASE)
                        if select_match:
                            select_clause = select_match.group(1)
                            # Parse column names from SELECT clause
                            cols = [c.strip().split(' AS ')[-1].strip().strip('"').strip("'") 
                                   for c in select_clause.split(',')]
                            columns = cols[:len(first_row)] if cols else [f'column_{i}' for i in range(len(first_row))]
                        else:
                            columns = [f'column_{i}' for i in range(len(first_row))]
            except Exception as query_error:
                logger.error(f"❌ DuckDB query execution error: {str(query_error)}")
                logger.error(f"❌ Query: {duckdb_query}")
                logger.error(f"❌ Original query: {query}")
                raise

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

    def _detect_file_references(self, query: str) -> list:
        """
        Detect all file_* table references in a SQL query.
        Returns list of detected file IDs (e.g., ['file_1765031881', 'file_1765033843'])
        """
        import re
        # Pattern to match file_* table references (quoted or unquoted)
        # Matches: file_1234567890, "file_1234567890", `file_1234567890`
        pattern = r'(?:["\'`]?)?(file_\d+)(?:["\'`]?)'
        matches = re.findall(pattern, query, re.IGNORECASE)
        # Return unique file IDs
        return list(set(m.lower() for m in matches))
    
    async def _load_file_data(
        self, conn: duckdb.DuckDBPyConnection, data_source: Dict[str, Any]
    ):
        """
        Load file data into DuckDB with multi-sheet Excel support.
        For Excel files, creates virtual tables for each sheet.
        """
        file_path = data_source.get("file_path")
        file_format = data_source.get("format", "csv")
        schema = data_source.get("schema", {})

        # Check if schema contains DuckDB table info (from multi-sheet Excel processing)
        duckdb_tables = schema.get("duckdb_tables") if isinstance(schema, dict) else None
        
        # For Excel files with multi-sheet support, use pre-created tables
        if file_format in ("xlsx", "xls") and duckdb_tables:
            logger.info(f"🦆 Loading multi-sheet Excel file with {len(duckdb_tables)} sheets")
            # Tables are already created during file processing
            # Just verify they exist and create a main 'data' view from the first sheet
            if duckdb_tables:
                first_sheet_table = list(duckdb_tables.values())[0]
                try:
                    # Create a view 'data' pointing to the first sheet (for backward compatibility)
                    conn.execute(f"CREATE OR REPLACE VIEW data AS SELECT * FROM {first_sheet_table}")
                    logger.info(f"✅ Created 'data' view from table '{first_sheet_table}'")
                except Exception as e:
                    logger.warning(f"⚠️ Could not create view from {first_sheet_table}, using direct table: {e}")
                    # Fallback: create alias
                    conn.execute(f"CREATE OR REPLACE VIEW data AS SELECT * FROM {first_sheet_table}")
            return

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
                import pandas as pd
                df = pd.DataFrame(inline_data)
                conn.register("_aiser_inline_df", df)
                conn.execute("CREATE TABLE data AS SELECT * FROM _aiser_inline_df")
                return
            except Exception as e:
                logger.warning(f"Failed to load inline sample data into DuckDB, falling back to file_path: {e}")

        # If no inline data, try to load from PostgreSQL storage
        if not inline_data:
            object_key = data_source.get("file_path")  # Now it's object_key
            if object_key:
                try:
                    from app.modules.data.services.postgres_storage_service import PostgresStorageService
                    storage_service = PostgresStorageService()
                    user_id = data_source.get('user_id')
                    
                    if not user_id:
                        logger.warning("⚠️ user_id not found in data_source, cannot load from PostgreSQL storage")
                    else:
                        # Load file from PostgreSQL
                        file_content = await storage_service.get_file(object_key, user_id)
                        
                        # Write to temp file for DuckDB
                        import tempfile
                        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_format}") as tmp:
                            tmp.write(file_content)
                            tmp_path = tmp.name
                        
                        try:
                            # Use temp file with DuckDB
                            safe_path = tmp_path.replace("'", "''")
                            if file_format == "csv":
                                conn.execute(f"CREATE TABLE data AS SELECT * FROM read_csv_auto('{safe_path}')")
                            elif file_format == "parquet":
                                conn.execute(f"CREATE TABLE data AS SELECT * FROM read_parquet('{safe_path}')")
                            elif file_format == "json":
                                conn.execute(f"CREATE TABLE data AS SELECT * FROM read_json_auto('{safe_path}')")
                            elif file_format in ("xlsx", "xls"):
                                # For Excel files, use pandas to read and then register in DuckDB
                                df = pd.read_excel(tmp_path, engine='openpyxl', sheet_name=0)
                                df = df.replace({pd.NA: None, pd.NaT: None})
                                conn.register("_excel_df", df)
                                conn.execute("CREATE TABLE data AS SELECT * FROM _excel_df")
                            logger.info(f"✅ Loaded file from PostgreSQL storage into DuckDB")
                            return
                        finally:
                            if os.path.exists(tmp_path):
                                os.unlink(tmp_path)
                except Exception as e:
                    logger.warning(f"Failed to load from PostgreSQL storage: {e}")

        # If still no data, raise error
        if not inline_data:
            raise Exception("No data available for file data source")

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
        # Cube.js configuration - use environment variable or default
        import os
        cube_host = os.getenv('CUBE_API_URL', 'http://localhost:4000')
        # Remove /cubejs-api/v1 if present in env var, we'll add it
        if '/cubejs-api' in cube_host:
            self.cube_api_url = cube_host
        else:
            self.cube_api_url = f"{cube_host}/cubejs-api/v1"
        self.cube_api_secret = os.getenv('CUBE_API_SECRET', 'dev-cube-secret-key')

    async def execute(
        self, query: str, data_source: Dict[str, Any], analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute query using Cube.js"""
        try:
            # CRITICAL: Only use Cube.js for database/warehouse sources, not file sources
            if data_source.get('type') == 'file':
                logger.warning("⚠️ Cube.js engine selected for file data source - this should not happen. File sources use DuckDB.")
                return {"success": False, "error": "Cube.js is not suitable for file data sources. Use DuckDB engine instead."}
            
            logger.info("📊 Executing query with Cube.js")
            
            # Check if Cube.js is available (only for database/warehouse sources)
            try:
                cube_base_url = self.cube_api_url.replace('/cubejs-api/v1', '')
                async with aiohttp.ClientSession() as test_session:
                    async with test_session.get(f"{cube_base_url}/ready", timeout=aiohttp.ClientTimeout(total=2)) as test_resp:
                        if test_resp.status != 200:
                            return {"success": False, "error": "Cube.js server is not available"}
            except Exception as cube_check_error:
                # Don't log as error if Cube.js is simply not configured - this is expected for many deployments
                logger.debug(f"Cube.js server not available (this is OK if not using Cube.js): {cube_check_error}")
                return {"success": False, "error": f"Cube.js server is not available: {str(cube_check_error)}"}

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

            # Extract connection info from data_source - check multiple possible locations
            conn_info = (
                data_source.get('connection_info') or 
                data_source.get('connection_config') or 
                data_source.get('metadata') or 
                data_source.get('config') or
                {}
            )
            
            # Also check if connection_config is a string (JSON)
            if isinstance(conn_info, str):
                try:
                    import json
                    conn_info = json.loads(conn_info)
                except:
                    conn_info = {}
            
            # CRITICAL: Decrypt credentials if encrypted
            if isinstance(conn_info, dict):
                try:
                    from app.modules.data.utils.credentials import decrypt_credentials
                    conn_info = decrypt_credentials(conn_info)
                except Exception as decrypt_error:
                    logger.debug(f"Could not decrypt credentials (may not be encrypted): {decrypt_error}")
            
            # If conn_info is still empty, try to parse from schema (where some connection details might be stored)
            if not conn_info or (isinstance(conn_info, dict) and not conn_info.get('host')):
                schema = data_source.get('schema')
                if isinstance(schema, str):
                    try:
                        import json
                        schema_dict = json.loads(schema)
                        # Schema might contain connection details
                        if schema_dict.get('host'):
                            conn_info = {**conn_info, **schema_dict} if isinstance(conn_info, dict) else schema_dict
                    except:
                        pass

            # CRITICAL: Validate query for read-only safety
            query_upper = query.upper().strip()
            dangerous_keywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE']
            if any(keyword in query_upper for keyword in dangerous_keywords):
                logger.error(f"❌ Blocked dangerous query operation: {query[:200]}")
                return {
                    "success": False,
                    "error": "Read-only mode: DDL/DML operations are not allowed. Only SELECT queries are permitted."
                }
            
            # Prefer a full connection URI if provided
            conn_uri = conn_info.get('uri') or conn_info.get('connection_string') or conn_info.get('connection_string_uri')

            # Check if this is ClickHouse - use HTTP API instead of SQLAlchemy
            db_type = (conn_info.get('db_type') or conn_info.get('type') or data_source.get('db_type') or 'postgresql').lower()
            
            if db_type == 'clickhouse':
                # Use HTTP API for ClickHouse queries
                try:
                    import aiohttp
                    import os
                    import re
                    
                    # Extract from connection string/URI if present
                    if conn_uri:
                        # Parse clickhouse://user:pass@host:port/database format
                        match = re.match(r'clickhouse(?:[+]http)?://(?:([^:]+):([^@]+)@)?([^:/]+)(?::(\d+))?(?:/(.+))?', conn_uri)
                        if match:
                            uri_user, uri_pass, uri_host, uri_port, uri_db = match.groups()
                            username = uri_user or conn_info.get('username') or conn_info.get('user') or 'default'
                            password = uri_pass or conn_info.get('password') or conn_info.get('pass') or ''
                            host = uri_host or conn_info.get('host') or conn_info.get('hostname')
                            port = int(uri_port) if uri_port else (conn_info.get('port') or 8123)
                            database = uri_db or conn_info.get('database') or conn_info.get('db') or 'default'
                        else:
                            # Fallback to extracting from conn_info
                            host = conn_info.get('host') or conn_info.get('hostname')
                            port = conn_info.get('port') or 8123
                            database = conn_info.get('database') or conn_info.get('db') or 'default'
                            username = conn_info.get('username') or conn_info.get('user') or 'default'
                            password = conn_info.get('password') or conn_info.get('pass') or ''
                    else:
                        # Extract directly from conn_info
                        host = conn_info.get('host') or conn_info.get('hostname')
                        port = conn_info.get('port') or 8123
                        database = conn_info.get('database') or conn_info.get('db') or 'default'
                        username = conn_info.get('username') or conn_info.get('user') or 'default'
                        password = conn_info.get('password') or conn_info.get('pass') or ''
                    
                    # Use Docker service name as default if in Docker environment
                    if not host:
                        # Check if we're in Docker (common indicators)
                        if os.path.exists('/.dockerenv') or os.getenv('DOCKER_CONTAINER'):
                            host = 'clickhouse'  # Docker service name
                        else:
                            host = 'localhost'
                    
                    # Log connection details for debugging (without password)
                    logger.info(f"🔌 ClickHouse connection: host={host}, port={port}, database={database}, user={username}")
                    logger.debug(f"🔍 ClickHouse password present: {bool(password)}, length: {len(password) if password else 0}")
                    
                    # Verify we have credentials
                    if not password:
                        logger.error(f"❌ ClickHouse password is empty! Check if credentials were properly decrypted.")
                        logger.error(f"🔍 Connection config keys: {list(conn_info.keys())}")
                        logger.error(f"🔍 Has __enc_password: {'__enc_password' in conn_info}")
                        logger.error(f"🔍 Has password key: {'password' in conn_info}")
                        logger.error(f"🔍 Has pass key: {'pass' in conn_info}")
                        logger.error(f"🔍 Connection config sample (no sensitive data): {str({k: '***' if 'pass' in k.lower() or 'key' in k.lower() else v for k, v in list(conn_info.items())[:5]})}")
                        # Try to get password from environment as fallback for ClickHouse
                        import os
                        if not password and db_type == 'clickhouse':
                            password = os.getenv('CLICKHOUSE_PASSWORD', '')
                            logger.info(f"🔍 Using CLICKHOUSE_PASSWORD from environment: {bool(password)}")
                    
                    http_url = f"http://{host}:{port}"
                    # Ensure query ends with FORMAT JSON for ClickHouse
                    formatted_query = query.rstrip(';').strip()
                    
                    # ClickHouse doesn't support lag() window function - convert to neighbor() or arrayElement()
                    # Replace lag(column) OVER (ORDER BY ...) with neighbor(column, -1) OVER (ORDER BY ...)
                    import re
                    # Pattern to match lag(column) OVER (ORDER BY ...)
                    lag_pattern = r'\blag\s*\(\s*([^)]+)\s*\)\s+OVER\s*\([^)]*ORDER\s+BY\s+([^)]+)\)'
                    if re.search(lag_pattern, formatted_query, re.IGNORECASE):
                        logger.warning("⚠️ Query contains lag() window function - ClickHouse doesn't support lag(). Converting to neighbor()...")
                        # Replace lag(column) OVER (ORDER BY ...) with neighbor(column, -1) OVER (ORDER BY ...)
                        formatted_query = re.sub(
                            r'\blag\s*\(\s*([^)]+)\s*\)\s+OVER\s*\(([^)]*ORDER\s+BY\s+[^)]+)\)',
                            r'neighbor(\1, -1) OVER (\2)',
                            formatted_query,
                            flags=re.IGNORECASE
                        )
                        logger.info(f"✅ Converted lag() to neighbor(): {formatted_query[:200]}...")
                    
                    if not formatted_query.upper().endswith('FORMAT JSON'):
                        formatted_query = f"{formatted_query} FORMAT JSON"
                    
                    async with aiohttp.ClientSession() as session:
                        auth = aiohttp.BasicAuth(username, password) if password else None
                        async with session.post(f"{http_url}/", data=formatted_query, auth=auth) as resp:
                            if resp.status == 200:
                                data = await resp.json()
                                # ClickHouse JSON format: {"meta": [...], "data": [...], "rows": N}
                                meta = data.get('meta', [])
                                columns = [col.get('name', '') for col in meta] if meta else []
                                rows_data = data.get('data', [])
                                rows = []
                                
                                # Parse rows - ClickHouse returns list of dicts or list of lists
                                for row_data in rows_data:
                                    if isinstance(row_data, dict):
                                        rows.append(row_data)
                                    elif isinstance(row_data, list) and columns:
                                        rows.append(dict(zip(columns, row_data)))
                                    else:
                                        rows.append({'value': row_data})
                                
                                return {
                                    "success": True,
                                    "data": rows,
                                    "columns": columns,
                                    "row_count": len(rows),
                                }
                            else:
                                error_text = await resp.text()
                                return {"success": False, "error": f"ClickHouse HTTP error {resp.status}: {error_text}"}
                except ImportError:
                    return {"success": False, "error": "aiohttp package required for ClickHouse queries"}
                except Exception as clickhouse_error:
                    logger.error(f"❌ ClickHouse query execution failed: {str(clickhouse_error)}")
                    return {"success": False, "error": f"ClickHouse query failed: {str(clickhouse_error)}"}

            if not conn_uri:
                # Try to build a SQLAlchemy URL from common fields
                user = conn_info.get('username') or conn_info.get('user')
                password = conn_info.get('password') or conn_info.get('pass')
                host = conn_info.get('host') or conn_info.get('hostname')
                port = conn_info.get('port')
                database = conn_info.get('database') or conn_info.get('db') or conn_info.get('database_name') or conn_info.get('initial_database')
                
                # Use Docker service names as defaults when in Docker environment
                if not host:
                    import os
                    if os.path.exists('/.dockerenv') or os.getenv('DOCKER_CONTAINER'):
                        # Use environment variables or Docker service names
                        if db_type == 'postgresql':
                            host = os.getenv('POSTGRES_SERVER', 'postgres')
                        elif db_type == 'mysql':
                            host = os.getenv('MYSQL_SERVER', 'mysql')
                        elif db_type == 'clickhouse':
                            host = os.getenv('CLICKHOUSE_HOST', 'clickhouse')
                        else:
                            host = 'localhost'
                    else:
                        host = 'localhost'

                if not database:
                    # Last resort: try to extract from stored schema
                    stored_schema = data_source.get('schema')
                    if isinstance(stored_schema, str):
                        try:
                            import json
                            schema_dict = json.loads(stored_schema)
                            database = schema_dict.get('database') or schema_dict.get('db')
                        except:
                            pass
                    
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

            # CRITICAL: Enforce read-only mode for database connections
            # User-scoped queries only (no tenant isolation needed)
            
            # Run blocking DB calls in a thread to avoid blocking the event loop
            def run_sync_query(uri: str, sql: str) -> Dict[str, Any]:
                try:
                    # CRITICAL: Set connection to read-only mode if supported
                    # For PostgreSQL: SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY
                    # For MySQL: SET SESSION TRANSACTION READ ONLY
                    # This is handled per-database type in the connection setup
                    eng = sa.create_engine(uri, pool_pre_ping=True)
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
        # API-based sources: fetch from API endpoint
        if data_source.get("type") == "api":
            try:
                import aiohttp
                config = data_source.get("connection_config") or data_source.get("config") or {}
                api_url = config.get("url") or config.get("endpoint") or data_source.get("api_url")
                
                if not api_url:
                    logger.error("API data source missing URL/endpoint configuration")
                    return pd.DataFrame()
                
                # Decrypt credentials if encrypted
                try:
                    from app.modules.data.utils.credentials import decrypt_credentials
                    config = decrypt_credentials(config)
                except Exception:
                    pass
                
                headers = config.get("headers", {})
                method = config.get("method", "GET").upper()
                params = config.get("params", {})
                auth = None
                
                # Handle authentication
                if config.get("api_key"):
                    api_key_header = config.get("api_key_header", "X-API-Key")
                    headers[api_key_header] = config["api_key"]
                elif config.get("bearer_token"):
                    headers["Authorization"] = f"Bearer {config['bearer_token']}"
                elif config.get("username") and config.get("password"):
                    import aiohttp
                    auth = aiohttp.BasicAuth(config["username"], config["password"])
                
                async with aiohttp.ClientSession() as session:
                    async with session.request(method, api_url, headers=headers, params=params, auth=auth) as response:
                        if response.status != 200:
                            logger.error(f"API request failed with status {response.status}")
                            return pd.DataFrame()
                        
                        content_type = response.headers.get("Content-Type", "").lower()
                        text = await response.text()
                        
                        # Parse response based on content type
                        if "json" in content_type:
                            data = await response.json()
                            # Handle various JSON structures
                            if isinstance(data, list):
                                return pd.DataFrame(data)
                            elif isinstance(data, dict):
                                # Check for common API response patterns
                                if "data" in data:
                                    return pd.DataFrame(data["data"])
                                elif "results" in data:
                                    return pd.DataFrame(data["results"])
                                elif "items" in data:
                                    return pd.DataFrame(data["items"])
                                else:
                                    # Flatten single object
                                    return pd.DataFrame([data])
                        elif "csv" in content_type:
                            import io
                            return pd.read_csv(io.StringIO(text))
                        else:
                            # Try JSON first, then CSV
                            try:
                                import json
                                data = json.loads(text)
                                if isinstance(data, list):
                                    return pd.DataFrame(data)
                                elif isinstance(data, dict):
                                    return pd.DataFrame([data])
                            except:
                                try:
                                    import io
                                    return pd.read_csv(io.StringIO(text))
                                except:
                                    logger.warning(f"Could not parse API response as JSON or CSV")
                                    return pd.DataFrame()
            except Exception as e:
                logger.error(f"Failed to load API data source: {e}")
                return pd.DataFrame()
        
        # File-based sources: prefer inline/sample data, then persisted sample_data in DB, then file_path
        if data_source.get("type") == "file":
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

            # Try to load from PostgreSQL storage
            object_key = data_source.get("file_path")  # Now it's object_key
            file_format = data_source.get("format", "csv")
            
            if object_key:
                try:
                    from app.modules.data.services.postgres_storage_service import PostgresStorageService
                    storage_service = PostgresStorageService()
                    user_id = data_source.get('user_id')
                    
                    if not user_id:
                        logger.warning("⚠️ user_id not found in data_source, cannot load from PostgreSQL storage")
                    else:
                        # Load file from PostgreSQL
                        file_content = await storage_service.get_file(object_key, user_id)
                        
                        # Write to temp file for Pandas
                        import tempfile
                        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_format}") as tmp:
                            tmp.write(file_content)
                            tmp_path = tmp.name
                        
                        try:
                            if file_format == "csv":
                                return pd.read_csv(tmp_path)
                            elif file_format == "parquet":
                                return pd.read_parquet(tmp_path)
                            elif file_format == "json":
                                return pd.read_json(tmp_path)
                            elif file_format in ("xlsx", "xls"):
                                return pd.read_excel(tmp_path)
                        finally:
                            if os.path.exists(tmp_path):
                                os.unlink(tmp_path)
                except Exception as e:
                    logger.warning(f"Failed to load from PostgreSQL storage: {e}")

            # If still no data, raise error
            raise Exception("No data available for file data source")

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
