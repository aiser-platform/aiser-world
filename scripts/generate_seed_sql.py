#!/usr/bin/env python3
"""
Generate seed SQL with password hashes and organizations
Run: docker-compose exec chat2chart-server python3 /path/to/generate_seed_sql.py > seed_users_final.sql
Or: python3 generate_seed_sql.py (if passlib is installed locally)
"""

import sys
import os

# Try to import from the auth service
try:
    # Add auth service path
    auth_path = os.path.join(os.path.dirname(__file__), '..', 'packages', 'auth', 'src')
    if os.path.exists(auth_path):
        sys.path.insert(0, auth_path)
    from app.modules.authentication.auth import Auth
    auth = Auth()
    DEFAULT_PASSWORD = "FirstUsers@123"
    password_hash = auth.hash_password(DEFAULT_PASSWORD)
except ImportError:
    # Fallback: try passlib directly
    try:
        from passlib.hash import pbkdf2_sha256
        DEFAULT_PASSWORD = "FirstUsers@123"
        password_hash = pbkdf2_sha256.hash(DEFAULT_PASSWORD)
    except ImportError:
        print("ERROR: Could not import Auth or passlib. Please run this script inside the auth-service container:")
        print("  docker-compose exec auth-service python3 /app/scripts/generate_seed_sql.py")
        sys.exit(1)

print("-- Aiser Platform Seed Data with Passwords and Organizations")
print("-- Generated password hash for: FirstUsers@123")
print(f"-- Hash: {password_hash}")
print()
print("-- Update existing users with default password")
print(f"UPDATE users")
print(f"SET password = '{password_hash}'")
print(f"WHERE email IN ('admin@aiser.app', 'user@aiser.app', 'analyst@aiser.app')")
print(f"AND (password IS NULL OR password = '');")
print()
print("-- Create organizations with different plan types")
print("INSERT INTO organizations (name, slug, description, plan_type, ai_credits_limit, max_users, max_projects, max_storage_gb, is_active, is_deleted, created_at, updated_at)")
print("VALUES")
print("    ('Free Plan Organization', 'free-org', 'Free tier organization for testing', 'free', 30, 1, 1, 5, true, false, NOW(), NOW()),")
print("    ('Pro Plan Organization', 'pro-org', 'Pro tier organization for testing', 'pro', 300, 3, -1, 90, true, false, NOW(), NOW()),")
print("    ('Team Plan Organization', 'team-org', 'Team tier organization for testing', 'team', 1000, 10, -1, 200, true, false, NOW(), NOW()),")
print("    ('Enterprise Plan Organization', 'enterprise-org', 'Enterprise tier organization for testing', 'enterprise', 5000, 100, -1, 1000, true, false, NOW(), NOW())")
print("ON CONFLICT (slug) DO NOTHING;")
print()
print("-- Success message")
print("SELECT 'Seed users and organizations created successfully!' as status;")





