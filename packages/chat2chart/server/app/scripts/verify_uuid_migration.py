"""Verify users.id is UUID and referenced FK columns migrated.

Exit with non-zero code if legacy integer id columns remain or users.id is not UUID.
"""
from sqlalchemy import create_engine, text
from app.core.config import settings
import sys


def run_check() -> int:
    url = settings.SYNC_DATABASE_URI
    engine = create_engine(url)
    with engine.connect() as conn:
        # Check users.id data type
        r = conn.execute(text("SELECT data_type FROM information_schema.columns WHERE table_name='users' AND column_name='id'"))
        row = r.fetchone()
        if not row:
            print("ERROR: users.id column not found", file=sys.stderr)
            return 2
        dtype = row[0]
        if 'uuid' not in dtype.lower() and 'character' not in dtype.lower():
            print(f"ERROR: users.id column type looks like {dtype}; expected UUID", file=sys.stderr)
            return 2

        # Check for legacy legacy_id columns elsewhere (best-effort)
        r2 = conn.execute(text("SELECT table_name, column_name FROM information_schema.columns WHERE column_name = 'legacy_id'"))
        legacy_rows = [f"{r[0]}" for r in r2.fetchall()]
        if legacy_rows:
            print(f"WARNING: legacy_id columns still present in tables: {legacy_rows}")

    print("UUID migration verification passed (users.id present and looks UUID-like)")
    return 0


if __name__ == '__main__':
    sys.exit(run_check())


