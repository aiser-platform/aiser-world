import Cookies from 'js-cookie';
import { getBackendUrl } from './backendUrl';

export const API_URL = getBackendUrl();

// Default AUTH_URL to the main API URL when not explicitly set in the environment.
// This makes dev workflows simpler (upgrade-demo and other dev helpers live on the chat2chart service).
export const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || API_URL;

export const fetchApi = async (
    endpoint: string,
    options: RequestInit = {}
): Promise<Response> => {
    const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Prefer server-set HttpOnly cookie token; avoid injecting Authorization header from client-side stored token
    // For enterprise flows where Authorization header is required, callers may set it explicitly.

    // Determine which base URL to use based on the endpoint
    const isAuthEndpoint = endpoint.startsWith('api/v1/enterprise/auth/') ||
                          endpoint.startsWith('enterprise/auth/') ||
                          endpoint.startsWith('api/v1/organizations/') ||
                          endpoint.startsWith('api/v1/projects/') ||
                          endpoint.startsWith('api/v1/pricing') ||
                          endpoint.startsWith('api/v1/ai-usage/');
    
    const baseUrl = isAuthEndpoint ? AUTH_URL : API_URL;

    const response = await fetch(`${baseUrl}/${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    });

    return response;
};
