from app.common.service import BaseService
from app.modules.projects.models import (
    Project,
    Organization,
    UserOrganization,
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
from sqlalchemy import select
from typing import List, Optional, Dict, Any
import logging
from fastapi import HTTPException, status
from app.modules.pricing.rate_limiter import RateLimiter

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

                # Ensure created_at/updated_at present to satisfy NOT NULL
                # constraints on some DB states during CI/dev.
                from datetime import datetime
                now = datetime.utcnow()
                if 'created_at' not in project_dict:
                    project_dict['created_at'] = now
                if 'updated_at' not in project_dict:
                    project_dict['updated_at'] = now

                project = await self.repository.create(project_dict, db)
                # Convert UUID fields to strings for Pydantic validation
                project_dict = project.__dict__.copy()
                if 'created_by' in project_dict and project_dict['created_by']:
                    project_dict['created_by'] = str(project_dict['created_by'])
                return ProjectResponse.model_validate(project_dict)

        except Exception as e:
            logger.error(f"Failed to create project: {str(e)}")
            raise e

    async def _get_or_create_default_organization(
        self, user_id: str, db
    ) -> Organization:
        """Get or create a default organization for a user"""
        try:
            # If no user_id provided, create a default organization record
            # but do not attempt to add a user membership.
            if not user_id:
                default_name = "My Organization"
                slug = "my-organization"
                org_data = OrganizationCreate(
                    name=default_name,
                    slug=slug,
                    description="Your personal organization",
                    plan_type="free",
                    max_projects=5,
                )
                organization = await self.__org_repository.create(org_data.model_dump(), db)
                return organization

            # Check if user already has a default organization
            # Normalize user_id to int when possible to avoid SQL type-mismatch
            try:
                _uid = int(user_id)
            except Exception:
                _uid = None

            query = (
                select(Organization)
                .join(UserOrganization)
                .where(
                    (UserOrganization.user_id == _uid) if _uid is not None else (UserOrganization.user_id == user_id),
                    UserOrganization.role == "owner",
                    Organization.is_active,
                )
            )
            result = await db.execute(query)
            existing_org = result.scalar_one_or_none()

            if existing_org:
                return existing_org

            # Create new default organization with a deterministic slug
            default_name = "My Organization"
            # include short user fingerprint to reduce slug collisions
            slug = f"my-organization-{str(user_id)[:8]}"
            org_data = OrganizationCreate(
                name=default_name,
                slug=slug,
                description="Your personal organization",
                plan_type="free",
                max_projects=5,
            )

            # Repository.create now accepts an optional db session
            organization = await self.__org_repository.create(org_data.model_dump(), db)

            # Add user as owner
            user_org = UserOrganization(
                organization_id=organization.id, user_id=(int(user_id) if str(user_id).isdigit() else user_id), role="owner"
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
                # Convert UUID fields to strings for Pydantic validation
                result = []
                for p in projects:
                    project_dict = p.__dict__.copy()
                    if 'created_by' in project_dict and project_dict['created_by']:
                        project_dict['created_by'] = str(project_dict['created_by'])
                    result.append(ProjectResponse.model_validate(project_dict))
                return result
        except Exception as e:
            logger.error(f"Failed to get user projects: {str(e)}")
            raise e

    async def get_all(self) -> List[ProjectResponse]:
        """Get all active projects"""
        try:
            from app.db.session import async_session
            async with async_session() as db:
                projects = await self.repository.get_all(db)
                # Convert UUID fields to strings for Pydantic validation
                result = []
                for p in projects:
                    project_dict = p.__dict__.copy()
                    if 'created_by' in project_dict and project_dict['created_by']:
                        project_dict['created_by'] = str(project_dict['created_by'])
                    result.append(ProjectResponse.model_validate(project_dict))
                return result
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
                str(project.created_by) == str(user_id)
            ):  # Compare as strings to handle UUID vs integer ids
                return True

            # Public projects are accessible to everyone
            if project.is_public:
                return True

            return False

        except Exception as e:
            logger.error(f"Failed to check user project access: {str(e)}")
            return False

    async def _check_user_project_limit(
        self, user_id: str, organization_id: int, db
    ) -> bool:
        """Check if user can create more projects"""
        try:
            try:
                org_id = int(organization_id)
            except (TypeError, ValueError):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid organization id",
                )

            res = await db.execute(select(Organization).where(Organization.id == org_id))
            organization = res.scalar_one_or_none()
            if not organization:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Organization not found",
                )

            rate_limiter = RateLimiter(db)
            allowed, message, _ = await rate_limiter.check_project_limit(org_id)
            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=message,
                )

            return True

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to check user project limit: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to verify project limit",
            )


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
                coerced: List[OrganizationResponse] = []
                from datetime import datetime
                for org in organizations:
                    d = dict(getattr(org, "__dict__", {}) or {})
                    # CRITICAL: Ensure plan_type is always included and not None
                    d["plan_type"] = d.get("plan_type") or "free"
                    # Ensure plan_type is a string, not None
                    if d["plan_type"] is None:
                        d["plan_type"] = "free"
                    d["ai_credits_used"] = int(d.get("ai_credits_used") or 0)
                    d["ai_credits_limit"] = int(d.get("ai_credits_limit") or 0)
                    d["max_users"] = int(d.get("max_users") or 0)
                    d["max_projects"] = int(d.get("max_projects") or 0)
                    d["max_storage_gb"] = int(d.get("max_storage_gb") or 0)
                    d["is_active"] = bool(d.get("is_active") if d.get("is_active") is not None else True)
                    # trial fields may not exist on all models; default safely when missing
                    d["is_trial_active"] = bool(d.get("is_trial_active") or False)
                    # Ensure timestamps
                    d["created_at"] = d.get("created_at") or datetime.utcnow()
                    d["updated_at"] = d.get("updated_at") or datetime.utcnow()
                    coerced.append(OrganizationResponse.model_validate(d))
                return coerced
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
                    d = dict(getattr(organization, "__dict__", {}) or {})
                    # Coerce NULL/None values to sensible defaults expected by the schema
                    d["plan_type"] = d.get("plan_type") or "free"
                    d["ai_credits_used"] = int(d.get("ai_credits_used") or 0)
                    d["ai_credits_limit"] = int(d.get("ai_credits_limit") or 0)
                    d["max_users"] = int(d.get("max_users") or 0)
                    d["max_projects"] = int(d.get("max_projects") or 0)
                    d["max_storage_gb"] = int(d.get("max_storage_gb") or 0)
                    d["is_active"] = bool(d.get("is_active") if d.get("is_active") is not None else True)
                    d["is_deleted"] = bool(d.get("is_deleted") or False)
                    d["is_trial_active"] = bool(d.get("is_trial_active") or False)
                    from datetime import datetime
                    d["created_at"] = d.get("created_at") or datetime.utcnow()
                    d["updated_at"] = d.get("updated_at") or datetime.utcnow()
                    return OrganizationResponse.model_validate(d)
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
                # Convert organization_id to integer if it's a string
                try:
                    org_id_int = int(organization_id) if isinstance(organization_id, str) and organization_id.isdigit() else organization_id
                except (ValueError, TypeError):
                    org_id_int = organization_id
                
                organization = await self.repository.update(
                    org_id_int, organization_data.model_dump(), db
                )
                if not organization:
                    raise HTTPException(status_code=404, detail="Organization not found")
                
                # Refresh the organization from DB to get all fields
                refreshed = await self.repository.get(org_id_int, db)
                if not refreshed:
                    raise HTTPException(status_code=404, detail="Organization not found after update")
                
                d = dict(getattr(refreshed, "__dict__", {}) or {})
                # Coerce NULL/None values to sensible defaults expected by the schema
                d["plan_type"] = d.get("plan_type") or "free"
                d["ai_credits_used"] = int(d.get("ai_credits_used") or 0) if d.get("ai_credits_used") is not None else 0
                d["ai_credits_limit"] = int(d.get("ai_credits_limit") or 0) if d.get("ai_credits_limit") is not None else 0
                d["max_users"] = int(d.get("max_users") or 0) if d.get("max_users") is not None else 0
                d["max_projects"] = int(d.get("max_projects") or 0) if d.get("max_projects") is not None else 0
                d["max_storage_gb"] = int(d.get("max_storage_gb") or 0) if d.get("max_storage_gb") is not None else 0
                d["is_active"] = bool(d.get("is_active")) if d.get("is_active") is not None else True
                d["is_deleted"] = bool(d.get("is_deleted")) if d.get("is_deleted") is not None else False
                d["is_trial_active"] = bool(d.get("is_trial_active")) if d.get("is_trial_active") is not None else False
                from datetime import datetime
                d["created_at"] = d.get("created_at") or datetime.utcnow()
                d["updated_at"] = d.get("updated_at") or datetime.utcnow()
                return OrganizationResponse.model_validate(d)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to update organization: {str(e)}")
            raise e

    async def create_default_organization(self, user_id: str) -> OrganizationResponse:
        """Create a default organization for a new user"""
        try:
            from app.db.session import async_session
            async with async_session() as db:
                # Create default organization
                # Ensure slug is always provided to avoid NOT NULL constraint failures
                import uuid as _uuid
                short = str(_uuid.uuid4()).split('-')[0]
                slug_val = f"default-organization-{short}"
                org_data = OrganizationCreate(
                    name="Default Organization",
                    slug=slug_val,
                    description="Your default organization",
                    plan_type="free",
                    max_projects=1,
                )

                organization = await self.repository.create(org_data.model_dump(), db)

                # Add user as owner (simplified for now)
                try:
                    if user_id:
                        from app.modules.projects.models import UserOrganization
                        uid_val = None
                        try:
                            uid_val = int(user_id)
                        except Exception:
                            uid_val = user_id
                        ou = UserOrganization(organization_id=organization.id, user_id=uid_val, role="owner", is_active=True)
                        db.add(ou)
                        await db.commit()
                except Exception:
                    # non-fatal; proceed even if membership insert fails
                    try:
                        await db.rollback()
                    except Exception:
                        pass

                return OrganizationResponse.model_validate(organization.__dict__)

        except Exception as e:
            logger.error(f"Failed to create default organization: {str(e)}")
            raise e

    async def get_user_organizations(self, user_id: str) -> List[OrganizationResponse]:
        """Get all organizations a user belongs to"""
        try:
            from app.db.session import async_session
            async with async_session() as db:
                # If caller passed a JWT payload dict (common in create flows),
                # try to resolve it to the canonical user id (UUID) or legacy int
                # before building the query. This avoids SQLAlchemy attempting to
                # bind a Python dict or the string 'None' into a UUID parameter.
                _uid = None
                final_user_val = None
                try:
                    if isinstance(user_id, dict):
                        # Try explicit id fields first
                        maybe = user_id.get('id') or user_id.get('user_id') or user_id.get('sub')
                        if maybe is not None:
                            try:
                                _uid = int(maybe)
                                final_user_val = _uid
                            except Exception:
                                final_user_val = maybe
                        else:
                            # Try email/username lookup
                            email = user_id.get('email')
                            username = user_id.get('username')
                            if email or username:
                                q = select(User).where((User.email == email) if email else (User.username == username))
                                pres = await db.execute(q)
                                u = pres.scalar_one_or_none()
                                if u:
                                    final_user_val = u.id
                    else:
                        # Try to convert to UUID if it's a UUID string
                        try:
                            import uuid as uuid_lib
                            # Try UUID first (most common case)
                            try:
                                final_user_val = uuid_lib.UUID(str(user_id))
                            except (ValueError, TypeError):
                                # If not UUID, try int
                                try:
                                    final_user_val = int(user_id)
                                except (ValueError, TypeError):
                                    final_user_val = str(user_id)
                        except Exception:
                            final_user_val = user_id

                except Exception:
                    _uid = None
                    # Try to convert to UUID if it's a UUID string
                    try:
                        import uuid as uuid_lib
                        try:
                            final_user_val = uuid_lib.UUID(str(user_id))
                        except (ValueError, TypeError):
                            final_user_val = user_id
                    except Exception:
                        final_user_val = user_id

                # If we couldn't resolve a usable user identifier, return empty
                # list rather than passing 'None' into a UUID-typed query param.
                if final_user_val is None:
                    return []

                # Build query using resolved value (int or UUID/string)
                # user_id in UserOrganization is UUID type, so ensure proper comparison
                query = (
                    select(Organization)
                    .join(UserOrganization)
                    .where(
                        UserOrganization.user_id == final_user_val,
                        UserOrganization.is_active == True,
                    )
                )
                result = await db.execute(query)
                organizations = result.scalars().all()

                # Coerce organizations to ensure plan_type and other fields are properly set
                coerced: List[OrganizationResponse] = []
                from datetime import datetime
                for org in organizations:
                    d = dict(getattr(org, "__dict__", {}) or {})
                    # CRITICAL: Only set default if plan_type is truly missing - don't override valid values
                    # Log if we're defaulting to help debug
                    original_plan_type = d.get("plan_type")
                    if not original_plan_type or (isinstance(original_plan_type, str) and original_plan_type.strip() == ''):
                        logger.warning(f"Organization {d.get('id')} ({d.get('name')}) missing plan_type, defaulting to 'free'")
                        d["plan_type"] = "free"
                    else:
                        # Ensure it's a string and not None
                        d["plan_type"] = str(original_plan_type) if original_plan_type else "free"
                        logger.debug(f"Organization {d.get('id')} ({d.get('name')}) has plan_type: {d['plan_type']}")
                    d["ai_credits_used"] = int(d.get("ai_credits_used") or 0)
                    d["ai_credits_limit"] = int(d.get("ai_credits_limit") or 0)
                    d["max_users"] = int(d.get("max_users") or 0)
                    d["max_projects"] = int(d.get("max_projects") or 0)
                    d["max_storage_gb"] = int(d.get("max_storage_gb") or 0)
                    d["is_active"] = bool(d.get("is_active") if d.get("is_active") is not None else True)
                    d["is_deleted"] = bool(d.get("is_deleted") or False)
                    d["is_trial_active"] = bool(d.get("is_trial_active") or False)
                    d["created_at"] = d.get("created_at") or datetime.utcnow()
                    d["updated_at"] = d.get("updated_at") or datetime.utcnow()
                    coerced.append(OrganizationResponse.model_validate(d))
                return coerced

        except Exception as e:
            logger.error(f"Failed to get user organizations: {str(e)}")
            raise e

    async def get_all(self) -> List[OrganizationResponse]:
        """Get all active organizations, coercing nullable fields to safe defaults"""
        try:
            from app.db.session import async_session
            async with async_session() as db:
                organizations = await self.repository.get_all(db)
                coerced: List[OrganizationResponse] = []
                from datetime import datetime
                for org in organizations:
                    d = dict(getattr(org, "__dict__", {}) or {})
                    # Coerce NULL/None values to sensible defaults expected by the schema
                    d["plan_type"] = d.get("plan_type") or "free"
                    d["ai_credits_used"] = int(d.get("ai_credits_used") or 0)
                    d["ai_credits_limit"] = int(d.get("ai_credits_limit") or 0)
                    d["max_users"] = int(d.get("max_users") or 0)
                    d["max_projects"] = int(d.get("max_projects") or 0)
                    d["max_storage_gb"] = int(d.get("max_storage_gb") or 0)
                    d["is_active"] = bool(d.get("is_active") if d.get("is_active") is not None else True)
                    # Trial fields may not exist on all models; default safely when missing
                    d["is_trial_active"] = bool(d.get("is_trial_active") or False)
                    # Ensure timestamps
                    d["created_at"] = d.get("created_at") or datetime.utcnow()
                    d["updated_at"] = d.get("updated_at") or datetime.utcnow()
                    coerced.append(OrganizationResponse.model_validate(d))
                return coerced
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
