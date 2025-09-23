/**
 * Intelligent Backend URL Resolver
 * 
 * This utility automatically determines the correct backend URL based on the environment:
 * - Production/Staging: Uses NEXT_PUBLIC_BACKEND_URL environment variable
 * - Local Docker: Uses Docker container hostname
 * - Local Development: Uses localhost
 * - On-Premise: Uses NEXT_PUBLIC_BACKEND_URL environment variable
 */

export const getBackendUrl = (): string => {
  // Priority 1: Explicit environment variable (production, staging, on-premise)
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }

  // Priority 2: Local development (default for local development)
  return 'http://localhost:8000';
};

export const getBackendUrlForApi = (): string => {
  // API routes always use localhost since they run on the same host
  return 'http://127.0.0.1:8000';
};
