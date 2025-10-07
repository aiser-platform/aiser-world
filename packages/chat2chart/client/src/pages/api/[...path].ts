import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const INTERNAL_BACKEND = BACKEND.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/) ? 'http://chat2chart-server:8000' : BACKEND;

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
    const target = `${targetBase}/${path}`;

    // Build fetch options
    const headers: Record<string, string> = {};
    // forward selected headers
    if (req.headers.cookie) headers.cookie = String(req.headers.cookie);
    if (req.headers.authorization) headers.authorization = String(req.headers.authorization);
    if (req.headers['content-type']) headers['content-type'] = String(req.headers['content-type']);

    const fetchOptions: any = { method: req.method, headers, redirect: 'manual' };
    if (req.method && req.method !== 'GET') {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    console.log('Proxying /api ->', target, 'method=', req.method);
    const upstream = await fetch(target, fetchOptions);

    res.status(upstream.status);
    const setCookieValues: string[] = [];
    upstream.headers.forEach((value, key) => {
      const lk = key.toLowerCase();
      if (lk === 'transfer-encoding' || lk === 'connection') return;
      if (lk === 'set-cookie') { setCookieValues.push(value as string); return; }
      if (lk === 'content-encoding') return;
      res.setHeader(key, value as string);
    });
    if (setCookieValues.length) res.setHeader('set-cookie', setCookieValues);

    const buf = await upstream.arrayBuffer();
    if (buf && buf.byteLength > 0) res.send(Buffer.from(buf)); else res.end();
  } catch (err: any) {
    console.error('Proxy error', err?.stack || err);
    res.status(502).json({ error: 'Proxy failed', detail: String(err) });
  }
}


