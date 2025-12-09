# AI Agent Data Source Support - Complete Implementation

## 🎯 Overview

This document details comprehensive data source support for AI agents, ensuring all source types work correctly for intelligent analysis, querying, and visualization generation.

## 📊 Supported Data Source Types

### 1. File Sources ✅
**Formats**: CSV, Excel (XLS/XLSX), JSON, TSV, Parquet

**Features for AI Agents**:
- ✅ Automatic schema detection
- ✅ Column type inference
- ✅ Sample data loading for analysis
- ✅ DuckDB query engine for fast analytics
- ✅ Pandas integration for transformations

**Endpoints**:
```
GET  /data/sources/{id}/data    - Get file data
GET  /data/sources/{id}/schema  - Get detected schema
POST /data/sources/{id}/query   - Query with SQL via DuckDB
POST /data/upload               - Upload new file
```

**AI Agent Integration**:
```python
# AI can analyze file structure
schema = await get_data_source_schema(file_id)
# columns, data_types, row_count automatically available

# AI can query files with SQL
result = await execute_query(file_id, "SELECT * FROM data WHERE value > 100")
# DuckDB handles CSV/Parquet efficiently
```

---

### 2. Database Sources ✅
**Supported**: PostgreSQL, MySQL, SQLite, SQL Server

**Features for AI Agents**:
- ✅ Direct SQL execution
- ✅ Schema introspection (tables, columns, relationships)
- ✅ Connection pooling
- ✅ Query optimization hints
- ✅ Transaction support

**Endpoints**:
```
POST /data/database/test       - Test connection
POST /data/database/connect    - Save connection
GET  /data/sources/{id}/schema - Get database schema
POST /data/sources/{id}/query  - Execute SQL query
GET  /data/sources/{id}/views  - List database views
```

**AI Agent Integration**:
```python
# AI can explore database structure
schema = await get_database_schema(db_id)
# {tables: [{name, columns: [{name, type, nullable}], row_count}]}

# AI can generate and execute SQL
sql = ai_generate_sql(user_query, schema)
result = await execute_direct_sql(db_id, sql)
```

---

### 3. Data Warehouses ✅
**Supported**: ClickHouse, Snowflake, BigQuery, Redshift

**Features for AI Agents**:
- ✅ High-performance analytical queries
- ✅ Columnar storage optimization
- ✅ Distributed query execution
- ✅ Large dataset handling
- ✅ Complex aggregations

**Endpoints**:
```
POST /data/warehouses/connect  - Connect warehouse
GET  /data/sources/{id}/schema - Get warehouse schema
POST /data/sources/{id}/query  - Execute analytical query
```

**AI Agent Integration**:
```python
# AI can leverage warehouse capabilities
query = ai_generate_warehouse_query(user_question, schema)
# Optimized for: GROUP BY, window functions, CTEs
result = await execute_warehouse_query(warehouse_id, query)
# Returns: aggregated results, execution time, row_count
```

**ClickHouse Specific**:
```json
{
  "type": "clickhouse",
  "host": "clickhouse",
  "port": 8123,
  "database": "aiser_warehouse",
  "query_format": "JSONEachRow",
  "async_execution": true
}
```

---

### 4. API Sources ✅
**Supported**: REST APIs, GraphQL endpoints

**Features for AI Agents**:
- ✅ HTTP method support (GET, POST, PUT, DELETE)
- ✅ Authentication (Bearer, API Key, OAuth)
- ✅ Request/response transformation
- ✅ Pagination handling
- ✅ Rate limiting

**Endpoints**:
```
POST /data/api/test            - Test API endpoint
POST /data/api/connect         - Save API configuration
POST /data/sources/{id}/query  - Execute API request
```

**AI Agent Integration**:
```python
# AI can call external APIs for enrichment
api_result = await call_api_source(api_id, {
    "endpoint": "/weather/forecast",
    "method": "GET",
    "params": {"city": "San Francisco"}
})
# AI merges external data with internal data
```

---

### 5. Cube.js Semantic Layer ✅
**Supported**: Pre-defined data models with metrics and dimensions

**Features for AI Agents**:
- ✅ Business logic abstraction
- ✅ Metric definitions (formulas, aggregations)
- ✅ Dimension hierarchies
- ✅ Pre-aggregation support
- ✅ Access control

**Endpoints**:
```
POST /cube/query               - Query semantic layer
GET  /cube/metadata            - Get available cubes
GET  /cube/{name}/preview      - Preview cube data
```

**AI Agent Integration**:
```python
# AI uses business-friendly metrics
result = await query_cube({
    "measures": ["Orders.totalRevenue", "Orders.count"],
    "dimensions": ["Orders.status", "Users.city"],
    "timeDimensions": [{
        "dimension": "Orders.createdAt",
        "granularity": "month"
    }]
})
# No SQL needed - semantic layer handles it
```

---

## 🤖 AI Agent Query Routing

### Multi-Engine Query Service

The platform automatically routes queries to the optimal engine:

```python
class QueryRouter:
    """Routes queries to optimal engine based on data source type and query complexity"""
    
    def route_query(self, query: str, data_source: Dict, analysis: Dict) -> str:
        """
        Returns: 'duckdb' | 'direct_sql' | 'cube' | 'pandas'
        
        Decision tree:
        - File sources → DuckDB (fast analytics)
        - Database simple queries → Direct SQL
        - Database complex analytics → DuckDB (better for aggregations)
        - Cube sources → Cube.js (semantic layer)
        - Transformations needed → Pandas
        """
        if data_source['type'] == 'file':
            return 'duckdb'
        elif data_source['type'] == 'database':
            if is_complex_analytics(query):
                return 'duckdb'  # Better for OLAP
            return 'direct_sql'  # Better for OLTP
        elif data_source['type'] == 'cube':
            return 'cube'
        elif requires_transformation(query):
            return 'pandas'
        return 'direct_sql'
```

---

## 📈 AI Agent Analysis Capabilities

### 1. Schema-Aware Analysis

AI agents automatically understand data structure:

```typescript
interface DataSourceContext {
  id: string;
  type: 'file' | 'database' | 'warehouse' | 'api' | 'cube';
  schema: {
    tables: Array<{
      name: string;
      columns: Array<{
        name: string;
        type: string;  // int, varchar, timestamp, etc.
        nullable: boolean;
        statistics?: {
          min?: number;
          max?: number;
          distinct_count?: number;
        };
      }>;
      row_count: number;
      description?: string;
    }>;
  };
  sample_data?: any[];  // First 100 rows for context
}
```

### 2. Natural Language to SQL

AI generates optimal SQL based on source type:

```python
# File source (DuckDB syntax)
"SELECT * FROM data WHERE timestamp > '2024-01-01'"

# PostgreSQL (standard SQL)
"SELECT * FROM users WHERE created_at > '2024-01-01'::timestamp"

# ClickHouse (specialized syntax)
"SELECT * FROM events WHERE timestamp > toDateTime('2024-01-01') FORMAT JSONEachRow"

# Cube.js (JSON query)
{
  "measures": ["Users.count"],
  "timeDimensions": [{"dimension": "Users.createdAt", "dateRange": "2024"}]
}
```

### 3. Intelligent Visualization Selection

AI chooses optimal chart types based on:
- Data types (categorical, numerical, temporal)
- Cardinality (number of unique values)
- Query result structure (time series, comparisons, distributions)

```python
def select_chart_type(data: DataFrame, query_intent: str) -> str:
    if has_time_dimension(data):
        return 'line'  # Time series
    elif has_single_measure_multiple_dimensions(data):
        return 'bar'  # Comparisons
    elif has_two_measures(data):
        return 'scatter'  # Correlation
    elif has_hierarchical_data(data):
        return 'treemap'  # Hierarchy
    # ... more logic
```

---

## 🔧 Configuration for AI Agents

### Environment Setup

```bash
# AI Model Configuration
AI_MODEL=gpt-4o-mini
AI_TEMPERATURE=0.3  # Lower for SQL generation
AI_MAX_TOKENS=2000

# Query Engine Configuration
ENABLE_DUCKDB=true
ENABLE_CUBE=true
MAX_QUERY_TIME=30s
QUERY_CACHE_TTL=300s

# Data Source Limits
MAX_FILE_SIZE=50MB
MAX_QUERY_ROWS=10000
SAMPLE_DATA_ROWS=100
```

### AI Agent Context

When AI analyzes user requests, it receives:

```json
{
  "user_query": "Show me top customers by revenue",
  "selected_data_sources": [
    {
      "id": "db_postgres_123",
      "type": "database",
      "schema": {...},
      "capabilities": ["sql", "joins", "aggregations"]
    }
  ],
  "conversation_history": [...],
  "business_context": {
    "industry": "e-commerce",
    "common_metrics": ["revenue", "orders", "customers"],
    "fiscal_year_start": "2024-01-01"
  }
}
```

---

## ✅ Testing AI Agent Integration

### Test All Data Source Types

```bash
# 1. File Source
curl -X POST /data/upload -F "file=@customers.csv"
# AI can: analyze schema, query data, generate charts

# 2. Database Source
curl -X POST /data/database/connect -d '{
  "type": "postgresql",
  "host": "postgres",
  "database": "aiser_world"
}'
# AI can: explore tables, generate SQL, optimize queries

# 3. Warehouse Source
curl -X POST /data/warehouses/connect -d '{
  "type": "clickhouse",
  "host": "clickhouse",
  "database": "aiser_warehouse"
}'
# AI can: handle large datasets, complex aggregations

# 4. API Source
curl -X POST /data/api/connect -d '{
  "type": "rest_api",
  "base_url": "https://api.example.com",
  "auth_type": "bearer"
}'
# AI can: call external APIs, enrich data

# 5. Cube Source
# AI can: use business metrics, semantic queries
```

---

## 🎯 Next Steps

### Enhancements for AI Agents

1. **Query Optimization**
   - AI learns from query execution times
   - Suggests indexes for slow queries
   - Rewrites queries for better performance

2. **Data Quality Checks**
   - AI detects missing data
   - Identifies outliers
   - Suggests data cleaning

3. **Automated Insights**
   - AI proactively finds trends
   - Generates periodic reports
   - Alerts on anomalies

4. **Multi-Source Joins**
   - AI joins data from different sources
   - Handles schema mismatches
   - Optimizes federation queries

---

## 📊 Summary

| Data Source | Schema Detection | Query Support | AI Integration | Status |
|-------------|-----------------|---------------|----------------|---------|
| Files       | ✅ Auto         | ✅ DuckDB SQL | ✅ Full        | ✅ Ready |
| Databases   | ✅ Introspect   | ✅ Direct SQL | ✅ Full        | ✅ Ready |
| Warehouses  | ✅ Introspect   | ✅ Native SQL | ✅ Full        | ✅ Ready |
| APIs        | ⚠️ Manual       | ✅ HTTP       | ✅ Full        | ✅ Ready |
| Cube.js     | ✅ Auto         | ✅ JSON       | ✅ Full        | ✅ Ready |

**All data source types are now fully supported for AI agent analysis!** 🚀
