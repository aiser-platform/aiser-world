'use client';

import { useCssVar } from '@/hooks/useCssVar';
import { ConfigProvider, theme } from 'antd';
import { ThemeModeContext } from './ThemeModeContext';
import { ReactNode, useLayoutEffect, useState } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const stored = window.localStorage.getItem('darkMode');
            if (stored !== null) return stored === 'true';
            return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });
    const primaryColor = useCssVar('--primary-color');

    useLayoutEffect(() => {
        const root = document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            root.setAttribute('data-theme', 'dark');
        } else {
            root.classList.remove('dark');
            root.setAttribute('data-theme', 'light');
        }
        localStorage.setItem('darkMode', isDarkMode.toString());
    }, [isDarkMode]);

    return (
        <ThemeModeContext.Provider value={{ isDarkMode, setIsDarkMode }}>
        <ConfigProvider
            theme={{
                algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
                token: {
                    colorPrimary: primaryColor,
                    colorBgLayout: isDarkMode ? '#0f0f10' : '#ffffff',
                    colorBgContainer: isDarkMode ? '#1a1a1b' : '#ffffff',
                    colorText: isDarkMode ? '#e8e8e8' : '#141414',
                    colorTextSecondary: isDarkMode ? '#bfbfbf' : '#595959',
                    colorBorder: isDarkMode ? '#2a2a2b' : '#f0f0f0',
                    controlItemBgHover: isDarkMode ? '#262626' : '#f5f5f5',
                },
                components: {
                    Card: {
                        colorBgContainer: isDarkMode ? '#141414' : '#ffffff',
                        colorBorderSecondary: isDarkMode ? '#303030' : '#f0f0f0',
                    },
                    Select: {
                        colorBgContainer: isDarkMode ? '#141414' : '#ffffff',
                        colorBorder: isDarkMode ? '#303030' : '#d9d9d9',
                    },
                    Tabs: {
                        colorBorderSecondary: isDarkMode ? '#303030' : '#f0f0f0',
                    },
                    Tooltip: {
                        colorBgSpotlight: isDarkMode ? '#262626' : '#fafafa',
                        colorTextLightSolid: isDarkMode ? '#fafafa' : '#141414',
                    },
                },
            }}
        >
            {children}
        </ConfigProvider>
        </ThemeModeContext.Provider>
    );
}
