'use client';

import { useCssVar } from '@/hooks/useCssVar';
import { useDarkMode } from '@/hooks/useDarkMode';
import { ConfigProvider, theme } from 'antd';
import { ReactNode, useLayoutEffect } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [isDarkMode] = useDarkMode();
    const primaryColor = useCssVar('--primary-color');

    useLayoutEffect(() => {
        document.documentElement.classList.toggle('dark', isDarkMode);
        localStorage.setItem('darkMode', isDarkMode.toString());
    }, [isDarkMode]);

    return (
        <ConfigProvider
            theme={{
                algorithm: isDarkMode
                    ? theme.darkAlgorithm
                    : theme.defaultAlgorithm,
                token: {
                    colorPrimary: primaryColor, // Customize primary color
                },
            }}
        >
            {children}
        </ConfigProvider>
    );
}
