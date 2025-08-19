from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc
from datetime import datetime, timedelta

from app.common.repository import BaseRepository
from app.modules.organizations.models import (
    Organization, Project, Role, UserOrganization, UserProject,
    Subscription, AIUsageLog, BillingTransaction
)
from app.modules.organizations.schemas import (
    OrganizationCreate, OrganizationUpdate, ProjectCreate, ProjectUpdate,
    UserOrganizationCreate, UserProjectCreate, SubscriptionCreate,
    AIUsageLogCreate, BillingTransactionCreate, PlanType, RoleName
)


class OrganizationRepository(BaseRepository[Organization, OrganizationCreate, OrganizationUpdate]):
    def __init__(self):
        super().__init__(Organization)

    async def get_by_slug(self, db: Session, slug: str) -> Optional[Organization]:
        """Get organization by slug"""
        return db.query(Organization).filter(Organization.slug == slug).first()

    async def get_user_organizations(self, db: Session, user_id: int) -> List[Organization]:
        """Get all organizations for a user"""
        return db.query(Organization).join(UserOrganization).filter(
            UserOrganization.user_id == user_id,
            UserOrganization.status == 'active'
        ).all()

    async def create_with_owner(self, db: Session, obj_in: OrganizationCreate, owner_id: int) -> Organization:
        """Create organization and assign owner"""
        # Create organization
        org_data = obj_in.dict()
        org = Organization(**org_data)
        org.trial_ends_at = datetime.utcnow() + timedelta(days=14)  # 14-day trial
        db.add(org)
        db.flush()

        # Get owner role
        owner_role = db.query(Role).filter(Role.name == 'owner').first()
        
        # Create user-organization relationship
        user_org = UserOrganization(
            user_id=owner_id,
            organization_id=org.id,
            role_id=owner_role.id,
            joined_at=datetime.utcnow(),
            status='active'
        )
        db.add(user_org)
        db.commit()
        db.refresh(org)
        return org

    async def get_usage_stats(self, db: Session, org_id: int) -> Dict[str, Any]:
        """Get organization usage statistics"""
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            return {}

        # Get current month usage
        current_month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        current_month_usage = db.query(func.sum(AIUsageLog.credits_consumed)).filter(
            AIUsageLog.organization_id == org_id,
            AIUsageLog.created_at >= current_month_start
        ).scalar() or 0

        # Get projects count
        projects_count = db.query(func.count(Project.id)).filter(
            Project.organization_id == org_id,
            Project.is_deleted == False
        ).scalar() or 0

        # Get users count
        users_count = db.query(func.count(UserOrganization.id)).filter(
            UserOrganization.organization_id == org_id,
            UserOrganization.status == 'active'
        ).scalar() or 0

        return {
            'ai_credits_used': current_month_usage,
            'ai_credits_limit': org.ai_credits_limit,
            'ai_credits_percentage': (current_month_usage / org.ai_credits_limit * 100) if org.ai_credits_limit > 0 else 0,
            'projects_count': projects_count,
            'users_count': users_count,
            'current_plan': org.plan_type,
            'days_left_in_trial': org.days_left_in_trial,
            'is_trial_expired': org.is_trial_expired
        }


class ProjectRepository(BaseRepository[Project, ProjectCreate, ProjectUpdate]):
    def __init__(self):
        super().__init__(Project)

    async def get_by_slug(self, db: Session, org_id: int, slug: str) -> Optional[Project]:
        """Get project by organization and slug"""
        return db.query(Project).filter(
            Project.organization_id == org_id,
            Project.slug == slug,
            Project.is_deleted == False
        ).first()

    async def get_user_projects(self, db: Session, user_id: int, org_id: Optional[int] = None) -> List[Project]:
        """Get all projects for a user"""
        query = db.query(Project).join(UserProject).filter(
            UserProject.user_id == user_id,
            Project.is_deleted == False
        )
        
        if org_id:
            query = query.filter(Project.organization_id == org_id)
            
        return query.all()

    async def get_organization_projects(self, db: Session, org_id: int) -> List[Project]:
        """Get all projects for an organization"""
        return db.query(Project).filter(
            Project.organization_id == org_id,
            Project.is_deleted == False
        ).all()

    async def create_with_creator(self, db: Session, obj_in: ProjectCreate, creator_id: int) -> Project:
        """Create project and assign creator as admin"""
        # Create project
        project_data = obj_in.dict()
        project_data['created_by'] = creator_id
        project = Project(**project_data)
        db.add(project)
        db.flush()

        # Get admin role
        admin_role = db.query(Role).filter(Role.name == 'admin').first()
        
        # Create user-project relationship
        user_project = UserProject(
            user_id=creator_id,
            project_id=project.id,
            role_id=admin_role.id
        )
        db.add(user_project)
        db.commit()
        db.refresh(project)
        return project


class RoleRepository(BaseRepository[Role, None, None]):
    def __init__(self):
        super().__init__(Role)

    async def get_by_name(self, db: Session, name: str) -> Optional[Role]:
        """Get role by name"""
        return db.query(Role).filter(Role.name == name).first()

    async def get_system_roles(self, db: Session) -> List[Role]:
        """Get all system roles"""
        return db.query(Role).filter(Role.is_system_role == True).all()


class UserOrganizationRepository(BaseRepository[UserOrganization, UserOrganizationCreate, None]):
    def __init__(self):
        super().__init__(UserOrganization)

    async def get_user_role_in_org(self, db: Session, user_id: int, org_id: int) -> Optional[UserOrganization]:
        """Get user's role in organization"""
        return db.query(UserOrganization).options(joinedload(UserOrganization.role)).filter(
            UserOrganization.user_id == user_id,
            UserOrganization.organization_id == org_id,
            UserOrganization.status == 'active'
        ).first()

    async def get_organization_members(self, db: Session, org_id: int) -> List[UserOrganization]:
        """Get all members of an organization"""
        return db.query(UserOrganization).options(
            joinedload(UserOrganization.user),
            joinedload(UserOrganization.role)
        ).filter(
            UserOrganization.organization_id == org_id,
            UserOrganization.status == 'active'
        ).all()

    async def create_membership(self, db: Session, user_id: int, org_id: int, role_name: str) -> UserOrganization:
        """Create user organization membership"""
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            raise ValueError(f"Role {role_name} not found")

        user_org = UserOrganization(
            user_id=user_id,
            organization_id=org_id,
            role_id=role.id,
            joined_at=datetime.utcnow(),
            status='active'
        )
        db.add(user_org)
        db.commit()
        db.refresh(user_org)
        return user_org


class UserProjectRepository(BaseRepository[UserProject, UserProjectCreate, None]):
    def __init__(self):
        super().__init__(UserProject)

    async def get_user_role_in_project(self, db: Session, user_id: int, project_id: int) -> Optional[UserProject]:
        """Get user's role in project"""
        return db.query(UserProject).options(joinedload(UserProject.role)).filter(
            UserProject.user_id == user_id,
            UserProject.project_id == project_id
        ).first()

    async def get_project_members(self, db: Session, project_id: int) -> List[UserProject]:
        """Get all members of a project"""
        return db.query(UserProject).options(
            joinedload(UserProject.user),
            joinedload(UserProject.role)
        ).filter(UserProject.project_id == project_id).all()


class SubscriptionRepository(BaseRepository[Subscription, SubscriptionCreate, None]):
    def __init__(self):
        super().__init__(Subscription)

    async def get_by_organization(self, db: Session, org_id: int) -> Optional[Subscription]:
        """Get active subscription for organization"""
        return db.query(Subscription).filter(
            Subscription.organization_id == org_id,
            Subscription.status.in_(['active', 'trialing'])
        ).first()

    async def get_by_stripe_id(self, db: Session, stripe_subscription_id: str) -> Optional[Subscription]:
        """Get subscription by Stripe ID"""
        return db.query(Subscription).filter(
            Subscription.stripe_subscription_id == stripe_subscription_id
        ).first()


class AIUsageLogRepository(BaseRepository[AIUsageLog, AIUsageLogCreate, None]):
    def __init__(self):
        super().__init__(AIUsageLog)

    async def log_usage(self, db: Session, usage_data: AIUsageLogCreate) -> AIUsageLog:
        """Log AI usage and update organization credits"""
        # Create usage log
        usage_log = AIUsageLog(**usage_data.dict())
        db.add(usage_log)
        
        # Update organization credits
        org = db.query(Organization).filter(Organization.id == usage_data.organization_id).first()
        if org:
            org.ai_credits_used += usage_data.credits_consumed
        
        db.commit()
        db.refresh(usage_log)
        return usage_log

    async def get_organization_usage(self, db: Session, org_id: int, start_date: datetime, end_date: datetime) -> List[AIUsageLog]:
        """Get organization usage for date range"""
        return db.query(AIUsageLog).filter(
            AIUsageLog.organization_id == org_id,
            AIUsageLog.created_at >= start_date,
            AIUsageLog.created_at <= end_date
        ).order_by(desc(AIUsageLog.created_at)).all()

    async def get_monthly_usage_summary(self, db: Session, org_id: int, year: int, month: int) -> Dict[str, Any]:
        """Get monthly usage summary"""
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)

        usage_logs = await self.get_organization_usage(db, org_id, start_date, end_date)
        
        total_credits = sum(log.credits_consumed for log in usage_logs)
        total_tokens = sum(log.tokens_used for log in usage_logs)
        total_cost = sum(log.cost_usd or 0 for log in usage_logs)
        
        operations_count = {}
        models_count = {}
        
        for log in usage_logs:
            operations_count[log.operation_type] = operations_count.get(log.operation_type, 0) + 1
            models_count[log.model_used] = models_count.get(log.model_used, 0) + 1

        return {
            'total_credits': total_credits,
            'total_tokens': total_tokens,
            'total_cost_usd': total_cost,
            'operations_breakdown': operations_count,
            'models_breakdown': models_count,
            'usage_logs_count': len(usage_logs)
        }


class BillingTransactionRepository(BaseRepository[BillingTransaction, BillingTransactionCreate, None]):
    def __init__(self):
        super().__init__(BillingTransaction)

    async def get_organization_transactions(self, db: Session, org_id: int, limit: int = 50) -> List[BillingTransaction]:
        """Get organization billing transactions"""
        return db.query(BillingTransaction).filter(
            BillingTransaction.organization_id == org_id
        ).order_by(desc(BillingTransaction.created_at)).limit(limit).all()

    async def get_by_stripe_invoice(self, db: Session, stripe_invoice_id: str) -> Optional[BillingTransaction]:
        """Get transaction by Stripe invoice ID"""
        return db.query(BillingTransaction).filter(
            BillingTransaction.stripe_invoice_id == stripe_invoice_id
        ).first()