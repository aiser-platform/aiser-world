'use client';

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { EChartsOption } from 'echarts';

// Configuration complexity levels
export type ConfigLevel = 'basic' | 'standard' | 'advanced';

// Core configuration interfaces - Enhanced to match comprehensive ECharts config
export interface BasicChartConfig {
  chartType: string;
  title: {
    text: string;
    subtext?: string;
    left?: 'left' | 'center' | 'right';
    textStyle?: {
      color?: string;
      fontSize?: number;
      fontFamily?: string;
    };
    subtextStyle?: {
      color?: string;
      fontSize?: number;
      fontFamily?: string;
    };
  };
  tooltip: {
    trigger?: 'axis' | 'item' | 'none';
    backgroundColor?: string;
    borderColor?: string;
    textStyle?: {
      color?: string;
    };
  };
  legend: {
    data?: string[];
    top?: number | string;
    bottom?: number | string;
    left?: number | string;
    right?: number | string;
    orient?: 'horizontal' | 'vertical';
    show?: boolean;
    textStyle?: {
      color?: string;
      fontSize?: number;
    };
  };
  color: string[];
  animation?: boolean | {
    show?: boolean;
    duration?: number;
    easing?: 'linear' | 'quadraticIn' | 'quadraticOut' | 'quadraticInOut' | 'cubicIn' | 'cubicOut' | 'cubicInOut' | 'quarticIn' | 'quarticOut' | 'quarticInOut' | 'quinticIn' | 'quinticOut' | 'quinticInOut' | 'sinusoidalIn' | 'sinusoidalOut' | 'sinusoidalInOut' | 'exponentialIn' | 'exponentialOut' | 'exponentialInOut' | 'circularIn' | 'circularOut' | 'circularInOut' | 'elasticIn' | 'elasticOut' | 'elasticInOut' | 'backIn' | 'backOut' | 'backInOut' | 'bounceIn' | 'bounceOut' | 'bounceInOut';
    delay?: number;
  };
  grid: {
    top?: number | string;
    right?: number | string;
    bottom?: number | string;
    left?: number | string;
    backgroundColor?: string;
    show?: boolean;
    containLabel?: boolean;
  };
  xAxis: {
    type?: 'category' | 'value' | 'time' | 'log';
    data?: any[];
    axisLine?: {
      show?: boolean;
      lineStyle?: {
        color?: string;
      };
    };
    axisTick?: {
      show?: boolean;
    };
    axisLabel?: {
      show?: boolean;
      color?: string;
      fontSize?: number;
      fontFamily?: string;
    };
    splitLine?: {
      show?: boolean;
      lineStyle?: {
        color?: string;
      };
    };
  };
  yAxis: {
    type?: 'category' | 'value' | 'time' | 'log';
    axisLine?: {
      show?: boolean;
      lineStyle?: {
        color?: string;
      };
    };
    axisTick?: {
      show?: boolean;
    };
    axisLabel?: {
      show?: boolean;
      color?: string;
      fontSize?: number;
      fontFamily?: string;
    };
    splitLine?: {
      show?: boolean;
      lineStyle?: {
        color?: string;
      };
    };
  };
  series?: any[];
  dataBinding: {
    xField: string;
    yFields: string[];
    seriesField?: string;
    aggregation?: string;
    dataLimit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

export interface StandardChartConfig extends BasicChartConfig {
  axis?: {
    xAxis: {
      show?: boolean;
      labelRotation?: number;
      labelColor?: string;
      gridLines?: boolean;
    };
    yAxis: {
      show?: boolean;
      labelColor?: string;
      gridLines?: boolean;
      format?: string;
    };
  };
  seriesConfig?: {
    showLabels?: boolean;
    labelPosition?: 'top' | 'bottom' | 'left' | 'right' | 'inside';
    smooth?: boolean;
    areaStyle?: boolean;
    symbolSize?: number;
  };
  gridSpacing?: number;
}

export interface AdvancedChartConfig extends StandardChartConfig {
  animation?: {
    show: boolean;
    duration: number;
    easing: 'linear' | 'quadraticIn' | 'quadraticOut' | 'quadraticInOut' | 'cubicIn' | 'cubicOut' | 'cubicInOut' | 'quarticIn' | 'quarticOut' | 'quarticInOut' | 'quinticIn' | 'quinticOut' | 'quinticInOut' | 'sinusoidalIn' | 'sinusoidalOut' | 'sinusoidalInOut' | 'exponentialIn' | 'exponentialOut' | 'exponentialInOut' | 'circularIn' | 'circularOut' | 'circularInOut' | 'elasticIn' | 'elasticOut' | 'elasticInOut' | 'backIn' | 'backOut' | 'backInOut' | 'bounceIn' | 'bounceOut' | 'bounceInOut';
    delay: number;
  };
  dataZoom?: {
    show: boolean;
    type: 'slider' | 'inside' | 'select';
    start: number;
    end: number;
  };
  toolbox?: {
    show: boolean;
    features: string[];
  };
  customOptions?: Record<string, any>;
}

export interface ChartTemplate {
  id: string;
  name: string;
  category: 'comparison' | 'distribution' | 'trend' | 'correlation' | 'composition' | 'hierarchy';
  thumbnail: string;
  description: string;
  config: Partial<AdvancedChartConfig>;
  dataRequirements: {
    minFields: number;
    maxFields: number;
    fieldTypes: string[];
  };
  useCases: string[];
}

// Configuration state
export interface EChartsConfigState {
  level: ConfigLevel;
  basic: BasicChartConfig;
  standard: StandardChartConfig;
  advanced: AdvancedChartConfig;
  currentTemplate?: ChartTemplate;
  data: any[];
  preview: EChartsOption;
}

// Configuration actions
export type EChartsConfigAction =
  | { type: 'SET_LEVEL'; payload: ConfigLevel }
  | { type: 'UPDATE_BASIC'; payload: Partial<BasicChartConfig> }
  | { type: 'UPDATE_STANDARD'; payload: Partial<StandardChartConfig> }
  | { type: 'UPDATE_ADVANCED'; payload: Partial<AdvancedChartConfig> }
  | { type: 'SET_TEMPLATE'; payload: ChartTemplate }
  | { type: 'SET_DATA'; payload: any[] }
  | { type: 'SET_PREVIEW'; payload: EChartsOption }
  | { type: 'RESET_CONFIG' }
  | { type: 'APPLY_TEMPLATE'; payload: ChartTemplate };

// Smart configuration logic
export class SmartChartConfigurator {
  static suggestChartType(data: any[]): string {
    if (!data || data.length === 0) return 'bar';
    
    const firstRow = data[0];
    const fields = Object.keys(firstRow);
    
    if (fields.length === 2) return 'line';
    if (fields.length === 3) return 'scatter';
    if (fields.length > 3) return 'bar';
    
    return 'bar';
  }

  static generateDefaults(chartType: string, data: any[]): BasicChartConfig {
    const firstRow = data[0] || {};
    const fields = Object.keys(firstRow);
    
    return {
      chartType,
      title: {
        text: `New ${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`,
        subtext: '',
        left: 'center',
        textStyle: {
          color: '#ffffff',
          fontSize: 18,
          fontFamily: 'Arial'
        },
        subtextStyle: {
          color: '#cccccc',
          fontSize: 12.6,
          fontFamily: 'Arial'
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderColor: '#d9d9d9',
        textStyle: {
          color: '#ffffff'
        }
      },
      legend: {
        data: [],
        bottom: 10,
        orient: 'horizontal',
        textStyle: {
          color: '#ffffff',
          fontSize: 12
        }
      },
      color: [
        '#5470c6',
        '#91cc75',
        '#fac858',
        '#ee6666',
        '#73c0de'
      ],
      animation: true,
      grid: {
        top: 60,
        right: 40,
        bottom: 60,
        left: 60,
        backgroundColor: '#1f1f1f',
        show: true
      },
      xAxis: {
        type: 'category',
        data: [],
        axisLine: {
          show: true,
          lineStyle: {
            color: '#333333'
          }
        },
        axisTick: {
          show: true
        },
        axisLabel: {
          show: true,
          color: '#cccccc',
          fontSize: 12,
          fontFamily: 'Arial'
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#333333'
          }
        }
      },
      yAxis: {
        type: 'value',
        axisLine: {
          show: true,
          lineStyle: {
            color: '#333333'
          }
        },
        axisTick: {
          show: true
        },
        axisLabel: {
          show: true,
          color: '#cccccc',
          fontSize: 12,
          fontFamily: 'Arial'
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#333333'
          }
        }
      },
      series: [],
      dataBinding: {
        xField: fields[0] || '',
        yFields: fields.slice(1, 2) || [],
        seriesField: fields[2] || undefined,
        aggregation: 'sum',
        dataLimit: 100,
        sortBy: '',
        sortOrder: 'desc'
      }
    };
  }

  static generateStandardDefaults(): StandardChartConfig {
    return {
      chartType: 'bar',
      title: {
        text: 'Chart',
        subtext: '',
        left: 'center',
        textStyle: {
          color: '#ffffff',
          fontSize: 18,
          fontFamily: 'Arial'
        },
        subtextStyle: {
          color: '#cccccc',
          fontSize: 12.6,
          fontFamily: 'Arial'
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: '#333',
        textStyle: {
          color: '#fff'
        }
      },
      legend: {
        data: [],
        bottom: 0,
        orient: 'horizontal',
        show: true,
        textStyle: {
          color: '#ffffff',
          fontSize: 12
        }
      },
      color: ['#5070dd', '#b6d634', '#505372', '#ff994d', '#0ca8df'],
      animation: true,
      grid: {
        top: 60,
        right: 30,
        bottom: 60,
        left: 60,
        backgroundColor: 'transparent',
        show: true
      },
      xAxis: {
        type: 'category',
        data: [],
        axisLine: {
          show: true,
          lineStyle: {
            color: '#666'
          }
        },
        axisTick: {
          show: true
        },
        axisLabel: {
          show: true,
          color: '#ffffff',
          fontSize: 12,
          fontFamily: 'Arial'
        },
        splitLine: {
          show: false,
          lineStyle: {
            color: '#333'
          }
        }
      },
      yAxis: {
        type: 'value',
        axisLine: {
          show: true,
          lineStyle: {
            color: '#666'
          }
        },
        axisTick: {
          show: true
        },
        axisLabel: {
          show: true,
          color: '#ffffff',
          fontSize: 12,
          fontFamily: 'Arial'
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#333'
          }
        }
      },
      dataBinding: {
        xField: '',
        yFields: [],
        seriesField: undefined,
        aggregation: 'sum',
        dataLimit: 100,
        sortBy: '',
        sortOrder: 'desc'
      },
      axis: {
        xAxis: {
          show: true,
          labelRotation: 0,
          labelColor: '#54555a',
          gridLines: true,
        },
        yAxis: {
          show: true,
          labelColor: '#54555a',
          gridLines: true,
          format: '',
        },
      },
      seriesConfig: {
        showLabels: false,
        labelPosition: 'top',
        smooth: false,
        areaStyle: false,
        symbolSize: 6,
      },
      // legend and tooltip already defined earlier in this object; avoid duplicates
      gridSpacing: 10,
    };
  }

  static generateAdvancedDefaults(): AdvancedChartConfig {
    return {
      ...this.generateStandardDefaults(),
      grid: {
        left: '10%',
        right: '10%',
        top: '15%',
        bottom: '20%',
        containLabel: true,
      },
      animation: {
        show: true,
        duration: 1000,
        easing: 'cubicOut',
        delay: 0,
      },
      dataZoom: {
        show: false,
        type: 'slider',
        start: 0,
        end: 100,
      },
      toolbox: {
        show: false,
        features: ['saveAsImage', 'dataZoom', 'restore', 'dataView'],
      },
      customOptions: {},
    };
  }

  static validateConfig(config: BasicChartConfig | StandardChartConfig | AdvancedChartConfig): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.title?.text || config.title.text.trim() === '') {
      errors.push('Chart title is required');
    }

    if ('dataBinding' in config) {
      if (!config.dataBinding.xField) {
        errors.push('X-axis field is required');
      }
      if (!config.dataBinding.yFields?.length) {
        errors.push('At least one Y-axis field is required');
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}

// Predefined chart templates
export const CHART_TEMPLATES: ChartTemplate[] = [
  {
    id: 'bar-basic',
    name: 'Basic Bar Chart',
    category: 'comparison',
    thumbnail: '📊',
    description: 'Simple bar chart for comparing values across categories',
    config: {
      chartType: 'bar',
      title: {
        text: 'Basic Bar Chart',
        subtext: '',
        left: 'center',
        textStyle: {
          color: '#ffffff',
          fontSize: 18,
          fontFamily: 'Arial'
        },
        subtextStyle: {
          color: '#cccccc',
          fontSize: 12.6,
          fontFamily: 'Arial'
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: '#333',
        textStyle: {
          color: '#fff'
        }
      },
      legend: {
        data: [],
        bottom: 0,
        orient: 'horizontal',
        show: true,
        textStyle: {
          color: '#ffffff',
          fontSize: 12
        }
      },
      color: ['#5070dd', '#b6d634', '#505372'],
      // remove boolean animation to satisfy AdvancedChartConfig typing in templates
      grid: {
        top: 60,
        right: 30,
        bottom: 60,
        left: 60,
        backgroundColor: 'transparent',
        show: true
      },
      xAxis: {
        type: 'category',
        data: [],
        axisLine: {
          show: true,
          lineStyle: {
            color: '#666'
          }
        },
        axisTick: {
          show: true
        },
        axisLabel: {
          show: true,
          color: '#ffffff',
          fontSize: 12,
          fontFamily: 'Arial'
        },
        splitLine: {
          show: false,
          lineStyle: {
            color: '#333'
          }
        }
      },
      yAxis: {
        type: 'value',
        axisLine: {
          show: true,
          lineStyle: {
            color: '#666'
          }
        },
        axisTick: {
          show: true
        },
        axisLabel: {
          show: true,
          color: '#ffffff',
          fontSize: 12,
          fontFamily: 'Arial'
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#333'
          }
        }
      }
    },
    dataRequirements: {
      minFields: 2,
      maxFields: 3,
      fieldTypes: ['string', 'number'],
    },
    useCases: ['Sales comparison', 'Performance metrics', 'Survey results'],
  },
  {
    id: 'line-trend',
    name: 'Trend Line Chart',
    category: 'trend',
    thumbnail: '📈',
    description: 'Line chart for showing trends over time',
    config: {
      chartType: 'line',
      seriesConfig: {
        smooth: true,
        showLabels: false,
        labelPosition: 'top',
        areaStyle: false,
        symbolSize: 6,
      },
    },
    dataRequirements: {
      minFields: 2,
      maxFields: 5,
      fieldTypes: ['string', 'number'],
    },
    useCases: ['Time series data', 'Growth trends', 'Performance over time'],
  },
  {
    id: 'pie-distribution',
    name: 'Distribution Pie Chart',
    category: 'distribution',
    thumbnail: '🥧',
    description: 'Pie chart for showing parts of a whole',
    config: {
      chartType: 'pie',
      seriesConfig: {
        showLabels: true,
        labelPosition: 'inside',
        smooth: false,
        areaStyle: false,
        symbolSize: 6,
      },
      legend: {
        right: 0,
        orient: 'vertical',
        textStyle: { color: '#54555a' },
      },
    },
    dataRequirements: {
      minFields: 2,
      maxFields: 2,
      fieldTypes: ['string', 'number'],
    },
    useCases: ['Market share', 'Budget allocation', 'Survey responses'],
  },
];

// Configuration reducer
function configReducer(state: EChartsConfigState, action: EChartsConfigAction): EChartsConfigState {
  switch (action.type) {
    case 'SET_LEVEL':
      return { ...state, level: action.payload };
    
    case 'UPDATE_BASIC':
      return {
        ...state,
        basic: { ...state.basic, ...action.payload },
      };
    
    case 'UPDATE_STANDARD':
      return {
        ...state,
        standard: { ...state.standard, ...action.payload },
      };
    
    case 'UPDATE_ADVANCED':
      return {
        ...state,
        advanced: { ...state.advanced, ...action.payload },
      };
    
    case 'SET_TEMPLATE':
      return { ...state, currentTemplate: action.payload };
    
    case 'SET_DATA':
      return { ...state, data: action.payload };
    
    case 'SET_PREVIEW':
      return { ...state, preview: action.payload };
    
    case 'RESET_CONFIG':
      return {
        ...state,
        basic: SmartChartConfigurator.generateDefaults('bar', state.data),
        standard: SmartChartConfigurator.generateStandardDefaults(),
        advanced: SmartChartConfigurator.generateAdvancedDefaults(),
        currentTemplate: undefined,
      };
    
    case 'APPLY_TEMPLATE':
      const template = action.payload;
      const defaults = SmartChartConfigurator.generateDefaults(template.config.chartType || 'bar', state.data);
      
      return {
        ...state,
        basic: { ...defaults, ...template.config },
        currentTemplate: template,
      };
    
    default:
      return state;
  }
}

// Initial state
const initialState: EChartsConfigState = {
  level: 'basic',
  basic: SmartChartConfigurator.generateDefaults('bar', []),
  standard: SmartChartConfigurator.generateStandardDefaults(),
  advanced: SmartChartConfigurator.generateAdvancedDefaults(),
  data: [],
  preview: {},
};

// Context
const EChartsConfigContext = createContext<{
  state: EChartsConfigState;
  dispatch: React.Dispatch<EChartsConfigAction>;
  configurator: SmartChartConfigurator;
  templates: ChartTemplate[];
} | null>(null);

// Provider component
export const EChartsConfigProvider: React.FC<{ children: ReactNode; initialData?: any[] }> = ({ children, initialData = [] }) => {
  const [state, dispatch] = useReducer(configReducer, { ...initialState, data: initialData });

  // Update data when initialData changes
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      dispatch({ type: 'SET_DATA', payload: initialData });
    }
  }, [initialData]);

  return (
    <EChartsConfigContext.Provider
      value={{
        state,
        dispatch,
        configurator: SmartChartConfigurator,
        templates: CHART_TEMPLATES,
      }}
    >
      {children}
    </EChartsConfigContext.Provider>
  );
};

// Hook to use the configuration context
export const useEChartsConfig = () => {
  const context = useContext(EChartsConfigContext);
  if (!context) {
    throw new Error('useEChartsConfig must be used within an EChartsConfigProvider');
  }
  return context;
};
