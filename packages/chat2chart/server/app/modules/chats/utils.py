"""
Utility functions for chat endpoints
"""
import logging
from typing import Optional, Dict, Any
from app.db.session import async_session
import sqlalchemy as sa

logger = logging.getLogger(__name__)


async def get_user_organization_id(user_id: str) -> Optional[int]:
    """
    Get user's primary organization_id from user_organizations table.
    Auto-creates a default organization if user doesn't have one.
    
    Args:
        user_id: User UUID as string
        
    Returns:
        Organization ID (integer) or None if not found
    """
    try:
        import uuid as uuid_lib
        # Convert user_id to UUID for proper binding
        try:
            user_uuid = uuid_lib.UUID(user_id) if isinstance(user_id, str) else user_id
        except (ValueError, TypeError):
            logger.error(f"Invalid user_id format: {user_id}")
            return None
            
        async with async_session() as db:
            # Query user_organizations to get the first active organization
            query = sa.text("""
                SELECT organization_id 
                FROM user_organizations 
                WHERE user_id = :user_id 
                AND is_active = true 
                ORDER BY created_at ASC 
                LIMIT 1
            """)
            result = await db.execute(query, {"user_id": user_uuid})
            row = result.fetchone()
            
            if row:
                org_id = row[0]
                logger.info(f"✅ Found organization_id {org_id} for user {user_id}")
                return org_id
            else:
                # Auto-create default organization for user
                logger.info(f"🔄 No organization found for user {user_id}, creating default organization...")
                try:
                    from app.modules.projects.services import OrganizationService
                    org_service = OrganizationService()
                    org_response = await org_service.create_default_organization(user_id)
                    if org_response and org_response.id:
                        logger.info(f"✅ Created default organization {org_response.id} for user {user_id}")
                        return org_response.id
                    else:
                        logger.warning(f"⚠️ Failed to create organization for user {user_id}")
                        return None
                except Exception as create_error:
                    logger.error(f"❌ Failed to auto-create organization: {create_error}")
                    return None
                
    except Exception as e:
        logger.error(f"❌ Failed to get organization_id for user {user_id}: {e}")
        return None


async def get_user_profile(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Get comprehensive user profile including organization_id.
    
    Args:
        user_id: User UUID as string
        
    Returns:
        Dict with user profile data including organization_id, or None if not found
    """
    try:
        import uuid as uuid_lib
        # Convert user_id to UUID for proper binding
        try:
            user_uuid = uuid_lib.UUID(user_id) if isinstance(user_id, str) else user_id
        except (ValueError, TypeError):
            logger.error(f"Invalid user_id format: {user_id}")
            return None
            
        async with async_session() as db:
            # Get user info - try without is_deleted check first (some schemas don't have this column)
            try:
                user_query = sa.text("""
                    SELECT id, username, email, first_name, last_name, role, status, tenant_id, is_active
                    FROM users 
                    WHERE id = :user_id
                    LIMIT 1
                """)
                user_result = await db.execute(user_query, {"user_id": user_uuid})
                user_row = user_result.fetchone()
                
                if not user_row:
                    # Try with is_deleted check as fallback
                    logger.debug(f"⚠️ User {user_id} not found without is_deleted filter, trying with filter...")
                    user_query2 = sa.text("""
                        SELECT id, username, email, first_name, last_name, role, status, tenant_id, is_active
                        FROM users 
                        WHERE id = :user_id 
                        AND (is_deleted = false OR is_deleted IS NULL)
                        LIMIT 1
                    """)
                    user_result2 = await db.execute(user_query2, {"user_id": user_uuid})
                    user_row = user_result2.fetchone()
                
                if not user_row:
                    logger.warning(f"⚠️ User {user_id} not found in database")
                    # Log additional debug info
                    logger.debug(f"  - User UUID: {user_uuid}")
                    logger.debug(f"  - User UUID type: {type(user_uuid)}")
                    return None
            except Exception as query_error:
                logger.error(f"❌ Error querying user: {query_error}")
                # Try one more time with a simpler query
                try:
                    simple_query = sa.text("SELECT id, username, email FROM users WHERE id = :user_id LIMIT 1")
                    simple_result = await db.execute(simple_query, {"user_id": user_uuid})
                    user_row = simple_result.fetchone()
                    if user_row:
                        logger.info(f"✅ Found user with simple query: {user_row[1]}")
                    else:
                        logger.error(f"❌ User {user_id} not found even with simple query")
                        return None
                except Exception as simple_error:
                    logger.error(f"❌ Simple query also failed: {simple_error}")
                    return None
            
            # Convert row to dict
            user_data = {
                "id": str(user_row[0]),
                "username": user_row[1],
                "email": user_row[2],
                "first_name": user_row[3],
                "last_name": user_row[4],
                "role": user_row[5],
                "status": user_row[6],
                "tenant_id": user_row[7],
                "is_active": user_row[8],
            }
            
            # Get organization_id
            organization_id = await get_user_organization_id(user_id)
            user_data["organization_id"] = organization_id
            
            logger.info(f"✅ Retrieved profile for user {user_id}, organization_id: {organization_id}")
            return user_data
            
    except Exception as e:
        logger.error(f"❌ Failed to get user profile for {user_id}: {e}")
        return None

