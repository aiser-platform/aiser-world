'use client';

import { AuthProvider } from '@/context/AuthContext';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ReactNode } from 'react';
import { ThemeProvider } from './ThemeProvider';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <AntdRegistry>
            <ThemeProvider>
                <AuthProvider>{children}</AuthProvider>
            </ThemeProvider>
        </AntdRegistry>
    );
}
