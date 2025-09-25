from datetime import datetime
from typing import List, Optional

from sqlalchemy import select

from app.common.repository import BaseRepository
from app.modules.device_session.schemas import DeviceSessionCreate, DeviceSessionUpdate

from .models import DeviceSession


class DeviceSessionRepository(
    BaseRepository[DeviceSession, DeviceSessionCreate, DeviceSessionUpdate]
):
    def __init__(self):
        super().__init__(DeviceSession)

    async def get_active_sessions(self, user_id: int) -> List[DeviceSession]:
        """Get all active sessions for a user"""
        query = select(self.model).filter(
            self.model.user_id == user_id, self.model.is_active
        )
        result = await self.db._session.execute(query)
        return result.scalars().all()

    async def deactivate_session(self, device_id: str) -> bool:
        """Deactivate a specific session"""
        session = await self.get_by_device_id(device_id)
        if session:
            session.is_active = False
            # revoke refresh token too
            try:
                session.refresh_token_revoked = True
            except Exception:
                pass
            await self.db._session.commit()
            return True
        return False

    async def revoke_by_token(self, refresh_token: str) -> bool:
        query = select(self.model).filter(self.model.refresh_token == refresh_token)
        result = await self.db._session.execute(query)
        session = result.scalars().first()
        if session:
            session.refresh_token_revoked = True
            session.is_active = False
            await self.db._session.commit()
            return True
        return False

    async def update_last_active(self, device_id: str) -> None:
        """Update last active timestamp"""
        session = await self.get_by_device_id(device_id)
        if session:
            session.last_active = datetime.utcnow()
            await self.db._session.commit()

    async def get_by_device_id(self, device_id: str) -> Optional[DeviceSession]:
        """Get session by device id"""
        query = select(self.model).filter(self.model.device_id == device_id)
        result = await self.db._session.execute(query)
        return result.scalars().first()
