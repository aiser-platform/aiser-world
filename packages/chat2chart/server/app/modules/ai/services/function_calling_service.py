"""
Function Calling Service for AI-powered Chart Generation
Implements ECharts generation as LiteLLM function calls instead of separate MCP server
"""

import logging
import os
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class FunctionCallingService:
    """Service for AI function calling - replaces MCP server with function calls"""

    def __init__(self):
        self.function_calling_enabled = (
            os.getenv("ENABLE_FUNCTION_CALLING", "true").lower() == "true"
        )

        # Available functions for AI to call
        self.available_functions = {
            "generate_echarts_config": self._generate_echarts_config,
            "analyze_data_for_chart": self._analyze_data_for_chart,
            "recommend_chart_type": self._recommend_chart_type,
            "generate_business_insights": self._generate_business_insights,
        }

        # Function definitions for LiteLLM
        self.function_definitions = [
            {
                "name": "generate_echarts_config",
                "description": "Generate ECharts configuration for data visualization",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "chart_type": {
                            "type": "string",
                            "enum": ["line", "bar", "pie", "scatter", "area"],
                            "description": "Type of chart to generate",
                        },
                        "data": {
                            "type": "array",
                            "description": "Data array for the chart",
                        },
                        "title": {"type": "string", "description": "Chart title"},
                        "x_axis_field": {
                            "type": "string",
                            "description": "Field name for X-axis",
                        },
                        "y_axis_field": {
                            "type": "string",
                            "description": "Field name for Y-axis",
                        },
                    },
                    "required": ["chart_type", "data", "title"],
                },
            }
        ]

    async def process_with_function_calling(
        self,
        user_query: str,
        data: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]] = None,
        model_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Process user query with AI function calling for chart generation"""
        try:
            if not self.function_calling_enabled:
                return await self._fallback_processing(user_query, data, context)

            logger.info(f"🔧 Processing with AI function calling: {user_query[:50]}...")

            # First analyze the data to understand structure
            data_analysis = await self._analyze_data_for_chart(data, user_query)

            if not data_analysis["success"]:
                return await self._fallback_processing(user_query, data, context)

            # Get chart type recommendation
            chart_recommendation = await self._recommend_chart_type(
                data_analysis["analysis"]["data_types"],
                len(data),
                context.get("user_goal") if context else None,
            )

            # Use recommended chart type or default to bar
            chart_type = "bar"
            if (
                chart_recommendation["success"]
                and chart_recommendation["recommendations"]
            ):
                chart_type = chart_recommendation["primary_recommendation"]["type"]

            # Generate chart config
            chart_config = await self._generate_echarts_config(
                chart_type=chart_type,
                data=data,
                title=user_query[:50] + "..." if len(user_query) > 50 else user_query,
            )

            # Generate business insights
            insights = await self._generate_business_insights(
                data, chart_type, context.get("business_domain") if context else None
            )

            return {
                "success": True,
                "result": chart_config,
                "data_analysis": data_analysis["analysis"],
                "chart_recommendation": chart_recommendation,
                "business_insights": insights.get("insights", [])
                if insights["success"]
                else [],
                "function_calling_used": True,
                "message": f"Generated {chart_type} chart using AI function calling",
            }

        except Exception as error:
            logger.error(f"❌ Function calling failed: {str(error)}")
            return await self._fallback_processing(user_query, data, context)

    async def _generate_echarts_config(
        self,
        chart_type: str,
        data: List[Dict[str, Any]],
        title: str,
        x_axis_field: Optional[str] = None,
        y_axis_field: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate ECharts configuration"""
        try:
            logger.info(f"📊 Generating {chart_type} chart: {title}")

            if not data:
                return {"success": False, "error": "No data provided"}

            # Auto-detect fields if not provided
            if not x_axis_field and data:
                x_axis_field = list(data[0].keys())[0]
            if not y_axis_field and data:
                numeric_fields = [
                    k for k, v in data[0].items() if isinstance(v, (int, float))
                ]
                y_axis_field = (
                    numeric_fields[0] if numeric_fields else list(data[0].keys())[1]
                )

            # Base configuration
            config = {
                "title": {"text": title, "left": "center"},
                "tooltip": {
                    "trigger": "axis"
                    if chart_type in ["line", "bar", "area"]
                    else "item"
                },
                "color": ["#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de"],
            }

            # Chart-specific configuration
            if chart_type in ["line", "bar", "area"]:
                categories = [str(row.get(x_axis_field, "")) for row in data]
                values = [float(row.get(y_axis_field, 0) or 0) for row in data]

                config.update(
                    {
                        "xAxis": {"type": "category", "data": categories},
                        "yAxis": {"type": "value"},
                        "series": [
                            {
                                "name": y_axis_field.replace("_", " ").title()
                                if y_axis_field
                                else "Value",
                                "type": chart_type,
                                "data": values,
                            }
                        ],
                    }
                )

            elif chart_type == "pie":
                # For pie charts, use first text field as name and first numeric field as value
                name_field = None
                value_field = None

                if data:
                    for key, value in data[0].items():
                        if isinstance(value, str) and not name_field:
                            name_field = key
                        elif isinstance(value, (int, float)) and not value_field:
                            value_field = key

                pie_data = []
                if name_field and value_field:
                    pie_data = [
                        {
                            "name": str(row.get(name_field, "")),
                            "value": float(row.get(value_field, 0) or 0),
                        }
                        for row in data
                    ]

                config.update(
                    {
                        "series": [
                            {
                                "name": title,
                                "type": "pie",
                                "radius": "50%",
                                "data": pie_data,
                            }
                        ]
                    }
                )

            return {
                "success": True,
                "chart_type": chart_type,
                "chart_config": config,
                "data_points": len(data),
            }

        except Exception as error:
            logger.error(f"❌ ECharts config generation failed: {str(error)}")
            return {"success": False, "error": str(error)}

    async def _analyze_data_for_chart(
        self, data: List[Dict[str, Any]], user_intent: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analyze data structure for optimal visualization"""
        try:
            if not data:
                return {"success": False, "error": "No data provided"}

            analysis = {
                "row_count": len(data),
                "columns": list(data[0].keys()),
                "data_types": {},
                "numeric_columns": [],
                "categorical_columns": [],
            }

            # Analyze data types
            for key, value in data[0].items():
                if isinstance(value, (int, float)):
                    analysis["data_types"][key] = "numeric"
                    analysis["numeric_columns"].append(key)
                else:
                    analysis["data_types"][key] = "categorical"
                    analysis["categorical_columns"].append(key)

            return {"success": True, "analysis": analysis}

        except Exception as error:
            logger.error(f"❌ Data analysis failed: {str(error)}")
            return {"success": False, "error": str(error)}

    async def _recommend_chart_type(
        self,
        data_types: Dict[str, str],
        data_size: Optional[int] = None,
        user_goal: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Recommend optimal chart type"""
        try:
            numeric_count = sum(1 for dt in data_types.values() if dt == "numeric")
            categorical_count = sum(
                1 for dt in data_types.values() if dt == "categorical"
            )

            recommendations = []

            if categorical_count > 0 and numeric_count > 0:
                recommendations.append(
                    {
                        "type": "bar",
                        "confidence": 0.8,
                        "reason": "Categorical comparison",
                    }
                )
            if numeric_count >= 2:
                recommendations.append(
                    {
                        "type": "scatter",
                        "confidence": 0.6,
                        "reason": "Multiple numeric variables",
                    }
                )
            if categorical_count > 0 and numeric_count == 1:
                recommendations.append(
                    {
                        "type": "pie",
                        "confidence": 0.7,
                        "reason": "Single numeric with categories",
                    }
                )

            recommendations.sort(key=lambda x: x["confidence"], reverse=True)

            return {
                "success": True,
                "recommendations": recommendations,
                "primary_recommendation": recommendations[0]
                if recommendations
                else {"type": "bar", "confidence": 0.5},
            }

        except Exception as error:
            logger.error(f"❌ Chart type recommendation failed: {str(error)}")
            return {"success": False, "error": str(error)}

    async def _generate_business_insights(
        self,
        data: List[Dict[str, Any]],
        chart_type: Optional[str] = None,
        business_context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate business insights from data"""
        try:
            insights = []

            if not data:
                return {"success": False, "error": "No data provided"}

            # Basic statistical insights
            numeric_fields = [
                k for k, v in data[0].items() if isinstance(v, (int, float))
            ]

            for field in numeric_fields:
                values = [float(row.get(field, 0) or 0) for row in data]
                if values:
                    avg_val = sum(values) / len(values)
                    max_val = max(values)
                    min_val = min(values)

                    insights.append(
                        {
                            "type": "statistical",
                            "field": field,
                            "title": f"{field.replace('_', ' ').title()} Analysis",
                            "description": f"Average: {avg_val:.2f}, Range: {min_val:.2f} - {max_val:.2f}",
                        }
                    )

            return {
                "success": True,
                "insights": insights,
                "total_insights": len(insights),
            }

        except Exception as error:
            logger.error(f"❌ Business insights generation failed: {str(error)}")
            return {"success": False, "error": str(error)}

    async def _fallback_processing(
        self,
        user_query: str,
        data: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Fallback processing when function calling is disabled"""
        logger.info("📊 Using fallback chart generation")

        if not data:
            return {
                "success": False,
                "error": "No data provided",
                "fallback_mode": True,
            }

        # Simple rule-based chart generation
        numeric_fields = [k for k, v in data[0].items() if isinstance(v, (int, float))]
        categorical_fields = [k for k, v in data[0].items() if isinstance(v, str)]

        # Simple chart type selection
        if len(numeric_fields) > 0 and len(categorical_fields) > 0:
            chart_type = "bar"
        elif len(numeric_fields) >= 2:
            chart_type = "scatter"
        else:
            chart_type = "bar"

        # Generate basic chart config
        chart_config = await self._generate_echarts_config(
            chart_type=chart_type,
            data=data,
            title=f"Data Visualization - {chart_type.title()} Chart",
        )

        return {
            "success": True,
            "result": chart_config,
            "function_calling_used": False,
            "fallback_mode": True,
            "message": "Generated chart using fallback mode",
        }

    def get_function_calling_status(self) -> Dict[str, Any]:
        """Get function calling service status"""
        return {
            "enabled": self.function_calling_enabled,
            "available_functions": list(self.available_functions.keys()),
            "function_count": len(self.available_functions),
            "last_check": datetime.now().isoformat(),
        }
