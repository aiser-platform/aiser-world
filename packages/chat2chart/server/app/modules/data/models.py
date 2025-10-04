"""
Data Connectivity Models
Database models for data sources and connections
"""

from sqlalchemy import Column, String, Integer, DateTime, Text, JSON, Boolean
from sqlalchemy.sql import func
from app.common.model import Base


class DataSource(Base):
    """Data source model for storing data source metadata"""

    __tablename__ = "data_sources"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # 'file' or 'database'
    format = Column(String, nullable=True)  # For file sources: 'csv', 'xlsx', etc.
    db_type = Column(
        String, nullable=True
    )  # For database sources: 'postgresql', 'mysql', etc.

    # Metadata
    size = Column(Integer, nullable=True)  # File size in bytes
    row_count = Column(Integer, nullable=True)
    schema = Column(JSON, nullable=True)  # Schema information
    # Optional in-memory sample rows persisted for modeling/fallback
    sample_data = Column(JSON, nullable=True)
    # Optional description and free-form metadata for data sources
    description = Column(Text, nullable=True)

    # Connection details (encrypted in production)
    connection_config = Column(JSON, nullable=True)

    # File details
    file_path = Column(String, nullable=True)
    original_filename = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # User and tenant
    user_id = Column(String, nullable=True)
    tenant_id = Column(String, nullable=False, default="default")

    # Status
    is_active = Column(Boolean, default=True)
    last_accessed = Column(DateTime(timezone=True), nullable=True)


class DataQuery(Base):
    """Data query model for storing query history"""

    __tablename__ = "data_queries"

    id = Column(String, primary_key=True, index=True)
    data_source_id = Column(String, nullable=False)

    # Query details
    natural_language_query = Column(Text, nullable=True)
    query_config = Column(JSON, nullable=True)  # Filters, sorting, etc.

    # Results
    result_count = Column(Integer, nullable=True)
    execution_time_ms = Column(Integer, nullable=True)

    # Analytics
    query_type = Column(JSON, nullable=True)  # ['trends', 'comparisons', etc.]
    business_context = Column(JSON, nullable=True)

    # Chart generation
    chart_type = Column(String, nullable=True)
    chart_config = Column(JSON, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # User and tenant
    user_id = Column(String, nullable=True)
    tenant_id = Column(String, nullable=False, default="default")


class DataConnection(Base):
    """Data connection model for database connections"""

    __tablename__ = "data_connections"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # 'postgresql', 'mysql', etc.

    # Connection details (encrypted in production)
    host = Column(String, nullable=False)
    port = Column(Integer, nullable=False)
    database = Column(String, nullable=False)
    username = Column(String, nullable=False)
    password = Column(String, nullable=False)  # Should be encrypted

    # Connection options
    connection_options = Column(JSON, nullable=True)

    # Status
    is_active = Column(Boolean, default=True)
    last_tested = Column(DateTime(timezone=True), nullable=True)
    test_status = Column(String, nullable=True)  # 'success', 'failed'

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # User and tenant
    user_id = Column(String, nullable=True)
    tenant_id = Column(String, nullable=False, default="default")
