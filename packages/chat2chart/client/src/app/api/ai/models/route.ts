import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrlForApi } from '@/utils/backendUrl';
import { extractAccessToken } from '@/utils/cookieParser';

/**
 * Proxy route for /api/ai/models
 * Forwards requests to the backend /ai/models endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const backendBase = getBackendUrlForApi();
    const backendUrl = `${backendBase}/ai/models`;
    
    // Extract access token
    const accessToken = extractAccessToken({
      cookies: request.cookies,
      headers: request.headers
    });
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Forward authorization
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    // Forward cookies
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { 
          success: false,
          error: errorText || `Backend error: ${response.status}`,
          detail: errorText
        },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
    
  } catch (error: any) {
    console.error('[api/ai/models] Proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to proxy request to backend',
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    );
  }
}





