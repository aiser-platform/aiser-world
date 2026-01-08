"""
Consolidated database models for the 4 core tables.

IMPORTANT: These SQLAlchemy models are the SOURCE OF TRUTH for database schema.

Workflow for schema changes:
1. Edit models in this file (app/db/models.py)
2. Generate migration: poetry run alembic -c alembic.ini revision --autogenerate -m "description"
3. Review the generated migration file
4. Apply migration: alembic upgrade head

downgrade:
  poetry run alembic -c alembic.ini downgrade <revision_id>

Never edit the database schema directly. All changes must go through:
  Model changes → Migration generation → Migration review → Migration application

All models match the exact database schema provided.
"""
from sqlalchemy import Column, String, Integer, DateTime, Text, JSON, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import BYTEA, JSONB, UUID
from sqlalchemy.sql import func, text
from app.db.base import Base, BaseModel


class Conversation(BaseModel):
    """
    Conversation model matching exact database schema.
    Table: conversation
    Schema: id (UUID), user_id (UUID), title, description, status, type, 
            json_metadata, created_at, updated_at, deleted_at, is_active, is_deleted
    
    Inherits all common fields from BaseModel (id, timestamps, status flags).
    """
    __tablename__ = "conversation"

    # User ownership (UUID in DB, nullable)
    user_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    # Basic information
    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String(50), nullable=True, server_default=text("'active'"))
    type = Column(String(50), nullable=True, server_default=text("'chat2chart'"))

    # Metadata
    json_metadata = Column(Text, nullable=True)


class Message(BaseModel):
    """
    Message model matching exact database schema.
    Table: message
    Schema: id (UUID), conversation_id (UUID FK), query, answer, error, status,
            ai_metadata, metadata, created_at, updated_at, deleted_at, is_active, is_deleted
    
    Overrides BaseModel fields that differ:
    - id: no server_default (application must provide)
    - created_at/updated_at: NOT NULL (no defaults)
    """
    __tablename__ = "message"

    # Foreign Key relationship (UUID in DB)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversation.id"), nullable=False)

    # Message content
    query = Column(Text, nullable=True)
    answer = Column(Text, nullable=True)

    # Status and metadata
    error = Column(String, nullable=True)
    status = Column(String, nullable=True)
    
    # AI metadata (JSONB in DB)
    ai_metadata = Column(JSONB, nullable=True)
    message_metadata = Column("metadata", JSONB, nullable=True)  # Column name override
    

class DataSource(Base):
    """
    Data source model matching exact database schema.
    Table: data_sources
    Schema: id (UUID), name, type, format, db_type, size, row_count, schema (JSON),
            sample_data (JSON), description, connection_config (JSON), file_path,
            original_filename, created_at, updated_at, user_id, is_active, last_accessed
    Note: Does not inherit from BaseModel because data_sources table doesn't have 
          deleted_at or is_deleted columns in the database schema.
    """
    __tablename__ = "data_sources"

    id = Column(String, primary_key=True, index=True)
    
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # 'file' or 'database'
    format = Column(String, nullable=True)  # For file sources: 'csv', 'xlsx', etc.
    db_type = Column(String, nullable=True)  # For database sources: 'postgresql', 'mysql', etc.

    # Metadata
    size = Column(Integer, nullable=True)  # File size in bytes
    row_count = Column(Integer, nullable=True)
    schema = Column(JSON, nullable=True)  # Schema information
    sample_data = Column(JSON, nullable=True)  # Optional in-memory sample rows
    description = Column(Text, nullable=True)

    # Connection details (encrypted in production)
    connection_config = Column(JSON, nullable=True)

    # File details
    file_path = Column(String, nullable=True)
    original_filename = Column(String, nullable=True)

    # Timestamps (TIMESTAMP WITH TIME ZONE)
    created_at = Column(DateTime(timezone=True), nullable=True, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())

    # User ownership (VARCHAR, nullable in DB)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    # Status (nullable in DB)
    is_active = Column(Boolean, nullable=True, server_default=text("true"))
    last_accessed = Column(DateTime(timezone=True), nullable=True)


class FileStorage(Base):
    """
    File storage model matching exact database schema.
    Table: file_storage
    Schema: object_key (VARCHAR PK), file_data (BYTEA), file_size, content_type,
            original_filename, user_id, created_at, updated_at, is_active
    Note: Does not inherit from BaseModel because object_key is the primary key, not id.
    """
    __tablename__ = "file_storage"

    # Primary key is object_key, not id
    object_key = Column(String, primary_key=True, index=True)
    
    # Binary data
    file_data = Column(BYTEA, nullable=False)  # PostgreSQL BYTEA type
    
    # Metadata
    file_size = Column(Integer, nullable=False)
    content_type = Column(String, nullable=True)
    original_filename = Column(String, nullable=True)
    
    # Ownership (UUID, NOT NULL in DB)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Timestamps (TIMESTAMP WITH TIME ZONE)
    created_at = Column(DateTime(timezone=True), nullable=True, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, server_default=func.now(), onupdate=func.now())
    
    # Soft delete (nullable in DB)
    is_active = Column(Boolean, nullable=True, server_default=text("true"))

