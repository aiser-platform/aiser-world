"""add_ai_metadata_to_messages

Revision ID: add_ai_metadata_001
Revises: 
Create Date: 2025-01-04 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_ai_metadata_001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add ai_metadata and metadata columns to message table
    op.add_column('message', sa.Column('ai_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('message', sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    
    print("✅ Added ai_metadata and metadata columns to message table")


def downgrade() -> None:
    # Remove ai_metadata and metadata columns from message table
    op.drop_column('message', 'metadata')
    op.drop_column('message', 'ai_metadata')
    
    print("✅ Removed ai_metadata and metadata columns from message table")


