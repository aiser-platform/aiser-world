from app.common.model import BaseModel
from sqlalchemy import Column, Integer, String
import uuid


class File(BaseModel):
    __tablename__ = "files"

    filename = Column(String)  # Original uploaded filename
    uuid_filename = Column(String, index=True)  # UUID-based stored filename
    content_type = Column(String)
    file_size = Column(Integer)
    file_path = Column(String)
    storage_type = Column(String)

    @staticmethod
    def generate_unique_filename(original_filename: str) -> str:
        """Generate a unique filename using UUID while preserving the original extension.

        Args:
            original_filename: The original filename including extension

        Returns:
            A string containing UUID with original extension if present
        """
        try:
            *_, ext = original_filename.rsplit(".", maxsplit=1)
        except ValueError:
            ext = ""

        uuid_str = str(uuid.uuid4())
        return f"{uuid_str}.{ext}" if ext else uuid_str
