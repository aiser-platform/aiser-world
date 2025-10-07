import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Only handle CORS preflight or add CORS headers for API routes.
  // Do not touch _next static assets or image optimization paths to avoid
  // interfering with hashed asset requests.
  const pathname = request.nextUrl.pathname;

  // Allow OPTIONS for API routes with proper credentials handling
  if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin') || '*';
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // For API routes, ensure we include Access-Control-Allow-Origin and Credentials
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    const origin = request.headers.get('origin') || '*';
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    return response;
  }

  // For non-API and non-static requests, do not modify headers.
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/((?!_next/static/|_next/image/|favicon.ico).*)'],
};
