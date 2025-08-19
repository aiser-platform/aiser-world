from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, JSON, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timedelta

from app.common.model import BaseModel


class Role(BaseModel):
    """Role model for organization and project permissions"""
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False, unique=True)
    description = Column(String(255), nullable=True)
    permissions = Column(JSON, nullable=False)
    is_system_role = Column(Boolean, nullable=False, default=False)

    # Relationships
    user_organizations = relationship("UserOrganization", back_populates="role")
    user_projects = relationship("UserProject", back_populates="role")

    def has_permission(self, resource: str, action: str) -> bool:
        """Check if role has permission for resource and action"""
        if not self.permissions:
            return False
        
        # Check for all permissions
        if self.permissions.get("all") is True:
            return True
        
        # Check specific resource permissions
        resource_perms = self.permissions.get(resource, [])
        if isinstance(resource_perms, list):
            return action in resource_perms
        
        return False


class Organization(BaseModel):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(50), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    logo_url = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)
    plan_type = Column(String(20), nullable=False, default='free')
    ai_credits_used = Column(Integer, nullable=False, default=0)
    ai_credits_limit = Column(Integer, nullable=False, default=1000)
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    subscription_status = Column(String(20), nullable=False, default='active')
    trial_ends_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relationships
    user_organizations = relationship("UserOrganization", back_populates="organization")
    projects = relationship("Project", back_populates="organization")
    subscriptions = relationship("Subscription", back_populates="organization")
    ai_usage_logs = relationship("AIUsageLog", back_populates="organization")
    billing_transactions = relationship("BillingTransaction", back_populates="organization")


class UserOrganization(BaseModel):
    __tablename__ = "user_organizations"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    is_owner = Column(Boolean, nullable=False, default=False)
    joined_at = Column(DateTime, nullable=False, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="user_organizations")
    organization = relationship("Organization", back_populates="user_organizations")
    role = relationship("Role", back_populates="user_organizations")


class Project(BaseModel):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_public = Column(Boolean, nullable=False, default=False)
    settings = Column(JSON, nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="projects")
    user_projects = relationship("UserProject", back_populates="project")
    ai_usage_logs = relationship("AIUsageLog", back_populates="project")


class UserProject(BaseModel):
    __tablename__ = "user_projects"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    joined_at = Column(DateTime, nullable=False, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="user_projects")
    project = relationship("Project", back_populates="user_projects")
    role = relationship("Role", back_populates="user_projects")


class Subscription(BaseModel):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    plan_type = Column(String(20), nullable=False)
    status = Column(String(20), nullable=False, default='active')
    current_period_start = Column(DateTime, nullable=False)
    current_period_end = Column(DateTime, nullable=False)
    cancel_at_period_end = Column(Boolean, nullable=False, default=False)
    stripe_subscription_id = Column(String(255), nullable=True)
    stripe_customer_id = Column(String(255), nullable=True)
    subscription_metadata = Column(JSON, nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="subscriptions")
    billing_transactions = relationship("BillingTransaction", back_populates="subscription")


class AIUsageLog(BaseModel):
    __tablename__ = "ai_usage_logs"

    id = Column(Integer, primary_key=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    operation_type = Column(String(50), nullable=False)
    model_used = Column(String(100), nullable=False)
    tokens_used = Column(Integer, nullable=False)
    credits_consumed = Column(Integer, nullable=False)
    cost_usd = Column(Numeric(10, 4), nullable=True)
    usage_metadata = Column(JSON, nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="ai_usage_logs")
    user = relationship("User", back_populates="ai_usage_logs")
    project = relationship("Project", back_populates="ai_usage_logs")


class PricingPlan(BaseModel):
    __tablename__ = "pricing_plans"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    plan_type = Column(String(20), nullable=False, unique=True)
    price_monthly = Column(Numeric(10, 2), nullable=False)
    price_yearly = Column(Numeric(10, 2), nullable=False)
    ai_credits_monthly = Column(Integer, nullable=False)
    ai_credits_yearly = Column(Integer, nullable=False)
    features = Column(JSON, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)


class BillingTransaction(BaseModel):
    __tablename__ = "billing_transactions"

    id = Column(Integer, primary_key=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), nullable=False, default='USD')
    transaction_type = Column(String(50), nullable=False)  # 'charge', 'refund', 'credit'
    status = Column(String(20), nullable=False, default='pending')
    stripe_invoice_id = Column(String(255), nullable=True)
    stripe_payment_intent_id = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    billing_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="billing_transactions")
    user = relationship("User", back_populates="billing_transactions")
    subscription = relationship("Subscription", back_populates="billing_transactions")