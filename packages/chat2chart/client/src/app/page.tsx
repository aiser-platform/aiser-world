'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function HomePage() {
    const router = useRouter();

    useEffect(() => {
        // Immediately redirect to login page
        router.replace('/login');
    }, [router]);

    return (
        <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            fontSize: '16px',
            color: '#666'
        }}>
            Redirecting to login...
        </div>
    );
}
