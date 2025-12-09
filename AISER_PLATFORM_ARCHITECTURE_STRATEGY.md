# Aiser Platform - Architecture & Open Source Strategy

## Executive Summary

This document outlines the strategic architecture for Aiser Platform, designed as a **dual-licensed** AI-powered analytics platform:
- **Open Source Core** (MIT License): Chat2Chart - AI-powered chart generation
- **Enterprise Features** (Commercial License): Auth, Billing, Monitoring, Rate Limiting

---

## Current Architecture Analysis

### Package Structure

```
packages/
├── chat2chart/          # 🌟 OPEN SOURCE CORE (MIT)
│   ├── client/         # Next.js 14 frontend
│   ├── server/         # FastAPI backend
│   └── cube/           # Cube.js semantic layer
│
├── auth/               # 🔒 ENTERPRISE (Commercial)
│   └── src/            # Authentication & authorization service
│
├── shared/             # 🌟 OPEN SOURCE (Utilities)
│   └── Common TypeScript/Python utilities
│
├── docs/               # 🌟 OPEN SOURCE
│   └── Docusaurus documentation
│
├── monitoring-service/ # 🔒 ENTERPRISE
├── billing-service/    # 🔒 ENTERPRISE
├── rate-limiting-service/ # 🔒 ENTERPRISE
├── backup-service/     # 🔒 ENTERPRISE
│
└── DEPRECATED/TO_REMOVE:
    ├── auth-service/   # ❌ Old auth implementation
    ├── client/         # ❌ Superseded by chat2chart/client
    ├── ai-analytics/   # ❌ Merged into chat2chart
    └── ai-orchestrator/# ❌ Merged into chat2chart
```

---

## Open Source Core: Chat2Chart

### Purpose
AI-powered conversational analytics and visualization engine that transforms natural language into insights and charts.

### Key Features (Open Source)
1. **Natural Language to Chart**
   - Multi-modal AI (GPT-4, Claude, Gemini via LiteLLM)
   - Support for 50+ chart types (ECharts 6)
   - Intelligent chart recommendation

2. **Data Connectivity** (Basic)
   - File uploads (CSV, Excel, JSON)
   - PostgreSQL, MySQL
   - REST API connections

3. **AI Analytics Engine**
   - Trend analysis
   - Anomaly detection
   - Pattern recognition
   - Business insights generation

4. **Cube.js Integration**
   - Semantic layer for data modeling
   - Pre-aggregations
   - Caching layer

### Technology Stack
- **Backend**: FastAPI, Python 3.11+
- **Frontend**: Next.js 14, TypeScript, Ant Design
- **AI**: LiteLLM, LangChain
- **Database**: PostgreSQL (SQLAlchemy)
- **Visualization**: ECharts 6

---

## Enterprise Features

### 1. Authentication & Authorization (`auth/`)
**License**: Commercial  
**Features**:
- Multi-tenancy (organization-level isolation)
- Role-based access control (RBAC)
- SSO/SAML integration
- API key management
- Session management
- OAuth 2.0 providers

### 2. Monitoring Service
**License**: Commercial  
**Features**:
- Prometheus metrics
- Custom dashboards
- Alert management
- Performance tracking
- Usage analytics

### 3. Billing Service
**License**: Commercial  
**Features**:
- Subscription management
- Usage-based billing
- Payment gateway integration
- Invoice generation

### 4. Rate Limiting Service
**License**: Commercial  
**Features**:
- Per-user/organization limits
- API throttling
- Fair usage policies

### 5. Backup Service
**License**: Commercial  
**Features**:
- Automated backups
- Point-in-time recovery
- Disaster recovery

---

## Database Architecture

### Open Source (Chat2Chart)
**Schema**: `chat2chart_*` tables
```sql
-- Data Sources
data_sources
data_queries
data_connections

-- AI & Analytics
conversations
messages
ai_analysis_results

-- Visualizations
dashboards
widgets
charts

-- File Management
uploaded_files
```

### Enterprise (Auth)
**Schema**: `auth_*` tables
```sql
-- Authentication
users
user_sessions
refresh_tokens
api_keys

-- Multi-tenancy
organizations
organization_members
organization_settings

-- Authorization
roles
permissions
role_permissions
user_roles

-- Audit
audit_logs
login_history
```

---

## Migration Strategy (Current Issue Resolution)

### Problem Identified
The Alembic migration failure is caused by **cross-contamination** between:
1. `auth` service migrations
2. `chat2chart` service migrations

Both services share the same database (`aiser_world`) but need **isolated migration histories**.

### Solution Implemented
1. **Separate Alembic version tables**:
   - `auth`: Uses `alembic_version` table
   - `chat2chart`: Uses `chat2chart_alembic_version` table

2. **Isolated Alembic configurations**:
   - `auth`: `alembic.ini` (standard)
   - `chat2chart`: `alembic-c2c.ini` (custom)

3. **Corrected Python Path**:
   - Added `sys.path` fix in `env.py` for proper module discovery

---

## Clean Architecture Principles

### 1. Separation of Concerns
```
Open Source Core     |  Enterprise Layer
--------------------|--------------------
Data Processing     |  Auth & RBAC
AI Analytics        |  Billing
Visualization       |  Monitoring
Basic Connectivity  |  Advanced Connectors
```

### 2. Plugin Architecture
Enterprise features are **optional plugins** that enhance the core without modifying it.

### 3. API-First Design
- Core exposes REST APIs
- Enterprise services consume and extend these APIs
- Clear boundaries via API contracts

---

## Recommended Actions

### Immediate (Fix Current Issues)
1. ✅ Isolate Alembic migrations (in progress)
2. ✅ Fix `PYTHONPATH` in `env.py`
3. ❌ **CRITICAL**: Remove deprecated services
4. ❌ Consolidate overlapping functionality

### Short Term (Architecture Cleanup)
1. **Remove Redundancies**:
   ```bash
   # TO DELETE:
   packages/auth-service/      # Superseded by packages/auth/
   packages/client/            # Superseded by packages/chat2chart/client/
   packages/ai-analytics/      # Merged into chat2chart
   packages/ai-orchestrator/   # Merged into chat2chart
   ```

2. **Consolidate Data Models**:
   - Move shared models to `packages/shared/`
   - Ensure no duplicate table definitions

3. **Standardize Dependencies**:
   - Align Python versions across all services
   - Use shared `pyproject.toml` for common deps

### Medium Term (Open Source Preparation)
1. **Documentation**:
   - API documentation (OpenAPI/Swagger)
   - Developer onboarding guide
   - Contribution guidelines

2. **Security Audit**:
   - Remove any hardcoded secrets
   - Implement proper secret management
   - Add security scanning (Snyk, Dependabot)

3. **License Headers**:
   - Add MIT license to all open-source files
   - Add commercial license to enterprise files

4. **CI/CD**:
   - Separate pipelines for OSS vs Enterprise
   - Automated testing
   - Security scanning

### Long Term (Ecosystem Growth)
1. **Plugin Marketplace**:
   - Allow third-party enterprise features
   - Revenue sharing model

2. **Community Features**:
   - Community forum
   - Feature voting
   - Contributor recognition

3. **Enterprise Support Tiers**:
   - Community (OSS)
   - Professional (Support + Enterprise Features)
   - Enterprise (Custom SLAs + White Label)

---

## Deployment Architecture

### Open Source Deployment
```yaml
services:
  - chat2chart-server (FastAPI)
  - chat2chart-client (Next.js)
  - postgres (Database)
  - redis (Cache)
  - cube (Semantic Layer)
```

### Enterprise Deployment (Additional)
```yaml
services:
  - auth (Authentication)
  - monitoring (Prometheus/Grafana)
  - billing (Subscription Management)
  - rate-limiting (API Gateway)
```

---

## Strategic Recommendations

### 1. **Start with Clean Slate for OSS Release**
- Remove all deprecated packages
- Ensure zero enterprise code in OSS core
- Clear separation of concerns

### 2. **Enterprise as Optional Layer**
- Core works standalone
- Enterprise adds value without breaking changes
- Clear upgrade path

### 3. **Community First**
- Prioritize developer experience
- Comprehensive documentation
- Active community engagement

### 4. **Business Model**
- Open Source Core: Free forever (MIT)
- Enterprise Features: Subscription-based
- Support & Services: Professional tier

---

## Next Steps

### Phase 1: Fix Current Issues (Now)
1. ✅ Complete Alembic migration fix
2. Clean up deprecated services
3. Verify all services start successfully

### Phase 2: Architecture Cleanup (This Week)
1. Remove redundant packages
2. Consolidate shared code
3. Document API contracts

### Phase 3: OSS Preparation (Next 2 Weeks)
1. Audit codebase for enterprise dependencies
2. Add license headers
3. Create contribution guidelines
4. Set up CI/CD

### Phase 4: Launch (Next Month)
1. Announce open source release
2. Community onboarding
3. Marketing & PR

---

## Success Metrics

### Open Source
- GitHub stars/forks
- Contributor growth
- Issue response time
- Community engagement

### Enterprise
- Conversion rate (OSS → Enterprise)
- MRR/ARR
- Customer retention
- Support ticket resolution

---

## Conclusion

Aiser Platform is strategically positioned as a **dual-licensed AI analytics platform**:
- **Open Source Core** attracts developers and builds community
- **Enterprise Features** provide sustainable revenue
- **Clean architecture** ensures maintainability and future-proofing

The current migration issues are a symptom of incomplete separation between these layers. Once resolved and cleaned up, the platform will be ready for open-source launch and enterprise growth.

---

**Last Updated**: November 7, 2025  
**Version**: 1.0  
**Status**: Strategic Planning & Current Issue Resolution

