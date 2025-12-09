/**
 * Utility to extract JWT tokens from cookies in Next.js API routes
 * Handles both Next.js cookie API and manual Cookie header parsing
 */

export function extractAccessToken(request: {
  cookies?: {
    get: (name: string) => { value: string } | undefined;
  };
  headers?: {
    get: (name: string) => string | null;
  };
}): string | null {
  let accessToken: string | null = null;

  // Method 1: Try Next.js cookie API
  if (request.cookies) {
    try {
      const cookie1 = request.cookies.get('access_token');
      const cookie2 = request.cookies.get('c2c_access_token');
      
      // Safely extract values, ensuring they're strings
      const token1 = cookie1?.value;
      const token2 = cookie2?.value;
      
      // Use the first valid token - check for null/undefined first
      if (token1 != null && typeof token1 === 'string' && token1 !== 'null' && token1.length > 20 && token1.includes('.')) {
        return token1;
      }
      if (token2 != null && typeof token2 === 'string' && token2 !== 'null' && token2.length > 20 && token2.includes('.')) {
        return token2;
      }
      
      // If we got tokens but they're invalid, log for debugging (safely)
      if (token1 != null || token2 != null) {
        const token1Info = token1 == null ? 'not found' : (token1 === 'null' ? 'null' : (typeof token1 === 'string' ? `length ${token1.length}` : `type ${typeof token1}`));
        const token2Info = token2 == null ? 'not found' : (token2 === 'null' ? 'null' : (typeof token2 === 'string' ? `length ${token2.length}` : `type ${typeof token2}`));
        console.debug('[cookieParser] Tokens found but invalid:', { token1: token1Info, token2: token2Info });
      }
    } catch (e) {
      console.debug('[cookieParser] Error reading Next.js cookies:', e);
    }
  }

  // Method 2: Parse from Cookie header manually (more reliable)
  const cookieHeader = request.headers?.get('Cookie');
  if (!accessToken && cookieHeader) {
    try {
      // Split by semicolon and parse each cookie
      const cookies = cookieHeader.split(';').map(c => c.trim());
      
      for (const cookie of cookies) {
        const equalIndex = cookie.indexOf('=');
        if (equalIndex === -1) continue;
        
        const name = cookie.substring(0, equalIndex).trim();
        let value = cookie.substring(equalIndex + 1).trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        // URL decode
        try {
          value = decodeURIComponent(value);
        } catch (e) {
          // If decoding fails, use as-is
        }
        
        // Check if this is an access token cookie
        if ((name === 'access_token' || name === 'c2c_access_token')) {
          // Log for debugging
          if (value && value !== 'null' && typeof value === 'string' && value.length > 20 && value.includes('.')) {
            console.log(`[cookieParser] Found valid token from Cookie header: ${name}, length: ${value.length}`);
            accessToken = value;
            break;
          } else {
            const valueInfo = value === 'null' ? 'null' : (value && typeof value === 'string' ? `length ${value.length}` : 'not a string');
            console.warn(`[cookieParser] Invalid token from Cookie header: ${name}, value: ${valueInfo}`);
          }
        }
      }
    } catch (error) {
      console.error('[cookieParser] Error parsing Cookie header:', error);
    }
  }
  
  // Final validation and logging
  if (!accessToken) {
    console.error('[cookieParser] No valid access token found. Cookie header present:', !!cookieHeader);
    if (cookieHeader) {
      console.error('[cookieParser] Cookie header preview:', cookieHeader.substring(0, 200));
    }
  }

  return accessToken;
}

