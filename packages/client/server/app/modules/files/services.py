import os
import shutil
from typing import Optional
from fastapi import UploadFile
from app.core.config import settings


class FileService:
    UPLOAD_DIR = "uploads"  # You can configure this in settings

    def __init__(self):
        # Create uploads directory if it doesn't exist
        os.makedirs(self.UPLOAD_DIR, exist_ok=True)

    async def save_upload_file(self, file: UploadFile) -> dict:
        file_path = os.path.join(self.UPLOAD_DIR, file.filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        return {
            "filename": file.filename,
            "content_type": file.content_type,
            "file_size": os.path.getsize(file_path),
            "file_path": file_path,
        }
