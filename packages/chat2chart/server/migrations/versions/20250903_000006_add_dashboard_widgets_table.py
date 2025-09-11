"""Add dashboard_widgets table

Revision ID: add_dashboard_widgets_001
Revises: add_dashboards_001
Create Date: 2025-09-03 00:00:06.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "add_dashboard_widgets_001"
down_revision = "add_dashboards_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create dashboard_widgets table
    op.create_table(
        "dashboard_widgets",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dashboard_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("widget_type", sa.String(length=50), nullable=False),
        sa.Column("chart_type", sa.String(length=50), nullable=True),
        sa.Column("config", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "data_config", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
        sa.Column(
            "style_config", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
        sa.Column("x", sa.Integer(), nullable=True),
        sa.Column("y", sa.Integer(), nullable=True),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("z_index", sa.Integer(), nullable=True),
        sa.Column("is_visible", sa.Boolean(), nullable=True),
        sa.Column("is_locked", sa.Boolean(), nullable=True),
        sa.Column("is_resizable", sa.Boolean(), nullable=True),
        sa.Column("is_draggable", sa.Boolean(), nullable=True),
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
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(
            ["dashboard_id"],
            ["dashboards.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes
    op.create_index(
        "idx_dashboard_widgets_dashboard_id", "dashboard_widgets", ["dashboard_id"]
    )
    op.create_index(
        "idx_dashboard_widgets_widget_type", "dashboard_widgets", ["widget_type"]
    )
    op.create_index(
        "idx_dashboard_widgets_is_visible", "dashboard_widgets", ["is_visible"]
    )


def downgrade() -> None:
    op.drop_index("idx_dashboard_widgets_is_visible", table_name="dashboard_widgets")
    op.drop_index("idx_dashboard_widgets_widget_type", table_name="dashboard_widgets")
    op.drop_index("idx_dashboard_widgets_dashboard_id", table_name="dashboard_widgets")
    op.drop_table("dashboard_widgets")
