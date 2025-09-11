from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.user.deps import CurrentUser
from app.modules.organizations.services import (
    OrganizationService,
    ProjectService,
    SubscriptionService,
    AIUsageService,
    PricingService,
)
from app.modules.organizations.schemas import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationResponse,
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    SubscriptionResponse,
    PricingResponse,
    OrganizationDashboard,
    UsageStats,
    PlanType,
    RoleName,
)

router = APIRouter()

# Initialize services
org_service = OrganizationService()
project_service = ProjectService()
subscription_service = SubscriptionService()
ai_usage_service = AIUsageService()
pricing_service = PricingService()


# Organization endpoints
@router.post("/organizations/", response_model=OrganizationResponse)
async def create_organization(
    org_data: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(CurrentUser.from_token),
):
    """Create new organization"""
    try:
        return await org_service.create_organization(db, org_data, current_user.user_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/organizations/", response_model=List[OrganizationResponse])
async def get_user_organizations(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(CurrentUser.from_token),
):
    """Get all organizations for current user"""
    return await org_service.get_user_organizations(db, current_user.user_id)


@router.get("/organizations/{org_id}", response_model=OrganizationResponse)
async def get_organization(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(CurrentUser.from_token),
):
    """Get organization by ID"""
    # Check user has access to organization
    has_access = await org_service.check_user_permission(
        db, current_user.user_id, org_id, "organization", "read"
    )
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    org = await org_service.repository.get(db, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    return OrganizationResponse.from_orm(org)


@router.put("/organizations/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: int,
    org_data: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(CurrentUser.from_token),
):
    """Update organization"""
    # Check user has admin access
    has_access = await org_service.check_user_permission(
        db, current_user.user_id, org_id, "organization", "write"
    )
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    org = await org_service.repository.update(db, org_id, org_data)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    return OrganizationResponse.from_orm(org)


@router.get("/organizations/{org_id}/dashboard", response_model=OrganizationDashboard)
async def get_organization_dashboard(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(CurrentUser.from_token),
):
    """Get organization dashboard data"""
    has_access = await org_service.check_user_permission(
        db, current_user.user_id, org_id, "organization", "read"
    )
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    return await org_service.get_organization_dashboard(db, org_id)


@router.get("/organizations/{org_id}/usage", response_model=UsageStats)
async def get_organization_usage(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(CurrentUser.from_token),
):
    """Get organization usage statistics"""
    has_access = await org_service.check_user_permission(
        db, current_user.user_id, org_id, "billing", "read"
    )
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    return await ai_usage_service.get_usage_stats(db, org_id)


# Project endpoints
@router.post("/projects/", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(CurrentUser.from_token),
):
    """Create new project"""
    # Check user has access to organization
    has_access = await org_service.check_user_permission(
        db, current_user.user_id, project_data.organization_id, "projects", "write"
    )
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        return await project_service.create_project(
            db, project_data, current_user.user_id
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/projects/", response_model=List[ProjectResponse])
async def get_user_projects(
    org_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(CurrentUser.from_token),
):
    """Get all projects for current user"""
    if org_id:
        has_access = await org_service.check_user_permission(
            db, current_user.user_id, org_id, "projects", "read"
        )
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")

    return await project_service.get_user_projects(db, current_user.user_id, org_id)


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(CurrentUser.from_token),
):
    """Get project by ID"""
    project = await project_service.repository.get(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check user has access to project's organization
    has_access = await org_service.check_user_permission(
        db, current_user.user_id, project.organization_id, "projects", "read"
    )
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    return ProjectResponse.from_orm(project)


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(CurrentUser.from_token),
):
    """Update project"""
    project = await project_service.repository.get(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check user has write access to project's organization
    has_access = await org_service.check_user_permission(
        db, current_user.user_id, project.organization_id, "projects", "write"
    )
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    updated_project = await project_service.repository.update(
        db, project_id, project_data
    )
    return ProjectResponse.from_orm(updated_project)


@router.post("/projects/{project_id}/members")
async def add_project_member(
    project_id: int,
    user_id: int,
    role_name: RoleName = RoleName.MEMBER,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(CurrentUser.from_token),
):
    """Add user to project"""
    project = await project_service.repository.get(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check user has admin access to project's organization
    has_access = await org_service.check_user_permission(
        db, current_user.user_id, project.organization_id, "users", "write"
    )
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    success = await project_service.add_user_to_project(
        db, project_id, user_id, role_name
    )
    if not success:
        raise HTTPException(status_code=400, detail="Failed to add user to project")

    return {"message": "User added to project successfully"}


# Subscription endpoints
@router.get(
    "/organizations/{org_id}/subscription",
    response_model=Optional[SubscriptionResponse],
)
async def get_organization_subscription(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(CurrentUser.from_token),
):
    """Get organization subscription"""
    has_access = await org_service.check_user_permission(
        db, current_user.user_id, org_id, "billing", "read"
    )
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    subscription = await subscription_service.repository.get_by_organization(db, org_id)
    return SubscriptionResponse.from_orm(subscription) if subscription else None


@router.post("/organizations/{org_id}/upgrade", response_model=SubscriptionResponse)
async def upgrade_organization_plan(
    org_id: int,
    plan_type: PlanType,
    payment_method_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(CurrentUser.from_token),
):
    """Upgrade organization plan"""
    has_access = await org_service.check_user_permission(
        db, current_user.user_id, org_id, "billing", "write"
    )
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        return await org_service.upgrade_plan(db, org_id, plan_type, payment_method_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Pricing endpoints
@router.get("/pricing", response_model=PricingResponse)
async def get_pricing_plans():
    """Get all pricing plans"""
    return pricing_service.get_pricing_plans()


# Simple test endpoint
@router.get("/test")
async def test_endpoint():
    """Test endpoint to verify API is working"""
    return {
        "message": "Organization API is working!",
        "features": [
            "Multi-tenant organizations",
            "Project management",
            "Role-based access control",
            "Subscription management",
            "AI usage tracking",
            "Billing system",
        ],
    }


# AI Usage endpoints
@router.post("/ai-usage/log")
async def log_ai_usage(
    organization_id: int,
    operation_type: str,
    model_used: str,
    tokens_used: int,
    credits_consumed: int,
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(CurrentUser.from_token),
):
    """Log AI usage (internal endpoint)"""
    from app.modules.organizations.schemas import AIUsageLogCreate

    usage_data = AIUsageLogCreate(
        organization_id=organization_id,
        user_id=current_user.user_id,
        project_id=project_id,
        operation_type=operation_type,
        model_used=model_used,
        tokens_used=tokens_used,
        credits_consumed=credits_consumed,
    )

    success = await ai_usage_service.log_ai_usage(db, usage_data)
    if not success:
        raise HTTPException(status_code=400, detail="AI credits limit exceeded")

    return {"message": "Usage logged successfully"}


# Webhook endpoints for Stripe
@router.post("/webhooks/stripe")
async def stripe_webhook(request: dict, db: Session = Depends(get_db)):
    """Handle Stripe webhooks"""
    # This would handle Stripe webhook events
    # Implementation depends on your Stripe webhook setup
    event_type = request.get("type")

    if event_type == "invoice.payment_succeeded":
        # Handle successful payment
        pass
    elif event_type == "customer.subscription.updated":
        # Handle subscription updates
        pass
    elif event_type == "customer.subscription.deleted":
        # Handle subscription cancellation
        pass

    return {"received": True}
