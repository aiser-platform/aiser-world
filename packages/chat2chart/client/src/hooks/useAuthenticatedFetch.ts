import { useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchApi } from '@/utils/api';

/**
 * Hook that provides an authenticated fetch function.
 * Automatically adds Bearer token from Supabase session to requests.
 * 
 * Only works in client-side components (uses React hooks).
 * For server-side code, use fetchApi directly and pass Authorization header.
 * 
 * @returns An authenticated fetch function that automatically includes Bearer token
 */
export const useAuthenticatedFetch = () => {
  const { session } = useAuth();
  const token = session?.access_token;

  const authenticatedFetch = useCallback(
    async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
      const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
      };

      // Add Authorization header if token is available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      return fetchApi(endpoint, {
        ...options,
        headers,
      });
    },
    [token]
  );

  return authenticatedFetch;
};
