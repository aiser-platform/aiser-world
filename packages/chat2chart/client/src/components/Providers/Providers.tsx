'use client';

import { AuthProvider } from '@/context/AuthContext';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ReactNode } from 'react';
import { ThemeProvider } from './ThemeProvider';
import dynamic from 'next/dynamic';

const ClientDebugOverlay = dynamic(() => import('@/components/DevTools/ClientDebugOverlay'), { ssr: false });

export function Providers({ children }: { children: ReactNode }) {
    return (
        <AntdRegistry>
            <ThemeProvider>
                <AuthProvider>
                    <OnboardingProvider>
                        {children}
                        <ClientDebugOverlay />
                    </OnboardingProvider>
                </AuthProvider>
            </ThemeProvider>
        </AntdRegistry>
    );
}
