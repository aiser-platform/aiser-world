'use client';

import LoadingScreen from '@/components/LoadingScreen/LoadingScreen';
import { useAuth } from '@/context/AuthContext';
import { useLayoutEffect } from 'react';

export default function SignoutPage() {
    const { signout } = useAuth();

    useLayoutEffect(() => {
        signout();
    });

    // Show loading screen while redirecting
    return <LoadingScreen />;
}
