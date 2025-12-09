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


async def get_user_organization_id(payload: dict = Depends(JWTCookieBearer())) -> Optional[int]:
    """Get the user's organization ID from JWT payload"""
    try:
        uid = None
        if isinstance(payload, dict):
            uid = str(payload.get('id') or payload.get('user_id') or payload.get('sub'))
        
        if not uid:
            return None
        
        # Get user's organization from database
        from app.db.session import get_async_session
        async for db in get_async_session():
            result = await db.execute(
                text("""
                    SELECT organization_id 
                    FROM user_organizations 
                    WHERE user_id = :user_id 
                    LIMIT 1
                """),
                {"user_id": uid}
            )
            row = result.fetchone()
            if row:
                return row.organization_id
            return None
    except Exception as e:
        logger.error(f"Failed to get user organization: {e}")
        return None


def require_feature(feature_name: str, plan_required: Optional[str] = None):
    """
    Decorator to require a specific feature for an endpoint.
    
    Args:
        feature_name: Name of the feature to check (e.g., 'api_access', 'white_label')
        plan_required: Optional specific plan name (e.g., 'pro'). If None, checks if feature is available.
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract organization_id from kwargs or dependencies
            org_id = kwargs.get('organization_id')
            if not org_id:
                # Try to get from current_user or payload
                payload = kwargs.get('payload') or kwargs.get('current_user')
                if payload:
                    org_id = await get_user_organization_id(payload)
            
            if not org_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Organization not found. Please ensure you're part of an organization."
                )
            
            # Check feature access
            async for db in get_async_session():
                rate_limiter = RateLimiter(db)
                has_access, message = await rate_limiter.check_feature_access(org_id, feature_name)
                
                if not has_access:
                    if plan_required:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail=f"This feature requires {plan_required} plan or higher. {message}"
                        )
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail=message
                        )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_plan(min_plan: str):
    """
    Decorator to require a minimum plan level.
    
    Args:
        min_plan: Minimum plan required ('free', 'pro', 'team', 'enterprise')
    """
    plan_hierarchy = {'free': 0, 'pro': 1, 'team': 2, 'enterprise': 3}
    
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            org_id = kwargs.get('organization_id')
            if not org_id:
                payload = kwargs.get('payload') or kwargs.get('current_user')
                if payload:
                    org_id = await get_user_organization_id(payload)
            
            if not org_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Organization not found"
                )
            
            # Get organization plan
            async for db in get_async_session():
                result = await db.execute(
                    text("SELECT plan_type FROM organizations WHERE id = :org_id"),
                    {"org_id": org_id}
                )
                row = result.fetchone()
                if not row:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Organization not found"
                    )
                
                current_plan = row.plan_type or 'free'
                current_level = plan_hierarchy.get(current_plan, 0)
                required_level = plan_hierarchy.get(min_plan, 0)
                
                if current_level < required_level:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"This feature requires {min_plan} plan or higher. Current plan: {current_plan}"
                    )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


async def check_feature_for_org(organization_id: int, feature: str, db: AsyncSession) -> tuple:
    """Helper function to check feature access for an organization"""
    rate_limiter = RateLimiter(db)
    return await rate_limiter.check_feature_access(organization_id, feature)


async def get_plan_features(organization_id: int, db: AsyncSession) -> dict[str, bool]:
    """Get all available features for an organization's plan"""
    result = await db.execute(
        text("SELECT plan_type FROM organizations WHERE id = :org_id"),
        {"org_id": organization_id}
    )
    row = result.fetchone()
    if not row:
        return {}
    
    plan_type = row.plan_type or 'free'
    plan_config = get_plan_config(plan_type)
    return plan_config.get('features', {})

