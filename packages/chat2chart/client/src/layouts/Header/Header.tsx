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
            { key: 'logout', label: <a href="/logout">Logout</a> },
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
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}
        >
            <div>
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
            </div>
            <div>
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
            </div>
        </Layout.Header>
    );
};
