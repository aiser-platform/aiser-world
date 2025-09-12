"""Merge divergent heads

Revision ID: merge_heads_001
Revises: ba1a114a8f75, add_query_snapshots_001
Create Date: 2025-09-03 00:00:09.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'merge_heads_001'
# Ensure merge includes the legacy chat_visualization branch and the query_snapshots branch
down_revision = ('ba1a114a8f75', 'add_query_snapshots_001')
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Merge migration - no schema changes, just unify heads
    pass


def downgrade() -> None:
    pass


