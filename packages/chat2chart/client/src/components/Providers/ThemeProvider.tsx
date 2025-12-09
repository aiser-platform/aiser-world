'use client';

import { ConfigProvider, theme } from 'antd';
import { ThemeModeContext } from './ThemeModeContext';
import { ReactNode, useLayoutEffect, useState, useEffect, useMemo } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
    // Initialize state from localStorage immediately to avoid flash
    const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        try {
            const stored = window.localStorage.getItem('darkMode');
            if (stored !== null) {
                return stored === 'true';
            }
            // Fallback to system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return true;
            }
        } catch (e) {
            // swallow
        }
        return false;
    });

    // Sync with localStorage on mount (in case it changed in another tab)
    useEffect(() => {
        const syncTheme = () => {
            try {
                const stored = window.localStorage.getItem('darkMode');
                if (stored !== null) {
                    const shouldBeDark = stored === 'true';
                    if (shouldBeDark !== isDarkMode) {
                        setIsDarkMode(shouldBeDark);
                    }
                }
            } catch (e) {
                // swallow
            }
        };
        
        // Sync on mount
        syncTheme();
        
        // Listen for storage changes (e.g., from another tab)
        window.addEventListener('storage', syncTheme);
        return () => window.removeEventListener('storage', syncTheme);
    }, [isDarkMode]);

    // Calculate navigation background - always use theme-appropriate default
    // IMPORTANT: Dark mode = #030712 (Aiser obsidian navy), Light mode = #fafafa (off-white)
    // This is recalculated on every render to ensure it updates when isDarkMode changes
    // We ignore any stale custom values to prevent colors from getting stuck
    const getNavigationBg = () => {
        if (typeof window === 'undefined') {
            return isDarkMode ? '#030712' : '#fafafa';
        }
        // Always use theme-appropriate default to prevent stuck colors after multiple toggles
        // Dark mode = brand obsidian navy (#030712), Light mode = off-white (#fafafa)
        return isDarkMode ? '#030712' : '#fafafa';
    };
    
    // Recalculate navigationBg whenever isDarkMode changes
    const navigationBg = getNavigationBg();

    const resolveCSSVar = (varName: string, fallback: string) => {
        if (typeof window === 'undefined') {
            return fallback;
        }
        const value = getComputedStyle(document.documentElement).getPropertyValue(varName)?.trim();
        return value || fallback;
    };

    const navigationSiderBg = useMemo(
        () => resolveCSSVar('--color-bg-navigation-sider', isDarkMode ? '#030712' : '#eef1f5'),
        [isDarkMode]
    );

    const navigationHeaderBg = useMemo(
        () => resolveCSSVar('--color-bg-navigation-header', isDarkMode ? '#10131c' : '#ffffff'),
        [isDarkMode]
    );

    const navigationHeaderGlow = useMemo(
        () => resolveCSSVar('--color-bg-navigation-header-glow', isDarkMode ? '#1c2432' : '#dfe4ec'),
        [isDarkMode]
    );
    
    // Listen for navigation background changes from BrandThemeProvider
    useEffect(() => {
        const handleThemeTokenUpdate = (e: CustomEvent) => {
            if (e.detail?.token === '--color-bg-navigation') {
                // Force re-render to pick up new navigation color
                setIsDarkMode(prev => prev);
            }
        };
        window.addEventListener('theme-token-updated', handleThemeTokenUpdate as EventListener);
        return () => window.removeEventListener('theme-token-updated', handleThemeTokenUpdate as EventListener);
    }, []);
    
    // Apply theme changes immediately and persist to localStorage
    useLayoutEffect(() => {
        // Persist to localStorage
        try {
            window.localStorage.setItem('darkMode', isDarkMode.toString());
        } catch (e) {
            console.warn('Failed to persist theme preference:', e);
        }
        
        // Apply to DOM
        const root = document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            root.setAttribute('data-theme', 'dark');
        } else {
            root.classList.remove('dark');
            root.setAttribute('data-theme', 'light');
        }
        
        // Sync Ant Design theme tokens to CSS variables for CSS file usage
        // This ensures CSS files can use var(--ant-color-bg-layout) etc.
        // Simplified 5-color system for clear hierarchy
        // All variables are synchronized - no duplicates or conflicts
        
        // Check if navigation background was customized via BrandThemeProvider
        // IMPORTANT: Always use theme-appropriate default, ignore any stale custom values
        // This ensures colors update correctly when toggling between light/dark mode
        const customNavBg = root.style.getPropertyValue('--color-bg-navigation')?.trim();
        // Force theme-appropriate color based on current isDarkMode state
        // Dark mode = brand obsidian navy (#030712), Light mode = off-white (#fafafa)
        // Only use custom value if it matches the current theme (to prevent stuck colors)
        const themeDefault = isDarkMode ? '#030712' : '#fafafa';
        const calculatedNavBg = customNavBg && customNavBg === themeDefault ? customNavBg : themeDefault;
        
        const tokens = {
            // 1. Base Background (Page/Layout) - Darkest/Lightest
            '--ant-color-bg-layout': isDarkMode ? '#0d1117' : '#ffffff',
            '--color-bg-base': isDarkMode ? '#0d1117' : '#ffffff',
            
            // 2. Container Background (Cards, Panels, Tables, Forms)
            '--ant-color-bg-container': isDarkMode ? '#161b22' : '#f8f9fa',
            '--color-bg-container': isDarkMode ? '#161b22' : '#f8f9fa',
            
            // 3. Elevated Background (Modals, Dropdowns, Hover states, Table headers)
            '--ant-color-bg-elevated': isDarkMode ? '#1c2128' : '#f1f3f5',
            '--color-bg-elevated': isDarkMode ? '#1c2128' : '#f1f3f5',
            
            // 4. Navigation Background (Header, Sidebar, Menu) - Use custom value if set, otherwise default
            '--ant-color-bg-navigation': calculatedNavBg,
            '--color-bg-navigation': calculatedNavBg,
            '--color-bg-navigation-sider': isDarkMode ? '#030712' : '#eef1f5',
            '--color-bg-navigation-header': isDarkMode ? '#10131c' : '#ffffff',
            '--color-bg-navigation-header-glow': isDarkMode ? '#1c2432' : '#dfe4ec',
            '--ant-color-bg-navigation-hover': isDarkMode ? '#0b162e' : '#f0f0f0',
            
            // 5. Border/Divider - Single consistent color
            '--ant-color-border': isDarkMode ? '#30363d' : '#e1e4e8',
            '--color-border': isDarkMode ? '#30363d' : '#e1e4e8',
            '--ant-color-border-secondary': isDarkMode ? '#30363d' : '#e1e4e8',
            
            // Text Colors - Clear hierarchy (synchronized)
            '--ant-color-text': isDarkMode ? '#e6edf3' : '#24292f',
            '--color-text-primary': isDarkMode ? '#e6edf3' : '#24292f',
            '--ant-color-text-secondary': isDarkMode ? '#8b949e' : '#57606a',
            '--color-text-secondary': isDarkMode ? '#8b949e' : '#57606a',
            '--ant-color-text-tertiary': isDarkMode ? '#6e7681' : '#8b949e',
            '--color-text-tertiary': isDarkMode ? '#6e7681' : '#8b949e',
            '--ant-color-text-quaternary': isDarkMode ? '#6b7280' : '#bfbfbf',
            
            // Primary Color - Consistent (all variants synchronized)
            '--ant-color-primary': '#00c2cb',
            '--color-primary': '#00c2cb',
            '--ant-primary-color': '#00c2cb', // Ant Design alias
            '--ant-color-primary-hover': '#00a5af',
            '--color-primary-hover': '#00a5af',
            '--ant-primary-color-hover': '#00a5af', // Ant Design alias
            '--ant-color-primary-active': '#008b95',
            '--color-primary-active': '#008b95',
            '--ant-primary-color-active': '#008b95', // Ant Design alias
            '--ant-color-primary-bg': isDarkMode ? 'rgba(0, 194, 203, 0.22)' : 'rgba(0, 194, 203, 0.14)',
            '--ant-primary-color-outline': isDarkMode ? 'rgba(0, 194, 203, 0.22)' : 'rgba(0, 194, 203, 0.14)',
            
            // Functional Colors - Minimal usage
            '--ant-color-success': '#16a34a',
            '--ant-color-warning': '#f97316',
            '--ant-color-error': '#dc2626',
            '--ant-color-info': '#0891b2',
            
            // Fill Colors - Use elevated/container for consistency
            '--ant-color-fill': isDarkMode ? '#1c2128' : '#f1f3f5',
            '--ant-color-fill-secondary': isDarkMode ? '#1c2128' : '#f1f3f5',
            '--ant-color-fill-tertiary': isDarkMode ? '#161b22' : '#f8f9fa',
        };
        
        // Apply CSS variables to root element with !important priority
        // This ensures our values override any from BrandThemeProvider or Ant Design
        Object.entries(tokens).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });
        
        // Remove deprecated variables that might conflict
        const deprecatedVars = [
            '--ant-color-bg-header',
            '--ant-color-bg-sider',
            '--ant-color-bg-content',
        ];
        deprecatedVars.forEach(key => {
            root.style.removeProperty(key);
        });
    }, [isDarkMode]);
    
    // Wrapper to ensure persistence on every change
    const setDarkModeWithPersistence = (value: boolean | ((prev: boolean) => boolean)) => {
        setIsDarkMode(prev => {
            const newValue = typeof value === 'function' ? value(prev) : value;
            // Persist immediately
            try {
                window.localStorage.setItem('darkMode', newValue.toString());
            } catch (e) {
                console.warn('Failed to persist theme preference:', e);
            }
            return newValue;
        });
    };

    return (
        <ThemeModeContext.Provider value={{ isDarkMode, setIsDarkMode: setDarkModeWithPersistence }}>
            <ConfigProvider
                theme={{
                    algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
                    token: {
                        // Core brand colors
                        colorPrimary: '#00c2cb',
                        colorSuccess: '#16a34a',
                        colorWarning: '#f97316',
                        colorError: '#dc2626',
                        colorInfo: '#0891b2',
                        
                        // Simplified 5-color system - synchronized with CSS variables
                        colorBgLayout: isDarkMode ? '#0d1117' : '#ffffff', // 1. Base (page background)
                        colorBgContainer: isDarkMode ? '#161b22' : '#f8f9fa', // 2. Container (cards, panels, tables, forms)
                        colorBgElevated: isDarkMode ? '#1c2128' : '#f1f3f5', // 3. Elevated (modals, dropdowns, hover, table headers)
                        
                        // Text tokens - Clear hierarchy (synchronized with CSS variables)
                        colorText: isDarkMode ? '#e6edf3' : '#24292f',
                        colorTextSecondary: isDarkMode ? '#8b949e' : '#57606a',
                        colorTextTertiary: isDarkMode ? '#6e7681' : '#8b949e',
                        colorTextQuaternary: isDarkMode ? '#6b7280' : '#bfbfbf',
                        
                        // Border tokens - Single consistent color (synchronized)
                        colorBorder: isDarkMode ? '#30363d' : '#e1e4e8',
                        colorBorderSecondary: isDarkMode ? '#30363d' : '#e1e4e8',
                        
                        // Typography - Enhanced for premium feel
                        fontSize: 14,
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Inter", sans-serif',
                        fontSizeHeading1: 38,
                        fontSizeHeading2: 30,
                        fontSizeHeading3: 24,
                        fontSizeHeading4: 20,
                        fontSizeHeading5: 16,
                        lineHeight: 1.6,
                        lineHeightHeading1: 1.2,
                        lineHeightHeading2: 1.3,
                        lineHeightHeading3: 1.4,
                        
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
                            // Simplified 5-color system
                            bodyBg: isDarkMode ? '#0d1117' : '#ffffff', // 1. Base
                            headerBg: navigationHeaderBg, // 4. Navigation (uses custom value if set)
                            siderBg: navigationSiderBg, // 4. Navigation (uses custom value if set)
                        },
                        Menu: {
                            // Menu uses navigation color (matches sidebar/header)
                            itemBg: navigationSiderBg, // 4. Navigation (uses custom value if set)
                            itemSelectedBg: '#00c2cb', // Primary color
                            itemSelectedColor: '#ffffff',
                            itemHoverBg: isDarkMode ? '#1c2128' : '#f1f3f5', // 3. Elevated
                            itemColor: isDarkMode ? '#e6edf3' : '#24292f', // Text primary
                            popupBg: navigationSiderBg, // 4. Navigation (matches sidebar, uses custom value if set)
                            colorText: isDarkMode ? '#e6edf3' : '#24292f',
                            colorTextSecondary: isDarkMode ? '#8b949e' : '#57606a',
                        },
                        Card: {
                            // Cards use container color
                            colorBgContainer: isDarkMode ? '#161b22' : '#f8f9fa', // 2. Container
                            colorBorderSecondary: isDarkMode ? '#30363d' : '#e1e4e8', // 5. Border
                        },
                        Table: {
                            // Tables use container color
                            colorBgContainer: isDarkMode ? '#161b22' : '#f8f9fa', // 2. Container
                            headerBg: isDarkMode ? '#1c2128' : '#f1f3f5', // 3. Elevated (header)
                            borderColor: isDarkMode ? '#30363d' : '#e1e4e8', // 5. Border
                        },
                        Form: {
                            // Forms use container color
                            colorBgContainer: isDarkMode ? '#161b22' : '#f8f9fa', // 2. Container
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
                            colorBgContainer: isDarkMode ? '#161b22' : '#f8f9fa', // 2. Container
                            colorBorder: isDarkMode ? '#30363d' : '#e1e4e8', // 5. Border
                        },
                        Select: {
                            controlHeight: 32,
                            controlHeightLG: 40,
                            controlHeightSM: 24,
                            colorBgContainer: isDarkMode ? '#161b22' : '#f8f9fa', // 2. Container
                        },
                        Dropdown: {
                            // Dropdowns use elevated color
                            colorBgElevated: isDarkMode ? '#1c2128' : '#f1f3f5', // 3. Elevated
                            colorBorder: isDarkMode ? '#30363d' : '#e1e4e8', // 5. Border
                        },
                        Modal: {
                            // Modals use elevated color
                            colorBgElevated: isDarkMode ? '#1c2128' : '#f1f3f5', // 3. Elevated
                            colorBorder: isDarkMode ? '#30363d' : '#e1e4e8', // 5. Border
                        },
                        Drawer: {
                            // Drawers use elevated color
                            colorBgElevated: isDarkMode ? '#1c2128' : '#f1f3f5', // 3. Elevated
                            colorBorder: isDarkMode ? '#30363d' : '#e1e4e8', // 5. Border
                        },
                    },
                }}
            >
                {children}
            </ConfigProvider>
        </ThemeModeContext.Provider>
    );
}