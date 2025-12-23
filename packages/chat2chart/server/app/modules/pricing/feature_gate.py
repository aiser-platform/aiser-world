"""
Feature Gating Middleware and Decorators
Enforces plan-based feature access throughout the application
"""

from functools import wraps
from typing import Callable, Any, Optional
from fastapi import HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import logging

from app.modules.authentication.deps.auth_bearer import JWTCookieBearer
from app.modules.pricing.plans import get_plan_config, is_feature_available
from app.modules.pricing.rate_limiter import RateLimiter
from app.db.session import get_async_session

logger = logging.getLogger(__name__)


# get_user_organization_id function removed - organization context removed


def require_feature(feature_name: str, plan_required: Optional[str] = None):
    """
    Decorator to require a specific feature for an endpoint.
    
    NOTE: Organization context removed - feature gating disabled for now.
    This decorator is a no-op and always allows access.
    
    Args:
        feature_name: Name of the feature to check (e.g., 'api_access', 'white_label')
        plan_required: Optional specific plan name (e.g., 'pro'). If None, checks if feature is available.
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Organization context removed - always allow access
            # TODO: Reimplement feature gating based on user plans if needed
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_plan(min_plan: str):
    """
    Decorator to require a minimum plan level.
    
    NOTE: Organization context removed - plan checking disabled for now.
    This decorator is a no-op and always allows access.
    
    Args:
        min_plan: Minimum plan required ('free', 'pro', 'team', 'enterprise')
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Organization context removed - always allow access
            # TODO: Reimplement plan checking based on user plans if needed
            return await func(*args, **kwargs)
        return wrapper
    return decorator


async def check_feature_for_org(organization_id: int, feature: str, db: AsyncSession) -> tuple:
    """Helper function to check feature access for an organization
    
    NOTE: Organization context removed - always returns (True, '')"""
    # Organization context removed - always allow
    return (True, '')


async def get_plan_features(organization_id: int, db: AsyncSession) -> dict[str, bool]:
    """Get all available features for an organization's plan
    
    NOTE: Organization context removed - returns default free plan features"""
    # Organization context removed - return free plan features
    plan_config = get_plan_config('free')
    return plan_config.get('features', {})

