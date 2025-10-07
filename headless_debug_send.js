const { chromium, request: playwrightRequest } = require('playwright');
(async () => {
  const base = process.argv[2] || 'http://localhost:3001';
  const signinUrl = `${base}/api/auth/users/signin`;
  const debugPage = `${base}/auth-debug`;
  const req = await playwrightRequest.newContext();
  try {
    console.log('Posting signin to', signinUrl);
    const r = await req.post(signinUrl, { data: { identifier: 'admin@aiser.app', password: 'Admin123' } });
    console.log('Signin status', r.status());
    const headers = r.headers();
    const setCookieRaw = headers['set-cookie'];
    console.log('set-cookie header:', setCookieRaw);
    const cookies = [];
    if (setCookieRaw) {
      const arr = Array.isArray(setCookieRaw) ? setCookieRaw : [setCookieRaw];
      for (const sc of arr) {
        const parts = sc.split(';').map(s => s.trim());
        const [nameVal, ...attrs] = parts;
        const [name, value] = nameVal.split('=');
        const cookie = { name, value, domain: 'localhost', path: '/', httpOnly: false, secure: false };
        for (const a of attrs) {
          const [ak, av] = a.split('=');
          const key = ak.toLowerCase();
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
      console.log('Adding cookies to context:', cookies);
      await context.addCookies(cookies.map(c=>({name:c.name, value:c.value, domain:'localhost', path:c.path, expires:c.expires||-1, httpOnly:!!c.httpOnly, secure:!!c.secure, sameSite: (c.sameSite||'Lax')})));
    }

    const page = await context.newPage();
    const consoleMsgs = [];
    const failed = [];
    page.on('console', msg => consoleMsgs.push({type: msg.type(), text: msg.text()}));
    page.on('requestfailed', req => failed.push({url: req.url(), failure: req.failure() && req.failure().errorText}));
    page.on('pageerror', e => consoleMsgs.push({type:'pageerror', text: String(e)}));

    console.log('Opening debug page', debugPage);
    const resp = await page.goto(debugPage, { waitUntil: 'load', timeout: 20000 }).catch(e=>{console.log('goto error',e);return null});
    console.log('debug page status', resp && resp.status());
    await page.waitForTimeout(800);

    // Directly probe the client-side /api/auth/users/me from the page context to capture
    // cookie-forwarding / session visibility as seen by the app.
    try {
      const meResult = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/auth/users/me', { method: 'GET', credentials: 'include' });
          const contentType = res.headers.get('content-type') || '';
          const body = contentType.includes('application/json') ? await res.json() : await res.text();
          return { status: res.status, ok: res.ok, body };
        } catch (e) {
          return { error: String(e) };
        }
      });
      console.log('PAGE /api/auth/users/me result:', JSON.stringify(meResult));
    } catch (e) {
      console.log('PAGE evaluate /users/me failed', e);
    }

    // Try to trigger the debug actions via DOM evaluation (more robust than click selectors)
    try {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btnCheck = btns.find(b => (b.innerText || '').toLowerCase().includes('check /users/me'));
        if (btnCheck) (btnCheck).click();
      });
      console.log('Triggered Check /users/me via evaluate');
      await page.waitForTimeout(800);
    } catch (e) { console.log('Check /users/me evaluate failed', e); }

    try {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btnSend = btns.find(b => (b.innerText || '').toLowerCase().includes('send client logs'));
        if (btnSend) (btnSend).click();
      });
      console.log('Triggered Send client logs via evaluate');
      await page.waitForTimeout(1000);
    } catch (e) { console.log('Send logs evaluate failed', e); }

    await page.screenshot({ path: 'auth_debug_after.png', fullPage: true });
    console.log('SCREENSHOT: auth_debug_after.png');
    console.log('---CONSOLE---'); consoleMsgs.forEach(m=>console.log(m.type + ': ' + m.text));
    console.log('---FAILED REQUESTS---'); failed.forEach(r=>console.log(r.url + ' -> ' + r.failure));

    await browser.close();
  } finally {
    await req.dispose();
  }
})();
