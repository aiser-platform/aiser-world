"""Add user profile fields

Revision ID: add_user_profile_fields_20251002
Revises: migrate_users_to_uuid_001
Create Date: 2025-10-02 00:00:00.000000

Adds common profile fields required by the frontend and onboarding flow.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_user_profile_fields_20251002'
down_revision = 'migrate_users_to_uuid_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add optional profile columns to users table
    # Ensure verification-related columns exist for auth compatibility
    try:
        op.add_column('users', sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    except Exception:
        pass
    try:
        op.add_column('users', sa.Column('verification_attempts', sa.Integer(), nullable=True, server_default='0'))
    except Exception:
        pass
    try:
        op.add_column('users', sa.Column('verification_sent_at', sa.DateTime(timezone=True), nullable=True))
    except Exception:
        pass
    op.add_column('users', sa.Column('first_name', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('last_name', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('phone', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('bio', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('avatar', sa.String(length=512), nullable=True))
    op.add_column('users', sa.Column('website', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('location', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('timezone', sa.String(length=64), nullable=True))
    # JSONB for onboarding data
    try:
        op.add_column('users', sa.Column('onboarding_data', postgresql.JSONB(), nullable=True))
    except Exception:
        # Fallback to generic JSON if JSONB not available
        op.add_column('users', sa.Column('onboarding_data', sa.JSON(), nullable=True))
    op.add_column('users', sa.Column('onboarding_completed_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    # Remove profile columns
    op.drop_column('users', 'onboarding_completed_at')
    try:
        op.drop_column('users', 'onboarding_data')
    except Exception:
        pass
    op.drop_column('users', 'timezone')
    op.drop_column('users', 'location')
    op.drop_column('users', 'website')
    op.drop_column('users', 'avatar')
    op.drop_column('users', 'bio')
    op.drop_column('users', 'phone')
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'first_name')


