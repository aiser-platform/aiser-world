"""Add indices for device_sessions refresh token fields

Revision ID: auth_add_refresh_indices_20251001
Revises: auth_add_refresh_meta_20251001
Create Date: 2025-10-01 00:00:00.000002
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'auth_add_refresh_indices_20251001'
down_revision = 'auth_add_refresh_meta_20251001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index('ix_device_sessions_refresh_expires_at', 'device_sessions', ['refresh_token_expires_at'])
    op.create_index('ix_device_sessions_refresh_revoked', 'device_sessions', ['refresh_token_revoked'])


def downgrade() -> None:
    op.drop_index('ix_device_sessions_refresh_revoked', table_name='device_sessions')
    op.drop_index('ix_device_sessions_refresh_expires_at', table_name='device_sessions')


