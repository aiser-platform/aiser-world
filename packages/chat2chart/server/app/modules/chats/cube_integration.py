"""
Chat2Chart + Cube.js Integration Service
Connects Chat2Chart with the AI-powered Cube.js semantic layer
"""

import aiohttp
import asyncio
import logging
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


class CubeIntegrationService:
    def __init__(self):
        self.cube_api_url = getattr(settings, "CUBE_API_URL", "http://cube-server:4000")
        self.ai_analytics_url = f"{self.cube_api_url}/ai-analytics"
        self.timeout = aiohttp.ClientTimeout(total=30)

    async def query_ai_analytics(
        self,
        natural_language_query: str,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send natural language query to Cube.js AI Analytics engine
        """
        headers = {"Content-Type": "application/json"}

        if user_id:
            headers["X-User-ID"] = user_id

        payload = {"naturalLanguageQuery": natural_language_query}

        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.post(
                    f"{self.ai_analytics_url}/query", json=payload, headers=headers
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        logger.info(
                            f"✅ AI Analytics query successful"
                        )
                        return result
                    else:
                        error_text = await response.text()
                        logger.error(
                            f"❌ AI Analytics query failed: {response.status} - {error_text}"
                        )
                        return {
                            "success": False,
                            "error": f"API error: {response.status}",
                            "naturalLanguageQuery": natural_language_query,
                        }

        except asyncio.TimeoutError:
            logger.error("❌ AI Analytics query timeout")
            return {
                "success": False,
                "error": "Query timeout - please try a simpler question",
                "naturalLanguageQuery": natural_language_query,
            }
        except Exception as e:
            logger.error(f"❌ AI Analytics query error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "naturalLanguageQuery": natural_language_query,
            }

    async def get_cube_schema(self) -> Dict[str, Any]:
        """
        Get Cube.js schema
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.get(
                    f"{self.ai_analytics_url}/schema", headers={}
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        logger.info(f"✅ Schema loaded")
                        return result
                    else:
                        error_text = await response.text()
                        logger.error(
                            f"❌ Schema fetch failed: {response.status} - {error_text}"
                        )
                        return {
                            "success": False,
                            "error": f"Schema fetch error: {response.status}",
                        }

        except Exception as e:
            logger.error(f"❌ Schema fetch error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def generate_chart_config(
        self,
        data: list,
        query_type: str,
        natural_language_query: str,
    ) -> Dict[str, Any]:
        """
        Generate ECharts configuration from Cube.js data
        """
        headers = {"Content-Type": "application/json"}

        payload = {
            "data": data,
            "queryType": query_type,
            "naturalLanguageQuery": natural_language_query,
        }

        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.post(
                    f"{self.ai_analytics_url}/chart-config",
                    json=payload,
                    headers=headers,
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        logger.info(f"✅ Chart config generated")
                        return result
                    else:
                        error_text = await response.text()
                        logger.error(
                            f"❌ Chart config generation failed: {response.status} - {error_text}"
                        )
                        return {
                            "success": False,
                            "error": f"Chart config error: {response.status}",
                        }

        except Exception as e:
            logger.error(f"❌ Chart config generation error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def process_chat_query(
        self,
        natural_language_query: str,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Complete pipeline: NL query → AI analytics → Chart config
        """
        logger.info(
            f"🚀 Processing chat query: '{natural_language_query}'"
        )

        # Step 1: Query AI Analytics
        ai_result = await self.query_ai_analytics(
            natural_language_query, user_id
        )

        if not ai_result.get("success", False):
            return {
                "success": False,
                "error": ai_result.get("error", "AI Analytics failed"),
                "naturalLanguageQuery": natural_language_query,
            }

        # Step 2: Generate Chart Configuration
        data = ai_result.get("data", [])
        query_type = self.classify_query_type(natural_language_query)

        chart_result = await self.generate_chart_config(
            data, query_type, natural_language_query
        )

        # Step 3: Combine results
        return {
            "success": True,
            "naturalLanguageQuery": natural_language_query,
            "data": data,
            "generatedQuery": ai_result.get("generatedQuery"),
            "insights": ai_result.get("insights"),
            "metadata": ai_result.get("metadata"),
            "chartConfig": chart_result.get("chartConfig")
            if chart_result.get("success")
            else None,
            "chartRecommendations": chart_result.get("recommendations", []),
            "queryType": query_type,
        }

    def classify_query_type(self, query: str) -> str:
        """
        Classify query type for chart recommendations
        """
        query_lower = query.lower()

        if any(
            word in query_lower for word in ["trend", "over time", "growth", "change"]
        ):
            return "trends"
        elif any(
            word in query_lower for word in ["compare", "vs", "versus", "difference"]
        ):
            return "comparisons"
        elif any(
            word in query_lower for word in ["anomaly", "unusual", "spike", "drop"]
        ):
            return "anomalies"
        elif any(word in query_lower for word in ["how many", "count", "total", "sum"]):
            return "metrics"
        else:
            return "general"

    async def health_check(self) -> bool:
        """
        Check if Cube.js AI Analytics is available
        """
        try:
            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=5)
            ) as session:
                async with session.get(f"{self.cube_api_url}/health") as response:
                    return response.status == 200
        except Exception:
            return False


# Global instance
cube_integration = CubeIntegrationService()
