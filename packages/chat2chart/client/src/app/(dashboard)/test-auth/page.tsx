'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const TestAuthPage: React.FC = () => {
    const { user, isAuthenticated, loading, initialized } = useAuth();
    const [authStatus, setAuthStatus] = useState<string>('Checking...');

    useEffect(() => {
        if (initialized) {
            if (isAuthenticated && user) {
                setAuthStatus(`✅ Authenticated as: ${user.email} (${user.username})`);
            } else {
                setAuthStatus('❌ Not authenticated');
            }
        }
    }, [initialized, isAuthenticated, user]);

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>Authentication Test Page</h1>
            <div style={{ marginBottom: '20px' }}>
                <strong>Status:</strong> {authStatus}
            </div>
            <div style={{ marginBottom: '20px' }}>
                <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
            </div>
            <div style={{ marginBottom: '20px' }}>
                <strong>Initialized:</strong> {initialized ? 'Yes' : 'No'}
            </div>
            <div style={{ marginBottom: '20px' }}>
                <strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}
            </div>
            {user && (
                <div style={{ marginBottom: '20px' }}>
                    <strong>User Data:</strong>
                    <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                        {JSON.stringify(user, null, 2)}
                    </pre>
                </div>
            )}
            <div style={{ marginBottom: '20px' }}>
                <strong>Instructions:</strong>
                <ol>
                    <li>Go to <a href="/login">/login</a> and sign in with admin@aiser.app / Admin123</li>
                    <li>Come back to this page to see if authentication is working</li>
                </ol>
            </div>
        </div>
    );
};

export default TestAuthPage;


