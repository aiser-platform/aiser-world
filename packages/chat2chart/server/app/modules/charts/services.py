from app.common.service import BaseService
from app.modules.charts.core.visualization import VisualizationGeneration
from app.modules.charts.models import ChatVisualization
from app.modules.charts.repository import ChatVisualizationRepository
from app.modules.charts.schemas import (
    ChartConfiguration,
    ChatVisualizationCreateSchema,
    ChatVisualizationResponseSchema,
    ChatVisualizationUpdateSchema,
)


class ChatVisualizationService(
    BaseService[
        ChatVisualization,
        ChatVisualizationCreateSchema,
        ChatVisualizationUpdateSchema,
        ChatVisualizationResponseSchema,
    ]
):
    def __init__(self):
        super().__init__(ChatVisualizationRepository())

    async def save(self, data: ChartConfiguration):
        try:
            _data = data.model_copy()
            from uuid import uuid4
            viz = VisualizationGeneration(
                form_data=_data.formData,
                datasource=_data.dataSource,
                message_id=str(uuid4()),
            )

            await viz.generate_echarts_config()
            await viz.save_result()

            result = await viz.get_result()

            return result
        except Exception as e:
            # Log the error or handle it appropriately
            raise Exception(f"Failed to save visualization: {str(e)}")
