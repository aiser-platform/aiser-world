"""Add refresh token meta to device_sessions

Revision ID: auth_add_refresh_meta_20251001
Revises: None
Create Date: 2025-10-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'auth_add_refresh_meta_20251001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('device_sessions', sa.Column('refresh_token', sa.String(length=2048), nullable=False, server_default=''))
    op.add_column('device_sessions', sa.Column('refresh_token_revoked', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('device_sessions', sa.Column('refresh_token_expires_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('device_sessions', 'refresh_token_expires_at')
    op.drop_column('device_sessions', 'refresh_token_revoked')
    op.drop_column('device_sessions', 'refresh_token')


