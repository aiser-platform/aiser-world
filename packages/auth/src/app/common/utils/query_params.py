from typing import List, Optional

from fastapi import Query
from pydantic import BaseModel, Field


def get_search_columns(
    search_columns: List[str] = Query(
        description="Columns to search in", default_factory=list
    )
) -> Optional[List[str]]:
    return search_columns


class BaseFilterParams(BaseModel):
    offset: int = Field(default=0, ge=0, description="Number of records to skip")
    limit: int = Field(
        default=100, ge=1, description="Maximum number of records to return"
    )
    sort_by: str = Field(default="created_at", description="Column to sort by")
    sort_order: str = Field(default="desc", description="Sort direction (asc/desc)")
    search: Optional[str] = Field(None, description="Search query")
    search_columns: List[str] = Query(get_search_columns())
