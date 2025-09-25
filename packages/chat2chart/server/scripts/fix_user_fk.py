#!/usr/bin/env python3
"""Fix remaining user FK columns by mapping legacy integer IDs to UUIDs.

This script connects to two DBs (aiser_world and aiser_chat2chart) and builds a
mapping from legacy integer user IDs to the corresponding UUID in the chat DB
based on username/email. Then it updates listed FK columns one table at a time
to use UUID values, swapping columns in-place.

Run inside container: python3 packages/chat2chart/server/scripts/fix_user_fk.py
"""
from sqlalchemy import create_engine, text
import os
import sys

WORLD_URL = os.getenv("WORLD_DB_URL", "postgresql+psycopg2://aiser:aiser_password@postgres:5432/aiser_world")
CHAT_URL = os.getenv("CHAT_DB_URL", "postgresql+psycopg2://aiser:aiser_password@postgres:5432/aiser_chat2chart")


def build_mapping(world_engine, chat_engine):
    mapping = {}
    with world_engine.connect() as w, chat_engine.connect() as c:
        rows = w.execute(text("SELECT id, username, email FROM users")).fetchall()
        for lid, username, email in rows:
            # find matching user in chat DB by username or email
            r = c.execute(text("SELECT id FROM users WHERE username = :u OR email = :e LIMIT 1"), {"u": username, "e": email}).fetchone()
            if r:
                mapping[int(lid)] = str(r[0])
    return mapping


def migrate_table(chat_engine, mapping, table, col):
    print(f"Migrating {table}.{col}")
    with chat_engine.begin() as conn:
        try:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col}__uuid uuid"))
        except Exception as e:
            print('add column failed:', e)
        # populate new column
        for lid, uuidstr in mapping.items():
            try:
                conn.execute(text(f"UPDATE {table} SET {col}__uuid = :u WHERE {col} = :lid"), {"u": uuidstr, "lid": lid})
            except Exception:
                # ignore row-level failures
                pass
        # swap columns
        try:
            conn.execute(text(f"ALTER TABLE {table} DROP COLUMN IF EXISTS {col} CASCADE"))
            conn.execute(text(f"ALTER TABLE {table} RENAME COLUMN {col}__uuid TO {col}"))
            print(f"Swapped column for {table}.{col}")
        except Exception as e:
            print('swap failed for', table, col, e)


def main():
    world_engine = create_engine(WORLD_URL)
    chat_engine = create_engine(CHAT_URL)

    print('Building mapping...')
    mapping = build_mapping(world_engine, chat_engine)
    print('Mapping entries:', len(mapping))

    tables = [
        ("dashboard_embeds", "created_by"),
        ("user_organizations", "user_id"),
        ("refresh_tokens", "user_id"),
        ("dashboard_shares", "shared_by"),
        ("dashboard_shares", "shared_with"),
        ("dashboard_analytics", "user_id"),
        ("device_sessions", "user_id"),
    ]

    for table, col in tables:
        migrate_table(chat_engine, mapping, table, col)

    print('Done')


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print('Fatal error:', e)
        sys.exit(1)


