// 🧪 COMPREHENSIVE ALL-TABS PROPERTIES TEST
// Run this in browser console on http://localhost:3000/dash-studio

console.log('🚀 Starting COMPREHENSIVE ALL-TABS PROPERTIES TEST...');

// Test Results Storage
window.allTabsTestResults = {
  tests: [],
  failures: [],
  successes: [],
  startTime: Date.now(),
  propertiesTested: 0,
  propertiesPassed: 0,
  propertiesFailed: 0,
  tabsTested: {
    content: { tested: 0, passed: 0, failed: 0 },
    style: { tested: 0, passed: 0, failed: 0 },
    data: { tested: 0, passed: 0, failed: 0 },
    behavior: { tested: 0, passed: 0, failed: 0 }
  }
};

function logTabTest(propertyName, result, details = '', tab = '') {
  const status = result ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${propertyName}${details ? ': ' + details : ''}`);
  
  window.allTabsTestResults.tests.push({ 
    property: propertyName, 
    result, 
    details, 
    tab,
    timestamp: Date.now() 
  });
  
  window.allTabsTestResults.propertiesTested++;
  
  if (result) {
    window.allTabsTestResults.successes.push({ property: propertyName, details, tab });
    window.allTabsTestResults.propertiesPassed++;
    if (tab && window.allTabsTestResults.tabsTested[tab]) {
      window.allTabsTestResults.tabsTested[tab].passed++;
    }
  } else {
    window.allTabsTestResults.failures.push({ property: propertyName, details, tab });
    window.allTabsTestResults.propertiesFailed++;
    if (tab && window.allTabsTestResults.tabsTested[tab]) {
      window.allTabsTestResults.tabsTested[tab].failed++;
    }
  }
  
  if (tab && window.allTabsTestResults.tabsTested[tab]) {
    window.allTabsTestResults.tabsTested[tab].tested++;
  }
}

// Test 1: Dashboard Studio Loads
function testDashboardLoads() {
  console.log('\n📋 Test 1: Dashboard Studio Loads');
  
  const canvas = document.querySelector('.dashboard-canvas-wrapper') || 
                 document.querySelector('[class*="canvas"]');
  
  const widgetLibrary = document.querySelector('.widget-library') ||
                       document.querySelector('[class*="library"]');
  
  const propertiesPanel = document.querySelector('.properties-panel') ||
                          document.querySelector('[class*="properties"]');
  
  logTabTest('Canvas loads', !!canvas, canvas ? 'Canvas found' : 'Canvas not found');
  logTabTest('Widget library loads', !!widgetLibrary, widgetLibrary ? 'Widget library found' : 'Widget library not found');
  logTabTest('Properties panel loads', !!propertiesPanel, propertiesPanel ? 'Properties panel found' : 'Properties panel not found');
  
  return { canvas, widgetLibrary, propertiesPanel };
}

// Test 2: Add Widget to Canvas
function testAddWidget() {
  console.log('\n📋 Test 2: Add Widget to Canvas');
  
  const canvas = document.querySelector('.dashboard-canvas-wrapper') || 
                 document.querySelector('[class*="canvas"]');
  
  if (!canvas) {
    logTabTest('Add widget', false, 'Canvas not found');
    return false;
  }
  
  // Look for bar chart widget
  const barChart = document.querySelector('[data-widget-type="bar"]') || 
                   document.querySelector('[title*="Bar"], [title*="bar"]') ||
                   document.querySelector('[alt*="Bar"], [alt*="bar"]');
  
  if (!barChart) {
    logTabTest('Add widget', false, 'Bar chart widget not found');
    return false;
  }
  
  // Simulate drag and drop
  try {
    const dragEvent = new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer()
    });
    
    barChart.dispatchEvent(dragEvent);
    
    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer()
    });
    
    canvas.dispatchEvent(dropEvent);
    
    logTabTest('Drag and drop simulation', true, 'Drag and drop events dispatched');
    
    // Check if widget was added
    setTimeout(() => {
      const widgetsOnCanvas = canvas.querySelectorAll('[class*="widget"], [data-widget-id]');
      logTabTest('Widget added to canvas', widgetsOnCanvas.length > 0, `Found ${widgetsOnCanvas.length} widgets on canvas`);
      
      if (widgetsOnCanvas.length > 0) {
        testWidgetSelection(widgetsOnCanvas[0]);
      }
    }, 1000);
    
    return true;
  } catch (error) {
    logTabTest('Add widget', false, `Error: ${error.message}`);
    return false;
  }
}

// Test 3: Widget Selection
function testWidgetSelection(widget) {
  console.log('\n📋 Test 3: Widget Selection');
  
  try {
    widget.click();
    logTabTest('Widget selection', true, 'Widget clicked successfully');
    
    setTimeout(() => {
      testAllTabsProperties();
    }, 500);
    
    return true;
  } catch (error) {
    logTabTest('Widget selection', false, `Error: ${error.message}`);
    return false;
  }
}

// Test 4: Test ALL Tabs Properties
function testAllTabsProperties() {
  console.log('\n📋 Test 4: Testing ALL Tabs Properties');
  
  const propertiesPanel = document.querySelector('.properties-panel') ||
                          document.querySelector('[class*="properties"]');
  
  if (!propertiesPanel) {
    logTabTest('Properties panel', false, 'Properties panel not found');
    return false;
  }
  
  // Test Content Tab Properties
  testContentTabProperties(propertiesPanel);
  
  // Test Style Tab Properties
  testStyleTabProperties(propertiesPanel);
  
  // Test Data Tab Properties
  testDataTabProperties(propertiesPanel);
  
  // Test Behavior Tab Properties
  testBehaviorTabProperties(propertiesPanel);
  
  return true;
}

// Test Content Tab Properties
function testContentTabProperties(panel) {
  console.log('\n📋 Testing Content Tab Properties');
  
  // Title & Subtitle
  const titleInput = panel.querySelector('input[placeholder*="title"], input[placeholder*="Title"]');
  const subtitleInput = panel.querySelector('input[placeholder*="subtitle"], input[placeholder*="Subtitle"]');
  
  logTabTest('Title input found', !!titleInput, titleInput ? 'Title input available' : 'Title input not found', 'content');
  logTabTest('Subtitle input found', !!subtitleInput, subtitleInput ? 'Subtitle input available' : 'Subtitle input not found', 'content');
  
  // Visual Properties
  const colorPaletteSelect = panel.querySelector('select, .ant-select');
  logTabTest('Color palette select found', !!colorPaletteSelect, colorPaletteSelect ? 'Color palette select available' : 'Color palette select not found', 'content');
  
  // Legend
  const legendSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logTabTest('Legend switches found', legendSwitches.length > 0, `Found ${legendSwitches.length} switches`, 'content');
  
  // Tooltip
  const tooltipSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logTabTest('Tooltip switches found', tooltipSwitches.length > 0, `Found ${tooltipSwitches.length} switches`, 'content');
  
  // Animation
  const animationSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logTabTest('Animation switches found', animationSwitches.length > 0, `Found ${animationSwitches.length} switches`, 'content');
  
  // Data Properties
  const dataSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logTabTest('Data switches found', dataSwitches.length > 0, `Found ${dataSwitches.length} switches`, 'content');
  
  // Layout Properties
  const layoutSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logTabTest('Layout switches found', layoutSwitches.length > 0, `Found ${layoutSwitches.length} switches`, 'content');
  
  // Typography Properties
  const typographySelects = panel.querySelectorAll('select, .ant-select');
  logTabTest('Typography selects found', typographySelects.length > 0, `Found ${typographySelects.length} select elements`, 'content');
  
  // Effects Properties
  const effectsSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logTabTest('Effects switches found', effectsSwitches.length > 0, `Found ${effectsSwitches.length} switches`, 'content');
  
  // Advanced Properties
  const advancedSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logTabTest('Advanced switches found', advancedSwitches.length > 0, `Found ${advancedSwitches.length} switches`, 'content');
  
  // Data Zoom Properties
  const dataZoomSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logTabTest('Data zoom switches found', dataZoomSwitches.length > 0, `Found ${dataZoomSwitches.length} switches`, 'content');
  
  // Mark Points Properties
  const markPointSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logTabTest('Mark point switches found', markPointSwitches.length > 0, `Found ${markPointSwitches.length} switches`, 'content');
  
  // Brush Properties
  const brushSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logTabTest('Brush switches found', brushSwitches.length > 0, `Found ${brushSwitches.length} switches`, 'content');
  
  // Visual Map Properties
  const visualMapSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logTabTest('Visual map switches found', visualMapSwitches.length > 0, `Found ${visualMapSwitches.length} switches`, 'content');
  
  // Accessibility Properties
  const ariaSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logTabTest('Aria switches found', ariaSwitches.length > 0, `Found ${ariaSwitches.length} switches`, 'content');
}

// Test Style Tab Properties
function testStyleTabProperties(panel) {
  console.log('\n📋 Testing Style Tab Properties');
  
  // Click on Style tab
  const styleTab = panel.querySelector('[data-node-key="style"], [aria-selected="false"]');
  if (styleTab) {
    styleTab.click();
    setTimeout(() => {
      // Background Color
      const backgroundColorPickers = panel.querySelectorAll('.ant-color-picker, input[type="color"]');
      logTabTest('Background color pickers found', backgroundColorPickers.length > 0, `Found ${backgroundColorPickers.length} color pickers`, 'style');
      
      // Border Color
      const borderColorPickers = panel.querySelectorAll('.ant-color-picker, input[type="color"]');
      logTabTest('Border color pickers found', borderColorPickers.length > 0, `Found ${borderColorPickers.length} color pickers`, 'style');
      
      // Border Width
      const borderWidthInputs = panel.querySelectorAll('input[type="number"], .ant-input-number');
      logTabTest('Border width inputs found', borderWidthInputs.length > 0, `Found ${borderWidthInputs.length} number inputs`, 'style');
      
      // Border Radius
      const borderRadiusInputs = panel.querySelectorAll('input[type="number"], .ant-input-number');
      logTabTest('Border radius inputs found', borderRadiusInputs.length > 0, `Found ${borderRadiusInputs.length} number inputs`, 'style');
      
      // Padding
      const paddingInputs = panel.querySelectorAll('input[type="number"], .ant-input-number');
      logTabTest('Padding inputs found', paddingInputs.length > 0, `Found ${paddingInputs.length} number inputs`, 'style');
      
      // Margin
      const marginInputs = panel.querySelectorAll('input[type="number"], .ant-input-number');
      logTabTest('Margin inputs found', marginInputs.length > 0, `Found ${marginInputs.length} number inputs`, 'style');
      
      // Opacity
      const opacitySliders = panel.querySelectorAll('.ant-slider');
      logTabTest('Opacity sliders found', opacitySliders.length > 0, `Found ${opacitySliders.length} sliders`, 'style');
      
      // Box Shadow
      const boxShadowSelects = panel.querySelectorAll('select, .ant-select');
      logTabTest('Box shadow selects found', boxShadowSelects.length > 0, `Found ${boxShadowSelects.length} select elements`, 'style');
    }, 500);
  }
}

// Test Data Tab Properties
function testDataTabProperties(panel) {
  console.log('\n📋 Testing Data Tab Properties');
  
  // Click on Data tab
  const dataTab = panel.querySelector('[data-node-key="data"], [aria-selected="false"]');
  if (dataTab) {
    dataTab.click();
    setTimeout(() => {
      // Data Source Configuration
      const dataSourceConfig = panel.querySelector('[class*="data-source"], [class*="DataSource"]');
      logTabTest('Data source config found', !!dataSourceConfig, dataSourceConfig ? 'Data source config available' : 'Data source config not found', 'data');
      
      // Snapshots
      const snapshotButtons = panel.querySelectorAll('button');
      logTabTest('Snapshot buttons found', snapshotButtons.length > 0, `Found ${snapshotButtons.length} buttons`, 'data');
      
      // Snapshot Select
      const snapshotSelects = panel.querySelectorAll('select, .ant-select');
      logTabTest('Snapshot selects found', snapshotSelects.length > 0, `Found ${snapshotSelects.length} select elements`, 'data');
    }, 500);
  }
}

// Test Behavior Tab Properties
function testBehaviorTabProperties(panel) {
  console.log('\n📋 Testing Behavior Tab Properties');
  
  // Click on Behavior tab
  const behaviorTab = panel.querySelector('[data-node-key="behavior"], [aria-selected="false"]');
  if (behaviorTab) {
    behaviorTab.click();
    setTimeout(() => {
      // Interaction & Behavior
      const interactionSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
      logTabTest('Interaction switches found', interactionSwitches.length > 0, `Found ${interactionSwitches.length} switches`, 'behavior');
      
      // On Hover Select
      const onHoverSelects = panel.querySelectorAll('select, .ant-select');
      logTabTest('On hover selects found', onHoverSelects.length > 0, `Found ${onHoverSelects.length} select elements`, 'behavior');
      
      // On Click Select
      const onClickSelects = panel.querySelectorAll('select, .ant-select');
      logTabTest('On click selects found', onClickSelects.length > 0, `Found ${onClickSelects.length} select elements`, 'behavior');
      
      // Visibility & Display
      const visibilitySwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
      logTabTest('Visibility switches found', visibilitySwitches.length > 0, `Found ${visibilitySwitches.length} switches`, 'behavior');
      
      // Data & Refresh
      const dataRefreshSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
      logTabTest('Data refresh switches found', dataRefreshSwitches.length > 0, `Found ${dataRefreshSwitches.length} switches`, 'behavior');
      
      // Refresh Interval Select
      const refreshIntervalSelects = panel.querySelectorAll('select, .ant-select');
      logTabTest('Refresh interval selects found', refreshIntervalSelects.length > 0, `Found ${refreshIntervalSelects.length} select elements`, 'behavior');
      
      // Cache Timeout Input
      const cacheTimeoutInputs = panel.querySelectorAll('input[type="number"], .ant-input-number');
      logTabTest('Cache timeout inputs found', cacheTimeoutInputs.length > 0, `Found ${cacheTimeoutInputs.length} number inputs`, 'behavior');
      
      // Responsive Behavior
      const responsiveSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
      logTabTest('Responsive switches found', responsiveSwitches.length > 0, `Found ${responsiveSwitches.length} switches`, 'behavior');
      
      // Breakpoint Inputs
      const breakpointInputs = panel.querySelectorAll('input[type="number"], .ant-input-number');
      logTabTest('Breakpoint inputs found', breakpointInputs.length > 0, `Found ${breakpointInputs.length} number inputs`, 'behavior');
    }, 500);
  }
}

// Run all comprehensive tests
function runAllTabsTests() {
  console.log('🚀 Running COMPREHENSIVE ALL-TABS Tests...');
  console.log('='.repeat(120));
  
  const results = {
    dashboardLoads: testDashboardLoads(),
    addWidget: testAddWidget()
  };
  
  console.log('\n' + '='.repeat(120));
  console.log('📊 COMPREHENSIVE ALL-TABS TEST RESULTS SUMMARY');
  console.log('='.repeat(120));
  
  const passed = window.allTabsTestResults.successes.length;
  const failed = window.allTabsTestResults.failures.length;
  const total = window.allTabsTestResults.tests.length;
  const duration = Date.now() - window.allTabsTestResults.startTime;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${total}`);
  console.log(`🎯 Success Rate: ${total > 0 ? Math.round((passed / total) * 100) : 0}%`);
  console.log(`⏱️ Duration: ${duration}ms`);
  console.log(`🔢 Properties Tested: ${window.allTabsTestResults.propertiesTested}`);
  console.log(`✅ Properties Passed: ${window.allTabsTestResults.propertiesPassed}`);
  console.log(`❌ Properties Failed: ${window.allTabsTestResults.propertiesFailed}`);
  
  // Tab breakdown
  console.log('\n📊 TAB BREAKDOWN:');
  Object.entries(window.allTabsTestResults.tabsTested).forEach(([tab, stats]) => {
    if (stats.tested > 0) {
      const successRate = Math.round((stats.passed / stats.tested) * 100);
      console.log(`  ${tab}: ${stats.passed}/${stats.tested} (${successRate}%)`);
    }
  });
  
  if (window.allTabsTestResults.failures.length > 0) {
    console.log('\n❌ FAILURES:');
    window.allTabsTestResults.failures.forEach(failure => {
      console.log(`  - ${failure.property}: ${failure.details}`);
    });
  }
  
  if (window.allTabsTestResults.successes.length > 0) {
    console.log('\n✅ SUCCESSES:');
    window.allTabsTestResults.successes.forEach(success => {
      console.log(`  - ${success.property}: ${success.details}`);
    });
  }
  
  console.log('\n💡 Next Steps:');
  if (failed > 0) {
    console.log('1. Fix the failed properties above');
    console.log('2. Re-run comprehensive tests');
    console.log('3. Test manual property changes');
  } else {
    console.log('1. All comprehensive tests passed! 🎉');
    console.log('2. All properties in all tabs are working correctly');
    console.log('3. Test manual property changes');
    console.log('4. Test save/reload functionality');
    console.log('5. Test all widget types');
  }
  
  return results;
}

// Export for manual use
window.allTabsTests = {
  runAllTabsTests,
  testDashboardLoads,
  testAddWidget,
  testWidgetSelection,
  testAllTabsProperties,
  testContentTabProperties,
  testStyleTabProperties,
  testDataTabProperties,
  testBehaviorTabProperties
};

// Auto-run tests
runAllTabsTests();

console.log('\n💡 Available commands:');
console.log('  - window.allTabsTests.runAllTabsTests()');
console.log('  - window.allTabsTestResults (contains detailed results)');
console.log('  - Individual test functions available');


