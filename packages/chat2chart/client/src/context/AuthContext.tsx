"use client";

import LoadingScreen from '@/components/LoadingScreen/LoadingScreen';
import Cookies from 'js-cookie';
import { createContext, useContext, useEffect, useState } from 'react';

//api here is an axios instance which has the baseURL set according to the env.
import { fetchApi, AUTH_URL } from '@/utils/api';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';

interface AuthContextType {
    isAuthenticated: boolean;
    user: any | null;
    loading: boolean;
    authError: string | null;
    loginError: string | null;
    initialized: boolean;
    login: (account: string, password: string) => void;
    signup: (email: string, username: string, password: string) => void;
    logout: () => void;
    verifyAuth: () => Promise<void>;
    setLoginError: (error: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    user: null,
    loading: false,
    authError: null,
    loginError: null,
    initialized: false,
    login: () => Promise.resolve(),
    signup: () => Promise.resolve(),
    logout: () => null,
    verifyAuth: async () => Promise.resolve(),
    setLoginError: () => null,
});

const AUTH_COOKIE_KEYS = ['c2c_access_token', 'refresh_token', 'user'];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const router = useRouter();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // Start with true during initial auth check
    const [loginError, setLoginError] = useState<string | null>(null);
    const [initialized, setInitialized] = useState(false); // Start as false until auth check completes
    const [authError, setAuthError] = useState<string | null>(null);

    // Initialize authentication state on mount
    useEffect(() => {
        let isMounted = true;
        
        const initializeAuth = async () => {
            console.log('🔄 AuthContext: Initializing authentication...');
            setLoading(true);
            setAuthError(null);
            try {
                // First try token-based verification using localStorage (fast, avoids proxy issues)
                console.log('🔍 AuthContext: Attempting token-based auth check (localStorage)');
                const fallbackToken = typeof window !== 'undefined' ? localStorage.getItem('aiser_access_token') : null;
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 4000);
                let response;
                try {
                    if (fallbackToken) {
                        try {
                            // Use same-origin proxy so cookies and CORS are handled consistently
                            response = await fetch(`/api/auth/users/me`, {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${fallbackToken}`,
                                },
                                credentials: 'include',
                                signal: controller.signal,
                            });
                        } catch (e) {
                            // token-based check failed or timed out, fallthrough to cookie-based check
                            console.warn('🔍 AuthContext: token-based /users/me failed, will try cookie-proxy', e);
                            response = undefined as any;
                        }
                    }

                    // If token check didn't run or failed, fall back to cookie-based proxy
                    if (!response || !response.ok) {
                        console.log('🔍 AuthContext: Falling back to cookie-based proxy /api/auth/users/me');
                        try {
                            // Always use the same-origin proxy endpoint from the client
                            response = await fetch(`/api/auth/users/me`, {
                                method: 'GET',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                signal: controller.signal,
                            });
                        } catch (e) {
                            console.warn('🔍 AuthContext: cookie-proxy /users/me failed', e);
                            response = undefined as any;
                        }
                    }
                } finally {
                    clearTimeout(timeout);
                }

                console.log('🔍 AuthContext: Auth check (proxy) response status:', response.status);

                if (response.ok) {
                    const userData = await response.json();
                    console.log('✅ AuthContext: User authenticated (proxy):', userData);
                    if (isMounted) {
                        setUser(userData);
                        try { localStorage.setItem('aiser_user', JSON.stringify(userData)); } catch {}
                    }
                } else {
                // Try fallback: if a dev fallback token exists in localStorage, use it
                console.log('⚠️ AuthContext: proxy check failed, trying Authorization header fallback');
                const fallbackToken = typeof window !== 'undefined' ? localStorage.getItem('aiser_access_token') : null;
                if (fallbackToken) {
                    try {
                        const controller2 = new AbortController();
                        const timeout2 = setTimeout(() => controller2.abort(), 3000);
                        try {
                            // Use same-origin proxy and include Authorization header as fallback
                            response = await fetch(`/api/auth/users/me`, {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${fallbackToken}`,
                                },
                                credentials: 'include',
                                signal: controller2.signal,
                            });
                        } finally {
                            clearTimeout(timeout2);
                        }

                        console.log('🔍 AuthContext: Auth check (bearer proxy) response status:', response.status);
                        if (response.ok) {
                            const userData = await response.json();
                            console.log('✅ AuthContext: User authenticated (bearer proxy):', userData);
                            if (isMounted) {
                                setUser(userData);
                                try { localStorage.setItem('aiser_user', JSON.stringify(userData)); } catch {}
                            }
                        } else {
                            console.log('❌ AuthContext: Bearer fallback (proxy) failed, status:', response.status);
                            if (isMounted) setUser(null);
                        }
                    } catch (e) {
                        console.error('❌ AuthContext: Bearer fallback (proxy) error:', e);
                        if (isMounted) setUser(null);
                    }
                } else {
                    if (isMounted) setUser(null);
                }
                }
            } catch (error: any) {
                console.error('❌ AuthContext: Auth initialization error:', error);
                if (isMounted) {
                    setUser(null);
                    setAuthError(String(error?.message || error));
                }
            } finally {
                // Ensure initialized is set regardless of result so ProtectRoute can act
                if (isMounted) {
                    setInitialized(true);
                    setLoading(false);
                }
            }
        };
        
        // If we have a persisted user from a recent login, use it immediately
        try {
            const persisted = typeof window !== 'undefined' ? localStorage.getItem('aiser_user') : null;
            if (persisted) {
                try {
                    const parsed = JSON.parse(persisted);
                    if (isMounted) {
                        setUser(parsed);
                        setInitialized(true);
                        setLoading(false);
                    }
                    // still run background verification
                    initializeAuth();
                } catch (e) {
                    // fallback to normal flow
                    initializeAuth();
                }
            } else {
                // Run auth check immediately
                initializeAuth();
            }
        } catch (e) {
            initializeAuth();
        }
        
        // Add fallback timeout to ensure initialization completes
        const fallbackTimer = setTimeout(() => {
            if (isMounted && !initialized) {
                console.warn('⚠️ AuthContext: Fallback timeout reached, forcing initialization');
                setUser(null);
                setInitialized(true);
                setLoading(false);
            }
        }, 6000);
        
        return () => {
            isMounted = false;
            clearTimeout(fallbackTimer);
        };
    }, []); // Empty dependency array - run only once on mount

    const login = async (identifier: string, password: string): Promise<void> => {
        try {
            console.log('🔄 AuthContext: Starting login process...');
            setLoginError(null);
            setLoading(true);

            // Send login request to auth service via same-origin proxy with retries
            let response: Response | null = null;
            const maxAttempts = 3;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    const signinUrl = typeof window !== 'undefined' ? `${AUTH_URL}/users/signin` : `/api/auth/users/signin`;
                    response = await fetch(signinUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include', // Essential for receiving HttpOnly cookies
                        body: JSON.stringify({ identifier, password }),
                    });
                    break; // success or valid response
                } catch (err) {
                    console.warn(`AuthContext: signin attempt ${attempt} failed`, err);
                    if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, attempt * 300));
                }
            }

            if (!response) {
                setLoginError('Network error during signin');
                setLoading(false);
                setAuthError('Network error during signin');
                return;
            }

            if (!response.ok) {
                let errMsg = 'Login failed';
                try {
                    const contentType = response.headers.get('content-type') || '';
                    if (contentType.includes('application/json')) {
                        const errorData = await response.json();
                        errMsg = errorData.detail || JSON.stringify(errorData) || errMsg;
                    } else {
                        const txt = await response.text();
                        errMsg = txt || errMsg;
                    }
                } catch (e) {
                    // ignore parse errors
                }
                console.error('❌ AuthContext: Login failed:', response.status, errMsg);
                setLoginError(`${response.status}: ${errMsg}`);
                setLoading(false);
                return;
            }

            const data = await response.json();
            console.log('✅ AuthContext: Login successful, auth service set HttpOnly cookies');
            
            // The auth service may set HttpOnly cookies. Persist fallback token and
            // immediately consider user signed-in (so UI loads). Perform a
            // background verification that will not block rendering.
            setLoginError(null);
            try {
                if (data.access_token) {
                    localStorage.setItem('aiser_access_token', data.access_token);
                }
            } catch (e) {
                console.warn('Could not persist access token to localStorage', e);
            }

            // Immediately mark authenticated so UI renders without waiting.
            // Persist a minimal optimistic `aiser_user` and perform an immediate
            // verification (with short timeout/retries) so ProtectRoute doesn't block.
            setLoginError(null);
            setUser(data.user);
            try { localStorage.setItem('aiser_user', JSON.stringify(data.user)); } catch {}
            // Attempt verification and wait up to ~3s total before navigating
            try {
                const verifyPromise = (async () => {
                    await verifyAuth();
                })();
                const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('verify timeout')), 3000));
                await Promise.race([verifyPromise, timeout]);
            } catch (e) {
                // verification timed out or failed; keep optimistic state but log
                console.warn('Auth verification during login timed out or failed:', e);
            }

            setInitialized(true);
            setLoading(false);
            // Navigate to chat (client will re-run verifyAuth if needed)
            router.push('/chat');
        } catch (error) {
            console.error('❌ AuthContext: Login error:', error);
            const message = error instanceof Error ? error.message : 'Network error';
            setLoginError(message);
            setAuthError(message);
            setLoading(false);
            return Promise.reject(error);
        }
    };

    const verifyAuth = async (): Promise<void> => {
        setAuthError(null);
        setLoading(true);
        try {
            // Retry attempt for transient failures (e.g., cookie forwarding race)
            const attempts = 3;
            let lastErr: any = null;
            for (let attempt = 1; attempt <= attempts; attempt++) {
                try {
                    const controller = new AbortController();
                    const t = setTimeout(() => controller.abort(), 3000);
                    let res: Response | undefined = undefined;
                    try {
                        res = await fetch('/api/auth/users/me', { method: 'GET', credentials: 'include', signal: controller.signal });
                    } finally { clearTimeout(t); }

                    if (res && res.ok) {
                        const u = await res.json();
                        setUser(u);
                        try { localStorage.setItem('aiser_user', JSON.stringify(u)); } catch {}
                        setAuthError(null);
                        return;
                    }

                    if (res) {
                        lastErr = new Error(`Server returned ${res.status}`);
                        // If 403/401, retry once after a short delay (cookie may not be set yet)
                        if (res.status === 401 || res.status === 403) {
                            await new Promise((r) => setTimeout(r, attempt * 300));
                            continue;
                        }
                        break; // non-retryable status
                    }
                } catch (err) {
                    lastErr = err;
                    await new Promise((r) => setTimeout(r, attempt * 300));
                    continue;
                }
            }
            if (lastErr) setAuthError(String(lastErr?.message || lastErr));
            setUser(null);
        } catch (e: any) {
            setAuthError(String(e?.message || e));
        } finally {
            setLoading(false);
            setInitialized(true);
        }
    };

    const signup = async (email: string, username: string, password: string): Promise<void> => {
        try {
            console.log('🔄 AuthContext: Starting signup process...');
            setLoginError(null);
            setLoading(true);
            
            const response = await fetch(`/api/auth/users/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username, password }),
                credentials: 'include',
            });
            
            if (!response.ok) {
                let errMsg = 'Signup failed';
                try {
                    const contentType = response.headers.get('content-type') || '';
                    if (contentType.includes('application/json')) {
                        const errorData = await response.json();
                        errMsg = errorData.detail || JSON.stringify(errorData) || errMsg;
                    } else {
                        errMsg = await response.text();
                    }
                } catch (e) {
                    // ignore parse errors
                }
                console.error('❌ AuthContext: Signup failed:', response.status, errMsg);
                setLoginError(`${response.status}: ${errMsg}`);
                setLoading(false);
                return;
            }

            const data = await response.json();
            console.log('✅ AuthContext: Signup successful, setting user data...');
            
            setUser(data.user);
            setLoginError(null);
            setLoading(false);
            setInitialized(true);
            
            console.log('✅ AuthContext: Signup complete, redirecting to /chat');
            router.push('/chat');
        } catch (error) {
            console.error('❌ AuthContext: Signup error:', error);
            setLoginError(error instanceof Error ? error.message : 'An unexpected error occurred');
            setLoading(false);
            return Promise.reject(error);
        }
    };

    const logout = () => {
        try {
            console.log('🔄 AuthContext: Logging out...');
            // Clear user state
            setUser(null);
            setLoginError(null);
            setLoading(false);
            setInitialized(false);

            // Clear any client-side cookies that might exist
            const cookieOptions = { 
                path: '/',
                domain: window.location.hostname === 'localhost' ? 'localhost' : undefined,
                secure: window.location.protocol === 'https:',
                sameSite: 'lax' as const
            };
            
            for (const key of AUTH_COOKIE_KEYS) {
                Cookies.remove(key, cookieOptions);
            }
            Cookies.remove('access_token', cookieOptions);
            Cookies.remove('c2c_access_token', cookieOptions);

            console.log('✅ AuthContext: Logout complete, redirecting to login');
            // Redirect to login page
            router.push('/login');
        } catch (error) {
            console.error('❌ AuthContext: Logout error:', error);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated: !!user,
                user,
                loading,
                authError,
                loginError,
                initialized,
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

export const useAuth = () => useContext(AuthContext);

export const ProtectRoute = ({ children }: { children: ReactNode }) => {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, loading, initialized } = useAuth();

    // Don't block login/signup pages
    if (pathname === '/login' || pathname === '/signup' || pathname === '/logout') {
        return children;
    }

    // If we already have an authenticated user, render immediately to avoid
    // showing the loading spinner after login (client-side state is authoritative).
    if (isAuthenticated) {
        console.debug('ProtectRoute: early pass-through, user authenticated');
        return children;
    }
    // Perform redirect as a side-effect (hooks must be called unconditionally)
    useEffect(() => {
        console.debug('ProtectRoute: state', { initialized, loading, isAuthenticated, pathname });
        if (initialized && !loading && !isAuthenticated) {
            // avoid redirecting when already on auth pages
            if (pathname !== '/login' && pathname !== '/signup' && pathname !== '/logout') {
                router.replace('/login');
            }
        }
    }, [initialized, loading, isAuthenticated, pathname, router]);

    // Show loading only if auth is not initialized yet
    if (!initialized || loading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                fontSize: '16px',
                color: '#666'
            }}>
                Loading...
            </div>
        );
    }

    // If initialized but not authenticated, show redirecting UI while effect navigates
    if (!isAuthenticated) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                fontSize: '16px',
                color: '#666'
            }}>
                Redirecting to login...
            </div>
        );
    }

    return children;
};

export const RedirectAuthenticated = ({
    children,
}: {
    children: ReactNode;
}) => {
    const router = useRouter();
    const pathname = usePathname();

    const { isAuthenticated, loading } = useAuth();

    useEffect(() => {
        // Only redirect from login/signup pages, not from dashboard routes
        if (isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
            router.push('/chat');
        }
    }, [isAuthenticated, router, pathname]);

    // Never block login/signup behind a loading screen
    // Render the form immediately; redirect will happen if already authenticated
    if (pathname === '/login' || pathname === '/signup') {
        return children;
    }
    // For other auth pages (if any), keep prior behavior
    if (loading) {
        return <LoadingScreen />;
    }
    if (isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
        return <LoadingScreen />;
    }
    
    return children;
};

export const DefaultRoute = ({ children }: { children: ReactNode }) => {
    const router = useRouter();
    const pathname = usePathname();

    const { isAuthenticated, loading, initialized } = useAuth();

    useEffect(() => {
        if (pathname !== '/') return;
        
        // Only redirect when auth is initialized
        if (initialized && !loading) {
            router.replace(isAuthenticated ? '/chat' : '/login');
        }
    }, [initialized, loading, isAuthenticated, router, pathname]);

    // Add timeout fallback for root path
    useEffect(() => {
        if (pathname !== '/') return;
        
        const timer = setTimeout(() => {
            if (!initialized) {
                console.log('Auth timeout reached, redirecting to login');
                router.replace('/login');
            }
        }, 5000); // Increased timeout to 5 seconds

        return () => clearTimeout(timer);
    }, [initialized, router, pathname]);

    if (pathname === '/') {
        // Show simple loading instead of LoadingScreen to avoid conflicts
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                fontSize: '16px',
                color: '#666'
            }}>
                Loading...
            </div>
        );
    }
    return children;
};
