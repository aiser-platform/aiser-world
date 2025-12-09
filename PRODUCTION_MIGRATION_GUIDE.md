# Production Migration Guide

**Date**: November 7, 2025  
**Status**: Ready for Implementation  
**Environment**: Production Deployment

---

## Overview

This guide outlines the strategy for managing database migrations in production using Alembic. Unlike development (where we use SQLAlchemy's `create_all()`), production requires controlled, versioned, and reversible schema changes.

---

## Architecture

### Service Separation

Each service manages its own migrations independently:

| Service | Migration Directory | Version Table | Database Schema |
|---------|-------------------|---------------|-----------------|
| **auth** | `packages/auth/src/migrations/` | `alembic_version` | Auth-related tables |
| **chat2chart** | `packages/chat2chart/server/alembic_c2c/` | `chat2chart_alembic_version` | Analytics & visualization tables |

---

## Step 1: Initial Migration Creation

### For Auth Service

```bash
cd packages/auth

# Activate Poetry environment
poetry shell

# Generate initial migration
poetry run alembic revision --autogenerate -m "Initial auth schema"

# Review the generated migration file
# Location: src/migrations/versions/XXXXX_initial_auth_schema.py
```

### For Chat2Chart Service

```bash
cd packages/chat2chart/server

# Activate Poetry environment
poetry shell

# Generate initial migration
poetry run alembic -c alembic-c2c.ini revision --autogenerate -m "Initial chat2chart schema"

# Review the generated migration file
# Location: alembic_c2c/versions/XXXXX_initial_chat2chart_schema.py
```

---

## Step 2: Review & Edit Migrations

### Critical Review Checklist

Before applying any migration:

- [ ] **Verify table names** match your models
- [ ] **Check foreign key constraints** are correct
- [ ] **Ensure indexes** are properly defined
- [ ] **Review data types** (especially JSONB vs JSON)
- [ ] **Test rollback** (`downgrade()` function)
- [ ] **Add comments** for complex operations
- [ ] **Consider data migration** if schema changes affect existing data

### Example: Adding Comments

```python
def upgrade() -> None:
    """Add user profile enhancements for v2.0"""
    op.add_column('users', sa.Column('profile_picture', sa.String(), nullable=True))
    # NOTE: Existing users will have NULL profile pictures
    # Frontend should handle this gracefully
```

---

## Step 3: Testing Migrations

### Local Testing

```bash
# Start a clean test database
docker compose -f docker-compose.test.yml up -d postgres

# Apply migrations
cd packages/auth
poetry run alembic upgrade head

# Verify tables
docker exec -it aiser-postgres-test psql -U aiser -d aiser_world -c "\dt"

# Test rollback
poetry run alembic downgrade -1

# Re-apply
poetry run alembic upgrade head
```

### Integration Testing

```python
# tests/test_migrations.py
import pytest
from alembic import command
from alembic.config import Config

def test_migrations_up_and_down():
    """Test that migrations can be applied and rolled back"""
    alembic_cfg = Config("alembic.ini")
    
    # Upgrade to head
    command.upgrade(alembic_cfg, "head")
    
    # Downgrade one step
    command.downgrade(alembic_cfg, "-1")
    
    # Re-upgrade
    command.upgrade(alembic_cfg, "head")
```

---

## Step 4: Production Deployment Strategy

### Option A: Pre-Deployment Migration (Recommended)

**Workflow**:
1. Deploy migration scripts to production server
2. Run migrations **before** deploying new code
3. Deploy new application code
4. Verify functionality

**Advantages**:
- Safer: Schema changes applied before code changes
- Rollback: Can revert code without schema changes
- Downtime: Minimal if migrations are backward-compatible

**Commands**:
```bash
# SSH into production server
ssh production-server

# Navigate to deployment directory
cd /opt/aiser-world

# Pull latest code
git pull origin main

# Run migrations (auth service)
cd packages/auth
poetry run alembic upgrade head

# Run migrations (chat2chart service)
cd ../chat2chart/server
poetry run alembic -c alembic-c2c.ini upgrade head

# Deploy new containers
docker compose -f docker-compose.prod.yml up -d --build
```

### Option B: Zero-Downtime Migration

**Strategy**: Make schema changes backward-compatible

**Phase 1**: Add new columns/tables (nullable)
```python
def upgrade():
    op.add_column('users', sa.Column('new_field', sa.String(), nullable=True))
```

**Phase 2**: Deploy code that uses both old and new schema

**Phase 3**: Migrate data
```python
def upgrade():
    # Backfill data
    op.execute("UPDATE users SET new_field = old_field WHERE new_field IS NULL")
```

**Phase 4**: Make new column non-nullable
```python
def upgrade():
    op.alter_column('users', 'new_field', nullable=False)
```

**Phase 5**: Remove old column
```python
def upgrade():
    op.drop_column('users', 'old_field')
```

---

## Step 5: CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/migrations.yml
name: Database Migrations

on:
  pull_request:
    paths:
      - 'packages/auth/src/migrations/**'
      - 'packages/chat2chart/server/alembic_c2c/**'

jobs:
  test-migrations:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install Poetry
        run: pip install poetry
      
      - name: Test Auth Migrations
        working-directory: packages/auth
        run: |
          poetry install
          poetry run alembic upgrade head
          poetry run alembic downgrade base
          poetry run alembic upgrade head
      
      - name: Test Chat2Chart Migrations
        working-directory: packages/chat2chart/server
        run: |
          poetry install
          poetry run alembic -c alembic-c2c.ini upgrade head
          poetry run alembic -c alembic-c2c.ini downgrade base
          poetry run alembic -c alembic-c2c.ini upgrade head
```

---

## Step 6: Monitoring & Rollback

### Migration Logging

```python
# In your migration file
import logging

logger = logging.getLogger('alembic.migration')

def upgrade():
    logger.info("Starting user table enhancement migration")
    op.add_column('users', ...)
    logger.info("Successfully added new column")
```

### Rollback Procedure

**If migration fails**:
```bash
# Check current version
poetry run alembic current

# Rollback to previous version
poetry run alembic downgrade -1

# Or rollback to specific version
poetry run alembic downgrade <revision_id>
```

**If application fails after migration**:
1. Rollback code deployment
2. Assess if schema rollback is needed
3. If yes: `alembic downgrade -1`
4. If no: Fix code and redeploy

---

## Best Practices

### DO ✅

1. **Always test migrations** on staging before production
2. **Make migrations reversible** (implement `downgrade()`)
3. **Use transactions** for atomic operations
4. **Add comments** for complex logic
5. **Version control** all migration files
6. **Backup database** before major migrations
7. **Monitor migration duration** for long-running ops
8. **Use batch operations** for large data migrations

### DON'T ❌

1. **Never modify** existing migration files after they're applied
2. **Don't skip versions** in production
3. **Avoid dropping tables/columns** without data backup
4. **Don't run migrations manually** in production (use CI/CD)
5. **Never hardcode** environment-specific values
6. **Don't ignore migration errors** - investigate immediately
7. **Avoid complex logic** in migration files (keep them simple)

---

## Migration Templates

### Template 1: Add New Table

```python
"""Add analytics_events table

Revision ID: abc123def456
Revises: previous_revision
Create Date: 2025-11-07 12:00:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'abc123def456'
down_revision = 'previous_revision'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'analytics_events',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('event_data', postgresql.JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), onupdate=sa.text('now()'))
    )
    op.create_index('ix_analytics_events_user_id', 'analytics_events', ['user_id'])
    op.create_index('ix_analytics_events_created_at', 'analytics_events', ['created_at'])

def downgrade() -> None:
    op.drop_index('ix_analytics_events_created_at', table_name='analytics_events')
    op.drop_index('ix_analytics_events_user_id', table_name='analytics_events')
    op.drop_table('analytics_events')
```

### Template 2: Add Column with Data Migration

```python
"""Add user email_verified column

Revision ID: def456ghi789
Revises: abc123def456
Create Date: 2025-11-07 13:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = 'def456ghi789'
down_revision = 'abc123def456'

def upgrade() -> None:
    # Step 1: Add column as nullable
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=True))
    
    # Step 2: Set default for existing users
    op.execute("UPDATE users SET email_verified = false WHERE email_verified IS NULL")
    
    # Step 3: Make column non-nullable
    op.alter_column('users', 'email_verified', nullable=False)

def downgrade() -> None:
    op.drop_column('users', 'email_verified')
```

### Template 3: Modify Column Type

```python
"""Change user age from integer to string

Revision ID: ghi789jkl012
Revises: def456ghi789
Create Date: 2025-11-07 14:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = 'ghi789jkl012'
down_revision = 'def456ghi789'

def upgrade() -> None:
    # Modify column type with USING clause
    op.execute("""
        ALTER TABLE users 
        ALTER COLUMN age TYPE VARCHAR(10) 
        USING age::VARCHAR(10)
    """)

def downgrade() -> None:
    # Reverse: string to integer
    op.execute("""
        ALTER TABLE users 
        ALTER COLUMN age TYPE INTEGER 
        USING age::INTEGER
    """)
```

---

## Troubleshooting

### Issue: "Target database is not up to date"

**Cause**: Trying to generate migration when database has unapplied changes

**Solution**:
```bash
# Apply all pending migrations first
poetry run alembic upgrade head

# Then generate new migration
poetry run alembic revision --autogenerate -m "your message"
```

### Issue: "Can't locate revision identified by 'xxx'"

**Cause**: Migration history mismatch between code and database

**Solution**:
```bash
# Check current database version
poetry run alembic current

# Check migration history
poetry run alembic history

# If mismatch, manually set database to correct version
poetry run alembic stamp <revision_id>
```

### Issue: "Multiple head revisions present"

**Cause**: Branching in migration history

**Solution**:
```bash
# Merge branches
poetry run alembic merge -m "merge branches" <rev1> <rev2>
```

---

## Summary Checklist

### For Each Migration:

- [ ] Generated via `alembic revision --autogenerate`
- [ ] Reviewed and edited for correctness
- [ ] Tested locally (upgrade + downgrade)
- [ ] Committed to version control
- [ ] Tested on staging environment
- [ ] Approved via code review
- [ ] Documented in CHANGELOG
- [ ] Scheduled for production deployment
- [ ] Database backup created
- [ ] Applied in production
- [ ] Verified post-deployment
- [ ] Monitored for issues

---

## Next Steps

1. Generate initial migrations for both services
2. Test migrations in development
3. Set up CI/CD pipeline for automated testing
4. Document migration procedures in runbook
5. Train team on migration best practices

---

**Status**: Documentation Complete  
**Ready for**: Migration Generation & Testing

