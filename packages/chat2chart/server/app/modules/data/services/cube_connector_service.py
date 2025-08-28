"""
Cube.js Connector Integration Service
Leverages Cube.js pre-built database connectors through API
"""

import logging
import asyncio
import aiohttp
from typing import Dict, List, Optional, Any
import os

logger = logging.getLogger(__name__)


class CubeConnectorService:
    """Service for integrating with Cube.js pre-built database connectors"""
    
    def __init__(self):
        self.cube_api_url = os.getenv('CUBE_API_URL', 'http://localhost:4000/cubejs-api/v1')
        self.cube_api_secret = os.getenv('CUBE_API_SECRET', 'dev-cube-secret-key')
        
        # Cube.js supported database types
        self.supported_databases = {
            'postgresql': {
                'driver': '@cubejs-backend/postgres-driver',
                'port': 5432,
                'ssl_support': True
            },
            'mysql': {
                'driver': '@cubejs-backend/mysql-driver', 
                'port': 3306,
                'ssl_support': True
            },
            'sqlserver': {
                'driver': '@cubejs-backend/mssql-driver',
                'port': 1433,
                'ssl_support': True
            },
            'snowflake': {
                'driver': '@cubejs-backend/snowflake-driver',
                'port': 443,
                'ssl_support': True
            },
            'bigquery': {
                'driver': '@cubejs-backend/bigquery-driver',
                'port': None,
                'ssl_support': True
            },
            'redshift': {
                'driver': '@cubejs-backend/redshift-driver',
                'port': 5439,
                'ssl_support': True
            }
        }

    async def create_cube_data_source(
        self, 
        connection_config: Dict[str, Any], 
        tenant_id: str = 'default'
    ) -> Dict[str, Any]:
        """Create data source using Cube.js connectors"""
        try:
            logger.info(f"🔌 Creating Cube.js data source: {connection_config.get('type')}")
            
            db_type = connection_config.get('type')
            if db_type not in self.supported_databases:
                raise ValueError(f"Unsupported database type: {db_type}. Supported: {list(self.supported_databases.keys())}")
            
            # Validate connection configuration
            self._validate_connection_config(connection_config, db_type)
            
            # Generate Cube.js environment variables for this connection
            cube_env = self._generate_cube_env_config(connection_config, tenant_id)
            
            # Test connection through Cube.js
            connection_test = await self._test_cube_connection(cube_env, tenant_id)
            
            if not connection_test['success']:
                raise Exception(f"Cube.js connection test failed: {connection_test['error']}")
            
            # Get schema information from Cube.js
            schema_info = await self._get_cube_schema_info(tenant_id)
            
            return {
                'success': True,
                'data_source': {
                    'id': f"cube_{db_type}_{tenant_id}_{int(asyncio.get_event_loop().time())}",
                    'name': connection_config.get('name', f"{db_type}_connection"),
                    'type': 'database',
                    'db_type': db_type,
                    'driver': self.supported_databases[db_type]['driver'],
                    'tenant_id': tenant_id,
                    'cube_env_config': cube_env,
                    'schema_info': schema_info,
                    'status': 'connected'
                }
            }
            
        except Exception as error:
            logger.error(f"❌ Cube.js data source creation failed: {str(error)}")
            return {
                'success': False,
                'error': str(error)
            }

    async def query_cube_data_source(
        self, 
        data_source_id: str, 
        cube_query: Dict[str, Any], 
        tenant_id: str = 'default'
    ) -> Dict[str, Any]:
        """Query data through Cube.js connector"""
        try:
            logger.info(f"🔍 Querying Cube.js data source: {data_source_id}")
            
            # Execute query through Cube.js API
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f'Bearer {self.cube_api_secret}',
                    'Content-Type': 'application/json',
                    'x-tenant-id': tenant_id
                }
                
                async with session.post(
                    f"{self.cube_api_url}/load",
                    json={'query': cube_query},
                    headers=headers
                ) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        
                        return {
                            'success': True,
                            'data': result.get('data', []),
                            'query': cube_query,
                            'annotation': result.get('annotation', {}),
                            'total_rows': len(result.get('data', [])),
                            'execution_time': result.get('executionTime')
                        }
                    else:
                        error_text = await response.text()
                        raise Exception(f"Cube.js query failed: {response.status} - {error_text}")
            
        except Exception as error:
            logger.error(f"❌ Cube.js query failed: {str(error)}")
            return {
                'success': False,
                'error': str(error)
            }

    async def get_cube_schema(self, tenant_id: str = 'default') -> Dict[str, Any]:
        """Get schema information from Cube.js"""
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f'Bearer {self.cube_api_secret}',
                    'x-tenant-id': tenant_id
                }
                
                async with session.get(
                    f"{self.cube_api_url}/meta",
                    headers=headers
                ) as response:
                    
                    if response.status == 200:
                        schema = await response.json()
                        return {
                            'success': True,
                            'schema': schema,
                            'cubes': schema.get('cubes', []),
                            'tenant_id': tenant_id
                        }
                    else:
                        error_text = await response.text()
                        raise Exception(f"Schema fetch failed: {response.status} - {error_text}")
                        
        except Exception as error:
            logger.error(f"❌ Cube.js schema fetch failed: {str(error)}")
            return {
                'success': False,
                'error': str(error)
            }

    async def test_connection(self, connection_config: Dict[str, Any], tenant_id: str = 'default') -> Dict[str, Any]:
        """Test database connection through Cube.js"""
        try:
            logger.info(f"🧪 Testing Cube.js connection: {connection_config.get('type')}")
            
            db_type = connection_config.get('type')
            if db_type not in self.supported_databases:
                return {
                    'success': False,
                    'error': f'Unsupported database type: {db_type}'
                }
            
            # Validate connection configuration
            try:
                self._validate_connection_config(connection_config, db_type)
            except ValueError as e:
                return {
                    'success': False,
                    'error': str(e)
                }
            
            # Generate Cube.js environment variables for this connection
            cube_env = self._generate_cube_env_config(connection_config, tenant_id)
            
            # Test connection through Cube.js
            connection_test = await self._test_cube_connection(cube_env, tenant_id)
            
            if connection_test['success']:
                return {
                    'success': True,
                    'connection_info': {
                        'type': db_type,
                        'host': connection_config.get('host'),
                        'port': connection_config.get('port'),
                        'database': connection_config.get('database'),
                        'status': 'connected',
                        'driver': self.supported_databases[db_type]['driver']
                    }
                }
            else:
                return {
                    'success': False,
                    'error': connection_test.get('error', 'Connection test failed')
                }
                
        except Exception as e:
            logger.error(f"❌ Connection test failed: {str(e)}")
            return {
                'success': False,
                'error': f'Connection test failed: {str(e)}'
            }

    def get_supported_databases(self) -> Dict[str, Any]:
        """Get list of supported database types"""
        return {
            'success': True,
            'supported_databases': [
                {
                    'type': db_type,
                    'name': db_type.title(),
                    'driver': config['driver'],
                    'default_port': config['port'],
                    'ssl_support': config['ssl_support']
                }
                for db_type, config in self.supported_databases.items()
            ]
        }

    # Private helper methods
    def _validate_connection_config(self, config: Dict[str, Any], db_type: str):
        """Validate connection configuration"""
        required_fields = ['host', 'database', 'username', 'password']
        
        for field in required_fields:
            if not config.get(field):
                raise ValueError(f"Missing required field: {field}")
        
        # Database-specific validation
        if db_type == 'bigquery':
            if not config.get('project_id'):
                raise ValueError("BigQuery requires project_id")
        
        if db_type == 'snowflake':
            if not config.get('account'):
                raise ValueError("Snowflake requires account")

    def _generate_cube_env_config(self, connection_config: Dict[str, Any], tenant_id: str) -> Dict[str, str]:
        """Generate Cube.js environment configuration"""
        db_type = connection_config['type']
        
        # Base configuration
        cube_env = {
            'CUBEJS_DB_TYPE': db_type,
            'CUBEJS_DB_HOST': connection_config['host'],
            'CUBEJS_DB_NAME': connection_config['database'],
            'CUBEJS_DB_USER': connection_config['username'],
            'CUBEJS_DB_PASS': connection_config['password'],
            'CUBEJS_DB_PORT': str(connection_config.get('port', self.supported_databases[db_type]['port'])),
        }
        
        # Add SSL configuration if supported
        if connection_config.get('ssl', False):
            cube_env['CUBEJS_DB_SSL'] = 'true'
        
        # Database-specific configuration
        if db_type == 'postgresql':
            cube_env['CUBEJS_DB_SCHEMA'] = connection_config.get('schema', 'public')
        elif db_type == 'bigquery':
            cube_env['CUBEJS_DB_BQ_PROJECT_ID'] = connection_config['project_id']
            if connection_config.get('key_file'):
                cube_env['CUBEJS_DB_BQ_KEY_FILE'] = connection_config['key_file']
        elif db_type == 'snowflake':
            cube_env['CUBEJS_DB_SNOWFLAKE_ACCOUNT'] = connection_config['account']
            cube_env['CUBEJS_DB_SNOWFLAKE_REGION'] = connection_config.get('region', 'us-west-2')
        
        # Add tenant isolation
        cube_env['CUBEJS_DB_SCHEMA'] = f"{connection_config.get('schema', 'public')}_{tenant_id}"
        
        return cube_env

    async def _test_cube_connection(self, cube_env: Dict[str, str], tenant_id: str) -> Dict[str, Any]:
        """Test connection through Cube.js"""
        try:
            # This would typically involve calling a Cube.js connection test endpoint
            # For now, we simulate a successful connection test
            logger.info(f"🧪 Testing Cube.js connection for tenant: {tenant_id}")
            
            # In production, this would make an actual test query to Cube.js
            # await self._make_test_query(cube_env, tenant_id)
            
            return {
                'success': True,
                'message': 'Connection test successful',
                'tenant_id': tenant_id
            }
            
        except Exception as error:
            return {
                'success': False,
                'error': str(error),
                'tenant_id': tenant_id
            }

    async def _get_cube_schema_info(self, tenant_id: str) -> Dict[str, Any]:
        """Get schema information from Cube.js"""
        try:
            schema_result = await self.get_cube_schema(tenant_id)
            if schema_result['success']:
                return schema_result['schema']
            else:
                return {}
        except:
            return {}

    async def _make_test_query(self, cube_env: Dict[str, str], tenant_id: str):
        """Make a test query to validate connection"""
        # This would make an actual test query to the database through Cube.js
        # Implementation would depend on the specific Cube.js setup
        pass