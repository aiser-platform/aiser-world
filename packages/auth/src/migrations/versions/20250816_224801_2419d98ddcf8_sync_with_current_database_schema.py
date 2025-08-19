"""sync with current database schema

Revision ID: 2419d98ddcf8
Revises: a52334a5baf8
Create Date: 2025-08-16 22:48:01.086453

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '2419d98ddcf8'
down_revision: Union[str, None] = 'a52334a5baf8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """This migration represents the current database state.
    
    Since the database already has all the tables and the models don't match exactly,
    this migration is a no-op that just marks the current state.
    """
    pass


def downgrade() -> None:
    """This migration cannot be downgraded as it represents the current state."""
    pass
