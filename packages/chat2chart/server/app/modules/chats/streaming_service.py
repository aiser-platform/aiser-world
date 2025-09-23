"""
Streaming Chat Service with Session Memory and Caching
Provides real-time streaming responses with cost optimization
"""

import json
import logging
import asyncio
from typing import Dict, Any, Optional, AsyncGenerator
from datetime import datetime, timedelta
from uuid import uuid4

logger = logging.getLogger(__name__)


class StreamingChatService:
    """
    Streaming chat service with session memory and caching for cost optimization
    """

    def __init__(self):
        # In-memory session cache (in production, use Redis)
        self._session_cache = {}
        self._response_cache = {}

        # Cache settings
        self.cache_ttl = timedelta(hours=1)  # Cache responses for 1 hour
        self.session_ttl = timedelta(hours=24)  # Keep sessions for 24 hours

    async def stream_chat(
        self,
        user_query: str,
        conversation_id: Optional[str] = None,
        data_source_id: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat responses with session memory
        """
        try:
            # Get or create conversation
            conversation_id = conversation_id or str(uuid4())

            # Check cache first for cost optimization
            cache_key = self._get_cache_key(user_query, data_source_id, conversation_id)
            cached_response = self._get_cached_response(cache_key)

            if cached_response:
                logger.info(f"🎯 Using cached response for: {user_query[:30]}...")
                yield f"data: {json.dumps({'type': 'cached', 'content': 'Using cached response...'})}\n\n"

                # Stream cached response
                for chunk in self._chunk_response(cached_response):
                    yield f"data: {json.dumps({'type': 'content', 'content': chunk})}\n\n"
                    await asyncio.sleep(0.05)  # Simulate streaming delay

                yield f"data: {json.dumps({'type': 'done', 'cached': True})}\n\n"
                return

            # Get session context for memory
            session_context = self._get_session_context(conversation_id)

            # Start streaming
            yield f"data: {json.dumps({'type': 'start', 'conversation_id': conversation_id})}\n\n"

            # Get data if data_source_id provided
            data_for_analysis = []
            if data_source_id:
                try:
                    import requests

                    data_response = requests.get(
                        f"http://localhost:8000/data/sources/{data_source_id}/data"
                    )
                    if data_response.status_code == 200:
                        data_result = data_response.json()
                        if data_result.get("success"):
                            data_for_analysis = data_result.get("data", [])
                            yield f"data: {json.dumps({'type': 'info', 'content': f'Loaded {len(data_for_analysis)} data points'})}\n\n"
                except Exception as e:
                    logger.warning(f"Could not load data source: {e}")

            # Process with Azure OpenAI
            yield f"data: {json.dumps({'type': 'thinking', 'content': 'Analyzing with AI...'})}\n\n"

            from app.modules.ai.services.function_calling_service import (
                FunctionCallingService,
            )

            function_service = FunctionCallingService()

            # Enhanced context with session memory
            context = {
                "conversation_id": conversation_id,
                "session_history": session_context.get("history", []),
                "business_domain": "chat_analysis",
                "user_goal": self._infer_user_goal(user_query),
                "data_source_id": data_source_id,
            }

            ai_result = await function_service.process_with_function_calling(
                user_query=user_query, data=data_for_analysis, context=context
            )

            # Format and stream response
            if ai_result.get("success"):
                response_text = self._format_streaming_response(ai_result)

                # Cache the response for cost optimization
                self._cache_response(cache_key, response_text)

                # Update session memory
                self._update_session_context(conversation_id, user_query, response_text)

                # Stream the response
                for chunk in self._chunk_response(response_text):
                    yield f"data: {json.dumps({'type': 'content', 'content': chunk})}\n\n"
                    await asyncio.sleep(0.03)  # Natural typing speed

                # Send chart data if available
                if ai_result.get("result") and ai_result["result"].get("chart_config"):
                    yield f"data: {json.dumps({'type': 'chart', 'config': ai_result['result']['chart_config']})}\n\n"

                # Send insights if available
                if ai_result.get("business_insights"):
                    yield f"data: {json.dumps({'type': 'insights', 'insights': ai_result['business_insights']})}\n\n"

            else:
                error_message = "I apologize, but I encountered an issue processing your request. Please try again."
                for chunk in self._chunk_response(error_message):
                    yield f"data: {json.dumps({'type': 'content', 'content': chunk})}\n\n"
                    await asyncio.sleep(0.03)

            yield f"data: {json.dumps({'type': 'done', 'cached': False})}\n\n"

        except Exception as e:
            logger.error(f"❌ Streaming chat failed: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'content': 'Sorry, I encountered an error. Please try again.'})}\n\n"

    def _get_cache_key(self, query: str, data_source_id: Optional[str], conversation_id: Optional[str] = None) -> str:
        """Generate cache key for response caching"""
        import hashlib

        # Include conversation_id in cache key to make each conversation unique
        content = f"{query}:{data_source_id or 'no_data'}:{conversation_id or 'no_conversation'}"
        return hashlib.md5(content.encode()).hexdigest()

    def _get_cached_response(self, cache_key: str) -> Optional[str]:
        """Get cached response if available and not expired"""
        if cache_key in self._response_cache:
            cached_data = self._response_cache[cache_key]
            if datetime.now() - cached_data["timestamp"] < self.cache_ttl:
                return cached_data["response"]
            else:
                # Remove expired cache
                del self._response_cache[cache_key]
        return None

    def _cache_response(self, cache_key: str, response: str):
        """Cache response for cost optimization"""
        self._response_cache[cache_key] = {
            "response": response,
            "timestamp": datetime.now(),
        }

        # Clean up old cache entries (simple cleanup)
        if len(self._response_cache) > 1000:  # Limit cache size
            oldest_keys = sorted(
                self._response_cache.keys(),
                key=lambda k: self._response_cache[k]["timestamp"],
            )[:100]
            for key in oldest_keys:
                del self._response_cache[key]

    def _get_session_context(self, conversation_id: str) -> Dict[str, Any]:
        """Get session context for memory"""
        if conversation_id in self._session_cache:
            session_data = self._session_cache[conversation_id]
            if datetime.now() - session_data["last_accessed"] < self.session_ttl:
                session_data["last_accessed"] = datetime.now()
                return session_data
            else:
                # Remove expired session
                del self._session_cache[conversation_id]

        # Create new session
        self._session_cache[conversation_id] = {
            "history": [],
            "created_at": datetime.now(),
            "last_accessed": datetime.now(),
        }
        return self._session_cache[conversation_id]

    def _update_session_context(
        self, conversation_id: str, user_query: str, ai_response: str
    ):
        """Update session context with new interaction"""
        if conversation_id in self._session_cache:
            session = self._session_cache[conversation_id]
            session["history"].append(
                {
                    "user": user_query,
                    "assistant": ai_response,
                    "timestamp": datetime.now().isoformat(),
                }
            )

            # Keep only last 10 interactions for memory efficiency
            if len(session["history"]) > 10:
                session["history"] = session["history"][-10:]

            session["last_accessed"] = datetime.now()

    def _infer_user_goal(self, query: str) -> str:
        """Infer user goal from query for better context"""
        query_lower = query.lower()

        if any(
            word in query_lower
            for word in ["chart", "graph", "plot", "visualize", "show"]
        ):
            return "visualization"
        elif any(
            word in query_lower for word in ["analyze", "analysis", "insight", "trend"]
        ):
            return "analysis"
        elif any(
            word in query_lower for word in ["compare", "comparison", "vs", "versus"]
        ):
            return "comparison"
        elif any(word in query_lower for word in ["summary", "summarize", "overview"]):
            return "summary"
        else:
            return "general_chat"

    def _format_streaming_response(self, ai_result: Dict[str, Any]) -> str:
        """Format AI result for streaming"""
        try:
            if not ai_result.get("success"):
                return (
                    "I apologize, but I encountered an issue processing your request."
                )

            response = ""

            # Add greeting for general chat
            if ai_result.get("message") and "function calling" in ai_result["message"]:
                response += "I've analyzed your request using AI. "

            # Add chart information
            if ai_result.get("result") and ai_result["result"].get("chart_config"):
                chart_type = ai_result["result"].get("chart_type", "visualization")
                data_points = ai_result["result"].get("data_points", 0)
                response += f"I've created a {chart_type} chart with {data_points} data points. "

            # Add data analysis
            if ai_result.get("data_analysis"):
                analysis = ai_result["data_analysis"]
                response += f"Your data contains {analysis.get('row_count', 0)} rows with columns: {', '.join(analysis.get('columns', []))}. "

            # Add insights
            if ai_result.get("business_insights"):
                response += "\n\nKey insights:\n"
                for i, insight in enumerate(ai_result["business_insights"][:3], 1):
                    if isinstance(insight, dict) and insight.get("description"):
                        response += f"{i}. {insight['description']}\n"

            # Default response if nothing specific
            if not response.strip():
                response = "Hello! I'm your AI assistant for data analysis and visualization. How can I help you today?"

            return response.strip()

        except Exception as e:
            logger.error(f"Error formatting streaming response: {e}")
            return "Hello! I'm ready to help you with data analysis and visualization."

    def _chunk_response(self, text: str, chunk_size: int = 3) -> list:
        """Break response into chunks for streaming"""
        words = text.split()
        chunks = []

        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i : i + chunk_size])
            chunks.append(chunk)

        return chunks

    def get_session_stats(self) -> Dict[str, Any]:
        """Get session statistics for monitoring"""
        active_sessions = len(self._session_cache)
        cached_responses = len(self._response_cache)

        return {
            "active_sessions": active_sessions,
            "cached_responses": cached_responses,
            "cache_hit_potential": f"{(cached_responses / max(active_sessions, 1)) * 100:.1f}%",
        }

    def clear_cache(self):
        """Clear all cached responses and sessions"""
        self._response_cache.clear()
        self._session_cache.clear()
        logger.info("🧹 Cache cleared successfully")
