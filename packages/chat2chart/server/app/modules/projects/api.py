from typing import Annotated, List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from app.common.schemas import ListResponseSchema, PaginationSchema
from app.common.utils.query_params import BaseFilterParams

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
from app.modules.authentication.auth import Auth
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
project_service = ProjectService()
organization_service = OrganizationService()


# Organization endpoints
@router.get("/organizations", response_model=List[OrganizationResponse])
async def get_organizations():
    """Get all organizations"""
    try:
        # Get real organizations from database
        result = await organization_service.get_all()
        return result
    except Exception as e:
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
async def update_organization(organization_id: str, organization: OrganizationUpdate):
    """Update organization"""
    try:
        result = await organization_service.update(organization_id, organization)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


# Project endpoints
@router.post("/projects", response_model=ProjectResponse)
async def create_project(project: ProjectCreate, current_token: str = Depends(JWTCookieBearer()), request: Request | None = None):
    """Create a new project deriving user from JWT cookie"""
    try:
        try:
            user_payload = current_token if isinstance(current_token, dict) else Auth().decodeJWT(current_token) or {}
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
    current_token: str = Depends(JWTCookieBearer()),
    request: Request = None,
):
    """Get all projects for a user"""
    try:
        # Resolve user id from JWT token
        try:
            user_payload = current_token if isinstance(current_token, dict) else Auth().decodeJWT(current_token) or {}
            user_id = int(user_payload.get('id') or user_payload.get('sub'))
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
            user_payload = current_token if isinstance(current_token, dict) else Auth().decodeJWT(current_token) or {}
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
            user_payload = current_token if isinstance(current_token, dict) else Auth().decodeJWT(current_token) or {}
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
            user_payload = current_token if isinstance(current_token, dict) else Auth().decodeJWT(current_token) or {}
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
            user_payload = current_token if isinstance(current_token, dict) else Auth().decodeJWT(current_token) or {}
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
async def get_organization_members(organization_id: str):
    """Get all members of an organization"""
    try:
        # For now, return sample data. In production, this would query the database
        sample_members = [
            {
                "id": "1",
                "name": "John Doe",
                "email": "john@example.com",
                "role": "owner",
                "status": "active",
                "joinDate": "2024-01-01T00:00:00Z",
            },
            {
                "id": "2",
                "name": "Jane Smith",
                "email": "jane@example.com",
                "role": "admin",
                "status": "active",
                "joinDate": "2024-01-15T00:00:00Z",
            },
        ]
        return sample_members
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/organizations/{organization_id}/members")
async def add_organization_member(organization_id: str, member_data: dict):
    """Add a new member to an organization"""
    try:
        # For now, return success. In production, this would add to database
        return {"success": True, "message": "Member added successfully"}
    except Exception as e:
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
async def get_organization_usage(organization_id: str):
    """Get organization usage statistics"""
    try:
        # For now, return sample data. In production, this would query the database
        sample_usage = {
            "totals": {
                "tokens_used": 15000,
                "cost_dollars": 45.50,
                "total_requests": 1250,
            },
            "limits": {
                "ai_credits_used": 15000,
                "ai_credits_limit": 10000,
                "max_projects": 50,
                "max_users": 100,
            },
            "period": "current_month",
        }
        return sample_usage
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
