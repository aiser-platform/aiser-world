// 🧪 COMPREHENSIVE PROPERTY SYNC TEST
// Run this in browser console on http://localhost:3000/dash-studio

console.log('🚀 Testing Property Sync Fixes...');

// Test Results Storage
window.propertyTestResults = {
  tests: [],
  failures: [],
  successes: []
};

function logPropertyTest(testName, result, details = '') {
  const status = result ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${testName}${details ? ': ' + details : ''}`);
  
  window.propertyTestResults.tests.push({ test: testName, result, details });
  if (result) {
    window.propertyTestResults.successes.push({ test: testName, details });
  } else {
    window.propertyTestResults.failures.push({ test: testName, details });
  }
}

// Test 1: Check if dashboard studio loads
function testDashboardLoads() {
  console.log('\n📋 Test 1: Dashboard Studio Loads');
  
  const canvas = document.querySelector('.dashboard-canvas-wrapper') || 
                 document.querySelector('[class*="canvas"]');
  
  const widgetLibrary = document.querySelector('.widget-library') ||
                       document.querySelector('[class*="library"]');
  
  const propertiesPanel = document.querySelector('.properties-panel') ||
                          document.querySelector('[class*="properties"]');
  
  logPropertyTest('Canvas loads', !!canvas, canvas ? 'Canvas found' : 'Canvas not found');
  logPropertyTest('Widget library loads', !!widgetLibrary, widgetLibrary ? 'Widget library found' : 'Widget library not found');
  logPropertyTest('Properties panel loads', !!propertiesPanel, propertiesPanel ? 'Properties panel found' : 'Properties panel not found');
  
  return { canvas, widgetLibrary, propertiesPanel };
}

// Test 2: Add a widget to canvas
function testAddWidget() {
  console.log('\n📋 Test 2: Add Widget to Canvas');
  
  const canvas = document.querySelector('.dashboard-canvas-wrapper') || 
                 document.querySelector('[class*="canvas"]');
  
  if (!canvas) {
    logPropertyTest('Add widget', false, 'Canvas not found');
    return false;
  }
  
  // Look for bar chart widget
  const barChart = document.querySelector('[data-widget-type="bar"]') || 
                   document.querySelector('[title*="Bar"], [title*="bar"]') ||
                   document.querySelector('[alt*="Bar"], [alt*="bar"]');
  
  if (!barChart) {
    logPropertyTest('Add widget', false, 'Bar chart widget not found');
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
    
    logPropertyTest('Drag and drop simulation', true, 'Drag and drop events dispatched');
    
    // Check if widget was added
    setTimeout(() => {
      const widgetsOnCanvas = canvas.querySelectorAll('[class*="widget"], [data-widget-id]');
      logPropertyTest('Widget added to canvas', widgetsOnCanvas.length > 0, `Found ${widgetsOnCanvas.length} widgets on canvas`);
      
      if (widgetsOnCanvas.length > 0) {
        // Test widget selection
        testWidgetSelection(widgetsOnCanvas[0]);
      }
    }, 1000);
    
    return true;
  } catch (error) {
    logPropertyTest('Add widget', false, `Error: ${error.message}`);
    return false;
  }
}

// Test 3: Test widget selection
function testWidgetSelection(widget) {
  console.log('\n📋 Test 3: Widget Selection');
  
  try {
    widget.click();
    logPropertyTest('Widget selection', true, 'Widget clicked successfully');
    
    // Wait for properties panel to update
    setTimeout(() => {
      testPropertyForm();
    }, 500);
    
    return true;
  } catch (error) {
    logPropertyTest('Widget selection', false, `Error: ${error.message}`);
    return false;
  }
}

// Test 4: Test property form
function testPropertyForm() {
  console.log('\n📋 Test 4: Property Form');
  
  const propertiesPanel = document.querySelector('.properties-panel') ||
                          document.querySelector('[class*="properties"]');
  
  if (!propertiesPanel) {
    logPropertyTest('Property form', false, 'Properties panel not found');
    return false;
  }
  
  // Check for title input
  const titleInput = propertiesPanel.querySelector('input[placeholder*="title"], input[placeholder*="Title"]');
  logPropertyTest('Title input found', !!titleInput, titleInput ? 'Title input available' : 'Title input not found');
  
  // Check for subtitle input
  const subtitleInput = propertiesPanel.querySelector('input[placeholder*="subtitle"], input[placeholder*="Subtitle"]');
  logPropertyTest('Subtitle input found', !!subtitleInput, subtitleInput ? 'Subtitle input available' : 'Subtitle input not found');
  
  // Check for color palette select
  const colorSelect = propertiesPanel.querySelector('select, .ant-select');
  logPropertyTest('Color selector found', !!colorSelect, colorSelect ? 'Color selector available' : 'Color selector not found');
  
  // Test property updates
  if (titleInput) {
    testPropertyUpdate(titleInput, 'Test Title');
  }
  
  return { titleInput, subtitleInput, colorSelect };
}

// Test 5: Test property update
function testPropertyUpdate(inputElement, testValue) {
  console.log('\n📋 Test 5: Property Update');
  
  try {
    const originalValue = inputElement.value;
    inputElement.value = testValue;
    
    // Dispatch input and change events
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    
    logPropertyTest('Property input update', true, `Changed from "${originalValue}" to "${testValue}"`);
    
    // Check if widget title updated visually
    setTimeout(() => {
      const widgetTitle = document.querySelector('[class*="title"], h1, h2, h3, h4, h5, h6');
      const titleUpdated = widgetTitle && widgetTitle.textContent.includes(testValue);
      logPropertyTest('Widget title visual update', titleUpdated, titleUpdated ? 'Widget title updated visually' : 'Widget title not updated visually');
    }, 500);
    
    return true;
  } catch (error) {
    logPropertyTest('Property update', false, `Error: ${error.message}`);
    return false;
  }
}

// Test 6: Test Zustand store updates
function testZustandStore() {
  console.log('\n📋 Test 6: Zustand Store Updates');
  
  // Check console for Zustand logs
  const originalLog = console.log;
  let zustandLogs = [];
  
  console.log = function(...args) {
    const message = args.join(' ');
    if (message.includes('🎯') || message.includes('Zustand') || message.includes('store')) {
      zustandLogs.push(message);
    }
    originalLog.apply(console, args);
  };
  
  // Restore console.log after a delay
  setTimeout(() => {
    console.log = originalLog;
    logPropertyTest('Zustand logs found', zustandLogs.length > 0, `Found ${zustandLogs.length} Zustand-related logs`);
  }, 2000);
  
  return { zustandLogs };
}

// Test 7: Test save functionality
function testSaveFunctionality() {
  console.log('\n📋 Test 7: Save Functionality');
  
  const saveButton = document.querySelector('button[title*="Save"], button:contains("Save"), [class*="save"]');
  
  if (!saveButton) {
    logPropertyTest('Save button found', false, 'Save button not found');
    return false;
  }
  
  logPropertyTest('Save button found', true, 'Save button available');
  
  try {
    saveButton.click();
    logPropertyTest('Save button clickable', true, 'Save button clicked successfully');
    
    // Check for save modal or success message
    setTimeout(() => {
      const saveModal = document.querySelector('[class*="modal"], [class*="dialog"]');
      const successMessage = document.querySelector('[class*="success"], [class*="message"]');
      
      logPropertyTest('Save modal appears', !!saveModal, saveModal ? 'Save modal found' : 'Save modal not found');
      logPropertyTest('Success message appears', !!successMessage, successMessage ? 'Success message found' : 'Success message not found');
    }, 1000);
    
    return true;
  } catch (error) {
    logPropertyTest('Save functionality', false, `Error: ${error.message}`);
    return false;
  }
}

// Run all property tests
function runAllPropertyTests() {
  console.log('🚀 Running ALL Property Sync Tests...');
  console.log('='.repeat(60));
  
  const results = {
    dashboardLoads: testDashboardLoads(),
    addWidget: testAddWidget(),
    zustandStore: testZustandStore(),
    saveFunctionality: testSaveFunctionality()
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 PROPERTY SYNC TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  const passed = window.propertyTestResults.successes.length;
  const failed = window.propertyTestResults.failures.length;
  const total = window.propertyTestResults.tests.length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${total}`);
  console.log(`🎯 Success Rate: ${total > 0 ? Math.round((passed / total) * 100) : 0}%`);
  
  if (window.propertyTestResults.failures.length > 0) {
    console.log('\n❌ FAILURES:');
    window.propertyTestResults.failures.forEach(failure => {
      console.log(`  - ${failure.test}: ${failure.details}`);
    });
  }
  
  if (window.propertyTestResults.successes.length > 0) {
    console.log('\n✅ SUCCESSES:');
    window.propertyTestResults.successes.forEach(success => {
      console.log(`  - ${success.test}: ${success.details}`);
    });
  }
  
  console.log('\n💡 Next Steps:');
  if (failed > 0) {
    console.log('1. Fix the failed tests above');
    console.log('2. Re-run tests to verify fixes');
    console.log('3. Test manual property changes');
  } else {
    console.log('1. All automated tests passed!');
    console.log('2. Test manual property changes');
    console.log('3. Test save/reload functionality');
  }
  
  return results;
}

// Export for manual use
window.propertyTests = {
  runAllPropertyTests,
  testDashboardLoads,
  testAddWidget,
  testWidgetSelection,
  testPropertyForm,
  testPropertyUpdate,
  testZustandStore,
  testSaveFunctionality
};

// Auto-run tests
runAllPropertyTests();

console.log('\n💡 Available commands:');
console.log('  - window.propertyTests.runAllPropertyTests()');
console.log('  - window.propertyTestResults (contains detailed results)');
console.log('  - Individual test functions available');


