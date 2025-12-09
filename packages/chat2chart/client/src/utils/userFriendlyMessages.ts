/**
 * Utility to convert technical backend messages to user-friendly messages
 */

export function makeMessageUserFriendly(message: string): string {
  if (!message) return 'Processing your request...';

  // Convert technical terms to user-friendly language
  const replacements: Array<[RegExp, string]> = [
    // Technical process names
    [/nl2sql/gi, 'query generation'],
    [/via LLM/gi, ''],
    [/Chart and insights generated via LLM/gi, 'Chart and insights generated'],
    [/generated via LLM/gi, 'generated'],
    [/SQL generation/gi, 'Preparing your query'],
    [/SQL validated/gi, 'Query validated'],
    [/SQL execution/gi, 'Running your query'],
    [/query execution/gi, 'Running your query'],
    [/query executed/gi, 'Query completed'],
    [/results validated/gi, 'Results verified'],
    [/generate_chart/gi, 'Creating visualization'],
    [/generate_insights/gi, 'Analyzing insights'],
    [/unified_chart_insights/gi, 'Finalizing visualization and insights'],
    [/route_query/gi, 'Analyzing your question'],
    [/sql_validated/gi, 'Query validated'],
    [/execute_query/gi, 'Running query'],
    [/validate_results/gi, 'Verifying results'],
    
    // Error messages
    [/ClickHouse HTTP query failed/gi, 'Database query error'],
    [/Syntax error/gi, 'Query syntax issue'],
    [/DB::Exception/gi, 'Database error'],
    [/SYNTAX_ERROR/gi, 'Syntax error'],
    [/Unmatched parentheses/gi, 'Query formatting issue'],
    [/failed at position/gi, 'Error at position'],
    [/Query execution failed/gi, 'Unable to execute query'],
    [/NameError/gi, 'System error'],
    [/is not defined/gi, 'configuration issue'],
    [/Workflow failed/gi, 'Processing failed'],
    [/Node error/gi, 'Processing step error'],
    
    // Progress messages
    [/Initializing workflow/gi, 'Starting analysis'],
    [/Starting workflow/gi, 'Starting analysis'],
    [/Processing\.\.\./gi, 'Analyzing your request'],
    [/Completed/gi, 'Analysis complete'],
  ];

  let friendlyMessage = message;

  // Apply replacements
  for (const [pattern, replacement] of replacements) {
    friendlyMessage = friendlyMessage.replace(pattern, replacement);
  }

  // Clean up extra spaces and formatting
  friendlyMessage = friendlyMessage
    .replace(/\s+/g, ' ')
    .replace(/\s*:\s*/g, ': ')
    .trim();

  // Capitalize first letter
  if (friendlyMessage.length > 0) {
    friendlyMessage = friendlyMessage.charAt(0).toUpperCase() + friendlyMessage.slice(1);
  }

  return friendlyMessage || 'Processing your request...';
}

export function makeProgressMessageUserFriendly(
  stage: string,
  message?: string
): string {
  const stageMessages: Record<string, string> = {
    'start': 'Starting analysis...',
    'initializing': 'Starting analysis...',  // Map initializing to same as start
    'route_query': 'Understanding your question...',
    'nl2sql': 'Preparing your query...',
    'nl2sql_complete': 'Query prepared',
    'validate_sql': 'Validating query...',
    'sql_validated': 'Query validated',
    'execute_query': 'Running your query...',
    'query_executed': 'Query completed',
    'validate_results': 'Verifying results...',
    'results_validated': 'Results verified',
    'generate_chart': 'Creating visualization...',
    'generate_insights': 'Analyzing insights...',
    'unified_chart_insights': 'Finalizing results...',
    'deep_file_analysis': 'Deep file analysis...',
    'deep_analysis_profiling': 'Profiling data structure...',
    'deep_analysis_planning': 'Planning analysis strategy...',
    'deep_analysis_execution': 'Executing analysis queries...',
    'deep_analysis_synthesis': 'Synthesizing results...',
    'deep_analysis_complete': 'Analysis complete!',
    'complete': 'Analysis complete!',
  };

  // If message is provided and not a duplicate of stage message, use it
  if (message && message.trim()) {
    const friendlyMessage = makeMessageUserFriendly(message);
    // Avoid duplicate: if message is same as stage message, use stage message only
    const stageMessage = stageMessages[stage] || 'Processing...';
    if (friendlyMessage.toLowerCase() === stageMessage.toLowerCase()) {
      return stageMessage;
    }
    return friendlyMessage;
  }

  return stageMessages[stage] || 'Processing...';
}

export function makeErrorMessageUserFriendly(error: string, context?: {
  stage?: string;
  query?: string;
}): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  // Handle JSON error responses
  let errorMessage = error;
  try {
    // Try to parse if it's a JSON string
    if (error.startsWith('{') || error.includes('"error"') || error.includes('"message"')) {
      const parsed = typeof error === 'string' ? JSON.parse(error) : error;
      if (parsed.error || parsed.message) {
        errorMessage = parsed.message || parsed.error || error;
        
        // Handle validation errors specifically
        if (parsed.error === 'validation_error' && parsed.details && Array.isArray(parsed.details)) {
          const validationIssues = parsed.details.map((d: any) => {
            if (d.loc && Array.isArray(d.loc)) {
              const field = d.loc[d.loc.length - 1];
              return `${field}: ${d.msg || 'Invalid value'}`;
            }
            return d.msg || 'Invalid input';
          }).join(', ');
          return `Please check your input: ${validationIssues}. Please try again with valid information.`;
        }
      }
    }
  } catch (e) {
    // Not JSON, use as-is
  }

  // Handle HTTP error format: "Backend error: 422 - {...}"
  if (errorMessage.includes('Backend error:')) {
    const match = errorMessage.match(/Backend error:\s*\d+\s*-\s*(.+)/);
    if (match && match[1]) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.error === 'validation_error' && parsed.details) {
          const validationIssues = parsed.details.map((d: any) => {
            if (d.loc && Array.isArray(d.loc)) {
              const field = d.loc[d.loc.length - 1];
              return `${field}: ${d.msg || 'Invalid value'}`;
            }
            return d.msg || 'Invalid input';
          }).join(', ');
          return `Please check your input: ${validationIssues}. Please try again with valid information.`;
        }
        if (parsed.message) {
          errorMessage = parsed.message;
        }
      } catch (e) {
        // Continue with original error
      }
    }
  }

  // Extract user-friendly error message
  let friendlyError = makeMessageUserFriendly(errorMessage);

  // Add context if available
  if (context?.stage) {
    const stageName = makeProgressMessageUserFriendly(context.stage);
    friendlyError = `Error during ${stageName.toLowerCase()}: ${friendlyError}`;
  }

  // Remove technical details that users don't need
  friendlyError = friendlyError
    .replace(/File ".*?"/g, '')
    .replace(/line \d+/gi, '')
    .replace(/\(version.*?\)/gi, '')
    .replace(/\(official build\)/gi, '')
    .replace(/Backend error:\s*\d+\s*-\s*/gi, '')
    .replace(/validation_error/gi, 'Input validation')
    .replace(/string_type/gi, 'text field')
    .replace(/Input should be a valid string/gi, 'Please provide valid text')
    .replace(/url.*?pydantic/gi, '')
    .trim();

  // Ensure it's a complete sentence
  if (!friendlyError.endsWith('.') && !friendlyError.endsWith('!') && !friendlyError.endsWith('?')) {
    friendlyError += '.';
  }

  return friendlyError || 'An unexpected error occurred. Please try again.';
}

