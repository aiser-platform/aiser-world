import { Grid, Layout, theme } from 'antd';
import React, { useState } from 'react';
import { LayoutHeader } from '../Header/Header';
import Navigation from '../Navigation/Navigation';

const { useBreakpoint } = Grid;

const { Content } = Layout;

interface CustomLayoutProps {
    children: React.ReactNode;
    isDarkMode?: boolean;
}

const CustomLayout: React.FC<CustomLayoutProps> = ({ children }) => {
    const [collapsed, setCollapsed] = useState(true);
    const [isBreakpoint, setIsBreakpoint] = useState(false);
    const {
        token: { borderRadiusLG },
    } = theme.useToken();

    const screens = useBreakpoint();

    React.useEffect(() => {
        setIsBreakpoint(!screens.lg);
        setCollapsed(!screens.lg);
    }, [screens]);

    return (
        <Layout className="h-screen overflow-hidden" hasSider>
            <Navigation
                collapsed={collapsed}
                isBreakpoint={isBreakpoint}
                onCollapse={setCollapsed}
                onBreakpoint={setIsBreakpoint}
            />

            <Layout
                className={`${
                    isBreakpoint && !collapsed ? 'filter brightness-25' : ''
                } transition-all duration-300`}
            >
                <LayoutHeader
                    isBreakpoint={isBreakpoint}
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                />
                <Content
                    style={{
                        margin: '8px',
                        padding: 24,
                        minHeight: 280,
                        borderRadius: borderRadiusLG,
                    }}
                >
                    {children}
                </Content>
            </Layout>
        </Layout>
    );
};

export default CustomLayout;
