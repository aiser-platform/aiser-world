# Quick Start: Testing LangGraph from Frontend

## 1. Enable LangGraph
```bash
export USE_LANGGRAPH_ORCHESTRATOR=true
```

## 2. Restart Server
```bash
# If using Docker
docker-compose restart chat2chart-server

# If running directly
# Restart your uvicorn/FastAPI server
```

## 3. Test from Frontend
1. Open chat interface
2. Select a data source (optional)
3. Send query: "how many customers by year"
4. Check response for:
   - SQL query
   - Query results
   - Chart config
   - Insights
   - Progress updates

## 4. Verify in Logs
Look for: `🚀 Using LangGraph orchestrator (feature flag enabled)`

## Expected Response Format
```json
{
  "success": true,
  "message": "narration text",
  "sql_query": "SELECT ...",
  "query_result": {...},
  "echarts_config": {...},
  "insights": [...],
  "recommendations": [...],
  "progress": {
    "percentage": 100.0,
    "message": "Workflow completed successfully"
  }
}
```

## Key Features to Test
✅ Query result validation (no chart/insights without data)
✅ Adaptive retries (up to 3x if no results)
✅ Progress tracking (0-100%)
✅ Error recovery
✅ Fallback paths (unified → separate)

## Rollback
```bash
unset USE_LANGGRAPH_ORCHESTRATOR
# Or set to false
export USE_LANGGRAPH_ORCHESTRATOR=false
```
