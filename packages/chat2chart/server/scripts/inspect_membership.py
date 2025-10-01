#!/usr/bin/env python3
import os
import sys
from urllib.parse import urlparse
try:
    import psycopg2
except Exception as e:
    print('psycopg2 not available:', e)
    sys.exit(1)

db_url = os.environ.get('DATABASE_URL')
if not db_url:
    print('DATABASE_URL not set in env')
    sys.exit(1)

p = urlparse(db_url)
conn = psycopg2.connect(dbname=p.path.lstrip('/'), user=p.username, password=p.password, host=p.hostname, port=p.port)
cur = conn.cursor()

def q(sql, params=None):
    try:
        cur.execute(sql, params or ())
        return cur.fetchall()
    except Exception as e:
        print('SQL failed:', sql, e)
        return []

print('\n-- last 10 users --')
for r in q("SELECT id, legacy_id, email, username, created_at FROM users ORDER BY created_at DESC LIMIT 10"):
    print(r)

print('\n-- last 20 organizations --')
for r in q("SELECT id, name, slug, created_at FROM organizations ORDER BY created_at DESC LIMIT 20"):
    print(r)

print('\n-- last 20 projects --')
for r in q("SELECT id, name, organization_id, created_by, created_at FROM projects ORDER BY created_at DESC LIMIT 20"):
    print(r)

print('\n-- last 50 user_organizations --')
for r in q("SELECT id, organization_id, user_id, role, is_active FROM user_organizations ORDER BY id DESC LIMIT 50"):
    print(r)

print('\n-- last 50 project_users --')
for r in q("SELECT id, project_id, user_id, role, is_active FROM project_users ORDER BY id DESC LIMIT 50"):
    print(r)

cur.close()
conn.close()
print('\n-- done --')
