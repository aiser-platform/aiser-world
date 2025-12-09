'use client';
import Logo from '@/components/Logo/Logo';
import useClickOutside from '@/hooks/useClickOutside';
import {
    BarChartOutlined,
    DatabaseOutlined,
    MessageOutlined,
    SettingOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Layout, Menu, MenuProps } from 'antd';
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

    const profileMenu: MenuProps = {
        items: [
            { key: 'profile', label: <a href="/profile">Profile</a> },
            { key: 'signout', label: <a href="/signout">Signout</a> },
        ],
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
            {props.isBreakpoint ? (
                <Dropdown menu={profileMenu} placement="bottomRight">
                    <Button
                        type="text"
                        icon={<UserOutlined />}
                        style={{
                            fontSize: '16px',
                            width: 32,
                            height: 32,
                        }}
                    />
                </Dropdown>
            ) : (
                <Logo collapsed={props.collapsed} />
            )}
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
