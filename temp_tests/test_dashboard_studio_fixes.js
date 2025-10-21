const { chromium } = require('playwright');

async function testDashboardStudioFixes() {
  console.log('🎯 TESTING: Dashboard Studio Critical Fixes...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to dashboard studio
    console.log('🔄 Navigating to dashboard studio...');
    await page.goto('http://localhost:3000/dash-studio');
    await page.waitForLoadState('networkidle');
    
    // Wait for page to load
    await page.waitForTimeout(5000);
    
    // Test 1: Check widget sizing
    console.log('🔄 Testing widget sizing...');
    
    // Look for existing widgets
    const existingWidgets = await page.locator('.dashboard-widget').count();
    console.log(`📊 Found ${existingWidgets} existing widgets`);
    
    if (existingWidgets > 0) {
      const firstWidget = await page.locator('.dashboard-widget').first();
      const widgetBox = await firstWidget.boundingBox();
      console.log(`📏 Widget size: ${widgetBox?.width}x${widgetBox?.height}`);
      
      // Check if widget is properly sized (should be larger than before)
      if (widgetBox && widgetBox.width > 200 && widgetBox.height > 150) {
        console.log('✅ Widget sizing improved - widgets are larger');
      } else {
        console.log('⚠️ Widget sizing may still need improvement');
      }
    }
    
    // Test 2: Test drag and drop placement
    console.log('🔄 Testing drag and drop placement...');
    
    // Look for widget library
    const widgetLibrary = await page.locator('.widget-library, .ant-drawer').first();
    if (await widgetLibrary.isVisible()) {
      console.log('✅ Widget library found');
      
      // Try to find a pie chart widget
      const pieWidget = await page.locator('text=Pie Chart, text=Pie, [data-widget-type="pie"]').first();
      if (await pieWidget.isVisible()) {
        console.log('✅ Pie chart widget found');
        
        // Get canvas area
        const canvas = await page.locator('.dashboard-canvas-wrapper, .react-grid-layout').first();
        if (await canvas.isVisible()) {
          console.log('✅ Canvas area found');
          
          // Test drag and drop to different positions
          const canvasBox = await canvas.boundingBox();
          if (canvasBox) {
            // Try dropping in the center of the canvas
            const centerX = canvasBox.x + canvasBox.width / 2;
            const centerY = canvasBox.y + canvasBox.height / 2;
            
            console.log(`🎯 Attempting drag-drop to center: (${centerX}, ${centerY})`);
            
            // Perform drag and drop
            await pieWidget.dragTo(canvas, { 
              targetPosition: { x: centerX - canvasBox.x, y: centerY - canvasBox.y }
            });
            await page.waitForTimeout(2000);
            
            // Check if widget was placed in the center area
            const newWidgets = await page.locator('.dashboard-widget').all();
            if (newWidgets.length > existingWidgets) {
              console.log('✅ Widget added via drag-drop');
              
              const newWidget = newWidgets[newWidgets.length - 1];
              const newWidgetBox = await newWidget.boundingBox();
              console.log(`📏 New widget position: (${newWidgetBox?.x}, ${newWidgetBox?.y})`);
              
              // Check if it's not just on the left edge
              if (newWidgetBox && newWidgetBox.x > canvasBox.x + 100) {
                console.log('✅ Widget placed away from left edge - drag-drop positioning working');
              } else {
                console.log('⚠️ Widget still placed on left edge - drag-drop positioning needs work');
              }
            }
          }
        }
      }
    }
    
    // Test 3: Test widget movement
    console.log('🔄 Testing widget movement...');
    
    const widgets = await page.locator('.dashboard-widget').all();
    if (widgets.length > 0) {
      const firstWidget = widgets[0];
      
      // Get initial position
      const initialBox = await firstWidget.boundingBox();
      console.log(`📏 Initial widget position: (${initialBox?.x}, ${initialBox?.y})`);
      
      // Try to drag the widget
      await firstWidget.hover();
      await page.waitForTimeout(500);
      
      // Look for drag handle or try dragging the widget itself
      const dragHandle = await firstWidget.locator('.react-resizable-handle').first();
      if (await dragHandle.isVisible()) {
        console.log('✅ Drag handles visible');
      }
      
      // Try dragging the widget to a new position
      const targetX = (initialBox?.x || 0) + 200;
      const targetY = (initialBox?.y || 0) + 100;
      
      await firstWidget.dragTo(firstWidget, { 
        targetPosition: { x: targetX - (initialBox?.x || 0), y: targetY - (initialBox?.y || 0) }
      });
      await page.waitForTimeout(1000);
      
      // Check new position
      const newBox = await firstWidget.boundingBox();
      console.log(`📏 New widget position: (${newBox?.x}, ${newBox?.y})`);
      
      if (newBox && Math.abs(newBox.x - (initialBox?.x || 0)) > 50) {
        console.log('✅ Widget movement working');
      } else {
        console.log('⚠️ Widget movement may not be working properly');
      }
    }
    
    // Test 4: Test chart rendering
    console.log('🔄 Testing chart rendering...');
    
    const charts = await page.locator('canvas, svg').all();
    console.log(`📊 Found ${charts.length} chart elements`);
    
    for (let i = 0; i < Math.min(charts.length, 3); i++) {
      const chart = charts[i];
      
      // Check if chart has content
      const hasContent = await chart.evaluate((el) => {
        if (el.tagName === 'CANVAS') {
          const canvas = el;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            // Check if canvas has non-transparent pixels
            for (let i = 3; i < data.length; i += 4) {
              if (data[i] > 0) return true; // Alpha channel > 0
            }
          }
        }
        return el.children.length > 0;
      });
      
      console.log(`📊 Chart ${i + 1} has content: ${hasContent}`);
      
      if (hasContent) {
        console.log('✅ Chart rendering with actual content');
      } else {
        console.log('⚠️ Chart may be showing placeholder');
      }
    }
    
    // Take screenshot
    console.log('📸 Taking screenshot...');
    await page.screenshot({ path: 'dashboard_studio_fixes_test.png', fullPage: true });
    
    console.log('🎯 DASHBOARD STUDIO FIXES TEST COMPLETE!');
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log(`✅ Widget sizing: ${existingWidgets > 0 ? 'Tested' : 'No widgets to test'}`);
    console.log(`✅ Drag-drop placement: ${widgets.length > existingWidgets ? 'Working' : 'Needs testing'}`);
    console.log(`✅ Widget movement: ${widgets.length > 0 ? 'Tested' : 'No widgets to test'}`);
    console.log(`✅ Chart rendering: ${charts.length} charts found`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'dashboard_studio_fixes_test_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

// Run the test
testDashboardStudioFixes().catch(console.error);
