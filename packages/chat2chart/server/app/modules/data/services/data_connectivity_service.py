"""
Universal Data Connectivity Service
Handles file uploads, database connections, and data source management
"""

import logging
import os
import pandas as pd
import json
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
import tempfile
from pathlib import Path
from .cube_connector_service import CubeConnectorService

logger = logging.getLogger(__name__)


class DataConnectivityService:
    """Service for managing universal data connectivity"""
    
    def __init__(self):
        self.upload_dir = "./uploads"
        self.max_file_size = 50 * 1024 * 1024  # 50MB
        self.supported_formats = ['csv', 'xlsx', 'xls', 'json', 'tsv']
        
        # Ensure upload directory exists
        self._ensure_upload_dir()
        
        # Data source registry (in production, this would be in database)
        self.data_sources = {}
        
        # Initialize Cube.js connector service
        self.cube_connector = CubeConnectorService()
        
        # Database connector configurations (now using Cube.js)
        self.db_connectors = {
            'postgresql': self._create_cube_connector,
            'mysql': self._create_cube_connector,
            'sqlserver': self._create_cube_connector,
            'snowflake': self._create_cube_connector,
            'bigquery': self._create_cube_connector,
            'redshift': self._create_cube_connector
        }

    async def test_database_connection(self, connection_request: Dict[str, Any]) -> Dict[str, Any]:
        """Test database connection without storing credentials"""
        try:
            logger.info(f"🔌 Testing database connection: {connection_request.get('type')}")
            
            db_type = connection_request.get('type', '').lower()
            
            if db_type not in self.db_connectors:
                return {
                    'success': False,
                    'error': f'Unsupported database type: {db_type}'
                }
            
            # Test connection using Cube.js connector
            try:
                connector = await self.db_connectors[db_type](connection_request)
                test_result = await connector.test_connection()
                
                if test_result['success']:
                    return {
                        'success': True,
                        'connection_info': {
                            'type': db_type,
                            'host': connection_request.get('host'),
                            'port': connection_request.get('port'),
                            'database': connection_request.get('database'),
                            'status': 'connected'
                        }
                    }
                else:
                    return {
                        'success': False,
                        'error': test_result.get('error', 'Connection test failed')
                    }
                    
            except Exception as e:
                logger.error(f"❌ Database connection test error: {str(e)}")
                return {
                    'success': False,
                    'error': f'Connection test failed: {str(e)}'
                }
                
        except Exception as e:
            logger.error(f"❌ Database connection test failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    async def store_database_connection(self, connection_request: Dict[str, Any]) -> Dict[str, Any]:
        """Store database connection configuration"""
        try:
            logger.info(f"💾 Storing database connection: {connection_request.get('type')}")
            
            # Generate unique ID for the connection
            connection_id = f"db_{connection_request.get('type')}_{int(datetime.now().timestamp())}"
            
            # Store connection info (in production, this would be encrypted and stored in database)
            connection_data = {
                'id': connection_id,
                'type': 'database',
                'name': connection_request.get('name', f"{connection_request.get('type')}_connection"),
                'config': {
                    'type': connection_request.get('type'),
                    'host': connection_request.get('host'),
                    'port': connection_request.get('port'),
                    'database': connection_request.get('database'),
                    'username': connection_request.get('username'),
                    'ssl_mode': connection_request.get('ssl_mode', 'prefer')
                },
                'created_at': datetime.now().isoformat(),
                'status': 'connected'
            }
            
            # Store in registry
            self.data_sources[connection_id] = connection_data
            
            logger.info(f"✅ Database connection stored: {connection_id}")
            
            return {
                'success': True,
                'data_source_id': connection_id,
                'connection_info': connection_data
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to store database connection: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    async def get_data_sources(self, offset: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all data sources with pagination"""
        try:
            sources = list(self.data_sources.values())
            return sources[offset:offset + limit]
        except Exception as e:
            logger.error(f"❌ Failed to get data sources: {str(e)}")
            return []

    async def process_uploaded_file(
        self, 
        file_path: str, 
        original_filename: str, 
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Process uploaded file and extract data"""
        try:
            logger.info(f"📁 Processing uploaded file: {original_filename}")
            
            if options is None:
                options = {}
            
            file_extension = self._get_file_extension(original_filename)
            
            if file_extension not in self.supported_formats:
                raise ValueError(f"Unsupported file format: {file_extension}")
            
            # Process file based on extension
            if file_extension == 'csv':
                data, schema = await self._process_csv_file(file_path, options.get('delimiter', ','))
            elif file_extension == 'tsv':
                data, schema = await self._process_csv_file(file_path, '\t')
            elif file_extension in ['xlsx', 'xls']:
                data, schema = await self._process_excel_file(file_path, options.get('sheet_name'))
            elif file_extension == 'json':
                data, schema = await self._process_json_file(file_path)
            else:
                raise ValueError(f"Unsupported file format: {file_extension}")
            
            # Generate data source metadata
            data_source = {
                'id': f"file_{int(datetime.now().timestamp())}",
                'name': original_filename,
                'type': 'file',
                'format': file_extension,
                'size': os.path.getsize(file_path),
                'uploaded_at': datetime.now().isoformat(),
                'schema': schema,
                'row_count': len(data),
                'file_path': file_path,
                'preview': data[:10] if len(data) > 10 else data,  # First 10 rows for preview
                # Add fields expected by frontend
                'uuid_filename': f"file_{int(datetime.now().timestamp())}_{original_filename}",
                'content_type': f"application/{file_extension}",
                'storage_type': 'local'
            }
            
            # Store in registry
            self.data_sources[data_source['id']] = {
                **data_source,
                'data': data
            }
            
            logger.info(f"✅ File processed successfully: {len(data)} rows, {len(schema['columns'])} columns")
            
            return {
                'success': True,
                'data_source': data_source,
                'data': data if options.get('include_data') else None
            }
            
        except Exception as error:
            logger.error(f"❌ File processing failed: {str(error)}")
            
            # Clean up file on error
            if os.path.exists(file_path):
                os.unlink(file_path)
            
            return {
                'success': False,
                'error': str(error)
            }

    async def upload_file(
        self,
        file_content: bytes,
        filename: str,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Upload and process a file from content"""
        try:
            logger.info(f"📁 File upload request: {filename}")
            
            if options is None:
                options = {}
            
            # Validate file size
            if len(file_content) > self.max_file_size:
                raise ValueError(f"File too large. Maximum size: {self.max_file_size / (1024*1024):.1f}MB")
            
            # Validate file format
            file_extension = self._get_file_extension(filename)
            if file_extension not in self.supported_formats:
                raise ValueError(f"Unsupported file format: {file_extension}")
            
            # Create unique filename and save to upload directory
            timestamp = int(datetime.now().timestamp())
            unique_filename = f"file_{timestamp}_{filename}"
            file_path = os.path.join(self.upload_dir, unique_filename)
            
            # Ensure upload directory exists
            self._ensure_upload_dir()
            
            # Save file content
            with open(file_path, 'wb') as f:
                f.write(file_content)
            
            logger.info(f"💾 File saved to: {file_path}")
            
            # Process the uploaded file
            result = await self.process_uploaded_file(file_path, filename, options)
            
            if result['success']:
                logger.info(f"✅ File upload completed successfully: {filename}")
                return result
            else:
                # Clean up file if processing failed
                if os.path.exists(file_path):
                    os.unlink(file_path)
                return result
                
        except Exception as error:
            logger.error(f"❌ File upload failed: {str(error)}")
            return {
                'success': False,
                'error': str(error)
            }

    async def _process_csv_file(self, file_path: str, delimiter: str = ',') -> tuple:
        """Process CSV/TSV files"""
        try:
            # Read CSV with pandas
            df = pd.read_csv(file_path, delimiter=delimiter)
            
            # Convert to list of dictionaries
            data = df.to_dict('records')
            
            # Clean data (convert NaN to None)
            for row in data:
                for key, value in row.items():
                    if pd.isna(value):
                        row[key] = None
            
            # Infer schema
            schema = self._infer_schema_from_dataframe(df)
            
            return data, schema
            
        except Exception as error:
            raise Exception(f"CSV processing failed: {str(error)}")

    async def _process_excel_file(self, file_path: str, sheet_name: Optional[str] = None) -> tuple:
        """Process Excel files"""
        try:
            # Read Excel with pandas
            if sheet_name:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
            else:
                df = pd.read_excel(file_path)
            
            # Convert to list of dictionaries
            data = df.to_dict('records')
            
            # Clean data (convert NaN to None)
            for row in data:
                for key, value in row.items():
                    if pd.isna(value):
                        row[key] = None
            
            # Infer schema
            schema = self._infer_schema_from_dataframe(df)
            
            return data, schema
            
        except Exception as error:
            raise Exception(f"Excel processing failed: {str(error)}")

    async def _process_json_file(self, file_path: str) -> tuple:
        """Process JSON files"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                json_data = json.load(file)
            
            # Handle different JSON structures
            if isinstance(json_data, list):
                data = json_data
            elif isinstance(json_data, dict):
                if 'data' in json_data and isinstance(json_data['data'], list):
                    data = json_data['data']
                else:
                    data = [json_data]
            else:
                raise ValueError('Invalid JSON structure - expected array or object with data array')
            
            # Convert to DataFrame for schema inference
            df = pd.DataFrame(data)
            
            # Infer schema
            schema = self._infer_schema_from_dataframe(df)
            
            return data, schema
            
        except Exception as error:
            raise Exception(f"JSON processing failed: {str(error)}")

    def _infer_schema_from_dataframe(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Infer schema from pandas DataFrame"""
        columns = []
        types = {}
        statistics = {}
        
        for column in df.columns:
            series = df[column]
            
            # Determine data type
            if pd.api.types.is_numeric_dtype(series):
                if pd.api.types.is_integer_dtype(series):
                    data_type = 'integer'
                else:
                    data_type = 'number'
                
                # Calculate statistics for numeric columns
                statistics[column] = {
                    'min': float(series.min()) if not pd.isna(series.min()) else None,
                    'max': float(series.max()) if not pd.isna(series.max()) else None,
                    'mean': float(series.mean()) if not pd.isna(series.mean()) else None,
                    'null_count': int(series.isnull().sum())
                }
            elif pd.api.types.is_datetime64_any_dtype(series):
                data_type = 'date'
                statistics[column] = {
                    'null_count': int(series.isnull().sum())
                }
            elif pd.api.types.is_bool_dtype(series):
                data_type = 'boolean'
                statistics[column] = {
                    'null_count': int(series.isnull().sum())
                }
            else:
                data_type = 'string'
                
                # Calculate statistics for string columns
                non_null_series = series.dropna()
                statistics[column] = {
                    'unique_count': int(series.nunique()),
                    'max_length': int(non_null_series.astype(str).str.len().max()) if len(non_null_series) > 0 else 0,
                    'null_count': int(series.isnull().sum())
                }
            
            types[column] = data_type
            columns.append({
                'name': column,
                'type': data_type,
                'nullable': series.isnull().any(),
                'statistics': statistics[column]
            })
        
        return {
            'columns': columns,
            'types': types,
            'row_count': len(df),
            'inferred_at': datetime.now().isoformat()
        }

    def _parse_database_uri(self, uri: str) -> Dict[str, Any]:
        """Parse database URI into connection parameters"""
        try:
            from urllib.parse import urlparse
            
            parsed = urlparse(uri)
            
            # Map protocol to database type
            protocol_map = {
                'postgres': 'postgresql',
                'postgresql': 'postgresql',
                'mysql': 'mysql',
                'sqlserver': 'sqlserver',
                'mssql': 'sqlserver'
            }
            
            db_type = protocol_map.get(parsed.scheme, parsed.scheme)
            
            return {
                'type': db_type,
                'host': parsed.hostname,
                'port': parsed.port,
                'database': parsed.path.lstrip('/') if parsed.path else '',
                'username': parsed.username,
                'password': parsed.password,
                'uri': uri
            }
        except Exception as e:
            raise ValueError(f"Invalid database URI format: {str(e)}")

    async def create_database_connection(self, config: Dict[str, Any], tenant_id: str = 'default') -> Dict[str, Any]:
        """Create database connection using Cube.js connectors"""
        try:
            # Handle URI-based connections
            if config.get('uri'):
                logger.info(f"🔌 Parsing database URI connection")
                parsed_config = self._parse_database_uri(config['uri'])
                # Merge with original config, keeping name if provided
                config = {**parsed_config, **{k: v for k, v in config.items() if k != 'uri'}}
                logger.info(f"🔌 Parsed URI to: {config.get('type')} at {config.get('host')}:{config.get('port')}")
            
            logger.info(f"🔌 Creating database connection via Cube.js: {config.get('type')}")
            
            db_type = config.get('type')
            if db_type not in self.db_connectors:
                # Get supported databases from Cube.js
                supported = self.cube_connector.get_supported_databases()
                supported_types = [db['type'] for db in supported['supported_databases']]
                raise ValueError(f"Unsupported database type: {db_type}. Supported: {supported_types}")
            
            # Create connection using Cube.js connector
            cube_result = await self.cube_connector.create_cube_data_source(config, tenant_id)
            
            if not cube_result['success']:
                raise Exception(cube_result['error'])
            
            cube_data_source = cube_result['data_source']
            
            # Generate our data source metadata
            data_source = {
                'id': cube_data_source['id'],
                'name': cube_data_source['name'],
                'type': 'database',
                'db_type': cube_data_source['db_type'],
                'host': config.get('host'),
                'database': config.get('database'),
                'created_at': datetime.now().isoformat(),
                'tenant_id': tenant_id,
                'cube_integration': True,
                'driver': cube_data_source['driver'],
                'status': cube_data_source['status']
            }
            
            # Store in registry AND database
            self.data_sources[data_source['id']] = {
                **data_source,
                'cube_data_source': cube_data_source
            }
            
            # Also save to database for persistence
            try:
                from app.modules.data.models import DataSource as DataSourceModel
                from app.db.session import get_db
                
                # Create data source model instance
                db_data_source = DataSourceModel(
                    id=data_source['id'],
                    name=data_source['name'],
                    type='database',
                    db_type=data_source.get('db_type'),
                    connection_config=json.dumps(config),
                    metadata=json.dumps(data_source),
                    is_active=True
                )
                
                # Add to session and commit
                db = get_db()
                await db.add(db_data_source)
                logger.info(f"✅ Data source saved to database: {data_source['id']}")
            except Exception as db_error:
                logger.warning(f"⚠️ Could not save to database: {db_error}")
                # Continue anyway since we have in-memory storage
            
            logger.info(f"✅ Cube.js database connection created successfully: {data_source['id']}")
            
            return {
                'success': True,
                'data_source': {
                    'id': data_source['id'],
                    'name': data_source['name'],
                    'type': data_source['type'],
                    'db_type': data_source['db_type'],
                    'created_at': data_source['created_at'],
                    'cube_integration': True,
                    'driver': data_source['driver'],
                    'status': data_source['status']
                }
            }
            
        except Exception as error:
            logger.error(f"❌ Cube.js database connection failed: {str(error)}")
            return {
                'success': False,
                'error': str(error)
            }

    async def query_data_source(
        self, 
        data_source_id: str, 
        query: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Query data from data source"""
        try:
            data_source = self.data_sources.get(data_source_id)
            if not data_source:
                raise ValueError(f"Data source not found: {data_source_id}")
            
            if query is None:
                query = {}
            
            if data_source['type'] == 'file':
                return await self._query_file_data_source(data_source, query)
            elif data_source['type'] == 'database':
                return await self._query_database_data_source(data_source, query)
            else:
                raise ValueError(f"Unsupported data source type: {data_source['type']}")
                
        except Exception as error:
            logger.error(f"❌ Data source query failed: {str(error)}")
            return {
                'success': False,
                'error': str(error)
            }

    async def _query_file_data_source(
        self, 
        data_source: Dict[str, Any], 
        query: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Query file-based data source"""
        data = data_source.get('data', [])
        
        # Apply filters
        filters = query.get('filters', [])
        for filter_item in filters:
            column = filter_item.get('column')
            operator = filter_item.get('operator')
            value = filter_item.get('value')
            
            if operator == 'equals':
                data = [row for row in data if str(row.get(column, '')).lower() == str(value).lower()]
            elif operator == 'contains':
                data = [row for row in data if str(value).lower() in str(row.get(column, '')).lower()]
            elif operator == 'greater_than':
                data = [row for row in data if float(row.get(column, 0) or 0) > float(value)]
            elif operator == 'less_than':
                data = [row for row in data if float(row.get(column, 0) or 0) < float(value)]
        
        # Apply sorting
        sort_config = query.get('sort')
        if sort_config:
            column = sort_config.get('column')
            direction = sort_config.get('direction', 'asc')
            reverse = direction == 'desc'
            
            try:
                data = sorted(data, key=lambda x: x.get(column, ''), reverse=reverse)
            except:
                # If sorting fails, continue without sorting
                pass
        
        # Apply pagination
        offset = query.get('offset', 0)
        limit = query.get('limit', 1000)
        total_rows = len(data)
        paginated_data = data[offset:offset + limit]
        
        return {
            'success': True,
            'data': paginated_data,
            'total_rows': total_rows,
            'offset': offset,
            'limit': limit,
            'schema': data_source.get('schema')
        }

    async def _query_database_data_source(
        self, 
        data_source: Dict[str, Any], 
        query: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Query database data source through Cube.js"""
        try:
            if not data_source.get('cube_integration'):
                return {
                    'success': False,
                    'error': 'Database source not integrated with Cube.js'
                }
            
            cube_data_source = data_source.get('cube_data_source')
            if not cube_data_source:
                return {
                    'success': False,
                    'error': 'Cube.js data source not found'
                }
            
            # Convert our query format to Cube.js query format
            cube_query = self._convert_to_cube_query(query, cube_data_source)
            
            # Execute query through Cube.js
            result = await self.cube_connector.query_cube_data_source(
                data_source['id'],
                cube_query,
                data_source.get('tenant_id', 'default')
            )
            
            return result
            
        except Exception as error:
            logger.error(f"❌ Database query through Cube.js failed: {str(error)}")
            return {
                'success': False,
                'error': str(error)
            }

    def get_data_source(self, data_source_id: str) -> Dict[str, Any]:
        """Get data source information"""
        data_source = self.data_sources.get(data_source_id)
        if not data_source:
            return {'success': False, 'error': 'Data source not found'}
        
        # Return metadata without actual data
        metadata = {key: value for key, value in data_source.items() 
                   if key not in ['data', 'connection']}
        
        return {
            'success': True,
            'data_source': metadata
        }

    def list_data_sources(self) -> Dict[str, Any]:
        """List all data sources"""
        sources = []
        for source in self.data_sources.values():
            metadata = {key: value for key, value in source.items() 
                       if key not in ['data', 'connection']}
            sources.append(metadata)
        
        return {
            'success': True,
            'data_sources': sources,
            'count': len(sources)
        }

    def delete_data_source(self, data_source_id: str) -> Dict[str, Any]:
        """Delete data source"""
        data_source = self.data_sources.get(data_source_id)
        if not data_source:
            return {'success': False, 'error': 'Data source not found'}
        
        # Clean up file if it's a file-based source
        if data_source['type'] == 'file' and 'file_path' in data_source:
            file_path = data_source['file_path']
            if os.path.exists(file_path):
                os.unlink(file_path)
        
        # Close database connection if it's a database source
        if data_source['type'] == 'database' and 'connection' in data_source:
            connection = data_source['connection']
            if hasattr(connection, 'close'):
                connection.close()
        
        del self.data_sources[data_source_id]
        
        return {'success': True, 'message': 'Data source deleted successfully'}

    # Utility methods
    def _ensure_upload_dir(self):
        """Ensure upload directory exists"""
        if not os.path.exists(self.upload_dir):
            os.makedirs(self.upload_dir, exist_ok=True)

    def _get_file_extension(self, filename: str) -> str:
        """Get file extension"""
        return Path(filename).suffix.lower().lstrip('.')

    # Cube.js connector methods
    async def _create_cube_connector(self, config: Dict[str, Any]):
        """Create database connector through Cube.js"""
        # This is handled by the cube_connector service
        return await self.cube_connector.create_cube_data_source(config)

    def _convert_to_cube_query(self, query: Dict[str, Any], cube_data_source: Dict[str, Any]) -> Dict[str, Any]:
        """Convert our query format to Cube.js query format"""
        cube_query = {}
        
        # Add measures (default to count if none specified)
        cube_query['measures'] = query.get('measures', ['count'])
        
        # Add dimensions
        if query.get('dimensions'):
            cube_query['dimensions'] = query['dimensions']
        
        # Add time dimensions
        if query.get('time_dimensions'):
            cube_query['timeDimensions'] = query['time_dimensions']
        
        # Add filters
        if query.get('filters'):
            cube_query['filters'] = self._convert_filters_to_cube_format(query['filters'])
        
        # Add sorting
        if query.get('sort'):
            sort_config = query['sort']
            cube_query['order'] = [[sort_config['column'], sort_config.get('direction', 'asc')]]
        
        # Add limit
        if query.get('limit'):
            cube_query['limit'] = query['limit']
        
        return cube_query

    def _convert_filters_to_cube_format(self, filters: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Convert filters to Cube.js format"""
        cube_filters = []
        
        for filter_item in filters:
            cube_filter = {
                'member': filter_item['column'],
                'operator': self._map_operator_to_cube(filter_item['operator']),
                'values': [filter_item['value']]
            }
            cube_filters.append(cube_filter)
        
        return cube_filters

    def _map_operator_to_cube(self, operator: str) -> str:
        """Map our operators to Cube.js operators"""
        operator_mapping = {
            'equals': 'equals',
            'contains': 'contains',
            'greater_than': 'gt',
            'less_than': 'lt',
            'greater_equal': 'gte',
            'less_equal': 'lte'
        }
        return operator_mapping.get(operator, 'equals')

    async def get_supported_databases(self) -> Dict[str, Any]:
        """Get supported database types from Cube.js"""
        return self.cube_connector.get_supported_databases()