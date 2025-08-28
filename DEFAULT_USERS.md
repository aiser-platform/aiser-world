# 🔐 Default Users for Development

This document lists the default users created when initializing the Aiser database for development purposes.

## ⚠️ **IMPORTANT: Development Only**

These credentials are **ONLY for development and testing**. **NEVER use these passwords in production!**

## 👥 Default Users

### 1. **Admin User**
- **Email**: `admin@aiser.app`
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: `admin`
- **Access**: Full system access, user management, organization management

### 2. **Test User**
- **Email**: `user@aiser.app`
- **Username**: `user`
- **Password**: `user123`
- **Role**: `user`
- **Access**: Standard user access, can create charts and conversations

### 3. **Analyst User**
- **Email**: `analyst@aiser.app`
- **Username**: `analyst`
- **Password**: `analyst123`
- **Role**: `analyst`
- **Access**: Enhanced analytics access, data analysis capabilities

## 🚀 How to Use

### **Login to the Application**
1. Navigate to the login page
2. Use any of the email/password combinations above
3. You'll be redirected to the appropriate dashboard based on your role

### **Database Access**
```bash
# Connect to PostgreSQL container
docker exec -it aiser-postgres-dev psql -U aiser -d aiser_world

# View all users
SELECT id, email, username, role, status, created_at FROM users ORDER BY created_at;
```

## 🔒 Security Notes

- **Change passwords immediately** after first login in production
- **Delete or disable** these accounts in production environments
- **Use strong passwords** for production user accounts
- **Enable 2FA** for production environments
- **Regular password rotation** is recommended

## 🛠️ Updating Default Users

To modify the default users or add new ones:

1. **Edit** `scripts/init-db.sql`
2. **Generate new password hashes** using:
   ```bash
   python3 scripts/generate_password_hashes.py
   ```
3. **Update** the INSERT statements with new hashes
4. **Restart** the database container to reinitialize

## 📝 Password Hash Generation

The script `scripts/generate_password_hashes.py` uses bcrypt to generate secure password hashes:

```bash
# Install dependencies
pip install passlib[bcrypt]

# Generate hashes
python3 scripts/generate_password_hashes.py
```

## 🔄 Database Reinitialization

To reinitialize the database with updated users:

```bash
# Stop and remove the database container
docker-compose -f docker-compose.dev.yml down postgres

# Remove the volume to clear existing data
docker volume rm aiser-world_postgres_dev_data

# Start the services again
docker-compose -f docker-compose.dev.yml up -d
```

**Note**: This will **delete all existing data** in the database.
