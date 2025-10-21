'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function TestAuthPage() {
  const { user, isAuthenticated, loading, authError, initialized } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    const results = [
      `Initialized: ${initialized}`,
      `Loading: ${loading}`,
      `Is Authenticated: ${isAuthenticated}`,
      `User: ${user ? JSON.stringify(user) : 'null'}`,
      `Auth Error: ${authError || 'none'}`,
      `Cookies: ${typeof document !== 'undefined' ? document.cookie : 'N/A'}`,
    ];
    setTestResults(results);
  }, [user, isAuthenticated, loading, authError, initialized]);

  const testAuthEndpoint = async () => {
    try {
      const response = await fetch('/api/auth/users/me', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      const data = await response.json();
      setTestResults(prev => [...prev, `API Test: ${response.status} - ${JSON.stringify(data)}`]);
    } catch (error) {
      setTestResults(prev => [...prev, `API Test Error: ${error}`]);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Authentication Test Page</h1>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={testAuthEndpoint} style={{ padding: '10px', marginRight: '10px' }}>
          Test Auth Endpoint
        </button>
        <button onClick={() => window.location.href = '/login'} style={{ padding: '10px', marginRight: '10px' }}>
          Go to Login
        </button>
        <button onClick={() => window.location.href = '/dash-studio'} style={{ padding: '10px' }}>
          Go to Dashboard Studio
        </button>
      </div>
      <div>
        <h2>Auth State:</h2>
        {testResults.map((result, index) => (
          <div key={index} style={{ marginBottom: '5px' }}>
            {result}
          </div>
        ))}
      </div>
    </div>
  );
}