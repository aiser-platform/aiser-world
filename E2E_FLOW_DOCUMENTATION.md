# Aiser Chat2Chart E2E Flow Documentation

## Complete User Journey: NL Query → Chart & Insights

### 1. **User Query Entry Point** 
- **File**: `packages/chat2chart/server/app/modules/ai/api.py` → `analyze_chat_query()`
- **Input**: Natural language query (NL)
- **Output**: Comprehensive analysis with chart and insights
- **Flow**: Determines USE_LANGGRAPH_ORCHESTRATOR flag → routes to LangGraph or fallback

### 2. **LangGraph Orchestrator Initialization**
- **File**: `packages/chat2chart/server/app/modules/ai/services/langgraph_orchestrator.py`
- **Class**: `LangGraphMultiAgentOrchestrator`
- **Key Services**:
  - `LiteLLMService`: AI model management (Azure GPT-5-mini by default)
  - `MultiEngineQueryService`: SQL execution
  - `DataConnectivityService`: Schema retrieval
  - `ChartService`: ECharts configuration generation
- **Graph Structure**: StateGraph with nodes and conditional edges

### 3. **LangGraph Workflow Nodes** (Sequential with conditionals)

#### 3.1 Route Query Node
- **File**: `packages/chat2chart/server/app/modules/ai/nodes/routing_node.py`
- **Purpose**: Determine if data source is available and route appropriately
- **Decision**: 
  - With data source → SQL generation path
  - Without data source → Conversational mode
- **Output State Updates**:
  - `current_stage`: "routed"
  - `routing_decision`: "has_data_source" | "no_data_source"
  - `progress_percentage`: 10.0

#### 3.2 NL2SQL Node
- **File**: `packages/chat2chart/server/app/modules/ai/nodes/nl2sql_node.py`
- **Agent**: `EnhancedNL2SQLAgent`
- **Process**:
  1. Fetch schema from data source
  2. Include sample data (first 3 rows per table)
  3. LLM generates SQL with structured output (SQLGenerationOutput Pydantic model)
  4. **CRITICAL**: Extract SQL from JSON at Pydantic validator level
- **Output State Updates**:
  - `sql_query`: Cleaned SQL string (not JSON)
  - `current_stage`: "nl2sql_complete"
  - `progress_percentage`: 30.0

#### 3.3 SQL Validation Node
- **File**: `packages/chat2chart/server/app/modules/ai/nodes/validation_node.py`
- **Checks**:
  - SQL starts with SELECT
  - Contains required keywords (FROM, SELECT)
  - No dangerous operations
  - Not a placeholder template
- **Output State Updates**:
  - `current_stage`: "sql_validated"
  - `progress_percentage`: 35.0

#### 3.4 Query Execution Node
- **File**: `packages/chat2chart/server/app/modules/ai/nodes/query_execution_node.py`
- **Execution Paths**:
  1. Primary: MultiEngineQueryService with ClickHouse support
  2. Fallback: ClickHouse HTTP with authentication
- **Result Format**: List of dicts (rows)
- **Output State Updates**:
  - `query_result`: List of query results
  - `query_result_row_count`: Number of rows
  - `query_result_columns`: List of column names
  - `current_stage`: "query_executed"
  - `progress_percentage`: 50.0

#### 3.5 Results Validation Node
- **Purpose**: Ensure query returned valid data
- **Checks**:
  - Results are list type
  - Has at least 1 row (or empty is allowed)
  - Rows are consistent dict objects
- **Output State Updates**:
  - `current_stage`: "results_validated"
  - `progress_percentage`: 55.0

#### 3.6 Unified Chart & Insights Node
- **File**: `packages/chat2chart/server/app/modules/ai/nodes/unified_node.py`
- **Agents**:
  - `IntelligentChartGenerationAgent`: ECharts config generation
  - `BusinessInsightsAgent`: Business insights and recommendations
  - `UnifiedChartInsightsAgent`: Combined execution
- **Input**: Query result data + SQL query
- **Output State Updates**:
  - `echarts_config`: ECharts configuration JSON
  - `chart_data`: Formatted chart data
  - `insights`: List of insight objects
  - `recommendations`: List of recommendations
  - `narration`: Business narration/summary
  - `current_stage`: "insights_generated"
  - `progress_percentage`: 80.0

#### 3.7 Error Recovery Node
- **Purpose**: Handle non-critical errors and attempt recovery
- **Strategies**:
  - Retry query execution
  - Fallback to insights-only generation
  - Fallback to conversational response
- **Retry Limits**: max 2 retries per operation

#### 3.8 Critical Failure Node
- **Purpose**: Handle critical errors when recovery fails
- **Actions**: Return error response with appropriate messaging

### 4. **SQL Extraction & Sanitization Pipeline** (Centralized)

**Location**: `packages/chat2chart/server/app/modules/ai/schemas/agent_outputs.py` → `SQLGenerationOutput.validate_sql_not_empty()`

**Process**:
1. **Input**: Raw LLM response (could be full JSON object as string)
2. **Detection**: Check for `"sql_query"`, `"dialect"`, `"explanation"` markers
3. **Extraction**:
   - Use regex: `"sql_query"\s*:\s*"((?:[^"\\]|\\.)*)"` to extract JSON field value
   - Unescape JSON sequences: `\n`, `\t`, `\"`, `\\`
4. **Cleanup**:
   - Remove JSON artifacts: `", "dialect":`, `"}`, etc.
   - Remove corruption patterns: repeated "id"
   - Normalize whitespace
5. **Output**: Pure SQL string ready for execution

**Key Regex Patterns**:
- Full JSON extraction: `"sql_query"\s*:\s*"((?:[^"\\]|\\.)*)"` - handles escaped quotes
- JSON markers detection: `"dialect"`, `"explanation"`, `"validation_result"`
- SQL block extraction: `(SELECT\s+.*?FROM\s+.*?)(?:\s*["\']\s*\}\s*\]\s*\}|$)`

### 5. **State Management**

**State Type**: `AiserWorkflowState` (TypedDict)

**Critical Fields**:
```python
{
    # Query & Results
    "query": "Natural language query",
    "sql_query": "SELECT ... FROM ... (pure SQL string, never JSON)",
    "query_result": [{"col1": "val1", "col2": "val2"}, ...],
    
    # Execution Progress
    "current_stage": "routing" | "nl2sql_complete" | "sql_validated" | "query_executed" | ...,
    "progress_percentage": 0.0 - 100.0,
    "progress_message": "Human-readable status",
    
    # Results
    "echarts_config": {...},  # ECharts JSON configuration
    "chart_data": [...],       # Formatted chart data
    "insights": [...],         # Business insights list
    "recommendations": [...],  # Action recommendations
    
    # Error Handling
    "error": "Error message if any",
    "critical_failure": boolean,
    "retry_count": integer,
    "execution_metadata": {...}
}
```

### 6. **Response to Frontend**

**File**: `packages/chat2chart/server/app/modules/ai/api.py` → `analyze_chat_query()`

**Response Format**:
```python
{
    "success": boolean,
    "message": "Narration/analysis message",
    "sql_query": "SELECT ... (pure SQL)",
    "query_result": [...],  # Query result data
    "echarts_config": {...},  # For chart rendering
    "insights": [...],         # For insights display
    "recommendations": [...],  # For actions/next steps
    "progress": {
        "percentage": 100.0,
        "message": "Completed",
        "stage": "complete"
    }
}
```

## Critical Implementation Points

### SQL Extraction - The Single Source of Truth
- **Location**: Pydantic validator in `SQLGenerationOutput`
- **Why Central**: Ensures ALL SQL is properly extracted, whether from direct LLM response or full JSON object
- **Detection Pattern**: Checks for all 3 markers: `"sql_query"`, `"dialect"`, `"explanation"`
- **Extraction Pattern**: Robust regex handles escaped quotes: `((?:[^"\\]|\\.)*)`

### Model Consistency
- **Primary Model**: `azure_gpt5_mini` (Azure OpenAI GPT-5 Mini)
- **Fallback Model**: `openai_gpt4_mini` if Azure unavailable
- **Temperature**: 0.05 for structured outputs (low temperature = high consistency)

### Error Handling Strategy
1. **Validation Errors** (invalid SQL, missing FROM): Logged, retried up to 2 times
2. **Execution Errors** (ClickHouse connection, timeout): Retried with exponential backoff
3. **Non-Critical Errors**: Attempt recovery, fallback to partial results
4. **Critical Errors**: Return error message to user

### Performance Optimizations
- **Schema Caching**: Summarize large schemas (>8000 tokens) to top 30 tables, 10 columns each
- **Query Caching**: Cache validated queries to avoid re-execution
- **Sample Data**: Include only first 3 rows per table in schema (sufficient for AI context)

## Testing & Debugging Guide

### Enable Debug Logging
```bash
export LITELLM_LOG=DEBUG
```

### Check Node Execution Order
- Look for log patterns: `"✅ [Node Name] completed"`
- Verify progress percentage increments: 10% → 30% → 35% → 50% → 55% → 80% → 100%

### Verify SQL Extraction
- Log message: `"⚠️ Extracted SQL from entire JSON object"` = JSON extraction worked
- Log message: `"✅ Extracted complete SQL block with FROM clause"` = Normal extraction

### Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| SQL contains JSON fields | LLM returned full JSON as string | Pydantic validator now handles this |
| "Missing FROM" error | Extraction stopped too early | Use robust regex with escaped quote handling |
| Query timeout | Large result set or slow query | Check LIMIT clause, optimize query with schema |
| No results after retries | SQL is still placeholder | Check placeholder pattern detection in validation_node.py |


