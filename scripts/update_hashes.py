#!/usr/bin/env python3
"""Utility to generate pbkdf2 hashes and update users table for dev.

Run inside compose network: docker run --rm --network aiser-dev-network -v $(pwd)/scripts/update_hashes.py:/tmp/update_hashes.py python:3.11-slim bash -lc "pip install -q passlib psycopg2-binary && python /tmp/update_hashes.py"
"""
import os
from passlib.hash import pbkdf2_sha256
import psycopg2

DB_HOST = os.getenv('POSTGRES_SERVER', 'postgres')
DB_NAME = os.getenv('POSTGRES_DB', 'aiser_world')
DB_USER = os.getenv('POSTGRES_USER', 'aiser')
DB_PASS = os.getenv('POSTGRES_PASSWORD', 'aiser_password')

def main():
    h_admin = pbkdf2_sha256.hash('Admin@123')
    h_cli = pbkdf2_sha256.hash('Test@1234')
    print('Generated hashes')
    conn = psycopg2.connect(host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASS)
    cur = conn.cursor()
    cur.execute("UPDATE users SET password=%s WHERE username=%s", (h_admin, 'admin1'))
    cur.execute("UPDATE users SET password=%s WHERE username=%s", (h_cli, 'cli_test'))
    conn.commit()
    cur.execute("SELECT username, password FROM users WHERE username IN ('admin1','cli_test')")
    rows = cur.fetchall()
    print(rows)
    cur.close()
    conn.close()

if __name__ == '__main__':
    main()


