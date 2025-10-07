const { chromium, request: playwrightRequest } = require('playwright');

(async () => {
  const signinUrl = process.argv[2] || 'http://localhost:3000/api/auth/users/signin';
  const pollUrl = process.argv[3] || 'http://localhost:3000/api/auth/users/me';
  const debugUrl = process.argv[4] || 'http://localhost:3000/api/debug/client-error';
  const iterations = parseInt(process.argv[5] || '12', 10); // default 12 iterations (1 minute @5s)
  const intervalMs = parseInt(process.argv[6] || '5000', 10);

  const req = await playwrightRequest.newContext();
  try {
    console.log('Posting signin to', signinUrl);
    const r = await req.post(signinUrl, { data: { identifier: 'admin@aiser.app', password: 'Admin123' } });
    console.log('Signin status', r.status());
    const headers = r.headers();
    const setCookieRaw = headers['set-cookie'];
    const cookies = [];
    if (setCookieRaw) {
      const arr = Array.isArray(setCookieRaw) ? setCookieRaw : [setCookieRaw];
      for (const sc of arr) {
        const parts = sc.split(';').map(s => s.trim());
        const [nameVal, ...attrs] = parts;
        const [name, ...valParts] = nameVal.split('=');
        const value = valParts.join('=');
        const cookie = { name, value, domain: 'localhost', path: '/', httpOnly: false, secure: false };
        for (const a of attrs) {
          const [ak, av] = a.split('=');
          const key = (ak || '').toLowerCase();
          if (key === 'path') cookie.path = av || '/';
          if (key === 'httponly') cookie.httpOnly = true;
          if (key === 'secure') cookie.secure = true;
          if (key === 'samesite') cookie.sameSite = (av ? (av.charAt(0).toUpperCase() + av.slice(1).toLowerCase()) : 'Lax');
          if (key === 'max-age') {
            const max = parseInt(av||'0',10);
            cookie.expires = Math.floor(Date.now()/1000) + (isNaN(max)?0:max);
          }
        }
        cookies.push(cookie);
      }
    }

    const browser = await chromium.launch();
    const context = await browser.newContext();
    if (cookies.length) {
      await context.addCookies(cookies.map(c=>({name:c.name, value:c.value, domain:c.domain, path:c.path, expires:c.expires||-1, httpOnly:!!c.httpOnly, secure:!!c.secure, sameSite: (c.sameSite||'Lax')})));
    }
    const page = await context.newPage();

    // Navigate to the app origin so fetch calls run from the same origin and cookies apply
    try {
      const origin = new URL(signinUrl).origin;
      console.log('Navigating page to', origin);
      await page.goto(origin, { waitUntil: 'networkidle' });
    } catch (e) {
      console.warn('Failed to navigate page to origin, continuing without navigation', e);
    }

    // Expose a function in the page to poll server and forward any failures to debug endpoint
    await page.exposeFunction('reportDebug', async (payload) => {
      try {
        await fetch(debugUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } catch (e) {
        // ignore
      }
    });

    console.log('Starting poll loop to', pollUrl, `(${iterations} iterations @ ${intervalMs}ms)`);
    for (let i=0;i<iterations;i++) {
      try {
        const resp = await page.evaluate(async (path) => {
          try {
            const r = await fetch(path, { method: 'GET', credentials: 'include' });
            return { status: r.status, ok: r.ok, text: await r.text().catch(()=>null) };
          } catch (e) {
            return { error: String(e) };
          }
        }, new URL(pollUrl).pathname);

        console.log('poll', i+1, resp.status || resp.error);
        if (resp && (resp.error || (resp.status && (resp.status === 401 || resp.status === 403)))) {
          const payload = { event: 'auth_poll_failure', iteration: i+1, resp };
          // call the exposed function directly from the page context
          await page.evaluate((p) => window.reportDebug(p), payload);
          console.log('Reported debug event for poll failure', payload);
        }
      } catch (e) {
        console.warn('Poll loop exception', e);
      }
      await new Promise(r => setTimeout(r, intervalMs));
    }

    await browser.close();
  } finally {
    await req.dispose();
  }
  console.log('Polling complete');
})();


