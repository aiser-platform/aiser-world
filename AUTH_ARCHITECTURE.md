# Aiser Platform Authentication Architecture

## Overview

This document outlines the authentication architecture for the Aiser Platform, designed to support both **Cloud SaaS** (Supabase Auth) and **On-Premise** (Keycloak) deployments with a unified, extensible interface.

## Architecture Principles

1. **Abstraction Layer**: Single interface supporting multiple auth providers
2. **Security First**: All endpoints require authentication unless explicitly public
3. **RBAC**: Role-based access control for organizations, projects, and resources
4. **Session Management**: Proper session lifecycle with secure logout
5. **Extensibility**: Easy to add new auth providers in the future

## Current Implementation

### Authentication Flow

```
User Login → Auth Provider (Custom/Supabase/Keycloak) → JWT Token → Cookie Storage → API Requests
```

### Token Management

- **Access Token**: Stored in cookies (`c2c_access_token`, `access_token`)
- **Refresh Token**: Stored in cookies (`refresh_token`)
- **Token Validation**: Via `JWTCookieBearer` dependency in FastAPI

### Session Management

- **Frontend**: React Context (`AuthContext`) manages user state
- **Backend**: JWT validation on every protected endpoint
- **Logout**: Comprehensive cleanup of all session data

## Dual Auth Provider Support

### Architecture Design

```
┌─────────────────────────────────────────────────────────┐
│              Auth Abstraction Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Supabase Auth│  │   Keycloak   │  │ Custom Auth  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│           Unified Auth Interface                         │
│  - login(username, password)                            │
│  - logout()                                             │
│  - verifyToken(token)                                   │
│  - refreshToken(refreshToken)                           │
│  - getUserInfo(token)                                  │
└─────────────────────────────────────────────────────────┘
```

### Implementation Strategy

#### 1. Auth Provider Interface

```python
# packages/chat2chart/server/app/modules/authentication/providers/base.py
from abc import ABC, abstractmethod
from typing import Dict, Optional

class AuthProvider(ABC):
    """Base interface for all authentication providers"""
    
    @abstractmethod
    async def login(self, identifier: str, password: str) -> Dict[str, Any]:
        """Authenticate user and return tokens"""
        pass
    
    @abstractmethod
    async def logout(self, token: str) -> bool:
        """Invalidate user session"""
        pass
    
    @abstractmethod
    async def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode JWT token"""
        pass
    
    @abstractmethod
    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token"""
        pass
    
    @abstractmethod
    async def get_user_info(self, token: str) -> Dict[str, Any]:
        """Get user information from token"""
        pass
```

#### 2. Supabase Auth Provider

```python
# packages/chat2chart/server/app/modules/authentication/providers/supabase.py
from supabase import create_client, Client
from .base import AuthProvider

class SupabaseAuthProvider(AuthProvider):
    def __init__(self):
        self.supabase: Client = create_client(
            os.getenv('SUPABASE_URL'),
            os.getenv('SUPABASE_ANON_KEY')
        )
    
    async def login(self, identifier: str, password: str) -> Dict[str, Any]:
        response = self.supabase.auth.sign_in_with_password({
            "email": identifier,
            "password": password
        })
        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "user": response.user
        }
    
    # ... implement other methods
```

#### 3. Keycloak Auth Provider

```python
# packages/chat2chart/server/app/modules/authentication/providers/keycloak.py
from keycloak import KeycloakOpenID
from .base import AuthProvider

class KeycloakAuthProvider(AuthProvider):
    def __init__(self):
        self.keycloak = KeycloakOpenID(
            server_url=os.getenv('KEYCLOAK_SERVER_URL'),
            client_id=os.getenv('KEYCLOAK_CLIENT_ID'),
            realm_name=os.getenv('KEYCLOAK_REALM'),
            client_secret_key=os.getenv('KEYCLOAK_CLIENT_SECRET')
        )
    
    async def login(self, identifier: str, password: str) -> Dict[str, Any]:
        token = self.keycloak.token(identifier, password)
        user_info = self.keycloak.userinfo(token['access_token'])
        return {
            "access_token": token['access_token'],
            "refresh_token": token['refresh_token'],
            "user": user_info
        }
    
    # ... implement other methods
```

#### 4. Auth Service Factory

```python
# packages/chat2chart/server/app/modules/authentication/services/auth_service_factory.py
from app.core.config import settings
from .providers.base import AuthProvider
from .providers.supabase import SupabaseAuthProvider
from .providers.keycloak import KeycloakAuthProvider
from .providers.custom import CustomAuthProvider

def get_auth_provider() -> AuthProvider:
    """Factory function to get the appropriate auth provider"""
    auth_type = os.getenv('AUTH_PROVIDER', 'custom').lower()
    
    if auth_type == 'supabase':
        return SupabaseAuthProvider()
    elif auth_type == 'keycloak':
        return KeycloakAuthProvider()
    else:
        return CustomAuthProvider()  # Current implementation
```

## RBAC Implementation

### Role Hierarchy

```
Organization Level:
  - Owner: Full control
  - Admin: Manage users, projects, settings
  - Member: Access to projects
  - Viewer: Read-only access

Project Level:
  - Owner: Full project control
  - Editor: Create/edit resources
  - Viewer: Read-only access
```

### Permission Model

```python
# packages/chat2chart/server/app/modules/authentication/rbac.py
from enum import Enum
from typing import List, Set

class Permission(str, Enum):
    # Organization permissions
    ORG_VIEW = "org:view"
    ORG_EDIT = "org:edit"
    ORG_DELETE = "org:delete"
    ORG_MANAGE_USERS = "org:manage_users"
    
    # Project permissions
    PROJECT_VIEW = "project:view"
    PROJECT_EDIT = "project:edit"
    PROJECT_DELETE = "project:delete"
    PROJECT_MANAGE_MEMBERS = "project:manage_members"
    
    # Data permissions
    DATA_VIEW = "data:view"
    DATA_EDIT = "data:edit"
    DATA_DELETE = "data:delete"
    
    # AI permissions
    AI_USE = "ai:use"
    AI_ADVANCED = "ai:advanced"

class Role:
    def __init__(self, name: str, permissions: Set[Permission]):
        self.name = name
        self.permissions = permissions

# Predefined roles
ROLES = {
    "org_owner": Role("Owner", set(Permission)),
    "org_admin": Role("Admin", {
        Permission.ORG_VIEW, Permission.ORG_EDIT,
        Permission.ORG_MANAGE_USERS, Permission.PROJECT_VIEW,
        Permission.PROJECT_EDIT, Permission.DATA_VIEW, Permission.AI_USE
    }),
    "org_member": Role("Member", {
        Permission.PROJECT_VIEW, Permission.DATA_VIEW, Permission.AI_USE
    }),
    "org_viewer": Role("Viewer", {
        Permission.PROJECT_VIEW, Permission.DATA_VIEW
    })
}

def check_permission(user_id: str, resource_type: str, resource_id: str, permission: Permission) -> bool:
    """Check if user has permission for a resource"""
    # Implementation: Query user_organizations and project_members tables
    pass
```

### RBAC Decorator

```python
# packages/chat2chart/server/app/modules/authentication/rbac_decorator.py
from functools import wraps
from fastapi import HTTPException, Depends
from .rbac import Permission, check_permission
from .deps.auth_bearer import JWTCookieBearer

def require_permission(permission: Permission, resource_type: str = None):
    """Decorator to require specific permission"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_token: dict = kwargs.get('current_token')
            if not current_token:
                current_token = Depends(JWTCookieBearer())
            
            user_id = current_token.get('id') or current_token.get('user_id')
            resource_id = kwargs.get('organization_id') or kwargs.get('project_id')
            
            if not check_permission(user_id, resource_type, resource_id, permission):
                raise HTTPException(
                    status_code=403,
                    detail=f"Permission denied: {permission.value}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator
```

## Endpoint Authentication

### Current Status

All endpoints should have authentication. Here's the checklist:

#### ✅ Protected Endpoints (Have Auth)
- `/api/conversations/*` - All conversation endpoints
- `/api/projects/*` - All project endpoints  
- `/api/organizations/*` - All organization endpoints
- `/api/data/sources/*` - Data source endpoints
- `/api/charts/*` - Chart endpoints
- `/api/users/*` - User profile endpoints
- `/api/ai/*` - AI endpoints

#### ⚠️ Needs Review
- `/api/files/*` - File upload endpoints
- `/api/queries/*` - Query execution endpoints
- `/api/cube/*` - Cube.js endpoints

### Authentication Pattern

```python
from app.modules.authentication.deps.auth_bearer import JWTCookieBearer

@router.get("/endpoint")
async def protected_endpoint(
    current_token: dict = Depends(JWTCookieBearer())
):
    user_id = current_token.get('id') or current_token.get('user_id')
    # ... endpoint logic
```

## Session Management

### Logout Flow

1. **Frontend** (`AuthContext.logout()`):
   - Clear conversation session manager
   - Clear organization context
   - Clear all localStorage items
   - Clear all cookies
   - Clear sessionStorage
   - Redirect to login

2. **Backend** (`/api/auth/logout`):
   - Invalidate refresh token
   - Clear session cookies
   - Return success

### Session Security

- **Token Expiration**: Access tokens expire after 1 hour
- **Refresh Tokens**: Valid for 30 days
- **Auto-logout**: Frontend checks token validity every 5 minutes
- **Cookie Security**: HttpOnly, Secure, SameSite=Strict (in production)

## Configuration

### Environment Variables

```bash
# Auth Provider Selection
AUTH_PROVIDER=custom|supabase|keycloak

# Supabase Configuration (if AUTH_PROVIDER=supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Keycloak Configuration (if AUTH_PROVIDER=keycloak)
KEYCLOAK_SERVER_URL=http://localhost:8080
KEYCLOAK_REALM=aiser
KEYCLOAK_CLIENT_ID=aiser-client
KEYCLOAK_CLIENT_SECRET=your-client-secret

# SMTP Configuration (for email)
SMTP_HOST=smtp.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-user
SMTP_PASSWORD=your-ses-password
SMTP_FROM=noreply@aiser.ai

# Notification Configuration
NOTIFICATION_PROVIDER=azure|firebase
AZURE_NOTIFICATION_HUB_CONNECTION_STRING=...
FIREBASE_SERVER_KEY=...
```

## Migration Path

### Phase 1: Current State (Custom Auth)
- ✅ Custom JWT-based authentication
- ✅ Cookie-based session management
- ✅ User/organization/project structure

### Phase 2: Add Supabase Support
1. Implement `SupabaseAuthProvider`
2. Add Supabase configuration
3. Test with `AUTH_PROVIDER=supabase`
4. Migrate user data to Supabase (if needed)

### Phase 3: Add Keycloak Support
1. Implement `KeycloakAuthProvider`
2. Add Keycloak configuration
3. Test with `AUTH_PROVIDER=keycloak`
4. Document on-premise deployment

### Phase 4: RBAC Implementation
1. Add role/permission tables
2. Implement permission checking
3. Add RBAC decorators to endpoints
4. Update frontend to show/hide features based on permissions

## Security Best Practices

1. **Never store passwords in plain text**
2. **Use HTTPS in production**
3. **Implement rate limiting on auth endpoints**
4. **Log all authentication attempts**
5. **Use secure cookie flags**
6. **Implement CSRF protection**
7. **Validate all user inputs**
8. **Use parameterized queries (prevent SQL injection)**
9. **Implement proper CORS policies**
10. **Regular security audits**

## Testing

### Unit Tests
- Auth provider implementations
- Permission checking logic
- Token validation

### Integration Tests
- Login/logout flows
- Token refresh
- Permission enforcement
- Session management

### Security Tests
- SQL injection attempts
- XSS attempts
- CSRF attacks
- Session hijacking attempts

## Future Enhancements

1. **OAuth2/OIDC Support**: Google, GitHub, Microsoft login
2. **MFA/2FA**: Multi-factor authentication
3. **SSO**: Single Sign-On for enterprise
4. **Audit Logging**: Track all authentication events
5. **Session Management UI**: View/revoke active sessions
6. **Password Policies**: Enforce strong passwords
7. **Account Lockout**: Prevent brute force attacks



