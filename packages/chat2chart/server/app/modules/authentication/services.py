from typing import Optional
from datetime import datetime, timedelta
from app.modules.authentication.models import RefreshToken
from app.db.session import async_session
from app.modules.authentication.auth import Auth
from sqlalchemy import select
from sqlalchemy import update
from sqlalchemy.exc import ProgrammingError

try:
    from asyncpg.exceptions import UndefinedTableError  # type: ignore
except Exception:  # pragma: no cover - fallback when asyncpg not present
    UndefinedTableError = None  # type: ignore


class AuthService:
    def __init__(self):
        self.auth = Auth()

    async def persist_refresh_token(self, user_id: str | int, token: str, expires_in_minutes: int, _retry: bool = False):
        """Persist a refresh token. Accepts user_id as UUID string or legacy int.

        This method normalizes the user_id to string for storage to remain robust
        during the UUID migration where DB column types may differ across envs.
        """
        expires_at = datetime.utcnow() + timedelta(minutes=expires_in_minutes)
        async with async_session() as db:
            try:
                # Normalize to string for compatibility with PG UUID/text columns
                uid_val = str(user_id) if user_id is not None else None
                rt = RefreshToken(user_id=uid_val, token=token, expires_at=expires_at, revoked=False)
                db.add(rt)
                await db.flush()
                await db.refresh(rt)
                await db.commit()
                return rt
            except ProgrammingError as exc:
                should_retry = (
                    not _retry
                    and UndefinedTableError is not None
                    and isinstance(getattr(exc, "orig", None), UndefinedTableError)
                )
                if should_retry:
                    try:
                        await db.rollback()
                    except Exception:
                        pass
                    # Ensure refresh_tokens table exists, then retry once
                    try:
                        async with async_session() as ddl_session:
                            await ddl_session.run_sync(RefreshToken.__table__.create, checkfirst=True)
                            await ddl_session.commit()
                    except Exception:
                        # If creation fails, propagate original error
                        raise
                    return await self.persist_refresh_token(user_id, token, expires_in_minutes, _retry=True)
                try:
                    await db.rollback()
                except Exception:
                    pass
                raise
            except Exception:
                try:
                    await db.rollback()
                except Exception:
                    pass
                raise

    async def revoke_refresh_token(self, token: str) -> bool:
        async with async_session() as db:
            try:
                res = await db.execute(select(RefreshToken).where(RefreshToken.token == token))
                rt = res.scalar_one_or_none()
                if not rt:
                    return False
                # Mark revoked and persist
                await db.execute(update(RefreshToken).where(RefreshToken.id == rt.id).values(revoked=True))
                await db.commit()
                return True
            except Exception:
                try:
                    await db.rollback()
                except Exception:
                    pass
                raise

    async def is_token_revoked(self, token: str) -> bool:
        async with async_session() as db:
            try:
                res = await db.execute(select(RefreshToken).where(RefreshToken.token == token))
                rt = res.scalar_one_or_none()
                if not rt:
                    return True
                if rt.revoked:
                    return True
                if rt.expires_at and rt.expires_at < datetime.utcnow():
                    return True
                return False
            except Exception:
                # If DB check fails, be conservative and treat token as revoked
                return True


