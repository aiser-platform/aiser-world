from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException

from app.modules.user.deps import CurrentUser
from app.modules.tenants.projects.schemas import (
    ProjectCreateSchema,
    ProjectUpdateSchema,
    ProjectResponseSchema,
)
from app.modules.tenants.project_users.schemas import (
    ProjectUserCreate,
    ProjectUserResponse,
    ProjectUserDetailResponse,
)
from app.modules.tenants.constants.tenant_enums import ProjectRole
from app.modules.tenants.projects.services import ProjectService
from app.modules.tenants.project_users.services import ProjectUserService

router = APIRouter()
project_service = ProjectService()
project_user_service = ProjectUserService()


@router.post("/", response_model=ProjectResponseSchema)
async def create_project(
    project: ProjectCreateSchema,
    organization_id: UUID,
    current_user: CurrentUser = Depends(CurrentUser.from_token),
):
    """Create a new project"""
    return await project_service.create_project(
        project, current_user.user_id, organization_id
    )


@router.post("/{project_id}/users", response_model=ProjectUserResponse)
async def add_user_to_project(
    project_id: UUID,
    user_data: ProjectUserCreate,
    current_user: CurrentUser = Depends(CurrentUser.from_token),
):
    """Add a user to a project"""
    # Verify current user is project admin
    user_role = await project_user_service.get_user_project_role(
        project_id, current_user.user_id
    )
    if user_role.role != ProjectRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Only project admins can add users",
        )

    # Set project_id from path parameter
    user_data.project_id = project_id

    return await project_user_service.add_user_to_project(user_data)


@router.get("/{project_id}/users", response_model=List[ProjectUserDetailResponse])
async def list_project_users(
    project_id: UUID,
    current_user: CurrentUser = Depends(CurrentUser.from_token),
):
    """Get all users in a project"""
    # Verify user is project member
    await project_user_service.get_user_project_role(project_id, current_user.user_id)
    return await project_user_service.get_project_members(project_id)


@router.get("/", response_model=List[ProjectResponseSchema])
async def get_user_projects(
    tenant_id: Optional[UUID] = None,
    current_user: CurrentUser = Depends(CurrentUser.from_token),
):
    """Get all projects for current user"""
    return await project_service.get_user_projects(current_user.user_id, tenant_id)


@router.put("/{project_id}", response_model=ProjectResponseSchema)
async def update_project(
    project_id: UUID,
    project_data: ProjectUpdateSchema,
    current_user: CurrentUser = Depends(CurrentUser.from_token),
):
    """Update project details"""
    return await project_service.update_project(
        project_id, project_data, current_user.user_id
    )


@router.delete("/{project_id}")
async def delete_project(
    project_id: UUID,
    current_user: CurrentUser = Depends(CurrentUser.from_token),
):
    """Delete a project"""
    return await project_service.delete_project(project_id, current_user.user_id)
