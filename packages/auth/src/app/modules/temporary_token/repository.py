from datetime import datetime

from app.common.repository import BaseRepository
from app.modules.temporary_token.schemas import (
    TemporaryTokenCreate,
    TemporaryTokenUpdate,
)

from .models import TemporaryToken


class TokenRepository(
    BaseRepository[TemporaryToken, TemporaryTokenCreate, TemporaryTokenUpdate]
):
    def __init__(self):
        super().__init__(TemporaryToken)

    async def create_token(
        self, user_id: int, token: str, token_type: str, expires_at: datetime
    ) -> TemporaryToken:
        token_record = TemporaryTokenCreate(
            user_id=user_id, token=token, token_type=token_type, expires_at=expires_at
        )
        return await self.create(token_record)

    async def invalidate_token(self, token: str) -> bool:
        token_record = await self.get_by_token(token)
        if token_record and token_record.is_valid:
            token_record.is_valid = False
            token_record.used_at = datetime.utcnow()
            await self.db._session.commit()
            return True
        return False

    async def get_by_token(self, token: str) -> TemporaryToken:
        return await self.get_by_fields(token=token)
