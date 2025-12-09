"""Make conversation_id nullable in saved_asset table

Revision ID: 20250122_conversation_nullable
Revises: 20250114_create_saved_assets
Create Date: 2025-01-22

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250122_conversation_nullable'
down_revision = '20250114_create_saved_assets_table'  # Match the actual revision ID
branch_labels = None
depends_on = None


def upgrade():
    """Make conversation_id nullable to support query-editor charts"""
    # Drop the NOT NULL constraint on conversation_id
    op.alter_column('saved_asset', 'conversation_id',
                    existing_type=postgresql.UUID(as_uuid=True),
                    nullable=True,
                    existing_nullable=False)


def downgrade():
    """Revert conversation_id back to NOT NULL"""
    # First, set any NULL values to a default conversation (you may need to adjust this)
    # For safety, we'll use a placeholder UUID - in production, you'd want to handle this more carefully
    op.execute("""
        UPDATE saved_asset 
        SET conversation_id = '00000000-0000-0000-0000-000000000000'::uuid 
        WHERE conversation_id IS NULL
    """)
    
    # Re-add the NOT NULL constraint
    op.alter_column('saved_asset', 'conversation_id',
                    existing_type=postgresql.UUID(as_uuid=True),
                    nullable=False,
                    existing_nullable=True)

