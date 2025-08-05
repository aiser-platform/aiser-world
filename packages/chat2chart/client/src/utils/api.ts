export const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/';

export const AUTH_URL =
    process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:5000';

export const fetchApi = async (
    endpoint: string,
    options: RequestInit = {}
): Promise<Response> => {
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    // Determine which base URL to use based on the endpoint
    const isAuthEndpoint = endpoint.startsWith('users/') || 
                          endpoint.startsWith('auth/') ||
                          endpoint.includes('sign-in') ||
                          endpoint.includes('sign-up') ||
                          endpoint.includes('signin') ||
                          endpoint.includes('signup');
    
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
