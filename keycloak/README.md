# Keycloak Setup for On-Premise Deployment

This guide explains how to set up Keycloak for Aiser Platform on-premise deployments.

## Quick Start

### 1. Start Keycloak with Docker Compose

```bash
# Start Keycloak (uses existing postgres service)
docker-compose -f docker-compose.dev.yml -f docker-compose.keycloak.yml up -d keycloak

# Or start with separate database
docker-compose -f docker-compose.dev.yml -f docker-compose.keycloak.yml up -d
```

### 2. Access Keycloak Admin Console

- URL: http://localhost:8080
- Username: `admin` (or value from `KEYCLOAK_ADMIN` env var)
- Password: `admin` (or value from `KEYCLOAK_ADMIN_PASSWORD` env var)

### 3. Create Realm and Client

1. **Create Realm**:
   - Go to Admin Console → Realms → Create Realm
   - Name: `aiser` (or your preferred name)
   - Click "Create"

2. **Create Client**:
   - Go to Clients → Create
   - Client ID: `aiser-client`
   - Client Protocol: `openid-connect`
   - Click "Save"
   
3. **Configure Client**:
   - Access Type: `confidential` (for server-side apps) or `public` (for SPA)
   - Valid Redirect URIs: `http://localhost:3000/*` (add your frontend URLs)
   - Web Origins: `http://localhost:3000` (add your frontend URLs)
   - Click "Save"

4. **Get Client Secret**:
   - Go to Credentials tab
   - Copy the "Secret" value
   - Add to `.env`: `KEYCLOAK_CLIENT_SECRET=<secret>`

### 4. Configure Aiser Platform

Add to your `.env` file:

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

### 5. Create Test User

1. Go to Users → Add User
2. Username: `testuser`
3. Email: `test@example.com`
4. Email Verified: `ON`
5. Click "Save"
6. Go to Credentials tab → Set Password
7. Set password and turn off "Temporary"

## Production Setup

### 1. Use Production Database

Update `docker-compose.keycloak.yml` to use your production PostgreSQL:

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
  KC_HTTPS_CERTIFICATE_FILE: /opt/keycloak/conf/server.crt
  KC_HTTPS_CERTIFICATE_KEY_FILE: /opt/keycloak/conf/server.key
```

### 3. Use Production Mode

```yaml
command:
  - start
  - --optimized
  # Remove --import-realm for production
```

### 4. Configure SMTP

1. Go to Realm Settings → Email
2. Configure SMTP settings:
   - Host: `smtp.amazonaws.com` (or your SMTP server)
   - Port: `587`
   - From: `noreply@yourdomain.com`
   - Enable Authentication: `ON`
   - Username: Your SMTP username
   - Password: Your SMTP password

### 5. Configure Themes (Optional)

1. Create custom theme in `keycloak/themes/aiser/`
2. Mount volume: `./keycloak/themes:/opt/keycloak/themes`
3. Select theme in Realm Settings → Themes

## Realm Configuration Export

Export your realm configuration for backup/version control:

```bash
# From Keycloak container
docker exec aiser-keycloak /opt/keycloak/bin/kc.sh export \
  --dir /opt/keycloak/data/export \
  --realm aiser

# Copy from container
docker cp aiser-keycloak:/opt/keycloak/data/export/aiser-realm.json ./keycloak/realms/
```

## Import Realm Configuration

```yaml
volumes:
  - ./keycloak/realms:/opt/keycloak/data/import

command:
  - start-dev
  - --import-realm
```

## Troubleshooting

### Keycloak won't start

1. Check logs: `docker logs aiser-keycloak`
2. Verify database connection
3. Check port conflicts: `netstat -tulpn | grep 8080`

### Can't login to Admin Console

1. Reset admin password:
   ```bash
   docker exec aiser-keycloak /opt/keycloak/bin/kc.sh reset-password \
     --realm master \
     --username admin \
     --new-password newpassword
   ```

### Client authentication fails

1. Verify client secret matches
2. Check redirect URIs include your frontend URL
3. Verify realm name matches configuration

### User signup fails

1. Check `KEYCLOAK_ADMIN_USERNAME` and `KEYCLOAK_ADMIN_PASSWORD`
2. Verify admin user has permissions to create users
3. Check Keycloak logs for detailed error

## Integration with Aiser Platform

### Frontend Configuration

No changes needed! The frontend continues to use `/api/auth/*` endpoints which proxy to the auth provider.

### Backend Configuration

The backend automatically uses Keycloak when `AUTH_PROVIDER=keycloak` is set.

### Testing

1. Start Keycloak: `docker-compose -f docker-compose.dev.yml -f docker-compose.keycloak.yml up -d keycloak`
2. Configure `.env` with Keycloak settings
3. Restart chat2chart server
4. Test login/logout flows

## Security Best Practices

1. **Change default admin password** immediately
2. **Use HTTPS** in production
3. **Rotate client secrets** regularly
4. **Enable MFA** for admin users
5. **Limit admin access** to specific IPs
6. **Regular backups** of realm configuration
7. **Monitor logs** for suspicious activity

## Additional Resources

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Keycloak Docker Image](https://quay.io/repository/keycloak/keycloak)
- [Keycloak Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/)



