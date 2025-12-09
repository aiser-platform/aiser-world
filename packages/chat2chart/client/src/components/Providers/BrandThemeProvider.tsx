'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ConfigProvider, theme } from 'antd';

// Brand theme storage key
const BRAND_THEME_STORAGE_KEY = 'aiser_brand_theme_vars';

// Brand theme context
interface BrandThemeContextType {
  brandTokens: Record<string, string>;
  updateBrandToken: (key: string, value: string) => void;
  resetBrandTheme: () => void;
  loadBrandPreset: (preset: BrandPreset) => void;
  exportBrandTheme: () => void;
  importBrandTheme: (themeData: Record<string, string>) => void;
  isCustomBrand: boolean;
}

const BrandThemeContext = createContext<BrandThemeContextType | undefined>(undefined);

// Brand preset interface
export interface BrandPreset {
  name: string;
  description: string;
  organizationType?: 'general' | 'corporate' | 'technology' | 'environmental' | 'creative' | 'financial' | 'healthcare' | 'education';
  organization?: string;
  light: Record<string, string>;
  dark: Record<string, string>;
  logo?: string;
  favicon?: string;
}

// Default brand presets
export const DEFAULT_BRAND_PRESETS: BrandPreset[] = [
  {
    name: 'Aiser Default',
    description: 'Professional blue theme for general use',
    organizationType: 'general',
    organization: 'Aiser',
    light: {
      '--ant-primary-color': '#00c2cb',
      '--ant-primary-color-hover': '#00a5af',
      '--ant-primary-color-active': '#008b95',
      '--ant-primary-color-outline': '#ccf6f8',
      '--ant-color-bg-layout': '#ffffff',
      '--color-bg-base': '#ffffff',
      '--ant-color-bg-container': '#f8f9fa',
      '--color-bg-container': '#f8f9fa',
      '--ant-color-bg-elevated': '#f1f3f5',
      '--color-bg-elevated': '#f1f3f5',
      '--ant-color-bg-navigation': '#fafafa',
      '--color-bg-navigation': '#fafafa',
      '--color-bg-navigation-sider': '#eef1f5',
      '--color-bg-navigation-header': '#ffffff',
      '--color-bg-navigation-header-glow': '#dfe4ec',
      '--ant-color-text': '#24292f',
      '--color-text-primary': '#24292f',
      '--ant-color-text-secondary': '#57606a',
      '--color-text-secondary': '#57606a',
      '--ant-color-text-tertiary': '#8b949e',
      '--color-text-tertiary': '#8b949e',
      '--ant-color-text-quaternary': '#bfbfbf',
      '--ant-color-border': '#e1e4e8',
      '--color-border': '#e1e4e8',
      '--ant-color-border-secondary': '#e1e4e8',
      '--ant-color-success': '#52c41a',
      '--ant-color-warning': '#faad14',
      '--ant-color-error': '#ff4d4f',
      '--ant-color-info': '#1890ff',
      '--ant-font-size': '14px',
      '--ant-font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      '--ant-border-radius': '6px',
    },
    dark: {
      '--ant-primary-color': '#00c2cb',
      '--ant-primary-color-hover': '#00a5af',
      '--ant-primary-color-active': '#008b95',
      '--ant-primary-color-outline': 'rgba(0, 194, 203, 0.22)',
      '--ant-color-bg-layout': '#0d1117',
      '--color-bg-base': '#0d1117',
      '--ant-color-bg-container': '#161b22',
      '--color-bg-container': '#161b22',
      '--ant-color-bg-elevated': '#1c2128',
      '--color-bg-elevated': '#1c2128',
      '--ant-color-bg-navigation': '#030712',
      '--color-bg-navigation': '#030712',
      '--color-bg-navigation-sider': '#030712',
      '--color-bg-navigation-header': '#10131c',
      '--color-bg-navigation-header-glow': '#1c2432',
      '--ant-color-text': '#e6edf3',
      '--color-text-primary': '#e6edf3',
      '--ant-color-text-secondary': '#8b949e',
      '--color-text-secondary': '#8b949e',
      '--ant-color-text-tertiary': '#6e7681',
      '--color-text-tertiary': '#6e7681',
      '--ant-color-text-quaternary': '#6b7280',
      '--ant-color-border': '#30363d',
      '--color-border': '#30363d',
      '--ant-color-border-secondary': '#30363d',
      '--ant-color-success': '#52c41a',
      '--ant-color-warning': '#faad14',
      '--ant-color-error': '#ff4d4f',
      '--ant-color-info': '#1890ff',
      '--ant-font-size': '14px',
      '--ant-font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      '--ant-border-radius': '6px',
    }
  },
  {
    name: 'Enterprise Blue',
    description: 'Corporate blue theme for enterprise environments',
    organizationType: 'corporate',
    organization: 'Enterprise',
    light: {
      '--ant-primary-color': '#1e40af',
      '--ant-primary-color-hover': '#1d4ed8',
      '--ant-primary-color-active': '#1e3a8a',
      '--ant-primary-color-outline': '#dbeafe',
      '--ant-color-bg-layout': '#f8fafc',
      '--ant-color-bg-header': '#e2e8f0',
      '--ant-color-bg-sider': '#e2e8f0',
      '--ant-color-bg-content': '#ffffff',
      '--ant-color-bg-container': '#f1f5f9',
      '--ant-color-bg-elevated': '#ffffff',
      '--ant-color-text': '#1e293b',
      '--ant-color-text-secondary': '#475569',
      '--ant-color-text-tertiary': '#64748b',
      '--ant-color-text-quaternary': '#94a3b8',
      '--ant-color-border': '#cbd5e1',
      '--ant-color-border-secondary': '#e2e8f0',
      '--ant-color-success': '#059669',
      '--ant-color-warning': '#d97706',
      '--ant-color-error': '#dc2626',
      '--ant-color-info': '#0284c7',
      '--ant-font-size': '14px',
      '--ant-font-family': 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      '--ant-border-radius': '8px',
    },
    dark: {
      '--ant-primary-color': '#3b82f6',
      '--ant-primary-color-hover': '#60a5fa',
      '--ant-primary-color-active': '#00c2cb',
      '--ant-primary-color-outline': '#1e3a8a',
      '--ant-color-bg-layout': '#0f172a',
      '--ant-color-bg-header': '#1e293b',
      '--ant-color-bg-sider': '#1e293b',
      '--ant-color-bg-content': '#334155',
      '--ant-color-bg-container': '#475569',
      '--ant-color-bg-elevated': '#64748b',
      '--ant-color-text': '#f1f5f9',
      '--ant-color-text-secondary': '#cbd5e1',
      '--ant-color-text-tertiary': '#94a3b8',
      '--ant-color-text-quaternary': '#64748b',
      '--ant-color-border': '#475569',
      '--ant-color-border-secondary': '#334155',
      '--ant-color-success': '#10b981',
      '--ant-color-warning': '#f59e0b',
      '--ant-color-error': '#ef4444',
      '--ant-color-info': '#06b6d4',
      '--ant-font-size': '14px',
      '--ant-font-family': 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      '--ant-border-radius': '8px',
    }
  },
  {
    name: 'Modern Green',
    description: 'Eco-friendly green theme',
    organization: 'EcoCorp',
    light: {
      '--ant-primary-color': '#059669',
      '--ant-primary-color-hover': '#047857',
      '--ant-primary-color-active': '#065f46',
      '--ant-primary-color-outline': '#d1fae5',
      '--ant-color-bg-layout': '#f0fdf4',
      '--ant-color-bg-header': '#dcfce7',
      '--ant-color-bg-sider': '#dcfce7',
      '--ant-color-bg-content': '#ffffff',
      '--ant-color-bg-container': '#f0fdf4',
      '--ant-color-bg-elevated': '#ffffff',
      '--ant-color-text': '#14532d',
      '--ant-color-text-secondary': '#365314',
      '--ant-color-text-tertiary': '#4b5563',
      '--ant-color-text-quaternary': '#6b7280',
      '--ant-color-border': '#bbf7d0',
      '--ant-color-border-secondary': '#dcfce7',
      '--ant-color-success': '#22c55e',
      '--ant-color-warning': '#eab308',
      '--ant-color-error': '#dc2626',
      '--ant-color-info': '#06b6d4',
      '--ant-font-size': '14px',
      '--ant-font-family': 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif',
      '--ant-border-radius': '12px',
    },
    dark: {
      '--ant-primary-color': '#10b981',
      '--ant-primary-color-hover': '#34d399',
      '--ant-primary-color-active': '#059669',
      '--ant-primary-color-outline': '#064e3b',
      '--ant-color-bg-layout': '#022c0e',
      '--ant-color-bg-header': '#14532d',
      '--ant-color-bg-sider': '#14532d',
      '--ant-color-bg-content': '#052e16',
      '--ant-color-bg-container': '#14532d',
      '--ant-color-bg-elevated': '#166534',
      '--ant-color-text': '#d1fae5',
      '--ant-color-text-secondary': '#86efac',
      '--ant-color-text-tertiary': '#4ade80',
      '--ant-color-text-quaternary': '#22c55e',
      '--ant-color-border': '#365314',
      '--ant-color-border-secondary': '#14532d',
      '--ant-color-success': '#22c55e',
      '--ant-color-warning': '#f59e0b',
      '--ant-color-error': '#ef4444',
      '--ant-color-info': '#06b6d4',
      '--ant-font-size': '14px',
      '--ant-font-family': 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif',
      '--ant-border-radius': '12px',
    }
  },
  {
    name: 'Tech Purple',
    description: 'Modern purple theme for tech companies',
    organizationType: 'technology',
    organization: 'TechCorp',
    light: {
      '--ant-primary-color': '#8b5cf6',
      '--ant-primary-color-hover': '#7c3aed',
      '--ant-primary-color-active': '#6d28d9',
      '--ant-primary-color-outline': '#ede9fe',
      '--ant-color-bg-layout': '#fafafa',
      '--ant-color-bg-header': '#f3f4f6',
      '--ant-color-bg-sider': '#f3f4f6',
      '--ant-color-bg-content': '#ffffff',
      '--ant-color-bg-container': '#f9fafb',
      '--ant-color-bg-elevated': '#ffffff',
      '--ant-color-text': '#1f2937',
      '--ant-color-text-secondary': '#6b7280',
      '--ant-color-text-tertiary': '#9ca3af',
      '--ant-color-text-quaternary': '#d1d5db',
      '--ant-color-border': '#e5e7eb',
      '--ant-color-border-secondary': '#f3f4f6',
      '--ant-color-success': '#10b981',
      '--ant-color-warning': '#f59e0b',
      '--ant-color-error': '#ef4444',
      '--ant-color-info': '#3b82f6',
      '--ant-font-size': '14px',
      '--ant-font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      '--ant-border-radius': '8px',
    },
    dark: {
      '--ant-primary-color': '#a78bfa',
      '--ant-primary-color-hover': '#8b5cf6',
      '--ant-primary-color-active': '#7c3aed',
      '--ant-primary-color-outline': '#4c1d95',
      '--ant-color-bg-layout': '#0f0f23',
      '--ant-color-bg-header': '#1e1b4b',
      '--ant-color-bg-sider': '#1e1b4b',
      '--ant-color-bg-content': '#312e81',
      '--ant-color-bg-container': '#3730a3',
      '--ant-color-bg-elevated': '#4338ca',
      '--ant-color-text': '#e0e7ff',
      '--ant-color-text-secondary': '#c7d2fe',
      '--ant-color-text-tertiary': '#a5b4fc',
      '--ant-color-text-quaternary': '#818cf8',
      '--ant-color-border': '#6366f1',
      '--ant-color-border-secondary': '#4f46e5',
      '--ant-color-success': '#34d399',
      '--ant-color-warning': '#fbbf24',
      '--ant-color-error': '#f87171',
      '--ant-color-info': '#60a5fa',
      '--ant-font-size': '14px',
      '--ant-font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      '--ant-border-radius': '8px',
    }
  },
  {
    name: 'Finance Gold',
    description: 'Professional gold theme for financial services',
    organizationType: 'financial',
    organization: 'FinanceCorp',
    light: {
      '--ant-primary-color': '#d97706',
      '--ant-primary-color-hover': '#b45309',
      '--ant-primary-color-active': '#92400e',
      '--ant-primary-color-outline': '#fef3c7',
      '--ant-color-bg-layout': '#fefefe',
      '--ant-color-bg-header': '#f8fafc',
      '--ant-color-bg-sider': '#f8fafc',
      '--ant-color-bg-content': '#ffffff',
      '--ant-color-bg-container': '#f1f5f9',
      '--ant-color-bg-elevated': '#ffffff',
      '--ant-color-text': '#1e293b',
      '--ant-color-text-secondary': '#64748b',
      '--ant-color-text-tertiary': '#94a3b8',
      '--ant-color-text-quaternary': '#cbd5e1',
      '--ant-color-border': '#e2e8f0',
      '--ant-color-border-secondary': '#f1f5f9',
      '--ant-color-success': '#059669',
      '--ant-color-warning': '#d97706',
      '--ant-color-error': '#dc2626',
      '--ant-color-info': '#0284c7',
      '--ant-font-size': '14px',
      '--ant-font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      '--ant-border-radius': '6px',
    },
    dark: {
      '--ant-primary-color': '#f59e0b',
      '--ant-primary-color-hover': '#d97706',
      '--ant-primary-color-active': '#b45309',
      '--ant-primary-color-outline': '#451a03',
      '--ant-color-bg-layout': '#0c0a09',
      '--ant-color-bg-header': '#1c1917',
      '--ant-color-bg-sider': '#1c1917',
      '--ant-color-bg-content': '#292524',
      '--ant-color-bg-container': '#44403c',
      '--ant-color-bg-elevated': '#57534e',
      '--ant-color-text': '#fafaf9',
      '--ant-color-text-secondary': '#e7e5e4',
      '--ant-color-text-tertiary': '#d6d3d1',
      '--ant-color-text-quaternary': '#a8a29e',
      '--ant-color-border': '#78716c',
      '--ant-color-border-secondary': '#57534e',
      '--ant-color-success': '#10b981',
      '--ant-color-warning': '#f59e0b',
      '--ant-color-error': '#f87171',
      '--ant-color-info': '#60a5fa',
      '--ant-font-size': '14px',
      '--ant-font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      '--ant-border-radius': '6px',
    }
  },
  {
    name: 'Healthcare Teal',
    description: 'Calming teal theme for healthcare organizations',
    organizationType: 'healthcare',
    organization: 'HealthCorp',
    light: {
      '--ant-primary-color': '#0d9488',
      '--ant-primary-color-hover': '#0f766e',
      '--ant-primary-color-active': '#115e59',
      '--ant-primary-color-outline': '#ccfbf1',
      '--ant-color-bg-layout': '#f0fdfa',
      '--ant-color-bg-header': '#e6fffa',
      '--ant-color-bg-sider': '#e6fffa',
      '--ant-color-bg-content': '#ffffff',
      '--ant-color-bg-container': '#f0fdfa',
      '--ant-color-bg-elevated': '#ffffff',
      '--ant-color-text': '#134e4a',
      '--ant-color-text-secondary': '#0f766e',
      '--ant-color-text-tertiary': '#14b8a6',
      '--ant-color-text-quaternary': '#5eead4',
      '--ant-color-border': '#99f6e4',
      '--ant-color-border-secondary': '#ccfbf1',
      '--ant-color-success': '#059669',
      '--ant-color-warning': '#d97706',
      '--ant-color-error': '#dc2626',
      '--ant-color-info': '#0284c7',
      '--ant-font-size': '14px',
      '--ant-font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      '--ant-border-radius': '8px',
    },
    dark: {
      '--ant-primary-color': '#14b8a6',
      '--ant-primary-color-hover': '#0d9488',
      '--ant-primary-color-active': '#0f766e',
      '--ant-primary-color-outline': '#134e4a',
      '--ant-color-bg-layout': '#042f2e',
      '--ant-color-bg-header': '#134e4a',
      '--ant-color-bg-sider': '#134e4a',
      '--ant-color-bg-content': '#0f766e',
      '--ant-color-bg-container': '#115e59',
      '--ant-color-bg-elevated': '#0d9488',
      '--ant-color-text': '#ccfbf1',
      '--ant-color-text-secondary': '#99f6e4',
      '--ant-color-text-tertiary': '#5eead4',
      '--ant-color-text-quaternary': '#2dd4bf',
      '--ant-color-border': '#14b8a6',
      '--ant-color-border-secondary': '#0d9488',
      '--ant-color-success': '#10b981',
      '--ant-color-warning': '#f59e0b',
      '--ant-color-error': '#f87171',
      '--ant-color-info': '#60a5fa',
      '--ant-font-size': '14px',
      '--ant-font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      '--ant-border-radius': '8px',
    }
  },
  {
    name: 'Education Orange',
    description: 'Energetic orange theme for educational institutions',
    organizationType: 'education',
    organization: 'EduCorp',
    light: {
      '--ant-primary-color': '#ea580c',
      '--ant-primary-color-hover': '#c2410c',
      '--ant-primary-color-active': '#9a3412',
      '--ant-primary-color-outline': '#fed7aa',
      '--ant-color-bg-layout': '#fff7ed',
      '--ant-color-bg-header': '#ffedd5',
      '--ant-color-bg-sider': '#ffedd5',
      '--ant-color-bg-content': '#ffffff',
      '--ant-color-bg-container': '#fff7ed',
      '--ant-color-bg-elevated': '#ffffff',
      '--ant-color-text': '#9a3412',
      '--ant-color-text-secondary': '#c2410c',
      '--ant-color-text-tertiary': '#ea580c',
      '--ant-color-text-quaternary': '#fb923c',
      '--ant-color-border': '#fdba74',
      '--ant-color-border-secondary': '#fed7aa',
      '--ant-color-success': '#059669',
      '--ant-color-warning': '#d97706',
      '--ant-color-error': '#dc2626',
      '--ant-color-info': '#0284c7',
      '--ant-font-size': '14px',
      '--ant-font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      '--ant-border-radius': '10px',
    },
    dark: {
      '--ant-primary-color': '#fb923c',
      '--ant-primary-color-hover': '#ea580c',
      '--ant-primary-color-active': '#c2410c',
      '--ant-primary-color-outline': '#9a3412',
      '--ant-color-bg-layout': '#431407',
      '--ant-color-bg-header': '#9a3412',
      '--ant-color-bg-sider': '#9a3412',
      '--ant-color-bg-content': '#c2410c',
      '--ant-color-bg-container': '#ea580c',
      '--ant-color-bg-elevated': '#fb923c',
      '--ant-color-text': '#fed7aa',
      '--ant-color-text-secondary': '#fdba74',
      '--ant-color-text-tertiary': '#fb923c',
      '--ant-color-text-quaternary': '#f97316',
      '--ant-color-border': '#ea580c',
      '--ant-color-border-secondary': '#c2410c',
      '--ant-color-success': '#10b981',
      '--ant-color-warning': '#f59e0b',
      '--ant-color-error': '#f87171',
      '--ant-color-info': '#60a5fa',
      '--ant-font-size': '14px',
      '--ant-font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      '--ant-border-radius': '10px',
    }
  }
];

// Brand theme provider component
export function BrandThemeProvider({ children }: { children: ReactNode }) {
  const [brandTokens, setBrandTokens] = useState<Record<string, string>>({});
  const [isCustomBrand, setIsCustomBrand] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load brand theme from localStorage on mount
  useEffect(() => {
    const loadBrandTheme = () => {
      try {
        const stored = localStorage.getItem(BRAND_THEME_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Record<string, string>;
          setBrandTokens(parsed);
          setIsCustomBrand(true);
          applyBrandTokens(parsed);
        } else {
          // Load default theme
          const defaultPreset = DEFAULT_BRAND_PRESETS[0];
          const defaultTokens = isDarkMode ? defaultPreset.dark : defaultPreset.light;
          setBrandTokens(defaultTokens);
          setIsCustomBrand(false);
          applyBrandTokens(defaultTokens);
        }
      } catch (error) {
        console.warn('Failed to load brand theme:', error);
        // Fallback to default
        const defaultPreset = DEFAULT_BRAND_PRESETS[0];
        const defaultTokens = isDarkMode ? defaultPreset.dark : defaultPreset.light;
        setBrandTokens(defaultTokens);
        setIsCustomBrand(false);
        applyBrandTokens(defaultTokens);
      }
    };

    // Only run on client side
    if (typeof window !== 'undefined') {
      loadBrandTheme();
    }
  }, [isDarkMode]);

  // Listen for theme mode changes
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      setIsDarkMode(isDark);
    };
    
    checkTheme();
    
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    
    return () => observer.disconnect();
  }, []);

  // Apply brand tokens to CSS variables and Ant Design theme
  const applyBrandTokens = (tokens: Record<string, string>) => {
    // Only apply on client side
    if (typeof window === 'undefined') return;
    
    // Filter out deprecated variables - don't set them
    const deprecatedVars = [
      '--ant-color-bg-header',
      '--ant-color-bg-sider',
      '--ant-color-bg-content',
    ];
    
    // Apply to CSS variables (excluding deprecated ones)
    Object.entries(tokens).forEach(([key, value]) => {
      if (!deprecatedVars.includes(key)) {
        document.documentElement.style.setProperty(key, value);
      }
    });
    
    // CRITICAL: If navigation background is changed, also update ThemeProvider's Layout and Menu components
    // This ensures header, sidebar, menu, and submenu colors update immediately
    if (tokens['--color-bg-navigation']) {
      // Trigger a re-render by updating the theme mode detection
      // The ThemeProvider will pick up the new CSS variable value
      const event = new CustomEvent('theme-token-updated', { 
        detail: { token: '--color-bg-navigation', value: tokens['--color-bg-navigation'] }
      });
      window.dispatchEvent(event);
    }

    // Apply to Ant Design theme tokens
    const antdTokens = {
      colorPrimary: tokens['--ant-primary-color'] || '#00c2cb',
      colorSuccess: tokens['--ant-color-success'] || '#52c41a',
      colorWarning: tokens['--ant-color-warning'] || '#faad14',
      colorError: tokens['--ant-color-error'] || '#ff4d4f',
      colorInfo: tokens['--ant-color-info'] || '#1890ff',
      colorBgLayout: tokens['--ant-color-bg-layout'] || (isDarkMode ? '#0d1117' : '#f8f9fa'),
      colorBgContainer: tokens['--ant-color-bg-container'] || (isDarkMode ? '#1c2128' : '#f1f3f4'),
      colorBgElevated: tokens['--ant-color-bg-elevated'] || (isDarkMode ? '#21262d' : '#ffffff'),
      colorText: tokens['--ant-color-text'] || (isDarkMode ? '#e5e5e5' : '#262626'),
      colorTextSecondary: tokens['--ant-color-text-secondary'] || (isDarkMode ? '#a0a0a0' : '#595959'),
      colorTextTertiary: tokens['--ant-color-text-tertiary'] || (isDarkMode ? '#8c8c8c' : '#8c8c8c'),
      colorTextQuaternary: tokens['--ant-color-text-quaternary'] || (isDarkMode ? '#6b7280' : '#bfbfbf'),
      colorBorder: tokens['--ant-color-border'] || (isDarkMode ? '#404040' : '#d9d9d9'),
      colorBorderSecondary: tokens['--ant-color-border-secondary'] || (isDarkMode ? '#30363d' : '#f0f0f0'),
      fontSize: parseInt(tokens['--ant-font-size']?.replace('px', '') || '14'),
      fontFamily: tokens['--ant-font-family'] || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      borderRadius: parseInt(tokens['--ant-border-radius']?.replace('px', '') || '6'),
    };

    // Update Ant Design theme
    try {
      ConfigProvider.config({
        theme: {
          algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: antdTokens,
        },
      });
    } catch (error) {
      console.warn('Failed to update Ant Design theme:', error);
    }
  };

  // Update a single brand token
  const updateBrandToken = (key: string, value: string) => {
    const newTokens = { ...brandTokens, [key]: value };
    setBrandTokens(newTokens);
    setIsCustomBrand(true);
    
    // Apply immediately (only on client side)
    if (typeof window !== 'undefined') {
      document.documentElement.style.setProperty(key, value);
    }
    
    // Save to localStorage
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(BRAND_THEME_STORAGE_KEY, JSON.stringify(newTokens));
      }
    } catch (error) {
      console.warn('Failed to save brand token:', error);
    }
  };

  // Reset to default brand theme
  const resetBrandTheme = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(BRAND_THEME_STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Failed to reset brand theme:', error);
    }
    
    const defaultPreset = DEFAULT_BRAND_PRESETS[0];
    const defaultTokens = isDarkMode ? defaultPreset.dark : defaultPreset.light;
    setBrandTokens(defaultTokens);
    setIsCustomBrand(false);
    applyBrandTokens(defaultTokens);
  };

  // Load a brand preset
  const loadBrandPreset = (preset: BrandPreset) => {
    const presetTokens = isDarkMode ? preset.dark : preset.light;
    setBrandTokens(presetTokens);
    setIsCustomBrand(true);
    applyBrandTokens(presetTokens);
    
    // Save to localStorage
    try {
      localStorage.setItem(BRAND_THEME_STORAGE_KEY, JSON.stringify(presetTokens));
    } catch (error) {
      console.warn('Failed to save brand preset:', error);
    }
  };

  // Export current brand theme
  const exportBrandTheme = () => {
    const exportData = {
      name: 'Custom Brand Theme',
      description: 'Exported brand theme',
      light: brandTokens,
      dark: brandTokens, // For now, use same tokens for both modes
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aiser-brand-theme-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import brand theme
  const importBrandTheme = (themeData: Record<string, string>) => {
    setBrandTokens(themeData);
    setIsCustomBrand(true);
    applyBrandTokens(themeData);
    
    // Save to localStorage
    try {
      localStorage.setItem(BRAND_THEME_STORAGE_KEY, JSON.stringify(themeData));
    } catch (error) {
      console.warn('Failed to import brand theme:', error);
    }
  };

  const contextValue: BrandThemeContextType = {
    brandTokens,
    updateBrandToken,
    resetBrandTheme,
    loadBrandPreset,
    exportBrandTheme,
    importBrandTheme,
    isCustomBrand,
  };

  return (
    <BrandThemeContext.Provider value={contextValue}>
      <ConfigProvider
        theme={{
          algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            // Apply brand tokens to Ant Design
            colorPrimary: brandTokens['--ant-primary-color'] || '#00c2cb',
            colorSuccess: brandTokens['--ant-color-success'] || '#52c41a',
            colorWarning: brandTokens['--ant-color-warning'] || '#faad14',
            colorError: brandTokens['--ant-color-error'] || '#ff4d4f',
            colorInfo: brandTokens['--ant-color-info'] || '#1890ff',
            colorBgLayout: brandTokens['--ant-color-bg-layout'] || (isDarkMode ? '#0d1117' : '#ffffff'),
            colorBgContainer: brandTokens['--ant-color-bg-container'] || (isDarkMode ? '#161b22' : '#f8f9fa'),
            colorBgElevated: brandTokens['--ant-color-bg-elevated'] || (isDarkMode ? '#1c2128' : '#f1f3f5'),
            colorText: brandTokens['--ant-color-text'] || (isDarkMode ? '#e6edf3' : '#24292f'),
            colorTextSecondary: brandTokens['--ant-color-text-secondary'] || (isDarkMode ? '#8b949e' : '#57606a'),
            colorTextTertiary: brandTokens['--ant-color-text-tertiary'] || (isDarkMode ? '#6e7681' : '#8b949e'),
            colorTextQuaternary: brandTokens['--ant-color-text-quaternary'] || (isDarkMode ? '#6b7280' : '#bfbfbf'),
            colorBorder: brandTokens['--ant-color-border'] || (isDarkMode ? '#30363d' : '#e1e4e8'),
            colorBorderSecondary: brandTokens['--ant-color-border-secondary'] || (isDarkMode ? '#30363d' : '#e1e4e8'),
            fontSize: parseInt(brandTokens['--ant-font-size']?.replace('px', '') || '14'),
            fontFamily: brandTokens['--ant-font-family'] || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            borderRadius: parseInt(brandTokens['--ant-border-radius']?.replace('px', '') || '6'),
          },
        }}
      >
        {children}
      </ConfigProvider>
    </BrandThemeContext.Provider>
  );
}

// Hook to use brand theme context
export function useBrandTheme() {
  const context = useContext(BrandThemeContext);
  if (context === undefined) {
    // Return a fallback context instead of throwing an error
    console.warn('useBrandTheme called outside of BrandThemeProvider, using fallback values');
    return {
      brandTokens: {},
      updateBrandToken: () => {},
      resetBrandTheme: () => {},
      loadBrandPreset: () => {},
      exportBrandTheme: () => {},
      importBrandTheme: () => {},
      isCustomBrand: false,
    };
  }
  return context;
}

// Export default
export default BrandThemeProvider;
