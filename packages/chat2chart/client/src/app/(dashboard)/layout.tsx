'use client';

import CustomLayout from '@/layouts/DashboardLayout/DashboardLayout';
import React from 'react';
import { ProtectRoute, useAuth } from '@/context/AuthContext';
import { OrganizationProvider } from '@/context/OrganizationContext';
// Dark mode toggle moved to header

const DashboardLayout: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
    const { authError, verifyAuth } = useAuth();

    return (
        <ProtectRoute>
            {authError && (
                <div style={{ background: '#fff4f4', padding: 8, color: '#8b0000', textAlign: 'center' }}>
                    <strong>Authentication problem:</strong> {authError} — <button onClick={() => verifyAuth()} style={{ marginLeft: 8 }}>Re-check</button>
                </div>
            )}
            <OrganizationProvider>
                <CustomLayout>
                    {children}
                </CustomLayout>
            </OrganizationProvider>
        </ProtectRoute>
    );
});

export default DashboardLayout;
