"""
Onboarding API
FastAPI endpoints for user onboarding
"""

import logging
import json
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from app.modules.authentication.deps.auth_bearer import JWTCookieBearer
from app.db.session import get_async_session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.modules.onboarding.services import OnboardingService
from app.modules.onboarding.frictionless_optimizer import FrictionlessOptimizer
from app.modules.onboarding.enhanced_onboarding import EnhancedOnboardingService

logger = logging.getLogger(__name__)

router = APIRouter()


class OnboardingCompletionRequest(BaseModel):
    userId: Optional[str] = None
    onboardingData: Dict[str, Any]
    completedAt: str


class OnboardingCompletionResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    userId: str
    completedAt: str
    personalized: bool = True


@router.post("/complete", response_model=OnboardingCompletionResponse)
async def complete_onboarding(
    request: OnboardingCompletionRequest,
    current_user=Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session),
):
    """Complete user onboarding process with enhanced provisioning"""
    try:
        user_id = current_user.get("id") if current_user else request.userId

        if not user_id:
            raise HTTPException(status_code=400, detail="User ID is required")

        logger.info(f"User {user_id} completed onboarding")

        # Use onboarding service for enhanced provisioning
        onboarding_service = OnboardingService(db)
        result = await onboarding_service.complete_onboarding(
            user_id=str(user_id),
            onboarding_data=request.onboardingData,
        )

        if not result.get("success"):
            raise HTTPException(status_code=500, detail="Failed to complete onboarding")

        logger.info(
            f"Onboarding completed for user {user_id}. "
            f"Organization: {result.get('organization_id')}, "
            f"Project: {result.get('project_id')}, "
            f"Plan: {result.get('plan_type')}"
        )

        return OnboardingCompletionResponse(
            success=True,
            message="Onboarding completed successfully",
            userId=str(user_id),
            completedAt=request.completedAt,
            personalized=True,
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to complete onboarding: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to complete onboarding: {str(e)}")


@router.post("/progress")
async def save_onboarding_progress(
    request: Dict[str, Any] = Body(...),
    current_user=Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session),
):
    """Save onboarding progress for a specific step with friction tracking"""
    try:
        user_id = current_user.get("id") if current_user else None

        if not user_id:
            raise HTTPException(status_code=400, detail="User ID is required")

        step = request.get("step")
        data = request.get("data", {})
        
        if not step:
            raise HTTPException(status_code=400, detail="Step is required")

        onboarding_service = OnboardingService(db)
        success = await onboarding_service.save_onboarding_progress(
            user_id=str(user_id),
            step=step,
            data=data,
        )

        if not success:
            raise HTTPException(status_code=500, detail="Failed to save progress")
        
        # Track step completion
        optimizer = FrictionlessOptimizer(db)
        await optimizer.track_friction_points(
            user_id=str(user_id),
            step=step,
            action="step_completed",
        )

        return {"success": True, "step": step}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to save onboarding progress: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save progress")


@router.get("/flow")
async def get_onboarding_flow(
    current_user=Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session),
):
    """Get optimized onboarding flow (minimal vs full)"""
    try:
        user_id = current_user.get("id") if current_user else None

        if not user_id:
            raise HTTPException(status_code=400, detail="User ID is required")

        optimizer = FrictionlessOptimizer(db)
        flow = await optimizer.get_minimal_onboarding_flow(user_id=str(user_id))
        
        return flow

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get onboarding flow: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get onboarding flow")


@router.get("/help/{step}")
async def get_contextual_help(
    step: str,
    db: AsyncSession = Depends(get_async_session),
):
    """Get contextual help for a specific onboarding step (works without auth)"""
    try:
        user_data = {}
        
        # Try to get user if authenticated, but don't require it
        try:
            current_user = await JWTCookieBearer()(request=None)
            user_id = current_user.get("id") if current_user else None
            
            if user_id:
                # Get user data if authenticated
                result = await db.execute(
                    text("SELECT onboarding_data FROM users WHERE id = $1"),
                    (user_id,)
                )
                user = result.fetchone()
                if user and user.onboarding_data:
                    try:
                        user_data = json.loads(user.onboarding_data) if isinstance(user.onboarding_data, str) else user.onboarding_data
                    except (json.JSONDecodeError, TypeError):
                        user_data = {}
        except Exception:
            # Not authenticated or error - that's okay, we'll return default help
            pass

        # Get help content (works even without user data)
        optimizer = FrictionlessOptimizer(db)
        help_content = await optimizer.get_contextual_help(
            step=step,
            user_data=user_data,
        )
        
        return help_content

    except Exception as e:
        logger.error(f"Failed to get contextual help: {str(e)}")
        # Return default help content instead of error
        optimizer = FrictionlessOptimizer(db)
        return await optimizer.get_contextual_help(step=step, user_data={})


@router.get("/status")
async def get_onboarding_status(
    current_user=Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session),
):
    """Get user's onboarding status with progress tracking"""
    try:
        user_id = current_user.get("id") if current_user else None

        if not user_id:
            raise HTTPException(status_code=400, detail="User ID is required")

        # Check onboarding status from database
        result = await db.execute(
            text("""
                SELECT 
                    onboarding_completed_at,
                    onboarding_data,
                    onboarding_progress,
                    onboarding_started_at,
                    first_name,
                    last_name
                FROM users 
                WHERE id = $1
            """),
            (user_id,),
        )

        user_data = result.fetchone()

        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")

        completed = user_data.onboarding_completed_at is not None
        # Handle both string and dict formats from database
        if user_data.onboarding_data:
            if isinstance(user_data.onboarding_data, str):
                onboarding_data = json.loads(user_data.onboarding_data)
            else:
                onboarding_data = user_data.onboarding_data
        else:
            onboarding_data = {}
        
        if user_data.onboarding_progress:
            if isinstance(user_data.onboarding_progress, str):
                onboarding_progress = json.loads(user_data.onboarding_progress)
            else:
                onboarding_progress = user_data.onboarding_progress
        else:
            onboarding_progress = {}

        # Calculate current step from progress
        completed_steps = list(onboarding_progress.keys())
        current_step = len(completed_steps)

        return {
            "completed": completed,
            "userId": user_id,
            "onboardingData": onboarding_data,
            "onboardingProgress": onboarding_progress,
            "completedSteps": completed_steps,
            "userProfile": {
                "firstName": user_data.first_name,
                "lastName": user_data.last_name,
            },
            "currentStep": current_step,
            "totalSteps": 5,
            "startedAt": user_data.onboarding_started_at.isoformat() if user_data.onboarding_started_at else None,
            "completedAt": user_data.onboarding_completed_at.isoformat() if user_data.onboarding_completed_at else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get onboarding status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get onboarding status")
