import { NextRequest, NextResponse } from 'next/server';

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
        
        // Forward authentication header to backend
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        
        // Forward Authorization header if present
        const authHeader = request.headers.get('Authorization');
        if (authHeader) {
            headers['Authorization'] = authHeader;
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
        
        // Forward authentication header to backend
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        
        // Forward Authorization header if present
        const authHeader = request.headers.get('Authorization');
        if (authHeader) {
            headers['Authorization'] = authHeader;
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
