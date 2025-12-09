# Authentication & Authorization Guide

## Architecture Overview

The Aiser platform has **two authentication layers**:

1. **auth-service** (Port 5000): Dedicated authentication and authorization microservice
   - User authentication (login, register, logout)
   - JWT token generation and validation
   - User management
   - Password hashing and verification
   - Refresh token management
   
2. **chat2chart-server** (Port 8000): Main application server
   - Currently has its own login endpoint (should be deprecated)
   - Validates JWT tokens from auth-service
   - Should delegate all auth operations to auth-service

## Current Issues Fixed

### 1. ✅ Password Verification in chat2chart
- **Fixed**: Added proper password verification using `passlib`
- **Support**: pbkdf2_sha256 and bcrypt hashing schemes
- **Location**: `packages/chat2chart/server/app/modules/authentication/api.py`

### 2. ✅ Frontend Proxy
- **Fixed**: Routes authentication requests to proper service
- **Mapping**: 
  - Auth endpoints (`/login`, `/signin`, `/signup`) → auth-service
  - API endpoints → chat2chart-server
- **Location**: `packages/chat2chart/client/src/pages/api/auth/[...path].ts`

### 3. ✅ Auth Service Container
- **Fixed**: Added `postgresql-client` package to fix `pg_isready` errors
- **Dockerfile**: Updated to include PostgreSQL tools

### 4. ✅ Database Schema
- **Fixed**: Added missing columns (`is_verified`, `verification_attempts`, etc.)
- **Legacy**: Kept `id_new`, `new_id`, `legacy_id` for compatibility

## How to Login

### From Browser
1. URL: http://localhost:3000/login
2. Email: `admin@aiser.app`
3. Password: `admin123`

### Flow
```
Frontend → /api/auth/users/signin → auth-service:5000/api/v1/auth/login → JWT token → Browser cookie
```

## Next Steps (To Complete Integration)

### 1. Deprecate chat2chart's login endpoint
The chat2chart-server currently has its own `/auth/login` endpoint. This should:
- Return a message redirecting to auth-service
- Or be fully removed once all clients use auth-service

### 2. Standardize JWT token format
Both services should use the same JWT secret and token structure for interoperability.

### 3. Implement proper authorization
Add RBAC (Role-Based Access Control) checks in chat2chart-server:
- Verify user has permission to access resources
- Check organization/project membership
- Enforce multi-tenancy isolation

### 4. Clean up legacy ID columns
Create a migration to:
- Remove `id_new` and `new_id` duplicate columns
- Keep only `id` (UUID) and optional `legacy_id` (integer) for migration reference

## Files Modified

- `packages/chat2chart/server/app/modules/authentication/api.py` - Added password verification
- `packages/chat2chart/client/src/pages/api/auth/[...path].ts` - Fixed proxy routing
- `packages/auth/Dockerfile.dev` - Added postgresql-client
- `packages/chat2chart/server/app/modules/dashboards/models.py` - Added Dashboard relationships

## Testing

```bash
# Test login
curl -X POST http://localhost:3000/api/auth/users/signin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@aiser.app","password":"admin123"}'

# Should return JWT token
```

Login is now secure with proper password verification! 🔒

