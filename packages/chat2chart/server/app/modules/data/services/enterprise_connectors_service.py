"""
Enterprise Data Connectors Service
Handles enterprise-grade data source connections including warehouses, data lakes, and APIs
"""

import logging
import asyncio
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
from dataclasses import dataclass
from enum import Enum
import aiohttp
from app.modules.data.utils.credentials import decrypt_credentials, encrypt_credentials

logger = logging.getLogger(__name__)


class ConnectorType(Enum):
    """Supported enterprise connector types"""

    SNOWFLAKE = "snowflake"
    POSTGRESQL = "postgresql"
    BIGQUERY = "bigquery"
    REDSHIFT = "redshift"
    DATABRICKS = "databricks"
    S3 = "s3"
    AZURE_BLOB = "azure_blob"
    GCS = "gcs"
    REST_API = "rest_api"
    GRAPHQL_API = "graphql_api"
    KAFKA = "kafka"
    ELASTICSEARCH = "elasticsearch"
    MONGODB = "mongodb"
    CASSANDRA = "cassandra"


@dataclass
class ConnectionConfig:
    """Standardized connection configuration"""

    connector_type: ConnectorType
    name: str
    host: Optional[str] = None
    port: Optional[int] = None
    database: Optional[str] = None
    schema: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    token: Optional[str] = None
    api_key: Optional[str] = None
    connection_string: Optional[str] = None
    ssl_enabled: bool = True
    timeout: int = 30
    max_connections: int = 10
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class QueryResult:
    """Standardized query result"""

    success: bool
    data: List[Dict[str, Any]]
    columns: List[str]
    row_count: int
    execution_time: float
    query_id: Optional[str] = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class EnterpriseConnectorsService:
    """Service for managing enterprise data connectors"""

    def __init__(self):
        self.connections = {}
        self.connection_pools = {}
        self.supported_connectors = {
            ConnectorType.SNOWFLAKE: self._connect_snowflake,
            ConnectorType.POSTGRESQL: self._connect_postgresql,
            ConnectorType.BIGQUERY: self._connect_bigquery,
            ConnectorType.REDSHIFT: self._connect_redshift,
            ConnectorType.DATABRICKS: self._connect_databricks,
            ConnectorType.S3: self._connect_s3,
            ConnectorType.AZURE_BLOB: self._connect_azure_blob,
            ConnectorType.GCS: self._connect_gcs,
            ConnectorType.REST_API: self._connect_rest_api,
            ConnectorType.GRAPHQL_API: self._connect_graphql_api,
            ConnectorType.KAFKA: self._connect_kafka,
            ConnectorType.ELASTICSEARCH: self._connect_elasticsearch,
            ConnectorType.MONGODB: self._connect_mongodb,
            ConnectorType.CASSANDRA: self._connect_cassandra,
        }

        # Performance settings
        self.default_timeout = 30
        self.max_retries = 3
        self.retry_delay = 1

        # Security settings
        self.encrypt_credentials = True
        self.audit_connections = True

    def _decrypt_connection_config(self, config: ConnectionConfig) -> ConnectionConfig:
        """Return a copy of ConnectionConfig with decrypted sensitive fields when possible."""
        try:
            # Convert to dict, run decrypt, then map back
            cfg = {
                "password": config.password,
                "token": config.token,
                "api_key": config.api_key,
                "connection_string": config.connection_string,
            }
            dec = decrypt_credentials(cfg)
            # Create a shallow copy with decrypted values when present
            new = ConnectionConfig(
                connector_type=config.connector_type,
                name=config.name,
                host=config.host,
                port=config.port,
                database=config.database,
                schema=config.schema,
                username=config.username,
                password=dec.get("password") or config.password,
                token=dec.get("token") or config.token,
                api_key=dec.get("api_key") or config.api_key,
                connection_string=dec.get("connection_string") or config.connection_string,
                ssl_enabled=config.ssl_enabled,
                timeout=config.timeout,
                max_connections=config.max_connections,
                metadata=config.metadata,
            )
            return new
        except Exception:
            return config

    async def test_connection(self, config: ConnectionConfig) -> Dict[str, Any]:
        """Test connection to enterprise data source"""
        try:
            logger.info(
                f"🔌 Testing {config.connector_type.value} connection: {config.name}"
            )

            if config.connector_type not in self.supported_connectors:
                return {
                    "success": False,
                    "error": f"Unsupported connector type: {config.connector_type.value}",
                }

            # Test connection: call connector function defensively to support older signatures
            connector_func = self.supported_connectors[config.connector_type]
            try:
                result = await connector_func(config, test_only=True)
            except TypeError:
                # Fallback for legacy connector functions that accept only (config)
                result = await connector_func(config)

            if result["success"]:
                logger.info(f"✅ Connection test successful: {config.name}")
                return {
                    "success": True,
                    "message": f"Connection to {config.name} successful",
                    "connection_info": {
                        "type": config.connector_type.value,
                        "host": config.host,
                        "database": config.database,
                        "schema": config.schema,
                        "tested_at": datetime.now().isoformat(),
                    },
                }
            else:
                return result

        except Exception as e:
            logger.error(f"❌ Connection test failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def create_connection(self, config: ConnectionConfig) -> Dict[str, Any]:
        """Create and store enterprise connection"""
        try:
            logger.info(
                f"🔌 Creating {config.connector_type.value} connection: {config.name}"
            )

            # Decrypt any encrypted fields in the incoming config
            try:
                config = self._decrypt_connection_config(config)
            except Exception:
                # If decryption fails, continue with original config but log
                logger.exception("Failed to decrypt connection config; proceeding with raw values")

            # Test connection first
            test_result = await self.test_connection(config)
            if not test_result["success"]:
                return test_result

            # Create connection
            connector_func = self.supported_connectors[config.connector_type]
            # Execute connector creation with retries/backoff
            attempt = 0
            connection_result = None
            while attempt < self.max_retries:
                try:
                    connection_result = await connector_func(config)
                    # if connector returns a dict with success key, break on success
                    if isinstance(connection_result, dict) and connection_result.get("success"):
                        break
                except Exception as e:
                    logger.warning(f"Connector creation attempt {attempt+1} failed: {e}")
                attempt += 1
                await asyncio.sleep(self.retry_delay * (2 ** (attempt - 1)))

            if connection_result["success"]:
                # Store connection
                connection_id = f"{config.connector_type.value}_{config.name}_{int(datetime.now().timestamp())}"
                self.connections[connection_id] = {
                    "id": connection_id,
                    "config": config,
                    "connection": connection_result["connection"],
                    "created_at": datetime.now().isoformat(),
                    "last_used": datetime.now().isoformat(),
                    "status": "active",
                }

                # Save to database
                await self._save_connection_to_db(
                    connection_id, config, connection_result
                )

                logger.info(f"✅ Enterprise connection created: {connection_id}")
                return {
                    "success": True,
                    "connection_id": connection_id,
                    "message": f"Connection to {config.name} created successfully",
                    "connection_info": test_result["connection_info"],
                }
            else:
                return connection_result

        except Exception as e:
            logger.error(f"❌ Connection creation failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def execute_query(
        self, connection_id: str, query: str, params: Optional[Dict] = None
    ) -> QueryResult:
        """Execute query on enterprise connection"""
        try:
            logger.info(f"🔍 Executing query on connection: {connection_id}")

            if connection_id not in self.connections:
                return QueryResult(
                    success=False,
                    data=[],
                    columns=[],
                    row_count=0,
                    execution_time=0,
                    error=f"Connection {connection_id} not found",
                )

            connection = self.connections[connection_id]
            config = connection["config"]

            start_time = datetime.now()

            # Execute query based on connector type
            if config.connector_type == ConnectorType.SNOWFLAKE:
                result = await self._execute_snowflake_query(connection, query, params)
            elif config.connector_type == ConnectorType.BIGQUERY:
                result = await self._execute_bigquery_query(connection, query, params)
            elif config.connector_type == ConnectorType.REDSHIFT:
                result = await self._execute_redshift_query(connection, query, params)
            elif config.connector_type == ConnectorType.DATABRICKS:
                result = await self._execute_databricks_query(connection, query, params)
            elif config.connector_type == ConnectorType.POSTGRESQL:
                result = await self._execute_postgresql_query(connection, query, params)
            elif config.connector_type == ConnectorType.REST_API:
                result = await self._execute_rest_api_query(connection, query, params)
            else:
                result = await self._execute_generic_query(connection, query, params)

            execution_time = (datetime.now() - start_time).total_seconds()

            # Update last used timestamp
            connection["last_used"] = datetime.now().isoformat()

            return QueryResult(
                success=result["success"],
                data=result.get("data", []),
                columns=result.get("columns", []),
                row_count=result.get("row_count", 0),
                execution_time=execution_time,
                query_id=result.get("query_id"),
                error=result.get("error"),
                metadata=result.get("metadata"),
            )

        except Exception as e:
            logger.error(f"❌ Query execution failed: {str(e)}")
            return QueryResult(
                success=False,
                data=[],
                columns=[],
                row_count=0,
                execution_time=0,
                error=str(e),
            )

    async def get_schema(
        self, connection_id: str, table_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get schema information from enterprise connection"""
        try:
            logger.info(f"🔍 Getting schema for connection: {connection_id}")

            if connection_id not in self.connections:
                return {
                    "success": False,
                    "error": f"Connection {connection_id} not found",
                }

            connection = self.connections[connection_id]
            config = connection["config"]

            # Get schema based on connector type
            if config.connector_type == ConnectorType.SNOWFLAKE:
                result = await self._get_snowflake_schema(connection, table_name)
            elif config.connector_type == ConnectorType.BIGQUERY:
                result = await self._get_bigquery_schema(connection, table_name)
            elif config.connector_type == ConnectorType.REDSHIFT:
                result = await self._get_redshift_schema(connection, table_name)
            elif config.connector_type == ConnectorType.DATABRICKS:
                result = await self._get_databricks_schema(connection, table_name)
            else:
                result = await self._get_generic_schema(connection, table_name)

            return result

        except Exception as e:
            logger.error(f"❌ Schema retrieval failed: {str(e)}")
            return {"success": False, "error": str(e)}

    # Snowflake Connector
    async def _connect_snowflake(
        self, config: ConnectionConfig, test_only: bool = False
    ) -> Dict[str, Any]:
        """Connect to Snowflake data warehouse"""
        try:
            # For production, use snowflake-connector-python
            # For now, simulate connection
            connection_info = {
                "account": config.host,
                "warehouse": config.database,
                "database": config.schema,
                "schema": "PUBLIC",
                "user": config.username,
                "password": config.password,
                "role": config.metadata.get("role", "PUBLIC")
                if config.metadata
                else "PUBLIC",
            }

            if test_only:
                # Simulate connection test
                await asyncio.sleep(0.1)
                return {
                    "success": True,
                    "connection": None,
                    "message": "Snowflake connection test successful",
                }

            # In production, create actual Snowflake connection
            # import snowflake.connector
            # conn = snowflake.connector.connect(**connection_info)

            return {
                "success": True,
                "connection": connection_info,  # Store connection info
                "message": "Snowflake connection established",
            }

        except Exception as e:
            logger.error(f"❌ Snowflake connection failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _execute_snowflake_query(
        self, connection: Dict, query: str, params: Optional[Dict]
    ) -> Dict[str, Any]:
        """Execute query on Snowflake"""
        try:
            # In production, use actual Snowflake connection
            # For now, simulate query execution
            await asyncio.sleep(0.5)  # Simulate query time

            # Simulate query result
            sample_data = [
                {"id": 1, "name": "Product A", "sales": 1000.0, "date": "2024-01-01"},
                {"id": 2, "name": "Product B", "sales": 1500.0, "date": "2024-01-02"},
                {"id": 3, "name": "Product C", "sales": 800.0, "date": "2024-01-03"},
            ]

            return {
                "success": True,
                "data": sample_data,
                "columns": ["id", "name", "sales", "date"],
                "row_count": len(sample_data),
                "query_id": f"sf_{int(datetime.now().timestamp())}",
                "metadata": {
                    "warehouse": connection["config"].database,
                    "database": connection["config"].schema,
                    "execution_time": 0.5,
                },
            }

        except Exception as e:
            logger.error(f"❌ Snowflake query execution failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _get_snowflake_schema(
        self, connection: Dict, table_name: Optional[str]
    ) -> Dict[str, Any]:
        """Get Snowflake schema information"""
        try:
            # Simulate schema retrieval
            tables = [
                {
                    "name": "sales_facts",
                    "columns": [
                        {
                            "name": "id",
                            "type": "NUMBER",
                            "nullable": False,
                            "primary_key": True,
                        },
                        {"name": "product_name", "type": "VARCHAR", "nullable": False},
                        {"name": "sales_amount", "type": "DECIMAL", "nullable": False},
                        {"name": "sale_date", "type": "DATE", "nullable": False},
                    ],
                    "row_count": 1000000,
                },
                {
                    "name": "customers",
                    "columns": [
                        {
                            "name": "customer_id",
                            "type": "VARCHAR",
                            "nullable": False,
                            "primary_key": True,
                        },
                        {"name": "first_name", "type": "VARCHAR", "nullable": False},
                        {"name": "last_name", "type": "VARCHAR", "nullable": False},
                        {"name": "email", "type": "VARCHAR", "nullable": False},
                    ],
                    "row_count": 50000,
                },
            ]

            if table_name:
                tables = [t for t in tables if t["name"] == table_name]

            return {
                "success": True,
                "tables": tables,
                "total_tables": len(tables),
                "database": connection["config"].schema,
                "warehouse": connection["config"].database,
            }

        except Exception as e:
            logger.error(f"❌ Snowflake schema retrieval failed: {str(e)}")
            return {"success": False, "error": str(e)}

    # BigQuery Connector
    async def _connect_bigquery(
        self, config: ConnectionConfig, test_only: bool = False
    ) -> Dict[str, Any]:
        """Connect to Google BigQuery"""
        try:
            # For production, use google-cloud-bigquery
            # from google.cloud import bigquery

            connection_info = {
                "project_id": config.database,
                "credentials_path": config.metadata.get("credentials_path")
                if config.metadata
                else None,
                "location": config.metadata.get("location", "US")
                if config.metadata
                else "US",
            }

            if test_only:
                await asyncio.sleep(0.1)
                return {
                    "success": True,
                    "connection": None,
                    "message": "BigQuery connection test successful",
                }

            return {
                "success": True,
                "connection": connection_info,
                "message": "BigQuery connection established",
            }

        except Exception as e:
            logger.error(f"❌ BigQuery connection failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _execute_bigquery_query(
        self, connection: Dict, query: str, params: Optional[Dict]
    ) -> Dict[str, Any]:
        """Execute query on BigQuery"""
        try:
            await asyncio.sleep(0.3)  # Simulate query time

            sample_data = [
                {
                    "user_id": "user_001",
                    "event_type": "purchase",
                    "amount": 99.99,
                    "timestamp": "2024-01-01T10:00:00Z",
                },
                {
                    "user_id": "user_002",
                    "event_type": "view",
                    "amount": 0.0,
                    "timestamp": "2024-01-01T11:00:00Z",
                },
                {
                    "user_id": "user_003",
                    "event_type": "purchase",
                    "amount": 149.99,
                    "timestamp": "2024-01-01T12:00:00Z",
                },
            ]

            return {
                "success": True,
                "data": sample_data,
                "columns": ["user_id", "event_type", "amount", "timestamp"],
                "row_count": len(sample_data),
                "query_id": f"bq_{int(datetime.now().timestamp())}",
                "metadata": {
                    "project_id": connection["config"].database,
                    "location": connection["config"].metadata.get("location", "US")
                    if connection["config"].metadata
                    else "US",
                    "execution_time": 0.3,
                },
            }

        except Exception as e:
            logger.error(f"❌ BigQuery query execution failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _get_bigquery_schema(
        self, connection: Dict, table_name: Optional[str]
    ) -> Dict[str, Any]:
        """Get BigQuery schema information"""
        try:
            tables = [
                {
                    "name": "analytics.events",
                    "columns": [
                        {"name": "user_id", "type": "STRING", "nullable": False},
                        {"name": "event_type", "type": "STRING", "nullable": False},
                        {"name": "amount", "type": "FLOAT", "nullable": True},
                        {"name": "timestamp", "type": "TIMESTAMP", "nullable": False},
                    ],
                    "row_count": 5000000,
                },
                {
                    "name": "analytics.users",
                    "columns": [
                        {"name": "user_id", "type": "STRING", "nullable": False},
                        {"name": "email", "type": "STRING", "nullable": False},
                        {"name": "created_at", "type": "TIMESTAMP", "nullable": False},
                        {"name": "country", "type": "STRING", "nullable": True},
                    ],
                    "row_count": 100000,
                },
            ]

            if table_name:
                tables = [t for t in tables if t["name"] == table_name]

            return {
                "success": True,
                "tables": tables,
                "total_tables": len(tables),
                "project_id": connection["config"].database,
            }

        except Exception as e:
            logger.error(f"❌ BigQuery schema retrieval failed: {str(e)}")
            return {"success": False, "error": str(e)}

    # Redshift Connector
    async def _connect_redshift(
        self, config: ConnectionConfig, test_only: bool = False
    ) -> Dict[str, Any]:
        """Connect to Amazon Redshift"""
        try:
            connection_info = {
                "host": config.host,
                "port": config.port or 5439,
                "database": config.database,
                "user": config.username,
                "password": config.password,
                "sslmode": "require" if config.ssl_enabled else "disable",
            }

            if test_only:
                await asyncio.sleep(0.1)
                return {
                    "success": True,
                    "connection": None,
                    "message": "Redshift connection test successful",
                }

            return {
                "success": True,
                "connection": connection_info,
                "message": "Redshift connection established",
            }

        except Exception as e:
            logger.error(f"❌ Redshift connection failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _execute_redshift_query(
        self, connection: Dict, query: str, params: Optional[Dict]
    ) -> Dict[str, Any]:
        """Execute query on Redshift"""
        try:
            await asyncio.sleep(0.4)  # Simulate query time

            sample_data = [
                {
                    "order_id": "ORD001",
                    "customer_id": "CUST001",
                    "total": 299.99,
                    "order_date": "2024-01-01",
                },
                {
                    "order_id": "ORD002",
                    "customer_id": "CUST002",
                    "total": 149.99,
                    "order_date": "2024-01-02",
                },
                {
                    "order_id": "ORD003",
                    "customer_id": "CUST001",
                    "total": 79.99,
                    "order_date": "2024-01-03",
                },
            ]

            return {
                "success": True,
                "data": sample_data,
                "columns": ["order_id", "customer_id", "total", "order_date"],
                "row_count": len(sample_data),
                "query_id": f"rs_{int(datetime.now().timestamp())}",
                "metadata": {
                    "cluster": connection["config"].host,
                    "database": connection["config"].database,
                    "execution_time": 0.4,
                },
            }

        except Exception as e:
            logger.error(f"❌ Redshift query execution failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _execute_postgresql_query(self, connection: Dict, query: str, params: Optional[Dict]) -> Dict[str, Any]:
        """Execute a real query against PostgreSQL using psycopg2 in a thread."""
        try:
            cfg = connection.get('config')

            def run():
                import psycopg2
                import psycopg2.extras

                conn = psycopg2.connect(
                    host=cfg.host,
                    port=cfg.port or 5432,
                    dbname=cfg.database,
                    user=cfg.username,
                    password=cfg.password,
                    connect_timeout=10,
                )
                cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
                cur.execute(query)
                rows = cur.fetchall()
                cols = list(rows[0].keys()) if rows else []
                cur.close()
                conn.close()
                return {"success": True, "data": rows, "columns": cols, "row_count": len(rows)}

            res = await asyncio.to_thread(run)
            return res
        except Exception as e:
            logger.error(f"❌ Postgres query execution failed: {e}")
            return {"success": False, "error": str(e)}

    async def _get_redshift_schema(
        self, connection: Dict, table_name: Optional[str]
    ) -> Dict[str, Any]:
        """Get Redshift schema information"""
        try:
            tables = [
                {
                    "name": "orders",
                    "columns": [
                        {
                            "name": "order_id",
                            "type": "VARCHAR",
                            "nullable": False,
                            "primary_key": True,
                        },
                        {"name": "customer_id", "type": "VARCHAR", "nullable": False},
                        {"name": "total", "type": "DECIMAL", "nullable": False},
                        {"name": "order_date", "type": "DATE", "nullable": False},
                    ],
                    "row_count": 250000,
                }
            ]

            if table_name:
                tables = [t for t in tables if t["name"] == table_name]

            return {
                "success": True,
                "tables": tables,
                "total_tables": len(tables),
                "cluster": connection["config"].host,
                "database": connection["config"].database,
            }

        except Exception as e:
            logger.error(f"❌ Redshift schema retrieval failed: {str(e)}")
            return {"success": False, "error": str(e)}

    # Databricks Connector
    async def _connect_databricks(
        self, config: ConnectionConfig, test_only: bool = False
    ) -> Dict[str, Any]:
        """Connect to Databricks"""
        try:
            connection_info = {
                "server_hostname": config.host,
                "http_path": config.metadata.get("http_path")
                if config.metadata
                else None,
                "access_token": config.token,
                "catalog": config.metadata.get("catalog")
                if config.metadata
                else "hive_metastore",
                "schema": config.schema or "default",
            }

            if test_only:
                await asyncio.sleep(0.1)
                return {
                    "success": True,
                    "connection": None,
                    "message": "Databricks connection test successful",
                }

            return {
                "success": True,
                "connection": connection_info,
                "message": "Databricks connection established",
            }

        except Exception as e:
            logger.error(f"❌ Databricks connection failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _execute_databricks_query(
        self, connection: Dict, query: str, params: Optional[Dict]
    ) -> Dict[str, Any]:
        """Execute query on Databricks"""
        try:
            await asyncio.sleep(0.6)  # Simulate query time

            sample_data = [
                {
                    "product_id": "P001",
                    "category": "Electronics",
                    "price": 999.99,
                    "in_stock": True,
                },
                {
                    "product_id": "P002",
                    "category": "Clothing",
                    "price": 49.99,
                    "in_stock": False,
                },
                {
                    "product_id": "P003",
                    "category": "Books",
                    "price": 19.99,
                    "in_stock": True,
                },
            ]

            return {
                "success": True,
                "data": sample_data,
                "columns": ["product_id", "category", "price", "in_stock"],
                "row_count": len(sample_data),
                "query_id": f"db_{int(datetime.now().timestamp())}",
                "metadata": {
                    "workspace": connection["config"].host,
                    "catalog": connection["config"].metadata.get(
                        "catalog", "hive_metastore"
                    )
                    if connection["config"].metadata
                    else "hive_metastore",
                    "schema": connection["config"].schema,
                    "execution_time": 0.6,
                },
            }

        except Exception as e:
            logger.error(f"❌ Databricks query execution failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _get_databricks_schema(
        self, connection: Dict, table_name: Optional[str]
    ) -> Dict[str, Any]:
        """Get Databricks schema information"""
        try:
            tables = [
                {
                    "name": "products",
                    "columns": [
                        {"name": "product_id", "type": "STRING", "nullable": False},
                        {"name": "category", "type": "STRING", "nullable": False},
                        {"name": "price", "type": "DOUBLE", "nullable": False},
                        {"name": "in_stock", "type": "BOOLEAN", "nullable": False},
                    ],
                    "row_count": 10000,
                }
            ]

            if table_name:
                tables = [t for t in tables if t["name"] == table_name]

            return {
                "success": True,
                "tables": tables,
                "total_tables": len(tables),
                "workspace": connection["config"].host,
                "catalog": connection["config"].metadata.get(
                    "catalog", "hive_metastore"
                )
                if connection["config"].metadata
                else "hive_metastore",
                "schema": connection["config"].schema,
            }

        except Exception as e:
            logger.error(f"❌ Databricks schema retrieval failed: {str(e)}")
            return {"success": False, "error": str(e)}

    # REST API Connector
    async def _connect_rest_api(
        self, config: ConnectionConfig, test_only: bool = False
    ) -> Dict[str, Any]:
        """Connect to REST API"""
        try:
            connection_info = {
                "base_url": config.host,
                "api_key": config.api_key,
                "token": config.token,
                "headers": {
                    "Content-Type": "application/json",
                    "User-Agent": "Aiser-Data-Connector/1.0",
                },
            }

            if config.api_key:
                connection_info["headers"]["Authorization"] = f"Bearer {config.api_key}"
            elif config.token:
                connection_info["headers"]["Authorization"] = f"Bearer {config.token}"

            if test_only:
                # Test API endpoint
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        f"{config.host}/health",
                        headers=connection_info["headers"],
                        timeout=aiohttp.ClientTimeout(total=config.timeout),
                    ) as response:
                        if response.status in [200, 201]:
                            return {
                                "success": True,
                                "connection": None,
                                "message": "REST API connection test successful",
                            }
                        else:
                            return {
                                "success": False,
                                "error": f"API test failed: HTTP {response.status}",
                            }

            return {
                "success": True,
                "connection": connection_info,
                "message": "REST API connection established",
            }

        except Exception as e:
            logger.error(f"❌ REST API connection failed: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _execute_rest_api_query(
        self, connection: Dict, query: str, params: Optional[Dict]
    ) -> Dict[str, Any]:
        """Execute query on REST API"""
        try:
            # Parse query as API endpoint and parameters
            query_parts = query.split(" ", 1)
            endpoint = query_parts[0] if query_parts else "/data"
            query_params = query_parts[1] if len(query_parts) > 1 else ""

            # Convert query parameters to API parameters
            api_params = {}
            if query_params:
                # Simple parameter parsing
                for param in query_params.split("&"):
                    if "=" in param:
                        key, value = param.split("=", 1)
                        api_params[key] = value

            # Merge with provided params
            if params:
                api_params.update(params)

            connection_info = connection["connection"]

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{connection_info['base_url']}{endpoint}",
                    headers=connection_info["headers"],
                    params=api_params,
                    timeout=aiohttp.ClientTimeout(total=connection["config"].timeout),
                ) as response:
                    if response.status == 200:
                        data = await response.json()

                        # Convert API response to standardized format
                        if isinstance(data, list):
                            result_data = data
                        elif isinstance(data, dict) and "data" in data:
                            result_data = data["data"]
                        else:
                            result_data = [data]

                        # Extract columns from first row
                        columns = list(result_data[0].keys()) if result_data else []

                        return {
                            "success": True,
                            "data": result_data,
                            "columns": columns,
                            "row_count": len(result_data),
                            "query_id": f"api_{int(datetime.now().timestamp())}",
                            "metadata": {
                                "endpoint": endpoint,
                                "status_code": response.status,
                                "response_headers": dict(response.headers),
                            },
                        }
                    else:
                        error_text = await response.text()
                        return {
                            "success": False,
                            "error": f"API request failed: HTTP {response.status} - {error_text}",
                        }

        except Exception as e:
            logger.error(f"❌ REST API query execution failed: {str(e)}")
            return {"success": False, "error": str(e)}

    # Placeholder methods for other connectors
    async def _connect_s3(
        self, config: ConnectionConfig, test_only: bool = False
    ) -> Dict[str, Any]:
        """Connect to Amazon S3"""
        return {"success": False, "error": "S3 connector not implemented yet"}

    async def _connect_azure_blob(
        self, config: ConnectionConfig, test_only: bool = False
    ) -> Dict[str, Any]:
        """Connect to Azure Blob Storage"""
        return {"success": False, "error": "Azure Blob connector not implemented yet"}

    async def _connect_gcs(
        self, config: ConnectionConfig, test_only: bool = False
    ) -> Dict[str, Any]:
        """Connect to Google Cloud Storage"""
        return {"success": False, "error": "GCS connector not implemented yet"}

    async def _connect_graphql_api(
        self, config: ConnectionConfig, test_only: bool = False
    ) -> Dict[str, Any]:
        """Connect to GraphQL API"""
        return {"success": False, "error": "GraphQL connector not implemented yet"}

    async def _connect_kafka(
        self, config: ConnectionConfig, test_only: bool = False
    ) -> Dict[str, Any]:
        """Connect to Apache Kafka"""
        return {"success": False, "error": "Kafka connector not implemented yet"}

    async def _connect_elasticsearch(
        self, config: ConnectionConfig, test_only: bool = False
    ) -> Dict[str, Any]:
        """Connect to Elasticsearch"""
        return {
            "success": False,
            "error": "Elasticsearch connector not implemented yet",
        }

    async def _connect_mongodb(
        self, config: ConnectionConfig, test_only: bool = False
    ) -> Dict[str, Any]:
        """Connect to MongoDB"""
        return {"success": False, "error": "MongoDB connector not implemented yet"}

    async def _connect_cassandra(
        self, config: ConnectionConfig, test_only: bool = False
    ) -> Dict[str, Any]:
        """Connect to Apache Cassandra"""
        return {"success": False, "error": "Cassandra connector not implemented yet"}

    # Generic methods
    async def _execute_generic_query(
        self, connection: Dict, query: str, params: Optional[Dict]
    ) -> Dict[str, Any]:
        """Execute generic query"""
        return {
            "success": False,
            "error": f"Generic query execution not supported for {connection['config'].connector_type.value}",
        }

    async def _get_generic_schema(
        self, connection: Dict, table_name: Optional[str]
    ) -> Dict[str, Any]:
        """Get generic schema"""
        return {
            "success": False,
            "error": f"Generic schema retrieval not supported for {connection['config'].connector_type.value}",
        }

    async def _save_connection_to_db(
        self, connection_id: str, config: ConnectionConfig, connection_result: Dict
    ) -> None:
        """Save connection to database"""
        try:
            from app.modules.data.models import DataSource
            from app.db.session import async_session

            async with async_session() as db:
                # Create data source record
                # Encrypt stored connection_config for at-rest safety
                try:
                    stored_cfg = {
                        "connector_type": config.connector_type.value,
                        "host": config.host,
                        "port": config.port,
                        "database": config.database,
                        "schema": config.schema,
                        "ssl_enabled": config.ssl_enabled,
                        "timeout": config.timeout,
                    }
                    stored_cfg_enc = encrypt_credentials(stored_cfg)
                except Exception:
                    stored_cfg_enc = {
                        "connector_type": config.connector_type.value,
                        "host": config.host,
                        "port": config.port,
                        "database": config.database,
                        "schema": config.schema,
                        "ssl_enabled": config.ssl_enabled,
                        "timeout": config.timeout,
                    }

                data_source = DataSource(
                    id=connection_id,
                    name=config.name,
                    type="enterprise_connector",
                    format=config.connector_type.value,
                    db_type=config.connector_type.value,
                    connection_config=json.dumps(stored_cfg_enc),
                    metadata=json.dumps(
                        {
                            "connection_type": "enterprise",
                            "created_at": datetime.now().isoformat(),
                            "status": "active",
                        }
                    ),
                    is_active=True,
                    created_at=datetime.now(),
                    updated_at=datetime.now(),
                )

                db.add(data_source)
                await db.commit()

                logger.info(
                    f"✅ Enterprise connection saved to database: {connection_id}"
                )

        except Exception as e:
            logger.error(f"❌ Failed to save connection to database: {str(e)}")

    async def _connect_postgresql(
        self, config: ConnectionConfig, test_only: bool = False
    ) -> Dict[str, Any]:
        """Simple PostgreSQL connector test using psycopg2 via thread to avoid blocking.

        Accepts `test_only` flag to match other connector signatures.
        """
        try:
            import psycopg2
            import psycopg2.extras

            def _test():
                conn = psycopg2.connect(
                    host=config.host,
                    port=config.port or 5432,
                    dbname=config.database,
                    user=config.username,
                    password=config.password,
                    connect_timeout=5,
                )
                cur = conn.cursor()
                cur.execute("SELECT 1")
                r = cur.fetchone()
                cur.close()
                conn.close()
                return r

            res = await asyncio.to_thread(_test)

            if test_only:
                return {"success": True, "connection": None, "message": "Postgres connection test successful"}

            # For non-test (create) flows, return a minimal connection info object
            connection_info = {
                "host": config.host,
                "port": config.port or 5432,
                "database": config.database,
                "user": config.username,
            }

            return {
                "success": True,
                "connection": connection_info,
                "message": "Postgres connection established",
            }
        except Exception as e:
            logger.error(f"❌ Postgres connection test failed: {e}")
            return {"success": False, "error": str(e)}

    async def list_connections(self) -> List[Dict[str, Any]]:
        """List all enterprise connections"""
        connections = []
        for conn_id, conn_data in self.connections.items():
            connections.append(
                {
                    "id": conn_id,
                    "name": conn_data["config"].name,
                    "type": conn_data["config"].connector_type.value,
                    "host": conn_data["config"].host,
                    "database": conn_data["config"].database,
                    "status": conn_data["status"],
                    "created_at": conn_data["created_at"],
                    "last_used": conn_data["last_used"],
                }
            )
        return connections

    async def delete_connection(self, connection_id: str) -> Dict[str, Any]:
        """Delete enterprise connection"""
        try:
            if connection_id in self.connections:
                # Close connection if needed
                self.connections[connection_id]
                # Add connection cleanup logic here

                # Remove from memory
                del self.connections[connection_id]

                # Remove from database
                from app.modules.data.models import DataSource
            from app.db.session import async_session

            async with async_session() as db:
                from sqlalchemy import select

                query = select(DataSource).where(DataSource.id == connection_id)
                result = await db.execute(query)
                data_source = result.scalar_one_or_none()

                if data_source:
                    data_source.is_active = False
                    data_source.updated_at = datetime.now()
                    await db.commit()

                logger.info(f"✅ Enterprise connection deleted: {connection_id}")
                return {
                    "success": True,
                    "message": f"Connection {connection_id} deleted successfully",
                }
                return {
                    "success": False,
                    "error": f"Connection {connection_id} not found",
                }

        except Exception as e:
            logger.error(f"❌ Failed to delete connection: {str(e)}")
            return {"success": False, "error": str(e)}
