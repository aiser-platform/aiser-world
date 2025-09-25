"""populate user FK tables with id_new

Revision ID: 20250925_101500_populate_user_fks_id_new
Revises: 20250925_100000_add_user_uuid_column
Create Date: 2025-09-25 10:15:00
"""
from alembic import op
import sqlalchemy as sa

revision = '20250925_101500_populate_user_fks_id_new'
down_revision = '20250925_100000_add_user_uuid_column'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    # Tables to add user_id_new to and populate
    targets = [
        ('device_sessions', 'user_id'),
        ('user_organizations', 'user_id'),
        ('user_projects', 'user_id'),
        ('ai_usage_logs', 'user_id'),
        ('billing_transactions', 'user_id'),
    ]

    for table, col in targets:
        if table in insp.get_table_names():
            cols = [c['name'] for c in insp.get_columns(table)]
            new_col = f"{col}_new"
            if new_col not in cols:
                op.add_column(table, sa.Column(new_col, sa.dialects.postgresql.UUID(as_uuid=True), nullable=True))
                # populate new fk by joining users
                stmt = sa.text(f"UPDATE {table} t SET {new_col} = u.id_new FROM users u WHERE (t.{col}::text = u.id::text);")
                try:
                    conn.execute(stmt)
                except Exception:
                    # fallback simple update for integer user ids
                    conn.execute(sa.text(f"UPDATE {table} t SET {new_col} = u.id_new FROM users u WHERE t.{col} = u.legacy_id;"))

    # create indexes on new fk columns
    for table, col in targets:
        new_col = f"{col}_new"
        try:
            op.create_index(f"ix_{table}_{new_col}", table, [new_col])
        except Exception:
            pass


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    targets = [
        ('device_sessions', 'user_id'),
        ('user_organizations', 'user_id'),
        ('user_projects', 'user_id'),
        ('ai_usage_logs', 'user_id'),
        ('billing_transactions', 'user_id'),
    ]
    for table, col in targets:
        if table in insp.get_table_names():
            cols = [c['name'] for c in insp.get_columns(table)]
            new_col = f"{col}_new"
            if new_col in cols:
                try:
                    op.drop_index(f"ix_{table}_{new_col}", table_name=table)
                except Exception:
                    pass
                op.drop_column(table, new_col)

