"""
Onboarding API
FastAPI endpoints for user onboarding
"""

import logging
import json
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.modules.authentication.deps.auth_bearer import JWTCookieBearer
from app.db.session import get_async_session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

logger = logging.getLogger(__name__)

router = APIRouter()


class OnboardingCompletionRequest(BaseModel):
    userId: Optional[str] = None
    onboardingData: Dict[str, Any]
    completedAt: str


class OnboardingCompletionResponse(BaseModel):
    success: bool
    message: str
    userId: str
    completedAt: str
    personalized: bool = True


@router.post("/complete", response_model=OnboardingCompletionResponse)
async def complete_onboarding(
    request: OnboardingCompletionRequest,
    current_user=Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session),
):
    """Complete user onboarding process"""
    try:
        user_id = current_user.get("id") if current_user else request.userId

        if not user_id:
            raise HTTPException(status_code=400, detail="User ID is required")

        logger.info(f"User {user_id} completed onboarding")

        # Save onboarding data to database
        onboarding_json = json.dumps(request.onboardingData)

        # Update user profile with onboarding data
        await db.execute(
            text("""
                UPDATE users 
                SET 
                    first_name = COALESCE(:first_name, first_name),
                    last_name = COALESCE(:last_name, last_name),
                    onboarding_data = :onboarding_data,
                    onboarding_completed_at = :completed_at,
                    updated_at = NOW()
                WHERE id = :user_id
            """),
            {
                "user_id": user_id,
                "first_name": request.onboardingData.get("fullName", "").split(" ")[0]
                if request.onboardingData.get("fullName")
                else None,
                "last_name": " ".join(
                    request.onboardingData.get("fullName", "").split(" ")[1:]
                )
                if request.onboardingData.get("fullName")
                and len(request.onboardingData.get("fullName", "").split(" ")) > 1
                else None,
                "onboarding_data": onboarding_json,
                "completed_at": request.completedAt,
            },
        )

        # Create organization if provided
        if request.onboardingData.get("organization"):
            org_result = await db.execute(
                text("""
                    INSERT INTO organizations (name, industry, company_size, created_by, created_at, updated_at)
                    VALUES (:name, :industry, :company_size, :created_by, NOW(), NOW())
                    ON CONFLICT (name) DO UPDATE SET
                        industry = EXCLUDED.industry,
                        company_size = EXCLUDED.company_size,
                        updated_at = NOW()
                    RETURNING id
                """),
                {
                    "name": request.onboardingData.get("organization"),
                    "industry": request.onboardingData.get("industry"),
                    "company_size": request.onboardingData.get("companySize"),
                    "created_by": user_id,
                },
            )
            org_id = org_result.scalar()

            # Add user to organization
            if org_id:
                await db.execute(
                    text("""
                        INSERT INTO organization_members (organization_id, user_id, role, joined_at)
                        VALUES (:org_id, :user_id, 'owner', NOW())
                        ON CONFLICT (organization_id, user_id) DO NOTHING
                    """),
                    {"org_id": org_id, "user_id": user_id},
                )

        await db.commit()

        logger.info(
            f"Onboarding data saved for user {user_id}: {request.onboardingData}"
        )

        return OnboardingCompletionResponse(
            success=True,
            message="Onboarding completed successfully",
            userId=user_id,
            completedAt=request.completedAt,
            personalized=True,
        )

    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to complete onboarding: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to complete onboarding")


@router.get("/status")
async def get_onboarding_status(
    current_user=Depends(JWTCookieBearer()),
    db: AsyncSession = Depends(get_async_session),
):
    """Get user's onboarding status"""
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
                    first_name,
                    last_name
                FROM users 
                WHERE id = :user_id
            """),
            {"user_id": user_id},
        )

        user_data = result.fetchone()

        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")

        completed = user_data.onboarding_completed_at is not None
        onboarding_data = (
            json.loads(user_data.onboarding_data) if user_data.onboarding_data else {}
        )

        return {
            "completed": completed,
            "userId": user_id,
            "onboardingData": onboarding_data,
            "userProfile": {
                "firstName": user_data.first_name,
                "lastName": user_data.last_name,
            },
            "currentStep": 0 if not completed else 5,
            "totalSteps": 5,
        }

    except Exception as e:
        logger.error(f"Failed to get onboarding status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get onboarding status")
