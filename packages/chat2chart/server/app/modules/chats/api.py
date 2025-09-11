from app.modules.chats.services import ChatService
from fastapi import APIRouter, HTTPException
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
service = ChatService()


# 🎯 SINGLE CHAT ENDPOINT - Handles everything!
@router.post("/chat")
async def chat_endpoint(request: dict):
    """
    🚀 SINGLE CHAT ENDPOINT - Handles all chat scenarios

    This endpoint consolidates ALL chat functionality:
    - Regular chat without data source
    - Chat with data source (file/database)
    - AI-powered analysis
    - Chart generation requests

    Request format:
    {
        "query": "Your question here",
        "data_source_id": "optional_data_source_id",
        "conversation_id": "optional_conversation_id"
    }
    """
    try:
        user_query = request.get("query", "")
        data_source_id = request.get("data_source_id")
        conversation_id = request.get("conversation_id")

        if not user_query:
            raise HTTPException(status_code=400, detail="Query is required")

        logger.info(
            f"💬 Chat request: '{user_query}' | Data source: {data_source_id or 'None'}"
        )

        # Use AI service for enhanced responses
        try:
            # DEPRECATION: /chats/chat is a thin facade; prefer /ai/chat moving forward
            from app.modules.ai.api import analyze_chat_query, ChatAnalysisRequest  # type: ignore

            req = ChatAnalysisRequest(
                query=user_query,
                data_source_id=data_source_id,
                business_context="data_analytics"
                if data_source_id
                else "general_assistance",
            )
            ai_result = await analyze_chat_query(req)  # delegate to AI service

            if ai_result.get("success"):
                message_content = ai_result.get(
                    "analysis", "I apologize, but I could not generate a response."
                )
            else:
                raise Exception("AI analysis failed")

        except Exception as ai_error:
            logger.warning(f"AI service failed, using fallback: {str(ai_error)}")

            # Fallback to basic responses
            if data_source_id:
                message_content = f"I can see you have a data source connected (ID: {data_source_id}). I'm here to help analyze your data! What specific questions do you have about your data? I can help with trends, patterns, comparisons, and creating visualizations."
            else:
                message_content = "Hello! I'm your AI assistant for data visualization and analytics. To get the most out of our conversation, please connect a data source using the 'Connect Data' button. I can help you with data analysis, chart creation, and business insights once you have data connected."

        # Return unified response

        # Return unified response format
        return {
            "success": True,
            "query": user_query,
            "data_source_id": data_source_id,
            "conversation_id": conversation_id,
            "message": message_content,
            "ai_engine": "LiteLLM",
            "capabilities": [
                "data_analysis" if data_source_id else "general_assistance",
                "ai_powered_insights",
                "conversational_interface",
            ],
            "timestamp": "2025-01-10T00:00:00Z",
        }

    except Exception as e:
        logger.error(f"❌ Chat error: {e}")
        return {
            "success": False,
            "error": "I'm experiencing some technical difficulties. Please try again in a moment.",
            "query": request.get("query", ""),
            "data_source_id": request.get("data_source_id"),
            "timestamp": "2025-01-10T00:00:00Z",
        }


# 🧹 Clean up - Remove all the confusing endpoints
# The single /chat endpoint above handles everything now
