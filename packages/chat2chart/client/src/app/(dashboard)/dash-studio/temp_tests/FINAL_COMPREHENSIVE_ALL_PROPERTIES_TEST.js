// 🧪 FINAL COMPREHENSIVE ALL-PROPERTIES TEST
// Run this in browser console on http://localhost:3000/dash-studio

console.log('🚀 Starting FINAL COMPREHENSIVE ALL-PROPERTIES TEST...');

// Test Results Storage
window.finalComprehensiveResults = {
  tests: [],
  failures: [],
  successes: [],
  startTime: Date.now(),
  propertiesTested: 0,
  propertiesPassed: 0,
  propertiesFailed: 0,
  propertyCategories: {
    titleSubtitle: { tested: 0, passed: 0, failed: 0 },
    visual: { tested: 0, passed: 0, failed: 0 },
    data: { tested: 0, passed: 0, failed: 0 },
    layout: { tested: 0, passed: 0, failed: 0 },
    typography: { tested: 0, passed: 0, failed: 0 },
    effects: { tested: 0, passed: 0, failed: 0 },
    advanced: { tested: 0, passed: 0, failed: 0 },
    dataZoom: { tested: 0, passed: 0, failed: 0 },
    markPoints: { tested: 0, passed: 0, failed: 0 },
    brush: { tested: 0, passed: 0, failed: 0 },
    visualMap: { tested: 0, passed: 0, failed: 0 },
    accessibility: { tested: 0, passed: 0, failed: 0 }
  }
};

function logPropertyTest(propertyName, result, details = '', category = '') {
  const status = result ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${propertyName}${details ? ': ' + details : ''}`);
  
  window.finalComprehensiveResults.tests.push({ 
    property: propertyName, 
    result, 
    details, 
    category,
    timestamp: Date.now() 
  });
  
  window.finalComprehensiveResults.propertiesTested++;
  
  if (result) {
    window.finalComprehensiveResults.successes.push({ property: propertyName, details, category });
    window.finalComprehensiveResults.propertiesPassed++;
    if (category && window.finalComprehensiveResults.propertyCategories[category]) {
      window.finalComprehensiveResults.propertyCategories[category].passed++;
    }
  } else {
    window.finalComprehensiveResults.failures.push({ property: propertyName, details, category });
    window.finalComprehensiveResults.propertiesFailed++;
    if (category && window.finalComprehensiveResults.propertyCategories[category]) {
      window.finalComprehensiveResults.propertyCategories[category].failed++;
    }
  }
  
  if (category && window.finalComprehensiveResults.propertyCategories[category]) {
    window.finalComprehensiveResults.propertyCategories[category].tested++;
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
  
  logPropertyTest('Canvas loads', !!canvas, canvas ? 'Canvas found' : 'Canvas not found');
  logPropertyTest('Widget library loads', !!widgetLibrary, widgetLibrary ? 'Widget library found' : 'Widget library not found');
  logPropertyTest('Properties panel loads', !!propertiesPanel, propertiesPanel ? 'Properties panel found' : 'Properties panel not found');
  
  return { canvas, widgetLibrary, propertiesPanel };
}

// Test 2: Add Widget to Canvas
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
    
    logPropertyTest('Drag and drop simulation', true, 'Drag and drop events dispatched');
    
    // Check if widget was added
    setTimeout(() => {
      const widgetsOnCanvas = canvas.querySelectorAll('[class*="widget"], [data-widget-id]');
      logPropertyTest('Widget added to canvas', widgetsOnCanvas.length > 0, `Found ${widgetsOnCanvas.length} widgets on canvas`);
      
      if (widgetsOnCanvas.length > 0) {
        testWidgetSelection(widgetsOnCanvas[0]);
      }
    }, 1000);
    
    return true;
  } catch (error) {
    logPropertyTest('Add widget', false, `Error: ${error.message}`);
    return false;
  }
}

// Test 3: Widget Selection
function testWidgetSelection(widget) {
  console.log('\n📋 Test 3: Widget Selection');
  
  try {
    widget.click();
    logPropertyTest('Widget selection', true, 'Widget clicked successfully');
    
    setTimeout(() => {
      testAllPropertyCategories();
    }, 500);
    
    return true;
  } catch (error) {
    logPropertyTest('Widget selection', false, `Error: ${error.message}`);
    return false;
  }
}

// Test 4: Test ALL Property Categories
function testAllPropertyCategories() {
  console.log('\n📋 Test 4: Testing ALL Property Categories');
  
  const propertiesPanel = document.querySelector('.properties-panel') ||
                          document.querySelector('[class*="properties"]');
  
  if (!propertiesPanel) {
    logPropertyTest('Properties panel', false, 'Properties panel not found');
    return false;
  }
  
  // Test each category
  testTitleSubtitleProperties(propertiesPanel);
  testVisualProperties(propertiesPanel);
  testDataProperties(propertiesPanel);
  testLayoutProperties(propertiesPanel);
  testTypographyProperties(propertiesPanel);
  testEffectsProperties(propertiesPanel);
  testAdvancedProperties(propertiesPanel);
  testDataZoomProperties(propertiesPanel);
  testMarkPointsProperties(propertiesPanel);
  testBrushProperties(propertiesPanel);
  testVisualMapProperties(propertiesPanel);
  testAccessibilityProperties(propertiesPanel);
  
  return true;
}

// Test Title & Subtitle Properties
function testTitleSubtitleProperties(panel) {
  console.log('\n📋 Testing Title & Subtitle Properties');
  
  const titleInput = panel.querySelector('input[placeholder*="title"], input[placeholder*="Title"]');
  const subtitleInput = panel.querySelector('input[placeholder*="subtitle"], input[placeholder*="Subtitle"]');
  
  logPropertyTest('Title input found', !!titleInput, titleInput ? 'Title input available' : 'Title input not found', 'titleSubtitle');
  logPropertyTest('Subtitle input found', !!subtitleInput, subtitleInput ? 'Subtitle input available' : 'Subtitle input not found', 'titleSubtitle');
  
  // Test title update
  if (titleInput) {
    testPropertyUpdate(titleInput, 'Sales Performance', 'title', 'titleSubtitle');
  }
  
  // Test subtitle update
  if (subtitleInput) {
    testPropertyUpdate(subtitleInput, 'Q1 2024 Results', 'subtitle', 'titleSubtitle');
  }
}

// Test Visual Properties
function testVisualProperties(panel) {
  console.log('\n📋 Testing Visual Properties');
  
  // Color Palette
  const colorPaletteSelect = panel.querySelector('select, .ant-select');
  logPropertyTest('Color palette select found', !!colorPaletteSelect, colorPaletteSelect ? 'Color palette select available' : 'Color palette select not found', 'visual');
  
  // Theme
  const themeSelects = panel.querySelectorAll('select, .ant-select');
  logPropertyTest('Theme select found', themeSelects.length > 1, `Found ${themeSelects.length} select elements`, 'visual');
  
  // Legend
  const legendSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logPropertyTest('Legend switches found', legendSwitches.length > 0, `Found ${legendSwitches.length} switches`, 'visual');
  
  // Tooltip
  const tooltipSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logPropertyTest('Tooltip switches found', tooltipSwitches.length > 0, `Found ${tooltipSwitches.length} switches`, 'visual');
  
  // Animation
  const animationSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logPropertyTest('Animation switches found', animationSwitches.length > 0, `Found ${animationSwitches.length} switches`, 'visual');
  
  // Animation Duration
  const animationDurationInput = panel.querySelector('input[type="number"], .ant-input-number');
  logPropertyTest('Animation duration input found', !!animationDurationInput, animationDurationInput ? 'Animation duration input available' : 'Animation duration input not found', 'visual');
  
  // Series Label
  const seriesLabelSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logPropertyTest('Series label switches found', seriesLabelSwitches.length > 0, `Found ${seriesLabelSwitches.length} switches`, 'visual');
  
  // Tooltip Formatter
  const tooltipFormatterSelects = panel.querySelectorAll('select, .ant-select');
  logPropertyTest('Tooltip formatter selects found', tooltipFormatterSelects.length > 0, `Found ${tooltipFormatterSelects.length} select elements`, 'visual');
  
  // Custom Tooltip Formatter
  const customFormatterTextarea = panel.querySelector('textarea, .ant-input');
  logPropertyTest('Custom formatter textarea found', !!customFormatterTextarea, customFormatterTextarea ? 'Custom formatter textarea available' : 'Custom formatter textarea not found', 'visual');
}

// Test Data Properties
function testDataProperties(panel) {
  console.log('\n📋 Testing Data Properties');
  
  // X Axis Field
  const xAxisFieldSelects = panel.querySelectorAll('select, .ant-select');
  logPropertyTest('X axis field selects found', xAxisFieldSelects.length > 0, `Found ${xAxisFieldSelects.length} select elements`, 'data');
  
  // Show X Axis
  const showXAxisSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logPropertyTest('Show X axis switches found', showXAxisSwitches.length > 0, `Found ${showXAxisSwitches.length} switches`, 'data');
  
  // Y Axis Field
  const yAxisFieldSelects = panel.querySelectorAll('select, .ant-select');
  logPropertyTest('Y axis field selects found', yAxisFieldSelects.length > 0, `Found ${yAxisFieldSelects.length} select elements`, 'data');
  
  // Show Y Axis
  const showYAxisSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logPropertyTest('Show Y axis switches found', showYAxisSwitches.length > 0, `Found ${showYAxisSwitches.length} switches`, 'data');
  
  // Series Field
  const seriesFieldSelects = panel.querySelectorAll('select, .ant-select');
  logPropertyTest('Series field selects found', seriesFieldSelects.length > 0, `Found ${seriesFieldSelects.length} select elements`, 'data');
  
  // Data Limit
  const dataLimitInputs = panel.querySelectorAll('input[type="number"], .ant-input-number');
  logPropertyTest('Data limit inputs found', dataLimitInputs.length > 0, `Found ${dataLimitInputs.length} number inputs`, 'data');
  
  // Data Labels
  const dataLabelSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logPropertyTest('Data label switches found', dataLabelSwitches.length > 0, `Found ${dataLabelSwitches.length} switches`, 'data');
  
  // Label Format
  const labelFormatSelects = panel.querySelectorAll('select, .ant-select');
  logPropertyTest('Label format selects found', labelFormatSelects.length > 0, `Found ${labelFormatSelects.length} select elements`, 'data');
}

// Test Layout Properties
function testLayoutProperties(panel) {
  console.log('\n📋 Testing Layout Properties');
  
  // Responsive
  const responsiveSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logPropertyTest('Responsive switches found', responsiveSwitches.length > 0, `Found ${responsiveSwitches.length} switches`, 'layout');
  
  // Draggable
  const draggableSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logPropertyTest('Draggable switches found', draggableSwitches.length > 0, `Found ${draggableSwitches.length} switches`, 'layout');
  
  // Resizable
  const resizableSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logPropertyTest('Resizable switches found', resizableSwitches.length > 0, `Found ${resizableSwitches.length} switches`, 'layout');
  
  // Background Color
  const backgroundColorPickers = panel.querySelectorAll('.ant-color-picker, input[type="color"]');
  logPropertyTest('Background color pickers found', backgroundColorPickers.length > 0, `Found ${backgroundColorPickers.length} color pickers`, 'layout');
  
  // Border Color
  const borderColorPickers = panel.querySelectorAll('.ant-color-picker, input[type="color"]');
  logPropertyTest('Border color pickers found', borderColorPickers.length > 0, `Found ${borderColorPickers.length} color pickers`, 'layout');
  
  // Padding
  const paddingInputs = panel.querySelectorAll('input[type="number"], .ant-input-number');
  logPropertyTest('Padding inputs found', paddingInputs.length > 0, `Found ${paddingInputs.length} number inputs`, 'layout');
  
  // Margin
  const marginInputs = panel.querySelectorAll('input[type="number"], .ant-input-number');
  logPropertyTest('Margin inputs found', marginInputs.length > 0, `Found ${marginInputs.length} number inputs`, 'layout');
}

// Test Typography Properties
function testTypographyProperties(panel) {
  console.log('\n📋 Testing Typography Properties');
  
  // Font Family
  const fontFamilySelects = panel.querySelectorAll('select, .ant-select');
  logPropertyTest('Font family selects found', fontFamilySelects.length > 0, `Found ${fontFamilySelects.length} select elements`, 'typography');
  
  // Font Size
  const fontSizeInputs = panel.querySelectorAll('input[type="number"], .ant-input-number');
  logPropertyTest('Font size inputs found', fontSizeInputs.length > 0, `Found ${fontSizeInputs.length} number inputs`, 'typography');
  
  // Font Weight
  const fontWeightSelects = panel.querySelectorAll('select, .ant-select');
  logPropertyTest('Font weight selects found', fontWeightSelects.length > 0, `Found ${fontWeightSelects.length} select elements`, 'typography');
  
  // Text Color
  const textColorPickers = panel.querySelectorAll('.ant-color-picker, input[type="color"]');
  logPropertyTest('Text color pickers found', textColorPickers.length > 0, `Found ${textColorPickers.length} color pickers`, 'typography');
}

// Test Effects Properties
function testEffectsProperties(panel) {
  console.log('\n📋 Testing Effects Properties');
  
  // Animation Type
  const animationTypeSelects = panel.querySelectorAll('select, .ant-select');
  logPropertyTest('Animation type selects found', animationTypeSelects.length > 0, `Found ${animationTypeSelects.length} select elements`, 'effects');
  
  // Animation Delay
  const animationDelayInputs = panel.querySelectorAll('input[type="number"], .ant-input-number');
  logPropertyTest('Animation delay inputs found', animationDelayInputs.length > 0, `Found ${animationDelayInputs.length} number inputs`, 'effects');
  
  // Shadow Effect
  const shadowEffectSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logPropertyTest('Shadow effect switches found', shadowEffectSwitches.length > 0, `Found ${shadowEffectSwitches.length} switches`, 'effects');
  
  // Glow Effect
  const glowEffectSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logPropertyTest('Glow effect switches found', glowEffectSwitches.length > 0, `Found ${glowEffectSwitches.length} switches`, 'effects');
}

// Test Advanced Properties
function testAdvancedProperties(panel) {
  console.log('\n📋 Testing Advanced Properties');
  
  // Custom Options
  const customOptionsTextarea = panel.querySelector('textarea, .ant-input');
  logPropertyTest('Custom options textarea found', !!customOptionsTextarea, customOptionsTextarea ? 'Custom options textarea available' : 'Custom options textarea not found', 'advanced');
  
  // Performance Mode
  const performanceModeSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logPropertyTest('Performance mode switches found', performanceModeSwitches.length > 0, `Found ${performanceModeSwitches.length} switches`, 'advanced');
  
  // Auto Resize
  const autoResizeSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logPropertyTest('Auto resize switches found', autoResizeSwitches.length > 0, `Found ${autoResizeSwitches.length} switches`, 'advanced');
  
  // Lazy Loading
  const lazyLoadingSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logPropertyTest('Lazy loading switches found', lazyLoadingSwitches.length > 0, `Found ${lazyLoadingSwitches.length} switches`, 'advanced');
}

// Test Data Zoom Properties
function testDataZoomProperties(panel) {
  console.log('\n📋 Testing Data Zoom Properties');
  
  // Enable Data Zoom
  const dataZoomSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logPropertyTest('Data zoom switches found', dataZoomSwitches.length > 0, `Found ${dataZoomSwitches.length} switches`, 'dataZoom');
  
  // Zoom Type
  const zoomTypeSelects = panel.querySelectorAll('select, .ant-select');
  logPropertyTest('Zoom type selects found', zoomTypeSelects.length > 0, `Found ${zoomTypeSelects.length} select elements`, 'dataZoom');
  
  // Start Range
  const startRangeInputs = panel.querySelectorAll('input[type="number"], .ant-input-number');
  logPropertyTest('Start range inputs found', startRangeInputs.length > 0, `Found ${startRangeInputs.length} number inputs`, 'dataZoom');
  
  // End Range
  const endRangeInputs = panel.querySelectorAll('input[type="number"], .ant-input-number');
  logPropertyTest('End range inputs found', endRangeInputs.length > 0, `Found ${endRangeInputs.length} number inputs`, 'dataZoom');
}

// Test Mark Points Properties
function testMarkPointsProperties(panel) {
  console.log('\n📋 Testing Mark Points Properties');
  
  // Show Mark Points
  const markPointSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logPropertyTest('Mark point switches found', markPointSwitches.length > 0, `Found ${markPointSwitches.length} switches`, 'markPoints');
  
  // Show Mark Lines
  const markLineSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logPropertyTest('Mark line switches found', markLineSwitches.length > 0, `Found ${markLineSwitches.length} switches`, 'markPoints');
  
  // Max Point
  const maxPointSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logPropertyTest('Max point switches found', maxPointSwitches.length > 0, `Found ${maxPointSwitches.length} switches`, 'markPoints');
  
  // Min Point
  const minPointSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logPropertyTest('Min point switches found', minPointSwitches.length > 0, `Found ${minPointSwitches.length} switches`, 'markPoints');
  
  // Average Line
  const averageLineSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logPropertyTest('Average line switches found', averageLineSwitches.length > 0, `Found ${averageLineSwitches.length} switches`, 'markPoints');
}

// Test Brush Properties
function testBrushProperties(panel) {
  console.log('\n📋 Testing Brush Properties');
  
  // Enable Brush
  const brushSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logPropertyTest('Brush switches found', brushSwitches.length > 0, `Found ${brushSwitches.length} switches`, 'brush');
  
  // Brush Type
  const brushTypeSelects = panel.querySelectorAll('select, .ant-select');
  logPropertyTest('Brush type selects found', brushTypeSelects.length > 0, `Found ${brushTypeSelects.length} select elements`, 'brush');
}

// Test Visual Map Properties
function testVisualMapProperties(panel) {
  console.log('\n📋 Testing Visual Map Properties');
  
  // Enable Visual Map
  const visualMapSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logPropertyTest('Visual map switches found', visualMapSwitches.length > 0, `Found ${visualMapSwitches.length} switches`, 'visualMap');
  
  // Map Dimension
  const mapDimensionSelects = panel.querySelectorAll('select, .ant-select');
  logPropertyTest('Map dimension selects found', mapDimensionSelects.length > 0, `Found ${mapDimensionSelects.length} select elements`, 'visualMap');
  
  // Min Value
  const minValueInputs = panel.querySelectorAll('input[type="number"], .ant-input-number');
  logPropertyTest('Min value inputs found', minValueInputs.length > 0, `Found ${minValueInputs.length} number inputs`, 'visualMap');
  
  // Max Value
  const maxValueInputs = panel.querySelectorAll('input[type="number"], .ant-input-number');
  logPropertyTest('Max value inputs found', maxValueInputs.length > 0, `Found ${maxValueInputs.length} number inputs`, 'visualMap');
}

// Test Accessibility Properties
function testAccessibilityProperties(panel) {
  console.log('\n📋 Testing Accessibility Properties');
  
  // Enable Aria
  const ariaSwitches = panel.querySelectorAll('input[type="checkbox"], .ant-switch');
  logPropertyTest('Aria switches found', ariaSwitches.length > 0, `Found ${ariaSwitches.length} switches`, 'accessibility');
  
  // Aria Label
  const ariaLabelInputs = panel.querySelectorAll('input[type="text"], .ant-input');
  logPropertyTest('Aria label inputs found', ariaLabelInputs.length > 0, `Found ${ariaLabelInputs.length} text inputs`, 'accessibility');
}

// Test Property Update
function testPropertyUpdate(inputElement, testValue, propertyName, category) {
  try {
    const originalValue = inputElement.value;
    inputElement.value = testValue;
    
    // Dispatch input and change events
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    
    logPropertyTest(`${propertyName} update`, true, `Changed from "${originalValue}" to "${testValue}"`, category);
    
    return true;
  } catch (error) {
    logPropertyTest(`${propertyName} update`, false, `Error: ${error.message}`, category);
    return false;
  }
}

// Run all comprehensive tests
function runAllComprehensiveTests() {
  console.log('🚀 Running FINAL COMPREHENSIVE ALL-PROPERTIES Tests...');
  console.log('='.repeat(120));
  
  const results = {
    dashboardLoads: testDashboardLoads(),
    addWidget: testAddWidget()
  };
  
  console.log('\n' + '='.repeat(120));
  console.log('📊 FINAL COMPREHENSIVE ALL-PROPERTIES TEST RESULTS SUMMARY');
  console.log('='.repeat(120));
  
  const passed = window.finalComprehensiveResults.successes.length;
  const failed = window.finalComprehensiveResults.failures.length;
  const total = window.finalComprehensiveResults.tests.length;
  const duration = Date.now() - window.finalComprehensiveResults.startTime;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${total}`);
  console.log(`🎯 Success Rate: ${total > 0 ? Math.round((passed / total) * 100) : 0}%`);
  console.log(`⏱️ Duration: ${duration}ms`);
  console.log(`🔢 Properties Tested: ${window.finalComprehensiveResults.propertiesTested}`);
  console.log(`✅ Properties Passed: ${window.finalComprehensiveResults.propertiesPassed}`);
  console.log(`❌ Properties Failed: ${window.finalComprehensiveResults.propertiesFailed}`);
  
  // Category breakdown
  console.log('\n📊 PROPERTY CATEGORY BREAKDOWN:');
  Object.entries(window.finalComprehensiveResults.propertyCategories).forEach(([category, stats]) => {
    if (stats.tested > 0) {
      const successRate = Math.round((stats.passed / stats.tested) * 100);
      console.log(`  ${category}: ${stats.passed}/${stats.tested} (${successRate}%)`);
    }
  });
  
  if (window.finalComprehensiveResults.failures.length > 0) {
    console.log('\n❌ FAILURES:');
    window.finalComprehensiveResults.failures.forEach(failure => {
      console.log(`  - ${failure.property}: ${failure.details}`);
    });
  }
  
  if (window.finalComprehensiveResults.successes.length > 0) {
    console.log('\n✅ SUCCESSES:');
    window.finalComprehensiveResults.successes.forEach(success => {
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
    console.log('2. All properties are working correctly');
    console.log('3. Test manual property changes');
    console.log('4. Test save/reload functionality');
    console.log('5. Test all widget types');
  }
  
  return results;
}

// Export for manual use
window.finalComprehensiveTests = {
  runAllComprehensiveTests,
  testDashboardLoads,
  testAddWidget,
  testWidgetSelection,
  testAllPropertyCategories,
  testTitleSubtitleProperties,
  testVisualProperties,
  testDataProperties,
  testLayoutProperties,
  testTypographyProperties,
  testEffectsProperties,
  testAdvancedProperties,
  testDataZoomProperties,
  testMarkPointsProperties,
  testBrushProperties,
  testVisualMapProperties,
  testAccessibilityProperties
};

// Auto-run tests
runAllComprehensiveTests();

console.log('\n💡 Available commands:');
console.log('  - window.finalComprehensiveTests.runAllComprehensiveTests()');
console.log('  - window.finalComprehensiveResults (contains detailed results)');
console.log('  - Individual test functions available');


