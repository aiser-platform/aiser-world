const { chromium } = require('playwright');

async function testSyntaxErrorFix() {
  console.log('🎯 TESTING: Syntax Error Fix...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to dashboard studio
    console.log('🔄 Navigating to dashboard studio...');
    await page.goto('http://localhost:3001/dash-studio');
    await page.waitForLoadState('networkidle');
    
    // Wait for page to load
    await page.waitForTimeout(5000);
    
    // Check if page loads without syntax errors
    const pageTitle = await page.title();
    console.log(`📄 Page title: ${pageTitle}`);
    
    // Check for any error messages
    const errorElements = await page.locator('[data-testid="error"], .error, .error-message').count();
    console.log(`❌ Error elements found: ${errorElements}`);
    
    // Check if dashboard studio loads
    const dashboardStudio = await page.locator('.dashboard-studio').count();
    console.log(`📊 Dashboard studio elements: ${dashboardStudio}`);
    
    // Check for widget library
    const widgetLibrary = await page.locator('.widget-library, .ant-drawer').count();
    console.log(`📚 Widget library elements: ${widgetLibrary}`);
    
    // Check for canvas
    const canvas = await page.locator('.dashboard-canvas-wrapper, .react-grid-layout').count();
    console.log(`🎨 Canvas elements: ${canvas}`);
    
    // Take screenshot
    console.log('📸 Taking screenshot...');
    await page.screenshot({ path: 'syntax_error_fix_test.png', fullPage: true });
    
    console.log('🎯 SYNTAX ERROR FIX TEST COMPLETE!');
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log(`✅ Page loads: ${pageTitle ? 'Yes' : 'No'}`);
    console.log(`✅ No errors: ${errorElements === 0 ? 'Yes' : 'No'}`);
    console.log(`✅ Dashboard studio: ${dashboardStudio > 0 ? 'Loaded' : 'Not loaded'}`);
    console.log(`✅ Widget library: ${widgetLibrary > 0 ? 'Available' : 'Not available'}`);
    console.log(`✅ Canvas: ${canvas > 0 ? 'Available' : 'Not available'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'syntax_error_fix_test_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

// Run the test
testSyntaxErrorFix().catch(console.error);
