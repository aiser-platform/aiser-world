"""
Project Management API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from app.core.database import get_db
from app.core.simple_enterprise_auth import get_current_user_simple, SimpleUserInfo
from app.modules.projects.services.project_management_service import project_service
from pydantic import BaseModel

router = APIRouter()

class CreateProjectRequest(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = False
    settings: Optional[Dict[str, Any]] = None

class UpdateProjectRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    settings: Optional[Dict[str, Any]] = None

@router.post("/organizations/{organization_id}/projects")
async def create_project(
    organization_id: int,
    request: CreateProjectRequest,
    current_user: SimpleUserInfo = Depends(get_current_user_simple),
    db: Session = Depends(get_db)
):
    """Create a new project"""
    try:
        result = await project_service.create_project(
            name=request.name,
            description=request.description,
            organization_id=organization_id,
            created_by_user_id=int(current_user.user_id),
            is_public=request.is_public,
            settings=request.settings,
            db=db
        )
        
        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Failed to create project')
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/organizations/{organization_id}/projects")
async def get_organization_projects(
    organization_id: int,
    include_inactive: bool = Query(False),
    current_user: SimpleUserInfo = Depends(get_current_user_simple),
    db: Session = Depends(get_db)
):
    """Get all projects for an organization"""
    try:
        result = await project_service.get_organization_projects(
            organization_id=organization_id,
            user_id=int(current_user.user_id),
            include_inactive=include_inactive,
            db=db
        )
        
        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=result.get('error', 'Access denied')
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/projects/{project_id}")
async def get_project_details(
    project_id: int,
    current_user: SimpleUserInfo = Depends(get_current_user_simple),
    db: Session = Depends(get_db)
):
    """Get detailed project information"""
    try:
        result = await project_service.get_project_details(
            project_id=project_id,
            user_id=int(current_user.user_id),
            db=db
        )
        
        if not result.get('success'):
            status_code = status.HTTP_404_NOT_FOUND if 'not found' in result.get('error', '').lower() else status.HTTP_403_FORBIDDEN
            raise HTTPException(
                status_code=status_code,
                detail=result.get('error', 'Project access denied')
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/projects/{project_id}")
async def update_project(
    project_id: int,
    request: UpdateProjectRequest,
    current_user: SimpleUserInfo = Depends(get_current_user_simple),
    db: Session = Depends(get_db)
):
    """Update project information"""
    try:
        result = await project_service.update_project(
            project_id=project_id,
            user_id=int(current_user.user_id),
            name=request.name,
            description=request.description,
            is_public=request.is_public,
            settings=request.settings,
            db=db
        )
        
        if not result.get('success'):
            status_code = status.HTTP_404_NOT_FOUND if 'not found' in result.get('error', '').lower() else status.HTTP_403_FORBIDDEN
            raise HTTPException(
                status_code=status_code,
                detail=result.get('error', 'Failed to update project')
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: int,
    current_user: SimpleUserInfo = Depends(get_current_user_simple),
    db: Session = Depends(get_db)
):
    """Delete (deactivate) a project"""
    try:
        result = await project_service.delete_project(
            project_id=project_id,
            user_id=int(current_user.user_id),
            db=db
        )
        
        if not result.get('success'):
            status_code = status.HTTP_404_NOT_FOUND if 'not found' in result.get('error', '').lower() else status.HTTP_403_FORBIDDEN
            raise HTTPException(
                status_code=status_code,
                detail=result.get('error', 'Failed to delete project')
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/users/projects")
async def get_user_projects(
    organization_id: Optional[int] = Query(None),
    current_user: SimpleUserInfo = Depends(get_current_user_simple),
    db: Session = Depends(get_db)
):
    """Get all projects accessible to current user"""
    try:
        result = await project_service.get_user_projects(
            user_id=int(current_user.user_id),
            organization_id=organization_id,
            db=db
        )
        
        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Failed to get user projects')
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )