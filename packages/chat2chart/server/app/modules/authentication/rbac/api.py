"""
RBAC API Endpoints

Provides endpoints for permission checking and role management.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.modules.authentication.deps.auth_bearer import JWTCookieBearer
from app.modules.authentication.rbac.database import (
    get_user_permissions,
    get_user_organizations,
    get_organization_members,
    assign_organization_role,
)
from app.modules.authentication.rbac.permissions import Permission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/rbac", tags=["rbac"])


@router.get("/permissions")
async def get_user_permissions_endpoint(
    organization_id: Optional[str] = Query(None, alias="organization_id"),
    project_id: Optional[str] = Query(None, alias="project_id"),
    current_token: dict = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session),
):
    """
    Get all permissions for the current user.
    
    Args:
        organization_id: Optional organization ID to check permissions in
        project_id: Optional project ID to check permissions in
        current_token: JWT token from cookie
        db: Database session
        
    Returns:
        List of permission strings the user has
    """
    try:
        user_id = (
            current_token.get('id') or
            current_token.get('user_id') or
            current_token.get('sub')
        )
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )
        
        permissions = await get_user_permissions(
            user_id=str(user_id),
            organization_id=organization_id,
            project_id=project_id,
            db=db
        )
        
        return {
            "permissions": [p.value for p in permissions],
            "organization_id": organization_id,
            "project_id": project_id,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user permissions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/organizations")
async def get_user_organizations_endpoint(
    current_token: dict = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session),
):
    """
    Get all organizations the current user belongs to with their roles.
    
    Returns:
        List of organizations with roles
    """
    try:
        user_id = (
            current_token.get('id') or
            current_token.get('user_id') or
            current_token.get('sub')
        )
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )
        
        organizations = await get_user_organizations(
            user_id=str(user_id),
            db=db
        )
        
        return {
            "organizations": organizations,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user organizations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/organizations/{organization_id}/members")
async def get_organization_members_endpoint(
    organization_id: str,
    current_token: dict = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session),
):
    """
    Get all members of an organization with their roles.
    
    Requires ORG_VIEW permission.
    """
    try:
        user_id = (
            current_token.get('id') or
            current_token.get('user_id') or
            current_token.get('sub')
        )
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )
        
        # Check permission
        from app.modules.authentication.rbac.database import check_permission
        has_access = await check_permission(
            user_id=str(user_id),
            permission=Permission.ORG_VIEW,
            organization_id=organization_id,
            db=db
        )
        
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: ORG_VIEW required"
            )
        
        members = await get_organization_members(
            organization_id=organization_id,
            db=db
        )
        
        return {
            "organization_id": organization_id,
            "members": members,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting organization members: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/organizations/{organization_id}/members/{user_id}/role")
async def assign_role_endpoint(
    organization_id: str,
    user_id: str,
    role: str = Query(..., description="Role to assign: owner, admin, member, viewer"),
    current_token: dict = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session),
):
    """
    Assign a role to a user in an organization.
    
    Requires ORG_MANAGE_USERS permission.
    """
    try:
        current_user_id = (
            current_token.get('id') or
            current_token.get('user_id') or
            current_token.get('sub')
        )
        
        if not current_user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )
        
        # Check permission
        from app.modules.authentication.rbac.database import check_permission
        has_access = await check_permission(
            user_id=str(current_user_id),
            permission=Permission.ORG_MANAGE_USERS,
            organization_id=organization_id,
            db=db
        )
        
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: ORG_MANAGE_USERS required"
            )
        
        # Validate role
        valid_roles = ['owner', 'admin', 'member', 'viewer']
        if role not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
            )
        
        success = await assign_organization_role(
            user_id=user_id,
            organization_id=organization_id,
            role=role,
            db=db
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to assign role"
            )
        
        return {
            "success": True,
            "message": f"Role '{role}' assigned to user {user_id} in organization {organization_id}",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning role: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )



