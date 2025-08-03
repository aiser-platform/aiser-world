'use client';

import { RedirectAuthenticated } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isSignoutRoute = pathname === '/signout';

    return isSignoutRoute ? (
        children
    ) : (
        <RedirectAuthenticated>{children}</RedirectAuthenticated>
    );
}
