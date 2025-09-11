"""
Team Management API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.simple_enterprise_auth import get_current_user_simple, SimpleUserInfo
from app.modules.teams.services.team_management_service import team_service, RoleName
from pydantic import BaseModel, EmailStr

router = APIRouter()


class InviteUserRequest(BaseModel):
    email: EmailStr
    role: RoleName


class UpdateRoleRequest(BaseModel):
    role: RoleName


@router.post("/organizations/{organization_id}/invite")
async def invite_user_to_organization(
    organization_id: int,
    request: InviteUserRequest,
    current_user: SimpleUserInfo = Depends(get_current_user_simple),
    db: Session = Depends(get_db),
):
    """Invite user to organization"""
    try:
        result = await team_service.invite_user_to_organization(
            organization_id=organization_id,
            email=request.email,
            role_name=request.role,
            invited_by_user_id=int(current_user.user_id),
            db=db,
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to invite user"),
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/organizations/{organization_id}/members")
async def get_organization_members(
    organization_id: int,
    current_user: SimpleUserInfo = Depends(get_current_user_simple),
    db: Session = Depends(get_db),
):
    """Get all members of an organization"""
    try:
        result = await team_service.get_organization_members(
            organization_id=organization_id,
            requesting_user_id=int(current_user.user_id),
            db=db,
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=result.get("error", "Access denied"),
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.put("/organizations/{organization_id}/members/{user_id}/role")
async def update_user_role(
    organization_id: int,
    user_id: int,
    request: UpdateRoleRequest,
    current_user: SimpleUserInfo = Depends(get_current_user_simple),
    db: Session = Depends(get_db),
):
    """Update user's role in organization"""
    try:
        result = await team_service.update_user_role(
            organization_id=organization_id,
            user_id=user_id,
            new_role_name=request.role,
            updated_by_user_id=int(current_user.user_id),
            db=db,
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to update role"),
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.delete("/organizations/{organization_id}/members/{user_id}")
async def remove_user_from_organization(
    organization_id: int,
    user_id: int,
    current_user: SimpleUserInfo = Depends(get_current_user_simple),
    db: Session = Depends(get_db),
):
    """Remove user from organization"""
    try:
        result = await team_service.remove_user_from_organization(
            organization_id=organization_id,
            user_id=user_id,
            removed_by_user_id=int(current_user.user_id),
            db=db,
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to remove user"),
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/organizations/{organization_id}/members/{user_id}/role")
async def get_user_role(
    organization_id: int,
    user_id: int,
    current_user: SimpleUserInfo = Depends(get_current_user_simple),
    db: Session = Depends(get_db),
):
    """Get user's role in organization"""
    try:
        # Check if requesting user has permission or is requesting their own role
        if int(current_user.user_id) != user_id:
            permission = await team_service.check_user_permission(
                int(current_user.user_id), organization_id, "view_analytics", db
            )

            if not permission.get("allowed"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions",
                )

        result = await team_service.get_user_role(
            user_id=user_id, organization_id=organization_id, db=db
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result.get("error", "User role not found"),
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/organizations/{organization_id}/accept-invitation")
async def accept_organization_invitation(
    organization_id: int,
    current_user: SimpleUserInfo = Depends(get_current_user_simple),
    db: Session = Depends(get_db),
):
    """Accept organization invitation"""
    try:
        result = await team_service.accept_invitation(
            user_id=int(current_user.user_id), organization_id=organization_id, db=db
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to accept invitation"),
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/organizations/{organization_id}/permissions")
async def get_user_permissions(
    organization_id: int,
    current_user: SimpleUserInfo = Depends(get_current_user_simple),
    db: Session = Depends(get_db),
):
    """Get current user's permissions in organization"""
    try:
        # Get user's role and permissions
        role_result = await team_service.get_user_role(
            user_id=int(current_user.user_id), organization_id=organization_id, db=db
        )

        if not role_result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User is not a member of this organization",
            )

        return {
            "success": True,
            "user_id": int(current_user.user_id),
            "organization_id": organization_id,
            "role": role_result["role"],
            "permissions": role_result["permissions"],
            "status": role_result["status"],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
