import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile, HTTPException
from app.core.config import settings


class S3Service:
    def __init__(self):
        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
        self.bucket_name = settings.S3_BUCKET_NAME

    async def upload_file(self, file: UploadFile) -> dict:
        try:
            file_content = await file.read()
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file.filename,
                Body=file_content,
                ContentType=file.content_type,
            )

            url = f"https://{self.bucket_name}.s3.amazonaws.com/{file.filename}"

            return {
                "filename": file.filename,
                "content_type": file.content_type,
                "url": url,
                "bucket": self.bucket_name,
            }
        except ClientError as e:
            raise HTTPException(status_code=500, detail=str(e))
