#!/usr/bin/env python3
"""
Database Setup Script for Aiser Platform
This script sets up the database for new developers
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the server directory to the Python path
server_dir = Path(__file__).parent.parent
sys.path.insert(0, str(server_dir))

from sqlalchemy import create_engine, text
from app.core.config import settings

async def setup_database():
    """Set up the database with migrations and seed data"""
    
    print("🚀 Setting up Aiser Platform Database...")
    
    # Database connection string
    DATABASE_URL = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
    
    print(f"🔌 Connecting to database: {settings.POSTGRES_DB}")
    
    # Create engine
    engine = create_engine(DATABASE_URL, echo=False)
    
    try:
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("✅ Database connection successful")
        
        # Check if tables exist
        print("🔍 Checking existing tables...")
        
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            """))
            existing_tables = [row[0] for row in result.fetchall()]
            
            print(f"📋 Existing tables: {existing_tables}")
            
            # Required tables
            required_tables = [
                'organizations', 'projects', 'data_sources', 
                'project_data_source', 'dashboards', 'dashboard_widgets'
            ]
            
            missing_tables = [table for table in required_tables if table not in existing_tables]
            
            if missing_tables:
                print(f"⚠️  Missing tables: {missing_tables}")
                print("🔧 Creating missing tables...")
                
                # Create missing tables
                await create_missing_tables(engine, missing_tables)
            else:
                print("✅ All required tables exist")
        
        # Check if demo data exists
        print("🔍 Checking demo data...")
        
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM organizations"))
            org_count = result.scalar()
            
            if org_count == 0:
                print("🌱 No demo data found, seeding database...")
                await seed_demo_data(engine)
            else:
                print(f"✅ Demo data exists ({org_count} organizations)")
        
        print("🎉 Database setup completed successfully!")
        
    except Exception as e:
        print(f"❌ Error setting up database: {str(e)}")
        raise
    finally:
        engine.dispose()

async def create_missing_tables(engine, missing_tables):
    """Create missing tables"""
    
    table_creations = {
        'organizations': """
            CREATE TABLE IF NOT EXISTS organizations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                slug VARCHAR(50) NOT NULL UNIQUE,
                description TEXT,
                logo_url VARCHAR(255),
                website VARCHAR(255),
                is_active BOOLEAN DEFAULT TRUE,
                is_deleted BOOLEAN DEFAULT FALSE,
                plan_type VARCHAR(20) DEFAULT 'free',
                ai_credits_used INTEGER DEFAULT 0,
                ai_credits_limit INTEGER DEFAULT 50,
                trial_ends_at TIMESTAMP,
                is_trial_active BOOLEAN DEFAULT TRUE,
                max_users INTEGER DEFAULT 100,
                max_projects INTEGER DEFAULT 1,
                max_storage_gb INTEGER DEFAULT 100,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """,
        'projects': """
            CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                organization_id INTEGER REFERENCES organizations(id),
                created_by INTEGER REFERENCES users(id),
                is_public BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                settings TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP
            );
        """,
        'data_sources': """
            CREATE TABLE IF NOT EXISTS data_sources (
                id VARCHAR PRIMARY KEY,
                name VARCHAR NOT NULL,
                type VARCHAR NOT NULL,
                format VARCHAR,
                db_type VARCHAR,
                size INTEGER,
                row_count INTEGER,
                schema JSONB,
                connection_config JSONB,
                file_path VARCHAR,
                original_filename VARCHAR,
                user_id VARCHAR,
                tenant_id VARCHAR DEFAULT 'default',
                is_active BOOLEAN DEFAULT TRUE,
                last_accessed TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """,
        'project_data_source': """
            CREATE TABLE IF NOT EXISTS project_data_source (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                project_id INTEGER REFERENCES projects(id),
                data_source_id VARCHAR NOT NULL,
                data_source_type VARCHAR NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """,
        'dashboards': """
            CREATE TABLE IF NOT EXISTS dashboards (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                project_id INTEGER REFERENCES projects(id),
                created_by INTEGER REFERENCES users(id),
                layout_config JSONB,
                theme_config JSONB,
                global_filters JSONB,
                refresh_interval INTEGER DEFAULT 300,
                is_public BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                is_template BOOLEAN DEFAULT FALSE,
                max_widgets INTEGER DEFAULT 10,
                max_pages INTEGER DEFAULT 5,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP,
                is_deleted BOOLEAN DEFAULT FALSE,
                last_viewed_at TIMESTAMP
            );
        """,
        'dashboard_widgets': """
            CREATE TABLE IF NOT EXISTS dashboard_widgets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                widget_type VARCHAR(50) NOT NULL,
                chart_type VARCHAR(50),
                config JSONB,
                data_config JSONB,
                style_config JSONB,
                x INTEGER DEFAULT 0,
                y INTEGER DEFAULT 0,
                width INTEGER DEFAULT 4,
                height INTEGER DEFAULT 3,
                z_index INTEGER DEFAULT 0,
                is_visible BOOLEAN DEFAULT TRUE,
                is_locked BOOLEAN DEFAULT FALSE,
                is_resizable BOOLEAN DEFAULT TRUE,
                is_draggable BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP,
                is_deleted BOOLEAN DEFAULT FALSE
            );
        """
    }
    
    with engine.connect() as conn:
        for table in missing_tables:
            if table in table_creations:
                print(f"  📊 Creating {table} table...")
                conn.execute(text(table_creations[table]))
                conn.commit()
                print(f"  ✅ {table} table created")

async def seed_demo_data(engine):
    """Seed demo data"""
    
    with engine.connect() as conn:
        # Insert demo organization
        conn.execute(text("""
            INSERT INTO organizations (id, name, slug, description, plan_type, is_active, created_at, updated_at)
            VALUES (1, 'Demo Organization', 'demo-org', 'Demo organization for testing and development', 'enterprise', true, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
        """))
        
        # Insert demo project
        conn.execute(text("""
            INSERT INTO projects (id, name, description, organization_id, created_by, is_active, created_at, updated_at)
            VALUES (1, 'Demo Project', 'Demo project for testing and development', 1, 1, true, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
        """))
        
        # Insert demo data sources
        conn.execute(text("""
            INSERT INTO data_sources (id, name, type, format, size, row_count, schema, user_id, tenant_id, is_active, created_at, updated_at)
            VALUES 
            ('demo_sales_data', 'Demo Sales Data', 'file', 'csv', 25600, 1000, '{"columns": [{"name": "date", "type": "date"}, {"name": "product", "type": "string"}, {"name": "sales", "type": "number"}]}', '1', '1', true, NOW(), NOW()),
            ('demo_customers_data', 'Demo Customer Data', 'file', 'csv', 15360, 500, '{"columns": [{"name": "customer_id", "type": "string"}, {"name": "name", "type": "string"}, {"name": "email", "type": "string"}]}', '1', '1', true, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
        """))
        
        # Link data sources to project
        conn.execute(text("""
            INSERT INTO project_data_source (project_id, data_source_id, data_source_type, is_active)
            VALUES 
            (1, 'demo_sales_data', 'file', true),
            (1, 'demo_customers_data', 'file', true)
            ON CONFLICT DO NOTHING
        """))
        
        # Insert demo dashboard
        conn.execute(text("""
            INSERT INTO dashboards (id, name, description, project_id, created_by, layout_config, theme_config, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'Demo Dashboard',
                'Demo dashboard for testing and development',
                1,
                1,
                '{"grid_size": 12, "widgets": []}',
                '{"primary_color": "#1890ff"}',
                true,
                NOW(),
                NOW()
            )
            ON CONFLICT DO NOTHING
        """))
        
        conn.commit()
        print("✅ Demo data seeded successfully!")

if __name__ == "__main__":
    asyncio.run(setup_database())
