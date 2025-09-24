from app.common.service import BaseService
from app.modules.projects.models import (
    Project,
    Organization,
    OrganizationUser,
)
from app.modules.projects.schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationResponse,
)
from app.modules.projects.repository import ProjectRepository, OrganizationRepository
from app.db.session import get_async_session
from sqlalchemy import select
from typing import List, Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class ProjectService(
    BaseService[Project, ProjectCreate, ProjectUpdate, ProjectResponse]
):
    def __init__(self):
        repository = ProjectRepository()
        super().__init__(repository)
        self.__org_repository = OrganizationRepository()

    async def create_project(
        self, project_data: ProjectCreate, user_id: str
    ) -> ProjectResponse:
        """Create a new project for a user"""
        try:
            from app.db.session import async_session
            async with async_session() as db:
                # If no organization specified, create or get default organization
                if not project_data.organization_id:
                    default_org = await self._get_or_create_default_organization(
                        user_id, db
                    )
                    project_data.organization_id = default_org.id

                # Check if user can create projects
                can_create = await self._check_user_project_limit(
                    user_id, project_data.organization_id, db
                )
                if not can_create:
                    raise Exception(
                        "User has reached the maximum number of projects allowed"
                    )

                # Create project
                project_dict = project_data.model_dump()
                project_dict["created_by"] = (
                    user_id  # Changed from owner_id to created_by
                )

                project = await self.repository.create(project_dict, db)
                return ProjectResponse.model_validate(project.__dict__)

        except Exception as e:
            logger.error(f"Failed to create project: {str(e)}")
            raise e

    async def _get_or_create_default_organization(
        self, user_id: str, db
    ) -> Organization:
        """Get or create a default organization for a user"""
        try:
            # Check if user already has a default organization
            query = (
                select(Organization)
                .join(OrganizationUser)
                .where(
                    OrganizationUser.user_id == user_id,
                    OrganizationUser.role == "owner",
                    Organization.is_active,
                )
            )
            result = await db.execute(query)
            existing_org = result.scalar_one_or_none()

            if existing_org:
                return existing_org

            # Create new default organization
            org_data = OrganizationCreate(
                name="My Organization",
                description="Your personal organization",
                plan_type="free",
                max_projects=5,
            )

            organization = await self.__org_repository.create(org_data.model_dump(), db)

            # Add user as owner
            user_org = OrganizationUser(
                organization_id=organization.id, user_id=user_id, role="owner"
            )
            db.add(user_org)
            await db.commit()

            return organization

        except Exception as e:
            logger.error(f"Failed to get or create default organization: {str(e)}")
            raise e

    async def get_user_projects(self, user_id: str) -> List[ProjectResponse]:
        """Get all projects accessible to a user"""
        try:
            from app.db.session import async_session
            async with async_session() as db:
                projects = await self.repository.get_user_projects(user_id, db)
                return [ProjectResponse.model_validate(p.__dict__) for p in projects]
        except Exception as e:
            logger.error(f"Failed to get user projects: {str(e)}")
            raise e

    async def get_all(self) -> List[ProjectResponse]:
        """Get all active projects"""
        try:
            from app.db.session import async_session
            async with async_session() as db:
                projects = await self.repository.get_all(db)
                return [ProjectResponse.model_validate(p.__dict__) for p in projects]
        except Exception as e:
            logger.error(f"Failed to get all projects: {str(e)}")
            raise e

    async def get_project_with_data_sources(
        self, project_id: str, user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get project with data source and conversation counts"""
        try:
            from app.db.session import async_session
            async with async_session() as db:
                project = await self.repository.get_project_with_data_sources(
                    project_id, user_id, db
                )
                if not project:
                    return None
                return project

        except Exception as e:
            logger.error(f"Failed to get project with data sources: {str(e)}")
            raise e

    async def add_data_source_to_project(
        self, project_id: str, data_source_id: str, data_source_type: str, user_id: str
    ) -> bool:
        """Add a data source to a project"""
        try:
            from app.db.session import async_session
            async with async_session() as db:
                result = await self.repository.add_data_source_to_project(
                    project_id, data_source_id, data_source_type, user_id, db
                )
                return result

        except Exception as e:
            logger.error(f"Failed to add data source to project: {str(e)}")
            raise e

    async def remove_data_source_from_project(
        self, project_id: str, data_source_id: str, user_id: str
    ) -> bool:
        """Remove a data source from a project"""
        try:
            # Check if user has access to this project
            has_access = await self._check_user_project_access(user_id, project_id)
            if not has_access:
                raise Exception("User does not have access to this project")

            # Remove project data source
            success = await self.repository.remove_project_data_source(
                project_id, data_source_id
            )
            return success

        except Exception as e:
            logger.error(f"Failed to remove data source from project: {str(e)}")
            raise e

    async def get_project_data_sources(
        self, project_id: str, user_id: str
    ) -> List[Dict[str, Any]]:
        """Get all data sources in a project"""
        try:
            from app.db.session import async_session
            async with async_session() as db:
                data_sources = await self.repository.get_project_data_sources(
                    project_id, user_id, db
                )
                return data_sources

        except Exception as e:
            logger.error(f"Failed to get project data sources: {str(e)}")
            raise e

    async def _check_user_project_access(
        self, user_id: str, project_id: str, db
    ) -> bool:
        """Check if user has access to a project"""
        try:
            # For now, just check if user owns the project
            # This is a simplified version - in production you'd check organization membership
            project = await self.repository.get(project_id, db)
            if not project:
                return False

            # Owner has access
            if (
                str(project.created_by) == user_id
            ):  # Changed from owner_id to created_by
                return True

            # Public projects are accessible to everyone
            if project.is_public:
                return True

            return False

        except Exception as e:
            logger.error(f"Failed to check user project access: {str(e)}")
            return False

    async def _check_user_project_limit(
        self, user_id: str, organization_id: str, db
    ) -> bool:
        """Check if user can create more projects"""
        try:
            # Get organization plan limits
            organization = await self.__org_repository.get(organization_id, db)
            if not organization:
                return False

            organization.max_projects

            # For now, allow creation - in production you'd check current count
            return True

        except Exception as e:
            logger.error(f"Failed to check user project limit: {str(e)}")
            return False


class OrganizationService(
    BaseService[
        Organization, OrganizationCreate, OrganizationUpdate, OrganizationResponse
    ]
):
    def __init__(self):
        repository = OrganizationRepository()
        super().__init__(repository)

    async def get_all(self) -> List[OrganizationResponse]:
        """Get all organizations"""
        try:
            from app.db.session import async_session
            async with async_session() as db:
                organizations = await self.repository.get_all(db)
                return [
                    OrganizationResponse.model_validate(org.__dict__)
                    for org in organizations
                ]
        except Exception as e:
            logger.error(f"Failed to get organizations: {str(e)}")
            raise e

    async def get(self, organization_id: str) -> Optional[OrganizationResponse]:
        """Get organization by ID"""
        try:
            from app.db.session import async_session
            async with async_session() as db:
                organization = await self.repository.get(organization_id, db)
                if organization:
                    return OrganizationResponse.model_validate(organization.__dict__)
                return None
        except Exception as e:
            logger.error(f"Failed to get organization: {str(e)}")
            raise e

    async def create(
        self, organization_data: OrganizationCreate
    ) -> OrganizationResponse:
        """Create a new organization"""
        try:
            from app.db.session import async_session
            async with async_session() as db:
                organization = await self.repository.create(
                    organization_data.model_dump(), db
                )
                return OrganizationResponse.model_validate(organization.__dict__)
        except Exception as e:
            logger.error(f"Failed to create organization: {str(e)}")
            raise e

    async def update(
        self, organization_id: str, organization_data: OrganizationUpdate
    ) -> OrganizationResponse:
        """Update organization"""
        try:
            from app.db.session import async_session
            async with async_session() as db:
                organization = await self.repository.update(
                    organization_id, organization_data.model_dump(), db
                )
                return OrganizationResponse.model_validate(organization.__dict__)
        except Exception as e:
            logger.error(f"Failed to update organization: {str(e)}")
            raise e

    async def create_default_organization(self, user_id: str) -> OrganizationResponse:
        """Create a default organization for a new user"""
        try:
            from app.db.session import async_session
            async with async_session() as db:
                # Create default organization
                org_data = OrganizationCreate(
                    name="Default Organization",
                    description="Your default organization",
                    plan_type="free",
                    max_projects=1,
                )

                organization = await self.repository.create(org_data.model_dump(), db)

                # Add user as owner (simplified for now)
                # await self.repository.add_user_to_organization(
                #     organization.id, user_id, "owner"
                # )

                return OrganizationResponse.model_validate(organization.__dict__)

        except Exception as e:
            logger.error(f"Failed to create default organization: {str(e)}")
            raise e

    async def get_user_organizations(self, user_id: str) -> List[OrganizationResponse]:
        """Get all organizations a user belongs to"""
        try:
            from app.db.session import async_session
            async with async_session() as db:
                # Get organizations where user is a member
                query = (
                    select(Organization)
                    .join(OrganizationUser)
                    .where(
                        OrganizationUser.user_id == user_id,
                        OrganizationUser.is_active,
                    )
                )
                result = await db.execute(query)
                organizations = result.scalars().all()

                return [
                    OrganizationResponse.model_validate(org.__dict__)
                    for org in organizations
                ]

        except Exception as e:
            logger.error(f"Failed to get user organizations: {str(e)}")
            raise e

    async def get_all(self) -> List[OrganizationResponse]:
        """Get all active organizations"""
        try:
            from app.db.session import async_session
            async with async_session() as db:
                organizations = await self.repository.get_all(db)
                return [
                    OrganizationResponse.model_validate(org.__dict__)
                    for org in organizations
                ]
        except Exception as e:
            logger.error(f"Failed to get all organizations: {str(e)}")
            raise e

    async def get_organization_summary(
        self, organization_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get organization summary with counts"""
        try:
            from app.db.session import async_session
            async with async_session() as db:
                summary = await self.repository.get_organization_summary(
                    organization_id, db
                )
                return summary

        except Exception as e:
            logger.error(f"Failed to get organization summary: {str(e)}")
            raise e
