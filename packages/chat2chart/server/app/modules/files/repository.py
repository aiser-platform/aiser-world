from app.common.repository import BaseRepository
from sqlalchemy import select
from .models import File

from .schemas import FileCreate


class FileRepository(BaseRepository[File, FileCreate, FileCreate]):
    def __init__(self):
        super().__init__(File)

    async def get_by_uuid_filename(self, uuid_filename: str) -> File:
        query = select(self.model).filter(self.model.uuid_filename == uuid_filename)
<<<<<<< Current (Your changes)
        result = await self.db._session.execute(query)
=======
        result = await self.db.execute(query)
>>>>>>> Incoming (Background Agent changes)
        return result.scalars().first()
