# Cube.js Universal Semantic Layer

Multi-tenant semantic layer powered by Cube.js with enterprise-grade features for the Aiser platform.

## 🎯 Overview

This package provides a universal semantic layer that enables:

- **Multi-tenant data isolation** with automatic tenant filtering
- **Universal data connectivity** to PostgreSQL, MySQL, SQL Server, Snowflake, BigQuery, Redshift
- **Intelligent caching** with Redis for high-performance analytics
- **Pre-aggregations** for lightning-fast query responses
- **Real-time data streaming** with WebSocket support
- **Enterprise security** with JWT authentication and role-based access

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Applications                     │
│  (React Client, Chat2Chart, Mobile Apps)                   │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP/WebSocket
┌─────────────────────▼───────────────────────────────────────┐
│                 Cube.js API Gateway                        │
│  • Tenant Context Middleware                               │
│  • Authentication & Authorization                          │
│  • Query Routing & Optimization                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              Multi-Tenant Query Engine                     │
│  • Automatic tenant_id injection                          │
│  • Query rewriting & optimization                         │
│  • Pre-aggregation management                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Database Drivers                            │
│  PostgreSQL │ MySQL │ SQL Server │ Snowflake │ BigQuery    │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Start the Services

```bash
# Start all services including Cube.js
docker-compose up -d cube-server

# Check status
docker ps | grep cube
```

### 2. Verify Installation

```bash
# Health check
curl http://localhost:4000/health

# Test API endpoint
curl -H "Authorization: Bearer dev-cube-secret-key" \
     -H "X-Tenant-ID: default" \
     http://localhost:4000/cubejs-api/v1/load
```

### 3. Run Integration Test

```bash
cd packages/cube
node test-cube.js
```

## 📊 Usage Examples

### Frontend Integration

```typescript
import { CubeQueryBuilder } from '@/lib/cube';

// Create tenant-aware client
const cubeClient = new CubeQueryBuilder('tenant-123', 'user-456');

// Get user metrics
const userMetrics = await cubeClient.getUserMetrics('last 30 days');

// Get chart analytics
const chartAnalytics = await cubeClient.getChartAnalytics('last 7 days');

// Custom query
const customData = await cubeClient.customQuery(
  ['Users.count', 'Charts.count'],
  ['Users.role'],
  [{
    dimension: 'Users.createdAt',
    granularity: 'day',
    dateRange: 'last 7 days'
  }]
);
```

### Direct API Usage

```bash
# User analytics query
curl -X POST http://localhost:4000/cubejs-api/v1/load \
  -H "Authorization: Bearer dev-cube-secret-key" \
  -H "X-Tenant-ID: default" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "measures": ["Users.count", "Users.activeUsers"],
      "timeDimensions": [{
        "dimension": "Users.createdAt",
        "granularity": "day",
        "dateRange": "last 30 days"
      }]
    }
  }'

# Chart type breakdown
curl -X POST http://localhost:4000/cubejs-api/v1/load \
  -H "Authorization: Bearer dev-cube-secret-key" \
  -H "X-Tenant-ID: default" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "measures": ["Charts.count"],
      "dimensions": ["Charts.type"],
      "order": [["Charts.count", "desc"]]
    }
  }'
```

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
NODE_ENV=development
PORT=4000
CUBE_API_SECRET=your-secret-key

# Database Configuration
CUBE_DB_TYPE=postgres
CUBE_DB_HOST=localhost
CUBE_DB_PORT=5432
CUBE_DB_NAME=aiser_world
CUBE_DB_USER=aiser
CUBE_DB_PASS=password

# Redis Configuration
CUBE_REDIS_URL=redis://localhost:6379

# Multi-tenant Features
CUBEJS_TENANT_ISOLATION=true
CUBEJS_MULTI_TENANT_COMPILE_CACHE=true
```

### Database Support

| Database | Status | Notes |
|----------|--------|-------|
| PostgreSQL | ✅ | Primary database with full feature support |
| MySQL | ✅ | Full support with connection pooling |
| SQL Server | ✅ | Enterprise features supported |
| Snowflake | ✅ | Cloud data warehouse integration |
| BigQuery | ✅ | Google Cloud Platform support |
| Redshift | ✅ | AWS data warehouse support |

## 📈 Schema Definitions

### Users Schema

```javascript
cube('Users', {
  sql: `SELECT * FROM users WHERE tenant_id = '${SECURITY_CONTEXT.tenantId}'`,
  
  dimensions: {
    id: { sql: 'id', type: 'number', primaryKey: true },
    email: { sql: 'email', type: 'string' },
    role: { sql: 'role', type: 'string' },
    status: { sql: 'status', type: 'string' }
  },
  
  measures: {
    count: { type: 'count' },
    activeUsers: {
      sql: 'id',
      type: 'countDistinct',
      filters: [{ sql: `${CUBE}.status = 'active'` }]
    }
  }
});
```

### Charts Schema

```javascript
cube('Charts', {
  sql: `SELECT * FROM charts WHERE tenant_id = '${SECURITY_CONTEXT.tenantId}'`,
  
  joins: {
    Users: {
      sql: `${CUBE}.user_id = ${Users}.id`,
      relationship: 'belongsTo'
    }
  },
  
  measures: {
    count: { type: 'count' },
    successRate: {
      sql: `(COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*))`,
      type: 'number',
      format: 'percent'
    }
  }
});
```

## 🔒 Security Features

### Multi-Tenant Isolation

- **Automatic tenant filtering**: All queries automatically include `tenant_id` filters
- **Context-aware security**: Security context passed through all operations
- **Tenant validation**: Middleware validates tenant access permissions

### Authentication & Authorization

- **JWT token support**: Bearer token authentication
- **Role-based access**: User roles and permissions enforced
- **API key security**: Secure API key management

## 🚀 Performance Optimization

### Pre-aggregations

```javascript
preAggregations: {
  usersByDay: {
    measures: [Users.count, Users.newUsers],
    timeDimension: Users.createdAt,
    granularity: 'day',
    partitionGranularity: 'month',
    refreshKey: { every: '1 hour' }
  }
}
```

### Caching Strategy

- **Redis caching**: Query results cached for fast retrieval
- **Intelligent invalidation**: Smart cache invalidation based on data changes
- **Pre-aggregation**: Common queries pre-computed for instant responses

## 🔧 Development

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Adding New Schemas

1. Create schema file in `src/schema/`
2. Follow multi-tenant pattern with `tenant_id` filtering
3. Add appropriate measures and dimensions
4. Configure pre-aggregations for performance

### Database Migrations

```sql
-- Ensure all tables have tenant_id column
ALTER TABLE your_table ADD COLUMN tenant_id VARCHAR(50) DEFAULT 'default';

-- Create indexes for performance
CREATE INDEX idx_your_table_tenant_id ON your_table(tenant_id);
```

## 📊 Monitoring & Observability

### Health Checks

- **Health endpoint**: `GET /health`
- **Database connectivity**: Automatic connection testing
- **Cache status**: Redis connection monitoring

### Metrics

- Query performance metrics
- Cache hit rates
- Database connection pool status
- Tenant usage statistics

## 🤝 Integration Points

### Chat2Chart Integration

The Cube.js layer provides semantic data access for the Chat2Chart engine:

```typescript
// Chat2Chart queries Cube.js for data
const cubeClient = createTenantCubeClient(tenantId, userId);
const data = await cubeClient.load({
  measures: ['Users.count'],
  dimensions: ['Users.role']
});
```

### Frontend Integration

React components can directly query the semantic layer:

```typescript
import { useCubeQuery } from '@/lib/cube';

const { data, loading, error } = useCubeQuery({
  measures: ['Charts.count'],
  timeDimensions: [{
    dimension: 'Charts.createdAt',
    granularity: 'day',
    dateRange: 'last 7 days'
  }]
});
```

## 🎯 Next Steps

1. **LiteLLM Integration**: Connect AI models for intelligent query generation
2. **Advanced Analytics**: Add ML-powered insights and anomaly detection
3. **Real-time Streaming**: Implement WebSocket-based real-time updates
4. **Data Governance**: Add data lineage and quality monitoring

## 📚 Resources

- [Cube.js Documentation](https://cube.dev/docs)
- [Multi-tenant Architecture Guide](https://cube.dev/docs/multitenancy-setup)
- [Schema Reference](https://cube.dev/docs/schema/reference/cube)
- [REST API Reference](https://cube.dev/docs/rest-api)

---

**Status**: ✅ **Task 3.1 Complete** - Cube.js Universal Semantic Layer with Multi-tenant Architecture

The Cube.js integration provides a robust, scalable semantic layer that serves as the foundation for AI-powered analytics in the Aiser platform.