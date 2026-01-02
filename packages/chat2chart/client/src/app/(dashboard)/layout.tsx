'use client';

import CustomLayout from '@/layouts/DashboardLayout/DashboardLayout';
import React from 'react';
import { ProtectedRoute } from '@/context/AuthContext';
import EnhancedOnboardingModal from '@/app/components/PlatformOnboardingModal/EnhancedOnboardingModal';
// Dark mode toggle moved to header

const DashboardLayout: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
    return (
        <ProtectedRoute>
            <CustomLayout>
                {children}
            </CustomLayout>
            <EnhancedOnboardingModal />
        </ProtectedRoute>
    );
});

export default DashboardLayout;
