import Cookies from 'js-cookie';
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

export const fetchApi = async (
    endpoint: string,
    options: RequestInit = {}
): Promise<Response> => {
    // If AuthContext hasn't finished initializing, wait up to 1s for it to complete.
    // This prevents firing authenticated requests that would otherwise arrive without
    // the server-set HttpOnly cookie due to initialization race conditions.
    try {
        if (typeof window !== 'undefined' && !(window as any).__aiser_auth_initialized) {
            const start = Date.now();
            while (!(window as any).__aiser_auth_initialized && Date.now() - start < 1000) {
                // small yield
                // eslint-disable-next-line no-await-in-loop
                await new Promise((r) => setTimeout(r, 50));
            }
        }
    } catch (e) {
        // swallow
    }
    const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Prefer server-set HttpOnly cookie token; avoid injecting Authorization header from client-side stored token
    // For enterprise flows where Authorization header is required, callers may set it explicitly.

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
    // at `/api/auth/...` to ensure cookies are attached by the browser.
    const url = isAuthEndpoint && typeof window !== 'undefined' ? `/api/auth/${normalizedEndpoint}` : `${baseUrl}/${normalizedEndpoint}`;

    // Debugging aid: when running in the browser, log outgoing auth requests and
    // current document.cookie to the debug endpoint so we can trace missing cookies
    // that cause /api/auth/users/me to return 403 during initialization.
    try {
        if (typeof window !== 'undefined') {
            // Lightweight console log
            if (isAuthEndpoint) {
                // eslint-disable-next-line no-console
                console.debug('fetchApi: calling auth endpoint', url, 'document.cookie=', typeof document !== 'undefined' ? document.cookie : '');
                // fire-and-forget debug POST so server logs the client cookie state
                try {
                    void fetch('/api/debug/client-error', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ event: 'client_auth_probe', url, cookie: typeof document !== 'undefined' ? document.cookie : '' })
                    });
                } catch (e) {
                    // swallow
                }
            }
        }
    } catch (e) {
        // swallow
    }

    const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
            ...defaultHeaders,
            // If an access token was stored as a fallback in localStorage (dev only),
            // use it as a Bearer Authorization header for requests where cookies
            // may not be reliably sent by the browser.
            ...(typeof window !== 'undefined' && !((options.headers || {}) as any).Authorization
                ? { Authorization: `Bearer ${localStorage.getItem('aiser_access_token') || ''}` }
                : {}),
            ...options.headers,
        },
    });

    return response;
};
