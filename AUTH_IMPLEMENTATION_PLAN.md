# Auth Architecture Implementation Plan

## Current State Analysis

### Existing Structure
- **`/packages/auth`**: Standalone auth service (FastAPI)
  - Handles user authentication, signup, login, logout
  - JWT token generation and validation
  - Email verification
  - Password reset
  - Device session management

- **`/packages/chat2chart`**: Main application
  - Uses auth service via proxy (`/api/auth/*`)
  - Has its own `JWTCookieBearer` dependency
  - Custom auth logic in `app/modules/authentication/`

### Key Observations
1. **Separation of Concerns**: Auth service is already separate
2. **Dual Auth Support**: Need to add Supabase/Keycloak providers
3. **Open Source Strategy**: Core chat2chart should be open source (Apache 2.0)
4. **Enterprise Features**: Should be in separate packages/modules

## Implementation Strategy

### Phase 1: Auth Provider Abstraction (Week 1)

#### 1.1 Create Base Auth Provider Interface
**Location**: `packages/chat2chart/server/app/modules/authentication/providers/base.py`

```python
from abc import ABC, abstractmethod
from typing import Dict, Optional, Any

class AuthProvider(ABC):
    """Base interface for all authentication providers"""
    
    @abstractmethod
    async def login(self, identifier: str, password: str) -> Dict[str, Any]:
        """Authenticate user and return tokens + user info"""
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
    
    @abstractmethod
    async def signup(self, email: str, username: str, password: str) -> Dict[str, Any]:
        """Register new user"""
        pass
```

#### 1.2 Implement Current Auth Service Provider
**Location**: `packages/chat2chart/server/app/modules/authentication/providers/auth_service.py`

- Wraps existing `/packages/auth` service
- Makes HTTP calls to auth service
- Handles cookie forwarding

#### 1.3 Implement Supabase Provider
**Location**: `packages/chat2chart/server/app/modules/authentication/providers/supabase.py`

- Uses Supabase Python client
- Handles Supabase Auth API
- Maps Supabase user to Aiser user format

#### 1.4 Implement Keycloak Provider
**Location**: `packages/chat2chart/server/app/modules/authentication/providers/keycloak.py`

- Uses python-keycloak library
- Handles Keycloak OIDC flows
- Maps Keycloak user to Aiser user format

#### 1.5 Create Provider Factory
**Location**: `packages/chat2chart/server/app/modules/authentication/providers/factory.py`

```python
from app.core.config import settings
from .base import AuthProvider
from .auth_service import AuthServiceProvider
from .supabase import SupabaseAuthProvider
from .keycloak import KeycloakAuthProvider

def get_auth_provider() -> AuthProvider:
    """Factory function to get the appropriate auth provider"""
    auth_type = os.getenv('AUTH_PROVIDER', 'auth_service').lower()
    
    if auth_type == 'supabase':
        return SupabaseAuthProvider()
    elif auth_type == 'keycloak':
        return KeycloakAuthProvider()
    else:
        return AuthServiceProvider()  # Default: use existing auth service
```

### Phase 2: Update Authentication Endpoints (Week 1-2)

#### 2.1 Update Login Endpoint
**Location**: `packages/chat2chart/server/app/modules/authentication/api.py`

```python
from app.modules.authentication.providers.factory import get_auth_provider

@router.post("/auth/login")
async def login(request: Request, response: Response, credentials: SignInRequest):
    provider = get_auth_provider()
    result = await provider.login(credentials.identifier, credentials.password)
    # Set cookies, return response
    return result
```

#### 2.2 Update Other Auth Endpoints
- `/auth/logout` → Use provider
- `/auth/refresh` → Use provider
- `/auth/users/me` → Use provider

### Phase 3: RBAC Implementation (Week 2-3)

#### 3.1 Create Permission System
**Location**: `packages/chat2chart/server/app/modules/authentication/rbac.py`

- Define Permission enum
- Define Role class
- Create permission checking functions

#### 3.2 Add RBAC Tables
**Migration**: Add tables for:
- `user_organizations` (user_id, organization_id, role)
- `project_members` (user_id, project_id, role)
- `permissions` (role, permission, resource_type)

#### 3.3 Create RBAC Decorator
**Location**: `packages/chat2chart/server/app/modules/authentication/rbac_decorator.py`

```python
@require_permission(Permission.PROJECT_EDIT, resource_type="project")
async def update_project(project_id: str, ...):
    pass
```

### Phase 4: Open Source Strategy (Week 3-4)

#### 4.1 Separate Core from Enterprise
**Structure**:
```
packages/
├── chat2chart/              # Open Source (Apache 2.0)
│   ├── client/              # Core UI
│   ├── server/              # Core API
│   └── LICENSE              # Apache 2.0
├── chat2chart-enterprise/   # Enterprise (Proprietary)
│   ├── auth/                # Enterprise auth features
│   ├── billing/             # Billing integration
│   └── advanced-analytics/  # Advanced features
└── shared/                  # Shared utilities
```

#### 4.2 License Strategy
- **Core chat2chart**: Apache 2.0 (allows commercial use, requires attribution)
- **Enterprise modules**: Proprietary (restrict hosting as competitor)
- **Shared utilities**: Apache 2.0

#### 4.3 Feature Flags
```python
# packages/chat2chart/server/app/core/features.py
class FeatureFlags:
    ENABLE_ENTERPRISE_AUTH = os.getenv('ENABLE_ENTERPRISE_AUTH', 'false') == 'true'
    ENABLE_BILLING = os.getenv('ENABLE_BILLING', 'false') == 'true'
```

### Phase 5: Testing & Migration (Week 4)

#### 5.1 Unit Tests
- Test each auth provider
- Test RBAC permission checking
- Test provider factory

#### 5.2 Integration Tests
- Test full login/logout flow with each provider
- Test RBAC enforcement
- Test feature flags

#### 5.3 Migration Guide
- Document how to switch auth providers
- Document RBAC setup
- Document enterprise feature activation

## File Structure

```
packages/chat2chart/server/app/modules/authentication/
├── providers/
│   ├── __init__.py
│   ├── base.py                    # Base interface
│   ├── factory.py                 # Provider factory
│   ├── auth_service.py            # Current auth service wrapper
│   ├── supabase.py                # Supabase provider
│   └── keycloak.py                # Keycloak provider
├── rbac/
│   ├── __init__.py
│   ├── permissions.py             # Permission definitions
│   ├── roles.py                   # Role definitions
│   ├── decorators.py              # RBAC decorators
│   └── checks.py                  # Permission checking logic
├── deps/
│   └── auth_bearer.py             # Updated to use provider
└── api.py                         # Updated endpoints
```

## Configuration

### Environment Variables

```bash
# Auth Provider Selection
AUTH_PROVIDER=auth_service|supabase|keycloak

# Supabase (if AUTH_PROVIDER=supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Keycloak (if AUTH_PROVIDER=keycloak)
KEYCLOAK_SERVER_URL=http://localhost:8080
KEYCLOAK_REALM=aiser
KEYCLOAK_CLIENT_ID=aiser-client
KEYCLOAK_CLIENT_SECRET=your-client-secret

# Enterprise Features
ENABLE_ENTERPRISE_AUTH=false
ENABLE_BILLING=false
```

## Migration Path

### Step 1: Implement Provider Abstraction
1. Create base interface
2. Wrap existing auth service
3. Test with current setup

### Step 2: Add New Providers
1. Implement Supabase provider
2. Implement Keycloak provider
3. Test each provider

### Step 3: Implement RBAC
1. Create permission system
2. Add database tables
3. Add decorators to endpoints

### Step 4: Separate Enterprise Features
1. Move enterprise code to separate package
2. Add feature flags
3. Update build process

## Success Criteria

1. ✅ Can switch between auth providers via env var
2. ✅ All endpoints work with any provider
3. ✅ RBAC properly enforces permissions
4. ✅ Core is open source, enterprise is separate
5. ✅ No breaking changes to existing functionality



