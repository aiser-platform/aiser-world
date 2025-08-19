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
import { useDarkMode } from '@/hooks/useDarkMode';

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
        token: { colorBgContainer },
    } = theme.useToken();
    
    const [isDarkMode, setIsDarkMode] = useDarkMode();

    return (
        <Layout.Header
            style={{
                padding: '0 16px',
                background: colorBgContainer,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #f0f0f0',
            }}
        >
            <div className="flex items-center">
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
            
            <div className="flex items-center space-x-2">
                {/* GitHub Issue Buttons */}
                <Tooltip title="🐛 Report Bug - Opens GitHub issue">
                    <Button
                        type="text"
                        icon={<BugOutlined />}
                        onClick={() => window.open('https://github.com/aiser-platform/aiser-world/issues/new?assignees=&labels=bug&projects=aiser-platform/2&template=bug_report.yml&title=%5BBUG%5D%3A+', '_blank')}
                        style={{
                            fontSize: '16px',
                            width: 40,
                            height: 40,
                        }}
                        className="hover:bg-gray-100"
                    />
                </Tooltip>
                
                <Tooltip title="✨ Request Feature - Opens GitHub issue">
                    <Button
                        type="text"
                        icon={<StarOutlined />}
                        onClick={() => window.open('https://github.com/aiser-platform/aiser-world/issues/new?assignees=&labels=enhancement&projects=aiser-platform/2&template=feature_request.yml&title=%5BFEATURE%5D%3A+', '_blank')}
                        style={{
                            fontSize: '16px',
                            width: 40,
                            height: 40,
                        }}
                        className="hover:bg-gray-100"
                    />
                </Tooltip>
                
                <Tooltip title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                    <Button
                        type="text"
                        icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        style={{
                            fontSize: '16px',
                            width: 40,
                            height: 40,
                        }}
                        className="hover:bg-gray-100"
                    />
                </Tooltip>
                <UserProfileDropdown />
            </div>
        </Layout.Header>
    );
};
