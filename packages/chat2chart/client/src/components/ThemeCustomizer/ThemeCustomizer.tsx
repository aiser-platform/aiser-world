'use client';

import React, { useEffect, useState } from 'react';
import { Button, ColorPicker, Drawer, Space, Typography, message, Upload, Segmented, Input, Switch, Select, Tooltip, Alert } from 'antd';
import { UploadOutlined, BgColorsOutlined, BorderOutlined, SettingOutlined, AppstoreOutlined, LayoutOutlined, FileTextOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useBrandTheme, DEFAULT_BRAND_PRESETS, BrandPreset } from '../Providers/BrandThemeProvider';
import { usePlanRestrictions } from '@/hooks/usePlanRestrictions';
import { useRouter } from 'next/navigation';

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
            { key: '--color-bg-navigation', label: 'Navigation Background', type: 'color' as const, description: 'Header & sidebar background (brand color)' },
            { key: '--ant-color-bg-container', label: 'Panel Background', type: 'color' as const, description: 'Card and panel backgrounds' },
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
            { key: '--ant-font-family', label: 'Font Family', type: 'select' as const, description: 'Default font family', options: [
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                'Poppins, -apple-system, BlinkMacSystemFont, sans-serif',
                'Roboto, -apple-system, BlinkMacSystemFont, sans-serif',
                'Open Sans, -apple-system, BlinkMacSystemFont, sans-serif',
                'Lato, -apple-system, BlinkMacSystemFont, sans-serif',
                'Montserrat, -apple-system, BlinkMacSystemFont, sans-serif',
                'Source Sans Pro, -apple-system, BlinkMacSystemFont, sans-serif',
            ]},
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
    const { hasFeature, UpgradeModal, planType } = usePlanRestrictions();
    const router = useRouter();
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
            primary: '#00c2cb',
            primaryLight: 'rgba(37, 99, 235, 0.1)',
            primaryBorder: 'rgba(37, 99, 235, 0.2)',
            inputBackground: '#f8f9fa',
            success: '#52c41a'
        };
    };

    const colors = getThemeColors();

    const canCustomize = hasFeature('theme_customization');

    // If plan doesn't allow theme customization, show upgrade prompt instead of full editor
    if (!canCustomize) {
        return (
            <>
                <Drawer
                    title="Brand & Theme Customization"
                    placement="right"
                    width={420}
                    open={open}
                    onClose={onClose}
                >
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Alert
                            type="info"
                            showIcon
                            message="Upgrade required for brand customization"
                            description={
                                <span>
                                    Brand and theme customization is available on <strong>Pro</strong> and higher plans.
                                    Your current plan is <strong>{planType || 'free'}</strong>. Upgrade to unlock full control
                                    over colors, layout, and visual identity.
                                </span>
                            }
                        />
                        <Button
                            type="primary"
                            block
                            size="large"
                            onClick={() => {
                                onClose();
                                router.push('/billing');
                            }}
                            style={{ marginTop: 16 }}
                        >
                            Upgrade to Pro
                        </Button>
                        <p style={{ marginTop: 16, marginBottom: 0, fontSize: '13px', color: colors.textSecondary }}>
                            You can still use the default Aiser theme. To apply your own brand colors, logo, and layout,
                            please upgrade your subscription.
                        </p>
                    </Space>
                </Drawer>
                <UpgradeModal />
            </>
        );
    }

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
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '18px', fontWeight: '600', color: colors.text, lineHeight: '1.2' }}>
                            Customize Brand & Theme
                        </div>
                    </div>
                    {isCustomBrand && (
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: colors.success,
                            animation: 'pulse 2s infinite',
                            flexShrink: 0
                        }} title="Custom theme active" />
                    )}
                </div>
            }
            open={open}
            onClose={onClose}
            width={520}
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
                },
                body: {
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
                {/* Advanced Mode Toggle - Compact */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: colors.inputBackground,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    marginBottom: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Typography.Text strong style={{ color: colors.text, fontSize: '13px' }}>
                            {showAdvanced ? '🔧 Advanced' : '✨ Essential'}
                        </Typography.Text>
                        <Tooltip title={showAdvanced ? 'All 7 customization groups available' : 'Key essentials: Foundation, Layout, Text & Borders, Functional'}>
                            <QuestionCircleOutlined style={{ fontSize: '11px', color: colors.textSecondary, cursor: 'help' }} />
                        </Tooltip>
                    </div>
                    <Switch 
                        checked={showAdvanced}
                        onChange={setShowAdvanced}
                        size="small"
                    />
                </div>

                {/* Brand Presets - Dropdown Selection */}
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <Typography.Text strong style={{ color: colors.text, fontSize: '13px' }}>
                            Brand Preset
                        </Typography.Text>
                        <Tooltip title="Select a preset theme to apply instantly">
                            <QuestionCircleOutlined style={{ fontSize: '12px', color: colors.textSecondary, cursor: 'help' }} />
                        </Tooltip>
                    </div>
                    <Select
                        placeholder="Select a preset..."
                        style={{ width: '100%' }}
                        size="middle"
                        value={undefined} // Controlled by preset application
                        onChange={(value) => {
                            const preset = DEFAULT_BRAND_PRESETS.find(p => {
                                const presetText = p.organizationType 
                                    ? `${p.name} ${p.organizationType}`
                                    : p.name;
                                return presetText === value;
                            });
                            if (preset) {
                                applyPreset(preset);
                            }
                        }}
                        optionRender={(option) => {
                            const preset = DEFAULT_BRAND_PRESETS.find(p => {
                                const presetText = p.organizationType 
                                    ? `${p.name} ${p.organizationType}`
                                    : p.name;
                                return presetText === option.value;
                            });
                            if (!preset) return option.label;
                            
                            const primaryColor = isDarkMode 
                                ? preset.dark['--ant-primary-color'] 
                                : preset.light['--ant-primary-color'];
                            
                            return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        background: primaryColor,
                                        border: `1px solid ${colors.border}`,
                                        flexShrink: 0
                                    }} />
                                    <span>{option.label}</span>
                                </div>
                            );
                        }}
                    >
                        {DEFAULT_BRAND_PRESETS.map((preset) => {
                            const presetText = preset.organizationType 
                                ? `${preset.name} ${preset.organizationType}`
                                : preset.name;
                            
                            return (
                                <Select.Option 
                                    key={preset.name} 
                                    value={presetText}
                                    title={preset.description}
                                >
                                    {presetText}
                                </Select.Option>
                            );
                        })}
                    </Select>
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
                                marginBottom: 10, 
                                padding: '10px',
                                background: colors.inputBackground,
                                borderRadius: '6px',
                                border: `1px solid ${colors.border}`,
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = colors.primary;
                                e.currentTarget.style.boxShadow = `0 2px 8px ${colors.primaryBorder}`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = colors.border;
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                            >
                                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Typography.Text strong style={{ color: colors.text, fontSize: '12px' }}>
                                        {v.label}
                                    </Typography.Text>
                                    <Tooltip title={v.description}>
                                        <QuestionCircleOutlined style={{ fontSize: '11px', color: colors.textSecondary, cursor: 'help' }} />
                                    </Tooltip>
                                </div>
                                {v.type === 'color' ? (
                                    <ColorPicker
                                        value={values[v.key] || getVar(v.key) || '#000000'}
                                        onChange={(color) => handleChange(v.key, color.toHexString())}
                                        showText
                                        size="small"
                                        style={{ width: '100%' }}
                                        format="hex"
                                    />
                                ) : v.type === 'select' ? (
                                    <Select
                                        value={values[v.key] || getVar(v.key) || ''}
                                        onChange={(val) => handleChange(v.key, val)}
                                        size="small"
                                        style={{ width: '100%' }}
                                        placeholder="Select..."
                                        options={v.options?.map(opt => ({ label: opt, value: opt }))}
                                    />
                                ) : (
                                    <Input
                                        value={values[v.key] || getVar(v.key) || ''}
                                        onChange={(e) => handleChange(v.key, e.target.value)}
                                        size="small"
                                        style={{ width: '100%' }}
                                        placeholder="Enter value..."
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Enhanced Action Buttons */}
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '8px', 
                    marginTop: 'auto',
                    padding: '16px 0 0 0',
                    borderTop: `1px solid ${colors.border}`
                }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button 
                            onClick={handleReset} 
                            size="middle" 
                            style={{ flex: 1 }}
                            title="Reset all customizations to defaults"
                        >
                            Reset
                        </Button>
                        <Button 
                            type="primary" 
                            onClick={handleSave} 
                            size="middle" 
                            style={{ flex: 1 }}
                            title="Save and apply theme"
                        >
                            Save & Apply
                        </Button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button 
                            onClick={exportTheme} 
                            size="middle" 
                            icon={<UploadOutlined />}
                            style={{ flex: 1 }}
                            title="Export theme as JSON"
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
                                size="middle" 
                                icon={<UploadOutlined />}
                                style={{ flex: 1 }}
                                title="Import theme from JSON"
                            >
                                Import
                            </Button>
                        </Upload>
                    </div>
                </div>
            </div>
        </Drawer>
    );
}