import { Providers } from '@/components/Providers/Providers';
import '@/styles/globals.css';

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head />
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
