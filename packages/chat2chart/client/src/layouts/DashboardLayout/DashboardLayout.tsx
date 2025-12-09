import { Grid, Layout, theme } from 'antd';
import React, { useState } from 'react';
import { LayoutHeader } from '../Header/Header';
import Navigation from '../Navigation/Navigation';

const { useBreakpoint } = Grid;
const { Content } = Layout;

interface CustomLayoutProps {
    children: React.ReactNode;
}

const CustomLayout: React.FC<CustomLayoutProps> = React.memo(({ children }) => {
    const [collapsed, setCollapsed] = useState(true);
    const [isBreakpoint, setIsBreakpoint] = useState(false);

    const screens = useBreakpoint();

    React.useEffect(() => {
        setIsBreakpoint(!screens.lg);
        setCollapsed(!screens.lg);
    }, [screens]);

    const sidebarOffset = React.useMemo(
        () => (isBreakpoint ? 0 : collapsed ? 80 : 256),
        [collapsed, isBreakpoint]
    );

    return (
        <Layout 
            className="h-screen overflow-hidden" 
            style={{ 
                height: '100vh',
                margin: 0,
                padding: 0,
                background: 'var(--ant-color-bg-layout)',
            }} 
            hasSider
        >
            <Navigation
                collapsed={collapsed}
                isBreakpoint={isBreakpoint}
                onCollapse={setCollapsed}
                onBreakpoint={setIsBreakpoint}
            />

            <Layout
                className={isBreakpoint && !collapsed ? 'filter brightness-25' : ''}
                style={{ 
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'margin-left 0.2s ease',
                    marginLeft: sidebarOffset,
                    width: `calc(100% - ${sidebarOffset}px)`,
                    marginTop: 0,
                    padding: 0,
                    background: 'var(--ant-color-bg-layout)',
                }}
            >
                <LayoutHeader
                    isBreakpoint={isBreakpoint}
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                />
                <Content
                    className="dashboard-content-override"
                    style={{
                        flex: 1,
                        height: 'calc(100vh - 64px)',
                        minHeight: 'calc(100vh - 64px)',
                        maxHeight: 'calc(100vh - 64px)',
                        margin: 0,
                        marginTop: '64px', /* Account for fixed header */
                        padding: 0,
                        paddingTop: 0,
                        background: 'var(--ant-color-bg-layout)',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        boxSizing: 'border-box',
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        overflow: 'hidden',
                    }}
                >
                    <div className="page-content">{children}</div>
                </Content>
            </Layout>
        </Layout>
    );
});

CustomLayout.displayName = 'CustomLayout';

export default CustomLayout;
