import LoadingScreen from '@/components/LoadingScreen/LoadingScreen';
import Cookies from 'js-cookie';
import { createContext, useContext, useEffect, useState } from 'react';

//api here is an axios instance which has the baseURL set according to the env.
import { fetchApi } from '@/utils/api';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';

interface AuthContextType {
    isAuthenticated: boolean;
    user: { email: string; password: string } | null;
    loading: boolean;
    loginError: string | null;
    login: (account: string, password: string) => void;
    signup: (email: string, username: string, password: string) => void;
    logout: () => void;
    setLoginError: (error: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    user: null,
    loading: true,
    loginError: null,
    login: () => null,
    signup: () => null,
    logout: () => null,
    setLoginError: () => null,
});

const AUTH_COOKIE_KEYS = ['access_token', 'refresh_token', 'user'];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const router = useRouter();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loginError, setLoginError] = useState<string | null>(null);

    useEffect(() => {
        async function loadUserFromCookies() {
            console.log('Loading user from cookies...');
            const accessToken = Cookies.get('access_token');
            const userInfo = Cookies.get(AUTH_COOKIE_KEYS[2]);
            
            console.log('Access token from cookies:', accessToken);
            console.log('User info from cookies:', userInfo);
            
            if (accessToken) {
                try {
                    // Try enterprise endpoint first
                    let response = await fetch('http://localhost:5000/api/v1/enterprise/auth/me', {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    });
                    
                    if (!response.ok) {
                        // Try standard endpoint
                        response = await fetch('http://localhost:5000/users/me', {
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json',
                            },
                        });
                    }
                    
                    if (response.ok) {
                        const userData = await response.json();
                        setUser(userData);
                        console.log('User authenticated successfully');
                    } else {
                        // Token is invalid, clear cookies
                        console.log('Token validation failed, clearing cookies');
                        for (const key of AUTH_COOKIE_KEYS) {
                            Cookies.remove(key, { path: '/' });
                        }
                        Cookies.remove('access_token', { path: '/' });
                        setUser(null);
                    }
                } catch (error) {
                    console.error('Token validation error:', error);
                    // For now, if we have a token, assume it's valid to avoid constant relogin
                    // This is a temporary fix until backend is properly configured
                    if (userInfo) {
                        try {
                            setUser(JSON.parse(userInfo));
                            console.log('Using cached user info');
                        } catch (parseError) {
                            console.error('Error parsing user info:', parseError);
                            setUser(null);
                        }
                    } else {
                        setUser(null);
                    }
                }
            } else {
                setUser(null);
            }
            setLoading(false);
            console.log('Auth loading complete');
        }
        loadUserFromCookies();
    }, []);

    const login = async (identifier: string, password: string): Promise<void> => {
        try {
            setLoginError(null);
            
            // First try enterprise login (username only)
            let response = await fetch('http://localhost:5000/api/v1/enterprise/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: identifier,
                    password,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                // Set the access token cookie for enterprise login
                Cookies.set('access_token', data.access_token, { expires: 7, path: '/' });
                // Also set user info in cookie for persistence
                Cookies.set('user', JSON.stringify(data.user), { expires: 7, path: '/' });
                setUser(data.user);
                setLoginError(null);
                router.push('/');
                return;
            }

            // If enterprise login fails, try standard login (supports both email and username)
            response = await fetch('http://localhost:5000/users/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    identifier: identifier,
                    password,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Login failed');
            }

            const data = await response.json();
            // Set the access token cookie for standard login
            if (data.access_token) {
                Cookies.set('access_token', data.access_token, { expires: 7, path: '/' });
                // Also set user info in cookie for persistence
                Cookies.set('user', JSON.stringify(data.user), { expires: 7, path: '/' });
            }
            setUser(data.user);
            setLoginError(null);
            router.push('/');
        } catch (error) {
            setLoginError(
                error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred'
            );
            return Promise.reject(error);
        }
    };

    const signup = async (email: string, username: string, password: string): Promise<void> => {
        try {
            setLoginError(null);
            const response = await fetch('http://localhost:5000/users/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    username,
                    password,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Signup failed');
            }

            const data = await response.json();
            setUser(data.user);
            setLoginError(null);
            router.push('/');
        } catch (error) {
            setLoginError(
                error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred'
            );
            return Promise.reject(error);
        }
    };

    const logout = () => {
        try {
            // Clear user state
            setUser(null);
            
            // Remove all auth cookies
            for (const key of AUTH_COOKIE_KEYS) {
                Cookies.remove(key, { path: '/' });
                Cookies.remove(key, { path: '/', domain: 'localhost' });
                Cookies.remove(key, { path: '/', domain: '.localhost' });
            }
            
            // Clear any other cookies that might exist
            Cookies.remove('access_token', { path: '/' });
            Cookies.remove('refresh_token', { path: '/' });
            Cookies.remove('user_id', { path: '/' });
            
            // Navigate to login
            router.push('/login');
        } catch (error) {
            console.error('Error during logout:', error);
            // Force navigation even if cookie removal fails
            router.push('/login');
        }
    };

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated: !!user,
                user,
                loading,
                loginError,
                login,
                signup,
                logout,
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

    const { isAuthenticated, loading } = useAuth();

    useEffect(() => {
        if (!loading && !isAuthenticated && pathname !== '/login') {
            router.push('/login');
        }
    }, [loading, isAuthenticated, router, pathname]);

    if (loading || (!isAuthenticated && pathname !== '/login')) {
        return <LoadingScreen />;
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

    if (loading) {
        return <LoadingScreen />;
    }
    
    // Only redirect if on login/signup pages and authenticated
    if (isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
        return <LoadingScreen />;
    }
    
    return children;
};

export const DefaultRoute = ({ children }: { children: ReactNode }) => {
    const router = useRouter();
    const pathname = usePathname();

    const { isAuthenticated, loading } = useAuth();
    const [timeoutReached, setTimeoutReached] = useState(false);

    useEffect(() => {
        if (!loading && pathname === '/') {
            router.push(isAuthenticated ? '/chat' : '/login');
        }
    }, [loading, isAuthenticated, router, pathname]);

    // Add timeout fallback
    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading && pathname === '/') {
                console.log('Auth timeout reached, redirecting to login');
                setTimeoutReached(true);
                router.push('/login');
            }
        }, 5000); // 5 second timeout

        return () => clearTimeout(timer);
    }, [loading, pathname, router]);

    if ((loading && !timeoutReached) || pathname === '/') {
        return <LoadingScreen />;
    }
    return children;
};
