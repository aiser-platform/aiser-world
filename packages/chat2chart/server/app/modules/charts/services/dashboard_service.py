"""
Dashboard Service - Real database operations for dashboards
Replaces mock data with actual database queries
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, or_, insert
from sqlalchemy.orm import selectinload

from app.modules.charts.models import Dashboard, DashboardWidget
from app.modules.user.models import User
import uuid
from sqlalchemy import func
from app.modules.charts.schemas import (
    DashboardCreateSchema,
    DashboardUpdateSchema,
    DashboardResponseSchema,
    DashboardWidgetCreateSchema as WidgetCreateSchema,
    DashboardWidgetResponseSchema as WidgetResponseSchema,
)
from app.modules.projects.services import ProjectService
from app.modules.projects.schemas import ProjectCreate
from fastapi import HTTPException

logger = logging.getLogger(__name__)

class DashboardService:
    """Service for dashboard operations with real database queries"""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
    
    async def list_dashboards(
        self,
        project_id: Optional[int] = None,
        user_id: Optional[int | str] = None,
        offset: int = 0, 
        limit: int = 20,
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        """List dashboards with real database queries"""
        try:
            logger.info(f"📊 Listing dashboards for project {project_id}, user {user_id}")
            
            # Build query
            query = select(Dashboard)
            conditions = []
            if project_id is not None:
                conditions.append(Dashboard.project_id == project_id)
            if user_id is not None:
                # Normalize user id to UUID when possible to compare against Dashboard.created_by
                user_uuid = await self._resolve_user_uuid(user_id)
                # authenticated user: return dashboards they own plus public ones
                conditions.append(or_(Dashboard.created_by == user_uuid, Dashboard.is_public == True))
            else:
                # unauthenticated: only public dashboards
                conditions.append(Dashboard.is_public == True)
            if conditions:
                query = query.where(and_(*conditions))
            
            # Add search filter
            if search:
                query = query.where(
                    or_(
                        Dashboard.name.ilike(f"%{search}%"),
                        Dashboard.description.ilike(f"%{search}%")
                    )
                )
            
            # Get total count
            count_query = select(func.count()).select_from(query.subquery())
            total_result = await self.db.execute(count_query)
            total = total_result.scalar()
            
            # Get paginated results
            query = query.order_by(Dashboard.updated_at.desc()).offset(offset).limit(limit)
            result = await self.db.execute(query)
            dashboards = result.scalars().all()
            
            # Convert to response format
            dashboard_list = []
            for dashboard in dashboards:
                dashboard_data = {
                    "id": str(dashboard.id),
                    "name": dashboard.name,
                    "description": dashboard.description,
                    "project_id": dashboard.project_id,
                    "layout_config": dashboard.layout_config or {},
                    "theme_config": dashboard.theme_config or {},
                    "global_filters": dashboard.global_filters or {},
                    "refresh_interval": dashboard.refresh_interval or 300,
                    "is_public": dashboard.is_public,
                    "is_template": dashboard.is_template,
                    "created_by": dashboard.created_by,
                    "max_widgets": dashboard.max_widgets or 10,
                    "max_pages": dashboard.max_pages or 5,
                    "created_at": dashboard.created_at.isoformat() if dashboard.created_at else None,
                    "updated_at": dashboard.updated_at.isoformat() if dashboard.updated_at else None,
                    "last_viewed_at": dashboard.last_viewed_at.isoformat() if dashboard.last_viewed_at else None
                }
                dashboard_list.append(dashboard_data)
            
            return {
                "dashboards": dashboard_list,
                "total": total,
                "offset": offset,
                "limit": limit,
                "has_more": offset + limit < total
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to list dashboards: {str(e)}")
            raise e
    
    async def get_dashboard(self, dashboard_id: str, user_id: int | str) -> Dict[str, Any]:
        """Get a specific dashboard by ID"""
        try:
            logger.info(f"📊 Getting dashboard: {dashboard_id}")
            
            # Get dashboard with widgets
            query = select(Dashboard).options(
                selectinload(Dashboard.widgets)
            ).where(Dashboard.id == dashboard_id)
            
            result = await self.db.execute(query)
            dashboard = result.scalar_one_or_none()
            
            if not dashboard:
                raise HTTPException(status_code=404, detail="Dashboard not found")
            
            # Check permissions (resolve user id -> uuid for comparison)
            resolved_uuid = await self._resolve_user_uuid(user_id)
            if dashboard.created_by is not None and dashboard.created_by != resolved_uuid and not dashboard.is_public:
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Convert to response format
            dashboard_data = {
                "id": str(dashboard.id),
                "name": dashboard.name,
                "description": dashboard.description,
                "project_id": dashboard.project_id,
                "layout_config": dashboard.layout_config or {},
                "theme_config": dashboard.theme_config or {},
                "global_filters": dashboard.global_filters or {},
                "refresh_interval": dashboard.refresh_interval or 300,
                "is_public": dashboard.is_public,
                "is_template": dashboard.is_template,
                "created_by": dashboard.created_by,
                "max_widgets": dashboard.max_widgets or 10,
                "max_pages": dashboard.max_pages or 5,
                "created_at": dashboard.created_at.isoformat() if dashboard.created_at else None,
                "updated_at": dashboard.updated_at.isoformat() if dashboard.updated_at else None,
                "last_viewed_at": dashboard.last_viewed_at.isoformat() if dashboard.last_viewed_at else None,
                "widgets": []
            }
            
            # Add widgets
            for widget in dashboard.widgets:
                widget_data = {
                    "id": str(widget.id),
                    "title": widget.title,
                    "type": widget.type,
                    "config": widget.config or {},
                    "position": widget.position or {},
                    "size": widget.size or {},
                    "created_at": widget.created_at.isoformat() if widget.created_at else None,
                    "updated_at": widget.updated_at.isoformat() if widget.updated_at else None
                }
                dashboard_data["widgets"].append(widget_data)
            
            return dashboard_data
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Failed to get dashboard {dashboard_id}: {str(e)}")
            raise e
    
    async def create_dashboard(
        self,
        dashboard_data: DashboardCreateSchema,
        user_id: int | str,
    ) -> Dict[str, Any]:
        """Create a new dashboard"""
        try:
            logger.info(f"📊 Creating dashboard: {dashboard_data.name}")

            # Try to pre-resolve or ensure a local user record so we can
            # persist created_by reliably for newly onboarded users.
            pre_resolved_created_by = None
            try:
                # Attempt to resolve via normal resolver first
                pre_resolved_created_by = await self._resolve_user_uuid(user_id)
            except Exception:
                pre_resolved_created_by = None

            # If unresolved and we have an email in the user payload, create a
            # minimal local ChatUser so that create flows can set created_by.
            try:
                if not pre_resolved_created_by and isinstance(user_id, dict) and user_id.get('email'):
                    from app.modules.user.models import ChatUser
                    from sqlalchemy import select
                    import uuid as _uuid
                    email = user_id.get('email')
                    res = await self.db.execute(select(User).where(User.email == email))
                    existing = res.scalar_one_or_none()
                    if existing:
                        pre_resolved_created_by = existing.id
                    else:
                        new_uuid = _uuid.uuid4()
                        ins = ChatUser.__table__.insert().values(
                            id=new_uuid,
                            username=(user_id.get('username') or email.split('@')[0]),
                            email=email,
                            password='',
                            created_at=func.now(),
                            updated_at=func.now(),
                            is_active=True,
                            is_deleted=False,
                        )
                        try:
                            await self.db.execute(ins)
                            await self.db.commit()
                            pre_resolved_created_by = new_uuid
                        except Exception:
                            try:
                                await self.db.rollback()
                            except Exception:
                                pass
            except Exception:
                pre_resolved_created_by = None
            
            # If no project_id was provided, try to ensure the user has a default project
            if not dashboard_data.project_id:
                try:
                    proj_service = ProjectService()
                    # Resolve a safe identifier for downstream lookups (UUID or legacy int)
                    try:
                        lookup_user_uuid = await self._resolve_user_uuid(user_id)
                    except Exception:
                        lookup_user_uuid = None

                    # Prefer UUID string for service calls, fall back to legacy int when available
                    lookup_user_for_calls = None
                    if lookup_user_uuid:
                        lookup_user_for_calls = str(lookup_user_uuid)
                    else:
                        try:
                            if isinstance(user_id, dict):
                                maybe = user_id.get('user_id') or user_id.get('id') or user_id.get('sub')
                                lookup_user_for_calls = int(maybe) if maybe and str(maybe).isdigit() else None
                            else:
                                lookup_user_for_calls = int(user_id) if user_id and str(user_id).isdigit() else None
                        except Exception:
                            lookup_user_for_calls = None

                    # Try to find existing projects for the resolved user id
                    user_projects = await proj_service.get_user_projects(lookup_user_for_calls)
                    if user_projects and len(user_projects) > 0:
                        dashboard_data.project_id = user_projects[0].id
                    else:
                        # create a default project under user's default org
                        default_org = None
                        try:
                            from app.modules.projects.services import OrganizationService
                            org_svc = OrganizationService()
                            default_orgs = await org_svc.get_user_organizations(lookup_user_for_calls)
                            if default_orgs and len(default_orgs) > 0:
                                default_org = default_orgs[0]
                        except Exception:
                            default_org = None

                        if not default_org:
                            # create default organization (OrganizationService ensures slug)
                            try:
                                org_svc = OrganizationService()
                                default_org = await org_svc.create_default_organization(lookup_user_for_calls)
                            except Exception:
                                default_org = None

                        if default_org:
                            try:
                                new_proj = ProjectCreate(name="Default Project", description="Auto-created default project for user", organization_id=default_org.id)
                                # pass the lookup_user_for_calls as string when available
                                created_proj = await proj_service.create_project(new_proj, str(lookup_user_for_calls) if lookup_user_for_calls is not None else None)
                                dashboard_data.project_id = created_proj.id
                            except Exception:
                                # best-effort; leave project_id None if creation fails
                                pass
                except Exception:
                    # best-effort only: if any error occurs trying to infer/create project/org, ignore and continue
                    pass

            # Create dashboard
            # Resolve provided user id (could be legacy int) into UUID matching users.id
            created_by_value = None
            try:
                created_by_value = await self._resolve_user_uuid(user_id)
            except Exception:
                created_by_value = None
            logger.info(f"Resolved created_by_value: {created_by_value} (type={type(created_by_value)})")
            # Also print to stdout for immediate visibility in container logs during tests
            print(f"DEBUG: Resolved created_by_value={created_by_value!r}, type={type(created_by_value)}")

            # Ensure created_by is a UUID (or None). If a legacy int slipped through, map it to UUID.
            final_created_by = None
            try:
                if isinstance(created_by_value, uuid.UUID):
                    final_created_by = created_by_value
                elif isinstance(created_by_value, str):
                    # try to parse as UUID
                    try:
                        final_created_by = uuid.UUID(created_by_value)
                    except Exception:
                        # maybe a numeric string representing legacy id
                        if created_by_value.isdigit():
                            q = select(User).where(User.legacy_id == int(created_by_value))
                            res = await self.db.execute(q)
                            u = res.scalar_one_or_none()
                            if u:
                                final_created_by = u.id
                elif isinstance(created_by_value, int):
                    q = select(User).where(User.legacy_id == created_by_value)
                    res = await self.db.execute(q)
                    u = res.scalar_one_or_none()
                    if u:
                        final_created_by = u.id
            except Exception:
                final_created_by = None

            dashboard = Dashboard(
                name=dashboard_data.name,
                description=dashboard_data.description,
                project_id=dashboard_data.project_id,
                layout_config=dashboard_data.layout_config or {},
                theme_config=dashboard_data.theme_config or {},
                global_filters=dashboard_data.global_filters or {},
                refresh_interval=dashboard_data.refresh_interval or 300,
                is_public=dashboard_data.is_public or False,
                is_template=dashboard_data.is_template or False,
                # created_by intentionally omitted on INSERT to avoid datatype mismatch;
                # will be set via UPDATE after insert if final_created_by is available.
                max_widgets=10,
                max_pages=5,
            )
            
            # Dump debug info to a file in the container to inspect types at runtime
            try:
                with open('/tmp/dashboard_service_debug.log', 'a') as _f:
                    _f.write(f"DEBUG_PRE_INSERT created_by_value={created_by_value!r} type={type(created_by_value)} final_created_by={final_created_by!r} type_final={type(final_created_by)}\n")
            except Exception:
                pass

            # If we couldn't resolve a UUID for created_by, remove the attribute
            # from the instance so SQLAlchemy won't include it in the INSERT payload.
            try:
                if not final_created_by and 'created_by' in getattr(dashboard, '__dict__', {}):
                    del dashboard.__dict__['created_by']
            except Exception:
                pass

            # If we couldn't resolve a UUID for created_by, perform an explicit
            # INSERT that omits the created_by column to avoid datatype casting
            # issues in mixed-schema environments. Otherwise use normal ORM add.
            if not final_created_by:
                # ensure dashboard has an id to insert
                try:
                    if not getattr(dashboard, 'id', None):
                        dashboard.id = uuid.uuid4()
                except Exception:
                    dashboard.id = uuid.uuid4()
                # make sure any previous failed transaction is cleared
                try:
                    await self.db.rollback()
                except Exception:
                    pass
                insert_stmt = insert(Dashboard).values(
                    id=dashboard.id,
                    name=dashboard.name,
                    description=dashboard.description,
                    project_id=dashboard.project_id,
                    layout_config=dashboard.layout_config,
                    theme_config=dashboard.theme_config,
                    global_filters=dashboard.global_filters,
                    refresh_interval=dashboard.refresh_interval,
                    is_public=dashboard.is_public,
                    is_active=dashboard.is_active,
                    is_template=dashboard.is_template,
                    max_widgets=dashboard.max_widgets,
                    max_pages=dashboard.max_pages,
                )
                await self.db.execute(insert_stmt)
                await self.db.commit()
                # Load the inserted dashboard
                res = await self.db.execute(select(Dashboard).where(Dashboard.id == dashboard.id))
                dashboard = res.scalar_one_or_none()
            else:
                self.db.add(dashboard)
                await self.db.commit()
                await self.db.refresh(dashboard)

            # If we resolved a UUID for created_by after creation, persist it with a safe UPDATE
            try:
                # Only persist created_by if it's a UUID or a UUID-string to avoid type mismatches
                should_update = False
                uuid_value = None
                if isinstance(final_created_by, uuid.UUID):
                    should_update = True
                    uuid_value = final_created_by
                elif isinstance(final_created_by, str):
                    try:
                        uuid_value = uuid.UUID(final_created_by)
                        should_update = True
                    except Exception:
                        should_update = False

                if should_update and uuid_value is not None:
                    try:
                        logger.info(f"DEBUG updating created_by for dashboard {dashboard.id}: uuid_value={uuid_value} (type={type(uuid_value)}) final_created_by={final_created_by} (type={type(final_created_by)})")
                    except Exception:
                        pass
                    try:
                        print(f"DEBUG_UPDATE created_by -> dashboard={dashboard.id} uuid_value={repr(uuid_value)} type={type(uuid_value)} final_created_by={repr(final_created_by)} type_final={type(final_created_by)}")
                    except Exception:
                        pass
                    await self.db.execute(
                        update(Dashboard).where(Dashboard.id == dashboard.id).values(created_by=uuid_value)
                    )
                    await self.db.commit()
                    await self.db.refresh(dashboard)
            except Exception:
                # Non-fatal: dashboard created without created_by set
                try:
                    await self.db.rollback()
                except Exception:
                    pass
            
            # Convert to response format
            return {
                "id": str(dashboard.id),
                "name": dashboard.name,
                "description": dashboard.description,
                "project_id": dashboard.project_id,
                "layout_config": dashboard.layout_config,
                "theme_config": dashboard.theme_config,
                "global_filters": dashboard.global_filters,
                "refresh_interval": dashboard.refresh_interval,
                "is_public": dashboard.is_public,
                "is_template": dashboard.is_template,
                "created_by": dashboard.created_by,
                "max_widgets": dashboard.max_widgets,
                "max_pages": dashboard.max_pages,
                "created_at": dashboard.created_at.isoformat(),
                "updated_at": dashboard.updated_at.isoformat() if dashboard.updated_at else None,
                "last_viewed_at": None,
                "widgets": []
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to create dashboard: {str(e)}")
            await self.db.rollback()
            raise e
    
    async def update_dashboard(
        self, 
        dashboard_id: str, 
        dashboard_data: DashboardUpdateSchema, 
        user_id: int | str
    ) -> Dict[str, Any]:
        """Update an existing dashboard"""
        try:
            logger.info(f"📊 Updating dashboard: {dashboard_id}")
            
            # Get dashboard
            query = select(Dashboard).where(Dashboard.id == dashboard_id)
            result = await self.db.execute(query)
            dashboard = result.scalar_one_or_none()
            
            if not dashboard:
                raise HTTPException(status_code=404, detail="Dashboard not found")
            
            # Check permissions
            resolved_uuid = await self._resolve_user_uuid(user_id)
            if dashboard.created_by is not None and dashboard.created_by != resolved_uuid:
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Update fields
            update_data = dashboard_data.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(dashboard, field, value)
            
            dashboard.updated_at = datetime.utcnow()
            
            await self.db.commit()
            await self.db.refresh(dashboard)
            
            # Convert to response format
            return {
                "id": str(dashboard.id),
                "name": dashboard.name,
                "description": dashboard.description,
                "project_id": dashboard.project_id,
                "layout_config": dashboard.layout_config,
                "theme_config": dashboard.theme_config,
                "global_filters": dashboard.global_filters,
                "refresh_interval": dashboard.refresh_interval,
                "is_public": dashboard.is_public,
                "is_template": dashboard.is_template,
                "created_by": dashboard.created_by,
                "max_widgets": dashboard.max_widgets,
                "max_pages": dashboard.max_pages,
                "created_at": dashboard.created_at.isoformat(),
                "updated_at": dashboard.updated_at.isoformat(),
                "last_viewed_at": dashboard.last_viewed_at.isoformat() if dashboard.last_viewed_at else None
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Failed to update dashboard {dashboard_id}: {str(e)}")
            await self.db.rollback()
            raise e
    
    async def delete_dashboard(self, dashboard_id: str, user_id: int | str) -> bool:
        """Delete a dashboard"""
        try:
            logger.info(f"📊 Deleting dashboard: {dashboard_id}")
            
            # Get dashboard
            query = select(Dashboard).where(Dashboard.id == dashboard_id)
            result = await self.db.execute(query)
            dashboard = result.scalar_one_or_none()
            
            if not dashboard:
                raise HTTPException(status_code=404, detail="Dashboard not found")
            
            # Check permissions
            resolved_uuid = await self._resolve_user_uuid(user_id)
            if dashboard.created_by is not None and dashboard.created_by != resolved_uuid:
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Delete dashboard (cascade will handle widgets)
            await self.db.delete(dashboard)
            await self.db.commit()
            
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Failed to delete dashboard {dashboard_id}: {str(e)}")
            await self.db.rollback()
            raise e

    # -------------------- Widget CRUD --------------------
    async def create_widget(self, dashboard_id: str, widget_data: WidgetCreateSchema, user_id: int | str) -> Dict[str, Any]:
        """Create a widget attached to a dashboard"""
        try:
            logger.info(f"🧩 Creating widget on dashboard {dashboard_id}: {widget_data.name}")

            # Ensure dashboard exists and permission
            q = select(Dashboard).where(Dashboard.id == dashboard_id)
            res = await self.db.execute(q)
            db_dash = res.scalar_one_or_none()
            if not db_dash:
                raise HTTPException(status_code=404, detail="Dashboard not found")
            resolved_uuid = await self._resolve_user_uuid(user_id)
            if db_dash.created_by is not None and db_dash.created_by != resolved_uuid:
                raise HTTPException(status_code=403, detail="Access denied to add widget")

            widget = DashboardWidget(
                dashboard_id=dashboard_id,
                name=widget_data.name,
                widget_type=widget_data.widget_type,
                chart_type=widget_data.chart_type,
                config=widget_data.config or {},
                data_config=widget_data.data_config or {},
                style_config=widget_data.style_config or {},
                x=widget_data.x or 0,
                y=widget_data.y or 0,
                width=widget_data.width or 4,
                height=widget_data.height or 3,
                z_index=widget_data.z_index or 0,
                is_visible=widget_data.is_visible if widget_data.is_visible is not None else True,
                is_locked=widget_data.is_locked if widget_data.is_locked is not None else False,
                is_resizable=widget_data.is_resizable if widget_data.is_resizable is not None else True,
                is_draggable=widget_data.is_draggable if widget_data.is_draggable is not None else True,
            )

            self.db.add(widget)
            await self.db.commit()
            await self.db.refresh(widget)

            return {
                "id": str(widget.id),
                "dashboard_id": str(widget.dashboard_id),
                "name": widget.name,
                "widget_type": widget.widget_type,
                "chart_type": widget.chart_type,
                "config": widget.config,
                "data_config": widget.data_config,
                "style_config": widget.style_config,
                "x": widget.x,
                "y": widget.y,
                "width": widget.width,
                "height": widget.height,
                "z_index": widget.z_index,
                "is_visible": widget.is_visible,
                "is_locked": widget.is_locked,
                "is_resizable": widget.is_resizable,
                "is_draggable": widget.is_draggable,
                "created_at": widget.created_at.isoformat() if widget.created_at else None,
                "updated_at": widget.updated_at.isoformat() if widget.updated_at else None,
            }
        except Exception as e:
            logger.error(f"❌ Failed to create widget on {dashboard_id}: {e}")
            await self.db.rollback()
            raise e

    async def list_widgets(self, dashboard_id: str, user_id: int | str) -> List[Dict[str, Any]]:
        """List widgets for a dashboard"""
        try:
            logger.info(f"📋 Listing widgets for dashboard {dashboard_id}")
            # Permission: ensure dashboard visible or owned
            q = select(Dashboard).where(Dashboard.id == dashboard_id)
            res = await self.db.execute(q)
            db_dash = res.scalar_one_or_none()
            if not db_dash:
                raise HTTPException(status_code=404, detail="Dashboard not found")
            resolved_uuid = await self._resolve_user_uuid(user_id)
            if db_dash.created_by is not None and db_dash.created_by != resolved_uuid and not db_dash.is_public:
                raise HTTPException(status_code=403, detail="Access denied to list widgets")

            wq = select(DashboardWidget).where(DashboardWidget.dashboard_id == dashboard_id, DashboardWidget.is_deleted == False)
            result = await self.db.execute(wq)
            widgets = result.scalars().all()
            out = []
            for w in widgets:
                out.append({
                    "id": str(w.id),
                    "dashboard_id": str(w.dashboard_id),
                    "name": w.name,
                    "widget_type": w.widget_type,
                    "chart_type": w.chart_type,
                    "config": w.config,
                    "data_config": w.data_config,
                    "style_config": w.style_config,
                    "x": w.x,
                    "y": w.y,
                    "width": w.width,
                    "height": w.height,
                    "z_index": w.z_index,
                    "is_visible": w.is_visible,
                    "is_locked": w.is_locked,
                    "is_resizable": w.is_resizable,
                    "is_draggable": w.is_draggable,
                })
            return out
        except Exception as e:
            logger.error(f"❌ Failed to list widgets for {dashboard_id}: {e}")
            raise e

    async def update_widget(self, dashboard_id: str, widget_id: str, widget_data: WidgetCreateSchema, user_id: int | str) -> Dict[str, Any]:
        """Update a widget"""
        try:
            logger.info(f"✏️ Updating widget {widget_id} on dashboard {dashboard_id}")
            res = await self.db.execute(select(DashboardWidget).where(DashboardWidget.id == widget_id, DashboardWidget.dashboard_id == dashboard_id))
            widget = res.scalar_one_or_none()
            if not widget:
                raise HTTPException(status_code=404, detail="Widget not found")

            # Permission check against parent dashboard
            dres = await self.db.execute(select(Dashboard).where(Dashboard.id == dashboard_id))
            db_dash = dres.scalar_one_or_none()
            resolved_uuid = await self._resolve_user_uuid(user_id)
            if db_dash and db_dash.created_by is not None and db_dash.created_by != resolved_uuid:
                raise HTTPException(status_code=403, detail="Access denied to update widget")

            # Update allowed fields
            update_map = widget_data.dict(exclude_unset=True)
            for k, v in update_map.items():
                # Map schema keys to model fields if necessary
                if hasattr(widget, k):
                    setattr(widget, k, v)

            await self.db.commit()
            await self.db.refresh(widget)
            return {"id": str(widget.id), "name": widget.name}
        except Exception as e:
            logger.error(f"❌ Failed to update widget {widget_id}: {e}")
            await self.db.rollback()
            raise e

    async def delete_widget(self, dashboard_id: str, widget_id: str, user_id: int | str) -> bool:
        """Delete a widget"""
        try:
            logger.info(f"🗑️ Deleting widget {widget_id} from dashboard {dashboard_id}")
            res = await self.db.execute(select(DashboardWidget).where(DashboardWidget.id == widget_id, DashboardWidget.dashboard_id == dashboard_id))
            widget = res.scalar_one_or_none()
            if not widget:
                raise HTTPException(status_code=404, detail="Widget not found")

            dres = await self.db.execute(select(Dashboard).where(Dashboard.id == dashboard_id))
            db_dash = dres.scalar_one_or_none()
            resolved_uuid = await self._resolve_user_uuid(user_id)
            if db_dash and db_dash.created_by is not None and db_dash.created_by != resolved_uuid:
                raise HTTPException(status_code=403, detail="Access denied to delete widget")
            # Delete the widget (cascade/constraints handled by DB)
            await self.db.delete(widget)
            await self.db.commit()
            return True

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Failed to delete widget {widget_id}: {e}")
            await self.db.rollback()
            raise e

    async def _resolve_user_uuid(self, user_id: int | str | dict | None):
        """Resolve legacy integer user id or UUID string to the canonical users.id (UUID).

        Returns a UUID string or None.
        """
        if not user_id:
            return None

        # If a payload dict was passed, try to resolve by explicit fields
        if isinstance(user_id, dict):
            # Try exact UUID fields first
            for fld in ('id', 'user_id', 'sub'):
                val = user_id.get(fld)
                if val:
                    try:
                        return uuid.UUID(str(val))
                    except Exception:
                        # keep trying
                        pass
            # Try email/username lookup
            email = user_id.get('email') or user_id.get('e')
            username = user_id.get('username') or user_id.get('user')
            if email:
                q = select(User).where(User.email == email)
                res = await self.db.execute(q)
                user = res.scalar_one_or_none()
                if user:
                    return user.id
            if username:
                q = select(User).where(User.username == username)
                res = await self.db.execute(q)
                user = res.scalar_one_or_none()
                if user:
                    return user.id
            # Fallback to numeric id in payload
            try:
                maybe = user_id.get('user_id') or user_id.get('id')
                if maybe and str(maybe).isdigit():
                    legacy_val = int(maybe)
                else:
                    legacy_val = None
            except Exception:
                legacy_val = None
            if legacy_val is None:
                return None
        else:
            # Not a dict: handle str/int/uuid
            try:
                # If already looks like UUID, return uuid.UUID
                if isinstance(user_id, str):
                    try:
                        return uuid.UUID(user_id)
                    except Exception:
                        # continue to check numeric legacy id
                        pass

                # If numeric (int or digit-string), try to find matching user by legacy_id
                legacy_val = int(user_id) if not isinstance(user_id, uuid.UUID) else None
            except Exception:
                return None

        # At this point, legacy_val should be set
        try:
            if legacy_val is None:
                return None

            # We may be connected to an "auth" DB where users.id is still integer
            # and a `new_id` (UUID) column was added for migration. Try to read
            # the canonical UUID from `new_id` when available. This avoids relying
            # on ORM mappings that expect different column types across DBs.
            if isinstance(legacy_val, int):
                # Try to read new_id (UUID) from users table using raw SQL
                try:
                    from sqlalchemy import text
                    q = text("SELECT new_id, email FROM users WHERE id = :lid LIMIT 1")
                    res = await self.db.execute(q.bindparams(lid=legacy_val))
                    row = res.first()
                    if row:
                        new_id_val = row[0]
                        email_val = row[1]
                        if new_id_val:
                            try:
                                return uuid.UUID(str(new_id_val))
                            except Exception:
                                pass
                        # If new_id is missing, create one and persist it (dev safe, idempotent)
                        new_uuid = uuid.uuid4()
                        try:
                            upd = text("UPDATE users SET new_id = :nid WHERE id = :lid")
                            await self.db.execute(upd.bindparams(nid=str(new_uuid), lid=legacy_val))
                            await self.db.commit()
                            return new_uuid
                        except Exception:
                            try:
                                await self.db.rollback()
                            except Exception:
                                pass
                except Exception:
                    # Fallback to ORM lookup if raw SQL fails
                    q = select(User).where(User.id == legacy_val)
                    res = await self.db.execute(q)
                    user = res.scalar_one_or_none()
                    if user:
                        # If ORM returns a user with a UUID-like id, return it
                        try:
                            return uuid.UUID(str(user.id))
                        except Exception:
                            return None
            else:
                # legacy_val may be a UUID string/object - compare against id
                q = select(User).where(User.id == legacy_val)
                res = await self.db.execute(q)
                user = res.scalar_one_or_none()
                if user:
                    return user.id
        except Exception:
            return None
        return None
