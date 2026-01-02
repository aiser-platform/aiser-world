import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrlForApi } from '@/utils/backendUrl';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const backendBase = getBackendUrlForApi();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Forward Authorization header if present
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const upstream = await fetch(`${backendBase}/ai/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        {
          success: false,
          error: `Backend error: ${upstream.status}`,
        },
        { status: upstream.status || 502 }
      );
    }

    // Proxy the streaming body directly (SSE-style text/event-stream)
    return new NextResponse(upstream.body as unknown as ReadableStream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('AI chat stream proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to proxy streaming request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


