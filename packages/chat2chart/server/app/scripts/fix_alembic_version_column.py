"""Ensure alembic_version.version_num column is wide enough for long revision ids.

Run this before applying migrations when multiple long-headed revisions or merge
filenames produce version ids longer than default 32 char column.
"""
from sqlalchemy import create_engine, text
from app.core.config import settings
import sys


def run_fix() -> int:
    url = settings.SYNC_DATABASE_URI
    engine = create_engine(url)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(255);"))
            print("alembic_version.version_num altered to VARCHAR(255)")
            return 0
        except Exception as e:
            print(f"Failed to alter alembic_version: {e}")
            return 2


if __name__ == '__main__':
    sys.exit(run_fix())


