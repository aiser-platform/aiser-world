"""
Data Connectivity API
FastAPI endpoints for universal data connectivity
"""

import logging
import os
import tempfile
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends
from pydantic import BaseModel
from .services.data_connectivity_service import DataConnectivityService
from .services.intelligent_data_modeling_service import IntelligentDataModelingService
from .services.cube_integration_service import CubeIntegrationService
from .services.cube_data_modeling_service import CubeDataModelingService
from app.modules.data.services.cube_integration_service import CubeIntegrationService
from app.modules.data.services.cube_connector_service import CubeConnectorService
from app.modules.data.services.cube_data_modeling_service import CubeDataModelingService

logger = logging.getLogger(__name__)

router = APIRouter()
data_service = DataConnectivityService()
modeling_service = IntelligentDataModelingService()
cube_service = CubeIntegrationService()
cube_modeling_service = CubeDataModelingService()


# Request/Response Models
class DatabaseConnectionRequest(BaseModel):
    type: str
    host: Optional[str] = None
    port: Optional[int] = None
    database: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    name: Optional[str] = None
    uri: Optional[str] = None
    ssl_mode: Optional[str] = 'prefer'
    connection_type: Optional[str] = 'manual'  # 'manual' or 'uri'


class DatabaseTestResponse(BaseModel):
    success: bool
    message: str
    connection_info: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class DataSourceCreateRequest(BaseModel):
    name: str
    type: str  # 'file', 'database', 'warehouse', 'api'
    description: Optional[str] = None
    business_context: Optional[str] = None
    config: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None


class DataSourceQueryRequest(BaseModel):
    filters: Optional[List[Dict[str, Any]]] = None
    sort: Optional[Dict[str, str]] = None
    offset: Optional[int] = 0
    limit: Optional[int] = 1000


class ChatToChartRequest(BaseModel):
    data_source_id: str
    natural_language_query: str
    options: Optional[Dict[str, Any]] = None


class DataModelingRequest(BaseModel):
    data: List[Dict[str, Any]]
    file_metadata: Dict[str, Any]
    user_context: Optional[Dict[str, Any]] = None


class ModelingFeedbackRequest(BaseModel):
    modeling_id: str
    feedback: Dict[str, Any]


class CubeQueryRequest(BaseModel):
    query: Dict[str, Any]
    cube_name: Optional[str] = None


# Database connection endpoints
@router.post("/database/test")
async def test_database_connection(request: DatabaseConnectionRequest):
    """Test database connection without storing credentials"""
    try:
        logger.info(f"🔌 Testing database connection: {request.type}")
        
        # Convert Pydantic model to dictionary
        connection_config = request.model_dump()
        
        # Test the connection using the service
        result = await data_service.test_database_connection(connection_config)
        
        if result['success']:
            return DatabaseTestResponse(
                success=True,
                message="Database connection successful",
                connection_info=result.get('connection_info')
            )
        else:
            return DatabaseTestResponse(
                success=False,
                message="Database connection failed",
                error=result.get('error', 'Unknown error')
            )
            
    except Exception as e:
        logger.error(f"❌ Database connection test failed: {str(e)}")
        return DatabaseTestResponse(
            success=False,
            message="Database connection test failed",
            error=str(e)
        )


@router.post("/database/connect")
async def connect_database(request: DatabaseConnectionRequest):
    """Connect and store database connection"""
    try:
        logger.info(f"🔌 Connecting to database: {request.type}")
        
        # Convert Pydantic model to dictionary
        connection_config = request.model_dump()
        
        # Test connection first
        test_result = await data_service.test_database_connection(connection_config)
        if not test_result['success']:
            raise HTTPException(status_code=400, detail=f"Connection failed: {test_result.get('error')}")
        
        # Store the connection
        connection_result = await data_service.store_database_connection(connection_config)
        
        return {
            "success": True,
            "message": "Database connected successfully",
            "data_source_id": connection_result['data_source_id'],
            "connection_info": connection_result.get('connection_info')
        }
        
    except Exception as e:
        logger.error(f"❌ Database connection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sources")
async def get_data_sources(
    offset: int = 0,
    limit: int = 100
):
    """Get all data sources"""
    try:
        sources = await data_service.get_data_sources(offset, limit)
        return {
            "success": True,
            "data_sources": sources
        }
    except Exception as e:
        logger.error(f"❌ Failed to get data sources: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sources/{source_id}")
async def get_data_source_by_id(source_id: str):
    """Get a specific data source by ID"""
    try:
        source = await data_service.get_data_source_by_id(source_id)
        if source:
            return {
                "success": True,
                "data_source": source
            }
        else:
            raise HTTPException(status_code=404, detail=f"Data source {source_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get data source {source_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sources/{source_id}/data")
async def get_data_from_source(source_id: str, limit: int = 100):
    """Get data from a specific data source"""
    try:
        result = await data_service.get_data_from_source(source_id, limit)
        if result.get('success'):
            return result
        else:
            raise HTTPException(status_code=400, detail=result.get('error', 'Failed to get data'))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get data from source {source_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sources/{source_id}/schema")
async def get_source_schema(source_id: str):
    """Get schema information for a specific data source"""
    try:
        result = await data_service.get_source_schema(source_id)
        if result.get('success'):
            return result
        else:
            raise HTTPException(status_code=400, detail=result.get('error', 'Failed to get schema'))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get schema for source {source_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sources/{source_id}/query")
async def execute_query_on_source(source_id: str, query_request: Dict[str, str]):
    """Execute a custom query on a specific data source"""
    try:
        query = query_request.get('query', '')
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        
        result = await data_service.execute_query_on_source(source_id, query)
        if result.get('success'):
            return result
        else:
            raise HTTPException(status_code=400, detail=result.get('error', 'Failed to execute query'))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to execute query on source {source_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    include_preview: bool = Form(False),
    sheet_name: Optional[str] = Form(None),
    delimiter: Optional[str] = Form(',')
):
    """Upload and process data file using the data service"""
    try:
        logger.info(f"📁 File upload request: {file.filename}")
        
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Read file content
        content = await file.read()
        
        # Prepare options for the service
        options = {
            'include_data': include_preview,
            'sheet_name': sheet_name,
            'delimiter': delimiter
        }
        
        # Use the data service to handle the upload
        result = await data_service.upload_file(content, file.filename, options)
        
        if result['success']:
            return {
                "success": True,
                "data_source": result['data_source'],
                "message": f"File uploaded successfully: {result['data_source']['row_count']} rows processed"
            }
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"File upload failed: {result.get('error', 'Unknown error')}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ File upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Database connection endpoint
@router.post("/connect-database")
async def connect_database(request: DatabaseConnectionRequest):
    """Create database connection"""
    try:
        # Handle URI-based connection
        if request.uri:
            logger.info(f"🔌 Database connection request via URI")
            # Use the data service to parse URI and create connection
            result = await data_service.create_database_connection({'uri': request.uri, 'name': request.name})
            return result
        
        logger.info(f"🔌 Database connection request: {request.type}")
        
        config = {
            'type': request.type,
            'host': request.host,
            'port': request.port,
            'database': request.database,
            'username': request.username,
            'password': request.password,
            'name': request.name or f"{request.type}_{request.database}"
        }
        
        # Test database connection using the data service instead of direct psycopg2
        try:
            if request.type.lower() == 'postgresql':
                # Use the data connectivity service to test the connection
                from app.modules.data.services.data_connectivity_service import DataConnectivityService
                data_service_instance = DataConnectivityService()
                
                # Test connection through the service
                test_result = await data_service_instance.create_database_connection(config)
                
                if test_result['success']:
                    return {
                        "success": True,
                        "data_source": test_result['data_source'],
                        "message": "Database connection created successfully"
                    }
                else:
                    raise HTTPException(status_code=400, detail=f"Database connection failed: {test_result.get('error', 'Unknown error')}")
            else:
                raise HTTPException(status_code=400, detail=f"Database type {request.type} not supported yet")
                
        except Exception as db_error:
            raise HTTPException(status_code=400, detail=f"Database connection failed: {str(db_error)}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Database connection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# List data sources endpoint
@router.get("/sources")
async def list_data_sources():
    """List all data sources"""
    try:
        result = data_service.list_data_sources()
        
        return {
            "success": True,
            "data_sources": result['data_sources'],
            "count": result['count']
        }
        
    except Exception as e:
        logger.error(f"❌ List data sources failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Get data source endpoint
@router.get("/sources/{data_source_id}")
async def get_data_source(data_source_id: str):
    """Get data source information"""
    try:
        result = await data_service.get_data_source(data_source_id)
        
        if result['success']:
            return {
                "success": True,
                "data_source": result['data_source']
            }
        else:
            raise HTTPException(status_code=404, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Get data source failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Query data source endpoint
@router.post("/sources/{data_source_id}/query")
async def query_data_source(data_source_id: str, request: DataSourceQueryRequest):
    """Query data from data source"""
    try:
        logger.info(f"🔍 Data source query: {data_source_id}")
        
        query = {
            'filters': request.filters or [],
            'sort': request.sort,
            'offset': request.offset,
            'limit': request.limit
        }
        
        result = await data_service.query_data_source(data_source_id, query)
        
        if result['success']:
            return {
                "success": True,
                "data": result['data'],
                "total_rows": result.get('total_rows', len(result['data'])),
                "offset": result.get('offset', 0),
                "limit": result.get('limit', len(result['data'])),
                "schema": result.get('schema')
            }
        else:
            raise HTTPException(status_code=400, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Data source query failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Delete data source endpoint
@router.delete("/sources/{data_source_id}")
async def delete_data_source(data_source_id: str):
    """Delete data source"""
    try:
        result = await data_service.delete_data_source(data_source_id)
        
        if result['success']:
            return {
                "success": True,
                "message": result['message']
            }
        else:
            raise HTTPException(status_code=404, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Delete data source failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Integrated chat-to-chart workflow endpoint
@router.post("/chat-to-chart")
async def chat_to_chart_workflow(request: ChatToChartRequest):
    """Integrated chat-to-chart workflow"""
    try:
        logger.info(f"💬 Chat-to-chart request: \"{request.natural_language_query}\" for data source {request.data_source_id}")
        
        # Step 1: Query the data source
        data_result = await data_service.query_data_source(
            request.data_source_id, 
            {'limit': 1000}
        )
        
        if not data_result['success']:
            raise HTTPException(status_code=400, detail=f"Data query failed: {data_result['error']}")
        
        # Step 2: Import and use intelligent analytics (would integrate with AI Analytics service)
        # For now, create basic query analysis
        query_analysis = {
            'original_query': request.natural_language_query,
            'query_type': _infer_query_type_from_text(request.natural_language_query),
            'business_context': {'type': 'general'},
            'data_source': 'file_upload' if request.data_source_id.startswith('file_') else 'database'
        }
        
        # Step 3: Generate chart (would integrate with Chart Generation Service)
        # For now, return structured response
        chart_result = {
            'success': True,
            'chart_type': 'bar',  # Would be determined by MCP ECharts
            'chart_config': {
                'title': {'text': request.natural_language_query},
                'tooltip': {'trigger': 'axis'},
                'xAxis': {'type': 'category'},
                'yAxis': {'type': 'value'},
                'series': []
            },
            'data_analysis': {
                'measures': [],
                'dimensions': [],
                'data_type': 'categorical'
            }
        }
        
        return {
            "success": True,
            "natural_language_query": request.natural_language_query,
            "data_source": {
                "id": request.data_source_id,
                "row_count": data_result.get('total_rows', 0),
                "schema": data_result.get('schema')
            },
            "analytics": {
                "query_analysis": query_analysis
            },
            "chart": {
                "type": chart_result.get('chart_type'),
                "config": chart_result.get('chart_config'),
                "data_analysis": chart_result.get('data_analysis')
            },
            "data": data_result['data'][:100],  # Include sample data
            "timestamp": "2024-01-01T00:00:00Z"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Chat-to-chart workflow failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Utility functions
def _infer_query_type_from_text(text: str) -> List[str]:
    """Infer query type from natural language text"""
    text_lower = text.lower()
    query_types = []
    
    # Check for different query patterns
    if any(word in text_lower for word in ['trend', 'over time', 'growth', 'change']):
        query_types.append('trends')
    if any(word in text_lower for word in ['compare', 'vs', 'versus', 'difference']):
        query_types.append('comparisons')
    if any(word in text_lower for word in ['how many', 'count', 'total', 'sum']):
        query_types.append('metrics')
    if any(word in text_lower for word in ['distribution', 'breakdown', 'split']):
        query_types.append('segmentation')
    
    return query_types if query_types else ['general']


# Database connectors endpoint
@router.get("/supported-databases")
async def get_supported_databases():
    """Get supported database types from Cube.js"""
    try:
        result = await data_service.get_supported_databases()
        
        return {
            "success": True,
            "supported_databases": result['supported_databases'],
            "cube_integration": True
        }
        
    except Exception as e:
        logger.error(f"❌ Get supported databases failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Intelligent Data Modeling endpoints
@router.post("/intelligent-modeling")
async def intelligent_data_modeling(request: DataModelingRequest):
    """
    AI-powered intelligent data modeling workflow
    
    This endpoint:
    1. Analyzes data with AI (LiteLLM)
    2. Generates Cube.js schema (YAML + visual)
    3. Provides user approval workflow
    4. Learns from feedback for continuous improvement
    """
    try:
        logger.info(f"🧠 Intelligent modeling request for: {request.file_metadata.get('name')}")
        
        result = await modeling_service.analyze_and_model_data(
            data=request.data,
            file_metadata=request.file_metadata,
            user_context=request.user_context
        )
        
        return {
            "success": result.get('success', False),
            "modeling_result": result,
            "workflow_type": "intelligent_data_modeling",
            "ai_enhanced": not result.get('data_analysis', {}).get('ai_analysis', {}).get('fallback', False)
        }
        
    except Exception as e:
        logger.error(f"❌ Intelligent modeling failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/modeling-feedback")
async def submit_modeling_feedback(request: ModelingFeedbackRequest):
    """Submit user feedback for continuous learning"""
    try:
        logger.info(f"📝 Processing modeling feedback: {request.modeling_id}")
        
        result = await modeling_service.process_user_feedback(
            modeling_id=request.modeling_id,
            feedback=request.feedback
        )
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Feedback processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/modeling-patterns")
async def get_learned_patterns():
    """Get learned patterns from user feedback"""
    try:
        return {
            "success": True,
            "learned_patterns": modeling_service.learned_patterns,
            "feedback_count": len(modeling_service.feedback_history),
            "learning_confidence": min(len(modeling_service.feedback_history) / 10, 1.0)
        }
    except Exception as e:
        logger.error(f"❌ Get patterns failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Cube.js Integration endpoints
@router.get("/cube/status")
async def get_cube_status():
    """Get Cube.js connection status"""
    try:
        status = cube_service.get_connection_status()
        return {
            "success": True,
            "cube_status": status
        }
    except Exception as e:
        logger.error(f"❌ Cube status failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cube/connect")
async def connect_to_cube():
    """Initialize connection to Cube.js"""
    try:
        result = await cube_service.initialize_connection()
        return result
    except Exception as e:
        logger.error(f"❌ Cube connection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cube/metadata")
async def get_cube_metadata():
    """Get Cube.js metadata"""
    try:
        result = await cube_service.get_cube_metadata()
        return result
    except Exception as e:
        logger.error(f"❌ Cube metadata failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cube/query")
async def execute_cube_query(request: CubeQueryRequest):
    """Execute query against Cube.js"""
    try:
        logger.info(f"🔍 Cube.js query request")
        
        result = await cube_service.execute_cube_query(request.query)
        return result
        
    except Exception as e:
        logger.error(f"❌ Cube query failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cube/suggestions")
async def get_cube_suggestions(query: str):
    """Get cube suggestions for natural language query"""
    try:
        result = await cube_service.get_cube_suggestions(query)
        return result
    except Exception as e:
        logger.error(f"❌ Cube suggestions failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cube/{cube_name}/preview")
async def get_cube_preview(cube_name: str, limit: int = 10):
    """Get preview data from a specific cube"""
    try:
        result = await cube_service.get_cube_data_preview(cube_name, limit)
        return result
    except Exception as e:
        logger.error(f"❌ Cube preview failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Health check endpoint
@router.get("/health")
async def health_check():
    """Health check for data connectivity service"""
    return {
        "success": True,
        "service": "data_connectivity",
        "status": "healthy",
        "supported_formats": ["csv", "xlsx", "xls", "json", "tsv", "parquet", "parq", "snappy"],
        "max_file_size_mb": 50.0,
        "cube_integration": True,
        "litellm_integration": True,
        "intelligent_modeling": True
    }
# Get uploaded data endpoint
@router.get("/sources/{data_source_id}/data")
async def get_data_source_data(data_source_id: str):
    """Get data from uploaded data source"""
    try:
        logger.info(f"📊 Getting data for data source: {data_source_id}")
        
        # Get data source information from the service
        data_source_info = await data_service.get_data_source(data_source_id)
        if not data_source_info['success']:
            raise HTTPException(status_code=404, detail="Data source not found")
        
        data_source = data_source_info['data_source']
        
        # For file-based sources, check if file exists and load data
        if data_source['type'] == 'file' and 'file_path' in data_source:
            file_path = data_source['file_path']
            
            if not os.path.exists(file_path):
                logger.warning(f"File not found at path: {file_path}")
                raise HTTPException(status_code=404, detail="Data file not found")
            
            # Load data based on file type
            try:
                if data_source['format'] == 'csv':
                    import pandas as pd
                    df = pd.read_csv(file_path)
                    data = df.to_dict('records')
                elif data_source['format'] in ['xlsx', 'xls']:
                    import pandas as pd
                    df = pd.read_excel(file_path)
                    data = df.to_dict('records')
                elif data_source['format'] == 'json':
                    import json
                    with open(file_path, 'r') as f:
                        data = json.load(f)
                else:
                    raise HTTPException(status_code=400, detail=f"Unsupported file format: {data_source['format']}")
                
                return {
                    "success": True,
                    "data_source_id": data_source_id,
                    "data": data,
                    "metadata": {
                        "filename": data_source['name'],
                        "columns": data_source.get('schema', {}).get('columns', []),
                        "row_count": len(data),
                        "file_path": file_path,
                        "format": data_source['format']
                    }
                }
                
            except Exception as parse_error:
                logger.error(f"❌ Failed to parse file {file_path}: {str(parse_error)}")
                raise HTTPException(status_code=500, detail=f"Failed to parse file: {str(parse_error)}")
        
        # For database sources, return connection info
        elif data_source['type'] == 'database':
            return {
                "success": True,
                "data_source_id": data_source_id,
                "data": [],  # Database data would be queried separately
                "metadata": {
                    "type": "database",
                    "db_type": data_source.get('db_type'),
                    "connection_info": data_source.get('connection_info', {})
                }
            }
        
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported data source type: {data_source['type']}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get data source data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Cube.js Data Modeling endpoints
@router.post("/cube-modeling/analyze")
async def analyze_data_source_for_cube(request: Dict[str, Any]):
    """Analyze data source and generate Cube.js schema with YAML"""
    try:
        data_source_id = request.get('data_source_id')
        connection_info = request.get('connection_info')
        
        if not data_source_id:
            raise HTTPException(status_code=400, detail="data_source_id is required")
        
        # Get data from uploaded source or database
        data = []
        if connection_info:
            # For database connections, we would query the database
            # For now, use sample data
            data = [
                {"id": 1, "name": "Product A", "sales": 1000, "created_at": "2024-01-01"},
                {"id": 2, "name": "Product B", "sales": 1500, "created_at": "2024-01-02"}
            ]
        else:
            # Try to get uploaded data
            try:
                data_response = await get_data_source_data(data_source_id)
                if data_response.get('success'):
                    data = data_response.get('data', [])
            except:
                logger.warning(f"Could not load data for {data_source_id}")
        
        # Analyze with Cube.js modeling service
        result = await cube_modeling_service.analyze_data_source(
            data_source_id=data_source_id,
            data=data,
            connection_info=connection_info
        )
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Cube modeling analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cube-modeling/deploy")
async def deploy_cube_schema(request: Dict[str, Any]):
    """Deploy generated Cube.js schema to server"""
    try:
        data_source_id = request.get('data_source_id')
        yaml_schema = request.get('yaml_schema')
        
        if not data_source_id or not yaml_schema:
            raise HTTPException(status_code=400, detail="data_source_id and yaml_schema are required")
        
        result = await cube_modeling_service.deploy_schema_to_cube(
            data_source_id=data_source_id,
            yaml_schema=yaml_schema
        )
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Cube schema deployment failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/warehouse/test")
async def test_warehouse_connection(request: Dict[str, Any]):
    """Test warehouse connection without storing credentials"""
    try:
        connection_config = request.get('connection_config', {})
        
        if not connection_config:
            raise HTTPException(status_code=400, detail="connection_config is required")
        
        # Test the connection using the modeling service
        result = await cube_modeling_service._test_warehouse_connection(connection_config)
        
        return {
            "success": result['success'],
            "message": "Warehouse connection test completed",
            "connection_info": result,
            "error": None if result['success'] else result.get('error', 'Unknown error')
        }
        
    except Exception as e:
        logger.error(f"❌ Warehouse connection test failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cube-modeling/connect-warehouse")
async def connect_enterprise_warehouse(request: Dict[str, Any]):
    """Connect to enterprise data warehouse for Cube.js modeling"""
    try:
        connection_config = request.get('connection_config', {})
        
        if not connection_config:
            raise HTTPException(status_code=400, detail="connection_config is required")
        
        result = await cube_modeling_service.connect_enterprise_warehouse(connection_config)
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Enterprise warehouse connection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cube-modeling/types")
async def get_modeling_types():
    """Get available data modeling types"""
    try:
        return {
            "success": True,
            "modeling_types": [
                {
                    "type": "star_schema",
                    "name": "Star Schema",
                    "description": "Central fact table with dimension tables - ideal for OLAP",
                    "use_cases": ["Business Intelligence", "Data Warehousing", "Analytics"],
                    "complexity": "medium",
                    "performance": "high"
                },
                {
                    "type": "snowflake_schema", 
                    "name": "Snowflake Schema",
                    "description": "Normalized dimension tables - reduces data redundancy",
                    "use_cases": ["Large Data Warehouses", "Complex Hierarchies"],
                    "complexity": "high",
                    "performance": "medium"
                },
                {
                    "type": "flat_table",
                    "name": "Flat Table",
                    "description": "Single denormalized table - simple but may have redundancy",
                    "use_cases": ["Small Datasets", "Simple Analytics", "Prototyping"],
                    "complexity": "low", 
                    "performance": "medium"
                },
                {
                    "type": "time_series",
                    "name": "Time Series",
                    "description": "Optimized for time-based analysis and trending",
                    "use_cases": ["IoT Data", "Metrics Tracking", "Financial Analysis"],
                    "complexity": "medium",
                    "performance": "high"
                },
                {
                    "type": "event_stream",
                    "name": "Event Stream",
                    "description": "Real-time event processing and aggregation",
                    "use_cases": ["Real-time Analytics", "User Behavior", "Monitoring"],
                    "complexity": "high",
                    "performance": "very_high"
                }
            ]
        }
        
    except Exception as e:
        logger.error(f"❌ Get modeling types failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cube-status")
async def get_cube_status():
    """Get Cube.js server connection status"""
    try:
        cube_service = CubeIntegrationService()
        status = await cube_service.get_connection_status()
        return {
            "success": True,
            "cube_status": status
        }
    except Exception as e:
        logger.error(f"❌ Failed to get Cube.js status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cube-deploy")
async def deploy_cube_schema(request: dict):
    """Deploy Cube.js schema to real server"""
    try:
        data_source = request.get('data_source')
        schema = request.get('schema')
        
        if not data_source or not schema:
            raise HTTPException(status_code=400, detail="Missing data_source or schema")
        
        cube_service = CubeIntegrationService()
        deployment_result = await cube_service.deploy_cube_schema(schema, data_source)
        
        if deployment_result['success']:
            return {
                "success": True,
                "deployment": deployment_result,
                "message": "Cube.js schema deployed successfully"
            }
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"Deployment failed: {deployment_result.get('error', 'Unknown error')}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Cube.js deployment failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cube-cubes")
async def get_deployed_cubes():
    """Get list of deployed cubes from real Cube.js server"""
    try:
        cube_service = CubeIntegrationService()
        cubes_result = await cube_service.get_deployed_cubes()
        
        if cubes_result['success']:
            return {
                "success": True,
                "cubes": cubes_result['cubes'],
                "total_cubes": cubes_result['total_cubes']
            }
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"Failed to get cubes: {cubes_result.get('error', 'Unknown error')}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get deployed cubes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{data_source_id}/insights")
async def generate_data_insights(data_source_id: str):
    """Generate AI-powered insights for a data source"""
    try:
        logger.info(f"🔍 Generating AI insights for data source: {data_source_id}")
        
        # Get the data source
        data_source = await data_service.get_data_source(data_source_id)
        if not data_source:
            raise HTTPException(status_code=404, detail="Data source not found")
        
        # Generate insights using AI
        insights = await data_service.generate_data_insights(data_source_id)
        
        return {
            "success": True,
            "insights": insights,
            "data_source_id": data_source_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to generate insights: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sources/{data_source_id}/schema")
async def get_data_source_schema(data_source_id: str):
    """Get schema information for a specific data source"""
    try:
        logger.info(f"🔍 Fetching schema for data source: {data_source_id}")
        
        # Get the data source first
        from app.modules.data.models import DataSource
        from app.db.session import get_async_session
        
        async with get_async_session() as db:
            from sqlalchemy import select
            
            query = select(DataSource).where(DataSource.id == data_source_id)
            result = await db.execute(query)
            data_source = result.scalar_one_or_none()
            
            if not data_source:
                raise HTTPException(status_code=404, detail="Data source not found")
            
            # If it's a database, get live schema
            if data_source.type == 'database':
                schema_result = await data_service.get_database_schema(data_source_id)
                if schema_result['success']:
                    return {
                        "success": True,
                        "schema": schema_result['schema'],
                        "data_source": schema_result['data_source']
                    }
                else:
                    raise HTTPException(status_code=500, detail=f"Failed to fetch schema: {schema_result.get('error')}")
            
            # For other types, return stored schema
            try:
                schema = json.loads(data_source.schema) if data_source.schema else {}
            except json.JSONDecodeError:
                schema = {}
            
            return {
                "success": True,
                "schema": schema,
                "data_source": {
                    "id": data_source.id,
                    "name": data_source.name,
                    "type": data_source.type,
                    "format": data_source.format,
                    "row_count": data_source.row_count
                }
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get data source schema: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))