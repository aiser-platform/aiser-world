import io

import boto3
from app.core.config import settings
from app.modules.files.models import File
from botocore.exceptions import ClientError
from fastapi import HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from .base import BaseUploadService
from app.modules.files.schemas import FileCreate


class S3UploadService(BaseUploadService):
    def __init__(self):
        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
        self.bucket_name = settings.S3_BUCKET_NAME

        super().__init__()

    async def upload_file(self, file: UploadFile) -> dict:
        try:
            await self.validate_file_content(file)

            # Generate UUID filename
            uuid_filename = File().generate_unique_filename(file.filename)
            file_content = await file.read()

            # Upload to S3 with UUID filename
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=uuid_filename,
                Body=file_content,
                ContentType=file.content_type,
            )

            url = f"https://{self.bucket_name}.s3.amazonaws.com/{uuid_filename}"
            file_data = {
                "filename": file.filename,
                "uuid_filename": uuid_filename,
                "content_type": file.content_type,
                "file_size": len(file_content),
                "file_path": url,
                "storage_type": "s3",
            }

            # Store file info in database
            stored_file = await self.repository.create(FileCreate(**file_data))
            file_data["id"] = stored_file.id

            return file_data

        except Exception as e:
            # Cleanup S3 file if database operation fails
            try:
                self.s3_client.delete_object(Bucket=self.bucket_name, Key=uuid_filename)
            except Exception:
                pass
            raise HTTPException(status_code=500, detail=str(e))

    async def get_file(self, uuid_filename: str):
        stored_file = await self.repository.get_by_uuid_filename(uuid_filename)
        if not stored_file:
            raise HTTPException(status_code=404, detail="File not found")

        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name, Key=stored_file.uuid_filename
            )
            content = response["Body"].read()
            content_type = response.get("ContentType", "application/octet-stream")

            return StreamingResponse(
                io.BytesIO(content),
                media_type=content_type,
                headers={
                    "Content-Disposition": f"attachment; filename={stored_file.filename}"
                },
            )
        except ClientError:
            raise HTTPException(status_code=404, detail="File not found in S3")

    async def delete_file(self, uuid_filename: str):
        stored_file = await self.repository.get_by_uuid_filename(uuid_filename)
        if not stored_file:
            raise HTTPException(status_code=404, detail="File not found")

        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name, Key=stored_file.uuid_filename
            )
            await self.repository.delete(stored_file.id)
        except ClientError:
            raise HTTPException(status_code=500, detail="Failed to delete file")
