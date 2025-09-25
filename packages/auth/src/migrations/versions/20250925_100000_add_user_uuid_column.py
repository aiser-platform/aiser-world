"""add new uuid column for users to prepare pk migration

Revision ID: 20250925_100000_add_user_uuid_column
Revises: 20250925_090000_add_user_missing_columns
Create Date: 2025-09-25 10:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = '20250925_100000_add_user_uuid_column'
down_revision = '20250925_090000_add_user_missing_columns'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    # Ensure pgcrypto available for gen_random_uuid()
    try:
        conn.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
    except Exception:
        # extension may require superuser; fall back to uuid_generate_v4 if available
        try:
            conn.execute("CREATE EXTENSION IF NOT EXISTS ""uuid-ossp""")
        except Exception:
            pass

    insp = sa.inspect(conn)
    cols = [c['name'] for c in insp.get_columns('users')]
    if 'id_new' not in cols:
        # Add nullable UUID column
        op.add_column('users', sa.Column('id_new', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True))
        # Populate with generated UUIDs
    try:
        conn.execute(sa.text("UPDATE users SET id_new = gen_random_uuid() WHERE id_new IS NULL;"))
    except Exception:
        # fallback to uuid_generate_v4
        conn.execute(sa.text("UPDATE users SET id_new = uuid_generate_v4() WHERE id_new IS NULL;"))

    # add index for new id column
    if 'users_id_new_idx' not in [i['name'] for i in insp.get_indexes('users')]:
        op.create_index('users_id_new_idx', 'users', ['id_new'], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    cols = [c['name'] for c in insp.get_columns('users')]
    if 'id_new' in cols:
        op.drop_index('users_id_new_idx', table_name='users')
        op.drop_column('users', 'id_new')

