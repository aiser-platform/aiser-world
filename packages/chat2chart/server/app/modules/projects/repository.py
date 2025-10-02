from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, cast
from sqlalchemy import String

from app.common.repository import BaseRepository
from app.modules.projects.models import (
    Project,
    Organization,
    ProjectDataSource,
    OrganizationUser,
)
from app.modules.projects.schemas import (
    ProjectCreate,
    ProjectUpdate,
    OrganizationCreate,
    OrganizationUpdate,
)


class ProjectRepository(BaseRepository[Project, ProjectCreate, ProjectUpdate]):
    """Repository for Project operations"""

    def __init__(self):
        super().__init__(Project)

    async def get_user_projects(self, user_id: str, db: AsyncSession) -> List[Project]:
        """Get all projects for a specific user"""
        try:
            # Normalize user_id: if it can be coerced to int we'll preserve numeric value
            # but compare against Project.created_by as a string to avoid UUID vs int SQL errors.
            try:
                uid = int(user_id)
            except Exception:
                uid = None

            # Get projects where user is owner or has access
            if uid is not None:
                # Compare created_by (UUID) as string to avoid operator mismatches
                uid_str = str(uid)
                query = select(Project).where((cast(Project.created_by, String) == uid_str) | (Project.is_public))
            else:
                # If user_id isn't numeric, compare directly as string where possible
                try:
                    query = select(Project).where((cast(Project.created_by, String) == str(user_id)) | (Project.is_public))
                except Exception:
                    # fallback: only public projects if comparison is unsafe
                    query = select(Project).where(Project.is_public)
            result = await db.execute(query)
            return result.scalars().all()
        except Exception as e:
            print(f"Error getting user projects: {e}")
            return []

    async def get_all(self, db: AsyncSession) -> List[Project]:
        """Get all projects"""
        try:
            query = select(Project).where(Project.is_active)
            result = await db.execute(query)
            return result.scalars().all()
        except Exception as e:
            print(f"Error getting all projects: {e}")
            return []

    async def get_project_with_data_sources(
        self, project_id: str, user_id: str, db: AsyncSession
    ) -> Optional[Dict[str, Any]]:
        """Get project with data source counts"""
        try:
            query = select(Project).where(Project.id == project_id)
            result = await db.execute(query)
            project = result.scalar_one_or_none()

            if not project:
                return None

            # Check if user has access (coerce types)
            try:
                _uid = int(user_id)
            except Exception:
                _uid = None

            if (_uid is not None and project.owner_id != _uid) and not project.is_public:
                return None

            # Get data source count
            ds_query = select(ProjectDataSource).where(
                ProjectDataSource.project_id == project_id,
                ProjectDataSource.is_active,
            )
            ds_result = await db.execute(ds_query)
            data_sources = ds_result.scalars().all()

            return {
                "id": project.id,  # Changed from str(project.id) to project.id
                "name": project.name,
                "description": project.description,
                "organization_id": project.organization_id,  # Changed from str(project.organization_id) to project.organization_id
                "created_by": project.created_by,  # Changed from owner_id to created_by
                "is_public": project.is_public,
                "is_active": project.is_active,
                "settings": project.settings,
                "created_at": project.created_at.isoformat()
                if project.created_at
                else None,
                "updated_at": project.updated_at.isoformat()
                if project.updated_at
                else None,
                "data_source_count": len(data_sources),
            }
        except Exception as e:
            print(f"Error getting project with data sources: {e}")
            return None

    async def add_data_source_to_project(
        self,
        project_id: str,
        data_source_id: str,
        data_source_type: str,
        user_id: str,
        db: AsyncSession,
    ) -> bool:
        """Add a data source to a project"""
        try:
            # Verify user has access to project
            project_query = select(Project).where(
                Project.id == project_id,
                # coerce user_id
                ((Project.created_by == (int(user_id) if str(user_id).isdigit() else None)) if str(user_id).isdigit() else Project.is_public) or (Project.is_public),
            )
            project_result = await db.execute(project_query)
            project = project_result.scalar_one_or_none()

            if not project:
                return False

            # Check if data source already exists
            existing_query = select(ProjectDataSource).where(
                ProjectDataSource.project_id == project_id,
                ProjectDataSource.data_source_id == data_source_id,
            )
            existing_result = await db.execute(existing_query)
            existing = existing_result.scalar_one_or_none()

            if existing:
                # Update existing
                update_query = (
                    update(ProjectDataSource)
                    .where(ProjectDataSource.id == existing.id)
                    .values(is_active=True, data_source_type=data_source_type)
                )
                await db.execute(update_query)
            else:
                # Create new
                new_ds = ProjectDataSource(
                    project_id=project_id,
                    data_source_id=data_source_id,
                    data_source_type=data_source_type,
                )
                db.add(new_ds)

            await db.commit()
            return True
        except Exception as e:
            print(f"Error adding data source to project: {e}")
            await db.rollback()
            return False

    async def get_project_data_sources(
        self, project_id: str, user_id: str, db: AsyncSession
    ) -> List[Dict[str, Any]]:
        """Get all data sources in a project"""
        try:
            # Verify user has access to project
            project_query = select(Project).where(
                Project.id == project_id,
                # owner_id usage legacy: attempt to coerce
                ((Project.owner_id == int(user_id)) if str(user_id).isdigit() else Project.is_public) or (Project.is_public),
            )
            project_result = await db.execute(project_query)
            project = project_result.scalar_one_or_none()

            if not project:
                return []

            # Get data sources
            ds_query = select(ProjectDataSource).where(
                ProjectDataSource.project_id == project_id,
                ProjectDataSource.is_active,
            )
            ds_result = await db.execute(ds_query)
            data_sources = ds_result.scalars().all()

            return [
                {
                    "id": str(ds.id),
                    "project_id": str(ds.project_id),
                    "data_source_id": ds.data_source_id,
                    "data_source_type": ds.data_source_type,
                    "is_active": ds.is_active,
                    "added_at": ds.added_at.isoformat() if ds.added_at else None,
                }
                for ds in data_sources
            ]
        except Exception as e:
            print(f"Error getting project data sources: {e}")
            return []

    async def remove_data_source_from_project(
        self, project_id: str, data_source_id: str, user_id: str, db: AsyncSession
    ) -> bool:
        """Remove a data source from a project"""
        try:
            # Verify user has access to project
            project_query = select(Project).where(
                Project.id == project_id,
                (Project.created_by == (int(user_id) if str(user_id).isdigit() else None)) if str(user_id).isdigit() else (Project.created_by == None),  # Changed from owner_id to created_by
            )
            project_result = await db.execute(project_query)
            project = project_result.scalar_one_or_none()

            if not project:
                return False

            # Remove data source
            delete_query = delete(ProjectDataSource).where(
                ProjectDataSource.project_id == project_id,
                ProjectDataSource.data_source_id == data_source_id,
            )
            await db.execute(delete_query)
            await db.commit()
            return True
        except Exception as e:
            print(f"Error removing data source from project: {e}")
            await db.rollback()
            return False


class OrganizationRepository(
    BaseRepository[Organization, OrganizationCreate, OrganizationUpdate]
):
    """Repository for Organization operations"""

    def __init__(self):
        super().__init__(Organization)

    async def create(self, obj_in: OrganizationCreate | dict, db: AsyncSession | None = None) -> Organization:
        """Create organization with sensible defaults for slug and timestamps.

        This ensures CI/dev DBs that have NOT NULL constraints won't error when
        callers omit optional fields.
        """
        try:
            # Accept either pydantic model or dict
            if hasattr(obj_in, 'model_dump'):
                data = obj_in.model_dump()
            elif isinstance(obj_in, dict):
                data = obj_in
            else:
                data = dict(obj_in)

            # Ensure slug
            slug = data.get('slug')
            if not slug:
                base = (data.get('name') or 'org').lower().strip().replace(' ', '-')
                import uuid as _uuid
                slug = f"{base}-{_uuid.uuid4().hex[:6]}"
                data['slug'] = slug

            # Ensure timestamps
            from datetime import datetime
            now = datetime.utcnow()
            # Coerce string timestamps to datetime to avoid DB type errors
            for ts_field in ('created_at', 'updated_at'):
                if ts_field in data and isinstance(data[ts_field], str):
                    try:
                        # handle ISO format strings
                        data[ts_field] = datetime.fromisoformat(data[ts_field])
                    except Exception:
                        # fallback: ignore and let DB default handle it
                        data.pop(ts_field, None)

            if 'created_at' not in data or data.get('created_at') is None:
                data['created_at'] = now
            if 'updated_at' not in data or data.get('updated_at') is None:
                data['updated_at'] = now

            # Ensure boolean defaults
            if 'is_active' not in data:
                data['is_active'] = True
            if 'is_deleted' not in data:
                data['is_deleted'] = False

            # If a DB session was provided, use it to perform the INSERT so we
            # respect the caller's transaction and avoid session mismatch.
            if db is not None:
                table = self.model.__table__
                # Filter out fields that may be problematic (ISO string timestamps)
                safe_data = {}
                for k, v in data.items():
                    # Only include columns that exist on the table and exclude timestamp fields
                    if k in table.c.keys() and k not in ('created_at', 'updated_at', 'trial_ends_at'):
                        safe_data[k] = v

                # Attempt an idempotent INSERT using PostgreSQL ON CONFLICT on slug
                # so concurrent creates won't raise unique violations. If slug is not
                # available, fall back to a normal insert and handle collisions by
                # selecting an existing org by name/slug.
                try:
                    from sqlalchemy import text as _text
                    slug_val = safe_data.get('slug')
                    if slug_val:
                        ins_sql = _text(
                            "INSERT INTO organizations (name, slug, description, is_active, is_deleted, plan_type, max_projects, created_at, updated_at) "
                            "VALUES (:name, :slug, :desc, :is_active, :is_deleted, :plan_type, :max_projects, :created_at, :updated_at) "
                            "ON CONFLICT (slug) DO UPDATE SET updated_at = EXCLUDED.updated_at RETURNING id"
                        )
                        res = await db.execute(ins_sql.bindparams(
                            name=safe_data.get('name'),
                            slug=safe_data.get('slug'),
                            desc=safe_data.get('description'),
                            is_active=safe_data.get('is_active', True),
                            is_deleted=safe_data.get('is_deleted', False),
                            plan_type=safe_data.get('plan_type'),
                            max_projects=safe_data.get('max_projects'),
                            created_at=safe_data.get('created_at'),
                            updated_at=safe_data.get('updated_at'),
                        ))
                        await db.commit()
                        row = res.first()
                        if row and row[0]:
                            org_id = row[0]
                            q = select(self.model).where(table.c.id == org_id)
                            pres = await db.execute(q)
                            existing = pres.scalar_one_or_none()
                            if existing:
                                return existing
                    else:
                        # No slug: try basic insert then return created record
                        ins = table.insert().values(**safe_data).returning(table.c.id)
                        res = await db.execute(ins)
                        await db.commit()
                        row = res.first()
                        if row and row[0]:
                            org_id = row[0]
                            q = select(self.model).where(table.c.id == org_id)
                            pres = await db.execute(q)
                            return pres.scalar_one_or_none()
                except Exception as e:
                    # On error (e.g., concurrent insert unique violation), attempt to find existing org by slug or name
                    try:
                        await db.rollback()
                    except Exception:
                        pass
                    try:
                        slug = safe_data.get('slug')
                        name = safe_data.get('name')
                        if slug:
                            q = select(self.model).where(table.c.slug == slug)
                            pres = await db.execute(q)
                            existing = pres.scalar_one_or_none()
                            if existing:
                                return existing
                        if name:
                            q = select(self.model).where(table.c.name == name)
                            pres = await db.execute(q)
                            existing = pres.scalar_one_or_none()
                            if existing:
                                return existing
                    except Exception:
                        # Re-raise original error if we couldn't recover
                        raise e

                # If everything above failed to return, fall back to superclass create
                return await super().create(data)

            # Fallback: use base class create which uses module-global DB session
            return await super().create(data)
        except Exception:
            # Fallback to superclass behavior to raise helpful errors
            return await super().create(obj_in)

    async def get_all(self, db: AsyncSession) -> List[Organization]:
        """Get all active organizations"""
        try:
            query = select(Organization).where(Organization.is_active)
            result = await db.execute(query)
            return result.scalars().all()
        except Exception as e:
            print(f"Error getting all organizations: {e}")
            return []

    async def get_organization_summary(
        self, organization_id: str, db: AsyncSession
    ) -> Optional[Dict[str, Any]]:
        """Get organization summary with counts"""
        try:
            query = select(Organization).where(Organization.id == organization_id)
            result = await db.execute(query)
            org = result.scalar_one_or_none()

            if not org:
                return None

            # Get project count
            project_query = select(Project).where(
                Project.organization_id == organization_id, Project.is_active
            )
            project_result = await db.execute(project_query)
            projects = project_result.scalars().all()

            # Get user count
            user_query = select(OrganizationUser).where(
                OrganizationUser.organization_id == organization_id,
                OrganizationUser.is_active,
            )
            user_result = await db.execute(user_query)
            users = user_result.scalars().all()

            return {
                "id": str(org.id),
                "name": org.name,
                "description": org.description,
                "domain": org.domain,
                "is_active": org.is_active,
                "plan_type": org.plan_type,
                "max_projects": org.max_projects,
                "project_count": len(projects),
                "user_count": len(users),
                "created_at": org.created_at.isoformat() if org.created_at else None,
                "updated_at": org.updated_at.isoformat() if org.updated_at else None,
            }
        except Exception as e:
            print(f"Error getting organization summary: {e}")
            return None
