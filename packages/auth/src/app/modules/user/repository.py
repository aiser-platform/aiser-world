import logging
from datetime import datetime
from typing import List, Optional

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.common.repository import BaseRepository
from app.modules.user.models import User
from app.modules.user.schemas import UserCreate, UserCreateInternal, UserUpdate

logger = logging.getLogger(__name__)


class UserRepository(BaseRepository[User, UserCreate | UserCreateInternal, UserUpdate]):
    def __init__(self):
        super().__init__(User)

    def get_by_email(self, email: str, db: Session) -> Optional[User]:
        """
        Get a user by email address

        :param email: User's email
        :param db: Database session
        :return: User instance or None
        """
        query = select(self.model).filter(self.model.email == email)
        result = db.execute(query)
        return result.scalars().first()

    def get_by_username(self, username: str, db: Session) -> Optional[User]:
        """
        Get a user by username

        :param username: User's username
        :param db: Database session
        :return: User instance or None
        """
        query = select(self.model).filter(self.model.username == username)
        result = db.execute(query)
        return result.scalars().first()

    def get_by_id(self, user_id: int | str, db: Session) -> Optional[User]:
        """
        Get a user by ID

        :param user_id: User's ID
        :param db: Database session
        :return: User instance or None
        """
        # Normalize incoming id: if string looks like UUID, compare as UUID; else keep as int
        # Normalize incoming id and query by either UUID/text match or legacy id
        try:
            if isinstance(user_id, str) and user_id.isdigit():
                # numeric string - keep as integer for legacy comparisons
                numeric_id = int(user_id)
            else:
                numeric_id = None
        except Exception:
            numeric_id = None

        # Build safe query: try to match id_new or id (cast to text) or legacy numeric id
        from sqlalchemy import or_, cast, String

        str_id = str(user_id)
        id_new_attr = getattr(self.model, 'id_new', None)

        clauses = []
        # Compare textual form of primary id to avoid casting errors
        clauses.append(cast(self.model.id, String) == str_id)
        if id_new_attr is not None:
            clauses.append(id_new_attr == str_id)
        if numeric_id is not None:
            # legacy integer FK match
            try:
                clauses.append(self.model.legacy_id == numeric_id)
            except Exception:
                pass

        query = select(self.model).where(or_(*clauses))
        result = db.execute(query)
        return result.scalars().first()

    def get_active_users(
        self, db: Session, offset: int = 0, limit: int = 100
    ) -> List[User]:
        """
        Get all active users with pagination

        :param db: Database session
        :param offset: Number of records to skip
        :param limit: Maximum number of records to return
        :return: List of active users
        """
        query = (
            select(self.model)
            .filter(self.model.is_active)
            .offset(offset)
            .limit(limit)
        )
        result = db.execute(query)
        return result.scalars().all()

    def update_verification_attempt(self, user: User, db: Session) -> User:
        """
        Update user's verification attempt counter and timestamp

        Args:
            user: User instance to update
            db: Database session

        Returns:
            Updated User instance
        """
        try:
            # Use a raw UPDATE statement to avoid DB type casting issues between
            # integer and UUID primary keys during migration. This writes the
            # verification attempt counters without relying on ORM-level type
            # coercion which may append ::UUID and fail when the underlying
            # column is still integer in dev databases.
            now = datetime.utcnow()
            query = text(
                "UPDATE users SET verification_attempts = :attempts, verification_sent_at = :sent_at, updated_at = :updated_at WHERE id = :id"
            )
            db.execute(
                query,
                {
                    "attempts": (user.verification_attempts or 0) + 1,
                    "sent_at": now,
                    "updated_at": now,
                    "id": user.id,
                },
            )
            db.commit()
            # Do not refresh ORM object to avoid casting issues on mixed-schema DBs
            # Caller can re-query if fresh values are required.
            return user
        except Exception as e:
            db.rollback()
            raise e

    def create(self, user_in: UserCreateInternal, db: Session) -> User:
        """
        Create a new user

        :param user_in: User creation data
        :param db: Database session
        :return: Created user instance
        """
        try:
            db_obj = User(**user_in.model_dump())
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            return db_obj
        except Exception as e:
            db.rollback()
            raise e

    def update(self, user_id: int, user_update: UserUpdate, db: Session) -> User:
        """
        Update a user

        :param user_id: User's ID
        :param user_update: User update data
        :param db: Database session
        :return: Updated user instance
        """
        try:
            user = self.get_by_id(user_id, db)
            if not user:
                raise ValueError("User not found")

            for field, value in user_update.model_dump(exclude_unset=True).items():
                setattr(user, field, value)

            db.commit()
            db.refresh(user)
            return user
        except Exception as e:
            db.rollback()
            raise e
