from typing import Optional
from datetime import datetime, timedelta
from app.modules.authentication.models import RefreshToken
from app.db.session import async_session
from app.modules.authentication.auth import Auth
from sqlalchemy import select
from sqlalchemy import update


class AuthService:
    def __init__(self):
        self.auth = Auth()

    async def persist_refresh_token(self, user_id: int, token: str, expires_in_minutes: int):
        expires_at = datetime.utcnow() + timedelta(minutes=expires_in_minutes)
        async with async_session() as db:
            rt = RefreshToken(user_id=user_id, token=token, expires_at=expires_at, revoked=False)
            db.add(rt)
            await db.flush()
            await db.refresh(rt)
            return rt

    async def revoke_refresh_token(self, token: str) -> bool:
        async with async_session() as db:
            res = await db.execute(select(RefreshToken).where(RefreshToken.token == token))
            rt = res.scalar_one_or_none()
            if not rt:
                return False
            # Mark revoked and persist
            await db.execute(update(RefreshToken).where(RefreshToken.id == rt.id).values(revoked=True))
            await db.flush()
            return True

    async def is_token_revoked(self, token: str) -> bool:
        async with async_session() as db:
            res = await db.execute(select(RefreshToken).where(RefreshToken.token == token))
            rt = res.scalar_one_or_none()
            if not rt:
                return True
            if rt.revoked:
                return True
            if rt.expires_at and rt.expires_at < datetime.utcnow():
                return True
            return False


