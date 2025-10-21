const { chromium } = require('playwright');

async function testWidgetContainerChartRelationship() {
  console.log('🎯 TESTING: Widget Container & Chart Area Relationship...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to dashboard studio
    console.log('🔄 Navigating to dashboard studio...');
    await page.goto('http://localhost:3000/dash-studio');
    await page.waitForLoadState('networkidle');
    
    // Wait for authentication
    console.log('🔄 Waiting for authentication...');
    await page.waitForTimeout(3000);
    
    // Check if we need to sign in
    const signInButton = await page.locator('text=Sign In').first();
    if (await signInButton.isVisible()) {
      console.log('🔄 Signing in...');
      await signInButton.click();
      await page.fill('input[type="email"]', 'admin@aiser.app');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    }
    
    // Wait for dashboard to load
    console.log('🔄 Waiting for dashboard to load...');
    await page.waitForSelector('.dashboard-canvas-wrapper', { timeout: 10000 });
    
    // Check for existing widgets
    const existingWidgets = await page.locator('.dashboard-widget').count();
    console.log(`📊 Found ${existingWidgets} existing widgets`);
    
    if (existingWidgets === 0) {
      console.log('🔄 Adding a pie chart widget to test...');
      
      // Look for widget library or add widget button
      const widgetLibrary = await page.locator('.widget-library, .ant-drawer, [data-testid="widget-library"]').first();
      if (await widgetLibrary.isVisible()) {
        // Try to find pie chart in widget library
        const pieChartWidget = await page.locator('text=Pie Chart, text=Pie, [data-widget-type="pie"]').first();
        if (await pieChartWidget.isVisible()) {
          console.log('✅ Found pie chart widget in library');
          
          // Drag pie chart to canvas
          const canvas = await page.locator('.dashboard-canvas-wrapper, .react-grid-layout').first();
          if (await canvas.isVisible()) {
            console.log('✅ Found canvas area');
            
            // Perform drag and drop
            await pieChartWidget.dragTo(canvas);
            await page.waitForTimeout(2000);
            
            console.log('✅ Pie chart widget added to canvas');
          }
        }
      }
    }
    
    // Test widget container and chart area relationship
    console.log('🔄 Testing widget container and chart area relationship...');
    
    const widgets = await page.locator('.dashboard-widget').all();
    console.log(`📊 Testing ${widgets.length} widgets`);
    
    for (let i = 0; i < widgets.length; i++) {
      const widget = widgets[i];
      
      // Get widget container dimensions
      const containerBox = await widget.boundingBox();
      console.log(`📏 Widget ${i + 1} container: ${containerBox?.width}x${containerBox?.height}`);
      
      // Check for chart area inside widget
      const chartArea = await widget.locator('[ref], .echarts-container, canvas').first();
      if (await chartArea.isVisible()) {
        const chartBox = await chartArea.boundingBox();
        console.log(`📊 Widget ${i + 1} chart area: ${chartBox?.width}x${chartBox?.height}`);
        
        // Calculate relationship
        if (containerBox && chartBox) {
          const widthRatio = chartBox.width / containerBox.width;
          const heightRatio = chartBox.height / containerBox.height;
          console.log(`📐 Widget ${i + 1} chart/container ratio: ${(widthRatio * 100).toFixed(1)}% x ${(heightRatio * 100).toFixed(1)}%`);
          
          // Check if chart is properly sized (should be close to container size)
          if (widthRatio > 0.8 && heightRatio > 0.8) {
            console.log(`✅ Widget ${i + 1} has good chart/container relationship`);
          } else {
            console.log(`⚠️ Widget ${i + 1} chart area is too small relative to container`);
          }
        }
      }
      
      // Check for actual chart content (not just placeholder)
      const chartContent = await widget.locator('canvas, svg').first();
      if (await chartContent.isVisible()) {
        console.log(`✅ Widget ${i + 1} has chart content rendered`);
        
        // Check if it's a pie chart specifically
        const isPieChart = await widget.locator('text=Pie, text=Proportional').isVisible();
        if (isPieChart) {
          console.log(`🥧 Widget ${i + 1} appears to be a pie chart`);
          
          // Check for pie chart segments (not just gray circle)
          const hasSegments = await widget.locator('path[d*="M"], circle[fill]').count() > 1;
          if (hasSegments) {
            console.log(`✅ Widget ${i + 1} pie chart has proper segments`);
          } else {
            console.log(`⚠️ Widget ${i + 1} pie chart may be showing placeholder`);
          }
        }
      } else {
        console.log(`⚠️ Widget ${i + 1} has no visible chart content`);
      }
    }
    
    // Test resize functionality
    console.log('🔄 Testing resize functionality...');
    if (widgets.length > 0) {
      const firstWidget = widgets[0];
      
      // Look for resize handles
      const resizeHandles = await firstWidget.locator('.react-resizable-handle').count();
      console.log(`🔧 Found ${resizeHandles} resize handles`);
      
      if (resizeHandles > 0) {
        // Hover over widget to show resize handles
        await firstWidget.hover();
        await page.waitForTimeout(500);
        
        // Try to resize
        const seHandle = await firstWidget.locator('.react-resizable-handle-se').first();
        if (await seHandle.isVisible()) {
          console.log('✅ Resize handle is visible');
          
          // Get initial size
          const initialBox = await firstWidget.boundingBox();
          console.log(`📏 Initial size: ${initialBox?.width}x${initialBox?.height}`);
          
          // Perform resize
          await seHandle.dragTo(seHandle, { 
            targetPosition: { x: 50, y: 50 },
            sourcePosition: { x: 0, y: 0 }
          });
          await page.waitForTimeout(1000);
          
          // Check new size
          const newBox = await firstWidget.boundingBox();
          console.log(`📏 New size: ${newBox?.width}x${newBox?.height}`);
          
          if (newBox && initialBox && 
              (Math.abs(newBox.width - initialBox.width) > 10 || 
               Math.abs(newBox.height - initialBox.height) > 10)) {
            console.log('✅ Widget resize functionality working');
          } else {
            console.log('⚠️ Widget resize may not be working properly');
          }
        }
      }
    }
    
    // Take screenshot
    console.log('📸 Taking screenshot...');
    await page.screenshot({ path: 'widget_container_chart_relationship_test.png', fullPage: true });
    
    console.log('🎯 WIDGET CONTAINER & CHART AREA RELATIONSHIP TEST COMPLETE!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'widget_container_test_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

// Run the test
testWidgetContainerChartRelationship().catch(console.error);
