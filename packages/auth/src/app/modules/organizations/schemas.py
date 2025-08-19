"""
Organization and pricing plan schemas
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal
from enum import Enum


class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: Dict[str, Any] = {}
    is_system_role: bool = False


class RoleCreate(RoleBase):
    pass


class RoleResponse(RoleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrganizationBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    plan_type: str = "free"
    ai_credits_used: int = 0
    ai_credits_limit: int = 1000
    subscription_status: str = "active"
    trial_ends_at: Optional[datetime] = None


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None


class OrganizationResponse(OrganizationBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserOrganizationBase(BaseModel):
    user_id: int
    organization_id: int
    role_id: int
    is_owner: bool = False


class UserOrganizationCreate(UserOrganizationBase):
    pass


class UserOrganizationResponse(UserOrganizationBase):
    id: int
    joined_at: datetime
    user: Optional[Dict[str, Any]] = None
    organization: Optional[Dict[str, Any]] = None
    role: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    organization_id: int
    is_public: bool = False
    settings: Optional[Dict[str, Any]] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    settings: Optional[Dict[str, Any]] = None


class ProjectResponse(ProjectBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserProjectBase(BaseModel):
    user_id: int
    project_id: int
    role_id: int


class UserProjectCreate(UserProjectBase):
    pass


class UserProjectResponse(UserProjectBase):
    id: int
    joined_at: datetime

    class Config:
        from_attributes = True


class SubscriptionBase(BaseModel):
    organization_id: int
    plan_type: str
    status: str = "active"
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool = False
    stripe_subscription_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    subscription_metadata: Optional[Dict[str, Any]] = None


class SubscriptionCreate(SubscriptionBase):
    pass


class SubscriptionResponse(SubscriptionBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BillingTransactionBase(BaseModel):
    organization_id: int
    user_id: int
    subscription_id: Optional[int] = None
    amount: Decimal
    currency: str = "USD"
    transaction_type: str
    status: str = "pending"
    stripe_invoice_id: Optional[str] = None
    stripe_payment_intent_id: Optional[str] = None
    description: Optional[str] = None
    billing_metadata: Optional[Dict[str, Any]] = None


class BillingTransactionCreate(BillingTransactionBase):
    pass


class BillingTransactionResponse(BillingTransactionBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AIUsageLogBase(BaseModel):
    organization_id: int
    user_id: int
    project_id: Optional[int] = None
    operation_type: str
    model_used: str
    tokens_used: int
    credits_consumed: int
    cost_usd: Optional[Decimal] = None
    usage_metadata: Optional[Dict[str, Any]] = None


class AIUsageLogCreate(AIUsageLogBase):
    pass


class AIUsageLogResponse(AIUsageLogBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class PricingPlanBase(BaseModel):
    name: str
    plan_type: str
    price_monthly: Decimal
    price_yearly: Decimal
    ai_credits_monthly: int
    ai_credits_yearly: int
    features: Optional[List[str]] = None
    is_active: bool = True
    sort_order: int = 0


class PricingPlanCreate(PricingPlanBase):
    pass


class PricingPlanResponse(PricingPlanBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PricingResponse(BaseModel):
    """Response containing all pricing plans"""
    plans: List[PricingPlanResponse]
    current_plan: Optional[str] = None
    recommended_plan: Optional[str] = None


class UsageStats(BaseModel):
    ai_credits_used: int = 0
    ai_cost_usd: Decimal = Decimal('0.00')
    project_count: int = 0
    user_count: int = 0


class OrganizationDashboard(BaseModel):
    organization: OrganizationResponse
    usage_stats: UsageStats


class PlanType(str, Enum):
    FREE = "free"
    PRO = "pro"
    TEAM = "team"
    ENTERPRISE = "enterprise"


class RoleName(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


# Pricing Plan Templates
class PricingPlanTemplates:
    """Predefined pricing plans for the platform"""
    
    @staticmethod
    def get_free_plan() -> PricingPlanBase:
        return PricingPlanBase(
            name="Free",
            plan_type="free",
            price_monthly=Decimal('0.00'),
            price_yearly=Decimal('0.00'),
            ai_credits_monthly=50,
            ai_credits_yearly=600,
            features=[
                "Basic AI analysis",
                "Limited chart generation",
                "Watermark on charts",
                "1 project space",
                "Community support"
            ],
            sort_order=1
        )
    
    @staticmethod
    def get_pro_plan() -> PricingPlanBase:
        return PricingPlanBase(
            name="Pro",
            plan_type="pro",
            price_monthly=Decimal('15.00'),
            price_yearly=Decimal('150.00'),
            ai_credits_monthly=500,
            ai_credits_yearly=6000,
            features=[
                "Advanced AI analysis",
                "Unlimited chart generation",
                "No watermark",
                "1 organization workspace",
                "1 project space",
                "Deep analysis mode",
                "Basic theme customization",
                "Email support"
            ],
            sort_order=2
        )
    
    @staticmethod
    def get_team_plan() -> PricingPlanBase:
        return PricingPlanBase(
            name="Team",
            plan_type="team",
            price_monthly=Decimal('29.00'),
            price_yearly=Decimal('290.00'),
            ai_credits_monthly=1000,
            ai_credits_yearly=12000,
            features=[
                "Everything in Pro",
                "Multiple project spaces",
                "Team collaboration",
                "Unlimited AI commands",
                "Full theme customization",
                "Platform API access",
                "EChart MCP Server",
                "Custom AI provider keys",
                "Priority support"
            ],
            sort_order=3
        )
    
    @staticmethod
    def get_enterprise_plan() -> PricingPlanBase:
        return PricingPlanBase(
            name="Enterprise",
            plan_type="enterprise",
            price_monthly=Decimal('99.00'),
            price_yearly=Decimal('990.00'),
            ai_credits_monthly=5000,
            ai_credits_yearly=60000,
            features=[
                "Everything in Team",
                "Unlimited projects",
                "Advanced integrations",
                "White-label customization",
                "Dedicated support",
                "Local AI models",
                "On-premise deployment",
                "Custom AI providers",
                "SLA guarantee",
                "24/7 phone support"
            ],
            sort_order=4
        )
    
    @staticmethod
    def get_all_plans() -> List[PricingPlanBase]:
        return [
            PricingPlanTemplates.get_free_plan(),
            PricingPlanTemplates.get_pro_plan(),
            PricingPlanTemplates.get_team_plan(),
            PricingPlanTemplates.get_enterprise_plan()
        ]