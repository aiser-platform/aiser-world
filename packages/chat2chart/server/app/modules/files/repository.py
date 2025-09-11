from app.common.repository import BaseRepository
from sqlalchemy import select
from .models import File

from .schemas import FileCreate


class FileRepository(BaseRepository[File, FileCreate, FileCreate]):
    def __init__(self):
        super().__init__(File)

    async def get_by_uuid_filename(self, uuid_filename: str) -> File:
        query = select(self.model).filter(self.model.uuid_filename == uuid_filename)
        result = await self.db.execute(query)
        return result.scalars().first()
