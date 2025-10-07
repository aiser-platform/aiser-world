import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
// When running inside the frontend container, `localhost:8000` refers to the
// frontend container itself. Prefer the internal service DNS name when the
// configured BACKEND points at localhost so server-side proxying can reach the
// chat2chart backend container on the Docker network.
const INTERNAL_BACKEND = BACKEND.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/) ? 'http://chat2chart-server:8000' : BACKEND;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Basic CORS handling for browser clients using same-origin proxy
    const origin = req.headers.origin || '';
    const allowed = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
    ];
    if (allowed.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    const targetBase = INTERNAL_BACKEND.replace(/\/$/, '');
    const target = `${targetBase}/debug/client-error`;

    const fetchOptions: any = {
      method: req.method,
      headers: {} as Record<string,string>,
      redirect: 'manual',
    };

    if (req.headers['content-type']) fetchOptions.headers['content-type'] = String(req.headers['content-type']);

    if (req.method && req.method !== 'GET') {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const upstream = await fetch(target, fetchOptions);
    const buf = await upstream.arrayBuffer();
    const body = buf && buf.byteLength > 0 ? Buffer.from(buf) : null;
    res.status(upstream.status);
    upstream.headers.forEach((v, k) => {
      if (k.toLowerCase() === 'set-cookie' || k.toLowerCase() === 'transfer-encoding') return;
      res.setHeader(k, v as string);
    });
    if (body) res.send(body);
    else res.end();
  } catch (err: any) {
    console.error('Debug proxy error', err?.stack || err);
    res.status(502).json({ error: 'Debug proxy failed', detail: String(err) });
  }
}




