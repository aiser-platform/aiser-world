// 🧪 ACTUAL INTERACTIVE TESTING SCRIPT
// Run this in browser console on http://localhost:3000/dash-studio

console.log('🚀 Starting ACTUAL Interactive Testing of Dashboard Studio...');

// Test Results Storage
window.testResults = {
  widgetTests: {},
  propertyTests: {},
  stateTests: {},
  failures: [],
  successes: []
};

// Helper function to log test results
function logTest(testName, result, details = '') {
  const status = result ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${testName}${details ? ': ' + details : ''}`);
  
  if (result) {
    window.testResults.successes.push({ test: testName, details });
  } else {
    window.testResults.failures.push({ test: testName, details });
  }
}

// Test 1: Check if dashboard studio loads correctly
function testDashboardStudioLoads() {
  console.log('\n📋 Test 1: Dashboard Studio Loads');
  
  const canvas = document.querySelector('.dashboard-canvas-wrapper') || 
                 document.querySelector('[class*="canvas"]') ||
                 document.querySelector('.dashboard-canvas');
  
  const widgetLibrary = document.querySelector('.widget-library') ||
                       document.querySelector('[class*="library"]') ||
                       document.querySelector('[class*="widget"]');
  
  const propertiesPanel = document.querySelector('.properties-panel') ||
                          document.querySelector('[class*="properties"]') ||
                          document.querySelector('[class*="panel"]');
  
  const hasCanvas = !!canvas;
  const hasLibrary = !!widgetLibrary;
  const hasProperties = !!propertiesPanel;
  
  logTest('Canvas loads', hasCanvas, hasCanvas ? 'Found canvas element' : 'Canvas not found');
  logTest('Widget library loads', hasLibrary, hasLibrary ? 'Found widget library' : 'Widget library not found');
  logTest('Properties panel loads', hasProperties, hasProperties ? 'Found properties panel' : 'Properties panel not found');
  
  return { canvas, widgetLibrary, propertiesPanel, loaded: hasCanvas && hasLibrary };
}

// Test 2: Check widget library functionality
function testWidgetLibrary() {
  console.log('\n📋 Test 2: Widget Library Functionality');
  
  // Look for chart widgets
  const chartWidgets = document.querySelectorAll('[data-widget-type="chart"], [data-widget-type="bar"], [data-widget-type="line"], [data-widget-type="pie"]');
  const barChart = document.querySelector('[data-widget-type="bar"]') || 
                   document.querySelector('[title*="Bar"], [title*="bar"]') ||
                   document.querySelector('[alt*="Bar"], [alt*="bar"]');
  
  logTest('Chart widgets found', chartWidgets.length > 0, `Found ${chartWidgets.length} chart widgets`);
  logTest('Bar chart widget found', !!barChart, barChart ? 'Bar chart widget available' : 'Bar chart widget not found');
  
  // Check if widgets are draggable
  const draggableWidgets = document.querySelectorAll('[draggable="true"]');
  logTest('Draggable widgets', draggableWidgets.length > 0, `Found ${draggableWidgets.length} draggable widgets`);
  
  return { chartWidgets, barChart, draggableWidgets };
}

// Test 3: Test adding a widget to canvas
function testAddWidgetToCanvas() {
  console.log('\n📋 Test 3: Add Widget to Canvas');
  
  const canvas = document.querySelector('.dashboard-canvas-wrapper') || 
                 document.querySelector('[class*="canvas"]');
  
  if (!canvas) {
    logTest('Add widget to canvas', false, 'Canvas not found');
    return false;
  }
  
  // Look for a widget to drag
  const barChart = document.querySelector('[data-widget-type="bar"]') || 
                   document.querySelector('[title*="Bar"], [title*="bar"]');
  
  if (!barChart) {
    logTest('Add widget to canvas', false, 'No bar chart widget found to drag');
    return false;
  }
  
  // Simulate drag and drop
  try {
    // Create drag event
    const dragEvent = new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer()
    });
    
    barChart.dispatchEvent(dragEvent);
    
    // Create drop event on canvas
    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer()
    });
    
    canvas.dispatchEvent(dropEvent);
    
    logTest('Drag and drop simulation', true, 'Drag and drop events dispatched');
    
    // Check if widget was added (look for widgets on canvas)
    setTimeout(() => {
      const widgetsOnCanvas = canvas.querySelectorAll('[class*="widget"], [data-widget-id]');
      logTest('Widget added to canvas', widgetsOnCanvas.length > 0, `Found ${widgetsOnCanvas.length} widgets on canvas`);
    }, 1000);
    
    return true;
  } catch (error) {
    logTest('Add widget to canvas', false, `Error: ${error.message}`);
    return false;
  }
}

// Test 4: Test properties panel functionality
function testPropertiesPanel() {
  console.log('\n📋 Test 4: Properties Panel Functionality');
  
  const propertiesPanel = document.querySelector('.properties-panel') ||
                          document.querySelector('[class*="properties"]');
  
  if (!propertiesPanel) {
    logTest('Properties panel exists', false, 'Properties panel not found');
    return false;
  }
  
  // Check for form controls
  const inputs = propertiesPanel.querySelectorAll('input');
  const selects = propertiesPanel.querySelectorAll('.ant-select, select');
  const switches = propertiesPanel.querySelectorAll('.ant-switch, input[type="checkbox"]');
  const colorPickers = propertiesPanel.querySelectorAll('.ant-color-picker, input[type="color"]');
  
  logTest('Form inputs found', inputs.length > 0, `Found ${inputs.length} input fields`);
  logTest('Select dropdowns found', selects.length > 0, `Found ${selects.length} select dropdowns`);
  logTest('Switches found', switches.length > 0, `Found ${switches.length} switches`);
  logTest('Color pickers found', colorPickers.length > 0, `Found ${colorPickers.length} color pickers`);
  
  // Check for specific property sections
  const titleInput = propertiesPanel.querySelector('input[placeholder*="title"], input[placeholder*="Title"]');
  const colorSelect = propertiesPanel.querySelector('select, .ant-select');
  
  logTest('Title input found', !!titleInput, titleInput ? 'Title input available' : 'Title input not found');
  logTest('Color selector found', !!colorSelect, colorSelect ? 'Color selector available' : 'Color selector not found');
  
  return { inputs, selects, switches, colorPickers, titleInput, colorSelect };
}

// Test 5: Test property updates
function testPropertyUpdates() {
  console.log('\n📋 Test 5: Property Updates');
  
  const propertiesPanel = document.querySelector('.properties-panel') ||
                          document.querySelector('[class*="properties"]');
  
  if (!propertiesPanel) {
    logTest('Property updates', false, 'Properties panel not found');
    return false;
  }
  
  // Find a widget on canvas to test with
  const canvas = document.querySelector('.dashboard-canvas-wrapper') || 
                 document.querySelector('[class*="canvas"]');
  
  if (!canvas) {
    logTest('Property updates', false, 'Canvas not found');
    return false;
  }
  
  const widgetsOnCanvas = canvas.querySelectorAll('[class*="widget"], [data-widget-id]');
  
  if (widgetsOnCanvas.length === 0) {
    logTest('Property updates', false, 'No widgets on canvas to test');
    return false;
  }
  
  // Try to select the first widget
  const firstWidget = widgetsOnCanvas[0];
  
  try {
    firstWidget.click();
    logTest('Widget selection', true, 'Widget clicked successfully');
    
    // Wait for properties panel to update
    setTimeout(() => {
      const titleInput = propertiesPanel.querySelector('input[placeholder*="title"], input[placeholder*="Title"]');
      
      if (titleInput) {
        // Test changing title
        const originalValue = titleInput.value;
        titleInput.value = 'Test Title';
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        titleInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        logTest('Title property update', true, `Changed title from "${originalValue}" to "Test Title"`);
        
        // Check if widget title updated
        setTimeout(() => {
          const widgetTitle = firstWidget.querySelector('[class*="title"], h1, h2, h3, h4, h5, h6');
          const titleUpdated = widgetTitle && widgetTitle.textContent.includes('Test Title');
          logTest('Widget title visual update', titleUpdated, titleUpdated ? 'Widget title updated visually' : 'Widget title not updated visually');
        }, 500);
      } else {
        logTest('Title property update', false, 'Title input not found');
      }
    }, 500);
    
    return true;
  } catch (error) {
    logTest('Property updates', false, `Error: ${error.message}`);
    return false;
  }
}

// Test 6: Test Zustand store updates
function testZustandStore() {
  console.log('\n📋 Test 6: Zustand Store Updates');
  
  // Check if Zustand DevTools is available
  const hasZustandDevTools = !!window.__ZUSTAND_DEVTOOLS__;
  logTest('Zustand DevTools available', hasZustandDevTools, hasZustandDevTools ? 'DevTools found' : 'DevTools not found');
  
  // Check console for Zustand logs
  const originalLog = console.log;
  let zustandLogs = [];
  
  console.log = function(...args) {
    const message = args.join(' ');
    if (message.includes('Zustand') || message.includes('store') || message.includes('🎯')) {
      zustandLogs.push(message);
    }
    originalLog.apply(console, args);
  };
  
  // Restore console.log after a delay
  setTimeout(() => {
    console.log = originalLog;
    logTest('Zustand logs found', zustandLogs.length > 0, `Found ${zustandLogs.length} Zustand-related logs`);
  }, 2000);
  
  return { hasZustandDevTools, zustandLogs };
}

// Test 7: Test save functionality
function testSaveFunctionality() {
  console.log('\n📋 Test 7: Save Functionality');
  
  // Look for save button
  const saveButton = document.querySelector('button[title*="Save"], button:contains("Save"), [class*="save"]');
  
  if (!saveButton) {
    logTest('Save button found', false, 'Save button not found');
    return false;
  }
  
  logTest('Save button found', true, 'Save button available');
  
  // Test save button click
  try {
    saveButton.click();
    logTest('Save button clickable', true, 'Save button clicked successfully');
    
    // Check for save modal or success message
    setTimeout(() => {
      const saveModal = document.querySelector('[class*="modal"], [class*="dialog"]');
      const successMessage = document.querySelector('[class*="success"], [class*="message"]');
      
      logTest('Save modal appears', !!saveModal, saveModal ? 'Save modal found' : 'Save modal not found');
      logTest('Success message appears', !!successMessage, successMessage ? 'Success message found' : 'Success message not found');
    }, 1000);
    
    return true;
  } catch (error) {
    logTest('Save functionality', false, `Error: ${error.message}`);
    return false;
  }
}

// Test 8: Test page reload persistence
function testPageReloadPersistence() {
  console.log('\n📋 Test 8: Page Reload Persistence');
  
  // This test requires manual intervention
  console.log('⚠️ Manual test required:');
  console.log('1. Add a widget to canvas');
  console.log('2. Change some properties');
  console.log('3. Save the dashboard');
  console.log('4. Reload the page (F5)');
  console.log('5. Check if widget and properties are restored');
  
  logTest('Page reload test', false, 'Manual test required - cannot automate page reload');
  
  return false;
}

// Run all tests
function runAllInteractiveTests() {
  console.log('🚀 Running ALL Interactive Tests...');
  console.log('='.repeat(50));
  
  const results = {
    dashboardLoads: testDashboardStudioLoads(),
    widgetLibrary: testWidgetLibrary(),
    addWidget: testAddWidgetToCanvas(),
    propertiesPanel: testPropertiesPanel(),
    propertyUpdates: testPropertyUpdates(),
    zustandStore: testZustandStore(),
    saveFunctionality: testSaveFunctionality(),
    pageReload: testPageReloadPersistence()
  };
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 INTERACTIVE TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  
  const passed = window.testResults.successes.length;
  const failed = window.testResults.failures.length;
  const total = passed + failed;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${total}`);
  console.log(`🎯 Success Rate: ${total > 0 ? Math.round((passed / total) * 100) : 0}%`);
  
  if (window.testResults.failures.length > 0) {
    console.log('\n❌ FAILURES:');
    window.testResults.failures.forEach(failure => {
      console.log(`  - ${failure.test}: ${failure.details}`);
    });
  }
  
  if (window.testResults.successes.length > 0) {
    console.log('\n✅ SUCCESSES:');
    window.testResults.successes.forEach(success => {
      console.log(`  - ${success.test}: ${success.details}`);
    });
  }
  
  console.log('\n💡 Next Steps:');
  if (failed > 0) {
    console.log('1. Fix the failed tests above');
    console.log('2. Re-run tests to verify fixes');
    console.log('3. Continue with manual testing');
  } else {
    console.log('1. All automated tests passed!');
    console.log('2. Proceed with manual property testing');
    console.log('3. Test save/reload functionality');
  }
  
  return results;
}

// Export for manual use
window.interactiveTests = {
  runAllInteractiveTests,
  testDashboardStudioLoads,
  testWidgetLibrary,
  testAddWidgetToCanvas,
  testPropertiesPanel,
  testPropertyUpdates,
  testZustandStore,
  testSaveFunctionality,
  testPageReloadPersistence
};

// Auto-run tests
runAllInteractiveTests();

console.log('\n💡 Available commands:');
console.log('  - window.interactiveTests.runAllInteractiveTests()');
console.log('  - window.testResults (contains detailed results)');
console.log('  - Individual test functions available');


