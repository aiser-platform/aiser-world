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
import { Button, Layout, Menu, MenuProps } from 'antd';
import { useRouter } from "next/navigation";
import React from 'react';
import AiserLogo from '@/app/components/Logo/AiserLogo';

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
            key: 'ai-analytics',
            icon: <ExperimentOutlined />,
            label: 'AI Analytics',
        },
        {
            key: 'chart-builder',
            icon: <BarChartOutlined />,
            label: 'Chart Builder',
        },
        {
            key: 'dashboard-builder',
            icon: <DashboardOutlined />,
            label: 'Dashboard Builder',
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
            case 'ai-analytics':
                router.push('/ai-analytics');
                break;
            case 'chart-builder':
                router.push('/chart-builder');
                break;
            case 'dashboard-builder':
                router.push('/dashboard-builder');
                break;
            case 'data':
                router.push('/data');
                break;

            case 'settings':
                router.push('/settings');
                break;
        }
    };

    return (
        <Layout.Sider
            ref={ref}
            theme="light"
            collapsible
            collapsed={props.collapsed}
            breakpoint="lg"
        >
            <div style={{ 
                padding: '16px', 
                textAlign: 'center', 
                borderBottom: '1px solid #f0f0f0',
                marginBottom: '8px'
            }}>
                <AiserLogo 
                    size={props.collapsed ? 32 : 48} 
                    showText={!props.collapsed}
                />
            </div>
            <Menu
                mode="inline"
                defaultSelectedKeys={['ai-analytics']}
                items={items}
                onClick={onClick}
            />
        </Layout.Sider>
    );
};

export default Navigation;
