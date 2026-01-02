"""Add json_metadata to conversation table

Revision ID: 20251217_add_json_metadata
Revises: 20250114_add_conversation_indexes
Create Date: 2025-12-17
"""
from alembic import op
import sqlalchemy as sa

revision = '20251217_add_json_metadata'
down_revision = '20250114_add_conversation_indexes'
branch_labels = None
depends_on = None

def upgrade():
    # Add json_metadata column if it doesn't exist
    # Using IF NOT EXISTS equivalent for PostgreSQL
    op.execute("""
        ALTER TABLE conversation 
        ADD COLUMN IF NOT EXISTS json_metadata TEXT;
    """)

def downgrade():
    op.drop_column('conversation', 'json_metadata')