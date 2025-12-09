#!/bin/bash
# Create default admin user for Aiser Platform
# Usage: ./scripts/create_default_admin.sh

set -e

echo "═══════════════════════════════════════════════════════════"
echo "  Aiser Platform - Create Default Admin User"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Default credentials (change in production!)
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@aiser.local}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123}"

echo "Creating admin user..."
echo "  Email: $ADMIN_EMAIL"
echo "  Username: $ADMIN_USERNAME"
echo "  Password: $ADMIN_PASSWORD (change this in production!)"
echo ""

# Generate password hash using pbkdf2_sha256
PASSWORD_HASH=$(docker exec aiser-chat2chart-dev bash -c "cd /app && /root/.cache/pypoetry/virtualenvs/aiser-world-chat2chart-9TtSrW0h-py3.11/bin/python -c \"from passlib.hash import pbkdf2_sha256; print(pbkdf2_sha256.hash('$ADMIN_PASSWORD'))\"")

echo "Password hash generated: $PASSWORD_HASH"
echo ""

# Set UUID default for id column
docker exec aiser-postgres-dev psql -U aiser -d aiser_world -c "ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();" > /dev/null 2>&1

# Create admin user
docker exec aiser-postgres-dev psql -U aiser -d aiser_world <<SQL
INSERT INTO users (username, email, password, is_active, is_verified, created_at, updated_at)
VALUES (
    '$ADMIN_USERNAME',
    '$ADMIN_EMAIL',
    '$PASSWORD_HASH',
    true,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    is_verified = true,
    is_active = true,
    updated_at = NOW()
RETURNING id, username, email, is_verified, is_active;
SQL

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Admin user created/updated successfully!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "You can now login with:"
echo "  Email: $ADMIN_EMAIL"
echo "  Password: $ADMIN_PASSWORD"
echo ""
echo "Test login:"
echo "  curl -X POST http://localhost:5000/users/sign-in \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    -d '{\"identifier\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASSWORD\"}'"
echo ""

