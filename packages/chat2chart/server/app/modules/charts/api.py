from typing import Annotated
from app.modules.charts.schemas import (
    ChartConfiguration,
    ChatVisualizationResponseSchema,
)
from app.modules.charts.services import ChatVisualizationService
from fastapi import APIRouter, Depends, HTTPException

router = APIRouter()
service = ChatVisualizationService()


@router.get("/")
async def get_all():
    return await service.get_all()


@router.get("/{id}")
async def get(id: str):
    try:
        return await service.get(id)
    except Exception as e:
        return HTTPException(status_code=404, detail=str(e))


@router.post("/")
async def create(data: ChartConfiguration):
    return await service.save(data)
