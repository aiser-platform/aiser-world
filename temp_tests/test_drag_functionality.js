const { chromium } = require('playwright');

async function testDragFunctionality() {
  console.log('🔍 TESTING: Widget drag functionality...');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    if (msg.text().includes('drag') || msg.text().includes('Drag') || msg.text().includes('handleDrag')) {
      console.log('🔍 Drag Log:', msg.text());
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
          console.log(`📏 Widget initial position: x=${widgetBox.x}, y=${widgetBox.y}`);
          
          // Test drag functionality
          console.log('🔄 Testing widget drag...');
          
          // Click and drag the widget
          await widget.hover();
          await page.mouse.down();
          await page.mouse.move(widgetBox.x + 100, widgetBox.y + 100);
          await page.mouse.up();
          await page.waitForTimeout(1000);
          
          // Check new position
          const newWidgetBox = await widget.boundingBox();
          if (newWidgetBox) {
            const moved = Math.abs(newWidgetBox.x - widgetBox.x) > 10 || Math.abs(newWidgetBox.y - widgetBox.y) > 10;
            console.log(`📏 Widget new position: x=${newWidgetBox.x}, y=${newWidgetBox.y}`);
            console.log(`✅ Widget drag: ${moved ? 'Working' : 'Not working'}`);
            
            if (moved) {
              console.log(`📏 Movement: x=${newWidgetBox.x - widgetBox.x}, y=${newWidgetBox.y - widgetBox.y}`);
            }
          }
          
          // Test drag with different approach
          console.log('🔄 Testing drag with different approach...');
          
          // Try dragging from the center of the widget
          const centerX = widgetBox.x + widgetBox.width / 2;
          const centerY = widgetBox.y + widgetBox.height / 2;
          
          await page.mouse.move(centerX, centerY);
          await page.mouse.down();
          await page.mouse.move(centerX + 50, centerY + 50);
          await page.mouse.up();
          await page.waitForTimeout(1000);
          
          // Check position again
          const finalWidgetBox = await widget.boundingBox();
          if (finalWidgetBox) {
            const moved2 = Math.abs(finalWidgetBox.x - newWidgetBox.x) > 10 || Math.abs(finalWidgetBox.y - newWidgetBox.y) > 10;
            console.log(`📏 Widget final position: x=${finalWidgetBox.x}, y=${finalWidgetBox.y}`);
            console.log(`✅ Widget drag (approach 2): ${moved2 ? 'Working' : 'Not working'}`);
          }
        }
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test_drag_functionality.png' });
    console.log('📸 Screenshot saved');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testDragFunctionality();
