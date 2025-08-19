'use client';
import { Providers } from '@/components/Providers/Providers';
import '@/styles/globals.css';
import { usePathname } from 'next/navigation';

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <html lang="en">
            <head>
                <meta charSet="UTF-8" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                />
                <title>
                    {pathname === '/'
                        ? 'Aiser - AI-Powered Data Visualization'
                        : pathname === '/login'
                          ? 'Login - Aiser'
                          : pathname === '/logout'
                            ? 'Logout - Aiser'
                            : pathname.includes('test')
                              ? 'Test - Aiser'
                              : `${
                                    pathname
                                        .substring(1)
                                        .charAt(0)
                                        .toUpperCase() +
                                    pathname.slice(2)
                                } - Aiser`}
                </title>
                <link rel="icon" href="/aiser-logo.png" />
            </head>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
