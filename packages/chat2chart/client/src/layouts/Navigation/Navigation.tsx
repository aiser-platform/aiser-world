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
} from '@ant-design/icons';
import { Button, Layout, Menu, MenuProps, theme } from 'antd';
import { useRouter } from "next/navigation";
import React from 'react';
import AiserLogo from '@/app/components/Logo/AiserLogo';
import { useThemeMode } from '@/components/Providers/ThemeModeContext';

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

    const items = [
        {
            key: 'chat',
            icon: <MessageOutlined />,
            label: 'Chat',
        },
        {
            key: 'dash-studio',
            icon: <DashboardOutlined />,
            label: 'Dashboard Studio',
            children: [
                { key: 'dash-studio-query-editor', label: 'Query Editor' },
                { key: 'dash-studio-chart', label: 'Chart Designer' },
                { key: 'dash-studio-dashboard', label: 'Dashboard' },
            ]
        },
        {
            key: 'data',
            icon: <DatabaseOutlined />,
            label: 'Data',
        },
        {
            type: 'divider' as const,
        },
        {
            key: 'settings',
            icon: <SettingOutlined />,
            label: 'Settings',
        },
    ];

    const router = useRouter();

    const onClick: MenuProps['onClick'] = (e) => {
        console.log('click ', e);
        switch (e.key) {
            case 'chat':
                router.push('/chat');
                break;
            case 'dash-studio-dashboard':
                router.push('/dash-studio?tab=dashboard');
                break;
            case 'dash-studio-query-editor':
                router.push('/dash-studio?tab=query-editor');
                break;
            case 'dash-studio-chart':
                router.push('/dash-studio?tab=chart-designer');
                break;
            case 'data':
                router.push('/data');
                break;

            case 'settings':
                router.push('/settings');
                break;
        }
    };

    const { token } = theme.useToken();
    const { isDarkMode: isDarkModeContext } = useThemeMode();

    // Avoid hydration mismatch by only applying the theme prop after client mount.
    const [isDarkMode, setIsDarkMode] = React.useState<boolean>(false);
    React.useEffect(() => {
        setIsDarkMode(!!isDarkModeContext);
    }, [isDarkModeContext]);

    return (
        <Layout.Sider
            ref={ref}
            theme={isDarkMode ? 'dark' : 'light'}
            collapsible
            collapsed={props.collapsed}
            breakpoint="lg"
            width={props.collapsed ? 80 : 256}
            style={{
                width: props.collapsed ? 80 : 256,
                minWidth: props.collapsed ? 80 : 256,
                maxWidth: props.collapsed ? 80 : 256,
                transition: 'all 0.2s ease',
                height: '100vh',
                position: 'fixed',
                left: 0,
                top: 0,
                zIndex: 1100,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                borderRight: '1px solid var(--color-border-primary)',
                margin: 0,
                padding: 0,
                // Let Ant Design handle the background through theme
            }}
        >
            <div style={{ 
                padding: props.collapsed ? '12px' : '16px', 
                textAlign: 'left', 
                marginBottom: '0px',
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: props.collapsed ? 'center' : 'flex-start',
                borderBottom: '1px solid var(--color-border-primary)',
                // Let Ant Design handle the background
            }}>
                <AiserLogo 
                    size={props.collapsed ? 32 : 48} 
                    showText={!props.collapsed}
                />
            </div>
            <Menu
                mode="inline"
                defaultSelectedKeys={['dash-studio-dashboard']}
                defaultOpenKeys={['dash-studio']}
                items={items}
                onClick={onClick}
                theme={isDarkMode ? 'dark' : 'light'}
                style={{ 
                    border: 'none',
                    flex: 1,
                    overflowY: 'auto',
                    paddingBottom: '0px',
                    // Let Ant Design handle the background through theme
                }}
            />
        </Layout.Sider>
    );
};

export default Navigation;
