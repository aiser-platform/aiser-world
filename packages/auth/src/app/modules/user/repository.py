import logging
from datetime import datetime
from typing import List, Optional

from sqlalchemy import select

from app.common.repository import BaseRepository
from app.modules.user.models import User
from app.modules.user.schemas import UserCreate, UserUpdate

logger = logging.getLogger(__name__)


class UserRepository(BaseRepository[User, UserCreate, UserUpdate]):
    def __init__(self):
        super().__init__(User)

    async def get_by_email(self, email: str) -> Optional[User]:
        """
        Get a user by email address

        :param email: User's email
        :return: User instance or None
        """
        query = select(self.model).filter(self.model.email == email)
        result = await self.db._session.execute(query)
        return result.scalars().first()

    async def get_by_username(self, username: str) -> Optional[User]:
        """
        Get a user by username

        :param username: User's username
        :return: User instance or None
        """
        query = select(self.model).filter(self.model.username == username)
        result = await self.db._session.execute(query)
        return result.scalars().first()

    async def get_active_users(self, offset: int = 0, limit: int = 100) -> List[User]:
        """
        Get all active users with pagination

        :param offset: Number of records to skip
        :param limit: Maximum number of records to return
        :return: List of active users
        """
        query = select(self.model).offset(offset).limit(limit)
        result = await self.db._session.execute(query)
        return result.scalars().all()

    async def update_verification_attempt(self, user: User) -> User:
        """
        Update user's verification attempt counter and timestamp

        Args:
            user: User instance to update

        Returns:
            Updated User instance
        """
        try:

            user.verification_attempts += 1
            user.verification_sent_at = datetime.utcnow()

            await self.db._session.commit()
            await self.db._session.refresh(user)

            return user
        except Exception as e:
            await self.db._session.rollback()
            raise e
