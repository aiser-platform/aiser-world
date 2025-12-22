'use client';

import CustomLayout from '@/layouts/DashboardLayout/DashboardLayout';
import React from 'react';
import { ProtectedRoute, useAuth } from '@/context/AuthContext';
import { OrganizationProvider } from '@/context/OrganizationContext';
import { usePathname, useRouter } from 'next/navigation';
import EnhancedOnboardingModal from '@/app/components/PlatformOnboardingModal/EnhancedOnboardingModal';
import LoadingScreen from '@/components/LoadingScreen/LoadingScreen';
// Dark mode toggle moved to header

const DashboardLayout: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {

    return (
        <ProtectedRoute>
            <OrganizationProvider>
                <CustomLayout>
                    {children}
                </CustomLayout>
                <EnhancedOnboardingModal />
            </OrganizationProvider>
        </ProtectedRoute>
    );
});

export default DashboardLayout;
