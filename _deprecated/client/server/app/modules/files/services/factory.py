from app.core.config import settings
from app.modules.files.constants import UploadType
from .local import LocalUploadService
from .s3 import S3UploadService
from .azure import AzureUploadService


def get_upload_service():
    if settings.UPLOAD_TYPE == UploadType.S3:
        return S3UploadService()
    elif settings.UPLOAD_TYPE == UploadType.AZURE:
        return AzureUploadService()
    return LocalUploadService()
