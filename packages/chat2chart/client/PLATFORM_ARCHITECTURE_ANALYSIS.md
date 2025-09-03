# Aiser Platform Architecture Analysis

## 🏗️ **Complete Platform Data Model**

### **Multi-Tenant Architecture**
```
Organizations (Tenants)
├── Users (Organization Members)
├── Projects (Data Organization)
│   ├── Data Sources (Project-specific)
│   ├── Dashboards (Project-specific)
│   └── Conversations (Project-specific)
└── Plan Limits (Feature Restrictions)
```

### **Database Schema Analysis**

#### **1. Organizations & Users**
```sql
organizations
├── id (Integer, PK)
├── name, slug, description
├── plan_type (free, pro, team, enterprise)
├── ai_credits_used/limit
├── max_users, max_projects, max_storage_gb
└── trial_ends_at, is_trial_active

user_organizations (Many-to-Many)
├── organization_id (FK)
├── user_id (FK)
└── role (owner, admin, member)
```

#### **2. Projects (Data Organization)**
```sql
projects
├── id (Integer, PK)
├── name, description
├── organization_id (FK) -- CRITICAL: Projects belong to organizations
├── created_by (FK to users)
├── is_public, is_active
└── settings (JSON)

project_data_source (Many-to-Many)
├── project_id (FK)
├── data_source_id (String) -- References data_sources.id
├── data_source_type (file, database, cube, etc.)
└── is_active
```

#### **3. Data Sources (Global + Project-Scoped)**
```sql
data_sources
├── id (String, PK)
├── name, type, format, db_type
├── size, row_count, schema (JSON)
├── connection_config (JSON) -- Encrypted
├── file_path, original_filename
├── user_id, tenant_id -- CRITICAL: Multi-tenant
├── is_active, last_accessed
└── created_at, updated_at
```

#### **4. Dashboards & Charts (Project-Scoped)**
```sql
dashboards
├── id (UUID, PK)
├── name, description
├── project_id (FK) -- CRITICAL: Dashboards belong to projects
├── created_by (FK to users)
├── layout_config, theme_config, global_filters
├── is_public, is_active, is_template
└── max_widgets, max_pages (plan-based)

dashboard_widgets
├── id (UUID, PK)
├── dashboard_id (FK)
├── name, widget_type, chart_type
├── config, data_config, style_config (JSON)
├── x, y, width, height, z_index
└── is_visible, is_locked, is_resizable

charts
├── id (UUID, PK)
├── title, chart_type, chart_library
├── form_data, result, datasource (JSON)
├── user_id, conversation_id
└── tenant_id, created_at, updated_at
```

## 🚨 **Critical Architecture Issues**

### **1. Data Source Scoping Problem**
**Current Issue**: `/data/sources` returns global data sources, but the platform is multi-tenant with project-scoped data sources.

**Problem**: 
- Data sources should be scoped to organizations/projects
- Current API returns all data sources regardless of user/project context
- No proper access control

**Solution**: Data sources should be accessed via:
```
GET /api/organizations/{org_id}/projects/{project_id}/data-sources
```

### **2. Missing Project Context**
**Current Issue**: Most APIs don't require project context, but the database model is project-centric.

**Problem**:
- Dashboards belong to projects
- Data sources are linked to projects via `project_data_source`
- But APIs don't enforce project context

### **3. Inconsistent Data Source Structure**
**Current Issue**: `/data/sources` returns actual data instead of metadata structure.

**Expected**: 
```json
{
  "success": true,
  "data_sources": [
    {
      "id": "demo_sales_data",
      "name": "Demo Sales Data",
      "type": "file",
      "project_id": 1,
      "organization_id": 1,
      "schema": {...},
      "metadata": {...}
    }
  ]
}
```

**Actual**: Returns sample data instead of data source metadata.

## 🔧 **Required API Architecture Fixes**

### **1. Proper Multi-Tenant Data Source API**
```bash
# Organization-scoped data sources
GET  /api/organizations/{org_id}/data-sources
POST /api/organizations/{org_id}/data-sources

# Project-scoped data sources  
GET  /api/organizations/{org_id}/projects/{project_id}/data-sources
POST /api/organizations/{org_id}/projects/{project_id}/data-sources
PUT  /api/organizations/{org_id}/projects/{project_id}/data-sources/{id}
DELETE /api/organizations/{org_id}/projects/{project_id}/data-sources/{id}

# Data source queries (project-scoped)
POST /api/organizations/{org_id}/projects/{project_id}/data-sources/{id}/query
GET  /api/organizations/{org_id}/projects/{project_id}/data-sources/{id}/schema
```

### **2. Project-Scoped Dashboards**
```bash
# Project-scoped dashboards
GET  /api/organizations/{org_id}/projects/{project_id}/dashboards
POST /api/organizations/{org_id}/projects/{project_id}/dashboards
PUT  /api/organizations/{org_id}/projects/{project_id}/dashboards/{id}
DELETE /api/organizations/{org_id}/projects/{project_id}/dashboards/{id}

# Dashboard widgets
GET  /api/organizations/{org_id}/projects/{project_id}/dashboards/{id}/widgets
POST /api/organizations/{org_id}/projects/{project_id}/dashboards/{id}/widgets
```

### **3. Enterprise Connections (Organization-Scoped)**
```bash
# Enterprise data connections
GET  /api/organizations/{org_id}/enterprise/connections
POST /api/organizations/{org_id}/enterprise/connections
PUT  /api/organizations/{org_id}/enterprise/connections/{id}
DELETE /api/organizations/{org_id}/enterprise/connections/{id}

# Test enterprise connections
POST /api/organizations/{org_id}/enterprise/connections/{id}/test
POST /api/organizations/{org_id}/enterprise/connections/{id}/query
```

## 🎯 **Frontend Architecture Updates Required**

### **1. Context-Aware Data Source Service**
```typescript
class ProjectDataService {
  constructor(
    private organizationId: string,
    private projectId: string
  ) {}

  async getDataSources(): Promise<DataSource[]> {
    return fetch(`/api/organizations/${this.organizationId}/projects/${this.projectId}/data-sources`);
  }

  async executeQuery(dataSourceId: string, query: string): Promise<QueryResult> {
    return fetch(`/api/organizations/${this.organizationId}/projects/${this.projectId}/data-sources/${dataSourceId}/query`, {
      method: 'POST',
      body: JSON.stringify({ query })
    });
  }
}
```

### **2. Project Context Provider**
```typescript
interface ProjectContext {
  organizationId: string;
  projectId: string;
  organization: Organization;
  project: Project;
  userRole: 'owner' | 'admin' | 'member';
  planLimits: PlanLimits;
}

const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [context, setContext] = useState<ProjectContext | null>(null);
  
  // Load project context from URL or user selection
  useEffect(() => {
    const { orgId, projectId } = getProjectFromURL();
    loadProjectContext(orgId, projectId);
  }, []);

  return (
    <ProjectContext.Provider value={context}>
      {children}
    </ProjectContext.Provider>
  );
};
```

## 📊 **Current Working vs Broken Endpoints**

### **✅ Keep These (But Update for Project Context)**
```bash
# Data Sources (Update to project-scoped)
GET  /data/sources                        ✅ Working (but wrong scope)
POST /data/sources/{id}/query             ✅ Working (but wrong scope)

# Charts & Dashboards (Update to project-scoped)  
GET  /charts/dashboards/                  ✅ Working (but wrong scope)
POST /charts/dashboards/                  ✅ Working (but wrong scope)
GET  /charts/builder/list                 ✅ Working (but wrong scope)
POST /charts/builder/save                 ✅ Working (but wrong scope)

# Enterprise Connections (Update to org-scoped)
GET  /data/enterprise/connections         ✅ Working (but wrong scope)
POST /data/enterprise/connections/test    ✅ Working (but wrong scope)
```

### **❌ Remove These (Duplicates/Broken)**
```bash
# Duplicate data sources
GET  /data/sources/{source_id}            ❌ Duplicate
POST /data/sources/{source_id}/query      ❌ Duplicate

# Broken query engine
POST /data/query/execute                  ❌ Broken (file path errors)
POST /data/query/parallel                 ❌ Not implemented

# Non-functional Cube.js
GET  /data/cube/status                    ❌ Not found
POST /data/cube/query                     ❌ Not working
GET  /cube/status                         ❌ Not found
```

## 🚀 **Implementation Plan**

### **Phase 1: Fix Data Source API**
1. Update `/data/sources` to return metadata, not actual data
2. Add project context to data source queries
3. Implement proper access control

### **Phase 2: Implement Project-Scoped APIs**
1. Create organization/project-scoped data source endpoints
2. Update dashboard APIs to require project context
3. Implement enterprise connection scoping

### **Phase 3: Update Frontend**
1. Add project context provider
2. Update all services to use project-scoped APIs
3. Implement proper error handling for access control

### **Phase 4: Clean Up Duplicates**
1. Remove duplicate endpoints
2. Standardize response formats
3. Implement comprehensive error handling

## 🎯 **Immediate Actions Required**

1. **Fix Data Source API**: Return metadata structure, not actual data
2. **Add Project Context**: All APIs should require organization/project context
3. **Implement Access Control**: Users should only see their organization's data
4. **Update Frontend**: Use project-scoped APIs throughout
5. **Remove Duplicates**: Clean up the 50+ duplicate endpoints

The platform architecture is sound, but the API implementation doesn't match the database model. We need to implement proper multi-tenant, project-scoped APIs.
