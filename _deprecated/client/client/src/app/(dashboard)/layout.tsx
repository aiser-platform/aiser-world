'use client';

import CustomLayout from '@/layouts/DashboardLayout/DashboardLayout';
import { ProtectRoute } from '@/context/AuthContext';
import { OrganizationProvider } from '@/context/OrganizationContext';
import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { FloatButton } from 'antd';
import { useDarkMode } from '@/hooks/useDarkMode';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isDarkMode, setIsDarkMode] = useDarkMode();

    return (
        <ProtectRoute>
            <OrganizationProvider>
                <CustomLayout>
                    <FloatButton
                        onClick={() => {
                            setIsDarkMode(!isDarkMode);
                            window.location.reload();
                        }}
                        icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
                        className="mb-4"
                    />
                    {children}
                </CustomLayout>
            </OrganizationProvider>
        </ProtectRoute>
    );
}
