const { chromium } = require('playwright');

async function testSimplePanelCheck() {
  console.log('🔍 SIMPLE TEST: Check UnifiedDesignPanel rendering...');
  
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
    
    // Check if we can find the sidebar
    const sidebar = await page.locator('.ant-layout-sider').first();
    const sidebarExists = await sidebar.count() > 0;
    console.log(`📋 Sidebar exists: ${sidebarExists}`);
    
    if (sidebarExists) {
      // Get sidebar text content
      const sidebarText = await sidebar.textContent();
      console.log(`📝 Sidebar text: ${sidebarText}`);
      
      // Check for any tabs
      const tabs = await page.locator('.ant-tabs').count();
      console.log(`📋 Tabs found: ${tabs}`);
      
      // Check for any draggable elements
      const draggableElements = await page.locator('[draggable="true"]').count();
      console.log(`🖱️ Draggable elements: ${draggableElements}`);
      
      // Check for any cards
      const cards = await page.locator('.ant-card').count();
      console.log(`🃏 Cards: ${cards}`);
      
      // Check for any buttons
      const buttons = await page.locator('button').count();
      console.log(`🔘 Buttons: ${buttons}`);
      
      // Check for any inputs
      const inputs = await page.locator('input').count();
      console.log(`📝 Inputs: ${inputs}`);
      
      // Check for any text that might indicate Library or Properties
      const libraryText = await page.locator('text=Library').count();
      const propertiesText = await page.locator('text=Properties').count();
      console.log(`📚 Library text: ${libraryText}`);
      console.log(`⚙️ Properties text: ${propertiesText}`);
      
      // Check for any elements with specific class names
      const antTabsElements = await page.locator('.ant-tabs').count();
      const antTabsTabElements = await page.locator('.ant-tabs-tab').count();
      const antTabsContentElements = await page.locator('.ant-tabs-content').count();
      console.log(`📋 .ant-tabs elements: ${antTabsElements}`);
      console.log(`📋 .ant-tabs-tab elements: ${antTabsTabElements}`);
      console.log(`📋 .ant-tabs-content elements: ${antTabsContentElements}`);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'simple_panel_check.png' });
    console.log('📸 Screenshot saved');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testSimplePanelCheck();

