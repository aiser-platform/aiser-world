'use client';

import { RedirectAuthenticated } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isLogoutRoute = pathname === '/logout';

    return isLogoutRoute ? (
        children
    ) : (
        <RedirectAuthenticated>{children}</RedirectAuthenticated>
    );
}
