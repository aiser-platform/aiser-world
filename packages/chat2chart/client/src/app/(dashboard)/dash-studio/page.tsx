'use client';

import nextDynamic from 'next/dynamic';

// Force dynamic rendering to avoid React context issues

const DashboardStudioWrapper = nextDynamic(() => import('./components/DashboardStudioWrapper'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '18px'
    }}>
      Loading Dashboard Studio...
    </div>
  )
});

export const dynamic = 'force-dynamic';

export default function DashStudioPage() {
  return <DashboardStudioWrapper />;
}

