"""
RBAC Decorators for FastAPI Endpoints

Provides decorators to enforce permission checks on API endpoints.
"""

from functools import wraps
from typing import Optional, Callable, Any
from fastapi import HTTPException, Depends, status
import logging

from app.modules.authentication.deps.auth_bearer import JWTCookieBearer
from .permissions import Permission, check_permission

logger = logging.getLogger(__name__)


def require_permission(
    permission: Permission,
    resource_type: str = None,
    resource_id_param: str = None
):
    """
    Decorator to require specific permission for an endpoint.
    
    Args:
        permission: Required permission
        resource_type: Type of resource ('organization', 'project', etc.)
        resource_id_param: Name of parameter containing resource ID
        
    Example:
        @router.get("/projects/{project_id}")
        @require_permission(Permission.PROJECT_VIEW, resource_type="project", resource_id_param="project_id")
        async def get_project(project_id: str, current_token: dict = Depends(JWTCookieBearer())):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract user_id from token
            current_token = kwargs.get('current_token')
            if not current_token:
                # Try to get from dependencies
                for arg in args:
                    if isinstance(arg, dict) and ('id' in arg or 'user_id' in arg):
                        current_token = arg
                        break
            
            if not current_token:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
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
            
            # Extract resource IDs from kwargs
            organization_id = kwargs.get('organization_id') or kwargs.get('org_id')
            project_id = kwargs.get('project_id') or kwargs.get('project_id')
            
            # If resource_id_param is specified, get it from kwargs
            if resource_id_param:
                resource_id = kwargs.get(resource_id_param)
                if resource_type == 'organization':
                    organization_id = resource_id
                elif resource_type == 'project':
                    project_id = resource_id
            
            # Check permission using async database function
            from .database import check_permission as check_permission_async
            from app.db.session import get_async_session
            
            # Get database session from kwargs or create new one
            db_session = kwargs.get('db') or kwargs.get('session')
            if not db_session:
                # Try to get from dependencies
                for arg in args:
                    if hasattr(arg, 'execute'):  # It's a database session
                        db_session = arg
                        break
            
            if db_session:
                # Use async database check
                has_access = await check_permission_async(
                    user_id=str(user_id),
                    permission=permission,
                    organization_id=str(organization_id) if organization_id is not None else None,
                    project_id=str(project_id) if project_id is not None else None,
                    db=db_session
                )
            else:
                # Fallback to sync check (may not have database access)
                from .permissions import check_permission
                has_access = check_permission(
                    user_id=str(user_id),
                    permission=permission,
                    organization_id=str(organization_id) if organization_id is not None else None,
                    project_id=str(project_id) if project_id is not None else None
                )
            
            if not has_access:
                logger.warning(
                    f"Permission denied: user {user_id} attempted to access {permission.value} "
                    f"on {resource_type}={organization_id or project_id}"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied: {permission.value}"
                )
            
            # User has permission, proceed with function
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_role(role_name: str, resource_type: str = None):
    """
    Decorator to require specific role for an endpoint.
    
    Args:
        role_name: Required role name (e.g., 'org_admin', 'project_owner')
        resource_type: Type of resource ('organization', 'project', etc.)
        
    Example:
        @router.delete("/organizations/{organization_id}")
        @require_role('org_owner', resource_type='organization')
        async def delete_organization(organization_id: str, ...):
            ...
    """
    from .permissions import ROLES, get_role_permissions
    
    role = ROLES.get(role_name)
    if not role:
        raise ValueError(f"Unknown role: {role_name}")
    
    # For role-based checks, we need to check if user has the role
    # This is a simplified version - full implementation would query database
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # TODO: Implement role checking from database
            # For now, this is a placeholder
            current_token = kwargs.get('current_token')
            if not current_token:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # In a full implementation, you would:
            # 1. Get user_id from token
            # 2. Query user_organizations or project_members table
            # 3. Check if user has the required role
            # 4. Raise 403 if not
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator

