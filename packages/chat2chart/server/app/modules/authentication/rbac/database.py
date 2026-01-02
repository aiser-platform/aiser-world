"""
RBAC Database Queries

Implements database queries for role-based access control.
"""

import logging
from typing import Set, Optional, List, Dict
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_async_session
from app.modules.projects.models import UserOrganization, Project, Organization
# User model removed - user management will be handled by Supabase
from .permissions import Permission, ROLES, get_role_permissions

logger = logging.getLogger(__name__)


async def get_user_organization_role(
    user_id: str,
    organization_id: Optional[str] = None,
    db: AsyncSession = None
) -> Optional[str]:
    """
    Get user's role in an organization.
    
    Args:
        user_id: User ID (UUID string)
        organization_id: Organization ID (integer as string)
        db: Database session
        
    Returns:
        Role name (e.g., 'owner', 'admin', 'member') or None
    """
    if not db or not organization_id:
        return None
    
    try:
        import uuid
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        org_id = int(organization_id) if isinstance(organization_id, str) else organization_id
        
        query = select(UserOrganization).where(
            and_(
                UserOrganization.user_id == user_uuid,
                UserOrganization.organization_id == org_id,
                UserOrganization.is_active == True
            )
        )
        result = await db.execute(query)
        user_org = result.scalar_one_or_none()
        
        if user_org:
            return user_org.role
        return None
    except Exception as e:
        logger.error(f"Error getting user organization role: {e}")
        return None


async def get_user_project_role(
    user_id: str,
    project_id: Optional[str] = None,
    db: AsyncSession = None
) -> Optional[str]:
    """
    Get user's role in a project.
    
    First checks if user is project owner (created_by), then checks organization role.
    
    Args:
        user_id: User ID (UUID string)
        project_id: Project ID (integer as string)
        db: Database session
        
    Returns:
        Role name (e.g., 'project_owner', 'org_admin', 'org_member') or None
    """
    if not db or not project_id:
        return None
    
    try:
        import uuid
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        proj_id = int(project_id) if isinstance(project_id, str) else project_id
        
        # First check if user is project owner
        query = select(Project).where(
            and_(
                Project.id == proj_id,
                Project.created_by == user_uuid,
                Project.is_active == True
            )
        )
        result = await db.execute(query)
        project = result.scalar_one_or_none()
        
        if project:
            # User is project owner
            return 'project_owner'
        
        # Check organization role
        query = select(Project).where(
            and_(
                Project.id == proj_id,
                Project.is_active == True
            )
        )
        result = await db.execute(query)
        project = result.scalar_one_or_none()
        
        if project and project.organization_id:
            org_role = await get_user_organization_role(
                user_id=user_id,
                organization_id=str(project.organization_id),
                db=db
            )
            if org_role:
                # Map organization role to project role
                if org_role == 'owner':
                    return 'org_owner'
                elif org_role == 'admin':
                    return 'org_admin'
                elif org_role == 'member':
                    return 'org_member'
        
        return None
    except Exception as e:
        logger.error(f"Error getting user project role: {e}")
        return None


async def get_user_permissions(
    user_id: str,
    organization_id: Optional[str] = None,
    project_id: Optional[str] = None,
    db: Optional[AsyncSession] = None
) -> Set[Permission]:
    """
    Get all permissions for a user based on their roles.
    
    Queries the database to get user's roles and returns the union of all
    permissions from those roles.
    
    Args:
        user_id: User ID (UUID string)
        organization_id: Optional organization ID (for org-level roles)
        project_id: Optional project ID (for project-level roles)
        db: Database session (if None, will create a new one)
        
    Returns:
        Set of permissions the user has
    """
    permissions: Set[Permission] = set()
    
    try:
        # If no db session provided, create one
        if db is None:
            from app.db.session import async_session
            async with async_session() as session:
                return await get_user_permissions(user_id, organization_id, project_id, session)
        
        # Get organization role if organization_id provided
        if organization_id:
            org_role = await get_user_organization_role(user_id, organization_id, db)
            if org_role:
                # Map database role to RBAC role name
                role_mapping = {
                    'owner': 'org_owner',
                    'admin': 'org_admin',
                    'member': 'org_member',
                    'viewer': 'org_viewer',
                }
                rbac_role = role_mapping.get(org_role, 'org_member')
                role_permissions = get_role_permissions(rbac_role)
                permissions.update(role_permissions)
        
        # Get project role if project_id provided
        if project_id:
            proj_role = await get_user_project_role(user_id, project_id, db)
            if proj_role:
                role_permissions = get_role_permissions(proj_role)
                permissions.update(role_permissions)
        
        # If no specific resource, check all organizations user belongs to
        if not organization_id and not project_id:
            import uuid
            user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
            
            query = select(UserOrganization).where(
                and_(
                    UserOrganization.user_id == user_uuid,
                    UserOrganization.is_active == True
                )
            )
            result = await db.execute(query)
            user_orgs = result.scalars().all()
            
            # Get permissions from all organizations (union)
            for user_org in user_orgs:
                role_mapping = {
                    'owner': 'org_owner',
                    'admin': 'org_admin',
                    'member': 'org_member',
                    'viewer': 'org_viewer',
                }
                rbac_role = role_mapping.get(user_org.role, 'org_member')
                role_permissions = get_role_permissions(rbac_role)
                permissions.update(role_permissions)
        
        return permissions
        
    except Exception as e:
        logger.error(f"Error getting user permissions: {e}")
        # Return empty set on error (fail secure)
        return set()


async def check_permission(
    user_id: str,
    permission: Permission,
    organization_id: Optional[str] = None,
    project_id: Optional[str] = None,
    db: Optional[AsyncSession] = None
) -> bool:
    """
    Check if user has a specific permission.
    
    Args:
        user_id: User ID (UUID string)
        permission: Required permission
        organization_id: Optional organization ID
        project_id: Optional project ID
        db: Database session (if None, will create a new one)
        
    Returns:
        True if user has permission, False otherwise
    """
    user_permissions = await get_user_permissions(user_id, organization_id, project_id, db)
    return permission in user_permissions


async def get_user_organizations(
    user_id: str,
    db: AsyncSession
) -> List[Dict]:
    """
    Get all organizations a user belongs to with their roles.
    
    Args:
        user_id: User ID (UUID string)
        db: Database session
        
    Returns:
        List of dicts with organization_id and role
    """
    try:
        import uuid
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        
        query = select(UserOrganization, Organization).join(
            Organization, UserOrganization.organization_id == Organization.id
        ).where(
            and_(
                UserOrganization.user_id == user_uuid,
                UserOrganization.is_active == True,
                Organization.is_active == True,
                Organization.is_deleted == False
            )
        )
        result = await db.execute(query)
        rows = result.all()
        
        organizations = []
        for user_org, org in rows:
            organizations.append({
                'organization_id': org.id,
                'organization_name': org.name,
                'role': user_org.role,
                'is_active': user_org.is_active,
                'created_at': user_org.created_at.isoformat() if user_org.created_at else None,
            })
        
        return organizations
    except Exception as e:
        logger.error(f"Error getting user organizations: {e}")
        return []


async def get_organization_members(
    organization_id: str,
    db: AsyncSession
) -> List[Dict]:
    """
    Get all members of an organization with their roles.
    
    Args:
        organization_id: Organization ID (integer as string)
        db: Database session
        
    Returns:
        List of dicts with user_id, email, username, and role
    """
    try:
        org_id = int(organization_id) if isinstance(organization_id, str) else organization_id
        
        # Users table removed - user info will come from Supabase
        query = select(UserOrganization).where(
            and_(
                UserOrganization.organization_id == org_id,
                UserOrganization.is_active == True
            )
        )
        result = await db.execute(query)
        rows = result.all()
        
        members = []
        for user_org in rows:
            # User details will be fetched from Supabase when integrated
            members.append({
                'user_id': str(user_org.user_id),
                'email': None,  # Will be fetched from Supabase
                'username': None,  # Will be fetched from Supabase
                'role': user_org.role,
                'is_active': user_org.is_active,
                'joined_at': user_org.created_at.isoformat() if user_org.created_at else None,
            })
        
        return members
    except Exception as e:
        logger.error(f"Error getting organization members: {e}")
        return []


async def assign_organization_role(
    user_id: str,
    organization_id: str,
    role: str,
    db: AsyncSession
) -> bool:
    """
    Assign a role to a user in an organization.
    
    Args:
        user_id: User ID (UUID string)
        organization_id: Organization ID (integer as string)
        role: Role name ('owner', 'admin', 'member', 'viewer')
        db: Database session
        
    Returns:
        True if successful, False otherwise
    """
    try:
        import uuid
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        org_id = int(organization_id) if isinstance(organization_id, str) else organization_id
        
        # Check if user_organization already exists
        query = select(UserOrganization).where(
            and_(
                UserOrganization.user_id == user_uuid,
                UserOrganization.organization_id == org_id
            )
        )
        result = await db.execute(query)
        user_org = result.scalar_one_or_none()
        
        if user_org:
            # Update existing
            user_org.role = role
            user_org.is_active = True
        else:
            # Create new
            user_org = UserOrganization(
                user_id=user_uuid,
                organization_id=org_id,
                role=role,
                is_active=True
            )
            db.add(user_org)
        
        await db.commit()
        return True
    except Exception as e:
        logger.error(f"Error assigning organization role: {e}")
        await db.rollback()
        return False



