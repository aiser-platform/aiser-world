'use client';
import useClickOutside from '@/hooks/useClickOutside';
import {
    BarChartOutlined,
    DatabaseOutlined,
    MessageOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, MenuProps } from 'antd';
// import { useRouter } from "next/navigation";
import React from 'react';

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
            key: 'chart-builder',
            icon: <BarChartOutlined />,
            label: 'Chart Builder',
        },
        {
            key: 'database',
            icon: <DatabaseOutlined />,
            label: 'Database',
        },
    ];

    const onClick: MenuProps['onClick'] = (e) => {
        console.log('click ', e);
    };

    return (
        <Layout.Sider
            ref={ref}
            theme="light"
            collapsible
            collapsed={props.collapsed}
            breakpoint="lg"
            trigger={
                <Button
                    className="min-w-full text-left"
                    type="text"
                    icon={<SettingOutlined />}
                >
                    {props.collapsed ? null : 'Settings'}
                </Button>
            }
        >
            <div className="demo-logo-vertical" />
            <Menu
                mode="inline"
                defaultSelectedKeys={['chat-to-chart']}
                items={items}
                onClick={onClick}
            />
        </Layout.Sider>
    );
};

export default Navigation;
