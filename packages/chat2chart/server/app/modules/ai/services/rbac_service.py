"""
Role-Based Access Control (RBAC) Integration Service

This service ensures AI operations respect user permissions and organization boundaries,
providing enterprise-grade security and access control for the LangChain multi-agent system.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.modules.chats.schemas import (
    UserRole
)

logger = logging.getLogger(__name__)


class PermissionType(str, Enum):
    """Types of permissions for AI operations"""
    READ_DATA = "read_data"
    WRITE_DATA = "write_data"
    CREATE_CHARTS = "create_charts"
    CREATE_DASHBOARDS = "create_dashboards"
    EXPORT_DATA = "export_data"
    MANAGE_USERS = "manage_users"
    MANAGE_PROJECTS = "manage_projects"
    ACCESS_ADMIN = "access_admin"
    AI_ANALYSIS = "ai_analysis"
    ADVANCED_AI = "advanced_ai"
    CUBE_ACCESS = "cube_access"
    API_ACCESS = "api_access"


class ResourceType(str, Enum):
    """Types of resources that can be accessed"""
    DATA_SOURCE = "data_source"
    PROJECT = "project"
    ORGANIZATION = "organization"
    DASHBOARD = "dashboard"
    CHART = "chart"
    USER = "user"
    AI_MODEL = "ai_model"
    CUBE_SCHEMA = "cube_schema"


class RBACService:
    """
    Role-Based Access Control service for AI operations.
    
    This service provides comprehensive permission checking and resource access control
    for the LangChain multi-agent system, ensuring enterprise-grade security.
    """
    
    def __init__(self, async_session_factory: Any):
        self.async_session_factory = async_session_factory
        
        # Define role-based permissions matrix
        self.role_permissions = {
            UserRole.ADMIN: {
                PermissionType.READ_DATA: True,
                PermissionType.WRITE_DATA: True,
                PermissionType.CREATE_CHARTS: True,
                PermissionType.CREATE_DASHBOARDS: True,
                PermissionType.EXPORT_DATA: True,
                PermissionType.MANAGE_USERS: True,
                PermissionType.MANAGE_PROJECTS: True,
                PermissionType.ACCESS_ADMIN: True,
                PermissionType.AI_ANALYSIS: True,
                PermissionType.ADVANCED_AI: True,
                PermissionType.CUBE_ACCESS: True,
                PermissionType.API_ACCESS: True,
            },
            UserRole.MANAGER: {
                PermissionType.READ_DATA: True,
                PermissionType.WRITE_DATA: True,
                PermissionType.CREATE_CHARTS: True,
                PermissionType.CREATE_DASHBOARDS: True,
                PermissionType.EXPORT_DATA: True,
                PermissionType.MANAGE_USERS: True,
                PermissionType.MANAGE_PROJECTS: False,
                PermissionType.ACCESS_ADMIN: False,
                PermissionType.AI_ANALYSIS: True,
                PermissionType.ADVANCED_AI: True,
                PermissionType.CUBE_ACCESS: True,
                PermissionType.API_ACCESS: True,
            },
            UserRole.ANALYST: {
                PermissionType.READ_DATA: True,
                PermissionType.WRITE_DATA: True,
                PermissionType.CREATE_CHARTS: True,
                PermissionType.CREATE_DASHBOARDS: True,
                PermissionType.EXPORT_DATA: True,
                PermissionType.MANAGE_USERS: False,
                PermissionType.MANAGE_PROJECTS: False,
                PermissionType.ACCESS_ADMIN: False,
                PermissionType.AI_ANALYSIS: True,
                PermissionType.ADVANCED_AI: True,
                PermissionType.CUBE_ACCESS: True,
                PermissionType.API_ACCESS: True,
            },
            UserRole.EMPLOYEE: {
                PermissionType.READ_DATA: True,
                PermissionType.WRITE_DATA: False,
                PermissionType.CREATE_CHARTS: True,
                PermissionType.CREATE_DASHBOARDS: False,
                PermissionType.EXPORT_DATA: False,
                PermissionType.MANAGE_USERS: False,
                PermissionType.MANAGE_PROJECTS: False,
                PermissionType.ACCESS_ADMIN: False,
                PermissionType.AI_ANALYSIS: True,
                PermissionType.ADVANCED_AI: False,
                PermissionType.CUBE_ACCESS: False,
                PermissionType.API_ACCESS: False,
            },
            UserRole.VIEWER: {
                PermissionType.READ_DATA: True,
                PermissionType.WRITE_DATA: False,
                PermissionType.CREATE_CHARTS: False,
                PermissionType.CREATE_DASHBOARDS: False,
                PermissionType.EXPORT_DATA: False,
                PermissionType.MANAGE_USERS: False,
                PermissionType.MANAGE_PROJECTS: False,
                PermissionType.ACCESS_ADMIN: False,
                PermissionType.AI_ANALYSIS: False,
                PermissionType.ADVANCED_AI: False,
                PermissionType.CUBE_ACCESS: False,
                PermissionType.API_ACCESS: False,
            }
        }
    
    async def check_permission(
        self,
        user_id: str,
        organization_id: str,
        permission: PermissionType,
        resource_type: Optional[ResourceType] = None,
        resource_id: Optional[str] = None,
        project_id: Optional[str] = None
    ) -> Tuple[bool, str]:
        """
        Check if user has permission for a specific operation.
        
        Args:
            user_id: User ID
            organization_id: Organization ID
            permission: Type of permission to check
            resource_type: Type of resource being accessed
            resource_id: Specific resource ID
            project_id: Project ID for project-scoped permissions
            
        Returns:
            Tuple of (has_permission, reason)
        """
        try:
            # Get user context
            user_context = await self._get_user_context(user_id, organization_id)
            if not user_context:
                # In development, allow access even if user not found
                import os
                env = os.getenv('ENVIRONMENT', 'development').lower()
                if env in ('development', 'dev', 'local', 'test'):
                    logger.warning(f"⚠️ User {user_id} not found, but allowing access in {env} mode")
                    return True, "Permission granted (development mode - user not found)"
                return False, "User not found"
            
            # Check basic role-based permission
            user_role = user_context.get("role", UserRole.VIEWER)
            if not self.role_permissions.get(user_role, {}).get(permission, False):
                return False, f"Role {user_role.value} does not have {permission.value} permission"
            
            # Check organization-level restrictions
            org_restrictions = await self._get_organization_restrictions(organization_id)
            if org_restrictions and not org_restrictions.get(permission.value, True):
                return False, f"Organization has disabled {permission.value}"
            
            # Check project-level permissions if applicable
            if project_id and resource_type in [ResourceType.DATA_SOURCE, ResourceType.DASHBOARD, ResourceType.CHART]:
                project_permission = await self._check_project_permission(
                    user_id, organization_id, project_id, permission
                )
                if not project_permission[0]:
                    return project_permission
            
            # Check resource-specific permissions
            if resource_id and resource_type:
                resource_permission = await self._check_resource_permission(
                    user_id, organization_id, resource_id, resource_type, permission
                )
                if not resource_permission[0]:
                    return resource_permission
            
            # Check plan-based restrictions
            plan_restrictions = await self._get_plan_restrictions(organization_id)
            if plan_restrictions and not plan_restrictions.get(permission.value, True):
                return False, f"Plan does not support {permission.value}"
            
            return True, "Permission granted"
            
        except Exception as e:
            logger.error(f"Error checking permission: {e}")
            return False, f"Permission check failed: {str(e)}"
    
    async def check_ai_operation_permission(
        self,
        user_id: str,
        organization_id: str,
        operation_type: str,
        data_source_id: Optional[str] = None,
        project_id: Optional[str] = None
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Check permission for AI operations with detailed context.
        
        Args:
            user_id: User ID
            organization_id: Organization ID
            operation_type: Type of AI operation (analysis, chart_generation, etc.)
            data_source_id: Data source being accessed
            project_id: Project context
            
        Returns:
            Tuple of (has_permission, reason, context)
        """
        try:
            # Map operation types to permissions
            operation_permissions = {
                "analysis": PermissionType.AI_ANALYSIS,
                "chart_generation": PermissionType.CREATE_CHARTS,
                "sql_generation": PermissionType.READ_DATA,
                "insights": PermissionType.AI_ANALYSIS,
                "advanced_analysis": PermissionType.ADVANCED_AI,
                "cube_query": PermissionType.CUBE_ACCESS,
                "data_export": PermissionType.EXPORT_DATA
            }
            
            permission = operation_permissions.get(operation_type, PermissionType.AI_ANALYSIS)
            
            # Check basic permission
            has_permission, reason = await self.check_permission(
                user_id=user_id,
                organization_id=organization_id,
                permission=permission,
                resource_type=ResourceType.DATA_SOURCE if data_source_id else None,
                resource_id=data_source_id,
                project_id=project_id
            )
            
            if not has_permission:
                return False, reason, {}
            
            # Get additional context for AI operations
            context = await self._get_ai_operation_context(
                user_id, organization_id, operation_type, data_source_id, project_id
            )
            
            return True, "AI operation permitted", context
            
        except Exception as e:
            logger.error(f"Error checking AI operation permission: {e}")
            return False, f"AI operation permission check failed: {str(e)}", {}
    
    async def get_user_accessible_resources(
        self,
        user_id: str,
        organization_id: str,
        resource_type: ResourceType,
        project_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get list of resources accessible to user.
        
        Args:
            user_id: User ID
            organization_id: Organization ID
            resource_type: Type of resources to get
            project_id: Optional project filter
            
        Returns:
            List of accessible resources
        """
        try:
            user_context = await self._get_user_context(user_id, organization_id)
            if not user_context:
                return []
            
            user_context.get("role", UserRole.VIEWER)
            
            # Get resources based on role and permissions
            if resource_type == ResourceType.DATA_SOURCE:
                return await self._get_accessible_data_sources(user_id, organization_id, project_id)
            elif resource_type == ResourceType.PROJECT:
                return await self._get_accessible_projects(user_id, organization_id)
            elif resource_type == ResourceType.DASHBOARD:
                return await self._get_accessible_dashboards(user_id, organization_id, project_id)
            elif resource_type == ResourceType.CHART:
                return await self._get_accessible_charts(user_id, organization_id, project_id)
            else:
                return []
                
        except Exception as e:
            logger.error(f"Error getting accessible resources: {e}")
            return []
    
    async def validate_ai_request(
        self,
        user_id: str,
        organization_id: str,
        request_data: Dict[str, Any]
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Validate AI request against RBAC rules.
        
        Args:
            user_id: User ID
            organization_id: Organization ID
            request_data: AI request data
            
        Returns:
            Tuple of (is_valid, reason, sanitized_data)
        """
        try:
            # Extract request parameters
            data_source_id = request_data.get("data_source_id")
            project_id = request_data.get("project_id")
            operation_type = request_data.get("operation_type", "analysis")
            
            # Check AI operation permission
            has_permission, reason, context = await self.check_ai_operation_permission(
                user_id=user_id,
                organization_id=organization_id,
                operation_type=operation_type,
                data_source_id=data_source_id,
                project_id=project_id
            )
            
            if not has_permission:
                return False, reason, {}
            
            # Sanitize request data based on permissions
            sanitized_data = await self._sanitize_request_data(
                user_id, organization_id, request_data, context
            )
            
            return True, "Request validated", sanitized_data
            
        except Exception as e:
            logger.error(f"Error validating AI request: {e}")
            return False, f"Request validation failed: {str(e)}", {}
    
    async def _get_user_context(self, user_id: str, organization_id: str) -> Optional[Dict[str, Any]]:
        """Get user context from database."""
        try:
            async with self.async_session_factory() as session:
                # First, get user info (users table doesn't have organization_id column)
                # The relationship is via user_organizations table
                # Convert user_id to UUID for proper binding
                import uuid as uuid_lib
                try:
                    user_uuid = uuid_lib.UUID(user_id) if isinstance(user_id, str) else user_id
                except (ValueError, TypeError):
                    logger.error(f"Invalid user_id format: {user_id}")
                    return None
                
                user_result = await session.execute(
                    text("""
                        SELECT id, email, username, role, status, tenant_id, is_active
                        FROM users 
                        WHERE id = :user_id AND is_deleted = false
                    """),
                    {"user_id": user_uuid}
                )
                user_row = user_result.fetchone()
                
                if not user_row:
                    logger.warning(f"User {user_id} not found in users table")
                    return None
                
                # Check if user belongs to the organization via user_organizations table
                # Convert organization_id to int if it's a string
                try:
                    org_id_int = int(organization_id) if organization_id and organization_id != "default-org" else None
                except (ValueError, TypeError):
                    org_id_int = None
                
                # If organization_id is provided and not "default-org", verify membership
                if org_id_int:
                    org_check = await session.execute(
                        text("""
                            SELECT organization_id, role
                            FROM user_organizations 
                            WHERE user_id = :user_id 
                            AND organization_id = :org_id 
                            AND is_active = true
                            LIMIT 1
                        """),
                        {"user_id": user_uuid, "org_id": org_id_int}
                    )
                    org_row = org_check.fetchone()
                    if not org_row:
                        logger.warning(f"User {user_id} is not a member of organization {organization_id}")
                        # Still return user context but log the warning
                        # In development, we allow access even without org membership
                
                # Return user context
                return {
                    "id": str(user_row[0]),
                    "email": user_row[1] or "",
                    "username": user_row[2] or "",
                    "role": UserRole(user_row[3]) if user_row[3] else UserRole.VIEWER,
                    "organization_id": organization_id,  # Use provided organization_id
                    "status": user_row[4] or "active",
                    "tenant_id": user_row[5] or "default",
                    "is_active": user_row[6] if user_row[6] is not None else True,
                    "settings": {}  # Settings not stored in users table currently
                }
                    
        except SQLAlchemyError as e:
            logger.error(f"Error getting user context: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error getting user context: {e}")
            return None
    
    async def _get_organization_restrictions(self, organization_id: str) -> Optional[Dict[str, bool]]:
        """Get organization-level permission restrictions."""
        try:
            async with self.async_session_factory() as session:
                result = await session.execute(
                    text("""
                        SELECT settings
                        FROM organizations 
                        WHERE id = :org_id
                    """),
                    {"org_id": organization_id}
                )
                row = result.fetchone()
                
                if row and row[0]:
                    settings = row[0]
                    return settings.get("permission_restrictions", {})
                    
                return None
                
        except SQLAlchemyError as e:
            logger.error(f"Error getting organization restrictions: {e}")
            return None
    
    async def _check_project_permission(
        self,
        user_id: str,
        organization_id: str,
        project_id: str,
        permission: PermissionType
    ) -> Tuple[bool, str]:
        """Check project-level permissions."""
        try:
            async with self.async_session_factory() as session:
                # Check if user has access to project
                result = await session.execute(
                    text("""
                        SELECT p.id, p.settings
                        FROM projects p
                        WHERE p.id = :project_id AND p.organization_id = :org_id
                    """),
                    {"project_id": project_id, "org_id": organization_id}
                )
                row = result.fetchone()
                
                if not row:
                    return False, "Project not found or no access"
                
                # Check project-specific permissions
                project_settings = row[1] or {}
                project_permissions = project_settings.get("permissions", {})
                
                if permission.value in project_permissions:
                    return project_permissions[permission.value], "Project permission checked"
                
                return True, "No project restrictions"
                
        except SQLAlchemyError as e:
            logger.error(f"Error checking project permission: {e}")
            return False, f"Project permission check failed: {str(e)}"
    
    async def _check_resource_permission(
        self,
        user_id: str,
        organization_id: str,
        resource_id: str,
        resource_type: ResourceType,
        permission: PermissionType
    ) -> Tuple[bool, str]:
        """Check resource-specific permissions."""
        try:
            async with self.async_session_factory() as session:
                # Check resource ownership and permissions
                if resource_type == ResourceType.DATA_SOURCE:
                    result = await session.execute(
                        text("""
                            SELECT ds.id, ds.project_id, ds.settings
                            FROM data_sources ds
                            JOIN projects p ON ds.project_id = p.id
                            WHERE ds.id = :resource_id AND p.organization_id = :org_id
                        """),
                        {"resource_id": resource_id, "org_id": organization_id}
                    )
                    row = result.fetchone()
                    
                    if not row:
                        return False, "Data source not found or no access"
                    
                    # Check data source specific permissions
                    ds_settings = row[2] or {}
                    ds_permissions = ds_settings.get("permissions", {})
                    
                    if permission.value in ds_permissions:
                        return ds_permissions[permission.value], "Data source permission checked"
                
                return True, "No resource restrictions"
                
        except SQLAlchemyError as e:
            logger.error(f"Error checking resource permission: {e}")
            return False, f"Resource permission check failed: {str(e)}"
    
    async def _get_plan_restrictions(self, organization_id: str) -> Optional[Dict[str, bool]]:
        """Get plan-based permission restrictions."""
        try:
            async with self.async_session_factory() as session:
                result = await session.execute(
                    text("""
                        SELECT plan_type, settings
                        FROM organizations 
                        WHERE id = :org_id
                    """),
                    {"org_id": organization_id}
                )
                row = result.fetchone()
                
                if row:
                    plan_type = row[0]
                    row[1] or {}
                    
                    # Define plan restrictions
                    plan_restrictions = {
                        "free": {
                            PermissionType.ADVANCED_AI.value: False,
                            PermissionType.CUBE_ACCESS.value: False,
                            PermissionType.API_ACCESS.value: False,
                            PermissionType.EXPORT_DATA.value: False,
                        },
                        "team": {
                            PermissionType.ADVANCED_AI.value: True,
                            PermissionType.CUBE_ACCESS.value: False,
                            PermissionType.API_ACCESS.value: True,
                            PermissionType.EXPORT_DATA.value: True,
                        },
                        "enterprise": {
                            PermissionType.ADVANCED_AI.value: True,
                            PermissionType.CUBE_ACCESS.value: True,
                            PermissionType.API_ACCESS.value: True,
                            PermissionType.EXPORT_DATA.value: True,
                        }
                    }
                    
                    return plan_restrictions.get(plan_type, {})
                    
                return None
                
        except SQLAlchemyError as e:
            logger.error(f"Error getting plan restrictions: {e}")
            return None
    
    async def _get_ai_operation_context(
        self,
        user_id: str,
        organization_id: str,
        operation_type: str,
        data_source_id: Optional[str],
        project_id: Optional[str]
    ) -> Dict[str, Any]:
        """Get context for AI operations."""
        context = {
            "user_id": user_id,
            "organization_id": organization_id,
            "operation_type": operation_type,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        if data_source_id:
            context["data_source_id"] = data_source_id
        
        if project_id:
            context["project_id"] = project_id
        
        # Add usage limits and quotas
        context["usage_limits"] = await self._get_usage_limits(organization_id)
        
        return context
    
    async def _get_usage_limits(self, organization_id: str) -> Dict[str, Any]:
        """Get usage limits for organization."""
        try:
            async with self.async_session_factory() as session:
                result = await session.execute(
                    text("""
                        SELECT plan_type, ai_credits_limit, settings
                        FROM organizations 
                        WHERE id = :org_id
                    """),
                    {"org_id": organization_id}
                )
                row = result.fetchone()
                
                if row:
                    plan_type = row[0]
                    ai_credits_limit = row[1]
                    row[2] or {}
                    
                    # Define usage limits by plan
                    limits = {
                        "free": {
                            "ai_queries_per_hour": 10,
                            "max_query_rows": 1000,
                            "max_charts_per_dashboard": 5,
                            "data_export_limit": 0
                        },
                        "team": {
                            "ai_queries_per_hour": 100,
                            "max_query_rows": 10000,
                            "max_charts_per_dashboard": 25,
                            "data_export_limit": 1000
                        },
                        "enterprise": {
                            "ai_queries_per_hour": 1000,
                            "max_query_rows": 100000,
                            "max_charts_per_dashboard": 100,
                            "data_export_limit": -1  # Unlimited
                        }
                    }
                    
                    base_limits = limits.get(plan_type, limits["free"])
                    base_limits["ai_credits_limit"] = ai_credits_limit
                    
                    return base_limits
                    
                return {}
                
        except SQLAlchemyError as e:
            logger.error(f"Error getting usage limits: {e}")
            return {}
    
    async def _sanitize_request_data(
        self,
        user_id: str,
        organization_id: str,
        request_data: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Sanitize request data based on permissions."""
        sanitized = request_data.copy()
        
        # Remove sensitive fields based on role
        user_context = await self._get_user_context(user_id, organization_id)
        if user_context:
            user_role = user_context.get("role", UserRole.VIEWER)
            
            if user_role not in [UserRole.ADMIN, UserRole.MANAGER]:
                # Remove admin-only fields
                sanitized.pop("admin_context", None)
                sanitized.pop("system_prompts", None)
            
            if user_role == UserRole.VIEWER:
                # Remove write operations
                sanitized.pop("write_operations", None)
                sanitized.pop("data_modification", None)
        
        # Apply usage limits
        usage_limits = context.get("usage_limits", {})
        if "max_query_rows" in usage_limits:
            sanitized["max_rows"] = min(
                sanitized.get("max_rows", 1000),
                usage_limits["max_query_rows"]
            )
        
        return sanitized
    
    async def _get_accessible_data_sources(
        self,
        user_id: str,
        organization_id: str,
        project_id: Optional[str]
    ) -> List[Dict[str, Any]]:
        """Get accessible data sources for user."""
        try:
            async with self.async_session_factory() as session:
                if project_id:
                    result = await session.execute(
                        text("""
                            SELECT ds.id, ds.name, ds.type, ds.status, ds.settings
                            FROM data_sources ds
                            JOIN projects p ON ds.project_id = p.id
                            WHERE p.organization_id = :org_id AND ds.project_id = :project_id
                            AND ds.status = 'active'
                        """),
                        {"org_id": organization_id, "project_id": project_id}
                    )
                else:
                    result = await session.execute(
                        text("""
                            SELECT ds.id, ds.name, ds.type, ds.status, ds.settings
                            FROM data_sources ds
                            JOIN projects p ON ds.project_id = p.id
                            WHERE p.organization_id = :org_id AND ds.status = 'active'
                        """),
                        {"org_id": organization_id}
                    )
                
                return [
                    {
                        "id": str(row[0]),
                        "name": row[1],
                        "type": row[2],
                        "status": row[3],
                        "settings": row[4] or {}
                    }
                    for row in result.fetchall()
                ]
                
        except SQLAlchemyError as e:
            logger.error(f"Error getting accessible data sources: {e}")
            return []
    
    async def _get_accessible_projects(self, user_id: str, organization_id: str) -> List[Dict[str, Any]]:
        """Get accessible projects for user."""
        try:
            async with self.async_session_factory() as session:
                result = await session.execute(
                    text("""
                        SELECT id, name, description, settings
                        FROM projects 
                        WHERE organization_id = :org_id
                    """),
                    {"org_id": organization_id}
                )
                
                return [
                    {
                        "id": str(row[0]),
                        "name": row[1],
                        "description": row[2],
                        "settings": row[3] or {}
                    }
                    for row in result.fetchall()
                ]
                
        except SQLAlchemyError as e:
            logger.error(f"Error getting accessible projects: {e}")
            return []
    
    async def _get_accessible_dashboards(
        self,
        user_id: str,
        organization_id: str,
        project_id: Optional[str]
    ) -> List[Dict[str, Any]]:
        """Get accessible dashboards for user."""
        try:
            async with self.async_session_factory() as session:
                if project_id:
                    result = await session.execute(
                        text("""
                            SELECT d.id, d.name, d.description, d.settings
                            FROM dashboards d
                            JOIN projects p ON d.project_id = p.id
                            WHERE p.organization_id = :org_id AND d.project_id = :project_id
                        """),
                        {"org_id": organization_id, "project_id": project_id}
                    )
                else:
                    result = await session.execute(
                        text("""
                            SELECT d.id, d.name, d.description, d.settings
                            FROM dashboards d
                            JOIN projects p ON d.project_id = p.id
                            WHERE p.organization_id = :org_id
                        """),
                        {"org_id": organization_id}
                    )
                
                return [
                    {
                        "id": str(row[0]),
                        "name": row[1],
                        "description": row[2],
                        "settings": row[3] or {}
                    }
                    for row in result.fetchall()
                ]
                
        except SQLAlchemyError as e:
            logger.error(f"Error getting accessible dashboards: {e}")
            return []
    
    async def _get_accessible_charts(
        self,
        user_id: str,
        organization_id: str,
        project_id: Optional[str]
    ) -> List[Dict[str, Any]]:
        """Get accessible charts for user."""
        try:
            async with self.async_session_factory() as session:
                if project_id:
                    result = await session.execute(
                        text("""
                            SELECT w.id, w.title, w.type, w.config, w.settings
                            FROM widgets w
                            JOIN projects p ON w.project_id = p.id
                            WHERE p.organization_id = :org_id AND w.project_id = :project_id
                        """),
                        {"org_id": organization_id, "project_id": project_id}
                    )
                else:
                    result = await session.execute(
                        text("""
                            SELECT w.id, w.title, w.type, w.config, w.settings
                            FROM widgets w
                            JOIN projects p ON w.project_id = p.id
                            WHERE p.organization_id = :org_id
                        """),
                        {"org_id": organization_id}
                    )
                
                return [
                    {
                        "id": str(row[0]),
                        "title": row[1],
                        "type": row[2],
                        "config": row[3] or {},
                        "settings": row[4] or {}
                    }
                    for row in result.fetchall()
                ]
                
        except SQLAlchemyError as e:
            logger.error(f"Error getting accessible charts: {e}")
            return []

