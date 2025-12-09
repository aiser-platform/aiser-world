import LoadingScreen from '@/components/LoadingScreen/LoadingScreen';
import Cookies from 'js-cookie';
import { createContext, useContext, useEffect, useState } from 'react';

//api here is an axios instance which has the baseURL set according to the env.
import { fetchAuthApi } from '@/utils/api';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';

interface AuthContextType {
    user: any | null;
    loading: boolean;
    signinError: string | null;
    signupError: string | null;
    forgotPasswordError: string | null;
    resetPasswordError: string | null;
    forgotPasswordSuccess: boolean;
    resetPasswordSuccess: boolean;
    verifyEmailError: string | null;
    resendVerificationError: string | null;
    resendVerificationSuccess: boolean;
    signin: (account: string, password: string) => Promise<void>;
    signup: (userData: SignupData) => Promise<void>;
    signout: () => Promise<void>;
    isAuthenticated: () => boolean;
    getAccessToken: () => string | null;
    forgotPassword: (email: string) => Promise<void>;
    resetPassword: (token: string, newPassword: string) => Promise<void>;
    verifyEmail: (token: string) => Promise<void>;
    resendVerification: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signinError: null,
    signupError: null,
    forgotPasswordError: null,
    resetPasswordError: null,
    forgotPasswordSuccess: false,
    resetPasswordSuccess: false,
    verifyEmailError: null,
    resendVerificationError: null,
    resendVerificationSuccess: false,
    signin: () => Promise.resolve(),
    signup: () => Promise.resolve(),
    signout: () => Promise.resolve(),
    isAuthenticated: () => false,
    getAccessToken: () => null,
    forgotPassword: () => Promise.resolve(),
    resetPassword: () => Promise.resolve(),
    verifyEmail: () => Promise.resolve(),
    resendVerification: () => Promise.resolve(),
});

export interface SignupData {
    email: string;
    username: string;
    password: string;
    // phoneNumber: string;
    // firstName: string;
    // lastName: string;
    verification_url: string;
}

const AUTH_COOKIE_KEYS = ['access_token', 'refresh_token', 'user'];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const router = useRouter();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [signinError, setSigninError] = useState<string | null>(null);
    const [signupError, setSignupError] = useState<string | null>(null);
    const [forgotPasswordError, setForgotPasswordError] = useState<
        string | null
    >(null);
    const [resetPasswordError, setResetPasswordError] = useState<string | null>(
        null
    );
    const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
    const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false);
    const [verifyEmailError, setVerifyEmailError] = useState<string | null>(
        null
    );
    const [resendVerificationError, setResendVerificationError] = useState<
        string | null
    >(null);
    const [resendVerificationSuccess, setResendVerificationSuccess] =
        useState(false);

    useEffect(() => {
        async function loadUserFromCookies() {
            console.log('Loading user from cookies...');
            
            // Check for access token first
            const accessToken = Cookies.get('access_token');
            const userInfo = Cookies.get('user_info');
            
            console.log('Access token:', accessToken ? 'Present' : 'Not found');
            console.log('User info:', userInfo ? 'Present' : 'Not found');
            
            if (accessToken && userInfo) {
                try {
                    const user = JSON.parse(userInfo);
                    setUser(user);
                    console.log('User loaded from cookies:', user);
                } catch (error) {
                    console.error('Error parsing user info from cookies:', error);
                    // Clear invalid cookies
                    Cookies.remove('access_token');
                    Cookies.remove('user_info');
                }
            } else if (accessToken) {
                // If we have a token but no user info, try to fetch user data
                try {
                    const response = await fetchAuthApi('users/me/', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                        },
                    });
                    
                    if (response.ok) {
                        const userData = await response.json();
                        setUser(userData);
                        // Store user info for future use
                        Cookies.set('user_info', JSON.stringify(userData), {
                            path: '/',
                            expires: 7,
                        });
                    } else {
                        // Token might be invalid, clear it
                        Cookies.remove('access_token');
                        Cookies.remove('user_info');
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    // Clear invalid cookies
                    Cookies.remove('access_token');
                    Cookies.remove('user_info');
                }
            }
            
            setLoading(false);
        }
        loadUserFromCookies();
    }, []);

    const signin = async (account: string, password: string): Promise<void> => {
        try {
            setSigninError(null);
            const response = await fetchAuthApi('users/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    account,
                    password,
                    verification_url: 'http://localhost:3001/verify',
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.detail || 'Failed to signin';
                console.log('Signin error:', data);
                setSigninError(errorMessage);
                return;
            }

            // Extract access token and user info from response
            if (data.access_token) {
                // Store the access token in cookies
                Cookies.set('access_token', data.access_token, {
                    path: '/',
                    expires: 7, // 7 days
                });
                
                // Store user info if available
                if (data.user) {
                    Cookies.set('user_info', JSON.stringify(data.user), {
                        path: '/',
                        expires: 7,
                    });
                    setUser(data.user);
                } else {
                    // If no user info, set basic info from token
                    setUser({ account, isAuthenticated: true });
                }
                
                setSigninError(null);
                router.push('/');
            } else {
                // Handle case where no token is returned
                setSigninError('No authentication token received');
            }
        } catch (error) {
            setSigninError(
                error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred'
            );
            return Promise.reject(error);
        }
    };

    const signup = async (userData: SignupData): Promise<void> => {
        try {
            setSignupError(null);
            const response = await fetchAuthApi('users/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });
            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.detail || 'Failed to signup';
                console.log('Signup error:', data);
                setSignupError(errorMessage);
                return Promise.reject(new Error(errorMessage));
            }

            // Automatically sign in after successful signup
            await signin(userData.email, userData.password);
        } catch (error) {
            setSignupError(
                error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred'
            );
            return Promise.reject(error);
        }
    };

    const forgotPassword = async (email: string): Promise<void> => {
        try {
            setForgotPasswordError(null);
            setForgotPasswordSuccess(false);

            const response = await fetchAuthApi('users/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    reset_url: `${window.location.origin}/reset-password`,
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                const errorMessage =
                    data.detail || 'Failed to process password reset request';
                console.log('Forgot password error:', data);
                setForgotPasswordError(errorMessage);
                return Promise.reject(new Error(errorMessage));
            }

            setForgotPasswordSuccess(true);
            return Promise.resolve();
        } catch (error) {
            setForgotPasswordError(
                error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred'
            );
            return Promise.reject(error);
        }
    };

    const resetPassword = async (
        token: string,
        newPassword: string
    ): Promise<void> => {
        try {
            setResetPasswordError(null);
            setResetPasswordSuccess(false);

            const response = await fetchAuthApi('users/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token,
                    new_password: newPassword,
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.detail || 'Failed to reset password';
                console.log('Reset password error:', data);
                setResetPasswordError(errorMessage);
                return Promise.reject(new Error(errorMessage));
            }

            setResetPasswordSuccess(true);
            return Promise.resolve();
        } catch (error) {
            setResetPasswordError(
                error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred'
            );
            return Promise.reject(error);
        }
    };

    const verifyEmail = async (token: string): Promise<void> => {
        try {
            setVerifyEmailError(null);

            const response = await fetchAuthApi('users/verify-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token }),
            });

            if (!response.ok) {
                const data = await response.json();
                const errorMessage = data.detail || 'Failed to verify email';
                setVerifyEmailError(errorMessage);
                return Promise.reject(new Error(errorMessage));
            }

            return Promise.resolve();
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred';
            setVerifyEmailError(errorMessage);
            return Promise.reject(error);
        }
    };

    const resendVerification = async (email: string): Promise<void> => {
        try {
            setResendVerificationError(null);
            setResendVerificationSuccess(false);

            const response = await fetchAuthApi('users/resend-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    verification_url: `${window.location.origin}/verify-email`,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                const errorMessage =
                    data.detail || 'Failed to resend verification email';
                setResendVerificationError(errorMessage);
                return Promise.reject(new Error(errorMessage));
            }

            setResendVerificationSuccess(true);
            return Promise.resolve();
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred';
            setResendVerificationError(errorMessage);
            return Promise.reject(error);
        }
    };

    const signout = async (): Promise<void> => {
        try {
            // Clear cookies
            Cookies.remove('access_token');
            Cookies.remove('user_info');
            
            // Clear user state
            setUser(null);
            
            // Redirect to login
            router.push('/login');
        } catch (error) {
            console.error('Error during signout:', error);
        }
    };

    const isAuthenticated = (): boolean => {
        const accessToken = Cookies.get('access_token');
        return !!accessToken && !!user;
    };

    const getAccessToken = (): string | null => {
        return Cookies.get('access_token') || null;
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                signin,
                signup,
                signout,
                isAuthenticated,
                getAccessToken,
                signinError,
                signupError,
                forgotPassword,
                forgotPasswordError,
                forgotPasswordSuccess,
                resetPassword,
                resetPasswordError,
                resetPasswordSuccess,
                verifyEmail,
                verifyEmailError,
                resendVerification,
                resendVerificationError,
                resendVerificationSuccess,
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
        if (!loading && !isAuthenticated && pathname !== '/signin') {
            router.push('/signin');
        }
    }, [loading, isAuthenticated, router, pathname]);

    if (loading || (!isAuthenticated && pathname !== '/signin')) {
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
            router.push(isAuthenticated ? '/chat' : '/signin');
        }
    }, [loading, isAuthenticated, router, pathname]);

    if (loading || pathname === '/') {
        return <LoadingScreen />;
    }
    return children;
};
