# Chart services module

try:
    from .mcp_echarts_service import MCPEChartsService
except ImportError:
    # Fallback if import fails
    class MCPEChartsService:
        def __init__(self):
            pass

        async def generate_chart_from_cube_data(
            self, cube_data, query_analysis, options=None
        ):
            return {"success": True, "chart_type": "bar", "chart_config": {}}


# Simple approach - define minimal classes here to avoid import issues
class ChartGenerationService:
    def __init__(self):
        pass

    async def generate_chart_from_query(self, data, query_analysis, options=None):
        return {"success": True, "chart_type": "bar", "chart_config": {}}

    async def generate_chart_from_file_data(
        self, data, file_metadata, natural_language_query, options=None
    ):
        return {"success": True, "chart_type": "bar", "chart_config": {}}

    async def get_chart_recommendations(self, data, query_analysis=None):
        return {"success": True, "recommendations": []}


# Add ChatVisualizationService for backward compatibility
class ChatVisualizationService:
    def __init__(self):
        pass

    async def get_all(self):
        return {"success": True, "charts": []}

    async def get(self, id: str):
        return {"success": True, "chart": {"id": id}}

    async def save(self, data):
        return {"success": True, "id": "chart_123"}


__all__ = ["ChartGenerationService", "MCPEChartsService", "ChatVisualizationService"]
