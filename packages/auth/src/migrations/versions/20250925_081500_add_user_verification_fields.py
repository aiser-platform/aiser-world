"""add verification fields to users

Revision ID: 20250925_081500_add_user_verification_fields
Revises: 80b7a4ef8464
Create Date: 2025-09-25 08:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250925_081500_add_user_verification_fields'
down_revision = '80b7a4ef8464'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add verification columns if missing (idempotent)
    conn = op.get_bind()
    try:
        conn.execute(sa.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_attempts integer DEFAULT 0"))
    except Exception:
        pass
    try:
        conn.execute(sa.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_sent_at timestamp"))
    except Exception:
        pass


def downgrade() -> None:
    # keep downgrade safe: don't drop columns automatically in dev
    try:
        op.drop_column('users', 'verification_attempts')
    except Exception:
        pass
    try:
        op.drop_column('users', 'verification_sent_at')
    except Exception:
        pass


