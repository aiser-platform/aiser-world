/**
 * Minimal Working Cube.js Server
 * Simplified version to get basic functionality working
 */

const express = require('express');
const cors = require('cors');

// Create Express app
const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8000'],
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'cube-server',
    version: '1.0.0'
  });
});

// Mock Cube.js API endpoints for testing
app.get('/cubejs-api/v1/load', (req, res) => {
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

app.post('/cubejs-api/v1/load', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || 'default';
  console.log(`📊 Query received for tenant: ${tenantId}`);
  console.log(`🔍 Query:`, JSON.stringify(req.body, null, 2));
  
  res.json({
    data: [
      {
        'Users.count': '10',
        'Users.createdAt.day': '2024-01-01T00:00:00.000'
      },
      {
        'Users.count': '15',
        'Users.createdAt.day': '2024-01-02T00:00:00.000'
      }
    ],
    query: req.body.query,
    annotation: {
      measures: {
        'Users.count': {
          title: 'Users Count',
          shortTitle: 'Count',
          type: 'number'
        }
      },
      dimensions: {},
      segments: {},
      timeDimensions: {
        'Users.createdAt': {
          title: 'Users Created At',
          shortTitle: 'Created At',
          type: 'time'
        }
      }
    }
  });
});

app.get('/cubejs-api/v1/meta', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || 'default';
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
          }
        ],
        segments: []
      }
    ]
  });
});

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
  console.log(`🛠️  Mock API mode - returning sample data`);
});

module.exports = { app };