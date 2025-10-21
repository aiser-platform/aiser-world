"use client";

import React, { useEffect, useRef, useState } from 'react';

type LogEntry = { level: string; message: string; time: string; meta?: any };

export default function ClientLogger() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const bufferRef = useRef<LogEntry[]>([]);

  useEffect(() => {
    const push = (level: string, message: string, meta?: any) => {
      const entry: LogEntry = { level, message, time: new Date().toISOString(), meta };
      bufferRef.current = [...bufferRef.current.slice(-199), entry];
      setLogs(bufferRef.current.slice());
    };

    const origConsoleError = console.error.bind(console);
    console.error = (...args: any[]) => {
      try { push('error', args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')); } catch {}
      origConsoleError(...args);
    };

    const origConsoleWarn = console.warn.bind(console);
    console.warn = (...args: any[]) => {
      try { push('warn', args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')); } catch {}
      origConsoleWarn(...args);
    };

    const onWindowError = (ev: ErrorEvent) => {
      try { push('error', ev.message, { filename: ev.filename, lineno: ev.lineno, colno: ev.colno }); } catch {}
    };

    const onUnhandledRejection = (ev: PromiseRejectionEvent) => {
      try { push('error', String(ev.reason)); } catch {}
    };

    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      console.error = origConsoleError;
      console.warn = origConsoleWarn;
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  const sendLogs = async () => {
    try {
      const payload = { logs: bufferRef.current, url: window.location.href, userAgent: navigator.userAgent };
      // Try same-origin proxy first
      const res = await fetch('/api/debug/client-error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        // Fallback: post directly to backend debug endpoint
        try {
          const backend = (window as any).__NEXT_DATA__?.props?.pageProps?.publicRuntimeConfig?.NEXT_PUBLIC_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`;
          await fetch(`${backend.replace(/\/$/, '')}/debug/client-error`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        } catch (e2) {
          console.error('Direct backend post failed', e2);
          throw e2;
        }
      }
      console.log('ClientLogger: logs sent', payload.logs?.length || 0);
    } catch (e) {
      console.warn('ClientLogger: Failed to send logs', e);
    }
  };

  // Periodically flush logs to server in background (dev only)
  useEffect(() => {
    const id = setInterval(() => {
      try {
        if (bufferRef.current && bufferRef.current.length > 0) {
          // fire-and-forget
          fetch('/api/debug/client-error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ logs: bufferRef.current, url: window.location.href, userAgent: navigator.userAgent }) }).catch(() => {});
        }
      } catch (e) {}
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ marginBottom: 8 }}>
        <button onClick={sendLogs} style={{ marginRight: 8 }}>Send client logs to server</button>
        <small style={{ color: '#666' }}>Buffered {logs.length} entries</small>
      </div>
      <div style={{ maxHeight: 240, overflow: 'auto', background: '#fafafa', padding: 8, borderRadius: 6 }}>
        {logs.slice().reverse().map((l, i) => (
          <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #eee' }}>
            <strong style={{ color: l.level === 'error' ? 'crimson' : '#333' }}>{l.level}</strong>
            <span style={{ marginLeft: 8, color: '#444' }}>{l.time}</span>
            <div style={{ color: '#111' }}>{l.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


