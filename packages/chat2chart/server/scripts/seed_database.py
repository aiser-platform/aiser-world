#!/usr/bin/env python3
"""
Database Seeding Script for Aiser Platform
This script creates demo data for development and testing
"""

import asyncio
import sys
from pathlib import Path

# Add the server directory to the Python path
server_dir = Path(__file__).parent.parent
sys.path.insert(0, str(server_dir))

from sqlalchemy import create_engine, text
from app.core.config import settings
import json


async def seed_database():
    """Seed the database with demo data"""

    # Database connection string
    DATABASE_URL = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"

    print(f"🌱 Seeding database: {settings.POSTGRES_DB}")

    # Create engine
    engine = create_engine(DATABASE_URL, echo=False)

    try:
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("✅ Database connection successful")

        # Seed demo data
        print("📊 Seeding demo data...")

        with engine.connect() as conn:
            # Insert demo organization
            conn.execute(
                text("""
                INSERT INTO organizations (id, name, slug, description, plan_type, is_active, created_at, updated_at)
                VALUES (1, 'Demo Organization', 'demo-org', 'Demo organization for testing and development', 'enterprise', true, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
            """)
            )

            # Insert demo project
            conn.execute(
                text("""
                INSERT INTO projects (id, name, description, organization_id, created_by, is_active, created_at, updated_at)
                VALUES (1, 'Demo Project', 'Demo project for testing and development', 1, 1, true, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
            """)
            )

            # Insert demo data sources
            demo_sales_schema = {
                "columns": [
                    {"name": "date", "type": "date", "nullable": False},
                    {"name": "product", "type": "string", "nullable": False},
                    {"name": "sales", "type": "number", "nullable": False},
                    {"name": "region", "type": "string", "nullable": True},
                    {"name": "category", "type": "string", "nullable": True},
                ]
            }

            demo_customers_schema = {
                "columns": [
                    {"name": "customer_id", "type": "string", "nullable": False},
                    {"name": "name", "type": "string", "nullable": False},
                    {"name": "email", "type": "string", "nullable": False},
                    {"name": "age", "type": "integer", "nullable": True},
                    {"name": "city", "type": "string", "nullable": False},
                    {"name": "country", "type": "string", "nullable": False},
                    {
                        "name": "registration_date",
                        "type": "datetime",
                        "nullable": False,
                    },
                ]
            }

            conn.execute(
                text("""
                INSERT INTO data_sources (id, name, type, format, size, row_count, schema, user_id, tenant_id, is_active, created_at, updated_at)
                VALUES 
                ('demo_sales_data', 'Demo Sales Data', 'file', 'csv', 25600, 1000, :sales_schema, '1', '1', true, NOW(), NOW()),
                ('demo_customers_data', 'Demo Customer Data', 'file', 'csv', 15360, 500, :customers_schema, '1', '1', true, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
            """),
                {
                    "sales_schema": json.dumps(demo_sales_schema),
                    "customers_schema": json.dumps(demo_customers_schema),
                },
            )

            # Link data sources to project
            conn.execute(
                text("""
                INSERT INTO project_data_source (id, project_id, data_source_id, data_source_type, is_active, added_at)
                VALUES 
                (gen_random_uuid(), 1, 'demo_sales_data', 'file', true, NOW()),
                (gen_random_uuid(), 1, 'demo_customers_data', 'file', true, NOW())
                ON CONFLICT DO NOTHING
            """)
            )

            # Insert demo dashboard
            layout_config = {"grid_size": 12, "widgets": []}

            theme_config = {
                "primary_color": "#1890ff",
                "secondary_color": "#52c41a",
                "background_color": "#ffffff",
                "text_color": "#000000",
            }

            conn.execute(
                text("""
                INSERT INTO dashboards (id, name, description, project_id, created_by, layout_config, theme_config, is_active, created_at, updated_at)
                VALUES (
                    gen_random_uuid(),
                    'Demo Dashboard',
                    'Demo dashboard for testing and development',
                    1,
                    1,
                    :layout_config,
                    :theme_config,
                    true,
                    NOW(),
                    NOW()
                )
                ON CONFLICT DO NOTHING
            """),
                {
                    "layout_config": json.dumps(layout_config),
                    "theme_config": json.dumps(theme_config),
                },
            )

            conn.commit()
            print("✅ Demo data seeded successfully!")

        # Verify seeded data
        print("🔍 Verifying seeded data...")

        with engine.connect() as conn:
            # Check organizations
            result = conn.execute(text("SELECT COUNT(*) FROM organizations"))
            org_count = result.scalar()
            print(f"  📊 Organizations: {org_count}")

            # Check projects
            result = conn.execute(text("SELECT COUNT(*) FROM projects"))
            project_count = result.scalar()
            print(f"  📊 Projects: {project_count}")

            # Check data sources
            result = conn.execute(text("SELECT COUNT(*) FROM data_sources"))
            data_source_count = result.scalar()
            print(f"  📊 Data Sources: {data_source_count}")

            # Check project data source links
            result = conn.execute(text("SELECT COUNT(*) FROM project_data_source"))
            link_count = result.scalar()
            print(f"  📊 Project Data Source Links: {link_count}")

            # Check dashboards
            result = conn.execute(text("SELECT COUNT(*) FROM dashboards"))
            dashboard_count = result.scalar()
            print(f"  📊 Dashboards: {dashboard_count}")

    except Exception as e:
        print(f"❌ Error seeding database: {str(e)}")
        raise
    finally:
        engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_database())
