import Logo from '@/components/Logo/Logo';
import {
    MenuFoldOutlined,
    MenuOutlined,
    MenuUnfoldOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Layout, MenuProps, theme } from 'antd';

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
    const profileMenu: MenuProps = {
        items: [
            { key: 'profile', label: <a href="/profile">Profile</a> },
            { key: 'signout', label: <a href="/signout">Signout</a> },
        ],
    };

    const {
        token: { colorBgContainer },
    } = theme.useToken();

    return (
        <Layout.Header
            style={{
                padding: 0,
                background: colorBgContainer,
                display: 'grid',
                gridTemplateColumns: '64px 1fr 64px',
                alignItems: 'center',
            }}
        >
            <Button
                type="text"
                icon={
                    isBreakpoint ? (
                        <MenuOutlined />
                    ) : collapsed ? (
                        <MenuUnfoldOutlined />
                    ) : (
                        <MenuFoldOutlined />
                    )
                }
                onClick={() => setCollapsed(!collapsed)}
                style={{
                    fontSize: '16px',
                    width: 64,
                    height: 64,
                }}
            />
            <div className="flex justify-center items-center">
                {isBreakpoint && <Logo collapsed={false} />}
            </div>
            <Dropdown menu={profileMenu}>
                <Button
                    type="text"
                    icon={<UserOutlined />}
                    style={{
                        fontSize: '16px',
                        width: 64,
                        height: 64,
                    }}
                />
            </Dropdown>
        </Layout.Header>
    );
};
