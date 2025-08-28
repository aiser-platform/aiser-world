#!/bin/bash
set -e

echo "🔄 Aiser Database Reinitialization Script"
echo "=========================================="
echo ""
echo "⚠️  WARNING: This will DELETE ALL existing data in the database!"
echo "   Only use this in development environments."
echo ""

read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Operation cancelled."
    exit 1
fi

echo ""
echo "🛑 Stopping PostgreSQL container..."
docker-compose -f docker-compose.dev.yml stop postgres

echo "🗑️  Removing PostgreSQL container..."
docker-compose -f docker-compose.dev.yml rm -f postgres

echo "🗑️  Removing PostgreSQL volume (this deletes all data)..."
docker volume rm aiser-world_postgres_dev_data 2>/dev/null || echo "Volume already removed or doesn't exist"

echo "🚀 Starting PostgreSQL container with new initialization..."
docker-compose -f docker-compose.dev.yml up -d postgres

echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec aiser-postgres-dev pg_isready -U aiser -d aiser_world >/dev/null 2>&1; do
    echo "   Waiting for database to be ready..."
    sleep 2
done

echo "✅ Database is ready!"

echo ""
echo "🔍 Verifying default users were created..."
docker exec aiser-postgres-dev psql -U aiser -d aiser_world -c "
SELECT 
    id,
    email,
    username,
    first_name,
    last_name,
    role,
    status,
    created_at
FROM users 
ORDER BY created_at DESC;
"

echo ""
echo "🎉 Database reinitialization complete!"
echo ""
echo "📋 Default users created:"
echo "   admin@aiser.app / admin123 (admin)"
echo "   user@aiser.app / user123 (user)"
echo "   analyst@aiser.app / analyst123 (analyst)"
echo ""
echo "⚠️  Remember to change these passwords in production!"
echo ""
echo "🚀 You can now start other services:"
echo "   docker-compose -f docker-compose.dev.yml up -d"
