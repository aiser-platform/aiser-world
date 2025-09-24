#!/usr/bin/env python3
"""
Idempotent DB seed script to create a default admin user.

Run in the project root: python3 scripts/seed_admin.py
This script uses the project's sync DB URL to insert an admin user if not present.
"""
import os
import argparse
import hashlib
import psycopg2
from psycopg2.extras import RealDictCursor


def hash_password_simple(password: str) -> str:
    """Simple PBKDF2-SHA256 hash compatible with passlib output for dev seeding.

    NOTE: For production use the application's Auth.hash_password. This
    implementation is intentionally minimal so the script has no project
    import dependencies.
    """
    import hashlib, binascii, os
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return binascii.hexlify(salt).decode() + '$' + binascii.hexlify(dk).decode()


def seed_admin_direct(dsn: str, username: str, email: str, password: str):
    conn = psycopg2.connect(dsn)
    try:
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT id FROM users WHERE username = %s OR email = %s", (username, email))
                r = cur.fetchone()
                if r:
                    print(f"User {username} already exists (id={r['id']})")
                    return
                hashed = hash_password_simple(password)
                cur.execute("INSERT INTO users (username, email, password, is_active) VALUES (%s, %s, %s, true) RETURNING id", (username, email, hashed))
                new = cur.fetchone()
                print(f"Created admin user {username} with id={new['id']}")
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dsn', help='Postgres DSN (e.g. postgresql://user:pass@host:5432/dbname)')
    parser.add_argument('--username', default='admin1')
    parser.add_argument('--email', default='admin1@aiser.world')
    parser.add_argument('--password', default='Admin@123')
    args = parser.parse_args()

    dsn = args.dsn or os.environ.get('SYNC_DATABASE_URI') or os.environ.get('DATABASE_URL')
    if not dsn:
        print('ERROR: Provide --dsn or set SYNC_DATABASE_URI/DATABASE_URL in env')
        return

    seed_admin_direct(dsn, args.username, args.email, args.password)


if __name__ == '__main__':
    main()


