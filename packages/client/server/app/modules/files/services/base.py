import io
import logging
from abc import ABC, abstractmethod
from typing import Dict, Union

from app.common.service import BaseService
import pandas as pd
from app.modules.files.repository import FileRepository
from fastapi import HTTPException, UploadFile
from PIL import Image

logger = logging.getLogger(__name__)


class BaseUploadService(ABC, BaseService):
    """Abstract base class for file upload services."""

    repository: FileRepository

    # Add constants at class level
    MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_IMAGE_DIMENSIONS = (5000, 5000)  # 5000x5000 pixels

    def __init__(self):
        self.repository = FileRepository()

    @abstractmethod
    async def upload_file(self, file: UploadFile) -> Dict:
        """
        Upload a file to the storage.

        Args:
            file (UploadFile): The file to be uploaded

        Returns:
            Dict: Information about the uploaded file
        """

    async def validate_file_content(self, file: UploadFile) -> bool:
        """
        Validate file content based on file extension.

        Args:
            file (UploadFile): The file to be validated

        Returns:
            bool: True if valid

        Raises:
            HTTPException: If file content is invalid
        """
        filename = file.filename.lower()
        try:
            if filename.endswith(".csv"):
                return await self.validate_csv_content(file.file)
            elif filename.endswith(".xlsx"):
                return await self.validate_xlsx_content(file.file)
            elif filename.endswith((".png", ".jpg", ".jpeg")):
                return await self.validate_image_content(file.file)
            else:
                logger.warning(f"Unsupported file type: {filename}")
                raise HTTPException(
                    status_code=400,
                    detail="Unsupported file type. Only CSV, XLSX, PNG, and JPG files are allowed",
                )
        except Exception as e:
            logger.error(f"Failed to validate file content: {str(e)}")
            raise e

    async def validate_csv_content(
        self, file_content: Union[bytes, io.BytesIO]
    ) -> bool:
        """
        Validate if the CSV file content is readable and properly structured.

        Args:
            file_content: File content in bytes or BytesIO format

        Returns:
            bool: True if valid

        Raises:
            HTTPException: If file content is invalid
        """
        try:
            # Try to read CSV content
            if isinstance(file_content, bytes):
                file_content = io.BytesIO(file_content)

            df = pd.read_csv(file_content)

            # Basic validations
            if df.empty:
                raise HTTPException(status_code=400, detail="CSV file is empty")

            if len(df.columns) == 0:
                raise HTTPException(status_code=400, detail="CSV file has no columns")

            return True

        except pd.errors.EmptyDataError:
            logger.error("CSV file is empty or corrupted")
            raise HTTPException(
                status_code=400, detail="CSV file is empty or corrupted"
            )
        except pd.errors.ParserError:
            logger.error("Unable to parse CSV file")
            raise HTTPException(
                status_code=400,
                detail="Unable to parse CSV file. Please check the file format",
            )
        except Exception as e:
            logger.error(f"Invalid CSV file: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid CSV file: {str(e)}")

    async def validate_xlsx_content(
        self, file_content: Union[bytes, io.BytesIO]
    ) -> bool:
        """
        Validate if the XLSX file content is readable and properly structured.

        Args:
            file_content: File content in bytes or BytesIO format

        Returns:
            bool: True if valid

        Raises:
            HTTPException: If file content is invalid
        """
        try:
            # Convert bytes to BytesIO if needed
            if isinstance(file_content, bytes):
                file_content = io.BytesIO(file_content)

            # Try to read Excel file
            excel_file = pd.ExcelFile(file_content)

            # Check if file has any sheets
            if len(excel_file.sheet_names) == 0:
                logger.error("Excel file has no sheets")
                raise HTTPException(status_code=400, detail="Excel file has no sheets")

            # Read first sheet to validate data
            df = pd.read_excel(excel_file, sheet_name=0)

            if df.empty:
                logger.error("Excel file is empty")
                raise HTTPException(status_code=400, detail="Excel file is empty")

            if len(df.columns) == 0:
                logger.error("Excel file has no columns")
                raise HTTPException(status_code=400, detail="Excel file has no columns")

            return True

        except pd.errors.EmptyDataError:
            logger.error("Excel file is empty or corrupted")
            raise HTTPException(
                status_code=400, detail="Excel file is empty or corrupted"
            )
        except Exception as e:
            logger.error(f"Invalid Excel file: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid Excel file: {str(e)}")

    async def validate_image_content(
        self, file_content: Union[bytes, io.BytesIO]
    ) -> bool:
        """
        Validate image file content (PNG/JPG).
        """
        try:
            # Check file size
            if len(file_content) > self.MAX_IMAGE_SIZE:
                logger.error("Image file size exceeds limit")
                raise HTTPException(
                    status_code=400,
                    detail=f"Image file size exceeds {self.MAX_IMAGE_SIZE // (1024 * 1024)}MB limit",
                )

            # Convert bytes to BytesIO if needed
            if isinstance(file_content, bytes):
                file_content = io.BytesIO(file_content)

            # Try to open image
            with Image.open(file_content) as img:
                # Verify format
                if img.format not in ["PNG", "JPEG"]:
                    logger.error("Invalid image format. Only PNG and JPG are allowed")
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid image format. Only PNG and JPG are allowed",
                    )

                # Check dimensions
                if (
                    img.width > self.MAX_IMAGE_DIMENSIONS[0]
                    or img.height > self.MAX_IMAGE_DIMENSIONS[1]
                ):
                    logger.error("Image dimensions exceed limit")
                    raise HTTPException(
                        status_code=400,
                        detail=f"Image dimensions exceed {self.MAX_IMAGE_DIMENSIONS[0]}x{self.MAX_IMAGE_DIMENSIONS[1]} limit",
                    )

                # Verify image integrity by attempting to load it
                img.load()
                return True

        except (IOError, SyntaxError):
            logger.error("Invalid or corrupted image file")
            raise HTTPException(
                status_code=400, detail="Invalid or corrupted image file"
            )
        except Exception as e:
            logger.error(f"Invalid image file: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")
