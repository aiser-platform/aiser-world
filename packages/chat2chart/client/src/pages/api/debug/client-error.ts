import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const target = `${BACKEND.replace(/\/$/, '')}/debug/client-error`;

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


