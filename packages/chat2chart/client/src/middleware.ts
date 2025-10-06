import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Force dynamic rendering for all routes
export function middleware(request: NextRequest) {
  // Add headers to force dynamic rendering
  const response = NextResponse.next();
  
  // Force dynamic rendering
  response.headers.set('x-nextjs-data', '1');
  response.headers.set('x-nextjs-render', 'dynamic');
  
  return response;
}

// Apply to all routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    // Exclude API and Next.js static asset paths explicitly (with trailing slashes)
    '/((?!api/|_next/static/|_next/image/|favicon.ico).*)',
  ],
};
