const { chromium } = require('playwright');

async function investigateRealIssues() {
  console.log('🔍 INVESTIGATING REAL ISSUES: Widget rendering, sizing, and interactions...');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Console Error:', msg.text());
    } else if (msg.text().includes('ECharts') || msg.text().includes('widget') || msg.text().includes('chart')) {
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
    await page.waitForTimeout(5000);
    
    console.log('🔍 Step 1: Investigating widget panel loading...');
    
    // Check widget panel loading timing
    let draggableElements = null;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      draggableElements = await page.locator('[draggable="true"]');
      const count = await draggableElements.count();
      console.log(`🔍 Attempt ${attempts + 1}: Found ${count} draggable elements`);
      
      if (count > 0) {
        console.log('✅ Widget panel loaded successfully');
        break;
      }
      
      await page.waitForTimeout(1000);
      attempts++;
    }
    
    const draggableCount = await draggableElements.count();
    console.log(`📦 Final draggable elements: ${draggableCount}`);
    
    if (draggableCount === 0) {
      console.log('❌ Widget panel not loading - investigating...');
      
      // Check for any error states
      const errorElements = await page.locator('[class*="error"], .ant-message-error').count();
      console.log(`❌ Error elements: ${errorElements}`);
      
      // Check for loading states
      const loadingElements = await page.locator('[class*="loading"], .ant-spin').count();
      console.log(`⏳ Loading elements: ${loadingElements}`);
      
      // Check sidebar content
      const sidebarText = await page.locator('.ant-layout-sider').textContent();
      console.log(`📋 Sidebar content: ${sidebarText?.substring(0, 200)}...`);
      
      return;
    }
    
    console.log('🔍 Step 2: Testing widget addition and sizing...');
    
    // Get canvas
    const canvas = await page.locator('.dashboard-canvas-wrapper').first();
    const canvasBox = await canvas.boundingBox();
    
    if (!canvasBox) {
      console.log('❌ Canvas not found');
      return;
    }
    
    console.log(`📏 Canvas size: ${canvasBox.width}x${canvasBox.height}`);
    
    // Add a widget via drag-drop
    const firstWidget = await draggableElements.first();
    const widgetText = await firstWidget.textContent();
    
    console.log(`🔄 Dragging ${widgetText} widget...`);
    
    await firstWidget.hover();
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + 200, canvasBox.y + 200);
    await page.mouse.up();
    await page.waitForTimeout(3000);
    
    // Check widget count
    const widgets = await page.locator('.dashboard-widget').count();
    console.log(`📦 Widgets after drag: ${widgets}`);
    
    if (widgets > 0) {
      console.log('🔍 Step 3: Investigating widget rendering and sizing...');
      
      const widget = await page.locator('.dashboard-widget').first();
      const widgetBox = await widget.boundingBox();
      
      if (widgetBox) {
        console.log(`📏 Widget size: ${widgetBox.width}x${widgetBox.height}`);
        console.log(`📍 Widget position: x=${widgetBox.x}, y=${widgetBox.y}`);
        
        // Check if widget is too small
        if (widgetBox.width < 100 || widgetBox.height < 100) {
          console.log('❌ Widget is too small!');
        } else {
          console.log('✅ Widget size is reasonable');
        }
      }
      
      // Check for chart content
      const chartElements = await page.locator('[class*="chart"], canvas, svg').count();
      console.log(`📊 Chart elements: ${chartElements}`);
      
      // Check for ECharts instances
      const echartsInstances = await page.evaluate(() => {
        return window.echarts ? Object.keys(window.echarts.getInstanceByDom).length : 0;
      });
      console.log(`📈 ECharts instances: ${echartsInstances}`);
      
      // Check widget content
      const widgetContent = await widget.textContent();
      console.log(`📝 Widget content: ${widgetContent?.substring(0, 100)}...`);
      
      console.log('🔍 Step 4: Testing widget interactions...');
      
      // Test widget selection
      await widget.click();
      await page.waitForTimeout(1000);
      
      const selectedWidgets = await page.locator('.dashboard-widget--selected').count();
      console.log(`✅ Widget selected: ${selectedWidgets > 0}`);
      
      // Test drag
      if (widgetBox) {
        console.log('🔄 Testing widget drag...');
        await widget.hover();
        await page.mouse.down();
        await page.mouse.move(widgetBox.x + 50, widgetBox.y + 50);
        await page.mouse.up();
        await page.waitForTimeout(1000);
        
        const newWidgetBox = await widget.boundingBox();
        if (newWidgetBox) {
          const moved = Math.abs(newWidgetBox.x - widgetBox.x) > 10 || Math.abs(newWidgetBox.y - widgetBox.y) > 10;
          console.log(`✅ Widget drag: ${moved ? 'Working' : 'Not working'}`);
        }
      }
      
      // Test resize handles
      console.log('🔍 Testing resize handles...');
      await widget.hover();
      await page.waitForTimeout(500);
      
      const resizeHandles = await page.locator('.react-resizable-handle').count();
      console.log(`🔧 Total resize handles: ${resizeHandles}`);
      
      const visibleHandles = await page.locator('.react-resizable-handle[style*="opacity: 1"]').count();
      console.log(`👁️ Visible resize handles: ${visibleHandles}`);
      
      if (visibleHandles > 0) {
        console.log('🔄 Testing resize...');
        const resizeHandle = await page.locator('.react-resizable-handle').first();
        const handleBox = await resizeHandle.boundingBox();
        
        if (handleBox) {
          await resizeHandle.hover();
          await page.mouse.down();
          await page.mouse.move(handleBox.x + 20, handleBox.y + 20);
          await page.mouse.up();
          await page.waitForTimeout(1000);
          
          const resizedWidgetBox = await widget.boundingBox();
          if (resizedWidgetBox) {
            const resized = Math.abs(resizedWidgetBox.width - widgetBox.width) > 10 || Math.abs(resizedWidgetBox.height - widgetBox.height) > 10;
            console.log(`✅ Widget resize: ${resized ? 'Working' : 'Not working'}`);
          }
        }
      }
      
      console.log('🔍 Step 5: Testing properties panel connection...');
      
      // Check for properties panel
      const propertiesPanel = await page.locator('[class*="properties"], [class*="design-panel"], [class*="config"]').count();
      console.log(`🎛️ Properties panels: ${propertiesPanel}`);
      
      // Check for input fields in properties panel
      const propertyInputs = await page.locator('input, textarea, .ant-input, .ant-select').count();
      console.log(`📝 Property inputs: ${propertyInputs}`);
      
      // Try to interact with properties
      if (propertyInputs > 0) {
        const firstInput = await page.locator('input:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled])').first();
        if (await firstInput.count() > 0) {
          await firstInput.click();
          await firstInput.fill('Test Title');
          await page.waitForTimeout(500);
          console.log('✅ Properties panel input working');
        }
      }
      
      // Check for tabs in properties panel
      const tabs = await page.locator('.ant-tabs, [role="tab"]').count();
      console.log(`📋 Property tabs: ${tabs}`);
      
      if (tabs > 0) {
        const tabTexts = await page.locator('.ant-tabs .ant-tabs-tab').allTextContents();
        console.log(`📝 Tab texts: ${tabTexts.join(', ')}`);
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'investigate_real_issues.png' });
    console.log('📸 Screenshot saved');
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
  } finally {
    await browser.close();
  }
}

investigateRealIssues();

