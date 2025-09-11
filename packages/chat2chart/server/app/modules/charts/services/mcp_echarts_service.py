class MCPEChartsService:
    def __init__(self):
        pass

    async def generate_chart_from_cube_data(
        self, cube_data, query_analysis, options=None
    ):
        return {
            "success": True,
            "chart_type": "bar",
            "chart_config": {"title": {"text": "Chart"}, "series": []},
        }
