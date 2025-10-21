'use client';

import CustomLayout from '@/layouts/DashboardLayout/DashboardLayout';
import React from 'react';
import { ProtectRoute, useAuth } from '@/context/AuthContext';
import { OrganizationProvider } from '@/context/OrganizationContext';
import { usePathname } from 'next/navigation';
// Dark mode toggle moved to header

const DashboardLayout: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
    const { authError, verifyAuth } = useAuth();
    const pathname = usePathname();


    // For the dashboard studio route we allow rendering immediately and show
    // a lightweight authentication banner instead of full ProtectRoute blocking.
    if (pathname?.startsWith?.('/dash-studio')) {
        return (
            <>
                {authError && (
                    <div style={{ background: 'var(--color-functional-danger-light)', padding: 8, color: 'var(--color-functional-danger)', textAlign: 'center' }}>
                        <strong>Authentication problem:</strong> {authError} — <button onClick={() => verifyAuth()} style={{ marginLeft: 8 }}>Re-check</button>
                    </div>
                )}


                <OrganizationProvider>
                    <CustomLayout>
                        {children}
                    </CustomLayout>
                </OrganizationProvider>
            </>
        );
    }

    return (
        <ProtectRoute>
            {authError && (
                <div style={{ background: 'var(--color-functional-danger-light)', padding: 8, color: 'var(--color-functional-danger)', textAlign: 'center' }}>
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
