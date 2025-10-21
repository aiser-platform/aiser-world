const { chromium } = require('playwright');

async function investigateDashboardState() {
  console.log('🔍 INVESTIGATING: Current dashboard state...');
  
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
    } else if (msg.text().includes('dashboard') || msg.text().includes('widget') || msg.text().includes('canvas')) {
      console.log('🔍 Dashboard Log:', msg.text());
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
    
    // Check current state
    console.log('🔍 Checking dashboard state...');
    
    // Check for main components
    const dashboardComponents = await page.locator('[class*="dashboard"], [class*="studio"], [class*="canvas"]').count();
    console.log(`📊 Dashboard components: ${dashboardComponents}`);
    
    // Check for sidebar
    const sidebars = await page.locator('.ant-layout-sider, [class*="sidebar"], [class*="panel"]').count();
    console.log(`📋 Sidebars/panels: ${sidebars}`);
    
    // Check for buttons
    const buttons = await page.locator('button').count();
    console.log(`🔘 Total buttons: ${buttons}`);
    
    // Check for inputs
    const inputs = await page.locator('input, textarea').count();
    console.log(`📝 Total inputs: ${inputs}`);
    
    // Check for draggable elements
    const draggableElements = await page.locator('[draggable="true"]').count();
    console.log(`🖱️ Draggable elements: ${draggableElements}`);
    
    // Check for canvas
    const canvas = await page.locator('.dashboard-canvas-wrapper, .react-grid-layout').count();
    console.log(`🎨 Canvas elements: ${canvas}`);
    
    // Check for widgets
    const widgets = await page.locator('.dashboard-widget').count();
    console.log(`📦 Widgets: ${widgets}`);
    
    // Check for grid items
    const gridItems = await page.locator('.react-grid-item').count();
    console.log(`🔲 Grid items: ${gridItems}`);
    
    // Get button texts
    const buttonTexts = await page.locator('button').allTextContents();
    console.log(`📝 Button texts: ${buttonTexts.join(', ')}`);
    
    // Get input placeholders
    const inputPlaceholders = await page.locator('input, textarea').allTextContents();
    console.log(`📝 Input placeholders: ${inputPlaceholders.join(', ')}`);
    
    // Check for any error states
    const errorElements = await page.locator('[class*="error"], .ant-message-error, .ant-notification-error').count();
    console.log(`❌ Error elements: ${errorElements}`);
    
    // Check for loading states
    const loadingElements = await page.locator('[class*="loading"], .ant-spin, .ant-skeleton').count();
    console.log(`⏳ Loading elements: ${loadingElements}`);
    
    // Check page content
    const bodyText = await page.textContent('body');
    const keywords = ['dashboard', 'studio', 'widget', 'chart', 'canvas', 'loading', 'error', 'empty', 'sidebar'];
    const foundKeywords = keywords.filter(keyword => bodyText.toLowerCase().includes(keyword));
    console.log(`🔍 Found keywords: ${foundKeywords.join(', ')}`);
    
    // Take screenshot
    await page.screenshot({ path: 'investigate_dashboard_state.png' });
    console.log('📸 Screenshot saved');
    
    // Try to interact with elements
    if (buttons > 0) {
      console.log('🔄 Trying to interact with buttons...');
      
      // Try clicking the 🎨 button to open widget panel
      const artButton = await page.locator('button:has-text("🎨")').first();
      if (await artButton.count() > 0) {
        console.log('🔄 Clicking 🎨 button...');
        await artButton.click();
        await page.waitForTimeout(2000);
        
        // Check if anything changed
        const newDraggableElements = await page.locator('[draggable="true"]').count();
        const newInputs = await page.locator('input, textarea').count();
        console.log(`📦 After clicking 🎨: ${newDraggableElements} draggable, ${newInputs} inputs`);
      }
      
      // Try clicking Refresh Widget button
      const refreshButton = await page.locator('button:has-text("Refresh Widget")').first();
      if (await refreshButton.count() > 0) {
        console.log('🔄 Clicking Refresh Widget button...');
        await refreshButton.click();
        await page.waitForTimeout(2000);
        
        // Check if widgets were added
        const newWidgets = await page.locator('.dashboard-widget').count();
        console.log(`📦 Widgets after refresh: ${newWidgets}`);
      }
    }
    
    // Check for any modals or dropdowns that might have opened
    const modals = await page.locator('.ant-modal, .ant-drawer, [role="dialog"]').count();
    console.log(`🪟 Modals/dialogs: ${modals}`);
    
    const dropdowns = await page.locator('.ant-dropdown, .ant-select, [role="combobox"]').count();
    console.log(`📋 Dropdowns: ${dropdowns}`);
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
  } finally {
    await browser.close();
  }
}

investigateDashboardState();

