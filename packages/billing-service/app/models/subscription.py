"""
Real Billing & Subscription Management Models
Production-ready billing system for Aiser Platform
"""

from sqlalchemy import (
    Column,
    String,
    Integer,
    DateTime,
    Boolean,
    Text,
    JSON,
    ForeignKey,
    Numeric,
    Enum,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
import uuid

Base = declarative_base()


class PlanType(PyEnum):
    FREE = "free"
    PRO = "pro"
    TEAM = "team"
    ENTERPRISE = "enterprise"
    CUSTOM = "custom"


class SubscriptionStatus(PyEnum):
    ACTIVE = "active"
    TRIAL = "trial"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    UNPAID = "unpaid"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"


class PaymentStatus(PyEnum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELED = "canceled"
    REFUNDED = "refunded"


class BillingCycle(PyEnum):
    MONTHLY = "monthly"
    YEARLY = "yearly"
    QUARTERLY = "quarterly"


class Plan(Base):
    """Subscription plans with real pricing and limits"""

    __tablename__ = "plans"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False, unique=True)
    type = Column(Enum(PlanType), nullable=False)
    description = Column(Text, nullable=True)

    # Pricing
    price_monthly = Column(Numeric(10, 2), nullable=False, default=0)
    price_yearly = Column(Numeric(10, 2), nullable=False, default=0)
    currency = Column(String(3), nullable=False, default="USD")

    # Limits
    max_users = Column(Integer, nullable=False, default=1)
    max_projects = Column(Integer, nullable=False, default=1)
    max_dashboards = Column(Integer, nullable=False, default=3)
    max_data_sources = Column(Integer, nullable=False, default=5)
    max_storage_gb = Column(Integer, nullable=False, default=1)
    max_api_calls_per_month = Column(Integer, nullable=False, default=1000)
    max_ai_credits_per_month = Column(Integer, nullable=False, default=100)

    # Features
    features = Column(JSON, nullable=False, default=dict)

    # Status
    is_active = Column(Boolean, nullable=False, default=True)
    is_public = Column(Boolean, nullable=False, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    subscriptions = relationship("Subscription", back_populates="plan")


class Subscription(Base):
    """Organization subscriptions with real billing"""

    __tablename__ = "subscriptions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    plan_id = Column(String, ForeignKey("plans.id"), nullable=False)

    # Subscription details
    status = Column(
        Enum(SubscriptionStatus), nullable=False, default=SubscriptionStatus.TRIAL
    )
    billing_cycle = Column(
        Enum(BillingCycle), nullable=False, default=BillingCycle.MONTHLY
    )

    # Trial information
    trial_start = Column(DateTime(timezone=True), nullable=True)
    trial_end = Column(DateTime(timezone=True), nullable=True)
    trial_extended = Column(Boolean, nullable=False, default=False)

    # Billing information
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end = Column(Boolean, nullable=False, default=False)
    canceled_at = Column(DateTime(timezone=True), nullable=True)

    # Payment information
    payment_method_id = Column(String, nullable=True)  # Stripe payment method ID
    default_payment_method = Column(String, nullable=True)

    # Usage tracking
    usage_data = Column(JSON, nullable=False, default=dict)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="subscription")
    plan = relationship("Plan", back_populates="subscriptions")
    invoices = relationship("Invoice", back_populates="subscription")
    usage_records = relationship("UsageRecord", back_populates="subscription")


class Invoice(Base):
    """Real invoices with payment tracking"""

    __tablename__ = "invoices"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    subscription_id = Column(String, ForeignKey("subscriptions.id"), nullable=False)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)

    # Invoice details
    invoice_number = Column(String(50), nullable=False, unique=True)
    status = Column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING)

    # Amounts
    subtotal = Column(Numeric(10, 2), nullable=False)
    tax_amount = Column(Numeric(10, 2), nullable=False, default=0)
    discount_amount = Column(Numeric(10, 2), nullable=False, default=0)
    total_amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="USD")

    # Billing period
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)

    # Payment information
    payment_intent_id = Column(String, nullable=True)  # Stripe payment intent ID
    payment_method_id = Column(String, nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)

    # External references
    stripe_invoice_id = Column(String, nullable=True)
    stripe_payment_intent_id = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    due_date = Column(DateTime(timezone=True), nullable=False)

    # Relationships
    subscription = relationship("Subscription", back_populates="invoices")
    organization = relationship("Organization")
    line_items = relationship("InvoiceLineItem", back_populates="invoice")


class InvoiceLineItem(Base):
    """Invoice line items for detailed billing"""

    __tablename__ = "invoice_line_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id = Column(String, ForeignKey("invoices.id"), nullable=False)

    # Line item details
    description = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Numeric(10, 2), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)

    # Metadata
    metadata = Column(JSON, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    invoice = relationship("Invoice", back_populates="line_items")


class UsageRecord(Base):
    """Real usage tracking for billing"""

    __tablename__ = "usage_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    subscription_id = Column(String, ForeignKey("subscriptions.id"), nullable=False)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)

    # Usage details
    metric_name = Column(
        String(100), nullable=False
    )  # e.g., "api_calls", "storage_gb", "ai_credits"
    quantity = Column(Integer, nullable=False, default=0)
    unit = Column(String(50), nullable=False)  # e.g., "calls", "gb", "credits"

    # Time period
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)

    # Metadata
    metadata = Column(JSON, nullable=True)

    # Timestamps
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    subscription = relationship("Subscription", back_populates="usage_records")
    organization = relationship("Organization")


class PaymentMethod(Base):
    """Payment methods for organizations"""

    __tablename__ = "payment_methods"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)

    # Payment method details
    type = Column(String(50), nullable=False)  # "card", "bank_account", "paypal"
    is_default = Column(Boolean, nullable=False, default=False)

    # External references
    stripe_payment_method_id = Column(String, nullable=True)
    stripe_customer_id = Column(String, nullable=True)

    # Card details (encrypted)
    card_last4 = Column(String(4), nullable=True)
    card_brand = Column(String(20), nullable=True)
    card_exp_month = Column(Integer, nullable=True)
    card_exp_year = Column(Integer, nullable=True)

    # Status
    is_active = Column(Boolean, nullable=False, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    organization = relationship("Organization")


class Coupon(Base):
    """Discount coupons and promotions"""

    __tablename__ = "coupons"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(50), nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    # Discount details
    discount_type = Column(String(20), nullable=False)  # "percentage" or "fixed_amount"
    discount_value = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), nullable=True)  # Required for fixed_amount

    # Usage limits
    max_redemptions = Column(Integer, nullable=True)
    max_redemptions_per_customer = Column(Integer, nullable=True, default=1)

    # Validity
    valid_from = Column(DateTime(timezone=True), nullable=False)
    valid_until = Column(DateTime(timezone=True), nullable=True)

    # Status
    is_active = Column(Boolean, nullable=False, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    redemptions = relationship("CouponRedemption", back_populates="coupon")


class CouponRedemption(Base):
    """Coupon redemption tracking"""

    __tablename__ = "coupon_redemptions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    coupon_id = Column(String, ForeignKey("coupons.id"), nullable=False)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    subscription_id = Column(String, ForeignKey("subscriptions.id"), nullable=True)

    # Redemption details
    discount_amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="USD")

    # Timestamps
    redeemed_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    coupon = relationship("Coupon", back_populates="redemptions")
    organization = relationship("Organization")
    subscription = relationship("Subscription")


# Update Organization model to include subscription relationship
class Organization(Base):
    """Updated Organization model with subscription"""

    __tablename__ = "organizations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False, unique=True)
    slug = Column(String(50), nullable=False, unique=True)
    description = Column(Text, nullable=True)

    # Billing information
    billing_email = Column(String(255), nullable=True)
    billing_address = Column(JSON, nullable=True)
    tax_id = Column(String(50), nullable=True)

    # Stripe integration
    stripe_customer_id = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    subscription = relationship(
        "Subscription", back_populates="organization", uselist=False
    )
    payment_methods = relationship("PaymentMethod", back_populates="organization")
    invoices = relationship("Invoice", back_populates="organization")
    usage_records = relationship("UsageRecord", back_populates="organization")
    coupon_redemptions = relationship("CouponRedemption", back_populates="organization")
