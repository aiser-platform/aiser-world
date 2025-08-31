'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, Button, Space, Tooltip, Tag, Dropdown, MenuProps } from 'antd';
import {
  SettingOutlined,
  FullscreenOutlined,
  DownloadOutlined,
  ReloadOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  UnlockOutlined,
  DeleteOutlined,
  CopyOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  AreaChartOutlined,
  DotChartOutlined,
  CompassOutlined,
  DashboardOutlined,
  FilterOutlined,
  BranchesOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import * as echarts from 'echarts';
import { EChartsConfigProvider, useEChartsConfig } from '../EChartsConfiguration';
import { EChartsOptionGenerator } from '../EChartsConfiguration';
import { DashboardWidget } from '../DashboardConfiguration';

interface ChartWidgetProps {
  widget: DashboardWidget;
  isSelected: boolean;
  isPreviewMode: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<DashboardWidget>) => void;
  onRemove: () => void;
}

// Enhanced Chart Widget Component
export const ChartWidget: React.FC<ChartWidgetProps> = ({
  widget,
  isSelected,
  isPreviewMode,
  onSelect,
  onUpdate,
  onRemove,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chartType, setChartType] = useState(widget.config.chartType || 'bar');

  // Initialize chart when component mounts
  useEffect(() => {
    if (chartRef.current && !chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
      updateChart();
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  // Update chart when widget config changes
  useEffect(() => {
    updateChart();
  }, [widget.config, chartType]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update chart with current configuration
  const updateChart = useCallback(() => {
    if (!chartInstance.current) return;

    try {
      // Generate ECharts option from widget config
      const option = EChartsOptionGenerator.generateOption(
        widget.config.basic || {},
        widget.config.data || [],
        widget.config.standard || {},
        widget.config.advanced || {}
      );

      // Apply chart type override if needed
      if (chartType && chartType !== widget.config.chartType) {
        if (Array.isArray(option.series)) {
          option.series = option.series.map((series: any) => ({
            ...series,
            type: chartType,
          }));
        } else if (option.series) {
          option.series = {
            ...option.series,
            type: chartType,
          };
        }
      }

      chartInstance.current.setOption(option, true);
    } catch (error) {
      console.error('Error updating chart:', error);
      // Show error state
      showErrorState();
    }
  }, [widget.config, chartType]);

  // Show error state when chart fails to render
  const showErrorState = () => {
    if (chartRef.current) {
      chartRef.current.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #ff4d4f;
          text-align: center;
          padding: 20px;
        ">
          <div style="font-size: 24px; margin-bottom: 8px;">⚠️</div>
          <div style="font-weight: 500; margin-bottom: 4px;">Chart Error</div>
          <div style="font-size: 12px; color: #8c8c8c;">Click to configure</div>
        </div>
      `;
    }
  };

  // Chart type options
  const chartTypeOptions: MenuProps = {
    items: [
      {
        key: 'bar',
        label: 'Bar Chart',
        icon: <BarChartOutlined />,
        onClick: () => setChartType('bar'),
      },
      {
        key: 'line',
        label: 'Line Chart',
        icon: <LineChartOutlined />,
        onClick: () => setChartType('line'),
      },
      {
        key: 'pie',
        label: 'Pie Chart',
        icon: <PieChartOutlined />,
        onClick: () => setChartType('pie'),
      },
      {
        key: 'area',
        label: 'Area Chart',
        icon: <AreaChartOutlined />,
        onClick: () => setChartType('area'),
      },
                  {
              key: 'scatter',
              label: 'Scatter Plot',
              icon: <DotChartOutlined />,
              onClick: () => setChartType('scatter'),
            },
            {
              key: 'radar',
              label: 'Radar Chart',
              icon: <CompassOutlined />,
              onClick: () => setChartType('radar'),
            },
            {
              key: 'gauge',
              label: 'Gauge',
              icon: <DashboardOutlined />,
              onClick: () => setChartType('gauge'),
            },
            {
              key: 'funnel',
              label: 'Funnel',
              icon: <FilterOutlined />,
              onClick: () => setChartType('funnel'),
            },
            {
              key: 'tree',
              label: 'Tree',
              icon: <BranchesOutlined />,
              onClick: () => setChartType('tree'),
            },
            {
              key: 'treemap',
              label: 'Treemap',
              icon: <AppstoreOutlined />,
              onClick: () => setChartType('treemap'),
            },
    ],
  };

  // Widget actions menu
  const getWidgetActions = (): MenuProps => ({
    items: [
      {
        key: 'configure',
        label: 'Configure Chart',
        icon: <SettingOutlined />,
        onClick: onSelect,
      },
      {
        key: 'fullscreen',
        label: isFullscreen ? 'Exit Fullscreen' : 'Fullscreen',
        icon: <FullscreenOutlined />,
        onClick: () => setIsFullscreen(!isFullscreen),
      },
      {
        key: 'download',
        label: 'Download Chart',
        icon: <DownloadOutlined />,
        onClick: () => {
          if (chartInstance.current) {
            const dataURL = chartInstance.current.getDataURL();
            const link = document.createElement('a');
            link.download = `${widget.title || 'chart'}.png`;
            link.href = dataURL;
            link.click();
          }
        },
      },
      {
        key: 'refresh',
        label: 'Refresh Data',
        icon: <ReloadOutlined />,
        onClick: updateChart,
      },
      {
        type: 'divider',
      },
      {
        key: 'visibility',
        label: widget.isVisible ? 'Hide Widget' : 'Show Widget',
        icon: widget.isVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />,
        onClick: () => onUpdate({ isVisible: !widget.isVisible }),
      },
      {
        key: 'lock',
        label: widget.isLocked ? 'Unlock Widget' : 'Lock Widget',
        icon: widget.isLocked ? <UnlockOutlined /> : <LockOutlined />,
        onClick: () => onUpdate({ isLocked: !widget.isLocked }),
      },
      {
        key: 'duplicate',
        label: 'Duplicate Widget',
        icon: <CopyOutlined />,
        onClick: () => {
          const duplicatedWidget = {
            ...widget,
            id: `widget-${Date.now()}`,
            title: `${widget.title} (Copy)`,
            position: { ...widget.position, x: widget.position.x + 1, y: widget.position.y + 1 },
          };
          // This would need to be handled by the parent component
          console.log('Duplicate widget:', duplicatedWidget);
        },
      },
      {
        type: 'divider',
      },
      {
        key: 'delete',
        label: 'Delete Widget',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: onRemove,
      },
    ],
  });

  // Get chart type icon
  const getChartTypeIcon = (type: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      bar: <BarChartOutlined />,
      line: <LineChartOutlined />,
      pie: <PieChartOutlined />,
      area: <AreaChartOutlined />,
              scatter: <DotChartOutlined />,
        radar: <CompassOutlined />,
        gauge: <DashboardOutlined />,
        funnel: <FilterOutlined />,
        tree: <BranchesOutlined />,
        treemap: <AppstoreOutlined />,
    };
    return iconMap[type] || <BarChartOutlined />;
  };

  return (
    <Card
      className={`chart-widget ${isSelected ? 'selected' : ''} ${widget.isLocked ? 'locked' : ''}`}
      title={
        <div className="widget-header">
          <div className="widget-title-section">
            <div className="widget-title">{widget.title}</div>
            {widget.subtitle && <div className="widget-subtitle">{widget.subtitle}</div>}
          </div>
          <div className="widget-badges">
            <Tag color="blue" icon={getChartTypeIcon(chartType)}>
              {chartType}
            </Tag>
            {widget.isLocked && <Tag color="orange" icon={<LockOutlined />}>Locked</Tag>}
          </div>
        </div>
      }
      extra={
        !isPreviewMode && (
          <Space size="small">
            <Dropdown menu={chartTypeOptions} trigger={['click']}>
              <Button
                type="text"
                size="small"
                icon={getChartTypeIcon(chartType)}
                title="Change Chart Type"
              />
            </Dropdown>
            <Dropdown menu={getWidgetActions()} trigger={['click']}>
              <Button type="text" size="small" icon={<SettingOutlined />} />
            </Dropdown>
          </Space>
        )
      }
      size="small"
      onClick={onSelect}
      style={{
        height: '100%',
        backgroundColor: '#ffffff',
        border: isSelected ? '2px solid #1890ff' : '1px solid #f0f0f0',
        cursor: 'pointer',
      }}
    >
      <div className="chart-content">
        <div
          ref={chartRef}
          style={{
            width: '100%',
            height: '100%',
            minHeight: '200px',
          }}
        />
      </div>
    </Card>
  );
};

// Wrapper component with ECharts configuration provider
export const ChartWidgetWithConfig: React.FC<ChartWidgetProps> = (props) => (
  <EChartsConfigProvider>
    <ChartWidget {...props} />
  </EChartsConfigProvider>
);
