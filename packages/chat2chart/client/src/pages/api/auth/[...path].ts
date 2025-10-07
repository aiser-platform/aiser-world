import type { NextApiRequest, NextApiResponse } from 'next';

const AUTH_TARGET = process.env.AUTH_SERVICE_URL || 'http://auth-service:5000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Determine target path robustly.
    // Prefer Next's parsed param (`req.query.path`), otherwise derive from the original
    // request URL by stripping the '/api/auth' prefix. This handles both /api/auth/users/signin
    // and the query-form `/?path=users&path=signin` that some dev proxies emit.
    let path = '';
    if (req.query && req.query.path) {
      path = Array.isArray(req.query.path) ? req.query.path.join('/') : String(req.query.path);
    }

    if (!path) {
      const rawUrl = String(req.url || '');
      // If rawUrl contains /api/auth, strip that prefix
      const prefix = '/api/auth';
      const idx = rawUrl.indexOf(prefix);
      if (idx !== -1) {
        // get substring after prefix
        path = rawUrl.substring(idx + prefix.length);
      } else {
        // Try to extract `path` query parameters (e.g. ?path=users&path=signin)
        const m = rawUrl.match(/\?(.+)$/);
        if (m) {
          const params = new URLSearchParams(m[1]);
          const parts: string[] = [];
          for (const v of params.getAll('path')) parts.push(v);
          if (parts.length) {
            path = parts.join('/');
          } else {
            path = rawUrl;
          }
        } else {
          path = rawUrl;
        }
      }
      // remove leading slashes and any querystring
      path = path.replace(/^\/+/, '').split('?')[0];
    }

    if (!path) path = '';
    // Normalize and trim whitespace to avoid accidental leading spaces
    path = String(path).trim().replace(/^\/+/, '');
    const target = `${AUTH_TARGET.replace(/\/$/, '')}/${encodeURI(path)}`;
    console.log('Auth proxy forwarding', req.method, req.url, '->', target, 'parsedPath=', JSON.stringify(path));

    console.log('Auth proxy incoming:', {
      method: req.method,
      url: req.url,
      query: req.query,
      headers: Object.keys(req.headers),
    });

    const headers: Record<string, string> = {};
    if (req.headers.cookie) headers.cookie = String(req.headers.cookie);
    if (req.headers.authorization) headers.authorization = String(req.headers.authorization);
    if (req.headers['content-type']) headers['content-type'] = String(req.headers['content-type']);

    const fetchOptions: any = {
      method: req.method,
      headers,
      redirect: 'manual',
    };

    if (req.method && req.method !== 'GET' && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    console.log('Auth proxy fetchOptions:', { target, fetchOptions: { method: fetchOptions.method, headers: Object.keys(fetchOptions.headers) } });
    const upstream = await fetch(target, fetchOptions);

    res.status(upstream.status);

    const setCookieValues: string[] = [];
    upstream.headers.forEach((value, key) => {
      const lk = key.toLowerCase();
      if (lk === 'transfer-encoding' || lk === 'connection') return;
      if (lk === 'set-cookie') {
        setCookieValues.push(value as string);
        return;
      }
      if (lk === 'content-encoding') return;
      res.setHeader(key, value as string);
    });

    if (setCookieValues.length) res.setHeader('set-cookie', setCookieValues);

    const buf = await upstream.arrayBuffer();
    if (buf && buf.byteLength > 0) res.send(Buffer.from(buf));
    else res.end();
  } catch (err: any) {
    console.error('Auth proxy error', err?.stack || err);
    res.status(502).json({ error: 'Auth proxy failed', detail: String(err) });
  }
}


