const { chromium } = require('playwright');

async function testWidgetMovementAndResize() {
  console.log('🔍 TESTING: Widget movement and resize functionality...');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    if (msg.text().includes('drag') || msg.text().includes('resize') || msg.text().includes('handle')) {
      console.log('🔍 Log:', msg.text());
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
          
          // Test horizontal movement
          console.log('🔄 Testing horizontal movement...');
          await widget.hover();
          await page.mouse.down();
          await page.mouse.move(widgetBox.x + 100, widgetBox.y); // Move horizontally only
          await page.mouse.up();
          await page.waitForTimeout(1000);
          
          const horizontalBox = await widget.boundingBox();
          if (horizontalBox) {
            const horizontalMovement = horizontalBox.x - widgetBox.x;
            console.log(`📏 Widget after horizontal move: x=${horizontalBox.x}, y=${horizontalBox.y}`);
            console.log(`📏 Horizontal movement: ${horizontalMovement}px`);
            console.log(`✅ Horizontal movement: ${Math.abs(horizontalMovement) > 10 ? 'Working' : 'Not working'}`);
            
            // Test vertical movement
            console.log('🔄 Testing vertical movement...');
            await widget.hover();
            await page.mouse.down();
            await page.mouse.move(horizontalBox.x, horizontalBox.y + 100); // Move vertically only
            await page.mouse.up();
            await page.waitForTimeout(1000);
            
            const verticalBox = await widget.boundingBox();
            if (verticalBox) {
              const verticalMovement = verticalBox.y - horizontalBox.y;
              console.log(`📏 Widget after vertical move: x=${verticalBox.x}, y=${verticalBox.y}`);
              console.log(`📏 Vertical movement: ${verticalMovement}px`);
              console.log(`✅ Vertical movement: ${Math.abs(verticalMovement) > 10 ? 'Working' : 'Not working'}`);
              
              // Test diagonal movement
              console.log('🔄 Testing diagonal movement...');
              await widget.hover();
              await page.mouse.down();
              await page.mouse.move(verticalBox.x + 50, verticalBox.y + 50); // Move diagonally
              await page.mouse.up();
              await page.waitForTimeout(1000);
              
              const diagonalBox = await widget.boundingBox();
              if (diagonalBox) {
                const diagonalMovementX = diagonalBox.x - verticalBox.x;
                const diagonalMovementY = diagonalBox.y - verticalBox.y;
                console.log(`📏 Widget after diagonal move: x=${diagonalBox.x}, y=${diagonalBox.y}`);
                console.log(`📏 Diagonal movement: x=${diagonalMovementX}px, y=${diagonalMovementY}px`);
                console.log(`✅ Diagonal movement: ${Math.abs(diagonalMovementX) > 5 && Math.abs(diagonalMovementY) > 5 ? 'Working' : 'Not working'}`);
              }
            }
          }
          
          // Test resize handles
          console.log('🔍 Testing resize handles visibility...');
          
          // Check handles before hover
          const handlesBeforeHover = await page.locator('.react-resizable-handle').count();
          console.log(`🔧 Resize handles before hover: ${handlesBeforeHover} total`);
          
          // Hover over widget
          await widget.hover();
          await page.waitForTimeout(500);
          
          // Check handles after hover
          const handlesAfterHover = await page.locator('.react-resizable-handle').count();
          const visibleHandlesAfterHover = await page.evaluate(() => {
            const handles = document.querySelectorAll('.react-resizable-handle');
            let visible = 0;
            handles.forEach(handle => {
              const styles = window.getComputedStyle(handle);
              if (styles.opacity === '1' && styles.visibility === 'visible') {
                visible++;
              }
            });
            return visible;
          });
          
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
        }
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test_widget_movement_and_resize.png' });
    console.log('📸 Screenshot saved');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testWidgetMovementAndResize();
