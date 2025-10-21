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

    return (
        <Layout 
            className="h-screen overflow-hidden" 
            style={{ 
                height: '100vh',
                margin: 0,
                padding: 0,
                background: 'var(--layout-background)',
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
                className={`${
                    isBreakpoint && !collapsed ? 'filter brightness-25' : ''
                } transition-all min-h-0`}
                style={{ 
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.2s ease',
                    marginLeft: 0, // Remove margin since header is now positioned correctly
                    width: '100%',
                }}
            >
                <LayoutHeader
                    isBreakpoint={isBreakpoint}
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                />
                <Content
                    style={{
                        flex: 1,
                        margin: 0,
                        marginLeft: collapsed ? '80px' : '256px', // Account for fixed sidebar
                        marginTop: '64px', // Account for fixed header height
                        padding: 0,
                        minHeight: 0,
                        overflow: 'auto',
                        position: 'relative',
                        background: 'var(--layout-background)',
                        width: `calc(100% - ${collapsed ? '80px' : '256px'})`, // Adjust width for sidebar
                        height: '100%',
                        transition: 'all 0.2s ease', // Smooth transition
                    }}
                >
                    <div className="page-content" style={{ 
                        width: '100%',
                        height: '100%',
                        padding: '0', // Removed padding to eliminate white edges
                        background: 'var(--layout-background)',
                        margin: 0,
                    }}>
                        {children}
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
});

CustomLayout.displayName = 'CustomLayout';

export default CustomLayout;
