"""
Streaming API endpoint for real-time AI analysis
"""

import json
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.modules.authentication.deps.auth_bearer import JWTCookieBearer
from app.modules.ai.services.langgraph_orchestrator import LangGraphMultiAgentOrchestrator
from app.modules.ai.services.litellm_service import LiteLLMService
from app.db.session import get_async_session


class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles date and datetime objects"""
    def default(self, obj):
        from datetime import date, datetime
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        return super().default(obj)



class ChatRequestSchema(BaseModel):
    query: str
    conversation_id: Optional[str] = None
    data_source_id: Optional[str] = None
    organization_id: Optional[str] = None
    model: Optional[str] = None  # AI model to use (from frontend selection)
    analysis_mode: Optional[str] = "standard"  # Analysis mode: "standard" (default) or "deep"

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["ai-streaming"])


@router.post("/chat/analyze/stream")
async def analyze_query_streaming(
    request: ChatRequestSchema,
    current_token: dict = Depends(JWTCookieBearer())
):
    """
    Streaming endpoint for real-time AI analysis with SSE.
    
    Returns Server-Sent Events (SSE) with progress updates and results.
    """
    
    try:
        # Extract user info
        user_id = current_token.get('id') or current_token.get('user_id') or current_token.get('sub')
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )
        
        user_id = str(user_id)
        
        # Organization context removed - use default value
        organization_id = request.organization_id or current_token.get('organization_id') or '1'
        
        logger.info(f"🌊 Starting streaming analysis for user {user_id}, query: {request.query[:100]}")
        
        async def generate_stream():
            """Generate SSE stream from LangGraph"""
            try:
                # Initialize services
                litellm_service = LiteLLMService()
                async_session_factory = get_async_session
                
                # Import DataService correctly
                from app.modules.data.services.data_connectivity_service import DataConnectivityService
                from app.modules.data.services.multi_engine_query_service import MultiEngineQueryService
                data_service = DataConnectivityService()
                multi_query_service = MultiEngineQueryService()
                
                # Initialize orchestrator with all required services
                orchestrator = LangGraphMultiAgentOrchestrator(
                    litellm_service=litellm_service,
                    data_service=data_service,
                    multi_query_service=multi_query_service,
                    async_session_factory=async_session_factory
                )
                
                # Respect analysis_mode from request, default to "standard"
                analysis_mode = request.analysis_mode or "standard"
                
                # Log data source type for debugging (but don't force routing based on it)
                if request.data_source_id and data_service:
                    try:
                        if hasattr(data_service, 'data_sources') and request.data_source_id in data_service.data_sources:
                            source_info = data_service.data_sources[request.data_source_id]
                            source_type = source_info.get('type', '').lower() if isinstance(source_info, dict) else str(getattr(source_info, 'type', '')).lower()
                            logger.info(f"📊 Data source type: {source_type}, analysis_mode: {analysis_mode}")
                        else:
                            source_info = await data_service.get_data_source_by_id(request.data_source_id)
                            if source_info:
                                source_type = source_info.get('type', '').lower() if isinstance(source_info, dict) else str(getattr(source_info, 'type', '')).lower()
                                logger.info(f"📊 Data source type: {source_type}, analysis_mode: {analysis_mode}")
                    except Exception as e:
                        logger.debug(f"Could not check data source type for streaming: {e}")
                
                # Stream state updates
                async for state_update in orchestrator.execute_streaming(
                    query=request.query,
                    conversation_id=request.conversation_id or "",
                    user_id=user_id,
                    organization_id=organization_id,
                    data_source_id=request.data_source_id,
                    analysis_mode=analysis_mode,
                    model=request.model  # Pass model from request
                ):
                    # Format as SSE event
                    event_data = {
                        'type': state_update.get('event_type', 'progress'),
                        'stage': state_update.get('current_stage'),
                        'percentage': state_update.get('progress_percentage', 0),
                        'message': state_update.get('progress_message', ''),
                        'sql_query': state_update.get('sql_query'),
                        'query_result': state_update.get('query_result'),
                        'echarts_config': state_update.get('echarts_config'),
                        'insights': state_update.get('insights'),
                        'recommendations': state_update.get('recommendations'),
                        'error': state_update.get('error'),
                        'execution_metadata': state_update.get('execution_metadata'),  # Include reasoning_steps
                        'reasoning_steps': state_update.get('execution_metadata', {}).get('reasoning_steps')  # Direct access for frontend
                    }
                    
                    # Remove None values
                    event_data = {k: v for k, v in event_data.items() if v is not None}
                    
                    yield f"data: {json.dumps(event_data, cls=DateTimeEncoder)}\n\n"
                    
            except Exception as e:
                logger.error(f"❌ Streaming error: {e}", exc_info=True)
                error_event = {
                    'type': 'error',
                    'message': str(e)
                }
                yield f"data: {json.dumps(error_event, cls=DateTimeEncoder)}\n\n"
            
            # Send completion event
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",  # Disable nginx buffering
                "Connection": "keep-alive"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to start streaming: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

