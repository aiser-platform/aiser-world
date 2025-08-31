'use client';

import dynamic from 'next/dynamic';

// Force dynamic rendering to avoid React context issues

const DashboardStudioWrapper = dynamic(() => import('./components/DashboardStudioWrapper'), {
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

export default function DashStudioPage() {
  return <DashboardStudioWrapper />;
}

