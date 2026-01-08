"""
Data Connectivity Models
Database models for data sources and connections

NOTE: DataSource and FileStorage are now defined in app.db.models.
This file re-exports them for backward compatibility.
"""

# Re-export from consolidated models
from app.db.models import DataSource, FileStorage
from app.db.base import Base


# DataSource is now imported from app.db.models above

# DataQuery model (not part of core 4 tables, kept here for backward compatibility)
from sqlalchemy import Column, String, Integer, DateTime, Text, JSON
from sqlalchemy.sql import func

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

    # User ownership (required for security and data isolation)
    user_id = Column(String, nullable=False, index=True)


# DataConnection model removed - use DataSource for both files and databases
# FileStorage is now imported from app.db.models above