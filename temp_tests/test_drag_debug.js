const { chromium } = require('playwright');

async function testDragDebug() {
  console.log('🔍 DEBUGGING: Drag functionality...');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture ALL console logs
  page.on('console', msg => {
    console.log('🔍 Console:', msg.text());
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
          console.log(`📏 Widget initial position: x=${widgetBox.x}, y=${widgetBox.y}`);
          
          // Test drag with more detailed logging
          console.log('🔄 Testing drag with detailed logging...');
          
          // Check if the widget has the correct CSS classes
          const widgetClasses = await widget.evaluate(el => el.className);
          console.log('🎨 Widget classes:', widgetClasses);
          
          // Check if the parent grid item has the correct classes
          const gridItem = await page.locator('.react-grid-item').first();
          const gridItemClasses = await gridItem.evaluate(el => el.className);
          console.log('🎨 Grid item classes:', gridItemClasses);
          
          // Check if the grid item is draggable
          const isDraggable = await gridItem.evaluate(el => el.getAttribute('data-grid'));
          console.log('🎨 Grid item data-grid:', isDraggable);
          
          // Try dragging the grid item directly
          console.log('🔄 Trying to drag grid item directly...');
          await gridItem.hover();
          await page.mouse.down();
          await page.mouse.move(widgetBox.x + 100, widgetBox.y + 100);
          await page.mouse.up();
          await page.waitForTimeout(1000);
          
          const newBox = await widget.boundingBox();
          if (newBox) {
            const movement = Math.abs(newBox.x - widgetBox.x) + Math.abs(newBox.y - widgetBox.y);
            console.log(`📏 Movement after direct drag: ${movement}px`);
            console.log(`✅ Direct drag: ${movement > 10 ? 'Working' : 'Not working'}`);
          }
        }
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test_drag_debug.png' });
    console.log('📸 Screenshot saved');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testDragDebug();
