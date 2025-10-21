const { chromium } = require('playwright');

async function testComponentStructure() {
  console.log('🎯 TESTING: Component Structure & Relationships...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to dashboard studio
    console.log('🔄 Navigating to dashboard studio...');
    await page.goto('http://localhost:3000/dash-studio');
    await page.waitForLoadState('networkidle');
    
    // Wait for page to load
    await page.waitForTimeout(5000);
    
    // Check component structure
    console.log('🔄 Analyzing component structure...');
    
    // Check for UnifiedDesignPanel
    const unifiedPanel = await page.locator('.unified-design-panel, [data-testid="unified-design-panel"]').count();
    console.log(`📊 UnifiedDesignPanel instances: ${unifiedPanel}`);
    
    // Check for PropertiesPanel (should be 0 after removal)
    const propertiesPanel = await page.locator('.properties-panel, [data-testid="properties-panel"]').count();
    console.log(`📊 PropertiesPanel instances: ${propertiesPanel} (should be 0)`);
    
    // Check for widget containers
    const widgetContainers = await page.locator('.dashboard-widget').count();
    console.log(`📊 Widget containers: ${widgetContainers}`);
    
    // Check for chart areas
    const chartAreas = await page.locator('[ref], .echarts-container, canvas').count();
    console.log(`📊 Chart areas: ${chartAreas}`);
    
    // Check CSS classes and styling
    console.log('🔄 Checking CSS styling...');
    
    const widgetElements = await page.locator('.dashboard-widget').all();
    for (let i = 0; i < Math.min(widgetElements.length, 3); i++) {
      const widget = widgetElements[i];
      
      // Check computed styles
      const styles = await widget.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          display: computed.display,
          flexDirection: computed.flexDirection,
          minHeight: computed.minHeight,
          minWidth: computed.minWidth,
          borderRadius: computed.borderRadius,
          background: computed.backgroundColor,
          boxShadow: computed.boxShadow
        };
      });
      
      console.log(`📏 Widget ${i + 1} styles:`, styles);
      
      // Check if chart area fills container
      const chartArea = await widget.locator('[ref], canvas').first();
      if (await chartArea.isVisible()) {
        const chartStyles = await chartArea.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            width: computed.width,
            height: computed.height,
            flex: computed.flex,
            minHeight: computed.minHeight,
            minWidth: computed.minWidth
          };
        });
        
        console.log(`📊 Widget ${i + 1} chart area styles:`, chartStyles);
      }
    }
    
    // Check for resize handles
    const resizeHandles = await page.locator('.react-resizable-handle').count();
    console.log(`🔧 Resize handles found: ${resizeHandles}`);
    
    // Check resize handle visibility
    if (resizeHandles > 0) {
      const firstWidget = await page.locator('.dashboard-widget').first();
      if (await firstWidget.isVisible()) {
        await firstWidget.hover();
        await page.waitForTimeout(500);
        
        const visibleHandles = await page.locator('.react-resizable-handle[style*="opacity: 1"], .react-resizable-handle[style*="visibility: visible"]').count();
        console.log(`👁️ Visible resize handles on hover: ${visibleHandles}`);
      }
    }
    
    // Check for chart rendering
    console.log('🔄 Checking chart rendering...');
    
    const charts = await page.locator('canvas, svg').all();
    console.log(`📊 Chart elements found: ${charts.length}`);
    
    for (let i = 0; i < Math.min(charts.length, 3); i++) {
      const chart = charts[i];
      
      // Check if chart has content
      const hasContent = await chart.evaluate((el) => {
        if (el.tagName === 'CANVAS') {
          const canvas = el;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            // Check if canvas has non-transparent pixels
            for (let i = 3; i < data.length; i += 4) {
              if (data[i] > 0) return true; // Alpha channel > 0
            }
          }
        }
        return el.children.length > 0;
      });
      
      console.log(`📊 Chart ${i + 1} has content: ${hasContent}`);
    }
    
    // Take screenshot
    console.log('📸 Taking screenshot...');
    await page.screenshot({ path: 'component_structure_test.png', fullPage: true });
    
    console.log('🎯 COMPONENT STRUCTURE TEST COMPLETE!');
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log(`✅ UnifiedDesignPanel: ${unifiedPanel > 0 ? 'Present' : 'Missing'}`);
    console.log(`✅ PropertiesPanel removed: ${propertiesPanel === 0 ? 'Yes' : 'No'}`);
    console.log(`✅ Widget containers: ${widgetContainers}`);
    console.log(`✅ Chart areas: ${chartAreas}`);
    console.log(`✅ Resize handles: ${resizeHandles}`);
    console.log(`✅ Chart elements: ${charts.length}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'component_structure_test_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

// Run the test
testComponentStructure().catch(console.error);
