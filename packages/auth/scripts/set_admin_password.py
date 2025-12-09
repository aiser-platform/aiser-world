#!/usr/bin/env python
"""Set admin password helper (dev only).

Usage: python packages/auth/scripts/set_admin_password.py --email admin@aiser.app --password newpass
"""
import argparse
from app.modules.authentication.auth import Auth
from app.core.config import settings
import psycopg2


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()

    auth = Auth()
    hashed = auth.hash_password(args.password)

    conn = psycopg2.connect(user=settings.POSTGRES_USER, password=settings.POSTGRES_PASSWORD, host=settings.POSTGRES_SERVER, port=settings.POSTGRES_PORT, dbname=settings.POSTGRES_DB)
    cur = conn.cursor()
    cur.execute("UPDATE users SET password=%s WHERE email=%s", (hashed, args.email))
    conn.commit()
    cur.close()
    conn.close()
    print("Updated password for", args.email)


if __name__ == '__main__':
    main()


