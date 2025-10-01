"""Ensure device_sessions refresh columns and indices exist.

Idempotent helper for dev/CI to apply DDL when migrations can't run.
"""
from app.core.config import settings
from sqlalchemy import create_engine, text
import sys


def run() -> int:
    url = settings.SYNC_DATABASE_URI
    engine = create_engine(url)
    stmts = [
        "ALTER TABLE device_sessions ADD COLUMN IF NOT EXISTS refresh_token VARCHAR(2048) DEFAULT '' NOT NULL;",
        "ALTER TABLE device_sessions ADD COLUMN IF NOT EXISTS refresh_token_revoked BOOLEAN DEFAULT FALSE NOT NULL;",
        "ALTER TABLE device_sessions ADD COLUMN IF NOT EXISTS refresh_token_expires_at TIMESTAMP NULL;",
        "CREATE INDEX IF NOT EXISTS ix_device_sessions_refresh_expires_at ON device_sessions (refresh_token_expires_at);",
        "CREATE INDEX IF NOT EXISTS ix_device_sessions_refresh_revoked ON device_sessions (refresh_token_revoked);",
    ]
    try:
        with engine.begin() as conn:
            for s in stmts:
                conn.execute(text(s))
        print("device_sessions refresh fields ensured")
        return 0
    except Exception as e:
        print("failed to ensure device_sessions refresh fields:", e, file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(run())


