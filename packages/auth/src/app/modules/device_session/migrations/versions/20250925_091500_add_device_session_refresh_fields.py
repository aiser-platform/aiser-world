"""add device_session refresh token revocation fields

Revision ID: 20250925_091500_add_device_session_refresh_fields
Revises: 
Create Date: 2025-09-25 09:15:00
"""
from alembic import op
import sqlalchemy as sa

revision = '20250925_091500_add_device_session_refresh_fields'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    if 'device_sessions' in insp.get_table_names():
        cols = [c['name'] for c in insp.get_columns('device_sessions')]
        if 'refresh_token_revoked' not in cols:
            op.add_column('device_sessions', sa.Column('refresh_token_revoked', sa.Boolean(), server_default=sa.sql.expression.false(), nullable=False))
        if 'refresh_token_expires_at' not in cols:
            op.add_column('device_sessions', sa.Column('refresh_token_expires_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    if 'device_sessions' in insp.get_table_names():
        cols = [c['name'] for c in insp.get_columns('device_sessions')]
        if 'refresh_token_expires_at' in cols:
            op.drop_column('device_sessions', 'refresh_token_expires_at')
        if 'refresh_token_revoked' in cols:
            op.drop_column('device_sessions', 'refresh_token_revoked')


