# Keycloak Docker Setup for On-Premise Deployment

## Overview

Keycloak is configured to run in Docker for on-premise deployments. It uses the existing PostgreSQL database or can use a separate database.

## Quick Start

### 1. Start Keycloak

```bash
# Start Keycloak with existing postgres
docker-compose -f docker-compose.dev.yml -f docker-compose.keycloak.yml up -d keycloak

# Or start everything
docker-compose -f docker-compose.dev.yml -f docker-compose.keycloak.yml up -d
```

### 2. Access Keycloak Admin Console

- **URL**: http://localhost:8080
- **Username**: `admin` (or from `KEYCLOAK_ADMIN` env var)
- **Password**: `admin` (or from `KEYCLOAK_ADMIN_PASSWORD` env var)

### 3. Configure Aiser Platform

Add to `.env`:

```bash
AUTH_PROVIDER=keycloak
KEYCLOAK_SERVER_URL=http://keycloak:8080  # Internal Docker network
# Or for external access:
# KEYCLOAK_SERVER_URL=http://localhost:8080
KEYCLOAK_REALM=aiser
KEYCLOAK_CLIENT_ID=aiser-client
KEYCLOAK_CLIENT_SECRET=<your-client-secret>
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin
```

## Configuration Steps

### Step 1: Create Realm

1. Go to Admin Console → Realms → Create Realm
2. Name: `aiser` (or your preferred name)
3. Click "Create"

### Step 2: Create Client

1. Go to Clients → Create
2. Client ID: `aiser-client`
3. Client Protocol: `openid-connect`
4. Click "Save"

### Step 3: Configure Client

1. **Access Type**: `confidential` (for server-side) or `public` (for SPA)
2. **Valid Redirect URIs**: 
   - `http://localhost:3000/*`
   - `https://yourdomain.com/*` (for production)
3. **Web Origins**: 
   - `http://localhost:3000`
   - `https://yourdomain.com` (for production)
4. Click "Save"

### Step 4: Get Client Secret

1. Go to Credentials tab
2. Copy the "Secret" value
3. Add to `.env`: `KEYCLOAK_CLIENT_SECRET=<secret>`

### Step 5: Create Test User

1. Go to Users → Add User
2. Username: `testuser`
3. Email: `test@example.com`
4. Email Verified: `ON`
5. Click "Save"
6. Go to Credentials tab → Set Password
7. Set password and turn off "Temporary"

## Docker Configuration

The `docker-compose.keycloak.yml` file includes:

- **Keycloak Service**: Latest Keycloak image
- **Database**: Uses existing `postgres` service
- **Ports**: 8080 (HTTP), 8443 (HTTPS)
- **Volumes**: Persists Keycloak data
- **Health Checks**: Ensures service is ready

## Production Setup

### 1. Use Production Database

Update `docker-compose.keycloak.yml`:

```yaml
environment:
  DB_ADDR: your-postgres-host
  DB_DATABASE: keycloak
  DB_USER: keycloak_user
  DB_PASSWORD: secure_password
```

### 2. Enable HTTPS

```yaml
environment:
  KC_HTTP_ENABLED: "false"
  KC_HTTPS_ENABLED: "true"
  KC_HTTPS_PORT: 8443
```

### 3. Use Production Mode

```yaml
command:
  - start
  - --optimized
```

### 4. Configure SMTP

1. Go to Realm Settings → Email
2. Configure SMTP (Amazon SES, your SMTP server, etc.)
3. Test email delivery

## Integration

The Aiser Platform automatically uses Keycloak when:

1. `AUTH_PROVIDER=keycloak` is set in `.env`
2. Keycloak environment variables are configured
3. Server is restarted

No code changes needed! The provider system handles the switch automatically.

## Troubleshooting

### Keycloak won't start

```bash
# Check logs
docker logs aiser-keycloak

# Verify database connection
docker exec aiser-keycloak /opt/keycloak/bin/kc.sh show-config
```

### Can't login to Admin Console

```bash
# Reset admin password
docker exec aiser-keycloak /opt/keycloak/bin/kc.sh reset-password \
  --realm master \
  --username admin \
  --new-password newpassword
```

### Client authentication fails

1. Verify client secret matches
2. Check redirect URIs include your frontend URL
3. Verify realm name matches configuration

## Security Best Practices

1. **Change default admin password** immediately
2. **Use HTTPS** in production
3. **Rotate client secrets** regularly
4. **Enable MFA** for admin users
5. **Limit admin access** to specific IPs
6. **Regular backups** of realm configuration

## Additional Resources

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Keycloak Docker Image](https://quay.io/repository/keycloak/keycloak)
- See `keycloak/README.md` for detailed setup guide



