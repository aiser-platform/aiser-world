from typing import Annotated, List, Union
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.common.schemas import ListResponseSchema, PaginationSchema
from app.common.utils.query_params import BaseFilterParams
from app.modules.authentication.helpers import extract_user_payload

from .schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectWithDataSources,
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationResponse,
    ProjectDataSourceCreate,
    ProjectDataSourceResponse,
    ProjectConversationCreate,
    ProjectConversationResponse,
    UserProjectAccess,
    OrganizationSummary,
)
from .services import ProjectService, OrganizationService
from app.modules.authentication.deps.auth_bearer import JWTCookieBearer
from app.modules.authentication.helpers import extract_user_payload
from app.core.deps import get_current_user
# User model removed - user management will be handled by Supabase
from app.modules.authentication.rbac.decorators import require_permission
from app.modules.authentication.rbac.permissions import Permission
from app.db.session import get_async_session
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
project_service = ProjectService()
organization_service = OrganizationService()


# Organization endpoints
@router.get("/organizations", response_model=List[OrganizationResponse])
async def get_organizations(
    current_token: dict = Depends(JWTCookieBearer()),
):
    """Get all organizations for the authenticated user"""
    try:
        # Extract user_id from token
        from app.modules.authentication.helpers import extract_user_payload
        user_id = ''
        try:
            if isinstance(current_token, dict):
                user_payload = current_token
            else:
                user_payload = extract_user_payload(current_token)
            user_id = str(user_payload.get('id') or user_payload.get('user_id') or user_payload.get('sub') or '')
        except Exception as e:
            logger.warning(f"Failed to extract user info from token: {e}")
        
        if user_id:
            # Get organizations for this specific user
            result = await organization_service.get_user_organizations(user_id)
        else:
            # Fallback: get all organizations (for backwards compatibility)
            result = await organization_service.get_all()
        
        # Ensure all organizations have plan_type set (double-check)
        # CRITICAL: Only set default if plan_type is truly missing - don't override valid values
        for org in result:
            if not hasattr(org, 'plan_type') or org.plan_type is None or (isinstance(org.plan_type, str) and org.plan_type.strip() == ''):
                logger.warning(f"Organization {org.id} missing plan_type, defaulting to 'free'")
                org.plan_type = 'free'
        
        # Log the organizations being returned for debugging
        logger.info(f"Returning {len(result)} organizations for user {user_id}: {[(o.id, o.name, o.plan_type) for o in result]}")
        return result
    except Exception as e:
        logger.error(f"Failed to get organizations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/organizations", response_model=OrganizationResponse)
async def create_organization(organization: OrganizationCreate):
    """Create a new organization"""
    try:
        result = await organization_service.create(organization)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/organizations/{organization_id}", response_model=OrganizationResponse)
async def get_organization(organization_id: str):
    """Get organization by ID"""
    try:
        result = await organization_service.get(organization_id)
        if not result:
            raise HTTPException(status_code=404, detail="Organization not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get(
    "/organizations/{organization_id}/summary", response_model=OrganizationSummary
)
async def get_organization_summary(organization_id: str):
    """Get organization summary with counts"""
    try:
        result = await organization_service.get_organization_summary(organization_id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.put("/organizations/{organization_id}", response_model=OrganizationResponse)
async def update_organization(
    organization_id: str, 
    organization: OrganizationUpdate,
    current_token: dict = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session)
):
    """Update organization - only if user is a member"""
    try:
        # Extract user_id from token
        from app.modules.authentication.helpers import extract_user_payload
        user_id = ''
        try:
            if isinstance(current_token, dict):
                user_payload = current_token
            else:
                user_payload = extract_user_payload(current_token)
            user_id = str(user_payload.get('id') or user_payload.get('user_id') or user_payload.get('sub') or '')
        except Exception as e:
            logger.warning(f"Failed to extract user info from token: {e}")
        
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found in token")
        
        # Verify user is a member of this organization
        from sqlalchemy import text
        result = await db.execute(
            text("""
                SELECT uo.role, uo.is_active
                FROM user_organizations uo
                WHERE uo.organization_id = :org_id
                AND uo.user_id::text = :user_id
            """),
            {"org_id": int(organization_id), "user_id": user_id}
        )
        membership = result.fetchone()
        
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="You do not have permission to update this organization"
            )
        
        # Only owners can update organization settings
        if membership.role != 'owner':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only organization owners can update organization settings"
            )
        
        result = await organization_service.update(organization_id, organization)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update organization: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


# Project endpoints
@router.post("/projects", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate, 
    request: Request, 
    current_token: dict = Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session)
):
    """Create a new project deriving user from JWT cookie"""
    try:
        try:
            user_payload = extract_user_payload(current_token)
            user_id = str(user_payload.get('id') or user_payload.get('sub') or '')
        except Exception:
            user_id = ''

        if not user_id:
            logger.warning('create_project attempted without authenticated user')
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Authentication required')

        result = await project_service.create_project(project, user_id)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/projects", response_model=ListResponseSchema[ProjectResponse])
async def get_projects(
    params: Annotated[BaseFilterParams, Depends()],
    request: Request,
    current_token: str = Depends(JWTCookieBearer()),
):
    """Get all projects for a user"""
    try:
        # Resolve user id from JWT token
        try:
            user_payload = extract_user_payload(current_token)
            # Handle both integer and UUID string user IDs
            user_id_raw = user_payload.get('id') or user_payload.get('sub') or user_payload.get('user_id')
            if user_id_raw:
                # Try to convert to int first (for legacy integer IDs), fall back to string (for UUIDs)
                try:
                    user_id = int(user_id_raw)
                except (ValueError, TypeError):
                    user_id = str(user_id_raw)  # Keep as string for UUIDs
            else:
                user_id = None
        except Exception:
            user_id = None

        # Debugging: log incoming cookies and Authorization header to help diagnose client auth issues
        try:
            cookie_summary = {k: (v[:64] + '...') if isinstance(v, str) and len(v) > 64 else v for k, v in dict(request.cookies or {}).items()}
            logger.info(f"📋 get_projects incoming cookies: {cookie_summary}")
            logger.info(f"Authorization header present: {bool(request.headers.get('Authorization'))}")
        except Exception:
            logger.info("📋 get_projects: failed to read request debug info")

        # Get real projects from database for the user
        if not user_id:
            # If no authenticated user, return public projects only
            result = await project_service.get_all()
        else:
            result = await project_service.get_user_projects(str(user_id))

        # Convert to ListResponseSchema format
        return ListResponseSchema(
            items=result,
            pagination=PaginationSchema(
                total=len(result),
                offset=0,
                limit=len(result),
                has_more=False,
                total_pages=1,
                current_page=1,
            ),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/projects/{project_id}", response_model=ProjectWithDataSources)
async def get_project(project_id: str, current_token: str = Depends(JWTCookieBearer())):
    """Get project by ID with data source counts, using authenticated user"""
    try:
        try:
            user_payload = extract_user_payload(current_token)
            user_id = str(user_payload.get('id') or user_payload.get('sub') or '')
        except Exception:
            user_id = ''

        if not user_id:
            logger.warning('get_project attempted without authenticated user')
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Authentication required')

        result = await project_service.get_project_with_data_sources(
            project_id, user_id
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, project: ProjectUpdate):
    """Update project"""
    try:
        result = await project_service.update(project_id, project)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    """Delete project"""
    try:
        await project_service.delete(project_id)
        return {"success": True, "message": "Project deleted"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


# Project data source endpoints
@router.post(
    "/projects/{project_id}/data-sources", response_model=ProjectDataSourceResponse
)
async def add_data_source_to_project(
    project_id: str, data_source: ProjectDataSourceCreate, current_token: str = Depends(JWTCookieBearer())
):
    """Add a data source to a project deriving user from JWT"""
    try:
        try:
            user_payload = extract_user_payload(current_token)
            user_id = str(user_payload.get('id') or user_payload.get('sub') or '')
        except Exception:
            user_id = ''

        if not user_id:
            logger.warning('add_data_source_to_project attempted without authenticated user')
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Authentication required')

        result = await project_service.add_data_source_to_project(
            project_id,
            data_source.data_source_id,
            data_source.data_source_type,
            user_id,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get(
    "/projects/{project_id}/data-sources",
    response_model=List[ProjectDataSourceResponse],
)
async def get_project_data_sources(project_id: str, current_token: str = Depends(JWTCookieBearer())):
    """Get all data sources in a project deriving user from JWT"""
    try:
        try:
            user_payload = extract_user_payload(current_token)
            user_id = str(user_payload.get('id') or user_payload.get('sub') or '')
        except Exception:
            user_id = ''

        if not user_id:
            logger.warning('get_project_data_sources attempted without authenticated user')
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Authentication required')

        result = await project_service.get_project_data_sources(project_id, user_id)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.delete("/projects/{project_id}/data-sources/{data_source_id}")
async def remove_data_source_from_project(project_id: str, data_source_id: str, current_token: str = Depends(JWTCookieBearer())):
    """Remove a data source from a project deriving user from JWT"""
    try:
        try:
            user_payload = extract_user_payload(current_token)
            user_id = str(user_payload.get('id') or user_payload.get('sub') or '')
        except Exception:
            user_id = ''

        if not user_id:
            logger.warning('remove_data_source_from_project attempted without authenticated user')
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Authentication required')

        result = await project_service.remove_data_source_from_project(project_id, data_source_id, user_id)
        return {"success": result, "message": "Data source removed from project"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# Project conversation endpoints
@router.post(
    "/projects/{project_id}/conversations", response_model=ProjectConversationResponse
)
async def add_conversation_to_project(
    project_id: str, conversation: ProjectConversationCreate
):
    """Add a conversation to a project"""
    try:
        # This would be implemented in the repository
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented yet"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


# User project access endpoints
@router.get("/users/{user_id}/project-access", response_model=UserProjectAccess)
async def get_user_project_access(user_id: str):
    """Get user's project access information"""
    try:
        # This would be implemented in the service
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented yet"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


# Team management endpoints
@router.get("/organizations/{organization_id}/members")
async def get_organization_members(
    organization_id: str,
    current_token: Union[str, dict] = Depends(JWTCookieBearer())
):
    """Get all members of an organization"""
    try:
        from app.db.session import async_session
        from app.modules.projects.models import UserOrganization
        # User model removed - user management will be handled by Supabase
        from sqlalchemy import select
        
        # Extract user ID from token for access control
        try:
            user_payload = extract_user_payload(current_token)
            user_id = str(user_payload.get('id') or user_payload.get('user_id') or user_payload.get('sub') or '')
        except Exception:
            user_id = ''
        
        async with async_session() as db:
            try:
                org_id_int = int(organization_id)
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail="Invalid organization ID")
            
            # Verify user has access to this organization
            if user_id:
                org_user = await db.execute(
                    select(UserOrganization).where(
                        UserOrganization.user_id == user_id,
                        UserOrganization.organization_id == org_id_int
                    )
                )
                if not org_user.scalar_one_or_none():
                    raise HTTPException(status_code=403, detail="Access denied to this organization")
            
            # Query UserOrganization (users table removed - user info will come from Supabase)
            query = (
                select(UserOrganization)
                .where(
                    UserOrganization.organization_id == org_id_int,
                    UserOrganization.is_active == True
                )
            )
            result = await db.execute(query)
            rows = result.all()
            
            members = []
            for uo in rows:
                # User details will be fetched from Supabase when integrated
                # For now, return minimal info from user_organizations table
                members.append({
                    "id": str(uo.user_id),
                    "user_id": str(uo.user_id),
                    "username": None,  # Will be fetched from Supabase
                    "name": None,  # Will be fetched from Supabase
                    "email": None,  # Will be fetched from Supabase
                    "role": uo.role or 'member',
                    "status": "active" if uo.is_active else "inactive",
                    "joined_at": uo.created_at.isoformat() if uo.created_at else None,
                    "joinDate": uo.created_at.isoformat() if uo.created_at else None,
                    "avatar_url": None  # Will be fetched from Supabase
                })
            
            return members
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get organization members: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/organizations/{organization_id}/members")
async def add_organization_member(organization_id: str, member_data: dict):
    """Add a new member to an organization"""
    try:
        from app.db.session import async_session
        from app.modules.projects.models import UserOrganization
        # User model removed - user management will be handled by Supabase
        from sqlalchemy import select
        
        email = member_data.get('email')
        role = member_data.get('role', 'member')
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required"
            )
        
        async with async_session() as db:
            # Users table removed - user lookup will be done via Supabase
            # For now, we'll need the user_id to be provided or looked up from Supabase
            user_id = member_data.get('user_id')
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="user_id is required. User lookup will be handled by Supabase integration."
                )
            
            # Check if user is already a member
            existing_query = select(UserOrganization).where(
                UserOrganization.organization_id == int(organization_id),
                UserOrganization.user_id == user_id,
                UserOrganization.is_active == True
            )
            existing_result = await db.execute(existing_query)
            existing = existing_result.scalar_one_or_none()
            
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User is already a member of this organization"
                )
            
            # Create new UserOrganization entry
            new_member = UserOrganization(
                organization_id=int(organization_id),
                user_id=user_id,
                role=role,
                is_active=True
            )
            db.add(new_member)
            await db.commit()
            await db.refresh(new_member)
            
            return {
                "success": True,
                "message": "Member added successfully",
                "member": {
                    "id": str(user.id),
                    "user_id": str(user.id),
                    "username": user.username or user.email.split('@')[0] if user.email else 'user',
                    "name": f"{user.first_name or ''} {user.last_name or ''}".strip() or user.username or user.email.split('@')[0] if user.email else 'User',
                    "email": user.email or '',
                    "role": role,
                    "status": "active",
                    "joined_at": new_member.created_at.isoformat() if new_member.created_at else None
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add organization member: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.put("/organizations/{organization_id}/members/{member_id}")
async def update_organization_member(
    organization_id: str, member_id: str, member_data: dict
):
    """Update an organization member"""
    try:
        # For now, return success. In production, this would update database
        return {"success": True, "message": "Member updated successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.delete("/organizations/{organization_id}/members/{member_id}")
async def remove_organization_member(organization_id: str, member_id: str):
    """Remove a member from an organization"""
    try:
        # For now, return success. In production, this would remove from database
        return {"success": True, "message": "Member removed successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


# Usage and billing endpoints
@router.get("/organizations/{organization_id}/usage")
async def get_organization_usage(
    organization_id: str,
    current_token: Union[str, dict] = Depends(JWTCookieBearer())
):
    """Get organization usage statistics"""
    try:
        from app.modules.organization.api import get_organization_usage as get_real_usage
        from app.modules.organization.services import OrganizationService
        from app.db.session import async_session
        
        # Get the real usage from organization service
        async with async_session() as session:
            org_service = OrganizationService()
            # Get organization to verify access
            try:
                org_id_int = int(organization_id)
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail="Invalid organization ID")
            
            # Use the real implementation from organization/api.py
            from app.modules.organization.api import get_organization_usage
            # This requires a different signature, so we'll implement it here
            from app.modules.pricing.plans import get_plan_config
            from app.modules.projects.models import Organization, UserOrganization
            from sqlalchemy import select, func
            
            # Extract user ID from token
            try:
                user_payload = extract_user_payload(current_token)
                user_id = str(user_payload.get('id') or user_payload.get('user_id') or user_payload.get('sub') or '')
            except Exception:
                user_id = ''
            
            if not user_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Authentication required')
            
            # Convert user_id to UUID for comparison (user_id column is UUID type)
            import uuid as uuid_lib
            
            try:
                # Convert string user_id to UUID object for proper comparison
                user_uuid = uuid_lib.UUID(user_id) if isinstance(user_id, str) else user_id
            except (ValueError, TypeError):
                logger.error(f"Invalid user_id format: {user_id}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid user ID format"
                )
            
            # Get user's organization membership
            # user_id is UUID type in database, so use UUID object for comparison
            org_user = await session.execute(
                select(UserOrganization).where(
                    UserOrganization.organization_id == org_id_int,
                    UserOrganization.user_id == user_uuid,
                    UserOrganization.is_active == True
                )
            )
            org_user = org_user.scalar_one_or_none()
            
            if not org_user:
                logger.warning(f"User {user_id} attempted to access organization {org_id_int} without membership")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You do not have permission to access this organization"
                )
            
            # Get organization
            org = await session.execute(
                select(Organization).where(Organization.id == org_id_int)
            )
            organization = org.scalar_one_or_none()
            
            if not organization:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Organization not found"
                )
            
            plan_config = get_plan_config(organization.plan_type or "free")
            
            # Get actual usage stats
            from app.modules.data.models import DataSource
            from app.modules.projects.models import Project
            
            # Count data sources for this organization
            data_sources_count = await session.execute(
                select(func.count(DataSource.id)).where(
                    DataSource.tenant_id == str(org_id_int),
                    DataSource.is_active == True
                )
            )
            data_sources_used = data_sources_count.scalar() or 0
            
            # Count projects
            projects_count = await session.execute(
                select(func.count(Project.id)).where(
                    Project.organization_id == org_id_int
                )
            )
            projects_used = projects_count.scalar() or 0
            
            # Count active users
            active_users_count = await session.execute(
                select(func.count(UserOrganization.user_id)).where(
                    UserOrganization.organization_id == org_id_int,
                    UserOrganization.is_active == True
                )
            )
            active_users = active_users_count.scalar() or 0
            
            limits_payload = {
                "plan_type": organization.plan_type,
                "plan_name": plan_config["name"],
                "ai_credits_limit": plan_config["ai_credits_limit"],
                "storage_limit_gb": plan_config["storage_limit_gb"],
                "max_storage_gb": plan_config["storage_limit_gb"],
                "max_projects": plan_config["max_projects"],
                "max_users": plan_config["max_users"],
                "max_data_sources": plan_config["max_data_sources"],
                "data_history_days": plan_config.get("data_history_days"),
                "included_seats": plan_config.get("included_seats"),
                "additional_seat_price": plan_config.get("additional_seat_price"),
            }
            
            ai_limit = plan_config["ai_credits_limit"]
            ai_used = organization.ai_credits_used or 0  # Handle None
            
            # Calculate remaining credits
            if ai_limit in (-1, None):
                remaining = -1  # Unlimited
            else:
                remaining = max(0, ai_limit - ai_used)
            
            # Calculate percentage used
            if ai_limit in (-1, None) or ai_limit == 0:
                percentage = 0
            else:
                percentage = min(100, (ai_used / ai_limit) * 100)
            
            usage_payload = {
                "ai_credits_used": ai_used,
                "data_sources_used": data_sources_used,
                "projects_used": projects_used,
                "storage_used_gb": 0,  # TODO: Calculate actual storage
                "active_users": active_users,
            }
            
            limits_payload["ai_credits_remaining"] = remaining
            limits_payload["usage_percentage"] = percentage
            
            return {
                "plan_type": organization.plan_type,
                "limits": limits_payload,
                "usage": usage_payload,
                "ai_credits_used": organization.ai_credits_used,
                "ai_credits_limit": limits_payload["ai_credits_limit"],
                "ai_credits_remaining": remaining,
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting organization usage: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get organization usage"
        )
