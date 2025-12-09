'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button, Space, Typography, Tooltip, Dropdown, Menu, message, Modal, Input, Select } from 'antd';
import { Responsive, WidthProvider } from 'react-grid-layout';
import {
  MoreOutlined,
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  UnlockOutlined,
  SettingOutlined,
  BarChartOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  SaveOutlined,
  UndoOutlined,
  RedoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { DashboardWidget } from './DashboardConfiguration/DashboardConfigProvider';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { WidgetRenderer } from './WidgetSystem/WidgetRenderer';

const ResponsiveGridLayout = WidthProvider(Responsive);
const { Title, Text } = Typography;
const { Option } = Select;

interface AdvancedDashboardCanvasProps {
  widgets: DashboardWidget[];
  layout: any[];
  selectedWidget: DashboardWidget | null;
  isDarkMode: boolean;
  onLayoutChange: (layout: any[]) => void;
  onWidgetSelect: (widget: DashboardWidget | null) => void;
  onWidgetUpdate: (widgetId: string, updates: any) => void;
  onWidgetDelete: (widgetId: string) => void;
  onWidgetDuplicate: (widget: DashboardWidget) => void;
  onWidgetConfigUpdate: (widgetId: string, config: any) => void;
  onAddWidget?: (widgetData: any) => void;
  dashboardTitle?: string;
  dashboardSubtitle?: string;
  onTitleChange?: (title: string) => void;
  onSubtitleChange?: (subtitle: string) => void;
  // Grid options forwarded from parent to allow dynamic behavior
  compactType?: 'vertical' | 'horizontal' | null;
  preventCollision?: boolean;
}

const AdvancedDashboardCanvas: React.FC<AdvancedDashboardCanvasProps> = ({
  widgets,
  layout,
  selectedWidget,
  isDarkMode,
  onLayoutChange,
  onWidgetSelect,
  onWidgetUpdate,
  onWidgetDelete,
  onWidgetDuplicate,
  onWidgetConfigUpdate,
  onAddWidget,
  dashboardTitle = 'Dashboard Title',
  dashboardSubtitle = 'Dashboard Subtitle',
  onTitleChange,
  onSubtitleChange
  , compactType = null, preventCollision = false
}) => {
  // Also read from Zustand store as a fallback to ensure reactivity during programmatic updates
  const storeWidgets = useDashboardStore((state: any) => state.widgets);
  const updateLayoutStore = useDashboardStore((state: any) => state.updateLayout);
  const effectiveWidgets = (widgets && widgets.length > 0) ? widgets : storeWidgets;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showGrid, setShowGrid] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [debugLayout, setDebugLayout] = useState<any[] | null>(null);
  const [placeholderItem, setPlaceholderItem] = useState<any | null>(null);
  const applyingLayoutRef = useRef(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; widget: DashboardWidget } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const manualResizeState = useRef<{
    active: boolean;
    widgetId?: string;
    startX?: number;
    startY?: number;
    startW?: number;
    startH?: number;
    raf?: number | null;
  }>({ active: false, raf: null });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            break;
          case 'c':
            // Do not intercept copy; allow default copy behavior
            break;
          case 'd':
            if (selectedWidget) {
              e.preventDefault();
              handleDelete(selectedWidget);
            }
            break;
          case 'f':
            e.preventDefault();
            setIsFullscreen(!isFullscreen);
            break;
        }
      }
      
      if (e.key === 'Delete' && selectedWidget) {
        handleDelete(selectedWidget);
      }
      
      if (e.key === 'Escape') {
        onWidgetSelect(null);
        setContextMenu(null);
      }
      // Arrow key nudges for selected widget
      if (selectedWidget && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 2 : 1;
        const direction = e.key.replace('Arrow','').toLowerCase();
        nudgeSelectedWidget(direction as any, step);
      }
      // Alt+Arrow => resize selected widget (keyboard)
      if (selectedWidget && e.altKey && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 2 : 1;
        const direction = e.key.replace('Arrow','').toLowerCase();
        resizeSelectedWidget(direction as any, step);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWidget, isFullscreen]);

  const nudgeSelectedWidget = (direction: 'up'|'down'|'left'|'right', step = 1) => {
    try {
      if (!selectedWidget) return;
      const cols = 12;
      const currentLayout = layout.map((l: any) => ({ ...l }));
      const item = currentLayout.find((it: any) => it.i === selectedWidget.id);
      if (!item) return;
      const others = currentLayout.filter((it: any) => it.i !== selectedWidget.id);

      const collides = (a: any, b: any) => !(a.x + a.w <= b.x || a.x >= b.x + b.w || a.y + a.h <= b.y || a.y >= b.y + b.h);

      const attemptMove = (nx: number, ny: number) => {
        const candidate = { ...item, x: nx, y: ny };
        const conflict = others.some(o => collides(candidate, o));
        return conflict ? false : true;
      };

      let newX = item.x;
      let newY = item.y;
      if (direction === 'left') newX = Math.max(0, item.x - step);
      if (direction === 'right') newX = Math.min(cols - item.w, item.x + step);
      if (direction === 'up') newY = Math.max(0, item.y - step);
      if (direction === 'down') newY = item.y + step;

      // If collision and preventCollision is true, try to move further in same direction up to 10 attempts
      if (preventCollision) {
        let attempts = 0;
        while (!attemptMove(newX, newY) && attempts < 10) {
          if (direction === 'left') newX = Math.max(0, newX - 1);
          if (direction === 'right') newX = Math.min(cols - item.w, newX + 1);
          if (direction === 'up') newY = Math.max(0, newY - 1);
          if (direction === 'down') newY = newY + 1;
          attempts++;
        }
      }

      const updated = currentLayout.map((it: any) => it.i === item.i ? { ...it, x: newX, y: newY } : it);
      onLayoutChange(updated);
      // schedule save
      try { scheduleAutosaveAfterLayoutChange(); } catch (e) {}
    } catch (err) { console.warn('nudgeSelectedWidget failed', err); }
  };

  const resizeSelectedWidget = (direction: 'up'|'down'|'left'|'right', step = 1) => {
    try {
      if (!selectedWidget) return;
      const cols = 12;
      const currentLayout = layout.map((l: any) => ({ ...l }));
      const item = currentLayout.find((it: any) => it.i === selectedWidget.id);
      if (!item) return;

      let newW = item.w;
      let newH = item.h;
      if (direction === 'left') newW = Math.max(1, item.w - step);
      if (direction === 'right') newW = Math.min(cols, item.w + step);
      if (direction === 'up') newH = Math.max(1, item.h - step);
      if (direction === 'down') newH = item.h + step;

      const updated = currentLayout.map((it: any) => it.i === item.i ? { ...it, w: newW, h: newH } : it);
      onLayoutChange(updated);
      try { scheduleAutosaveAfterLayoutChange(); } catch (e) {}
      // trigger resize for charts
      try { window.dispatchEvent(new Event('resize')); } catch (e) {}
    } catch (err) { console.warn('resizeSelectedWidget failed', err); }
  };

  const handleSave = () => {
    message.success('Dashboard saved successfully!');
  };

  const handleUndo = () => {
    message.info('Undo functionality coming soon!');
  };

  const handleRedo = () => {
    message.info('Redo functionality coming soon!');
  };

  const handleDuplicate = () => {
    if (selectedWidget) {
      onWidgetDuplicate(selectedWidget);
      message.success('Widget duplicated!');
    }
  };

  const handleDelete = (widget?: DashboardWidget) => {
    const widgetToDelete = widget || selectedWidget;
    
    if (widgetToDelete) {
      Modal.confirm({
        title: 'Delete Widget',
        content: `Are you sure you want to delete "${widgetToDelete.title || 'this widget'}"?`,
        okText: 'Delete',
        okType: 'danger',
        cancelText: 'Cancel',
        onOk: () => {
          try {
            onWidgetDelete(widgetToDelete.id);
            message.success('Widget deleted!');
          } catch (error) {
            console.error('Error deleting widget:', error);
            message.error('Failed to delete widget');
          }
        }
      });
    } else {
      message.warning('No widget selected to delete');
    }
  };

  const handleContextMenu = (e: React.MouseEvent, widget: DashboardWidget) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      widget
    });
  };

  // Create context menu items with proper widget reference
  const createContextMenuItems = (widget: DashboardWidget) => [
    {
      key: 'edit',
      label: 'Edit',
      icon: <EditOutlined />,
      onClick: () => {
        onWidgetSelect(widget);
      }
    },
    {
      key: 'duplicate',
      label: 'Duplicate',
      icon: <CopyOutlined />,
      onClick: () => {
        onWidgetDuplicate(widget);
      }
    },
    {
      key: 'visibility',
      label: widget.isVisible ? 'Hide' : 'Show',
      icon: widget.isVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />,
      onClick: () => {
        onWidgetUpdate(widget.id, { isVisible: !widget.isVisible });
      }
    },
    {
      key: 'lock',
      label: widget.isLocked ? 'Unlock' : 'Lock',
      icon: widget.isLocked ? <UnlockOutlined /> : <LockOutlined />,
      onClick: () => {
        onWidgetUpdate(widget.id, { isLocked: !widget.isLocked });
      }
    },
    {
      type: 'divider' as const
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => {
        handleDelete(widget);
      }
    }
  ];

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 50));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  const handleRefresh = () => {
    message.success('Dashboard refreshed!');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const widgetData = JSON.parse(e.dataTransfer.getData('application/json'));
      
      // Calculate drop position based on mouse coordinates
      const canvasRect = e.currentTarget.getBoundingClientRect();
      const dropX = e.clientX - canvasRect.left;
      const dropY = e.clientY - canvasRect.top;
      
      // Convert pixel coordinates to grid coordinates
      const gridX = Math.floor(dropX / (80 + 16)); // rowHeight + margin
      const gridY = Math.floor(dropY / (80 + 16));
      
      // Clamp to grid bounds
      const clampedX = Math.max(0, Math.min(gridX, 12 - (widgetData.w || 8)));
      const clampedY = Math.max(0, gridY);
      
      // Add position to widget data
      const widgetWithPosition = {
        ...widgetData,
        position: { x: clampedX, y: clampedY, w: widgetData.w || 8, h: widgetData.h || 6 }
      };
      
      if (onAddWidget) {
        onAddWidget(widgetWithPosition);
        message.success(`${widgetData.name || widgetData.title} added to dashboard`);
      } else {
        message.error('Failed to add widget to dashboard - handler not available');
      }
    } catch (error) {
      message.error('Failed to add widget to dashboard');
    }
  };

  const handleLayoutChange = (newLayout: any[]) => {
    // Normalize layout to prevent overlapping items after drag/resize/drop.
    const normalizeLayout = (layout: any[]) => {
      // Work on a shallow clone
      const items = layout.map((l) => ({ ...l }));
      // Sort by y then x so we place top-most items first
      items.sort((a, b) => (a.y - b.y) || (a.x - b.x));

      const placed: any[] = [];
      const cols = 12;

      const collides = (a: any, b: any) => !(a.x + a.w <= b.x || a.x >= b.x + b.w || a.y + a.h <= b.y || a.y >= b.y + b.h);

      for (const item of items) {
        // Ensure within bounds
        item.x = Math.max(0, Math.min(item.x, cols - item.w));
        // If it collides with any placed item, push it down until it fits
        let attempt = 0;
        while (placed.some((p) => collides(item, p)) && attempt < 200) {
          item.y = Math.max(item.y + 1, (Math.max(...placed.map((p) => p.y + p.h)) || 0));
          attempt++;
        }
        placed.push(item);
      }
      return placed;
    };

    try {
      const normalized = normalizeLayout(newLayout || []);
      
      // Update debug layout for development
      if (JSON.stringify(debugLayout) !== JSON.stringify(normalized)) {
        setDebugLayout(normalized);
      }
      
      // Persist layout changes to parent store for real-time updates
      onLayoutChange(normalized);
      
    } catch (err) {
      console.warn('handleLayoutChange normalization failed, using original layout', err);
      // Fallback to original layout
      onLayoutChange(newLayout || []);
    }
  };

  const handleDragStart = (_layout?: any, oldItem?: any, _placeholder?: any, e?: any) => {
    setIsDragging(true);
    
    // Increase z-index of dragged item container to avoid CSS stacking issues causing perceived movement of other widgets
    try {
      const target = (e && e.target) || null;
      if (target) {
        const container = (target as HTMLElement).closest('.dashboard-visual') as HTMLElement | null;
        if (container) {
          container.style.zIndex = '9999';
          container.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
          container.style.transform = 'scale(1.02)';
          container.style.transition = 'none'; // Disable transitions during drag
          container.style.borderColor = 'var(--ant-color-primary)';
        }
      }
    } catch (err) {
      // ignore
    }
  };

  const handleDragStop = (layout?: any, oldItem?: any, newItem?: any, e?: any) => {
    setIsDragging(false);
    
    // Reset visual effects after drag
    try {
      const target = (e && e.target) || null;
      if (target) {
        const container = (target as HTMLElement).closest('.dashboard-visual') as HTMLElement | null;
        if (container) {
          container.style.zIndex = '';
          container.style.boxShadow = '';
          container.style.transform = '';
          container.style.borderColor = '';
          container.style.transition = 'all 200ms ease'; // Re-enable transitions
        }
      }
    } catch (err) {}
    
    // Update widget position in store immediately to prevent stuck state
    if (newItem && onWidgetUpdate) {
      try {
        onWidgetUpdate(newItem.i, {
          position: {
            x: newItem.x,
            y: newItem.y,
            w: newItem.w,
            h: newItem.h
          }
        });
      } catch (err) {
        console.warn('Failed to update widget position:', err);
      }
    }
    
    // Forward normalized layout to parent store
    try {
      if (layout) {
        const cols = 12;
        // normalize and clamp layout values to valid ranges
        const normalized = layout.map((l: any) => {
          const i = String(l.i);
          const w = Math.max(1, Math.min(cols, Number(l.w || 1)));
          const h = Math.max(1, Number(l.h || 1));
          const x = Math.max(0, Math.min(cols - w, Number(l.x || 0)));
          const y = Math.max(0, Number(l.y || 0));
          return { i, x, y, w, h };
        });
        
        // Intelligent collision resolution similar to PowerBI: try to push conflicting
        // items to the right first, then down when no horizontal space remains.
        const collides = (a: any, b: any) => !(a.x + a.w <= b.x || a.x >= b.x + b.w || a.y + a.h <= b.y || a.y >= b.y + b.h);

        const resolveCollisions = (items: any[], colsCount: number) => {
          const placed: any[] = [];
          // sort by y then x so earlier/top items are placed first
          const toPlace = items.slice().sort((a,b) => (a.y - b.y) || (a.x - b.x));
          for (const item of toPlace) {
            const candidate = { ...item };
            // clamp x/w
            candidate.x = Math.max(0, Math.min(colsCount - candidate.w, candidate.x));
            // try shifting right while colliding
            let attempts = 0;
            while (placed.some(p => collides(candidate, p)) && attempts < 100) {
              // try move right by 1
              if (candidate.x + candidate.w < colsCount) {
                candidate.x = candidate.x + 1;
              } else {
                // no room to the right, push down to the first y below all placed items at this x range
                const maxY = Math.max(0, ...placed.filter(p => !(candidate.x + candidate.w <= p.x || candidate.x >= p.x + p.w)).map(p => p.y + p.h));
                candidate.y = Math.max(candidate.y + 1, maxY || candidate.y + 1);
                // reset x to original if needed
                candidate.x = Math.max(0, Math.min(colsCount - candidate.w, candidate.x));
              }
              attempts++;
            }
            placed.push(candidate);
          }
          return placed;
        };

        const resolved = resolveCollisions(normalized, cols);

        // prevent echo: mark we're applying layout so incoming prop effect doesn't loop
        applyingLayoutRef.current = true;
        try { updateLayoutStore(resolved); } catch (e) {}
        try {
          if (onLayoutChange) onLayoutChange(resolved);
        } catch (e) {
          // ignore
        }
        try { if (JSON.stringify(debugLayout) !== JSON.stringify(resolved)) setDebugLayout(resolved); } catch (e) {}
        // clear applying flag shortly after
        setTimeout(() => { applyingLayoutRef.current = false; }, 300);
      }
    } catch (err) {
      console.warn('handleDragStop: failed to forward layout', err);
      applyingLayoutRef.current = false;
    }
    // Schedule autosave after layout settled
    try {
      scheduleAutosaveAfterLayoutChange();
    } catch (e) {
      // ignore
    }
    try {
      setPlaceholderItem(null);
    } catch (e) {
      // ignore
    }
    // Debug: log DOM sizes for the moved widget to help diagnose sizing issues
    try {
      const id = newItem?.i || oldItem?.i;
      if (id && typeof window !== 'undefined') {
        setTimeout(() => {
          try {
            const gridItem = document.querySelector(`.react-grid-item[data-grid-id="${id}"]`) || document.querySelector(`.react-grid-item[data-grid='{"i":"${id}"}']`);
            const wrapper = document.querySelector(`[data-grid-id="${id}"]`) || document.querySelector(`[data-grid='{"i":"${id}"}']`);
            const widgetEl = document.querySelector(`[data-widget-id="${id}"]`) || document.querySelector(`[data-grid-id="${id}"] .dashboard-visual`);
            // no-op; variables captured for debugging use only
            void gridItem; void wrapper; void widgetEl;
          } catch (err) {
            // ignore
          }
        }, 80);
      }
    } catch (err) {}
  };

  // Throttled onDrag to update placeholder position in store for smoother interactions
  // While dragging we avoid persisting layout to the store to prevent thrash/jumps.
  // Keep a ref of the latest dragging layout for possible UI use, but don't call onLayoutChange.
  const dragThrottleRef = React.useRef<number | null>(null);
  const draggingLayoutRef = React.useRef<any[] | null>(null);
  const handleDrag = (layout: any[], oldItem: any, newItem: any, placeholder: any, e: any, element: any) => {
    try {
      // Add logging and visual feedback during drag
      if (oldItem && newItem) {
        // Optional: Add visual feedback during drag
        const target = (e && e.target) || null;
        if (target) {
          const container = (target as HTMLElement).closest('.dashboard-visual') as HTMLElement | null;
          if (container) {
            container.style.transition = 'none'; // Disable transitions during drag
            container.style.transform = 'scale(1.02)';
            container.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
            container.style.borderColor = 'var(--ant-color-primary)';
          }
        }
      }
      
      if (dragThrottleRef.current) {
        cancelAnimationFrame(dragThrottleRef.current as number);
      }
      dragThrottleRef.current = requestAnimationFrame(() => {
        try {
          const normalized = layout.map((l: any) => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h }));
          draggingLayoutRef.current = normalized;
          // do NOT call onLayoutChange here to avoid writing intermediate positions to store
          try {
            if (placeholder && JSON.stringify(placeholderItem) !== JSON.stringify(placeholder)) {
              setPlaceholderItem(placeholder || null);
            }
          } catch (e) {
            // ignore
          }
        } catch (err) {}
      });
    } catch (e) {
      // ignore
    }
  };

  // Handle window resize events to recompute grid positions
  useEffect(() => {
    const handleResize = () => {
      if (isDragging || isResizing) return;
      try {
        // dispatch resize event so react-grid-layout recalculates positions
        window.dispatchEvent(new Event('resize'));
      } catch (e) {}
    };
    
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize as any);
    };
  }, [isDragging, isResizing]);

  // Resolve collisions for incoming layout prop (e.g., on load or external updates)
  useEffect(() => {
    try {
      // If we are the author of the layout change, skip to avoid echoing back and forth
      if (applyingLayoutRef.current) {
        applyingLayoutRef.current = false;
        return;
      }
      if (!layout || !Array.isArray(layout)) return;
      // reuse normalize logic from handleLayoutChange
      const normalizeLayout = (layoutArr: any[]) => {
        const items = layoutArr.map((l) => ({ ...l }));
        items.sort((a, b) => (a.y - b.y) || (a.x - b.x));
        const placed: any[] = [];
        const cols = 12;
        const collides = (a: any, b: any) => !(a.x + a.w <= b.x || a.x >= b.x + b.w || a.y + a.h <= b.y || a.y >= b.y + b.h);
        for (const item of items) {
          item.x = Math.max(0, Math.min(item.x, cols - item.w));
          let attempt = 0;
          while (placed.some((p) => collides(item, p)) && attempt < 200) {
            item.y = Math.max(item.y + 1, (Math.max(...placed.map((p) => p.y + p.h)) || 0));
            attempt++;
          }
          placed.push(item);
        }
        return placed;
      };
      const normalized = normalizeLayout(layout);
      // Only update local debug view — do not call onLayoutChange here to avoid
      // feedback loops where incoming layout props trigger a parent update which
      // then re-supplies a slightly different layout back to this component.
      try { if (JSON.stringify(debugLayout) !== JSON.stringify(normalized)) setDebugLayout(normalized); } catch (e) {}
    } catch (e) {}
  }, [layout]);

  // Compute pixel rect for grid item (used for ghost placeholder)
  const getItemRect = (item: any) => {
    try {
      const container = canvasRef.current;
      if (!container || !item) return null;
      const cols = 12;
      const marginX = 16;
      const marginY = 16;
      const containerPaddingX = 16;
      const containerWidth = container.clientWidth - (containerPaddingX * 2);
      const colWidth = (containerWidth - (cols - 1) * marginX) / cols;
      const left = containerPaddingX + item.x * (colWidth + marginX);
      const rowHeight = 120; // Match the rowHeight prop
      const top = (item.y * (rowHeight + marginY)) + /* account for title area */ 0;
      const width = item.w * colWidth + (item.w - 1) * marginX;
      const height = item.h * rowHeight + (item.h - 1) * marginY;
      return { left, top, width, height };
    } catch (e) { return null; }
  };

  // Manual resize fallback: if resize handles are blocked by CSS or library issues,
  // allow resizing by dragging the SE handle via delegated events on canvas.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const toGridSize = (pixelDeltaX: number, pixelDeltaY: number, containerWidth: number, cols: number, rowHeight: number) => {
      const colWidth = (containerWidth - (16 * 2)) / cols; // account for containerPadding in grid
      const dw = Math.round(pixelDeltaX / colWidth);
      const dh = Math.round(pixelDeltaY / rowHeight);
      return { dw, dh };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!manualResizeState.current.active) return;
      e.preventDefault();
      try {
        const st = manualResizeState.current;
        const widgetId = st.widgetId as string;
        const dx = e.clientX - (st.startX || 0);
        const dy = e.clientY - (st.startY || 0);
        const containerWidth = el.clientWidth || 1200;
        const { dw, dh } = toGridSize(dx, dy, containerWidth, 12, 120);
        const newW = Math.max(1, (st.startW || 1) + dw);
        const newH = Math.max(1, (st.startH || 1) + dh);

        // Throttle updates via RAF
        if (st.raf) cancelAnimationFrame(st.raf);
        st.raf = requestAnimationFrame(() => {
          try {
            // Build a layout update for this widget only
            const updatedLayout = effectiveWidgets.map((w: any) => ({ i: w.id, x: w.position.x, y: w.position.y, w: w.position.w, h: w.position.h }));
            const item = updatedLayout.find((it: any) => it.i === widgetId);
            if (item) {
              item.w = newW;
              item.h = newH;
            }
            if (onLayoutChange) onLayoutChange(updatedLayout);
          } catch (err) {}
        });
      } catch (err) {}
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!manualResizeState.current.active) return;
      manualResizeState.current.active = false;
      if (manualResizeState.current.raf) cancelAnimationFrame(manualResizeState.current.raf);
      manualResizeState.current.raf = null;
      setIsResizing(false);
      // schedule save
      try { scheduleAutosaveAfterLayoutChange(); } catch (e) {}
      // persist final size for the resized widget
      try {
        const st = manualResizeState.current;
        const widgetId = st.widgetId as string;
        if (widgetId && onWidgetUpdate && canvasRef.current) {
          const containerWidth = canvasRef.current.clientWidth || 1200;
          const colWidth = (containerWidth - (16 * 2) - (12 - 1) * 16) / 12;
          const dx = e.clientX - (st.startX || 0);
          const dy = e.clientY - (st.startY || 0);
          const dw = Math.round(dx / (colWidth + 16));
          const dh = Math.round(dy / (120 + 16));
          const newW = Math.max(1, (st.startW || 1) + dw);
          const newH = Math.max(1, (st.startH || 1) + dh);
          try { onWidgetUpdate(widgetId, { position: { w: newW, h: newH } }); } catch (err) {}
          try { window.dispatchEvent(new Event('resize')); } catch (err) {}
          try { window.dispatchEvent(new CustomEvent('widget:resized', { detail: { id: widgetId, item: { w: newW, h: newH } } })); } catch (err) {}
        }
      } catch (err) { console.warn('persist manual resize failed', err); }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Find the nearest resizable handle ancestor (handles may contain inner elements)
      const handleEl = (target as HTMLElement).closest && (target as HTMLElement).closest('.react-resizable-handle.react-resizable-handle-se');
      if (!handleEl) return;

      // Find closest widget container from handle
      const container = (handleEl as HTMLElement).closest('.dashboard-widget') as HTMLElement | null;
      if (!container) return;
      const widgetId = container.getAttribute('data-grid-id') || container.getAttribute('key') || container.getAttribute('data-grid') || undefined;
      // Try to get widget id from data-grid attribute fallback
      let resolvedId = widgetId;
      if (!resolvedId) {
        // fallback: parse layoutItem i attribute by reading data-grid JSON if present
        try {
          const dg = container.getAttribute('data-grid');
          if (dg) {
            const parsed = typeof dg === 'string' ? JSON.parse(dg) : dg;
            if (parsed && parsed.i) resolvedId = parsed.i;
          }
        } catch (err) {}
      }

      if (!resolvedId) return;

      // initialize manual resize
      manualResizeState.current.active = true;
      manualResizeState.current.widgetId = resolvedId;
      manualResizeState.current.startX = e.clientX;
      manualResizeState.current.startY = e.clientY;
      const widget = effectiveWidgets.find((w: any) => w.id === resolvedId);
      manualResizeState.current.startW = widget ? widget.position.w : 6;
      manualResizeState.current.startH = widget ? widget.position.h : 4;
      setIsResizing(true);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      e.preventDefault();
    };

    el.addEventListener('mousedown', onMouseDown as any);
    return () => {
      el.removeEventListener('mousedown', onMouseDown as any);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [canvasRef, effectiveWidgets, onLayoutChange]);

  const scheduleAutosaveAfterLayoutChange = () => {
    try {
      if ((window as any).requestIdleCallback) {
        (window as any).requestIdleCallback(() => {
          if ((window as any).__scheduleSaveBridge) {
            (window as any).__scheduleSaveBridge(800);
          } else {
            scheduleSave(800);
          }
        });
      } else {
        if ((window as any).__scheduleSaveBridge) {
          (window as any).__scheduleSaveBridge(800);
        } else {
          scheduleSave(800);
        }
      }
    } catch (e) {
      // best-effort fallback
      if ((window as any).__scheduleSaveBridge) {
        try { (window as any).__scheduleSaveBridge(800); } catch (_) {}
      } else {
        try { scheduleSave(800); } catch (_) {}
      }
    }
  };

  // scheduleSave bridge - exposeable and fallback save handler
  const scheduleSave = (delay = 800) => {
    try {
      if ((window as any).__scheduleSaveBridge) {
        (window as any).__scheduleSaveBridge(delay);
        return;
      }
    } catch (e) {}
    // fallback: call handleSave after delay
    try {
      window.setTimeout(() => handleSave(), delay);
    } catch (e) {
      // ignore
    }
  };

  const handleResizeStart = () => {
    setIsResizing(true);
  };

  const handleResizing = (layout: any[], oldItem?: any, newItem?: any, placeholder?: any, e?: any, element?: any) => {
    try {
      // update debug layout for visual feedback, but don't persist
      const normalized = layout.map((l: any) => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h }));
      try { if (JSON.stringify(debugLayout) !== JSON.stringify(normalized)) setDebugLayout(normalized); } catch (e) {}
      try { window.dispatchEvent(new CustomEvent('widget:resizing', { detail: { id: newItem?.i, oldItem, newItem } })); } catch (e) {}
      try { setPlaceholderItem(placeholder || null); } catch (e) {}
    } catch (e) {}
  };

  const handleResizeStop = (layout?: any, oldItem?: any, newItem?: any, e?: any) => {
    setIsResizing(false);
    // forward updated layout when resize completes and schedule save
    try {
      if (layout && onLayoutChange) {
        const normalized = layout.map((l: any) => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h }));
        onLayoutChange(normalized);
        try { setDebugLayout(normalized); } catch (e) {}
      }
    } catch (err) { console.warn('handleResizeStop: failed to forward layout', err); }
    try { scheduleAutosaveAfterLayoutChange(); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('widget:resize', { detail: { id: newItem?.i, oldItem, newItem } })); } catch (e) {}
    try {
      setTimeout(() => {
        try { window.dispatchEvent(new Event('resize')); } catch (e) {}
        try { window.dispatchEvent(new CustomEvent('widget:resized', { detail: { id: newItem?.i, item: newItem } })); } catch (e) {}
      }, 120);
    } catch (e) {}
  };

  // Enhanced widget actions
  const handleWidgetAction = (action: string, widget: DashboardWidget) => {
    switch (action) {
      case 'duplicate':
        onWidgetDuplicate?.(widget);
        message.success('Widget duplicated');
        break;
      case 'delete':
        Modal.confirm({
          title: 'Delete Widget',
          content: 'Are you sure you want to delete this widget?',
          onOk: () => {
            onWidgetDelete?.(widget.id);
            message.success('Widget deleted');
          },
        });
        break;
      case 'config':
        onWidgetSelect?.(widget);
        break;
      default:
        break;
    }
  };

  // Simple resize handles visibility control
  useEffect(() => {
    const setupResizeHandles = () => {
      // Hide all handles initially
      const handles = document.querySelectorAll('.react-resizable-handle');
      handles.forEach(handle => {
        const element = handle as HTMLElement;
        element.style.opacity = '0';
        element.style.visibility = 'hidden';
        element.style.pointerEvents = 'auto';
      });

      // Add hover listeners to grid items
      const gridItems = document.querySelectorAll('.react-grid-item');
      gridItems.forEach(item => {
        const showHandles = () => {
          const itemHandles = item.querySelectorAll('.react-resizable-handle');
          itemHandles.forEach(handle => {
            const element = handle as HTMLElement;
            element.style.opacity = '1';
            element.style.visibility = 'visible';
            element.style.transform = 'scale(1.05)';
          });
        };

        const hideHandles = () => {
          const itemHandles = item.querySelectorAll('.react-resizable-handle');
          itemHandles.forEach(handle => {
            const element = handle as HTMLElement;
            element.style.opacity = '0';
            element.style.visibility = 'hidden';
            element.style.transform = 'scale(1)';
          });
        };

        // Remove existing listeners to prevent duplicates
        item.removeEventListener('mouseenter', showHandles);
        item.removeEventListener('mouseleave', hideHandles);
        
        // Add new listeners
        item.addEventListener('mouseenter', showHandles);
        item.addEventListener('mouseleave', hideHandles);
      });
    };

    setupResizeHandles();

    // Re-setup periodically to catch new widgets
    const interval = setInterval(setupResizeHandles, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [widgets]);

  return (
      <div 
        ref={canvasRef}
        style={{
          height: '100%',
          width: '100%',
          position: 'relative',
          background: 'var(--ant-color-bg-layout)',
          overflow: 'visible',
          /* Use react-grid-layout's transformScale to handle zoom; avoid CSS wrapper transform which
             causes coordinate mismatches and layout instability during drag/resize/scroll. */
          transition: isDragging || isResizing ? 'none' : 'transform 0.2s ease',
          border: isDragOver ? '2px dashed var(--ant-color-primary)' : 'none',
          borderRadius: '8px',
          minHeight: '400px'
        }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Empty State - Centered in Canvas Area */}
      {widgets.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -30%)', // Offset to center in canvas area below title
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
          zIndex: 1,
          marginTop: '80px' // Additional offset to account for title area
        }}>
          <div style={{ marginBottom: '16px' }}>
            <BarChartOutlined style={{ 
              fontSize: '64px', 
              color: 'var(--color-text-tertiary)',
              opacity: 0.6
            }} />
          </div>
          <Title level={4} style={{ 
            color: 'var(--color-text-secondary)',
            marginBottom: '8px',
            fontWeight: '500'
          }}>
            Empty Dashboard
          </Title>
          <Text style={{ 
            color: 'var(--color-text-tertiary)',
            fontSize: 'var(--font-size-base)'
          }}>
            Drag widgets from the library to start building your dashboard
          </Text>
        </div>
      )}

      {/* Dashboard Title and Subtitle */}
      <div style={{ 
        marginBottom: '20px', 
        textAlign: 'left',
        borderBottom: '1px solid var(--color-border-primary)',
        paddingBottom: '16px'
      }}>
        <Input
          placeholder="Dashboard Title"
          value={dashboardTitle}
          onChange={(e) => onTitleChange?.(e.target.value)}
          style={{ 
            border: 'none',
            background: 'transparent',
            color: 'var(--ant-color-text)',
            fontSize: '24px',
            fontWeight: 'bold',
            padding: '0',
            marginBottom: '4px'
          }}
          size="large"
        />
        <Input
          placeholder="Dashboard Subtitle"
          value={dashboardSubtitle}
          onChange={(e) => onSubtitleChange?.(e.target.value)}
          style={{ 
            border: 'none',
            background: 'transparent',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-base)',
            padding: '0'
          }}
          size="small"
        />
      </div>

      {/* Grid Layout */}
      <ResponsiveGridLayout
        
        layouts={{ lg: layout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={80}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragStop={handleDragStop}
        onResizeStart={handleResizeStart}
        onResize={handleResizing}
        onResizeStop={handleResizeStop}
        isDraggable={true}
        isResizable={true}
        // Improved drag configuration for better drop functionality
        draggableCancel={".no-drag, input, textarea, .ant-input, .ant-select, .ant-picker, .ant-dropdown, .ant-tooltip, .ant-btn, .ant-menu, .ant-tabs, .ant-dropdown-menu, .react-resizable-handle"}
        useCSSTransforms={true}
        measureBeforeMount={true}
        // Enhanced drag settings for better reliability
        compactType="vertical"
        preventCollision={true}
        verticalCompact={true}
        // If the canvas is visually scaled via CSS transform, inform react-grid-layout
        // so drag coordinates are calculated correctly.
        transformScale={zoomLevel / 100}
        // Allow free placement (disable automatic collision-driven repositioning)
        margin={[16, 16]}
        containerPadding={[16, 16]}
        resizeHandles={['se','ne','sw','nw']}
        // Improve drag performance and drop accuracy
        isBounded={false}
        allowOverlap={false}
        // Improve drop accuracy
        droppingItem={{ i: '__dropping-elem__', w: 6, h: 4 }}
        // reduce visual noise: hide the dashed placeholder and resize corner visuals by default
        // (we still allow resizing via handles when hovered)
        className="layout dashboard-grid"
        style={{
          background: showGrid ? 
            'var(--color-brand-primary-light)' : 
            'transparent'
        }}
      >
        <style>{`
          /* Hide react-grid-layout placeholder dashed border */
          .dashboard-grid .react-grid-placeholder { border: none !important; box-shadow: none !important; }
          
          /* Improved resize handles - visible on hover with better styling */
          .dashboard-grid .react-resizable-handle { 
            opacity: 0 !important; 
            visibility: hidden !important;
            transition: all 200ms ease !important; 
            z-index: 9999 !important; 
            width: 16px !important; 
            height: 16px !important; 
            pointer-events: auto !important; 
            cursor: se-resize !important; 
            box-sizing: border-box !important;
            background: #1890ff !important;
            border: 2px solid #ffffff !important;
            border-radius: 50% !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
            position: absolute !important;
          }
          
          /* SE handle (bottom-right) */
          .dashboard-grid .react-resizable-handle-se {
            bottom: -8px !important;
            right: -8px !important;
            cursor: se-resize !important;
          }
          
          /* NE handle (top-right) */
          .dashboard-grid .react-resizable-handle-ne {
            top: -8px !important;
            right: -8px !important;
            cursor: ne-resize !important;
          }
          
          /* SW handle (bottom-left) */
          .dashboard-grid .react-resizable-handle-sw {
            bottom: -8px !important;
            left: -8px !important;
            cursor: sw-resize !important;
          }
          
          /* NW handle (top-left) */
          .dashboard-grid .react-resizable-handle-nw {
            top: -8px !important;
            left: -8px !important;
            cursor: nw-resize !important;
          }
          
          /* Show handles on widget hover */
          .dashboard-grid .react-grid-item:hover .react-resizable-handle { 
            opacity: 1 !important; 
            visibility: visible !important;
            transform: scale(1.1) !important;
            background: #40a9ff !important;
          }
          
          /* Show handles on direct hover */
          .dashboard-grid .react-resizable-handle:hover {
            opacity: 1 !important;
            visibility: visible !important;
            transform: scale(1.2) !important;
            background: #096dd9 !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
          }
          
          /* Ensure handles are always clickable */
          .dashboard-grid .react-resizable-handle:active {
            background: #0050b3 !important;
            transform: scale(1.1) !important;
          }
          /* Remove decorative pseudo element if present */
          .dashboard-grid .react-resizable-handle::after { display: none !important; }
          /* Hide handles by default but allow hover to show them */
          .react-grid-layout .react-resizable-handle { 
            opacity: 0 !important; 
            visibility: hidden !important; 
            pointer-events: auto !important;
          }
          /* Higher specificity hover rules to override force-hide */
          .dashboard-grid .react-grid-layout .react-grid-item:hover .react-resizable-handle,
          .dashboard-grid .react-grid-layout .dashboard-item-wrapper:hover .react-resizable-handle,
           .dashboard-grid .react-grid-layout .dashboard-visual:hover .react-resizable-handle {
            opacity: 1 !important; 
            visibility: visible !important;
            transform: scale(1.05); 
            pointer-events: auto !important;
          }
          /* Position handles slightly outside so users can grab them easily */
          .dashboard-grid .react-resizable-handle.react-resizable-handle-se { right: -10px; bottom: -10px; }
          .dashboard-grid .react-resizable-handle.react-resizable-handle-ne { right: -10px; top: -10px; }
          .dashboard-grid .react-resizable-handle.react-resizable-handle-sw { left: -10px; bottom: -10px; }
          .dashboard-grid .react-resizable-handle.react-resizable-handle-nw { left: -10px; top: -10px; }
       /* Clean minimal visual styling - optimized sizing */
       .dashboard-visual { 
         outline: none !important; 
         overflow: visible !important; 
         position: relative !important; 
         transition: box-shadow 0.2s ease !important; 
         width: 100% !important; 
         height: 100% !important; 
         min-height: 160px !important;  /* Increased from 120px for better readability */
         min-width: 240px !important;  /* Increased from 200px for better readability */
         box-sizing: border-box !important;
         background: transparent !important;
         display: flex !important;
         flex-direction: column !important;
       }
          
          .dashboard-visual--selected { 
            box-shadow: 0 0 0 2px var(--ant-color-primary) !important;
          }
          
          .dashboard-visual:hover { 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important; 
          }
          
          /* Visual content should fill properly */
          .dashboard-visual > div { 
            overflow: visible !important; 
            height: 100% !important; 
            width: 100% !important; 
            min-height: 120px !important;  /* Increased from 100px */
            min-width: 200px !important;   /* Increased from 150px */
            box-sizing: border-box !important;
            flex: 1 1 auto !important;
            display: flex !important;
            flex-direction: column !important;
          }
          
          /* Chart containers should fill available space */
          .dashboard-visual [ref] {
            flex: 1 1 auto !important;
            min-height: 120px !important;  /* Increased from 100px */
            min-width: 200px !important;   /* Increased from 150px */
            width: 100% !important;
            height: 100% !important;
          }
          
          /* Dashboard item wrapper styling */
          .dashboard-item-wrapper { 
            transition: transform 160ms ease, top 160ms ease, left 160ms ease !important;
            border: none !important;
            background: transparent !important;
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
          }
          
          /* React grid item styling */
          .dashboard-grid .react-grid-item {
            border: none !important;
            background: transparent !important;
            display: flex !important;
            align-items: stretch !important;
            height: 100% !important;
          }
          
          .dashboard-grid .react-grid-item > .dashboard-item-wrapper > .dashboard-widget { 
            flex: 1 1 auto !important; 
            height: 100% !important; 
          }
          /* Placeholder styling for smoother drag feedback */
          .dashboard-grid .react-grid-placeholder { 
            border: 2px dashed var(--ant-color-primary) !important; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important; 
            background: var(--ant-color-primary-bg); 
            border-radius: 8px; 
            opacity: 0.8;
          }
          /* Widget selection styling */
          .dashboard-visual--selected {
            box-shadow: 0 0 0 2px var(--ant-color-primary) !important;
            border-radius: 4px;
          }
          /* Visual hover effects */
          .dashboard-visual:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-radius: 4px;
          }
          /* Improve drag feedback */
          .dashboard-grid .react-grid-item.react-draggable-dragging {
            z-index: 1000;
            transform: rotate(2deg) !important;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2) !important;
          }
        `}</style>
        {widgets.map((widget) => {
          const raw: any = (layout as any).find((item: any) => item.i === widget.id) || null;
          const cols = 12;
          const normalize = (it: any): any => {
            if (!it) return { x: 0, y: 0, w: 8, h: 6, i: widget.id } as any;
            const ii: any = it as any;
            const x = Math.max(0, Math.min(cols - (ii.w || 1), Number(ii.x || 0)));
            const w = Math.max(1, Math.min(cols, Number(ii.w || 8)));
            const h = Math.max(1, Number(ii.h || 6));
            const y = Math.max(0, Number(ii.y || 0));
            // preserve original id type so store lookup matches widget.id
            const idVal = (ii && ii.i !== undefined) ? ii.i : widget.id;
            // Only mark as static if widget is actually locked
            return { i: String(idVal), x, y, w, h, static: widget.isLocked || false } as any;
          };
          const layoutItem: any = normalize(raw);
          return (
          <div 
              key={widget.id} 
              data-grid={layoutItem}
              data-grid-id={String(widget.id)}
              className={`dashboard-visual ${selectedWidget?.id === widget.id ? 'dashboard-visual--selected' : ''} ${widget.isLocked ? 'locked' : ''}`}
              onContextMenu={(e) => handleContextMenu(e, widget)}
              onClick={() => onWidgetSelect(widget)}
              style={{ 
                position: 'relative', 
                background: 'transparent', 
                padding: 0, 
                height: '100%', 
                width: '100%',
                borderRadius: '4px',
                transition: 'box-shadow 0.2s ease'
              }}
            >
              {/* PowerBI-style Selection Indicator */}
              {selectedWidget?.id === widget.id && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  border: '2px solid var(--ant-color-primary)',
                  borderRadius: '4px',
                  pointerEvents: 'none',
                  zIndex: 1
                }} />
              )}
              
              {/* Widget Status Indicators - Minimal */}
              <div style={{
                position: 'absolute',
                top: '4px',
                left: '4px',
                zIndex: 10,
                opacity: selectedWidget?.id === widget.id ? 1 : 0,
                transition: 'opacity 0.2s ease'
              }}>
                <Space size="small">
                  {!widget.isVisible && (
                    <Tooltip title="Hidden">
                      <EyeInvisibleOutlined style={{ color: 'var(--color-text-tertiary)', fontSize: '12px' }} />
                    </Tooltip>
                  )}
                  {widget.isLocked && (
                    <Tooltip title="Locked">
                      <LockOutlined style={{ color: 'var(--color-functional-warning)', fontSize: '12px' }} />
                    </Tooltip>
                  )}
                </Space>
              </div>
              
              {/* Widget Actions - Minimal */}
              <div style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                zIndex: 10,
                opacity: selectedWidget?.id === widget.id ? 1 : 0,
                transition: 'opacity 0.2s ease'
              }}>
                <Space size="small">
                  <Tooltip title="Duplicate">
                    <Button 
                      type="text" 
                      size="small" 
                      icon={<CopyOutlined />} 
                      onClick={(e) => {
                        e.stopPropagation();
                        onWidgetDuplicate?.(widget);
                      }}
                    />
                  </Tooltip>
                  <Dropdown
                    menu={{
                      items: [
                        { 
                          key: 'view-config', 
                          icon: <SettingOutlined />, 
                          label: 'View ECharts Config',
                          onClick: () => {
                            message.info('ECharts config logged to console');
                            console.log('ECharts options for widget:', widget.id, widget);
                          }
                        },
                        { type: 'divider' as const },
                        { 
                          key: 'lock', 
                          icon: widget.isLocked ? <UnlockOutlined /> : <LockOutlined />, 
                          label: widget.isLocked ? 'Unlock' : 'Lock',
                          onClick: () => onWidgetUpdate(widget.id, { isLocked: !widget.isLocked })
                        },
                        { 
                          key: 'visibility', 
                          icon: widget.isVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />, 
                          label: widget.isVisible ? 'Hide' : 'Show',
                          onClick: () => onWidgetUpdate(widget.id, { isVisible: !widget.isVisible })
                        },
                        { type: 'divider' as const },
                        { 
                          key: 'delete', 
                          icon: <DeleteOutlined />, 
                          label: 'Delete',
                          danger: true,
                          onClick: () => onWidgetDelete(widget.id)
                        }
                      ]
                    }}
                    trigger={['click']}
                    placement="bottomRight"
                  >
                    <Button 
                      type="text" 
                      size="small" 
                      icon={<MoreOutlined />}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Dropdown>
                </Space>
              </div>

              {/* Widget Content - Direct rendering without container wrapper */}
              <div
                style={{ height: '100%', width: '100%', overflow: 'visible', display: 'flex', flexDirection: 'column' }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  try { onWidgetSelect?.(widget); } catch (e) {}
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <WidgetRenderer
                  widget={widget}
                  onConfigUpdate={(config: any) => onWidgetConfigUpdate(widget.id, config)}
                  onWidgetClick={onWidgetSelect}
                  onDelete={(widgetId: string) => onWidgetDelete(widgetId)}
                  onDuplicate={onWidgetDuplicate}
                  onUpdate={onWidgetUpdate}
                  isDarkMode={isDarkMode}
                  isSelected={selectedWidget?.id === widget.id}
                />
              </div>
            </div>
          );
        })}
        {/* Debug overlay (dev only) showing last normalized layout */}
        {debugLayout && (
          <div style={{ position: 'absolute', right: 12, bottom: 12, zIndex: 99999, background: 'rgba(0,0,0,0.65)', color: '#fff', padding: 8, borderRadius: 6, fontSize: 11, maxWidth: 340, maxHeight: 220, overflow: 'auto' }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Layout (dev)</div>
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(debugLayout, null, 2)}</pre>
          </div>
        )}
        {/* Ghost placeholder for smoother push animation */}
        {placeholderItem && (
          (() => {
            const rect = getItemRect(placeholderItem);
            if (!rect) return null;
            return (
              <div style={{
                position: 'absolute',
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
                pointerEvents: 'none',
                background: 'rgba(0, 120, 212, 0.06)',
                border: '1px dashed rgba(0,120,212,0.18)',
                borderRadius: 6,
                transition: 'left 160ms ease, top 160ms ease, width 160ms ease, height 160ms ease, opacity 160ms ease',
                zIndex: 9998
              }} className="dashboard-ghost-placeholder" />
            );
          })()
        )}
      </ResponsiveGridLayout>

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 10000,
            background: 'var(--ant-color-bg-container)',
            border: '1px solid var(--ant-color-border)',
            borderRadius: '6px',
            boxShadow: 'var(--shadow-lg)',
            padding: '4px 0',
            minWidth: '150px'
          }}
          onClick={() => setContextMenu(null)}
        >
          <Menu
            items={createContextMenuItems(contextMenu.widget)}
            style={{
              background: 'transparent',
              border: 'none',
              boxShadow: 'none'
            }}
          />
        </div>
      )}

    </div>
  );
};

export default AdvancedDashboardCanvas;
