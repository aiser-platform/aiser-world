'use client';

import CustomLayout from '@/layouts/DashboardLayout/DashboardLayout';
import React from 'react';
import { ProtectRoute } from '@/context/AuthContext';
import { OrganizationProvider } from '@/context/OrganizationContext';
// Dark mode toggle moved to header

const DashboardLayout: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
    return (
        <ProtectRoute>
            <OrganizationProvider>
                <CustomLayout>
                    {children}
                </CustomLayout>
            </OrganizationProvider>
        </ProtectRoute>
    );
});

export default DashboardLayout;
