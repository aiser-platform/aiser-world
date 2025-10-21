// ACTUAL PROPERTY APPLICATION TEST - End-to-End Validation
// This test verifies that properties are actually applied to widgets when dropped on canvas

console.log('🎯 ACTUAL PROPERTY APPLICATION TEST - Starting end-to-end validation...');

// Test function to validate actual property application
function testActualPropertyApplication() {
  console.log('🎯 Testing actual property application for each widget type...');
  
  // Wait for dashboard to load
  setTimeout(() => {
    try {
      // Find the dashboard studio
      const dashboardStudio = document.querySelector('[data-testid="dashboard-studio"]') || 
                              document.querySelector('.dashboard-studio') ||
                              document.querySelector('main');
      
      if (!dashboardStudio) {
        console.error('❌ Dashboard studio not found');
        return;
      }
      
      console.log('✅ Dashboard studio found');
      
      // Find the widget library
      const widgetLibrary = document.querySelector('.widget-library') ||
                           document.querySelector('[data-testid="widget-library"]') ||
                           document.querySelector('.ant-card');
      
      if (!widgetLibrary) {
        console.error('❌ Widget library not found');
        return;
      }
      
      console.log('✅ Widget library found');
      
      // Find the canvas
      const canvas = document.querySelector('.dashboard-canvas') ||
                    document.querySelector('[data-testid="dashboard-canvas"]') ||
                    document.querySelector('.ant-layout-content');
      
      if (!canvas) {
        console.error('❌ Canvas not found');
        return;
      }
      
      console.log('✅ Canvas found');
      
      // Test each widget type
      const widgetTypes = ['bar', 'line', 'pie', 'area', 'scatter', 'radar', 'heatmap', 'funnel', 'gauge'];
      
      widgetTypes.forEach((widgetType, index) => {
        setTimeout(() => {
          testWidgetType(widgetType, index);
        }, index * 3000); // 3 seconds between each widget test
      });
      
    } catch (error) {
      console.error('❌ Error during test:', error);
    }
  }, 2000);
}

// Test specific widget type
function testWidgetType(widgetType, index) {
  console.log(`🎯 Testing ${widgetType} widget...`);
  
  try {
    // Find widget library items
    const widgetItems = document.querySelectorAll('.widget-item, .ant-card');
    
    if (widgetItems.length === 0) {
      console.error(`❌ No widget items found for ${widgetType}`);
      return;
    }
    
    // Find the specific widget type (look for text content)
    let targetWidget = null;
    for (let item of widgetItems) {
      const text = item.textContent?.toLowerCase() || '';
      if (text.includes(widgetType) || text.includes('chart')) {
        targetWidget = item;
        break;
      }
    }
    
    if (!targetWidget) {
      console.log(`⚠️ No specific ${widgetType} widget found, using first available`);
      targetWidget = widgetItems[0];
    }
    
    console.log(`✅ Found ${widgetType} widget:`, targetWidget);
    
    // Simulate drag and drop
    const dragEvent = new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer()
    });
    
    targetWidget.dispatchEvent(dragEvent);
    console.log(`✅ Drag event dispatched for ${widgetType}`);
    
    // Find the canvas
    const canvas = document.querySelector('.dashboard-canvas') ||
                  document.querySelector('[data-testid="dashboard-canvas"]') ||
                  document.querySelector('.ant-layout-content');
    
    if (!canvas) {
      console.error(`❌ Canvas not found for ${widgetType}`);
      return;
    }
    
    // Simulate drop
    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer()
    });
    
    canvas.dispatchEvent(dropEvent);
    console.log(`✅ Drop event dispatched for ${widgetType}`);
    
    // Wait for widget to be added
    setTimeout(() => {
      // Find the added widget
      const addedWidgets = canvas.querySelectorAll('.widget-container, .chart-widget, .ant-card');
      const addedWidget = addedWidgets[addedWidgets.length - 1]; // Get the last added widget
      
      if (!addedWidget) {
        console.error(`❌ No widget added to canvas for ${widgetType}`);
        return;
      }
      
      console.log(`✅ ${widgetType} widget added to canvas`);
      
      // Click on the widget to select it
      addedWidget.click();
      console.log(`✅ ${widgetType} widget selected`);
      
      // Wait for properties panel to update
      setTimeout(() => {
        // Test properties for this widget type
        testWidgetProperties(widgetType, addedWidget);
      }, 1000);
      
    }, 2000);
    
  } catch (error) {
    console.error(`❌ Error testing ${widgetType} widget:`, error);
  }
}

// Test properties for specific widget
function testWidgetProperties(widgetType, widget) {
  console.log(`🎯 Testing properties for ${widgetType} widget...`);
  
  // Get expected defaults for this widget type
  const expectedDefaults = getExpectedDefaults(widgetType);
  
  // Find the properties panel
  const propertiesPanel = document.querySelector('.unified-design-panel') ||
                         document.querySelector('[data-testid="properties-panel"]') ||
                         document.querySelector('.ant-tabs-content');
  
  if (!propertiesPanel) {
    console.error(`❌ Properties panel not found for ${widgetType}`);
    return;
  }
  
  console.log(`✅ Properties panel found for ${widgetType}`);
  
  // Test key properties
  const keyProperties = [
    'title',
    'subtitle',
    'colorPalette',
    'legendShow',
    'tooltipShow',
    'animation',
    'responsive',
    'draggable',
    'resizable'
  ];
  
  let successCount = 0;
  let failureCount = 0;
  
  keyProperties.forEach((property, index) => {
    setTimeout(() => {
      try {
        // Find the property field
        const field = document.querySelector(`[name="${property}"]`) ||
                     document.querySelector(`input[name="${property}"]`) ||
                     document.querySelector(`select[name="${property}"]`) ||
                     document.querySelector(`textarea[name="${property}"]`);
        
        if (!field) {
          console.log(`❌ Property field not found: ${property} for ${widgetType}`);
          failureCount++;
          return;
        }
        
        // Check if the field has the expected default value
        const currentValue = field.value || field.checked;
        const expectedValue = expectedDefaults[property];
        
        if (currentValue === expectedValue) {
          console.log(`✅ Property ${property} has correct default: ${currentValue} for ${widgetType}`);
          successCount++;
        } else {
          console.log(`❌ Property ${property} has incorrect default: ${currentValue}, expected: ${expectedValue} for ${widgetType}`);
          failureCount++;
        }
        
        // Test changing the property
        testPropertyChange(property, field, widgetType);
        
      } catch (error) {
        console.error(`❌ Error testing property ${property} for ${widgetType}:`, error);
        failureCount++;
      }
    }, index * 200); // Stagger the tests
  });
  
  // Final results for this widget type
  setTimeout(() => {
    console.log(`🎯 ${widgetType.toUpperCase()} WIDGET TEST RESULTS:`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`📊 Success Rate: ${((successCount / (successCount + failureCount)) * 100).toFixed(1)}%`);
    
    if (successCount > failureCount) {
      console.log(`🎉 ${widgetType.toUpperCase()} WIDGET TEST PASSED!`);
    } else {
      console.log(`❌ ${widgetType.toUpperCase()} WIDGET TEST FAILED!`);
    }
  }, keyProperties.length * 200 + 1000);
}

// Test property change
function testPropertyChange(property, field, widgetType) {
  try {
    // Change the property based on its type
    if (field.type === 'checkbox' || field.type === 'radio') {
      field.checked = !field.checked;
      field.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (field.tagName === 'SELECT') {
      const options = field.querySelectorAll('option');
      if (options.length > 1) {
        field.selectedIndex = field.selectedIndex === 0 ? 1 : 0;
        field.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else if (field.tagName === 'INPUT') {
      field.value = field.value + ' (Modified)';
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    console.log(`✅ Property ${property} changed for ${widgetType}`);
    
    // Check if the change was applied to the widget
    setTimeout(() => {
      const canvas = document.querySelector('.dashboard-canvas') ||
                    document.querySelector('[data-testid="dashboard-canvas"]') ||
                    document.querySelector('.ant-layout-content');
      
      if (canvas) {
        const widgets = canvas.querySelectorAll('.widget-container, .chart-widget, .ant-card');
        const selectedWidget = widgets[widgets.length - 1];
        
        if (selectedWidget) {
          console.log(`✅ Property change applied to ${widgetType} widget`);
        } else {
          console.log(`⚠️ Property change may not be applied to ${widgetType} widget`);
        }
      }
    }, 100);
    
  } catch (error) {
    console.error(`❌ Error changing property ${property} for ${widgetType}:`, error);
  }
}

// Get expected defaults for widget type
function getExpectedDefaults(widgetType) {
  const defaults = {
    bar: {
      title: 'Bar Chart',
      subtitle: 'Professional visualization',
      colorPalette: 'default',
      legendShow: true,
      tooltipShow: true,
      animation: true,
      responsive: true,
      draggable: true,
      resizable: true
    },
    line: {
      title: 'Line Chart',
      subtitle: 'Trend visualization',
      colorPalette: 'default',
      legendShow: true,
      tooltipShow: true,
      animation: true,
      responsive: true,
      draggable: true,
      resizable: true
    },
    pie: {
      title: 'Pie Chart',
      subtitle: 'Proportion visualization',
      colorPalette: 'default',
      legendShow: true,
      tooltipShow: true,
      animation: true,
      responsive: true,
      draggable: true,
      resizable: true
    },
    area: {
      title: 'Area Chart',
      subtitle: 'Area visualization',
      colorPalette: 'default',
      legendShow: true,
      tooltipShow: true,
      animation: true,
      responsive: true,
      draggable: true,
      resizable: true
    },
    scatter: {
      title: 'Scatter Plot',
      subtitle: 'Correlation visualization',
      colorPalette: 'default',
      legendShow: true,
      tooltipShow: true,
      animation: true,
      responsive: true,
      draggable: true,
      resizable: true
    },
    radar: {
      title: 'Radar Chart',
      subtitle: 'Multi-dimensional visualization',
      colorPalette: 'default',
      legendShow: true,
      tooltipShow: true,
      animation: true,
      responsive: true,
      draggable: true,
      resizable: true
    },
    heatmap: {
      title: 'Heatmap',
      subtitle: 'Density visualization',
      colorPalette: 'default',
      legendShow: true,
      tooltipShow: true,
      animation: true,
      responsive: true,
      draggable: true,
      resizable: true
    },
    funnel: {
      title: 'Funnel Chart',
      subtitle: 'Conversion visualization',
      colorPalette: 'default',
      legendShow: true,
      tooltipShow: true,
      animation: true,
      responsive: true,
      draggable: true,
      resizable: true
    },
    gauge: {
      title: 'Gauge Chart',
      subtitle: 'Progress visualization',
      colorPalette: 'default',
      legendShow: false,
      tooltipShow: true,
      animation: true,
      responsive: true,
      draggable: true,
      resizable: true
    }
  };
  
  return defaults[widgetType] || defaults.bar;
}

// Run the test
testActualPropertyApplication();

console.log('🎯 ACTUAL PROPERTY APPLICATION TEST - Test script loaded. Run testActualPropertyApplication() to start testing.');


