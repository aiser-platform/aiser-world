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
import time
try:
    from jose import jwt as jose_jwt
except Exception:
    jose_jwt = None


def hash_password_simple(password: str) -> str:
    """Simple PBKDF2-SHA256 hash compatible with passlib output for dev seeding.

    NOTE: For production use the application's Auth.hash_password. This
    implementation is intentionally minimal so the script has no project
    import dependencies.
    """
    import binascii
    import os
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
                # Use UUID primary keys for users to match new schema (store as text)
                try:
                    import uuid as _uuid
                    new_id = str(_uuid.uuid4())
                except Exception:
                    new_id = None

                if new_id:
                    cur.execute("INSERT INTO users (id, username, email, password, is_active) VALUES (%s, %s, %s, %s, true) RETURNING id", (new_id, username, email, hashed))
                else:
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
    parser.add_argument('--generate-jwt', action='store_true', help='Print signed JWT tokens for the created/found user')
    parser.add_argument('--secret', help='JWT secret (defaults to env SECRET_KEY)')
    parser.add_argument('--access-exp-min', type=int, default=60, help='Access token expiry minutes')
    parser.add_argument('--refresh-exp-min', type=int, default=7*24*60, help='Refresh token expiry minutes')
    args = parser.parse_args()

    dsn = args.dsn or os.environ.get('SYNC_DATABASE_URI') or os.environ.get('DATABASE_URL')
    if not dsn:
        print('ERROR: Provide --dsn or set SYNC_DATABASE_URI/DATABASE_URL in env')
        return

    seed_admin_direct(dsn, args.username, args.email, args.password)
    # Optionally generate tokens for the seeded user
    if args.generate_jwt:
        # Resolve secret
        secret = args.secret or os.environ.get('SECRET_KEY') or os.environ.get('JWT_SECRET') or 'dev-secret'
        # Look up the user id for the username/email
        try:
            conn = psycopg2.connect(dsn)
            with conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("SELECT id, username, email FROM users WHERE username = %s OR email = %s", (args.username, args.email))
                    r = cur.fetchone()
                    if not r:
                        print('ERROR: could not find user to generate token for')
                    else:
                        uid = r['id']
                        now = int(time.time())
                        access_exp = now + int(args.access_exp_min) * 60
                        refresh_exp = now + int(args.refresh_exp_min) * 60
                        access_payload = {'sub': str(uid), 'iat': now, 'exp': access_exp, 'scope': 'access_token', 'username': r.get('username'), 'email': r.get('email')}
                        refresh_payload = {'sub': str(uid), 'iat': now, 'exp': refresh_exp, 'scope': 'refresh_token'}
                        if jose_jwt:
                            access = jose_jwt.encode(access_payload, secret, algorithm='HS256')
                            refresh = jose_jwt.encode(refresh_payload, secret, algorithm='HS256')
                            print('\nGenerated tokens:')
                            print('ACCESS_TOKEN=', access)
                            print('REFRESH_TOKEN=', refresh)
                        else:
                            print('python-jose not available; cannot generate JWTs')
        except Exception as e:
            print('ERROR generating token:', e)
        finally:
            try:
                conn.close()
            except Exception:
                pass


if __name__ == '__main__':
    main()


