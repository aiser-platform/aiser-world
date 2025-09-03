'use client';

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { dashboardAPIService } from '../../services/DashboardAPIService';

// Dashboard Configuration Types
export interface DashboardLayout {
  id: string;
  name: string;
  type: 'grid' | 'flexbox' | 'freeform';
  columns: number;
  rows: number;
  gap: number;
  padding: number;
  backgroundColor: string;
  borderRadius: number;
  shadow: boolean;
}

export interface DashboardTheme {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
  isDark: boolean;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'text' | 'image' | 'filter';
  title: string;
  subtitle?: string;
  position: { x: number; y: number; w: number; h: number };
  config: any;
  dataSource?: string;
  refreshInterval?: number;
  isVisible: boolean;
  isLocked: boolean;
  
  // Layout & Style Properties (Tableau-style)
  layout?: {
    // Positioning
    x: number;
    y: number;
    width: number;
    height: number;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    
    // Responsive behavior
    responsive: boolean;
    breakpoints?: {
      xs?: { w: number; h: number };
      sm?: { w: number; h: number };
      md?: { w: number; h: number };
      lg?: { w: number; h: number };
      xl?: { w: number; h: number };
    };
    
    // Grid behavior
    static?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
    isBounded?: boolean;
    
    // Container properties
    containerPadding?: [number, number];
    margin?: [number, number];
  };
  
  style?: {
    // Background & Borders
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundSize?: 'cover' | 'contain' | 'auto';
    backgroundPosition?: string;
    backgroundRepeat?: 'repeat' | 'no-repeat' | 'repeat-x' | 'repeat-y';
    
    borderColor?: string;
    borderWidth?: number;
    borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
    borderRadius?: number;
    
    // Shadows & Effects
    boxShadow?: string;
    opacity?: number;
    zIndex?: number;
    
    // Spacing
    padding?: number | [number, number] | [number, number, number, number];
    margin?: number | [number, number] | [number, number, number, number];
    
    // Typography (for text-based widgets)
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: 'normal' | 'bold' | 'lighter' | 'bolder' | number;
    fontStyle?: 'normal' | 'italic' | 'oblique';
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    textDecoration?: 'none' | 'underline' | 'line-through';
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    lineHeight?: number;
    letterSpacing?: number;
    color?: string;
    
    // Layout
    display?: 'block' | 'inline' | 'flex' | 'grid' | 'none';
    flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
    alignItems?: 'flex-start' | 'flex-end' | 'center' | 'baseline' | 'stretch';
    flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
    
    // Overflow
    overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
    overflowX?: 'visible' | 'hidden' | 'scroll' | 'auto';
    overflowY?: 'visible' | 'hidden' | 'scroll' | 'auto';
  };
  
  // Animation & Transitions
  animation?: {
    enabled: boolean;
    duration?: number;
    easing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
    delay?: number;
    type?: 'fade' | 'slide' | 'zoom' | 'bounce' | 'none';
  };
  
  // Interaction & Behavior
  behavior?: {
    clickable?: boolean;
    hoverable?: boolean;
    selectable?: boolean;
    draggable?: boolean;
    resizable?: boolean;
    onHover?: 'highlight' | 'tooltip' | 'none';
    onClick?: 'select' | 'drill' | 'navigate' | 'none';
  };
  
  // Data & Refresh
  data?: {
    source?: string;
    query?: string;
    refreshInterval?: number;
    autoRefresh?: boolean;
    cache?: boolean;
    cacheTimeout?: number;
  };
  
  // Widget-specific properties
  chart?: {
    type: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'radar' | 'heatmap' | 'funnel' | 'gauge';
    options?: any;
    colors?: string[];
    animation?: boolean;
    legend?: boolean;
    tooltip?: boolean;
    grid?: boolean;
  };
  
  filter?: {
    type: 'dropdown' | 'dateRange' | 'slider' | 'search' | 'checkbox';
    field: string;
    options?: any[];
    defaultValue?: any;
    isGlobal?: boolean;
    affects?: string[];
  };
}

export interface DashboardFilter {
  id: string;
  type: 'dropdown' | 'dateRange' | 'slider' | 'search' | 'checkbox';
  label: string;
  field: string;
  defaultValue: any;
  options?: any[];
  range?: { min: number; max: number };
  isGlobal: boolean;
  affects: string[]; // Widget IDs this filter affects
}

export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  layout: DashboardLayout;
  theme: DashboardTheme;
  widgets: DashboardWidget[];
  filters: DashboardFilter[];
  refreshInterval: number;
  autoSave: boolean;
  permissions: {
    canEdit: boolean;
    canShare: boolean;
    canExport: boolean;
    canSchedule: boolean;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    tags: string[];
    version: string;
  };
}

// Dashboard State
export interface DashboardConfigState {
  currentDashboard: DashboardConfig;
  availableThemes: DashboardTheme[];
  availableLayouts: DashboardLayout[];
  selectedWidget?: DashboardWidget;
  isEditing: boolean;
  previewMode: boolean;
  undoStack: DashboardConfig[];
  redoStack: DashboardConfig[];
}

// Dashboard Actions
export type DashboardConfigAction =
  | { type: 'SET_DASHBOARD'; payload: DashboardConfig }
  | { type: 'UPDATE_LAYOUT'; payload: Partial<DashboardLayout> }
  | { type: 'UPDATE_THEME'; payload: DashboardTheme }
  | { type: 'ADD_WIDGET'; payload: DashboardWidget }
  | { type: 'UPDATE_WIDGET'; payload: { id: string; updates: Partial<DashboardWidget> } }
  | { type: 'REMOVE_WIDGET'; payload: string }
  | { type: 'ADD_FILTER'; payload: DashboardFilter }
  | { type: 'UPDATE_FILTER'; payload: { id: string; updates: Partial<DashboardFilter> } }
  | { type: 'REMOVE_FILTER'; payload: string }
  | { type: 'SET_SELECTED_WIDGET'; payload?: DashboardWidget }
  | { type: 'TOGGLE_EDIT_MODE'; payload?: boolean }
  | { type: 'TOGGLE_PREVIEW_MODE'; payload?: boolean }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET_DASHBOARD' };

// Default Dashboard Configuration
const defaultLayout: DashboardLayout = {
  id: 'default-grid',
  name: 'Default Grid',
  type: 'grid',
  columns: 12,
  rows: 8,
  gap: 16,
  padding: 20,
  backgroundColor: '#ffffff',
  borderRadius: 8,
  shadow: true,
};

const defaultTheme: DashboardTheme = {
  id: 'default-light',
  name: 'Default Light',
  primaryColor: '#1890ff',
  secondaryColor: '#52c41a',
  backgroundColor: '#ffffff',
  textColor: '#262626',
  accentColor: '#fa8c16',
  borderColor: '#d9d9d9',
  isDark: false,
};

const defaultDashboard: DashboardConfig = {
  id: 'new-dashboard',
  name: 'New Dashboard',
  description: 'A new dashboard for data visualization',
  layout: defaultLayout,
  theme: defaultTheme,
  widgets: [],
  filters: [],
  refreshInterval: 300, // 5 minutes
  autoSave: true,
  permissions: {
    canEdit: true,
    canShare: true,
    canExport: true,
    canSchedule: false,
  },
  metadata: {
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'current-user',
    tags: ['dashboard', 'new'],
    version: '1.0.0',
  },
};

// Predefined Themes
const predefinedThemes: DashboardTheme[] = [
  defaultTheme,
  {
    id: 'dark-mode',
    name: 'Dark Mode',
    primaryColor: '#177ddc',
    secondaryColor: '#49aa19',
    backgroundColor: '#141414',
    textColor: '#ffffff',
    accentColor: '#d89614',
    borderColor: '#434343',
    isDark: true,
  },
  {
    id: 'blue-theme',
    name: 'Blue Theme',
    primaryColor: '#1890ff',
    secondaryColor: '#52c41a',
    backgroundColor: '#f0f8ff',
    textColor: '#262626',
    accentColor: '#fa8c16',
    borderColor: '#91d5ff',
    isDark: false,
  },
  {
    id: 'green-theme',
    name: 'Green Theme',
    primaryColor: '#52c41a',
    secondaryColor: '#1890ff',
    backgroundColor: '#f6ffed',
    textColor: '#262626',
    accentColor: '#fa8c16',
    borderColor: '#b7eb8f',
    isDark: false,
  },
];

// Predefined Layouts
const predefinedLayouts: DashboardLayout[] = [
  defaultLayout,
  {
    id: 'compact-grid',
    name: 'Compact Grid',
    type: 'grid',
    columns: 16,
    rows: 12,
    gap: 8,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    shadow: false,
  },
  {
    id: 'spacious-grid',
    name: 'Spacious Grid',
    type: 'grid',
    columns: 8,
    rows: 6,
    gap: 24,
    padding: 32,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadow: true,
  },
  {
    id: 'flexbox-layout',
    name: 'Flexbox Layout',
    type: 'flexbox',
    columns: 0,
    rows: 0,
    gap: 16,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadow: true,
  },
];

// Dashboard Configuration Reducer
function dashboardConfigReducer(state: DashboardConfigState, action: DashboardConfigAction): DashboardConfigState {
  switch (action.type) {
    case 'SET_DASHBOARD':
      return {
        ...state,
        currentDashboard: action.payload,
        undoStack: [...state.undoStack, state.currentDashboard].slice(-10),
        redoStack: [],
      };

    case 'UPDATE_LAYOUT':
      const updatedLayout = { ...state.currentDashboard.layout, ...action.payload };
      const updatedDashboard = {
        ...state.currentDashboard,
        layout: updatedLayout,
        metadata: { ...state.currentDashboard.metadata, updatedAt: new Date() },
      };
      return {
        ...state,
        currentDashboard: updatedDashboard,
        undoStack: [...state.undoStack, state.currentDashboard].slice(-10),
        redoStack: [],
      };

    case 'UPDATE_THEME':
      return {
        ...state,
        currentDashboard: {
          ...state.currentDashboard,
          theme: action.payload,
          metadata: { ...state.currentDashboard.metadata, updatedAt: new Date() },
        },
        undoStack: [...state.undoStack, state.currentDashboard].slice(-10),
        redoStack: [],
      };

    case 'ADD_WIDGET':
      return {
        ...state,
        currentDashboard: {
          ...state.currentDashboard,
          widgets: [...state.currentDashboard.widgets, action.payload],
          metadata: { ...state.currentDashboard.metadata, updatedAt: new Date() },
        },
        undoStack: [...state.undoStack, state.currentDashboard].slice(-10),
        redoStack: [],
      };

    case 'UPDATE_WIDGET':
      return {
        ...state,
        currentDashboard: {
          ...state.currentDashboard,
          widgets: state.currentDashboard.widgets.map(widget =>
            widget.id === action.payload.id ? { ...widget, ...action.payload.updates } : widget
          ),
          metadata: { ...state.currentDashboard.metadata, updatedAt: new Date() },
        },
        undoStack: [...state.undoStack, state.currentDashboard].slice(-10),
        redoStack: [],
      };

    case 'REMOVE_WIDGET':
      return {
        ...state,
        currentDashboard: {
          ...state.currentDashboard,
          widgets: state.currentDashboard.widgets.filter(widget => widget.id !== action.payload),
          metadata: { ...state.currentDashboard.metadata, updatedAt: new Date() },
        },
        undoStack: [...state.undoStack, state.currentDashboard].slice(-10),
        redoStack: [],
      };

    case 'ADD_FILTER':
      return {
        ...state,
        currentDashboard: {
          ...state.currentDashboard,
          filters: [...state.currentDashboard.filters, action.payload],
          metadata: { ...state.currentDashboard.metadata, updatedAt: new Date() },
        },
        undoStack: [...state.undoStack, state.currentDashboard].slice(-10),
        redoStack: [],
      };

    case 'UPDATE_FILTER':
      return {
        ...state,
        currentDashboard: {
          ...state.currentDashboard,
          filters: state.currentDashboard.filters.map(filter =>
            filter.id === action.payload.id ? { ...filter, ...action.payload.updates } : filter
          ),
          metadata: { ...state.currentDashboard.metadata, updatedAt: new Date() },
        },
        undoStack: [...state.undoStack, state.currentDashboard].slice(-10),
        redoStack: [],
      };

    case 'REMOVE_FILTER':
      return {
        ...state,
        currentDashboard: {
          ...state.currentDashboard,
          filters: state.currentDashboard.filters.filter(filter => filter.id !== action.payload),
          metadata: { ...state.currentDashboard.metadata, updatedAt: new Date() },
        },
        undoStack: [...state.undoStack, state.currentDashboard].slice(-10),
        redoStack: [],
      };

    case 'SET_SELECTED_WIDGET':
      return { ...state, selectedWidget: action.payload };

    case 'TOGGLE_EDIT_MODE':
      return { ...state, isEditing: action.payload !== undefined ? action.payload : !state.isEditing };

    case 'TOGGLE_PREVIEW_MODE':
      return { ...state, previewMode: action.payload !== undefined ? action.payload : !state.previewMode };

    case 'UNDO':
      if (state.undoStack.length === 0) return state;
      const previousState = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        currentDashboard: previousState,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [state.currentDashboard, ...state.redoStack].slice(-10),
      };

    case 'REDO':
      if (state.redoStack.length === 0) return state;
      const nextState = state.redoStack[0];
      return {
        ...state,
        currentDashboard: nextState,
        undoStack: [...state.undoStack, state.currentDashboard].slice(-10),
        redoStack: state.redoStack.slice(1),
      };

    case 'RESET_DASHBOARD':
      return {
        ...state,
        currentDashboard: defaultDashboard,
        undoStack: [...state.undoStack, state.currentDashboard].slice(-10),
        redoStack: [],
      };

    default:
      return state;
  }
}

// Initial State
const initialState: DashboardConfigState = {
  currentDashboard: defaultDashboard,
  availableThemes: predefinedThemes,
  availableLayouts: predefinedLayouts,
  selectedWidget: undefined,
  isEditing: false,
  previewMode: false,
  undoStack: [],
  redoStack: [],
};

// Dashboard Configuration Context
const DashboardConfigContext = createContext<{
  state: DashboardConfigState;
  dispatch: React.Dispatch<DashboardConfigAction>;
  addWidget: (type: string, position: { x: number; y: number; w: number; h: number }) => void;
  updateWidget: (id: string, updates: Partial<DashboardWidget>) => Promise<void>;
  removeWidget: (id: string) => Promise<void>;
  addFilter: (filter: DashboardFilter) => void;
  updateFilter: (id: string, updates: Partial<DashboardFilter>) => void;
  removeFilter: (id: string) => void;
  autoSaveDashboard: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
} | null>(null);

// Dashboard Configuration Provider
export const DashboardConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(dashboardConfigReducer, initialState);

  // Helper functions
  const addWidget = (type: string, position: { x: number; y: number; w: number; h: number }) => {
    // Generate widget configuration based on type
    const generateWidgetConfig = (widgetType: string) => {
      switch (widgetType) {
        case 'chart':
          return {
            chartType: 'bar',
            title: {
              text: 'New Bar Chart',
              subtext: '',
              left: 'left', // Left alignment as requested
              textStyle: {
                color: '#333333',
                fontSize: 16,
                fontFamily: 'Arial'
              },
              subtextStyle: {
                color: '#666666',
                fontSize: 12,
                fontFamily: 'Arial'
              }
            },
            tooltip: {
              trigger: 'axis',
              backgroundColor: 'rgba(255,255,255,0.9)',
              borderColor: '#d9d9d9',
              textStyle: {
                color: '#333333'
              }
            },
            legend: {
              data: [],
              bottom: 10,
              orient: 'horizontal',
              textStyle: {
                color: '#333333',
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
              backgroundColor: 'transparent',
              show: true
            },
            xAxis: {
              type: 'category',
              data: [],
              axisLine: {
                show: true,
                lineStyle: {
                  color: '#d9d9d9'
                }
              },
              axisTick: {
                show: true
              },
              axisLabel: {
                show: true,
                color: '#666666',
                fontSize: 12,
                fontFamily: 'Arial'
              },
              splitLine: {
                show: true,
                lineStyle: {
                  color: '#f0f0f0'
                }
              }
            },
            yAxis: {
              type: 'value',
              axisLine: {
                show: true,
                lineStyle: {
                  color: '#d9d9d9'
                }
              },
              axisTick: {
                show: true
              },
              axisLabel: {
                show: true,
                color: '#666666',
                fontSize: 12,
                fontFamily: 'Arial'
              },
              splitLine: {
                show: true,
                lineStyle: {
                  color: '#f0f0f0'
                }
              }
            },
            series: []
          };

        case 'markdown':
          return {
            content: '# New Markdown Widget\n\nAdd your markdown content here...',
            enableHtml: false,
            syntaxHighlighting: false
          };

        case 'image':
          return {
            imageUrl: '',
            altText: 'Image widget',
            fitMode: 'contain'
          };

        case 'table':
          return {
            columns: ['Column 1', 'Column 2', 'Column 3'],
            dataSource: 'sample',
            pagination: true,
            pageSize: 10
          };

        case 'metric':
          return {
            value: '0',
            format: 'number',
            prefix: '',
            suffix: '',
            showTrend: false
          };

        case 'text':
          return {
            content: 'New Text Widget\n\nAdd your text content here...',
            fontSize: 14,
            fontWeight: 'normal',
            color: '#333333'
          };

        default:
          return {};
      }
    };

    const newWidget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      type: type as any,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      subtitle: '',
      position,
      config: generateWidgetConfig(type),
      isVisible: true,
      isLocked: false,
    };
    
    console.log('Creating new widget:', newWidget);
    dispatch({ type: 'ADD_WIDGET', payload: newWidget });
  };

  const updateWidget = async (id: string, updates: Partial<DashboardWidget>) => {
    dispatch({ type: 'UPDATE_WIDGET', payload: { id, updates } });
    
    // Auto-save widget changes to backend
    try {
      const widget = state.currentDashboard.widgets.find(w => w.id === id);
      if (widget) {
        await dashboardAPIService.updateWidget(
          state.currentDashboard.id,
          id,
          { ...widget, ...updates }
        );
      }
    } catch (error) {
      console.error('Failed to auto-save widget:', error);
    }
  };

  const removeWidget = async (id: string) => {
    dispatch({ type: 'REMOVE_WIDGET', payload: id });
    
    // Auto-save widget removal to backend
    try {
      await dashboardAPIService.deleteWidget(state.currentDashboard.id, id);
    } catch (error) {
      console.error('Failed to auto-save widget removal:', error);
    }
  };

  // Auto-save dashboard changes
  const autoSaveDashboard = async () => {
    try {
      await dashboardAPIService.updateDashboard(
        state.currentDashboard.id,
        state.currentDashboard
      );
    } catch (error) {
      console.error('Failed to auto-save dashboard:', error);
    }
  };

  const addFilter = (filter: DashboardFilter) => {
    dispatch({ type: 'ADD_FILTER', payload: filter });
  };

  const updateFilter = (id: string, updates: Partial<DashboardFilter>) => {
    dispatch({ type: 'UPDATE_FILTER', payload: { id, updates } });
  };

  const removeFilter = (id: string) => {
    dispatch({ type: 'REMOVE_FILTER', payload: id });
  };

  const canUndo = state.undoStack.length > 0;
  const canRedo = state.redoStack.length > 0;

  return (
    <DashboardConfigContext.Provider
      value={{
        state,
        dispatch,
        addWidget,
        updateWidget,
        removeWidget,
        addFilter,
        updateFilter,
        removeFilter,
        autoSaveDashboard,
        canUndo,
        canRedo,
      }}
    >
      {children}
    </DashboardConfigContext.Provider>
  );
};

// Hook to use dashboard configuration
export const useDashboardConfig = () => {
  const context = useContext(DashboardConfigContext);
  if (!context) {
    throw new Error('useDashboardConfig must be used within a DashboardConfigProvider');
  }
  return context;
};
