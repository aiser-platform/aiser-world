"""create user_settings table

Revision ID: 20251111_add_user_settings_table
Revises: 
Create Date: 2025-11-11 05:34:31.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20251111_add_user_settings_table"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "user_settings",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("key", sa.String(length=128), nullable=False, index=True),
        sa.Column("value", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_user_settings_user_id", "user_settings", ["user_id"])
    op.create_index("ix_user_settings_key", "user_settings", ["key"])


def downgrade():
    op.drop_index("ix_user_settings_key", table_name="user_settings")
    op.drop_index("ix_user_settings_user_id", table_name="user_settings")
    op.drop_table("user_settings")


