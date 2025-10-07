const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const signinPath = process.argv[2] || '/api/auth/users/signin';
  const chatPath = process.argv[3] || '/chat';
  const origin = process.argv[4] || 'http://localhost:3000';

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleMsgs = [];
  page.on('console', msg => {
    consoleMsgs.push({ type: msg.type(), text: msg.text() });
  });
  const failedRequests = [];
  page.on('requestfailed', req => {
    failedRequests.push({ url: req.url(), method: req.method(), failure: req.failure() && req.failure().errorText });
  });

  try {
    await page.goto(origin, { waitUntil: 'networkidle' });

    // Perform signin from page context so browser handles Set-Cookie
    const signinResult = await page.evaluate(async (path) => {
      try {
        const r = await fetch(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: 'admin@aiser.app', password: 'Admin123' }),
          credentials: 'include'
        });
        const text = await r.text().catch(() => null);
        return { status: r.status, ok: r.ok, text };
      } catch (e) {
        return { error: String(e) };
      }
    }, signinPath);

    console.log('Signin result:', signinResult);

    // Navigate to chat and wait
    await page.goto(`${origin}${chatPath}`, { waitUntil: 'networkidle' });

    // Save artifacts
    const screenshotPath = 'signin_chat_ui.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    const html = await page.content();
    fs.writeFileSync('page_content_ui.html', html);
    fs.writeFileSync('console_msgs_ui.json', JSON.stringify(consoleMsgs, null, 2));
    fs.writeFileSync('failed_requests_ui.json', JSON.stringify(failedRequests, null, 2));

    console.log('Saved:', screenshotPath, 'page_content_ui.html, console_msgs_ui.json, failed_requests_ui.json');
  } catch (err) {
    console.error('Trace error', err);
  } finally {
    await browser.close();
  }
})();


