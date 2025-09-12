#!/usr/bin/env python3
"""Validate schema FK alignment for user-related tables.

Checks that columns referencing `users.id` have the same data type as `users.id`
and that FK constraints exist. Exits with non-zero status when mismatches found.
"""
import os
import sys
import psycopg2


def get_conn():
    url = os.environ.get("DATABASE_URL") or os.environ.get("DATABASE_URI")
    if not url:
        # fallback to common dev container creds
        url = "postgresql://aiser:aiser_password@aiser-postgres-dev:5432/aiser_world"
    return psycopg2.connect(url)


def column_type(cur, table, column):
    cur.execute(
        "SELECT data_type FROM information_schema.columns WHERE table_name=%s AND column_name=%s",
        (table, column),
    )
    r = cur.fetchone()
    return r[0] if r else None


def has_fk(cur, table, column, ref_table, ref_column):
    cur.execute(
        "SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey) JOIN pg_class rt ON c.confrelid = rt.oid WHERE t.relname=%s AND a.attname=%s AND rt.relname=%s",
        (table, column, ref_table),
    )
    return cur.fetchone() is not None


def main():
    conn = get_conn()
    cur = conn.cursor()
    issues = []

    # tables to check: (table, column)
    targets = [
        ("dashboard_embeds", "created_by"),
        ("user_organizations", "user_id"),
        ("query_snapshots", "user_id"),
    ]

    users_type = column_type(cur, "users", "id")
    if not users_type:
        print("ERROR: users.id column not found")
        sys.exit(2)

    for table, col in targets:
        t = column_type(cur, table, col)
        fk = has_fk(cur, table, col, "users", "id")
        if not t:
            issues.append(f"{table}.{col}: column missing")
            continue
        if t.lower().split()[0] != users_type.lower().split()[0]:
            issues.append(f"{table}.{col}: type mismatch ({t} != {users_type})")
        if not fk:
            issues.append(f"{table}.{col}: FK to users(id) missing")

    if issues:
        print("Schema validation FAILED:")
        for i in issues:
            print(" -", i)
        sys.exit(1)

    print("Schema validation OK: all user-referencing columns match users.id and have FKs")
    return 0


if __name__ == "__main__":
    sys.exit(main())


