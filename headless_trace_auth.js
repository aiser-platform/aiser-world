const { chromium, request: playwrightRequest } = require('playwright');
(async () => {
  const base = process.argv[2] || 'http://localhost:3001';
  const signinUrl = `${base}/api/auth/users/signin`;
  const targetPage = `${base}/chat`;
  const req = await playwrightRequest.newContext();
  try {
    console.log('POST signin ->', signinUrl);
    const r = await req.post(signinUrl, { data: { identifier: 'admin@aiser.app', password: 'Admin123' } });
    console.log('signin status', r.status());
    const headers = r.headers();
    const setCookieRaw = headers['set-cookie'];
    console.log('set-cookie:', setCookieRaw);
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
      console.log('Adding cookies to context', cookies);
      await context.addCookies(cookies.map(c=>({name:c.name, value:c.value, domain:c.domain, path:c.path, expires:c.expires||-1, httpOnly:!!c.httpOnly, secure:!!c.secure, sameSite: c.sameSite||'Lax'})));
    }

    const page = await context.newPage();
    const consoleMsgs = [];
    page.on('console', msg => consoleMsgs.push({type: msg.type(), text: msg.text()}));
    page.on('pageerror', e => consoleMsgs.push({type:'pageerror', text: String(e)}));

    page.on('requestfinished', async (req) => {
      try {
        const url = req.url();
        if (url.includes('/api/auth/users/me')) {
          const resp = await req.response();
          const status = resp.status();
          let body = '<no-body>';
          try { body = await resp.text(); } catch (e) {}
          console.log('REQUESTFINISHED /users/me ->', status, body.substring(0,800));
        }
      } catch (e) { console.log('reqfinished err', e); }
    });

    page.on('requestfailed', r => console.log('REQUESTFAILED', r.url(), r.failure() && r.failure().errorText));

    const res = await page.goto(targetPage, { waitUntil: 'networkidle', timeout: 20000 }).catch(e=>{console.log('goto err',e);return null});
    console.log('page goto status', res && res.status());
    await page.waitForTimeout(1500);
    console.log('--- console messages ---'); consoleMsgs.forEach(c => console.log(c.type + ': ' + c.text));
    await page.screenshot({ path: 'trace_chat.png', fullPage: true });
    console.log('Wrote trace_chat.png');
    await browser.close();
  } finally {
    await req.dispose();
  }
})();
