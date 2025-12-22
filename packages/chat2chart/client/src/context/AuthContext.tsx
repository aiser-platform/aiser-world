"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import LoadingScreen from '@/components/LoadingScreen/LoadingScreen';
import { supabase } from '@/auth/authClient';
import { AuthError, Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  authLoading: boolean;
  actionLoading: boolean;
  loginError: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (email: string, username: string, password: string) => Promise<{ success: boolean; is_verified: boolean; message: string; data?: any }>;
  logout: () => Promise<void>;
  setLoginError: (v: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const user = session?.user ?? null;

  useEffect(() => {
    // load initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    // subscribe to auth state changes
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setLoginError(null);
    setActionLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
    } catch (e: any) {
      setLoginError(e.message);
      throw e;
    } finally {
      setActionLoading(false);
    }
  };

  const signup = async (email: string, _username: string, password: string) => {
    setLoginError(null);
    setActionLoading(true);
    try {
      const res = await supabase.auth.signUp({ email, password });
      if (res.error) {
        let errorMessage = `Signup failed: ${ res.error.message }`;
        setLoginError(errorMessage);
        throw new Error(errorMessage);
      }
      return {
        success: true,
        is_verified: res.data.user?.email_confirmed_at ? true : false,
        message: 'Account created successfully!',
        data: res.data
      };
    }
    finally {
      setActionLoading(false);
    }
  }

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        authLoading,
        actionLoading,
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


// Expose a global flag to signal auth initialization for fetch helpers that
// need to wait for cookies to propagate during startup.
// This effect runs in the provider's module scope via a small wrapper component
// but we set it here using a side-effect when `initialized` changes.
// NOTE: we update the global from inside the provider above via a useEffect below.


export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Return default values if context is not available (shouldn't happen in normal flow)
    return {
      isAuthenticated: false,
      user: null,
      authLoading: true,
      actionLoading: false,
      loginError: null,
      login: async () => { },
      signup: async () => ({ success: false, is_verified: false, message: '' }),
      logout: async () => { },
      setLoginError: () => { },
    };
  }
  return context;
};


export const ProtectedRoute = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { isAuthenticated, authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return null; // redirecting
  }

  return <>{children}</>;
};

export default AuthContext;

export const RedirectAuthenticated = ({ children }: { children: React.ReactNode }) => {

  const router = useRouter();
  const pathname = usePathname();
  const authContext = useAuth();
  const isAuthenticated = authContext?.isAuthenticated ?? false;
  const loading = authContext?.authLoading ?? true;

  useEffect(() => {
    // Handle logout route - don't redirect, just show children
    if (pathname === '/logout') {
      return;
    }

    // Redirect authenticated users away from login/signup pages
    if (isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
      try { router.push('/chat'); } catch (e) { }
    }
  }, [isAuthenticated, router, pathname]);

  // Don't block render of login/signup/logout pages — show loading while verifying
  if (pathname === '/logout') return children;
  if (pathname === '/login' || pathname === '/signup') return children;
  if (loading) return <LoadingScreen />;
  return children;
};
