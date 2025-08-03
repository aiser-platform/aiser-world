import LoadingScreen from '@/components/LoadingScreen/LoadingScreen';
import Cookies from 'js-cookie';
import { createContext, useContext, useEffect, useState } from 'react';

//api here is an axios instance which has the baseURL set according to the env.
import { fetchAuthApi } from '@/utils/api';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';

interface AuthContextType {
    isAuthenticated: boolean;
    user: { email: string; password: string } | null;
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
    signin: (account: string, password: string) => void;
    signup: (userData: SignupData) => void;
    signout: () => void;
    forgotPassword: (email: string) => Promise<void>;
    resetPassword: (token: string, newPassword: string) => Promise<void>;
    verifyEmail: (token: string) => Promise<void>;
    resendVerification: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
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
    signin: () => null,
    signup: () => null,
    signout: () => null,
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
            console.log(Cookies);
            const userInfo = Cookies.get('access_token');
            console.log('User info:', userInfo);
            if (userInfo) {
                setUser(JSON.parse(userInfo));
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

            const userInfo = JSON.stringify(data);
            Cookies.set(AUTH_COOKIE_KEYS[2], userInfo, {
                path: '/',
            });
            // setLoading(false);
            setUser(data);
            setSigninError(null);
            router.push('/');
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

    const signout = async () => {
        try {
            // Remove cookie with all possible combinations of options
            await fetchAuthApi('users/signout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            }).finally(() => {
                setUser(null);
                setLoading(false);
                router.push('/signin');
            });
            // for (const key of AUTH_COOKIE_KEYS) {
            //     Cookies.remove(key, { path: '/' });

            //     // Verify removal
            //     const remainingCookie = Cookies.get(key);
            //     console.log('After cookie removal:', remainingCookie);

            //     // Force clear if still exists
            //     if (remainingCookie) {
            //         Cookies.remove(key, { path: '/' });
            //     }
            // }
        } catch (error) {
            console.error('Error during signout:', error);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated: !!user,
                user,
                loading,
                signinError,
                signupError,
                forgotPasswordError,
                resetPasswordError,
                forgotPasswordSuccess,
                resetPasswordSuccess,
                verifyEmailError,
                resendVerificationError,
                resendVerificationSuccess,
                signin,
                signup,
                signout,
                forgotPassword,
                resetPassword,
                verifyEmail,
                resendVerification,
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
