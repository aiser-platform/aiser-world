import { NextRequest, NextResponse } from 'next/server';
import { extractAccessToken } from '@/utils/cookieParser';

// Simple fallback for build time
const getBackendUrl = () => {
  try {
    // Dynamic import to avoid build issues
    const { getBackendUrlForApi } = require('@/utils/backendUrl');
    return getBackendUrlForApi();
  } catch {
    // Fallback for build time
    return 'http://127.0.0.1:8000';
  }
};

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        // When running on the Next server (inside the container), prefer the internal
        // docker service hostname so requests reach the chat2chart backend.
        // Use server-side backend resolution helper: prefer env, map localhost to internal service
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://chat2chart-server:8000';
        const targetBase = /localhost|127\.0\.0\.1/.test(String(backendUrl)) ? 'http://chat2chart-server:8000' : backendUrl;
        
        // CRITICAL: Forward authentication cookies and headers to backend
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        
        // Forward authorization header if present
        const authHeader = request.headers.get('Authorization');
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }
        
        // Forward all cookies (CRITICAL for JWT authentication)
        const cookieHeader = request.headers.get('Cookie');
        if (cookieHeader) {
            headers['Cookie'] = cookieHeader;
        }
        
        // Debug: Log what we have
        console.log('[conversations/route POST] Debug info:');
        console.log('  - Cookie header present:', !!cookieHeader);
        console.log('  - Cookie header length:', cookieHeader?.length || 0);
        console.log('  - Cookie header preview:', cookieHeader?.substring(0, 200) || 'none');
        console.log('  - Next.js cookies available:', !!request.cookies);
        if (request.cookies) {
            const c1 = request.cookies.get('access_token');
            const c2 = request.cookies.get('c2c_access_token');
            console.log('  - Next.js access_token cookie:', c1 ? `length ${c1.value?.length || 0}` : 'not found');
            console.log('  - Next.js c2c_access_token cookie:', c2 ? `length ${c2.value?.length || 0}` : 'not found');
        }
        
        // Extract access token using reliable cookie parser
        const accessToken = extractAccessToken({
            cookies: request.cookies,
            headers: request.headers
        });
        
        // CRITICAL: Only set Authorization header if we have a valid token
        // Never set "Bearer null" - this causes authentication failures
        if (accessToken && accessToken !== 'null' && accessToken.length > 50 && !authHeader) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        } else if (!authHeader) {
            // If we don't have a valid token, don't set Authorization header at all
            // The backend will use cookies directly
            console.warn('[conversations/route POST] No valid access token found, relying on Cookie header for authentication');
        }
        
        const response = await fetch(`${targetBase.replace(/\/$/, '')}/conversations/?${searchParams.toString()}`, {
            method: 'GET',
            headers,
            credentials: 'include',
        });
        
        if (!response.ok) {
            console.error('conversations list: backend responded', response.status);
            // return a safe empty result to avoid breaking the UI
            return NextResponse.json({ items: [], pagination: { total: 0, offset: 0, limit: 0, has_more: false, total_pages: 0, current_page: 0 } });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to fetch conversations:', error);
        return NextResponse.json({ items: [], pagination: { total: 0, offset: 0, limit: 0, has_more: false, total_pages: 0, current_page: 0 } });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://chat2chart-server:8000';
        // Ensure server-side resolves localhost/env to internal docker service
        const targetBase = /localhost|127\.0\.0\.1/.test(String(backendUrl)) ? 'http://chat2chart-server:8000' : backendUrl;
        
        // CRITICAL: Forward authentication cookies and headers to backend
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        
        // Forward authorization header if present
        const authHeader = request.headers.get('Authorization');
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }
        
        // Forward all cookies (CRITICAL for JWT authentication)
        const cookieHeader = request.headers.get('Cookie');
        if (cookieHeader) {
            headers['Cookie'] = cookieHeader;
        }
        
        // Debug: Log what we have
        console.log('[conversations/route POST] Debug info:');
        console.log('  - Cookie header present:', !!cookieHeader);
        console.log('  - Cookie header length:', cookieHeader?.length || 0);
        console.log('  - Cookie header preview:', cookieHeader?.substring(0, 200) || 'none');
        console.log('  - Next.js cookies available:', !!request.cookies);
        if (request.cookies) {
            const c1 = request.cookies.get('access_token');
            const c2 = request.cookies.get('c2c_access_token');
            console.log('  - Next.js access_token cookie:', c1 ? `length ${c1.value?.length || 0}` : 'not found');
            console.log('  - Next.js c2c_access_token cookie:', c2 ? `length ${c2.value?.length || 0}` : 'not found');
        }
        
        // Extract access token using reliable cookie parser
        const accessToken = extractAccessToken({
            cookies: request.cookies,
            headers: request.headers
        });
        
        // CRITICAL: Only set Authorization header if we have a valid token
        // Never set "Bearer null" - this causes authentication failures
        if (accessToken && accessToken !== 'null' && accessToken.length > 50 && !authHeader) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        } else if (!authHeader) {
            // If we don't have a valid token, don't set Authorization header at all
            // The backend will use cookies directly
            console.warn('[conversations/route POST] No valid access token found, relying on Cookie header for authentication');
        }
        
        const response = await fetch(`${targetBase.replace(/\/$/, '')}/conversations`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify(body),
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || errorData.detail || `Backend responded with ${response.status}`;
            console.error(`[conversations/route POST] Backend error ${response.status}:`, errorMessage);
            // Forward the backend's status code instead of always returning 500
            return NextResponse.json(
                { 
                    error: 'Failed to create conversation',
                    message: errorMessage
                },
                { status: response.status }
            );
        }
        
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[conversations/route POST] Exception:', error);
        // Only return 500 for actual exceptions, not backend errors
        return NextResponse.json(
            { 
                error: 'Failed to create conversation',
                message: error.message || 'Failed to create conversation'
            },
            { status: 500 }
        );
    }
}
