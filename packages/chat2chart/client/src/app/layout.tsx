export const dynamic = 'force-dynamic';

import React from 'react';
import { Providers } from '@/components/Providers/Providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
