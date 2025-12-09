"""
Frictionless Onboarding Optimizer
Minimizes friction and maximizes value demonstration
"""

import logging
import json
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

logger = logging.getLogger(__name__)


class FrictionlessOptimizer:
    """
    Optimizes onboarding for minimal friction:
    - Skip optional steps
    - Smart field pre-filling
    - One-click actions
    - Progressive disclosure
    - Contextual help
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_minimal_onboarding_flow(
        self,
        user_id: str,
    ) -> Dict[str, Any]:
        """
        Determine minimal onboarding flow based on:
        - User's email domain (company detection)
        - Referral source
        - User preferences
        """
        # Get user info
        result = await self.db.execute(
            text("""
                SELECT 
                    email,
                    first_name,
                    last_name,
                    onboarding_data
                FROM users
                WHERE id = $1
            """),
            (user_id,)
        )
        user = result.fetchone()
        
        if not user:
            return {"minimal": False, "steps": []}
        
        # Detect company from email
        email_domain = user.email.split("@")[1] if "@" in user.email else ""
        company_detected = email_domain not in ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"]
        
        # Minimal flow for company emails (they likely have organization)
        if company_detected:
            return {
                "minimal": True,
                "steps": [
                    "welcome",  # Just name
                    "plan_selection",  # Choose plan
                    "complete",  # Done
                ],
                "skip_steps": ["organization", "data_sources", "goals"],
                "prefill": {
                    "company": self._extract_company_from_email(email_domain),
                },
            }
        
        # Full flow for personal emails
        return {
            "minimal": False,
            "steps": [
                "welcome",
                "organization",
                "goals",
                "data_sources",
                "plan_selection",
                "complete",
            ],
            "skip_steps": [],
            "prefill": {},
        }
    
    def _extract_company_from_email(self, domain: str) -> str:
        """Extract company name from email domain"""
        # Remove common TLDs and format
        company = domain.split(".")[0]
        return company.replace("-", " ").title()
    
    async def prefill_onboarding_data(
        self,
        user_id: str,
        onboarding_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Prefill onboarding data with smart defaults"""
        # Get user info
        result = await self.db.execute(
            text("""
                SELECT 
                    email,
                    first_name,
                    last_name
                FROM users
                WHERE id = $1
            """),
            (user_id,)
        )
        user = result.fetchone()
        
        if not user:
            return onboarding_data
        
        # Prefill personal info
        if "personal" not in onboarding_data:
            onboarding_data["personal"] = {}
        
        personal = onboarding_data["personal"]
        
        # Extract first/last name from email if not set
        if not personal.get("firstName") and user.first_name:
            personal["firstName"] = user.first_name
        elif not personal.get("firstName"):
            # Extract from email
            email_name = user.email.split("@")[0]
            personal["firstName"] = email_name.split(".")[0].title()
        
        if not personal.get("lastName") and user.last_name:
            personal["lastName"] = user.last_name
        elif not personal.get("lastName") and "." in user.email.split("@")[0]:
            email_name = user.email.split("@")[0]
            personal["lastName"] = email_name.split(".")[1].title() if len(email_name.split(".")) > 1 else ""
        
        # Detect company from email
        email_domain = user.email.split("@")[1] if "@" in user.email else ""
        if email_domain and email_domain not in ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"]:
            if not personal.get("company"):
                personal["company"] = self._extract_company_from_email(email_domain)
        
        # Set smart defaults for goals
        if "goals" not in onboarding_data:
            onboarding_data["goals"] = {
                "primaryGoal": "data_analysis",  # Most common
                "experienceLevel": "intermediate",  # Safe default
            }
        
        # Set smart defaults for plan
        if "plan" not in onboarding_data:
            onboarding_data["plan"] = {
                "selectedPlan": "free",  # Start with free
                "trialStarted": False,
            }
        
        return onboarding_data
    
    async def should_skip_step(
        self,
        user_id: str,
        step: str,
    ) -> bool:
        """Determine if a step should be skipped"""
        minimal_flow = await self.get_minimal_onboarding_flow(user_id)
        return step in minimal_flow.get("skip_steps", [])
    
    async def get_contextual_help(
        self,
        step: str,
        user_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Get contextual help based on current step and user data"""
        help_content = {
            "welcome": {
                "title": "Why we need this",
                "content": "We'll use this to personalize your experience and set up your workspace.",
                "tips": [
                    "You can always update this later in settings",
                    "Your information is kept private and secure",
                ],
            },
            "organization": {
                "title": "About Organizations",
                "content": "Organizations help you collaborate with your team and manage projects together.",
                "tips": [
                    "You can create multiple organizations later",
                    "Free plan includes 1 organization",
                ],
            },
            "goals": {
                "title": "Help us help you",
                "content": "Knowing your goals helps us recommend the right features and templates.",
                "tips": [
                    "You can change your preferences anytime",
                    "We'll customize your dashboard based on this",
                ],
            },
            "data_sources": {
                "title": "Connect Your Data",
                "content": "You can connect data sources now or later. We'll guide you through it.",
                "tips": [
                    "You can skip this and add data sources later",
                    "Supported: CSV files, PostgreSQL, ClickHouse, and more",
                ],
            },
            "plan_selection": {
                "title": "Choose Your Plan",
                "content": "Start with Free to explore. You can upgrade anytime with no commitment.",
                "tips": [
                    "Free plan includes 10 AI credits to get started",
                    "All plans include a 14-day trial of Pro features",
                    "You can change plans anytime",
                ],
            },
        }
        
        return help_content.get(step, {
            "title": "Need help?",
            "content": "Contact our support team for assistance.",
            "tips": [],
        })
    
    async def track_friction_points(
        self,
        user_id: str,
        step: str,
        action: str,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """Track friction points in onboarding"""
        friction_events = [
            "step_abandoned",
            "step_retried",
            "help_clicked",
            "skip_clicked",
            "error_occurred",
        ]
        
        if action in friction_events:
            try:
                await self.db.execute(
                    text("""
                        INSERT INTO onboarding_friction_logs (
                            user_id,
                            step,
                            action,
                            metadata,
                            created_at
                        ) VALUES (
                            $1,
                            $2,
                            $3,
                            CAST($4 AS jsonb),
                            NOW()
                        )
                    """),
                    (
                        user_id,
                        step,
                        action,
                        json.dumps(metadata or {}, default=str, ensure_ascii=False),  # Pass JSON string
                    )
                )
                await self.db.commit()
            except Exception as e:
                # Non-fatal
                logger.warning(f"Failed to track friction point: {str(e)}")

