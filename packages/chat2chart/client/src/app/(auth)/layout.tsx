'use client';

import { RedirectAuthenticated } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import React from 'react';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // CRITICAL: All hooks must be called unconditionally at the top level
    const pathname = usePathname();
    
    // CRITICAL: Always render RedirectAuthenticated to ensure hooks are called consistently
    // RedirectAuthenticated will handle the logout route internally
    return (
        <RedirectAuthenticated>
            {children}
        </RedirectAuthenticated>
    );
}
