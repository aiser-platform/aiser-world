'use client';

import React from 'react';

export default function TestDashboardPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Dashboard Test Page</h1>
      <p>This is a minimal test to check if the page loads.</p>
      <div id="__simple_client_test" style={{ display: 'none' }}>client-mounted</div>
    </div>
  );
}
