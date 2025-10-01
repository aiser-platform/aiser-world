"""Create refresh_tokens table if it does not exist.

This is a pragmatic startup helper to ensure the table exists when migrations
cannot be applied cleanly in some dev/CI environments. It is idempotent.
"""
from sqlalchemy import create_engine, text
from app.core.config import settings
import sys


DDL = """
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    token VARCHAR(1024) NOT NULL UNIQUE,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    deleted_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);
"""


def run_create() -> int:
    url = settings.SYNC_DATABASE_URI
    engine = create_engine(url)
    with engine.begin() as conn:
        try:
            conn.execute(text(DDL))
            print("refresh_tokens table ensured")
            return 0
        except Exception as e:
            print("failed to ensure refresh_tokens table:", e, file=sys.stderr)
            return 2


if __name__ == '__main__':
    sys.exit(run_create())


