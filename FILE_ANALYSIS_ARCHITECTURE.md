# File Analysis Architecture

## Current Implementation

### Overview
File analysis is currently implemented as a **direct bypass** of LangGraph when a file data source is detected. It uses LLM (via LiteLLM) but not LangGraph orchestration.

### Flow

1. **Detection** (`api.py` line 209-225):
   - Checks if `data_source_id` corresponds to a file type
   - Detects file sources from in-memory registry or database
   - Sets `analysis_mode = "deep"` for file sources

2. **Routing** (`api.py` line 227-270):
   - When file source detected, **bypasses LangGraph**
   - Directly calls `AIOrchestrator._execute_file_analysis()`
   - Returns result without going through LangGraph workflow

3. **Execution** (`ai_orchestrator.py` line 893-998):
   - `_execute_file_analysis()` method:
     - Loads actual file data via `_load_actual_file_data()`
     - Analyzes data via `_analyze_file_data()` 
     - Generates chart via `_generate_chart_from_analysis()`
     - Uses LLM via `_get_ai_response()` (LiteLLM service)

4. **LLM Integration** (`ai_orchestrator.py` line 1938-1959):
   - Uses `LiteLLMService.generate_completion()` 
   - **Uses LLM but NOT LangGraph**
   - Hardcoded prompt templates in `_analyze_file_data()`

## Issues

### 1. **Not Using LangGraph**
- File analysis bypasses LangGraph completely
- No workflow orchestration, retry mechanisms, or state management
- Missing observability and error recovery features

### 2. **Hardcoded Prompts**
- Analysis prompt is hardcoded in `_analyze_file_analysis()` (line 1008-1025)
- No dynamic prompt generation based on query context
- Limited flexibility for different analysis types

### 3. **No Multi-Agent Coordination**
- Single method handles all analysis
- No specialized agents for different analysis aspects
- Missing collaborative agent workflows

## Recent Improvements (LLM-Driven Approach)

### Enhanced File Analysis (Implemented)
- **LLM-Driven Analysis**: Uses LLM to intelligently analyze any type of data file
- **Flexible Prompt Generation**: Dynamic prompts adapt to data characteristics and user queries
- **Data Characteristics Analysis**: Automatically detects data types (numeric, categorical, date, text)
- **Structured Insight Extraction**: Uses LLM to extract structured insights (not hardcoded)
- **Adaptive Approach**: LLM determines best analysis approach based on data type and query
- **Robust Results**: Handles various data formats and analysis needs flexibly

### Key Methods Added:
- `_analyze_data_characteristics()`: Analyzes data structure for LLM context
- `_format_sample_data_for_llm()`: Formats sample data for LLM consumption
- `_extract_structured_insights_with_llm()`: Uses LLM to extract structured insights
- Enhanced `_analyze_file_data()`: Now uses comprehensive LLM-driven prompts

## Recommended Future Improvements

### Option 1: Integrate with LangGraph (Long-term)
- Create a `file_analysis_node` in LangGraph workflow
- Route file sources through LangGraph with `analysis_mode="deep"`
- Use LangGraph's state management and retry mechanisms
- Maintain LLM integration via LiteLLM but orchestrate through LangGraph

### Option 2: Further Enhance Current Implementation
- Add more sophisticated data quality assessment via LLM
- Improve chart recommendation logic using LLM
- Add support for streaming analysis results
- Better handling of very large files (chunking, sampling strategies)

## Current LLM Usage

✅ **Using LLM**: Yes, via LiteLLM service
- `_get_ai_response()` calls `LiteLLMService.generate_completion()`
- Uses Azure GPT-5 Mini as default model

❌ **Using LangGraph**: No
- File analysis completely bypasses LangGraph
- Missing workflow orchestration benefits

## Next Steps

1. **Short-term**: Improve current implementation
   - Better prompt engineering
   - Enhanced error handling
   - More robust data loading

2. **Long-term**: Integrate with LangGraph
   - Create file analysis node in LangGraph workflow
   - Use LangGraph state management
   - Leverage retry mechanisms and observability

