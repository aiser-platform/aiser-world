"use client";

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode, CSSProperties } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import LoadingScreen from '@/components/LoadingScreen/LoadingScreen';
import Cookies from 'js-cookie';
import { conversationSessionManager } from '@/services/conversationSessionManager';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  loading: boolean;
  initialized: boolean;
  authRetrying: boolean;
  authError: string | null;
  loginError: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (email: string, username: string, password: string) => Promise<{ success: boolean; is_verified: boolean; message: string; data?: any }>;
  logout: () => Promise<void>;
  verifyAuth: () => Promise<void>;
  setLoginError: (v: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [authRetrying, setAuthRetrying] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const userRef = useRef<any>(null);
  const fallbackTimerRef = useRef<number | ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (fallbackTimerRef.current) {
        try { clearTimeout(fallbackTimerRef.current as any); } catch (e) {}
        fallbackTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Sync global initialization flag and clear any stale authError when we obtain a user.
  useEffect(() => {
    try { if (typeof window !== 'undefined') (window as any).__aiser_auth_initialized = !!initialized; } catch (e) {}
    if (user) {
      try { setAuthError(null); } catch (e) {}
    }
  }, [initialized, user]);

  const verifyAuth = async (): Promise<void> => {
    setAuthError(null);
    setLoading(true);
    try {
      try { console.debug('verifyAuth: document.cookie=', typeof document !== 'undefined' ? document.cookie : 'no-doc'); } catch (e) {}
      // use no-store to avoid stale cached 304 responses on some browsers
      const res = await fetch('/api/auth/users/me', { method: 'GET', credentials: 'include', cache: 'no-store' });
      console.debug('verifyAuth: response.status=', res.status);
      if (res.status === 304) {
        // Not modified - try to use cached user from localStorage if available
        let cached = null;
        try { cached = localStorage.getItem('aiser_user'); } catch (e) { cached = null; }
        if (cached) {
          try {
            const data = JSON.parse(cached as string);
            // CRITICAL: Only use cached data if there's a valid token
            const hasToken = typeof document !== 'undefined' && 
              (document.cookie.includes('c2c_access_token') || document.cookie.includes('access_token'));
            if (hasToken && data && (data.id || data.user_id || data.email)) {
              if (mountedRef.current) setUser(data);
              try { userRef.current = data; } catch (e) {}
              setAuthError(null);
            } else {
              // No valid token or invalid cached data - clear it
              try { localStorage.removeItem('aiser_user'); } catch (e) {}
              if (mountedRef.current) setUser(null);
              setAuthError(`Authentication failed: No valid session`);
            }
          } catch (e) {
            console.warn('verifyAuth: failed to parse cached user', e);
            try { localStorage.removeItem('aiser_user'); } catch (e) {}
            if (mountedRef.current) setUser(null);
            setAuthError(`Authentication failed: 304 (no cached user)`);
          }
        } else {
          // force a fresh fetch without conditional headers
          const fresh = await fetch('/api/auth/users/me', { method: 'GET', credentials: 'include', cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
          if (fresh.ok) {
            const data = await fresh.json();
            if (mountedRef.current) setUser(data);
            try { userRef.current = data; } catch (e) {}
            setAuthError(null);
          } else {
            let body = '';
            try { body = await fresh.text(); } catch (e) {}
            console.warn('verifyAuth: fresh non-ok response', fresh.status, body);
            if (mountedRef.current) setUser(null);
            setAuthError(`Authentication failed: ${fresh.status} ${body}`);
          }
        }
      } else if (res.ok) {
        const data = await res.json();
        // CRITICAL: Validate user data before setting
        if (data && (data.id || data.user_id || data.email)) {
          if (mountedRef.current) {
            setUser(data);
            // CRITICAL: Store user in localStorage for profile display (but will be cleared on logout)
            try { 
              localStorage.setItem('aiser_user', JSON.stringify(data)); 
            } catch (e) {
              console.warn('Failed to store user in localStorage', e);
            }
          }
          try { userRef.current = data; } catch (e) {}
          setAuthError(null);
        } else {
          // Invalid user data - clear it
          if (mountedRef.current) setUser(null);
          try { userRef.current = null; } catch (e) {}
          setAuthError('Invalid user data received');
        }
      } else {
        let body = '';
        try { body = await res.text(); } catch (e) {}
        console.warn('verifyAuth: non-ok response', res.status, body);
        if (mountedRef.current) setUser(null);
        setAuthError(`Authentication failed: ${res.status} ${body}`);
      }
    } catch (e: any) {
      console.error('verifyAuth: error', e);
      setAuthError(String(e?.message || e));
      if (mountedRef.current) setUser(null);
    } finally {
      if (mountedRef.current) setLoading(false);
      if (mountedRef.current) setInitialized(true);
    }
  };

  // Session expiration check and auto-logout
  useEffect(() => {
    if (!user) return;
    
    // Check token expiration every 5 minutes
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/auth/users/me', { 
          method: 'GET', 
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (res.status === 401 || res.status === 403) {
          // Token expired or invalid - auto logout
          console.warn('Session expired, logging out...');
          clearInterval(interval);
          await logout();
          router.push('/login');
        }
      } catch (e) {
        console.error('Error checking token expiration:', e);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    // Single initialization flow with exponential backoff retries for transient errors
    let cancelled = false;
    const init = async () => {
      // CRITICAL: Check if logout is in progress - if so, don't auto-login
      if (typeof window !== 'undefined') {
        const logoutFlag = window.sessionStorage.getItem('logout_in_progress');
        if (logoutFlag === 'true') {
          // Check if logout was recent (within last 5 seconds) - if so, definitely don't auto-login
          const logoutTimestamp = window.sessionStorage.getItem('logout_timestamp');
          const now = Date.now();
          const logoutTime = logoutTimestamp ? parseInt(logoutTimestamp, 10) : 0;
          const timeSinceLogout = now - logoutTime;
          
          // If logout was recent (within 5 seconds), clear flag but don't auto-login
          if (timeSinceLogout < 5000) {
            console.log('🚫 Logout in progress, skipping auto-login');
            window.sessionStorage.removeItem('logout_in_progress');
            window.sessionStorage.removeItem('logout_timestamp');
            // CRITICAL: Also clear any remaining auth data
            try {
              window.localStorage.removeItem('aiser_user');
              window.localStorage.removeItem('aiser_access_token');
              // Clear all cookies one more time
              document.cookie.split(";").forEach((c) => {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
              });
            } catch (e) {}
            setUser(null);
            userRef.current = null;
            setInitialized(true);
            setLoading(false);
            setAuthError(null);
            return;
          } else {
            // Logout was more than 5 seconds ago, might be stale flag - clear it
            window.sessionStorage.removeItem('logout_in_progress');
            window.sessionStorage.removeItem('logout_timestamp');
          }
        }
      }
      
      setLoading(true);
      setAuthRetrying(true);
      try {
        const maxAttempts = 3;
        const baseDelay = 400;
        let success = false;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          // CRITICAL: Check logout flag again before each attempt
          if (typeof window !== 'undefined' && window.sessionStorage.getItem('logout_in_progress') === 'true') {
            cancelled = true;
            break;
          }
          
          try {
            const res = await fetch('/api/auth/users/me', { method: 'GET', credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (cancelled) return;
        // CRITICAL: Double-check logout flag before setting user
        if (typeof window !== 'undefined' && window.sessionStorage.getItem('logout_in_progress') === 'true') {
          cancelled = true;
          return;
        }
        setUser(data);
        userRef.current = data;
        // persist a lightweight marker so other guards don't immediately redirect
        try { localStorage.setItem('aiser_user', JSON.stringify(data)); localStorage.setItem('aiser_access_token', '1'); } catch (e) {}
        // clear fallback timer if auth succeeded before it fired
        try { if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current as any); fallbackTimerRef.current = null; } } catch (e) {}
        try { setAuthError(null); } catch (e) {}
        success = true;
        break;
      }
            if (res.status === 401 || res.status === 403) {
              // definitive unauthenticated
              if (cancelled) return;
              setUser(null);
              userRef.current = null;
              success = false;
              break;
            }
            // otherwise retry on 403/5xx
          } catch (err) {
            // network error -- retry
          }
          if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, attempt - 1)));
        }
        if (!success && !userRef.current) {
          setAuthError('Authentication check did not complete successfully');
        }
      } finally {
        setAuthRetrying(false);
        if (!cancelled) {
          setInitialized(true);
          setLoading(false);
        }
      }
    };

    init();

    // Fallback: ensure we don't block the app indefinitely; if user already present keep it
    fallbackTimerRef.current = setTimeout(() => {
      try {
        if (userRef.current) {
          console.debug('AuthContext: fallback fired but user already present — preserving authenticated state');
          if (fallbackTimerRef.current) { try { clearTimeout(fallbackTimerRef.current as any); } catch (e) {} fallbackTimerRef.current = null; }
          return;
        }
        if (!initialized) {
          console.warn('AuthContext: Fallback timeout reached, forcing initialization');
          // expose a short grace period so ProtectRoute doesn't redirect while
          // a late auth response may still arrive
          try { if (typeof window !== 'undefined') { (window as any).__aiser_auth_grace = Date.now(); } } catch (e) {}
          setInitialized(true);
          setLoading(false);
        }
      } catch (e) {}
    }, 7000);

    return () => {
      cancelled = true;
      if (fallbackTimerRef.current) {
        try { clearTimeout(fallbackTimerRef.current as any); } catch (e) {}
        fallbackTimerRef.current = null;
      }
    };
  }, []);

  const login = async (identifier: string, password: string) => {
    setLoginError(null);
    setLoading(true);
    
    // CRITICAL: Clear any cached user data before attempting login
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('aiser_user');
        window.localStorage.removeItem('aiser_access_token');
      }
      setUser(null);
      userRef.current = null;
    } catch (e) {
      console.warn('Failed to clear cached user before login', e);
    }
    
    try {
      const res = await fetch('/api/auth/users/signin', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
        cache: 'no-store', // Prevent caching
      });
      
      // CRITICAL: Check response status and body for actual success
      if (!res.ok) {
        let errorMessage = `Login failed: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage;
        } catch {
          const txt = await res.text();
          errorMessage = txt || errorMessage;
        }
        setLoginError(errorMessage);
        throw new Error(errorMessage);
      }
      
      // Parse response to verify it's actually successful
      let responseData;
      try {
        responseData = await res.json();
      } catch {
        // If response is not JSON, it's likely an error
        throw new Error('Invalid response from authentication service');
      }
      
      // Check if response indicates success
      if (responseData.error || responseData.detail || (responseData.success === false)) {
        const errorMsg = responseData.detail || responseData.message || responseData.error || 'Authentication failed';
        setLoginError(errorMsg);
        throw new Error(errorMsg);
      }
      
      // CRITICAL: Clear old user data before verifying new login
      setUser(null);
      userRef.current = null;
      
      // retry verifyAuth a few times to avoid race where cookie isn't available immediately
      let verified = false;
      for (let i = 0; i < 4; i++) {
        await verifyAuth();
        if (userRef.current) { 
          verified = true; 
          // CRITICAL: Verify the user ID matches the login (not cached old user)
          const currentUser = userRef.current;
          if (currentUser && (currentUser.email === identifier || currentUser.username === identifier)) {
            break;
          } else {
            // User doesn't match - clear and retry
            setUser(null);
            userRef.current = null;
            verified = false;
          }
        }
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 150 * (i + 1)));
      }
      
      // Final verification: ensure we have a valid user
      if (!verified || !userRef.current) {
        setLoginError('Failed to verify authentication after login');
        throw new Error('Failed to verify authentication after login');
      }
      
      // set a short client-side grace timestamp to prevent redirect races
      try { if (typeof window !== 'undefined') (window as any).__aiser_auth_grace = Date.now(); } catch (e) {}
    } catch (error: any) {
      // Ensure user is cleared on error
      setUser(null);
      userRef.current = null;
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('aiser_user');
        window.localStorage.removeItem('aiser_access_token');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, username: string, password: string) => {
    setLoginError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/users/signup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });
      if (!res.ok) {
        let errorMessage = `Signup failed: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          const txt = await res.text();
          errorMessage = txt || errorMessage;
        }
        setLoginError(errorMessage);
        throw new Error(errorMessage);
      }
      
      // Parse response to check verification status
      const signupData = await res.json();
      const isVerified = signupData.is_verified || false;
      
      // Return signup result with verification status
      // The caller (login page) will handle redirect based on status
      return {
        success: true,
        is_verified: isVerified,
        message: signupData.message || 'Account created successfully!',
        data: signupData
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    // CRITICAL: Set logout flag FIRST before doing anything else
    // This prevents the initialization useEffect from auto-logging back in
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('logout_in_progress', 'true');
      // Also set a timestamp to track logout
      window.sessionStorage.setItem('logout_timestamp', Date.now().toString());
    }
    
    // Clear user state IMMEDIATELY to prevent any auto-login attempts
    setUser(null);
    userRef.current = null;
    setInitialized(false);
    setLoading(false);
    setAuthError(null);
    setLoginError(null);
    
    // Clear auth initialized flag
    try { 
      if (typeof window !== 'undefined') {
        (window as any).__aiser_auth_initialized = false;
      }
    } catch (e) {}
    
    const authServiceRequest = fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'user_initiated' }),
    }).catch((err) => console.warn('logout: auth-service call failed', err));

    const backendBase =
      process.env.NEXT_PUBLIC_BACKEND_INTERNAL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      '';
    const normalizedBackend = backendBase
      ? backendBase.replace(/\/+$/, '')
      : '';

    const platformRequest = normalizedBackend
      ? fetch(`${normalizedBackend}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'user_initiated' }),
        }).catch((err) => console.warn('logout: platform call failed', err))
      : Promise.resolve();

    try {
      await Promise.allSettled([authServiceRequest, platformRequest]);
    } finally {
      // CRITICAL: Clear ALL conversation and session data FIRST
      try { 
        conversationSessionManager.clear(); 
      } catch (e) { 
        console.warn('logout: failed to clear chat sessions', e); 
      }
      
      // Clear organization context if available
      try {
        // Organization context will be cleared via useEffect when user becomes null
        // But we can also trigger it explicitly if needed
        if (typeof window !== 'undefined' && (window as any).__clearOrganizationContext) {
          (window as any).__clearOrganizationContext();
        }
      } catch (e) {
        console.warn('logout: failed to clear organization context', e);
      }
      
      // CRITICAL: Clear ALL localStorage items related to user session
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          // Clear all conversation-related items
          const keysToRemove: string[] = [];
          for (let i = 0; i < window.localStorage.length; i += 1) {
            const key = window.localStorage.key(i);
            if (!key) continue;
            // Remove all user/session related keys (including message caches)
            if (
              key.startsWith('conv_') ||
              key.startsWith('conversation_') ||
              key.startsWith('current_conversation') ||
              key.startsWith('aiser_') ||
              key.startsWith('selected_data_source') ||
              key.startsWith('organization_') ||
              key.startsWith('project_') ||
              key.startsWith('user_') ||
              key.startsWith('auth_') ||
              key === 'current_conversation_id' ||
              key === 'current_organization_id' ||
              key === 'current_project_id'
            ) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((key) => window.localStorage.removeItem(key));
          
          // Also explicitly remove known keys
          window.localStorage.removeItem('aiser_user');
          window.localStorage.removeItem('aiser_access_token');
          window.localStorage.removeItem('current_conversation_id');
          window.localStorage.removeItem('current_organization_id');
          window.localStorage.removeItem('current_project_id');
          window.localStorage.removeItem('selected_data_source');
          window.localStorage.removeItem('selected_ai_model');
          window.localStorage.removeItem('streaming_enabled');
          // Clear ALL localStorage to be safe (nuclear option)
          window.localStorage.clear();
        }
      } catch (e) {
        console.warn('logout: failed to clear localStorage', e);
      }
      
      // CRITICAL: Clear ALL cookies to prevent session hijacking
      try {
        if (typeof window !== 'undefined') {
          // Remove with all possible paths and domains
          Cookies.remove('access_token', { path: '/', domain: window.location.hostname });
          Cookies.remove('c2c_access_token', { path: '/', domain: window.location.hostname });
          Cookies.remove('refresh_token', { path: '/', domain: window.location.hostname });
          // Also try without domain
          Cookies.remove('access_token', { path: '/' });
          Cookies.remove('c2c_access_token', { path: '/' });
          Cookies.remove('refresh_token', { path: '/' });
          // Clear via document.cookie as fallback
          if (typeof document !== 'undefined') {
            // Clear known cookies
            const knownCookies = ['access_token', 'c2c_access_token', 'refresh_token', 'c2c_refresh_token'];
            knownCookies.forEach(cookieName => {
              document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
              document.cookie = `${cookieName}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
              document.cookie = `${cookieName}=; path=/; domain=.${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
            });
            
            // Clear all cookies by iterating (more aggressive)
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
              const cookie = cookies[i];
              const eqPos = cookie.indexOf('=');
              const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
              if (name) {
                document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
                document.cookie = `${name}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
                document.cookie = `${name}=; path=/; domain=.${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
              }
            }
          }
        }
      } catch (e) {
        console.warn('logout: failed to remove cookies', e);
      }
      
      // CRITICAL: Re-set logout flag AFTER clearing sessionStorage (but before redirect)
      // This ensures the flag persists through the redirect
      try {
        if (typeof window !== 'undefined') {
          // Clear sessionStorage first
          window.sessionStorage.clear();
          // Then immediately re-set the logout flag to prevent auto-login on next page load
          window.sessionStorage.setItem('logout_in_progress', 'true');
          window.sessionStorage.setItem('logout_timestamp', Date.now().toString());
        }
      } catch (e) {
        console.warn('logout: failed to clear/re-set sessionStorage', e);
      }
      
      // CRITICAL: Force immediate redirect with hard reload to clear all state
      // Use window.location.replace for hard reload (clears cache, state, etc.)
      try {
        if (typeof window !== 'undefined') {
          // Clear all cookies one more time before redirect
          document.cookie.split(";").forEach((c) => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
          });
          
          // CRITICAL: Use a small delay to ensure all state is cleared, then redirect
          // This prevents race conditions with React state updates
          setTimeout(() => {
            // Force hard reload to login page immediately
            // Use replace instead of href to prevent back button issues
            window.location.replace('/login');
          }, 150);
        }
      } catch (e) {
        console.warn('logout: failed to redirect', e);
        if (typeof window !== 'undefined') {
          window.location.replace('/login');
        }
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        loading,
        initialized,
        authRetrying,
        authError,
        loginError,
        login,
        signup,
        logout,
        verifyAuth,
        setLoginError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ensure global initialized flag is set for fetchApi
export const AuthInitFlag = () => {
  const auth = useAuth();
  useEffect(() => {
    try { if (typeof window !== 'undefined') (window as any).__aiser_auth_initialized = !!auth.initialized; } catch (e) {}
  }, [auth.initialized]);
  return null;
};

// Expose a global flag to signal auth initialization for fetch helpers that
// need to wait for cookies to propagate during startup.
// This effect runs in the provider's module scope via a small wrapper component
// but we set it here using a side-effect when `initialized` changes.
// NOTE: we update the global from inside the provider above via a useEffect below.


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Return default values if context is not available (shouldn't happen in normal flow)
    return {
      isAuthenticated: false,
      user: null,
      loading: true,
      initialized: false,
      authRetrying: false,
      authError: null,
      loginError: null,
      login: async () => {},
      signup: async () => ({ success: false, is_verified: false, message: '' }),
      logout: async () => {},
      verifyAuth: async () => {},
      setLoginError: () => {},
    };
  }
  return context;
};

const fullScreenStatusStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  background: 'var(--ant-color-bg-layout, #fff)',
  color: 'var(--ant-color-text, #000)',
  padding: '16px',
  textAlign: 'center',
};

export class ProtectRoute extends React.Component<{ children: ReactNode }, {}> {
  static contextType = AuthContext;
  context!: React.ContextType<typeof AuthContext>;
  private redirectTimer: number | null = null;

  maybeRedirect() {
    try {
      if (this.redirectTimer) {
        clearTimeout(this.redirectTimer as any);
        this.redirectTimer = null;
      }
      this.redirectTimer = window.setTimeout(() => {
        try {
          const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
          const { initialized, loading, isAuthenticated, authRetrying } = (this.context as any) || {
            initialized: true,
            loading: false,
            isAuthenticated: false,
            authRetrying: false,
          };
          let hasPersistedUser = false;
          try { hasPersistedUser = !!(localStorage.getItem('aiser_user') && localStorage.getItem('aiser_access_token')); } catch (e) {}
          if (initialized && !loading && !isAuthenticated && !hasPersistedUser && !authRetrying) {
            // Respect a short client-side grace window after auth verification to
            // avoid redirecting while a legitimate authenticated state is settling.
            let inGrace = false;
            try { const g = (window as any).__aiser_auth_grace; inGrace = !!(g && (Date.now() - g) < 8000); } catch (e) { inGrace = false; }
            if (!inGrace) {
              if (pathname !== '/login' && pathname !== '/signup' && pathname !== '/logout') window.location.replace('/login');
            } else {
              console.debug('ProtectRoute: delaying redirect due to auth grace window');
            }
          }
        } catch (e) {}
      }, 1500) as unknown as number;
    } catch (e) {}
  }

  componentDidMount() { this.maybeRedirect(); }
  componentDidUpdate() { this.maybeRedirect(); }
  componentWillUnmount() { if (this.redirectTimer) clearTimeout(this.redirectTimer as any); }

  render() {
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const ctx = (this.context as any) || { initialized: true, loading: false, isAuthenticated: false, authRetrying: false };
    const { initialized, loading, isAuthenticated, authRetrying } = ctx;
    const shouldDelay = authRetrying || (typeof pathname === 'string' && pathname.startsWith && pathname.startsWith('/dash-studio'));

    if (pathname === '/login' || pathname === '/signup' || pathname === '/logout') return this.props.children as any;
    if (!initialized || loading) {
      return <LoadingScreen />;
    }
    if (!isAuthenticated) {
      if (typeof pathname === 'string' && pathname.startsWith && pathname.startsWith('/dash-studio')) {
        return (
          <div style={{ position: 'relative' }}>
            {this.props.children as any}
            <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
              <div style={{ background: 'var(--color-warning-bg, #fffbe6)', border: '1px solid var(--color-warning-border, #ffe58f)', padding: '8px 12px', borderRadius: 6, color: 'var(--ant-color-text, #000)' }}>
                <strong>Authenticating...</strong> We are verifying your session — some features may be disabled.
              </div>
            </div>
          </div>
        );
      }
      if (shouldDelay) {
        return <LoadingScreen />;
      }
      if (typeof window !== 'undefined') setTimeout(() => { try { if (window.location.pathname !== '/login') window.location.replace('/login'); } catch (e) {} }, 2000);
      return <LoadingScreen />;
    }
    return this.props.children as any;
  }
}

export default AuthContext;

export const RedirectAuthenticated = ({ children }: { children: React.ReactNode }) => {
  // CRITICAL: All hooks must be called unconditionally at the top level
  // DO NOT conditionally call hooks - this causes "Rendered more hooks" errors
  const router = useRouter();
  const pathname = usePathname();
  
  // CRITICAL: Always call useAuth unconditionally - hooks must be called in the same order every render
  const authContext = useAuth();
  const isAuthenticated = authContext?.isAuthenticated ?? false;
  const loading = authContext?.loading ?? true;

  useEffect(() => {
    // Handle logout route - don't redirect, just show children
    if (pathname === '/logout') {
      return;
    }
    
    // Redirect authenticated users away from login/signup pages
    if (isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
      try { router.push('/chat'); } catch (e) {}
    }
  }, [isAuthenticated, router, pathname]);

  // Don't block render of login/signup/logout pages — show loading while verifying
  if (pathname === '/logout') return children;
  if (pathname === '/login' || pathname === '/signup') return children;
  if (loading) return <LoadingScreen />;
  return children;
};
