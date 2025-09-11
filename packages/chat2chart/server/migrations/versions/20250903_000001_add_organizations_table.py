"""Add organizations table

Revision ID: add_organizations_001
Revises: current_state_001
Create Date: 2025-09-03 00:00:01.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "add_organizations_001"
down_revision = "current_state_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create organizations table
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("slug", sa.String(length=50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("logo_url", sa.String(length=255), nullable=True),
        sa.Column("website", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=True),
        sa.Column("plan_type", sa.String(length=20), nullable=True),
        sa.Column("ai_credits_used", sa.Integer(), nullable=True),
        sa.Column("ai_credits_limit", sa.Integer(), nullable=True),
        sa.Column("trial_ends_at", sa.DateTime(), nullable=True),
        sa.Column("is_trial_active", sa.Boolean(), nullable=True),
        sa.Column("max_users", sa.Integer(), nullable=True),
        sa.Column("max_projects", sa.Integer(), nullable=True),
        sa.Column("max_storage_gb", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("slug"),
    )

    # Create indexes
    op.create_index("idx_organizations_is_active", "organizations", ["is_active"])
    op.create_index("idx_organizations_plan_type", "organizations", ["plan_type"])
    op.create_index("idx_organizations_created_at", "organizations", ["created_at"])


def downgrade() -> None:
    op.drop_index("idx_organizations_created_at", table_name="organizations")
    op.drop_index("idx_organizations_plan_type", table_name="organizations")
    op.drop_index("idx_organizations_is_active", table_name="organizations")
    op.drop_table("organizations")
