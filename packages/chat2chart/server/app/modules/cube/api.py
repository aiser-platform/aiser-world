"""
Cube.js Integration API Endpoints
"""
import httpx
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

@router.get("/schema/{data_source_id}")
async def get_cube_schema(data_source_id: str):
    """Get Cube.js schema for a data source"""
    try:
        # Connect to Cube.js instance
        cube_url = "http://aiser-cube-dev:4000"
        
        # Get schema from Cube.js
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{cube_url}/cubejs-api/v1/meta")
            
            if response.status_code == 200:
                schema_data = response.json()
                
                # Transform to our expected format
                cubes = []
                dimensions = []
                measures = []
                
                for cube_info in schema_data.get('cubes', []):
                    cube = {
                        "name": cube_info.get('name', ''),
                        "title": cube_info.get('title', cube_info.get('name', '')),
                        "description": cube_info.get('description', ''),
                        "dimensions": [],
                        "measures": [],
                        "segments": [],
                        "preAggregations": []
                    }
                    
                    # Extract dimensions
                    for dim_info in cube_info.get('dimensions', []):
                        dimension = {
                            "name": dim_info.get('name', ''),
                            "title": dim_info.get('title', dim_info.get('name', '')),
                            "type": dim_info.get('type', 'string'),
                            "sql": dim_info.get('sql', dim_info.get('name', ''))
                        }
                        cube["dimensions"].append(dimension)
                        dimensions.append(dimension)
                    
                    # Extract measures
                    for measure_info in cube_info.get('measures', []):
                        measure = {
                            "name": measure_info.get('name', ''),
                            "title": measure_info.get('title', measure_info.get('name', '')),
                            "type": measure_info.get('type', 'number'),
                            "sql": measure_info.get('sql', measure_info.get('name', '')),
                            "format": measure_info.get('format', '')
                        }
                        cube["measures"].append(measure)
                        measures.append(measure)
                    
                    # Extract segments
                    for segment_info in cube_info.get('segments', []):
                        segment = {
                            "name": segment_info.get('name', ''),
                            "title": segment_info.get('title', segment_info.get('name', '')),
                            "sql": segment_info.get('sql', '')
                        }
                        cube["segments"].append(segment)
                    
                    # Extract pre-aggregations
                    for preagg_info in cube_info.get('preAggregations', []):
                        preagg = {
                            "name": preagg_info.get('name', ''),
                            "type": preagg_info.get('type', 'rollup'),
                            "timeDimension": preagg_info.get('timeDimension'),
                            "granularity": preagg_info.get('granularity')
                        }
                        cube["preAggregations"].append(preagg)
                    
                    cubes.append(cube)
                
                return {
                    "success": True,
                    "cubes": cubes,
                    "dimensions": dimensions,
                    "measures": measures,
                    "time_dimensions": [d for d in dimensions if d.get('type') == 'time'],
                    "pre_aggregations": []
                }
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to fetch Cube.js schema"
                )
                
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Schema fetch failed: {str(e)}"
        )

@router.get("/model/{data_source_id}")
async def get_cube_model(data_source_id: str):
    """Get Cube.js model metadata for a data source"""
    try:
        # For now, return mock model data
        # In production, this would fetch from Cube.js or database
        return {
            "success": True,
            "name": f"cube_model_{data_source_id}",
            "description": f"AI-generated Cube.js model for {data_source_id}",
            "version": "1.0.0",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model fetch failed: {str(e)}"
        )

@router.get("/examples/{data_source_id}")
async def get_cube_examples(data_source_id: str):
    """Get example queries for Cube.js data source"""
    try:
        # Return example queries based on data source type
        examples = {
            "queries": [
                {
                    "name": "Total Sales by Month",
                    "query": {
                        "measures": ["Orders.count"],
                        "timeDimensions": [{
                            "dimension": "Orders.createdAt",
                            "granularity": "month"
                        }]
                    },
                    "description": "Show total order count by month"
                },
                {
                    "name": "Revenue by Product Category",
                    "query": {
                        "measures": ["Orders.totalAmount"],
                        "dimensions": ["Products.category"]
                    },
                    "description": "Show revenue breakdown by product category"
                },
                {
                    "name": "Customer Growth Trend",
                    "query": {
                        "measures": ["Users.count"],
                        "timeDimensions": [{
                            "dimension": "Users.createdAt",
                            "granularity": "quarter"
                        }]
                    },
                    "description": "Show customer growth over quarters"
                }
            ]
        }
        
        return examples
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Examples fetch failed: {str(e)}"
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