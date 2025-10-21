import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { temporal } from 'zundo'
import { widgetConfigManager } from '../config/WidgetConfigManager'

// SINGLE SOURCE OF TRUTH: Widget Interface
export interface Widget {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, any>;
  data?: any;
  isVisible: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

// SINGLE SOURCE OF TRUTH: Dashboard State
interface DashboardState {
  // Core State
  widgets: Widget[];
  selectedWidgetIds: string[];
  isDragging: boolean;
  clipboard: Widget | null;
  
  // Dashboard Metadata
  dashboardId: string | null;
  dashboardTitle: string;
  dashboardSubtitle: string;
  lastSaved: string | null;
  
  // UI State
  showGrid: boolean;
  zoomLevel: number;
  
  // Selectors
  getWidget: (id: string) => Widget | undefined;
  getSelectedWidgets: () => Widget[];
  getWidgetsByType: (type: string) => Widget[];
  
  // Widget Actions
  addWidget: (type: string, position: { x: number; y: number }) => void;
  updateWidget: (id: string, updates: Partial<Widget>) => void;
  updateWidgetConfig: (id: string, configUpdates: Record<string, any>) => void;
  removeWidget: (id: string) => void;
  
  // Selection Management
  selectWidget: (id: string) => void;
  deselectAll: () => void;
  selectAll: () => void;
  
  // Layout Management
  updateLayout: (layout: any[]) => void;
  
  // UI State Management
  setShowGrid: (showGrid: boolean) => void;
  setZoomLevel: (zoomLevel: number) => void;
  
  // Dashboard Metadata
  setDashboardTitle: (title: string) => void;
  setDashboardSubtitle: (subtitle: string) => void;
  
  // Clipboard Operations
  copyWidget: (widget: Widget) => void;
  pasteWidget: (position: { x: number; y: number }) => void;
  
  // Remote Updates
  applyRemoteUpdate: (update: any) => void;
  
  // Clear and Load
  clearAllWidgets: () => void;
  loadDashboard: (dashboard: { widgets: Widget[]; title: string; subtitle: string }) => void;
}

// SINGLE SOURCE OF TRUTH: Dashboard Store
export const useDashboardStore = create<DashboardState>()(
  devtools(
    immer((set, get) => ({
      // Initial State
      widgets: [],
      selectedWidgetIds: [],
      isDragging: false,
      clipboard: null,
      
      dashboardId: null,
      dashboardTitle: 'Dashboard Title',
      dashboardSubtitle: 'Dashboard Subtitle',
      lastSaved: null,
      
      showGrid: false,
      zoomLevel: 100,
      
      // Selectors
      getWidget: (id: string) => {
        const state = get();
        return state.widgets.find(widget => widget.id === id);
      },
      
      getSelectedWidgets: () => {
        const state = get();
        return state.widgets.filter(widget => 
          state.selectedWidgetIds.includes(widget.id)
        );
      },
      
      getWidgetsByType: (type: string) => {
        const state = get();
        return state.widgets.filter(widget => widget.type === type);
      },
      
      // Widget Actions
      addWidget: (type: string, position: { x: number; y: number }) => {
        set((state) => {
          const newWidget: Widget = {
            id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            title: `New ${type}`,
            subtitle: '',
            position: { ...position, w: 6, h: 4 },
            config: widgetConfigManager.getDefaultConfig(type),
            isVisible: true,
            isLocked: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          state.widgets.push(newWidget);
          state.selectedWidgetIds = [newWidget.id];
          state.lastSaved = new Date().toISOString();
        });
      },
      
      updateWidget: (id: string, updates: Partial<Widget>) => {
        set((state) => {
          const widgetIndex = state.widgets.findIndex(widget => widget.id === id);
          if (widgetIndex !== -1) {
            state.widgets[widgetIndex] = {
              ...state.widgets[widgetIndex],
              ...updates,
              updatedAt: new Date().toISOString()
            };
            state.lastSaved = new Date().toISOString();
          }
        });
      },
      
      updateWidgetConfig: (id: string, configUpdates: Record<string, any>) => {
        set((state) => {
          const widgetIndex = state.widgets.findIndex(widget => widget.id === id);
          if (widgetIndex !== -1) {
            state.widgets[widgetIndex].config = {
              ...state.widgets[widgetIndex].config,
              ...configUpdates
            };
            state.widgets[widgetIndex].updatedAt = new Date().toISOString();
            state.lastSaved = new Date().toISOString();
          }
        });
      },
      
      removeWidget: (id: string) => {
        set((state) => {
          state.widgets = state.widgets.filter(widget => widget.id !== id);
          state.selectedWidgetIds = state.selectedWidgetIds.filter(widgetId => widgetId !== id);
          state.lastSaved = new Date().toISOString();
        });
      },
      
      // Selection Management
      selectWidget: (id: string) => {
        set((state) => {
          if (!state.selectedWidgetIds.includes(id)) {
            state.selectedWidgetIds.push(id);
          }
        });
      },
      
      deselectAll: () => {
        set((state) => {
          state.selectedWidgetIds = [];
        });
      },
      
      selectAll: () => {
        set((state) => {
          state.selectedWidgetIds = state.widgets.map(widget => widget.id);
        });
      },
      
      // Layout Management
      updateLayout: (layout: any[]) => {
        set((state) => {
          layout.forEach(layoutItem => {
            const widget = state.widgets.find(w => w.id === layoutItem.i);
            if (widget) {
              widget.position = {
                x: layoutItem.x,
                y: layoutItem.y,
                w: layoutItem.w,
                h: layoutItem.h
              };
            }
          });
          state.lastSaved = new Date().toISOString();
        });
      },
      
      // UI State Management
      setShowGrid: (showGrid: boolean) => {
        set((state) => {
          state.showGrid = showGrid;
        });
      },
      
      setZoomLevel: (zoomLevel: number) => {
        set((state) => {
          state.zoomLevel = zoomLevel;
        });
      },
      
      // Dashboard Metadata
      setDashboardTitle: (title: string) => {
        set((state) => {
          state.dashboardTitle = title;
          state.lastSaved = new Date().toISOString();
        });
      },
      
      setDashboardSubtitle: (subtitle: string) => {
        set((state) => {
          state.dashboardSubtitle = subtitle;
          state.lastSaved = new Date().toISOString();
        });
      },
      
      // Clipboard Operations
      copyWidget: (widget: Widget) => {
        set((state) => {
          state.clipboard = { ...widget };
        });
      },
      
      pasteWidget: (position: { x: number; y: number }) => {
        set((state) => {
          if (state.clipboard) {
            const pastedWidget: Widget = {
              ...state.clipboard,
              id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              position: { ...position, w: 6, h: 4 },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            state.widgets.push(pastedWidget);
            state.selectedWidgetIds = [pastedWidget.id];
          }
        });
      },
      
      // Remote Updates
      applyRemoteUpdate: (update: any) => {
        set((state) => {
          switch (update.type) {
            case 'widget:update':
              const widgetIndex = state.widgets.findIndex(w => w.id === update.id);
              if (widgetIndex !== -1) {
                state.widgets[widgetIndex] = {
                  ...state.widgets[widgetIndex],
                  ...update.changes,
                  updatedAt: new Date().toISOString()
                };
              }
              break;
            case 'widget:add':
              state.widgets.push(update.widget);
              break;
            case 'widget:remove':
              state.widgets = state.widgets.filter(w => w.id !== update.id);
              state.selectedWidgetIds = state.selectedWidgetIds.filter(id => id !== update.id);
              break;
          }
        });
      },
      
      // Clear all widgets
      clearAllWidgets: () => {
        set((state) => {
          state.widgets = [];
          state.selectedWidgetIds = [];
          state.lastSaved = new Date().toISOString();
        });
      },
      
      // Load dashboard
      loadDashboard: (dashboard: { widgets: Widget[]; title: string; subtitle: string }) => {
        set((state) => {
          state.widgets = [...dashboard.widgets];
          state.dashboardTitle = dashboard.title;
          state.dashboardSubtitle = dashboard.subtitle;
          state.selectedWidgetIds = [];
          state.lastSaved = new Date().toISOString();
        });
      }
    }))
  )
);

// Export hooks for common operations
export const useWidgets = () => useDashboardStore(state => state.widgets);
export const useSelectedWidgets = () => useDashboardStore(state => state.getSelectedWidgets());
export const useSelectedWidgetIds = () => useDashboardStore(state => state.selectedWidgetIds);
export const useDashboardActions = () => useDashboardStore(state => ({
  addWidget: state.addWidget,
  updateWidget: state.updateWidget,
  updateWidgetConfig: state.updateWidgetConfig,
  removeWidget: state.removeWidget,
  selectWidget: state.selectWidget,
  deselectAll: state.deselectAll,
  updateLayout: state.updateLayout
}));