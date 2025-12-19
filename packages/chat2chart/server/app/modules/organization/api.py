"""
Organization Management API Endpoints
Complete organization settings and management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Dict, Any
import logging
from datetime import datetime, timezone

from app.db.session import get_async_session
from app.core.deps import get_current_user
from app.modules.projects.models import Organization, UserOrganization
# User model removed - user management will be handled by Supabase
from app.modules.authentication.deps.auth_bearer import JWTCookieBearer
from app.modules.authentication.rbac.decorators import require_permission
from app.modules.authentication.rbac.permissions import Permission
from app.schemas.organization import OrganizationResponse, OrganizationUpdate
from app.modules.pricing.plans import get_plan_config

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/organization", tags=["organization"])

@router.get("/settings")
async def get_organization_settings(token: str = Depends(JWTCookieBearer())):
    """Get organization settings"""
    try:
        # Mock organization settings for now
        return {
            "id": "1",
            "name": "Aiser Development Organization",
            "slug": "aiser-dev-org",
            "description": "Development organization for Aiser Platform",
            "logo_url": None,
            "website": "https://aiser.dev",
            "is_active": True,
            "plan_type": "enterprise",
            "ai_credits_used": 150,
            "ai_credits_limit": 100000,
            "max_users": 100,
            "max_projects": 50,
            "max_storage_gb": 1000,
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-15T10:30:00Z"
        }
    except Exception as e:
        logger.error(f"Error getting organization settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get organization settings"
        )

@router.put("/settings", response_model=OrganizationResponse)
@require_permission(Permission.ORG_EDIT)
async def update_organization_settings(
    org_update: OrganizationUpdate,
    current_user = Depends(get_current_user),  # Returns minimal user object (User model removed)
    session: AsyncSession = Depends(get_async_session)
):
    """Update organization settings"""
    try:
        # Check if user has admin access to organization
        org_user = await session.execute(
            select(UserOrganization).where(
                and_(
                    UserOrganization.user_id == current_user.id,
                    UserOrganization.role == "admin"
                )
            )
        )
        org_user = org_user.scalar_one_or_none()
        
        if not org_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to update organization"
            )
        
        # Get organization
        org = await session.execute(
            select(Organization).where(
                Organization.id == org_user.organization_id
            )
        )
        organization = org.scalar_one_or_none()
        
        if not organization:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )
        
        # Update organization fields
        if org_update.name is not None:
            organization.name = org_update.name
        if org_update.description is not None:
            organization.description = org_update.description
        if org_update.logo_url is not None:
            organization.logo_url = org_update.logo_url
        if org_update.website is not None:
            organization.website = org_update.website
        
        organization.updated_at = datetime.now(timezone.utc)
        
        await session.commit()
        await session.refresh(organization)
        
        return OrganizationResponse(
            id=organization.id,
            name=organization.name,
            slug=organization.slug,
            description=organization.description,
            logo_url=organization.logo_url,
            website=organization.website,
            is_active=organization.is_active,
            plan_type=organization.plan_type,
            ai_credits_used=organization.ai_credits_used,
            ai_credits_limit=organization.ai_credits_limit,
            max_users=organization.max_users,
            max_projects=organization.max_projects,
            max_storage_gb=organization.max_storage_gb,
            created_at=organization.created_at,
            updated_at=organization.updated_at
        )
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        logger.error(f"Error updating organization settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update organization settings"
        )

@router.get("/members")
async def get_organization_members(
    current_user = Depends(get_current_user),  # Returns minimal user object (User model removed)
    session: AsyncSession = Depends(get_async_session)
):
    """Get organization members"""
    try:
        # Get user's organization
        org_user = await session.execute(
            select(UserOrganization).where(
                UserOrganization.user_id == current_user.id
            )
        )
        org_user = org_user.scalar_one_or_none()
        
        if not org_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not associated with any organization"
            )
        
        # Get all organization members (users table removed - user info will come from Supabase)
        members = await session.execute(
            select(UserOrganization).where(
                and_(
                    UserOrganization.organization_id == org_user.organization_id,
                    UserOrganization.is_active == True
                )
            )
        )
        
        member_list = []
        for member_data in members:
            # User details will be fetched from Supabase when integrated
            member_list.append({
                "user_id": member_data.user_id,
                "username": None,  # Will be fetched from Supabase
                "email": None,  # Will be fetched from Supabase
                "full_name": None,  # Will be fetched from Supabase
                "role": member_data.role,
                "is_active": member_data.is_active,
                "joined_at": member_data.created_at.isoformat() if member_data.created_at else None,
                "last_accessed": None  # Will be fetched from Supabase
            })
        
        return member_list
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting organization members: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get organization members"
        )

@router.post("/invite")
async def invite_organization_member(
    invite_data: Dict[str, Any],
    current_user = Depends(get_current_user),  # Returns minimal user object (User model removed)
    session: AsyncSession = Depends(get_async_session)
):
    """Invite member to organization"""
    try:
        # Check if user has admin access
        org_user = await session.execute(
            select(UserOrganization).where(
                and_(
                    UserOrganization.user_id == current_user.id,
                    UserOrganization.role == "admin"
                )
            )
        )
        org_user = org_user.scalar_one_or_none()
        
        if not org_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to invite members"
            )
        
        # Mock invite creation
        logger.info(f"Inviting member to organization: {invite_data}")
        
        return {
            "success": True,
            "message": "Invitation sent successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error inviting organization member: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to invite organization member"
        )


@router.post("/request-access")
async def request_access(
    payload: Dict[str, Any],
    token: str = Depends(JWTCookieBearer()),
    session: AsyncSession = Depends(get_async_session)
):
    """User can request access to an organization; sends a lightweight request to org admins (mock implementation)."""
    try:
        email = payload.get('email')
        organization_id = payload.get('organization_id')
        reason = payload.get('reason')

        from app.modules.authentication.helpers import extract_user_payload
        user_payload = extract_user_payload(token)
        requester = user_payload.get('email') or user_payload.get('id') or 'unknown'

        logger.info(f"Access request for org {organization_id} by {requester} (contact: {email}) reason={reason}")

        # In production: persist request and notify org admins via email/webhook
        # For now, log and return success
        return {"success": True, "message": "Access request submitted"}
    except Exception as e:
        logger.error(f"Error requesting access: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to request access")

@router.get("/usage")
async def get_organization_usage(
    current_user = Depends(get_current_user),  # Returns minimal user object (User model removed)
    session: AsyncSession = Depends(get_async_session)
):
    """Get organization usage statistics"""
    try:
        # Get user's organization
        org_user = await session.execute(
            select(UserOrganization).where(
                UserOrganization.user_id == current_user.id
            )
        )
        org_user = org_user.scalar_one_or_none()
        
        if not org_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not associated with any organization"
            )
        
        # Get organization
        org = await session.execute(
            select(Organization).where(
                Organization.id == org_user.organization_id
            )
        )
        organization = org.scalar_one_or_none()
        
        if not organization:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )
        
        plan_config = get_plan_config(organization.plan_type or "free")

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
        remaining = (
            ai_limit - organization.ai_credits_used
            if ai_limit not in (-1, None)
            else -1
        )
        percentage = (
            (organization.ai_credits_used / ai_limit) * 100
            if ai_limit not in (-1, None, 0)
            else 0
        )

        # Count active users (seats) for the organization
        active_users_result = await session.execute(
            select(UserOrganization).where(
                and_(
                    UserOrganization.organization_id == organization.id,
                    UserOrganization.is_active == True
                )
            )
        )
        active_users_count = len(active_users_result.scalars().all())
        
        # Count projects
        from app.modules.projects.models import Project
        projects_result = await session.execute(
            select(Project).where(
                and_(
                    Project.organization_id == organization.id,
                    Project.status == 'active'
                )
            )
        )
        projects_count = len(projects_result.scalars().all())
        
        # Count data sources
        from app.modules.data.models import DataSource
        data_sources_result = await session.execute(
            select(DataSource).where(
                and_(
                    DataSource.tenant_id == str(organization.id),
                    DataSource.is_active == True
                )
            )
        )
        data_sources_count = len(data_sources_result.scalars().all())
        
        # Calculate storage (simplified - TODO: implement real storage calculation)
        storage_used_gb = 0.5  # TODO: replace with real metric from CloudStorageService
        
        usage_payload = {
            "ai_credits_used": organization.ai_credits_used,
            "storage_used_gb": storage_used_gb,
            "projects_used": projects_count,
            "data_sources_used": data_sources_count,
            "active_users": active_users_count,
        }

        limits_payload["ai_credits_remaining"] = remaining
        limits_payload["usage_percentage"] = percentage
        limits_payload["storage_used_gb"] = usage_payload["storage_used_gb"]

        return {
            "plan_type": organization.plan_type,
            "limits": limits_payload,
            "usage": usage_payload,
            # Backwards compatibility fields
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
