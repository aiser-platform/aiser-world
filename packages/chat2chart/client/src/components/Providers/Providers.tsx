'use client';

import { AuthProvider, AuthInitFlag } from '@/context/AuthContext';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ReactNode } from 'react';
import { ThemeProvider } from './ThemeProvider';
import { BrandThemeProvider } from './BrandThemeProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import dynamic from 'next/dynamic';

const ClientDebugOverlay = dynamic(() => import('@/components/DevTools/ClientDebugOverlay'), { ssr: false });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in React Query v5)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
    return (
        <AntdRegistry>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    <BrandThemeProvider>
                        <AuthProvider>
                            <AuthInitFlag />
                            <OnboardingProvider>
                                {children}
                                <ClientDebugOverlay />
                                {process.env.NODE_ENV === 'development' && (
                                    <ReactQueryDevtools initialIsOpen={false} />
                                )}
                            </OnboardingProvider>
                        </AuthProvider>
                    </BrandThemeProvider>
                </ThemeProvider>
            </QueryClientProvider>
        </AntdRegistry>
    );
}
