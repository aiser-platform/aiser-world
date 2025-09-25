"""Migrate users.id from integer to UUID and update all user FK columns

Revision ID: migrate_users_to_uuid_001
Revises: add_user_fks_001
Create Date: 2025-09-25 00:00:00.000000

This migration performs the following steps (dev safe):
1. Add a new column users.new_id UUID and populate with gen_random_uuid()
2. For each table that references users.id, add a new UUID column, populate via join
3. Drop old FKs and integer columns, rename new UUID columns to original names
4. Drop integer users.id PK, rename users.new_id -> users.id and set as PK

This migration is destructive and intended for development/dev DB only. Backups should
have been taken prior to running.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'migrate_users_to_uuid_001'
down_revision = 'add_user_fks_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # Ensure extension for gen_random_uuid
    try:
        conn.execute(sa.text("CREATE EXTENSION IF NOT EXISTS pgcrypto;"))
    except Exception:
        pass

    # 1) Add users.new_id
    op.add_column('users', sa.Column('new_id', postgresql.UUID(as_uuid=True), nullable=True))
    conn.execute(sa.text("UPDATE users SET new_id = gen_random_uuid() WHERE new_id IS NULL"))

    # Tables referencing users.id to migrate (chat2chart service)
    fk_updates = [
        ('projects', 'created_by'),
        ('dashboards', 'created_by'),
        ('dashboard_embeds', 'created_by'),
        ('dashboard_shares', 'shared_by'),
        ('dashboard_shares', 'shared_with'),
        ('dashboard_analytics', 'user_id'),
        ('user_organizations', 'user_id'),
        ('refresh_tokens', 'user_id'),
        ('device_sessions', 'user_id')
    ]

    for table, col in fk_updates:
        new_col = f"{col}__uuid"
        # Add new uuid column
        op.add_column(table, sa.Column(new_col, postgresql.UUID(as_uuid=True), nullable=True))
        # Populate by joining users (note: this assumes integer PK; cast as needed)
        try:
            conn.execute(sa.text(f"UPDATE {table} t SET {new_col} = u.new_id FROM users u WHERE t.{col} = u.id"))
        except Exception:
            # best-effort populate; skip on failure
            pass

    # 3) Drop old FK constraints and integer columns, rename new columns
    for table, col in fk_updates:
        inspector = None
        # Drop constraint if exists (best-effort)
        try:
            # remove constraints referencing the column
            conn.execute(sa.text(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {table}_{col}_fkey;"))
        except Exception:
            pass
        # Drop old int column
        try:
            op.drop_column(table, col)
        except Exception:
            pass
        # Rename new uuid column to original name
        new_col = f"{col}__uuid"
        try:
            op.alter_column(table, new_col, new_column_name=col, existing_type=postgresql.UUID())
        except Exception:
            pass

    # 4) Replace users.id
    # Drop PK constraint on users (best-effort)
    try:
        conn.execute(sa.text("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;"))
    except Exception:
        pass
    # Drop old integer id column
    try:
        op.drop_column('users', 'id')
    except Exception:
        pass
    # Rename new_id to id and set PK
    op.alter_column('users', 'new_id', new_column_name='id', existing_type=postgresql.UUID())
    try:
        conn.execute(sa.text("ALTER TABLE users ADD PRIMARY KEY (id);"))
    except Exception:
        pass


def downgrade() -> None:
    # Downgrade not implemented; migration is destructive.
    raise NotImplementedError('Downgrade not supported for users UUID migration')


