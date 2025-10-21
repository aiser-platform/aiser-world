const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const logs = [];
  page.on('console', m => logs.push({type: m.type(), text: m.text()}));
  const requests = [];
  page.on('requestfailed', r => requests.push({url: r.url(), failure: r.failure() && r.failure().errorText}));
  page.on('response', async res => {
    if (res.url().includes('/api/auth/users/me') || res.url().includes('/dash-studio')) {
      requests.push({url: res.url(), status: res.status(), headers: res.headers()});
    }
  });
  // instrument client errors before any script executes
  await context.addInitScript(() => {
    try {
      window.__testClientErrors = { error: null, rejection: null };
      window.addEventListener('error', function(e) { try { window.__testClientErrors.error = (e && e.message) ? e.message : String(e); } catch (er) {} });
      window.addEventListener('unhandledrejection', function(e) { try { window.__testClientErrors.rejection = (e && e.reason && e.reason.message) ? e.reason.message : String(e.reason || e); } catch (er) {} });
    } catch (e) {}
  });

  // Use localhost for in-container testing and increase timeout to avoid transient waits
  const url = 'http://localhost:3000/dash-studio?tab=dashboard';
  console.log('navigating', url);
  try {
    // Perform login via Node fetch to capture Set-Cookie headers, then inject into the browser context
    try {
      const loginRes = await fetch('http://localhost:3000/api/auth/users/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin@aiser.app', password: 'password123' }),
      });
      const setCookie = loginRes.headers.getAll ? loginRes.headers.getAll('set-cookie') : (loginRes.headers.get('set-cookie') ? [loginRes.headers.get('set-cookie')] : []);
      // parse Set-Cookie strings and add to context
      const cookiesToAdd = [];
      for (const sc of setCookie) {
        if (!sc) continue;
        // basic parse: name=value; attr=...
        const parts = sc.split(';').map(p => p.trim());
        const [nameValue, ...attrs] = parts;
        const eq = nameValue.indexOf('=');
        if (eq === -1) continue;
        const name = nameValue.substring(0, eq);
        const value = nameValue.substring(eq + 1);
        const cookie = { name, value, domain: 'localhost', path: '/', httpOnly: false, secure: false };
        for (const a of attrs) {
          const [k, v] = a.split('=');
          const key = k.toLowerCase();
          if (key === 'httponly') cookie.httpOnly = true;
          if (key === 'secure') cookie.secure = true;
          if (key === 'path' && v) cookie.path = v;
          if (key === 'expires' && v) cookie.expires = Math.floor(new Date(v).getTime() / 1000);
          if (key === 'samesite' && v) cookie.sameSite = v.toLowerCase() === 'none' ? 'None' : (v.toLowerCase() === 'lax' ? 'Lax' : 'Strict');
        }
        cookiesToAdd.push(cookie);
      }
      if (cookiesToAdd.length) {
        try { await context.addCookies(cookiesToAdd); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      console.error('login fetch failed', e);
    }

    await page.goto(url, {waitUntil: 'networkidle', timeout: 60000});
  } catch (e) {
    console.error('goto failed', e.message);
  }
  await page.waitForTimeout(2000);
  const html = await page.content();
  const evalResults = await page.evaluate(() => {
    try {
      return {
        migratedMarker: !!document.getElementById('__migrated_dashboard_client_marker'),
        migratedMounted: !!window.__migrated_dashboard_mounted,
        testClientErrors: window.__testClientErrors || null
      };
    } catch (e) { return { migratedMarker: false, migratedMounted: false, testClientErrors: null } }
  });
  fs.writeFileSync('/tmp/dash_render.html', html);
  await page.screenshot({path:'/tmp/dash_screenshot.png', fullPage:true});
  fs.writeFileSync('/tmp/dash_console.json', JSON.stringify({logs, requests, evalResults}, null, 2));
  console.log('done, files saved to /tmp in container');
  await browser.close();
})();
