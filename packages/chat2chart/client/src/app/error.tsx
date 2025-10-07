 'use client';
export const dynamic = 'force-dynamic';

import React from 'react';

export default function AppError({ error }: { error: Error }) {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h1>Application error</h1>
      <p>{error?.message || 'An unexpected error occurred.'}</p>
    </div>
  );
}


