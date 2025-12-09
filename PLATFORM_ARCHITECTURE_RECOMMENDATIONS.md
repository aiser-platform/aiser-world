# Aiser Platform - Architecture & Implementation Recommendations

**Date**: November 7, 2025  
**For**: Production-Ready Enterprise Data Platform  
**Status**: Strategic Roadmap

---

## Executive Summary

Based on your requirements for a **robust, enterprise-grade data platform** with:
- ✅ Universal data source connectivity
- ✅ Multi-engine query optimization
- ✅ AI-powered analytics (NL → SQL → Chart → Narration)
- ✅ Dashboard studio integration
- ✅ Scalable orchestration

This document provides strategic recommendations for architecture, implementation priorities, and integration points.

---

## 1. Data Source Connectivity Foundation

### Current Status
✅ **Working**:
- PostgreSQL connections (test, save, query)
- Direct SQL execution via multi-engine
- Connection encryption
- Metadata storage

🔧 **Needs Work**:
- ClickHouse HTTP interface configuration
- File upload & query
- Cloud data warehouse connectors (Snowflake, BigQuery, Redshift)

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────┐
│           Universal Data Source Manager                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │  Relational │  │   Warehouses │  │   File/Stream │ │
│  ├─────────────┤  ├──────────────┤  ├───────────────┤ │
│  │ PostgreSQL  │  │  ClickHouse  │  │    CSV/Excel  │ │
│  │ MySQL       │  │  Snowflake   │  │    Parquet    │ │
│  │ SQL Server  │  │  BigQuery    │  │    JSON/API   │ │
│  └─────────────┘  │  Redshift    │  │    S3/GCS     │ │
│                   └──────────────┘  └───────────────┘ │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Connection Pool & Credential Manager      │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Implementation Priority

**Phase 1** (Immediate - Week 1):
1. ✅ Fix ClickHouse HTTP interface
2. ✅ Test file upload (CSV/Excel)
3. ✅ Verify connection persistence
4. Add connection health checks

**Phase 2** (Short-term - Week 2-3):
1. Add Snowflake connector
2. Add BigQuery connector  
3. Implement connection pooling
4. Add retry logic & failover

**Phase 3** (Medium-term - Month 2):
1. API/REST data sources
2. Streaming data (Kafka, Kinesis)
3. NoSQL databases (MongoDB, Cassandra)
4. Cloud storage (S3, GCS, Azure Blob)

---

## 2. Multi-Engine Query Execution

### Current Implementation

Your platform already has a **sophisticated multi-engine system**:

```python
# From: packages/chat2chart/server/app/modules/data/services/multi_engine_query_service.py

QueryEngine:
├── DUCKDB        # For CSV/Parquet, in-memory analytics
├── CUBE          # For semantic layer, pre-aggregated queries
├── SPARK         # For big data processing (planned)
├── DIRECT_SQL    # For database connections ✅ WORKING
└── PANDAS        # For data manipulation
```

### Architecture Recommendation

**Keep this multi-engine approach** - it's excellent! Enhance it with:

```
┌──────────────────────────────────────────────────────────┐
│          Query Optimizer & Engine Selector               │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Input: SQL Query + Data Source + Metadata               │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │  1. Analyze Query Complexity                     │    │
│  │     - Table size, joins, aggregations            │    │
│  │  2. Check Data Source Type                       │    │
│  │     - Database, file, warehouse                  │    │
│  │  3. Select Optimal Engine                        │    │
│  │     - DIRECT_SQL for databases                   │    │
│  │     - DUCKDB for files < 1GB                     │    │
│  │     - CUBE for pre-aggregated metrics            │    │
│  │  4. Execute & Cache Results                      │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  Output: Query Results + Execution Metadata              │
└──────────────────────────────────────────────────────────┘
```

### Integration with UI

**Option A: Unified Query Interface** (`/query`) ✅ **RECOMMENDED**
```
/query
├── Sidebar: Data Source Selector
├── Main: SQL Editor (Monaco)
├── Tabs:
│   ├── Query Results
│   ├── Visualization (auto-chart)
│   ├── Query History
│   └── Saved Queries
└── Actions:
    ├── Execute
    ├── Save to Dashboard
    └── Share/Export
```

**Option B: Dashboard Studio Integration** (`/dash-studio`)
```
/dash-studio
├── Widget Library (drag-drop)
├── For each chart widget:
│   ├── Data Source Picker
│   ├── Query Builder (visual + SQL)
│   └── Chart Config
└── Full dashboard saved as JSON
```

**Recommendation**: **Implement BOTH**
- `/query` for ad-hoc analysis & data exploration
- `/dash-studio` for building production dashboards
- Share underlying query engine & data connectivity

---

## 3. AI Orchestration Architecture

### Current Status

You have multiple AI services that need consolidation:

```
Current (Redundant):
├── UnifiedAIAnalyticsService
├── AgenticAnalysisEngine
├── LiteLLMService
├── Various chat endpoints
└── Multiple orchestrators
```

### Recommended Architecture

**Single, Robust AI Orchestrator**:

```
┌───────────────────────────────────────────────────────────────┐
│              Aiser AI Orchestrator (Core)                      │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │         1. Intent Understanding                       │    │
│  │         ┌──────────────────────────────┐             │    │
│  │         │  LLM Router (GPT-4/GPT-5)    │             │    │
│  │         └──────────────────────────────┘             │    │
│  │         Classifies: Query, Chart, Dashboard,         │    │
│  │                    Analysis, Insight                 │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │         2. Specialized Agents (LangChain)            │    │
│  │                                                       │    │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐│    │
│  │  │ SQL Agent   │  │ Chart Agent  │  │ Insight Agent││    │
│  │  ├─────────────┤  ├──────────────┤  ├─────────────┤│    │
│  │  │ Schema      │  │ ECharts Gen  │  │ Narration   ││    │
│  │  │ SQL Gen     │  │ Type Select  │  │ Recommend   ││    │
│  │  │ Validation  │  │ Config       │  │ Explain     ││    │
│  │  └─────────────┘  └──────────────┘  └─────────────┘│    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │         3. Execution Pipeline                         │    │
│  │                                                       │    │
│  │    NL Input                                           │    │
│  │       ↓                                              │    │
│  │    Intent Classification                              │    │
│  │       ↓                                              │    │
│  │    Agent Selection                                    │    │
│  │       ↓                                              │    │
│  │    Context Building (schema, history, user prefs)    │    │
│  │       ↓                                              │    │
│  │    Agent Execution (with retry & fallback)           │    │
│  │       ↓                                              │    │
│  │    Result Validation                                  │    │
│  │       ↓                                              │    │
│  │    Response Formatting                                │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │         4. State Management                           │    │
│  │                                                       │    │
│  │  - Conversation context (last 5-10 messages)         │    │
│  │  - User preferences & feedback                        │    │
│  │  - Generated artifacts (SQL, charts, insights)        │    │
│  │  - Confidence scores & uncertainty handling           │    │
│  └──────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
```

### End-to-End Flow

```
User: "Show me sales trend for last 3 months by region"
   ↓
[1. Intent Understanding]
   → Type: Chart + Query
   → Visualization: Line/Bar chart
   → Timeframe: Last 3 months
   → Dimension: Region
   ↓
[2. SQL Agent]
   → Fetch schema for sales table
   → Generate SQL:
      SELECT region, DATE_TRUNC('month', date) as month, SUM(amount)
      FROM sales
      WHERE date >= NOW() - INTERVAL '3 months'
      GROUP BY region, month
      ORDER BY month, region
   → Validate syntax
   ↓
[3. Query Execution]
   → Route to multi-engine (DIRECT_SQL for DB)
   → Execute with timeout & error handling
   → Return data + metadata
   ↓
[4. Chart Agent]
   → Analyze data structure
   → Select chart type: Line chart (time series)
   → Generate ECharts config:
      {
        xAxis: { type: 'time', data: [months] },
        yAxis: { type: 'value' },
        series: [
          { name: 'North', type: 'line', data: [...] },
          { name: 'South', type: 'line', data: [...] }
        ]
      }
   ↓
[5. Insight Agent]
   → Analyze trends
   → Generate narration:
      "Sales have increased by 23% overall in the last 3 months.
       The North region shows the strongest growth (+35%), while
       South region growth has plateaued at 8%.
       
       Recommendation: Investigate factors driving North region
       success and apply to other regions."
   ↓
[6. Response Assembly]
   → Return:
      {
        "sql": "SELECT ...",
        "data": [...],
        "chart": { echarts config },
        "insights": "Sales have increased...",
        "recommendations": ["Investigate North region success"],
        "confidence": 0.92
      }
```

### Implementation Recommendations

**Phase 1** (Week 1-2): **Core AI Orchestrator**
1. Create single `AIOrchestrationService` class
2. Integrate LiteLLM for multi-model support
3. Implement intent classification
4. Add conversation state management

**Phase 2** (Week 3-4): **LangChain Agents**
1. SQL Agent with schema awareness
2. Chart Agent with ECharts generation
3. Insight Agent with narration
4. Agent coordination & error handling

**Phase 3** (Month 2): **Advanced Features**
1. Multi-turn conversations
2. Clarification questions
3. Confidence scoring
4. Feedback loop & learning

---

## 4. Query Interface Architecture

### Recommendation: Dual-Path Approach

#### Path 1: `/query` - Data Explorer ✅ **PRIMARY INTERFACE**

**Purpose**: Ad-hoc data exploration, analysis, testing

**Features**:
```
┌────────────────────────────────────────────────────────────┐
│  /query - Universal Data Query Interface                   │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌──────────────────────────────────┐   │
│  │  Sidebar    │  │        Main Canvas                │   │
│  ├─────────────┤  ├──────────────────────────────────┤   │
│  │             │  │                                   │   │
│  │ Data Sources│  │  ┌──────────────────────────┐    │   │
│  │  • PostgreSQL│  │  │  SQL Editor (Monaco)     │    │   │
│  │  • ClickHouse│  │  │  WITH AI ASSIST          │    │   │
│  │  • Files    │  │  └──────────────────────────┘    │   │
│  │  • APIs     │  │                                   │   │
│  │             │  │  ┌──────────────────────────┐    │   │
│  │ Query History│  │  │  Results Table           │    │   │
│  │  • Recent   │  │  │  Sortable, Filterable    │    │   │
│  │  • Saved    │  │  └──────────────────────────┘    │   │
│  │  • Shared   │  │                                   │   │
│  │             │  │  ┌──────────────────────────┐    │   │
│  │ Collections │  │  │  Auto-Visualization      │    │   │
│  │  • My Queries│  │  │  (Chart suggestions)     │    │   │
│  │  • Team     │  │  └──────────────────────────┘    │   │
│  └─────────────┘  └──────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Action Bar                                           │ │
│  │  [Execute] [Save] [Share] [Export CSV/Excel/JSON]   │ │
│  │  [Add to Dashboard] [Schedule] [API Endpoint]        │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

**Key Features**:
- **AI-Powered SQL**: "Show me..." → Auto-generate SQL
- **Schema Explorer**: Auto-complete, column suggestions
- **Query Optimization**: Real-time performance hints
- **Result Visualization**: Auto-suggest chart types
- **One-Click Export**: To dashboard, CSV, API
- **Collaboration**: Share queries, comments, versions

#### Path 2: `/dash-studio` - Dashboard Builder

**Purpose**: Creating production dashboards with multiple widgets

**Features**:
```
┌────────────────────────────────────────────────────────────┐
│  /dash-studio - Dashboard Design Studio                    │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌────────────────────────────────────────┐ │
│  │ Widgets  │  │      Canvas (drag-drop grid)          │ │
│  ├──────────┤  ├────────────────────────────────────────┤ │
│  │ • Chart  │  │  ┌──────┐  ┌───────────┐  ┌────────┐ │ │
│  │ • Table  │  │  │ KPI  │  │ Line Chart│  │ Table  │ │ │
│  │ • KPI    │  │  └──────┘  └───────────┘  └────────┘ │ │
│  │ • Filter │  │                                        │ │
│  │ • Text   │  │  ┌─────────────────┐  ┌─────────────┐│ │
│  │          │  │  │   Bar Chart     │  │  Pie Chart  ││ │
│  │ Data     │  │  └─────────────────┘  └─────────────┘│ │
│  │ • Sources│  │                                        │ │
│  │ • Queries│  │  [Widget Properties Panel →]          │ │
│  └──────────┘  └────────────────────────────────────────┘ │
│                                                             │
│  For each widget: Query Builder + Chart Config             │
└────────────────────────────────────────────────────────────┘
```

**Integration**:
- Each widget uses same query engine as `/query`
- Can import saved queries from `/query`
- Shared data source connections
- Real-time data refresh

---

## 5. Implementation Roadmap

### Week 1: Foundation Fixes ✅ **IN PROGRESS**
- [x] Fix authentication
- [x] Fix data connections (PostgreSQL)
- [x] Fix frontend login
- [ ] Fix ClickHouse connectivity
- [ ] Test file upload & query
- [ ] Verify end-to-end query flow

### Week 2-3: Core AI Integration
- [ ] Consolidate AI services → Single orchestrator
- [ ] Implement LangChain SQL agent
- [ ] Implement chart generation agent
- [ ] Test NL → SQL → Chart flow
- [ ] Add confidence scoring

### Week 4-5: Query Interface
- [ ] Build `/query` interface (Monaco editor)
- [ ] Add AI assist to SQL editor
- [ ] Implement auto-visualization
- [ ] Add query history & collections
- [ ] One-click "Add to Dashboard"

### Week 6-8: Dashboard Studio
- [ ] Enhance `/dash-studio` with drag-drop
- [ ] Widget library (chart types)
- [ ] Query builder per widget
- [ ] Dashboard templates
- [ ] Sharing & permissions

### Month 3: Production Features
- [ ] Scheduled queries & alerts
- [ ] API endpoint generation
- [ ] Advanced security (RBAC)
- [ ] Performance optimization
- [ ] Multi-tenant isolation

---

## 6. Critical Architecture Decisions

### Decision 1: Query Interface Location

**Option A**: `/query` as standalone ✅ **RECOMMENDED**
- **Pros**: Clean separation, focused UX, easier to maintain
- **Cons**: Need to integrate with dashboard later
- **Use Case**: Data analysts, ad-hoc exploration

**Option B**: Inside `/dash-studio` as tab
- **Pros**: Everything in one place
- **Cons**: Cluttered UI, confusing navigation
- **Use Case**: Dashboard builders only

**Recommendation**: **Implement both**
- `/query` for exploration & testing
- `/dash-studio` for production dashboards
- **Shared backend**: Same query engine, data sources, auth

### Decision 2: AI Orchestration

**Keep multi-engine query optimizer** ✅ Already excellent
**Add unified AI orchestrator** ✅ Single entry point for all AI
**Use LangChain for agents** ✅ Industry standard, maintainable
**Implement state management** ✅ Conversation context

### Decision 3: Data Source Priority

**Immediate**:
1. ClickHouse (warehouse analytics)
2. File upload (CSV/Excel)
3. PostgreSQL (already working)

**Short-term** (next 2-3 weeks):
1. Snowflake
2. BigQuery
3. Redshift

**Medium-term** (month 2-3):
1. APIs/REST endpoints
2. MongoDB
3. S3/cloud storage

---

## 7. Testing Strategy

### Unit Tests
- Each AI agent independently
- Query engine selection logic
- Data source connectors
- Authentication flows

### Integration Tests
- End-to-end: Login → Connect → Query → Chart
- AI orchestration: NL → SQL → Execute → Visualize
- Multi-engine routing
- Error handling & retry logic

### Performance Tests
- Query execution (<500ms for simple queries)
- AI response time (<3s for NL → SQL)
- Dashboard load (<2s for 10 widgets)
- Concurrent users (100+)

---

## 8. Success Metrics

### Technical KPIs
- **Query Success Rate**: >95%
- **AI SQL Accuracy**: >90%
- **P95 Response Time**: <500ms
- **Uptime**: 99.9%

### User Experience KPIs
- **Time to First Query**: <2 minutes
- **Dashboard Creation Time**: <10 minutes
- **AI Assistance Usage**: >60% of queries
- **User Satisfaction**: >4.5/5

---

## Conclusion

Your platform has a **solid foundation** with:
- ✅ Multi-engine query system (excellent design!)
- ✅ Data connectivity framework
- ✅ AI services (need consolidation)

**Critical next steps**:
1. **Fix ClickHouse** (immediate)
2. **Consolidate AI services** → Single orchestrator (week 2-3)
3. **Build `/query` interface** (week 4-5)
4. **Enhance `/dash-studio`** (week 6-8)

**Architecture decision**: **Implement BOTH**
- `/query` for ad-hoc exploration ← **Start here**
- `/dash-studio` for production dashboards ← **Enhance existing**
- Shared backend (query engine, AI, data sources)

This gives you:
- **Flexibility**: Users choose their workflow
- **Scalability**: Independent optimization
- **Maintainability**: Clear separation of concerns
- **Power**: Full enterprise data platform

**Status**: Ready to build! 🚀

---

**Next Action**: Should I:
1. Fix ClickHouse connectivity immediately?
2. Start building the unified AI orchestrator?
3. Create the `/query` interface MVP?

