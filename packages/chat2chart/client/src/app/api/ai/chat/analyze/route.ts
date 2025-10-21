import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrlForApi } from '@/utils/backendUrl';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Forward the request to the backend using dynamic backend URL
    const backendBase = getBackendUrlForApi();
    const response = await fetch(`${backendBase}/ai/chat/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

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
