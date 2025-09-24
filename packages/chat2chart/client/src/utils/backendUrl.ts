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
  // Priority 1: Explicit environment v
  // 
  // ariable (production, staging, on-premise)
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }
  // Priority 2: Local development (browser needs localhost), fall back to Docker host for server-only environments
  if (process.env.NODE_ENV === 'development') {
    // Use localhost so browser and container-origin cookie host match (localhost vs 127.0.0.1 mismatch)
    return 'http://localhost:8000';
  }

  // Production / containerized default
  return 'http://aiser-chat2chart-dev:8000';
};

export const getBackendUrlForApi = (): string => {
  // API routes always use localhost since they run on the same host
  return 'http://127.0.0.1:8000';
};
