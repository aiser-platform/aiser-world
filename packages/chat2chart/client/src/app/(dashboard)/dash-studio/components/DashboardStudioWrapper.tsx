'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Lazy load both the context provider and dashboard studio to avoid SSR issues
const LazyDashboardStudioWithProvider = dynamic(() => {
  return Promise.all([
    import('./EChartsConfiguration'),
    import('./DashboardStudio')
  ]).then(([EChartsConfigModule, DashboardStudioModule]) => {
    const { EChartsConfigProvider } = EChartsConfigModule;
    const DashboardStudio = DashboardStudioModule.default;
    
    return () => (
      <EChartsConfigProvider>
        <DashboardStudio />
      </EChartsConfigProvider>
    );
  });
}, {
  ssr: false,
  loading: () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '18px',
      background: '#f5f5f5'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>🚀</div>
        <div>Loading Dashboard Studio...</div>
        <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
          Preparing your BI dashboard environment
        </div>
      </div>
    </div>
  )
});

const DashboardStudioWrapper: React.FC = () => {
  return <LazyDashboardStudioWithProvider />;
};

export default DashboardStudioWrapper;
