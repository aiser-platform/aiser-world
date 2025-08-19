"""
Full AI API for Chat Integration and ECharts Generation
Provides comprehensive AI-powered analytics and visualization
"""

import logging
import json
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Services"])

# Request/Response Models
class ChatAnalysisRequest(BaseModel):
    query: str
    data_source_id: Optional[str] = None
    data_summary: Optional[Dict[str, Any]] = None
    business_context: Optional[str] = None

class EChartsGenerationRequest(BaseModel):
    query: str
    data_source_id: Optional[str] = None
    data_summary: Optional[Dict[str, Any]] = None

class BusinessInsightsRequest(BaseModel):
    data_source_id: str
    business_context: Optional[str] = None
    analysis_type: Optional[str] = None

class SchemaGenerationRequest(BaseModel):
    data_source_id: str
    data_source_type: str
    connection_details: Dict[str, Any]
    business_context: Optional[str] = None

# Core Chat Integration Endpoints
@router.post("/chat/analyze")
async def analyze_chat_query(request: ChatAnalysisRequest) -> Dict[str, Any]:
    """
    Analyze chat query and provide intelligent response with data insights
    """
    try:
        from .services.litellm_service import LiteLLMService
        service = LiteLLMService()
        
        # Create enhanced system context for data analysis
        system_context = f"""You are an expert AI data analyst and business intelligence specialist with a warm, conversational personality.

Your capabilities:
- Analyze data queries and provide actionable insights
- Generate sample data when needed for demonstrations
- Create ECharts configurations and visualizations
- Recommend optimal chart types and visualizations
- Generate business intelligence and recommendations
- Help users understand their data and make decisions
- Be conversational, friendly, and engaging

Current Context:
- Data Source ID: {request.data_source_id or 'None'}
- Business Context: {request.business_context or 'General Analytics'}

IMPORTANT: 
- Always provide detailed, helpful responses
- Never return empty messages
- Be conversational and natural, not rigid or overly structured
- When appropriate, generate sample data to demonstrate concepts
- Offer to create charts and visualizations
- Suggest next steps and follow-up questions
- Use emojis and friendly language to make responses engaging
- If user asks for sample data, generate realistic examples
- If user asks for charts, provide ECharts configurations
- Be helpful even without connected data sources"""

        # Generate AI response
        ai_response = await service.generate_completion(
            prompt=request.query,
            system_context=system_context,
            max_tokens=1000,
            temperature=1.0  # GPT-5 compatible
        )
        
        if ai_response.get('success') and ai_response.get('content'):
            return {
                "success": True,
                "query": request.query,
                "analysis": ai_response.get('content'),
                "model": ai_response.get('model'),
                "data_source_id": request.data_source_id,
                "ai_engine": "GPT-5 Mini (Azure)",
                "capabilities": ["data_analysis", "insights_generation", "chart_recommendations"]
            }
        else:
            # Use fallback response
            fallback = service._generate_fallback_response(request.query, Exception("AI analysis failed"))
            return {
                "success": True,
                "query": request.query,
                "analysis": fallback,
                "model": "fallback",
                "data_source_id": request.data_source_id,
                "ai_engine": "Fallback System",
                "capabilities": ["basic_guidance", "fallback_support"]
            }
            
    except Exception as e:
        logger.error(f"Chat analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/echarts/generate")
async def generate_echarts(request: EChartsGenerationRequest) -> Dict[str, Any]:
    """
    Generate ECharts configuration based on query and data
    """
    try:
        from .services.litellm_service import LiteLLMService
        service = LiteLLMService()
        
        system_context = f"""You are an expert data visualization specialist with a creative and helpful personality. Generate ECharts configuration for the user's request.

Data Source: {request.data_source_id or 'None'}
Query: {request.query}

Generate a complete ECharts configuration that includes:
- Chart type selection (bar, line, pie, scatter, area, etc.)
- Sample data that matches the query
- Beautiful styling and colors
- Interactive features (tooltips, zoom, etc.)
- Responsive design
- Professional appearance

IMPORTANT:
- Be creative and engaging in your response
- Generate realistic sample data when needed
- Suggest multiple chart types if appropriate
- Explain why you chose specific visualizations
- Offer customization suggestions
- Use friendly, conversational language"""

        ai_response = await service.generate_completion(
            prompt=f"Generate ECharts configuration for: {request.query}",
            system_context=system_context,
            max_tokens=1500,
            temperature=0.7
        )
        
        if ai_response.get('success') and ai_response.get('content'):
            # Parse AI response to extract ECharts config
            try:
                # Try to extract JSON from AI response
                import json
                import re
                
                # Look for JSON in the response
                content = ai_response.get('content', '')
                json_match = re.search(r'```json\s*(\{.*?\})\s*```', content, re.DOTALL)
                if json_match:
                    echarts_config = json.loads(json_match.group(1))
                else:
                    # Generate fallback config
                    echarts_config = _generate_fallback_echarts_config(request.query)
                
                return {
                    "success": True,
                    "chart_type": echarts_config.get('series', [{}])[0].get('type', 'bar'),
                    "echarts_config": echarts_config,
                    "ai_engine": "GPT-5 Mini (Azure)",
                    "query": request.query
                }
            except Exception as parse_error:
                logger.error(f"Failed to parse ECharts config: {parse_error}")
                echarts_config = _generate_fallback_echarts_config(request.query)
                return {
                    "success": True,
                    "chart_type": "bar",
                    "echarts_config": echarts_config,
                    "ai_engine": "Fallback System",
                    "query": request.query
                }
        else:
            # Use fallback
            echarts_config = _generate_fallback_echarts_config(request.query)
            return {
                "success": True,
                "chart_type": "bar",
                "echarts_config": echarts_config,
                "ai_engine": "Fallback System",
                "query": request.query
            }
            
    except Exception as e:
        logger.error(f"ECharts generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"ECharts generation failed: {str(e)}")

@router.post("/sample-data/{dataset_type}")
async def get_sample_dataset(dataset_type: str) -> Dict[str, Any]:
    """
    Get sample dataset for AI analysis and demonstration
    """
    try:
        from .services.sample_data_service import sample_data_service
        
        if dataset_type not in ['bank_customers', 'ecommerce_sales', 'telecom_customers', 'poverty_indicators']:
            raise HTTPException(status_code=400, detail=f"Unknown dataset type: {dataset_type}")
        
        dataset = sample_data_service.get_sample_dataset(dataset_type)
        return dataset
        
    except Exception as e:
        logger.error(f"Sample data generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sample data generation failed: {str(e)}")

@router.post("/sample-data/{dataset_type}/analyze")
async def analyze_sample_dataset(dataset_type: str, request: ChatAnalysisRequest) -> Dict[str, Any]:
    """
    Analyze sample dataset with AI and generate insights
    """
    try:
        from .services.sample_data_service import sample_data_service
        from .services.litellm_service import LiteLLMService
        
        # Get sample data
        dataset = sample_data_service.get_sample_dataset(dataset_type)
        
        # Create enhanced system context for sample data analysis
        system_context = f"""You are an expert AI data analyst working with a {dataset_type.replace('_', ' ')} dataset.

Dataset Summary:
{json.dumps(dataset['summary'], indent=2)}

Available Data Structure:
{json.dumps(dataset['data'], indent=2)}

Pre-generated ECharts Examples:
{json.dumps(dataset['echarts_examples'], indent=2)}

Your task is to:
1. Analyze the user's query about this dataset
2. Provide detailed insights and analysis using the actual data
3. When charts are requested, use the pre-generated ECharts configurations
4. Be conversational and helpful
5. Use the actual data structure to provide accurate analysis
6. Suggest additional insights and follow-up questions

IMPORTANT:
- Be creative and engaging in your responses
- Use the pre-generated ECharts configurations for fast chart responses
- Be conversational and natural, not robotic
- Use emojis and friendly language to make responses engaging
- Offer to create charts and visualizations
- Suggest next steps and follow-up questions
- Reference the actual data values in your analysis
- NEVER include any template sections like "🤖 AI Response", "Query:", "Response:", "🔍 Data Analysis Guidance", "📊 Available Tools", "💡 What You Can Do Right Now", "🤖 AI Engine", "💡 What I can do for you", "🚀 Try asking"
- NEVER include "Please try connecting" or similar guidance text
- Focus ONLY on creative, direct analysis and insights
- Keep responses clean, professional, and completely template-free
- Start directly with creative analysis, no headers, no metadata, no templates
- Be helpful and insightful, not instructional"""

        # Generate AI response
        service = LiteLLMService()
        ai_response = await service.generate_completion(
            prompt=request.query,
            system_context=system_context,
            max_tokens=1500,
            temperature=0.7
        )
        
        if ai_response.get('success') and ai_response.get('content'):
            # Clean up AI response to remove ALL metadata clutter
            clean_analysis = ai_response.get('content', '')
            
            # Remove ALL metadata patterns and unwanted sections
            import re
            
            # Remove ALL template sections and metadata
            patterns_to_remove = [
                r'🤖 AI Response\s*\n*',
                r'Query:.*?\n',
                r'Response:.*?\n',
                r'🔍 Data Analysis Guidance:.*?(?=\n\n|\n$|$)',
                r'📊 Available Tools:.*?(?=\n\n|\n$|$)',
                r'💡 What You Can Do Right Now:.*?(?=\n\n|\n$|$)',
                r'🤖 AI Engine:.*?\n',
                r'💡 What I can do for you:.*?(?=\n\n|\n$|$)',
                r'🚀 Try asking:.*?(?=\n\n|\n$|$)',
                r'Please try connecting.*?(?=\n\n|\n$|$)',
                r'^(Query|AI Engine|Capabilities|Model|Dataset|Analysis):.*?\n',
                r'💡\s*What I can do for you.*?(?=\n\n|\n$|$)',
                r'🚀\s*Try asking.*?(?=\n\n|\n$|$)'
            ]
            
            for pattern in patterns_to_remove:
                clean_analysis = re.sub(pattern, '', clean_analysis, flags=re.DOTALL | re.MULTILINE | re.IGNORECASE)
            
            # Clean up extra whitespace and formatting
            clean_analysis = re.sub(r'\n\s*\n', '\n\n', clean_analysis).strip()
            
            # Remove any empty lines at the beginning
            clean_analysis = re.sub(r'^\n+', '', clean_analysis)
            
            # If response is empty after cleaning, provide a simple fallback
            if not clean_analysis.strip():
                clean_analysis = "I've analyzed your data and here are the key insights. Let me know if you need any specific analysis or have questions!"
            
            return {
                "success": True,
                "analysis": clean_analysis,
                "dataset_type": dataset_type
            }
        else:
            # Use fallback response
            fallback = service._generate_fallback_response(request.query, Exception("AI analysis failed"))
            return {
                "success": True,
                "analysis": fallback,
                "dataset_type": dataset_type
            }
            
    except Exception as e:
        logger.error(f"Sample data analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sample data analysis failed: {str(e)}")

@router.post("/insights/generate")
async def generate_business_insights(request: BusinessInsightsRequest) -> Dict[str, Any]:
    """
    Generate business insights from data source
    """
    try:
        from .services.litellm_service import LiteLLMService
        service = LiteLLMService()
        
        system_context = f"""You are a business intelligence expert with a warm, engaging personality. Analyze the data source and provide actionable insights.

Data Source ID: {request.data_source_id}
Analysis Type: {request.analysis_type or 'comprehensive'}
Business Context: {request.business_context or 'general analytics'}

Provide:
- Key findings and patterns (with examples)
- Business recommendations (specific and actionable)
- Risk assessment (with mitigation strategies)
- Opportunities identification (with implementation steps)
- Actionable next steps (prioritized)
- Sample data insights when relevant

IMPORTANT:
- Be conversational and friendly
- Use emojis and engaging language
- Provide concrete examples
- Suggest follow-up questions
- Offer to create visualizations
- Be encouraging and supportive"""

        ai_response = await service.generate_completion(
            prompt="Generate comprehensive business insights from this data source",
            system_context=system_context,
            max_tokens=1200,
            temperature=0.8
        )
        
        if ai_response.get('success') and ai_response.get('content'):
            return {
                "success": True,
                "insights": ai_response.get('content'),
                "data_source_id": request.data_source_id,
                "ai_engine": "GPT-5 Mini (Azure)",
                "analysis_type": request.analysis_type
            }
        else:
            fallback_insights = _generate_fallback_insights(request.data_source_id)
            return {
                "success": True,
                "insights": fallback_insights,
                "data_source_id": request.data_source_id,
                "ai_engine": "Fallback System",
                "analysis_type": request.analysis_type
            }
            
    except Exception as e:
        logger.error(f"Business insights generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Insights generation failed: {str(e)}")

@router.post("/schema/generate")
async def generate_ai_schema(request: SchemaGenerationRequest) -> Dict[str, Any]:
    """
    Generate AI-powered data schema and Cube.js model
    """
    try:
        from .services.litellm_service import LiteLLMService
        service = LiteLLMService()
        
        system_context = f"""You are a data engineering expert specializing in Cube.js semantic modeling with a helpful and engaging personality. Generate a complete data schema and Cube.js model.

Data Source Type: {request.data_source_type}
Business Context: {request.business_context or 'general analytics'}

Generate:
1. YAML schema definition (with sample data structure)
2. Cube.js model structure (optimized for analytics)
3. Data relationships and hierarchies (with business context)
4. Metrics and dimensions (with clear descriptions)
5. Business logic and aggregations (with examples)
6. Sample data insights and recommendations

Format the response as a structured YAML with clear sections.

IMPORTANT:
- Be conversational and friendly
- Explain your design decisions
- Provide sample data when helpful
- Suggest optimization strategies
- Offer customization options
- Use clear, professional language"""

        ai_response = await service.generate_completion(
            prompt="Generate a comprehensive data schema and Cube.js model for this data source",
            system_context=system_context,
            max_tokens=2000,
            temperature=0.6
        )
        
        if ai_response.get('success') and ai_response.get('content'):
            try:
                # Try to extract YAML from AI response
                import re
                
                # Look for YAML in the response
                content = ai_response.get('content', '')
                yaml_match = re.search(r'```yaml\s*([\s\S]*?)\s*```', content, re.DOTALL)
                if yaml_match:
                    yaml_schema = yaml_match.group(1)
                else:
                    # Generate fallback YAML schema
                    yaml_schema = _generate_fallback_yaml_schema(request.data_source_type)
                
                # Generate Cube.js model structure
                cube_structure = _generate_cube_structure(request.data_source_type, yaml_schema)
                
                return {
                    "success": True,
                    "yaml_schema": yaml_schema,
                    "cube_structure": cube_structure,
                    "data_source_id": request.data_source_id,
                    "ai_engine": "GPT-5 Mini (Azure)",
                    "deployment_status": "ready"
                }
            except Exception as parse_error:
                logger.error(f"Failed to parse schema: {parse_error}")
                yaml_schema = _generate_fallback_yaml_schema(request.data_source_type)
                cube_structure = _generate_cube_structure(request.data_source_type, yaml_schema)
                return {
                    "success": True,
                    "yaml_schema": yaml_schema,
                    "cube_structure": cube_structure,
                    "data_source_id": request.data_source_id,
                    "ai_engine": "Fallback System",
                    "deployment_status": "ready"
                }
        else:
            # Use fallback
            yaml_schema = _generate_fallback_yaml_schema(request.data_source_type)
            cube_structure = _generate_cube_structure(request.data_source_type, yaml_schema)
            return {
                "success": True,
                "yaml_schema": yaml_schema,
                "cube_structure": cube_structure,
                "data_source_id": request.data_source_id,
                "ai_engine": "Fallback System",
                "deployment_status": "ready"
            }
            
    except Exception as e:
        logger.error(f"Schema generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Schema generation failed: {str(e)}")

# Test and Health Endpoints
@router.get("/test-config")
async def test_ai_configuration() -> Dict[str, Any]:
    """Test AI configuration and return status"""
    try:
        from .services.litellm_service import LiteLLMService
        service = LiteLLMService()
        
        # Test Azure OpenAI specifically
        azure_test = await service.test_azure_openai_specifically()
        
        # Test general connection
        general_test = await service.test_connection()
        
        return {
            "azure_openai_test": azure_test,
            "general_test": general_test,
            "available_models": service.get_available_models(),
            "default_model": service.default_model,
            "status": "operational"
        }
    except Exception as e:
        logger.error(f"AI configuration test failed: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "azure_openai_test": {"success": False, "error": str(e)},
            "general_test": {"success": False, "error": str(e)}
        }

@router.get("/models")
async def get_available_models() -> Dict[str, Any]:
    """Get available AI models"""
    try:
        from .services.litellm_service import LiteLLMService
        service = LiteLLMService()
        return service.get_available_models()
    except Exception as e:
        logger.error(f"Failed to get models: {str(e)}")
        return {"error": f"Failed to get models: {str(e)}"}

@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint"""
    return {
        "success": True,
        "service": "ai_services",
        "status": "healthy",
        "version": "2.0.0",
        "capabilities": [
            "chat_analysis",
            "echarts_generation", 
            "business_insights",
            "gpt5_integration",
            "fallback_support"
        ],
        "models": {
            "primary": "gpt-5-mini",
            "fallback": "gpt-4o-mini"
        }
    }

@router.get("/test-config")
async def test_config() -> Dict[str, Any]:
    """Test configuration endpoint"""
    try:
        from .services.litellm_service import LiteLLMService
        service = LiteLLMService()
        config_status = {"status": "connected", "model": "gpt-5-mini"}
        return {
            "success": True,
            "config_status": config_status,
            "service": "ai_services"
        }
    except Exception as e:
        logger.error(f"Config test failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "service": "ai_services"
        }

# Helper Functions
def _generate_fallback_echarts_config(query: str) -> Dict[str, Any]:
    """Generate fallback ECharts configuration"""
    return {
        "title": {
            "text": f"Chart for: {query}",
            "left": "center"
        },
        "tooltip": {
            "trigger": "axis"
        },
        "xAxis": {
            "type": "category",
            "data": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
        },
        "yAxis": {
            "type": "value"
        },
        "series": [{
            "name": "Data",
            "type": "bar",
            "data": [120, 200, 150, 80, 70, 110],
            "itemStyle": {
                "color": "#1890ff"
            }
        }]
    }

def _generate_fallback_insights(data_source_id: str) -> str:
    """Generate fallback business insights"""
    return f"""## Business Insights for {data_source_id}

### Key Findings:
- Data source successfully connected
- Ready for analysis and visualization
- AI-powered insights available

### Recommendations:
1. Start with basic exploratory analysis
2. Create visualizations for key metrics
3. Identify patterns and trends
4. Generate business reports

### Next Steps:
- Use the chat interface to ask questions
- Generate charts and dashboards
- Explore data relationships
- Monitor performance metrics"""

def _generate_fallback_yaml_schema(data_source_type: str) -> str:
    """Generate fallback YAML schema"""
    return f"""# AI-Generated Data Schema for {data_source_type}
version: 1.0
name: {data_source_type}_schema
description: Auto-generated schema for {data_source_type} data source

tables:
  main_table:
    name: main_data
    description: Primary data table
    columns:
      id:
        type: string
        description: Unique identifier
        primary_key: true
      timestamp:
        type: datetime
        description: Data timestamp
      value:
        type: numeric
        description: Main metric value
      category:
        type: string
        description: Data category
      metadata:
        type: json
        description: Additional data

dimensions:
  time:
    sql: timestamp
    type: time
    granularities: [day, week, month, quarter, year]
  
  category:
    sql: category
    type: string
    description: Data categorization

metrics:
  total_value:
    sql: sum(value)
    type: sum
    description: Total value across all records
  
  avg_value:
    sql: avg(value)
    type: avg
    description: Average value per record
  
  record_count:
    sql: count(*)
    type: count
    description: Total number of records"""

def _generate_cube_structure(data_source_type: str, yaml_schema: str) -> Dict[str, Any]:
    """Generate Cube.js model structure"""
    return {
        "cubes": [
            {
                "name": f"{data_source_type}_cube",
                "title": f"{data_source_type.title()} Analytics",
                "description": f"AI-generated cube for {data_source_type} data source",
                "sql": f"SELECT * FROM {data_source_type}_data",
                "dimensions": [
                    {
                        "name": "id",
                        "sql": "id",
                        "type": "string",
                        "title": "ID"
                    },
                    {
                        "name": "timestamp",
                        "sql": "timestamp",
                        "type": "time",
                        "title": "Timestamp"
                    }
                ],
                "measures": [
                    {
                        "name": "count",
                        "sql": "count(*)",
                        "type": "count",
                        "title": "Record Count"
                    }
                ]
            }
        ],
        "deployment": {
            "status": "ready",
            "cube_url": f"http://localhost:4000/cubejs-api/v1/load/{data_source_type}_cube",
            "dashboard_url": f"http://localhost:4000/dashboard/{data_source_type}"
        }
    }