"""
Pricing Plan Configuration
Defines all plan tiers and their features/limits
"""

from typing import Dict, Any

PLAN_CONFIGS: Dict[str, Dict[str, Any]] = {
    "free": {
        "name": "Free",
        "price_monthly": 0,
        "price_yearly": 0,
        "ai_credits_limit": 30,
        "max_projects": 1,
        "max_users": 1,
        "max_data_sources": 2,
        "storage_limit_gb": 5,
        "data_history_days": 7,
        "included_seats": 1,
        "additional_seat_price": 0,
        "features": {
            "watermark": True,
            "theme_customization": False,
            "api_access": False,
            "white_label": False,
            "collaboration": False,
            "advanced_collaboration": False,
            "team_governance": False,
            "priority_support": False,
            "dedicated_support": False,
            "on_premise": False,
            "compliance": False,
            "sla": False,
            "dedicated_success": False,
        },
    },
    "pro": {
        "name": "Pro",
        "price_monthly": 25.0,
        "price_yearly": 250.0,  # ~17% savings
        "ai_credits_limit": 300,
        "max_projects": -1,  # Unlimited
        "max_users": 3,
        "max_data_sources": -1,  # Unlimited
        "storage_limit_gb": 90,
        "data_history_days": 180,
        "included_seats": 1,
        "additional_seat_price": 0,
        "features": {
            "watermark": False,
            "theme_customization": True,
            "api_access": True,
            "white_label": False,
            "collaboration": False,
            "advanced_collaboration": False,
            "team_governance": False,
            "priority_support": True,
            "dedicated_support": False,
            "on_premise": False,
            "compliance": False,
            "sla": False,
            "dedicated_success": False,
        },
    },
    "team": {
        "name": "Team",
        "price_monthly": 99.0,
        "price_yearly": 990.0,  # ~17% savings
        "min_seats": 5,
        "price_per_seat": 25.0,
        "included_seats": 5,
        "additional_seat_price": 25.0,
        "ai_credits_limit": 2000,
        "max_projects": -1,
        "max_users": 5,  # Base included seats; additional seats increase via billing
        "max_data_sources": -1,
        "storage_limit_gb": 500,
        "data_history_days": 365,
        "features": {
            "watermark": False,
            "theme_customization": True,
            "api_access": True,
            "white_label": False,
            "collaboration": True,
            "advanced_collaboration": True,
            "team_governance": True,
            "priority_support": True,
            "dedicated_support": True,
            "on_premise": False,
            "compliance": False,
            "sla": False,
            "dedicated_success": False,
        },
    },
    "enterprise": {
        "name": "Enterprise",
        "price_monthly": 0,  # Custom pricing
        "price_yearly": 0,
        "ai_credits_limit": -1,  # Unlimited / BYO model
        "max_projects": -1,
        "max_users": -1,
        "max_data_sources": -1,
        "storage_limit_gb": -1,
        "data_history_days": -1,
        "included_seats": -1,
        "additional_seat_price": 0,
        "features": {
            "watermark": False,
            "theme_customization": True,
            "api_access": True,
            "white_label": True,
            "collaboration": True,
            "advanced_collaboration": True,
            "team_governance": True,
            "priority_support": True,
            "dedicated_support": True,
            "on_premise": True,
            "compliance": True,
            "sla": True,
            "dedicated_success": True,
        },
    },
}


def get_plan_config(plan_type: str) -> Dict[str, Any]:
    """Get configuration for a plan type"""
    return PLAN_CONFIGS.get(plan_type, PLAN_CONFIGS["free"])


def is_feature_available(plan_type: str, feature: str) -> bool:
    """Check if a feature is available for a plan"""
    config = get_plan_config(plan_type)
    return config.get("features", {}).get(feature, False)


def get_plan_limits(plan_type: str) -> Dict[str, Any]:
    """Get limits for a plan type"""
    config = get_plan_config(plan_type)
    return {
        "ai_credits_limit": config["ai_credits_limit"],
        "max_projects": config["max_projects"],
        "max_users": config["max_users"],
        "max_data_sources": config["max_data_sources"],
        "storage_limit_gb": config["storage_limit_gb"],
        "data_history_days": config.get("data_history_days"),
        "included_seats": config.get("included_seats"),
        "additional_seat_price": config.get("additional_seat_price"),
    }

