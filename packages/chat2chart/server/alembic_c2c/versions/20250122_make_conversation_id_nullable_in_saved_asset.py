"""Make conversation_id nullable in saved_asset table

Revision ID: 20250122_conversation_nullable
Revises: 20250114_create_saved_assets_table
Create Date: 2025-01-22

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250122_conversation_nullable'
down_revision = '20250114_create_saved_assets_table'
branch_labels = None
depends_on = None


def upgrade():
    """Make conversation_id nullable to support query-editor charts"""
    # Drop the NOT NULL constraint on conversation_id
    op.alter_column('saved_asset', 'conversation_id',
                    existing_type=postgresql.UUID(as_uuid=True),
                    nullable=True,
                    existing_nullable=False)
    
    # Drop and recreate foreign key to allow NULL with SET NULL on delete
    try:
        op.drop_constraint('saved_asset_conversation_id_fkey', 'saved_asset', type_='foreignkey')
    except Exception:
        pass  # Constraint might not exist or have different name
    
    op.create_foreign_key(
        'saved_asset_conversation_id_fkey',
        'saved_asset', 'conversation',
        ['conversation_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade():
    """Revert conversation_id back to NOT NULL"""
    # Set any NULL values to a placeholder UUID
    op.execute("""
        UPDATE saved_asset 
        SET conversation_id = '00000000-0000-0000-0000-000000000000'::uuid 
        WHERE conversation_id IS NULL
    """)
    
    # Drop and recreate foreign key with CASCADE
    op.drop_constraint('saved_asset_conversation_id_fkey', 'saved_asset', type_='foreignkey')
    op.create_foreign_key(
        'saved_asset_conversation_id_fkey',
        'saved_asset', 'conversation',
        ['conversation_id'], ['id'],
        ondelete='CASCADE'
    )
    
    # Re-add the NOT NULL constraint
    op.alter_column('saved_asset', 'conversation_id',
                    existing_type=postgresql.UUID(as_uuid=True),
                    nullable=False,
                    existing_nullable=True)
