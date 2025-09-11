"""
Project Management Service
"""

import logging
from typing import Dict, Optional, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.modules.user.models import User
from app.modules.organizations.models import Organization, Project
from app.modules.teams.services.team_management_service import team_service
from app.core.database import get_db

logger = logging.getLogger(__name__)


class ProjectManagementService:
    """Service for managing projects within organizations"""

    def __init__(self):
        self.default_project_settings = {
            "ai_model_preference": "gpt-4o-mini",
            "chart_theme": "default",
            "auto_save": True,
            "collaboration_enabled": True,
            "data_retention_days": 90,
        }

    async def create_project(
        self,
        name: str,
        description: Optional[str],
        organization_id: int,
        created_by_user_id: int,
        is_public: bool = False,
        settings: Optional[Dict[str, Any]] = None,
        db: Session = None,
    ) -> Dict[str, Any]:
        """Create a new project"""
        try:
            if not db:
                db = next(get_db())

            # Check if user has permission to create projects
            permission = await team_service.check_user_permission(
                created_by_user_id, organization_id, "create_projects", db
            )

            if not permission.get("allowed"):
                return {
                    "success": False,
                    "error": "Insufficient permissions to create projects",
                }

            # Check organization project limits
            org = (
                db.query(Organization)
                .filter(Organization.id == organization_id)
                .first()
            )
            if not org:
                return {"success": False, "error": "Organization not found"}

            # Count existing projects
            project_count = (
                db.query(Project)
                .filter(
                    and_(
                        Project.organization_id == organization_id,
                        Project.is_active,
                    )
                )
                .count()
            )

            # Check limits based on plan
            plan_limits = {
                "free": 1,
                "starter": 5,
                "professional": 20,
                "enterprise": -1,  # Unlimited
            }

            max_projects = plan_limits.get(org.plan_type, 1)
            if max_projects != -1 and project_count >= max_projects:
                return {
                    "success": False,
                    "error": f"Project limit reached for {org.plan_type} plan",
                    "current_count": project_count,
                    "max_allowed": max_projects,
                }

            # Merge settings with defaults
            project_settings = self.default_project_settings.copy()
            if settings:
                project_settings.update(settings)

            # Create project
            project = Project(
                name=name,
                description=description,
                organization_id=organization_id,
                created_by=created_by_user_id,
                is_public=is_public,
                settings=project_settings,
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )

            db.add(project)
            db.commit()
            db.refresh(project)

            return {
                "success": True,
                "project": {
                    "id": project.id,
                    "name": project.name,
                    "description": project.description,
                    "organization_id": project.organization_id,
                    "created_by": project.created_by,
                    "is_public": project.is_public,
                    "settings": project.settings,
                    "created_at": project.created_at.isoformat(),
                    "updated_at": project.updated_at.isoformat(),
                },
            }

        except Exception as e:
            logger.error(f"Failed to create project: {e}")
            if db:
                db.rollback()
            return {"success": False, "error": str(e)}

    async def get_organization_projects(
        self,
        organization_id: int,
        user_id: int,
        include_inactive: bool = False,
        db: Session = None,
    ) -> Dict[str, Any]:
        """Get all projects for an organization"""
        try:
            if not db:
                db = next(get_db())

            # Check if user has permission to view projects
            permission = await team_service.check_user_permission(
                user_id, organization_id, "view_analytics", db
            )

            if not permission.get("allowed"):
                return {
                    "success": False,
                    "error": "Insufficient permissions to view projects",
                }

            # Build query
            query = (
                db.query(Project, User)
                .join(User, Project.created_by == User.id)
                .filter(Project.organization_id == organization_id)
            )

            if not include_inactive:
                query = query.filter(Project.is_active)

            query = query.order_by(Project.updated_at.desc())

            projects = []
            for project, creator in query:
                projects.append(
                    {
                        "id": project.id,
                        "name": project.name,
                        "description": project.description,
                        "organization_id": project.organization_id,
                        "created_by": {
                            "id": creator.id,
                            "username": creator.username,
                            "email": creator.email,
                        },
                        "is_public": project.is_public,
                        "is_active": project.is_active,
                        "settings": project.settings,
                        "created_at": project.created_at.isoformat(),
                        "updated_at": project.updated_at.isoformat(),
                    }
                )

            return {"success": True, "projects": projects, "total_count": len(projects)}

        except Exception as e:
            logger.error(f"Failed to get organization projects: {e}")
            return {"success": False, "error": str(e)}

    async def get_project_details(
        self, project_id: int, user_id: int, db: Session = None
    ) -> Dict[str, Any]:
        """Get detailed project information"""
        try:
            if not db:
                db = next(get_db())

            # Get project with creator info
            project_query = (
                db.query(Project, User, Organization)
                .join(User, Project.created_by == User.id)
                .join(Organization, Project.organization_id == Organization.id)
                .filter(Project.id == project_id)
                .first()
            )

            if not project_query:
                return {"success": False, "error": "Project not found"}

            project, creator, organization = project_query

            # Check if user has access to this project
            permission = await team_service.check_user_permission(
                user_id, project.organization_id, "view_analytics", db
            )

            if not permission.get("allowed") and not project.is_public:
                return {
                    "success": False,
                    "error": "Insufficient permissions to view this project",
                }

            # Get project statistics (conversations, charts, etc.)
            # This would integrate with chat2chart service
            stats = await self._get_project_statistics(project_id, db)

            return {
                "success": True,
                "project": {
                    "id": project.id,
                    "name": project.name,
                    "description": project.description,
                    "organization": {
                        "id": organization.id,
                        "name": organization.name,
                        "plan_type": organization.plan_type,
                    },
                    "created_by": {
                        "id": creator.id,
                        "username": creator.username,
                        "email": creator.email,
                    },
                    "is_public": project.is_public,
                    "is_active": project.is_active,
                    "settings": project.settings,
                    "statistics": stats,
                    "created_at": project.created_at.isoformat(),
                    "updated_at": project.updated_at.isoformat(),
                },
            }

        except Exception as e:
            logger.error(f"Failed to get project details: {e}")
            return {"success": False, "error": str(e)}

    async def update_project(
        self,
        project_id: int,
        user_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        is_public: Optional[bool] = None,
        settings: Optional[Dict[str, Any]] = None,
        db: Session = None,
    ) -> Dict[str, Any]:
        """Update project information"""
        try:
            if not db:
                db = next(get_db())

            # Get project
            project = db.query(Project).filter(Project.id == project_id).first()
            if not project:
                return {"success": False, "error": "Project not found"}

            # Check if user has permission to manage projects
            permission = await team_service.check_user_permission(
                user_id, project.organization_id, "manage_projects", db
            )

            if not permission.get("allowed") and project.created_by != user_id:
                return {
                    "success": False,
                    "error": "Insufficient permissions to update this project",
                }

            # Update fields
            if name is not None:
                project.name = name
            if description is not None:
                project.description = description
            if is_public is not None:
                project.is_public = is_public
            if settings is not None:
                # Merge with existing settings
                current_settings = project.settings or {}
                current_settings.update(settings)
                project.settings = current_settings

            project.updated_at = datetime.utcnow()

            db.commit()

            return {
                "success": True,
                "project": {
                    "id": project.id,
                    "name": project.name,
                    "description": project.description,
                    "is_public": project.is_public,
                    "settings": project.settings,
                    "updated_at": project.updated_at.isoformat(),
                },
            }

        except Exception as e:
            logger.error(f"Failed to update project: {e}")
            if db:
                db.rollback()
            return {"success": False, "error": str(e)}

    async def delete_project(
        self, project_id: int, user_id: int, db: Session = None
    ) -> Dict[str, Any]:
        """Delete (deactivate) a project"""
        try:
            if not db:
                db = next(get_db())

            # Get project
            project = db.query(Project).filter(Project.id == project_id).first()
            if not project:
                return {"success": False, "error": "Project not found"}

            # Check if user has permission to manage projects
            permission = await team_service.check_user_permission(
                user_id, project.organization_id, "manage_projects", db
            )

            if not permission.get("allowed") and project.created_by != user_id:
                return {
                    "success": False,
                    "error": "Insufficient permissions to delete this project",
                }

            # Soft delete (deactivate)
            project.is_active = False
            project.deleted_at = datetime.utcnow()
            project.updated_at = datetime.utcnow()

            db.commit()

            return {
                "success": True,
                "project_id": project_id,
                "deleted_at": project.deleted_at.isoformat(),
            }

        except Exception as e:
            logger.error(f"Failed to delete project: {e}")
            if db:
                db.rollback()
            return {"success": False, "error": str(e)}

    async def _get_project_statistics(
        self, project_id: int, db: Session = None
    ) -> Dict[str, Any]:
        """Get project usage statistics"""
        try:
            # This would integrate with the chat2chart service
            # For now, return mock statistics
            return {
                "conversations_count": 0,
                "charts_created": 0,
                "data_sources_connected": 0,
                "ai_queries_made": 0,
                "last_activity": None,
            }

        except Exception as e:
            logger.warning(f"Failed to get project statistics: {e}")
            return {
                "conversations_count": 0,
                "charts_created": 0,
                "data_sources_connected": 0,
                "ai_queries_made": 0,
                "last_activity": None,
            }

    async def get_user_projects(
        self, user_id: int, organization_id: Optional[int] = None, db: Session = None
    ) -> Dict[str, Any]:
        """Get all projects accessible to a user"""
        try:
            if not db:
                db = next(get_db())

            # Base query for projects user has access to
            query = db.query(Project, Organization).join(
                Organization, Project.organization_id == Organization.id
            )

            # Filter by organization if specified
            if organization_id:
                query = query.filter(Project.organization_id == organization_id)

            # Get user's organizations
            from app.modules.organizations.models import UserOrganization

            user_orgs = (
                db.query(UserOrganization.organization_id)
                .filter(
                    and_(
                        UserOrganization.user_id == user_id,
                        UserOrganization.status == "active",
                    )
                )
                .subquery()
            )

            # Filter to projects in user's organizations or public projects
            query = query.filter(
                or_(Project.organization_id.in_(user_orgs), Project.is_public)
            ).filter(Project.is_active)

            query = query.order_by(Project.updated_at.desc())

            projects = []
            for project, organization in query:
                projects.append(
                    {
                        "id": project.id,
                        "name": project.name,
                        "description": project.description,
                        "organization": {
                            "id": organization.id,
                            "name": organization.name,
                        },
                        "is_public": project.is_public,
                        "created_at": project.created_at.isoformat(),
                        "updated_at": project.updated_at.isoformat(),
                    }
                )

            return {"success": True, "projects": projects, "total_count": len(projects)}

        except Exception as e:
            logger.error(f"Failed to get user projects: {e}")
            return {"success": False, "error": str(e)}


# Global service instance
project_service = ProjectManagementService()
