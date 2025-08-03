import logging
from typing import Generic, List, Optional, TypeVar

from app.common.schemas import PaginationSchema
from app.db.session import db
from app.utils.pagination import paginate
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.declarative import DeclarativeMeta
from sqlalchemy import or_

ModelType = TypeVar("ModelType", bound=DeclarativeMeta)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)

logger = logging.getLogger(__name__)


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

    def __init__(self, model: ModelType):
        """
        Initialize repository with SQLAlchemy model class.

        Args:
            model (ModelType): SQLAlchemy model class to use for operations
        """
        self.model = model
        self.db = db

    async def get_by_id(self, id: str) -> Optional[ModelType]:
        """
        Retrieve single record by primary key.

        Args:
            id (int): Primary key of record to retrieve

        Returns:
            Optional[ModelType]: Model instance if found, None otherwise

        Raises:
            Exception: If database operation fails
        """
        try:
            query = self._build_base_query().where(self.model.id == id)
            result = await self.db._session.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            await self.db._session.rollback()
            raise e

    async def get_by_fields(self, **kwargs) -> Optional[ModelType]:
        """
        Retrieve single record by field values.

        Args:
            **kwargs: Field names and values to match

        Returns:
            Optional[ModelType]: Model instance if found, None otherwise

        Raises:
            Exception: If database operation fails
        """
        try:
            query = self._build_base_query()
            for field, value in kwargs.items():
                query = query.where(getattr(self.model, field) == value)

            result = await self.db._session.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            await self.db._session.rollback()
            raise e

    async def get_all(
        self,
        offset: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
        search_query: Optional[dict] = None,
        filter_query: Optional[dict] = None,
    ) -> List[ModelType]:
        """
        Retrieve multiple records with pagination, sorting and filtering.

        Args:
            offset: Number of records to skip
            limit: Maximum records to return
            sort_by: Column name to sort by
            sort_order: Sort direction ('asc' or 'desc')
            search_query: Search filters for partial matches
            filter_query: Filters for exact matches

        Returns:
            List of model instances matching criteria

        Raises:
            Exception: If database operation fails
        """
        logger.debug(
            f"Fetching records for {self.model.__name__} with "
            f"offset={offset}, limit={limit}, sort={sort_by}"
        )

        try:
            query = self._build_base_query()
            query = self._apply_exact_filters(query, filter_query)
            query = self._apply_search_filters(query, search_query)
            query = self._apply_sorting(query, sort_by, sort_order)
            query = self._apply_pagination(query, offset, limit)

            result = await self._execute_and_fetch_all(query)
            # result = await self.db._session.execute(query)
            return result
        except Exception as e:
            logger.error(f"Error fetching records: {str(e)}")
            await self.db._session.rollback()
            raise

    async def create(self, obj_in: CreateSchemaType) -> ModelType:
        """
        Creates a new database record from the input schema.

        Args:
            obj_in (CreateSchemaType): Pydantic schema containing creation data

        Returns:
            ModelType: Created database model instance

        Raises:
            Exception: If database operation fails
        """
        try:
            if isinstance(obj_in, BaseModel):
                create_data = obj_in.model_dump()
            else:
                create_data = jsonable_encoder(obj_in)

            db_obj = self.model(**create_data)
            self.db._session.add(db_obj)
            await self.db._session.commit()
            await self.db._session.refresh(db_obj)
            return db_obj
        except Exception as e:
            await self.db._session.rollback()
            raise e

    async def update(self, id: str, obj_in: UpdateSchemaType) -> Optional[ModelType]:
        """
        Updates existing database record with new values.

        Args:
            id (int): Primary key of record to update
            obj_in (UpdateSchemaType): Pydantic schema containing update data

        Returns:
            Optional[ModelType]: Updated model instance or None if not found

        Raises:
            Exception: If database operation fails
        """
        try:
            db_obj = await self.get_by_id(id)
            if not db_obj:
                return None

            update_data = obj_in.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(db_obj, field, value)

            self.db._session.add(db_obj)
            await self.db._session.commit()
            await self.db._session.refresh(db_obj)
            return db_obj
        except Exception as e:
            await self.db._session.rollback()
            raise e

    async def delete(self, id: str) -> bool:
        """
        Deletes record from database by ID.

        Args:
            id (int): Primary key of record to delete

        Returns:
            bool: True if deleted successfully, False if not found

        Raises:
            Exception: If database operation fails
        """
        try:
            db_obj = await self.get_by_id(id)
            if not db_obj:
                return False

            await self.db._session.delete(db_obj)
            await self.db._session.commit()
            return True
        except Exception as e:
            await self.db._session.rollback()
            raise e

    async def count(
        self,
        search_query: dict = {},
        filter_query: dict = {},
    ) -> int:
        """
        Gets total count of records with optional filtering.

        Args:
            search_query: Search filters for partial matches
            filter_query: Filters for exact matches

        Returns:
            Total number of records matching criteria
        """
        try:
            query = select(func.count(func.distinct(self.model.id))).select_from(
                self.model
            )
            query = self._apply_search_filters(query, search_query)
            query = self._apply_exact_filters(query, filter_query)

            result = await self.db._session.execute(query)
            count = result.scalar()

            logger.debug(f"Count for {self.model.__name__}: {count}")
            return count

        except Exception as e:
            logger.error(f"Count error for {self.model.__name__}: {e}")
            await self.db._session.rollback()
            raise

    async def get_pagination_info(
        self,
        offset: int = 0,
        limit: int = 100,
        search_query: dict = None,
        filter_query: dict = None,
    ) -> PaginationSchema:
        """
        Get pagination metadata without fetching actual records.

        Args:
            offset (int): Number of records to skip
            limit (int): Maximum records to return
            sort_by (str): Column name to sort by
            sort_order (str): Sort direction ('asc' or 'desc')
            search_query (dict): Search filters to apply

        Returns:
            dict: Pagination metadata including page, limit, total pages and total records
        """
        try:
            # Get total count using existing count method
            total_count = await self.count(search_query, filter_query)

            # Calculate pagination values
            total_pages = (total_count + limit - 1) // limit if total_count > 0 else 0
            current_page = (offset // limit) + 1 if total_count > 0 else 0

            return PaginationSchema(
                total=total_count,
                offset=offset,
                limit=limit,
                has_more=total_count > (offset + limit),
                total_pages=total_pages,
                current_page=current_page,
            )
        except Exception as e:
            await self.db._session.rollback()
            raise

    def _apply_exact_filters(self, query, filter_query: dict):
        """
        Applies exact match filters to the query.

        Args:
            query: The SQLAlchemy query to filter
            filter_query (dict): Dictionary containing field names and exact values

        Returns:
            Modified query with exact match filters applied
        """
        if not filter_query:
            return query

        for field, value in filter_query.items():
            if hasattr(self.model, field):
                query = query.filter(getattr(self.model, field) == value)
        logger.debug(f"Applied exact filters: {filter_query}")
        return query

    async def _execute_and_fetch_all(self, query):
        result = await self.db._session.execute(query)
        return result.scalars().all()

    def _build_base_query(self):
        """
        Creates the base SELECT query for the model.

        Returns:
            SQLAlchemy select query object initialized with the model
        """
        return select(self.model)

    def _apply_search_filters(self, query, search_query: dict):
        """
        Applies search filters to the query based on the search_query dictionary.
        Uses OR conditions between different search terms.

        Args:
            query: The base SQLAlchemy query to filter
            search_query (dict): Dictionary containing field names and search values

        Returns:
            Modified query with ILIKE filters applied for matching fields using OR
        """
        if not search_query:
            return query

        search_conditions = []
        for field, value in search_query.items():
            if hasattr(self.model, field):
                search_conditions.append(getattr(self.model, field).ilike(f"%{value}%"))

        if search_conditions:
            query = query.filter(or_(*search_conditions))

        return query

    def _apply_sorting(self, query, sort_by: str, sort_order: str):
        """
        Applies sorting to the query based on column name and order.

        Args:
            query: The SQLAlchemy query to sort
            sort_by (str): Name of the column to sort by
            sort_order (str): Direction of sort ('asc' or 'desc')

        Returns:
            Query with ORDER BY clause applied
        """
        if not (isinstance(sort_by, str) and sort_by and hasattr(self.model, sort_by)):
            return query

        order_column = getattr(self.model, sort_by)
        return query.order_by(
            order_column.desc() if sort_order.lower() == "desc" else order_column.asc()
        )

    def _apply_pagination(self, query, offset: int, limit: int):
        """
        Applies pagination to the query using offset and limit.

        Args:
            query: The SQLAlchemy query to paginate
            offset (int): Number of records to skip
            limit (int): Maximum number of records to return

        Returns:
            Query with OFFSET and LIMIT applied
        """
        return query.offset(offset).limit(limit)
