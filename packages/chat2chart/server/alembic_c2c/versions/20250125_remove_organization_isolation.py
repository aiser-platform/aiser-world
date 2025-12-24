"""Remove organization isolation

Revision ID: 20250125_remove_org_isolation
Revises: 20250122_conversation_nullable
Create Date: 2025-01-25
"""
from alembic import op
import sqlalchemy as sa

revision = '20250125_remove_org_isolation'
down_revision = '20250122_conversation_nullable'
branch_labels = None
depends_on = None

def upgrade():
    """Remove organization and tenant isolation tables and columns"""
    # Drop foreign-key style org user mapping
    op.execute("DROP TABLE IF EXISTS user_organizations CASCADE;")
    
    # Drop organizations table
    op.execute("DROP TABLE IF EXISTS organizations CASCADE;")
    
    # Drop organization / tenant columns from core tables
    op.execute("ALTER TABLE IF EXISTS conversation DROP COLUMN IF EXISTS tenant_id;")
    op.execute("ALTER TABLE IF EXISTS charts DROP COLUMN IF EXISTS tenant_id;")
    op.execute("ALTER TABLE IF EXISTS data_sources DROP COLUMN IF EXISTS tenant_id;")
    op.execute("ALTER TABLE IF EXISTS data_queries DROP COLUMN IF EXISTS tenant_id;")
    
    # Drop tenant_id indexes if they exist
    op.execute("DROP INDEX IF EXISTS idx_conversation_tenant_id;")
    op.execute("DROP INDEX IF EXISTS idx_charts_tenant_id;")

def downgrade():
    """Rollback: Re-add organization isolation (for reference only - not recommended)"""
    # Note: This downgrade is provided for reference but not recommended
    # Re-adding organization isolation would require recreating all the tables
    # and data structures that were removed
    pass



