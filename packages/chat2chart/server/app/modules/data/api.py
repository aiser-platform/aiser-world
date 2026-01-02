"""
Data Connectivity API
FastAPI endpoints for universal data connectivity
"""

import logging
import json
import re
import os
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
import time
from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.authentication.deps.auth_bearer import JWTCookieBearer
# Auth class removed - using extract_user_payload helper instead
# from app.modules.authentication.auth import Auth
from app.db.session import get_async_session
# DataSourceRBACService removed - organization/RBAC context removed
# from .services.rbac_service import DataSourceRBACService
from .services.data_connectivity_service import DataConnectivityService
from .services.intelligent_data_modeling_service import IntelligentDataModelingService
from .services.database_connector_service import DatabaseConnectorService
from .services.data_retention_service import DataRetentionService
from app.modules.data.services.multi_engine_query_service import MultiEngineQueryService, QueryEngine
from app.modules.data.services.enterprise_connectors_service import EnterpriseConnectorsService, ConnectionConfig, ConnectorType
from app.modules.data.services.delta_iceberg_connector import DeltaIcebergConnector
import sqlalchemy as sa
from app.modules.authentication.deps.auth_bearer import current_user_payload
from app.modules.data.schemas import DataSourceUpdate
from app.modules.data.services.data_sources_crud import DataSourcesCRUD
from app.modules.projects.services import ProjectService
# OrganizationService removed - organization context removed
from app.modules.pricing.feature_gate import check_feature_for_org
from app.modules.pricing.rate_limiter import RateLimiter

# logger should be available for functions defined below
logger = logging.getLogger(__name__)


# verify_project_access function removed - organization/RBAC context removed

logger = logging.getLogger(__name__)

router = APIRouter()

# Service Instantiations
data_service = DataConnectivityService()
data_crud_service = DataSourcesCRUD()
project_service = ProjectService()
# organization_service removed - organization context removed
database_connector = DatabaseConnectorService()
intelligent_data_modeling_service = IntelligentDataModelingService()
multi_engine_service = MultiEngineQueryService()
enterprise_connectors_service = EnterpriseConnectorsService()
delta_iceberg_connector = DeltaIcebergConnector()


async def enforce_data_source_limit(user_id: str) -> int:
    """No-op in simplified mode: data source creation is only user-scoped, no org limits."""
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authentication required",
        )
    # Return dummy organization id for backward compatibility where required
    return 0


@router.post("/retention/cleanup")
async def cleanup_file_data_retention(
    request: Dict[str, Any],
    db: sa.ext.asyncio.AsyncSession = Depends(get_async_session),
):
    """
    Cleanup file-based data sources based on plan data_history_days.

    Body:
      { "organization_id": Optional[int] }

    Intended for admin/cron use.
    """
    try:
        org_id = request.get("organization_id")
        if org_id is not None:
            try:
                org_id = int(org_id)
            except (TypeError, ValueError):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="organization_id must be an integer",
                )

        retention_service = DataRetentionService(db)
        affected = await retention_service.cleanup_expired_file_sources(
            organization_id=org_id
        )
        return {
            "success": True,
            "affected": affected,
            "organization_id": org_id,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Data retention cleanup failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


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
    connection_type: Optional[str] = 'manual'  # 'manual', 'uri', or 'advanced'
    
    # Enterprise Security Features
    ssl_cert: Optional[str] = None
    ssl_key: Optional[str] = None
    ssl_ca: Optional[str] = None
    
    # SSH Tunnel Configuration
    ssh_host: Optional[str] = None
    ssh_port: Optional[int] = None
    ssh_username: Optional[str] = None
    ssh_password: Optional[str] = None
    ssh_key_path: Optional[str] = None
    
    # Connection Pool & Performance
    min_connections: Optional[int] = 1
    max_connections: Optional[int] = 10
    connection_timeout: Optional[int] = 30
    statement_timeout: Optional[int] = 300
    query_timeout: Optional[int] = 60
    
    # Database-specific options
    charset: Optional[str] = None
    compression: Optional[str] = None
    secure: Optional[str] = None
    
    # Custom fields for non-standard databases
    custom_fields: Optional[Dict[str, Any]] = None


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
async def connect_database(request: DatabaseConnectionRequest, current_token: Union[str, dict] = Depends(JWTCookieBearer())):
    """Connect and store database connection with user ownership"""
    try:
        # Extract user ID from JWT token
        # JWTCookieBearer returns dict payload when possible, or token string
        try:
            if isinstance(current_token, dict):
                user_payload = current_token
            else:
                # If it's a string token, decode it
                user_payload = extract_user_payload(current_token)
            
            # Extract user_id from various possible fields
            user_id = str(user_payload.get('id') or user_payload.get('user_id') or user_payload.get('sub') or '')
            
            logger.info(f"🔍 Extracted user_id: {user_id} from payload keys: {list(user_payload.keys()) if isinstance(user_payload, dict) else 'not dict'}")
        except Exception as e:
            logger.error(f"❌ Failed to extract user_id from token: {str(e)}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            user_id = ''

        if not user_id:
            logger.warning('connect_database attempted without authenticated user')
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Authentication required')
        
        # Enforce data source limit (no-op in simplified mode)
        await enforce_data_source_limit(user_id)

        logger.info(f"🔌 Connecting to database: {request.type} for user {user_id}")
        
        # Handle URI-based connection
        if request.uri:
            logger.info("🔌 Database connection request via URI")
            # Parse URI and merge with request
            parsed_config = data_service._parse_database_uri(request.uri)
            # Merge with request, keeping name and type from request if provided
            connection_config = {
                **parsed_config,
                **{k: v for k, v in request.model_dump().items() if v is not None and k != 'uri'},
                'name': request.name or parsed_config.get('name') or f"{parsed_config.get('type')}_connection"
            }
        else:
            # Convert Pydantic model to dictionary
            connection_config = request.model_dump()
        
        # Test connection first
        test_result = await data_service.test_database_connection(connection_config)
        if not test_result['success']:
            raise HTTPException(status_code=400, detail=f"Connection failed: {test_result.get('error')}")
        
        # In simplified mode, do not attach organization/tenant information – user_id is sufficient ownership

        # Store the connection via service with user ownership
        # NOTE: Pass plain credentials - store_database_connection will validate and encrypt them
        connection_result = await data_service.store_database_connection(connection_config, user_id=user_id)
        if not connection_result or not connection_result.get('success'):
            err = (connection_result or {}).get('error') if isinstance(connection_result, dict) else 'Unknown error'
            raise HTTPException(status_code=500, detail=f"Failed to store connection: {err}")

        data_source_id = connection_result.get('data_source_id')
        if not data_source_id:
            raise HTTPException(status_code=500, detail="Missing data_source_id in connection result")

        return {
            "success": True,
            "message": "Database connected successfully",
            "data_source_id": data_source_id,
            "data_source": {
                "id": data_source_id,
                "name": connection_config.get('name') or f"{connection_config.get('type')}_connection",
                "type": "database",
                "db_type": connection_config.get('type'),
                "status": "connected",
                "connection_info": connection_result.get('connection_info', {})
            },
            "connection_info": connection_result.get('connection_info')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Database connection failed: {str(e)}")
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Full traceback: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")


@router.get("/sources")
async def get_data_sources(
    offset: int = 0,
    limit: int = 100,
    current_token: Union[str, dict] = Depends(JWTCookieBearer())
):
    """Get user's data sources with authentication"""
    try:
        # Extract user ID from JWT token (JWTCookieBearer returns dict payload)
        user_id = None
        if isinstance(current_token, dict):
            user_id = str(current_token.get('id') or current_token.get('user_id') or current_token.get('sub') or '')
        if not user_id:
            logger.warning('get_data_sources attempted without authenticated user')
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Authentication required')

        # Get user's data sources directly via CRUD service (user-scoped only)
        from app.db.session import async_session
        async with async_session() as db:
            accessible_sources = await data_crud_service.list_data_sources(
                user_id=user_id,
                session=db
            )

        return {
            "success": True,
            "data_sources": accessible_sources
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get data sources: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    name: Optional[str] = Form(default=None),
    include_preview: bool = Form(default=False),
    sheet_name: Optional[str] = Form(default=None),
    delimiter: Optional[str] = Form(default=','),
    preview_only: bool = Form(default=False),  # Preview-only mode (doesn't save to database)
    upload_with_prompt: bool = Form(default=False),  # Whether file is uploaded with a prompt (enables in-memory storage)
    current_token: Union[str, dict] = Depends(JWTCookieBearer())
):
    """Upload and process data file using the data service (requires authentication)
    
    Parameters:
        file: The file to upload (required)
        name: Optional name for the data source. If not provided, uses filename
        include_preview: Whether to include data preview in response
        sheet_name: Optional sheet name for Excel files
        delimiter: CSV delimiter (default: ',')
    """
    try:
        # Extract user ID from JWT token
        user_id = None
        if isinstance(current_token, dict):
            user_id = str(current_token.get('id') or current_token.get('user_id') or current_token.get('sub') or '')

        if not user_id:
            logger.warning('get_data_source attempted without authenticated user')
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Authentication required')

        await enforce_data_source_limit(user_id)

        # DEBUG: Log file object details
        logger.info(f"📁 File upload request received")
        logger.info(f"📁 File object: {file}")
        logger.info(f"📁 File type: {type(file)}")
        logger.info(f"📁 File filename: {file.filename if file else 'None'}")
        logger.info(f"📁 File size: {file.size if file and hasattr(file, 'size') else 'Unknown'}")
        logger.info(f"📁 User ID: {user_id}")
        
        # Validate file - check if file is None or missing
        if file is None:
            logger.error("❌ File is None - FastAPI didn't receive the file field")
            raise HTTPException(status_code=400, detail="File field is missing from request. Ensure the FormData field name is 'file'.")
        
        if not file.filename:
            logger.error(f"❌ File filename is empty. File object: {file}")
            raise HTTPException(status_code=400, detail="No file provided or file has no filename")
        
        # Auto-generate name from filename if not provided
        if not name or name.strip() == '':
            # Remove extension and clean up the name
            name = file.filename.rsplit('.', 1)[0] if '.' in file.filename else file.filename
            # Clean up common patterns (e.g., remove timestamps, UUIDs)
            name = name.replace('file_', '').replace('_', ' ').strip()
            if not name:
                name = 'Uploaded File'
            logger.info(f"📁 Auto-generated data source name from filename: {name}")
        
        # Read file content
        content = await file.read()
        
        if not content:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Prepare options for the service
        options = {
            'include_data': include_preview,
            'sheet_name': sheet_name,
            'delimiter': delimiter,
            'user_id': user_id,               # Pass user_id to service
            'upload_with_prompt': upload_with_prompt,  # Pass upload_with_prompt flag
            'name': name,                     # Pass name to service
            'preview_only': preview_only,    # Explicitly set preview_only flag
        }
        
        # Prevent duplicate display names (case-insensitive) for this user
        try:
            existing = await data_service.get_data_sources(0, 500, user_id=user_id)
            # Filter by user_id if available (already filtered by service)
            if any((ds.get('name') or '').lower() == name.lower() for ds in existing):
                raise HTTPException(status_code=400, detail="A data source with this name already exists. Please rename your file or choose a different name.")
        except HTTPException:
            raise
        except Exception:
            pass

        # Use the data service to handle the upload
        # If preview_only, skip database save but still process file for preview
        if preview_only:
            # Process file for preview only (no database save)
            options['preview_only'] = True
            result = await data_service.upload_file(content, file.filename, options)
            
            # Return preview data without saving to database
            if result.get('success') and result.get('data_source'):
                return {
                    "success": True,
                    "data_source": {
                        "preview_data": result['data_source'].get('preview_data', []),
                        "sheets": result['data_source'].get('sheets', []),
                        "schema": result['data_source'].get('schema', []),
                        "row_count": result['data_source'].get('row_count', 0),
                    },
                    "message": "Preview generated successfully"
                }
            else:
                raise HTTPException(status_code=400, detail=result.get('error', 'Preview generation failed'))
        
        result = await data_service.upload_file(content, file.filename, options)
        
        if result['success']:
            # Ensure user_id is set on the data source
            data_source = result['data_source']
            if 'user_id' not in data_source:
                data_source['user_id'] = user_id
            
            # Return plain dict instead of JSONResponse for proxy compatibility
            return {
                "success": True,
                "data_source": data_source,
                "message": f"File uploaded successfully: {result['data_source'].get('row_count', 0)} rows processed"
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
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Full traceback: {error_trace}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")



# Get data source endpoint
@router.get("/sources/{data_source_id}")
async def get_data_source(
    data_source_id: str,
    current_token: Union[str, dict] = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session)
):
    """Get data source information - REQUIRES AUTHENTICATION and ownership verification"""
    try:
        # Extract user ID from JWT token - CRITICAL for security
        user_id = None
        if isinstance(current_token, dict):
            user_id = str(current_token.get('id') or current_token.get('user_id') or current_token.get('sub') or '')

        if not user_id:
            logger.warning('get_data_source attempted without authenticated user')
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Authentication required')

        # CRITICAL: Verify user owns this data source before returning
        from app.db.session import async_session
        from app.modules.data.models import DataSource
        from sqlalchemy import select
        
        async with async_session() as db:
            query = select(DataSource).where(
                DataSource.id == data_source_id,
                DataSource.user_id == str(user_id),  # MUST be owned by user
                DataSource.is_active == True
            )
            result = await db.execute(query)
            data_source = result.scalar_one_or_none()
            
            if not data_source:
                # Check if data source exists but belongs to different user
                check_query = select(DataSource).where(DataSource.id == data_source_id)
                check_result = await db.execute(check_query)
                exists = check_result.scalar_one_or_none()
                
                if exists:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Not authorized to access this data source"
                    )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Data source not found"
                    )
        
        # Get full data source info from service (now that we've verified ownership)
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
async def query_data_source(
    data_source_id: str,
    request: DataSourceQueryRequest,
    current_token: Union[str, dict] = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session)
):
    """Query data from data source - REQUIRES AUTHENTICATION and ownership verification"""
    try:
        # Extract user ID from JWT token - CRITICAL for security
        try:
            user_payload = extract_user_payload(current_token)
            user_id = str(user_payload.get('id') or user_payload.get('user_id') or user_payload.get('sub') or '')
        except Exception:
            user_id = ''

        if not user_id:
            logger.warning('query_data_source attempted without authenticated user')
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Authentication required')

        # CRITICAL: Verify user owns this data source before allowing query
        from app.db.session import async_session
        from app.modules.data.models import DataSource
        from sqlalchemy import select
        
        async with async_session() as db:
            query = select(DataSource).where(
                DataSource.id == data_source_id,
                DataSource.user_id == str(user_id),  # MUST be owned by user
                DataSource.is_active == True
            )
            result = await db.execute(query)
            data_source = result.scalar_one_or_none()
            
            if not data_source:
                # Check if data source exists but belongs to different user
                check_query = select(DataSource).where(DataSource.id == data_source_id)
                check_result = await db.execute(check_query)
                exists = check_result.scalar_one_or_none()
                
                if exists:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Not authorized to query this data source"
                    )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Data source not found"
                    )
        
        logger.info(f"🔍 Data source query: {data_source_id} (user: {user_id})")
        
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
async def delete_data_source(data_source_id: str, current_token: Union[str, dict] = Depends(JWTCookieBearer())):
    """Delete data source with user ownership check"""
    try:
        # Extract user ID from JWT token
        try:
            user_payload = extract_user_payload(current_token)
            user_id = str(user_payload.get('id') or user_payload.get('sub') or '')
        except Exception:
            user_id = ''

        if not user_id:
            logger.warning('delete_data_source attempted without authenticated user')
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Authentication required')

        # RBAC check removed - organization context removed
        # Users can delete their own data sources (verified by user_id check above)
        can_delete = True

        # delete_data_source is synchronous in the service layer (per-process memory + background async DB tasks)
        result = data_service.delete_data_source(data_source_id)

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
async def chat_to_chart_workflow(
    request: ChatToChartRequest,
    current_token: Union[str, dict] = Depends(JWTCookieBearer())
):
    """
    Integrated chat-to-chart workflow using Robust Multi-Agent Orchestrator
    
    This endpoint uses the robust multi-agent system to:
    1. Analyze natural language query intelligently
    2. Generate SQL queries (if needed)
    3. Execute queries against real data sources
    4. Generate charts and visualizations
    5. Provide business insights
    
    Deprecated: This endpoint is maintained for backward compatibility.
    New code should use /ai/chat/analyze endpoint directly.
    """
    try:
        logger.info(f"💬 Chat-to-chart request: \"{request.natural_language_query}\" for data source {request.data_source_id}")
        
        # Extract user ID from JWT token
        try:
            user_payload = extract_user_payload(current_token)
            user_id = str(user_payload.get('id') or user_payload.get('sub') or '')
            organization_id = str(user_payload.get('organization_id') or 'default-org')
        except Exception:
            user_id = ''
            organization_id = 'default-org'
        
        if not user_id:
            logger.warning('chat_to_chart_workflow attempted without authenticated user')
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Authentication required')
        
        # Import Robust Multi-Agent Orchestrator
        from app.modules.ai.services.robust_multi_agent_orchestrator import RobustMultiAgentOrchestrator
        from app.modules.ai.services.litellm_service import LiteLLMService
        from app.modules.charts.services.chart_generation_service import ChartGenerationService
        from app.db.session import async_session, get_sync_session
        import uuid
        
        # Initialize services
        litellm_service = LiteLLMService()
        multi_query_service = MultiEngineQueryService()
        chart_service = ChartGenerationService()
        
        # Initialize Robust Multi-Agent Orchestrator
        robust_orchestrator = RobustMultiAgentOrchestrator(
            async_session_factory=async_session,
            sync_session_factory=get_sync_session,
            litellm_service=litellm_service,
            data_service=data_service,
            multi_query_service=multi_query_service,
            chart_service=chart_service
        )
        
        # Create conversation ID
        conversation_id = str(uuid.uuid4())
        
        # Execute analysis using Robust Multi-Agent Orchestrator
        # Use "chart_generation" analysis mode to focus on chart creation
        result = await robust_orchestrator.analyze_query(
            query=request.natural_language_query,
            conversation_id=conversation_id,
            user_id=user_id,
            organization_id=organization_id,
            project_id=None,
            data_source_id=request.data_source_id,
            analysis_type="chart_generation",  # Focus on chart generation
            analysis_mode="standard"  # Can be "standard" or "advanced"
        )
        
        # Format response for backward compatibility
        response = {
            "success": result.get("success", True),
            "natural_language_query": request.natural_language_query,
            "data_source": {
                "id": request.data_source_id
            },
            "analytics": {
                "query_analysis": result.get("metadata", {}).get("reasoning_steps", [])
            },
            "chart": {
                "type": result.get("metadata", {}).get("chart_type", "bar"),
                "config": result.get("chart_config", {}),
                "data_analysis": result.get("data_analysis", {})
            },
            "result": result.get("result", ""),
            "metadata": result.get("metadata", {}),
            "routing_decision": result.get("routing_decision", {}),
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info("✅ Chat-to-chart workflow completed successfully")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Chat-to-chart workflow failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Utility functions (removed _infer_query_type_from_text - now handled by RobustMultiAgentOrchestrator)


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
        
        result = await intelligent_data_modeling_service.analyze_and_model_data(
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
        
        result = await intelligent_data_modeling_service.process_user_feedback(
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
            "learned_patterns": intelligent_data_modeling_service.learned_patterns,
            "feedback_count": len(intelligent_data_modeling_service.feedback_history),
            "learning_confidence": min(len(intelligent_data_modeling_service.feedback_history) / 10, 1.0)
        }
    except Exception as e:
        logger.error(f"❌ Get patterns failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Cube.js Integration endpoints
@router.get("/cube/status")
async def get_cube_status():
    """Get Cube.js connection status"""
    try:
        status = await cube_integration_service.get_connection_status()
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
        result = await cube_integration_service.initialize_connection()
        return result
    except Exception as e:
        logger.error(f"❌ Cube connection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cube/metadata")
async def get_cube_metadata():
    """Get Cube.js metadata"""
    try:
        result = await cube_integration_service.get_cube_metadata()
        return result
    except Exception as e:
        logger.error(f"❌ Cube metadata failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cube/query")
async def execute_cube_query(
    request: CubeQueryRequest,
    current_token: Union[str, dict] = Depends(JWTCookieBearer())
):
    """Execute query against Cube.js (Enterprise plan only)"""
    try:
        # Extract organization_id from token
        user_id = None
        organization_id = None
        if isinstance(current_token, dict):
            user_id = current_token.get('id') or current_token.get('user_id') or current_token.get('sub')
            organization_id = current_token.get('organization_id')
        elif isinstance(current_token, str):
            user_payload = extract_user_payload(current_token)
            user_id = user_payload.get('id') or user_payload.get('user_id') or user_payload.get('sub')
            organization_id = user_payload.get('organization_id')
        
        # Check if organization has Enterprise plan (Cube.js access)
        if organization_id:
            from app.db.session import async_session
            async with async_session() as db:
                from app.modules.projects.models import Organization
                result = await db.execute(
                    sa.text("SELECT plan_type FROM organizations WHERE id = :org_id"),
                    {"org_id": int(organization_id) if isinstance(organization_id, (int, str)) and str(organization_id).isdigit() else organization_id}
                )
                org_row = result.fetchone()
                if org_row and org_row.plan_type != 'enterprise':
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Cube.js Analytics is available on Enterprise plan only. Please upgrade to access this feature."
                    )
        
        logger.info("🔍 Cube.js query request")
        
        result = await cube_integration_service.execute_cube_query(request.query)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Cube query failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cube/suggestions")
async def get_cube_suggestions(query: str):
    """Get cube suggestions for natural language query"""
    try:
        result = await cube_integration_service.get_cube_suggestions(query)
        return result
    except Exception as e:
        logger.error(f"❌ Cube suggestions failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cube/{cube_name}/preview")
async def get_cube_preview(cube_name: str, limit: int = 10):
    """Get preview data from a specific cube"""
    try:
        result = await cube_integration_service.get_cube_data_preview(cube_name, limit)
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
async def get_data_source_data(
    data_source_id: str,
    current_token: Union[str, dict] = Depends(JWTCookieBearer())
):
    """Get data from uploaded data source - REQUIRES AUTHENTICATION and ownership verification"""
    try:
        # Extract user ID from JWT token - CRITICAL for security
        try:
            user_payload = extract_user_payload(current_token)
            user_id = str(user_payload.get('id') or user_payload.get('user_id') or user_payload.get('sub') or '')
        except Exception:
            user_id = ''

        if not user_id:
            logger.warning('get_data_source_data attempted without authenticated user')
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Authentication required')

        # CRITICAL: Verify user owns this data source before returning data
        from app.db.session import async_session
        from app.modules.data.models import DataSource
        from sqlalchemy import select
        
        async with async_session() as db:
            query = select(DataSource).where(
                DataSource.id == data_source_id,
                DataSource.user_id == str(user_id),  # MUST be owned by user
                DataSource.is_active == True
            )
            result = await db.execute(query)
            data_source = result.scalar_one_or_none()
            
            if not data_source:
                # Check if data source exists but belongs to different user
                check_query = select(DataSource).where(DataSource.id == data_source_id)
                check_result = await db.execute(check_query)
                exists = check_result.scalar_one_or_none()
                
                if exists:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Not authorized to access this data source"
                    )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Data source not found"
                    )
        
        logger.info(f"📊 Getting data for data source: {data_source_id} (user: {user_id})")
        
        # Get data source information from the service (now that we've verified ownership)
        data_source_info = await data_service.get_data_source(data_source_id)
        if not data_source_info['success']:
            raise HTTPException(status_code=404, detail="Data source not found")
        
        data_source = data_source_info['data_source']
        
        # For file-based sources, check if file exists and load data
        if data_source['type'] == 'file':
            # If a transient in-memory sample was provided at creation, return it
            if data_source.get('data'):
                return {
                    "success": True,
                    "data_source_id": data_source_id,
                    "data": data_source.get('data', []),
                    "metadata": {
                        "filename": data_source['name'],
                        "columns": data_source.get('schema', {}).get('columns', []),
                        "row_count": len(data_source.get('data', [])),
                        "file_path": data_source.get('file_path'),
                        "format": data_source.get('format')
                    }
                }
            
            # Try to load from PostgreSQL storage
            object_key = data_source.get('file_path')  # Now it's object_key
            if object_key:
                try:
                    from app.modules.data.services.postgres_storage_service import PostgresStorageService
                    storage_service = PostgresStorageService()
                    
                    # Load file from PostgreSQL
                    file_content = await storage_service.get_file(object_key, user_id)
                    
                    # Process based on format
                    import tempfile
                    file_format = data_source.get('format', 'csv')
                    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_format}") as tmp:
                        tmp.write(file_content)
                        tmp_path = tmp.name
                    
                    try:
                        if file_format == 'csv':
                            import pandas as pd
                            df = pd.read_csv(tmp_path)
                            data = df.to_dict('records')
                        elif file_format in ['xlsx', 'xls']:
                            import pandas as pd
                            df = pd.read_excel(tmp_path)
                            data = df.to_dict('records')
                        elif file_format == 'json':
                            import json
                            with open(tmp_path, 'r') as f:
                                data = json.load(f)
                        else:
                            raise HTTPException(status_code=400, detail=f"Unsupported format: {file_format}")
                        
                        return {
                            "success": True,
                            "data_source_id": data_source_id,
                            "data": data,
                            "metadata": {
                                "filename": data_source['name'],
                                "columns": data_source.get('schema', {}).get('columns', []),
                                "row_count": len(data),
                                "file_path": object_key,
                                "format": file_format
                            }
                        }
                    finally:
                        if os.path.exists(tmp_path):
                            os.unlink(tmp_path)
                except Exception as e:
                    logger.error(f"Failed to load from PostgreSQL storage: {e}")
                    # Fall through to sample_data fallback
            
            # Fallback to sample_data
            sample_data = data_source.get('sample_data', [])
            if sample_data:
                return {
                    "success": True,
                    "data_source_id": data_source_id,
                    "data": sample_data,
                    "metadata": {
                        "filename": data_source['name'],
                        "columns": data_source.get('schema', {}).get('columns', []),
                        "row_count": len(sample_data),
                        "file_path": object_key,
                        "format": data_source.get('format')
                    }
                }
            
            raise HTTPException(status_code=400, detail="No data available for this data source")
        
        # For database sources, return connection info
        elif data_source['type'] == 'database':
            return {
                "success": True,
                "data_source_id": data_source_id,
                "data": data_source.get('sample_data', []),  # return sample when present
                "metadata": {
                    "type": "database",
                    "db_type": data_source.get('db_type'),
                    "connection_info": data_source.get('connection_info', {})
                }
            }
        # Allow demo_* ids to return embedded sample data
        elif data_source_id.startswith('demo_'):
            demo = await data_service.get_data_source_by_id(data_source_id)
            if demo:
                return {
                    "success": True,
                    "data_source_id": data_source_id,
                    "data": demo.get('sample_data', []),
                    "metadata": {
                        "type": demo.get('type', 'file'),
                        "columns": demo.get('schema', {}).get('columns', []),
                        "row_count": len(demo.get('sample_data', []))
                    }
                }
            raise HTTPException(status_code=404, detail="Demo data not available")
        
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
        start_ts = time.time()
        data_source_id = request.get('data_source_id')
        # Use print to ensure visible in container logs regardless of logger level
        print(f"ENTRY /cube-modeling/analyze ts={start_ts} request={data_source_id}")
        logger.info(f"/cube-modeling/analyze entry: ts={start_ts}")
        connection_info = request.get('connection_info')
        
        if not data_source_id:
            raise HTTPException(status_code=400, detail="data_source_id is required")
        
        # Allow caller to pass inline sample data to analyze directly
        sample_data = request.get('sample_data') if isinstance(request, dict) else None
        if sample_data:
            data = sample_data
        else:
            # Get data from uploaded source or database. Prefer in-memory sample if present.
            data = []
            if not connection_info:
                # First try to read any in-memory sample stored in the data service registry
                try:
                    ds_info = await data_service.get_data_source(data_source_id)
                    if ds_info.get('success'):
                        ds = ds_info.get('data_source', {})
                        if ds and ds.get('data'):
                            data = ds.get('data', [])
                except Exception:
                    logger.debug(f"No in-memory sample data for {data_source_id}")

                # If still empty, try to load from persisted file on disk
                if not data:
                    try:
                        data_response = await get_data_source_data(data_source_id)
                        if data_response.get('success'):
                            data = data_response.get('data', [])
                    except Exception:
                        logger.warning(f"Could not load data for {data_source_id}")
            else:
                # For database connections, we would query the database; for now, return a small sample
                data = [
                    {"id": 1, "name": "Product A", "sales": 1000, "created_at": "2024-01-01"},
                    {"id": 2, "name": "Product B", "sales": 1500, "created_at": "2024-01-02"}
                ]
        
        print(f"PRE-ANALYZE /cube-modeling/analyze data_rows={len(data) if data else 0} connection_info={bool(connection_info)}")
        logger.info(f"/cube-modeling/analyze: data_source_id={data_source_id} collected {len(data) if data else 0} rows; connection_info_present={bool(connection_info)}")

        # Analyze with Cube.js modeling service
        mid_ts = time.time()
        logger.info(f"/cube-modeling/analyze calling analyzer: ts={mid_ts}")
        result = await cube_modeling_service.analyze_data_source(
            data_source_id=data_source_id,
            data=data,
            connection_info=connection_info
        )
        end_ts = time.time()
        print(f"EXIT /cube-modeling/analyze ts={end_ts} duration={end_ts-start_ts:.3f} analyzer_duration={end_ts-mid_ts:.3f} success={bool(result and result.get('success'))}")
        logger.info(f"/cube-modeling/analyze exit: ts={end_ts} duration={end_ts-start_ts:.3f}s analyzer_duration={end_ts-mid_ts:.3f}s result_success={bool(result and result.get('success'))}")
        
        return result
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.exception(f"❌ Cube modeling analysis failed: {str(e)}")
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


# Warehouse connection endpoint - PRIMARY endpoint
@router.post("/cube-modeling/connect-warehouse")
async def connect_enterprise_warehouse_legacy(request: Dict[str, Any], current_token: Union[str, dict] = Depends(JWTCookieBearer())):
    """Connect to enterprise data warehouse (Snowflake, BigQuery, Redshift, ClickHouse, etc.)
    
    This endpoint is an alias for backward compatibility. Use /warehouses/connect instead.
    """
    try:
        # Extract user ID from JWT token
        try:
            if isinstance(current_token, dict):
                user_payload = current_token
            else:
                user_payload = extract_user_payload(current_token)
            
            user_id = str(user_payload.get('id') or user_payload.get('user_id') or user_payload.get('sub') or '')
            logger.info(f"🔍 Extracted user_id: {user_id} from payload keys: {list(user_payload.keys()) if isinstance(user_payload, dict) else 'not dict'}")
        except Exception as e:
            logger.error(f"❌ Failed to extract user_id from token: {str(e)}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            user_id = ''

        if not user_id:
            logger.warning('connect_warehouse attempted without authenticated user')
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Authentication required')

        await enforce_data_source_limit(user_id)

        logger.info("🔍 RAW REQUEST RECEIVED:")
        logger.info(f"  - request type: {type(request)}")
        logger.info(f"  - request keys: {list(request.keys()) if isinstance(request, dict) else 'not dict'}")
        logger.info(f"  - 'connection_config' in request: {'connection_config' in request if isinstance(request, dict) else 'N/A'}")
        logger.info(f"  - request['connection_config'] if present: {request.get('connection_config') if isinstance(request, dict) else 'N/A'}")
        logger.info(f"  - Full request dump: {json.dumps(request, default=str, indent=2)}")
        
        connection_config = request.get('connection_config', request)
        
        logger.info("🔍 EXTRACTED connection_config:")
        logger.info(f"  - connection_config type: {type(connection_config)}")
        logger.info(f"  - connection_config == request: {connection_config == request}")
        if isinstance(connection_config, dict):
            safe_keys = list(connection_config.keys())
            logger.info(f"  - connection_config keys: {safe_keys}")
            logger.info(f"  - connection_config.get('host'): {connection_config.get('host')}")
        else:
            logger.info("  - connection_config is not a dict; skipping detailed logging")
        
        # Handle URI parsing if connection_config is the same as request
        if connection_config == request:
            if 'uri' in request:
                parsed = data_service._parse_database_uri(request['uri'])
                connection_config = parsed
                if 'name' in request:
                    connection_config['name'] = request['name']
            elif 'connection_string' in request:
                parsed = data_service._parse_database_uri(request['connection_string'])
                connection_config = parsed
                if 'name' in request:
                    connection_config['name'] = request['name']
        
        if not connection_config:
            raise HTTPException(status_code=400, detail="connection_config or connection details are required")
        
        if not isinstance(connection_config, dict):
            raise HTTPException(status_code=400, detail="connection_config must be a dictionary")
        
        # Normalize database type - handle ClickHouse and other variations
        db_type = connection_config.get('type', '').lower().strip()
        # Map aliases and variations
        type_mapping = {
            'postgres': 'postgresql',
            'mssql': 'sqlserver',
            'ms sql': 'sqlserver',
            'ms sql server': 'sqlserver',
            'clickhouse+native': 'clickhouse',
            'clickhouse+http': 'clickhouse'
        }
        db_type = type_mapping.get(db_type, db_type)
        connection_config['type'] = db_type
        
        # Test connection first
        test_result = await data_service.test_database_connection(connection_config)
        if not test_result.get('success'):
            raise HTTPException(status_code=400, detail=f"Connection test failed: {test_result.get('error', 'Unknown error')}")
        
        # Store the connection via service with user ownership
        # NOTE: Pass plain credentials - store_database_connection will validate and encrypt them
        connection_result = await data_service.store_database_connection(connection_config, user_id=user_id)
        if not connection_result or not connection_result.get('success'):
            err = (connection_result or {}).get('error') if isinstance(connection_result, dict) else 'Unknown error'
            raise HTTPException(status_code=500, detail=f"Failed to store connection: {err}")
        
        data_source_id = connection_result.get('data_source_id')
        if not data_source_id:
            raise HTTPException(status_code=500, detail="Missing data_source_id in connection result")

        # Also try Cube.js modeling (optional, don't fail if this fails)
        cube_result = None
        try:
            cube_result = await cube_modeling_service.connect_enterprise_warehouse(connection_config)
        except Exception as cube_error:
            logger.warning(f"⚠️ Cube.js modeling integration failed (non-critical): {str(cube_error)}")
        
        return {
            "success": True,
            "message": "Warehouse connected successfully",
            "data_source_id": data_source_id,
            "data_source": {
                "id": data_source_id,
                "name": connection_config.get('name') or f"{connection_config.get('type')}_warehouse",
                "type": "database",
                "db_type": connection_config.get('type'),
                "status": "connected",
                "connection_info": connection_result.get('connection_info', {})
            },
            "connection_info": connection_result.get('connection_info'),
            "cube_modeling": cube_result if cube_result else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Enterprise warehouse connection failed: {str(e)}")
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Full traceback: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Warehouse connection failed: {str(e)}")


@router.post("/warehouse/test")
async def test_warehouse_connection(request: Dict[str, Any]):
    """Test warehouse connection without storing credentials"""
    try:
        # Handle both formats: {connection_config: {...}} or direct {...}
        connection_config = request.get('connection_config', request)
        
        # If connection_config is the same as request, try to parse URI if present
        if connection_config == request:
            # If connection_config is the same as request, try to parse URI if present
            if 'uri' in request:
                # Parse connection string
                parsed = data_service._parse_database_uri(request['uri'])
                connection_config = parsed
            elif 'connection_string' in request:
                parsed = data_service._parse_database_uri(request['connection_string'])
                connection_config = parsed
        
        # Validate connection_config has required fields
        if not connection_config or (isinstance(connection_config, dict) and len(connection_config) == 0):
            raise HTTPException(status_code=400, detail="connection_config or connection details are required")
        
        # Ensure we have at least type and connection info
        if 'type' not in connection_config and not any(k in connection_config for k in ['uri', 'connection_string', 'host']):
            raise HTTPException(status_code=400, detail="Connection config must include type or connection details")
        
        # Test the connection using the data connectivity service
        result = await data_service.test_database_connection(connection_config)
        
        # Return same format as /database/test endpoint for consistency
        if result['success']:
            return DatabaseTestResponse(
                success=True,
                message="Warehouse connection successful",
                connection_info=result.get('connection_info')
            )
        else:
            return DatabaseTestResponse(
                success=False,
                message="Warehouse connection failed",
                error=result.get('error', 'Unknown error')
            )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except ValueError as e:
        logger.error(f"❌ Warehouse connection validation failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Invalid connection configuration: {str(e)}")
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"❌ Warehouse connection test failed: {str(e)}", exc_info=True)
        logger.error(f"Full traceback: {error_trace}")


# Warehouse connection endpoint - PRIMARY endpoint (must be before parameterized routes)
@router.post("/warehouses/connect")
async def connect_warehouse(request: Dict[str, Any], current_token: Union[str, dict] = Depends(JWTCookieBearer())):
    """Connect to enterprise data warehouse (Snowflake, BigQuery, Redshift, ClickHouse, etc.)
    
    This is the PRIMARY endpoint. /cube-modeling/connect-warehouse is an alias for backward compatibility.
    """
    logger.info("🎯 /warehouses/connect CALLED - delegating to connect_enterprise_warehouse_legacy")
    logger.info(f"  - Request keys: {list(request.keys())}")
    logger.info(f"  - Request body: {json.dumps(request, default=str, indent=2)}")
    # Delegate to the implementation
    return await connect_enterprise_warehouse_legacy(request, current_token)


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

# Removed duplicate cube-status endpoint - using /cube/status for consistency

@router.post("/cube-deploy")
async def deploy_cube_schema(request: dict):
    """Deploy Cube.js schema to real server"""
    try:
        data_source = request.get('data_source')
        schema = request.get('schema')
        
        if not data_source or not schema:
            raise HTTPException(status_code=400, detail="Missing data_source or schema")
        
        # Cube.js is no longer supported
        raise HTTPException(
            status_code=501,
            detail="Cube.js deployment has been removed. Schema deployment is no longer available."
        )
        
        if False:
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


@router.post("/dash-studio/query-editor/generate-chart")
async def generate_chart_from_cube(request: Dict[str, Any]):
    """Run a Cube.js query and return a simple ECharts option for preview.

    Expected payload: { "query": {...}, "chart_type": "bar" }
    """
    try:
        query = request.get("query") if isinstance(request, dict) else None
        chart_type = request.get("chart_type", "bar") if isinstance(request, dict) else "bar"
        if not query:
            raise HTTPException(status_code=400, detail="query is required")

        # Cube.js is no longer supported (not deployed)
        # This endpoint is deprecated
        raise HTTPException(
            status_code=501,
            detail="Cube.js integration has been removed. Please use direct database queries instead."
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to generate chart from Cube: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/dash-studio/query-editor/preview-from-rows")
async def preview_chart_from_rows(request: Dict[str, Any]):
    """Convert tabular rows (from any engine) to an ECharts option server-side.

    Payload: { rows: [...], chart_type: 'bar' }
    """
    try:
        rows = request.get('rows') if isinstance(request, dict) else None
        chart_type = request.get('chart_type', 'bar') if isinstance(request, dict) else 'bar'
        if not rows or not isinstance(rows, list):
            raise HTTPException(status_code=400, detail='rows (array) is required')

        # Cube.js is no longer supported (not deployed)
        # This endpoint needs to be reimplemented with a different charting library
        raise HTTPException(
            status_code=501,
            detail="Cube.js chart conversion has been removed. Please use client-side charting instead."
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to convert rows to chart: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cube-cubes")
async def get_deployed_cubes():
    """Get list of deployed cubes from real Cube.js server"""
    try:
        # Cube.js is no longer supported
        raise HTTPException(
            status_code=501,
            detail="Cube.js has been removed. No cubes are available."
        )
        
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


@router.post("/sources/{data_source_id}/snapshots")
async def create_data_source_snapshot(data_source_id: str, request: Dict[str, Any]):
    """Alias endpoint to create a snapshot for a data source that delegates to /api/queries/snapshots."""
    try:
        # Build payload expected by queries API
        payload = {
            'data_source_id': data_source_id,
            'sql': request.get('sql'),
            'name': request.get('name'),
            'preview_rows': request.get('preview_rows', 100)
        }

        # Call into queries module by importing its function
        from app.modules.queries import api as queries_api
        # Use the same dependencies as queries endpoint (JWTCookieBearer/get_async_session handled there)
        # Directly delegate to create_snapshot handler
        return await queries_api.create_snapshot(payload, organization_id=request.get('organization_id'), project_id=request.get('project_id'))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to create snapshot alias: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sources/{data_source_id}/schema")
async def get_data_source_schema(data_source_id: str):
    """Get schema information for a specific data source"""
    try:
        logger.info(f"🔍 Fetching schema for data source: {data_source_id}")
        
        # Get the data source first
        from app.modules.data.models import DataSource
        from app.db.session import async_session
        
        async with async_session() as db:
            from sqlalchemy import select
            
            query = select(DataSource).where(DataSource.id == data_source_id)
            result = await db.execute(query)
            data_source = result.scalar_one_or_none()
            
            if not data_source:
                raise HTTPException(status_code=404, detail="Data source not found")
            
            # If it's a database or warehouse, get live schema
            if data_source.type == 'database' or data_source.type == 'warehouse':
                schema_result = await data_service.get_database_schema(data_source_id)
                if schema_result['success']:
                    return {
                        "success": True,
                        "schema": schema_result['schema'],
                        "data_source": schema_result['data_source']
                    }
                else:
                    raise HTTPException(status_code=500, detail=f"Failed to fetch schema: {schema_result.get('error')}")
            
            # For file types, extract schema from sample_data if available
            if data_source.type == 'file':
                schema = {}
                try:
                    # Try to get schema from stored schema field first
                    if isinstance(data_source.schema, dict):
                        schema = data_source.schema
                    elif isinstance(data_source.schema, str):
                        schema = json.loads(data_source.schema)
                    
                    # If no schema, try to extract from sample_data
                    if not schema or not schema.get('tables'):
                        sample_data = data_source.sample_data
                        if sample_data:
                            if isinstance(sample_data, str):
                                sample_data = json.loads(sample_data)
                            
                            # CRITICAL: Serialize date/datetime objects to strings before processing
                            def serialize_dates(obj):
                                """Recursively serialize date/datetime objects to ISO format strings"""
                                from datetime import datetime, date
                                if isinstance(obj, (datetime, date)):
                                    return obj.isoformat()
                                elif isinstance(obj, dict):
                                    return {k: serialize_dates(v) for k, v in obj.items()}
                                elif isinstance(obj, list):
                                    return [serialize_dates(item) for item in obj]
                                return obj
                            
                            # Serialize any date objects in sample_data
                            sample_data = serialize_dates(sample_data)
                            
                            if isinstance(sample_data, list) and len(sample_data) > 0:
                                # Extract columns from first row
                                first_row = sample_data[0]
                                if isinstance(first_row, dict):
                                    columns = []
                                    for col_name, col_value in first_row.items():
                                        # Infer type from value
                                        col_type = 'string'
                                        if isinstance(col_value, (int, float)):
                                            col_type = 'number'
                                        elif isinstance(col_value, bool):
                                            col_type = 'boolean'
                                        elif isinstance(col_value, str):
                                            # Try to detect date
                                            try:
                                                from datetime import datetime
                                                datetime.fromisoformat(col_value.replace('Z', '+00:00'))
                                                col_type = 'date'
                                            except:
                                                col_type = 'string'
                                        
                                        columns.append({
                                            "name": col_name,
                                            "type": col_type,
                                            "nullable": True
                                        })
                                    
                                    # Create schema structure
                                    schema = {
                                        "tables": [{
                                            "name": "data",
                                            "columns": columns
                                        }]
                                    }
                                    logger.info(f"✅ Extracted schema from sample_data for file source: {len(columns)} columns")
                except Exception as e:
                    logger.warning(f"Failed to extract schema from file data source: {e}")
                    schema = {}
            else:
                # For other types, return stored schema
                try:
                    # Handle both string and dict schemas
                    if isinstance(data_source.schema, dict):
                        schema = data_source.schema
                    elif isinstance(data_source.schema, str):
                        schema = json.loads(data_source.schema)
                    else:
                        schema = {}
                except (json.JSONDecodeError, TypeError) as e:
                    logger.warning(f"Failed to parse schema: {e}")
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


# Views and Materialized Views Endpoints
@router.get("/sources/{data_source_id}/views")
async def list_views(data_source_id: str):
    """List database views and their columns for a data source (best-effort for SQL databases)."""
    try:
        data_source = await data_service.get_data_source_by_id(data_source_id)
        if not data_source:
            raise HTTPException(status_code=404, detail="Data source not found")

        # File sources (DuckDB) don't have information_schema.views
        if data_source.get('type') == 'file':
            return {"success": True, "views": []}

        views_query = (
            "SELECT table_schema, table_name FROM information_schema.views "
            "WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY 1,2"
        )
        result = await multi_engine_service.execute_query(
            query=views_query,
            data_source=data_source,
            engine=QueryEngine.DIRECT_SQL,
            optimization=False,
        )
        views = []
        for row in result.get("data", []):
            schema = row.get("table_schema") or row.get("schema") or "public"
            name = row.get("table_name") or row.get("name")
            columns_query = (
                "SELECT column_name, data_type, is_nullable FROM information_schema.columns "
                "WHERE table_schema = :schema AND table_name = :name ORDER BY ordinal_position"
            )
            try:
                cols_res = await multi_engine_service.execute_query(
                    query=columns_query.replace(":schema", f"'{schema}'").replace(":name", f"'{name}'"),
                    data_source=data_source,
                    engine=QueryEngine.DIRECT_SQL,
                    optimization=False,
                )
                columns = [
                    {
                        "name": c.get("column_name"),
                        "type": c.get("data_type"),
                        "nullable": (str(c.get("is_nullable")).lower() == "yes"),
                    }
                    for c in cols_res.get("data", [])
                ]
            except Exception:
                columns = []
            views.append({"schema": schema, "name": name, "columns": columns})

        return {"success": True, "views": views}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to list views: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sources/{data_source_id}/materialized-views")
async def list_materialized_views(data_source_id: str):
    """List materialized views for Postgres (best-effort)."""
    try:
        data_source = await data_service.get_data_source_by_id(data_source_id)
        if not data_source:
            raise HTTPException(status_code=404, detail="Data source not found")

        query = "SELECT schemaname, matviewname FROM pg_matviews ORDER BY 1,2"
        result = await multi_engine_service.execute_query(
            query=query,
            data_source=data_source,
            engine=QueryEngine.DIRECT_SQL,
            optimization=False,
        )
        mvs = [
            {"schema": r.get("schemaname") or "public", "name": r.get("matviewname")}
            for r in result.get("data", [])
        ]
        return {"success": True, "materialized_views": mvs}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to list materialized views: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class CreateMaterializedViewRequest(BaseModel):
    name: str
    sql: str
    table_schema: Optional[str] = Field(None, alias="schema")


@router.post("/sources/{data_source_id}/materialized-views")
async def create_materialized_view(data_source_id: str, request: CreateMaterializedViewRequest):
    """Create a materialized view using provided SQL (Postgres)."""
    try:
        data_source = await data_service.get_data_source_by_id(data_source_id)
        if not data_source:
            raise HTTPException(status_code=404, detail="Data source not found")

        # simple validation for name to avoid injection
        if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", request.name):
            raise HTTPException(status_code=400, detail="Invalid view name")
        qualified = f"{request.schema}.{request.name}" if request.schema else request.name
        create_sql = f"CREATE MATERIALIZED VIEW {qualified} AS {request.sql}"
        await multi_engine_service.execute_query(
            query=create_sql,
            data_source=data_source,
            engine=QueryEngine.DIRECT_SQL,
            optimization=False,
        )
        return {"success": True, "message": "Materialized view created"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to create materialized view: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sources/{data_source_id}/materialized-views/{schema}.{name}/refresh")
async def refresh_materialized_view(data_source_id: str, schema: str, name: str):
    try:
        data_source = await data_service.get_data_source_by_id(data_source_id)
        if not data_source:
            raise HTTPException(status_code=404, detail="Data source not found")
        if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", schema) or not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", name):
            raise HTTPException(status_code=400, detail="Invalid identifiers")
        refresh_sql = f"REFRESH MATERIALIZED VIEW CONCURRENTLY {schema}.{name}"
        await multi_engine_service.execute_query(
            query=refresh_sql,
            data_source=data_source,
            engine=QueryEngine.DIRECT_SQL,
            optimization=False,
        )
        return {"success": True, "message": "Materialized view refreshed"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to refresh materialized view: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sources/{data_source_id}/materialized-views/{schema}.{name}")
async def drop_materialized_view(data_source_id: str, schema: str, name: str):
    try:
        data_source = await data_service.get_data_source_by_id(data_source_id)
        if not data_source:
            raise HTTPException(status_code=404, detail="Data source not found")
        if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", schema) or not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", name):
            raise HTTPException(status_code=400, detail="Invalid identifiers")
        drop_sql = f"DROP MATERIALIZED VIEW IF EXISTS {schema}.{name}"
        await multi_engine_service.execute_query(
            query=drop_sql,
            data_source=data_source,
            engine=QueryEngine.DIRECT_SQL,
            optimization=False,
        )
        return {"success": True, "message": "Materialized view dropped"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to drop materialized view: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class AnalyzeQueryRequest(BaseModel):
    sql: str


@router.post("/sources/{data_source_id}/analyze")
async def analyze_query(
    data_source_id: str, 
    request: AnalyzeQueryRequest,
    current_token: dict = Depends(JWTCookieBearer())
):
    """Return EXPLAIN plan (if supported) and heuristic suggestions for optimization."""
    try:
        data_source = await data_service.get_data_source_by_id(data_source_id)
        if not data_source:
            raise HTTPException(status_code=404, detail="Data source not found")

        sql = request.sql.strip().rstrip(";")
        if not sql:
            raise HTTPException(status_code=400, detail="SQL query is required")
        
        plan = None
        plan_error = None
        
        # Try to get execution plan - support multiple database types
        try:
            source_type = data_source.get("type") or data_source.get("source_type", "").lower()
            db_type = data_source.get("db_type", "").lower()
            
            # PostgreSQL/ClickHouse style EXPLAIN
            if "postgres" in source_type or "postgres" in db_type:
                explain_sql = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {sql}"
            elif "clickhouse" in source_type or "clickhouse" in db_type:
                explain_sql = f"EXPLAIN PLAN {sql}"
            else:
                # Generic EXPLAIN
                explain_sql = f"EXPLAIN {sql}"
            
            plan_res = await multi_engine_service.execute_query(
                query=explain_sql,
                data_source=data_source,
                engine=QueryEngine.DIRECT_SQL,
                optimization=False,
            )
            
            # Many drivers return a single-row JSON plan under a key
            rows = plan_res.get("data", [])
            if rows:
                first = rows[0]
                # Try multiple possible field names
                plan_json_text = (
                    first.get("QUERY PLAN") or 
                    first.get("query_plan") or 
                    first.get("Plan") or
                    first.get("plan") or
                    (first.get(list(first.keys())[0]) if first else None) or
                    json.dumps(rows)
                )
                try:
                    if isinstance(plan_json_text, str):
                        plan = json.loads(plan_json_text)
                    else:
                        plan = plan_json_text
                except (json.JSONDecodeError, TypeError):
                    # If it's already a dict/list, use it directly
                    plan = rows if isinstance(rows, (dict, list)) else {"raw": rows}
        except Exception as e:
            logger.warning(f"EXPLAIN failed: {e}")
            plan_error = str(e)
            # Continue with suggestions even if EXPLAIN fails

        # Generate heuristic suggestions
        suggestions = []
        lowered = sql.lower()
        
        # Basic query patterns
        if "select *" in lowered:
            suggestions.append("Avoid SELECT *; select only required columns to reduce I/O and improve performance")
        if " order by " in lowered and " limit " not in lowered:
            suggestions.append("Add LIMIT when using ORDER BY for interactive queries to avoid sorting large result sets")
        if " join " in lowered and " on " in lowered and " where " not in lowered:
            suggestions.append("Add selective WHERE filters to reduce join input sizes and improve query performance")
        if " group by " in lowered and ("date_trunc(" in lowered or "::date" in lowered or "toDate(" in lowered):
            suggestions.append("Pre-aggregate by time buckets or create a materialized view for time-series queries")
        if " where " not in lowered and "select" in lowered:
            suggestions.append("Consider filtering to reduce scanned rows - full table scans can be slow on large datasets")
        
        # Index suggestions
        if " where " in lowered:
            where_clause = lowered[lowered.find(" where ") + 7:]
            # Check for common patterns that benefit from indexes
            if any(op in where_clause for op in ["=", ">", "<", ">=", "<=", " like ", " in "]):
                suggestions.append("Ensure columns in WHERE clause have indexes for optimal performance")
        
        # Aggregation suggestions
        if " group by " in lowered and " having " not in lowered:
            suggestions.append("Consider using HAVING clause for filtering aggregated results instead of subqueries")
        
        # Subquery suggestions
        if "(" in sql and "select" in lowered and lowered.count("select") > 1:
            suggestions.append("Consider using JOINs instead of subqueries for better performance in some databases")
        
        # Large result set warnings
        if " limit " not in lowered and "select" in lowered:
            suggestions.append("Add LIMIT clause to prevent returning unexpectedly large result sets")

        return {
            "success": True, 
            "plan": plan, 
            "suggestions": suggestions,
            "plan_error": plan_error if plan_error else None,
            "query_length": len(sql),
            "estimated_complexity": "high" if lowered.count("join") > 2 or lowered.count("select") > 1 else "medium" if "join" in lowered or "group by" in lowered else "low"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to analyze query: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# 🚀 REAL ENTERPRISE CONNECTIVITY ENDPOINTS

@router.post("/enterprise/connections/test")
async def test_enterprise_connection(request: Dict[str, Any]):
    """Test enterprise data source connection"""
    try:
        logger.info(f"🔌 Testing enterprise connection: {request.get('type')}")
        
        # Create connection config
        config = ConnectionConfig(
            connector_type=ConnectorType(request['type']),
            name=request.get('name', f"{request['type']}_connection"),
            host=request.get('host'),
            port=request.get('port'),
            database=request.get('database'),
            username=request.get('username'),
            password=request.get('password'),
            token=request.get('token'),
            api_key=request.get('api_key'),
            connection_string=request.get('connection_string'),
            ssl_enabled=request.get('ssl_enabled', True),
            timeout=request.get('timeout', 30),
            metadata=request.get('metadata', {})
        )
        
        # Test connection
        result = await enterprise_connectors_service.test_connection(config)
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Enterprise connection test failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/enterprise/connections")
async def create_enterprise_connection(request: Dict[str, Any]):
    """Create enterprise data source connection"""
    try:
        logger.info(f"🔌 Creating enterprise connection: {request.get('type')}")
        
        # Create connection config
        config = ConnectionConfig(
            connector_type=ConnectorType(request['type']),
            name=request.get('name', f"{request['type']}_connection"),
            host=request.get('host'),
            port=request.get('port'),
            database=request.get('database'),
            username=request.get('username'),
            password=request.get('password'),
            token=request.get('token'),
            api_key=request.get('api_key'),
            connection_string=request.get('connection_string'),
            ssl_enabled=request.get('ssl_enabled', True),
            timeout=request.get('timeout', 30),
            metadata=request.get('metadata', {})
        )
        
        # Create connection
        result = await enterprise_connectors_service.create_connection(config)
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Enterprise connection creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/enterprise/connections")
async def list_enterprise_connections():
    """List all enterprise connections"""
    try:
        connections = await enterprise_connectors_service.list_connections()
        return {
            "success": True,
            "connections": connections,
            "count": len(connections)
        }
    except Exception as e:
        logger.error(f"❌ Failed to list enterprise connections: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/enterprise/connections/{connection_id}/query")
async def execute_enterprise_query(connection_id: str, request: Dict[str, Any]):
    """Execute query on enterprise connection"""
    try:
        query = request.get('query', '')
        params = request.get('params')
        
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        
        result = await enterprise_connectors_service.execute_query(connection_id, query, params)
        
        return {
            "success": result.success,
            "data": result.data,
            "columns": result.columns,
            "row_count": result.row_count,
            "execution_time": result.execution_time,
            "query_id": result.query_id,
            "error": result.error
        }
        
    except Exception as e:
        logger.error(f"❌ Enterprise query execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/enterprise/connections/{connection_id}/schema")
async def get_enterprise_schema(connection_id: str, table_name: Optional[str] = None):
    """Get schema from enterprise connection"""
    try:
        result = await enterprise_connectors_service.get_schema(connection_id, table_name)
        return result
    except Exception as e:
        logger.error(f"❌ Failed to get enterprise schema: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# 🎯 MULTI-ENGINE QUERY EXECUTION ENDPOINTS

@router.post("/query/execute")
async def execute_multi_engine_query(request: Dict[str, Any]):
    """Execute query using optimal engine"""
    try:
        logger.info(f"🔥 Received /query/execute request: {json.dumps(request, indent=2)}")
        query = request.get('query', '')
        data_source_id = request.get('data_source_id')
        filters = request.get('filters')  # Optional: [{field, op, value|values|from/to}]
        engine = request.get('engine')  # Optional: 'duckdb', 'cube', 'spark', 'direct_sql', 'pandas'
        optimization = request.get('optimization', True)
        
        logger.info(f"🔍 Extracted from request: query={query[:200]}..., data_source_id={data_source_id}, engine={engine}")
        
        if not query or not data_source_id:
            raise HTTPException(status_code=400, detail="Query and data_source_id are required")
        
        # Get data source
        logger.info(f"🔍 Fetching data source: {data_source_id}")
        data_source = await data_service.get_data_source_by_id(data_source_id)
        # Enrich file-based data sources with persisted sample_data if available
        try:
            if data_source and data_source.get('type') == 'file' and not data_source.get('data') and not data_source.get('sample_data'):
                from app.db.session import get_sync_engine
                eng = get_sync_engine()
                import sqlalchemy as sa
                with eng.connect() as conn:
                    r = conn.execute(sa.text("SELECT sample_data FROM data_sources WHERE id = :id LIMIT 1"), {"id": data_source_id})
                    row = r.fetchone()
                    if row and row[0] is not None:
                        try:
                            data_source['sample_data'] = row[0]
                            data_source['data'] = row[0]
                        except Exception:
                            data_source['sample_data'] = row[0]
        except Exception:
            # Non-fatal: continue with whatever data_source we have
            logger.debug('Failed to enrich data_source with persisted sample_data')
        # Additional fallback: check in-memory preview registry for inline sample data
        try:
            if data_source and data_source.get('type') == 'file' and not data_source.get('data') and not data_source.get('sample_data'):
                mem = data_service.data_sources.get(data_source_id)
                if mem:
                    if mem.get('data'):
                        data_source['data'] = mem.get('data')
                        data_source['sample_data'] = mem.get('data')
                    elif mem.get('sample_data'):
                        data_source['sample_data'] = mem.get('sample_data')
                        data_source['data'] = mem.get('sample_data')
        except Exception:
            logger.debug('Failed to enrich data_source from in-memory registry')
        if not data_source:
            logger.error(f"❌ Data source not found: {data_source_id}")
            raise HTTPException(status_code=404, detail="Data source not found")
        
        logger.info(f"✅ Using data source: id={data_source.get('id')}, name={data_source.get('name')}, type={data_source.get('type')}, db_type={data_source.get('db_type')}")
        logger.info(f"🔍 Data source connection_info keys: {list(data_source.get('connection_info', {}).keys())}")
        logger.info(f"🔍 Data source database: {data_source.get('database')}")
        
        # Select engine if specified. Accept 'auto' to mean optimizer-controlled.
        # CRITICAL: Default to auto-selection if engine is invalid/unknown instead of raising error
        selected_engine = None
        if engine:
            if isinstance(engine, str) and engine.lower() in ('auto', 'unknown', ''):
                selected_engine = None  # Auto-select
            else:
                try:
                    selected_engine = QueryEngine(engine)
                except ValueError:
                    # Invalid engine - log warning but default to auto-selection instead of error
                    logger.warning(f"⚠️ Invalid engine '{engine}' specified, defaulting to auto-selection")
                    selected_engine = None  # Auto-select optimal engine
        
        # Apply filters server-side by safely wrapping the original SQL
        if filters and isinstance(filters, list):
            try:
                query = _apply_filters_to_query(query, filters)
            except Exception:
                pass

        # Execute query
        result = await multi_engine_service.execute_query(
            query=query,
            data_source=data_source,
            engine=selected_engine,
            optimization=optimization
        )
        
        # Ensure result has proper structure with all required fields
        logger.info(f"📊 Query execution result: success={result.get('success')}, data_length={len(result.get('data', []))}, columns={result.get('columns', [])}, engine={result.get('engine')}")
        
        # Ensure data is always an array
        if result.get('success') and 'data' in result:
            result_data = result.get('data', [])
            if not isinstance(result_data, list):
                logger.warning(f"⚠️ Result data is not a list, converting: {type(result_data)}")
                result['data'] = [result_data] if result_data else []
            
            # Log first row for debugging
            if result['data'] and len(result['data']) > 0:
                logger.info(f"📊 First row sample: {json.dumps(result['data'][0], default=str)[:200]}")
            else:
                logger.warning("⚠️ Query executed successfully but returned no data rows")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Multi-engine query execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def _apply_filters_to_query(original_query: str, filters: list) -> str:
    """Safely wrap query with filters as WHERE clauses.
    SELECT * FROM (original_query) AS q WHERE ...
    """
    if not original_query or not isinstance(filters, list) or len(filters) == 0:
        return original_query

    def safe_field(name: str) -> str:
        import re
        return name if name and re.match(r"^[a-zA-Z0-9_\.]+$", name) else ""

    def sql_value(v):
        if v is None:
            return 'NULL'
        if isinstance(v, (int, float)):
            return str(v)
        if isinstance(v, bool):
            return 'TRUE' if v else 'FALSE'
        s = str(v).replace("'", "''")
        return f"'{s}'"

    clauses = []
    for f in filters:
        if not isinstance(f, dict):
            continue
        field = safe_field(str(f.get('field', '')))
        if not field:
            continue
        op = str(f.get('op', '=')).lower()
        if op == 'between' and f.get('from') is not None and f.get('to') is not None:
            clauses.append(f"{field} BETWEEN {sql_value(f.get('from'))} AND {sql_value(f.get('to'))}")
        elif op in ('in', 'not in') and isinstance(f.get('values'), list) and len(f['values']) > 0:
            vals = ', '.join(sql_value(v) for v in f['values'])
            clauses.append(f"{field} {op.upper()} ({vals})")
        elif op in ('=', '!=', '>', '<', '>=', '<=', 'like', 'ilike') and f.get('value') is not None:
            clauses.append(f"{field} {op.upper()} {sql_value(f.get('value'))}")

    if not clauses:
        return original_query
    where = ' AND '.join(clauses)
    return f"SELECT * FROM ({original_query}) AS q WHERE {where}"


@router.post("/query/parallel")
async def execute_parallel_queries(request: Dict[str, Any]):
    """Execute multiple queries in parallel"""
    try:
        queries = request.get('queries', [])
        data_source_id = request.get('data_source_id')
        
        if not queries or not data_source_id:
            raise HTTPException(status_code=400, detail="Queries and data_source_id are required")
        
        # Get data source
        data_source = await data_service.get_data_source_by_id(data_source_id)
        if not data_source:
            raise HTTPException(status_code=404, detail="Data source not found")
        
        # Execute parallel queries
        results = await multi_engine_service.execute_parallel_queries(queries, data_source)
        
        return {
            "success": True,
            "results": results,
            "total_queries": len(queries),
            "completed_queries": len([r for r in results if r.get('success')])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Parallel query execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# 🏗️ REAL CUBE.JS INTEGRATION ENDPOINTS

@router.post("/cube/initialize")
async def initialize_cube_server():
    """Initialize real Cube.js server with connectors"""
    try:
        result = await real_cube_integration_service.initialize_cube_server()
        return result
    except Exception as e:
        logger.error(f"❌ Cube.js server initialization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cube/connections")
async def create_cube_database_connection(request: Dict[str, Any]):
    """Create real database connection for Cube.js"""
    try:
        result = await real_cube_integration_service.create_database_connection(request)
        return result
    except Exception as e:
        logger.error(f"❌ Cube.js database connection creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cube/connections/{connection_id}/query")
async def execute_cube_query(connection_id: str, request: Dict[str, Any]):
    """Execute query using real database connection"""
    try:
        query = request.get('query', '')
        params = request.get('params')
        
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        
        result = await real_cube_integration_service.execute_query(connection_id, query, params)
        
        return {
            "success": result['success'],
            "data": result.get('data', []),
            "columns": result.get('columns', []),
            "row_count": result.get('row_count', 0),
            "execution_time": result.get('execution_time', 0),
            "connection_id": connection_id
        }
        
    except Exception as e:
        logger.error(f"❌ Cube.js query execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cube/connections/{connection_id}/schema")
async def get_cube_database_schema(connection_id: str):
    """Get real database schema for Cube.js"""
    try:
        result = await real_cube_integration_service.get_database_schema(connection_id)
        return result
    except Exception as e:
        logger.error(f"❌ Cube.js schema retrieval failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cube/connections/{connection_id}/schema")
async def create_cube_schema(connection_id: str, request: Dict[str, Any]):
    """Create real Cube.js schema from database connection"""
    try:
        schema_config = request.get('schema_config', {})
        result = await real_cube_integration_service.create_cube_schema(connection_id, schema_config)
        return result
    except Exception as e:
        logger.error(f"❌ Cube.js schema creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# 📋 YAML SCHEMA MANAGEMENT ENDPOINTS

@router.post("/schema/generate")
async def generate_yaml_schema(request: Dict[str, Any]):
    """Generate YAML schema from data source"""
    try:
        data_source_id = request.get('data_source_id')
        data_source_type = request.get('data_source_type', 'database')
        user_preferences = request.get('user_preferences', {})
        
        if not data_source_id:
            raise HTTPException(status_code=400, detail="data_source_id is required")
        
        # Get raw schema from data source
        schema_result = await data_service.get_source_schema(data_source_id)
        if not schema_result.get('success'):
            raise HTTPException(status_code=400, detail=f"Failed to get schema: {schema_result.get('error')}")
        
        raw_schema = schema_result.get('schema', {})
        
        # Generate YAML schema
        result = await yaml_schema_service.generate_yaml_schema(
            data_source_id=data_source_id,
            data_source_type=data_source_type,
            raw_schema=raw_schema,
            user_preferences=user_preferences
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ YAML schema generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/schema/validate")
async def validate_yaml_schema(request: Dict[str, Any]):
    """Validate YAML schema structure and content"""
    try:
        schema_content = request.get('schema_content')
        
        if not schema_content:
            raise HTTPException(status_code=400, detail="schema_content is required")
        
        result = await yaml_schema_service.validate_yaml_schema(schema_content)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ YAML schema validation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/schema/{data_source_id}/verification")
async def get_schema_for_verification(data_source_id: str):
    """Get YAML schema for user verification"""
    try:
        result = await yaml_schema_service.get_schema_for_verification(data_source_id)
        return result
        
    except Exception as e:
        logger.error(f"❌ Failed to get schema for verification: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/schema/{data_source_id}/verify")
async def update_schema_from_verification(data_source_id: str, request: Dict[str, Any]):
    """Update schema based on user verification feedback"""
    try:
        user_feedback = request.get('user_feedback', {})
        
        result = await yaml_schema_service.update_schema_from_verification(
            data_source_id=data_source_id,
            user_feedback=user_feedback
        )
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Schema verification update failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Data Retention Cleanup Endpoint
@router.post("/retention/cleanup")
async def cleanup_data_retention(
    request: Dict[str, Any] = None,
    current_token: Union[str, dict] = Depends(JWTCookieBearer())
):
    """
    Manually trigger data retention cleanup (admin/cron use).
    
    Body (optional):
    {
        "organization_id": int  # Optional: clean specific org, otherwise all orgs
    }
    """
    try:
        # Extract user ID for admin check (optional - can be called by cron without auth)
        user_id = None
        try:
            if isinstance(current_token, dict):
                user_id = current_token.get('id') or current_token.get('user_id') or current_token.get('sub')
            elif isinstance(current_token, str):
                user_payload = extract_user_payload(current_token)
                user_id = user_payload.get('id') or user_payload.get('user_id') or user_payload.get('sub')
        except Exception:
            pass  # Allow cron/system calls without user context
        
        organization_id = None
        if request and isinstance(request, dict):
            org_id = request.get('organization_id')
            if org_id:
                try:
                    organization_id = int(org_id)
                except (ValueError, TypeError):
                    pass
        
        from app.db.session import async_session
        async with async_session() as db:
            from app.modules.data.services.data_retention_service import DataRetentionService
            retention_service = DataRetentionService(db)
            affected = await retention_service.cleanup_expired_file_sources(organization_id)
            
            return {
                "success": True,
                "message": f"Retention cleanup completed",
                "data_sources_affected": affected,
                "organization_id": organization_id
            }
            
    except Exception as e:
        logger.error(f"❌ Data retention cleanup failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Delta Lake and Apache Iceberg Connection Endpoints
@router.post("/delta-iceberg/test")
async def test_delta_iceberg_connection(
    request: Dict[str, Any],
    current_token: Union[str, dict] = Depends(JWTCookieBearer())
):
    """Test connection to Delta Lake or Apache Iceberg table"""
    try:
        format_type = request.get('format_type')  # 'delta' or 'iceberg'
        storage_uri = request.get('storage_uri')
        credentials = request.get('credentials', {})
        
        if not format_type or not storage_uri:
            raise HTTPException(
                status_code=400,
                detail="format_type and storage_uri are required"
            )
        
        result = await delta_iceberg_connector.test_connection(
            format_type=format_type,
            storage_uri=storage_uri,
            credentials=credentials,
            **{k: v for k, v in request.items() if k not in ['format_type', 'storage_uri', 'credentials']}
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Delta/Iceberg connection test failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/delta-iceberg/connect")
async def connect_delta_iceberg(
    request: Dict[str, Any],
    current_token: Union[str, dict] = Depends(JWTCookieBearer())
):
    """Connect to Delta Lake or Apache Iceberg table and create data source"""
    try:
        # Extract user ID
        user_id = None
        organization_id = None
        try:
            if isinstance(current_token, dict):
                user_payload = current_token
            else:
                user_payload = extract_user_payload(current_token)
            
            user_id = str(user_payload.get('id') or user_payload.get('user_id') or user_payload.get('sub') or '')
            organization_id = user_payload.get('organization_id')
        except Exception as e:
            logger.error(f"❌ Failed to extract user_id: {e}")
            user_id = ''
        
        if not user_id:
            raise HTTPException(status_code=403, detail="Authentication required")
        
        # Enforce data source limit
        organization_id = await enforce_data_source_limit(user_id)
        
        format_type = request.get('format_type')  # 'delta', 'iceberg', 's3_parquet', 'azure_blob', 'gcp_cloud_storage'
        storage_uri = request.get('storage_uri')
        credentials = request.get('credentials', {})
        name = request.get('name', f"{format_type}_connection")
        
        if not format_type or not storage_uri:
            raise HTTPException(
                status_code=400,
                detail="format_type and storage_uri are required"
            )
        
        # Test connection first
        test_result = await delta_iceberg_connector.test_connection(
            format_type=format_type,
            storage_uri=storage_uri,
            credentials=credentials,
            **{k: v for k, v in request.items() if k not in ['format_type', 'storage_uri', 'credentials', 'name']}
        )
        
        if not test_result.get('success'):
            raise HTTPException(
                status_code=400,
                detail=f"Connection test failed: {test_result.get('error', 'Unknown error')}"
            )
        
        # Get full connection result with schema and sample data
        if format_type in ['delta', 'delta_lake']:
            connect_result = await delta_iceberg_connector.connect_delta_table(
                storage_uri=storage_uri,
                credentials=credentials,
                version=request.get('version'),
                timestamp=request.get('timestamp'),
                organization_id=organization_id
            )
        elif format_type in ['iceberg']:
            connect_result = await delta_iceberg_connector.connect_iceberg_table(
                storage_uri=storage_uri,
                credentials=credentials,
                snapshot_id=request.get('snapshot_id'),
                organization_id=organization_id
            )
        elif format_type in ['s3_parquet', 'azure_blob', 'gcp_cloud_storage']:
            # For direct cloud storage files (S3, Azure, GCP), use connect_cloud_storage_file
            file_format = request.get('file_format', 'parquet')  # Default to parquet, but supports csv, json, tsv
            connect_result = await delta_iceberg_connector.connect_cloud_storage_file(
                storage_uri=storage_uri,
                credentials=credentials,
                file_format=file_format,
                organization_id=organization_id
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {format_type}")
        
        if not connect_result.get('success'):
            raise HTTPException(
                status_code=400,
                detail=f"Connection failed: {connect_result.get('error', 'Unknown error')}"
            )
        
        # Store data source in database
        from app.db.session import async_session
        async with async_session() as db:
            import uuid
            from datetime import datetime
            
            data_source_id = str(uuid.uuid4())
            schema_json = json.dumps(connect_result.get('schema', []))
            
            # Encrypt credentials
            from app.modules.data.utils.encryption import encrypt_credentials
            safe_credentials = encrypt_credentials(credentials)
            
            connection_config = {
                'storage_uri': storage_uri,
                'format_type': format_type,
                'credentials': safe_credentials,
                **{k: v for k, v in request.items() if k not in ['format_type', 'storage_uri', 'credentials', 'name']}
            }
            
            insert_query = sa.text("""
                INSERT INTO data_sources 
                (id, name, type, format, db_type, size, row_count, schema, 
                 connection_config, metadata, user_id, is_active, 
                 created_at, updated_at, last_accessed, file_path)
                VALUES 
                (:id, :name, :type, :format, :db_type, :size, :row_count, :schema,
                 :connection_config, :metadata, :user_id, :is_active,
                 :created_at, :updated_at, :last_accessed, :file_path)
            """)
            
            await db.execute(insert_query, {
                "id": data_source_id,
                "name": name,
                "type": 'warehouse',
                "format": format_type,
                "db_type": format_type,
                "size": 0,
                "row_count": connect_result.get('row_count', 0),
                "schema": schema_json,
                "connection_config": json.dumps(connection_config),
                "metadata": json.dumps({
                    'connection_type': 'delta_iceberg',
                    'storage_uri': storage_uri,
                    'format': format_type,
                    'status': 'connected',
                    'created_at': datetime.now().isoformat()
                }),
                "user_id": user_id,
                "is_active": True,
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
                "last_accessed": datetime.now(),
                "file_path": storage_uri  # Store URI as file_path for query service
            })
            
            await db.commit()
        
        return {
            "success": True,
            "data_source_id": data_source_id,
            "data_source": {
                "id": data_source_id,
                "name": name,
                "type": "warehouse",
                "format": format_type,
                "db_type": format_type,
                "status": "connected",
                "schema": connect_result.get('schema', []),
                "row_count": connect_result.get('row_count', 0)
            },
            "message": f"{format_type} connection created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Delta/Iceberg connection failed: {str(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/schema/{data_source_id}/export")
async def export_schema(data_source_id: str, format: str = 'yaml'):
    """Export schema in various formats"""
    try:
        result = await yaml_schema_service.export_schema(data_source_id, format)
        return result
        
    except Exception as e:
        logger.error(f"❌ Schema export failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))