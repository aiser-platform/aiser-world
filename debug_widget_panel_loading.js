const { chromium } = require('playwright');

async function debugWidgetPanelLoading() {
  console.log('🔍 DEBUGGING: Widget panel not loading...');
  
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
    } else if (msg.text().includes('widget') || msg.text().includes('panel') || msg.text().includes('sidebar')) {
      console.log('🔍 Panel Log:', msg.text());
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
    
    console.log('🔍 Investigating sidebar and widget panel...');
    
    // Check sidebar structure
    const sidebars = await page.locator('.ant-layout-sider').count();
    console.log(`📋 Sidebars: ${sidebars}`);
    
    if (sidebars > 0) {
      const sidebar = await page.locator('.ant-layout-sider').first();
      const sidebarText = await sidebar.textContent();
      console.log(`📝 Sidebar text: ${sidebarText}`);
      
      // Check for specific elements in sidebar
      const sidebarElements = await sidebar.locator('*').count();
      console.log(`🔍 Sidebar elements: ${sidebarElements}`);
      
      // Look for widget-related elements
      const widgetElements = await sidebar.locator('[class*="widget"], [class*="chart"], [class*="draggable"]').count();
      console.log(`📦 Widget elements in sidebar: ${widgetElements}`);
      
      // Look for any cards or items
      const cards = await sidebar.locator('.ant-card, .ant-list-item, [class*="item"]').count();
      console.log(`🃏 Cards/items in sidebar: ${cards}`);
      
      // Check for any buttons
      const buttons = await sidebar.locator('button').count();
      console.log(`🔘 Buttons in sidebar: ${buttons}`);
      
      // Get button texts
      const buttonTexts = await sidebar.locator('button').allTextContents();
      console.log(`📝 Button texts: ${buttonTexts.join(', ')}`);
    }
    
    // Check for any collapsed or hidden elements
    const collapsedElements = await page.locator('[class*="collapsed"], [class*="hidden"], [style*="display: none"]').count();
    console.log(`👁️ Collapsed/hidden elements: ${collapsedElements}`);
    
    // Check for any loading states
    const loadingElements = await page.locator('[class*="loading"], .ant-spin, .ant-skeleton').count();
    console.log(`⏳ Loading elements: ${loadingElements}`);
    
    // Check for any error states
    const errorElements = await page.locator('[class*="error"], .ant-message-error').count();
    console.log(`❌ Error elements: ${errorElements}`);
    
    // Check for any modals or overlays
    const modals = await page.locator('.ant-modal, .ant-drawer, [role="dialog"]').count();
    console.log(`🪟 Modals: ${modals}`);
    
    // Check for any tooltips
    const tooltips = await page.locator('.ant-tooltip, [role="tooltip"]').count();
    console.log(`💬 Tooltips: ${tooltips}`);
    
    // Try clicking on sidebar elements
    console.log('🔄 Trying to interact with sidebar...');
    
    const sidebar = await page.locator('.ant-layout-sider').first();
    if (await sidebar.count() > 0) {
      // Try clicking on any clickable elements
      const clickableElements = await sidebar.locator('button, .ant-card, [role="button"]').count();
      console.log(`🖱️ Clickable elements: ${clickableElements}`);
      
      if (clickableElements > 0) {
        const firstClickable = await sidebar.locator('button, .ant-card, [role="button"]').first();
        const elementText = await firstClickable.textContent();
        console.log(`🔄 Clicking element: "${elementText}"`);
        
        await firstClickable.click();
        await page.waitForTimeout(2000);
        
        // Check if anything changed
        const newDraggableElements = await page.locator('[draggable="true"]').count();
        console.log(`📦 Draggable elements after click: ${newDraggableElements}`);
      }
    }
    
    // Check for any specific widget panel components
    const widgetPanelSelectors = [
      '[class*="widget-panel"]',
      '[class*="chart-panel"]',
      '[class*="component-panel"]',
      '[class*="library"]',
      '[class*="palette"]',
      '.widget-library',
      '.chart-library',
      '.component-library'
    ];
    
    for (const selector of widgetPanelSelectors) {
      const elements = await page.locator(selector).count();
      if (elements > 0) {
        console.log(`✅ Found widget panel: ${selector} (${elements} elements)`);
      }
    }
    
    // Check for any data attributes that might indicate widget types
    const dataElements = await page.locator('[data-widget], [data-chart], [data-type]').count();
    console.log(`📊 Data elements: ${dataElements}`);
    
    // Take screenshot
    await page.screenshot({ path: 'debug_widget_panel_loading.png' });
    console.log('📸 Screenshot saved');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await browser.close();
  }
}

debugWidgetPanelLoading();

