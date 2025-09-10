#!/usr/bin/env python3
"""
Fix plaintext passwords in `users` table by hashing them with the app's Auth helper.

Run inside the backend container (project root):
  python packages/chat2chart/server/scripts/fix_plain_passwords.py

This will locate users whose `password` column does not start with the
passlib pbkdf2 marker and replace it with a secure hash.
"""
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
try:
    from app.modules.authentication.auth import Auth
except Exception as e:
    print("Failed to import Auth from app.modules.authentication.auth:", e)
    raise


def get_env(name, default=None):
    return os.environ.get(name) or default


def main():
    db_name = get_env("POSTGRES_DB", "aiser_world")
    db_user = get_env("POSTGRES_USER", "aiser")
    db_pass = get_env("POSTGRES_PASSWORD", "aiser_password")
    db_host = get_env("POSTGRES_SERVER", "postgres")
    db_port = int(get_env("POSTGRES_PORT", 5432))

    conn = psycopg2.connect(dbname=db_name, user=db_user, password=db_pass, host=db_host, port=db_port)
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Find users with passwords that are not pbkdf2 hashes
    cur.execute("SELECT id, username, password FROM users WHERE password IS NULL OR password NOT LIKE %s", ("$pbkdf2-%",))
    rows = cur.fetchall()
    if not rows:
        print("No plaintext passwords found. Nothing to do.")
        cur.close()
        conn.close()
        return

    auth = Auth()
    updated = 0
    for r in rows:
        uid = r["id"]
        uname = r.get("username") or str(uid)
        pw = r.get("password") or "temp_password_change_me"
        try:
            new_hash = auth.hash_password(pw)
            cur.execute("UPDATE users SET password=%s WHERE id=%s", (new_hash, uid))
            updated += 1
            print(f"Updated user {uname} (id={uid}) -> hashed password")
        except Exception as e:
            print(f"Failed to hash/update user {uname} (id={uid}):", e)

    conn.commit()
    cur.close()
    conn.close()
    print(f"Completed. Total users updated: {updated}")


if __name__ == "__main__":
    main()


