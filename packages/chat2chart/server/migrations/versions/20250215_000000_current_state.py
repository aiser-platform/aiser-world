"""Mark current database state for chat2chart service

Revision ID: current_state_001
Revises: 
Create Date: 2025-02-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'current_state_001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This migration marks the current database state
    # No schema changes needed - just marking the current version
    pass


def downgrade() -> None:
    # No downgrade needed
    pass
