"""
Role-Based Access Control (RBAC) Permissions

Defines permissions and roles for the Aiser Platform.
"""

from enum import Enum
from typing import Set, Dict, List, Optional
from dataclasses import dataclass


class Permission(str, Enum):
    """Permission types for resources"""
    
    # Organization permissions
    ORG_VIEW = "org:view"
    ORG_EDIT = "org:edit"
    ORG_DELETE = "org:delete"
    ORG_MANAGE_USERS = "org:manage_users"
    ORG_MANAGE_BILLING = "org:manage_billing"
    ORG_VIEW_ANALYTICS = "org:view_analytics"
    
    # Project permissions
    PROJECT_VIEW = "project:view"
    PROJECT_EDIT = "project:edit"
    PROJECT_DELETE = "project:delete"
    PROJECT_MANAGE_MEMBERS = "project:manage_members"
    PROJECT_EXPORT = "project:export"
    
    # Data permissions
    DATA_VIEW = "data:view"
    DATA_EDIT = "data:edit"
    DATA_DELETE = "data:delete"
    DATA_UPLOAD = "data:upload"
    DATA_CONNECT = "data:connect"
    
    # Chart/Dashboard permissions
    CHART_VIEW = "chart:view"
    CHART_EDIT = "chart:edit"
    CHART_DELETE = "chart:delete"
    CHART_SHARE = "chart:share"
    DASHBOARD_VIEW = "dashboard:view"
    DASHBOARD_EDIT = "dashboard:edit"
    DASHBOARD_DELETE = "dashboard:delete"
    DASHBOARD_PUBLISH = "dashboard:publish"
    
    # AI permissions
    AI_USE = "ai:use"
    AI_ADVANCED = "ai:advanced"
    AI_TRAIN_MODELS = "ai:train_models"
    
    # Query permissions
    QUERY_EXECUTE = "query:execute"
    QUERY_SAVE = "query:save"
    QUERY_SHARE = "query:share"
    
    # User permissions
    USER_VIEW_PROFILE = "user:view_profile"
    USER_EDIT_PROFILE = "user:edit_profile"
    USER_MANAGE_API_KEYS = "user:manage_api_keys"


@dataclass
class Role:
    """Role definition with associated permissions"""
    name: str
    display_name: str
    permissions: Set[Permission]
    description: str = ""


# Predefined roles with their permissions
ROLES: Dict[str, Role] = {
    "org_owner": Role(
        name="org_owner",
        display_name="Organization Owner",
        description="Full control over organization and all resources",
        permissions=set(Permission)  # All permissions
    ),
    
    "org_admin": Role(
        name="org_admin",
        display_name="Organization Admin",
        description="Manage organization settings, users, and projects",
        permissions={
            Permission.ORG_VIEW,
            Permission.ORG_EDIT,
            Permission.ORG_MANAGE_USERS,
            Permission.ORG_MANAGE_BILLING,
            Permission.ORG_VIEW_ANALYTICS,
            Permission.PROJECT_VIEW,
            Permission.PROJECT_EDIT,
            Permission.PROJECT_DELETE,
            Permission.PROJECT_MANAGE_MEMBERS,
            Permission.PROJECT_EXPORT,
            Permission.DATA_VIEW,
            Permission.DATA_EDIT,
            Permission.DATA_DELETE,
            Permission.DATA_UPLOAD,
            Permission.DATA_CONNECT,
            Permission.CHART_VIEW,
            Permission.CHART_EDIT,
            Permission.CHART_DELETE,
            Permission.CHART_SHARE,
            Permission.DASHBOARD_VIEW,
            Permission.DASHBOARD_EDIT,
            Permission.DASHBOARD_DELETE,
            Permission.DASHBOARD_PUBLISH,
            Permission.AI_USE,
            Permission.AI_ADVANCED,
            Permission.QUERY_EXECUTE,
            Permission.QUERY_SAVE,
            Permission.QUERY_SHARE,
            Permission.USER_VIEW_PROFILE,
            Permission.USER_EDIT_PROFILE,
        }
    ),
    
    "org_member": Role(
        name="org_member",
        display_name="Organization Member",
        description="Access to projects and resources within organization",
        permissions={
            Permission.PROJECT_VIEW,
            Permission.PROJECT_EDIT,
            Permission.DATA_VIEW,
            Permission.DATA_EDIT,
            Permission.DATA_UPLOAD,
            Permission.DATA_CONNECT,
            Permission.CHART_VIEW,
            Permission.CHART_EDIT,
            Permission.CHART_SHARE,
            Permission.DASHBOARD_VIEW,
            Permission.DASHBOARD_EDIT,
            Permission.AI_USE,
            Permission.QUERY_EXECUTE,
            Permission.QUERY_SAVE,
            Permission.USER_VIEW_PROFILE,
            Permission.USER_EDIT_PROFILE,
        }
    ),
    
    "org_viewer": Role(
        name="org_viewer",
        display_name="Organization Viewer",
        description="Read-only access to organization resources",
        permissions={
            Permission.ORG_VIEW,
            Permission.PROJECT_VIEW,
            Permission.DATA_VIEW,
            Permission.CHART_VIEW,
            Permission.DASHBOARD_VIEW,
            Permission.QUERY_EXECUTE,  # Can execute but not save
            Permission.USER_VIEW_PROFILE,
        }
    ),
    
    "project_owner": Role(
        name="project_owner",
        display_name="Project Owner",
        description="Full control over a specific project",
        permissions={
            Permission.PROJECT_VIEW,
            Permission.PROJECT_EDIT,
            Permission.PROJECT_DELETE,
            Permission.PROJECT_MANAGE_MEMBERS,
            Permission.PROJECT_EXPORT,
            Permission.DATA_VIEW,
            Permission.DATA_EDIT,
            Permission.DATA_DELETE,
            Permission.DATA_UPLOAD,
            Permission.DATA_CONNECT,
            Permission.CHART_VIEW,
            Permission.CHART_EDIT,
            Permission.CHART_DELETE,
            Permission.CHART_SHARE,
            Permission.DASHBOARD_VIEW,
            Permission.DASHBOARD_EDIT,
            Permission.DASHBOARD_DELETE,
            Permission.DASHBOARD_PUBLISH,
            Permission.AI_USE,
            Permission.AI_ADVANCED,
            Permission.QUERY_EXECUTE,
            Permission.QUERY_SAVE,
            Permission.QUERY_SHARE,
        }
    ),
    
    "project_editor": Role(
        name="project_editor",
        display_name="Project Editor",
        description="Edit and create resources within a project",
        permissions={
            Permission.PROJECT_VIEW,
            Permission.PROJECT_EDIT,
            Permission.DATA_VIEW,
            Permission.DATA_EDIT,
            Permission.DATA_UPLOAD,
            Permission.DATA_CONNECT,
            Permission.CHART_VIEW,
            Permission.CHART_EDIT,
            Permission.CHART_SHARE,
            Permission.DASHBOARD_VIEW,
            Permission.DASHBOARD_EDIT,
            Permission.AI_USE,
            Permission.QUERY_EXECUTE,
            Permission.QUERY_SAVE,
            Permission.QUERY_SHARE,
        }
    ),
    
    "project_viewer": Role(
        name="project_viewer",
        display_name="Project Viewer",
        description="Read-only access to a project",
        permissions={
            Permission.PROJECT_VIEW,
            Permission.DATA_VIEW,
            Permission.CHART_VIEW,
            Permission.DASHBOARD_VIEW,
            Permission.QUERY_EXECUTE,  # Can execute but not save
        }
    ),
}


def get_role_permissions(role_name: str) -> Set[Permission]:
    """Get permissions for a role"""
    role = ROLES.get(role_name)
    if role:
        return role.permissions
    return set()


def has_permission(user_permissions: Set[Permission], required_permission: Permission) -> bool:
    """Check if user has required permission"""
    return required_permission in user_permissions


def get_user_permissions(user_id: str, organization_id: Optional[str] = None, project_id: Optional[str] = None) -> Set[Permission]:
    """
    Get all permissions for a user based on their roles.
    
    This is a synchronous wrapper that should be used with async database queries.
    For async database queries, use rbac.database.get_user_permissions() instead.
    
    Args:
        user_id: User ID
        organization_id: Optional organization ID (for org-level roles)
        project_id: Optional project ID (for project-level roles)
        
    Returns:
        Set of permissions the user has
    """
    # This is a synchronous wrapper - use async version for database queries
    # Import here to avoid circular imports
    import asyncio
    try:
        from app.modules.authentication.rbac.database import get_user_permissions as async_get_user_permissions
        from app.db.session import async_session
        
        # Try to get existing event loop
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If loop is running, we can't use it - return empty set
                # Caller should use async version directly
                return set()
        except RuntimeError:
            # No event loop, create one
            pass
        
        # Create new event loop and run
        async def _get():
            async with async_session() as db:
                return await async_get_user_permissions(user_id, organization_id, project_id, db)
        
        return asyncio.run(_get())
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Error getting user permissions (sync wrapper): {e}")
        return set()


def check_permission(
    user_id: str,
    permission: Permission,
    organization_id: Optional[str] = None,
    project_id: Optional[str] = None
) -> bool:
    """
    Check if user has a specific permission.
    
    This is a synchronous wrapper. For async database queries, use 
    rbac.database.check_permission() instead.
    
    Args:
        user_id: User ID
        permission: Required permission
        organization_id: Optional organization ID
        project_id: Optional project ID
        
    Returns:
        True if user has permission, False otherwise
    """
    user_permissions = get_user_permissions(user_id, organization_id, project_id)
    return has_permission(user_permissions, permission)

