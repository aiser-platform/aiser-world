# Structured Outputs Implementation Guide

## Overview

This document describes the implementation of Pydantic models with LangChain's StructuredOutputParser for robust, type-safe AI agent outputs. This ensures:

- **Type Safety**: All outputs are validated against Pydantic schemas
- **Guaranteed Fields**: Required fields are always present
- **Robust Data Flow**: Type-safe data passing between agents
- **Complete Tracking**: All fields are saved and missing fields are tracked
- **Error Detection**: Validation errors are caught and logged

## Architecture

### 1. Pydantic Models (`app/modules/ai/schemas/agent_outputs.py`)

Defines structured output models for all agents:

- `ChartGenerationOutput`: Chart generation results
- `InsightsOutput`: Business insights and recommendations
- `SQLGenerationOutput`: SQL query generation results
- `QueryExecutionOutput`: Query execution results
- `UnifiedChartInsightsOutput`: Combined chart + insights
- `CompleteAgentOutput`: Complete orchestrator output
- `AgentResultMetadata`: Execution metadata with field tracking

### 2. Structured Output Handler (`app/modules/ai/utils/structured_output.py`)

Utility class that:
- Wraps Pydantic models with LangChain's `PydanticOutputParser`
- Provides robust parsing with fallback handling
- Extracts partial data when full parsing fails
- Tracks parsing errors and missing fields

### 3. Agent Implementation

Agents use `StructuredOutputHandler` to:
- Generate prompts with format instructions
- Parse LLM outputs into Pydantic models
- Handle validation errors gracefully
- Return structured, validated outputs

## Usage Example

### Chart Generation Agent

```python
from app.modules.ai.utils.structured_output import StructuredOutputHandler
from app.modules.ai.schemas.agent_outputs import ChartGenerationOutput

# Initialize handler
handler = StructuredOutputHandler(ChartGenerationOutput)

# Create prompt with format instructions
prompt = handler.create_prompt_with_schema(base_prompt)

# Execute LLM and parse
llm_output = await llm.ainvoke(prompt)
structured_output, error_info = handler.parse_output(llm_output)

if structured_output:
    # Successfully parsed - guaranteed to have all required fields
    chart_config = structured_output.echarts_config
    confidence = structured_output.confidence
    reasoning = structured_output.reasoning
else:
    # Parsing failed - use fallback
    logger.warning(f"Parsing failed: {error_info}")
```

## Benefits

### 1. Type Safety

```python
# Before: Manual extraction, fragile
chart_config = result.get("echarts_config")  # Could be None, wrong type, etc.

# After: Type-safe, validated
chart_config: EChartsConfigModel = structured_output.echarts_config  # Guaranteed to exist and be correct type
```

### 2. Guaranteed Fields

```python
# Pydantic ensures all required fields are present
class ChartGenerationOutput(BaseModel):
    success: bool  # Required
    chart_type: ChartType  # Required
    echarts_config: EChartsConfigModel  # Required
    confidence: float  # Required, validated 0-1
    reasoning: str  # Required
```

### 3. Complete Field Tracking

```python
# All fields are saved to database with presence tracking
message_metadata = {
    "sql_query": ...,
    "echarts_config": ...,
    "insights": ...,
    "fields_present": {
        "sql_query": True,
        "echarts_config": True,
        "insights": False  # Track what's missing
    },
    "fields_missing": ["insights"]  # List of missing fields
}
```

### 4. Robust Error Handling

```python
# StructuredOutputHandler provides:
- Validation error detection
- Partial data extraction
- Fallback model creation
- Detailed error logging
```

## Migration Strategy

### Phase 1: Add Structured Outputs (Current)

1. ✅ Created Pydantic models for all agent outputs
2. ✅ Created StructuredOutputHandler utility
3. ✅ Created example StructuredChartGenerationAgent
4. ✅ Updated message saving to track all fields

### Phase 2: Integrate with Existing Agents

1. Update `IntelligentChartGenerationAgent` to use structured outputs
2. Update `BusinessInsightsAgent` to use structured outputs
3. Update `EnhancedNL2SQLAgent` to use structured outputs
4. Update `UnifiedChartInsightsAgent` to use structured outputs

### Phase 3: Update Orchestrator

1. Use `CompleteAgentOutput` model in orchestrator
2. Validate all agent outputs against Pydantic models
3. Track missing fields in orchestrator result
4. Return structured `CompleteAgentOutput` to API

### Phase 4: Frontend Integration

1. Update frontend to handle structured outputs
2. Display field presence status
3. Show missing fields to users
4. Handle validation errors gracefully

## Field Tracking

All fields are tracked in `ai_metadata`:

```json
{
  "sql_query": "...",
  "echarts_config": {...},
  "insights": [...],
  "fields_present": {
    "sql_query": true,
    "echarts_config": true,
    "insights": false
  },
  "fields_missing": ["insights"],
  "timestamp": "2025-01-09T..."
}
```

This allows:
- Debugging: See exactly what fields are present/missing
- Monitoring: Track success rates for each component
- Analytics: Understand which agents fail most often
- User Feedback: Show users what's available and what's missing

## Error Handling

### Validation Errors

When Pydantic validation fails:
1. Log detailed validation errors
2. Attempt partial data extraction
3. Create fallback model with available data
4. Track missing fields in metadata

### Parsing Errors

When JSON parsing fails:
1. Try to extract JSON from markdown code blocks
2. Try to find JSON objects in text
3. Use fallback data if provided
4. Return error information in metadata

## Best Practices

1. **Always use Pydantic models** for agent outputs
2. **Track all fields** in database metadata
3. **Log missing fields** for debugging
4. **Provide fallbacks** when parsing fails
5. **Validate early** - catch errors at agent level
6. **Use type hints** throughout the codebase

## Performance Considerations

- Structured parsing adds minimal overhead (~10-50ms)
- Validation errors are caught early, saving downstream processing
- Type safety prevents runtime errors
- Complete field tracking enables better debugging

## Next Steps

1. Integrate structured outputs into all agents
2. Update orchestrator to use `CompleteAgentOutput`
3. Add field tracking dashboard
4. Implement field presence alerts
5. Create analytics on field success rates

