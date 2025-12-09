"""
Context Enrichment Service for LangChain Agent Integration

This service enriches agent context with user, organization, project, and data source information
from the existing PostgreSQL schema to provide comprehensive context for AI operations.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from uuid import UUID

from sqlalchemy.future import select
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.modules.chats.schemas import (
    AgentContextSchema,
    UserRole
)
from app.modules.chats.conversations.models import ChatConversation

logger = logging.getLogger(__name__)


class ContextEnrichmentService:
    """
    Service for enriching agent context with comprehensive user and organization data.
    
    This service fetches user roles, organization settings, project information,
    and data source permissions to create rich context for AI operations.
    """
    
    def __init__(self, async_session_factory: Any):
        self.async_session_factory = async_session_factory
    
    async def enrich_conversation_context(
        self,
        conversation_id: UUID,
        user_id: str,
        organization_id: str,
        project_id: Optional[str] = None
    ) -> AgentContextSchema:
        """
        Enrich conversation context with comprehensive user and organization data asynchronously.
        
        Args:
            conversation_id: UUID of the conversation
            user_id: User ID
            organization_id: Organization ID
            project_id: Optional project ID
            
        Returns:
            Enriched AgentContextSchema
        """
        try:
            # Fetch user information
            user_info = await self._get_user_info(user_id)
            if not user_info:
                raise ValueError(f"User {user_id} not found")
            
            # Fetch organization information
            org_info = await self._get_organization_info(organization_id)
            if not org_info:
                raise ValueError(f"Organization {organization_id} not found")
            
            # Fetch project information if provided
            project_info = None
            if project_id:
                project_info = await self._get_project_info(project_id)
            
            # Fetch available data sources
            data_sources = await self._get_available_data_sources(user_id, organization_id, project_id)
            
            # Build permissions
            permissions = self._build_user_permissions(user_info, org_info, project_info)
            
            # Create enriched context
            context = AgentContextSchema(
                user_id=user_id,
                user_role=UserRole(user_info.get("role", "employee")),
                organization_id=organization_id,
                project_id=project_id,
                data_sources=data_sources,
                permissions=permissions,
                plan_type=org_info.get("plan_type"),
                ai_credits_limit=org_info.get("ai_credits_limit"),
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            
            # Save context to conversation
            await self._save_context_to_conversation(conversation_id, context)
            
            return context
            
        except Exception as e:
            logger.error(f"Error enriching conversation context: {e}")
            # Return minimal context as fallback
            return AgentContextSchema(
                user_id=user_id,
                user_role=UserRole.EMPLOYEE,
                organization_id=organization_id,
                project_id=project_id,
                data_sources=[],
                permissions={},
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
    
    async def _get_user_info(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Fetch user information from database asynchronously."""
        try:
            async with self.async_session_factory() as session:
                # Users table doesn't have organization_id column - it's in user_organizations
                # Convert user_id to UUID for proper binding
                import uuid as uuid_lib
                try:
                    user_uuid = uuid_lib.UUID(user_id) if isinstance(user_id, str) else user_id
                except (ValueError, TypeError):
                    logger.error(f"Invalid user_id format: {user_id}")
                    return None
                
                result = await session.execute(
                    text("""
                        SELECT id, email, username, role, status, tenant_id, is_active
                        FROM users 
                        WHERE id = :user_id AND is_deleted = false
                    """),
                    {"user_id": user_uuid}
                )
                row = result.fetchone()
                
                if row:
                    # Get user's primary organization from user_organizations table
                    org_result = await session.execute(
                        text("""
                            SELECT organization_id 
                            FROM user_organizations 
                            WHERE user_id = :user_id 
                            AND is_active = true 
                            ORDER BY created_at ASC 
                            LIMIT 1
                        """),
                        {"user_id": user_uuid}
                    )
                    org_row = org_result.fetchone()
                    organization_id = str(org_row[0]) if org_row else None
                    
                    return {
                        "id": str(row[0]),
                        "email": row[1] or "",
                        "username": row[2] or "",
                        "role": row[3] or "user",
                        "organization_id": organization_id,
                        "status": row[4] or "active",
                        "tenant_id": row[5] or "default",
                        "is_active": row[6] if row[6] is not None else True,
                        "settings": {}  # Settings not stored in users table currently
                    }
                    
                return None
                
        except SQLAlchemyError as e:
            logger.error(f"Error fetching user info: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error fetching user info: {e}")
            return None
    
    async def _get_organization_info(self, organization_id: str) -> Optional[Dict[str, Any]]:
        """Fetch organization information from database asynchronously."""
        try:
            # Convert organization_id to int if it's a string representation of an integer
            try:
                org_id_int = int(organization_id) if organization_id and organization_id.isdigit() else organization_id
            except (ValueError, AttributeError):
                org_id_int = organization_id
            
            async with self.async_session_factory() as session:
                result = await session.execute(
                    text("""
                        SELECT id, name, plan_type, ai_credits_limit
                        FROM organizations 
                        WHERE id = :org_id
                    """),
                    {"org_id": org_id_int}
                )
                row = result.fetchone()
                
                if row:
                    return {
                        "id": str(row[0]),
                        "name": row[1],
                        "plan_type": row[2] or "free",
                        "settings": {},  # Settings column doesn't exist, use empty dict
                        "ai_credits_limit": row[3] or 0
                    }
                    
                return None
                
        except SQLAlchemyError as e:
            logger.error(f"Error fetching organization info: {e}")
            return None
    
    async def _get_project_info(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Fetch project information from database asynchronously."""
        try:
            async with self.async_session_factory() as session:
                result = await session.execute(
                    text("""
                        SELECT id, name, description, organization_id, settings
                        FROM projects 
                        WHERE id = :project_id
                    """),
                    {"project_id": project_id}
                )
                row = result.fetchone()
                
                if row:
                    return {
                        "id": str(row[0]),
                        "name": row[1],
                        "description": row[2],
                        "organization_id": str(row[3]),
                        "settings": row[4] or {}
                    }
                    
                return None
                
        except SQLAlchemyError as e:
            logger.error(f"Error fetching project info: {e}")
            return None
    
    async def _get_available_data_sources(
        self,
        user_id: str,
        organization_id: str,
        project_id: Optional[str]
    ) -> List[str]:
        """Fetch available data sources for the user asynchronously."""
        try:
            async with self.async_session_factory() as session:
                # Data sources table doesn't have project_id or status columns
                # Just get all data sources for now (can be filtered by tenant_id or user_id later)
                result = await session.execute(
                    text("""
                        SELECT id
                        FROM data_sources
                        WHERE type = 'database'
                        ORDER BY created_at DESC
                        LIMIT 50
                    """)
                )
                
                return [str(row[0]) for row in result.fetchall()]
                
        except SQLAlchemyError as e:
            logger.error(f"Error fetching data sources: {e}")
            return []
    
    def _build_user_permissions(
        self,
        user_info: Dict[str, Any],
        org_info: Dict[str, Any],
        project_info: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Build comprehensive user permissions based on role and context."""
        role = user_info.get("role", "employee")
        permissions = {
            "can_read_data": True,
            "can_write_data": False,
            "can_create_charts": True,
            "can_create_dashboards": False,
            "can_export_data": False,
            "can_manage_users": False,
            "can_manage_projects": False,
            "can_access_admin": False,
            "max_query_rows": 1000,
            "max_charts_per_dashboard": 10,
            "ai_queries_per_hour": 50
        }
        
        # Role-based permissions
        if role == "admin":
            permissions.update({
                "can_write_data": True,
                "can_create_dashboards": True,
                "can_export_data": True,
                "can_manage_users": True,
                "can_manage_projects": True,
                "can_access_admin": True,
                "max_query_rows": 10000,
                "max_charts_per_dashboard": 50,
                "ai_queries_per_hour": 200
            })
        elif role == "manager":
            permissions.update({
                "can_write_data": True,
                "can_create_dashboards": True,
                "can_export_data": True,
                "can_manage_users": True,
                "max_query_rows": 5000,
                "max_charts_per_dashboard": 25,
                "ai_queries_per_hour": 100
            })
        elif role == "analyst":
            permissions.update({
                "can_write_data": True,
                "can_create_dashboards": True,
                "can_export_data": True,
                "max_query_rows": 2000,
                "max_charts_per_dashboard": 20,
                "ai_queries_per_hour": 75
            })
        
        # Plan-based adjustments
        plan_type = org_info.get("plan_type", "free")
        if plan_type == "enterprise":
            permissions["ai_queries_per_hour"] *= 2
            permissions["max_query_rows"] *= 2
        elif plan_type == "team":
            permissions["ai_queries_per_hour"] = int(permissions["ai_queries_per_hour"] * 1.5)
        
        # Project-specific permissions
        if project_info:
            project_settings = project_info.get("settings", {})
            if project_settings.get("allow_data_export"):
                permissions["can_export_data"] = True
            if project_settings.get("max_query_rows"):
                permissions["max_query_rows"] = min(
                    permissions["max_query_rows"],
                    project_settings["max_query_rows"]
                )
        
        return permissions
    
    async def _save_context_to_conversation(
        self,
        conversation_id: UUID,
        context: AgentContextSchema
    ) -> bool:
        """Save enriched context to conversation asynchronously."""
        try:
            async with self.async_session_factory() as session:
                result = await session.execute(
                    select(ChatConversation).filter(
                        ChatConversation.id == conversation_id
                    )
                )
                conversation = result.scalar_one_or_none()
                
                if conversation:
                    # CRITICAL: Serialize datetime objects to ISO strings for JSONB storage
                    from datetime import datetime
                    context_dict = context.dict() if hasattr(context, 'dict') else context.model_dump()
                    
                    def serialize_datetime(obj):
                        """Recursively serialize datetime objects to ISO format strings"""
                        if isinstance(obj, datetime):
                            return obj.isoformat()
                        elif isinstance(obj, dict):
                            return {k: serialize_datetime(v) for k, v in obj.items()}
                        elif isinstance(obj, list):
                            return [serialize_datetime(item) for item in obj]
                        return obj
                    
                    context_dict = serialize_datetime(context_dict)
                    conversation.agent_context = context_dict
                    await session.commit()
                    return True
                    
                return False
                
        except SQLAlchemyError as e:
            logger.error(f"Error saving context to conversation: {e}")
            return False
    
    async def update_context_on_change(
        self,
        conversation_id: UUID,
        change_type: str,
        change_data: Dict[str, Any]
    ) -> bool:
        """
        Update context when user, organization, or project changes asynchronously.
        
        Args:
            conversation_id: UUID of the conversation
            change_type: Type of change (user_role, organization, project, data_source)
            change_data: Data about the change
            
        Returns:
            True if successful, False otherwise
        """
        try:
            async with self.async_session_factory() as session:
                result = await session.execute(
                    select(ChatConversation).filter(
                        ChatConversation.id == conversation_id
                    )
                )
                conversation = result.scalar_one_or_none()
                
                if not conversation or not conversation.agent_context:
                    return False
                
                # Load existing context
                context = AgentContextSchema(**conversation.agent_context)
                
                # Update based on change type
                if change_type == "user_role":
                    context.user_role = UserRole(change_data.get("new_role", "employee"))
                elif change_type == "organization":
                    context.plan_type = change_data.get("plan_type")
                    context.ai_credits_limit = change_data.get("ai_credits_limit")
                elif change_type == "project":
                    context.project_id = change_data.get("project_id")
                elif change_type == "data_source":
                    # Refresh data sources
                    data_sources = await self._get_available_data_sources(
                        context.user_id,
                        context.organization_id,
                        context.project_id
                    )
                    context.data_sources = data_sources
                
                context.updated_at = datetime.now(timezone.utc)
                
                # Save updated context
                conversation.agent_context = context.dict()
                await session.commit()
                
                return True
                
        except Exception as e:
            logger.error(f"Error updating context on change: {e}")
            return False
    
    async def enrich_agent_context(
        self,
        agent_context: AgentContextSchema,
        user_id: Any = None,
        organization_id: Any = None,
        project_id: Optional[Any] = None,
        data_source_id: Optional[str] = None
    ) -> AgentContextSchema:
        """
        Enrich an existing agent context with additional information.
        
        This method is used to update an existing AgentContextSchema with fresh data
        from the database, including user info, organization info, and data sources.
        
        Args:
            agent_context: Existing AgentContextSchema to enrich
            user_id: User ID
            organization_id: Organization ID
            project_id: Optional project ID
            data_source_id: Optional data source ID to include
            
        Returns:
            Enriched AgentContextSchema
        """
        try:
            # Convert UUID to string if needed
            user_id_str = str(user_id) if user_id else None
            organization_id_str = str(organization_id) if organization_id else None
            project_id_str = str(project_id) if project_id else None
            
            # Fetch fresh user information
            user_info = await self._get_user_info(user_id_str) if user_id_str else None
            if user_info:
                # Update user role if available
                try:
                    agent_context.user_role = UserRole(user_info.get("role", "employee"))
                except (ValueError, KeyError):
                    logger.warning(f"Invalid role '{user_info.get('role')}', keeping existing role")
            
            # Fetch fresh organization information
            org_info = await self._get_organization_info(organization_id_str) if organization_id_str else None
            if org_info:
                agent_context.plan_type = org_info.get("plan_type")
                agent_context.ai_credits_limit = org_info.get("ai_credits_limit")
            
            # Fetch available data sources
            if user_id_str and organization_id_str:
                data_sources = await self._get_available_data_sources(user_id_str, organization_id_str, project_id_str)
            else:
                data_sources = agent_context.data_sources if agent_context.data_sources else []
            
            # Add the specified data source if provided and not already in list
            if data_source_id and data_source_id not in data_sources:
                data_sources.append(data_source_id)
            
            agent_context.data_sources = data_sources
            
            # Rebuild permissions with fresh data
            if user_info and org_info:
                project_info = None
                if project_id_str:
                    project_info = await self._get_project_info(project_id_str)
                agent_context.permissions = self._build_user_permissions(user_info, org_info, project_info)
            
            # Update timestamp
            agent_context.updated_at = datetime.now(timezone.utc)
            
            return agent_context
            
        except Exception as e:
            logger.error(f"Error enriching agent context: {e}")
            # Return original context if enrichment fails
            return agent_context
    
    async def get_context_summary(self, conversation_id: UUID) -> Dict[str, Any]:
        """
        Get a summary of the current context for debugging/monitoring asynchronously.
        
        Args:
            conversation_id: UUID of the conversation
            
        Returns:
            Dictionary with context summary
        """
        try:
            async with self.async_session_factory() as session:
                result = await session.execute(
                    select(ChatConversation).filter(
                        ChatConversation.id == conversation_id
                    )
                )
                conversation = result.scalar_one_or_none()
                
                if not conversation or not conversation.agent_context:
                    return {"error": "No context found"}
                
                context = AgentContextSchema(**conversation.agent_context)
                
                return {
                    "user_id": context.user_id,
                    "user_role": context.user_role,
                    "organization_id": context.organization_id,
                    "project_id": context.project_id,
                    "data_sources_count": len(context.data_sources),
                    "plan_type": context.plan_type,
                    "ai_credits_limit": context.ai_credits_limit,
                    "permissions": context.permissions,
                    "created_at": context.created_at.isoformat(),
                    "updated_at": context.updated_at.isoformat()
                }
                
        except Exception as e:
            logger.error(f"Error getting context summary: {e}")
            return {"error": str(e)}

