#!/usr/bin/env python3
"""
Idempotent DB seed script to create a default admin user.

Run in the project root: python3 scripts/seed_admin.py
This script uses the project's sync DB URL to insert an admin user if not present.
"""
from sqlalchemy import create_engine, text
from app.core.config import settings
from app.modules.authentication.auth import Auth


def get_sync_url():
    return settings.SYNC_DATABASE_URI


def seed_admin(username: str = "admin1", email: str = "admin1@aiser.world", password: str = "Admin@123"):
    url = get_sync_url()
    engine = create_engine(url)
    auth = Auth()
    hashed = auth.hash_password(password)

    with engine.begin() as conn:
        # Ensure users table exists (migration should have been run)
        # Insert user if not exists
        res = conn.execute(text("SELECT id FROM users WHERE username = :u OR email = :e"), {"u": username, "e": email}).fetchone()
        if res:
            print(f"User {username} already exists (id={res[0]})")
            return

        insert_sql = text(
            "INSERT INTO users (username, email, password, is_active) VALUES (:u, :e, :p, true) RETURNING id"
        )
        new_id = conn.execute(insert_sql, {"u": username, "e": email, "p": hashed}).fetchone()[0]
        print(f"Created admin user {username} with id={new_id}")


if __name__ == "__main__":
    seed_admin()


