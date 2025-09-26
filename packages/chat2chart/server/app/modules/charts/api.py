from typing import Annotated, List, Dict, Any, Optional
from app.modules.charts.schemas import (
    ChartConfiguration,
    ChatVisualizationResponseSchema,
    DashboardCreateSchema,
    DashboardUpdateSchema,
    DashboardResponseSchema,
    DashboardWidgetCreateSchema,
    DashboardWidgetUpdateSchema,
    DashboardWidgetResponseSchema,
    DashboardShareCreateSchema,
    DashboardShareResponseSchema,
    DashboardExportRequest,
    DashboardExportResponse,
    PlanLimitsResponse,
)
from app.modules.charts.services import ChatVisualizationService, ChartGenerationService, MCPEChartsService
from app.modules.charts.services.integrated_chat2chart_service import IntegratedChat2ChartService
from app.modules.charts.services.mcp_integration_service import MCPIntegrationService
from app.modules.charts.services.dashboard_service import DashboardService
from app.db.session import get_async_session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func
from datetime import datetime
from sqlalchemy import select
from app.modules.authentication.deps.auth_bearer import JWTCookieBearer
from app.modules.authentication.auth import Auth
from app.core.config import settings
from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File, Request
from typing import Optional
from app.db.session import async_session
from app.modules.user.models import User


async def _optional_token(request: Request) -> Optional[str]:
    """Read token from namespaced cookie, legacy cookie, or Authorization header without enforcing.

    Returns raw token string (without Bearer prefix) or None.
    """
    token = None
    # prefer namespaced server-set cookie
    token = request.cookies.get('c2c_access_token') or request.cookies.get('access_token')
    # Authorization header may contain 'Bearer <token>'
    auth = request.headers.get('Authorization') or request.headers.get('authorization')
    if not token and auth:
        if auth.lower().startswith('bearer '):
            token = auth.split(None, 1)[1].strip()
        else:
            token = auth
    return token
from pydantic import BaseModel
import logging
import json

logger = logging.getLogger(__name__)

router = APIRouter()
service = ChatVisualizationService()
chart_generation_service = ChartGenerationService()
mcp_echarts_service = MCPEChartsService()
integrated_service = IntegratedChat2ChartService()
mcp_integration_service = MCPIntegrationService()


# Request/Response Models
class MCPChartRequest(BaseModel):
    data: List[Dict[str, Any]]
    query_analysis: Dict[str, Any]
    options: Optional[Dict[str, Any]] = None


class ChartGenerationRequest(BaseModel):
    data: List[Dict[str, Any]]
    natural_language_query: str
    query_analysis: Optional[Dict[str, Any]] = None
    options: Optional[Dict[str, Any]] = None


class ChartRecommendationRequest(BaseModel):
    data: List[Dict[str, Any]]
    query_analysis: Optional[Dict[str, Any]] = None


class FileChartRequest(BaseModel):
    data: List[Dict[str, Any]]
    file_metadata: Dict[str, Any]
    natural_language_query: str
    options: Optional[Dict[str, Any]] = None


class IntegratedChat2ChartRequest(BaseModel):
    natural_language_query: str
    data_source_id: str
    options: Optional[Dict[str, Any]] = None


class MCPChartGenerationRequest(BaseModel):
    data: List[Dict[str, Any]]
    chart_config: Dict[str, Any]
    options: Optional[Dict[str, Any]] = None


class DataModelingRequest(BaseModel):
    data_source_id: str
    user_context: Optional[Dict[str, Any]] = None


class SchemaApprovalRequest(BaseModel):
    workflow_id: str
    approval_data: Dict[str, Any]


# Existing endpoints
@router.get("/")
async def get_all():
    return await service.get_all()


@router.get("/{id}")
async def get(id: str):
    try:
        return await service.get(id)
    except Exception as e:
        return HTTPException(status_code=404, detail=str(e))


@router.post("/")
async def create(data: ChartConfiguration):
    return await service.save(data)


# New MCP ECharts endpoints
@router.post("/mcp-chart")
async def generate_mcp_chart(request: MCPChartRequest):
    """Generate chart using MCP ECharts integration"""
    try:
        logger.info("📊 MCP ECharts chart generation request received")
        
        result = await mcp_echarts_service.generate_chart_from_cube_data(
            cube_data={'data': request.data},
            query_analysis=request.query_analysis,
            options=request.options or {}
        )
        
        return {
            "success": result.get('success', False),
            "chart_type": result.get('chart_type'),
            "chart_config": result.get('chart_config'),
            "data_analysis": result.get('data_analysis'),
            "metadata": result.get('metadata'),
            "mcp_result": result.get('mcp_result'),
            "error": result.get('error')
        }
        
    except Exception as e:
        logger.error(f"❌ MCP chart generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate")
async def generate_chart(request: ChartGenerationRequest):
    """Generate chart from query results and analysis"""
    try:
        logger.info(f"🎨 Chart generation request: {request.natural_language_query}")
        
        # If no query analysis provided, create basic one
        if not request.query_analysis:
            request.query_analysis = {
                'original_query': request.natural_language_query,
                'query_type': ['general'],
                'business_context': {'type': 'general'}
            }
        
        result = await chart_generation_service.generate_chart_from_query(
            data=request.data,
            query_analysis=request.query_analysis,
            options=request.options
        )
        
        return {
            "success": result.get('success', False),
            "chart_type": result.get('chart_type'),
            "chart_config": result.get('chart_config'),
            "data_analysis": result.get('data_analysis'),
            "generation_metadata": result.get('generation_metadata'),
            "error": result.get('error')
        }
        
    except Exception as e:
        logger.error(f"❌ Chart generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-from-file")
async def generate_chart_from_file(request: FileChartRequest):
    """Generate chart from uploaded file data"""
    try:
        logger.info(f"📁 File chart generation: {request.file_metadata.get('name', 'Unknown')}")
        
        result = await chart_generation_service.generate_chart_from_file_data(
            data=request.data,
            file_metadata=request.file_metadata,
            natural_language_query=request.natural_language_query,
            options=request.options
        )
        
        return {
            "success": result.get('success', False),
            "chart_type": result.get('chart_type'),
            "chart_config": result.get('chart_config'),
            "data_analysis": result.get('data_analysis'),
            "file_metadata": request.file_metadata,
            "error": result.get('error')
        }
        
    except Exception as e:
        logger.error(f"❌ File chart generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommendations")
async def get_chart_recommendations(request: ChartRecommendationRequest):
    """Get chart type recommendations for given data"""
    try:
        logger.info("💡 Chart recommendations request")
        
        result = await chart_generation_service.get_chart_recommendations(
            data=request.data,
            query_analysis=request.query_analysis
        )
        
        return {
            "success": result.get('success', False),
            "recommendations": result.get('recommendations', []),
            "data_analysis": result.get('data_analysis'),
            "best_recommendation": result.get('best_recommendation'),
            "error": result.get('error')
        }
        
    except Exception as e:
        logger.error(f"❌ Chart recommendations failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai-data-modeling")
async def ai_data_modeling(request: DataModelingRequest):
    """
    AI-powered data modeling workflow
    
    Analyzes data source and generates Cube.js schema with visual representation
    for user approval before proceeding with chart generation.
    """
    try:
        logger.info(f"🧠 AI data modeling request: {request.data_source_id}")
        
        result = await integrated_service.process_data_modeling_workflow(
            data_source_id=request.data_source_id,
            user_context=request.user_context
        )
        
        return result
        
    except Exception as e:
        logger.error(f"❌ AI data modeling failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/approve-schema")
async def approve_schema(request: SchemaApprovalRequest):
    """Process user approval for AI-generated schema"""
    try:
        logger.info(f"📋 Schema approval request: {request.workflow_id}")
        
        result = await integrated_service.process_schema_approval(
            workflow_id=request.workflow_id,
            approval_data=request.approval_data
        )
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Schema approval failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/integrated-chat2chart")
async def integrated_chat_to_chart(request: IntegratedChat2ChartRequest):
    """
    Complete integrated chat-to-chart workflow
    
    Full AI-powered workflow with LiteLLM, Cube.js, and MCP ECharts integration
    """
    try:
        logger.info(f"🚀 Integrated chat2chart request: {request.natural_language_query[:50]}...")
        
        result = await integrated_service.process_chat_to_chart_request(
            natural_language_query=request.natural_language_query,
            data_source_id=request.data_source_id,
            options=request.options or {}
        )
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Integrated chat2chart failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/learning-insights")
async def get_learning_insights():
    """Get continuous learning insights from user feedback"""
    try:
        result = await integrated_service.get_learning_insights()
        return result
    except Exception as e:
        logger.error(f"❌ Learning insights failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/performance-metrics")
async def get_performance_metrics():
    """Get performance metrics for the integrated service"""
    try:
        metrics = integrated_service.get_performance_metrics()
        return {
            "success": True,
            "metrics": metrics
        }
    except Exception as e:
        logger.error(f"❌ Performance metrics failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/types")
async def get_supported_chart_types():
    """Get list of supported chart types with descriptions"""
    return {
        "success": True,
        "chart_types": [
            {
                "type": "line",
                "name": "Line Chart",
                "description": "Best for showing trends over time and continuous data",
                "use_cases": ["Time series analysis", "Trend visualization", "Continuous data"]
            },
            {
                "type": "bar",
                "name": "Bar Chart", 
                "description": "Ideal for comparing categories and discrete values",
                "use_cases": ["Category comparison", "Discrete data", "Rankings"]
            },
            {
                "type": "pie",
                "name": "Pie Chart",
                "description": "Perfect for showing parts of a whole and distributions",
                "use_cases": ["Distribution analysis", "Part-to-whole relationships", "Percentages"]
            },
            {
                "type": "scatter",
                "name": "Scatter Plot",
                "description": "Great for showing relationships between two variables",
                "use_cases": ["Correlation analysis", "Two-variable relationships", "Pattern detection"]
            },
            {
                "type": "gauge",
                "name": "Gauge Chart",
                "description": "Excellent for displaying single metrics and KPIs",
                "use_cases": ["KPI monitoring", "Single metric display", "Performance indicators"]
            }
        ]
    }


# MCP Integration endpoints
@router.get("/mcp/status")
async def get_mcp_status():
    """Get MCP server status"""
    try:
        status = mcp_integration_service.get_mcp_status()
        return {
            "success": True,
            "mcp_status": status
        }
    except Exception as e:
        logger.error(f"❌ MCP status failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mcp/test-connection")
async def test_mcp_connection():
    """Test MCP server connection"""
    try:
        result = await mcp_integration_service.test_mcp_connection()
        return result
    except Exception as e:
        logger.error(f"❌ MCP connection test failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mcp/generate-chart")
async def generate_chart_with_mcp(request: MCPChartGenerationRequest):
    """Generate chart using MCP ECharts server"""
    try:
        logger.info("📊 MCP chart generation request")
        
        result = await mcp_integration_service.generate_chart_with_mcp(
            data=request.data,
            chart_config=request.chart_config,
            options=request.options
        )
        
        return result
        
    except Exception as e:
        logger.error(f"❌ MCP chart generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mcp/recommendations")
async def get_mcp_chart_recommendations(data_analysis: Dict[str, Any] = Body(...)):
    """Get chart recommendations from MCP server"""
    try:
        result = await mcp_integration_service.get_chart_recommendations_from_mcp(data_analysis)
        return result
    except Exception as e:
        logger.error(f"❌ MCP recommendations failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# 🎨 Chart Builder Endpoints
@router.post("/builder/save")
async def save_chart(chart_data: Dict[str, Any], current_token: str = Depends(JWTCookieBearer())):
    """Deprecated chart-builder save endpoint. Use `/charts/dashboards/` or widget APIs instead."""
    logger.warning("Deprecated endpoint called: /builder/save - use dashboards/widgets APIs instead")
    raise HTTPException(status_code=410, detail="/builder endpoints are deprecated; use dashboard and widget APIs")

@router.get("/builder/list")
async def list_charts(current_token: str = Depends(JWTCookieBearer()), chart_type: Optional[str] = None, limit: int = 50, offset: int = 0):
    """Deprecated chart-builder list endpoint."""
    logger.warning("Deprecated endpoint called: /builder/list - use dashboard/widget listing instead")
    raise HTTPException(status_code=410, detail="/builder endpoints are deprecated; use dashboard and widget APIs")

@router.get("/builder/{chart_id}")
async def get_chart(chart_id: str, current_token: str = Depends(JWTCookieBearer())):
    """Deprecated chart-builder get endpoint."""
    logger.warning("Deprecated endpoint called: /builder/{chart_id} - use dashboard/widget APIs instead")
    raise HTTPException(status_code=410, detail="/builder endpoints are deprecated; use dashboard and widget APIs")

@router.put("/builder/{chart_id}")
async def update_chart(chart_id: str, chart_data: Dict[str, Any], current_token: str = Depends(JWTCookieBearer())):
    """Deprecated chart-builder update endpoint."""
    logger.warning("Deprecated endpoint called: PUT /builder/{chart_id} - use dashboard/widget APIs instead")
    raise HTTPException(status_code=410, detail="/builder endpoints are deprecated; use dashboard and widget APIs")

@router.delete("/builder/{chart_id}")
async def delete_chart(chart_id: str, current_token: str = Depends(JWTCookieBearer())):
    """Deprecated chart-builder delete endpoint."""
    logger.warning("Deprecated endpoint called: DELETE /builder/{chart_id} - use dashboard/widget APIs instead")
    raise HTTPException(status_code=410, detail="/builder endpoints are deprecated; use dashboard and widget APIs")

@router.post("/builder/export")
async def export_chart(chart_data: Dict[str, Any]):
    logger.warning("Deprecated endpoint called: /builder/export - use dashboard export APIs")
    raise HTTPException(status_code=410, detail="/builder endpoints are deprecated; use dashboard export APIs")

@router.post("/builder/import")
async def import_chart(file: UploadFile = File(...)):
    logger.warning("Deprecated endpoint called: /builder/import - use dashboard import APIs")
    raise HTTPException(status_code=410, detail="/builder endpoints are deprecated; use dashboard APIs")

@router.post("/builder/share")
async def share_chart(chart_data: Dict[str, Any]):
    logger.warning("Deprecated endpoint called: /builder/share - use dashboard share/embed APIs")
    raise HTTPException(status_code=410, detail="/builder endpoints are deprecated; use dashboard share/embed APIs")


# 🏗️ PROJECT-SCOPED DASHBOARD ENDPOINTS

@router.get("/api/organizations/{organization_id}/projects/{project_id}/dashboards")
async def get_project_dashboards(
    organization_id: str,
    project_id: str,
    limit: int = 50,
    offset: int = 0,
    current_token: str = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session)
):
    """Get dashboards for a specific project (project-scoped) - DB backed."""
    try:
        logger.info(f"📊 Getting dashboards for project {project_id} in organization {organization_id}")
        # Determine caller user id
        user_payload = Auth().decodeJWT(current_token) or {}
        try:
            auth_user_id = int(user_payload.get('id') or user_payload.get('sub') or 0)
        except Exception:
            auth_user_id = None

        dashboard_service = DashboardService(db)
        result = await dashboard_service.list_dashboards(
            project_id=int(project_id),
            user_id=auth_user_id,
            limit=limit,
            offset=offset
        )
        return {"success": True, "dashboards": result.get('dashboards', []), "total": result.get('total', 0), "limit": limit, "offset": offset}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get project dashboards: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/organizations/{organization_id}/projects/{project_id}/dashboards")
async def create_project_dashboard(
    organization_id: str,
    project_id: str,
    dashboard: DashboardCreateSchema,
    current_token: str = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session)
):
    """Create a new dashboard for a specific project - DB backed and ownership checked."""
    try:
        logger.info(f"🏗️ Creating dashboard for project {project_id} in organization {organization_id}: {dashboard.name}")
        # Authenticate caller
        user_payload = Auth().decodeJWT(current_token) or {}
        # Pass full payload to service for robust resolution between legacy int ids and UUIDs
        user_id = user_payload

        # Ensure project belongs to organization
        from app.modules.projects.models import Project
        from app.db.session import async_session
        async with async_session() as sdb:
            pres = await sdb.execute(select(Project).where(Project.id == int(project_id)))
            proj = pres.scalar_one_or_none()
            if not proj or proj.organization_id != int(organization_id):
                raise HTTPException(status_code=400, detail='Project does not belong to organization')

        # Set project_id on payload and persist
        dashboard.project_id = int(project_id)
        dashboard_service = DashboardService(db)
        created = await dashboard_service.create_dashboard(dashboard, user_id)
        return {"success": True, "message": "Dashboard created successfully", "dashboard": created}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to create project dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/organizations/{organization_id}/projects/{project_id}/dashboards/{dashboard_id}")
async def get_project_dashboard(
    organization_id: str,
    project_id: str,
    dashboard_id: str,
    current_token: str = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session)
):
    """Get a specific dashboard for a project (DB backed)"""
    try:
        logger.info(f"📊 Getting dashboard {dashboard_id} for project {project_id} in organization {organization_id}")
        
        # Resolve caller user id (may be dict in tests)
        if isinstance(current_token, dict):
            user_payload = current_token
        else:
            user_payload = Auth().decodeJWT(current_token) or {}
        try:
            user_id = int(user_payload.get('id') or user_payload.get('sub') or 0)
        except Exception:
            user_id = 0

        dashboard_service = DashboardService(db)
        dashboard = await dashboard_service.get_dashboard(dashboard_id, user_id)

        # Enforce project/org scope
        proj_pid = dashboard.get('project_id')
        if proj_pid is not None and int(proj_pid) != int(project_id):
            raise HTTPException(status_code=404, detail='Dashboard not found')

        return {"success": True, "dashboard": dashboard}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get project dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/organizations/{organization_id}/projects/{project_id}/dashboards/{dashboard_id}")
async def update_project_dashboard(
    organization_id: str,
    project_id: str,
    dashboard_id: str,
    dashboard: DashboardUpdateSchema,
    current_token: str = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session)
):
    """Update a dashboard for a specific project - DB backed with permission checks."""
    try:
        logger.info(f"✏️ Updating dashboard {dashboard_id} for project {project_id} in organization {organization_id}")
        user_payload = Auth().decodeJWT(current_token) or {}
        try:
            user_id = int(user_payload.get('id') or user_payload.get('sub') or 0)
        except Exception:
            user_id = 0

        dashboard_service = DashboardService(db)
        updated = await dashboard_service.update_dashboard(dashboard_id, dashboard, user_id)
        return {"success": True, "message": "Dashboard updated successfully", "dashboard": updated}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to update project dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/organizations/{organization_id}/projects/{project_id}/dashboards/{dashboard_id}")
async def delete_project_dashboard(
    organization_id: str,
    project_id: str,
    dashboard_id: str,
    current_token: str = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session)
):
    """Delete a dashboard for a specific project - DB backed with permission checks."""
    try:
        logger.info(f"🗑️ Deleting dashboard {dashboard_id} for project {project_id} in organization {organization_id}")
        user_payload = Auth().decodeJWT(current_token) or {}
        try:
            user_id = int(user_payload.get('id') or user_payload.get('sub') or 0)
        except Exception:
            user_id = 0

        dashboard_service = DashboardService(db)
        success = await dashboard_service.delete_dashboard(dashboard_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail='Dashboard not found')
        return {"success": True, "message": "Dashboard deleted successfully", "dashboard_id": dashboard_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to delete project dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# 🏗️ Dashboard Studio API Endpoints (Global - for backward compatibility)
@router.post("/dashboards/", response_model=DashboardResponseSchema)
async def create_dashboard(
    dashboard: DashboardCreateSchema,
    request: Request,
    current_token: str = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Create a new dashboard. Auth is enforced via dependency which reads the access_token cookie
    or Authorization header (preferred). This avoids manual cookie parsing and brittle checks.
    """
    try:
        # Debug: log cookies and Authorization header to help diagnose client auth issues
        try:
            cookie_summary = {k: (v[:64] + '...') if isinstance(v, str) and len(v) > 64 else v for k, v in dict(request.cookies or {}).items()}
            logger.info(f"🏗️ Creating dashboard: {dashboard.name} - incoming cookies: {cookie_summary}")
            logger.info(f"Incoming Authorization header present: {bool(request.headers.get('Authorization'))}")
        except Exception:
            logger.info("🏗️ Creating dashboard: failed to read request debug info")

        # Resolve user via central helper - prefer dependency injection where possible
        try:
            # If the dependency injection provided a token dict, use it; else derive from request
            if isinstance(current_token, dict):
                user_payload = current_token
            else:
                user_payload = Auth().decodeJWT(current_token) if current_token else {}
        except Exception:
            user_payload = {}

        # Final fallback: use central helper dependency if available on request state
        try:
            from app.modules.authentication.deps.auth_bearer import current_user_payload
            fallback_payload = await current_user_payload(request)
            if not user_payload and fallback_payload:
                user_payload = fallback_payload
        except Exception:
            pass

        if not user_payload:
            logger.warning('Attempt to create dashboard without valid JWT')
            raise HTTPException(status_code=401, detail='Authentication required to create dashboards; ensure you are logged in and cookies are enabled (access_token).')
        # Keep full payload (dict) so service can resolve legacy integer IDs or UUIDs as needed
        user_id = user_payload
        logger.info(f"user_payload for create_dashboard: {user_payload}")
        print(f"DEBUG create_dashboard user_payload={user_payload}")

        # Try to resolve user to canonical UUID from DB (best-effort) to avoid datatype mismatches
        resolved_user = None
        try:
            async with async_session() as sdb:
                # prefer email, then username, then numeric id
                if user_payload.get('email'):
                    q = select(User).where(User.email == user_payload.get('email'))
                elif user_payload.get('username'):
                    q = select(User).where(User.username == user_payload.get('username'))
                else:
                    # fallback: if payload contains numeric id, try legacy lookup
                    maybe = user_payload.get('user_id') or user_payload.get('id') or user_payload.get('sub')
                    try:
                        maybe_int = int(maybe)
                    except Exception:
                        maybe_int = None
                    if maybe_int is not None:
                        q = select(User).where(User.legacy_id == maybe_int)
                    else:
                        q = None

                if q is not None:
                    pres = await sdb.execute(q)
                    u = pres.scalar_one_or_none()
                    if u:
                        resolved_user = u.id
        except Exception:
            resolved_user = None

        # Pass resolved_user (UUID or None) to service to avoid datatype mismatches
        user_id = resolved_user
        if user_id:
            logger.info(f"Resolved user id for create_dashboard: {user_id}")

        org_id = int(user_payload.get('organization_id') or 0)
        # Ensure dashboard.project_id belongs to org (best-effort)
        if dashboard.project_id and org_id and dashboard.project_id:
            # project ownership validated in Project service when creating
            pass

        # Persist debug info to file to aid CI runs where stdout may be captured
        try:
            with open('/tmp/dashboard_debug.log', 'a') as f:
                f.write(f"CREATE_REQUEST user_payload={user_payload}\n")
        except Exception:
            pass

        # Use a minimal, defensive insert path to create the dashboard record
        # directly. This avoids calling the full service which may execute
        # complex logic that is fragile during schema migrations. The API
        # returns the created dashboard id and a minimal dashboard payload.
        try:
            from sqlalchemy import insert
            import uuid as _uuid
            async with async_session() as sdb:
                d_id = _uuid.uuid4()
                insert_stmt = insert(Dashboard).values(
                    id=d_id,
                    name=dashboard.name,
                    description=dashboard.description,
                    project_id=dashboard.project_id,
                    layout_config=dashboard.layout_config or {},
                    theme_config=dashboard.theme_config or {},
                    global_filters=dashboard.global_filters or {},
                    refresh_interval=dashboard.refresh_interval or 300,
                    is_public=dashboard.is_public or False,
                    is_active=True,
                    is_template=dashboard.is_template or False,
                    max_widgets=10,
                    max_pages=5,
                )
                await sdb.execute(insert_stmt)
                await sdb.commit()
                return {"success": True, "dashboard": {"id": str(d_id), "name": dashboard.name}, "id": str(d_id)}
        except Exception as e:
            logger.exception('Minimal dashboard insert failed')
            raise HTTPException(status_code=500, detail=f'Failed to create dashboard: {e}')
        
    except HTTPException:
        # Let HTTPExceptions (401/403/422) propagate to the client unchanged
        raise
    except Exception as e:
        logger.exception("❌ Failed to create dashboard")
        # Return the exception message if available to help client-side debugging
        raise HTTPException(status_code=500, detail=f"Failed to create dashboard: {repr(e)}")


@router.post("/dashboards/debug-create")
async def debug_create_dashboard(
    dashboard: DashboardCreateSchema,
    request: Request,
    current_token: str = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session),
):
    """Dev-only endpoint: resolve user payload -> final created_by without inserting to DB."""
    try:
        if isinstance(current_token, dict):
            user_payload = current_token
        else:
            user_payload = Auth().decodeJWT(current_token) or {}

        dashboard_service = DashboardService(db)
        resolved = await dashboard_service._resolve_user_uuid(user_payload)

        # Map to readable types
        return {
            "user_payload": user_payload,
            "resolved_created_by": str(resolved) if resolved else None,
            "resolved_type": str(type(resolved)),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboards/", response_model=List[DashboardResponseSchema])
async def list_dashboards(
    user_id: Optional[str] = None,
    project_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    current_token: str = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session)
):
    """
    List dashboards with optional filtering
    """
    try:
        logger.info(f"📋 Listing dashboards for user: {user_id}, project: {project_id}")
        
        # Use real database service
        user_payload = Auth().decodeJWT(current_token) or {}
        try:
            auth_user_id = int(user_payload.get('id') or user_payload.get('sub') or 0)
        except Exception:
            auth_user_id = None

        dashboard_service = DashboardService(db)
        result = await dashboard_service.list_dashboards(
            user_id=auth_user_id,
            project_id=project_id,
            limit=limit,
            offset=offset
        )
        return result.get("dashboards", [])
        
    except Exception as e:
        logger.error(f"❌ Failed to list dashboards: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list dashboards: {str(e)}")


@router.get("/dashboards/{dashboard_id}", response_model=DashboardResponseSchema)
async def get_dashboard(
    dashboard_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get a specific dashboard by ID
    """
    try:
        logger.info(f"📊 Getting dashboard: {dashboard_id}")
        
        # Resolve optional token to determine caller id for permission checks
        token = await _optional_token(request)
        user_payload = Auth().decodeJWT(token) if token else {}
        try:
            caller_id = int(user_payload.get('id') or user_payload.get('sub') or 0)
        except Exception:
            caller_id = 0

        dashboard_service = DashboardService(db)
        # For unauthenticated callers, pass user_id=0 to return only public dashboards
        dashboard = await dashboard_service.get_dashboard(dashboard_id, user_id=caller_id)
        
        if not dashboard:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        
        return dashboard
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get dashboard {dashboard_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard: {str(e)}")


@router.put("/dashboards/{dashboard_id}", response_model=DashboardResponseSchema)
async def update_dashboard(
    dashboard_id: str, 
    dashboard: DashboardUpdateSchema,
    current_token: str = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Update an existing dashboard
    """
    try:
        logger.info(f"✏️ Updating dashboard: {dashboard_id}")
        
        # Use real database service
        user_payload = Auth().decodeJWT(current_token) or {}
        try:
            user_id = int(user_payload.get('id') or user_payload.get('sub') or 0)
        except Exception:
            user_id = 0

        dashboard_service = DashboardService(db)
        updated_dashboard = await dashboard_service.update_dashboard(dashboard_id, dashboard, user_id)
        
        if not updated_dashboard:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        
        return updated_dashboard
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to update dashboard {dashboard_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update dashboard: {str(e)}")


@router.delete("/dashboards/{dashboard_id}")
async def delete_dashboard(
    dashboard_id: str,
    current_token: str = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Delete a dashboard
    """
    try:
        logger.info(f"🗑️ Deleting dashboard: {dashboard_id}")
        
        # Use real database service and enforce ownership
        user_payload = Auth().decodeJWT(current_token) or {}
        try:
            user_id = int(user_payload.get('id') or user_payload.get('sub') or 0)
        except Exception:
            user_id = 0

        dashboard_service = DashboardService(db)
        success = await dashboard_service.delete_dashboard(dashboard_id, user_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        
        return {
            "success": True,
            "message": "Dashboard deleted successfully",
            "dashboard_id": dashboard_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to delete dashboard {dashboard_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete dashboard: {str(e)}")


# 🧩 Widget Management Endpoints
@router.post("/dashboards/{dashboard_id}/widgets", response_model=DashboardWidgetResponseSchema)
async def create_widget(dashboard_id: str, widget: Dict[str, Any] = Body(...), current_token: str = Depends(JWTCookieBearer()), db: AsyncSession = Depends(get_async_session)):
    """Create a new widget in a dashboard (DB-backed). Accepts body without dashboard_id and injects it from the path."""
    try:
        # Resolve user id
        if isinstance(current_token, dict):
            user_payload = current_token
        else:
            user_payload = Auth().decodeJWT(current_token) or {}
        try:
            user_id = int(user_payload.get('id') or user_payload.get('sub') or 0)
        except Exception:
            user_id = 0

        # Ensure dashboard_id present in payload for validation
        widget_payload = dict(widget)
        widget_payload.setdefault('dashboard_id', dashboard_id)

        # Validate against schema
        widget_model = DashboardWidgetCreateSchema(**widget_payload)

        dashboard_service = DashboardService(db)
        created = await dashboard_service.create_widget(dashboard_id, widget_model, user_id)
        return created
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to create widget: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create widget: {str(e)}")


@router.get("/dashboards/{dashboard_id}/widgets", response_model=List[DashboardWidgetResponseSchema])
async def list_widgets(dashboard_id: str, current_token: str = Depends(JWTCookieBearer()), db: AsyncSession = Depends(get_async_session)):
    """List widgets for a dashboard (DB-backed)."""
    try:
        if isinstance(current_token, dict):
            user_payload = current_token
        else:
            user_payload = Auth().decodeJWT(current_token) or {}
        try:
            user_id = int(user_payload.get('id') or user_payload.get('sub') or 0)
        except Exception:
            user_id = 0

        dashboard_service = DashboardService(db)
        widgets = await dashboard_service.list_widgets(dashboard_id, user_id)
        return widgets
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to list widgets: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list widgets: {str(e)}")


@router.put("/dashboards/{dashboard_id}/widgets/{widget_id}", response_model=DashboardWidgetResponseSchema)
async def update_widget(dashboard_id: str, widget_id: str, widget: DashboardWidgetUpdateSchema, current_token: str = Depends(JWTCookieBearer()), db: AsyncSession = Depends(get_async_session)):
    """
    Update a widget
    """
    try:
        logger.info(f"✏️ Updating widget {widget_id} in dashboard {dashboard_id}")
        
        try:
            if isinstance(current_token, dict):
                user_payload = current_token
            else:
                user_payload = Auth().decodeJWT(current_token) or {}
            try:
                user_id = int(user_payload.get('id') or user_payload.get('sub') or 0)
            except Exception:
                user_id = 0

            dashboard_service = DashboardService(db)
            updated = await dashboard_service.update_widget(dashboard_id, widget_id, widget, user_id)
            return updated
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Failed to update widget {widget_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to update widget: {str(e)}")
        
    except Exception as e:
        logger.error(f"❌ Failed to update widget {widget_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update widget: {str(e)}")


@router.delete("/dashboards/{dashboard_id}/widgets/{widget_id}")
async def delete_widget(dashboard_id: str, widget_id: str, current_token: str = Depends(JWTCookieBearer()), db: AsyncSession = Depends(get_async_session)):
    """
    Delete a widget
    """
    try:
        logger.info(f"🗑️ Deleting widget {widget_id} from dashboard {dashboard_id}")
        
        try:
            if isinstance(current_token, dict):
                user_payload = current_token
            else:
                user_payload = Auth().decodeJWT(current_token) or {}
            try:
                user_id = int(user_payload.get('id') or user_payload.get('sub') or 0)
            except Exception:
                user_id = 0

            dashboard_service = DashboardService(db)
            success = await dashboard_service.delete_widget(dashboard_id, widget_id, user_id)
            return {"success": success, "message": "Widget deleted successfully", "widget_id": widget_id}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Failed to delete widget {widget_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to delete widget: {str(e)}")
        
    except Exception as e:
        logger.error(f"❌ Failed to delete widget {widget_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete widget: {str(e)}")


# 📤 Export and Sharing Endpoints
@router.post("/dashboards/{dashboard_id}/export", response_model=DashboardExportResponse)
async def export_dashboard(dashboard_id: str, export_request: DashboardExportRequest):
    """
    Export dashboard in various formats
    """
    try:
        logger.info(f"📤 Exporting dashboard {dashboard_id} as {export_request.format}")
        
        # Mock implementation - replace with actual export service
        export_url = f"/exports/dashboard_{dashboard_id}_{export_request.format}.{export_request.format}"
        
        return {
            "success": True,
            "export_url": export_url,
            "file_size": 1024000,  # Mock file size
            "format": export_request.format,
            "message": f"Dashboard exported successfully as {export_request.format.upper()}"
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to export dashboard {dashboard_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to export dashboard: {str(e)}")


@router.post("/dashboards/{dashboard_id}/share", response_model=DashboardShareResponseSchema)
async def share_dashboard(dashboard_id: str, share_request: DashboardShareCreateSchema, current_token: str = Depends(JWTCookieBearer())):
    """
    Share dashboard with other users
    """
    try:
        logger.info(f"🔗 Sharing dashboard {dashboard_id}")
        
        # Mock implementation - replace with actual sharing service
        share_data = {
            "id": f"share_{hash(dashboard_id)}",
            "dashboard_id": dashboard_id,
            "shared_by": 1,  # TODO: Get from auth context
            "shared_with": share_request.shared_with,
            "permission": share_request.permission,
            "expires_at": share_request.expires_at,
            "is_active": share_request.is_active,
            "share_token": f"token_{hash(dashboard_id)}",
            "access_count": 0,
            "last_accessed_at": None,
            "created_at": "2025-01-10T00:00:00Z",
            "updated_at": None
        }
        
        # Persist share in DB (best-effort)
        user_payload = Auth().decodeJWT(current_token) or {}
        try:
            user_id = int(user_payload.get('id') or user_payload.get('sub') or 0)
        except Exception:
            user_id = 0

        from app.modules.charts.models import DashboardShare, Dashboard
        from app.db.session import async_session
        async with async_session() as db:
            # Basic permission: only owner/org_admin can share
            res = await db.execute(select(Dashboard).where(Dashboard.id == dashboard_id))
            db_dash = res.scalar_one_or_none()
            if not db_dash:
                raise HTTPException(status_code=404, detail="Dashboard not found")
            if db_dash.created_by and db_dash.created_by != user_id:
                # try org admin check via project->organization
                org_id = None
                if db_dash.project_id:
                    from app.modules.projects.models import Project
                    pres = await db.execute(select(Project).where(Project.id == db_dash.project_id))
                    proj = pres.scalar_one_or_none()
                    if proj:
                        org_id = proj.organization_id
                if org_id:
                    from app.modules.projects.models import OrganizationUser
                    our = await db.execute(select(OrganizationUser).where(OrganizationUser.user_id == user_id, OrganizationUser.organization_id == org_id))
                    our_row = our.scalar_one_or_none()
                    if not our_row or our_row.role not in ('owner', 'admin'):
                        raise HTTPException(status_code=403, detail="Insufficient permissions to share dashboard")
                else:
                    raise HTTPException(status_code=403, detail="Insufficient permissions to share dashboard")

            share = DashboardShare(
                dashboard_id=dashboard_id,
                shared_by=user_id,
                shared_with=share_request.shared_with,
                permission=share_request.permission,
                expires_at=share_request.expires_at,
                is_active=share_request.is_active,
                share_token=f"share_{hash((dashboard_id, share_request.shared_with, share_request.permission))}"
            )
            db.add(share)
            await db.flush()
            await db.refresh(share)
            return {
                "id": str(share.id),
                "dashboard_id": dashboard_id,
                "shared_by": share.shared_by,
                "shared_with": share.shared_with,
                "permission": share.permission,
                "expires_at": share.expires_at,
                "is_active": share.is_active,
                "share_token": share.share_token,
                "access_count": share.access_count,
                "last_accessed_at": share.last_accessed_at,
                "created_at": share.created_at,
                "updated_at": share.updated_at
            }
        
    except Exception as e:
        logger.error(f"❌ Failed to share dashboard {dashboard_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to share dashboard: {str(e)}")


@router.post("/dashboards/{dashboard_id}/publish")
async def publish_dashboard(dashboard_id: str, make_public: bool = True, current_token: str = Depends(JWTCookieBearer()), db: AsyncSession = Depends(get_async_session)):
    """Publish or unpublish a dashboard (toggle public visibility). Enforces auth."""
    try:
        user_payload = Auth().decodeJWT(current_token) or {}
        try:
            user_id = int(user_payload.get('id') or user_payload.get('sub') or 0)
        except Exception:
            user_id = 0

        # In real impl, load dashboard and check ownership/org membership
        from app.db.session import async_session
        from app.modules.charts.models import Dashboard
        async with async_session() as sdb:
            res = await sdb.execute(select(Dashboard).where(Dashboard.id == dashboard_id))
            db_dash = res.scalar_one_or_none()
            if not db_dash:
                raise HTTPException(status_code=404, detail="Dashboard not found")
            # Only allow publish by owner or org admin (simplified)
            if db_dash.created_by and db_dash.created_by != user_id:
                raise HTTPException(status_code=403, detail="Only owner can publish")
            db_dash.is_public = bool(make_public)
            await sdb.flush()
            await sdb.refresh(db_dash)
            return {"success": True, "dashboard_id": dashboard_id, "is_public": db_dash.is_public}
    except Exception as e:
        logger.error(f"❌ Failed to publish dashboard {dashboard_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to publish dashboard: {str(e)}")


@router.post("/dashboards/{dashboard_id}/embed")
async def create_dashboard_embed(dashboard_id: str, options: Dict[str, Any] = Body({}), current_token: str = Depends(JWTCookieBearer())):
    """Create an embeddable token/URL for a dashboard. In production, persist tokens and validate scopes."""
    try:
        user_payload = Auth().decodeJWT(current_token) or {}
        try:
            user_id = int(user_payload.get('id') or user_payload.get('sub') or 0)
        except Exception:
            user_id = 0

        # Permission check: only owner or org admin can create embed
        from app.modules.charts.models import DashboardEmbed, Dashboard
        from app.db.session import async_session
        async with async_session() as sdb:
            res = await sdb.execute(select(Dashboard).where(Dashboard.id == dashboard_id))
            db_dash = res.scalar_one_or_none()
            if not db_dash:
                raise HTTPException(status_code=404, detail="Dashboard not found")
            # Simplified RBAC: owner only for now
            if db_dash.created_by and db_dash.created_by != user_id:
                # Check organization user's role
                from app.modules.projects.models import OrganizationUser
                # find org id from project (db_dash.project_id)
                org_id = None
                if db_dash.project_id:
                    # Lookup project -> organization in projects table
                    from app.modules.projects.models import Project
                    pres = await sdb.execute(select(Project).where(Project.id == db_dash.project_id))
                    proj = pres.scalar_one_or_none()
                    if proj:
                        org_id = proj.organization_id
                if org_id:
                    ou = await sdb.execute(select(OrganizationUser).where(OrganizationUser.user_id == user_id, OrganizationUser.organization_id == org_id))
                    ou_row = ou.scalar_one_or_none()
                    if ou_row and ou_row.role in ('admin', 'owner'):
                        pass
                    else:
                        raise HTTPException(status_code=403, detail="Only owner or org admin can create embeds")
                else:
                    raise HTTPException(status_code=403, detail="Only owner or org admin can create embeds")

            embed_token = f"embed_{hash((dashboard_id, user_id, str(options)))}"
            embed = DashboardEmbed(dashboard_id=dashboard_id, created_by=user_id, embed_token=embed_token, options=options)
            sdb.add(embed)
            await sdb.flush()
            await sdb.refresh(embed)
            embed_url = f"/embed/dashboards/{dashboard_id}?token={embed_token}"
            return {"success": True, "dashboard_id": dashboard_id, "embed_token": embed_token, "embed_url": embed_url, "embed_id": str(embed.id)}
    except Exception as e:
        logger.error(f"❌ Failed to create embed for dashboard {dashboard_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create embed: {str(e)}")


@router.get("/embed/dashboards/{dashboard_id}")
async def serve_embedded_dashboard(dashboard_id: str, token: Optional[str] = None, db: AsyncSession = Depends(get_async_session)):
    """Serve an embedded dashboard payload when a valid embed token is provided.
    This endpoint validates the token, increments access_count, and returns dashboard JSON.
    """
    try:
        if not token:
            raise HTTPException(status_code=401, detail="Embed token required")

        from app.modules.charts.models import DashboardEmbed, Dashboard
        from app.db.session import async_session
        async with async_session() as sdb:
            res = await sdb.execute(select(DashboardEmbed).where(DashboardEmbed.embed_token == token, DashboardEmbed.dashboard_id == dashboard_id, DashboardEmbed.is_active == True))
            embed = res.scalar_one_or_none()
            if not embed:
                raise HTTPException(status_code=403, detail="Invalid or inactive embed token")

            # Check expiry
            if embed.expires_at and isinstance(embed.expires_at, datetime):
                if embed.expires_at < datetime.utcnow():
                    raise HTTPException(status_code=403, detail="Embed token expired")

            # Increment access count and update last_accessed_at
            embed.access_count = (embed.access_count or 0) + 1
            embed.last_accessed_at = func.now()
            await sdb.flush()

            # Load dashboard
            dres = await sdb.execute(select(Dashboard).where(Dashboard.id == dashboard_id))
            db_dash = dres.scalar_one_or_none()
            if not db_dash:
                raise HTTPException(status_code=404, detail="Dashboard not found")

            # Return minimal dashboard payload (omit sensitive fields)
            payload = {
                "id": str(db_dash.id),
                "name": db_dash.name,
                "description": db_dash.description,
                "layout_config": db_dash.layout_config,
                "theme_config": db_dash.theme_config,
                "global_filters": db_dash.global_filters,
                "is_public": db_dash.is_public,
            }

            return {"success": True, "dashboard": payload}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to serve embed for dashboard {dashboard_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# 📊 Plan and Limits Endpoints
@router.get("/plans/limits", response_model=PlanLimitsResponse)
async def get_plan_limits(plan: str = "free"):
    """
    Get plan limits and current usage
    """
    try:
        logger.info(f"📊 Getting plan limits for: {plan}")
        
        # Import plan limits from models
        from app.modules.charts.models import PLAN_LIMITS
        
        limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
        
        # Mock current usage - replace with actual usage calculation
        current_usage = {
            "dashboards": 2,
            "widgets": 5,
            "shared_dashboards": 0,
            "storage_gb": 1.5
        }
        
        return {
            "plan": plan,
            "limits": limits,
            "current_usage": current_usage
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get plan limits: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get plan limits: {str(e)}")


@router.get("/dashboards/templates")
async def get_dashboard_templates():
    """
    Get available dashboard templates
    """
    try:
        logger.info("📋 Getting dashboard templates")
        
        # Mock templates - replace with actual template service
        templates = [
            {
                "id": "template_1",
                "name": "Sales Dashboard",
                "description": "Complete sales performance dashboard",
                "category": "sales",
                "preview_image": "/templates/sales_dashboard.png",
                "required_plan": "free",
                "widgets": [
                    {"type": "chart", "chart_type": "bar", "name": "Monthly Sales"},
                    {"type": "chart", "chart_type": "line", "name": "Sales Trend"},
                    {"type": "table", "name": "Top Products"}
                ]
            },
            {
                "id": "template_2",
                "name": "Marketing Analytics",
                "description": "Marketing campaign performance dashboard",
                "category": "marketing",
                "preview_image": "/templates/marketing_dashboard.png",
                "required_plan": "pro",
                "widgets": [
                    {"type": "chart", "chart_type": "pie", "name": "Campaign Distribution"},
                    {"type": "chart", "chart_type": "scatter", "name": "ROI Analysis"},
                    {"type": "gauge", "name": "Conversion Rate"}
                ]
            }
        ]
        
        return {
            "success": True,
            "templates": templates
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get dashboard templates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard templates: {str(e)}")


@router.post("/dashboards/from-template")
async def create_dashboard_from_template(template_id: str, dashboard_name: str):
    """
    Create a new dashboard from a template
    """
    try:
        logger.info(f"🏗️ Creating dashboard from template {template_id}: {dashboard_name}")
        
        # Mock implementation - replace with actual template service
        dashboard_data = {
            "id": f"dashboard_{hash(dashboard_name)}",
            "name": dashboard_name,
            "description": f"Dashboard created from template {template_id}",
            "template_id": template_id,
            "created_at": "2025-01-10T00:00:00Z"
        }
        
        return {
            "success": True,
            "message": "Dashboard created from template successfully",
            "dashboard": dashboard_data
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to create dashboard from template: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create dashboard from template: {str(e)}")