"use client";

import React, { useState } from "react";

const AuthDebugPage: React.FC = () => {
  const [status, setStatus] = useState<string>("Idle");
  const [result, setResult] = useState<any>(null);
  const [headers, setHeaders] = useState<Record<string,string> | null>(null);

  const checkMe = async () => {
    setStatus("Calling /users/me...");
    setResult(null);
    try {
      // Prefer same-origin proxy when available to ensure cookies are forwarded
      const proxyUrl = `/api/auth/users/me`;
      const directUrl = `${window.location.protocol}//${window.location.hostname}:5000/users/me`;
      const target = window.location.hostname === 'localhost' ? proxyUrl : proxyUrl;
      const res = await fetch(target, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const body = await (res.headers.get("content-type") || "").includes("application/json") ? res.json() : res.text();
      const hdrs: Record<string,string> = {};
      res.headers.forEach((v,k) => (hdrs[k] = v));
      setHeaders(hdrs);
      setResult({ status: res.status, body });
      setStatus("Done");
    } catch (e) {
      setStatus("Error");
      setResult(String(e));
    }
  };

  const doLogin = async () => {
    setStatus("Logging in...");
    try {
      // Use same-origin proxy to receive HttpOnly cookies reliably
      const target = `/api/auth/users/signin`;
      const res = await fetch(target, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: "admin@aiser.app", password: "Admin123" }),
      });
      const body = await res.json();
      setResult({ status: res.status, body });
      setStatus("Login complete");
    } catch (e) {
      setStatus("Login error");
      setResult(String(e));
    }
  };

  const clearLocal = () => {
    try { localStorage.removeItem('aiser_access_token'); } catch {}
    setStatus('Cleared localStorage token');
  };

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <h2>Auth Debug</h2>
      <p><strong>Docs:</strong> This page helps diagnose cookie / auth issues in the browser.</p>

      <div style={{ marginBottom: 12 }}>
        <button onClick={checkMe} style={{ marginRight: 8 }}>Check /users/me</button>
        <button onClick={doLogin} style={{ marginRight: 8 }}>Login (api)</button>
        <button onClick={clearLocal}>Clear local token</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong>Status:</strong> {status}
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong>document.cookie:</strong>
        <pre style={{ background: '#f5f5f5', padding: 8 }}>{document.cookie || '<no cookies visible to JS>'}</pre>
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong>localStorage aiser_access_token:</strong>
        <pre style={{ background: '#f5f5f5', padding: 8 }}>{localStorage.getItem('aiser_access_token') || '<none>'}</pre>
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong>Last response headers:</strong>
        <pre style={{ background: '#f5f5f5', padding: 8 }}>{headers ? JSON.stringify(headers, null, 2) : '<none>'}</pre>
      </div>

      <div>
        <strong>Last response:</strong>
        <pre style={{ background: '#f5f5f5', padding: 8 }}>{result ? JSON.stringify(result, null, 2) : '<none>'}</pre>
      </div>
    </div>
  );
};

export default AuthDebugPage;


