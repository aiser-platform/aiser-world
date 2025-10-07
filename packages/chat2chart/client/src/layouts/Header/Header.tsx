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
import { useThemeMode } from '@/components/Providers/ThemeModeContext';
import ProjectSelector from '@/app/(dashboard)/chat/components/ProjectSelector/ProjectSelector';
import ModelSelector from '@/app/components/ModelSelector/ModelSelector';
import ModeSelector from '@/app/components/ModeSelector/ModeSelector';

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

    return (
        <Layout.Header
            style={{
                padding: '0 16px',
                background: isDarkMode ? '#1f1f1f' : '#ffffff',
                color: colorText,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
            }}
        >
            <div className="header-left flex items-center space-x-4" style={{ alignItems: 'center' }}>
                {/* Sidebar toggle (left of project selector) */}
                <Tooltip title={collapsed ? 'Open sidebar' : 'Collapse sidebar'}>
                    <Button
                        type="text"
                        icon={isBreakpoint ? <MenuOutlined /> : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'}
                        className="sidebar-toggle"
                        style={{ fontSize: '16px', width: 44, height: 44, padding: 6 }}
                    />
                </Tooltip>

                {/* Logo / Project selector grouping */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="logo-compact">
                        {/* lightweight text logo for visibility */}
                        <img src="/logo192.png" alt="Aiser" style={{ width: 34, height: 34, borderRadius: 6 }} />
                    </div>
                    <div style={{ marginLeft: 0 }}>
                        <ProjectSelector isHeader={true} />
                    </div>
                </div>
            </div>
            
            {/* spacer pushes header-right group to the far right */}
            <div style={{ flex: 1 }} />

            <div className="header-right flex items-center space-x-2">
                {/* Mode selector and AI Model selector in header for quick access */}
                <div style={{ marginRight: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ width: 160 }}>
                        <ModeSelector
                            value={typeof window !== 'undefined' ? (localStorage.getItem('chat_mode') || 'standard') : 'standard'}
                            onChange={(v: string) => {
                                try { localStorage.setItem('chat_mode', v); } catch (e) {}
                                try { window.dispatchEvent(new CustomEvent('chat_mode_changed', { detail: v })); } catch (e) {}
                            }}
                            disabled={false}
                        />
                    </div>
                    <div>
                        <ModelSelector onModelChange={() => {}} showCostInfo={false} compact={true} />
                    </div>
                </div>
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
                        
                    />
                </Tooltip>
                
                <Tooltip title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                    <Button
                        type="text"
                        icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        aria-label={isDarkMode ? 'Light mode' : 'Dark mode'}
                        style={{ fontSize: '16px', width: 40, height: 40 }}
                    />
                </Tooltip>
                <UserProfileDropdown />
            </div>
        </Layout.Header>
    );
};
