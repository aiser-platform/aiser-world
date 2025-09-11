"""
Usage Tracking and Billing Service
"""

import logging
from typing import Dict, Optional, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.modules.organizations.models import Organization, AIUsageLog, Subscription
from app.core.database import get_db

logger = logging.getLogger(__name__)


class UsageTrackingService:
    """Service for tracking AI usage and managing billing"""

    def __init__(self):
        self.cost_per_token = {
            "gpt-4o-mini": 0.00015 / 1000,  # Per token
            "gpt-4": 0.03 / 1000,
            "gpt-3.5-turbo": 0.0015 / 1000,
        }

    async def log_ai_usage(
        self,
        user_id: int,
        organization_id: int,
        model_name: str,
        tokens_used: int,
        request_type: str,
        project_id: Optional[int] = None,
        db: Session = None,
    ) -> Dict[str, Any]:
        """Log AI usage for billing tracking"""
        try:
            if not db:
                db = next(get_db())

            # Calculate cost
            cost_per_token = self.cost_per_token.get(model_name, 0.001)
            cost_cents = int(tokens_used * cost_per_token * 100)  # Convert to cents

            # Create usage log
            usage_log = AIUsageLog(
                user_id=user_id,
                organization_id=organization_id,
                project_id=project_id,
                model_name=model_name,
                tokens_used=tokens_used,
                cost_cents=cost_cents,
                request_type=request_type,
                created_at=datetime.utcnow(),
            )

            db.add(usage_log)

            # Update organization usage
            org = (
                db.query(Organization)
                .filter(Organization.id == organization_id)
                .first()
            )
            if org:
                org.ai_credits_used += tokens_used

                # Check if usage exceeds limit
                if org.ai_credits_used > org.ai_credits_limit:
                    logger.warning(
                        f"Organization {organization_id} exceeded AI credits limit"
                    )
                    return {
                        "success": False,
                        "error": "AI credits limit exceeded",
                        "usage_logged": True,
                        "credits_remaining": 0,
                    }

            db.commit()

            return {
                "success": True,
                "usage_id": usage_log.id,
                "tokens_used": tokens_used,
                "cost_cents": cost_cents,
                "credits_remaining": max(0, org.ai_credits_limit - org.ai_credits_used)
                if org
                else 0,
            }

        except Exception as e:
            logger.error(f"Failed to log AI usage: {e}")
            if db:
                db.rollback()
            return {"success": False, "error": str(e)}

    async def get_usage_stats(
        self,
        organization_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        db: Session = None,
    ) -> Dict[str, Any]:
        """Get comprehensive usage statistics"""
        try:
            if not db:
                db = next(get_db())

            # Default to last 30 days
            if not start_date:
                start_date = datetime.utcnow() - timedelta(days=30)
            if not end_date:
                end_date = datetime.utcnow()

            # Base query
            base_query = db.query(AIUsageLog).filter(
                and_(
                    AIUsageLog.organization_id == organization_id,
                    AIUsageLog.created_at >= start_date,
                    AIUsageLog.created_at <= end_date,
                )
            )

            # Total usage
            total_tokens = (
                base_query.with_entities(func.sum(AIUsageLog.tokens_used)).scalar() or 0
            )
            total_cost_cents = (
                base_query.with_entities(func.sum(AIUsageLog.cost_cents)).scalar() or 0
            )
            total_requests = base_query.count()

            # Usage by model
            usage_by_model = (
                db.query(
                    AIUsageLog.model_name,
                    func.sum(AIUsageLog.tokens_used).label("tokens"),
                    func.sum(AIUsageLog.cost_cents).label("cost"),
                    func.count(AIUsageLog.id).label("requests"),
                )
                .filter(
                    and_(
                        AIUsageLog.organization_id == organization_id,
                        AIUsageLog.created_at >= start_date,
                        AIUsageLog.created_at <= end_date,
                    )
                )
                .group_by(AIUsageLog.model_name)
                .all()
            )

            # Usage by request type
            usage_by_type = (
                db.query(
                    AIUsageLog.request_type,
                    func.sum(AIUsageLog.tokens_used).label("tokens"),
                    func.sum(AIUsageLog.cost_cents).label("cost"),
                    func.count(AIUsageLog.id).label("requests"),
                )
                .filter(
                    and_(
                        AIUsageLog.organization_id == organization_id,
                        AIUsageLog.created_at >= start_date,
                        AIUsageLog.created_at <= end_date,
                    )
                )
                .group_by(AIUsageLog.request_type)
                .all()
            )

            # Daily usage trend
            daily_usage = (
                db.query(
                    func.date(AIUsageLog.created_at).label("date"),
                    func.sum(AIUsageLog.tokens_used).label("tokens"),
                    func.sum(AIUsageLog.cost_cents).label("cost"),
                    func.count(AIUsageLog.id).label("requests"),
                )
                .filter(
                    and_(
                        AIUsageLog.organization_id == organization_id,
                        AIUsageLog.created_at >= start_date,
                        AIUsageLog.created_at <= end_date,
                    )
                )
                .group_by(func.date(AIUsageLog.created_at))
                .order_by(func.date(AIUsageLog.created_at))
                .all()
            )

            # Get organization limits
            org = (
                db.query(Organization)
                .filter(Organization.id == organization_id)
                .first()
            )

            return {
                "success": True,
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                },
                "totals": {
                    "tokens_used": total_tokens,
                    "cost_cents": total_cost_cents,
                    "cost_dollars": total_cost_cents / 100,
                    "total_requests": total_requests,
                },
                "limits": {
                    "ai_credits_limit": org.ai_credits_limit if org else 0,
                    "ai_credits_used": org.ai_credits_used if org else 0,
                    "ai_credits_remaining": max(
                        0, org.ai_credits_limit - org.ai_credits_used
                    )
                    if org
                    else 0,
                    "usage_percentage": (
                        org.ai_credits_used / org.ai_credits_limit * 100
                    )
                    if org and org.ai_credits_limit > 0
                    else 0,
                },
                "breakdown": {
                    "by_model": [
                        {
                            "model": row.model_name,
                            "tokens": row.tokens,
                            "cost_cents": row.cost,
                            "requests": row.requests,
                        }
                        for row in usage_by_model
                    ],
                    "by_type": [
                        {
                            "type": row.request_type,
                            "tokens": row.tokens,
                            "cost_cents": row.cost,
                            "requests": row.requests,
                        }
                        for row in usage_by_type
                    ],
                },
                "daily_trend": [
                    {
                        "date": row.date.isoformat(),
                        "tokens": row.tokens,
                        "cost_cents": row.cost,
                        "requests": row.requests,
                    }
                    for row in daily_usage
                ],
            }

        except Exception as e:
            logger.error(f"Failed to get usage stats: {e}")
            return {"success": False, "error": str(e)}

    async def check_usage_limits(
        self, organization_id: int, tokens_requested: int, db: Session = None
    ) -> Dict[str, Any]:
        """Check if organization can use requested tokens"""
        try:
            if not db:
                db = next(get_db())

            org = (
                db.query(Organization)
                .filter(Organization.id == organization_id)
                .first()
            )
            if not org:
                return {"allowed": False, "error": "Organization not found"}

            credits_remaining = org.ai_credits_limit - org.ai_credits_used

            if tokens_requested > credits_remaining:
                return {
                    "allowed": False,
                    "error": "Insufficient AI credits",
                    "credits_remaining": credits_remaining,
                    "credits_needed": tokens_requested,
                    "upgrade_required": True,
                }

            return {
                "allowed": True,
                "credits_remaining": credits_remaining,
                "credits_after_use": credits_remaining - tokens_requested,
            }

        except Exception as e:
            logger.error(f"Failed to check usage limits: {e}")
            return {"allowed": False, "error": str(e)}

    async def generate_billing_report(
        self, organization_id: int, month: int, year: int, db: Session = None
    ) -> Dict[str, Any]:
        """Generate monthly billing report"""
        try:
            if not db:
                db = next(get_db())

            # Calculate month boundaries
            start_date = datetime(year, month, 1)
            if month == 12:
                end_date = datetime(year + 1, 1, 1)
            else:
                end_date = datetime(year, month + 1, 1)

            # Get usage stats for the month
            usage_stats = await self.get_usage_stats(
                organization_id, start_date, end_date, db
            )

            if not usage_stats.get("success"):
                return usage_stats

            # Get subscription info
            subscription = (
                db.query(Subscription)
                .filter(Subscription.organization_id == organization_id)
                .first()
            )

            # Calculate billing
            base_cost = 0  # Base subscription cost
            usage_cost = usage_stats["totals"]["cost_cents"]
            total_cost = base_cost + usage_cost

            return {
                "success": True,
                "billing_period": {
                    "month": month,
                    "year": year,
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                },
                "subscription": {
                    "plan_type": subscription.plan_type if subscription else "free",
                    "status": subscription.status if subscription else "inactive",
                },
                "costs": {
                    "base_cost_cents": base_cost,
                    "usage_cost_cents": usage_cost,
                    "total_cost_cents": total_cost,
                    "total_cost_dollars": total_cost / 100,
                },
                "usage_summary": usage_stats["totals"],
                "detailed_usage": usage_stats["breakdown"],
            }

        except Exception as e:
            logger.error(f"Failed to generate billing report: {e}")
            return {"success": False, "error": str(e)}

    async def update_subscription(
        self,
        organization_id: int,
        plan_type: str,
        stripe_subscription_id: Optional[str] = None,
        db: Session = None,
    ) -> Dict[str, Any]:
        """Update organization subscription"""
        try:
            if not db:
                db = next(get_db())

            # Plan limits
            plan_limits = {
                "free": {"ai_credits": 1000, "projects": 1, "users": 1},
                "starter": {"ai_credits": 10000, "projects": 5, "users": 5},
                "professional": {"ai_credits": 50000, "projects": 20, "users": 20},
                "enterprise": {"ai_credits": 200000, "projects": -1, "users": -1},
            }

            limits = plan_limits.get(plan_type, plan_limits["free"])

            # Update organization
            org = (
                db.query(Organization)
                .filter(Organization.id == organization_id)
                .first()
            )
            if not org:
                return {"success": False, "error": "Organization not found"}

            org.plan_type = plan_type
            org.ai_credits_limit = limits["ai_credits"]

            # Update or create subscription
            subscription = (
                db.query(Subscription)
                .filter(Subscription.organization_id == organization_id)
                .first()
            )

            if subscription:
                subscription.plan_type = plan_type
                subscription.status = "active"
                if stripe_subscription_id:
                    subscription.stripe_subscription_id = stripe_subscription_id
            else:
                subscription = Subscription(
                    organization_id=organization_id,
                    plan_type=plan_type,
                    status="active",
                    stripe_subscription_id=stripe_subscription_id,
                    created_at=datetime.utcnow(),
                )
                db.add(subscription)

            db.commit()

            return {
                "success": True,
                "plan_type": plan_type,
                "limits": limits,
                "subscription_id": subscription.id,
            }

        except Exception as e:
            logger.error(f"Failed to update subscription: {e}")
            if db:
                db.rollback()
            return {"success": False, "error": str(e)}


# Global service instance
usage_service = UsageTrackingService()
