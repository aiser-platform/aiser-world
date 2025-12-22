import { NextRequest, NextResponse } from 'next/server';

const getBackendUrl = () => {
  const env = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
  if (env && /localhost|127\.0\.0\.1/.test(env)) return 'http://chat2chart-server:8000';
  return env || 'http://chat2chart-server:8000';
};

export async function GET(request: NextRequest) {
  try {
    const backendUrl = getBackendUrl();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Forward Authorization header if present
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const response = await fetch(`${backendUrl}/api/organizations`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });
    
    if (!response.ok) {
      console.error(`[api/organizations] Backend error ${response.status}`);
      return NextResponse.json(
        { error: 'Failed to fetch organizations' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[api/organizations] Exception:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations', message: error.message },
      { status: 500 }
    );
  }
}





