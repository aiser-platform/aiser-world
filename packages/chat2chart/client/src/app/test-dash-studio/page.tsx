'use client';

import React, { useEffect, useState } from 'react';
import MigratedDashboardStudioWrapper from '../(dashboard)/dash-studio/components/MigratedDashboardStudioWrapper';

const TestDashStudioPage: React.FC = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <div style={{ marginBottom: '20px', padding: '10px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '4px' }}>
        <strong>🧪 TEST MODE:</strong> Dashboard Studio without authentication - For testing widget rendering and property updates
      </div>
      {isClient ? (
        <MigratedDashboardStudioWrapper />
      ) : (
        <div>Loading Dashboard Studio...</div>
      )}
    </div>
  );
};

export default TestDashStudioPage;