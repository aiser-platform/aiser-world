const { chromium, request: playwrightRequest } = require('playwright');
(async () => {
  const signinUrl = process.argv[2] || 'http://localhost:3000/api/auth/users/signin';
  const targetPage = process.argv[3] || 'http://localhost:3000/chat';
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
        // parse name=value and attributes
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
      await context.addCookies(cookies.map(c=>({name:c.name, value:c.value, domain:c.domain, path:c.path, expires:c.expires||-1, httpOnly:!!c.httpOnly, secure:!!c.secure, sameSite: (c.sameSite||'Lax')})));
    }
    const page = await context.newPage();
    const consoleMsgs = [];
    const failed = [];
    page.on('console', msg => consoleMsgs.push({type: msg.type(), text: msg.text()}));
    page.on('requestfailed', req => failed.push({url: req.url(), failure: req.failure() && req.failure().errorText}));
    page.on('pageerror', e => consoleMsgs.push({type:'pageerror', text: String(e)}));

    const resp = await page.goto(targetPage, { waitUntil: 'load', timeout: 20000 }).catch(e=>{console.log('goto error',e);return null});
    console.log('page goto status', resp && resp.status());
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'signin_chat.png', fullPage: true });
    console.log('SCREENSHOT: signin_chat.png');
    console.log('---CONSOLE---'); consoleMsgs.forEach(m=>console.log(m.type + ': ' + m.text));
    console.log('---FAILED REQUESTS---'); failed.forEach(r=>console.log(r.url + ' -> ' + r.failure));
    await browser.close();
  } finally {
    await req.dispose();
  }
})();
