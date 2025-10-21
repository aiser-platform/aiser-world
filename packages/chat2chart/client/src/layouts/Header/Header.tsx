import React from 'react';
import {
    MenuFoldOutlined,
    MenuOutlined,
    MenuUnfoldOutlined,
    MoonOutlined,
    SunOutlined,
    BugOutlined,
    StarOutlined,
} from '@ant-design/icons';
import { Button, Layout, theme, Tooltip } from 'antd';
import UserProfileDropdown from '@/components/UserProfileDropdown';
import { useThemeMode } from '@/components/Providers/ThemeModeContext';
import ProjectSelector from '@/app/(dashboard)/chat/components/ProjectSelector/ProjectSelector';
import dynamic from 'next/dynamic';

type Props = {
    isBreakpoint: boolean;
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
};

export const LayoutHeader: React.FC<Props> = ({
    isBreakpoint,
    collapsed,
    setCollapsed,
}) => {
    const {
        token: { colorBgContainer, colorBorder, colorText },
    } = theme.useToken();
    
    const { isDarkMode, setIsDarkMode } = useThemeMode();

    const ThemeCustomizer = React.useMemo(() => dynamic(() => import('@/components/ThemeCustomizer/ThemeCustomizer'), { ssr: false }), []);
    const [customizerOpen, setCustomizerOpen] = React.useState(false);

    return (
        <Layout.Header
            style={{
                padding: '0 16px',
                height: '64px',
                lineHeight: '64px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'fixed',
                top: 0,
                left: collapsed ? '80px' : '256px',
                right: 0,
                zIndex: 9999, // Maximum z-index
                transition: 'all 0.2s ease',
                background: isDarkMode ? '#001529' : '#e8eaed', // Force same color as sidebar
                borderBottom: '1px solid var(--color-border-primary)',
                margin: 0,
                marginTop: 0, // Explicitly set margin-top to 0
                paddingTop: 0, // Explicitly set padding-top to 0
                width: `calc(100% - ${collapsed ? '80px' : '256px'})`,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                // Debug styles to ensure full stretch
                minWidth: `calc(100% - ${collapsed ? '80px' : '256px'})`,
                maxWidth: `calc(100% - ${collapsed ? '80px' : '256px'})`,
            }}
        >
            <div 
                className="header-left" 
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 'var(--space-4)',
                    marginLeft: collapsed ? '0px' : '0px', // Always start from left edge
                    transition: 'margin-left 0.2s ease'
                }}
            >
                {/* Sidebar toggle */}
                <Tooltip title={collapsed ? 'Open sidebar' : 'Collapse sidebar'}>
                    <Button
                        type="text"
                        icon={isBreakpoint ? <MenuOutlined /> : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'}
                        className="sidebar-toggle"
                        style={{ 
                            fontSize: '18px', 
                            width: 48, 
                            height: 48,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 'var(--radius-base)',
                            transition: 'all var(--transition-fast)',
                        }}
                    />
                </Tooltip>

                {/* Project Selector */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <ProjectSelector isHeader={true} />
                </div>
            </div>
            
            {/* Spacer */}
            <div style={{ flex: 1 }} />

            <div 
                className="header-right" 
                style={{ 
                    display: 'flex', 
                    gap: 'var(--space-2)', 
                    alignItems: 'center' 
                }}
            >
                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <Tooltip title="🐛 Report Bug">
                        <Button
                            type="text"
                            icon={<BugOutlined />}
                            onClick={() => window.open('https://github.com/aiser-platform/aiser-world/issues/new?assignees=&labels=bug&projects=aiser-platform/2&template=bug_report.yml&title=%5BBUG%5D%3A+', '_blank')}
                            style={{ 
                                fontSize: '16px', 
                                width: 40, 
                                height: 40,
                                borderRadius: 'var(--radius-base)',
                                transition: 'all var(--transition-fast)',
                            }}
                        />
                    </Tooltip>

                    <Tooltip title="✨ Request Feature">
                        <Button
                            type="text"
                            icon={<StarOutlined />}
                            onClick={() => window.open('https://github.com/aiser-platform/aiser-world/issues/new?assignees=&labels=enhancement&projects=aiser-platform/2&template=feature_request.yml&title=%5BFEATURE%5D%3A+', '_blank')}
                            style={{ 
                                fontSize: '16px', 
                                width: 40, 
                                height: 40,
                                borderRadius: 'var(--radius-base)',
                                transition: 'all var(--transition-fast)',
                            }}
                        />
                    </Tooltip>
                </div>

                {/* Divider */}
                <div style={{ 
                    width: '1px', 
                    height: '32px', 
                    background: 'var(--color-border-primary)', 
                    margin: '0 var(--space-2)' 
                }} />

                {/* Theme Controls & Profile */}
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <Tooltip title="🎨 Customize Brand & Theme">
                        <Button
                            type="text"
                            onClick={() => setCustomizerOpen(true)}
                            style={{ 
                                fontSize: '18px', 
                                width: 40, 
                                height: 40,
                                borderRadius: 'var(--radius-base)',
                                transition: 'all var(--transition-fast)',
                                background: 'var(--color-brand-primary-light)',
                                border: '1px solid var(--color-brand-primary)',
                            }}
                        >
                            🎨
                        </Button>
                    </Tooltip>
                    
                    <Tooltip title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                        <Button
                            type="text"
                            icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            aria-label={isDarkMode ? 'Light mode' : 'Dark mode'}
                            style={{ 
                                fontSize: '16px', 
                                width: 40, 
                                height: 40,
                                borderRadius: 'var(--radius-base)',
                                transition: 'all var(--transition-fast)',
                            }}
                        />
                    </Tooltip>

                    <UserProfileDropdown showText={false} />
                </div>
            </div>
            
            {/* Theme Customizer Drawer */}
            <ThemeCustomizer open={customizerOpen} onClose={() => setCustomizerOpen(false)} />
        </Layout.Header>
    );
};
