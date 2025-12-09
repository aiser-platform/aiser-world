export const dynamic = 'force-dynamic';

import React from 'react';
import { Providers } from '@/components/Providers/Providers';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html 
      lang="en" 
      suppressHydrationWarning
      style={{
        margin: 0,
        padding: 0,
        width: '100%',
        height: '100%',
        background: 'var(--ant-color-bg-layout, var(--color-bg-base))',
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}
    >
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
      <body style={{
        margin: 0,
        padding: 0,
        width: '100%',
        height: '100%',
        background: 'var(--ant-color-bg-layout, var(--color-bg-base))',
        backgroundColor: 'var(--ant-color-bg-layout, var(--color-bg-base))',
        color: 'var(--ant-color-text)',
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}>
        <GlobalErrorBoundary>
          <Providers>{children}</Providers>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
