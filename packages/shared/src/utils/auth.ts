/**
 * Authentication utilities
 */

/**
 * Decode JWT token payload (client-side only, not for verification)
 */
export function decodeJwtPayload(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

/**
 * Check if JWT token is expired (client-side only)
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) {
    return true;
  }
  return Date.now() >= payload.exp * 1000;
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(token: string): Date | null {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) {
    return null;
  }
  return new Date(payload.exp * 1000);
}

/**
 * Storage utilities for auth tokens
 */
export const tokenStorage = {
  setTokens(accessToken: string, refreshToken: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aiser_world_access_token', accessToken);
      localStorage.setItem('aiser_world_refresh_token', refreshToken);
    }
  },

  getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('aiser_world_access_token');
    }
    return null;
  },

  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('aiser_world_refresh_token');
    }
    return null;
  },

  clearTokens() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('aiser_world_access_token');
      localStorage.removeItem('aiser_world_refresh_token');
    }
  },

  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    return token !== null && !isTokenExpired(token);
  },
};