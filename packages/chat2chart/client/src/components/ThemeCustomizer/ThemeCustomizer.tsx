'use client';

import React, { useEffect, useState } from 'react';
import { Button, ColorPicker, Drawer, Space, Typography, message, Upload, Segmented, Input, Switch } from 'antd';
import { UploadOutlined, BgColorsOutlined, BorderOutlined, SettingOutlined, AppstoreOutlined, LayoutOutlined, FileTextOutlined } from '@ant-design/icons';
import { useBrandTheme, DEFAULT_BRAND_PRESETS, BrandPreset } from '../Providers/BrandThemeProvider';

const STORAGE_KEY = 'aiser_brand_theme_vars';

// Complete token groups for proper organization
const TOKEN_GROUPS = {
    foundation: {
        label: '🎨 Foundation',
        iconName: 'AppstoreOutlined',
        vars: [
            { key: '--ant-primary-color', label: 'Primary Color', type: 'color' as const, description: 'Main brand color' },
            { key: '--ant-primary-color-hover', label: 'Primary Hover', type: 'color' as const, description: 'Hover state' },
            { key: '--ant-primary-color-active', label: 'Primary Active', type: 'color' as const, description: 'Active/pressed state' },
            { key: '--ant-primary-color-outline', label: 'Primary Outline', type: 'color' as const, description: 'Focus outline color' },
        ]
    },
    layout: {
        label: '🏗️ Layout',
        iconName: 'LayoutOutlined',
        vars: [
            { key: '--ant-color-bg-layout', label: 'Page Background', type: 'color' as const, description: 'Main page background (lightest)' },
            { key: '--ant-color-bg-header', label: 'Header Background', type: 'color' as const, description: 'Top navigation background (stronger than page)' },
            { key: '--ant-color-bg-sider', label: 'Sidebar Background', type: 'color' as const, description: 'Left navigation background (same as header)' },
            { key: '--ant-color-bg-content', label: 'Content Background', type: 'color' as const, description: 'Main content area background' },
            { key: '--ant-color-bg-container', label: 'Panel Background', type: 'color' as const, description: 'Card and panel backgrounds (distinct from content)' },
            { key: '--ant-color-bg-elevated', label: 'Elevated Background', type: 'color' as const, description: 'Modal and dropdown backgrounds' },
        ]
    },
    semantic: {
        label: '⚡ Text & Borders',
        iconName: 'SettingOutlined',
        vars: [
            { key: '--ant-color-text', label: 'Primary Text', type: 'color' as const, description: 'Main text color for headings and content' },
            { key: '--ant-color-text-secondary', label: 'Secondary Text', type: 'color' as const, description: 'Secondary text color for descriptions' },
            { key: '--ant-color-text-tertiary', label: 'Tertiary Text', type: 'color' as const, description: 'Tertiary text color for labels' },
            { key: '--ant-color-text-quaternary', label: 'Quaternary Text', type: 'color' as const, description: 'Subtle text color for placeholders' },
            { key: '--ant-color-border', label: 'Primary Border', type: 'color' as const, description: 'Main border color for components' },
            { key: '--ant-color-border-secondary', label: 'Secondary Border', type: 'color' as const, description: 'Subtle border color for dividers' },
        ]
    },
    surfaces: {
        label: '📦 Surface Colors',
        iconName: 'BorderOutlined',
        vars: [
            { key: '--ant-color-fill', label: 'Fill Color', type: 'color' as const, description: 'Default fill color for components' },
            { key: '--ant-color-fill-secondary', label: 'Secondary Fill', type: 'color' as const, description: 'Secondary fill color for hover states' },
            { key: '--ant-color-fill-tertiary', label: 'Tertiary Fill', type: 'color' as const, description: 'Tertiary fill color for disabled states' },
            { key: '--ant-color-fill-quaternary', label: 'Quaternary Fill', type: 'color' as const, description: 'Quaternary fill color for subtle backgrounds' },
        ]
    },
    functional: {
        label: '🔧 Functional Colors',
        iconName: 'SettingOutlined',
        vars: [
            { key: '--ant-color-success', label: 'Success Color', type: 'color' as const, description: 'Success states and confirmations' },
            { key: '--ant-color-warning', label: 'Warning Color', type: 'color' as const, description: 'Warning states and cautions' },
            { key: '--ant-color-error', label: 'Error Color', type: 'color' as const, description: 'Error states and destructive actions' },
            { key: '--ant-color-info', label: 'Info Color', type: 'color' as const, description: 'Information states and neutral actions' },
        ]
    },
    typography: {
        label: '📝 Typography',
        iconName: 'FileTextOutlined',
        vars: [
            { key: '--ant-font-size', label: 'Base Font Size', type: 'text' as const, description: 'Default font size for text' },
            { key: '--ant-font-size-lg', label: 'Large Font Size', type: 'text' as const, description: 'Large text font size' },
            { key: '--ant-font-size-sm', label: 'Small Font Size', type: 'text' as const, description: 'Small text font size' },
            { key: '--ant-line-height', label: 'Line Height', type: 'text' as const, description: 'Default line height' },
            { key: '--ant-font-family', label: 'Font Family', type: 'text' as const, description: 'Default font family' },
        ]
    },
    spacing: {
        label: '📏 Spacing & Sizing',
        iconName: 'BorderOutlined',
        vars: [
            { key: '--ant-border-radius', label: 'Border Radius', type: 'text' as const, description: 'Default border radius' },
            { key: '--ant-border-radius-lg', label: 'Large Border Radius', type: 'text' as const, description: 'Large border radius' },
            { key: '--ant-border-radius-sm', label: 'Small Border Radius', type: 'text' as const, description: 'Small border radius' },
            { key: '--ant-margin', label: 'Default Margin', type: 'text' as const, description: 'Default margin spacing' },
            { key: '--ant-padding', label: 'Default Padding', type: 'text' as const, description: 'Default padding spacing' },
        ]
    }
};

// Helper functions
const getVar = (key: string): string => {
    if (typeof window === 'undefined') return '';
    return getComputedStyle(document.documentElement).getPropertyValue(key).trim() || '';
};

const setVar = (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    document.documentElement.style.setProperty(key, value);
};

export default function ThemeCustomizer({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { brandTokens, updateBrandToken, resetBrandTheme, loadBrandPreset, exportBrandTheme, importBrandTheme, isCustomBrand } = useBrandTheme();
    const [values, setValues] = useState<Record<string, string>>({});
    const [activeGroup, setActiveGroup] = useState<string>('foundation');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Detect current theme mode
    useEffect(() => {
        const checkTheme = () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            setIsDarkMode(isDark);
        };
        
        checkTheme();
        
        // Listen for theme changes
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });
        
        return () => observer.disconnect();
    }, []);

    // Get theme-appropriate colors
    const getThemeColors = () => {
        if (isDarkMode) {
            return {
                background: '#1c2128',
                cardBackground: '#21262d',
                border: '#404040',
                text: '#e5e5e5',
                textSecondary: '#a0a0a0',
                primary: '#3b82f6',
                primaryLight: 'rgba(59, 130, 246, 0.1)',
                primaryBorder: 'rgba(59, 130, 246, 0.2)',
                inputBackground: '#161b22',
                success: '#52c41a'
            };
        }
        return {
            background: '#ffffff',
            cardBackground: '#ffffff',
            border: '#d9d9d9',
            text: '#262626',
            textSecondary: '#8c8c8c',
            primary: '#2563eb',
            primaryLight: 'rgba(37, 99, 235, 0.1)',
            primaryBorder: 'rgba(37, 99, 235, 0.2)',
            inputBackground: '#f8f9fa',
            success: '#52c41a'
        };
    };

    const colors = getThemeColors();

    useEffect(() => {
        if (!open) return;
        
        // Sync with current brand tokens from provider
        setValues(brandTokens);
    }, [open, brandTokens]);

    const handleChange = (key: string, val: string) => {
        setValues(prev => ({ ...prev, [key]: val }));
        updateBrandToken(key, val);
        
        // Real-time feedback with debouncing
        const label = key.replace('--ant-', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        message.success(`${label} updated`, 1);
    };

    const handleReset = () => {
        resetBrandTheme();
        setValues({});
        message.success('Theme reset to defaults');
    };

    const handleSave = () => {
        message.success('Theme saved successfully');
        onClose();
    };

    const applyPreset = (preset: BrandPreset) => {
        loadBrandPreset(preset);
        setValues(isDarkMode ? preset.dark : preset.light);
        message.success(`Applied ${preset.name}: ${preset.description}`);
    };

    const exportTheme = () => {
        exportBrandTheme();
        message.success('Brand theme exported');
    };

    const handleImport = async (file: File) => {
        try {
            const text = await file.text();
            const parsed = JSON.parse(text) as Record<string, string>;
            importBrandTheme(parsed);
            setValues(parsed);
            message.success('Brand theme imported successfully');
        } catch (e) {
            message.error('Invalid brand file');
        }
    };

    return (
        <Drawer
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <BgColorsOutlined style={{ fontSize: '20px', color: colors.primary }} />
                    <span style={{ fontSize: '18px', fontWeight: '600', color: colors.text }}>Aiser Platform Customizer</span>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: colors.success,
                        animation: 'pulse 2s infinite',
                        marginLeft: 'auto'
                    }} />
                </div>
            }
            open={open}
            onClose={onClose}
            width={480}
            placement="right"
            style={{ 
                background: colors.background,
                borderLeft: `1px solid ${colors.border}`,
                boxShadow: isDarkMode ? '-4px 0 16px rgba(0, 0, 0, 0.3)' : '-4px 0 16px rgba(0, 0, 0, 0.1)'
            }}
                     styles={{
                         header: {
                             background: colors.background,
                             borderBottom: `1px solid ${colors.border}`,
                             padding: '16px 24px'
                         }
                     }}
        >
            <div style={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                gap: '12px',
                padding: '0'
            }}>
                {/* Advanced Mode Toggle */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: colors.inputBackground,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px'
                }}>
                    <div>
                        <Typography.Text strong style={{ color: colors.text, fontSize: '13px' }}>
                            Advanced Mode
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: '10px', color: colors.textSecondary, display: 'block' }}>
                            {showAdvanced ? 'All 7 customization groups' : 'Essential 4 groups'}
                        </Typography.Text>
                    </div>
                    <Switch 
                        checked={showAdvanced}
                        onChange={setShowAdvanced}
                        size="small"
                    />
                </div>

                {/* Enhanced Preset Themes */}
                <div style={{ marginBottom: '12px' }}>
                    <Typography.Text strong style={{ color: colors.text, fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                        Brand Presets ({DEFAULT_BRAND_PRESETS.length} available)
                    </Typography.Text>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(2, 1fr)', 
                        gap: '8px',
                        maxHeight: showAdvanced ? '300px' : '200px',
                        overflowY: 'auto',
                        paddingRight: '4px'
                    }}>
                        {DEFAULT_BRAND_PRESETS.map((preset) => (
                            <Button
                                key={preset.name}
                                size="small"
                                onClick={() => applyPreset(preset)}
                                style={{
                                    height: '36px',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: `1px solid ${colors.border}`,
                                    background: colors.cardBackground,
                                    fontSize: '11px',
                                    fontWeight: '500',
                                    color: colors.text,
                                    transition: 'all 0.2s ease',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = colors.primary;
                                    e.currentTarget.style.background = colors.primaryLight;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = colors.border;
                                    e.currentTarget.style.background = colors.cardBackground;
                                }}
                            >
                                {/* Mini color preview */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '2px',
                                    background: preset.light['--ant-primary-color']
                                }} />
                                <div style={{ fontSize: '10px', fontWeight: '600', marginBottom: '1px' }}>
                                    {preset.name}
                                </div>
                                <div style={{ fontSize: '9px', opacity: 0.8 }}>
                                    {preset.organizationType || 'General'}
                                </div>
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Compact Token Groups */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Segmented
                        block
                        size="small"
                        value={activeGroup}
                        onChange={(val) => setActiveGroup(val as string)}
                        options={Object.entries(TOKEN_GROUPS)
                            .filter(([key, group]) => showAdvanced || ['foundation', 'layout', 'semantic', 'functional'].includes(key))
                            .map(([key, group]) => {
                                const IconComponent = {
                                    'AppstoreOutlined': AppstoreOutlined,
                                    'LayoutOutlined': LayoutOutlined,
                                    'SettingOutlined': SettingOutlined,
                                    'FileTextOutlined': FileTextOutlined,
                                    'BorderOutlined': BorderOutlined,
                                }[group.iconName] || SettingOutlined;
                                
                                return {
                                    label: (
                                        <div style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '4px', 
                                            minWidth: '70px',
                                            justifyContent: 'center'
                                        }}>
                                            <IconComponent style={{ fontSize: '12px' }} />
                                            <span style={{ 
                                                fontSize: '10px', 
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>
                                                {group.label.replace(/^[^\s]+\s/, '')}
                                            </span>
                                        </div>
                                    ),
                                    value: key,
                                };
                            })}
                        style={{ 
                            marginBottom: 12,
                            overflowX: 'auto',
                            minHeight: '36px',
                            fontSize: '10px'
                        }}
                    />

                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                        {TOKEN_GROUPS[activeGroup as keyof typeof TOKEN_GROUPS]?.vars.map((v) => (
                            <div key={v.key} style={{ 
                                marginBottom: 12, 
                                padding: '8px',
                                background: colors.inputBackground,
                                borderRadius: '6px',
                                border: `1px solid ${colors.border}`
                            }}>
                                <div style={{ marginBottom: 6 }}>
                                    <Typography.Text strong style={{ color: colors.text, fontSize: '12px' }}>
                                        {v.label}
                                    </Typography.Text>
                                    <Typography.Text type="secondary" style={{ fontSize: '10px', color: colors.textSecondary, display: 'block' }}>
                                        {v.description}
                                    </Typography.Text>
                                </div>
                                {v.type === 'color' ? (
                                    <ColorPicker
                                        value={values[v.key] || '#000000'}
                                        onChange={(color) => handleChange(v.key, color.toHexString())}
                                        showText
                                        size="small"
                                        style={{ width: '100%' }}
                                    />
                                ) : (
                                    <Input
                                        value={values[v.key] || ''}
                                        onChange={(e) => handleChange(v.key, e.target.value)}
                                        size="small"
                                        style={{ width: '100%' }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Compact Action Buttons */}
                <div style={{ 
                    display: 'flex', 
                    gap: '6px', 
                    marginTop: 'auto',
                    padding: '8px 0'
                }}>
                    <Button 
                        onClick={handleReset} 
                        size="small" 
                        style={{ flex: 1, fontSize: '11px' }}
                        title="Reset all customizations"
                    >
                        Reset
                    </Button>
                    <Button 
                        onClick={exportTheme} 
                        size="small" 
                        style={{ flex: 1, fontSize: '11px' }}
                        title="Export theme"
                    >
                        Export
                    </Button>
                    <Upload
                        beforeUpload={(file) => {
                            handleImport(file);
                            return false;
                        }}
                        showUploadList={false}
                        accept="application/json"
                    >
                        <Button 
                            size="small" 
                            style={{ flex: 1, fontSize: '11px' }}
                            title="Import theme"
                        >
                            Import
                        </Button>
                    </Upload>
                    <Button 
                        type="primary" 
                        onClick={handleSave} 
                        size="small" 
                        style={{ flex: 1, fontSize: '11px' }}
                        title="Save theme"
                    >
                        Save
                    </Button>
                </div>
            </div>
        </Drawer>
    );
}