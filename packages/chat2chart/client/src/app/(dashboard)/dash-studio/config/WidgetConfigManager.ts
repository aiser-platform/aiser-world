// SINGLE SOURCE OF TRUTH: Widget Configuration System
// This file consolidates all widget defaults, types, and configuration logic

export interface WidgetType {
  id: string;
  name: string;
  category: 'chart' | 'metric' | 'table' | 'text' | 'image' | 'filter';
  icon: string;
  description: string;
  defaultSize: { w: number; h: number };
  defaultConfig: Record<string, any>;
  configSchema: Record<string, any>;
}

// SINGLE SOURCE: Widget Type Definitions
export const WIDGET_TYPES: Record<string, WidgetType> = {
  bar: {
    id: 'bar',
    name: 'Bar Chart',
    category: 'chart',
    icon: 'BarChartOutlined',
    description: 'Compare values across categories',
    defaultSize: { w: 6, h: 4 },
    defaultConfig: {
      // Chart Configuration
      chartType: 'bar',
      showTitle: true,
      showSubtitle: true,
      title: 'Bar Chart',
      subtitle: 'Professional visualization',
      
      // Visual Configuration
      colorPalette: 'default',
      theme: 'auto',
      legend: { show: true, position: 'top', orient: 'horizontal' },
      tooltip: { show: true, trigger: 'axis' },
      animation: { enabled: true, duration: 1000 },
      
      // Data Configuration
      xAxis: { show: true, name: 'Category', type: 'category' },
      yAxis: { show: true, name: 'Value', type: 'value' },
      seriesLabel: { show: false, position: 'top' },
      dataLabels: { show: false },
      
      // Layout & Style
      responsive: true,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      padding: 16,
      margin: 8,
      
      // Typography
      fontFamily: 'Arial',
      fontSize: 12,
      fontWeight: 'normal',
      textColor: '#000000',
      
      // Effects
      shadowEffect: false,
      glowEffect: false,
      
      // Advanced
      performanceMode: false,
      autoResize: true,
      lazyLoading: false
    },
    configSchema: {
      title: { type: 'string', label: 'Title', required: true },
      subtitle: { type: 'string', label: 'Subtitle', required: false },
      colorPalette: { type: 'select', label: 'Color Palette', options: ['default', 'vibrant', 'pastel', 'monochrome'] },
      legend: { type: 'object', label: 'Legend Settings' },
      tooltip: { type: 'object', label: 'Tooltip Settings' },
      animation: { type: 'object', label: 'Animation Settings' }
    }
  },
  
  line: {
    id: 'line',
    name: 'Line Chart',
    category: 'chart',
    icon: 'LineChartOutlined',
    description: 'Show trends over time',
    defaultSize: { w: 6, h: 4 },
    defaultConfig: {
      chartType: 'line',
      showTitle: true,
      showSubtitle: true,
      title: 'Line Chart',
      subtitle: 'Trend visualization',
      
      colorPalette: 'default',
      theme: 'auto',
      legend: { show: true, position: 'top', orient: 'horizontal' },
      tooltip: { show: true, trigger: 'axis' },
      animation: { enabled: true, duration: 1000 },
      
      xAxis: { show: true, name: 'Time', type: 'category' },
      yAxis: { show: true, name: 'Value', type: 'value' },
      seriesLabel: { show: false, position: 'top' },
      dataLabels: { show: false },
      
      responsive: true,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      padding: 16,
      margin: 8,
      
      fontFamily: 'Arial',
      fontSize: 12,
      fontWeight: 'normal',
      textColor: '#000000',
      
      shadowEffect: false,
      glowEffect: false,
      
      performanceMode: false,
      autoResize: true,
      lazyLoading: false
    },
    configSchema: {
      title: { type: 'string', label: 'Title', required: true },
      subtitle: { type: 'string', label: 'Subtitle', required: false },
      colorPalette: { type: 'select', label: 'Color Palette', options: ['default', 'vibrant', 'pastel', 'monochrome'] },
      legend: { type: 'object', label: 'Legend Settings' },
      tooltip: { type: 'object', label: 'Tooltip Settings' },
      animation: { type: 'object', label: 'Animation Settings' }
    }
  },
  
  pie: {
    id: 'pie',
    name: 'Pie Chart',
    category: 'chart',
    icon: 'PieChartOutlined',
    description: 'Show parts of a whole',
    defaultSize: { w: 4, h: 4 },
    defaultConfig: {
      chartType: 'pie',
      showTitle: true,
      showSubtitle: true,
      title: 'Pie Chart',
      subtitle: 'Proportional visualization',
      
      colorPalette: 'default',
      theme: 'auto',
      legend: { show: true, position: 'right', orient: 'vertical' },
      tooltip: { show: true, trigger: 'item' },
      animation: { enabled: true, duration: 1000 },
      
      seriesLabel: { show: true, position: 'outside' },
      dataLabels: { show: true },
      
      responsive: true,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      padding: 16,
      margin: 8,
      
      fontFamily: 'Arial',
      fontSize: 12,
      fontWeight: 'normal',
      textColor: '#000000',
      
      shadowEffect: false,
      glowEffect: false,
      
      performanceMode: false,
      autoResize: true,
      lazyLoading: false
    },
    configSchema: {
      title: { type: 'string', label: 'Title', required: true },
      subtitle: { type: 'string', label: 'Subtitle', required: false },
      colorPalette: { type: 'select', label: 'Color Palette', options: ['default', 'vibrant', 'pastel', 'monochrome'] },
      legend: { type: 'object', label: 'Legend Settings' },
      tooltip: { type: 'object', label: 'Tooltip Settings' },
      animation: { type: 'object', label: 'Animation Settings' }
    }
  },
  
  radar: {
    id: 'radar',
    name: 'Radar Chart',
    category: 'chart',
    icon: 'RadarChartOutlined',
    description: 'Multi-dimensional analysis',
    defaultSize: { w: 6, h: 6 },
    defaultConfig: {
      chartType: 'radar',
      showTitle: true,
      showSubtitle: true,
      title: 'Radar Chart',
      subtitle: 'Multi-dimensional visualization',
      
      colorPalette: 'default',
      theme: 'auto',
      legend: { show: true, position: 'top', orient: 'horizontal' },
      tooltip: { show: true, trigger: 'item' },
      animation: { enabled: true, duration: 1000 },
      
      seriesLabel: { show: false, position: 'top' },
      dataLabels: { show: false },
      
      responsive: true,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      padding: 16,
      margin: 8,
      
      fontFamily: 'Arial',
      fontSize: 12,
      fontWeight: 'normal',
      textColor: '#000000',
      
      shadowEffect: false,
      glowEffect: false,
      
      performanceMode: false,
      autoResize: true,
      lazyLoading: false
    },
    configSchema: {
      title: { type: 'string', label: 'Title', required: true },
      subtitle: { type: 'string', label: 'Subtitle', required: false },
      colorPalette: { type: 'select', label: 'Color Palette', options: ['default', 'vibrant', 'pastel', 'monochrome'] },
      legend: { type: 'object', label: 'Legend Settings' },
      tooltip: { type: 'object', label: 'Tooltip Settings' },
      animation: { type: 'object', label: 'Animation Settings' }
    }
  },
  
  gauge: {
    id: 'gauge',
    name: 'Gauge Chart',
    category: 'chart',
    icon: 'DashboardOutlined',
    description: 'Progress and performance metrics',
    defaultSize: { w: 4, h: 3 },
    defaultConfig: {
      chartType: 'gauge',
      showTitle: true,
      showSubtitle: true,
      title: 'Gauge Chart',
      subtitle: 'Progress visualization',
      
      colorPalette: 'default',
      theme: 'auto',
      legend: { show: true, position: 'top', orient: 'horizontal' },
      tooltip: { show: true, trigger: 'item' },
      animation: { enabled: true, duration: 1000 },
      
      seriesLabel: { show: true, position: 'center' },
      dataLabels: { show: true },
      
      responsive: true,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      padding: 16,
      margin: 8,
      
      fontFamily: 'Arial',
      fontSize: 12,
      fontWeight: 'normal',
      textColor: '#000000',
      
      shadowEffect: false,
      glowEffect: false,
      
      performanceMode: false,
      autoResize: true,
      lazyLoading: false
    },
    configSchema: {
      title: { type: 'string', label: 'Title', required: true },
      subtitle: { type: 'string', label: 'Subtitle', required: false },
      colorPalette: { type: 'select', label: 'Color Palette', options: ['default', 'vibrant', 'pastel', 'monochrome'] },
      legend: { type: 'object', label: 'Legend Settings' },
      tooltip: { type: 'object', label: 'Tooltip Settings' },
      animation: { type: 'object', label: 'Animation Settings' }
    }
  },
  
  area: {
    id: 'area',
    name: 'Area Chart',
    category: 'chart',
    icon: 'AreaChartOutlined',
    description: 'Display cumulative data',
    defaultSize: { w: 6, h: 4 },
    defaultConfig: {
      chartType: 'area',
      showTitle: true,
      showSubtitle: true,
      title: 'Area Chart',
      subtitle: 'Cumulative visualization',
      
      colorPalette: 'default',
      theme: 'auto',
      legend: { show: true, position: 'top', orient: 'horizontal' },
      tooltip: { show: true, trigger: 'axis' },
      animation: { enabled: true, duration: 1000 },
      
      xAxis: { show: true, name: 'Category', type: 'category' },
      yAxis: { show: true, name: 'Value', type: 'value' },
      seriesLabel: { show: false, position: 'top' },
      dataLabels: { show: false },
      
      responsive: true,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      padding: 16,
      margin: 8,
      
      fontFamily: 'Arial',
      fontSize: 12,
      fontWeight: 'normal',
      textColor: '#000000',
      
      shadowEffect: false,
      glowEffect: false,
      
      performanceMode: false,
      autoResize: true,
      lazyLoading: false
    },
    configSchema: {
      title: { type: 'string', label: 'Title', required: true },
      subtitle: { type: 'string', label: 'Subtitle', required: false },
      colorPalette: { type: 'select', label: 'Color Palette', options: ['default', 'vibrant', 'pastel', 'monochrome'] },
      legend: { type: 'object', label: 'Legend Settings' },
      tooltip: { type: 'object', label: 'Tooltip Settings' },
      animation: { type: 'object', label: 'Animation Settings' }
    }
  },
  
  scatter: {
    id: 'scatter',
    name: 'Scatter Plot',
    category: 'chart',
    icon: 'DotChartOutlined',
    description: 'Show correlation between variables',
    defaultSize: { w: 6, h: 4 },
    defaultConfig: {
      chartType: 'scatter',
      showTitle: true,
      showSubtitle: true,
      title: 'Scatter Plot',
      subtitle: 'Correlation visualization',
      
      colorPalette: 'default',
      theme: 'auto',
      legend: { show: true, position: 'top', orient: 'horizontal' },
      tooltip: { show: true, trigger: 'item' },
      animation: { enabled: true, duration: 1000 },
      
      xAxis: { show: true, name: 'X Axis', type: 'value' },
      yAxis: { show: true, name: 'Y Axis', type: 'value' },
      seriesLabel: { show: false, position: 'top' },
      dataLabels: { show: false },
      
      responsive: true,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      padding: 16,
      margin: 8,
      
      fontFamily: 'Arial',
      fontSize: 12,
      fontWeight: 'normal',
      textColor: '#000000',
      
      shadowEffect: false,
      glowEffect: false,
      
      performanceMode: false,
      autoResize: true,
      lazyLoading: false
    },
    configSchema: {
      title: { type: 'string', label: 'Title', required: true },
      subtitle: { type: 'string', label: 'Subtitle', required: false },
      colorPalette: { type: 'select', label: 'Color Palette', options: ['default', 'vibrant', 'pastel', 'monochrome'] },
      legend: { type: 'object', label: 'Legend Settings' },
      tooltip: { type: 'object', label: 'Tooltip Settings' },
      animation: { type: 'object', label: 'Animation Settings' }
    }
  }
};

// SINGLE SOURCE: Widget Configuration Manager
export class WidgetConfigManager {
  private static instance: WidgetConfigManager;
  
  static getInstance(): WidgetConfigManager {
    if (!WidgetConfigManager.instance) {
      WidgetConfigManager.instance = new WidgetConfigManager();
    }
    return WidgetConfigManager.instance;
  }
  
  // Get widget type definition
  getWidgetType(typeId: string): WidgetType | null {
    return WIDGET_TYPES[typeId] || null;
  }
  
  // Get default configuration for widget type
  getDefaultConfig(typeId: string): Record<string, any> {
    const widgetType = this.getWidgetType(typeId);
    return widgetType ? { ...widgetType.defaultConfig } : {};
  }
  
  // Get default size for widget type
  getDefaultSize(typeId: string): { w: number; h: number } {
    const widgetType = this.getWidgetType(typeId);
    return widgetType ? { ...widgetType.defaultSize } : { w: 4, h: 3 };
  }
  
  // Create new widget with proper defaults
  createWidget(typeId: string, position: { x: number; y: number }): any {
    const widgetType = this.getWidgetType(typeId);
    if (!widgetType) {
      throw new Error(`Unknown widget type: ${typeId}`);
    }
    
    const defaultSize = this.getDefaultSize(typeId);
    const defaultConfig = this.getDefaultConfig(typeId);
    
    return {
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: typeId,
      title: defaultConfig.title || widgetType.name,
      subtitle: defaultConfig.subtitle || '',
      position: {
        x: position.x,
        y: position.y,
        w: defaultSize.w,
        h: defaultSize.h
      },
      config: { ...defaultConfig },
      data: null,
      isVisible: true,
      isLocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
  
  // Validate widget configuration
  validateConfig(typeId: string, config: Record<string, any>): { valid: boolean; errors: string[] } {
    const widgetType = this.getWidgetType(typeId);
    if (!widgetType) {
      return { valid: false, errors: [`Unknown widget type: ${typeId}`] };
    }
    
    const errors: string[] = [];
    const schema = widgetType.configSchema;
    
    // Validate required fields
    Object.entries(schema).forEach(([key, fieldSchema]: [string, any]) => {
      if (fieldSchema.required && !config[key]) {
        errors.push(`Required field '${key}' is missing`);
      }
    });
    
    return { valid: errors.length === 0, errors };
  }
  
  // Merge configuration updates
  mergeConfig(currentConfig: Record<string, any>, updates: Record<string, any>): Record<string, any> {
    const merged = { ...currentConfig };
    
    Object.entries(updates).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        merged[key] = { ...(merged[key] || {}), ...value };
      } else {
        merged[key] = value;
      }
    });
    
    return merged;
  }
  
  // Get all available widget types
  getAllWidgetTypes(): WidgetType[] {
    return Object.values(WIDGET_TYPES);
  }
  
  // Get widget types by category
  getWidgetTypesByCategory(category: string): WidgetType[] {
    return Object.values(WIDGET_TYPES).filter(widget => widget.category === category);
  }
}

// Export singleton instance
export const widgetConfigManager = WidgetConfigManager.getInstance();
