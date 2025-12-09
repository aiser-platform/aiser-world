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
  // If running in the browser, derive from current origin to avoid unreachable container DNS
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    // Allow runtime override decided by connectivity checks
    try {
      const override = window.localStorage.getItem('aiser_api_base');
      if (override) return override;
    } catch {}
    // Normalize 127.0.0.1 to localhost to avoid mixed cookie/host quirks
    const host = hostname === '127.0.0.1' ? 'localhost' : hostname;
    const apiPort = '8000';
    return `${protocol}//${host}:${apiPort}`;
  }
  // On the server (SSR), prefer explicit env
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    const envUrl = String(process.env.NEXT_PUBLIC_BACKEND_URL).trim();
    // If env was set to localhost/127.0.0.1 (common on dev host), map to the
    // internal docker service hostname so server-side requests reach the
    // chat2chart backend container instead of trying to connect to localhost
    // inside the Next.js container (which would be the Next server itself).
    if (/localhost|127\.0\.0\.1/.test(envUrl)) {
      return 'http://chat2chart-server:8000';
    }
    return envUrl;
  }
  // Fallback for SSR inside docker network
  return 'http://chat2chart-server:8000';
};

export const getBackendUrlForApi = (): string => {
  // Use browser-derived URL on client
  if (typeof window !== 'undefined') {
    return getBackendUrl();
  }
  // Use Docker service name for server-side requests
  return 'http://chat2chart-server:8000';
};
