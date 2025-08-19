import uuid
from datetime import datetime

from sqlalchemy import UUID, Boolean, Column, DateTime, Integer
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class BaseModel(Base):
    """
    Abstract base model that provides common fields for all database models.
    """

    __abstract__ = True

    # Common columns for all models
    id = Column(
        Integer,
        primary_key=True,
        index=True,
        doc="Primary key identifier",
        autoincrement=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        doc="Timestamp when the record was created",
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
        doc="Timestamp when the record was last updated",
    )

    deleted_at = Column(
        DateTime, nullable=True, doc="Timestamp when the record was deleted"
    )

    is_active = Column(
        Boolean, default=True, doc="Flag indicating if the record is active"
    )

    is_deleted = Column(Boolean, default=False, doc="Soft delete flag")
