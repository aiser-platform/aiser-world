const { chromium } = require('playwright');

async function testWidgetLibraryLoading() {
  console.log('🔍 TESTING: Widget library loading...');
  
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
    
    // Check for "Loading design panel..." text
    const loadingText = await page.locator('text=Loading design panel').count();
    console.log(`⏳ Loading design panel text: ${loadingText}`);
    
    // Check for UnifiedDesignPanel component
    const designPanel = await page.locator('[class*="UnifiedDesignPanel"], [class*="design-panel"]').count();
    console.log(`🎨 Design panel elements: ${designPanel}`);
    
    // Check for tabs
    const tabs = await page.locator('.ant-tabs').count();
    console.log(`📋 Tabs: ${tabs}`);
    
    if (tabs > 0) {
      const tabTexts = await page.locator('.ant-tabs .ant-tabs-tab').allTextContents();
      console.log(`📝 Tab texts: ${tabTexts.join(', ')}`);
      
      // Try clicking on Library tab
      const libraryTab = await page.locator('.ant-tabs .ant-tabs-tab:has-text("Library")').first();
      if (await libraryTab.count() > 0) {
        console.log('🔄 Clicking Library tab...');
        await libraryTab.click();
        await page.waitForTimeout(2000);
        
        // Check for draggable elements after clicking Library tab
        const draggableElements = await page.locator('[draggable="true"]').count();
        console.log(`📦 Draggable elements after Library tab click: ${draggableElements}`);
        
        // Check for widget cards
        const widgetCards = await page.locator('.ant-card').count();
        console.log(`🃏 Widget cards: ${widgetCards}`);
        
        // Check for widget library content
        const libraryContent = await page.locator('[class*="library"], [class*="widget"]').count();
        console.log(`📚 Library content elements: ${libraryContent}`);
        
        // Get text content of the library area
        const libraryText = await page.locator('.ant-tabs-content').textContent();
        console.log(`📝 Library content: ${libraryText?.substring(0, 200)}...`);
      }
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
    
    // Try to find any draggable elements anywhere on the page
    const allDraggableElements = await page.locator('[draggable="true"]').count();
    console.log(`🖱️ All draggable elements: ${allDraggableElements}`);
    
    // Check for any cards that might be widgets
    const allCards = await page.locator('.ant-card').count();
    console.log(`🃏 All cards: ${allCards}`);
    
    if (allCards > 0) {
      const cardTexts = await page.locator('.ant-card').allTextContents();
      console.log(`📝 Card texts: ${cardTexts.join(', ')}`);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test_widget_library_loading.png' });
    console.log('📸 Screenshot saved');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testWidgetLibraryLoading();

