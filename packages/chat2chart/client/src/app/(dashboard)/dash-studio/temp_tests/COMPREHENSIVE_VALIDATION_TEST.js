// 🧪 COMPREHENSIVE PROPERTY SYNC VALIDATION TEST
// Run this in browser console on http://localhost:3000/dash-studio

console.log('🚀 Starting Comprehensive Property Sync Validation...');

// Test Results Storage
window.validationResults = {
  tests: [],
  failures: [],
  successes: [],
  startTime: Date.now()
};

function logValidationTest(testName, result, details = '') {
  const status = result ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${testName}${details ? ': ' + details : ''}`);
  
  window.validationResults.tests.push({ 
    test: testName, 
    result, 
    details, 
    timestamp: Date.now() 
  });
  
  if (result) {
    window.validationResults.successes.push({ test: testName, details });
  } else {
    window.validationResults.failures.push({ test: testName, details });
  }
}

// Test 1: Dashboard Studio Loads Correctly
function testDashboardLoads() {
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
  
  const header = document.querySelector('.ant-layout-header') ||
                 document.querySelector('[class*="header"]');
  
  logValidationTest('Canvas loads', !!canvas, canvas ? 'Canvas element found' : 'Canvas not found');
  logValidationTest('Widget library loads', !!widgetLibrary, widgetLibrary ? 'Widget library found' : 'Widget library not found');
  logValidationTest('Properties panel loads', !!propertiesPanel, propertiesPanel ? 'Properties panel found' : 'Properties panel not found');
  logValidationTest('Header loads', !!header, header ? 'Header found' : 'Header not found');
  
  return { canvas, widgetLibrary, propertiesPanel, header };
}

// Test 2: Widget Library Functionality
function testWidgetLibrary() {
  console.log('\n📋 Test 2: Widget Library Functionality');
  
  // Look for chart widgets
  const chartWidgets = document.querySelectorAll('[data-widget-type="chart"], [data-widget-type="bar"], [data-widget-type="line"], [data-widget-type="pie"]');
  const barChart = document.querySelector('[data-widget-type="bar"]') || 
                   document.querySelector('[title*="Bar"], [title*="bar"]') ||
                   document.querySelector('[alt*="Bar"], [alt*="bar"]');
  
  const lineChart = document.querySelector('[data-widget-type="line"]') || 
                    document.querySelector('[title*="Line"], [title*="line"]') ||
                    document.querySelector('[alt*="Line"], [alt*="line"]');
  
  const pieChart = document.querySelector('[data-widget-type="pie"]') || 
                   document.querySelector('[title*="Pie"], [title*="pie"]') ||
                   document.querySelector('[alt*="Pie"], [alt*="pie"]');
  
  logValidationTest('Chart widgets found', chartWidgets.length > 0, `Found ${chartWidgets.length} chart widgets`);
  logValidationTest('Bar chart widget found', !!barChart, barChart ? 'Bar chart widget available' : 'Bar chart widget not found');
  logValidationTest('Line chart widget found', !!lineChart, lineChart ? 'Line chart widget available' : 'Line chart widget not found');
  logValidationTest('Pie chart widget found', !!pieChart, pieChart ? 'Pie chart widget available' : 'Pie chart widget not found');
  
  // Check if widgets are draggable
  const draggableWidgets = document.querySelectorAll('[draggable="true"]');
  logValidationTest('Draggable widgets', draggableWidgets.length > 0, `Found ${draggableWidgets.length} draggable widgets`);
  
  return { chartWidgets, barChart, lineChart, pieChart, draggableWidgets };
}

// Test 3: Add Widget to Canvas
function testAddWidget() {
  console.log('\n📋 Test 3: Add Widget to Canvas');
  
  const canvas = document.querySelector('.dashboard-canvas-wrapper') || 
                 document.querySelector('[class*="canvas"]');
  
  if (!canvas) {
    logValidationTest('Add widget', false, 'Canvas not found');
    return false;
  }
  
  // Look for bar chart widget
  const barChart = document.querySelector('[data-widget-type="bar"]') || 
                   document.querySelector('[title*="Bar"], [title*="bar"]') ||
                   document.querySelector('[alt*="Bar"], [alt*="bar"]');
  
  if (!barChart) {
    logValidationTest('Add widget', false, 'Bar chart widget not found');
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
    
    logValidationTest('Drag and drop simulation', true, 'Drag and drop events dispatched');
    
    // Check if widget was added
    setTimeout(() => {
      const widgetsOnCanvas = canvas.querySelectorAll('[class*="widget"], [data-widget-id]');
      logValidationTest('Widget added to canvas', widgetsOnCanvas.length > 0, `Found ${widgetsOnCanvas.length} widgets on canvas`);
      
      if (widgetsOnCanvas.length > 0) {
        // Test widget selection
        testWidgetSelection(widgetsOnCanvas[0]);
      }
    }, 1000);
    
    return true;
  } catch (error) {
    logValidationTest('Add widget', false, `Error: ${error.message}`);
    return false;
  }
}

// Test 4: Widget Selection
function testWidgetSelection(widget) {
  console.log('\n📋 Test 4: Widget Selection');
  
  try {
    widget.click();
    logValidationTest('Widget selection', true, 'Widget clicked successfully');
    
    // Wait for properties panel to update
    setTimeout(() => {
      testPropertyForm();
    }, 500);
    
    return true;
  } catch (error) {
    logValidationTest('Widget selection', false, `Error: ${error.message}`);
    return false;
  }
}

// Test 5: Property Form Structure
function testPropertyForm() {
  console.log('\n📋 Test 5: Property Form Structure');
  
  const propertiesPanel = document.querySelector('.properties-panel') ||
                          document.querySelector('[class*="properties"]');
  
  if (!propertiesPanel) {
    logValidationTest('Property form', false, 'Properties panel not found');
    return false;
  }
  
  // Check for title input (should be flat name="title", not nested)
  const titleInput = propertiesPanel.querySelector('input[placeholder*="title"], input[placeholder*="Title"]');
  logValidationTest('Title input found', !!titleInput, titleInput ? 'Title input available' : 'Title input not found');
  
  // Check for subtitle input (should be flat name="subtitle", not nested)
  const subtitleInput = propertiesPanel.querySelector('input[placeholder*="subtitle"], input[placeholder*="Subtitle"]');
  logValidationTest('Subtitle input found', !!subtitleInput, subtitleInput ? 'Subtitle input available' : 'Subtitle input not found');
  
  // Check for color palette select
  const colorSelect = propertiesPanel.querySelector('select, .ant-select');
  logValidationTest('Color selector found', !!colorSelect, colorSelect ? 'Color selector available' : 'Color selector not found');
  
  // Check for legend controls
  const legendControls = propertiesPanel.querySelectorAll('[class*="legend"], input[placeholder*="legend"]');
  logValidationTest('Legend controls found', legendControls.length > 0, `Found ${legendControls.length} legend controls`);
  
  // Check for animation controls
  const animationControls = propertiesPanel.querySelectorAll('[class*="animation"], input[placeholder*="animation"]');
  logValidationTest('Animation controls found', animationControls.length > 0, `Found ${animationControls.length} animation controls`);
  
  // Test property updates
  if (titleInput) {
    testPropertyUpdate(titleInput, 'Test Title');
  }
  
  return { titleInput, subtitleInput, colorSelect, legendControls, animationControls };
}

// Test 6: Property Update Flow
function testPropertyUpdate(inputElement, testValue) {
  console.log('\n📋 Test 6: Property Update Flow');
  
  try {
    const originalValue = inputElement.value;
    inputElement.value = testValue;
    
    // Dispatch input and change events
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    
    logValidationTest('Property input update', true, `Changed from "${originalValue}" to "${testValue}"`);
    
    // Check if widget title updated visually
    setTimeout(() => {
      const widgetTitle = document.querySelector('[class*="title"], h1, h2, h3, h4, h5, h6');
      const titleUpdated = widgetTitle && widgetTitle.textContent.includes(testValue);
      logValidationTest('Widget title visual update', titleUpdated, titleUpdated ? 'Widget title updated visually' : 'Widget title not updated visually');
      
      // Test subtitle update
      const subtitleInput = document.querySelector('input[placeholder*="subtitle"], input[placeholder*="Subtitle"]');
      if (subtitleInput) {
        testSubtitleUpdate(subtitleInput, 'Test Subtitle');
      }
    }, 500);
    
    return true;
  } catch (error) {
    logValidationTest('Property update', false, `Error: ${error.message}`);
    return false;
  }
}

// Test 7: Subtitle Update
function testSubtitleUpdate(subtitleInput, testValue) {
  console.log('\n📋 Test 7: Subtitle Update');
  
  try {
    const originalValue = subtitleInput.value;
    subtitleInput.value = testValue;
    
    // Dispatch input and change events
    subtitleInput.dispatchEvent(new Event('input', { bubbles: true }));
    subtitleInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    logValidationTest('Subtitle input update', true, `Changed from "${originalValue}" to "${testValue}"`);
    
    // Check if widget subtitle updated visually
    setTimeout(() => {
      const widgetSubtitle = document.querySelector('[class*="subtitle"], [class*="subtext"]');
      const subtitleUpdated = widgetSubtitle && widgetSubtitle.textContent.includes(testValue);
      logValidationTest('Widget subtitle visual update', subtitleUpdated, subtitleUpdated ? 'Widget subtitle updated visually' : 'Widget subtitle not updated visually');
    }, 500);
    
    return true;
  } catch (error) {
    logValidationTest('Subtitle update', false, `Error: ${error.message}`);
    return false;
  }
}

// Test 8: Zustand Store Updates
function testZustandStore() {
  console.log('\n📋 Test 8: Zustand Store Updates');
  
  // Check console for Zustand logs
  const originalLog = console.log;
  let zustandLogs = [];
  
  console.log = function(...args) {
    const message = args.join(' ');
    if (message.includes('🎯') || message.includes('Zustand') || message.includes('store') || message.includes('SINGLE SOURCE OF TRUTH')) {
      zustandLogs.push(message);
    }
    originalLog.apply(console, args);
  };
  
  // Restore console.log after a delay
  setTimeout(() => {
    console.log = originalLog;
    logValidationTest('Zustand logs found', zustandLogs.length > 0, `Found ${zustandLogs.length} Zustand-related logs`);
    
    if (zustandLogs.length > 0) {
      console.log('\n📋 Zustand Logs Found:');
      zustandLogs.forEach(log => console.log(`  - ${log}`));
    }
  }, 2000);
  
  return { zustandLogs };
}

// Test 9: Save Functionality
function testSaveFunctionality() {
  console.log('\n📋 Test 9: Save Functionality');
  
  const saveButton = document.querySelector('button[title*="Save"], button:contains("Save"), [class*="save"]');
  
  if (!saveButton) {
    logValidationTest('Save button found', false, 'Save button not found');
    return false;
  }
  
  logValidationTest('Save button found', true, 'Save button available');
  
  try {
    saveButton.click();
    logValidationTest('Save button clickable', true, 'Save button clicked successfully');
    
    // Check for save modal or success message
    setTimeout(() => {
      const saveModal = document.querySelector('[class*="modal"], [class*="dialog"]');
      const successMessage = document.querySelector('[class*="success"], [class*="message"]');
      
      logValidationTest('Save modal appears', !!saveModal, saveModal ? 'Save modal found' : 'Save modal not found');
      logValidationTest('Success message appears', !!successMessage, successMessage ? 'Success message found' : 'Success message not found');
    }, 1000);
    
    return true;
  } catch (error) {
    logValidationTest('Save functionality', false, `Error: ${error.message}`);
    return false;
  }
}

// Test 10: Error Detection
function testErrorDetection() {
  console.log('\n📋 Test 10: Error Detection');
  
  // Check for console errors
  const originalError = console.error;
  let consoleErrors = [];
  
  console.error = function(...args) {
    const message = args.join(' ');
    consoleErrors.push(message);
    originalError.apply(console, args);
  };
  
  // Check for error elements in DOM
  const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"]');
  logValidationTest('No error elements', errorElements.length === 0, `Found ${errorElements.length} error elements`);
  
  // Restore console.error after a delay
  setTimeout(() => {
    console.error = originalError;
    logValidationTest('No console errors', consoleErrors.length === 0, `Found ${consoleErrors.length} console errors`);
    
    if (consoleErrors.length > 0) {
      console.log('\n❌ Console Errors Found:');
      consoleErrors.forEach(error => console.log(`  - ${error}`));
    }
  }, 2000);
  
  return { consoleErrors, errorElements };
}

// Run all validation tests
function runAllValidationTests() {
  console.log('🚀 Running ALL Property Sync Validation Tests...');
  console.log('='.repeat(70));
  
  const results = {
    dashboardLoads: testDashboardLoads(),
    widgetLibrary: testWidgetLibrary(),
    addWidget: testAddWidget(),
    zustandStore: testZustandStore(),
    saveFunctionality: testSaveFunctionality(),
    errorDetection: testErrorDetection()
  };
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 PROPERTY SYNC VALIDATION RESULTS SUMMARY');
  console.log('='.repeat(70));
  
  const passed = window.validationResults.successes.length;
  const failed = window.validationResults.failures.length;
  const total = window.validationResults.tests.length;
  const duration = Date.now() - window.validationResults.startTime;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${total}`);
  console.log(`🎯 Success Rate: ${total > 0 ? Math.round((passed / total) * 100) : 0}%`);
  console.log(`⏱️ Duration: ${duration}ms`);
  
  if (window.validationResults.failures.length > 0) {
    console.log('\n❌ FAILURES:');
    window.validationResults.failures.forEach(failure => {
      console.log(`  - ${failure.test}: ${failure.details}`);
    });
  }
  
  if (window.validationResults.successes.length > 0) {
    console.log('\n✅ SUCCESSES:');
    window.validationResults.successes.forEach(success => {
      console.log(`  - ${success.test}: ${success.details}`);
    });
  }
  
  console.log('\n💡 Next Steps:');
  if (failed > 0) {
    console.log('1. Fix the failed tests above');
    console.log('2. Re-run validation tests');
    console.log('3. Test manual property changes');
  } else {
    console.log('1. All validation tests passed!');
    console.log('2. Test manual property changes');
    console.log('3. Test save/reload functionality');
    console.log('4. Test all widget types');
  }
  
  return results;
}

// Export for manual use
window.validationTests = {
  runAllValidationTests,
  testDashboardLoads,
  testWidgetLibrary,
  testAddWidget,
  testWidgetSelection,
  testPropertyForm,
  testPropertyUpdate,
  testSubtitleUpdate,
  testZustandStore,
  testSaveFunctionality,
  testErrorDetection
};

// Auto-run tests
runAllValidationTests();

console.log('\n💡 Available commands:');
console.log('  - window.validationTests.runAllValidationTests()');
console.log('  - window.validationResults (contains detailed results)');
console.log('  - Individual test functions available');


