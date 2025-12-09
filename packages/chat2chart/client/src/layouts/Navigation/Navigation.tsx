'use client';
import useClickOutside from '@/hooks/useClickOutside';
import {
    BarChartOutlined,
    DatabaseOutlined,
    MessageOutlined,
    SettingOutlined,
    TeamOutlined,
    ProjectOutlined,
    CreditCardOutlined,
    UserOutlined,
    ExperimentOutlined,
    DashboardOutlined,
    CodeOutlined,
    CommentOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, MenuProps, theme, Tooltip } from 'antd';
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import React from 'react';
import AiserLogo from '@/app/components/Logo/AiserLogo';
import { useThemeMode } from '@/components/Providers/ThemeModeContext';

const { Sider } = Layout;

interface NavigationProps {
    collapsed: boolean;
    isBreakpoint: boolean;
    onBreakpoint: (broken: boolean) => void;
    onCollapse: (collapsed: boolean) => void;
}

const Navigation: React.FC<NavigationProps> = (props: NavigationProps) => {
    const ref = React.useRef<HTMLDivElement>(null);

    useClickOutside(ref, () => {
        if (props.isBreakpoint && !props.collapsed) {
            props.onCollapse(true);
        }
    });

    const mainItems = [
        {
            key: 'chat',
            icon: <MessageOutlined />,
            label: 'Chat',
        },
        {
            key: 'query-editor',
            icon: <CodeOutlined />,
            label: 'Query Editor',
        },
        {
            key: 'dash-studio',
            icon: <DashboardOutlined />,
            label: 'Dashboard Studio',
            children: [
                { key: 'dash-studio-chart', label: 'Chart Designer' },
                { key: 'dash-studio-dashboard', label: 'Dashboard' },
            ]
        },
        {
            key: 'data',
            icon: <DatabaseOutlined />,
            label: 'Data',
        },
    ];

    const bottomItems = [
        {
            key: 'settings',
            icon: <SettingOutlined />,
            label: 'Settings',
        },
    ];

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Determine selected keys based on current route
    const selectedKeys = React.useMemo(() => {
        if (pathname === '/chat') {
            return ['chat'];
        } else if (pathname === '/data') {
            return ['data'];
        } else if (pathname === '/settings') {
            return ['settings'];
        } else if (pathname === '/query-editor') {
            return ['query-editor'];
        } else if (pathname === '/dash-studio') {
            const tab = searchParams?.get('tab');
            if (tab === 'chart-designer') {
                return ['dash-studio-chart'];
            } else {
                return ['dash-studio-dashboard'];
            }
        }
        return [];
    }, [pathname, searchParams]);

    const [openKeysState, setOpenKeysState] = React.useState<string[]>([]);
    
    // Initialize openKeys based on pathname
    React.useEffect(() => {
        if (pathname === '/dash-studio') {
            setOpenKeysState(['dash-studio']);
        }
    }, [pathname]);
    
    const openKeys = React.useMemo(() => {
        // Use state if available, otherwise fallback to pathname-based logic
        if (openKeysState.length > 0) {
            return openKeysState;
        }
        if (pathname === '/dash-studio') {
            return ['dash-studio'];
        }
        return [];
    }, [pathname, openKeysState]);
    
    const onOpenChange: MenuProps['onOpenChange'] = (keys) => {
        setOpenKeysState(keys as string[]);
    };

    const onClick: MenuProps['onClick'] = (e) => {
        console.log('click ', e);
        switch (e.key) {
            case 'chat':
                router.push('/chat');
                break;
            case 'dash-studio-dashboard':
                router.push('/dash-studio?tab=dashboard');
                break;
            case 'dash-studio-chart':
                router.push('/dash-studio?tab=chart-designer');
                break;
            case 'query-editor':
                router.push('/query-editor');
                break;
            case 'data':
                router.push('/data');
                break;

            case 'settings':
                router.push('/settings');
                break;
        }
    };

    // Handle feedback button click
    const handleFeedbackClick = () => {
        // Trigger SleekPlan feedback widget
        if (typeof window !== 'undefined' && (window as any).$sleek) {
            // Try to open SleekPlan widget if API is available
            try {
                // SleekPlan typically exposes methods on window.$sleek
                // Try common methods to open the widget
                if ((window as any).$sleek.open) {
                    (window as any).$sleek.open();
                } else if ((window as any).$sleek.show) {
                    (window as any).$sleek.show();
                } else if ((window as any).$sleek.toggle) {
                    (window as any).$sleek.toggle();
                } else {
                    // If no API available, the widget bubble should be visible
                    console.log('SleekPlan widget should be visible on the page');
                }
            } catch (e) {
                console.warn('Could not trigger SleekPlan widget:', e);
            }
        }
    };

    const { token } = theme.useToken();
    const { isDarkMode: isDarkModeContext } = useThemeMode();

    // Avoid hydration mismatch by only applying the theme prop after client mount.
    const [isDarkMode, setIsDarkMode] = React.useState<boolean>(false);
    React.useEffect(() => {
        setIsDarkMode(!!isDarkModeContext);
    }, [isDarkModeContext]);

    // Sidebar gradient matching header
    const sidebarGradient = isDarkMode
        ? 'linear-gradient(135deg, var(--color-bg-navigation-sider, var(--color-bg-navigation)) 0%, var(--color-bg-navigation-sider-glow, rgba(24, 144, 255, 0.15)) 100%)'
        : 'linear-gradient(135deg, var(--color-bg-navigation-sider, var(--color-bg-navigation)) 0%, var(--color-bg-navigation-sider-glow, rgba(255,255,255,0.25)) 100%)';

    // Set CSS variable for sidebar width (for status bar positioning)
    React.useEffect(() => {
        document.documentElement.style.setProperty('--sidebar-width', `${props.collapsed ? 80 : 256}px`);
    }, [props.collapsed]);

    // Load SleekPlan feedback widget
    React.useEffect(() => {
        if (typeof window !== 'undefined' && !(window as any).$sleek) {
            // Initialize SleekPlan
            (window as any).$sleek = [];
            (window as any).SLEEK_PRODUCT_ID = 789985759;
            
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = 'https://client.sleekplan.com/sdk/e.js';
            script.async = true;
            document.getElementsByTagName('head')[0].appendChild(script);

            // Try to position the SleekPlan bubble near the sidebar
            // NOTE: SleekPlan controls its own positioning via JavaScript, so CSS positioning may not work.
            // The widget typically appears as a floating bubble. We attempt to influence position with CSS,
            // but SleekPlan's own positioning logic may override this.
            script.onload = () => {
                // Wait a bit for SleekPlan to initialize, then try to position it
                setTimeout(() => {
                    // Add CSS to position SleekPlan bubble near sidebar if possible
                    // This may or may not work depending on SleekPlan's implementation
                    const style = document.createElement('style');
                    style.id = 'sleekplan-positioning';
                    style.textContent = `
                        /* Attempt to position SleekPlan widget near sidebar */
                        /* Note: SleekPlan may override this with its own positioning */
                        #sleekplan-widget,
                        .sleekplan-widget,
                        [id*="sleekplan"],
                        [class*="sleekplan"],
                        iframe[src*="sleekplan"] {
                            left: ${props.collapsed ? 80 : 256}px !important;
                            bottom: 20px !important;
                            z-index: 999 !important;
                        }
                    `;
                    // Remove existing style if present
                    const existing = document.getElementById('sleekplan-positioning');
                    if (existing) {
                        existing.remove();
                    }
                    document.head.appendChild(style);
                }, 1000); // Wait 1 second for SleekPlan to initialize
            };
        }
    }, [props.collapsed]);

    return (
        <Sider
            ref={ref}
            theme={isDarkMode ? 'dark' : 'light'}
            collapsible
            collapsed={props.collapsed}
            trigger={null}
            breakpoint="lg"
            width={props.collapsed ? 80 : 256}
            style={{
                width: props.collapsed ? 80 : 256,
                minWidth: props.collapsed ? 80 : 256,
                maxWidth: props.collapsed ? 80 : 256,
                transition: 'all 0.2s ease',
                height: '100vh',
                minHeight: '100vh',
                maxHeight: '100vh',
                position: 'fixed',
                left: 0,
                top: 0,
                zIndex: 1000, // Below header (1001)
                boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
                borderRight: '1px solid var(--ant-color-border)',
                margin: 0,
                padding: 0,
                overflow: 'hidden', // Prevent sidebar container from scrolling
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start', // Start from top
                boxSizing: 'border-box',
                borderTop: 'none',
                borderBottom: 'none',
                borderLeft: 'none',
                background: sidebarGradient,
                color: 'var(--color-text-primary, var(--ant-color-text))',
            }}
        >
            {/* Wrapper for relative positioning */}
            <div style={{
                position: 'relative',
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}>
                {/* Logo Header - Fixed at top */}
            <div style={{ 
                padding: props.collapsed ? '16px' : '16px', // Consistent padding
                paddingBottom: props.collapsed ? '16px' : '16px', // Ensure no gap
                textAlign: 'left', 
                margin: 0,
                marginBottom: 0,
                height: '64px', // Match header height
                minHeight: '64px',
                maxHeight: '64px',
                flexShrink: 0, // Don't shrink
                display: 'flex',
                alignItems: 'center',
                justifyContent: props.collapsed ? 'center' : 'flex-start',
                borderBottom: '1px solid var(--ant-color-border)',
                borderTop: 'none',
                borderRight: 'none',
                borderLeft: 'none',
                background: 'transparent', // Inherit gradient from parent
                boxSizing: 'border-box',
            }}>
                <AiserLogo 
                    size={props.collapsed ? 32 : 48} 
                    showText={!props.collapsed}
                />
            </div>
            {/* Main Menu - Takes up available space, scrollable, with bottom padding for Settings */}
            <div style={{ 
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden',
                flexShrink: 1,
                paddingBottom: '60px', // Reserve space for bottom section (Settings menu + padding)
            }}>
                <Menu
                    mode="inline"
                    triggerSubMenuAction="hover"
                    selectedKeys={selectedKeys}
                    openKeys={openKeys}
                    onOpenChange={onOpenChange}
                    items={mainItems}
                    onClick={onClick}
                    theme={isDarkMode ? 'dark' : 'light'}
                    style={{ 
                        border: 'none',
                        flex: 1,
                        minHeight: 0, // Allow flex item to shrink below content size
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        paddingBottom: '0px',
                        background: 'transparent', // Inherit gradient from parent
                        color: 'var(--color-text-primary, var(--ant-color-text))',
                    }}
                />
            </div>
            
            {/* Bottom Section - Fixed at absolute bottom, space for future items */}
            <div style={{ 
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
            }}>
                {/* Feedback Button - Above divider, right edge */}
                <div style={{
                    position: 'absolute',
                    bottom: '64px', // Position higher above Settings menu (moved up from 48px)
                    right: props.collapsed ? '8px' : '12px',
                    zIndex: 10,
                }}>
                    <Tooltip title="Give Feedback" placement="left">
                        <Button
                            type="text"
                            icon={<CommentOutlined />}
                            onClick={handleFeedbackClick}
                            style={{
                                width: props.collapsed ? '32px' : '36px',
                                height: props.collapsed ? '32px' : '36px',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '6px',
                                color: 'var(--ant-color-text-secondary)',
                                border: 'none',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = 'var(--ant-color-primary)';
                                e.currentTarget.style.backgroundColor = 'var(--ant-color-fill-secondary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--ant-color-text-secondary)';
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        />
                    </Tooltip>
                </div>
                
                {/* Settings Menu - Always at bottom */}
                <Menu
                    mode="inline"
                    selectedKeys={selectedKeys}
                    items={bottomItems}
                    onClick={onClick}
                    theme={isDarkMode ? 'dark' : 'light'}
                    style={{ 
                        border: 'none',
                        borderTop: '1px solid var(--ant-color-border)',
                        background: 'transparent', // Inherit gradient from parent
                        color: 'var(--color-text-primary, var(--ant-color-text))',
                        paddingTop: '8px', // Space above divider
                        paddingBottom: '8px', // Space at bottom
                        marginTop: 0,
                        marginBottom: 0,
                    }}
                />
            </div>
            </div>
        </Sider>
    );
};

export default Navigation;
