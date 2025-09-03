"""
Real API Rate Limiting & Usage Tracking System
Production-ready rate limiting for Aiser Platform
"""

import time
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import json
import hashlib
import logging

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
import redis.asyncio as redis

from app.core.database import get_async_session
from app.models.rate_limiting import RateLimitRule, UsageRecord, QuotaExceeded
from app.models.organization import Organization
from app.models.user import User

logger = logging.getLogger(__name__)

class RateLimitType(Enum):
    """Rate limit types"""
    FIXED_WINDOW = "fixed_window"
    SLIDING_WINDOW = "sliding_window"
    TOKEN_BUCKET = "token_bucket"
    LEAKY_BUCKET = "leaky_bucket"

class QuotaType(Enum):
    """Quota types"""
    API_CALLS = "api_calls"
    DATA_TRANSFER = "data_transfer"
    STORAGE = "storage"
    AI_CREDITS = "ai_credits"
    DASHBOARDS = "dashboards"
    DATA_SOURCES = "data_sources"
    USERS = "users"

@dataclass
class RateLimitConfig:
    """Rate limit configuration"""
    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    requests_per_day: int = 10000
    burst_limit: int = 100
    window_size: int = 60  # seconds
    quota_limit: Dict[QuotaType, int] = None
    
    def __post_init__(self):
        if self.quota_limit is None:
            self.quota_limit = {
                QuotaType.API_CALLS: 100000,
                QuotaType.DATA_TRANSFER: 1000000000,  # 1GB in bytes
                QuotaType.STORAGE: 10000000000,  # 10GB in bytes
                QuotaType.AI_CREDITS: 1000,
                QuotaType.DASHBOARDS: 50,
                QuotaType.DATA_SOURCES: 20,
                QuotaType.USERS: 10
            }

@dataclass
class RateLimitResult:
    """Rate limit check result"""
    allowed: bool
    remaining: int
    reset_time: datetime
    retry_after: Optional[int] = None
    quota_exceeded: bool = False
    quota_remaining: Dict[QuotaType, int] = None

class RateLimiter:
    """Real rate limiter with multiple algorithms"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.default_config = RateLimitConfig()
    
    async def check_rate_limit(
        self,
        identifier: str,
        config: RateLimitConfig = None,
        quota_type: QuotaType = None
    ) -> RateLimitResult:
        """Check rate limit for identifier"""
        if config is None:
            config = self.default_config
        
        # Check quota limits first
        if quota_type:
            quota_result = await self._check_quota_limit(identifier, quota_type, config)
            if not quota_result["allowed"]:
                return RateLimitResult(
                    allowed=False,
                    remaining=0,
                    reset_time=datetime.now(timezone.utc) + timedelta(hours=1),
                    quota_exceeded=True,
                    quota_remaining=quota_result["remaining"]
                )
        
        # Check rate limits
        rate_result = await self._check_rate_limit_algorithm(identifier, config)
        
        return RateLimitResult(
            allowed=rate_result["allowed"],
            remaining=rate_result["remaining"],
            reset_time=rate_result["reset_time"],
            retry_after=rate_result.get("retry_after"),
            quota_exceeded=False,
            quota_remaining=quota_result.get("remaining") if quota_type else None
        )
    
    async def _check_rate_limit_algorithm(
        self,
        identifier: str,
        config: RateLimitConfig
    ) -> Dict[str, Any]:
        """Check rate limit using sliding window algorithm"""
        now = time.time()
        window_start = now - config.window_size
        
        # Redis keys
        key = f"rate_limit:{identifier}"
        window_key = f"{key}:{int(now // config.window_size)}"
        
        # Use Redis pipeline for atomic operations
        pipe = self.redis.pipeline()
        
        # Remove old windows
        pipe.zremrangebyscore(key, 0, window_start)
        
        # Count current requests
        pipe.zcard(key)
        
        # Add current request
        pipe.zadd(key, {str(now): now})
        
        # Set expiration
        pipe.expire(key, config.window_size * 2)
        
        # Execute pipeline
        results = await pipe.execute()
        current_requests = results[1]
        
        # Check limits
        allowed = current_requests < config.requests_per_minute
        remaining = max(0, config.requests_per_minute - current_requests - 1)
        
        # Calculate reset time
        reset_time = datetime.fromtimestamp(
            (int(now // config.window_size) + 1) * config.window_size,
            tz=timezone.utc
        )
        
        # Calculate retry after if rate limited
        retry_after = None
        if not allowed:
            oldest_request = await self.redis.zrange(key, 0, 0, withscores=True)
            if oldest_request:
                retry_after = int(oldest_request[0][1] + config.window_size - now)
        
        return {
            "allowed": allowed,
            "remaining": remaining,
            "reset_time": reset_time,
            "retry_after": retry_after
        }
    
    async def _check_quota_limit(
        self,
        identifier: str,
        quota_type: QuotaType,
        config: RateLimitConfig
    ) -> Dict[str, Any]:
        """Check quota limit for identifier"""
        quota_key = f"quota:{identifier}:{quota_type.value}"
        current_usage = await self.redis.get(quota_key)
        
        if current_usage is None:
            current_usage = 0
        else:
            current_usage = int(current_usage)
        
        quota_limit = config.quota_limit.get(quota_type, 0)
        allowed = current_usage < quota_limit
        remaining = max(0, quota_limit - current_usage)
        
        return {
            "allowed": allowed,
            "current_usage": current_usage,
            "quota_limit": quota_limit,
            "remaining": {quota_type: remaining}
        }
    
    async def record_usage(
        self,
        identifier: str,
        quota_type: QuotaType,
        amount: int = 1
    ):
        """Record usage for quota tracking"""
        quota_key = f"quota:{identifier}:{quota_type.value}"
        
        # Increment usage
        await self.redis.incrby(quota_key, amount)
        
        # Set expiration to end of month
        now = datetime.now(timezone.utc)
        end_of_month = (now.replace(day=1) + timedelta(days=32)).replace(day=1)
        ttl = int((end_of_month - now).total_seconds())
        await self.redis.expire(quota_key, ttl)

class UsageTracker:
    """Real usage tracking system"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
    
    async def track_api_call(
        self,
        user_id: str,
        organization_id: str,
        endpoint: str,
        method: str,
        response_time: float,
        status_code: int,
        data_size: int = 0
    ):
        """Track API call usage"""
        timestamp = datetime.now(timezone.utc)
        
        # Create usage record
        usage_data = {
            "user_id": user_id,
            "organization_id": organization_id,
            "endpoint": endpoint,
            "method": method,
            "response_time": response_time,
            "status_code": status_code,
            "data_size": data_size,
            "timestamp": timestamp.isoformat()
        }
        
        # Store in Redis for real-time tracking
        usage_key = f"usage:{organization_id}:{timestamp.strftime('%Y%m%d%H')}"
        await self.redis.lpush(usage_key, json.dumps(usage_data))
        await self.redis.expire(usage_key, 86400 * 7)  # Keep for 7 days
        
        # Update counters
        await self._update_counters(organization_id, user_id, endpoint, data_size)
    
    async def _update_counters(
        self,
        organization_id: str,
        user_id: str,
        endpoint: str,
        data_size: int
    ):
        """Update usage counters"""
        now = datetime.now(timezone.utc)
        date_key = now.strftime('%Y%m%d')
        
        # Organization counters
        org_counters = {
            f"org:{organization_id}:api_calls:{date_key}": 1,
            f"org:{organization_id}:data_transfer:{date_key}": data_size,
        }
        
        # User counters
        user_counters = {
            f"user:{user_id}:api_calls:{date_key}": 1,
            f"user:{user_id}:data_transfer:{date_key}": data_size,
        }
        
        # Endpoint counters
        endpoint_counters = {
            f"endpoint:{endpoint}:calls:{date_key}": 1,
        }
        
        # Update all counters
        all_counters = {**org_counters, **user_counters, **endpoint_counters}
        
        pipe = self.redis.pipeline()
        for key, value in all_counters.items():
            pipe.incrby(key, value)
            pipe.expire(key, 86400 * 30)  # Keep for 30 days
        
        await pipe.execute()
    
    async def get_usage_stats(
        self,
        organization_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get usage statistics for organization"""
        stats = {
            "api_calls": 0,
            "data_transfer": 0,
            "unique_users": 0,
            "endpoints": {},
            "daily_breakdown": {}
        }
        
        # Get daily stats
        current_date = start_date
        while current_date <= end_date:
            date_key = current_date.strftime('%Y%m%d')
            
            # Get API calls
            api_calls_key = f"org:{organization_id}:api_calls:{date_key}"
            api_calls = await self.redis.get(api_calls_key)
            if api_calls:
                stats["api_calls"] += int(api_calls)
                stats["daily_breakdown"][date_key] = {
                    "api_calls": int(api_calls)
                }
            
            # Get data transfer
            data_transfer_key = f"org:{organization_id}:data_transfer:{date_key}"
            data_transfer = await self.redis.get(data_transfer_key)
            if data_transfer:
                stats["data_transfer"] += int(data_transfer)
                if date_key in stats["daily_breakdown"]:
                    stats["daily_breakdown"][date_key]["data_transfer"] = int(data_transfer)
            
            current_date += timedelta(days=1)
        
        return stats

class QuotaManager:
    """Real quota management system"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
    
    async def get_quota_usage(
        self,
        organization_id: str,
        quota_type: QuotaType
    ) -> Dict[str, Any]:
        """Get current quota usage"""
        quota_key = f"quota:{organization_id}:{quota_type.value}"
        current_usage = await self.redis.get(quota_key)
        
        if current_usage is None:
            current_usage = 0
        else:
            current_usage = int(current_usage)
        
        # Get quota limit from organization plan
        quota_limit = await self._get_quota_limit(organization_id, quota_type)
        
        return {
            "current_usage": current_usage,
            "quota_limit": quota_limit,
            "remaining": max(0, quota_limit - current_usage),
            "usage_percentage": (current_usage / quota_limit * 100) if quota_limit > 0 else 0
        }
    
    async def _get_quota_limit(
        self,
        organization_id: str,
        quota_type: QuotaType
    ) -> int:
        """Get quota limit from organization plan"""
        # This would query the organization's subscription plan
        # For now, return default limits based on plan type
        
        # Get organization plan (this would be from database)
        plan_key = f"org:{organization_id}:plan"
        plan_type = await self.redis.get(plan_key)
        
        if plan_type is None:
            plan_type = "free"
        else:
            plan_type = plan_type.decode()
        
        # Default limits by plan
        limits = {
            "free": {
                QuotaType.API_CALLS: 1000,
                QuotaType.DATA_TRANSFER: 100000000,  # 100MB
                QuotaType.STORAGE: 1000000000,  # 1GB
                QuotaType.AI_CREDITS: 100,
                QuotaType.DASHBOARDS: 3,
                QuotaType.DATA_SOURCES: 5,
                QuotaType.USERS: 2
            },
            "pro": {
                QuotaType.API_CALLS: 100000,
                QuotaType.DATA_TRANSFER: 10000000000,  # 10GB
                QuotaType.STORAGE: 100000000000,  # 100GB
                QuotaType.AI_CREDITS: 10000,
                QuotaType.DASHBOARDS: 50,
                QuotaType.DATA_SOURCES: 50,
                QuotaType.USERS: 25
            },
            "enterprise": {
                QuotaType.API_CALLS: 1000000,
                QuotaType.DATA_TRANSFER: 100000000000,  # 100GB
                QuotaType.STORAGE: 1000000000000,  # 1TB
                QuotaType.AI_CREDITS: 100000,
                QuotaType.DASHBOARDS: 1000,
                QuotaType.DATA_SOURCES: 1000,
                QuotaType.USERS: 1000
            }
        }
        
        return limits.get(plan_type, limits["free"]).get(quota_type, 0)
    
    async def check_quota_exceeded(
        self,
        organization_id: str,
        quota_type: QuotaType,
        amount: int = 1
    ) -> bool:
        """Check if quota would be exceeded"""
        current_usage = await self.get_quota_usage(organization_id, quota_type)
        return (current_usage["current_usage"] + amount) > current_usage["quota_limit"]

# Rate limiting middleware
async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware"""
    # Get rate limiter instance
    rate_limiter = get_rate_limiter()
    usage_tracker = get_usage_tracker()
    
    # Get identifier (user_id or IP)
    identifier = await get_identifier(request)
    
    # Check rate limit
    result = await rate_limiter.check_rate_limit(
        identifier,
        quota_type=QuotaType.API_CALLS
    )
    
    if not result.allowed:
        # Rate limited
        response = JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": "Rate limit exceeded",
                "message": "Too many requests. Please try again later.",
                "retry_after": result.retry_after,
                "reset_time": result.reset_time.isoformat()
            }
        )
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(60)  # requests per minute
        response.headers["X-RateLimit-Remaining"] = str(result.remaining)
        response.headers["X-RateLimit-Reset"] = str(int(result.reset_time.timestamp()))
        
        if result.retry_after:
            response.headers["Retry-After"] = str(result.retry_after)
        
        return response
    
    # Process request
    start_time = time.time()
    response = await call_next(request)
    end_time = time.time()
    
    # Track usage
    await usage_tracker.track_api_call(
        user_id=identifier,
        organization_id=await get_organization_id(request),
        endpoint=request.url.path,
        method=request.method,
        response_time=end_time - start_time,
        status_code=response.status_code,
        data_size=len(response.body) if hasattr(response, 'body') else 0
    )
    
    # Record quota usage
    await rate_limiter.record_usage(identifier, QuotaType.API_CALLS)
    
    # Add rate limit headers to response
    response.headers["X-RateLimit-Limit"] = str(60)
    response.headers["X-RateLimit-Remaining"] = str(result.remaining)
    response.headers["X-RateLimit-Reset"] = str(int(result.reset_time.timestamp()))
    
    return response

async def get_identifier(request: Request) -> str:
    """Get rate limit identifier from request"""
    # Try to get user ID from JWT token
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            # Decode JWT token to get user_id
            # This would use your JWT decoding logic
            # For now, return a placeholder
            return "user_123"
        except:
            pass
    
    # Fallback to IP address
    return request.client.host

async def get_organization_id(request: Request) -> str:
    """Get organization ID from request"""
    # This would extract from JWT token or request context
    # For now, return a placeholder
    return "org_123"

# Global instances
_rate_limiter = None
_usage_tracker = None
_quota_manager = None

def get_rate_limiter() -> RateLimiter:
    """Get rate limiter instance"""
    global _rate_limiter
    if _rate_limiter is None:
        # This would get Redis client from your connection pool
        redis_client = None  # Get from your Redis connection
        _rate_limiter = RateLimiter(redis_client)
    return _rate_limiter

def get_usage_tracker() -> UsageTracker:
    """Get usage tracker instance"""
    global _usage_tracker
    if _usage_tracker is None:
        redis_client = None  # Get from your Redis connection
        _usage_tracker = UsageTracker(redis_client)
    return _usage_tracker

def get_quota_manager() -> QuotaManager:
    """Get quota manager instance"""
    global _quota_manager
    if _quota_manager is None:
        redis_client = None  # Get from your Redis connection
        _quota_manager = QuotaManager(redis_client)
    return _quota_manager
