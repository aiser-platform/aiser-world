"""Lightweight schema sanity checks for startup.

Exit with non-zero code when required tables are missing. Intended to run from
container start to fail fast when migrations weren't applied correctly.
"""
from typing import List
import sys
from app.core.config import settings
from sqlalchemy import create_engine, text


REQUIRED_TABLES = [
    'users',
    'dashboards',
    'dashboard_widgets',
    'user_organizations',
    'refresh_tokens',
]


def run_checks() -> int:
    url = settings.SYNC_DATABASE_URI
    engine = create_engine(url)
    missing: List[str] = []
    with engine.connect() as conn:
        for t in REQUIRED_TABLES:
            r = conn.execute(text("SELECT to_regclass(:t)"), {"t": t})
            row = r.fetchone()
            if not row or row[0] is None:
                missing.append(t)

    if missing:
        print(f"ERROR: Missing required tables: {missing}", file=sys.stderr)
        return 2
    print("Schema check passed: all required tables present")
    return 0


if __name__ == '__main__':
    sys.exit(run_checks())


