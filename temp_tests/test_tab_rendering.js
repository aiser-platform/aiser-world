const { chromium } = require('playwright');

async function testTabRendering() {
  console.log('🔍 TESTING: Tab rendering in UnifiedDesignPanel...');
  
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
    } else if (msg.text().includes('UnifiedDesignPanel')) {
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
    console.log('🔄 Waiting for dashboard to load...');
    await page.waitForTimeout(5000);
    
    // Check sidebar
    const sidebar = await page.locator('.ant-layout-sider').first();
    if (await sidebar.count() > 0) {
      console.log('✅ Sidebar found');
      
      // Check for any div elements that might contain tabs
      const divs = await sidebar.locator('div').count();
      console.log(`📦 Div elements in sidebar: ${divs}`);
      
      // Check for any elements with class names that might indicate tabs
      const tabElements = await sidebar.locator('[class*="tab"], [class*="Tabs"], [class*="ant-tabs"]').count();
      console.log(`📋 Tab-related elements: ${tabElements}`);
      
      // Check for any elements with role="tab"
      const roleTabs = await sidebar.locator('[role="tab"]').count();
      console.log(`🎭 Role tab elements: ${roleTabs}`);
      
      // Check for any elements with data attributes
      const dataElements = await sidebar.locator('[data-*]').count();
      console.log(`📊 Data elements: ${dataElements}`);
      
      // Get all class names in the sidebar
      const classNames = await sidebar.evaluate(el => {
        const elements = el.querySelectorAll('*');
        const classes = new Set();
        elements.forEach(elem => {
          if (elem.className) {
            elem.className.split(' ').forEach(cls => classes.add(cls));
          }
        });
        return Array.from(classes);
      });
      console.log(`🏷️ All class names: ${classNames.join(', ')}`);
      
      // Check for any text content that might indicate tabs
      const textContent = await sidebar.textContent();
      console.log(`📝 Text content: ${textContent?.substring(0, 300)}...`);
      
      // Check for any elements that might be hidden or have display: none
      const hiddenElements = await sidebar.evaluate(el => {
        const elements = el.querySelectorAll('*');
        let hidden = 0;
        elements.forEach(elem => {
          const style = window.getComputedStyle(elem);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            hidden++;
          }
        });
        return hidden;
      });
      console.log(`👁️ Hidden elements: ${hiddenElements}`);
      
      // Try to find any elements that might be the actual tabs
      const possibleTabs = await sidebar.locator('div, span, button').count();
      console.log(`🔍 Possible tab elements: ${possibleTabs}`);
      
      // Check for any elements with specific text that might be tabs
      const libraryText = await sidebar.locator('text=Library').count();
      const propertiesText = await sidebar.locator('text=Properties').count();
      console.log(`📚 Library text elements: ${libraryText}`);
      console.log(`⚙️ Properties text elements: ${propertiesText}`);
      
    } else {
      console.log('❌ Sidebar not found');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test_tab_rendering.png' });
    console.log('📸 Screenshot saved');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testTabRendering();

