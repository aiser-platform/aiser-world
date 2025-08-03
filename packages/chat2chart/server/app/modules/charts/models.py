from app.common.model import BaseModel
from sqlalchemy import UUID, Column, String
from sqlalchemy.dialects.postgresql import JSONB


class ChatVisualization(BaseModel):
    """ChatVisualizationModel."""

    __tablename__ = "chart"

    title = Column(String, nullable=False)
    form_data = Column(JSONB, nullable=False)
    result = Column(JSONB, nullable=False)
    datasource = Column(JSONB, nullable=False)

    message_id = Column(UUID, nullable=False)
