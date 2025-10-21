'use client';

import React, { useEffect, useState } from 'react';

const AuthTestPage: React.FC = () => {
    const [authStatus, setAuthStatus] = useState<string>('Checking...');
    const [userData, setUserData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const testAuth = async () => {
            try {
                console.log('🔍 Testing authentication...');
                
                // Test the exact same request that AuthContext makes
                const response = await fetch('/api/auth/users/me', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include', // This should send HttpOnly cookies
                });
                
                console.log('🔍 Auth test response status:', response.status);
                console.log('🔍 Auth test response headers:', Object.fromEntries(response.headers.entries()));
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Auth test successful:', data);
                    setUserData(data);
                    setAuthStatus(`✅ Authenticated as ${data.email}`);
                } else {
                    const errorText = await response.text();
                    console.log('❌ Auth test failed:', response.status, errorText);
                    setError(`${response.status}: ${errorText}`);
                    setAuthStatus(`❌ Not authenticated: ${response.status}`);
                }
            } catch (err) {
                console.error('❌ Auth test error:', err);
                setError(err instanceof Error ? err.message : String(err));
                setAuthStatus(`❌ Error: ${err}`);
            }
        };
        
        testAuth();
    }, []);

    const handleLogin = async () => {
        try {
            console.log('🔍 Testing login...');
            
            const response = await fetch('/api/auth/users/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    identifier: 'admin@aiser.app',
                    password: 'Admin123'
                }),
            });
            
            console.log('🔍 Login response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Login successful:', data);
                setUserData(data.user);
                setAuthStatus(`✅ Logged in as ${data.user.email}`);
                setError(null);
            } else {
                const errorText = await response.text();
                console.log('❌ Login failed:', response.status, errorText);
                setError(`${response.status}: ${errorText}`);
                setAuthStatus(`❌ Login failed: ${response.status}`);
            }
        } catch (err) {
            console.error('❌ Login error:', err);
            setError(err instanceof Error ? err.message : String(err));
            setAuthStatus(`❌ Login error: ${err}`);
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>Authentication Test Page</h1>
            
            <div style={{ marginBottom: '20px' }}>
                <strong>Status:</strong> {authStatus}
            </div>
            
            {userData && (
                <div style={{ marginBottom: '20px' }}>
                    <strong>User Data:</strong>
                    <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                        {JSON.stringify(userData, null, 2)}
                    </pre>
                </div>
            )}
            
            {error && (
                <div style={{ marginBottom: '20px', color: 'red' }}>
                    <strong>Error:</strong> {error}
                </div>
            )}
            
            <div style={{ marginBottom: '20px' }}>
                <button 
                    onClick={handleLogin}
                    style={{ 
                        padding: '10px 20px', 
                        backgroundColor: '#1890ff', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Test Login
                </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
                <strong>Instructions:</strong>
                <ol>
                    <li>Click "Test Login" to simulate the login process</li>
                    <li>Check the browser console for detailed logs</li>
                    <li>If login works, try accessing <a href="/chat">/chat</a></li>
                </ol>
            </div>
        </div>
    );
};

export default AuthTestPage;


