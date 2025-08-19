import Cookies from 'js-cookie';

export const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const AUTH_URL =
    process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:5000';

export const fetchApi = async (
    endpoint: string,
    options: RequestInit = {}
): Promise<Response> => {
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    // Get auth token from cookies
    const accessToken = Cookies.get('access_token');
    if (accessToken) {
        defaultHeaders['Authorization'] = `Bearer ${accessToken}`;
    }

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
