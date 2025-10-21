import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
// Use BACKEND as-is. In some dev/container setups an internal docker hostname
// (e.g. chat2chart-server) may be required, but remapping here caused the
// proxy to attempt to fetch an unreachable host in non-container environments
// and produced `fetch failed` errors. If you need docker hostname mapping set
// NEXT_PUBLIC_API_URL appropriately in your environment.
const INTERNAL_BACKEND = BACKEND;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Basic CORS for dev (allow frontend origins)
    const origin = req.headers.origin || '';
    const allowed = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'];
    if (allowed.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    if (req.method === 'OPTIONS') return res.status(204).end();

    const rawUrl = String(req.url || '');
    // strip the /api/ prefix
    const path = rawUrl.replace(/^\/api\/?/, '').replace(/^\//, '');
    const targetBase = INTERNAL_BACKEND.replace(/\/$/, '');
    // Heuristic routing to match backend route prefixes:
    // - data/* -> backend /data/*
    // - conversations/* -> backend /conversations/* (top-level)
    // - chats/* -> backend /chats/* (top-level)
    // - otherwise -> backend /api/*
    let target: string;
    if (!path) {
      target = `${targetBase}/api`;
    } else if (path.startsWith('data/')) {
      target = `${targetBase}/${path}`;
    } else if (path.startsWith('ai/')) {
      // AI endpoints are top-level on the backend (e.g. /ai/models)
      target = `${targetBase}/${path}`;
    } else if (path.startsWith('conversations') || path.startsWith('chats')) {
      target = `${targetBase}/${path}`;
    } else {
      target = `${targetBase}/api/${path}`;
    }

    // Build fetch options
    const headers: Record<string, string> = {};
    // forward selected headers
    if (req.headers.cookie) headers.cookie = String(req.headers.cookie);
    if (req.headers.authorization) headers.authorization = String(req.headers.authorization);
    if (req.headers['content-type']) headers['content-type'] = String(req.headers['content-type']);

    const fetchOptions: any = { method: req.method, headers, redirect: 'follow' };
    if (req.method && req.method !== 'GET') {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    console.log('Proxying /api ->', target, 'method=', req.method);
    let upstream: Response | null = null;
    const candidateTargets: string[] = [target, `${targetBase.replace(/\/$/, '')}`.replace(/\/$/, '')];
    // Ensure we have sensible fallbacks: try localhost then docker hostname
    if (!candidateTargets.includes('http://localhost:8000')) candidateTargets.push('http://localhost:8000');
    if (!candidateTargets.includes('http://chat2chart-server:8000')) candidateTargets.push('http://chat2chart-server:8000');

    let lastError: any = null;
    for (const t of candidateTargets) {
      try {
        // If the candidate already appears to include the desired path, use it as-is.
        let trial: string;
        const normalizedT = t.replace(/\/$/, '');
        if (path && (normalizedT.endsWith(`/${path}`) || normalizedT === `${targetBase}` || normalizedT.endsWith(`/api/${path}`) || normalizedT.includes(`/${path}`))) {
          trial = normalizedT;
        } else {
          trial = path ? (normalizedT + '/' + path) : normalizedT;
        }
        console.log('Proxy trying target', trial);
        upstream = await fetch(trial, fetchOptions);
        if (upstream) {
          console.log('Proxy succeeded to', trial, 'status=', upstream.status);
          break;
        }
      } catch (e) {
        lastError = e;
        console.warn('Proxy fetch to', t, 'failed:', String(e));
      }
    }

    if (!upstream) {
      console.error('Proxy failed to reach any upstream for', target, 'lastError=', String(lastError));
      return res.status(502).json({ error: 'Proxy failed', detail: String(lastError || 'Upstream unreachable') });
    }

    res.status(upstream.status);
    const setCookieValues: string[] = [];
    upstream.headers.forEach((value, key) => {
      const lk = key.toLowerCase();
      if (lk === 'transfer-encoding' || lk === 'connection') return;
      if (lk === 'set-cookie') {
        // Sanitize Set-Cookie headers so cookies are applicable to the frontend host.
        // Remove Domain attribute (upstream may set Domain=auth-service) so browser will accept cookie for same-origin.
        const raw = Array.isArray(value) ? value : [value as string];
        for (const v of raw) {
          const parts = (v as string).split(';').map((p: string) => p.trim()).filter(Boolean);
          const filtered = parts.filter((p: string) => !/^domain=/i.test(p));
          const rebuilt = filtered.join('; ');
          setCookieValues.push(rebuilt);
        }
        return;
      }
      if (lk === 'content-encoding') return;
      res.setHeader(key, value as string);
    });
    if (setCookieValues.length) {
      // Forward sanitized Set-Cookie values to the browser
      res.setHeader('set-cookie', setCookieValues);
      console.log('Proxy: forwarded sanitized set-cookie headers:', setCookieValues);
    }

    const buf = await upstream.arrayBuffer();
    if (buf && buf.byteLength > 0) res.send(Buffer.from(buf)); else res.end();
  } catch (err: any) {
    console.error('Proxy error', err?.stack || err);
    res.status(502).json({ error: 'Proxy failed', detail: String(err) });
  }
}


