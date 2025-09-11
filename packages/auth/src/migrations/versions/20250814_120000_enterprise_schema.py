"""Enterprise schema - organizations, roles, and user management

Revision ID: enterprise_001
Revises: fix_migration_chain_001
Create Date: 2025-08-14 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "enterprise_001"
down_revision = "fix_migration_chain_001"
branch_labels = None
depends_on = None


def upgrade():
    # Create organizations table
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("logo_url", sa.String(255), nullable=True),
        sa.Column("website", sa.String(255), nullable=True),
        sa.Column("plan_type", sa.String(20), nullable=False, server_default="free"),
        sa.Column("ai_credits_used", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "ai_credits_limit", sa.Integer(), nullable=False, server_default="50"
        ),
        sa.Column("trial_ends_at", sa.DateTime(), nullable=True),
        sa.Column(
            "is_trial_active", sa.Boolean(), nullable=False, server_default="true"
        ),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")
        ),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )

    # Create roles table
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("permissions", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column(
            "is_system_role", sa.Boolean(), nullable=False, server_default="false"
        ),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    # Create user_organizations table (many-to-many with roles)
    op.create_table(
        "user_organizations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.Column("invited_by", sa.Integer(), nullable=True),
        sa.Column("invited_at", sa.DateTime(), nullable=True),
        sa.Column("joined_at", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")
        ),
        sa.ForeignKeyConstraint(
            ["invited_by"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
        ),
        sa.ForeignKeyConstraint(
            ["role_id"],
            ["roles.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "organization_id"),
    )

    # Create projects table
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("settings", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")
        ),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create subscriptions table
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("plan_type", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("stripe_subscription_id", sa.String(100), nullable=True),
        sa.Column("stripe_customer_id", sa.String(100), nullable=True),
        sa.Column("current_period_start", sa.DateTime(), nullable=True),
        sa.Column("current_period_end", sa.DateTime(), nullable=True),
        sa.Column("trial_start", sa.DateTime(), nullable=True),
        sa.Column("trial_end", sa.DateTime(), nullable=True),
        sa.Column("canceled_at", sa.DateTime(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")
        ),
        sa.Column(
            "updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id"),
    )

    # Create ai_usage_logs table
    op.create_table(
        "ai_usage_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=True),
        sa.Column("model_name", sa.String(50), nullable=False),
        sa.Column("tokens_used", sa.Integer(), nullable=False),
        sa.Column("cost_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("request_type", sa.String(20), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Add external auth columns to users table
    op.add_column("users", sa.Column("external_provider", sa.String(50), nullable=True))
    op.add_column("users", sa.Column("external_id", sa.String(100), nullable=True))

    # Add indexes for performance
    op.create_index("idx_organizations_plan_type", "organizations", ["plan_type"])
    op.create_index("idx_user_organizations_user_id", "user_organizations", ["user_id"])
    op.create_index(
        "idx_user_organizations_organization_id",
        "user_organizations",
        ["organization_id"],
    )
    op.create_index("idx_projects_organization_id", "projects", ["organization_id"])
    op.create_index("idx_ai_usage_logs_user_id", "ai_usage_logs", ["user_id"])
    op.create_index(
        "idx_ai_usage_logs_organization_id", "ai_usage_logs", ["organization_id"]
    )
    op.create_index("idx_ai_usage_logs_created_at", "ai_usage_logs", ["created_at"])
    op.create_index(
        "idx_users_external_provider", "users", ["external_provider", "external_id"]
    )


def downgrade():
    # Drop indexes
    op.drop_index("idx_users_external_provider")
    op.drop_index("idx_ai_usage_logs_created_at")
    op.drop_index("idx_ai_usage_logs_organization_id")
    op.drop_index("idx_ai_usage_logs_user_id")
    op.drop_index("idx_projects_organization_id")
    op.drop_index("idx_user_organizations_organization_id")
    op.drop_index("idx_user_organizations_user_id")
    op.drop_index("idx_organizations_plan_type")

    # Drop columns from users table
    op.drop_column("users", "external_id")
    op.drop_column("users", "external_provider")

    # Drop tables
    op.drop_table("ai_usage_logs")
    op.drop_table("subscriptions")
    op.drop_table("projects")
    op.drop_table("user_organizations")
    op.drop_table("roles")
    op.drop_table("organizations")
