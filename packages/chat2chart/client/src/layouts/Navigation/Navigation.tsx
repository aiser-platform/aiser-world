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
                router.push('/dash-studio?tab=chart');
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
    const { isDarkMode } = useThemeMode();

    return (
        <Layout.Sider
            ref={ref}
            theme={isDarkMode ? 'dark' : 'light'}
            collapsible
            collapsed={props.collapsed}
            breakpoint="lg"
            style={{
                background: isDarkMode ? '#1f1f1f' : '#ffffff',
                borderRight: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
                width: props.collapsed ? 64 : 220,
                minWidth: props.collapsed ? 64 : 220,
                maxWidth: props.collapsed ? 64 : 220,
                transition: 'width 0.2s ease'
            }}
        >
            <div style={{ 
                padding: '16px', 
                textAlign: 'center', 
                borderBottom: `1px solid ${token.colorBorder}`,
                marginBottom: '8px'
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
                style={{ background: isDarkMode ? '#1f1f1f' : '#ffffff', color: token.colorText }}
            />
        </Layout.Sider>
    );
};

export default Navigation;
