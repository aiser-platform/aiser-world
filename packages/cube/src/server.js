/**
 * Simple Cube.js Server - JavaScript version for quick deployment
 * Multi-tenant architecture with working implementation
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const CubejsServerCore = require('@cubejs-backend/server-core');

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

// Cube.js configuration
const cubeConfig = {
  // Multi-tenant app ID generation
  contextToAppId: ({ securityContext }) => {
    const tenantId = securityContext?.tenantId || 'default';
    console.log(`🏢 Context to App ID: ${tenantId}`);
    return tenantId;
  },

  // Query rewrite for tenant isolation
  queryRewrite: (query, { securityContext }) => {
    if (securityContext?.tenantId && securityContext.tenantId !== 'default') {
      query.filters = query.filters || [];
      
      const hasTenantFilter = query.filters.some(filter => 
        filter.member && filter.member.includes('tenant_id')
      );
      
      if (!hasTenantFilter) {
        query.filters.push({
          member: 'tenant_id',
          operator: 'equals',
          values: [securityContext.tenantId]
        });
        
        console.log(`🔒 Added tenant isolation filter: ${securityContext.tenantId}`);
      }
    }
    
    return query;
  },

  // Database driver factory
  driverFactory: ({ dataSource }) => {
    const PostgresDriver = require('@cubejs-backend/postgres-driver');
    
    const tenantId = dataSource || 'default';
    const databaseName = tenantId === 'default' 
      ? (process.env.CUBE_DB_NAME || 'aiser_world')
      : `${process.env.CUBE_DB_NAME || 'aiser_world'}_${tenantId}`;
    
    console.log(`🔌 Creating database driver for tenant: ${tenantId}, database: ${databaseName}`);
    
    return new PostgresDriver({
      host: process.env.CUBE_DB_HOST || 'postgres',
      port: parseInt(process.env.CUBE_DB_PORT || '5432'),
      database: databaseName,
      user: process.env.CUBE_DB_USER || 'aiser',
      password: process.env.CUBE_DB_PASS || 'aiser_password',
      ssl: process.env.CUBE_DB_SSL === 'true' ? {
        rejectUnauthorized: false
      } : false,
      pool: {
        min: parseInt(process.env.CUBE_DB_POOL_MIN || '2'),
        max: parseInt(process.env.CUBE_DB_POOL_MAX || '10'),
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 30000
      }
    });
  },

  // Schema path
  schemaPath: 'src/schema',

  // API secret
  apiSecret: process.env.CUBE_API_SECRET || 'dev-cube-secret-key',

  // Disable SQL API to avoid native extension issues
  sqlApi: false
};

// Create Cube.js server
const server = new CubejsServerCore(cubeConfig);

// Start server
async function startServer() {
  try {
    console.log('🎯 Starting Cube.js Universal Semantic Layer...');
    console.log('🌐 Multi-tenant architecture enabled');
    console.log('🔒 Tenant isolation configured');
    console.log('📊 Universal data access ready');
    
    // Disable native extension for Alpine Linux
    process.env.CUBEJS_SKIP_NATIVE_EXTENSIONS = 'true';
    
    // Initialize Cube.js server
    await server.initApp(app);
    
    const port = parseInt(process.env.PORT || '4000');
    
    // Start the server
    app.listen(port, () => {
      console.log(`🚀 Cube.js server ready on port ${port}`);
      console.log(`📡 API endpoint: http://localhost:${port}/cubejs-api/v1`);
      console.log(`🏥 Health check: http://localhost:${port}/health`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🛠️  Dev playground: http://localhost:${port}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to start Cube.js server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = { app, server };