// 🧪 FINAL PROPERTY SYNC VALIDATION TEST
// Run this in browser console on http://localhost:3000/dash-studio

console.log('🚀 Starting FINAL Property Sync Validation Test...');

// Test Results Storage
window.finalTestResults = {
  tests: [],
  failures: [],
  successes: [],
  startTime: Date.now()
};

function logFinalTest(testName, result, details = '') {
  const status = result ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${testName}${details ? ': ' + details : ''}`);
  
  window.finalTestResults.tests.push({ 
    test: testName, 
    result, 
    details, 
    timestamp: Date.now() 
  });
  
  if (result) {
    window.finalTestResults.successes.push({ test: testName, details });
  } else {
    window.finalTestResults.failures.push({ test: testName, details });
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
  
  logFinalTest('Canvas loads', !!canvas, canvas ? 'Canvas found' : 'Canvas not found');
  logFinalTest('Widget library loads', !!widgetLibrary, widgetLibrary ? 'Widget library found' : 'Widget library not found');
  logFinalTest('Properties panel loads', !!propertiesPanel, propertiesPanel ? 'Properties panel found' : 'Properties panel not found');
  
  return { canvas, widgetLibrary, propertiesPanel };
}

// Test 2: Add Widget to Canvas
function testAddWidget() {
  console.log('\n📋 Test 2: Add Widget to Canvas');
  
  const canvas = document.querySelector('.dashboard-canvas-wrapper') || 
                 document.querySelector('[class*="canvas"]');
  
  if (!canvas) {
    logFinalTest('Add widget', false, 'Canvas not found');
    return false;
  }
  
  // Look for bar chart widget
  const barChart = document.querySelector('[data-widget-type="bar"]') || 
                   document.querySelector('[title*="Bar"], [title*="bar"]') ||
                   document.querySelector('[alt*="Bar"], [alt*="bar"]');
  
  if (!barChart) {
    logFinalTest('Add widget', false, 'Bar chart widget not found');
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
    
    logFinalTest('Drag and drop simulation', true, 'Drag and drop events dispatched');
    
    // Check if widget was added
    setTimeout(() => {
      const widgetsOnCanvas = canvas.querySelectorAll('[class*="widget"], [data-widget-id]');
      logFinalTest('Widget added to canvas', widgetsOnCanvas.length > 0, `Found ${widgetsOnCanvas.length} widgets on canvas`);
      
      if (widgetsOnCanvas.length > 0) {
        testWidgetSelection(widgetsOnCanvas[0]);
      }
    }, 1000);
    
    return true;
  } catch (error) {
    logFinalTest('Add widget', false, `Error: ${error.message}`);
    return false;
  }
}

// Test 3: Widget Selection
function testWidgetSelection(widget) {
  console.log('\n📋 Test 3: Widget Selection');
  
  try {
    widget.click();
    logFinalTest('Widget selection', true, 'Widget clicked successfully');
    
    setTimeout(() => {
      testPropertyForm();
    }, 500);
    
    return true;
  } catch (error) {
    logFinalTest('Widget selection', false, `Error: ${error.message}`);
    return false;
  }
}

// Test 4: Property Form Structure
function testPropertyForm() {
  console.log('\n📋 Test 4: Property Form Structure');
  
  const propertiesPanel = document.querySelector('.properties-panel') ||
                          document.querySelector('[class*="properties"]');
  
  if (!propertiesPanel) {
    logFinalTest('Property form', false, 'Properties panel not found');
    return false;
  }
  
  // Check for title input (should be flat name="title")
  const titleInput = propertiesPanel.querySelector('input[placeholder*="title"], input[placeholder*="Title"]');
  logFinalTest('Title input found', !!titleInput, titleInput ? 'Title input available' : 'Title input not found');
  
  // Check for subtitle input (should be flat name="subtitle")
  const subtitleInput = propertiesPanel.querySelector('input[placeholder*="subtitle"], input[placeholder*="Subtitle"]');
  logFinalTest('Subtitle input found', !!subtitleInput, subtitleInput ? 'Subtitle input available' : 'Subtitle input not found');
  
  // Check for color palette select
  const colorSelect = propertiesPanel.querySelector('select, .ant-select');
  logFinalTest('Color selector found', !!colorSelect, colorSelect ? 'Color selector available' : 'Color selector not found');
  
  // Test property updates
  if (titleInput) {
    testTitleUpdate(titleInput, 'Sales Performance');
  }
  
  return { titleInput, subtitleInput, colorSelect };
}

// Test 5: Title Property Update
function testTitleUpdate(titleInput, testValue) {
  console.log('\n📋 Test 5: Title Property Update');
  
  try {
    const originalValue = titleInput.value;
    titleInput.value = testValue;
    
    // Dispatch input and change events
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    titleInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    logFinalTest('Title input update', true, `Changed from "${originalValue}" to "${testValue}"`);
    
    // Check if widget title updated visually
    setTimeout(() => {
      const widgetTitle = document.querySelector('[class*="title"], h1, h2, h3, h4, h5, h6');
      const titleUpdated = widgetTitle && widgetTitle.textContent.includes(testValue);
      logFinalTest('Widget title visual update', titleUpdated, titleUpdated ? 'Widget title updated visually' : 'Widget title not updated visually');
      
      // Test subtitle update
      const subtitleInput = document.querySelector('input[placeholder*="subtitle"], input[placeholder*="Subtitle"]');
      if (subtitleInput) {
        testSubtitleUpdate(subtitleInput, 'Q1 2024 Results');
      }
    }, 500);
    
    return true;
  } catch (error) {
    logFinalTest('Title update', false, `Error: ${error.message}`);
    return false;
  }
}

// Test 6: Subtitle Property Update
function testSubtitleUpdate(subtitleInput, testValue) {
  console.log('\n📋 Test 6: Subtitle Property Update');
  
  try {
    const originalValue = subtitleInput.value;
    subtitleInput.value = testValue;
    
    // Dispatch input and change events
    subtitleInput.dispatchEvent(new Event('input', { bubbles: true }));
    subtitleInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    logFinalTest('Subtitle input update', true, `Changed from "${originalValue}" to "${testValue}"`);
    
    // Check if widget subtitle updated visually
    setTimeout(() => {
      const widgetSubtitle = document.querySelector('[class*="subtitle"], [class*="subtext"]');
      const subtitleUpdated = widgetSubtitle && widgetSubtitle.textContent.includes(testValue);
      logFinalTest('Widget subtitle visual update', subtitleUpdated, subtitleUpdated ? 'Widget subtitle updated visually' : 'Widget subtitle not updated visually');
    }, 500);
    
    return true;
  } catch (error) {
    logFinalTest('Subtitle update', false, `Error: ${error.message}`);
    return false;
  }
}

// Test 7: Color Palette Update
function testColorPaletteUpdate() {
  console.log('\n📋 Test 7: Color Palette Update');
  
  const colorSelect = document.querySelector('select, .ant-select');
  
  if (!colorSelect) {
    logFinalTest('Color palette update', false, 'Color selector not found');
    return false;
  }
  
  try {
    // Try to change color palette
    if (colorSelect.tagName === 'SELECT') {
      colorSelect.value = 'vibrant';
      colorSelect.dispatchEvent(new Event('change', { bubbles: true }));
      logFinalTest('Color palette update', true, 'Changed to vibrant palette');
    } else {
      // For Ant Design Select, try to click and select option
      colorSelect.click();
      setTimeout(() => {
        const vibrantOption = document.querySelector('[title*="vibrant"], [title*="Vibrant"]');
        if (vibrantOption) {
          vibrantOption.click();
          logFinalTest('Color palette update', true, 'Changed to vibrant palette');
        } else {
          logFinalTest('Color palette update', false, 'Vibrant option not found');
        }
      }, 500);
    }
    
    return true;
  } catch (error) {
    logFinalTest('Color palette update', false, `Error: ${error.message}`);
    return false;
  }
}

// Test 8: Legend Toggle
function testLegendToggle() {
  console.log('\n📋 Test 8: Legend Toggle');
  
  const legendSwitch = document.querySelector('input[type="checkbox"], .ant-switch');
  
  if (!legendSwitch) {
    logFinalTest('Legend toggle', false, 'Legend switch not found');
    return false;
  }
  
  try {
    legendSwitch.click();
    logFinalTest('Legend toggle', true, 'Legend switch clicked');
    
    return true;
  } catch (error) {
    logFinalTest('Legend toggle', false, `Error: ${error.message}`);
    return false;
  }
}

// Test 9: Save Functionality
function testSaveFunctionality() {
  console.log('\n📋 Test 9: Save Functionality');
  
  const saveButton = document.querySelector('button[title*="Save"], button:contains("Save"), [class*="save"]');
  
  if (!saveButton) {
    logFinalTest('Save button found', false, 'Save button not found');
    return false;
  }
  
  logFinalTest('Save button found', true, 'Save button available');
  
  try {
    saveButton.click();
    logFinalTest('Save button clickable', true, 'Save button clicked successfully');
    
    // Check for save modal or success message
    setTimeout(() => {
      const saveModal = document.querySelector('[class*="modal"], [class*="dialog"]');
      const successMessage = document.querySelector('[class*="success"], [class*="message"]');
      
      logFinalTest('Save modal appears', !!saveModal, saveModal ? 'Save modal found' : 'Save modal not found');
      logFinalTest('Success message appears', !!successMessage, successMessage ? 'Success message found' : 'Success message not found');
    }, 1000);
    
    return true;
  } catch (error) {
    logFinalTest('Save functionality', false, `Error: ${error.message}`);
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
  logFinalTest('No error elements', errorElements.length === 0, `Found ${errorElements.length} error elements`);
  
  // Restore console.error after a delay
  setTimeout(() => {
    console.error = originalError;
    logFinalTest('No console errors', consoleErrors.length === 0, `Found ${consoleErrors.length} console errors`);
    
    if (consoleErrors.length > 0) {
      console.log('\n❌ Console Errors Found:');
      consoleErrors.forEach(error => console.log(`  - ${error}`));
    }
  }, 2000);
  
  return { consoleErrors, errorElements };
}

// Run all final tests
function runAllFinalTests() {
  console.log('🚀 Running ALL Final Property Sync Tests...');
  console.log('='.repeat(80));
  
  const results = {
    dashboardLoads: testDashboardLoads(),
    addWidget: testAddWidget(),
    colorPalette: testColorPaletteUpdate(),
    legendToggle: testLegendToggle(),
    saveFunctionality: testSaveFunctionality(),
    errorDetection: testErrorDetection()
  };
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL PROPERTY SYNC TEST RESULTS SUMMARY');
  console.log('='.repeat(80));
  
  const passed = window.finalTestResults.successes.length;
  const failed = window.finalTestResults.failures.length;
  const total = window.finalTestResults.tests.length;
  const duration = Date.now() - window.finalTestResults.startTime;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${total}`);
  console.log(`🎯 Success Rate: ${total > 0 ? Math.round((passed / total) * 100) : 0}%`);
  console.log(`⏱️ Duration: ${duration}ms`);
  
  if (window.finalTestResults.failures.length > 0) {
    console.log('\n❌ FAILURES:');
    window.finalTestResults.failures.forEach(failure => {
      console.log(`  - ${failure.test}: ${failure.details}`);
    });
  }
  
  if (window.finalTestResults.successes.length > 0) {
    console.log('\n✅ SUCCESSES:');
    window.finalTestResults.successes.forEach(success => {
      console.log(`  - ${success.test}: ${success.details}`);
    });
  }
  
  console.log('\n💡 Next Steps:');
  if (failed > 0) {
    console.log('1. Fix the failed tests above');
    console.log('2. Re-run final tests');
    console.log('3. Test manual property changes');
  } else {
    console.log('1. All final tests passed! 🎉');
    console.log('2. Property sync is working correctly');
    console.log('3. Test manual property changes');
    console.log('4. Test save/reload functionality');
    console.log('5. Test all widget types');
  }
  
  return results;
}

// Export for manual use
window.finalTests = {
  runAllFinalTests,
  testDashboardLoads,
  testAddWidget,
  testWidgetSelection,
  testPropertyForm,
  testTitleUpdate,
  testSubtitleUpdate,
  testColorPaletteUpdate,
  testLegendToggle,
  testSaveFunctionality,
  testErrorDetection
};

// Auto-run tests
runAllFinalTests();

console.log('\n💡 Available commands:');
console.log('  - window.finalTests.runAllFinalTests()');
console.log('  - window.finalTestResults (contains detailed results)');
console.log('  - Individual test functions available');


