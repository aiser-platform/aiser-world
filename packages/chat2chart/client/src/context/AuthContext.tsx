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
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    user: null,
    loading: true,
    loginError: null,
    login: () => null,
    logout: () => null,
});

const AUTH_COOKIE_KEYS = ['access_token', 'refresh_token', 'user'];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const router = useRouter();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loginError, setLoginError] = useState<string | null>(null);

    useEffect(() => {
        async function loadUserFromCookies() {
            const userInfo = Cookies.get(AUTH_COOKIE_KEYS[2]);
            if (userInfo) {
                setUser(JSON.parse(userInfo));
            }
            setLoading(false);
        }
        loadUserFromCookies();
    }, []);

    const login = async (account: string, password: string): Promise<void> => {
        try {
            setLoginError(null);
            const response = await fetchApi('users/sign-in', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ account, password }),
            });
            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.detail || 'Failed to login';
                console.log('Login error:', data);
                setLoginError(errorMessage);
                return;
            }

            const userInfo = JSON.stringify(data);
            Cookies.set(AUTH_COOKIE_KEYS[2], userInfo, {
                path: '/',
            });
            // setLoading(false);
            setUser(data);
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
            // Remove cookie with all possible combinations of options
            for (const key of AUTH_COOKIE_KEYS) {
                Cookies.remove(key, { path: '/' });

                // Verify removal
                const remainingCookie = Cookies.get(key);
                console.log('After cookie removal:', remainingCookie);

                // Force clear if still exists
                if (remainingCookie) {
                    Cookies.remove(key, { path: '/' });
                }
            }

            router.push('/login');
        } catch (error) {
            console.error('Error during logout:', error);
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
                logout,
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
        if (isAuthenticated && pathname !== '/chat') {
            router.push('/chat');
        }
    }, [isAuthenticated, router, pathname]);

    if (loading || (isAuthenticated && pathname !== '/chat')) {
        return <LoadingScreen />;
    }
    return children;
};

export const DefaultRoute = ({ children }: { children: ReactNode }) => {
    const router = useRouter();
    const pathname = usePathname();

    const { isAuthenticated, loading } = useAuth();

    useEffect(() => {
        if (!loading && pathname === '/') {
            router.push(isAuthenticated ? '/chat' : '/login');
        }
    }, [loading, isAuthenticated, router, pathname]);

    if (loading || pathname === '/') {
        return <LoadingScreen />;
    }
    return children;
};
