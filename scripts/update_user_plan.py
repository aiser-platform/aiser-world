#!/usr/bin/env python3
"""
Script to update a user's organization plan
Usage: python scripts/update_user_plan.py <email> <plan_type>
"""
import sys
import asyncio
import os

# Add the server directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'packages', 'chat2chart', 'server'))

from app.db.session import async_session
from app.modules.user.models import User
from app.modules.projects.models import Organization, UserOrganization
from sqlalchemy import select

async def update_user_plan(email: str, plan_type: str):
    """Update user's organization plan"""
    async with async_session() as db:
        try:
            # Find user by email
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            if not user:
                print(f'❌ User not found: {email}')
                return False
            
            print(f'✅ Found user: {user.email}, ID: {user.id}')
            
            # Find user's organization
            result = await db.execute(
                select(UserOrganization).where(UserOrganization.user_id == user.id)
            )
            user_org = result.scalar_one_or_none()
            
            if not user_org:
                print(f'❌ User organization not found for user: {email}')
                return False
            
            org_id = user_org.organization_id
            result = await db.execute(select(Organization).where(Organization.id == org_id))
            org = result.scalar_one_or_none()
            
            if not org:
                print(f'❌ Organization not found: {org_id}')
                return False
            
            old_plan = org.plan_type
            print(f'📋 Current plan: {old_plan}')
            
            # Update plan
            org.plan_type = plan_type
            await db.commit()
            
            # Verify update
            await db.refresh(org)
            print(f'✅ Updated plan from {old_plan} to {org.plan_type}')
            print(f'✅ Organization ID: {org.id}, Name: {org.name}')
            return True
            
        except Exception as e:
            print(f'❌ Error updating plan: {e}')
            await db.rollback()
            return False

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: python scripts/update_user_plan.py <email> <plan_type>')
        print('Example: python scripts/update_user_plan.py admin10@aiser.app pro')
        sys.exit(1)
    
    email = sys.argv[1]
    plan_type = sys.argv[2]
    
    if plan_type not in ['free', 'pro', 'team', 'enterprise']:
        print(f'❌ Invalid plan type: {plan_type}. Must be one of: free, pro, team, enterprise')
        sys.exit(1)
    
    success = asyncio.run(update_user_plan(email, plan_type))
    sys.exit(0 if success else 1)


