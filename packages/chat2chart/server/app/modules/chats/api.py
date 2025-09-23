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
            logger.warning(f"AI service failed, using enhanced fallback: {str(ai_error)}")

            # Enhanced fallback responses based on user query
            query_lower = user_query.lower()

            if data_source_id:
                # Data source connected - provide contextual responses
                if any(word in query_lower for word in ["hello", "hi", "hey"]):
                    message_content = f"Hello! I can see you have a data source connected (ID: {data_source_id}). I'm here to help you analyze your data! What would you like to explore? I can help with:\n\n• Data trends and patterns\n• Statistical analysis\n• Chart creation\n• Business insights\n• Data quality checks\n\nWhat specific analysis would you like to perform?"
                
                elif any(word in query_lower for word in ["show", "display", "chart", "graph", "visualize"]):
                    message_content = f"Great! I can help you create visualizations for your data source (ID: {data_source_id}). Here are some chart types I can generate:\n\n• **Bar Charts** - Compare categories\n• **Line Charts** - Show trends over time\n• **Pie Charts** - Display proportions\n• **Scatter Plots** - Find correlations\n• **Histograms** - Show distributions\n\nWhat type of visualization would you like to create? Or tell me what specific data you want to see!"
                
                elif any(word in query_lower for word in ["analyze", "analysis", "insights", "findings"]):
                    message_content = f"Perfect! Let's analyze your data source (ID: {data_source_id}). I can help you discover:\n\n• **Key Metrics** - Important numbers and KPIs\n• **Trends** - How data changes over time\n• **Patterns** - Recurring behaviors or cycles\n• **Outliers** - Unusual data points\n• **Correlations** - Relationships between variables\n\nWhat specific aspect of your data would you like me to analyze? For example:\n- 'Show me sales trends by month'\n- 'Find the top performing products'\n- 'Analyze customer behavior patterns'"
                
                elif any(word in query_lower for word in ["sql", "query", "database"]):
                    message_content = f"Excellent! I can help you with SQL queries for your data source (ID: {data_source_id}). I can generate:\n\n• **SELECT queries** - Retrieve specific data\n• **Aggregation queries** - SUM, COUNT, AVG, etc.\n• **JOIN queries** - Combine related tables\n• **Filtering queries** - WHERE clauses\n• **Grouping queries** - GROUP BY operations\n\nWhat kind of data would you like to query? For example:\n- 'Show me all sales from last month'\n- 'Count customers by region'\n- 'Find average order value by category'"
                
                else:
                    message_content = f"I can see you have a data source connected (ID: {data_source_id}). I'm here to help analyze your data! \n\nFor your query: \"{user_query}\"\n\nI can help you with:\n• **Data Analysis** - Trends, patterns, insights\n• **Visualizations** - Charts, graphs, dashboards\n• **SQL Queries** - Custom database queries\n• **Business Intelligence** - KPIs and metrics\n• **Data Exploration** - Discover what's in your data\n\nWhat specific analysis would you like to perform? Be as specific as possible for the best results!"
            else:
                # No data source connected
                if any(word in query_lower for word in ["hello", "hi", "hey"]):
                    message_content = "Hello! I'm your AI data analyst assistant. I can help you with data analysis, visualization, and business insights!\n\nTo get started:\n1. **Connect a Data Source** - Upload a CSV file or connect to a database\n2. **Ask Questions** - I'll analyze your data and provide insights\n3. **Create Charts** - I'll generate beautiful visualizations\n4. **Get SQL Queries** - I'll write custom queries for you\n\nWhat would you like to do first?"
                
                elif any(word in query_lower for word in ["help", "what", "how"]):
                    message_content = "I'm here to help you with data analysis! Here's what I can do:\n\n**📊 Data Analysis**\n• Analyze trends and patterns\n• Find insights and correlations\n• Generate statistical summaries\n• Identify outliers and anomalies\n\n**📈 Visualizations**\n• Create interactive charts\n• Generate dashboards\n• Design custom visualizations\n• Export charts and reports\n\n**💾 Data Management**\n• Connect to databases\n• Upload CSV/Excel files\n• Generate SQL queries\n• Data quality checks\n\n**🚀 Getting Started**\n1. Connect a data source using the 'Connect Data' button\n2. Ask me questions about your data\n3. Request specific charts or analysis\n\nWhat would you like to explore?"
                
                else:
                    message_content = f"I'd be happy to help you with your query: \"{user_query}\"\n\nTo provide the most accurate analysis, I recommend:\n\n1. **Connect a Data Source** - Upload a CSV file or connect to a database\n2. **Be Specific** - Tell me exactly what you want to analyze\n3. **Ask Follow-up Questions** - I can dive deeper into your data\n\nOnce you have data connected, I can:\n• Analyze trends and patterns\n• Create interactive visualizations\n• Generate SQL queries\n• Provide business insights\n• Answer specific data questions\n\nWould you like help connecting a data source first?"

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


@router.post("/clear-cache")
async def clear_chat_cache():
    """Clear the chat cache to resolve repeated responses"""
    try:
        from app.modules.chats.streaming_service import StreamingChatService
        from app.core.cache import cache
        
        # Clear streaming service cache
        streaming_service = StreamingChatService()
        streaming_service.clear_cache()
        
        # Clear AI response cache
        cache.clear_ai_cache()
        
        logger.info("🧹 All chat and AI caches cleared successfully")
        
        return {
            "success": True,
            "message": "All chat and AI caches cleared successfully",
            "timestamp": "2025-01-10T00:00:00Z"
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to clear cache: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")


# 🧹 Clean up - Remove all the confusing endpoints
# The single /chat endpoint above handles everything now
