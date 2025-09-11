"""
Data Connectivity Schemas
Pydantic schemas for data connectivity API
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field


# Base schemas
class DataSourceBase(BaseModel):
    name: str
    type: str  # 'file' or 'database'
    format: Optional[str] = None
    db_type: Optional[str] = None


class DataSourceCreate(DataSourceBase):
    schema: Optional[Dict[str, Any]] = None
    connection_config: Optional[Dict[str, Any]] = None
    file_path: Optional[str] = None
    original_filename: Optional[str] = None
    size: Optional[int] = None
    row_count: Optional[int] = None


class DataSourceUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    last_accessed: Optional[datetime] = None


class DataSource(DataSourceBase):
    id: str
    size: Optional[int] = None
    row_count: Optional[int] = None
    schema: Optional[Dict[str, Any]] = None
    original_filename: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    user_id: Optional[str] = None
    tenant_id: str
    is_active: bool
    last_accessed: Optional[datetime] = None

    class Config:
        from_attributes = True


# File upload schemas
class FileUploadResponse(BaseModel):
    success: bool
    data_source: DataSource
    preview: Optional[List[Dict[str, Any]]] = None
    message: Optional[str] = None
    error: Optional[str] = None


# Database connection schemas
class DatabaseConnectionRequest(BaseModel):
    type: str = Field(..., description="Database type (postgresql, mysql, etc.)")
    host: str = Field(..., description="Database host")
    port: int = Field(..., description="Database port")
    database: str = Field(..., description="Database name")
    username: str = Field(..., description="Username")
    password: str = Field(..., description="Password")
    name: Optional[str] = Field(None, description="Connection name")


class DatabaseConnectionResponse(BaseModel):
    success: bool
    data_source: Optional[DataSource] = None
    message: Optional[str] = None
    error: Optional[str] = None


# Query schemas
class FilterConfig(BaseModel):
    column: str
    operator: str  # 'equals', 'contains', 'greater_than', 'less_than'
    value: Any


class SortConfig(BaseModel):
    column: str
    direction: str = "asc"  # 'asc' or 'desc'


class DataSourceQueryRequest(BaseModel):
    filters: Optional[List[FilterConfig]] = None
    sort: Optional[SortConfig] = None
    offset: Optional[int] = 0
    limit: Optional[int] = 1000


class DataSourceQueryResponse(BaseModel):
    success: bool
    data: List[Dict[str, Any]]
    total_rows: int
    offset: int
    limit: int
    schema: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# Chat-to-chart schemas
class ChatToChartRequest(BaseModel):
    data_source_id: str
    natural_language_query: str
    options: Optional[Dict[str, Any]] = None


class QueryAnalysis(BaseModel):
    original_query: str
    query_type: List[str]
    business_context: Dict[str, Any]
    data_source: str


class ChartAnalysis(BaseModel):
    type: str
    config: Dict[str, Any]
    data_analysis: Dict[str, Any]


class ChatToChartResponse(BaseModel):
    success: bool
    natural_language_query: str
    data_source: Dict[str, Any]
    analytics: Dict[str, Any]
    chart: ChartAnalysis
    data: List[Dict[str, Any]]
    timestamp: str
    error: Optional[str] = None


# Schema information
class ColumnSchema(BaseModel):
    name: str
    type: str  # 'string', 'number', 'integer', 'date', 'boolean'
    nullable: bool
    statistics: Optional[Dict[str, Any]] = None


class DataSchema(BaseModel):
    columns: List[ColumnSchema]
    types: Dict[str, str]
    row_count: int
    inferred_at: str


# List responses
class DataSourceListResponse(BaseModel):
    success: bool
    data_sources: List[DataSource]
    count: int
    error: Optional[str] = None


class DataSourceResponse(BaseModel):
    success: bool
    data_source: Optional[DataSource] = None
    error: Optional[str] = None


class DeleteResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    error: Optional[str] = None


# Health check
class HealthCheckResponse(BaseModel):
    success: bool
    service: str
    status: str
    supported_formats: List[str]
    max_file_size_mb: float
