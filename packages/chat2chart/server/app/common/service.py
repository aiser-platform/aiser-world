from typing import Any, Dict, Generic, List, Optional, Type, TypeVar

from app.common.repository import BaseRepository
from app.common.schemas import ListResponseSchema, PaginationSchema
from app.utils.pagination import paginate
from pydantic import BaseModel

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)
ResponseSchemaType = TypeVar("ResponseSchemaType", bound=BaseModel)


class BaseService(
    Generic[ModelType, CreateSchemaType, UpdateSchemaType, ResponseSchemaType]
):
    """
    Base service class that implements common business logic operations.
    Works in conjunction with BaseRepository to provide a clean service layer pattern.

    Args:
        ModelType: The SQLAlchemy model type
        CreateSchemaType: Pydantic schema for creation operations
        UpdateSchemaType: Pydantic schema for update operations

    Features:
        - CRUD operations with error handling
        - Pagination support
        - Extension points for custom business logic
        - Type safety with generics

    Example:
        class UserService(BaseService[User, UserCreate, UserUpdate]):
            async def validate_email(self, email: str) -> bool:
                # Custom business logic
                pass

        user_service = UserService(user_repository)
        users = await user_service.get_all(limit=10)
    """

    def __init__(
        self, repository: BaseRepository[ModelType, CreateSchemaType, UpdateSchemaType]
    ):
        """
        Base service with common business logic operations

        :param repository: Repository instance for data access
        """
        self.repository = repository

    async def get(self, id: int) -> Optional[ModelType]:
        """
        Retrieve a single record by ID

        :param id: Primary key identifier
        :return: Model instance or None
        """
        return await self.repository.get(id)

    async def get_all(
        self,
        offset: int = 0,
        limit: int = 100,
        sort_by: str | None = None,
        sort_order: str = "desc",
        search_query: dict | None = None,
        filter_query: dict | None = None,
    ) -> ListResponseSchema[ResponseSchemaType]:
        """
        Retrieve multiple records with pagination

        :param skip: Number of records to skip
        :param limit: Maximum number of records to return
        :return: List of model instances
        """
        try:
            items = await self.repository.get_all(
                offset, limit, sort_by, sort_order, search_query, filter_query
            )
            # Convert SQLAlchemy model instances to dictionaries
            items_as_dict = [item.__dict__ for item in items]
            # Remove SQLAlchemy internal state
            for item in items_as_dict:
                item.pop("_sa_instance_state", None)

            pagination = await self.repository.get_pagination_info(
                offset, limit, search_query, filter_query
            )
        except Exception as e:
            raise e

        return ListResponseSchema(items=items_as_dict, pagination=pagination)

    async def create(self, obj_in: CreateSchemaType) -> ModelType:
        """
        Create a new record with optional business logic validation

        :param obj_in: Creation schema with data
        :return: Created model instance
        """
        # Optional: Add custom validation or pre-processing logic here
        return await self.repository.create(obj_in)

    async def update(self, id: int, obj_in: UpdateSchemaType) -> Optional[ModelType]:
        """
        Update an existing record with optional business logic validation

        :param id: Primary key identifier
        :param obj_in: Update schema with new data
        :return: Updated model instance or None
        """
        # Optional: Add custom validation or pre-processing logic here
        return await self.repository.update(id, obj_in)

    async def delete(self, id: int) -> bool:
        """
        Delete a record by ID

        :param id: Primary key identifier
        :return: True if deletion successful, False otherwise
        """
        # Optional: Add custom deletion logic or soft delete implementation
        return await self.repository.delete(id)
