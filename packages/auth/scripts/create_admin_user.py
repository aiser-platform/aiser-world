#!/usr/bin/env python3
"""
Create initial admin user for Aiser Enterprise
"""

import os
import sys
from datetime import datetime
from passlib.context import CryptContext

# Add the src directory to the Python path
sys.path.insert(0, '/app/src')

from app.core.database import get_db
from app.modules.user.models import User
from app.modules.organizations.models import Organization, Role, UserOrganization

def create_admin_user():
    """Create initial admin user if it doesn't exist"""
    
    # Get admin credentials from environment or use defaults
    admin_email = os.getenv('ADMIN_EMAIL', 'admin@company.com')
    admin_username = os.getenv('ADMIN_USERNAME', 'admin')
    admin_password = os.getenv('ADMIN_PASSWORD', 'admin123')
    org_name = os.getenv('AISER_ORG_NAME', 'Aiser Enterprise')
    
    print(f"Creating admin user: {admin_username} ({admin_email})")
    
    # Get database session
    db = next(get_db())
    
    try:
        # Check if admin user already exists
        existing_user = db.query(User).filter(
            (User.email == admin_email) | (User.username == admin_username)
        ).first()
        
        if existing_user:
            print(f"Admin user already exists: {existing_user.username}")
            return
        
        # Create password hash
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        hashed_password = pwd_context.hash(admin_password)
        
        # Create admin user
        admin_user = User(
            username=admin_username,
            email=admin_email,
            password=hashed_password,
            is_active=True,
            is_verified=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )\n        \n        db.add(admin_user)\n        db.flush()  # Get the user ID\n        \n        # Create or get default organization\n        default_org = db.query(Organization).filter(\n            Organization.name == org_name\n        ).first()\n        \n        if not default_org:\n            default_org = Organization(\n                name=org_name,\n                description=\"Default enterprise organization\",\n                subscription_tier=\"enterprise\",\n                is_active=True,\n                created_at=datetime.utcnow(),\n                updated_at=datetime.utcnow()\n            )\n            db.add(default_org)\n            db.flush()\n        \n        # Create or get admin role\n        admin_role = db.query(Role).filter(Role.name == \"admin\").first()\n        \n        if not admin_role:\n            admin_role = Role(\n                name=\"admin\",\n                description=\"Administrator role with full access\",\n                permissions=[\n                    \"user:read\", \"user:write\", \"user:delete\",\n                    \"org:read\", \"org:write\", \"org:delete\",\n                    \"role:read\", \"role:write\", \"role:delete\",\n                    \"system:admin\"\n                ],\n                created_at=datetime.utcnow(),\n                updated_at=datetime.utcnow()\n            )\n            db.add(admin_role)\n            db.flush()\n        \n        # Create user-organization relationship\n        user_org = UserOrganization(\n            user_id=admin_user.id,\n            organization_id=default_org.id,\n            role_id=admin_role.id,\n            is_active=True,\n            joined_at=datetime.utcnow()\n        )\n        \n        db.add(user_org)\n        db.commit()\n        \n        print(f\"✅ Admin user created successfully!\")\n        print(f\"   Username: {admin_username}\")\n        print(f\"   Email: {admin_email}\")\n        print(f\"   Password: {admin_password}\")\n        print(f\"   Organization: {org_name}\")\n        print(f\"   Role: admin\")\n        print(\"\")\n        print(\"⚠️  Please change the default password after first login!\")\n        \n    except Exception as e:\n        print(f\"❌ Error creating admin user: {e}\")\n        db.rollback()\n        raise\n    \n    finally:\n        db.close()\n\nif __name__ == \"__main__\":\n    create_admin_user()