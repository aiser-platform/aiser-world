"""
Team Management Service
"""

import logging
from typing import Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.modules.user.models import User
from app.modules.organizations.models import UserOrganization, Role
from app.core.database import get_db
from enum import Enum

logger = logging.getLogger(__name__)


class RoleName(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


class TeamManagementService:
    """Service for managing teams and user roles"""

    def __init__(self):
        self.role_permissions = {
            RoleName.OWNER: {
                "manage_organization": True,
                "manage_billing": True,
                "manage_users": True,
                "manage_projects": True,
                "view_analytics": True,
                "create_projects": True,
                "delete_organization": True,
            },
            RoleName.ADMIN: {
                "manage_organization": False,
                "manage_billing": False,
                "manage_users": True,
                "manage_projects": True,
                "view_analytics": True,
                "create_projects": True,
                "delete_organization": False,
            },
            RoleName.MEMBER: {
                "manage_organization": False,
                "manage_billing": False,
                "manage_users": False,
                "manage_projects": True,
                "view_analytics": True,
                "create_projects": True,
                "delete_organization": False,
            },
            RoleName.VIEWER: {
                "manage_organization": False,
                "manage_billing": False,
                "manage_users": False,
                "manage_projects": False,
                "view_analytics": True,
                "create_projects": False,
                "delete_organization": False,
            },
        }

    async def invite_user_to_organization(
        self,
        organization_id: int,
        email: str,
        role_name: RoleName,
        invited_by_user_id: int,
        db: Session = None,
    ) -> Dict[str, Any]:
        """Invite user to organization"""
        try:
            if not db:
                db = next(get_db())

            # Check if inviter has permission
            inviter_permission = await self.check_user_permission(
                invited_by_user_id, organization_id, "manage_users", db
            )

            if not inviter_permission.get("allowed"):
                return {
                    "success": False,
                    "error": "Insufficient permissions to invite users",
                }

            # Check if user already exists
            user = db.query(User).filter(User.email == email).first()

            if user:
                # Check if already in organization
                existing_membership = (
                    db.query(UserOrganization)
                    .filter(
                        and_(
                            UserOrganization.user_id == user.id,
                            UserOrganization.organization_id == organization_id,
                        )
                    )
                    .first()
                )

                if existing_membership:
                    return {
                        "success": False,
                        "error": "User is already a member of this organization",
                    }
            else:
                # Create pending user account
                user = User(
                    email=email,
                    username=email.split("@")[0],
                    is_verified=False,
                    is_active=False,  # Will be activated when they accept invite
                    created_at=datetime.utcnow(),
                )
                db.add(user)
                db.flush()  # Get user ID

            # Get role
            role = db.query(Role).filter(Role.name == role_name.value).first()
            if not role:
                # Create role if it doesn't exist
                role = Role(
                    name=role_name.value,
                    description=f"{role_name.value.title()} role",
                    permissions=self.role_permissions.get(role_name, {}),
                    created_at=datetime.utcnow(),
                )
                db.add(role)
                db.flush()

            # Create organization membership
            membership = UserOrganization(
                user_id=user.id,
                organization_id=organization_id,
                role_id=role.id,
                invited_by=invited_by_user_id,
                invited_at=datetime.utcnow(),
                status="pending" if not user.is_active else "active",
                created_at=datetime.utcnow(),
            )

            db.add(membership)
            db.commit()

            # TODO: Send invitation email

            return {
                "success": True,
                "user_id": user.id,
                "membership_id": membership.id,
                "status": membership.status,
                "role": role_name.value,
            }

        except Exception as e:
            logger.error(f"Failed to invite user: {e}")
            if db:
                db.rollback()
            return {"success": False, "error": str(e)}

    async def get_organization_members(
        self, organization_id: int, requesting_user_id: int, db: Session = None
    ) -> Dict[str, Any]:
        """Get all members of an organization"""
        try:
            if not db:
                db = next(get_db())

            # Check if user has permission to view members
            permission = await self.check_user_permission(
                requesting_user_id, organization_id, "view_analytics", db
            )

            if not permission.get("allowed"):
                return {
                    "success": False,
                    "error": "Insufficient permissions to view members",
                }

            # Get members with their roles
            members_query = (
                db.query(UserOrganization, User, Role)
                .join(User, UserOrganization.user_id == User.id)
                .join(Role, UserOrganization.role_id == Role.id)
                .filter(UserOrganization.organization_id == organization_id)
                .order_by(UserOrganization.created_at)
            )

            members = []
            for membership, user, role in members_query:
                members.append(
                    {
                        "user_id": user.id,
                        "email": user.email,
                        "username": user.username,
                        "role": role.name,
                        "status": membership.status,
                        "joined_at": membership.joined_at.isoformat()
                        if membership.joined_at
                        else None,
                        "invited_at": membership.invited_at.isoformat()
                        if membership.invited_at
                        else None,
                        "is_active": user.is_active,
                        "permissions": role.permissions,
                    }
                )

            return {"success": True, "members": members, "total_count": len(members)}

        except Exception as e:
            logger.error(f"Failed to get organization members: {e}")
            return {"success": False, "error": str(e)}

    async def update_user_role(
        self,
        organization_id: int,
        user_id: int,
        new_role_name: RoleName,
        updated_by_user_id: int,
        db: Session = None,
    ) -> Dict[str, Any]:
        """Update user's role in organization"""
        try:
            if not db:
                db = next(get_db())

            # Check if updater has permission
            permission = await self.check_user_permission(
                updated_by_user_id, organization_id, "manage_users", db
            )

            if not permission.get("allowed"):
                return {
                    "success": False,
                    "error": "Insufficient permissions to update user roles",
                }

            # Get user membership
            membership = (
                db.query(UserOrganization)
                .filter(
                    and_(
                        UserOrganization.user_id == user_id,
                        UserOrganization.organization_id == organization_id,
                    )
                )
                .first()
            )

            if not membership:
                return {
                    "success": False,
                    "error": "User is not a member of this organization",
                }

            # Get new role
            new_role = db.query(Role).filter(Role.name == new_role_name.value).first()
            if not new_role:
                return {
                    "success": False,
                    "error": f"Role {new_role_name.value} not found",
                }

            # Update membership
            old_role_id = membership.role_id
            membership.role_id = new_role.id
            membership.updated_at = datetime.utcnow()

            db.commit()

            return {
                "success": True,
                "user_id": user_id,
                "old_role_id": old_role_id,
                "new_role": new_role_name.value,
                "updated_at": membership.updated_at.isoformat(),
            }

        except Exception as e:
            logger.error(f"Failed to update user role: {e}")
            if db:
                db.rollback()
            return {"success": False, "error": str(e)}

    async def remove_user_from_organization(
        self,
        organization_id: int,
        user_id: int,
        removed_by_user_id: int,
        db: Session = None,
    ) -> Dict[str, Any]:
        """Remove user from organization"""
        try:
            if not db:
                db = next(get_db())

            # Check if remover has permission
            permission = await self.check_user_permission(
                removed_by_user_id, organization_id, "manage_users", db
            )

            if not permission.get("allowed"):
                return {
                    "success": False,
                    "error": "Insufficient permissions to remove users",
                }

            # Can't remove yourself if you're the owner
            if user_id == removed_by_user_id:
                user_role = await self.get_user_role(user_id, organization_id, db)
                if user_role.get("role") == RoleName.OWNER.value:
                    return {
                        "success": False,
                        "error": "Organization owner cannot remove themselves",
                    }

            # Remove membership
            membership = (
                db.query(UserOrganization)
                .filter(
                    and_(
                        UserOrganization.user_id == user_id,
                        UserOrganization.organization_id == organization_id,
                    )
                )
                .first()
            )

            if not membership:
                return {
                    "success": False,
                    "error": "User is not a member of this organization",
                }

            db.delete(membership)
            db.commit()

            return {
                "success": True,
                "user_id": user_id,
                "removed_at": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.error(f"Failed to remove user from organization: {e}")
            if db:
                db.rollback()
            return {"success": False, "error": str(e)}

    async def check_user_permission(
        self, user_id: int, organization_id: int, permission: str, db: Session = None
    ) -> Dict[str, Any]:
        """Check if user has specific permission in organization"""
        try:
            if not db:
                db = next(get_db())

            # Get user's role in organization
            membership = (
                db.query(UserOrganization, Role)
                .join(Role, UserOrganization.role_id == Role.id)
                .filter(
                    and_(
                        UserOrganization.user_id == user_id,
                        UserOrganization.organization_id == organization_id,
                        UserOrganization.status == "active",
                    )
                )
                .first()
            )

            if not membership:
                return {
                    "allowed": False,
                    "error": "User is not an active member of this organization",
                }

            user_org, role = membership
            permissions = role.permissions or {}

            return {
                "allowed": permissions.get(permission, False),
                "role": role.name,
                "permissions": permissions,
            }

        except Exception as e:
            logger.error(f"Failed to check user permission: {e}")
            return {"allowed": False, "error": str(e)}

    async def get_user_role(
        self, user_id: int, organization_id: int, db: Session = None
    ) -> Dict[str, Any]:
        """Get user's role in organization"""
        try:
            if not db:
                db = next(get_db())

            membership = (
                db.query(UserOrganization, Role)
                .join(Role, UserOrganization.role_id == Role.id)
                .filter(
                    and_(
                        UserOrganization.user_id == user_id,
                        UserOrganization.organization_id == organization_id,
                    )
                )
                .first()
            )

            if not membership:
                return {
                    "success": False,
                    "error": "User is not a member of this organization",
                }

            user_org, role = membership

            return {
                "success": True,
                "role": role.name,
                "status": user_org.status,
                "permissions": role.permissions,
                "joined_at": user_org.joined_at.isoformat()
                if user_org.joined_at
                else None,
            }

        except Exception as e:
            logger.error(f"Failed to get user role: {e}")
            return {"success": False, "error": str(e)}

    async def accept_invitation(
        self, user_id: int, organization_id: int, db: Session = None
    ) -> Dict[str, Any]:
        """Accept organization invitation"""
        try:
            if not db:
                db = next(get_db())

            # Find pending membership
            membership = (
                db.query(UserOrganization)
                .filter(
                    and_(
                        UserOrganization.user_id == user_id,
                        UserOrganization.organization_id == organization_id,
                        UserOrganization.status == "pending",
                    )
                )
                .first()
            )

            if not membership:
                return {"success": False, "error": "No pending invitation found"}

            # Update membership status
            membership.status = "active"
            membership.joined_at = datetime.utcnow()
            membership.updated_at = datetime.utcnow()

            # Activate user if not already active
            user = db.query(User).filter(User.id == user_id).first()
            if user and not user.is_active:
                user.is_active = True

            db.commit()

            return {
                "success": True,
                "organization_id": organization_id,
                "joined_at": membership.joined_at.isoformat(),
            }

        except Exception as e:
            logger.error(f"Failed to accept invitation: {e}")
            if db:
                db.rollback()
            return {"success": False, "error": str(e)}


# Global service instance
team_service = TeamManagementService()
