"""Add indices for refresh_tokens

Revision ID: add_refresh_tokens_indices_20251001
Revises: add_refresh_tokens_table_20251001
Create Date: 2025-10-01 00:00:00.000001
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_refresh_tokens_indices_20251001'
down_revision = 'add_refresh_tokens_table_20251001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index('ix_refresh_tokens_expires_at', 'refresh_tokens', ['expires_at'])
    op.create_index('ix_refresh_tokens_revoked', 'refresh_tokens', ['revoked'])


def downgrade() -> None:
    op.drop_index('ix_refresh_tokens_revoked', table_name='refresh_tokens')
    op.drop_index('ix_refresh_tokens_expires_at', table_name='refresh_tokens')


