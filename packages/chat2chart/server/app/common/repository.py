import logging
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar
from sqlalchemy import select, func, desc, asc
from sqlalchemy.orm import Query
from pydantic import BaseModel

from app.db.session import get_db

logger = logging.getLogger(__name__)

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    Base repository for database operations with SQLAlchemy models.
    Provides CRUD operations with pagination, sorting and filtering.

    Args:
        ModelType: SQLAlchemy model
        CreateSchemaType: Pydantic create schema
        UpdateSchemaType: Pydantic update schema

    Example:
        class UserRepo(BaseRepository[User, UserCreate, UserUpdate]):
            pass
        user_repo = UserRepo(User)
        users = await user_repo.get_all(limit=10)
    """

    def __init__(self, model: Type[ModelType]):
        self.model = model
        self.db = get_db()

    def _build_base_query(self) -> Query:
        """Build base query for the model"""
        return select(self.model)

    def _apply_exact_filters(
        self, query: Query, filter_query: Optional[Dict[str, Any]]
    ) -> Query:
        """Apply exact match filters to query"""
        if not filter_query:
            return query

        for field, value in filter_query.items():
            if hasattr(self.model, field) and value is not None:
                if isinstance(value, list):
                    query = query.where(getattr(self.model, field).in_(value))
                else:
                    query = query.where(getattr(self.model, field) == value)

        return query

    def _apply_search_filters(self, query: Query, search_query: Optional[str]) -> Query:
        """Apply search filters to query"""
        if not search_query:
            return query

        # Simple search across string fields
        from sqlalchemy import or_
        search_conditions = []
        for column in self.model.__table__.columns:
            try:
                if column.type.python_type == str:
                    search_conditions.append(column.ilike(f"%{search_query}%"))
            except Exception:
                continue

        if search_conditions:
            from sqlalchemy import or_
            query = query.where(or_(*search_conditions))

        return query

    def _apply_sorting(
        self, query: Query, sort_by: Optional[str], sort_order: Optional[str]
    ) -> Query:
        """Apply sorting to query"""
        if not sort_by or not hasattr(self.model, sort_by):
            return query

        if sort_order == "desc":
            query = query.order_by(desc(getattr(self.model, sort_by)))
        else:
            query = query.order_by(asc(getattr(self.model, sort_by)))

        return query

    def _apply_pagination(
        self, query: Query, offset: Optional[int], limit: Optional[int]
    ) -> Query:
        """Apply pagination to query"""
        if offset is not None:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)

        return query

    async def get(self, id: int) -> Optional[ModelType]:
        """Get a single record by ID"""
        try:
            query = self._build_base_query().where(self.model.id == id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            raise e

    async def get_all(
        self,
        offset: Optional[int] = None,
        limit: Optional[int] = None,
        filter_query: Optional[Dict[str, Any]] = None,
        search_query: Optional[str] = None,
        sort_by: Optional[str] = None,
        sort_order: Optional[str] = "asc",
    ) -> List[ModelType]:
        """Get all records with optional filtering, searching, sorting and pagination"""
        try:
            query = self._build_base_query()
            query = self._apply_exact_filters(query, filter_query)
            query = self._apply_search_filters(query, search_query)
            query = self._apply_sorting(query, sort_by, sort_order)
            query = self._apply_pagination(query, offset, limit)

            result = await self._execute_and_fetch_all(query)
            return result
        except Exception as e:
            logger.error(f"Error fetching records: {str(e)}")
            raise

    async def create(self, obj_in: CreateSchemaType) -> ModelType:
        """Create a new record"""
        try:
            from app.common.utils import jsonable_encoder

            obj_in_data = jsonable_encoder(obj_in)
            db_obj = self.model(**obj_in_data)
            return await self.db.add(db_obj)
        except Exception as e:
            raise e

    async def update(self, id: int, obj_in: UpdateSchemaType) -> Optional[ModelType]:
        """Update an existing record"""
        try:
            db_obj = await self.get(id)
            if not db_obj:
                return None

            update_data = obj_in.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(db_obj, field, value)

            return await self.db.add(db_obj)
        except Exception as e:
            raise e

    async def delete(self, id: int) -> bool:
        """Delete a record by ID"""
        try:
            db_obj = await self.get(id)
            if not db_obj:
                return False

            # Use the new async database session
            async with self.db.get_session() as session:
                await session.delete(db_obj)
                await session.commit()
            return True
        except Exception as e:
            raise e

    async def count(
        self,
        filter_query: Optional[Dict[str, Any]] = None,
        search_query: Optional[str] = None,
    ) -> int:
        """Get total count of records with optional filtering"""
        try:
            query = select(func.count(func.distinct(self.model.id))).select_from(
                self.model
            )
            query = self._apply_search_filters(query, search_query)
            query = self._apply_exact_filters(query, filter_query)

            result = await self.db.execute(query)
            count = result.scalar()

            logger.debug(f"Count for {self.model.__name__}: {count}")
            return count

        except Exception as e:
            logger.error(f"Count error for {self.model.__name__}: {e}")
            raise

    async def get_pagination_info(
        self,
        page: int = 1,
        page_size: int = 10,
        filter_query: Optional[Dict[str, Any]] = None,
        search_query: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get pagination information"""
        try:
            total_count = await self.count(filter_query, search_query)
            total_pages = (total_count + page_size - 1) // page_size
            offset = (page - 1) * page_size

            return {
                "total_count": total_count,
                "total_pages": total_pages,
                "current_page": page,
                "page_size": page_size,
                "offset": offset,
            }
        except Exception:
            raise

    async def _execute_and_fetch_all(self, query):
        result = await self.db.execute(query)
        return result.scalars().all()

    async def exists(self, id: int) -> bool:
        """Check if a record exists by ID"""
        try:
            query = (
                select(func.count()).select_from(self.model).where(self.model.id == id)
            )
            result = await self.db.execute(query)
            return result.scalar() > 0
        except Exception as e:
            logger.error(f"Exists check error for {self.model.__name__}: {e}")
            raise

    async def get_by_field(self, field: str, value: Any) -> Optional[ModelType]:
        """Get a record by a specific field value"""
        try:
            if not hasattr(self.model, field):
                raise ValueError(
                    f"Field '{field}' does not exist in model {self.model.__name__}"
                )

            query = self._build_base_query().where(getattr(self.model, field) == value)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            raise e

    async def bulk_create(self, objects: List[CreateSchemaType]) -> List[ModelType]:
        """Create multiple records in bulk"""
        try:
            from app.common.utils import jsonable_encoder

            db_objects = []

            for obj_in in objects:
                obj_in_data = jsonable_encoder(obj_in)
                db_obj = self.model(**obj_in_data)
                db_objects.append(db_obj)

            # Use the new async database session for bulk operations
            async with self.db.get_session() as session:
                session.add_all(db_objects)
                await session.commit()

                # Refresh all objects to get their IDs
                for obj in db_objects:
                    await session.refresh(obj)

                return db_objects
        except Exception as e:
            raise e

    async def bulk_update(self, updates: List[Dict[str, Any]]) -> bool:
        """Update multiple records in bulk"""
        try:
            # Use the new async database session for bulk operations
            async with self.db.get_session() as session:
                for update_data in updates:
                    record_id = update_data.pop("id", None)
                    if record_id is None:
                        continue

                    record = await session.get(self.model, record_id)
                    if record:
                        for field, value in update_data.items():
                            if hasattr(record, field):
                                setattr(record, field, value)

                await session.commit()
                return True
        except Exception as e:
            raise e

    async def bulk_delete(self, ids: List[int]) -> bool:
        """Delete multiple records by IDs"""
        try:
            # Use the new async database session for bulk operations
            async with self.db.get_session() as session:
                for record_id in ids:
                    record = await session.get(self.model, record_id)
                    if record:
                        await session.delete(record)

                await session.commit()
                return True
        except Exception as e:
            raise e
