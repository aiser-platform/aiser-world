# Authentication Provider System

This module provides a unified authentication interface that supports multiple authentication providers:

- **AuthServiceProvider**: Default provider that wraps the existing `/packages/auth` service
- **SupabaseAuthProvider**: Uses Supabase Auth for cloud SaaS deployments
- **KeycloakAuthProvider**: Uses Keycloak for on-premise deployments

## Configuration

Set the `AUTH_PROVIDER` environment variable to choose the provider:

```bash
# Use existing auth service (default)
AUTH_PROVIDER=auth_service

# Use Supabase
AUTH_PROVIDER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Use Keycloak
AUTH_PROVIDER=keycloak
KEYCLOAK_SERVER_URL=http://localhost:8080
KEYCLOAK_REALM=aiser
KEYCLOAK_CLIENT_ID=aiser-client
KEYCLOAK_CLIENT_SECRET=your-client-secret
```

## Usage

### Getting a Provider

```python
from app.modules.authentication.providers.factory import get_auth_provider

provider = get_auth_provider()
```

### Using the Provider

```python
# Login
result = await provider.login("user@example.com", "password")
access_token = result['access_token']
user = result['user']

# Verify token
user_info = await provider.verify_token(access_token)

# Get user info
user_info = await provider.get_user_info(access_token)

# Refresh token
new_tokens = await provider.refresh_token(refresh_token)

# Logout
success = await provider.logout(access_token)

# Signup
result = await provider.signup("user@example.com", "username", "password")
```

## Provider-Specific Configuration

### AuthServiceProvider

Uses the existing `/packages/auth` service. No additional configuration needed if using default Docker service name.

```bash
AUTH_SERVICE_URL=http://auth-service:5000  # Optional, defaults to Docker service name
```

### SupabaseAuthProvider

Requires Supabase project credentials:

```bash
AUTH_PROVIDER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key  # Optional, for admin operations
```

Install dependencies:
```bash
pip install supabase
```

### KeycloakAuthProvider

Requires Keycloak server configuration:

```bash
AUTH_PROVIDER=keycloak
KEYCLOAK_SERVER_URL=http://localhost:8080
KEYCLOAK_REALM=aiser
KEYCLOAK_CLIENT_ID=aiser-client
KEYCLOAK_CLIENT_SECRET=your-client-secret

# For user signup (optional)
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin
```

Install dependencies:
```bash
pip install python-keycloak
```

## Implementation Details

### Base Interface

All providers implement the `AuthProvider` base class which defines:

- `login(identifier, password)` - Authenticate user
- `logout(token)` - Invalidate session
- `verify_token(token)` - Verify JWT token
- `refresh_token(refresh_token)` - Refresh access token
- `get_user_info(token)` - Get user information
- `signup(email, username, password)` - Register new user

### User Data Normalization

All providers normalize user data to a standard format:

```python
{
    'id': 'user-id',
    'email': 'user@example.com',
    'username': 'username',
    'is_verified': True/False
}
```

### Error Handling

All providers raise `HTTPException` with appropriate status codes:

- `401 Unauthorized` - Invalid credentials or token
- `400 Bad Request` - Invalid request data
- `409 Conflict` - User already exists
- `500 Internal Server Error` - Provider-specific errors

## Migration Guide

### From Legacy Auth to Provider System

1. **No changes needed for default setup** - The system defaults to `AuthServiceProvider` which wraps the existing auth service.

2. **To switch to Supabase**:
   ```bash
   AUTH_PROVIDER=supabase
   SUPABASE_URL=...
   SUPABASE_ANON_KEY=...
   ```

3. **To switch to Keycloak**:
   ```bash
   AUTH_PROVIDER=keycloak
   KEYCLOAK_SERVER_URL=...
   KEYCLOAK_REALM=...
   KEYCLOAK_CLIENT_ID=...
   KEYCLOAK_CLIENT_SECRET=...
   ```

### Testing

The provider system is designed to be backward compatible. Existing endpoints continue to work with the default `AuthServiceProvider`.

To test a new provider:

1. Set environment variables
2. Restart the server
3. Test login/logout flows
4. Verify token validation works

## Future Enhancements

- OAuth2/OIDC providers (Google, GitHub, Microsoft)
- LDAP/Active Directory provider
- Multi-factor authentication support
- Session management improvements
- Token rotation policies



