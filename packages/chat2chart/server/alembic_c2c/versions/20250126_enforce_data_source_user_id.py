"""Enforce data source user_id NOT NULL

Revision ID: 20250126_enforce_ds_user_id
Revises: 20250125_remove_org_isolation
Create Date: 2025-01-26
"""
from alembic import op
import sqlalchemy as sa

revision = '20250126_enforce_ds_user_id'
down_revision = '20250125_remove_org_isolation'
branch_labels = None
depends_on = None

def upgrade():
    """Enforce user_id NOT NULL and add index for data sources and queries"""
    # First, clean up any orphaned data sources (optional - uncomment if you want to delete them)
    # op.execute("DELETE FROM data_sources WHERE user_id IS NULL;")
    # op.execute("DELETE FROM data_queries WHERE user_id IS NULL;")
    
    # Add index first (before making NOT NULL, in case there are NULLs)
    op.execute("CREATE INDEX IF NOT EXISTS ix_data_sources_user_id ON data_sources(user_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_data_queries_user_id ON data_queries(user_id);")
    
    # Make user_id NOT NULL for data_sources
    # Note: This will fail if there are NULL values. Clean them up first if needed.
    op.execute("""
        ALTER TABLE data_sources 
        ALTER COLUMN user_id SET NOT NULL;
    """)
    
    # Make user_id NOT NULL for data_queries
    op.execute("""
        ALTER TABLE data_queries 
        ALTER COLUMN user_id SET NOT NULL;
    """)

def downgrade():
    """Rollback: Make user_id nullable again (not recommended)"""
    op.execute("ALTER TABLE data_sources ALTER COLUMN user_id DROP NOT NULL;")
    op.execute("ALTER TABLE data_queries ALTER COLUMN user_id DROP NOT NULL;")
    op.execute("DROP INDEX IF EXISTS ix_data_sources_user_id;")
    op.execute("DROP INDEX IF EXISTS ix_data_queries_user_id;")

