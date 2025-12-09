/**
 * Secure Authentication Utilities
 * Provides secure token handling with validation and no leaks
 */

/**
 * Validates if a token is secure and valid
 * @param token - Token string to validate
 * @returns true if token is valid, false otherwise
 */
export function isValidToken(token: string | null | undefined): boolean {
  if (!token) return false;
  if (token === 'null' || token === 'undefined' || token === '') return false;
  // JWT tokens should be at least 50 characters (header.payload.signature)
  // Short tokens are likely invalid or test tokens
  if (token.length < 50) return false;
  // Basic JWT format check (should have 3 parts separated by dots)
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  return true;
}

/**
 * Gets secure authentication headers
 * Only includes Authorization header if token is valid
 * Prefers cookies for authentication (more secure)
 * @param includeAuthHeader - Whether to include Authorization header (default: false, prefers cookies)
 * @returns Headers object with secure authentication
 */
export function getSecureAuthHeaders(includeAuthHeader: boolean = false): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Only add Authorization header if explicitly requested and token is valid
  if (includeAuthHeader) {
    try {
      // Try multiple token storage locations (in order of preference)
      const token = 
        localStorage.getItem('aiser_access_token') ||
        localStorage.getItem('access_token') ||
        localStorage.getItem('token');
      
      if (isValidToken(token)) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      // If token is invalid, rely on cookies (credentials: 'include' handles this)
    } catch (error) {
      // Silently fail - rely on cookies for auth
      console.debug('SecureAuth: Could not access token storage');
    }
  }

  // Filter out undefined values to ensure type safety
  return Object.fromEntries(
    Object.entries(headers).filter(([_, value]) => value !== undefined)
  ) as Record<string, string>;
}

/**
 * Sanitizes error messages to prevent sensitive data leaks
 * @param error - Error object or string
 * @returns Sanitized error message safe for user display
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (!error) return 'An unexpected error occurred';
  
  if (typeof error === 'string') {
    // Remove potential token leaks
    return error
      .replace(/Bearer\s+[A-Za-z0-9\-._~+\/]+/gi, 'Bearer [REDACTED]')
      .replace(/token['":\s]*[A-Za-z0-9\-._~+\/]{20,}/gi, 'token: [REDACTED]')
      .replace(/Authorization['":\s]*[A-Za-z0-9\-._~+\/]+/gi, 'Authorization: [REDACTED]');
  }
  
  if (error instanceof Error) {
    return sanitizeErrorMessage(error.message);
  }
  
  return 'An unexpected error occurred';
}

/**
 * Checks if response indicates authentication failure
 * @param response - Fetch Response object
 * @returns true if authentication failed
 */
export function isAuthError(response: Response): boolean {
  return response.status === 401 || response.status === 403;
}

/**
 * Handles authentication errors securely
 * Clears invalid tokens and redirects to login
 */
export function handleAuthError(): void {
  try {
    // Clear all potential token storage locations
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('aiser_access_token');
    
    // Redirect to login after a short delay
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }, 1000);
  } catch (error) {
    console.error('Failed to handle auth error:', error);
  }
}

