'use client';

import React, { useEffect, useState } from 'react';

const DebugAuthPage: React.FC = () => {
    const [authStatus, setAuthStatus] = useState<string>('Checking...');
    const [response, setResponse] = useState<any>(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                console.log('🔍 Debug: Checking /api/auth/users/me (proxy) ...');
                const res = await fetch('/api/auth/users/me', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                });

                console.log('🔍 Debug: Response status:', res.status);
                const text = await res.text();
                let data: any = null;
                try { data = text ? JSON.parse(text) : null; } catch { data = text; }
                console.log('🔍 Debug: Response data:', data);

                setResponse({ status: res.status, data });

                if (res.ok) {
                    setAuthStatus(`✅ Authenticated: ${data?.email || 'unknown'}`);
                } else {
                    setAuthStatus(`❌ Not authenticated: ${data?.detail || String(data) || 'Unknown error'}`);
                }
            } catch (error) {
                console.error('🔍 Debug: Error:', error);
                setAuthStatus(`❌ Error: ${error}`);
                setResponse({ error: error instanceof Error ? error.message : String(error) });
            }
        };

        checkAuth();
    }, []);

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>Debug Authentication</h1>
            <div style={{ marginBottom: '20px' }}>
                <strong>Status:</strong> {authStatus}
            </div>
            <div style={{ marginBottom: '20px' }}>
                <strong>Response:</strong>
                <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                    {JSON.stringify(response, null, 2)}
                </pre>
            </div>
            <div style={{ marginBottom: '20px' }}>
                <strong>Actions:</strong>
                <div style={{ marginTop: '8px' }}>
                    <button onClick={async () => {
                        setAuthStatus('Signing in...');
                        try {
                            const res = await fetch('/api/auth/users/signin', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ identifier: 'admin@aiser.app', password: 'Admin123' }),
                            });
                            const data = await res.text();
                            let parsed = null;
                            try { parsed = data ? JSON.parse(data) : null; } catch { parsed = data; }
                            setResponse({ status: res.status, data: parsed });
                            setAuthStatus(res.ok ? 'Sign-in response OK' : `Sign-in failed: ${res.status}`);
                        } catch (e) {
                            setAuthStatus(`Sign-in error: ${String(e)}`);
                        }
                    }} style={{ marginRight: 8 }}>Login (api)</button>

                    <button onClick={async () => {
                        setAuthStatus('Checking (manual)...');
                        try {
                            const res = await fetch('/api/auth/users/me', { method: 'GET', credentials: 'include' });
                            const txt = await res.text();
                            let parsed = null; try { parsed = txt ? JSON.parse(txt) : null; } catch { parsed = txt; }
                            setResponse({ status: res.status, data: parsed });
                            setAuthStatus(res.ok ? `OK: ${parsed?.email || 'unknown'}` : `Not authed: ${res.status}`);
                        } catch (e) {
                            setAuthStatus(`Check error: ${String(e)}`);
                        }
                    }} style={{ marginRight: 8 }}>Check /users/me</button>

                    <button onClick={() => {
                        const cookie = typeof document !== 'undefined' ? document.cookie : '';
                        const lsToken = typeof localStorage !== 'undefined' ? localStorage.getItem('aiser_access_token') : null;
                        setResponse({ cookie, lsToken });
                    }}>Show cookies/localStorage</button>
                </div>
                <div style={{ marginTop: 12 }}>
                    <strong>Note:</strong> This page uses the same-origin proxy at <code>/api/auth/*</code> to avoid CORS and ensure Set-Cookie is forwarded.
                </div>
            </div>
        </div>
    );
};

export default DebugAuthPage;
