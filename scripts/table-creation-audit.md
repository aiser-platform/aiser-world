# Table Creation Audit Report

## Summary

This audit identifies all places where database tables are being created outside of the models-as-source-of-truth workflow.

## Status: ⚠️ Partial - Some Table Creation Code Still Active

**Note:** Some files were reverted by the user. Current status:
- ✅ `app/modules/queries/api.py` - `ensure_tables()` function **DISABLED**
- ⚠️ `scripts/setup_database.py` - `create_missing_tables()` function **STILL ACTIVE**
- ⚠️ `app/scripts/create_refresh_tokens_if_missing.py` - **STILL ACTIVE**
- ⚠️ `create_missing_tables.py` - `create_all()` call **STILL ACTIVE**

---

## 1. Direct SQL CREATE TABLE Statements

### ✅ `app/modules/queries/api.py` - `ensure_tables()` function
**Status:** DISABLED (Function returns early)
- **Tables created:** `query_tabs`, `saved_queries`, `query_schedules`, `query_snapshots`
- **Location:** Lines 42-107
- **Action taken:** Function now returns early with explanation comment

### ⚠️ `scripts/setup_database.py` - `create_missing_tables()` function
**Status:** STILL ACTIVE (User reverted changes)
- **Tables created:** `organizations`, `projects`, `data_sources`, `project_data_source`, `dashboards`, `dashboard_widgets`, `roles`, `user_organizations`
- **Location:** Lines 108-270
- **Action needed:** Comment out or disable this function

### ⚠️ `app/scripts/create_refresh_tokens_if_missing.py`
**Status:** STILL ACTIVE (User reverted changes)
- **Tables created:** `refresh_tokens`
- **Location:** Lines 11-26 (DDL variable)
- **Action needed:** Comment out or disable table creation

---

## 2. `create_all()` Calls

### ⚠️ `create_missing_tables.py`
**Status:** STILL ACTIVE (User reverted changes)
- **Location:** Line 43
- **Code:** `Base.metadata.create_all(bind=engine)`
- **Action needed:** Comment out this call

---

## 3. Model Definitions Outside `app/db/models.py`

These models are defined in other files and may create tables if registered with `Base.metadata`:

### Models Currently Used in Codebase:

1. **`app/modules/data/models.py`**
   - `DataQuery` - Used in `data_sources_crud.py`
   - **Table:** `data_queries`

2. **`app/modules/projects/models.py`**
   - `Organization` - Used extensively (projects/api.py, projects/services.py, rbac_service.py, etc.)
   - `Project` - Used extensively (projects/api.py, projects/services.py, charts/api.py, etc.)
   - `ProjectDataSource` - Used in data services and projects
   - `ProjectConversation` - Used in projects
   - `UserOrganization` - Used in projects, teams, authentication
   - **Tables:** `organizations`, `projects`, `project_data_source`, `project_conversation`, `user_organizations`

3. **`app/modules/dashboards/models.py`**
   - `Dashboard` - Used in charts/api.py, charts/services/dashboard_service.py
   - `DashboardPage` - Used in dashboards
   - `DashboardShare` - Used in charts/api.py
   - `DashboardTemplate` - Used in dashboards
   - `DashboardAnalytics` - Used in dashboards
   - **Tables:** `dashboards`, `dashboard_pages`, `dashboard_shares`, `dashboard_templates`, `dashboard_analytics`

4. **`app/modules/charts/models.py`**
   - `ChatVisualization` - Used in charts/services.py, charts/repository.py
   - `DashboardEmbed` - Used in charts/api.py, main.py
   - **Tables:** `charts`, `dashboard_embeds`

5. **`app/modules/files/models.py`**
   - `File` - Used in files/services/s3.py, files/services/local.py, files/repository.py
   - **Table:** `files`

6. **`app/modules/user/models_user_setting.py`**
   - `UserSetting` - Used in user/user_setting_repository.py
   - **Table:** `user_settings`

7. **`app/modules/chats/node_memory/models.py`**
   - `ChatNode` - Used in chats/node_memory/repository.py, chats/core/ai_flows/agents/base_agent.py
   - **Table:** `chat_node`

8. **`app/modules/chats/assets/models.py`**
   - `SavedAsset` - Used in chats/assets/services.py
   - **Table:** `saved_asset`

---

## 4. Models Imported in `app/modules/__init__.py`

The following models are imported in `app/modules/__init__.py`, which means they're registered with `Base.metadata`:

```python
from .chats.conversations import models  # Re-exports Conversation from app.db.models
from .files import models                # File model
from .projects import models             # Organization, Project, etc.
from .chats.messages import models        # Re-exports Message from app.db.models
from .chats.node_memory import models   # ChatNode model
from .charts import models               # ChatVisualization, DashboardEmbed
from .dashboards import models           # Dashboard, DashboardPage, etc.
from .data import models                 # Re-exports DataSource, FileStorage; also DataQuery
from .chats.assets import models         # SavedAsset model
```

**⚠️ IMPORTANT:** These models will be detected by Alembic autogenerate if they're registered with `Base.metadata`. If you only want the 4 core tables, you need to either:

1. Remove these model imports from `app/modules/__init__.py`
2. Ensure these models don't inherit from `Base` or `BaseModel`
3. Or add them to `app/db/models.py` if they should be part of the schema

---

## 5. Core 4 Tables (Source of Truth)

These are the ONLY tables that should exist according to your requirements:

1. ✅ `conversation` - Defined in `app/db/models.py` as `Conversation`
2. ✅ `message` - Defined in `app/db/models.py` as `Message`
3. ✅ `data_sources` - Defined in `app/db/models.py` as `DataSource`
4. ✅ `file_storage` - Defined in `app/db/models.py` as `FileStorage`

---

## Recommendations

### Immediate Actions:
1. ✅ **DONE:** `app/modules/queries/api.py` - `ensure_tables()` disabled
2. ⚠️ **PENDING:** `scripts/setup_database.py` - Disable `create_missing_tables()` function
3. ⚠️ **PENDING:** `app/scripts/create_refresh_tokens_if_missing.py` - Disable table creation
4. ⚠️ **PENDING:** `create_missing_tables.py` - Comment out `create_all()` call

### Next Steps (if you want ONLY 4 tables):
1. **Remove model imports from `app/modules/__init__.py`** - This prevents Alembic from detecting them
2. **Check Alembic autogenerate** - Run `alembic revision --autogenerate` to see if it detects unwanted models
3. **Update code that uses other models** - Either:
   - Remove functionality that depends on these models
   - Or add these models to `app/db/models.py` if they should be part of the schema

### If You Need These Tables:
If you actually need these tables (Organization, Project, Dashboard, etc.), you should:
1. Add them to `app/db/models.py` as the source of truth
2. Generate a migration: `alembic revision --autogenerate -m "add additional tables"`
3. Review and apply the migration

---

## Files Status

1. ✅ `app/modules/queries/api.py` - `ensure_tables()` function **DISABLED**
2. ⚠️ `scripts/setup_database.py` - **STILL ACTIVE** (user reverted changes)
3. ⚠️ `app/scripts/create_refresh_tokens_if_missing.py` - **STILL ACTIVE** (user reverted changes)
4. ⚠️ `create_missing_tables.py` - **STILL ACTIVE** (user reverted changes)

---

## Verification

To verify no tables are being created outside migrations:

1. Check Alembic autogenerate output:
   ```bash
   cd packages/chat2chart/server
   poetry run alembic -c alembic.ini revision --autogenerate -m "test"
   ```
   Review the generated migration to see what tables it detects.

2. Check database for unexpected tables:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

3. Search for any remaining CREATE TABLE statements:
   ```bash
   grep -r "CREATE TABLE" --include="*.py" packages/chat2chart/server/app/
   grep -r "create_all" --include="*.py" packages/chat2chart/server/
   ```

---

## Quick Reference: Files That Still Create Tables

- `scripts/setup_database.py` - Lines 108-270 (`create_missing_tables()` function)
- `app/scripts/create_refresh_tokens_if_missing.py` - Lines 11-26 (DDL variable)
- `create_missing_tables.py` - Line 43 (`Base.metadata.create_all()`)



