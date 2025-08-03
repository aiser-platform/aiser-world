import logging
from typing import Annotated

from app.common.schemas import ListResponseSchema
from app.common.utils.query_params import BaseFilterParams
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status

from .schemas import FileResponse, UploadResponse
from .services.factory import get_upload_service

logger = logging.getLogger(__name__)

router = APIRouter()
service = get_upload_service()


@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """Upload a file using configured storage service"""
    file_info = await service.upload_file(file)
    return UploadResponse(message="File uploaded successfully", file=file_info)


@router.get("/download/{uuid_filename}")
async def download_file(uuid_filename: str):
    """Download a file by its UUID filename"""
    return await service.get_file(uuid_filename)


@router.get("/list", response_model=ListResponseSchema)
async def list_files(params: Annotated[BaseFilterParams, Depends()]):
    """Get paginated list of files"""

    try:
        return await service.get_all(
            offset=params.offset,
            limit=params.limit,
        )
    except Exception as e:
        logger.error(f"An error occurred while listing files: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.delete("/{uuid_filename}")
async def delete_file(uuid_filename: str):
    """Delete a file by its UUID filename"""
    await service.delete_file(uuid_filename)
    return {"message": "File deleted successfully"}
