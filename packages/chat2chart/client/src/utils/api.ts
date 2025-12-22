import { getBackendUrl } from './backendUrl';

// When running in the browser prefer same-origin proxy so all frontend calls
// go through `/api/...` and benefit from cookie forwarding and CORS handling.
export const API_URL = ((): string => {
    if (typeof window !== 'undefined') return '/api';
    return getBackendUrl();
})();

// Default AUTH_URL to the auth service port when not explicitly set in the environment.
// This makes dev workflows simpler (upgrade-demo and other dev helpers live on the chat2chart service).
// Default AUTH_URL: prefer explicit NEXT_PUBLIC_AUTH_URL, otherwise default to the auth service dev port
export const AUTH_URL = (() => {
    if (typeof window !== 'undefined') {
        // derive auth host from current hostname to ensure cookies match
        const host = window.location.hostname === '127.0.0.1' ? 'localhost' : window.location.hostname;
        const protocol = window.location.protocol;
        const authPort = process.env.NEXT_PUBLIC_AUTH_PORT || '5000';
        return `${protocol}//${host}:${authPort}`;
    }
    return process.env.NEXT_PUBLIC_AUTH_URL || 'http://auth-service:5000';
})();

/**
 * Basic API fetch utility.
 * 
 * Note: This is a basic utility that doesn't handle authentication.
 * For client-side components, use `useAuthenticatedFetch` hook instead.
 * For server-side code, pass Authorization header explicitly in options.
 * 
 * @param endpoint - API endpoint path
 * @param options - Fetch options (headers should include Authorization if needed)
 * @returns Fetch Response
 */
export const fetchApi = async (
    endpoint: string,
    options: RequestInit = {}
): Promise<Response> => {
    const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Normalize endpoint: remove leading/trailing slashes and handle double 'api/' prefix
    let normalizedEndpoint = endpoint.replace(/^\/+/, '').replace(/\/+$/, '');
    // If endpoint already starts with 'api/', remove it to avoid double prefix when API_URL is '/api'
    if (normalizedEndpoint.startsWith('api/') && API_URL === '/api') {
        normalizedEndpoint = normalizedEndpoint.substring(4); // Remove 'api/' prefix
    }

    // Determine which base URL to use based on the endpoint
    const isAuthEndpoint = normalizedEndpoint.startsWith('v1/enterprise/auth/') ||
                          normalizedEndpoint.startsWith('enterprise/auth/') ||
                          normalizedEndpoint.startsWith('v1/organizations/') ||
                          normalizedEndpoint.startsWith('v1/projects/') ||
                          normalizedEndpoint.startsWith('v1/pricing') ||
                          normalizedEndpoint.startsWith('v1/ai-usage/');
    
    const baseUrl = isAuthEndpoint ? (typeof window !== 'undefined' ? '' : AUTH_URL) : API_URL;

    // When calling auth endpoints from the browser, use the same-origin proxy
    // at `/api/auth/...` to ensure proper routing.
    const url = isAuthEndpoint && typeof window !== 'undefined' ? `/api/auth/${normalizedEndpoint}` : `${baseUrl}/${normalizedEndpoint}`;

    const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    });

    return response;
};
