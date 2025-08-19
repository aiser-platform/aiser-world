"""
Billing and Usage API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.core.database import get_db
from app.core.simple_enterprise_auth import get_current_user_simple, SimpleUserInfo
from app.modules.billing.services.usage_tracking_service import usage_service
from app.modules.teams.services.team_management_service import team_service
from pydantic import BaseModel

router = APIRouter()

class UsageLogRequest(BaseModel):
    model_name: str
    tokens_used: int
    request_type: str
    project_id: Optional[int] = None

class SubscriptionUpdateRequest(BaseModel):
    plan_type: str
    stripe_subscription_id: Optional[str] = None

@router.post("/usage/log")
async def log_ai_usage(
    request: UsageLogRequest,
    organization_id: int,
    current_user: SimpleUserInfo = Depends(get_current_user_simple),
    db: Session = Depends(get_db)
):
    """Log AI usage for billing tracking"""
    try:
        # Check if user has access to organization
        permission = await team_service.check_user_permission(
            int(current_user.user_id), organization_id, 'view_analytics', db
        )
        
        if not permission.get('allowed'):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        
        result = await usage_service.log_ai_usage(
            user_id=int(current_user.user_id),
            organization_id=organization_id,
            model_name=request.model_name,
            tokens_used=request.tokens_used,
            request_type=request.request_type,
            project_id=request.project_id,
            db=db
        )
        
        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Failed to log usage')
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/usage/stats/{organization_id}")
async def get_usage_statistics(
    organization_id: int,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: SimpleUserInfo = Depends(get_current_user_simple),
    db: Session = Depends(get_db)
):
    """Get usage statistics for organization"""
    try:
        # Check permissions
        permission = await team_service.check_user_permission(
            int(current_user.user_id), organization_id, 'view_analytics', db
        )
        
        if not permission.get('allowed'):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        
        # Parse dates if provided
        start_dt = datetime.fromisoformat(start_date) if start_date else None
        end_dt = datetime.fromisoformat(end_date) if end_date else None
        
        result = await usage_service.get_usage_stats(
            organization_id=organization_id,
            start_date=start_dt,
            end_date=end_dt,
            db=db
        )
        
        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Failed to get usage stats')
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/usage/limits/{organization_id}")
async def check_usage_limits(
    organization_id: int,
    tokens_requested: int = Query(...),
    current_user: SimpleUserInfo = Depends(get_current_user_simple),
    db: Session = Depends(get_db)
):
    """Check if organization can use requested tokens"""
    try:
        # Check permissions
        permission = await team_service.check_user_permission(
            int(current_user.user_id), organization_id, 'view_analytics', db
        )
        
        if not permission.get('allowed'):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        
        result = await usage_service.check_usage_limits(
            organization_id=organization_id,
            tokens_requested=tokens_requested,
            db=db
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/billing/report/{organization_id}")
async def get_billing_report(
    organization_id: int,
    month: int = Query(...),
    year: int = Query(...),
    current_user: SimpleUserInfo = Depends(get_current_user_simple),
    db: Session = Depends(get_db)
):
    """Generate monthly billing report"""
    try:
        # Check permissions
        permission = await team_service.check_user_permission(
            int(current_user.user_id), organization_id, 'manage_billing', db
        )
        
        if not permission.get('allowed'):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to view billing"
            )
        
        result = await usage_service.generate_billing_report(
            organization_id=organization_id,
            month=month,
            year=year,
            db=db
        )
        
        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Failed to generate billing report')
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/subscription/{organization_id}")
async def update_subscription(
    organization_id: int,
    request: SubscriptionUpdateRequest,
    current_user: SimpleUserInfo = Depends(get_current_user_simple),
    db: Session = Depends(get_db)
):
    """Update organization subscription"""
    try:
        # Check permissions
        permission = await team_service.check_user_permission(
            int(current_user.user_id), organization_id, 'manage_billing', db
        )
        
        if not permission.get('allowed'):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to manage billing"
            )
        
        result = await usage_service.update_subscription(
            organization_id=organization_id,
            plan_type=request.plan_type,
            stripe_subscription_id=request.stripe_subscription_id,
            db=db
        )
        
        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Failed to update subscription')
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )