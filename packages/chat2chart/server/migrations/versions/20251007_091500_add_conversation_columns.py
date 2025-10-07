"""add conversation columns

Revision ID: 20251007_091500_add_conversation_columns
Revises: 
Create Date: 2025-10-07 09:15:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20251007_091500_add_conversation_columns'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    # Use IF NOT EXISTS to be resilient when running against live DBs
    bind.execute("ALTER TABLE conversation ADD COLUMN IF NOT EXISTS json_metadata TEXT;")
    bind.execute("ALTER TABLE conversation ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;")
    bind.execute("ALTER TABLE conversation ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;")
    bind.execute("ALTER TABLE conversation ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;")


def downgrade():
    bind = op.get_bind()
    # Downgrade: drop columns if they exist (best-effort)
    try:
        bind.execute("ALTER TABLE conversation DROP COLUMN IF EXISTS json_metadata;")
        bind.execute("ALTER TABLE conversation DROP COLUMN IF EXISTS deleted_at;")
        bind.execute("ALTER TABLE conversation DROP COLUMN IF EXISTS is_active;")
        bind.execute("ALTER TABLE conversation DROP COLUMN IF EXISTS is_deleted;")
    except Exception:
        pass


