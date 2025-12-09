import { NextRequest, NextResponse } from 'next/server';
import { extractAccessToken } from '@/utils/cookieParser';

/**
 * Catch-all proxy route for /api/auth/* endpoints
 * Forwards requests to the auth service
 */
export async function GET(
  request: NextRequest,
  context: { params?: any }
) {
  return handleAuthRequest(request, context, 'GET');
}

export async function POST(
  request: NextRequest,
  context: { params?: any }
) {
  return handleAuthRequest(request, context, 'POST');
}

export async function PUT(
  request: NextRequest,
  context: { params?: any }
) {
  return handleAuthRequest(request, context, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  context: { params?: any }
) {
  return handleAuthRequest(request, context, 'DELETE');
}

export async function PATCH(
  request: NextRequest,
  context: { params?: any }
) {
  return handleAuthRequest(request, context, 'PATCH');
}

async function handleAuthRequest(
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
    
    // Get auth service URL - similar logic to backendUrl
    // On server (SSR), use Docker service name
    // On client, use localhost or env var
    let authBaseUrl: string;
    if (typeof window !== 'undefined') {
      // Client-side: use localhost or env var
      authBaseUrl = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:5000';
    } else {
      // Server-side: use Docker service name
      authBaseUrl = process.env.NEXT_PUBLIC_AUTH_URL || 'http://auth-service:5000';
      // If env is localhost, map to Docker service
      if (authBaseUrl.includes('localhost') || authBaseUrl.includes('127.0.0.1')) {
        authBaseUrl = 'http://auth-service:5000';
      }
    }
    
    // Auth service routes: the API router is mounted at root, and user_router is at /users
    // So /api/auth/users/me should map to http://auth-service:5000/users/me
    // Special handling for logout - auth service has it at /logout, not /users/logout
    let backendUrl: string;
    if (path === 'logout') {
      backendUrl = `${authBaseUrl}/logout`;
    } else {
      // The path already includes 'users/me', so just prepend the base URL
      backendUrl = `${authBaseUrl}/${path}`;
    }
    
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
    
    // Add body for POST/PUT/PATCH requests
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
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
    
    // Create response with proper cookie handling
    const responseData = contentType.includes('application/json') 
      ? await response.json() 
      : await response.text();
    
    const newResponse = contentType.includes('application/json')
      ? NextResponse.json(responseData, { status: response.status })
      : NextResponse.json({ data: responseData }, { status: response.status });
    
    // Forward ALL Set-Cookie headers from backend to client
    // Multiple Set-Cookie headers need to be handled individually
    const setCookieHeaders: string[] = [];
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        // Clean cookie: remove Domain attribute and adjust for development
        let cleaned = value.trim();
        cleaned = cleaned.replace(/Domain=[^;]+;?\s?/gi, '');
        // In development, adjust SameSite and Secure flags
        if (process.env.NODE_ENV === 'development') {
          cleaned = cleaned.replace(/SameSite=None/gi, 'SameSite=Lax');
          cleaned = cleaned.replace(/Secure;?\s?/gi, '');
        }
        setCookieHeaders.push(cleaned);
      } else if (key.toLowerCase() !== 'content-encoding' && 
                 key.toLowerCase() !== 'content-length' &&
                 key.toLowerCase() !== 'transfer-encoding') {
        // Forward other headers except encoding/length which Next.js handles
        newResponse.headers.set(key, value);
      }
    });
    
    // Append each Set-Cookie header individually
    setCookieHeaders.forEach(cookie => {
      if (cookie) {
        newResponse.headers.append('Set-Cookie', cookie);
      }
    });
    
    // Log for debugging (only in development)
    if (process.env.NODE_ENV === 'development' && setCookieHeaders.length > 0) {
      console.log(`[auth proxy] Forwarded ${setCookieHeaders.length} Set-Cookie headers`);
    }

    return newResponse;
    
  } catch (error: any) {
    console.error(`[api/auth/${context?.params?.path}] Proxy error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to proxy request to auth service',
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    );
  }
}
