# LLM Failure and Message Persistence Fixes

## Issues Identified

### 1. LLM Returning Empty Content
**Problem**: LLM is returning empty content, triggering fallback messages instead of actual analysis.

**Root Causes**:
- LLM response may have `content` as `None` instead of empty string
- Response structure may vary (content vs text vs message attribute)
- API issues with Azure OpenAI (rate limits, quota, configuration)

**Fixes Applied**:
- Enhanced error handling in `litellm_service.py` to check for `None` content
- Added checks for different response structures (content, text, message attributes)
- Better logging to identify exact issue (type, structure, available attributes)
- Improved retry logic with different parameters

**Next Steps**:
- Check Azure OpenAI API logs for rate limits or quota issues
- Verify API keys and endpoint configuration
- Consider adding exponential backoff for retries
- Monitor API response times and error rates

### 2. Messages Not Saved in Real-Time
**Problem**: Messages are only saved at the END of the workflow, not during streaming or in real-time.

**Impact**:
- If workflow fails, messages are lost
- Users don't see messages until entire workflow completes
- No incremental updates during long-running analyses

**Fixes Applied**:
- Added real-time message saving when workflow completes (during streaming)
- Added fallback saving after stream ends
- Messages now saved immediately when workflow completes, not just at final return

**Still Needed**:
- Save user message immediately when query starts (before workflow begins)
- Save incremental updates during streaming (partial results)
- Add message saving at key workflow stages (SQL generated, chart created, etc.)

### 3. AI Metadata Not Saved
**Problem**: Chart config, insights, recommendations stored in `ai_metadata` field but not being saved.

**Impact**:
- Charts don't render when conversation is reloaded
- Insights and recommendations are lost
- SQL queries not preserved

**Fixes Applied**:
- Now properly saves `ai_metadata` with:
  - `echarts_config` / `chartConfig`
  - `insights`
  - `recommendations`
  - `sql_query`
  - `query_result_count`
  - `execution_metadata`
- Enhanced logging to show what metadata is being saved

### 4. Message Loss on Workflow Failure
**Problem**: If workflow fails, messages are never saved because saving only happens at the end.

**Fixes Applied**:
- Added try-catch around message saving (non-critical, won't fail workflow)
- Save messages even if workflow partially completes
- Added saving in multiple places (during streaming, after stream end, at final return)

## Code Changes

### `langgraph_orchestrator.py`
1. **Enhanced `_save_conversation_messages`**:
   - Now saves `ai_metadata` with all chart/insight/recommendation data
   - Better error handling (non-critical failures)

2. **Real-time saving during streaming**:
   - Save messages when workflow completes during streaming (line ~1958)
   - Save messages after stream ends as fallback (line ~2010)

3. **Better error handling**:
   - Message saving failures don't fail the workflow
   - Logged as warnings, not errors

### `litellm_service.py`
1. **Enhanced content extraction**:
   - Checks for `None` content
   - Handles different response structures (content, text, message)
   - Better logging to identify exact issue

2. **Improved error messages**:
   - Shows available attributes when content not found
   - Logs content type and length for debugging

## Testing Recommendations

1. **Test LLM Empty Content**:
   - Monitor logs for "Empty content in AI response"
   - Check Azure OpenAI API status
   - Verify API keys and configuration
   - Test with different models

2. **Test Message Persistence**:
   - Send query and check database immediately
   - Verify messages saved during streaming
   - Test with workflow failures
   - Verify AI metadata is saved correctly

3. **Test Real-time Updates**:
   - Check messages appear in UI during streaming
   - Verify charts render after reload
   - Test with multiple queries in same conversation

## Remaining Issues

1. **User Message Not Saved Immediately**:
   - Currently only saved when AI response is saved
   - Should be saved immediately when query starts

2. **Incremental Updates Not Saved**:
   - Partial results during streaming not saved
   - Only final result is saved

3. **LLM Root Cause Unknown**:
   - Need to investigate why LLM returns empty content
   - May be API configuration, rate limits, or model issues

## Next Steps

1. Add immediate user message saving when query starts
2. Add incremental message updates during streaming
3. Investigate LLM empty content root cause
4. Add monitoring/alerting for message save failures
5. Add retry logic for message saving
6. Consider using message queue for reliable persistence

