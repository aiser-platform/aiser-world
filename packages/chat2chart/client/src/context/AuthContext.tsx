"use client";

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import LoadingScreen from '@/components/LoadingScreen/LoadingScreen';
import Cookies from 'js-cookie';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  loading: boolean;
  initialized: boolean;
  authRetrying: boolean;
  authError: string | null;
  loginError: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  verifyAuth: () => Promise<void>;
  setLoginError: (v: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  loading: true,
  initialized: false,
  authRetrying: false,
  authError: null,
  loginError: null,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  verifyAuth: async () => {},
  setLoginError: () => {},
});

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
            if (mountedRef.current) setUser(data);
            try { userRef.current = data; } catch (e) {}
            setAuthError(null);
          } catch (e) {
            console.warn('verifyAuth: failed to parse cached user', e);
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
        if (mountedRef.current) setUser(data);
        try { userRef.current = data; } catch (e) {}
        setAuthError(null);
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

  useEffect(() => {
    // Single initialization flow with exponential backoff retries for transient errors
    let cancelled = false;
    const init = async () => {
      setLoading(true);
      setAuthRetrying(true);
      try {
        const maxAttempts = 3;
        const baseDelay = 400;
        let success = false;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            const res = await fetch('/api/auth/users/me', { method: 'GET', credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (cancelled) return;
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
            if (res.status === 401) {
              // definitive unauthenticated
              if (cancelled) return;
              setUser(null);
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
    try {
      const res = await fetch('/api/auth/users/signin', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: identifier, password }),
      });
      if (!res.ok) {
        const txt = await res.text();
        setLoginError(`${res.status}: ${txt}`);
        throw new Error(`Login failed: ${res.status}`);
      }
      // retry verifyAuth a few times to avoid race where cookie isn't available immediately
      let verified = false;
      for (let i = 0; i < 4; i++) {
        await verifyAuth();
        if (userRef.current) { verified = true; break; }
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 150 * (i + 1)));
      }
      // set a short client-side grace timestamp to prevent redirect races
      try { if (typeof window !== 'undefined') (window as any).__aiser_auth_grace = Date.now(); } catch (e) {}
      if (!verified) console.warn('AuthContext: login: verifyAuth did not observe user after retries');
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
        const txt = await res.text();
        setLoginError(`${res.status}: ${txt}`);
        throw new Error(`Signup failed: ${res.status}`);
      }
      await verifyAuth();
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) {}
    } finally {
      setUser(null);
      setInitialized(false);
      setLoading(false);
      try { if (typeof window !== 'undefined') (window as any).__aiser_auth_initialized = false; } catch (e) {}
      try { Cookies.remove('access_token'); Cookies.remove('c2c_access_token'); } catch (e) {}
      try { localStorage.removeItem('aiser_user'); localStorage.removeItem('aiser_access_token'); } catch (e) {}
      try { router.replace('/login'); } catch (e) {}
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


export const useAuth = () => useContext(AuthContext);

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
    if (!initialized || loading) return (<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Authenticating...</div>);
    if (!isAuthenticated) {
      if (typeof pathname === 'string' && pathname.startsWith && pathname.startsWith('/dash-studio')) {
        return (<div style={{ position: 'relative' }}>{this.props.children as any}<div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}><div style={{ background: '#fffbe6', border: '1px solid #ffe58f', padding: '8px 12px', borderRadius: 6 }}><strong>Authenticating...</strong> We are verifying your session — some features may be disabled.</div></div></div>);
      }
      if (shouldDelay) return (<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Authenticating...</div>);
      if (typeof window !== 'undefined') setTimeout(() => { try { if (window.location.pathname !== '/login') window.location.replace('/login'); } catch (e) {} }, 2000);
      return (<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Redirecting to login...</div>);
    }
    return this.props.children as any;
  }
}

export default AuthContext;

export const RedirectAuthenticated = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
      try { router.push('/chat'); } catch (e) {}
    }
  }, [isAuthenticated, router, pathname]);

  // Don't block render of login/signup pages — show loading while verifying
  if (pathname === '/login' || pathname === '/signup') return children;
  if (loading) return <LoadingScreen />;
  return children;
};
