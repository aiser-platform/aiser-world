const { chromium } = require('playwright');

async function testDesignPanelVisibility() {
  console.log('🔍 TESTING: Design panel visibility and loading...');
  
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
    } else if (msg.text().includes('Loading design panel') || msg.text().includes('UnifiedDesignPanel') || msg.text().includes('widget')) {
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
    
    // Check for sidebar
    const sidebars = await page.locator('.ant-layout-sider').count();
    console.log(`📋 Sidebars: ${sidebars}`);
    
    if (sidebars > 0) {
      const sidebar = await page.locator('.ant-layout-sider').first();
      const sidebarWidth = await sidebar.evaluate(el => el.offsetWidth);
      console.log(`📏 Sidebar width: ${sidebarWidth}px`);
      
      // Check if sidebar is visible (width > 0)
      if (sidebarWidth > 0) {
        console.log('✅ Sidebar is visible');
        
        // Check for UnifiedDesignPanel content
        const designPanelContent = await sidebar.locator('*').count();
        console.log(`🎨 Design panel content elements: ${designPanelContent}`);
        
        // Check for tabs
        const tabs = await sidebar.locator('.ant-tabs').count();
        console.log(`📋 Tabs in sidebar: ${tabs}`);
        
        if (tabs > 0) {
          const tabTexts = await sidebar.locator('.ant-tabs .ant-tabs-tab').allTextContents();
          console.log(`📝 Tab texts: ${tabTexts.join(', ')}`);
          
          // Try clicking on Library tab
          const libraryTab = await sidebar.locator('.ant-tabs .ant-tabs-tab:has-text("Library")').first();
          if (await libraryTab.count() > 0) {
            console.log('🔄 Clicking Library tab...');
            await libraryTab.click();
            await page.waitForTimeout(2000);
            
            // Check for draggable elements
            const draggableElements = await page.locator('[draggable="true"]').count();
            console.log(`📦 Draggable elements: ${draggableElements}`);
            
            // Check for widget cards
            const widgetCards = await page.locator('.ant-card').count();
            console.log(`🃏 Widget cards: ${widgetCards}`);
            
            if (widgetCards > 0) {
              const cardTexts = await page.locator('.ant-card').allTextContents();
              console.log(`📝 Card texts: ${cardTexts.join(', ')}`);
            }
          }
        } else {
          console.log('❌ No tabs found in sidebar');
          
          // Check for any content in sidebar
          const sidebarText = await sidebar.textContent();
          console.log(`📝 Sidebar text: ${sidebarText?.substring(0, 200)}...`);
        }
      } else {
        console.log('❌ Sidebar is not visible (width = 0)');
      }
    } else {
      console.log('❌ No sidebar found');
    }
    
    // Check for any error states
    const errorElements = await page.locator('[class*="error"], .ant-message-error').count();
    console.log(`❌ Error elements: ${errorElements}`);
    
    // Check for any loading states
    const loadingElements = await page.locator('[class*="loading"], .ant-spin').count();
    console.log(`⏳ Loading elements: ${loadingElements}`);
    
    // Check for any collapsed elements
    const collapsedElements = await page.locator('[class*="collapsed"], [style*="display: none"]').count();
    console.log(`👁️ Collapsed elements: ${collapsedElements}`);
    
    // Take screenshot
    await page.screenshot({ path: 'test_design_panel_visibility.png' });
    console.log('📸 Screenshot saved');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testDesignPanelVisibility();

