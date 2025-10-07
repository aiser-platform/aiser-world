'use client';

import React, { useEffect, useState } from 'react';

const SimpleAuthTestPage: React.FC = () => {
    const [authStatus, setAuthStatus] = useState<string>('Checking...');
    const [userData, setUserData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const testAuth = async () => {
            try {
                console.log('🔍 Simple Auth Test: Testing authentication...');
                
                // Test the exact same request that AuthContext makes
                const response = await fetch('http://localhost:5000/users/me', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include', // This should send HttpOnly cookies
                });
                
                console.log('🔍 Simple Auth Test: Response status:', response.status);
                console.log('🔍 Simple Auth Test: Response headers:', Object.fromEntries(response.headers.entries()));
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Simple Auth Test: Success:', data);
                    setUserData(data);
                    setAuthStatus(`✅ Authenticated as ${data.email}`);
                } else {
                    const errorText = await response.text();
                    console.log('❌ Simple Auth Test: Failed:', response.status, errorText);
                    setError(`${response.status}: ${errorText}`);
                    setAuthStatus(`❌ Not authenticated: ${response.status}`);
                }
            } catch (err) {
                console.error('❌ Simple Auth Test: Error:', err);
                setError(err instanceof Error ? err.message : String(err));
                setAuthStatus(`❌ Error: ${err}`);
            }
        };
        
        testAuth();
    }, []);

    const handleLogin = async () => {
        try {
            console.log('🔍 Simple Auth Test: Testing login...');
            
            const response = await fetch('http://localhost:5000/users/signin', {
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
            
            console.log('🔍 Simple Auth Test: Login response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Simple Auth Test: Login successful:', data);
                setUserData(data.user);
                setAuthStatus(`✅ Logged in as ${data.user.email}`);
                setError(null);
                
                // After successful login, test /users/me again
                setTimeout(() => {
                    testAuth();
                }, 1000);
            } else {
                const errorText = await response.text();
                console.log('❌ Simple Auth Test: Login failed:', response.status, errorText);
                setError(`${response.status}: ${errorText}`);
                setAuthStatus(`❌ Login failed: ${response.status}`);
            }
        } catch (err) {
            console.error('❌ Simple Auth Test: Login error:', err);
            setError(err instanceof Error ? err.message : String(err));
            setAuthStatus(`❌ Login error: ${err}`);
        }
    };

    const testAuth = async () => {
        try {
            console.log('🔍 Simple Auth Test: Testing authentication...');
            
            const response = await fetch('http://localhost:5000/users/me', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });
            
            console.log('🔍 Simple Auth Test: Response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Simple Auth Test: Success:', data);
                setUserData(data);
                setAuthStatus(`✅ Authenticated as ${data.email}`);
            } else {
                const errorText = await response.text();
                console.log('❌ Simple Auth Test: Failed:', response.status, errorText);
                setError(`${response.status}: ${errorText}`);
                setAuthStatus(`❌ Not authenticated: ${response.status}`);
            }
        } catch (err) {
            console.error('❌ Simple Auth Test: Error:', err);
            setError(err instanceof Error ? err.message : String(err));
            setAuthStatus(`❌ Error: ${err}`);
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>Simple Authentication Test Page</h1>
            <p><strong>Note:</strong> This page bypasses ProtectRoute to test auth directly</p>
            
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
                        cursor: 'pointer',
                        marginRight: '10px'
                    }}
                >
                    Test Login
                </button>
                <button 
                    onClick={testAuth}
                    style={{ 
                        padding: '10px 20px', 
                        backgroundColor: '#52c41a', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Test Auth Check
                </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
                <strong>Instructions:</strong>
                <ol>
                    <li>Click "Test Login" to simulate the login process</li>
                    <li>Click "Test Auth Check" to verify authentication status</li>
                    <li>Check the browser console for detailed logs</li>
                    <li>If login works, try accessing <a href="/chat">/chat</a></li>
                </ol>
            </div>
        </div>
    );
};

export default SimpleAuthTestPage;


