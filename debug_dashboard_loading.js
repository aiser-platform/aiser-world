const { chromium } = require('playwright');

async function debugDashboardLoading() {
  console.log('🔍 DEBUGGING: Dashboard loading issues...');
  
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
    } else if (msg.text().includes('dashboard') || msg.text().includes('widget')) {
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
    
    // Wait and check what's loading
    console.log('🔄 Waiting for dashboard to load...');
    await page.waitForTimeout(5000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Check for loading states
    const loadingElements = await page.locator('[class*="loading"], .ant-spin, .ant-skeleton').count();
    console.log(`⏳ Loading elements: ${loadingElements}`);
    
    // Check for error states
    const errorElements = await page.locator('[class*="error"], .ant-message-error, .ant-notification-error').count();
    console.log(`❌ Error elements: ${errorElements}`);
    
    // Check for main dashboard components
    const dashboardComponents = await page.locator('[class*="dashboard"], [class*="studio"], [class*="canvas"]').count();
    console.log(`📊 Dashboard components: ${dashboardComponents}`);
    
    // Check for sidebar/panel
    const sidebars = await page.locator('.ant-layout-sider, [class*="sidebar"], [class*="panel"]').count();
    console.log(`📋 Sidebars/panels: ${sidebars}`);
    
    // Check for any buttons
    const buttons = await page.locator('button').count();
    console.log(`🔘 Total buttons: ${buttons}`);
    
    // Check for any inputs
    const inputs = await page.locator('input, textarea').count();
    console.log(`📝 Total inputs: ${inputs}`);
    
    // Check for draggable elements
    const draggableElements = await page.locator('[draggable="true"]').count();
    console.log(`🖱️ Draggable elements: ${draggableElements}`);
    
    // Check page content
    const bodyText = await page.textContent('body');
    console.log(`📄 Body text length: ${bodyText?.length || 0}`);
    
    // Look for specific text that might indicate what's happening
    const keywords = ['dashboard', 'studio', 'widget', 'chart', 'canvas', 'loading', 'error', 'empty'];
    const foundKeywords = keywords.filter(keyword => bodyText.toLowerCase().includes(keyword));
    console.log(`🔍 Found keywords: ${foundKeywords.join(', ')}`);
    
    // Check for any React components that might be loading
    const reactElements = await page.locator('[data-reactroot], [data-react-helmet]').count();
    console.log(`⚛️ React elements: ${reactElements}`);
    
    // Check for any iframes or embedded content
    const iframes = await page.locator('iframe').count();
    console.log(`🖼️ Iframes: ${iframes}`);
    
    // Check for any network requests that might be failing
    page.on('response', response => {
      if (!response.ok()) {
        console.log(`🌐 Failed request: ${response.status()} ${response.url()}`);
      }
    });
    
    // Take screenshot
    await page.screenshot({ path: 'debug_dashboard_loading.png' });
    console.log('📸 Debug screenshot saved');
    
    // Try to interact with any elements that are present
    if (buttons > 0) {
      console.log('🔄 Trying to click available buttons...');
      const buttonTexts = await page.locator('button').allTextContents();
      console.log(`📝 Button texts: ${buttonTexts.join(', ')}`);
      
      // Try clicking any button that might help
      for (const text of buttonTexts) {
        if (text && text.trim()) {
          const button = await page.locator(`button:has-text("${text}")`).first();
          if (await button.count() > 0) {
            console.log(`🔄 Clicking button: "${text}"`);
            await button.click();
            await page.waitForTimeout(1000);
            
            // Check if anything changed
            const newDraggableElements = await page.locator('[draggable="true"]').count();
            const newInputs = await page.locator('input, textarea').count();
            console.log(`📦 After clicking "${text}": ${newDraggableElements} draggable, ${newInputs} inputs`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await browser.close();
  }
}

debugDashboardLoading();

