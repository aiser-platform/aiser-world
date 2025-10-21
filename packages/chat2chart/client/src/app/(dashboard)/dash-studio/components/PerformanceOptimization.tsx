'use client';

import React, { memo, useCallback, useMemo } from 'react';
import { Card, Button, Space, Typography, Row, Col, Tooltip, Badge } from 'antd';
import { ReloadOutlined, ClockCircleOutlined, SyncOutlined, MoreOutlined, ThunderboltOutlined } from '@ant-design/icons';

const { Text } = Typography;

// Performance-optimized widget component
export const OptimizedChartWidget = memo(({ 
  widget, 
  isDarkMode, 
  onRefresh 
}: { 
  widget: any; 
  isDarkMode: boolean; 
  onRefresh: (id: string) => void;
}) => {
  const handleRefresh = useCallback(() => {
    onRefresh(widget.id);
  }, [widget.id, onRefresh]);

  const widgetStyle = useMemo(() => ({
    background: isDarkMode ? '#1f1f1f' : '#ffffff',
    border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
    borderRadius: 8
  }), [isDarkMode]);

  return (
    <Card
      title={widget.title}
      size="small"
      style={widgetStyle}
      extra={
        <Space size="small">
          <Tooltip title="Refresh widget data">
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              type="text"
            />
          </Tooltip>
        </Space>
      }
    >
      {/* Widget content would go here */}
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text type="secondary">{widget.type} Widget</Text>
      </div>
    </Card>
  );
});

OptimizedChartWidget.displayName = 'OptimizedChartWidget';

// Performance-optimized dashboard canvas
export const OptimizedDashboardCanvas = memo(({ 
  widgets, 
  isDarkMode, 
  onWidgetRefresh 
}: { 
  widgets: any[]; 
  isDarkMode: boolean; 
  onWidgetRefresh: (id: string) => void;
}) => {
  const widgetComponents = useMemo(() => 
    widgets.map(widget => (
      <OptimizedChartWidget
        key={widget.id}
        widget={widget}
        isDarkMode={isDarkMode}
        onRefresh={onWidgetRefresh}
      />
    )), 
    [widgets, isDarkMode, onWidgetRefresh]
  );

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
      gap: 16,
      padding: 16
    }}>
      {widgetComponents}
    </div>
  );
});

OptimizedDashboardCanvas.displayName = 'OptimizedDashboardCanvas';

// Performance monitoring hook
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = React.useState({
    renderTime: 0,
    memoryUsage: 0,
    widgetCount: 0
  });

  const measureRenderTime = useCallback((componentName: string, startTime: number) => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    setMetrics(prev => ({
      ...prev,
      renderTime,
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
      widgetCount: prev.widgetCount
    }));

    if (renderTime > 16) { // More than one frame (60fps)
      console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }
  }, []);

  const updateWidgetCount = useCallback((count: number) => {
    setMetrics(prev => ({ ...prev, widgetCount: count }));
  }, []);

  return { metrics, measureRenderTime, updateWidgetCount };
};

// Query caching hook
export const useQueryCache = () => {
  const cache = React.useRef<Map<string, { data: any; timestamp: number; ttl: number }>>(new Map());

  const getCachedData = useCallback((key: string) => {
    const cached = cache.current.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      cache.current.delete(key);
      return null;
    }

    return cached.data;
  }, []);

  const setCachedData = useCallback((key: string, data: any, ttl: number = 300000) => { // 5 minutes default
    cache.current.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }, []);

  const clearCache = useCallback(() => {
    cache.current.clear();
  }, []);

  const getCacheStats = useCallback(() => {
    return {
      size: cache.current.size,
      keys: Array.from(cache.current.keys())
    };
  }, []);

  return { getCachedData, setCachedData, clearCache, getCacheStats };
};

// Virtual scrolling hook for large datasets
export const useVirtualScrolling = (items: any[], itemHeight: number, containerHeight: number) => {
  const [scrollTop, setScrollTop] = React.useState(0);

  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );

    return items.slice(startIndex, endIndex).map((item, index) => ({
      ...item,
      index: startIndex + index
    }));
  }, [items, itemHeight, containerHeight, scrollTop]);

  const totalHeight = items.length * itemHeight;
  const offsetY = Math.floor(scrollTop / itemHeight) * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll
  };
};

// Debounced search hook
export const useDebouncedSearch = (value: string, delay: number = 300) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Bundle optimization utilities
export const BundleOptimizer = {
  // Lazy load ECharts components
  loadECharts: () => import('echarts'),
  
  // Lazy load heavy libraries
  loadHtml2Canvas: () => import('html2canvas'),
  loadJsPDF: () => import('jspdf'),
  // loadXLSX: () => import('xlsx'), // Package not installed
  
  // Preload critical components
  preloadCritical: () => {
    // Preload components that are likely to be used
    import('./ChartWidget');
    import('./UnifiedDesignPanel');
  }
};

export default {
  OptimizedChartWidget,
  OptimizedDashboardCanvas,
  usePerformanceMonitor,
  useQueryCache,
  useVirtualScrolling,
  useDebouncedSearch,
  BundleOptimizer
};


