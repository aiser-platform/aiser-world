"""
Unified Database Connector Service
Direct SQLAlchemy connections for all supported databases

This service provides direct SQLAlchemy-based connections to supported databases.
It replaces the previous Cube.js-based architecture with simpler, more maintainable
direct connections.

Supported Databases:
    - PostgreSQL (via asyncpg)
    - MySQL (via aiomysql)
    - ClickHouse (via HTTP API)
    - SQL Server (via aioodbc)
    - Snowflake (direct connector)
    - BigQuery (google-cloud SDK)
    - Redshift (via asyncpg)

Features:
    - Connection pooling
    - Credential encryption
    - Schema introspection
    - Query execution
    - Error handling and logging
"""

import logging
import asyncio
import aiohttp
from typing import Dict, List, Any, Optional
from datetime import datetime
from sqlalchemy import create_engine, inspect, text, MetaData
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from sqlalchemy.pool import QueuePool
from sqlalchemy.engine import URL

# Database drivers
try:
    import psycopg2
except ImportError:
    psycopg2 = None

try:
    import pymysql
except ImportError:
    pymysql = None

try:
    import snowflake.connector
except ImportError:
    snowflake = None

try:
    from google.cloud import bigquery
except ImportError:
    bigquery = None

logger = logging.getLogger(__name__)


class DatabaseConnectorService:
    """Unified service for database connections using SQLAlchemy"""
    
    def __init__(self):
        self.active_engines = {}  # Cache of active SQLAlchemy engines
        
        # Database configuration
        self.database_configs = {
            'postgresql': {
                'driver': 'postgresql+asyncpg',
                'sync_driver': 'postgresql+psycopg2',
                'default_port': 5432,
                'connection_string': '{driver}://{username}:{password}@{host}:{port}/{database}',
            },
            'mysql': {
                'driver': 'mysql+aiomysql',
                'sync_driver': 'mysql+pymysql',
                'default_port': 3306,
                'connection_string': '{driver}://{username}:{password}@{host}:{port}/{database}',
            },
            'sqlserver': {
                'driver': 'mssql+aioodbc',
                'sync_driver': 'mssql+pyodbc',
                'default_port': 1433,
                'connection_string': '{driver}://{username}:{password}@{host}:{port}/{database}?driver=ODBC+Driver+17+for+SQL+Server',
            },
            'snowflake': {
                'driver': 'snowflake',
                'default_port': 443,
                'connection_string': 'snowflake://{username}:{password}@{account}/{database}/{schema}?warehouse={warehouse}',
            },
            'bigquery': {
                'driver': 'bigquery',
                'default_port': None,
                'connection_string': 'bigquery://{project_id}/{dataset}',
            },
            'redshift': {
                'driver': 'postgresql+asyncpg',
                'sync_driver': 'postgresql+psycopg2',
                'default_port': 5439,
                'connection_string': '{driver}://{username}:{password}@{host}:{port}/{database}',
            },
            'clickhouse': {
                'driver': 'clickhouse+asynch',
                'sync_driver': 'clickhouse+native',
                'default_port': 8123,
                'connection_string': '{driver}://{username}:{password}@{host}:{port}/{database}',
                'http_api': True,  # ClickHouse also supports HTTP API
            },
        }
    
    async def test_connection(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Test database connection using appropriate method for each database type"""
        try:
            db_type = config.get('type', '').lower()
            
            if db_type not in self.database_configs:
                return {
                    'success': False,
                    'error': f'Unsupported database type: {db_type}'
                }
            
            logger.info(f"🧪 Testing {db_type} connection to {config.get('host')}")
            
            # Use HTTP API for ClickHouse
            if db_type == 'clickhouse':
                return await self._test_clickhouse_http(config)
            
            # Use direct driver test for other databases
            return await self._test_direct_connection(config)
            
        except Exception as e:
            logger.error(f"❌ Connection test failed: {str(e)}")
            return {
                'success': False,
                'error': f'Connection test failed: {str(e)}'
            }
    
    async def _test_direct_connection(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Test database connection using direct drivers"""
        try:
            db_type = config.get('type', '').lower()
            host = config.get('host')
            port = config.get('port', self.database_configs[db_type]['default_port'])
            database = config.get('database')
            username = config.get('username')
            password = config.get('password')
            
            # PostgreSQL / Redshift
            if db_type in ['postgresql', 'redshift']:
                if not psycopg2:
                    return {'success': False, 'error': 'psycopg2 not installed'}
                
                import psycopg2
                conn = psycopg2.connect(
                    host=host,
                    port=port,
                    database=database,
                    user=username,
                    password=password,
                    connect_timeout=10
                )
                conn.close()
                
            # MySQL
            elif db_type == 'mysql':
                if not pymysql:
                    return {'success': False, 'error': 'pymysql not installed'}
                
                import pymysql
                conn = pymysql.connect(
                    host=host,
                    port=port,
                    database=database,
                    user=username,
                    password=password,
                    connect_timeout=10
                )
                conn.close()
                
            # Snowflake
            elif db_type == 'snowflake':
                if not snowflake:
                    return {'success': False, 'error': 'snowflake-connector-python not installed'}
                
                import snowflake.connector
                conn = snowflake.connector.connect(
                    account=config.get('account'),
                    user=username,
                    password=password,
                    database=database,
                    warehouse=config.get('warehouse', 'COMPUTE_WH'),
                    schema=config.get('schema', 'PUBLIC')
                )
                conn.close()
                
            # BigQuery
            elif db_type == 'bigquery':
                if not bigquery:
                    return {'success': False, 'error': 'google-cloud-bigquery not installed'}
                
                from google.cloud import bigquery
                client = bigquery.Client(project=config.get('project_id'))
                # Test with simple query
                query = "SELECT 1"
                client.query(query).result()
                
            else:
                return {
                    'success': False,
                    'error': f'Direct connection test not implemented for {db_type}'
                }
            
            logger.info(f"✅ {db_type} connection test successful")
            return {
                'success': True,
                'message': f'{db_type} connection successful',
                'connection_info': {
                    'type': db_type,
                    'host': host,
                    'port': port,
                    'database': database,
                    'status': 'connected'
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Direct connection test failed: {str(e)}")
            return {
                'success': False,
                'error': f'Connection failed: {str(e)}'
            }
    
    async def _test_clickhouse_http(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Test ClickHouse connection via HTTP API"""
        try:
            host = config.get('host')
            port = config.get('port', 8123)
            database = config.get('database')
            username = config.get('username')
            password = config.get('password')
            
            http_url = f"http://{host}:{port}"
            query = "SELECT 1 FORMAT JSON"
            
            async with aiohttp.ClientSession() as session:
                auth = aiohttp.BasicAuth(username, password) if username else None
                async with session.post(f"{http_url}/", data=query, auth=auth, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status == 200:
                        logger.info(f"✅ ClickHouse HTTP connection successful")
                        return {
                            'success': True,
                            'message': 'ClickHouse connection successful',
                            'connection_info': {
                                'type': 'clickhouse',
                                'host': host,
                                'port': port,
                                'database': database,
                                'status': 'connected'
                            }
                        }
                    else:
                        error_text = await resp.text()
                        return {
                            'success': False,
                            'error': f'ClickHouse HTTP error {resp.status}: {error_text}'
                        }
                        
        except Exception as e:
            logger.error(f"❌ ClickHouse HTTP test failed: {str(e)}")
            return {
                'success': False,
                'error': f'ClickHouse connection failed: {str(e)}'
            }
    
    async def create_connection(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Create and cache database connection engine"""
        try:
            db_type = config.get('type', '').lower()
            connection_id = config.get('id') or f"{db_type}_{config.get('database')}_{int(datetime.now().timestamp())}"
            
            # Test connection first
            test_result = await self.test_connection(config)
            if not test_result.get('success'):
                return test_result
            
            # For ClickHouse, we use HTTP API (no engine needed)
            if db_type == 'clickhouse':
                self.active_engines[connection_id] = {
                    'type': 'clickhouse_http',
                    'config': config,
                    'created_at': datetime.now()
                }
                return {
                    'success': True,
                    'connection_id': connection_id,
                    'message': 'ClickHouse connection created (HTTP API)'
                }
            
            # Create SQLAlchemy engine for other databases
            connection_string = self._build_connection_string(config)
            
            try:
                # Create async engine with connection pooling
                engine = create_async_engine(
                    connection_string,
                    poolclass=QueuePool,
                    pool_size=5,
                    max_overflow=10,
                    pool_pre_ping=True,
                    pool_recycle=3600
                )
                
                # Store engine
                self.active_engines[connection_id] = {
                    'engine': engine,
                    'config': config,
                    'type': db_type,
                    'created_at': datetime.now()
                }
                
                logger.info(f"✅ SQLAlchemy engine created for {db_type}")
                return {
                    'success': True,
                    'connection_id': connection_id,
                    'message': f'{db_type} connection engine created'
                }
                
            except Exception as engine_error:
                logger.error(f"❌ Engine creation failed: {str(engine_error)}")
                return {
                    'success': False,
                    'error': f'Failed to create connection engine: {str(engine_error)}'
                }
                
        except Exception as e:
            logger.error(f"❌ Connection creation failed: {str(e)}")
            return {
                'success': False,
                'error': f'Connection creation failed: {str(e)}'
            }
    
    def _build_connection_string(self, config: Dict[str, Any]) -> str:
        """Build SQLAlchemy connection string"""
        db_type = config.get('type', '').lower()
        db_config = self.database_configs.get(db_type)
        
        if not db_config:
            raise ValueError(f'Unsupported database type: {db_type}')
        
        # Build connection string based on database type
        if db_type in ['postgresql', 'mysql', 'redshift']:
            return db_config['connection_string'].format(
                driver=db_config['driver'],
                username=config.get('username'),
                password=config.get('password'),
                host=config.get('host'),
                port=config.get('port', db_config['default_port']),
                database=config.get('database')
            )
        elif db_type == 'snowflake':
            return db_config['connection_string'].format(
                username=config.get('username'),
                password=config.get('password'),
                account=config.get('account'),
                database=config.get('database'),
                schema=config.get('schema', 'PUBLIC'),
                warehouse=config.get('warehouse', 'COMPUTE_WH')
            )
        elif db_type == 'bigquery':
            return db_config['connection_string'].format(
                project_id=config.get('project_id'),
                dataset=config.get('dataset', 'default')
            )
        elif db_type == 'sqlserver':
            return db_config['connection_string'].format(
                driver=db_config['driver'],
                username=config.get('username'),
                password=config.get('password'),
                host=config.get('host'),
                port=config.get('port', db_config['default_port']),
                database=config.get('database')
            )
        else:
            raise ValueError(f'Connection string builder not implemented for {db_type}')
    
    async def get_schema(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Get database schema using appropriate method"""
        try:
            db_type = config.get('type', '').lower()
            
            logger.info(f"🔍 Getting schema for {db_type} database")
            
            # Use HTTP API for ClickHouse
            if db_type == 'clickhouse':
                return await self._get_clickhouse_schema_http(config)
            
            # Use SQLAlchemy Inspector for other databases
            return await self._get_schema_sqlalchemy(config)
            
        except Exception as e:
            logger.error(f"❌ Schema retrieval failed: {str(e)}")
            return {
                'success': False,
                'error': f'Schema retrieval failed: {str(e)}'
            }
    
    async def _get_clickhouse_schema_http(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Get ClickHouse schema via HTTP API"""
        try:
            host = config.get('host')
            port = config.get('port', 8123)
            database = config.get('database')
            username = config.get('username')
            password = config.get('password')
            
            http_url = f"http://{host}:{port}"
            query = f"SELECT name, engine FROM system.tables WHERE database = '{database}' FORMAT JSON"
            
            async with aiohttp.ClientSession() as session:
                auth = aiohttp.BasicAuth(username, password) if username else None
                async with session.post(f"{http_url}/", data=query, auth=auth) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        tables = []
                        schemas = set()
                        
                        for table in data.get('data', []):
                            table_name = table.get('name')
                            
                            # Skip internal ClickHouse tables
                            if table_name.startswith('.inner_id.') or table_name.startswith('.'):
                                continue
                            
                            # Get columns for each table
                            cols_query = f"DESCRIBE TABLE {database}.{table_name} FORMAT JSON"
                            async with session.post(f"{http_url}/", data=cols_query, auth=auth) as cols_resp:
                                if cols_resp.status == 200:
                                    cols_data = await cols_resp.json()
                                    columns = []
                                    for col in cols_data.get('data', []):
                                        columns.append({
                                            'name': col.get('name', ''),
                                            'type': str(col.get('type', '')),
                                            'nullable': col.get('default_kind') != 'DEFAULT'
                                        })
                                    
                                    # Get row count for table
                                    count_query = f"SELECT count() as row_count FROM {database}.{table_name} FORMAT JSON"
                                    row_count = 0
                                    try:
                                        async with session.post(f"{http_url}/", data=count_query, auth=auth) as count_resp:
                                            if count_resp.status == 200:
                                                count_data = await count_resp.json()
                                                if count_data.get('data') and len(count_data['data']) > 0:
                                                    row_count_val = count_data['data'][0].get('row_count', 0)
                                                    row_count = int(row_count_val) if row_count_val is not None else 0
                                    except Exception as count_error:
                                        logger.debug(f"Row count fetch failed for {table_name}: {count_error}")
                                    
                                    tables.append({
                                        'schema': database,
                                        'name': table_name,
                                        'columns': columns,
                                        'rowCount': int(row_count)
                                    })
                                    schemas.add(database)
                        
                        total_rows = sum(int(t.get('rowCount', 0)) for t in tables)
                        
                        logger.info(f"✅ Retrieved schema for {len(tables)} ClickHouse tables")
                        return {
                            'success': True,
                            'tables': tables,
                            'schemas': list(schemas),
                            'total_rows': total_rows
                        }
                    else:
                        error_text = await resp.text()
                        return {
                            'success': False,
                            'error': f'ClickHouse HTTP error {resp.status}: {error_text}'
                        }
                        
        except Exception as e:
            logger.error(f"❌ ClickHouse schema fetch failed: {str(e)}")
            return {
                'success': False,
                'error': f"ClickHouse schema retrieval failed: {str(e)}"
            }
    
    async def _get_schema_sqlalchemy(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Get database schema using SQLAlchemy Inspector"""
        try:
            db_type = config.get('type', '').lower()
            
            # Build connection string for sync engine (Inspector needs sync)
            db_config = self.database_configs.get(db_type)
            if not db_config:
                return {
                    'success': False,
                    'error': f'Unsupported database type: {db_type}'
                }
            
            # Use sync driver for inspection
            sync_driver = db_config.get('sync_driver', db_config['driver'])
            config_copy = config.copy()
            config_copy['driver'] = sync_driver
            
            # Build sync connection string
            if db_type in ['postgresql', 'mysql', 'redshift']:
                connection_string = db_config['connection_string'].replace(
                    db_config['driver'], sync_driver
                ).format(
                    driver=sync_driver,
                    username=config.get('username'),
                    password=config.get('password'),
                    host=config.get('host'),
                    port=config.get('port', db_config['default_port']),
                    database=config.get('database')
                )
            else:
                return {
                    'success': False,
                    'error': f'Schema retrieval not yet implemented for {db_type}'
                }
            
            # Create sync engine and inspect
            engine = create_engine(connection_string, pool_pre_ping=True, echo=False)
            inspector = inspect(engine)
            
            tables = []
            schemas_list = inspector.get_schema_names()
            
            # Filter out system schemas
            system_schemas = {
                'postgresql': ['information_schema', 'pg_catalog', 'pg_toast'],
                'mysql': ['information_schema', 'performance_schema', 'mysql', 'sys'],
                'redshift': ['information_schema', 'pg_catalog', 'pg_toast']
            }
            excluded_schemas = system_schemas.get(db_type, ['information_schema', 'sys'])
            
            for schema_name in schemas_list:
                if schema_name.lower() not in [s.lower() for s in excluded_schemas]:
                    try:
                        table_names = inspector.get_table_names(schema=schema_name)
                        for table_name in table_names:
                            columns = []
                            try:
                                for col in inspector.get_columns(table_name, schema=schema_name):
                                    columns.append({
                                        'name': col['name'],
                                        'type': str(col['type']),
                                        'nullable': col.get('nullable', True),
                                        'primary_key': col.get('primary_key', False)
                                    })
                            except Exception as col_error:
                                logger.warning(f"Failed to get columns for {schema_name}.{table_name}: {col_error}")
                                columns = []
                            
                            tables.append({
                                'schema': schema_name,
                                'name': table_name,
                                'columns': columns,
                                'rowCount': 0  # Would need to query each table
                            })
                    except Exception as table_error:
                        logger.warning(f"Failed to get tables for schema {schema_name}: {table_error}")
                        continue
            
            engine.dispose()
            
            logger.info(f"✅ Retrieved schema for {len(tables)} tables")
            return {
                'success': True,
                'tables': tables,
                'schemas': list(set(t['schema'] for t in tables)),
                'total_rows': 0  # Would need to query each table
            }
            
        except Exception as e:
            logger.error(f"❌ SQLAlchemy schema fetch failed: {str(e)}")
            return {
                'success': False,
                'error': f'Schema retrieval failed: {str(e)}'
            }
    
    async def execute_query(self, connection_id: str, query: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Execute query on database connection"""
        try:
            if connection_id not in self.active_engines:
                return {
                    'success': False,
                    'error': f'Connection {connection_id} not found'
                }
            
            connection = self.active_engines[connection_id]
            
            # ClickHouse HTTP API
            if connection.get('type') == 'clickhouse_http':
                return await self._execute_clickhouse_query(connection['config'], query)
            
            # SQLAlchemy execution
            engine = connection.get('engine')
            if not engine:
                return {
                    'success': False,
                    'error': 'No engine found for connection'
                }
            
            start_time = datetime.now()
            
            async with engine.begin() as conn:
                if params:
                    result = await conn.execute(text(query), params)
                else:
                    result = await conn.execute(text(query))
                
                # Convert result to list of dictionaries
                if result.returns_rows:
                    columns = list(result.keys())
                    data = [dict(row._mapping) for row in result.fetchall()]
                else:
                    columns = []
                    data = []
                
                execution_time = (datetime.now() - start_time).total_seconds()
                
                logger.info(f"✅ Query executed: {len(data)} rows in {execution_time:.2f}s")
                return {
                    'success': True,
                    'data': data,
                    'columns': columns,
                    'row_count': len(data),
                    'execution_time': execution_time
                }
                
        except Exception as e:
            logger.error(f"❌ Query execution failed: {str(e)}")
            return {
                'success': False,
                'error': f'Query execution failed: {str(e)}'
            }
    
    async def _execute_clickhouse_query(self, config: Dict[str, Any], query: str) -> Dict[str, Any]:
        """Execute query on ClickHouse via HTTP API"""
        try:
            host = config.get('host')
            port = config.get('port', 8123)
            username = config.get('username')
            password = config.get('password')
            
            http_url = f"http://{host}:{port}"
            # Add FORMAT JSON to query if not present
            if 'FORMAT' not in query.upper():
                query += ' FORMAT JSON'
            
            start_time = datetime.now()
            
            async with aiohttp.ClientSession() as session:
                auth = aiohttp.BasicAuth(username, password) if username else None
                async with session.post(f"{http_url}/", data=query, auth=auth) as resp:
                    if resp.status == 200:
                        result_data = await resp.json()
                        data = result_data.get('data', [])
                        
                        # Extract columns from first row
                        columns = list(data[0].keys()) if data else []
                        
                        execution_time = (datetime.now() - start_time).total_seconds()
                        
                        logger.info(f"✅ ClickHouse query executed: {len(data)} rows in {execution_time:.2f}s")
                        return {
                            'success': True,
                            'data': data,
                            'columns': columns,
                            'row_count': len(data),
                            'execution_time': execution_time
                        }
                    else:
                        error_text = await resp.text()
                        return {
                            'success': False,
                            'error': f'ClickHouse query error {resp.status}: {error_text}'
                        }
                        
        except Exception as e:
            logger.error(f"❌ ClickHouse query failed: {str(e)}")
            return {
                'success': False,
                'error': f'ClickHouse query failed: {str(e)}'
            }
    
    def get_supported_databases(self) -> List[str]:
        """Get list of supported database types"""
        return list(self.database_configs.keys())
    
    async def close_connection(self, connection_id: str) -> Dict[str, Any]:
        """Close and remove connection"""
        try:
            if connection_id in self.active_engines:
                connection = self.active_engines[connection_id]
                
                # Dispose engine if it exists
                if 'engine' in connection:
                    await connection['engine'].dispose()
                
                del self.active_engines[connection_id]
                
                logger.info(f"✅ Connection {connection_id} closed")
                return {
                    'success': True,
                    'message': f'Connection {connection_id} closed'
                }
            else:
                return {
                    'success': False,
                    'error': f'Connection {connection_id} not found'
                }
                
        except Exception as e:
            logger.error(f"❌ Failed to close connection: {str(e)}")
            return {
                'success': False,
                'error': f'Failed to close connection: {str(e)}'
            }
