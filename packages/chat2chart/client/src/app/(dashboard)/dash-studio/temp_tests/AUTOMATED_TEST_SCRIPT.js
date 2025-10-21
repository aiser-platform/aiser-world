// Automated Testing Script for Dashboard Studio
// Run this in browser console on http://localhost:3000/dash-studio

console.log('🧪 Starting Dashboard Studio Automated Tests...');

// Test 1: Check if dashboard studio loads
function testDashboardLoads() {
  console.log('Test 1: Dashboard Studio Loads');
  
  const canvas = document.querySelector('.dashboard-canvas-wrapper');
  const widgetLibrary = document.querySelector('.widget-library');
  const propertiesPanel = document.querySelector('.properties-panel');
  
  if (canvas && widgetLibrary) {
    console.log('✅ Dashboard studio loaded successfully');
    return true;
  } else {
    console.log('❌ Dashboard studio failed to load');
    return false;
  }
}

// Test 2: Check if Zustand store is available
function testZustandStore() {
  console.log('Test 2: Zustand Store Available');
  
  // Check if window has Zustand store
  if (window.__ZUSTAND_DEVTOOLS__) {
    console.log('✅ Zustand DevTools available');
    return true;
  } else {
    console.log('⚠️ Zustand DevTools not found, checking console logs');
    return false;
  }
}

// Test 3: Check widget library items
function testWidgetLibrary() {
  console.log('Test 3: Widget Library Items');
  
  const chartWidgets = document.querySelectorAll('[data-widget-type="chart"]');
  const barChart = document.querySelector('[data-widget-type="bar"]');
  const lineChart = document.querySelector('[data-widget-type="line"]');
  
  if (chartWidgets.length > 0) {
    console.log(`✅ Found ${chartWidgets.length} chart widgets in library`);
    return true;
  } else {
    console.log('❌ No chart widgets found in library');
    return false;
  }
}

// Test 4: Check properties panel structure
function testPropertiesPanel() {
  console.log('Test 4: Properties Panel Structure');
  
  const propertiesPanel = document.querySelector('.properties-panel');
  if (!propertiesPanel) {
    console.log('❌ Properties panel not found');
    return false;
  }
  
  const collapsePanels = propertiesPanel.querySelectorAll('.ant-collapse-item');
  const expectedPanels = ['Title & Subtitle', 'Visual', 'Data', 'Layout', 'Typography'];
  
  let foundPanels = 0;
  collapsePanels.forEach(panel => {
    const header = panel.querySelector('.ant-collapse-header');
    if (header) {
      const text = header.textContent.trim();
      if (expectedPanels.some(expected => text.includes(expected))) {
        foundPanels++;
        console.log(`✅ Found panel: ${text}`);
      }
    }
  });
  
  if (foundPanels >= 3) {
    console.log(`✅ Properties panel has ${foundPanels} expected sections`);
    return true;
  } else {
    console.log(`❌ Properties panel missing sections (found ${foundPanels})`);
    return false;
  }
}

// Test 5: Check form controls
function testFormControls() {
  console.log('Test 5: Form Controls');
  
  const propertiesPanel = document.querySelector('.properties-panel');
  if (!propertiesPanel) {
    console.log('❌ Properties panel not found');
    return false;
  }
  
  const inputs = propertiesPanel.querySelectorAll('input');
  const selects = propertiesPanel.querySelectorAll('.ant-select');
  const switches = propertiesPanel.querySelectorAll('.ant-switch');
  const colorPickers = propertiesPanel.querySelectorAll('.ant-color-picker');
  
  console.log(`Found: ${inputs.length} inputs, ${selects.length} selects, ${switches.length} switches, ${colorPickers.length} color pickers`);
  
  if (inputs.length > 0 || selects.length > 0) {
    console.log('✅ Form controls found in properties panel');
    return true;
  } else {
    console.log('❌ No form controls found');
    return false;
  }
}

// Test 6: Check for console errors
function testConsoleErrors() {
  console.log('Test 6: Console Errors');
  
  // This would need to be run before the page loads
  // For now, just check if there are any obvious errors
  const errorElements = document.querySelectorAll('[class*="error"]');
  if (errorElements.length === 0) {
    console.log('✅ No obvious error elements found');
    return true;
  } else {
    console.log(`⚠️ Found ${errorElements.length} elements with error classes`);
    return false;
  }
}

// Run all tests
function runAllTests() {
  console.log('🚀 Running all automated tests...');
  
  const results = {
    dashboardLoads: testDashboardLoads(),
    zustandStore: testZustandStore(),
    widgetLibrary: testWidgetLibrary(),
    propertiesPanel: testPropertiesPanel(),
    formControls: testFormControls(),
    consoleErrors: testConsoleErrors()
  };
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  console.log('Results:', results);
  
  if (passed === total) {
    console.log('🎉 All automated tests passed! Ready for manual testing.');
  } else {
    console.log('⚠️ Some tests failed. Check the issues above.');
  }
  
  return results;
}

// Auto-run tests
runAllTests();

// Export for manual testing
window.dashboardTests = {
  runAllTests,
  testDashboardLoads,
  testZustandStore,
  testWidgetLibrary,
  testPropertiesPanel,
  testFormControls,
  testConsoleErrors
};

console.log('💡 Run window.dashboardTests.runAllTests() to re-run tests');


