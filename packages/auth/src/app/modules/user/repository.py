import logging
from datetime import datetime
from typing import List, Optional

from sqlalchemy import select, text, Integer as SAInteger
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
            create_data = user_in.model_dump()
            table = self.model.__table__

            # Build a safe insert payload using only columns present in the
            # target table. Avoid assigning a UUID string into an integer
            # primary key by omitting `id` when the target column is integer.
            insert_payload = {}
            for col in table.columns:
                name = col.name
                if name not in create_data:
                    continue
                if name == 'id' and isinstance(col.type, SAInteger):
                    # If caller provided a UUID-like id string, skip it so DB
                    # will assign a numeric id. If caller provided a numeric
                    # id, allow it.
                    val = create_data.get('id')
                    if isinstance(val, str) and '-' in val:
                        continue
                insert_payload[name] = create_data[name]

            # If the target table supports an `id_new`/`new_id` UUID column,
            # persist the canonical UUID there when provided.
            if ('id_new' in table.c or 'new_id' in table.c) and 'id' in create_data:
                target_name = 'id_new' if 'id_new' in table.c else 'new_id'
                if target_name not in insert_payload:
                    insert_payload[target_name] = create_data.get('id')

            ins = table.insert().values(**insert_payload)
            # Return the primary id (and id_new if available) so we can load
            # the created object safely regardless of underlying PK type.
            returning_cols = [table.c.id]
            if 'id_new' in table.c:
                returning_cols.append(table.c.id_new)
            elif 'new_id' in table.c:
                returning_cols.append(table.c.new_id)

            res = db.execute(ins.returning(*returning_cols))
            db.commit()
            row = res.first()
            if row:
                created_id = row[0]
                # Load created object using text comparison of id to avoid
                # type casting issues.
                q = select(self.model).where(text("CAST(id AS TEXT) = :cid")).params(cid=str(created_id))
                result = db.execute(q)
                obj = result.scalars().first()
                if obj:
                    return obj

            # Fallback: create via ORM without explicit id
            fallback_data = create_data.copy()
            if 'id' in fallback_data:
                del fallback_data['id']
            db_obj = User(**fallback_data)
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            return db_obj
        except Exception as e:
            db.rollback()
            raise

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
