const { chromium } = require('playwright');
(async () => {
  const url = process.argv[2] || 'http://127.0.0.1:3000/login';
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleMessages = [];
  const failedRequests = [];
  page.on('console', msg => { try { consoleMessages.push({type: msg.type(), text: msg.text()}); } catch(e){} });
  page.on('requestfailed', req => { try { failedRequests.push({url: req.url(), failure: req.failure() && req.failure().errorText}); } catch(e){} });
  try {
    const resp = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    console.log('STATUS', resp && resp.status());
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'login_screenshot.png', fullPage: true });
    console.log('SCREENSHOT: login_screenshot.png');
    console.log('---CONSOLE---');
    consoleMessages.forEach(m => console.log(m.type + ': ' + m.text));
    console.log('---FAILED REQUESTS---');
    failedRequests.forEach(r => console.log(r.url + ' -> ' + r.failure));
    const title = await page.title();
    console.log('TITLE:', title);
  } catch (e) {
    console.error('ERROR', e && e.message);
    process.exitCode = 2;
  } finally {
    await browser.close();
  }
})();
