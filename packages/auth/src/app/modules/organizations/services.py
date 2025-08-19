"""
Organization service with correct business logic:
- No organization creation allowed (only default organization)
- Users can only edit existing organization
- Upgrade to team plan for additional features
"""

import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime, timedelta

from app.common.service import BaseService
from app.modules.organizations.models import (
    Organization, UserOrganization, Role, Project, UserProject,
    Subscription, BillingTransaction, AIUsageLog, PricingPlan
)
from app.modules.organizations.repository import OrganizationRepository
from app.modules.organizations.schemas import (
    OrganizationResponse, OrganizationUpdate, UserOrganizationCreate,
    ProjectCreate, ProjectResponse, SubscriptionResponse,
    PricingResponse, OrganizationDashboard, UsageStats
)
from app.modules.user.models import User

logger = logging.getLogger(__name__)


class OrganizationService(BaseService[Organization, None, OrganizationUpdate, OrganizationResponse]):
    """Organization service with restricted creation logic"""
    
    def __init__(self):
        self.repository = OrganizationRepository()
        super().__init__(self.repository)

    def get_default_organization(self, db: Session) -> Optional[Organization]:
        """Get the default organization (only one allowed)"""
        return db.query(Organization).filter(
            Organization.is_active == True,
            Organization.is_deleted == False
        ).first()

    def create_organization(self, org_data: Dict[str, Any], user_id: int, db: Session) -> OrganizationResponse:
        """
        Create organization - RESTRICTED: Only allowed for system admins
        Regular users cannot create organizations
        """
        # Check if organization already exists
        existing_org = self.get_default_organization(db)
        if existing_org:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization creation not allowed. Only one organization is permitted."
            )
        
        # Check if user has admin privileges (implement proper role checking)
        # For now, we'll restrict this completely
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization creation is restricted. Please contact support for assistance."
        )

    def get_user_organizations(self, user_id: int, db: Session) -> List[OrganizationResponse]:
        """Get organizations for user (will only be the default one)"""
        # Users can only access the default organization
        org = self.get_default_organization(db)
        if not org:
            # Create default organization if none exists
            org = self._create_default_organization(db)
        
        # Check if user is member of this organization
        user_org = db.query(UserOrganization).filter(
            UserOrganization.user_id == user_id,
            UserOrganization.organization_id == org.id
        ).first()
        
        if not user_org:
            # Add user to default organization with basic role
            self._add_user_to_organization(user_id, org.id, db)
        
        return [OrganizationResponse.from_orm(org)]

    def _create_default_organization(self, db: Session) -> Organization:
        """Create the default organization (system initialization only)"""
        default_org = Organization(
            name="Default Organization",
            slug="default",
            description="Default organization for all users",
            plan_type="free",
            created_by=1,  # System user ID
            is_active=True
        )
        db.add(default_org)
        db.commit()
        db.refresh(default_org)
        return default_org

    def _add_user_to_organization(self, user_id: int, org_id: int, db: Session):
        """Add user to organization with basic role"""
        # Get basic member role
        member_role = db.query(Role).filter(Role.name == "member").first()
        if not member_role:
            # Create basic member role if it doesn't exist
            member_role = Role(
                name="member",
                description="Basic member with limited permissions",
                permissions={"projects": ["read"], "files": ["read"]},
                is_system_role=True
            )
            db.add(member_role)
            db.commit()
            db.refresh(member_role)
        
        # Add user to organization
        user_org = UserOrganization(
            user_id=user_id,
            organization_id=org_id,
            role_id=member_role.id,
            is_owner=False
        )
        db.add(user_org)
        db.commit()

    def update_organization(self, org_id: int, org_data: OrganizationUpdate, user_id: int, db: Session) -> OrganizationResponse:
        """Update organization (only allowed for organization owners)"""
        org = self.repository.get(db, org_id)
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        # Check if user is owner
        user_org = db.query(UserOrganization).filter(
            UserOrganization.user_id == user_id,
            UserOrganization.organization_id == org_id,
            UserOrganization.is_owner == True
        ).first()
        
        if not user_org:
            raise HTTPException(status_code=403, detail="Only organization owners can update organization")
        
        # Update organization
        updated_org = self.repository.update(db, org_id, org_data)
        return OrganizationResponse.from_orm(updated_org)

    def check_user_permission(self, user_id: int, org_id: int, resource: str, action: str, db: Session) -> bool:
        """Check if user has permission for resource and action"""
        user_org = db.query(UserOrganization).filter(
            UserOrganization.user_id == user_id,
            UserOrganization.organization_id == org_id
        ).first()
        
        if not user_org:
            return False
        
        role = user_org.role
        return role.has_permission(resource, action)

    def get_organization_dashboard(self, org_id: int, user_id: int, db: Session) -> OrganizationDashboard:
        """Get organization dashboard with usage stats"""
        # Check access
        if not self.check_user_permission(user_id, org_id, "organization", "read", db):
            raise HTTPException(status_code=403, detail="Access denied")
        
        org = self.repository.get(db, org_id)
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        # Get usage stats
        usage_stats = self._get_usage_stats(org_id, db)
        
        return OrganizationDashboard(
            organization=OrganizationResponse.from_orm(org),
            usage_stats=usage_stats
        )

    def _get_usage_stats(self, org_id: int, db: Session) -> UsageStats:
        """Get organization usage statistics"""
        # AI usage
        ai_usage = db.query(AIUsageLog).filter(
            AIUsageLog.organization_id == org_id
        ).all()
        
        total_credits_used = sum(log.credits_consumed for log in ai_usage)
        total_cost = sum(log.cost_usd or 0 for log in ai_usage)
        
        # Project count
        project_count = db.query(Project).filter(
            Project.organization_id == org_id,
            Project.is_active == True
        ).count()
        
        # User count
        user_count = db.query(UserOrganization).filter(
            UserOrganization.organization_id == org_id
        ).count()
        
        return UsageStats(
            ai_credits_used=total_credits_used,
            ai_cost_usd=total_cost,
            project_count=project_count,
            user_count=user_count
        )


class PricingService:
    """Pricing plan service for organization upgrades"""
    
    def get_available_plans(self, db: Session) -> List[PricingResponse]:
        """Get available pricing plans"""
        plans = db.query(PricingPlan).filter(
            PricingPlan.is_active == True
        ).order_by(PricingPlan.sort_order).all()
        
        return [PricingResponse.from_orm(plan) for plan in plans]

    def upgrade_organization_plan(self, org_id: int, plan_type: str, user_id: int, db: Session) -> SubscriptionResponse:
        """Upgrade organization to a paid plan"""
        # Check if user is organization owner
        user_org = db.query(UserOrganization).filter(
            UserOrganization.user_id == user_id,
            UserOrganization.organization_id == org_id,
            UserOrganization.is_owner == True
        ).first()
        
        if not user_org:
            raise HTTPException(status_code=403, detail="Only organization owners can upgrade plans")
        
        # Get pricing plan
        plan = db.query(PricingPlan).filter(
            PricingPlan.plan_type == plan_type,
            PricingPlan.is_active == True
        ).first()
        
        if not plan:
            raise HTTPException(status_code=404, detail="Pricing plan not found")
        
        # Create subscription
        subscription = Subscription(
            organization_id=org_id,
            plan_type=plan_type,
            status="pending",  # Will be activated after payment
            current_period_start=datetime.utcnow(),
            current_period_end=datetime.utcnow() + timedelta(days=30),
            created_by=user_id
        )
        
        db.add(subscription)
        db.commit()
        db.refresh(subscription)
        
        return SubscriptionResponse.from_orm(subscription)


class ProjectService(BaseService[Project, ProjectCreate, None, ProjectResponse]):
    """Project service with organization restrictions"""
    
    def __init__(self):
        self.repository = OrganizationRepository()
        super().__init__(self.repository)

    def create_project(self, project_data: ProjectCreate, user_id: int, db: Session) -> ProjectResponse:
        """Create project (only allowed for team plan users)"""
        # Check if user's organization has team plan
        user_org = db.query(UserOrganization).filter(
            UserOrganization.user_id == user_id
        ).first()
        
        if not user_org:
            raise HTTPException(status_code=403, detail="User must be part of an organization")
        
        # Check if organization has team plan
        subscription = db.query(Subscription).filter(
            Subscription.organization_id == user_org.organization_id,
            Subscription.status == "active",
            Subscription.plan_type.in_(["team", "enterprise"])
        ).first()
        
        if not subscription:
            raise HTTPException(
                status_code=403, 
                detail="Team plan required to create projects. Please upgrade your organization plan."
            )
        
        # Create project
        project = Project(
            **project_data.dict(),
            created_by=user_id
        )
        
        db.add(project)
        db.commit()
        db.refresh(project)
        
        return ProjectResponse.from_orm(project)


class SubscriptionService(BaseService[Subscription, None, None, SubscriptionResponse]):
    """Subscription service for plan management"""
    
    def __init__(self):
        self.repository = OrganizationRepository()
        super().__init__(self.repository)

    def get_organization_subscription(self, org_id: int, db: Session) -> Optional[SubscriptionResponse]:
        """Get current subscription for organization"""
        subscription = db.query(Subscription).filter(
            Subscription.organization_id == org_id,
            Subscription.status == "active"
        ).first()
        
        if subscription:
            return SubscriptionResponse.from_orm(subscription)
        return None


class AIUsageService:
    """AI usage tracking service"""
    
    def log_usage(self, org_id: int, user_id: int, project_id: Optional[int], 
                  operation_type: str, model_used: str, tokens_used: int, 
                  credits_consumed: int, cost_usd: float, db: Session) -> AIUsageLog:
        """Log AI usage for billing and analytics"""
        usage_log = AIUsageLog(
            organization_id=org_id,
            user_id=user_id,
            project_id=project_id,
            operation_type=operation_type,
            model_used=model_used,
            tokens_used=tokens_used,
            credits_consumed=credits_consumed,
            cost_usd=cost_usd
        )
        
        db.add(usage_log)
        db.commit()
        db.refresh(usage_log)
        
        return usage_log