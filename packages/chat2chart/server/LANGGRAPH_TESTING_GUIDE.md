# LangGraph Integration Testing Guide

## Overview
This guide explains how to test the new LangGraph-based multi-agent orchestrator from the frontend.

## Prerequisites
1. LangGraph installed: `pip install langgraph>=0.2.0`
2. Server running with environment variable set: `USE_LANGGRAPH_ORCHESTRATOR=true`

## Enabling LangGraph Orchestrator

### Option 1: Environment Variable (Recommended)
```bash
export USE_LANGGRAPH_ORCHESTRATOR=true
# Then restart your server
```

### Option 2: Docker Compose
Add to your `docker-compose.yml`:
```yaml
environment:
  - USE_LANGGRAPH_ORCHESTRATOR=true
```

### Option 3: .env File
Add to your `.env` file:
```
USE_LANGGRAPH_ORCHESTRATOR=true
```

## Testing from Frontend

### 1. Basic Test Query
1. Open the chat interface
2. Select a data source (if available)
3. Send a query like: "how many customers by year"
4. Check the response for:
   - ✅ SQL query generated
   - ✅ Query executed (if data source available)
   - ✅ Chart configuration
   - ✅ Insights and recommendations
   - ✅ Progress updates (if streaming enabled)

### 2. Verify Response Format
The response should include:
```json
{
  "success": true,
  "query": "your query",
  "message": "narration text",
  "sql_query": "SELECT ...",
  "query_result": {
    "success": true,
    "data": [...],
    "row_count": 10,
    "columns": [...]
  },
  "echarts_config": {...},
  "chart_config": {...},  // Alias for backward compatibility
  "insights": [...],
  "recommendations": [...],
  "narration": "...",
  "analysis": "...",
  "execution_metadata": {...},
  "ai_engine": "LangGraph Multi-Agent Framework",
  "progress": {
    "percentage": 100.0,
    "message": "Workflow completed successfully",
    "stage": "complete"
  }
}
```

### 3. Test Query Result Validation
The system should:
- ✅ **NOT** generate chart/insights if query returns no results
- ✅ Retry query execution up to 3 times if no results
- ✅ Only proceed to chart/insights after successful query execution

### 4. Test Progress Updates (Streaming)
To test streaming:
1. Add `stream: true` to your request or set `user_context: { stream: true }`
2. The response will be Server-Sent Events (SSE) with progress updates
3. Each update includes:
   - `type`: "progress" | "complete" | "error"
   - `progress`: { percentage, message, stage }
   - `partial_results`: { sql_query, query_result_row_count, has_chart, etc. }

## Expected Behavior

### Success Flow
1. **Routing** (5-10%): "Analyzing query and routing to appropriate workflow..."
2. **NL2SQL** (20-30%): "Converting natural language to SQL..."
3. **SQL Validation** (25-35%): "Validating SQL query..."
4. **Query Execution** (40-60%): "Executing SQL query..."
5. **Results Validation** (55-65%): "Validating query results..."
6. **Chart/Insights** (80-95%): "Generating chart and insights..."
7. **Complete** (100%): "Workflow completed successfully"

### Error Handling
- If SQL generation fails → Error recovery → Retry or fallback
- If query execution fails → Retry up to 3 times → Error if still fails
- If no query results → Retry query → Skip chart/insights if still no results
- If chart/insights fail → Fallback to separate generation

## Debugging

### Check Server Logs
Look for:
- `🚀 Using LangGraph orchestrator (feature flag enabled)` - Confirms LangGraph is active
- `✅ LangGraph workflow completed` - Success
- `❌ LangGraph orchestrator failed, falling back to Robust` - Fallback triggered

### Common Issues

1. **LangGraph not enabled**
   - Check: `USE_LANGGRAPH_ORCHESTRATOR` environment variable
   - Solution: Set to `true` and restart server

2. **Import errors**
   - Check: `pip install langgraph>=0.2.0`
   - Solution: Install LangGraph package

3. **Response format mismatch**
   - Check: Server logs for response structure
   - Solution: Response format is automatically normalized in `api.py`

4. **No query results**
   - Expected: System retries up to 3 times
   - Check: Data source connection and SQL validity

## Comparison with Old Orchestrator

| Feature | Robust Orchestrator | LangGraph Orchestrator |
|---------|-------------------|----------------------|
| Workflow Definition | Implicit (code flow) | Explicit (StateGraph) |
| Retry Logic | Manual | Built-in with exponential backoff |
| Progress Tracking | Limited | Full (0-100% with messages) |
| Error Recovery | Basic | Adaptive with multiple strategies |
| State Management | Dict-based | TypedDict with Pydantic validation |
| Streaming | Limited | Full SSE support |
| Observability | Logs only | State snapshots + progress events |

## Next Steps

1. **Enable feature flag**: Set `USE_LANGGRAPH_ORCHESTRATOR=true`
2. **Test basic query**: Send a simple query from frontend
3. **Verify response**: Check that all expected fields are present
4. **Test error cases**: Try queries that might fail
5. **Monitor logs**: Watch for any errors or warnings
6. **Compare results**: Run same query with both orchestrators (if needed)

## Rollback

If issues occur, simply unset the environment variable:
```bash
unset USE_LANGGRAPH_ORCHESTRATOR
# Or set to false
export USE_LANGGRAPH_ORCHESTRATOR=false
```

The system will automatically fall back to the Robust Orchestrator.

