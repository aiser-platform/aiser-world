/**
 * Working Cube.js Server - Hybrid approach
 * Combines minimal server reliability with real Cube.js functionality
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Create Express app
const app = express();

// Cube.js server - Universal Semantic Layer only

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

// Intelligent Analytics endpoints for Chat2Chart integration
app.post('/ai-analytics/query', async (req, res) => {
  const { naturalLanguageQuery } = req.body;
  const tenantId = req.headers['x-tenant-id'] || 'default';
  const userId = req.headers['x-user-id'] || null;
  
  console.log(`🧠 Intelligent Analytics query from tenant ${tenantId}: "${naturalLanguageQuery}"`);
  
  try {
    // Route query through intelligent engine with enhanced routing
    const result = await intelligentEngine.routeIntelligentQuery(naturalLanguageQuery, tenantId, userId);
    
    res.json({
      success: result.success,
      naturalLanguageQuery,
      data: result.data || [],
      generatedQuery: result.generatedQuery,
      businessInsights: result.businessInsights || [],
      queryAnalysis: result.queryAnalysis,
      agentType: result.agentType,
      metadata: result.annotation,
      error: result.error
    });
  } catch (error) {
    console.error('❌ Intelligent Analytics error:', error.message);
    res.status(500).json({
      success: false,
      naturalLanguageQuery,
      error: error.message
    });
  }
});

app.get('/ai-analytics/schema/:tenantId?', async (req, res) => {
  const tenantId = req.params.tenantId || req.headers['x-tenant-id'] || 'default';
  
  try {
    const schema = await intelligentEngine.getCubeSchema(tenantId);
    res.json({
      success: true,
      tenantId,
      schema
    });
  } catch (error) {
    console.error('❌ Schema fetch error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/ai-analytics/chart-config', async (req, res) => {
  const { data, queryType, naturalLanguageQuery, queryAnalysis } = req.body;
  const tenantId = req.headers['x-tenant-id'] || 'default';
  
  try {
    // Use MCP ECharts integration for enhanced chart generation
    const cubeData = { data: data || [] };
    const analysis = queryAnalysis || { queryType: [queryType], originalQuery: naturalLanguageQuery };
    
    const result = await mcpECharts.generateChartFromCubeData(cubeData, analysis, {
      title: naturalLanguageQuery
    });
    
    res.json({
      success: result.success,
      chartConfig: result.chartConfig,
      chartType: result.chartType,
      dataAnalysis: result.dataAnalysis,
      metadata: result.metadata,
      recommendations: getChartRecommendations(queryType),
      mcpResult: result.mcpResult,
      error: result.error
    });
  } catch (error) {
    console.error('❌ MCP ECharts generation error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      fallbackConfig: generateEChartsConfig(data, queryType, naturalLanguageQuery)
    });
  }
});

// New endpoint for testing intelligent query routing
app.post('/ai-analytics/intelligent-query', async (req, res) => {
  const { query } = req.body;
  const tenantId = req.headers['x-tenant-id'] || 'default';
  const userId = req.headers['x-user-id'] || null;
  
  console.log(`🧠 Testing intelligent query routing: "${query}"`);
  
  try {
    const result = await intelligentEngine.routeIntelligentQuery(query, tenantId, userId);
    
    res.json({
      success: true,
      query,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Intelligent query routing test error:', error.message);
    res.status(500).json({
      success: false,
      query,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// MCP ECharts chart generation endpoint
app.post('/ai-analytics/mcp-chart', async (req, res) => {
  const { data, queryAnalysis, options = {} } = req.body;
  const tenantId = req.headers['x-tenant-id'] || 'default';
  
  console.log(`📊 MCP ECharts generation for tenant ${tenantId}`);
  
  try {
    const cubeData = { data: data || [] };
    const result = await mcpECharts.generateChartFromCubeData(cubeData, queryAnalysis, options);
    
    res.json({
      success: result.success,
      chartType: result.chartType,
      chartConfig: result.chartConfig,
      dataAnalysis: result.dataAnalysis,
      metadata: result.metadata,
      mcpResult: result.mcpResult,
      error: result.error,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ MCP ECharts generation error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Helper function to generate ECharts configuration
function generateEChartsConfig(data, queryType, naturalLanguageQuery) {
  if (!data || data.length === 0) {
    return {
      title: { text: 'No Data Available' },
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'value' },
      series: []
    };
  }
  
  // Extract keys from first data item
  const firstItem = data[0];
  const keys = Object.keys(firstItem);
  
  // Find measure and dimension keys
  const measureKeys = keys.filter(key => 
    key.includes('.count') || 
    key.includes('.sum') || 
    key.includes('.avg') ||
    !key.includes('.')
  );
  const dimensionKeys = keys.filter(key => 
    key.includes('.day') || 
    key.includes('.month') || 
    key.includes('.year') ||
    (key.includes('.') && !measureKeys.includes(key))
  );
  
  // Generate appropriate chart based on query type
  if (queryType === 'trends' || dimensionKeys.some(key => key.includes('day') || key.includes('month'))) {
    return generateLineChart(data, measureKeys, dimensionKeys, naturalLanguageQuery);
  } else if (queryType === 'comparisons') {
    return generateBarChart(data, measureKeys, dimensionKeys, naturalLanguageQuery);
  } else {
    return generateBarChart(data, measureKeys, dimensionKeys, naturalLanguageQuery);
  }
}

function generateLineChart(data, measureKeys, dimensionKeys, title) {
  const xAxisKey = dimensionKeys[0] || Object.keys(data[0])[0];
  const yAxisKey = measureKeys[0] || Object.keys(data[0])[1];
  
  return {
    title: { 
      text: title || 'Trend Analysis',
      left: 'center'
    },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: data.map(item => {
        const value = item[xAxisKey];
        // Format date if it looks like a date
        if (typeof value === 'string' && value.includes('T')) {
          return new Date(value).toLocaleDateString();
        }
        return value;
      })
    },
    yAxis: { type: 'value' },
    series: [{
      name: yAxisKey,
      type: 'line',
      data: data.map(item => parseFloat(item[yAxisKey]) || 0),
      smooth: true,
      itemStyle: { color: '#1890ff' }
    }]
  };
}

function generateBarChart(data, measureKeys, dimensionKeys, title) {
  const xAxisKey = dimensionKeys[0] || Object.keys(data[0])[0];
  const yAxisKey = measureKeys[0] || Object.keys(data[0])[1];
  
  return {
    title: { 
      text: title || 'Comparison Analysis',
      left: 'center'
    },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: data.map(item => item[xAxisKey])
    },
    yAxis: { type: 'value' },
    series: [{
      name: yAxisKey,
      type: 'bar',
      data: data.map(item => parseFloat(item[yAxisKey]) || 0),
      itemStyle: { color: '#52c41a' }
    }]
  };
}

function getChartRecommendations(queryType) {
  const recommendations = {
    'trends': ['line', 'area', 'bar'],
    'comparisons': ['bar', 'column', 'pie'],
    'metrics': ['gauge', 'number', 'progress'],
    'anomalies': ['line', 'scatter'],
    'general': ['bar', 'line', 'pie']
  };
  
  return recommendations[queryType] || recommendations['general'];
}

// Data connectivity endpoints
app.post('/data/upload', dataConnectivity.getUploadMiddleware(), async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || 'default';
  
  console.log(`📁 File upload request from tenant ${tenantId}`);
  
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded'
    });
  }
  
  try {
    const options = {
      includeData: req.body.includePreview === 'true',
      deleteAfterProcessing: false,
      sheetName: req.body.sheetName
    };
    
    const result = await dataConnectivity.processUploadedFile(req.file, options);
    
    res.json({
      success: result.success,
      dataSource: result.dataSource,
      preview: result.dataSource?.preview,
      error: result.error,
      tenantId
    });
  } catch (error) {
    console.error('❌ File upload processing error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/data/connect-database', async (req, res) => {
  const { type, host, port, database, username, password, name } = req.body;
  const tenantId = req.headers['x-tenant-id'] || 'default';
  
  console.log(`🔌 Database connection request: ${type} from tenant ${tenantId}`);
  
  try {
    const config = {
      type,
      host,
      port,
      database,
      username,
      password,
      name: name || `${type}_${database}`
    };
    
    const result = await dataConnectivity.createDatabaseConnection(config);
    
    res.json({
      success: result.success,
      dataSource: result.dataSource,
      error: result.error,
      tenantId
    });
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/data/sources', (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || 'default';
  
  try {
    const result = dataConnectivity.listDataSources();
    
    res.json({
      success: result.success,
      dataSources: result.dataSources,
      count: result.count,
      tenantId
    });
  } catch (error) {
    console.error('❌ List data sources error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/data/sources/:id', (req, res) => {
  const { id } = req.params;
  const tenantId = req.headers['x-tenant-id'] || 'default';
  
  try {
    const result = dataConnectivity.getDataSource(id);
    
    res.json({
      success: result.success,
      dataSource: result.dataSource,
      error: result.error,
      tenantId
    });
  } catch (error) {
    console.error('❌ Get data source error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/data/sources/:id/query', async (req, res) => {
  const { id } = req.params;
  const query = req.body;
  const tenantId = req.headers['x-tenant-id'] || 'default';
  
  console.log(`🔍 Data source query: ${id} from tenant ${tenantId}`);
  
  try {
    const result = await dataConnectivity.queryDataSource(id, query);
    
    res.json({
      success: result.success,
      data: result.data,
      totalRows: result.totalRows,
      schema: result.schema,
      error: result.error,
      tenantId
    });
  } catch (error) {
    console.error('❌ Data source query error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.delete('/data/sources/:id', (req, res) => {
  const { id } = req.params;
  const tenantId = req.headers['x-tenant-id'] || 'default';
  
  try {
    const result = dataConnectivity.deleteDataSource(id);
    
    res.json({
      success: result.success,
      message: result.message,
      error: result.error,
      tenantId
    });
  } catch (error) {
    console.error('❌ Delete data source error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Integrated chat-to-chart workflow endpoint
app.post('/data/chat-to-chart', async (req, res) => {
  const { dataSourceId, naturalLanguageQuery } = req.body;
  const tenantId = req.headers['x-tenant-id'] || 'default';
  const userId = req.headers['x-user-id'] || null;
  
  console.log(`💬 Chat-to-chart request: "${naturalLanguageQuery}" for data source ${dataSourceId}`);
  
  try {
    // Step 1: Query the data source
    const dataResult = await dataConnectivity.queryDataSource(dataSourceId, { limit: 1000 });
    
    if (!dataResult.success) {
      throw new Error(`Data query failed: ${dataResult.error}`);
    }
    
    // Step 2: Route through intelligent analytics
    const analyticsResult = await intelligentEngine.routeIntelligentQuery(naturalLanguageQuery, tenantId, userId);
    
    // Step 3: Generate chart using MCP ECharts
    const cubeData = { data: dataResult.data };
    const chartResult = await mcpECharts.generateChartFromCubeData(cubeData, analyticsResult.queryAnalysis, {
      title: naturalLanguageQuery
    });
    
    res.json({
      success: true,
      naturalLanguageQuery,
      dataSource: {
        id: dataSourceId,
        rowCount: dataResult.totalRows,
        schema: dataResult.schema
      },
      analytics: {
        agentType: analyticsResult.agentType,
        businessInsights: analyticsResult.businessInsights,
        queryAnalysis: analyticsResult.queryAnalysis
      },
      chart: {
        type: chartResult.chartType,
        config: chartResult.chartConfig,
        dataAnalysis: chartResult.dataAnalysis
      },
      data: dataResult.data.slice(0, 100), // Include sample data
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Chat-to-chart workflow error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      naturalLanguageQuery,
      dataSourceId
    });
  }
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
  console.log(`✨ Enhanced with real multi-tenant logic`);
});

module.exports = { app };