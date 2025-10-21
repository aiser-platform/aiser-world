'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Button, Breadcrumb, Space, Typography, Card, Tooltip, Dropdown, Menu, message } from 'antd';
import { 
  ArrowLeftOutlined, 
  ArrowRightOutlined, 
  HomeOutlined, 
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  TableOutlined,
  EyeOutlined,
  FilterOutlined
} from '@ant-design/icons';

const { Text } = Typography;

export interface DrillDownContext {
  sourceWidget: string;
  sourceChart: string;
  drillType: 'down' | 'through' | 'across';
  dimension: string;
  value: any;
  filters: Record<string, any>;
  breadcrumb: Array<{ label: string; key: string; widgetId?: string }>;
}

export interface DrillDownNavigationProps {
  context: DrillDownContext | null;
  onNavigateBack: () => void;
  onNavigateToWidget: (widgetId: string) => void;
  onApplyFilters: (filters: Record<string, any>) => void;
  onClearDrillDown: () => void;
  widgets: Array<{ id: string; title: string; type: string }>;
  isDarkMode?: boolean;
}

export const DrillDownNavigation: React.FC<DrillDownNavigationProps> = ({
  context,
  onNavigateBack,
  onNavigateToWidget,
  onApplyFilters,
  onClearDrillDown,
  widgets,
  isDarkMode = false
}) => {
  const [showDrillOptions, setShowDrillOptions] = useState(false);

  // Generate drill-down options based on context
  const drillOptions = useMemo(() => {
    if (!context) return [];

    const options = [];

    // Drill Down Options (more detailed view of same data)
    if (context.drillType === 'down') {
      options.push({
        key: 'drill-down-time',
        label: 'Drill Down by Time',
        icon: <BarChartOutlined />,
        description: 'View monthly data instead of yearly',
        action: () => handleDrillDown('time', 'month')
      });

      options.push({
        key: 'drill-down-category',
        label: 'Drill Down by Category',
        icon: <PieChartOutlined />,
        description: 'View subcategories',
        action: () => handleDrillDown('category', 'subcategory')
      });

      options.push({
        key: 'drill-down-region',
        label: 'Drill Down by Region',
        icon: <TableOutlined />,
        description: 'View by states/provinces',
        action: () => handleDrillDown('region', 'state')
      });
    }

    // Drill Through Options (navigate to related widgets)
    options.push({
      key: 'drill-through-details',
      label: 'View Details Table',
      icon: <TableOutlined />,
      description: 'See detailed data table',
      action: () => handleDrillThrough('table')
    });

    options.push({
      key: 'drill-through-trend',
      label: 'View Trend Analysis',
      icon: <LineChartOutlined />,
      description: 'See trend over time',
      action: () => handleDrillThrough('line-chart')
    });

    options.push({
      key: 'drill-through-composition',
      label: 'View Composition',
      icon: <PieChartOutlined />,
      description: 'See breakdown by category',
      action: () => handleDrillThrough('pie-chart')
    });

    return options;
  }, [context]);

  // Handle drill down action
  const handleDrillDown = useCallback((dimension: string, level: string) => {
    if (!context) return;

    const newFilters = {
      ...context.filters,
      [dimension]: level,
      drillDown: true,
      drillDimension: dimension,
      drillLevel: level
    };

    onApplyFilters(newFilters);
    message.success(`Drilled down to ${level} level`);
  }, [context, onApplyFilters]);

  // Handle drill through action
  const handleDrillThrough = useCallback((targetType: string) => {
    if (!context) return;

    // Find or create target widget
    const targetWidget = widgets.find(w => w.type === targetType);
    
    if (targetWidget) {
      onNavigateToWidget(targetWidget.id);
      message.success(`Navigated to ${targetWidget.title}`);
    } else {
      message.info(`No ${targetType} widget available for drill-through`);
    }
  }, [context, widgets, onNavigateToWidget]);

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = useCallback((item: { key: string; widgetId?: string }) => {
    if (item.widgetId) {
      onNavigateToWidget(item.widgetId);
    } else {
      // Navigate to specific drill level
      onApplyFilters({
        ...context?.filters,
        drillLevel: item.key
      });
    }
  }, [context, onNavigateToWidget, onApplyFilters]);

  if (!context) {
    return null;
  }

  return (
    <Card
      size="small"
      style={{
        marginBottom: 16,
        background: isDarkMode ? '#1f1f1f' : '#ffffff',
        border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
        borderRadius: 8
      }}
      bodyStyle={{ padding: '12px 16px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Breadcrumb Navigation */}
        <Space size="small">
          <Text strong style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
            <EyeOutlined /> Drill Down Navigation
          </Text>
          
          <Breadcrumb
            items={context.breadcrumb.map((item, index) => ({
              title: (
                <Button
                  type="text"
                  size="small"
                  onClick={() => handleBreadcrumbClick(item)}
                  style={{ 
                    color: isDarkMode ? '#ffffff' : '#000000',
                    padding: '0 4px'
                  }}
                >
                  {item.label}
                </Button>
              )
            }))}
            separator={<ArrowRightOutlined style={{ fontSize: 10 }} />}
          />
        </Space>

        {/* Action Buttons */}
        <Space size="small">
          {/* Drill Down Options */}
          <Dropdown
            menu={{
              items: drillOptions.map(option => ({
                key: option.key,
                label: (
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{option.label}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{option.description}</div>
                  </div>
                ),
                icon: option.icon,
                onClick: option.action
              }))
            }}
            trigger={['click']}
            disabled={drillOptions.length === 0}
          >
            <Button
              size="small"
              icon={<FilterOutlined />}
              disabled={drillOptions.length === 0}
            >
              Drill Options
            </Button>
          </Dropdown>

          {/* Navigate Back */}
          <Tooltip title="Go back to previous view">
            <Button
              size="small"
              icon={<ArrowLeftOutlined />}
              onClick={onNavigateBack}
            >
              Back
            </Button>
          </Tooltip>

          {/* Clear Drill Down */}
          <Tooltip title="Clear all drill-down filters">
            <Button
              size="small"
              icon={<HomeOutlined />}
              onClick={onClearDrillDown}
            >
              Clear
            </Button>
          </Tooltip>
        </Space>
      </div>

      {/* Context Information */}
      <div style={{ 
        marginTop: 8, 
        padding: 8, 
        background: isDarkMode ? '#2a2a2a' : '#f5f5f5',
        borderRadius: 4,
        fontSize: 12
      }}>
        <Space size="small">
          <Text style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
            <strong>Source:</strong> {context.sourceWidget}
          </Text>
          <Text style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
            <strong>Dimension:</strong> {context.dimension}
          </Text>
          <Text style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
            <strong>Value:</strong> {String(context.value)}
          </Text>
        </Space>
      </div>
    </Card>
  );
};

// Hook for managing drill-down state
export const useDrillDownNavigation = () => {
  const [drillContext, setDrillContext] = useState<DrillDownContext | null>(null);
  const [drillHistory, setDrillHistory] = useState<DrillDownContext[]>([]);

  const startDrillDown = useCallback((
    sourceWidget: string,
    sourceChart: string,
    drillType: 'down' | 'through' | 'across',
    dimension: string,
    value: any,
    filters: Record<string, any> = {}
  ) => {
    const newContext: DrillDownContext = {
      sourceWidget,
      sourceChart,
      drillType,
      dimension,
      value,
      filters,
      breadcrumb: [
        { label: 'Dashboard', key: 'dashboard' },
        { label: sourceWidget, key: 'source', widgetId: sourceWidget },
        { label: `${dimension}: ${value}`, key: 'current' }
      ]
    };

    setDrillHistory(prev => [...prev, drillContext].filter((item): item is DrillDownContext => Boolean(item)));
    setDrillContext(newContext);
  }, [drillContext]);

  const navigateBack = useCallback(() => {
    if (drillHistory.length > 0) {
      const previousContext = drillHistory[drillHistory.length - 1];
      setDrillContext(previousContext);
      setDrillHistory(prev => prev.slice(0, -1));
    } else {
      setDrillContext(null);
    }
  }, [drillHistory]);

  const clearDrillDown = useCallback(() => {
    setDrillContext(null);
    setDrillHistory([]);
  }, []);

  const updateContext = useCallback((updates: Partial<DrillDownContext>) => {
    setDrillContext(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  return {
    drillContext,
    drillHistory,
    startDrillDown,
    navigateBack,
    clearDrillDown,
    updateContext
  };
};

export default DrillDownNavigation;


