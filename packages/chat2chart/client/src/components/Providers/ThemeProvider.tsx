'use client';

import { ConfigProvider, theme } from 'antd';
import { ThemeModeContext } from './ThemeModeContext';
import { ReactNode, useLayoutEffect, useState, useEffect } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
    // Start with a deterministic value for server and first-client render to avoid
    // hydration mismatches. We'll read the user's preference after mount and
    // update the state, then synchronously apply the CSS class via
    // useLayoutEffect when `isDarkMode` changes on the client.
    const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

    useEffect(() => {
        // Read persisted preference and system preference only on the client after mount
        try {
            const stored = window.localStorage.getItem('darkMode');
            if (stored !== null) {
                setIsDarkMode(stored === 'true');
                return;
            }
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                setIsDarkMode(true);
                return;
            }
        } catch (e) {
            // swallow
        }
    }, []);

    useLayoutEffect(() => {
        try { localStorage.setItem('darkMode', isDarkMode.toString()); } catch (e) {}
        const root = document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            root.setAttribute('data-theme', 'dark');
        } else {
            root.classList.remove('dark');
            root.setAttribute('data-theme', 'light');
        }
    }, [isDarkMode]);

    return (
        <ThemeModeContext.Provider value={{ isDarkMode, setIsDarkMode }}>
            <ConfigProvider
                theme={{
                    algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
                    token: {
                        // Core brand colors
                        colorPrimary: '#2563eb',
                        colorSuccess: '#16a34a',
                        colorWarning: '#f97316',
                        colorError: '#dc2626',
                        colorInfo: '#0891b2',
                        
                        // Layout tokens - let Ant Design handle these properly
                        colorBgLayout: isDarkMode ? '#0d1117' : '#f8f9fa',
                        colorBgContainer: isDarkMode ? '#1a1a1a' : '#e8eaed',
                        colorBgElevated: isDarkMode ? '#1c2128' : '#f1f3f4',
                        
                        // Text tokens
                        colorText: isDarkMode ? '#e5e5e5' : '#262626',
                        colorTextSecondary: isDarkMode ? '#a0a0a0' : '#595959',
                        colorTextTertiary: isDarkMode ? '#8c8c8c' : '#8c8c8c',
                        colorTextQuaternary: isDarkMode ? '#6b7280' : '#bfbfbf',
                        
                        // Border tokens
                        colorBorder: isDarkMode ? '#404040' : '#d9d9d9',
                        colorBorderSecondary: isDarkMode ? '#374151' : '#f0f0f0',
                        
                        // Typography
                        fontSize: 14,
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        fontSizeHeading1: 38,
                        fontSizeHeading2: 30,
                        fontSizeHeading3: 24,
                        fontSizeHeading4: 20,
                        fontSizeHeading5: 16,
                        
                        // Spacing and borders
                        borderRadius: 6,
                        borderRadiusLG: 8,
                        borderRadiusSM: 4,
                        
                        // Control heights
                        controlHeight: 32,
                        controlHeightLG: 40,
                        controlHeightSM: 24,
                        
                        // Motion
                        motionDurationSlow: '0.3s',
                        motionDurationMid: '0.2s',
                        motionDurationFast: '0.1s',
                    },
                    components: {
                        Layout: {
                            // Use Ant Design's proper layout tokens with dark blue theme
                            bodyBg: isDarkMode ? '#0d1117' : '#f8f9fa',
                            headerBg: isDarkMode ? '#001529' : '#e8eaed', // Dark blue header - same as sidebar
                            siderBg: isDarkMode ? '#001529' : '#e8eaed', // Dark blue sidebar
                            // Force both header and sidebar to use same color
                            ...(isDarkMode && { 
                                colorBgContainer: '#001529', // This will be used by header
                                colorBgElevated: '#001529'
                            })
                        },
                        Menu: {
                            // Use Ant Design's proper menu tokens with dark blue theme
                            itemBg: isDarkMode ? '#001529' : '#e8eaed',
                            itemSelectedBg: '#1890ff',
                            itemSelectedColor: '#ffffff',
                            itemHoverBg: isDarkMode ? '#002140' : '#d1d5db',
                            itemColor: isDarkMode ? '#ffffff' : '#262626',
                            popupBg: isDarkMode ? '#001529' : '#e8eaed',
                            // Force dark theme for menu
                            ...(isDarkMode && { 
                                colorBgContainer: '#001529',
                                colorBgElevated: '#001529',
                                colorText: '#ffffff',
                                colorTextSecondary: '#bfbfbf',
                                // Dropdown specific colors
                                colorFillSecondary: '#002140'
                            })
                        },
                        Button: {
                            controlHeight: 32,
                            controlHeightLG: 40,
                            controlHeightSM: 24,
                            fontWeight: 500,
                        },
                        Input: {
                            controlHeight: 32,
                            controlHeightLG: 40,
                            controlHeightSM: 24,
                        },
                        Select: {
                            controlHeight: 32,
                            controlHeightLG: 40,
                            controlHeightSM: 24,
                        },
                        Dropdown: {
                            // Force our design system colors
                            colorBgElevated: isDarkMode ? '#161b22' : '#ffffff',
                            colorBorder: isDarkMode ? '#30363d' : '#d9d9d9',
                        },
                    },
                }}
            >
                {children}
            </ConfigProvider>
        </ThemeModeContext.Provider>
    );
}