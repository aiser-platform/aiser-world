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
from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File
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
async def save_chart(chart_data: Dict[str, Any]):
    """
    Save a chart configuration from the chart builder
    """
    try:
        logger.info(f"💾 Saving chart: {chart_data.get('name', 'Unnamed Chart')}")
        
        # Validate chart data
        required_fields = ['name', 'type', 'config', 'data']
        for field in required_fields:
            if field not in chart_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Save chart to database (implement with your database service)
        # For now, return success response
        saved_chart = {
            "id": chart_data.get('id') or f"chart_{len(chart_data)}_{hash(str(chart_data))}",
            "name": chart_data['name'],
            "type": chart_data['type'],
            "config": chart_data['config'],
            "data": chart_data['data'],
            "query": chart_data.get('query', ''),
            "created_at": chart_data.get('created_at'),
            "updated_at": chart_data.get('updated_at'),
            "user_id": chart_data.get('user_id', 'default'),
            "is_public": chart_data.get('is_public', False)
        }
        
        return {
            "success": True,
            "message": "Chart saved successfully",
            "chart": saved_chart
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to save chart: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save chart: {str(e)}")

@router.get("/builder/list")
async def list_charts(
    user_id: str = None,
    chart_type: str = None,
    limit: int = 50,
    offset: int = 0
):
    """
    List saved charts with optional filtering
    """
    try:
        logger.info(f"📋 Listing charts for user: {user_id}")
        
        # Mock response for now - implement with your database service
        mock_charts = [
            {
                "id": "chart_1",
                "name": "Sample Bar Chart",
                "type": "bar",
                "created_at": "2025-01-10T00:00:00Z",
                "updated_at": "2025-01-10T00:00:00Z",
                "user_id": user_id or "default",
                "is_public": True
            },
            {
                "id": "chart_2", 
                "name": "Sample Line Chart",
                "type": "line",
                "created_at": "2025-01-10T00:00:00Z",
                "updated_at": "2025-01-10T00:00:00Z",
                "user_id": user_id or "default",
                "is_public": False
            }
        ]
        
        # Filter by type if specified
        if chart_type:
            mock_charts = [c for c in mock_charts if c['type'] == chart_type]
        
        return {
            "success": True,
            "charts": mock_charts[offset:offset + limit],
            "total": len(mock_charts),
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to list charts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list charts: {str(e)}")

@router.get("/builder/{chart_id}")
async def get_chart(chart_id: str):
    """
    Get a specific chart by ID
    """
    try:
        logger.info(f"📊 Getting chart: {chart_id}")
        
        # Mock response - implement with your database service
        mock_chart = {
            "id": chart_id,
            "name": f"Chart {chart_id}",
            "type": "bar",
            "config": {
                "title": {"text": "Sample Chart"},
                "xAxis": {"type": "category", "data": ["A", "B", "C"]},
                "yAxis": {"type": "value"},
                "series": [{"type": "bar", "data": [10, 20, 30]}]
            },
            "data": [
                {"name": "A", "value": 10},
                {"name": "B", "value": 20},
                {"name": "C", "value": 30}
            ],
            "query": "SELECT name, value FROM sample_data",
            "created_at": "2025-01-10T00:00:00Z",
            "updated_at": "2025-01-10T00:00:00Z",
            "user_id": "default",
            "is_public": True
        }
        
        return {
            "success": True,
            "chart": mock_chart
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get chart {chart_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get chart: {str(e)}")

@router.put("/builder/{chart_id}")
async def update_chart(chart_id: str, chart_data: Dict[str, Any]):
    """
    Update an existing chart
    """
    try:
        logger.info(f"✏️ Updating chart: {chart_id}")
        
        # Validate chart data
        required_fields = ['name', 'type', 'config', 'data']
        for field in required_fields:
            if field not in chart_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Update chart in database (implement with your database service)
        updated_chart = {
            "id": chart_id,
            "name": chart_data['name'],
            "type": chart_data['type'],
            "config": chart_data['config'],
            "data": chart_data['data'],
            "query": chart_data.get('query', ''),
            "updated_at": "2025-01-10T00:00:00Z",
            "user_id": chart_data.get('user_id', 'default'),
            "is_public": chart_data.get('is_public', False)
        }
        
        return {
            "success": True,
            "message": "Chart updated successfully",
            "chart": updated_chart
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to update chart {chart_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update chart: {str(e)}")

@router.delete("/builder/{chart_id}")
async def delete_chart(chart_id: str):
    """
    Delete a chart
    """
    try:
        logger.info(f"🗑️ Deleting chart: {chart_id}")
        
        # Delete chart from database (implement with your database service)
        
        return {
            "success": True,
            "message": "Chart deleted successfully",
            "chart_id": chart_id
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to delete chart {chart_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete chart: {str(e)}")

@router.post("/builder/export")
async def export_chart(chart_data: Dict[str, Any]):
    """
    Export chart as various formats (PNG, SVG, PDF)
    """
    try:
        logger.info(f"📤 Exporting chart: {chart_data.get('name', 'Unnamed Chart')}")
        
        # This would integrate with ECharts export functionality
        # For now, return success response
        
        return {
            "success": True,
            "message": "Chart exported successfully",
            "export_url": f"/exports/chart_{hash(str(chart_data))}.png",
            "formats": ["PNG", "SVG", "PDF"]
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to export chart: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to export chart: {str(e)}")

@router.post("/builder/import")
async def import_chart(file: UploadFile = File(...)):
    """
    Import chart from file (JSON, CSV, etc.)
    """
    try:
        logger.info(f"📥 Importing chart from file: {file.filename}")
        
        # Read file content
        content = await file.read()
        
        if file.filename.endswith('.json'):
            chart_data = json.loads(content.decode('utf-8'))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please use JSON.")
        
        # Validate imported chart data
        required_fields = ['name', 'type', 'config', 'data']
        for field in required_fields:
            if field not in chart_data:
                raise HTTPException(status_code=400, detail=f"Invalid chart file: missing {field}")
        
        return {
            "success": True,
            "message": "Chart imported successfully",
            "chart": chart_data
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to import chart: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to import chart: {str(e)}")

@router.post("/builder/share")
async def share_chart(chart_data: Dict[str, Any]):
    """
    Share chart with other users or make it public
    """
    try:
        logger.info(f"🔗 Sharing chart: {chart_data.get('name', 'Unnamed Chart')}")
        
        # Generate shareable link
        share_id = f"share_{hash(str(chart_data))}"
        share_url = f"/chart-builder?share={share_id}"
        
        return {
            "success": True,
            "message": "Chart shared successfully",
            "share_id": share_id,
            "share_url": share_url,
            "is_public": chart_data.get('is_public', False)
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to share chart: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to share chart: {str(e)}")


# 🏗️ PROJECT-SCOPED DASHBOARD ENDPOINTS

@router.get("/api/organizations/{organization_id}/projects/{project_id}/dashboards")
async def get_project_dashboards(
    organization_id: str,
    project_id: str,
    user_id: str = None,
    limit: int = 50,
    offset: int = 0
):
    """Get dashboards for a specific project (project-scoped)"""
    try:
        logger.info(f"📊 Getting dashboards for project {project_id} in organization {organization_id}")
        
        # Mock implementation - replace with actual database service
        mock_dashboards = [
            {
                "id": f"dashboard_{project_id}_1",
                "name": "Project Sales Dashboard",
                "description": f"Sales dashboard for project {project_id}",
                "project_id": int(project_id),
                "organization_id": int(organization_id),
                "layout_config": {"grid_size": 12, "widgets": []},
                "theme_config": {"primary_color": "#1890ff"},
                "global_filters": {},
                "refresh_interval": 300,
                "is_public": False,
                "is_template": False,
                "created_by": int(user_id) if user_id else 1,
                "max_widgets": 10,
                "max_pages": 5,
                "created_at": "2025-01-10T00:00:00Z",
                "updated_at": "2025-01-10T00:00:00Z",
                "last_viewed_at": "2025-01-10T00:00:00Z"
            }
        ]
        
        return {
            "success": True,
            "dashboards": mock_dashboards[offset:offset + limit],
            "organization_id": organization_id,
            "project_id": project_id,
            "total": len(mock_dashboards),
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get project dashboards: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/organizations/{organization_id}/projects/{project_id}/dashboards")
async def create_project_dashboard(
    organization_id: str,
    project_id: str,
    dashboard: DashboardCreateSchema
):
    """Create a new dashboard for a specific project"""
    try:
        logger.info(f"🏗️ Creating dashboard for project {project_id} in organization {organization_id}: {dashboard.name}")
        
        # Mock implementation - replace with actual database service
        dashboard_data = {
            "id": f"dashboard_{project_id}_{hash(dashboard.name)}",
            "name": dashboard.name,
            "description": dashboard.description,
            "project_id": int(project_id),
            "organization_id": int(organization_id),
            "layout_config": dashboard.layout_config,
            "theme_config": dashboard.theme_config,
            "global_filters": dashboard.global_filters,
            "refresh_interval": dashboard.refresh_interval,
            "is_public": dashboard.is_public,
            "is_template": dashboard.is_template,
            "created_by": 1,  # TODO: Get from auth context
            "max_widgets": 10,
            "max_pages": 5,
            "created_at": "2025-01-10T00:00:00Z",
            "updated_at": None,
            "last_viewed_at": None
        }
        
        return {
            "success": True,
            "message": "Dashboard created successfully",
            "dashboard": dashboard_data
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to create project dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/organizations/{organization_id}/projects/{project_id}/dashboards/{dashboard_id}")
async def get_project_dashboard(
    organization_id: str,
    project_id: str,
    dashboard_id: str
):
    """Get a specific dashboard for a project"""
    try:
        logger.info(f"📊 Getting dashboard {dashboard_id} for project {project_id} in organization {organization_id}")
        
        # Mock implementation - replace with actual database service
        mock_dashboard = {
            "id": dashboard_id,
            "name": f"Dashboard {dashboard_id}",
            "description": f"Dashboard for project {project_id}",
            "project_id": int(project_id),
            "organization_id": int(organization_id),
            "layout_config": {"grid_size": 12, "widgets": []},
            "theme_config": {"primary_color": "#1890ff"},
            "global_filters": {},
            "refresh_interval": 300,
            "is_public": False,
            "is_template": False,
            "created_by": 1,
            "max_widgets": 10,
            "max_pages": 5,
            "created_at": "2025-01-10T00:00:00Z",
            "updated_at": "2025-01-10T00:00:00Z",
            "last_viewed_at": None
        }
        
        return {
            "success": True,
            "dashboard": mock_dashboard
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get project dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/organizations/{organization_id}/projects/{project_id}/dashboards/{dashboard_id}")
async def update_project_dashboard(
    organization_id: str,
    project_id: str,
    dashboard_id: str,
    dashboard: DashboardUpdateSchema
):
    """Update a dashboard for a specific project"""
    try:
        logger.info(f"✏️ Updating dashboard {dashboard_id} for project {project_id} in organization {organization_id}")
        
        # Mock implementation - replace with actual database service
        updated_dashboard = {
            "id": dashboard_id,
            "name": dashboard.name or f"Dashboard {dashboard_id}",
            "description": dashboard.description,
            "project_id": int(project_id),
            "organization_id": int(organization_id),
            "layout_config": dashboard.layout_config,
            "theme_config": dashboard.theme_config,
            "global_filters": dashboard.global_filters,
            "refresh_interval": dashboard.refresh_interval,
            "is_public": dashboard.is_public,
            "is_template": dashboard.is_template,
            "created_by": 1,
            "max_widgets": 10,
            "max_pages": 5,
            "created_at": "2025-01-10T00:00:00Z",
            "updated_at": "2025-01-10T00:00:00Z",
            "last_viewed_at": None
        }
        
        return {
            "success": True,
            "message": "Dashboard updated successfully",
            "dashboard": updated_dashboard
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to update project dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/organizations/{organization_id}/projects/{project_id}/dashboards/{dashboard_id}")
async def delete_project_dashboard(
    organization_id: str,
    project_id: str,
    dashboard_id: str
):
    """Delete a dashboard for a specific project"""
    try:
        logger.info(f"🗑️ Deleting dashboard {dashboard_id} for project {project_id} in organization {organization_id}")
        
        # Mock implementation - replace with actual database service
        
        return {
            "success": True,
            "message": "Dashboard deleted successfully",
            "dashboard_id": dashboard_id
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to delete project dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# 🏗️ Dashboard Studio API Endpoints (Global - for backward compatibility)
@router.post("/dashboards/", response_model=DashboardResponseSchema)
async def create_dashboard(
    dashboard: DashboardCreateSchema,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Create a new dashboard
    """
    try:
        logger.info(f"🏗️ Creating dashboard: {dashboard.name}")
        
        # Use real database service
        dashboard_service = DashboardService(db)
        created_dashboard = await dashboard_service.create_dashboard(dashboard)
        
        return created_dashboard
        
    except Exception as e:
        logger.error(f"❌ Failed to create dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create dashboard: {str(e)}")


@router.get("/dashboards/", response_model=List[DashboardResponseSchema])
async def list_dashboards(
    user_id: str = None,
    project_id: int = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_async_session)
):
    """
    List dashboards with optional filtering
    """
    try:
        logger.info(f"📋 Listing dashboards for user: {user_id}, project: {project_id}")
        
        # Use real database service
        dashboard_service = DashboardService(db)
        dashboards = await dashboard_service.list_dashboards(
            user_id=user_id,
            project_id=project_id,
            limit=limit,
            offset=offset
        )
        
        return dashboards
        
    except Exception as e:
        logger.error(f"❌ Failed to list dashboards: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list dashboards: {str(e)}")


@router.get("/dashboards/{dashboard_id}", response_model=DashboardResponseSchema)
async def get_dashboard(
    dashboard_id: str,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Get a specific dashboard by ID
    """
    try:
        logger.info(f"📊 Getting dashboard: {dashboard_id}")
        
        # Use real database service
        dashboard_service = DashboardService(db)
        dashboard = await dashboard_service.get_dashboard(dashboard_id)
        
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
    db: AsyncSession = Depends(get_async_session)
):
    """
    Update an existing dashboard
    """
    try:
        logger.info(f"✏️ Updating dashboard: {dashboard_id}")
        
        # Use real database service
        dashboard_service = DashboardService(db)
        updated_dashboard = await dashboard_service.update_dashboard(dashboard_id, dashboard)
        
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
    db: AsyncSession = Depends(get_async_session)
):
    """
    Delete a dashboard
    """
    try:
        logger.info(f"🗑️ Deleting dashboard: {dashboard_id}")
        
        # Use real database service
        dashboard_service = DashboardService(db)
        success = await dashboard_service.delete_dashboard(dashboard_id)
        
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
async def create_widget(dashboard_id: str, widget: DashboardWidgetCreateSchema):
    """
    Create a new widget in a dashboard
    """
    try:
        logger.info(f"🧩 Creating widget in dashboard {dashboard_id}: {widget.name}")
        
        # Mock implementation - replace with actual database service
        widget_data = {
            "id": f"widget_{hash(widget.name)}",
            "dashboard_id": dashboard_id,
            "name": widget.name,
            "widget_type": widget.widget_type,
            "chart_type": widget.chart_type,
            "config": widget.config,
            "data_config": widget.data_config,
            "style_config": widget.style_config,
            "x": widget.x,
            "y": widget.y,
            "width": widget.width,
            "height": widget.height,
            "z_index": widget.z_index,
            "is_visible": widget.is_visible,
            "is_locked": widget.is_locked,
            "is_resizable": widget.is_resizable,
            "is_draggable": widget.is_draggable,
            "created_at": "2025-01-10T00:00:00Z",
            "updated_at": None
        }
        
        return widget_data
        
    except Exception as e:
        logger.error(f"❌ Failed to create widget: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create widget: {str(e)}")


@router.get("/dashboards/{dashboard_id}/widgets", response_model=List[DashboardWidgetResponseSchema])
async def list_widgets(dashboard_id: str):
    """
    List all widgets in a dashboard
    """
    try:
        logger.info(f"📋 Listing widgets for dashboard: {dashboard_id}")
        
        # Mock implementation - replace with actual database service
        mock_widgets = [
            {
                "id": "widget_1",
                "dashboard_id": dashboard_id,
                "name": "Sales Chart",
                "widget_type": "chart",
                "chart_type": "bar",
                "config": {"title": "Monthly Sales"},
                "data_config": {"data_source": "sales_data"},
                "style_config": {"color": "#1890ff"},
                "x": 0,
                "y": 0,
                "width": 6,
                "height": 4,
                "z_index": 0,
                "is_visible": True,
                "is_locked": False,
                "is_resizable": True,
                "is_draggable": True,
                "created_at": "2025-01-10T00:00:00Z",
                "updated_at": None
            },
            {
                "id": "widget_2",
                "dashboard_id": dashboard_id,
                "name": "Revenue Table",
                "widget_type": "table",
                "chart_type": None,
                "config": {"columns": ["Month", "Revenue"]},
                "data_config": {"data_source": "revenue_data"},
                "style_config": {"theme": "light"},
                "x": 6,
                "y": 0,
                "width": 6,
                "height": 4,
                "z_index": 0,
                "is_visible": True,
                "is_locked": False,
                "is_resizable": True,
                "is_draggable": True,
                "created_at": "2025-01-10T00:00:00Z",
                "updated_at": None
            }
        ]
        
        return mock_widgets
        
    except Exception as e:
        logger.error(f"❌ Failed to list widgets: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list widgets: {str(e)}")


@router.put("/dashboards/{dashboard_id}/widgets/{widget_id}", response_model=DashboardWidgetResponseSchema)
async def update_widget(dashboard_id: str, widget_id: str, widget: DashboardWidgetUpdateSchema):
    """
    Update a widget
    """
    try:
        logger.info(f"✏️ Updating widget {widget_id} in dashboard {dashboard_id}")
        
        # Mock implementation - replace with actual database service
        updated_widget = {
            "id": widget_id,
            "dashboard_id": dashboard_id,
            "name": widget.name or f"Widget {widget_id}",
            "widget_type": widget.widget_type,
            "chart_type": widget.chart_type,
            "config": widget.config,
            "data_config": widget.data_config,
            "style_config": widget.style_config,
            "x": widget.x,
            "y": widget.y,
            "width": widget.width,
            "height": widget.height,
            "z_index": widget.z_index,
            "is_visible": widget.is_visible,
            "is_locked": widget.is_locked,
            "is_resizable": widget.is_resizable,
            "is_draggable": widget.is_draggable,
            "created_at": "2025-01-10T00:00:00Z",
            "updated_at": "2025-01-10T00:00:00Z"
        }
        
        return updated_widget
        
    except Exception as e:
        logger.error(f"❌ Failed to update widget {widget_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update widget: {str(e)}")


@router.delete("/dashboards/{dashboard_id}/widgets/{widget_id}")
async def delete_widget(dashboard_id: str, widget_id: str):
    """
    Delete a widget
    """
    try:
        logger.info(f"🗑️ Deleting widget {widget_id} from dashboard {dashboard_id}")
        
        # Mock implementation - replace with actual database service
        
        return {
            "success": True,
            "message": "Widget deleted successfully",
            "widget_id": widget_id
        }
        
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
async def share_dashboard(dashboard_id: str, share_request: DashboardShareCreateSchema):
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
        
        return share_data
        
    except Exception as e:
        logger.error(f"❌ Failed to share dashboard {dashboard_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to share dashboard: {str(e)}")


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