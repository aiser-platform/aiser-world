export const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/';

export const fetchApi = async (
    endpoint: string,
    options: RequestInit = {}
): Promise<Response> => {
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    });

    return response;
};

export const AUTH_URL =
    process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://localhost:8000/';

export const fetchAuthApi = async (
    endpoint: string,
    options: RequestInit = {}
): Promise<Response> => {
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    const response = await fetch(`${AUTH_URL}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    });

    return response;
};
