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
                'project_data_source', 'dashboards', 'dashboard_widgets',
                'roles', 'user_organizations'
            ]
            
            missing_tables = [table for table in required_tables if table not in existing_tables]
            
            if missing_tables:
                print(f"⚠️  Missing tables: {missing_tables}")
                print("🔧 Creating missing tables...")
                
                # Create missing tables
                await create_missing_tables(engine, missing_tables)
            else:
                print("✅ All required tables exist")

        # Ensure users table has expected modern columns (adds missing columns when upgrading older DBs)
        try:
            await ensure_user_columns(engine)
        except Exception as e:
            print(f"⚠️ Failed to ensure user columns: {e}")
        # Ensure organization/project schema columns expected by code are present
        try:
            await ensure_org_project_columns(engine)
        except Exception as e:
            print(f"⚠️ Failed to ensure org/project columns: {e}")
        
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

        # Ensure admin user exists for developer onboarding
        try:
            ensure_admin(engine)
        except Exception as e:
            print(f"⚠️ Failed to ensure admin user: {e}")

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
                created_by UUID REFERENCES users(id),
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
                description TEXT,
                db_type VARCHAR,
                size INTEGER,
                row_count INTEGER,
                schema JSONB,
                sample_data JSONB,
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
                created_by UUID REFERENCES users(id),
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
        ,
        'roles': """
            CREATE TABLE IF NOT EXISTS roles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                description TEXT,
                permissions JSONB,
                is_system_role BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """,
        'user_organizations': """
            CREATE TABLE IF NOT EXISTS user_organizations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                organization_id INTEGER REFERENCES organizations(id),
                user_id UUID REFERENCES users(id),
                role VARCHAR(50) DEFAULT 'member',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        # Insert default Aiser organization
        conn.execute(text("""
            INSERT INTO organizations (id, name, slug, description, plan_type, is_active, created_at, updated_at)
            VALUES (1, 'Aiser Organization', 'aiser-org', 'Default Aiser organization for development', 'enterprise', true, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
        """))
        
        # Ensure a default admin user exists (id=1) so demo rows can reference it
        result = conn.execute(text("SELECT COUNT(*) FROM users"))
        user_count = result.scalar()
        if user_count == 0:
            conn.execute(text("""
                INSERT INTO users (id, email, username, password, is_active, created_at, updated_at)
                VALUES (1, 'admin@aiser.local', 'admin', 'devpassword', true, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
            """))

        # Insert demo project (do not set created_by here to avoid UUID/integer mismatches)
        conn.execute(text("""
            INSERT INTO projects (id, name, description, organization_id, is_active, created_at, updated_at)
            VALUES (1, 'Demo Project', 'Demo project for testing and development', 1, true, NOW(), NOW())
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
        
        # Insert demo dashboard (omit created_by to avoid UUID/integer mismatches)
        conn.execute(text("""
            INSERT INTO dashboards (id, name, description, project_id, layout_config, theme_config, is_active, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                'Demo Dashboard',
                'Demo dashboard for testing and development',
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

        # Insert standard roles with valid JSON permissions
        import json
        roles = [
            {"name": "owner", "description": "Organization owner with full access", "permissions": {"all": True}, "is_system_role": True},
            {"name": "admin", "description": "Organization administrator", "permissions": {"organization": ["read","write"], "projects": ["read","write"], "users": ["read","write"]}, "is_system_role": True},
            {"name": "member", "description": "Organization member", "permissions": {"organization": ["read"], "projects": ["read","write"]}, "is_system_role": True},
            {"name": "viewer", "description": "Organization viewer", "permissions": {"organization": ["read"], "projects": ["read"]}, "is_system_role": True},
        ]

        for role in roles:
            conn.execute(text("""
                INSERT INTO roles (name, description, permissions, is_system_role, created_at, updated_at)
                VALUES (:name, :description, CAST(:permissions AS JSONB), :is_system_role, NOW(), NOW())
                ON CONFLICT (name) DO NOTHING
            """), {
                "name": role["name"],
                "description": role["description"],
                "permissions": json.dumps(role["permissions"]),
                "is_system_role": role["is_system_role"],
            })
        conn.commit()
        print("✅ Roles seeded successfully!")


async def ensure_user_columns(engine):
    """Add missing user profile columns to existing users table to match model expectations."""
    # Columns to ensure (name -> SQL type)
    cols = {
        'first_name': 'VARCHAR(100)',
        'last_name': 'VARCHAR(100)',
        'phone': 'VARCHAR(50)',
        'bio': 'TEXT',
        'avatar': 'VARCHAR(512)',
        'website': 'VARCHAR(255)',
        'location': 'VARCHAR(255)',
        'timezone': 'VARCHAR(64)',
        'onboarding_data': 'JSONB',
        'onboarding_completed_at': 'TIMESTAMP WITH TIME ZONE',
        'is_verified': 'BOOLEAN DEFAULT FALSE',
        'verification_attempts': 'INTEGER',
        'verification_sent_at': 'TIMESTAMP WITH TIME ZONE',
        'created_at': 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
        'updated_at': 'TIMESTAMP WITH TIME ZONE'
    }
    with engine.connect() as conn:
        for name, sqltype in cols.items():
            try:
                # Add column if not exists
                conn.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {name} {sqltype};"))
            except Exception:
                # Ignore individual column failures but continue
                print(f"Warning: failed to add column {name} to users table")
        conn.commit()


def health_check(engine):
    """Simple DB health check used by CI and local onboarding scripts.

    Returns a dict with table presence and basic row counts for critical tables.
    """
    out = {"ok": False, "tables": {}, "counts": {}}
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
            tables = {r[0] for r in result.fetchall()}
            out["tables"] = {t: (t in tables) for t in ['users','organizations','projects','data_sources','device_sessions','roles','user_organizations']}

            # row counts for key tables if they exist
            for t in ['users','organizations','projects']:
                if t in tables:
                    try:
                        r = conn.execute(text(f"SELECT COUNT(*) FROM {t}"))
                        out["counts"][t] = int(r.scalar())
                    except Exception:
                        out["counts"][t] = None

        out["ok"] = True
    except Exception as e:
        out["error"] = str(e)
    return out


async def ensure_org_project_columns(engine):
    """Add missing organization/project columns that older DBs may lack.

    This ensures runtime queries that select these columns don't fail with
    UndefinedColumnError.
    """
    with engine.connect() as conn:
        # organizations.is_deleted
        try:
            conn.execute(text("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;"))
        except Exception:
            print("Warning: failed to add organizations.is_deleted")

        # projects.deleted_at
        try:
            conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;"))
        except Exception:
            print("Warning: failed to add projects.deleted_at")

        # dashboards.deleted_at/is_deleted may also be referenced elsewhere
        try:
            conn.execute(text("ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;"))
            conn.execute(text("ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;"))
        except Exception:
            print("Warning: failed to add dashboards deleted flags")

        conn.commit()


def ensure_admin(engine):
    """Ensure an admin user exists. Uses env ADMIN_EMAIL and ADMIN_PASSWORD when present.

    Note: password is stored as plaintext for dev onboarding to allow immediate signin and
    migration to hashed passwords on first login. In production this must be hashed.
    """
    admin_email = os.getenv('ADMIN_EMAIL', 'admin@aiser.local')
    admin_password = os.getenv('ADMIN_PASSWORD', 'Admin123')
    admin_username = os.getenv('ADMIN_USERNAME', 'admin')
    with engine.connect() as conn:
        try:
            r = conn.execute(text("SELECT id FROM users WHERE email = :email OR username = :username LIMIT 1"), {"email": admin_email, "username": admin_username})
            if r.fetchone():
                print(f"Admin user already exists: {admin_email}")
                return

            # Insert admin with minimal fields; some environments expect numeric legacy ids so use default serial when needed
            try:
                conn.execute(text("INSERT INTO users (email, username, password, is_active, created_at, updated_at) VALUES (:email, :username, :password, TRUE, NOW(), NOW())"), {"email": admin_email, "username": admin_username, "password": admin_password})
                conn.commit()
                print(f"Created admin user {admin_email} (dev only)")
                # Provision org + default project + membership for the admin user
                try:
                    provision_user(engine, admin_email, role='owner')
                except Exception as e:
                    print(f"Failed to provision admin user resources: {e}")
            except Exception as e:
                print(f"Failed to create admin user: {e}")
        except Exception as e:
            print(f"Failed to check/create admin user: {e}")


def provision_user(engine, user_email: str, role: str = "owner", default_org_slug: str = "aiser-org", default_org_name: str = "Aiser Organization", default_project_name: str = "Default Project"):
    """Provision default organization, project and membership for a given user.

    This is called during onboarding to ensure new users have an organization
    and a default project, and are added to `user_organizations` with the
    specified role (e.g. owner, member).
    """
    from sqlalchemy.exc import SQLAlchemyError

    with engine.connect() as conn:
        try:
            # Find user
            r = conn.execute(text("SELECT id FROM users WHERE email = :email LIMIT 1"), {"email": user_email})
            row = r.fetchone()
            if not row:
                print(f"⚠️ provision_user: user not found: {user_email}")
                return

            user_id = row[0]

            # Ensure organization exists
            r = conn.execute(text("SELECT id FROM organizations WHERE slug = :slug LIMIT 1"), {"slug": default_org_slug})
            org_row = r.fetchone()
            if org_row:
                org_id = org_row[0]
            else:
                conn.execute(text(
                    """
                    INSERT INTO organizations (name, slug, description, plan_type, is_active, created_at, updated_at)
                    VALUES (:name, :slug, :desc, 'starter', TRUE, NOW(), NOW())
                    ON CONFLICT (slug) DO NOTHING
                    """
                ), {"name": default_org_name, "slug": default_org_slug, "desc": f"Organization for {default_org_name}"})
                # re-read id
                r2 = conn.execute(text("SELECT id FROM organizations WHERE slug = :slug LIMIT 1"), {"slug": default_org_slug})
                org_id = r2.fetchone()[0]

            # Ensure default project exists for the org
            r = conn.execute(text("SELECT id FROM projects WHERE organization_id = :org_id AND name = :name LIMIT 1"), {"org_id": org_id, "name": default_project_name})
            proj_row = r.fetchone()
            if proj_row:
                project_id = proj_row[0]
            else:
                # Attempt to set created_by to user_id when numeric; otherwise leave NULL
                created_by_val = None
                try:
                    if isinstance(user_id, int):
                        created_by_val = int(user_id)
                    elif isinstance(user_id, str) and user_id.isdigit():
                        created_by_val = int(user_id)
                except Exception:
                    created_by_val = None

                if created_by_val is not None:
                    conn.execute(text(
                        "INSERT INTO projects (name, description, organization_id, created_by, is_active, created_at, updated_at) VALUES (:name, :desc, :org_id, :created_by, TRUE, NOW(), NOW()) ON CONFLICT DO NOTHING"
                    ), {"name": default_project_name, "desc": f"Default project for {default_org_name}", "org_id": org_id, "created_by": created_by_val})
                else:
                    conn.execute(text(
                        "INSERT INTO projects (name, description, organization_id, is_active, created_at, updated_at) VALUES (:name, :desc, :org_id, TRUE, NOW(), NOW()) ON CONFLICT DO NOTHING"
                    ), {"name": default_project_name, "desc": f"Default project for {default_org_name}", "org_id": org_id})

                r3 = conn.execute(text("SELECT id FROM projects WHERE organization_id = :org_id AND name = :name LIMIT 1"), {"org_id": org_id, "name": default_project_name})
                project_id = r3.fetchone()[0]

            # Ensure membership exists in user_organizations
            user_id_text = str(user_id)
            r = conn.execute(text("SELECT id FROM user_organizations WHERE organization_id = :org_id AND user_id::text = :user_id_text LIMIT 1"), {"org_id": org_id, "user_id_text": user_id_text})
            mem_row = r.fetchone()
            if mem_row:
                print(f"Membership already exists for user {user_email} in org {org_id}")
            else:
                # Try inserting with UUID cast; if that fails, try without cast or with NULL
                try:
                    conn.execute(text("INSERT INTO user_organizations (organization_id, user_id, role, is_active, created_at, updated_at) VALUES (:org_id, (:user_id_text)::uuid, :role, TRUE, NOW(), NOW()) ON CONFLICT DO NOTHING"), {"org_id": org_id, "user_id_text": user_id_text, "role": role})
                except SQLAlchemyError:
                    try:
                        conn.execute(text("INSERT INTO user_organizations (organization_id, user_id, role, is_active, created_at, updated_at) VALUES (:org_id, :user_id_text, :role, TRUE, NOW(), NOW()) ON CONFLICT DO NOTHING"), {"org_id": org_id, "user_id_text": user_id_text, "role": role})
                    except SQLAlchemyError as e:
                        print(f"Failed to insert membership with user_id={user_id_text}: {e}; inserting membership without user reference")
                        try:
                            conn.execute(text("INSERT INTO user_organizations (organization_id, role, is_active, created_at, updated_at) VALUES (:org_id, :role, TRUE, NOW(), NOW()) ON CONFLICT DO NOTHING"), {"org_id": org_id, "role": role})
                        except Exception as e2:
                            print(f"Failed to create fallback membership row: {e2}")

            conn.commit()
            print(f"Provisioned org={org_id}, project={project_id} for user {user_email} with role {role}")

        except Exception as e:
            print(f"provision_user failed: {e}")

if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser(description="Aiser DB setup and utilities")
    parser.add_argument("--health", action="store_true", help="Run DB health check and print JSON result")
    parser.add_argument("--prune-demo", type=int, help="Prune demo data sources to the given number (e.g. 4)")
    args = parser.parse_args()

    # Build engine for utility commands
    DATABASE_URL = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
    engine = create_engine(DATABASE_URL, echo=False)

    if args.health:
        report = health_check(engine)
        print(json.dumps(report, indent=2, default=str))
    elif args.prune_demo is not None:
        # Prune demo data sources, keeping the newest N entries
        keep = max(0, int(args.prune_demo))
        with engine.connect() as conn:
            try:
                r = conn.execute(text("SELECT id FROM data_sources WHERE id LIKE 'demo_%' ORDER BY created_at DESC"))
                rows = [row[0] for row in r.fetchall()]
                to_delete = rows[keep:]
                for dsid in to_delete:
                    try:
                        conn.execute(text("DELETE FROM project_data_source WHERE data_source_id = :id"), {"id": dsid})
                        conn.execute(text("DELETE FROM data_sources WHERE id = :id"), {"id": dsid})
                    except Exception as e:
                        print(f"Failed to delete demo data source {dsid}: {e}")
                conn.commit()
                print(f"Pruned {len(to_delete)} demo data sources; kept {len(rows[:keep])}")
            except Exception as e:
                print(f"Failed to prune demo data sources: {e}")
    else:
        asyncio.run(setup_database())
