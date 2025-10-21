const { chromium } = require('playwright');

async function testResizeHandles() {
  console.log('🔍 TESTING: Resize handles visibility...');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
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
        
        // Test resize handles visibility
        console.log('🔍 Testing resize handles visibility...');
        
        // Check handles before hover
        const handlesBeforeHover = await page.locator('.react-resizable-handle').count();
        const visibleHandlesBeforeHover = await page.locator('.react-resizable-handle[style*="opacity: 1"]').count();
        
        console.log(`🔧 Resize handles before hover: ${handlesBeforeHover} total, ${visibleHandlesBeforeHover} visible`);
        
        // Hover over widget
        await widget.hover();
        await page.waitForTimeout(500);
        
        // Check handles after hover
        const handlesAfterHover = await page.locator('.react-resizable-handle').count();
        const visibleHandlesAfterHover = await page.locator('.react-resizable-handle[style*="opacity: 1"]').count();
        
        console.log(`🔧 Resize handles after hover: ${handlesAfterHover} total, ${visibleHandlesAfterHover} visible`);
        
        // Test resize functionality
        if (visibleHandlesAfterHover > 0) {
          console.log('🔄 Testing resize functionality...');
          
          const resizeHandle = await page.locator('.react-resizable-handle').first();
          const handleBox = await resizeHandle.boundingBox();
          
          if (handleBox) {
            console.log(`📏 Resize handle position: x=${handleBox.x}, y=${handleBox.y}`);
            
            // Try to resize
            await resizeHandle.hover();
            await page.mouse.down();
            await page.mouse.move(handleBox.x + 50, handleBox.y + 50);
            await page.mouse.up();
            await page.waitForTimeout(1000);
            
            console.log('✅ Resize test completed');
          }
        } else {
          console.log('❌ No visible resize handles found');
        }
        
        // Test CSS computed styles
        const computedStyles = await page.evaluate(() => {
          const handle = document.querySelector('.react-resizable-handle');
          if (handle) {
            const styles = window.getComputedStyle(handle);
            return {
              opacity: styles.opacity,
              visibility: styles.visibility,
              display: styles.display,
              pointerEvents: styles.pointerEvents
            };
          }
          return null;
        });
        
        console.log('🎨 Computed styles for resize handle:', computedStyles);
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test_resize_handles.png' });
    console.log('📸 Screenshot saved');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testResizeHandles();
