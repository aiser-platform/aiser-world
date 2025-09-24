/**
 * Cube.js Universal Semantic Layer Server
 * ONLY handles semantic layer functionality - multi-tenant data access
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'development' 
    ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8000']
    : (process.env.ALLOWED_ORIGINS || '').split(','),
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Extract tenant ID from request
function extractTenantId(req) {
  if (req.headers && req.headers['x-tenant-id']) {
    return req.headers['x-tenant-id'];
  }
  
  if (req.query && req.query.tenantId) {
    return req.query.tenantId;
  }
  
  // Check subdomain
  const host = req.headers.host;
  if (host && host.includes('.')) {
    const subdomain = host.split('.')[0];
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      return subdomain;
    }
  }
  
  return 'default';
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'cube-server',
    version: '1.0.0'
  });
});

// Tenant context middleware
app.use('/cubejs-api', (req, res, next) => {
  const tenantId = extractTenantId(req);
  
  // Add security context to request
  req.securityContext = {
    tenantId: tenantId || 'default',
    userId: req.headers['x-user-id'],
    roles: ['user'],
    permissions: ['read:own'],
    isAuthenticated: true
  };

  console.log(`✅ Request context created for tenant: ${req.securityContext.tenantId}`);
  next();
});

// Database connection helper
async function queryDatabase(tenantId, query) {
  // For now, return mock data but with proper structure
  // This will be replaced with real database queries later
  console.log(`🔍 Database query for tenant ${tenantId}:`, query);
  
  // Simulate different data based on tenant
  const mockData = {
    'default': [
      { 'Users.count': '25', 'Users.createdAt.day': '2024-01-01T00:00:00.000' },
      { 'Users.count': '30', 'Users.createdAt.day': '2024-01-02T00:00:00.000' },
      { 'Users.count': '28', 'Users.createdAt.day': '2024-01-03T00:00:00.000' }
    ],
    'tenant1': [
      { 'Users.count': '15', 'Users.createdAt.day': '2024-01-01T00:00:00.000' },
      { 'Users.count': '18', 'Users.createdAt.day': '2024-01-02T00:00:00.000' }
    ]
  };
  
  return mockData[tenantId] || mockData['default'];
}

// Cube.js API endpoints with real multi-tenant logic
app.get('/cubejs-api/v1/load', (req, res) => {
  const tenantId = req.securityContext?.tenantId || 'default';
  
  res.json({
    data: [],
    query: req.query,
    annotation: {
      measures: {},
      dimensions: {},
      segments: {},
      timeDimensions: {}
    }
  });
});

app.post('/cubejs-api/v1/load', async (req, res) => {
  const tenantId = req.securityContext?.tenantId || 'default';
  const query = req.body.query;
  
  console.log(`📊 Query received for tenant: ${tenantId}`);
  console.log(`🔍 Query:`, JSON.stringify(query, null, 2));
  
  try {
    // Apply tenant isolation to query
    const isolatedQuery = applyTenantIsolation(query, tenantId);
    
    // Execute query (mock for now)
    const data = await queryDatabase(tenantId, isolatedQuery);
    
    res.json({
      data: data,
      query: isolatedQuery,
      annotation: {
        measures: {
          'Users.count': {
            title: 'Users Count',
            shortTitle: 'Count',
            type: 'number'
          },
          'Charts.count': {
            title: 'Charts Count',
            shortTitle: 'Charts',
            type: 'number'
          }
        },
        dimensions: {
          'Users.email': {
            title: 'User Email',
            type: 'string'
          },
          'Charts.type': {
            title: 'Chart Type',
            type: 'string'
          }
        },
        segments: {},
        timeDimensions: {
          'Users.createdAt': {
            title: 'Users Created At',
            shortTitle: 'Created At',
            type: 'time'
          },
          'Charts.createdAt': {
            title: 'Charts Created At',
            shortTitle: 'Created At',
            type: 'time'
          }
        }
      }
    });
  } catch (error) {
    console.error('❌ Query execution error:', error);
    res.status(500).json({
      error: 'Query execution failed',
      message: error.message
    });
  }
});

app.get('/cubejs-api/v1/meta', (req, res) => {
  const tenantId = req.securityContext?.tenantId || 'default';
  console.log(`📋 Meta request for tenant: ${tenantId}`);
  
  res.json({
    cubes: [
      {
        name: 'Users',
        title: 'Users',
        measures: [
          {
            name: 'Users.count',
            title: 'Users Count',
            shortTitle: 'Count',
            type: 'number'
          },
          {
            name: 'Users.activeUsers',
            title: 'Active Users',
            shortTitle: 'Active',
            type: 'number'
          }
        ],
        dimensions: [
          {
            name: 'Users.id',
            title: 'Users ID',
            type: 'number'
          },
          {
            name: 'Users.email',
            title: 'Email',
            type: 'string'
          },
          {
            name: 'Users.role',
            title: 'Role',
            type: 'string'
          }
        ],
        segments: [
          {
            name: 'Users.activeUsers',
            title: 'Active Users'
          }
        ]
      },
      {
        name: 'Charts',
        title: 'Charts',
        measures: [
          {
            name: 'Charts.count',
            title: 'Charts Count',
            shortTitle: 'Count',
            type: 'number'
          },
          {
            name: 'Charts.successRate',
            title: 'Success Rate',
            shortTitle: 'Success %',
            type: 'number'
          }
        ],
        dimensions: [
          {
            name: 'Charts.id',
            title: 'Chart ID',
            type: 'string'
          },
          {
            name: 'Charts.type',
            title: 'Chart Type',
            type: 'string'
          },
          {
            name: 'Charts.status',
            title: 'Status',
            type: 'string'
          }
        ],
        segments: []
      },
      {
        name: 'Conversations',
        title: 'Conversations',
        measures: [
          {
            name: 'Conversations.count',
            title: 'Conversations Count',
            shortTitle: 'Count',
            type: 'number'
          }
        ],
        dimensions: [
          {
            name: 'Conversations.id',
            title: 'Conversation ID',
            type: 'string'
          },
          {
            name: 'Conversations.status',
            title: 'Status',
            type: 'string'
          }
        ],
        segments: []
      }
    ]
  });
});

// Apply tenant isolation to queries
function applyTenantIsolation(query, tenantId) {
  if (tenantId === 'default') {
    return query;
  }
  
  // Add tenant filter to query
  const isolatedQuery = { ...query };
  isolatedQuery.filters = isolatedQuery.filters || [];
  
  // Check if tenant filter already exists
  const hasTenantFilter = isolatedQuery.filters.some(filter => 
    filter.member && filter.member.includes('tenant_id')
  );
  
  if (!hasTenantFilter) {
    isolatedQuery.filters.push({
      member: 'tenant_id',
      operator: 'equals',
      values: [tenantId]
    });
    
    console.log(`🔒 Added tenant isolation filter: ${tenantId}`);
  }
  
  return isolatedQuery;
}

// Start server
const port = parseInt(process.env.PORT || '4000');

app.listen(port, () => {
  console.log('🎯 Starting Cube.js Universal Semantic Layer...');
  console.log('🌐 Multi-tenant architecture enabled');
  console.log('🔒 Tenant isolation configured');
  console.log('📊 Universal data access ready');
  console.log(`🚀 Cube.js server ready on port ${port}`);
  console.log(`📡 API endpoint: http://localhost:${port}/cubejs-api/v1`);
  console.log(`🏥 Health check: http://localhost:${port}/health`);
  console.log(`✨ ONLY semantic layer - other features moved to Chat2Chart backend`);
});

module.exports = { app };