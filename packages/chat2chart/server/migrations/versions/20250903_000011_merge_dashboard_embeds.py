"""Merge heads: merge_heads_001 and add_dashboard_embeds_001

Revision ID: merge_dashboard_embeds_001
Revises: merge_heads_001, add_dashboard_embeds_001
Create Date: 2025-09-03 00:00:11.000000

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'merge_dashboard_embeds_001'
down_revision = ('merge_heads_001', 'add_dashboard_embeds_001')
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Merge migration - no schema changes; this joins the two heads
    pass


def downgrade() -> None:
    pass


