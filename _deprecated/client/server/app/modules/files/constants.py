from enum import Enum


class UploadType(Enum):
    LOCAL = "local"
    S3 = "s3"
    AZURE = "azure"
