import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrlForApi } from '@/utils/backendUrl';
import { extractAccessToken } from '@/utils/cookieParser';

/**
 * Catch-all proxy route for /api/queries/* endpoints
 * Forwards requests to the backend FastAPI server
 */
export async function GET(
  request: NextRequest,
  context: { params?: any }
) {
  return handleQueriesRequest(request, context, 'GET');
}

export async function POST(
  request: NextRequest,
  context: { params?: any }
) {
  return handleQueriesRequest(request, context, 'POST');
}

export async function PUT(
  request: NextRequest,
  context: { params?: any }
) {
  return handleQueriesRequest(request, context, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  context: { params?: any }
) {
  return handleQueriesRequest(request, context, 'DELETE');
}

async function handleQueriesRequest(
  request: NextRequest,
  context: { params?: any },
  method: string
) {
  try {
    // Resolve params (may be a Promise in Next.js 15+)
    const rawParams = context?.params;
    const resolvedParams = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams;
    const pathSegments = resolvedParams?.path || [];
    const path = Array.isArray(pathSegments) ? pathSegments.join('/') : String(pathSegments || '');
    
    const backendBase = getBackendUrlForApi();
    const backendUrl = `${backendBase}/queries/${path}`;
    
    // Extract query string
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const fullUrl = queryString ? `${backendUrl}?${queryString}` : backendUrl;
    
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
    
    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers,
      credentials: 'include',
    };
    
    // Add body for POST/PUT requests
    if (method === 'POST' || method === 'PUT') {
      try {
        const body = await request.text();
        if (body) {
          requestOptions.body = body;
        }
      } catch (e) {
        // Body already consumed or not available
      }
    }
    
    const response = await fetch(fullUrl, requestOptions);
    
    // Handle response
    const contentType = response.headers.get('content-type') || '';
    
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
    
    // Return JSON response
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }
    
    // Return text response
    const text = await response.text();
    return NextResponse.json({ data: text }, { status: response.status });
    
  } catch (error: any) {
    console.error(`[api/queries/${context?.params?.path}] Proxy error:`, error);
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

