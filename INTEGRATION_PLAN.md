# Chat2Chart + Cube.js + LiteLLM Integration Plan

## 🎯 **Current Architecture Analysis**

### Existing Components:
1. **Chat2Chart Server** (Python/FastAPI) - Port 8000
   - `/chats/chat` - Natural language to chart generation
   - `/charts/` - Chart management and storage
   - `/conversations/` - Chat conversation management
   - Uses ECharts for visualization

2. **Chat2Chart Client** (Next.js/React) - Port 3000
   - Chat interface for natural language queries
   - Chart rendering with ECharts
   - File upload and data management

3. **Cube.js Server** (Node.js) - Port 4000
   - Universal semantic layer with multi-tenant support
   - AI-powered query generation with LiteLLM
   - Real database connectivity

4. **Authentication Service** (Python) - Port 5000
   - User management and JWT authentication

## 🔄 **Integration Strategy**

### Phase 1: API Integration Layer
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Chat2Chart    │    │   Cube.js +     │    │   Database      │
│   Client        │◄──►│   LiteLLM       │◄──►│   PostgreSQL    │
│   (Next.js)     │    │   (Node.js)     │    │   + Redis       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   Chat2Chart    │    │   Auth Service  │
│   Server        │    │   (Python)      │
│   (FastAPI)     │    │                 │
└─────────────────┘    └─────────────────┘
```

### Phase 2: Data Flow Architecture
```
User Query → Chat2Chart Client → Chat2Chart Server → Cube.js AI Engine → Database
     ↓              ↓                    ↓                    ↓              ↓
1. "Show me       2. Process           3. Generate         4. Execute      5. Return
   user growth"      natural             Cube.js query       optimized       structured
                     language            with LiteLLM        SQL query       data + metadata
     ↑              ↑                    ↑                    ↑              ↑
Chart Rendering ← Chart Config ← ECharts Generation ← Data Processing ← Query Results
```

## 🔧 **Implementation Steps**

### Step 1: Enhance Chat2Chart Server with Cube.js Integration

**File: `packages/chat2chart/server/app/modules/chats/services.py`**
```python
class ChatService:
    def __init__(self):
        self.cube_api_url = "http://cube-server:4000/cubejs-api/v1"
        self.ai_analytics_url = "http://cube-server:4000/ai-analytics"
    
    async def chat(self, chat_data: ChatSchema):
        # 1. Send natural language query to Cube.js AI engine
        cube_response = await self.query_cube_ai(chat_data.message)
        
        # 2. Process Cube.js response and generate chart config
        chart_config = await self.generate_chart_config(cube_response)
        
        # 3. Return enhanced response with both data and visualization
        return ChatResponseSchema(
            data=cube_response.data,
            chart_config=chart_config,
            insights=cube_response.insights,
            query_metadata=cube_response.metadata
        )
```

### Step 2: Add AI Analytics Endpoints to Cube.js Server

**File: `packages/cube/src/working-server.js`**
```javascript
// AI Analytics endpoints
app.post('/ai-analytics/query', async (req, res) => {
  const { naturalLanguageQuery } = req.body;
  const tenantId = req.headers['x-tenant-id'] || 'default';
  
  try {
    const result = await aiEngine.routeQuery(naturalLanguageQuery, tenantId);
    const insights = await aiEngine.generateInsights(result, naturalLanguageQuery);
    
    res.json({
      success: true,
      naturalLanguageQuery,
      data: result.data,
      generatedQuery: result.generatedQuery,
      insights,
      metadata: result.annotation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/ai-analytics/schema/:tenantId?', async (req, res) => {
  const tenantId = req.params.tenantId || 'default';
  const schema = await aiEngine.getCubeSchema(tenantId);
  res.json(schema);
});
```

### Step 3: Enhanced Chart Generation Pipeline

**Integration Flow:**
1. **User Input**: "Show me user growth over the last 30 days"
2. **Chat2Chart Server**: Receives query, forwards to Cube.js AI
3. **Cube.js AI Engine**: 
   - Classifies query type (trends)
   - Generates Cube.js query using LiteLLM
   - Executes query against database
   - Returns structured data + metadata
4. **Chat2Chart Server**: 
   - Processes Cube.js response
   - Generates ECharts configuration
   - Stores conversation and chart
5. **Chat2Chart Client**: 
   - Renders chart with ECharts
   - Shows AI-generated insights
   - Enables further interaction

### Step 4: Multi-Tenant Data Isolation

**Tenant Context Flow:**
```javascript
// In Cube.js server
app.use('/ai-analytics', (req, res, next) => {
  const tenantId = extractTenantId(req);
  req.tenantContext = {
    tenantId,
    userId: req.headers['x-user-id'],
    orgId: req.headers['x-org-id']
  };
  next();
});
```

**In Chat2Chart Server:**
```python
# Forward tenant context to Cube.js
headers = {
    'X-Tenant-ID': user.tenant_id,
    'X-User-ID': user.id,
    'X-Org-ID': user.organization_id
}
```

## 🚀 **Enhanced Features**

### 1. Intelligent Query Routing
- **Metrics Agent**: "How many users do we have?"
- **Trends Agent**: "Show user growth over time"
- **Comparison Agent**: "Compare this month vs last month"
- **Anomaly Agent**: "Find unusual patterns in user activity"

### 2. Context-Aware Conversations
```python
class ConversationContext:
    def __init__(self):
        self.previous_queries = []
        self.current_dataset = None
        self.user_preferences = {}
    
    def maintain_context(self, query, response):
        # Remember previous queries for follow-up questions
        # "Show me charts" → "Filter by last week" → "Group by region"
```

### 3. Advanced Chart Recommendations
```javascript
// In AI Analytics Engine
async generateChartRecommendations(data, queryType) {
  const recommendations = {
    'trends': ['line', 'area', 'bar'],
    'comparisons': ['bar', 'column', 'pie'],
    'metrics': ['gauge', 'number', 'progress'],
    'distributions': ['histogram', 'scatter', 'heatmap']
  };
  
  return recommendations[queryType] || ['bar'];
}
```

### 4. Real-time Collaboration
```javascript
// WebSocket integration for real-time chart sharing
app.get('/ai-analytics/collaborate/:sessionId', (req, res) => {
  // Enable real-time collaboration on charts
  // Multiple users can interact with the same analysis
});
```

## 📊 **Data Flow Examples**

### Example 1: Simple Metrics Query
```
User: "How many users signed up today?"
↓
Chat2Chart → Cube.js AI → Database Query:
{
  "measures": ["Users.count"],
  "filters": [{
    "member": "Users.createdAt",
    "operator": "inDateRange", 
    "values": ["today"]
  }]
}
↓
Result: 47 users → Number chart with insight: "47 new users today, 23% above yesterday"
```

### Example 2: Complex Trend Analysis
```
User: "Show me user growth trends by region over the last quarter"
↓
Cube.js AI generates:
{
  "measures": ["Users.count"],
  "dimensions": ["Users.region"],
  "timeDimensions": [{
    "dimension": "Users.createdAt",
    "granularity": "week",
    "dateRange": "last 3 months"
  }]
}
↓
Result: Multi-line chart + AI insights: "North America shows 34% growth, Europe declining 12%"
```

## 🔐 **Security & Performance**

### 1. Authentication Flow
```
Client → Auth Service (JWT) → Chat2Chart Server → Cube.js (with tenant context)
```

### 2. Caching Strategy
- **Schema Cache**: 5-minute TTL for Cube.js schema
- **Query Cache**: Redis-based caching for repeated queries
- **Chart Cache**: Store generated chart configs

### 3. Rate Limiting
- **AI Queries**: 100 requests/hour per user
- **Database Queries**: Smart throttling based on complexity

## 🎯 **Success Metrics**

1. **Query Success Rate**: >95% of natural language queries generate valid charts
2. **Response Time**: <3 seconds for simple queries, <10 seconds for complex analysis
3. **User Satisfaction**: AI-generated insights rated >4/5 by users
4. **Multi-tenant Isolation**: 100% data isolation between tenants

## 🛠️ **Development Phases**

### Phase 1 (Current): Basic Integration ✅
- Cube.js server with AI analytics
- Multi-tenant architecture
- Basic query generation

### Phase 2 (Next): Chat2Chart Integration
- Connect Chat2Chart server to Cube.js AI
- Enhanced chart generation pipeline
- Context-aware conversations

### Phase 3 (Future): Advanced Features
- Real-time collaboration
- Advanced AI agents
- Predictive analytics
- Custom visualization plugins

This integration plan creates a powerful, AI-driven analytics platform that combines the best of Chat2Chart's user experience with Cube.js's semantic layer and LiteLLM's AI capabilities.