'use client';

import { AuthProvider } from '@/context/AuthContext';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ReactNode } from 'react';
import { ThemeProvider } from './ThemeProvider';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <AntdRegistry>
            <ThemeProvider>
                <AuthProvider>
                    <OnboardingProvider>
                        {children}
                    </OnboardingProvider>
                </AuthProvider>
            </ThemeProvider>
        </AntdRegistry>
    );
}
