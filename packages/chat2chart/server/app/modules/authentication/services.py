from typing import Optional
from datetime import datetime, timedelta
import logging
from app.modules.authentication.models import RefreshToken
from app.db.session import async_session
from app.modules.authentication.auth import Auth
from sqlalchemy import select
from sqlalchemy import update

logger = logging.getLogger(__name__)
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
                # Normalize user id and resolve legacy numeric id -> canonical UUID
                uid_val = str(user_id) if user_id is not None else None
                # If value looks like a numeric legacy id, try to resolve to UUID
                if uid_val and uid_val.isdigit():
                    try:
                        from sqlalchemy import text as _text
                        res = await db.execute(_text("SELECT id FROM users WHERE legacy_id = :lid LIMIT 1").bindparams(lid=int(uid_val)))
                        row = res.first()
                        if row and row[0]:
                            uid_val = str(row[0])
                        else:
                            # Could not resolve legacy id to UUID; skip persisting to avoid UUID cast errors
                            logger.warning("persist_refresh_token: could not resolve legacy user id %s to UUID; skipping refresh token persist", uid_val)
                            return None
                    except Exception:
                        # On any DB lookup error, avoid failing the flow; skip persisting
                        try:
                            await db.rollback()
                        except Exception:
                            pass
                        logger.exception("persist_refresh_token: failed resolving legacy_id to UUID; skipping persist")
                        return None

                # At this point uid_val should be a UUID string or None
                if not uid_val:
                    logger.warning("persist_refresh_token called without resolvable user_id; skipping persist")
                    return None

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


