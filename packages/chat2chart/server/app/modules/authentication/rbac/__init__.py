"""
Role-Based Access Control (RBAC) Module

Provides permission checking and role management for the Aiser Platform.
"""

from .permissions import (
    Permission,
    Role,
    ROLES,
    get_role_permissions,
    has_permission,
    get_user_permissions,
    check_permission,
)

from .database import (
    get_user_organization_role,
    get_user_project_role,
    get_user_permissions as get_user_permissions_async,
    check_permission as check_permission_async,
    get_user_organizations,
    get_organization_members,
    assign_organization_role,
)

# Import has_dashboard_access from parent rbac.py file
# Since Python prioritizes directories over files, we need to import from the parent file
# using importlib to avoid circular imports
try:
    import importlib.util
    from pathlib import Path
    
    # Get path to parent rbac.py file
    current_dir = Path(__file__).parent
    parent_rbac_file = current_dir.parent / "rbac.py"
    
    if parent_rbac_file.exists():
        # Load the parent rbac.py as a module
        spec = importlib.util.spec_from_file_location("rbac_parent_module", parent_rbac_file)
        if spec and spec.loader:
            rbac_parent = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(rbac_parent)
            imported_func = getattr(rbac_parent, 'has_dashboard_access', None)
            if imported_func is None:
                raise AttributeError("has_dashboard_access not found in parent rbac.py")
            has_dashboard_access = imported_func  # type: ignore
        else:
            raise ImportError("Could not create module spec for parent rbac.py")
    else:
        raise ImportError(f"Parent rbac.py file not found at {parent_rbac_file}")
except (ImportError, AttributeError, Exception) as e:
    # Fallback: define a minimal implementation
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"Could not import has_dashboard_access from parent rbac.py: {e}")
    
    async def has_dashboard_access(user_payload, dashboard_id: str) -> bool:
        """Fallback implementation - should import from parent rbac.py"""
        logger.warning("Using fallback has_dashboard_access - check parent rbac.py import")
        return True  # Allow access in fallback mode to avoid breaking functionality

__all__ = [
    'Permission',
    'Role',
    'ROLES',
    'get_role_permissions',
    'has_permission',
    'get_user_permissions',
    'check_permission',
    # Async database functions
    'get_user_organization_role',
    'get_user_project_role',
    'get_user_permissions_async',
    'check_permission_async',
    'get_user_organizations',
    'get_organization_members',
    'assign_organization_role',
    # Dashboard access
    'has_dashboard_access',
]

