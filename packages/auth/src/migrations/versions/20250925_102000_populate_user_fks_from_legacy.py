"""populate user FK tables from legacy_id mapping

Revision ID: 20250925_102000_populate_user_fks_from_legacy
Revises: 20250925_101500_populate_user_fks_id_new
Create Date: 2025-09-25 10:20:00
"""
from alembic import op
import sqlalchemy as sa

revision = '20250925_102000_populate_user_fks_from_legacy'
down_revision = '20250925_101500_populate_user_fks_id_new'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)

    # Create temporary mapping table legacy_user_map(legacy_id bigint, id_new uuid)
    conn.execute(sa.text("CREATE TEMP TABLE IF NOT EXISTS legacy_user_map AS SELECT legacy_id::bigint AS legacy_id, id_new FROM users WHERE legacy_id IS NOT NULL;"))

    targets = [
        'device_sessions',
        'user_organizations',
        'user_projects',
        'ai_usage_logs',
        'billing_transactions',
    ]

    for table in targets:
        if table in insp.get_table_names():
            cols = [c['name'] for c in insp.get_columns(table)]
            if 'user_id_new' in cols:
                # If table.user_id is integer (legacy), update from mapping
                try:
                    conn.execute(sa.text(f"UPDATE {table} t SET user_id_new = m.id_new FROM legacy_user_map m WHERE t.user_id = m.legacy_id AND t.user_id_new IS NULL;"))
                except Exception:
                    # best-effort: cast text to bigint
                    try:
                        conn.execute(sa.text(f"UPDATE {table} t SET user_id_new = m.id_new FROM legacy_user_map m WHERE t.user_id::bigint = m.legacy_id AND t.user_id_new IS NULL;"))
                    except Exception:
                        pass

    # Drop temp mapping table
    try:
        conn.execute(sa.text("DROP TABLE IF EXISTS legacy_user_map;"))
    except Exception:
        pass


def downgrade() -> None:
    # no-op: data migration not reversible
    pass


