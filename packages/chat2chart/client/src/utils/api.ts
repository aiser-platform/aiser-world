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
