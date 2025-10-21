const { chromium } = require('playwright');
(async () => {
  const base = process.argv[2] || 'http://localhost:3001';
  const pageUrl = `${base}/dash-studio?tab=dashboard`;
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE:', msg.text()));
  try {
    const r = await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 20000 });
    console.log('goto status', r && r.status());
    await page.waitForTimeout(1500);
    const hasAdd = await page.evaluate(() => !!window.addWidget || !!window.__dev_addWidget);
    console.log('hasAddWidget', hasAdd);
    if (hasAdd) {
      await page.evaluate(() => { try { const fn = window.addWidget || window.__dev_addWidget; fn('bar'); } catch (e) { console.error('addWidget failed', e); } });
      await page.waitForTimeout(800);
    }
    const widgetInfo = await page.evaluate(() => {
      const widgets = Array.from(document.querySelectorAll('.dashboard-widget'));
      return widgets.map(w => {
        const rect = (w).getBoundingClientRect();
        const handles = Array.from(w.querySelectorAll('.react-resizable-handle')).map(h => {
          const s = window.getComputedStyle(h);
          const r = h.getBoundingClientRect();
          return { className: h.className, display: s.display, pointerEvents: s.pointerEvents, opacity: s.opacity, width: r.width, height: r.height };
        });
        const dg = w.getAttribute('data-grid');
        return { dataGrid: dg, rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height }, handles };
      });
    });
    console.log('widgetInfo', JSON.stringify(widgetInfo, null, 2));
    await page.screenshot({ path: 'probe_dash.png', fullPage: true });
    console.log('wrote probe_dash.png');
  } catch (e) { console.error('probe error', e); }
  await browser.close();
})();
