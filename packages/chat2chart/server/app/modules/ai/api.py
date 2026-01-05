"""
Full AI API for Chat Integration and ECharts Generation
Provides comprehensive AI-powered analytics and visualization
"""

import logging
import json
import datetime
from datetime import timezone
import httpx
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import asyncio

from .services.ai_orchestrator import AIOrchestrator
from .services.litellm_service import LiteLLMService
from app.core.deps import get_current_user
from app.core.cache import cache
# User model removed - user management will be handled by Supabase
from app.modules.authentication.deps.auth_bearer import JWTCookieBearer
from typing import Union

logger = logging.getLogger(__name__)

router = APIRouter(tags=["AI Services"])


# Request/Response Models
class ChatAnalysisRequest(BaseModel):
    query: str
    data_source_id: Optional[str] = None
    conversation_id: Optional[str] = None  # Conversation ID for context
    business_context: Optional[str] = None
    data_source_context: Optional[Dict[str, Any]] = None  # Enhanced context
    user_context: Optional[Dict[str, Any]] = None  # User preferences and history
    selected_data_sources: Optional[List[Dict[str, Any]]] = None  # Multi-source context
    model: Optional[str] = None  # AI model to use (from frontend selection)
    analysis_mode: Optional[str] = "standard"  # Analysis mode: "standard" (default) or "deep"


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
    # Optional schema-level scope to limit generation (avoid whole DB when not desired)
    scope: Optional[Dict[str, Any]] = (
        None  # { "schemas": ["public"], "tables": ["sales", ...] }
    )


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    data_sources: Optional[List[Dict]] = None
    analysis_type: Optional[str] = "general"


class EnhancedAnalysisRequest(BaseModel):
    query: str
    data_sources: List[Dict]
    conversation_history: Optional[List[Dict]] = None
    analysis_type: str = "general"


class AnalysisResponse(BaseModel):
    success: bool
    analysis: Optional[Dict] = None
    strategy_used: Optional[str] = None
    data_sources_used: Optional[List[str]] = None
    context_summary: Optional[str] = None
    execution_metadata: Optional[Dict] = None
    error: Optional[str] = None
    fallback_suggestion: Optional[str] = None


# Core Chat Integration Endpoints
@router.post("/chat/analyze")
async def analyze_chat_query(
    request: ChatAnalysisRequest,
    current_token: Union[str, dict] = Depends(JWTCookieBearer())
) -> Dict[str, Any]:
    """
    Analyze chat query and provide intelligent response with data insights
    """
    try:
        # Let AI service handle all queries, including greetings
        # This ensures we get real AI responses instead of hardcoded ones

        # Respect analysis_mode from request, default to "standard"
        analysis_mode = request.analysis_mode or "standard"
        
        # Log data source type for debugging (but don't force routing based on it)
        if request.data_source_id:
            try:
                from app.modules.data.services.data_connectivity_service import DataConnectivityService
                data_service = DataConnectivityService()
                source_result = await data_service.get_data_source(request.data_source_id)
                if source_result.get("success"):
                    source_info = source_result.get("data_source", {})
                    source_type = source_info.get('type', '').lower() if isinstance(source_info, dict) else 'unknown'
                    logger.info(f"📊 Data source type: {source_type}, analysis_mode: {analysis_mode}")
            except Exception as e:
                logger.debug(f"Could not check data source type: {str(e)}")
        
        # CRITICAL: Route all data sources (file, database, warehouse, API) to LangGraph orchestrator
        # The orchestrator's routing logic will handle whether to use deep_file_analysis or standard SQL path
        # based on analysis_mode
        if request.data_source_id:
            try:
                from .services.langgraph_orchestrator import LangGraphMultiAgentOrchestrator
                
                # Extract user info from token
                user_payload = current_token if isinstance(current_token, dict) else {}
                user_id = str(user_payload.get('id') or user_payload.get('user_id') or user_payload.get('sub') or '')
                
                # Initialize services
                from app.modules.data.services.multi_engine_query_service import MultiEngineQueryService
                from app.modules.data.services.data_connectivity_service import DataConnectivityService
                from app.db.session import get_async_session
                
                multi_query_service = MultiEngineQueryService()
                data_service = DataConnectivityService()
                async_session_factory = get_async_session
                
                # Initialize orchestrator
                orchestrator = LangGraphMultiAgentOrchestrator(
                    multi_query_service=multi_query_service,
                    data_service=data_service,
                    async_session_factory=async_session_factory
                )
                
                logger.info(f"🚀 Starting LangGraph analysis for data source: {request.data_source_id} (mode: {analysis_mode})")
                # Organization context removed - use default value
                organization_id = '1'
                result = await orchestrator.execute(
                    query=request.query,
                    conversation_id=request.conversation_id or "",
                    user_id=user_id,
                    organization_id=organization_id,  # Default value since organization context removed
                    data_source_id=request.data_source_id,
                    analysis_mode=analysis_mode,
                    model=request.model  # Pass model from request
                )
                
                logger.info(f"✅ LangGraph data analysis completed. Result keys: {list(result.keys()) if isinstance(result, dict) else 'not a dict'}")
                
                return {
                    "success": True,
                    "query": request.query,
                    "analysis": result.get("narration") or result.get("analysis") or result.get("message", ""),
                    "query_result": result.get("query_result"),
                    "echarts_config": result.get("echarts_config"),
                    "insights": result.get("insights", []),
                    "recommendations": result.get("recommendations", []),
                    "execution_metadata": result.get("execution_metadata", {}),
                    "ai_engine": result.get("execution_metadata", {}).get("ai_engine", "LangGraph"),
                }
            except Exception as e:
                logger.error(f"❌ LangGraph orchestrator failed for data analysis: {str(e)}", exc_info=True)
                # CRITICAL: Don't fall through to LiteLLM - return error to prevent duplicate responses
                return {
                    "success": False,
                    "query": request.query,
                    "analysis": f"Data analysis failed: {str(e)}. Please try again.",
                    "error": str(e),
                    "execution_metadata": {
                        "status": "error",
                        "timestamp": str(datetime.datetime.now()),
                    },
                    "ai_engine": "Error",
                }
        
        # CRITICAL: Handle queries WITHOUT data sources - route to LangGraph for conversational mode
        # This ensures consistent workflow and proper message handling
        if not request.data_source_id:
            try:
                from .services.langgraph_orchestrator import LangGraphMultiAgentOrchestrator
                
                # Extract user info from token
                user_payload = current_token if isinstance(current_token, dict) else {}
                user_id = str(user_payload.get('id') or user_payload.get('user_id') or user_payload.get('sub') or '')
                
                # Initialize services
                from app.modules.data.services.multi_engine_query_service import MultiEngineQueryService
                from app.modules.data.services.data_connectivity_service import DataConnectivityService
                from app.db.session import get_async_session
                
                multi_query_service = MultiEngineQueryService()
                data_service = DataConnectivityService()
                async_session_factory = get_async_session
                
                # Initialize orchestrator
                orchestrator = LangGraphMultiAgentOrchestrator(
                    multi_query_service=multi_query_service,
                    data_service=data_service,
                    async_session_factory=async_session_factory
                )
                
                logger.info(f"💬 No data_source_id - routing to LangGraph conversational mode")
                # Organization context removed - use default value
                organization_id = '1'
                result = await orchestrator.execute(
                    query=request.query,
                    conversation_id=request.conversation_id or "",
                    user_id=user_id,
                    organization_id=organization_id,  # Default value since organization context removed
                    model=request.model,  # Pass model from request
                    data_source_id=None,  # Explicitly None for conversational mode
                    analysis_mode="standard"
                )
                
                logger.info(f"✅ LangGraph conversational mode completed. Result keys: {list(result.keys()) if isinstance(result, dict) else 'not a dict'}")
                
                return {
                    "success": True,
                    "query": request.query,
                    "analysis": result.get("narration") or result.get("analysis") or result.get("message", "I understand your question. To perform data analysis, please select a data source first."),
                    "message": result.get("narration") or result.get("analysis") or result.get("message", "I understand your question. To perform data analysis, please select a data source first."),
                    "narration": result.get("narration") or result.get("analysis") or result.get("message", "I understand your question. To perform data analysis, please select a data source first."),
                    "execution_metadata": result.get("execution_metadata", {
                        "status": "success",
                        "timestamp": str(datetime.datetime.now()),
                    }),
                    "ai_engine": result.get("ai_engine", "LangGraph Conversational"),
                }
            except Exception as e:
                logger.error(f"❌ LangGraph conversational mode failed: {str(e)}", exc_info=True)
                # Fallback to LiteLLM if LangGraph fails
                from .services.litellm_service import LiteLLMService
                litellm = LiteLLMService()
                
                system_context = "You are Aicser, an AI data analyst. Be helpful and concise. If the user asks about data analysis, remind them to select a data source first."
                
                ai_response = await litellm.generate_completion(
                    prompt=request.query,
                    system_context=system_context,
                    max_tokens=300,
                    temperature=0.7,
                )
                
                if ai_response.get("success") and ai_response.get("content"):
                    return {
                        "success": True,
                        "query": request.query,
                        "analysis": ai_response.get("content", "I apologize, but I could not generate a response."),
                        "message": ai_response.get("content", "I apologize, but I could not generate a response."),
                        "narration": ai_response.get("content", "I apologize, but I could not generate a response."),
                        "execution_metadata": {
                            "status": "success",
                            "timestamp": str(datetime.datetime.now()),
                        },
                        "ai_engine": "LiteLLM Conversational (Fallback)",
                    }
                else:
                    return {
                        "success": False,
                        "query": request.query,
                        "analysis": "I encountered an error processing your request. Please try again.",
                        "message": "I encountered an error processing your request. Please try again.",
                        "error": "Failed to generate conversational response",
                        "execution_metadata": {
                            "status": "error",
                            "timestamp": str(datetime.datetime.now()),
                        },
                        "ai_engine": "Error",
                    }
        
        # Fallback response (should rarely be reached)
        return {
            "success": True,
            "query": request.query,
            "analysis": "I understand you're asking about data analysis. To perform data analysis, please select a data source first. I'm here to help coordinate the analysis once you do!",
            "execution_metadata": {
                "status": "fallback",
                "timestamp": str(datetime.datetime.now()),
            },
            "ai_engine": "Fallback",
        }
    except Exception as e:
        logger.error(f"❌ Chat analysis failed: {str(e)}", exc_info=True)
        return {
            "success": False,
            "query": request.query,
            "analysis": f"I encountered an error processing your request: {str(e)}. Please try again.",
            "error": str(e),
            "execution_metadata": {
                "status": "error",
                "timestamp": str(datetime.datetime.now()),
            },
            "ai_engine": "Error",
        }


@router.post("/query-editor/generate-code")
async def generate_query_editor_code(
    request: Dict[str, Any],
    current_token: Union[str, dict] = Depends(JWTCookieBearer())
) -> Dict[str, Any]:
    """
    Generate SQL or Python code for query editor.
    Reuses LangGraph orchestrator logic but stops after code generation and validation.
    
    Request:
        {
            "query": "Show me sales from last month",
            "data_source_id": "db_123",
            "language": "sql",  // or "python"
            "current_sql": "SELECT * FROM employees WHERE salary > 100000"  // optional
        }
    
    Response:
        {
            "success": true,
            "code": "SELECT * FROM sales WHERE date >= '2024-12-01'",
            "language": "sql"
        }
    """
    try:
        # Extract request parameters
        query = request.get("query", "").strip()
        data_source_id = request.get("data_source_id", "").strip()
        language = request.get("language", "sql").strip().lower()
        current_sql = request.get("current_sql", "").strip()
        
        # Validate required fields
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        
        if not data_source_id:
            raise HTTPException(status_code=400, detail="Data source ID is required")
        
        if language not in ["sql", "python"]:
            raise HTTPException(status_code=400, detail="Language must be 'sql' or 'python'")
        
        # Extract user info from token (same as /chat/analyze)
        user_payload = current_token if isinstance(current_token, dict) else {}
        user_id = str(user_payload.get('id') or user_payload.get('user_id') or user_payload.get('sub') or '')
        
        # Initialize services (same as /chat/analyze)
        from .services.langgraph_orchestrator import LangGraphMultiAgentOrchestrator
        from app.modules.data.services.multi_engine_query_service import MultiEngineQueryService
        from app.modules.data.services.data_connectivity_service import DataConnectivityService
        from app.db.session import get_async_session
        
        multi_query_service = MultiEngineQueryService()
        data_service = DataConnectivityService()
        async_session_factory = get_async_session
        
        # Initialize orchestrator
        orchestrator = LangGraphMultiAgentOrchestrator(
            multi_query_service=multi_query_service,
            data_service=data_service,
            async_session_factory=async_session_factory
        )
        
        logger.info(f"🔧 Generating {language.upper()} code for query editor: {query[:100]}...")
        
        # Organization context removed - use default value
        organization_id = '1'
        
        # Call generate_code_only method
        result = await orchestrator.generate_code_only(
            query=query,
            data_source_id=data_source_id,
            language=language,
            current_sql=current_sql if current_sql else None,
            user_id=user_id,
            organization_id=organization_id,
            model=None  # Use default model
        )
        
        if result.get("success"):
            logger.info(f"✅ Code generation successful: {len(result.get('code', ''))} characters")
            return {
                "success": True,
                "code": result.get("code", ""),
                "language": result.get("language", language)
            }
        else:
            error_msg = result.get("error", "Code generation failed")
            logger.error(f"❌ Code generation failed: {error_msg}")
            raise HTTPException(status_code=500, detail=error_msg)
            
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ Query editor code generation error: {error_msg}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Code generation failed: {error_msg}")


@router.post("/chat", response_model=Dict)
async def chat_completion(
    request: ChatRequest, current_user = Depends(get_current_user)  # User model removed
):
    """Standard chat completion endpoint"""
    try:
        ai_orchestrator = AIOrchestrator()

        # If data sources are provided, use enhanced analysis
        if request.data_sources:
            result = await ai_orchestrator.analyze_data_with_context(
                user_query=request.message,
                data_sources=request.data_sources,
                conversation_history=request.conversation_id,  # You might want to fetch actual history
                analysis_type=request.analysis_type,
            )
            return result
        else:
            # Standard chat completion
            result = await ai_orchestrator.chat_completion(
                messages=[{"role": "user", "content": request.message}]
            )
            return result

    except Exception as e:
        logger.error(f"Chat completion failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat completion failed: {str(e)}")


@router.post("/analyze", response_model=AnalysisResponse)
async def enhanced_data_analysis(
    request: EnhancedAnalysisRequest, current_user = Depends(get_current_user)  # User model removed
):
    """Enhanced data analysis with full context awareness"""
    try:
        ai_orchestrator = AIOrchestrator()

        result = await ai_orchestrator.analyze_data_with_context(
            user_query=request.query,
            data_sources=request.data_sources,
            conversation_history=request.conversation_history,
            analysis_type=request.analysis_type,
        )

        return AnalysisResponse(**result)

    except Exception as e:
        logger.error(f"Enhanced analysis failed: {str(e)}")
        return AnalysisResponse(
            success=False,
            error=f"Analysis failed: {str(e)}",
            fallback_suggestion="Try rephrasing your query or check data source connections",
        )


@router.post("/chat/stream")
async def stream_chat_analysis(request: ChatAnalysisRequest):
    """Stream AI chat analysis with real-time updates"""
    try:
        logger.info(
            f"🚀 Starting streaming chat analysis for query: {request.query[:100]}..."
        )

        # Build comprehensive data context
        data_context = await _build_comprehensive_data_context(request)

        # Build enhanced system context
        system_context = await _build_enhanced_system_context(request, data_context)

        # Prepare streaming response
        async def generate_stream():
            try:
                # Start with metadata
                yield f"data: {json.dumps({'type': 'execution_metadata', 'metadata': {'start_time': datetime.datetime.now().isoformat(), 'data_source': data_context.get('type', 'unknown')}})}\n\n"

                # Generate AI response with streaming
                from .services.litellm_service import LiteLLMService

                litellm_service = LiteLLMService()
                ai_response = await litellm_service.generate_completion_stream(
                    messages=[
                        {"role": "system", "content": system_context},
                        {"role": "user", "content": request.query},
                    ],
                    data_context=data_context,
                    stream=True,
                )

                if not ai_response or not ai_response.get("success"):
                    # Fallback response
                    fallback = await _generate_enhanced_fallback(
                        request.query, data_context
                    )
                    yield f"data: {json.dumps({'type': 'content', 'content': fallback.get('content', 'Sorry, I encountered an error. Please try again.')})}\n\n"
                else:
                    # Stream the content
                    content = ai_response.get("content", "")
                    if content:
                        # Split content into chunks for streaming
                        chunks = content.split(" ")
                        for i, chunk in enumerate(chunks):
                            yield f"data: {json.dumps({'type': 'content', 'content': chunk + ' '})}\n\n"
                            await asyncio.sleep(
                                0.05
                            )  # Small delay for smooth streaming

                    # Add execution metadata
                    execution_metadata = {
                        "execution_time": ai_response.get("execution_time", 0),
                        "data_source": data_context.get("type", "unknown"),
                        "total_rows": data_context.get("total_rows", 0),
                        "timestamp": datetime.datetime.now().isoformat(),
                        "ai_model": ai_response.get("model", "unknown"),
                    }
                    yield f"data: {json.dumps({'type': 'execution_metadata', 'metadata': execution_metadata})}\n\n"

                    # Add SQL queries if available
                    if ai_response.get("sql_queries"):
                        for sql in ai_response["sql_queries"]:
                            yield f"data: {json.dumps({'type': 'sql_query', 'query': sql})}\n\n"

                    # Add chart data if available
                    if ai_response.get("chart_data"):
                        yield f"data: {json.dumps({'type': 'chart_data', 'data': ai_response['chart_data']})}\n\n"

                # End stream
                yield "data: [DONE]\n\n"

            except Exception as e:
                logger.error(f"❌ Streaming error: {str(e)}")
                error_response = {
                    "type": "error",
                    "error": str(e),
                    "fallback": await _generate_enhanced_fallback(
                        request.query, data_context
                    ),
                }
                yield f"data: {json.dumps(error_response)}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate_stream(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "text/event-stream",
            },
        )

    except Exception as e:
        logger.error(f"❌ Streaming chat analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Streaming failed: {str(e)}")


# Deprecated duplicate: removed extra /chat/stream handler (use the SSE version above)


@router.post("/echarts/generate")
async def generate_echarts(
    request: EChartsGenerationRequest,
    current_user = Depends(get_current_user),  # User model removed
) -> Dict[str, Any]:
    """
    Generate ECharts configuration based on query and data
    """
    try:
        from .services.litellm_service import LiteLLMService

        service = LiteLLMService()

        # Build cache key and try cache first
        cache_key = None
        try:
            cache_key = cache._generate_key(
                "echarts_gen",
                json.dumps(
                    {
                        "u": getattr(current_user, "id", None),
                        "q": request.query,
                        "ds": request.data_source_id,
                        "sum": request.data_summary or {},
                    },
                    sort_keys=True,
                    default=str,
                ),
            ) if cache else None
            if cache_key and cache:
                cached = cache.get(cache_key)
                if cached:
                    return cached
        except Exception:
            pass

        system_context = f"""You are an expert data visualization specialist with a creative and helpful personality. Generate ECharts configuration for the user's request.

Data Source: {request.data_source_id or "None"}
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
            temperature=0.3,
        )

        if ai_response.get("success") and ai_response.get("content"):
            # Parse AI response to extract ECharts config
            try:
                # Try to extract JSON from AI response
                import json
                import re

                # Look for JSON in the response
                content = ai_response.get("content", "")
                json_match = re.search(r"```json\s*(\{.*?\})\s*```", content, re.DOTALL)
                if json_match:
                    echarts_config = json.loads(json_match.group(1))
                else:
                    echarts_config = _generate_fallback_echarts_config(request.query)

                # Validate minimal ECharts config structure
                _validate_echarts_config(echarts_config)

                response_payload = {
                    "success": True,
                    "chart_type": echarts_config.get("series", [{}])[0].get(
                        "type", "bar"
                    ),
                    "echarts_config": echarts_config,
                    "ai_engine": "GPT-5 Mini (Azure)",
                    "query": request.query,
                }

                # Store in cache
                try:
                    if cache_key and cache:
                        cache.set(cache_key, response_payload, ttl=300)
                except Exception:
                    pass

                return response_payload
            except Exception as parse_error:
                logger.error(f"Failed to parse ECharts config: {parse_error}")
                echarts_config = _generate_fallback_echarts_config(request.query)
                _validate_echarts_config(echarts_config)
                response_payload = {
                    "success": True,
                    "chart_type": "bar",
                    "echarts_config": echarts_config,
                    "ai_engine": "Fallback System",
                    "query": request.query,
                }
                try:
                    if cache_key and cache:
                        cache.set(cache_key, response_payload, ttl=300)
                except Exception:
                    pass
                return response_payload
        else:
            # Use fallback
            echarts_config = _generate_fallback_echarts_config(request.query)
            _validate_echarts_config(echarts_config)
            response_payload = {
                "success": True,
                "chart_type": "bar",
                "echarts_config": echarts_config,
                "ai_engine": "Fallback System",
                "query": request.query,
            }
            try:
                if cache_key and cache:
                    cache.set(cache_key, response_payload, ttl=300)
            except Exception:
                pass
            return response_payload

    except Exception as e:
        logger.error(f"ECharts generation failed: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"ECharts generation failed: {str(e)}"
        )


@router.get("/sample-data/{dataset_type}")
async def get_sample_dataset(dataset_type: str) -> Dict[str, Any]:
    """
    Get sample dataset for AI analysis and demonstration
    """
    try:
        from .services.sample_data_service import sample_data_service

        if dataset_type not in [
            "bank_customers",
            "ecommerce_sales",
            "telecom_customers",
            "poverty_indicators",
        ]:
            raise HTTPException(
                status_code=400, detail=f"Unknown dataset type: {dataset_type}"
            )

        dataset = sample_data_service.get_sample_dataset(dataset_type)
        return dataset

    except Exception as e:
        logger.error(f"Sample data generation failed: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Sample data generation failed: {str(e)}"
        )


@router.post("/sample-data/{dataset_type}/analyze")
async def analyze_sample_dataset(
    dataset_type: str, request: ChatAnalysisRequest
) -> Dict[str, Any]:
    """
    Analyze sample dataset with AI and generate insights
    """
    try:
        from .services.sample_data_service import sample_data_service
        from .services.litellm_service import LiteLLMService

        # Get sample data
        dataset = sample_data_service.get_sample_dataset(dataset_type)

        # Create enhanced system context for sample data analysis
        system_context = f"""You are an expert AI data analyst working with a {dataset_type.replace("_", " ")} dataset.

Dataset Summary:
{json.dumps(dataset["summary"], indent=2)}

Available Data Structure:
{json.dumps(dataset["data"], indent=2)}

Pre-generated ECharts Examples:
{json.dumps(dataset["echarts_examples"], indent=2)}

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
            temperature=0.7,
        )

        if ai_response.get("success") and ai_response.get("content"):
            # Clean up AI response to remove ALL metadata clutter
            clean_analysis = ai_response.get("content", "")

            # Remove ALL metadata patterns and unwanted sections
            import re

            # Remove ALL template sections and metadata
            patterns_to_remove = [
                r"🤖 AI Response\s*\n*",
                r"Query:.*?\n",
                r"Response:.*?\n",
                r"🔍 Data Analysis Guidance:.*?(?=\n\n|\n$|$)",
                r"📊 Available Tools:.*?(?=\n\n|\n$|$)",
                r"💡 What You Can Do Right Now:.*?(?=\n\n|\n$|$)",
                r"🤖 AI Engine:.*?\n",
                r"💡 What I can do for you:.*?(?=\n\n|\n$|$)",
                r"🚀 Try asking:.*?(?=\n\n|\n$|$)",
                r"Please try connecting.*?(?=\n\n|\n$|$)",
                r"^(Query|AI Engine|Capabilities|Model|Dataset|Analysis):.*?\n",
                r"💡\s*What I can do for you.*?(?=\n\n|\n$|$)",
                r"🚀\s*Try asking.*?(?=\n\n|\n$|$)",
            ]

            for pattern in patterns_to_remove:
                clean_analysis = re.sub(
                    pattern,
                    "",
                    clean_analysis,
                    flags=re.DOTALL | re.MULTILINE | re.IGNORECASE,
                )

            # Clean up extra whitespace and formatting
            clean_analysis = re.sub(r"\n\s*\n", "\n\n", clean_analysis).strip()

            # Remove any empty lines at the beginning
            clean_analysis = re.sub(r"^\n+", "", clean_analysis)

            # If response is empty after cleaning, provide a simple fallback
            if not clean_analysis.strip():
                clean_analysis = "I've analyzed your data and here are the key insights. Let me know if you need any specific analysis or have questions!"

            return {
                "success": True,
                "analysis": clean_analysis,
                "dataset_type": dataset_type,
            }
        else:
            # Use fallback response
            fallback = service._generate_fallback_response(
                request.query, Exception("AI analysis failed")
            )
            return {"success": True, "analysis": fallback, "dataset_type": dataset_type}

    except Exception as e:
        logger.error(f"Sample data analysis failed: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Sample data analysis failed: {str(e)}"
        )


@router.post("/insights/generate")
async def generate_business_insights(
    request: BusinessInsightsRequest,
) -> Dict[str, Any]:
    """
    Generate business insights from data source
    """
    try:
        from .services.litellm_service import LiteLLMService

        service = LiteLLMService()

        system_context = f"""You are a business intelligence expert with a warm, engaging personality. Analyze the data source and provide actionable insights.

Data Source ID: {request.data_source_id}
Analysis Type: {request.analysis_type or "comprehensive"}
Business Context: {request.business_context or "general analytics"}

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
            temperature=0.8,
        )

        if ai_response.get("success") and ai_response.get("content"):
            return {
                "success": True,
                "insights": ai_response.get("content"),
                "data_source_id": request.data_source_id,
                "ai_engine": "GPT-5 Mini (Azure)",
                "analysis_type": request.analysis_type,
            }
        else:
            fallback_insights = _generate_fallback_insights(request.data_source_id)
            return {
                "success": True,
                "insights": fallback_insights,
                "data_source_id": request.data_source_id,
                "ai_engine": "Fallback System",
                "analysis_type": request.analysis_type,
            }

    except Exception as e:
        logger.error(f"Business insights generation failed: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Insights generation failed: {str(e)}"
        )


@router.post("/schema/generate")
async def generate_ai_schema(request: SchemaGenerationRequest) -> Dict[str, Any]:
    """
    Generate AI-powered data schema and Cube.js model
    
    NOTE: This endpoint is currently disabled. Auto-detection works fine.
    Will be re-enabled with a better approach later.
    """
    # DISABLED: Return fallback schema instead of AI generation
    # This avoids JSON serialization issues with date objects
    logger.info("⚠️ AI schema generation is disabled - using fallback schema")
    
    try:
        # Use fallback schema generation instead
        def _generate_fallback_yaml_schema(data_source_type: str) -> str:
            """Generate a basic fallback YAML schema"""
            return f"""# Fallback schema (AI generation disabled)
data_source_type: {data_source_type}
tables: []
"""
        
        def _generate_cube_structure(data_source_type: str, yaml_schema: str) -> Dict[str, Any]:
            """Generate a basic fallback Cube.js structure"""
            return {
                "cubes": [],
                "dimensions": [],
                "measures": []
            }
        
        yaml_schema = _generate_fallback_yaml_schema(request.data_source_type)
        cube_structure = _generate_cube_structure(request.data_source_type, yaml_schema)
        return {
            "success": True,
            "yaml_schema": yaml_schema,
            "cube_structure": cube_structure,
            "data_source_id": request.data_source_id,
            "ai_engine": "Fallback System (AI generation disabled)",
            "deployment_status": "ready",
        }
    except Exception as e:
        logger.error(f"Fallback schema generation failed: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Schema generation failed: {str(e)}"
        )
    
    # OLD CODE - DISABLED (AI generation removed to avoid JSON serialization issues)
    # The old AI-powered schema generation code has been removed.
    # Auto-detection works fine, and we'll implement a better approach later.


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
            "status": "operational",
        }
    except Exception as e:
        logger.error(f"AI configuration test failed: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "azure_openai_test": {"success": False, "error": str(e)},
            "general_test": {"success": False, "error": str(e)},
        }


@router.get("/models")
async def get_available_models(current_user = Depends(get_current_user)):  # User model removed
    """Get available AI models"""
    try:
        litellm_service = LiteLLMService()
        models = litellm_service.get_available_models()
        return {"success": True, "models": models}
    except Exception as e:
        logger.error(f"Failed to get models: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get models: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.datetime.now(timezone.utc).isoformat(),
        "service": "AI Orchestrator",
    }


# Deprecated duplicate: removed secondary /test-config endpoint (keep the one above)


# Comprehensive Data Context Builder
async def _build_comprehensive_data_context(
    request: ChatAnalysisRequest,
) -> Dict[str, Any]:
    """Build comprehensive data context including Cube.js integration"""
    data_context = {
        "summary": {},
        "schema": {},
        "sample_data": {},
        "cube_integration": False,
        "data_source_type": None,
        "available_metrics": [],
        "available_dimensions": [],
    }

    try:
        # Load primary source
        if request.data_source_id:
            # Try to get data source info from data API
            async with httpx.AsyncClient() as client:
                try:
                    # Get data source details
                    data_response = await client.get(
                        f"http://localhost:8000/data/sources/{request.data_source_id}"
                    )
                    if data_response.status_code == 200:
                        data_source = data_response.json()
                        data_context["data_source_type"] = data_source.get("type")
                        data_context["summary"]["name"] = data_source.get("name")
                        data_context["summary"]["description"] = data_source.get(
                            "description"
                        )

                        # Get schema and data
                        schema_response = await client.get(
                            f"http://localhost:8000/data/sources/{request.data_source_id}/data"
                        )
                        if schema_response.status_code == 200:
                            schema_data = schema_response.json()
                            data_context["schema"] = schema_data.get("schema", {})
                            data_context["sample_data"] = schema_data.get(
                                "sample_data", {}
                            )

                            # Extract available metrics and dimensions
                            if data_context["data_source_type"] == "database":
                                tables = schema_data.get("schema", {}).get("tables", [])
                                for table in tables:
                                    if table and table.get("columns"):
                                        columns = table.get("columns", [])
                                        for col in columns:
                                            if col and col.get("data_type") in [
                                                "integer",
                                                "numeric",
                                                "decimal",
                                                "float",
                                            ]:
                                                table_name = table.get(
                                                    "name", "unknown"
                                                )
                                                col_name = col.get("name", "unknown")
                                                if table_name and col_name:
                                                    data_context[
                                                        "available_metrics"
                                                    ].append(f"{table_name}.{col_name}")
                                            elif col and col.get("name"):
                                                data_context[
                                                    "available_dimensions"
                                                ].append(col.get("name"))

                            elif data_context["data_source_type"] == "file":
                                columns = schema_data.get("schema", {}).get(
                                    "columns", []
                                )
                                for col in columns:
                                    if (
                                        col
                                        and col.get("type") in ["number", "integer"]
                                        and col.get("name")
                                    ):
                                        data_context["available_metrics"].append(
                                            col.get("name")
                                        )
                                    elif col and col.get("name"):
                                        data_context["available_dimensions"].append(
                                            col.get("name")
                                        )

                        # Try Cube.js integration if available
                        if data_context["data_source_type"] in ["cube", "warehouse"]:
                            try:
                                cube_response = await client.get(
                                    f"http://localhost:8000/cube/schema/{request.data_source_id}"
                                )
                                if cube_response.status_code == 200:
                                    cube_data = cube_response.json()
                                    data_context["cube_integration"] = True
                                    data_context["cube_schema"] = cube_data
                                    data_context["available_metrics"] = [
                                        m.get("name")
                                        for m in cube_data.get("measures", [])
                                        if m and m.get("name")
                                    ]
                                    data_context["available_dimensions"] = [
                                        d.get("name")
                                        for d in cube_data.get("dimensions", [])
                                        if d and d.get("name")
                                    ]
                            except Exception as cube_error:
                                logger.warning(
                                    f"Cube.js integration failed: {cube_error}"
                                )

                except Exception as data_error:
                    logger.warning(f"Data source fetch failed: {data_error}")
        # Merge selected additional sources for multi-source context
        if request.selected_data_sources:
            data_context["selected_sources"] = [
                s.get("id") for s in request.selected_data_sources
            ]
            # Add files as additional context for LLM
            data_context["file_sources"] = [
                s for s in request.selected_data_sources if s.get("type") == "file"
            ]
            # Add cube/databases for semantic hints
            data_context["db_sources"] = [
                s
                for s in request.selected_data_sources
                if s.get("type") in ["database", "warehouse", "cube"]
            ]

    except Exception as e:
        logger.error(f"Data context building failed: {e}")

    return data_context


# Enhanced System Context Builder
async def _build_enhanced_system_context(
    request: ChatAnalysisRequest, data_context: Dict[str, Any]
) -> str:
    """Build comprehensive system context for AI analysis"""

    base_context = """You are an expert AI data analyst and business intelligence specialist with a warm, conversational personality.

Your capabilities:
- Analyze data queries and provide actionable insights
- Generate sample data when needed for demonstrations
- Create ECharts configurations and visualizations
- Recommend optimal chart types and visualizations
- Generate business intelligence and recommendations
- Help users understand their data and make decisions
- Be conversational, friendly, and engaging

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
- Be helpful even without connected data sources
- Focus on practical business value and actionable insights
- Provide specific recommendations with data-driven reasoning
- Include SQL queries when appropriate for database analysis
- Generate chart recommendations with proper ECharts configuration"""

    # Add comprehensive data context
    if data_context and data_context.get("data_source_type"):
        context = f"""{base_context}

Current Data Source Context:
- Type: {data_context.get("data_source_type", "Unknown")}
- Name: {data_context.get("summary", {}).get("name", "Unknown")}
- Description: {data_context.get("summary", {}).get("description", "No description")}
- Available Metrics: {len(data_context.get("available_metrics", []))}
- Available Dimensions: {len(data_context.get("available_dimensions", []))}"""

        # Add Cube.js specific context
        if data_context.get("cube_integration") and data_context.get("cube_schema"):
            cube_schema = data_context["cube_schema"]
            context += f"""

Cube.js Semantic Model:
- Total Cubes: {len(cube_schema.get("cubes", []))}
- Total Dimensions: {len(cube_schema.get("dimensions", []))}
- Total Measures: {len(cube_schema.get("measures", []))}
- Time Dimensions: {len([d for d in cube_schema.get("dimensions", []) if d.get("type") == "time"])}
- Pre-aggregations: {len(cube_schema.get("pre_aggregations", []))}

Available Metrics: {", ".join(data_context.get("available_metrics", [])[:10])}
Available Dimensions: {", ".join(data_context.get("available_dimensions", [])[:10])}

Use this semantic model for:
- Business-friendly query generation
- Optimized aggregations using pre-aggregations
- Time-based analysis with proper granularity
- Performance-optimized queries
- Domain-specific insights
- Semantic business logic"""

        # Add database context
        elif data_context.get("data_source_type") in ["database", "warehouse"]:
            schema = data_context.get("schema", {})
            if schema:
                context += f"""

Database Schema:
- Tables: {len(schema.get("tables", []))}
- Total Rows: {schema.get("total_rows", "Unknown")}
- Schemas: {", ".join(schema.get("schemas", []))}

Available Metrics: {", ".join(data_context.get("available_metrics", [])[:10])}
Available Dimensions: {", ".join(data_context.get("available_dimensions", [])[:10])}

Use this schema for:
- Accurate SQL generation with proper table relationships
- Table relationship analysis
- Data type validation
- Performance optimization
- Complex joins and aggregations"""

        # Add file context
        elif data_context.get("data_source_type") == "file":
            schema = data_context.get("schema", {})
            if schema:
                context += f"""

File Data Structure:
- Columns: {len(schema.get("columns", []))}
- Row Count: {schema.get("row_count", "Unknown")}
- Sample Data: Available

Available Metrics: {", ".join(data_context.get("available_metrics", [])[:10])}
Available Dimensions: {", ".join(data_context.get("available_dimensions", [])[:10])}

Use this structure for:
- Column-based analysis
- Data type inference
- Pattern recognition
- Statistical analysis
- Data quality assessment"""

        context += """

Analysis Instructions:
1. Start with a clear understanding of the user's request
2. Analyze the available data structure and capabilities
3. Provide specific, actionable insights based on the data
4. Include relevant SQL queries when appropriate
5. Recommend optimal chart types with ECharts configurations
6. Suggest follow-up questions and next steps
7. Be conversational and engaging while maintaining professionalism
8. Focus on business value and practical applications

Remember: You have access to real data sources and should use them to provide accurate, contextual analysis."""

        return context

    return base_context


# AI Response Processing Functions
async def _process_ai_response(
    content: str, query: str, data_context: Dict[str, Any]
) -> Dict[str, Any]:
    """Process and structure AI response for consistent output"""
    try:
        # Extract key insights and structure the response
        analysis = content.strip()

        # Generate execution metadata
        execution_metadata = {
            "status": "success",
            "timestamp": str(datetime.datetime.now()),
            "data_source_type": data_context.get("data_source_type"),
            "cube_integration": data_context.get("cube_integration", False),
            "available_metrics": len(data_context.get("available_metrics", [])),
            "available_dimensions": len(data_context.get("available_dimensions", [])),
        }

        # Extract data insights
        data_insights = {
            "key_findings": _extract_key_findings(analysis),
            "patterns": _extract_patterns(analysis),
            "recommendations": _extract_recommendations(analysis),
        }

        # Generate chart recommendations
        chart_recommendations = _generate_chart_recommendations(query, data_context)

        return {
            "analysis": analysis,
            "execution_metadata": execution_metadata,
            "data_insights": data_insights,
            "chart_recommendations": chart_recommendations,
        }

    except Exception as e:
        logger.error(f"AI response processing failed: {e}")
        return {
            "analysis": content,
            "execution_metadata": {"status": "processing_error", "error": str(e)},
            "data_insights": {},
            "chart_recommendations": [],
        }


async def _generate_enhanced_fallback(
    query: str, data_context: Dict[str, Any]
) -> Dict[str, Any]:
    """Generate enhanced fallback response with data context awareness"""
    try:
        if data_context.get("data_source_type"):
            # Generate context-aware fallback
            analysis = f"""I can see you have a {data_context.get("data_source_type")} data source connected. 

Based on the available data structure:
- **Available Metrics**: {len(data_context.get("available_metrics", []))} numeric fields for analysis
- **Available Dimensions**: {len(data_context.get("available_dimensions", []))} categorical fields for grouping

For your query: "{query}"

Here are some analysis suggestions:
1. **Exploratory Analysis**: Start with basic statistics on your metrics
2. **Pattern Recognition**: Look for trends across your dimensions
3. **Data Quality**: Check for missing values or outliers
4. **Business Insights**: Identify key performance indicators

Would you like me to:
- Generate specific charts for your data?
- Provide SQL queries for analysis?
- Create a comprehensive data summary?
- Help with specific business questions?

Let me know what specific analysis you'd like to perform!"""
        else:
            analysis = f"""I'd be happy to help you analyze your data! 

For your query: "{query}"

To provide the most accurate and insightful analysis, I recommend:
1. **Connect a Data Source**: Upload a file, connect to a database, or use Cube.js
2. **Specify Your Analysis**: Tell me what specific insights you're looking for
3. **Business Context**: Share any business goals or constraints

Once connected, I can:
- Generate interactive charts and visualizations
- Provide SQL queries and data analysis
- Identify patterns and trends
- Offer business recommendations
- Create comprehensive reports

Would you like help connecting a data source first?"""

        execution_metadata = {
            "status": "fallback",
            "timestamp": str(datetime.datetime.now()),
            "data_source_type": data_context.get("data_source_type"),
            "fallback_reason": "AI service unavailable",
        }

        data_insights = {
            "key_findings": [
                "Data source analysis available",
                "Multiple analysis options",
            ],
            "patterns": ["Structured fallback response", "Context-aware guidance"],
            "recommendations": ["Connect data source", "Specify analysis needs"],
        }

        return {
            "analysis": analysis,
            "execution_metadata": execution_metadata,
            "data_insights": data_insights,
        }

    except Exception as e:
        logger.error(f"Enhanced fallback generation failed: {e}")
        return {
            "analysis": f"I'm here to help with your data analysis! For your query: '{query}', I can provide insights, generate charts, and help with business intelligence. Let me know what specific analysis you need.",
            "execution_metadata": {"status": "fallback_error", "error": str(e)},
            "data_insights": {},
        }


def _extract_key_findings(analysis: str) -> List[str]:
    """Extract key findings from AI analysis"""
    # Simple extraction - in production, use more sophisticated NLP
    lines = analysis.split("\n")
    findings = []
    for line in lines:
        if any(
            keyword in line.lower()
            for keyword in ["key", "finding", "insight", "discovery", "pattern"]
        ):
            findings.append(line.strip())
    return findings[:5] if findings else ["Analysis completed successfully"]


def _extract_patterns(analysis: str) -> List[str]:
    """Extract patterns from AI analysis"""
    lines = analysis.split("\n")
    patterns = []
    for line in lines:
        if any(
            keyword in line.lower()
            for keyword in [
                "trend",
                "pattern",
                "correlation",
                "relationship",
                "increase",
                "decrease",
            ]
        ):
            patterns.append(line.strip())
    return patterns[:5] if patterns else ["Patterns identified in data"]


def _extract_recommendations(analysis: str) -> List[str]:
    """Extract recommendations from AI analysis"""
    lines = analysis.split("\n")
    recommendations = []
    for line in lines:
        if any(
            keyword in line.lower()
            for keyword in [
                "recommend",
                "suggest",
                "should",
                "could",
                "consider",
                "next step",
            ]
        ):
            recommendations.append(line.strip())
    return (
        recommendations[:5] if recommendations else ["Continue exploring data insights"]
    )


def _generate_chart_recommendations(
    query: str, data_context: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Generate chart recommendations based on query and data context"""
    recommendations = []

    # Basic chart recommendations based on query keywords
    query_lower = query.lower()

    if any(word in query_lower for word in ["trend", "time", "over time", "growth"]):
        recommendations.append(
            {
                "type": "line",
                "title": "Time Series Analysis",
                "description": "Show trends and patterns over time",
                "metrics": data_context.get("available_metrics", [])[:3],
            }
        )

    if any(word in query_lower for word in ["compare", "vs", "versus", "difference"]):
        recommendations.append(
            {
                "type": "bar",
                "title": "Comparison Chart",
                "description": "Compare values across different categories",
                "metrics": data_context.get("available_metrics", [])[:2],
            }
        )

    if any(word in query_lower for word in ["distribution", "spread", "range"]):
        recommendations.append(
            {
                "type": "histogram",
                "title": "Distribution Analysis",
                "description": "Show data distribution and spread",
                "metrics": data_context.get("available_metrics", [])[:1],
            }
        )

    if any(word in query_lower for word in ["correlation", "relationship", "scatter"]):
        recommendations.append(
            {
                "type": "scatter",
                "title": "Correlation Analysis",
                "description": "Explore relationships between variables",
                "metrics": data_context.get("available_metrics", [])[:2],
            }
        )

    # Default recommendation
    if not recommendations:
        recommendations.append(
            {
                "type": "bar",
                "title": "Data Overview",
                "description": "General overview of your data",
                "metrics": data_context.get("available_metrics", [])[:3],
            }
        )

    return recommendations


def _auto_generate_chart_from_context(
    query: str, data_context: Dict[str, Any]
) -> (Dict[str, Any], List[Dict[str, Any]]):
    """Generate a reasonable ECharts config and optional chart data from context."""
    try:
        # Prefer time series when time dimension present
        has_time = False
        if data_context.get("data_source_type") == "file":
            cols = data_context.get("schema", {}).get("columns", [])
            has_time = any(
                (c.get("type") == "date" or "time" in (c.get("name", "").lower()))
                for c in cols
            )
        elif data_context.get("data_source_type") in ["database", "warehouse"]:
            tables = data_context.get("schema", {}).get("tables", [])
            for t in tables:
                for c in t.get("columns", []):
                    if c.get("type") in ["timestamp", "datetime", "date"] or "time" in (
                        c.get("name", "").lower()
                    ):
                        has_time = True
                        break
                if has_time:
                    break

        if has_time:
            config = {
                "title": {"text": "Time Series", "left": "center"},
                "tooltip": {"trigger": "axis"},
                "xAxis": {"type": "time"},
                "yAxis": {"type": "value"},
                "series": [{"type": "line", "name": "Value", "data": []}],
            }
        else:
            config = _generate_fallback_echarts_config(query)
        return config, []
    except Exception:
        return _generate_fallback_echarts_config(query), []


def _suggest_sql_query_from_context(
    query: str, data_context: Dict[str, Any]
) -> Optional[str]:
    """Suggest a basic SQL query based on schema for DB sources."""
    try:
        if data_context.get("data_source_type") not in ["database", "warehouse"]:
            return None
        tables = data_context.get("schema", {}).get("tables", [])
        if not tables:
            return None
        table = tables[0]
        cols = [c.get("name") for c in table.get("columns", []) if c.get("name")]
        if not cols:
            return None
        limit = 100
        return f"SELECT {', '.join(cols[:5])} FROM {table.get('schema', 'public')}.{table.get('name')} LIMIT {limit};"
    except Exception:
        return None


# Helper Functions
def _generate_fallback_echarts_config(query: str) -> Dict[str, Any]:
    """Generate fallback ECharts configuration"""
    return {
        "title": {"text": f"Chart for: {query}", "left": "center"},
        "tooltip": {"trigger": "axis"},
        "xAxis": {
            "type": "category",
            "data": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        },
        "yAxis": {"type": "value"},
        "series": [
            {
                "name": "Data",
                "type": "bar",
                "data": [120, 200, 150, 80, 70, 110],
                "itemStyle": {"color": "#1890ff"},
            }
        ],
    }


def _validate_echarts_config(config: Dict[str, Any]) -> None:
    """Validate minimal ECharts option structure to avoid client errors."""
    if not isinstance(config, dict):
        raise ValueError("ECharts config must be a dict")
    # Required top-level keys sanity
    if "series" not in config or not isinstance(config["series"], list) or len(config["series"]) == 0:
        # ensure at least one default series
        config.setdefault("series", [{"type": "bar", "data": []}])
    # Ensure xAxis/yAxis exist for common charts
    first_type = config["series"][0].get("type", "bar")
    if first_type in {"bar", "line", "scatter", "area"}:
        config.setdefault("xAxis", {"type": "category", "data": config.get("xAxis", {}).get("data", [])})
        config.setdefault("yAxis", {"type": "value"})


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
                    {"name": "id", "sql": "id", "type": "string", "title": "ID"},
                    {
                        "name": "timestamp",
                        "sql": "timestamp",
                        "type": "time",
                        "title": "Timestamp",
                    },
                ],
                "measures": [
                    {
                        "name": "count",
                        "sql": "count(*)",
                        "type": "count",
                        "title": "Record Count",
                    }
                ],
            }
        ],
        "deployment": {
            "status": "ready",
            "cube_url": f"http://localhost:4000/cubejs-api/v1/load/{data_source_type}_cube",
            "dashboard_url": f"http://localhost:4000/dashboard/{data_source_type}",
        },
    }
