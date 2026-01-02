import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrlForApi } from '@/utils/backendUrl';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Forward the request to the backend using dynamic backend URL
    const backendBase = getBackendUrlForApi();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Forward Authorization header if present
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    // Check if streaming is requested
    const isStreaming = body.stream === true || (body.user_context && body.user_context.stream === true);
    if (isStreaming) {
      headers['Accept'] = 'text/event-stream';
    }
    
    // Forward to the correct backend endpoint: /ai/chat/analyze
    const response = await fetch(`${backendBase}/ai/chat/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Backend error: ${response.status} - ${errorText}`);
    }

    // Check if response is streaming (SSE)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream') || isStreaming) {
      // Return streaming response - pass through the stream
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    // Non-streaming response - parse as JSON
    const result = await response.json();
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI chat analyze error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to analyze request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
