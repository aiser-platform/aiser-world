const { chromium } = require('playwright');

async function testChartRendering() {
  console.log('🔍 TESTING: Chart rendering with logging...');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    if (msg.text().includes('Chart') || msg.text().includes('ResizeObserver') || msg.text().includes('ECharts')) {
      console.log('🔍 Chart Log:', msg.text());
    }
  });
  
  try {
    // Sign in
    console.log('🔄 Signing in...');
    const signinResponse = await page.request.post('http://localhost:5000/users/signin', {
      data: { email: 'admin@aiser.app', password: 'password123' }
    });
    
    if (!signinResponse.ok()) {
      console.log('❌ Authentication failed');
      return;
    }
    
    const signinData = await signinResponse.json();
    console.log('✅ Authentication successful');
    
    // Navigate to dashboard
    await page.goto('http://localhost:3000/dash-studio', { waitUntil: 'networkidle' });
    
    // Set auth token
    await page.evaluate((token) => {
      localStorage.setItem('aiser_token', token);
      localStorage.setItem('aiser_user', JSON.stringify({
        id: 1, email: 'admin@aiser.app', username: 'admin'
      }));
    }, signinData.access_token);
    
    // Wait for dashboard to load
    console.log('🔄 Waiting for dashboard to load...');
    await page.waitForTimeout(5000);
    
    // Add a widget
    const canvas = await page.locator('.dashboard-canvas-wrapper').first();
    const canvasBox = await canvas.boundingBox();
    
    if (canvasBox) {
      const firstWidget = await page.locator('[draggable="true"]').first();
      const widgetText = await firstWidget.textContent();
      
      console.log(`🔄 Adding ${widgetText} widget...`);
      
      await firstWidget.hover();
      await page.mouse.down();
      await page.mouse.move(canvasBox.x + 200, canvasBox.y + 200);
      await page.mouse.up();
      await page.waitForTimeout(3000);
      
      // Check widget
      const widgets = await page.locator('.dashboard-widget').count();
      console.log(`📦 Widgets after adding: ${widgets}`);
      
      if (widgets > 0) {
        const widget = await page.locator('.dashboard-widget').first();
        const widgetBox = await widget.boundingBox();
        
        if (widgetBox) {
          console.log(`📏 Widget size: ${widgetBox.width}x${widgetBox.height}`);
          
          // Check for chart elements
          const chartElements = await widget.locator('[class*="chart"], canvas, svg').count();
          console.log(`📊 Chart elements: ${chartElements}`);
          
          // Check for ECharts instances
          const echartsInstances = await page.evaluate(() => {
            return window.echarts ? Object.keys(window.echarts.getInstanceByDom).length : 0;
          });
          console.log(`📈 ECharts instances: ${echartsInstances}`);
          
          // Wait a bit more for chart initialization
          await page.waitForTimeout(2000);
          
          // Check again
          const echartsInstances2 = await page.evaluate(() => {
            return window.echarts ? Object.keys(window.echarts.getInstanceByDom).length : 0;
          });
          console.log(`📈 ECharts instances after wait: ${echartsInstances2}`);
        }
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test_chart_rendering.png' });
    console.log('📸 Screenshot saved');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testChartRendering();
