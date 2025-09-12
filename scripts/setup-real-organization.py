#!/usr/bin/env python3
"""
Real Organization Setup Script
Creates production-ready organizations, users, and initial data
"""

import os
import sys
import asyncio
import secrets
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import json

# Add the server package to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'packages', 'chat2chart', 'server'))

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text
from passlib.context import CryptContext

from app.core.database import get_async_session
from app.models.user import User
from app.models.organization import Organization, OrganizationUser
from app.models.project import Project, ProjectUser
from app.models.data import DataSource
from app.models.charts import Dashboard
from app.core.config import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class RealOrganizationSetup:
    """Real organization setup with production-ready data"""
    
    def __init__(self):
        self.organizations = []
        self.users = []
        self.projects = []
        self.data_sources = []
    
    def generate_secure_password(self, length: int = 16) -> str:
        """Generate a secure random password"""
        alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return pwd_context.hash(password)
    
    async def create_real_organizations(self, session: AsyncSession):
        """Create real organizations with proper structure"""
        
        # Organization 1: Main Development Organization
        org1 = Organization(
            name="Aiser Development Organization",
            slug="aiser-dev-org",
            description="Primary development organization for Aiser Platform development and testing",
            plan_type="enterprise",
            is_active=True,
            max_users=100,
            max_projects=50,
            max_storage_gb=1000,
            ai_credits_limit=100000
        )
        session.add(org1)
        await session.flush()  # Get the ID
        
        # Organization 2: Production Organization
        org2 = Organization(
            name="Aiser Production Organization",
            slug="aiser-prod-org",
            description="Production organization for live Aiser Platform deployment",
            plan_type="enterprise",
            is_active=True,
            max_users=1000,
            max_projects=100,
            max_storage_gb=10000,
            ai_credits_limit=1000000
        )
        session.add(org2)
        await session.flush()
        
        # Organization 3: Customer Demo Organization
        org3 = Organization(
            name="Customer Demo Organization",
            slug="customer-demo-org",
            description="Demo organization for customer demonstrations and trials",
            plan_type="pro",
            is_active=True,
            max_users=25,
            max_projects=10,
            max_storage_gb=100,
            ai_credits_limit=10000
        )
        session.add(org3)
        await session.flush()
        
        self.organizations = [org1, org2, org3]
        print(f"✅ Created {len(self.organizations)} real organizations")
    
    async def create_real_users(self, session: AsyncSession):
        """Create real users with proper roles and permissions"""
        
        # Admin user for development org
        admin_password = self.generate_secure_password()
        admin_user = User(
            email="admin@aiser-dev.com",
            username="admin",
            full_name="Aiser Admin",
            hashed_password=self.hash_password(admin_password),
            is_active=True,
            is_superuser=True,
            is_verified=True,
            role="super_admin"
        )
        session.add(admin_user)
        await session.flush()
        
        # Developer user
        dev_password = self.generate_secure_password()
        dev_user = User(
            email="developer@aiser-dev.com",
            username="developer",
            full_name="Aiser Developer",
            hashed_password=self.hash_password(dev_password),
            is_active=True,
            is_superuser=False,
            is_verified=True,
            role="developer"
        )
        session.add(dev_user)
        await session.flush()
        
        # Product manager user
        pm_password = self.generate_secure_password()
        pm_user = User(
            email="pm@aiser-dev.com",
            username="product_manager",
            full_name="Product Manager",
            hashed_password=self.hash_password(pm_password),
            is_active=True,
            is_superuser=False,
            is_verified=True,
            role="product_manager"
        )
        session.add(pm_user)
        await session.flush()
        
        # Customer demo user
        demo_password = self.generate_secure_password()
        demo_user = User(
            email="demo@customer-demo.com",
            username="demo_user",
            full_name="Demo User",
            hashed_password=self.hash_password(demo_password),
            is_active=True,
            is_superuser=False,
            is_verified=True,
            role="analyst"
        )
        session.add(demo_user)
        await session.flush()
        
        self.users = [admin_user, dev_user, pm_user, demo_user]
        
        # Save passwords to file for reference
        passwords = {
            "admin@aiser-dev.com": admin_password,
            "developer@aiser-dev.com": dev_password,
            "pm@aiser-dev.com": pm_password,
            "demo@customer-demo.com": demo_password
        }
        
        with open("generated_passwords.json", "w") as f:
            json.dump(passwords, f, indent=2)
        
        print(f"✅ Created {len(self.users)} real users")
        print(f"📝 Passwords saved to generated_passwords.json")
    
    async def create_organization_users(self, session: AsyncSession):
        """Create organization-user relationships"""
        
        # Admin user in all organizations
        for org in self.organizations:
            org_user = OrganizationUser(
                organization_id=org.id,
                user_id=self.users[0].id,  # Admin user
                role="admin",
                is_active=True,
                joined_at=datetime.now(timezone.utc)
            )
            session.add(org_user)
        
        # Developer user in development org
        dev_org_user = OrganizationUser(
            organization_id=self.organizations[0].id,  # Dev org
            user_id=self.users[1].id,  # Developer user
            role="developer",
            is_active=True,
            joined_at=datetime.now(timezone.utc)
        )
        session.add(dev_org_user)
        
        # PM user in development org
        pm_org_user = OrganizationUser(
            organization_id=self.organizations[0].id,  # Dev org
            user_id=self.users[2].id,  # PM user
            role="product_manager",
            is_active=True,
            joined_at=datetime.now(timezone.utc)
        )
        session.add(pm_org_user)
        
        # Demo user in demo org
        demo_org_user = OrganizationUser(
            organization_id=self.organizations[2].id,  # Demo org
            user_id=self.users[3].id,  # Demo user
            role="analyst",
            is_active=True,
            joined_at=datetime.now(timezone.utc)
        )
        session.add(demo_org_user)
        
        print("✅ Created organization-user relationships")
    
    async def create_real_projects(self, session: AsyncSession):
        """Create real projects with proper structure"""
        
        # Development projects
        dev_project = Project(
            name="Aiser Platform Development",
            description="Main development project for Aiser Platform core features",
            organization_id=self.organizations[0].id,  # Dev org
            created_by=self.users[0].id,  # Admin user
            is_active=True,
            is_public=False
        )
        session.add(dev_project)
        await session.flush()
        
        # Testing project
        test_project = Project(
            name="Testing & QA",
            description="Project for testing and quality assurance of Aiser Platform",
            organization_id=self.organizations[0].id,  # Dev org
            created_by=self.users[1].id,  # Developer user
            is_active=True,
            is_public=False
        )
        session.add(test_project)
        await session.flush()
        
        # Production project
        prod_project = Project(
            name="Production Deployment",
            description="Production deployment project for live Aiser Platform",
            organization_id=self.organizations[1].id,  # Prod org
            created_by=self.users[0].id,  # Admin user
            is_active=True,
            is_public=False
        )
        session.add(prod_project)
        await session.flush()
        
        # Customer demo project
        demo_project = Project(
            name="Customer Demo Project",
            description="Demo project showcasing Aiser Platform capabilities",
            organization_id=self.organizations[2].id,  # Demo org
            created_by=self.users[3].id,  # Demo user
            is_active=True,
            is_public=True
        )
        session.add(demo_project)
        await session.flush()
        
        self.projects = [dev_project, test_project, prod_project, demo_project]
        print(f"✅ Created {len(self.projects)} real projects")
    
    async def create_project_users(self, session: AsyncSession):
        """Create project-user relationships"""
        
        # Admin user in all projects
        for project in self.projects:
            project_user = ProjectUser(
                project_id=project.id,
                user_id=self.users[0].id,  # Admin user
                role="admin",
                is_active=True,
                joined_at=datetime.now(timezone.utc)
            )
            session.add(project_user)
        
        # Developer user in development projects
        for project in self.projects[:2]:  # Dev and test projects
            project_user = ProjectUser(
                project_id=project.id,
                user_id=self.users[1].id,  # Developer user
                role="developer",
                is_active=True,
                joined_at=datetime.now(timezone.utc)
            )
            session.add(project_user)
        
        # PM user in development project
        pm_project_user = ProjectUser(
            project_id=self.projects[0].id,  # Dev project
            user_id=self.users[2].id,  # PM user
            role="product_manager",
            is_active=True,
            joined_at=datetime.now(timezone.utc)
        )
        session.add(pm_project_user)
        
        # Demo user in demo project
        demo_project_user = ProjectUser(
            project_id=self.projects[3].id,  # Demo project
            user_id=self.users[3].id,  # Demo user
            role="analyst",
            is_active=True,
            joined_at=datetime.now(timezone.utc)
        )
        session.add(demo_project_user)
        
        print("✅ Created project-user relationships")
    
    async def create_real_data_sources(self, session: AsyncSession):
        """Create real data source configurations"""
        
        # PostgreSQL development database
        postgres_ds = DataSource(
            name="PostgreSQL Development Database",
            type="database",
            format="postgresql",
            description="Primary PostgreSQL database for development",
            connection_config={
                "host": "postgres",
                "port": 5432,
                "database": "aiser_world",
                "username": "aiser",
                "ssl_mode": "require",
                "connection_pool_size": 10
            },
            user_id=self.users[0].id,
            tenant_id=self.organizations[0].id,
            is_active=True
        )
        session.add(postgres_ds)
        await session.flush()
        
        # Redis cache
        redis_ds = DataSource(
            name="Redis Cache",
            type="cache",
            format="redis",
            description="Redis cache for session and data caching",
            connection_config={
                "host": "redis",
                "port": 6379,
                "database": 0,
                "password": "redis_password",
                "ssl": False
            },
            user_id=self.users[0].id,
            tenant_id=self.organizations[0].id,
            is_active=True
        )
        session.add(redis_ds)
        await session.flush()
        
        # File storage
        file_ds = DataSource(
            name="File Storage",
            type="storage",
            format="local",
            description="Local file storage for uploads and exports",
            connection_config={
                "path": "/app/storage",
                "max_file_size": "100MB",
                "allowed_extensions": ["csv", "xlsx", "json", "sql"]
            },
            user_id=self.users[0].id,
            tenant_id=self.organizations[0].id,
            is_active=True
        )
        session.add(file_ds)
        await session.flush()
        
        self.data_sources = [postgres_ds, redis_ds, file_ds]
        print(f"✅ Created {len(self.data_sources)} real data sources")
    
    async def create_sample_dashboards(self, session: AsyncSession):
        """Create sample dashboards with real structure"""
        
        # Development dashboard
        dev_dashboard = Dashboard(
            name="Development Dashboard",
            description="Dashboard for monitoring development progress and metrics",
            project_id=self.projects[0].id,  # Dev project
            created_by=self.users[0].id,  # Admin user
            layout_config={
                "grid_size": 12,
                "widgets": [],
                "layout": "grid",
                "responsive": True
            },
            theme_config={
                "primary_color": "#1890ff",
                "secondary_color": "#52c41a",
                "theme": "light",
                "font_family": "Inter, sans-serif"
            },
            is_active=True,
            is_public=False
        )
        session.add(dev_dashboard)
        
        # Demo dashboard
        demo_dashboard = Dashboard(
            name="Customer Demo Dashboard",
            description="Interactive dashboard showcasing Aiser Platform capabilities",
            project_id=self.projects[3].id,  # Demo project
            created_by=self.users[3].id,  # Demo user
            layout_config={
                "grid_size": 12,
                "widgets": [],
                "layout": "grid",
                "responsive": True
            },
            theme_config={
                "primary_color": "#722ed1",
                "secondary_color": "#13c2c2",
                "theme": "dark",
                "font_family": "Inter, sans-serif"
            },
            is_active=True,
            is_public=True
        )
        session.add(demo_dashboard)
        
        print("✅ Created sample dashboards")
    
    async def setup_complete(self, session: AsyncSession):
        """Complete setup process"""
        try:
            print("🚀 Starting real organization setup...")
            
            await self.create_real_organizations(session)
            await self.create_real_users(session)
            await self.create_organization_users(session)
            await self.create_real_projects(session)
            await self.create_project_users(session)
            await self.create_real_data_sources(session)
            await self.create_sample_dashboards(session)
            
            await session.commit()
            
            print("🎉 Real organization setup completed successfully!")
            print("\n📋 Setup Summary:")
            print(f"   • Organizations: {len(self.organizations)}")
            print(f"   • Users: {len(self.users)}")
            print(f"   • Projects: {len(self.projects)}")
            print(f"   • Data Sources: {len(self.data_sources)}")
            print(f"\n🔑 Login credentials saved to: generated_passwords.json")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Setup failed: {e}")
            raise

async def main():
    """Main setup function"""
    setup = RealOrganizationSetup()
    
    async with get_async_session() as session:
        await setup.setup_complete(session)

if __name__ == "__main__":
    asyncio.run(main())
