"""
Organization Management API Endpoints
Complete organization settings and management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime, timezone

from app.db.session import get_async_session
from app.modules.projects.models import Organization, OrganizationUser
from app.modules.user.models import User
from app.modules.authentication.deps.auth_bearer import JWTCookieBearer
from app.schemas.organization import OrganizationResponse, OrganizationUpdate

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
async def update_organization_settings(
    org_update: OrganizationUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Update organization settings"""
    try:
        # Check if user has admin access to organization
        org_user = await session.execute(
            select(OrganizationUser).where(
                and_(
                    OrganizationUser.user_id == current_user.id,
                    OrganizationUser.role == "admin"
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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get organization members"""
    try:
        # Get user's organization
        org_user = await session.execute(
            select(OrganizationUser).where(
                OrganizationUser.user_id == current_user.id
            )
        )
        org_user = org_user.scalar_one_or_none()
        
        if not org_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not associated with any organization"
            )
        
        # Get all organization members
        members = await session.execute(
            select(OrganizationUser, User).join(
                User, OrganizationUser.user_id == User.id
            ).where(
                and_(
                    OrganizationUser.organization_id == org_user.organization_id,
                    OrganizationUser.is_active == True
                )
            )
        )
        
        member_list = []
        for member_data, user in members:
            member_list.append({
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "role": member_data.role,
                "is_active": member_data.is_active,
                "joined_at": member_data.joined_at,
                "last_accessed": user.last_login
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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Invite member to organization"""
    try:
        # Check if user has admin access
        org_user = await session.execute(
            select(OrganizationUser).where(
                and_(
                    OrganizationUser.user_id == current_user.id,
                    OrganizationUser.role == "admin"
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

@router.get("/usage")
async def get_organization_usage(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get organization usage statistics"""
    try:
        # Get user's organization
        org_user = await session.execute(
            select(OrganizationUser).where(
                OrganizationUser.user_id == current_user.id
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
        
        # Mock usage statistics
        return {
            "ai_credits_used": organization.ai_credits_used,
            "ai_credits_limit": organization.ai_credits_limit,
            "ai_credits_remaining": organization.ai_credits_limit - organization.ai_credits_used,
            "usage_percentage": (organization.ai_credits_used / organization.ai_credits_limit) * 100,
            "current_users": 1,  # Would be calculated from actual data
            "max_users": organization.max_users,
            "current_projects": 1,  # Would be calculated from actual data
            "max_projects": organization.max_projects,
            "storage_used_gb": 0.5,  # Would be calculated from actual data
            "max_storage_gb": organization.max_storage_gb
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting organization usage: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get organization usage"
        )
