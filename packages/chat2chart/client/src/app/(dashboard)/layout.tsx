'use client';

import CustomLayout from '@/layouts/DashboardLayout/DashboardLayout';
import { ProtectRoute } from '@/context/AuthContext';
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
        </ProtectRoute>
    );
}
