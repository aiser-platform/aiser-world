"""
Onboarding Service
Handles user onboarding, default organization/project creation, and progress tracking
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import uuid

from app.modules.pricing.plans import get_plan_config
from app.modules.onboarding.enhanced_onboarding import EnhancedOnboardingService
from app.modules.onboarding.frictionless_optimizer import FrictionlessOptimizer

logger = logging.getLogger(__name__)


class OnboardingService:
    """Service for handling user onboarding"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def save_onboarding_progress(
        self,
        user_id: str,
        step: str,
        data: Dict[str, Any],
    ) -> bool:
        """Save onboarding progress for a step"""
        try:
            # Get existing onboarding data
            result = await self.db.execute(
                text("""
                    SELECT onboarding_data, onboarding_progress
                    FROM users
                    WHERE id = $1
                """),
                (user_id,)
            )
            user = result.fetchone()
            
            existing_data = {}
            existing_progress = {}
            
            if user:
                import json
                # Handle both string and dict formats from database
                if user.onboarding_data:
                    if isinstance(user.onboarding_data, str):
                        existing_data = json.loads(user.onboarding_data)
                    else:
                        existing_data = user.onboarding_data
                if user.onboarding_progress:
                    if isinstance(user.onboarding_progress, str):
                        existing_progress = json.loads(user.onboarding_progress)
                    else:
                        existing_progress = user.onboarding_progress
            
            # Update data and progress
            # CRITICAL: Ensure data is a dict, not a list
            # PostgreSQL JSONB requires top-level to be an object (dict), not an array (list)
            # Also ensure ALL nested lists contain only dicts
            
            def ensure_jsonb_compatible(obj, depth=0):
                """Recursively ensure all data is JSONB-compatible (dicts, not lists at top level, lists contain only dicts)"""
                if depth > 10:  # Prevent infinite recursion
                    return str(obj)
                
                if isinstance(obj, dict):
                    return {k: ensure_jsonb_compatible(v, depth + 1) for k, v in obj.items()}
                elif isinstance(obj, list):
                    if len(obj) == 0:
                        return []
                    # CRITICAL: All list items must be dicts for JSONB
                    cleaned_list = []
                    for item in obj:
                        cleaned_item = ensure_jsonb_compatible(item, depth + 1)
                        if isinstance(cleaned_item, dict):
                            cleaned_list.append(cleaned_item)
                        elif isinstance(cleaned_item, list):
                            # Nested list - wrap in dict
                            cleaned_list.append({"items": cleaned_item})
                        else:
                            # Primitive - wrap in dict
                            cleaned_list.append({"value": cleaned_item})
                    return cleaned_list
                else:
                    # Primitives are fine
                    return obj
            
            # Ensure data is properly structured
            if isinstance(data, list):
                # Top-level list - wrap in dict
                existing_data[step] = {"items": ensure_jsonb_compatible(data)}
                logger.info(f"⚠️ Wrapped top-level list data for step '{step}' in dict for JSONB compatibility")
            else:
                # Dict or primitive - ensure nested structures are compatible
                existing_data[step] = ensure_jsonb_compatible(data)
            
            existing_progress[step] = {
                "completed": True,
                "completed_at": datetime.utcnow().isoformat(),
            }
            
            # Save to database
            # Note: asyncpg with text() requires JSON string for JSONB
            import json
            
            # CRITICAL: Double-check that existing_data is a dict (not a list) before serialization
            if isinstance(existing_data, list):
                logger.error(f"❌ CRITICAL: existing_data is still a list after processing! Wrapping in dict.")
                existing_data = {"items": existing_data}
            
            # Ensure existing_progress is also a dict
            if isinstance(existing_progress, list):
                logger.error(f"❌ CRITICAL: existing_progress is a list! Wrapping in dict.")
                existing_progress = {"items": existing_progress}
            
            # CRITICAL: Ensure all values are JSON-serializable (dicts, not lists directly)
            # Serialize to JSON strings for JSONB columns
            existing_data_json = json.dumps(existing_data, default=str, ensure_ascii=False)
            existing_progress_json = json.dumps(existing_progress, default=str, ensure_ascii=False)
            
            # Validate JSON before saving
            try:
                json.loads(existing_data_json)
                json.loads(existing_progress_json)
            except json.JSONDecodeError as e:
                logger.error(f"❌ Failed to serialize onboarding data to valid JSON: {e}")
                logger.error(f"   existing_data type: {type(existing_data)}, keys: {list(existing_data.keys()) if isinstance(existing_data, dict) else 'not a dict'}")
                raise ValueError(f"Invalid JSON structure: {e}")
            
            await self.db.execute(
                text("""
                    UPDATE users
                    SET 
                        onboarding_data = CAST($1 AS jsonb),
                        onboarding_progress = CAST($2 AS jsonb),
                        updated_at = NOW()
                    WHERE id = $3
                """),
                (
                    existing_data_json,  # Pass JSON string
                    existing_progress_json,  # Pass JSON string
                    user_id,
                )
            )
            
            await self.db.commit()
            return True
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to save onboarding progress: {str(e)}")
            return False
    
    async def complete_onboarding(
        self,
        user_id: str,
        onboarding_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Complete onboarding and provision default organization/project
        Enhanced with frictionless optimizations and quick start setup
        
        Returns:
            {
                "success": bool,
                "organization_id": int,
                "project_id": Optional[int],
                "plan_type": str,
                "quick_start": Dict,
                "welcome_message": Dict,
            }
        """
        try:
            # Use frictionless optimizer to prefill data
            optimizer = FrictionlessOptimizer(self.db)
            onboarding_data = await optimizer.prefill_onboarding_data(
                user_id=user_id,
                onboarding_data=onboarding_data,
            )
            
            # Extract user info
            personal = onboarding_data.get("personal", {})
            plan_selection = onboarding_data.get("plan", {})
            selected_plan = plan_selection.get("selectedPlan", "free")
            
            # Track onboarding start
            await optimizer.track_friction_points(
                user_id=user_id,
                step="complete",
                action="onboarding_completed",
            )
            
            # Update user profile
            # Note: asyncpg requires JSON string for JSONB, not Python dict
            # Convert to JSON string first, then PostgreSQL will parse it
            import json
            
            # CRITICAL: Ensure onboarding_data is a dict, not a list
            # PostgreSQL JSONB requires top-level to be an object (dict), not an array (list)
            if isinstance(onboarding_data, list):
                # Wrap list in a dict
                onboarding_data = {"items": onboarding_data}
                logger.info("⚠️ Wrapped onboarding_data list in dict for JSONB compatibility")
            
            # Clean and serialize onboarding data to ensure it's valid JSON
            # Recursively convert any non-serializable types
            def clean_for_json(obj, depth=0):
                """Recursively clean data structure for JSON serialization"""
                # Prevent infinite recursion
                if depth > 10:
                    return str(obj)
                    
                if isinstance(obj, dict):
                    return {k: clean_for_json(v, depth + 1) for k, v in obj.items()}
                elif isinstance(obj, list):
                    # CRITICAL: asyncpg JSONB requires lists to contain ONLY dictionaries
                    # PostgreSQL JSONB accepts empty arrays, but if array has items, they must be dicts
                    if len(obj) == 0:
                        # Return empty array - PostgreSQL JSONB accepts this
                        return []
                    
                    cleaned_list = []
                    for item in obj:
                        # First clean the item recursively
                        cleaned_item = clean_for_json(item, depth + 1)
                        
                        # CRITICAL FIX: Ensure every list item is a dict
                        if isinstance(cleaned_item, dict):
                            # Already a dict, keep as is
                            cleaned_list.append(cleaned_item)
                        elif isinstance(cleaned_item, list):
                            # Nested list - wrap in dict with "items" key
                            # But first ensure nested list items are also dicts
                            nested_cleaned = []
                            for nested_item in cleaned_item:
                                if isinstance(nested_item, dict):
                                    nested_cleaned.append(nested_item)
                                else:
                                    nested_cleaned.append({"value": nested_item})
                            cleaned_list.append({"items": nested_cleaned})
                        else:
                            # All primitives (str, int, float, bool, None) - wrap in dict
                            cleaned_list.append({"value": cleaned_item})
                    return cleaned_list
                elif isinstance(obj, (str, int, float, bool, type(None))):
                    return obj
                elif hasattr(obj, '__dict__'):
                    # Convert objects to dict
                    return clean_for_json(obj.__dict__, depth + 1)
                else:
                    # Convert other types to string
                    return str(obj)
            
            cleaned_data = clean_for_json(onboarding_data)
            onboarding_data_json = json.dumps(cleaned_data, default=str, ensure_ascii=False)
            
            # Validate JSON is valid before proceeding
            try:
                json.loads(onboarding_data_json)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to serialize onboarding_data to valid JSON: {e}")
                # Fallback: use minimal valid structure
                onboarding_data_json = json.dumps({"error": "Failed to serialize onboarding data"})
            
            # Use explicit CAST to text first, then jsonb for asyncpg compatibility
            # This prevents "List argument must consist only of dictionaries" error
            await self.db.execute(
                text("""
                    UPDATE users
                    SET 
                        first_name = COALESCE($1, first_name),
                        last_name = COALESCE($2, last_name),
                        onboarding_data = CAST($3::text AS jsonb),
                        onboarding_completed_at = NOW(),
                        onboarding_started_at = COALESCE(onboarding_started_at, NOW()),
                        updated_at = NOW()
                    WHERE id = $4
                """),
                (
                    personal.get("firstName"),
                    personal.get("lastName"),
                    onboarding_data_json,  # Pass JSON string, cast to text first, then jsonb
                    user_id,
                )
            )
            
            # Organization/project creation removed - organization context removed
            # Onboarding now just saves user preferences and marks onboarding as complete
            
            # Create quick start setup for immediate value (simplified, no org/project)
            enhanced_service = EnhancedOnboardingService(self.db)
            quick_start = await enhanced_service.create_quick_start_setup(
                user_id=user_id,
                organization_id=None,  # No organization
                project_id=None,  # No project
                plan_type=selected_plan,
            )
            
            # Track onboarding completion analytics
            await enhanced_service.track_onboarding_analytics(
                user_id=user_id,
                event="onboarding_completed",
                metadata={
                    "plan_type": selected_plan,
                },
            )
            
            await self.db.commit()
            
            return {
                "success": True,
                "organization_id": None,  # No organization
                "project_id": None,  # No project
                "plan_type": selected_plan,
                "quick_start": quick_start,
                "welcome_message": quick_start.get("welcome_message", {}),
            }
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to complete onboarding: {str(e)}")
            raise
    
    async def provision_default_organization(
        self,
        user_id: str,
        onboarding_data: Dict[str, Any],
        plan_type: str = "free",
    ) -> Dict[str, Any]:
        """
        Create default organization for new user - DISABLED (organization context removed)
        
        Returns:
            {"organization_id": None, "organization_name": str}
        """
        # Organization creation removed - organization context removed
        personal = onboarding_data.get("personal", {})
        workspace = onboarding_data.get("workspace", {})
        
        # Return workspace name for reference, but no organization_id
        org_name = (
            workspace.get("name") or 
            personal.get("company") or 
            f"{personal.get('firstName', 'User')}'s Workspace"
        )
        
        return {
            "organization_id": None,  # No organization
            "organization_name": org_name,
        }
    
    async def provision_default_project(
        self,
        organization_id: Optional[int],  # No longer used
        user_id: str,
        plan_type: str,
    ) -> Dict[str, Any]:
        """
        Create default project for organization - DISABLED (organization context removed)
        
        Returns:
            {"project_id": None, "project_name": str}
        """
        # Project creation removed - organization context removed
        return {
            "project_id": None,  # No project
            "project_name": "My First Project",
        }
    
    def _generate_slug(self, name: str, user_id: str) -> str:
        """Generate unique slug from name"""
        import re
        slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
        # Add short user ID to ensure uniqueness
        short_id = str(user_id)[:8]
        return f"{slug}-{short_id}"

