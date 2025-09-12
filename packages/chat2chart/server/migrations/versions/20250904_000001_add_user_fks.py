"""Add foreign key constraints from user-referencing columns to users.id

Revision ID: add_user_fks_001
Revises: merge_dashboard_embeds_001
Create Date: 2025-09-04 00:00:01.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_user_fks_001'
down_revision = 'merge_dashboard_embeds_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    def coltype(table_name: str, column_name: str) -> str | None:
        q = """
        SELECT data_type
        FROM information_schema.columns
        WHERE table_name = :table_name AND column_name = :column_name
        """
        row = conn.execute(sa.text(q), {"table_name": table_name, "column_name": column_name}).fetchone()
        return row[0] if row else None

    # Helper to add FK only when column types are compatible
    def try_add_fk(src_table, src_col, ref_table, ref_col, fk_name):
        src_type = coltype(src_table, src_col)
        ref_type = coltype(ref_table, ref_col)
        if not src_type or not ref_type:
            return
        # Normalize common types
        def normalize(t: str) -> str:
            return t.lower().split()[0]
        if normalize(src_type) == normalize(ref_type):
            try:
                op.create_foreign_key(fk_name, src_table, ref_table, [src_col], [ref_col])
            except Exception:
                # If it fails, skip to avoid aborting migration run
                pass

    try_add_fk('query_snapshots', 'user_id', 'users', 'id', 'fk_query_snapshots_user_id_users')
    try_add_fk('user_organizations', 'user_id', 'users', 'id', 'fk_user_organizations_user_id_users')
    try_add_fk('dashboard_embeds', 'created_by', 'users', 'id', 'fk_dashboard_embeds_created_by_users')


def downgrade() -> None:
    try:
        op.drop_constraint('fk_dashboard_embeds_created_by_users', 'dashboard_embeds', type_='foreignkey')
    except Exception:
        pass
    try:
        op.drop_constraint('fk_user_organizations_user_id_users', 'user_organizations', type_='foreignkey')
    except Exception:
        pass
    try:
        op.drop_constraint('fk_query_snapshots_user_id_users', 'query_snapshots', type_='foreignkey')
    except Exception:
        pass


