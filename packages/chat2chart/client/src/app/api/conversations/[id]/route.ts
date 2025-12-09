import { NextRequest, NextResponse } from 'next/server';
import { extractAccessToken } from '@/utils/cookieParser';

// Use server-safe backend resolution: map localhost->internal service when SSR
const BACKEND_URL = ((): string => {
    const env = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
    if (env && /localhost|127\.0\.0\.1/.test(env)) return 'http://chat2chart-server:8000';
    return env || 'http://chat2chart-server:8000';
})();

export async function GET(request: NextRequest, context: { params?: any }) {
    // Resolve params which may be a Promise in some Next.js type scenarios
    const rawParams = context?.params;
    const resolvedParams = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams;
    const id = resolvedParams?.id;
    try {
        const { searchParams } = new URL(request.url);
        
        // Forward all cookies and auth headers
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        
        // Forward authorization header if present
        const authHeader = request.headers.get('Authorization');
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }
        
        // Forward all cookies
        const cookieHeader = request.headers.get('Cookie');
        if (cookieHeader) {
            headers['Cookie'] = cookieHeader;
        }
        
        const response = await fetch(`${BACKEND_URL}/conversations/${id}?${searchParams.toString()}`, {
            method: 'GET',
            headers,
            credentials: 'include',
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || errorData.detail || `Backend responded with ${response.status}`;
            console.error(`[conversations/[id]/GET] Backend error ${response.status}:`, errorMessage);
            // Forward the backend's status code instead of always returning 500
            return NextResponse.json(
                { 
                    error: 'Failed to fetch conversation',
                    message: errorMessage
                },
                { status: response.status }
            );
        }
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[conversations/[id]/GET] Exception:', error);
        // Only return 500 for actual exceptions, not backend errors
        return NextResponse.json(
            { 
                error: 'Failed to fetch conversation',
                message: error.message || 'Failed to fetch conversation'
            },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest, context: { params?: any }) {
    const rawParams = context?.params;
    const resolvedParams = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams;
    const id = resolvedParams?.id;
    try {
        const body = await request.json();
        
        // Forward all cookies and auth headers
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        
        // Forward authorization header if present
        const authHeader = request.headers.get('Authorization');
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }
        
        // Forward all cookies
        const cookieHeader = request.headers.get('Cookie');
        if (cookieHeader) {
            headers['Cookie'] = cookieHeader;
        }
        
        const response = await fetch(`${BACKEND_URL}/conversations/${id}`, {
            method: 'PUT',
            headers,
            credentials: 'include',
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || errorData.detail || `Backend responded with ${response.status}`);
        }
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Failed to update conversation:', error);
        return NextResponse.json(
            { 
                error: 'Failed to update conversation',
                message: error.message || 'Failed to update conversation'
            },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, context: { params?: any }) {
    const rawParams = context?.params;
    const resolvedParams = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams;
    const id = resolvedParams?.id;
    try {
        // Forward all cookies and auth headers
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        
        // Forward authorization header if present
        const authHeader = request.headers.get('Authorization');
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }
        
        // Forward all cookies (critical for authentication)
        const cookieHeader = request.headers.get('Cookie');
        if (cookieHeader) {
            headers['Cookie'] = cookieHeader;
        }
        
        const response = await fetch(`${BACKEND_URL}/conversations/${id}`, {
            method: 'DELETE',
            headers,
            credentials: 'include',
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || errorData.detail || `Backend responded with ${response.status}`;
            throw new Error(errorMessage);
        }
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Failed to delete conversation:', error);
        const statusCode = error.message?.includes('403') ? 403 : 500;
        return NextResponse.json(
            { 
                success: false,
                error: error.message || 'Failed to delete conversation',
                message: error.message || 'Failed to delete conversation'
            },
            { status: statusCode }
        );
    }
}

export async function POST(request: NextRequest, context: { params?: any }) {
    const rawParams = context?.params;
    const resolvedParams = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams;
    const id = resolvedParams?.id;
    try {
        const body = await request.json();
        
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
        
        // Extract access token using reliable cookie parser
        const accessToken = extractAccessToken({
            cookies: request.cookies,
            headers: request.headers
        });
        
        if (accessToken && !authHeader) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }
        
        const response = await fetch(`${BACKEND_URL}/conversations/${id}/messages`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            throw new Error(`Backend responded with ${response.status}`);
        }
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to add message to conversation:', error);
        return NextResponse.json({ error: 'Failed to add message to conversation' }, { status: 500 });
    }
}
