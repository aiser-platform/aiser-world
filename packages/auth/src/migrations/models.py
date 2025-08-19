from app.common.model import Base

# Import all models to ensure relationships are properly established
from app.modules.user.models import User
from app.modules.authentication.models import UserAuthentication
from app.modules.organizations.models import (
    Role, Organization, UserOrganization, Project, UserProject,
    Subscription, BillingTransaction, AIUsageLog, PricingPlan
)
from app.modules.device_session.models import DeviceSession
from app.modules.temporary_token.models import TemporaryToken
