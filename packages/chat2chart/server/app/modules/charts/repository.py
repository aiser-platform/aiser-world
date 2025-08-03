from app.common.repository import BaseRepository
from app.modules.charts.models import ChatVisualization
from app.modules.charts.schemas import (
    ChatVisualizationCreateSchema,
    ChatVisualizationUpdateSchema,
)


class ChatVisualizationRepository(
    BaseRepository[
        ChatVisualization, ChatVisualizationCreateSchema, ChatVisualizationUpdateSchema
    ]
):
    def __init__(self):
        super().__init__(ChatVisualization)
