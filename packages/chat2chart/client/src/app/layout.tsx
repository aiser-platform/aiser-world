export const dynamic = 'force-dynamic';

import React from 'react';
import { Providers } from '@/components/Providers/Providers';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('darkMode');
                if (theme === 'true') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <GlobalErrorBoundary>
          <Providers>{children}</Providers>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
