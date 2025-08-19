"""
Enterprise Authentication Service
Supports multiple authentication providers via Keycloak
"""

from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.modules.enterprise.keycloak_integration import keycloak_service, EnterpriseAuthMixin
from app.modules.enterprise.config import enterprise_config, AuthProvider
from app.modules.user.models import User
from app.modules.user.repository import UserRepository
from app.modules.organizations.models import Organization, UserOrganization, Role
from app.modules.organizations.repository import OrganizationRepository, UserOrganizationRepository
from app.modules.authentication.auth import Auth


class EnterpriseAuthService(EnterpriseAuthMixin):
    """Enterprise authentication service with multi-provider support"""
    
    def __init__(self):
        self.user_repository = UserRepository()
        self.org_repository = OrganizationRepository()
        self.user_org_repository = UserOrganizationRepository()
        self.internal_auth = Auth()
    
    async def authenticate_user(self, db: Session, token: str) -> Optional[Tuple[User, Organization]]:
        """Authenticate user with configured provider"""
        
        if enterprise_config.auth_provider == AuthProvider.KEYCLOAK:
            return await self._authenticate_with_keycloak(db, token)
        elif enterprise_config.auth_provider == AuthProvider.AZURE_AD:
            return await self._authenticate_with_azure_ad(db, token)
        else:
            return await self._authenticate_internal(db, token)
    
    async def _authenticate_with_keycloak(self, db: Session, token: str) -> Optional[Tuple[User, Organization]]:
        """Authenticate with Keycloak"""
        try:
            # Verify token with Keycloak
            token_data = await keycloak_service.verify_token(token)
            if not token_data:
                return None
            
            # Get user info
            user_info = await keycloak_service.get_user_info(token)
            if not user_info:
                return None
            
            # Find or create user
            user = await self._find_or_create_user_from_keycloak(db, user_info)
            if not user:
                return None
            
            # Get user's organization
            organization = await self._get_user_primary_organization(db, user.id)
            
            return user, organization
            
        except Exception as e:
            print(f"Keycloak authentication failed: {e}")
            return None
    
    async def _authenticate_with_azure_ad(self, db: Session, token: str) -> Optional[Tuple[User, Organization]]:
        """Authenticate with Azure AD (placeholder for future implementation)"""
        # TODO: Implement Azure AD authentication
        return None
    
    async def _authenticate_internal(self, db: Session, token: str) -> Optional[Tuple[User, Organization]]:
        """Authenticate with internal system"""
        try:
            # Decode JWT token
            payload = self.internal_auth.decodeJWT(token)
            if not payload:
                return None
            
            user_id = payload.get("user_id")
            if not user_id:
                return None
            
            # Get user from database
            user = await self.user_repository.get_by_id(user_id)
            if not user:
                return None
            
            # Get user's primary organization
            organization = await self._get_user_primary_organization(db, user.id)
            
            return user, organization
            
        except Exception as e:
            print(f"Internal authentication failed: {e}")
            return None
    
    async def _find_or_create_user_from_keycloak(self, db: Session, user_info: Dict[str, Any]) -> Optional[User]:
        """Find or create user from Keycloak user info"""
        email = user_info.get('email')
        if not email:
            return None
        
        # Try to find existing user
        user = await self.user_repository.get_by_email(email)
        
        if not user:
            # Create new user
            user_data = {
                'username': user_info.get('preferred_username', email.split('@')[0]),
                'email': email,
                'password': '',  # No password needed for SSO users
                'is_verified': user_info.get('email_verified', False)
            }
            
            user = await self.user_repository.create(db, user_data)
            
            # Create default organization if auto-create is enabled
            if enterprise_config.auto_create_organizations:
                await self._create_default_organization_for_user(db, user.id)
        
        return user
    
    async def _get_user_primary_organization(self, db: Session, user_id: int) -> Optional[Organization]:
        """Get user's primary organization"""
        user_orgs = await self.org_repository.get_user_organizations(db, user_id)
        
        if not user_orgs:
            # Create default organization if none exists
            if enterprise_config.auto_create_organizations:
                return await self._create_default_organization_for_user(db, user_id)
            return None
        
        # Return first organization (in production, you might have logic for primary org)
        return user_orgs[0]
    
    async def _create_default_organization_for_user(self, db: Session, user_id: int) -> Organization:
        """Create default organization for user"""
        from app.modules.organizations.schemas import OrganizationCreate
        
        # Get user info for organization name
        user = await self.user_repository.get_by_id(user_id)
        org_name = f"{user.username}'s Organization" if user else enterprise_config.default_organization_name
        
        org_data = OrganizationCreate(
            name=org_name,
            description="Default organization"
        )
        
        # Create organization with user as owner
        organization = await self.org_repository.create_with_owner(db, org_data, user_id)
        
        return organization
    
    async def provision_enterprise_user(self, db: Session, user_data: Dict[str, Any], organization_id: Optional[int] = None) -> Tuple[User, Organization]:
        """Provision user for enterprise deployment"""
        
        # Create user
        user = await self.user_repository.create(db, user_data)
        
        if organization_id:
            # Add to existing organization
            organization = await self.org_repository.get(db, organization_id)
            if organization:
                # Add user to organization with member role
                await self.user_org_repository.create_membership(db, user.id, organization_id, 'member')
        else:
            # Create new organization
            organization = await self._create_default_organization_for_user(db, user.id)
        
        return user, organization
    
    def get_sso_redirect_url(self, redirect_uri: str, state: Optional[str] = None) -> str:
        """Get SSO redirect URL based on configured provider"""
        
        if enterprise_config.auth_provider == AuthProvider.KEYCLOAK:
            return keycloak_service.get_auth_url(redirect_uri, state)
        elif enterprise_config.auth_provider == AuthProvider.AZURE_AD:
            # TODO: Implement Azure AD redirect URL
            return ""
        else:
            # Internal auth doesn't use SSO
            return ""
    
    async def handle_sso_callback(self, db: Session, code: str, redirect_uri: str) -> Optional[Tuple[User, Organization, str]]:
        """Handle SSO callback and return user, organization, and JWT token"""
        
        if enterprise_config.auth_provider == AuthProvider.KEYCLOAK:
            # Exchange code for token
            token_data = await keycloak_service.exchange_code_for_token(code, redirect_uri)
            if not token_data:
                return None
            
            access_token = token_data.get('access_token')
            if not access_token:
                return None
            
            # Authenticate user
            auth_result = await self._authenticate_with_keycloak(db, access_token)
            if not auth_result:
                return None
            
            user, organization = auth_result
            
            # Generate internal JWT token for the session
            jwt_token = self.internal_auth.signJWT({
                "user_id": user.id,
                "email": user.email,
                "organization_id": organization.id if organization else None,
                "auth_provider": "keycloak",
                "keycloak_token": access_token
            })
            
            return user, organization, jwt_token
        
        return None
    
    def is_enterprise_deployment(self) -> bool:
        """Check if this is an enterprise deployment"""
        return (
            enterprise_config.deployment_mode == DeploymentMode.ON_PREMISE or
            enterprise_config.auth_provider != AuthProvider.INTERNAL or
            enterprise_config.enforce_mfa
        )
    
    def get_deployment_info(self) -> Dict[str, Any]:
        """Get deployment information for monitoring and support"""
        return {
            "deployment_mode": enterprise_config.deployment_mode.value,
            "auth_provider": enterprise_config.auth_provider.value,
            "multi_tenancy_enabled": enterprise_config.enable_multi_tenancy,
            "mfa_enforced": enterprise_config.enforce_mfa,
            "compliance_requirements": enterprise_config.get_compliance_requirements(),
            "audit_logging_enabled": enterprise_config.enable_audit_logging,
            "encryption_at_rest": enterprise_config.data_encryption_at_rest,
            "encryption_in_transit": enterprise_config.data_encryption_in_transit,
            "is_enterprise": self.is_enterprise_deployment()
        }


# Global enterprise auth service
enterprise_auth_service = EnterpriseAuthService()