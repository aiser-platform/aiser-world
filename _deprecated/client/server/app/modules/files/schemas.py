from typing import List, Optional

from app.common.schemas import BaseSchema
from pydantic import BaseModel, Field


def is_s3_storage() -> bool:
    from app.core.config import settings

    return settings.UPLOAD_TYPE == "s3"


class FileBase(BaseModel):
    filename: str = Field(..., description="File name")
    uuid_filename: str = Field(..., description="UUID filename")
    content_type: str = Field(..., description="Content type of the file")
    storage_type: str = Field(..., description="Storage type")
    file_size: Optional[int] = Field(
        None,
        description="File size in bytes",
    )
    file_path: Optional[str] = Field(
        None,
        description="File path in storage",
    )
    url: Optional[str] = Field(
        None, description="File URL", exclude=not is_s3_storage()
    )
    bucket: Optional[str] = Field(
        None, description="Bucket name", exclude=not is_s3_storage()
    )


class UploadResponse(BaseModel):
    message: str
    file: FileBase


class FileResponse(FileBase, BaseSchema):
    pass


class FileCreate(FileBase):
    pass


class FileList(BaseModel):
    total: int = Field(..., description="Total number of files")
    items: List[FileBase]
