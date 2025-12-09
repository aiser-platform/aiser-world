import React from 'react';
import {
    MenuFoldOutlined,
    MenuOutlined,
    MenuUnfoldOutlined,
    MoonOutlined,
    SunOutlined,
    BugOutlined,
    StarOutlined,
    BgColorsOutlined,
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

    const sidebarOffset = React.useMemo(
        () => (isBreakpoint ? 0 : collapsed ? 80 : 256),
        [collapsed, isBreakpoint]
    );

    const headerGradient = 'linear-gradient(135deg, var(--color-bg-navigation-header, var(--color-bg-navigation)) 0%, var(--color-bg-navigation-header-glow, rgba(255,255,255,0.25)) 100%)';

    return (
        <Layout.Header
            style={{
                padding: '0 16px', // Ant Design: 16px horizontal (2 * 8px)
                height: '64px',
                minHeight: '64px',
                maxHeight: '64px',
                lineHeight: '64px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'fixed',
                top: 0,
                left: `${sidebarOffset}px`,
                right: 0,
                zIndex: 1001, // Above sidebar (1000), below modals
                transition: 'all 0.2s ease',
                background: headerGradient,
                borderBottom: '1px solid var(--ant-color-border)',
                color: 'var(--ant-color-text)',
                margin: 0,
                paddingTop: 0,
                paddingBottom: 0,
                width: 'auto',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                boxSizing: 'border-box',
                borderTop: 'none',
                borderRight: 'none',
                borderLeft: 'none',
            }}
        >
            <div 
                className="header-left" 
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0px', // No gap - icon background provides visual spacing
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
                    background: 'var(--ant-color-border)', 
                    margin: '0 var(--space-2)' 
                }} />

                {/* Theme Controls & Profile */}
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <Tooltip title="Customize Brand & Theme">
                        <Button
                            type="text"
                            icon={<BgColorsOutlined />}
                            onClick={() => setCustomizerOpen(true)}
                            style={{ 
                                fontSize: '18px', 
                                width: 40, 
                                height: 40,
                                borderRadius: 'var(--radius-base)',
                                transition: 'all var(--transition-fast)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        />
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
