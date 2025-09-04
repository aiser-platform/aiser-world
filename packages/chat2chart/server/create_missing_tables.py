#!/usr/bin/env python3
"""
Create missing database tables for the Aiser Platform
This script creates all the missing tables based on the models
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the server directory to the Python path
server_dir = Path(__file__).parent
sys.path.insert(0, str(server_dir))

from sqlalchemy import create_engine, text
from app.core.config import settings
from app.modules.projects.models import Organization, OrganizationUser, Project, ProjectDataSource, ProjectConversation
from app.modules.data.models import DataSource, DataQuery, DataConnection
from app.modules.charts.models import Dashboard, DashboardWidget, DashboardShare
from app.modules.user.models import User
from app.modules.chats.conversations.models import ChatConversation
from app.modules.chats.messages.models import ChatMessage

async def create_missing_tables():
    """Create all missing database tables"""
    
    # Database connection string
    DATABASE_URL = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
    
    print(f"🔌 Connecting to database: {settings.POSTGRES_DB}")
    
    # Create engine
    engine = create_engine(DATABASE_URL, echo=True)
    
    try:
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("✅ Database connection successful")
        
        # Create all tables
        print("🏗️ Creating missing tables...")
        
        # Import Base from the common model
        from app.common.model import Base
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        print("✅ All tables created successfully!")
        
        # Verify tables were created
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            """))
            tables = [row[0] for row in result.fetchall()]
            
            print(f"📋 Current tables in database:")
            for table in tables:
                print(f"  - {table}")
        
        # Insert demo data
        print("📊 Inserting demo data...")
        
        with engine.connect() as conn:
            # Insert default Aiser organization
            conn.execute(text("""
                INSERT INTO organizations (id, name, slug, description, plan_type, is_active, created_at, updated_at)
                VALUES (1, 'Aiser', 'aiser', 'Aiser default organization', 'enterprise', true, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
            """))
            
            # Insert default Aiser admin user
            conn.execute(text("""
                INSERT INTO users (id, username, email, is_active, created_at, updated_at)
                VALUES (1, 'aiser_admin', 'admin@aiser.ai', true, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
            """))
            
            # Insert default Aiser project
            conn.execute(text("""
                INSERT INTO projects (id, name, description, organization_id, created_by, is_active, created_at, updated_at)
                VALUES (1, 'Aiser Default Project', 'Default project for Aiser', 1, 1, true, NOW(), NOW())
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
                INSERT INTO project_data_source (id, project_id, data_source_id, data_source_type, is_active, added_at)
                VALUES 
                (gen_random_uuid(), 1, 'demo_sales_data', 'file', true, NOW()),
                (gen_random_uuid(), 1, 'demo_customers_data', 'file', true, NOW())
                ON CONFLICT DO NOTHING
            """))
            
            # Insert default dashboard
            conn.execute(text("""
                INSERT INTO dashboards (id, name, description, project_id, created_by, layout_config, theme_config, is_active, created_at, updated_at)
                VALUES (
                    gen_random_uuid(),
                    'Aiser Starter Dashboard',
                    'Starter dashboard for Aiser',
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
            print("✅ Demo data inserted successfully!")
        
    except Exception as e:
        print(f"❌ Error creating tables: {str(e)}")
        raise
    finally:
        engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_missing_tables())
