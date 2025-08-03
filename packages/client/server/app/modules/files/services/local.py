import logging
import os
import shutil

from app.core.config import settings
from app.modules.files.models import File
from fastapi import HTTPException, UploadFile
from fastapi.responses import FileResponse

from .base import BaseUploadService

logger = logging.getLogger(__name__)


class LocalUploadService(BaseUploadService):
    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR
        os.makedirs(self.upload_dir, exist_ok=True)

        super().__init__()

    async def upload_file(self, file: UploadFile) -> dict:

        await self.validate_file_content(file)

        uuid_filename = File().generate_unique_filename(file.filename)
        file_path = os.path.join(self.upload_dir, uuid_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_data = {
            "filename": file.filename,
            "uuid_filename": uuid_filename,
            "content_type": file.content_type,
            "file_size": file.size,
            "file_path": file_path,
            "storage_type": "local",
        }

        try:
            stored_file = await self.repository.create(file_data)
            file_data["id"] = stored_file.id

        except Exception as e:
            logger.error(f"Error saving file to database: {e}")
            os.remove(file_path)
            raise HTTPException(status_code=500, detail=str(e))

        return file_data

    async def get_file(self, uuid_filename: str):
        stored_file = await self.repository.get_by_uuid_filename(uuid_filename)
        if not stored_file:
            raise HTTPException(status_code=404, detail="File not found")

        file_path = stored_file.file_path
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found on disk")

        return FileResponse(path=file_path, filename=stored_file.filename)

    async def delete_file(self, uuid_filename: str):
        stored_file = await self.repository.get_by_uuid_filename(uuid_filename)
        if not stored_file:
            raise HTTPException(status_code=404, detail="File not found")

        file_path = stored_file.file_path
        if os.path.exists(file_path):
            os.remove(file_path)

        await self.repository.delete(stored_file.id)

        return {"message": "File deleted successfully"}
