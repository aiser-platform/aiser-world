"""
Cube.js Integration API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, List, Optional, Any
from app.modules.cube.services.cube_integration_service import cube_service
from app.core.cache import cache
from pydantic import BaseModel

router = APIRouter()

class GenerateSchemaRequest(BaseModel):
    data_source: Dict[str, Any]
    sample_data: List[Dict[str, Any]]
    business_context: Optional[str] = None

class DeploySchemaRequest(BaseModel):
    cube_schema: Dict[str, Any]
    cube_name: str

class CubeQueryRequest(BaseModel):
    query: Dict[str, Any]

class ChartGenerationRequest(BaseModel):
    natural_query: str
    available_cubes: List[str]

@router.post("/schema/generate")
async def generate_cube_schema(request: GenerateSchemaRequest):
    """Generate Cube.js schema using AI analysis"""
    try:
        result = await cube_service.generate_cube_schema(
            data_source=request.data_source,
            sample_data=request.sample_data,
            business_context=request.business_context
        )
        
        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Failed to generate schema')
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/schema/deploy")
async def deploy_schema_to_cube(request: DeploySchemaRequest):
    """Deploy generated schema to Cube.js"""
    try:
        result = await cube_service.deploy_schema_to_cube(
            schema=request.cube_schema,
            cube_name=request.cube_name
        )
        
        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Failed to deploy schema')
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/query")
async def execute_cube_query(request: CubeQueryRequest):
    """Execute query against Cube.js"""
    try:
        result = await cube_service.query_cube_data(request.query)
        
        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Query execution failed')
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/chart/generate")
async def generate_chart_from_query(request: ChartGenerationRequest):
    """Generate chart configuration from natural language query"""
    try:
        result = await cube_service.generate_chart_from_query(
            natural_query=request.natural_query,
            available_cubes=request.available_cubes
        )
        
        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Chart generation failed')
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/cache/stats")
async def get_cache_statistics():
    """Get cache performance statistics"""
    try:
        stats = cache.get_cache_stats()
        return {
            'success': True,
            'cache_stats': stats
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/cache/warm")
async def warm_cache():
    """Warm cache with common queries"""
    try:
        # Common queries to pre-populate
        warm_data = [
            {
                'key': 'common_query_1',
                'value': {'type': 'sample', 'data': []},
                'ttl': 3600
            },
            {
                'key': 'schema_template_basic',
                'value': {'type': 'template', 'content': 'basic cube template'},
                'ttl': 7200
            }
        ]
        
        await cache.warm_cache(warm_data)
        
        return {
            'success': True,
            'message': 'Cache warmed successfully',
            'items_loaded': len(warm_data)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/cache/clear")
async def clear_cache(pattern: Optional[str] = None):
    """Clear cache with optional pattern"""
    try:
        cleared_count = cache.clear_cache(pattern)
        
        return {
            'success': True,
            'message': 'Cache cleared successfully',
            'items_cleared': cleared_count
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/health")
async def cube_service_health():
    """Check Cube.js service health"""
    try:
        cache_health = await cache.health_check()
        
        return {
            'success': True,
            'service': 'cube_integration',
            'cache_health': cache_health,
            'timestamp': cache_health.get('timestamp')
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )