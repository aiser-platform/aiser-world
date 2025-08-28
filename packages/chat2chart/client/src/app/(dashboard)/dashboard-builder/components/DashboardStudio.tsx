'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Layout, Button, Space, Tabs, Card, Row, Col, Table, Empty, Input, Select, ColorPicker, Switch, Slider, InputNumber, Divider, message, Tooltip, Badge, Dropdown, MenuProps } from 'antd';
import {
  DashboardOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  AreaChartOutlined,
  DotChartOutlined,
  DatabaseOutlined,
  SettingOutlined,
  PlusOutlined,
  SaveOutlined,
  EyeOutlined,
  EditOutlined,
  UndoOutlined,
  RedoOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  FullscreenOutlined,
  CompressOutlined,
  DragOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  BgColorsOutlined,
  FontSizeOutlined,
  FilterOutlined,
  LinkOutlined,
  CommentOutlined,
  HistoryOutlined,
  UserOutlined,
  LockOutlined,
  UnlockOutlined,
  TableOutlined,
  CloseOutlined,
  PlusCircleOutlined
} from '@ant-design/icons';
import { WorkingDataSourceConnector } from './WorkingDataSourceConnector';
import { EChartsIntegration } from './EChartsIntegration';
import * as echarts from 'echarts';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import html2canvas from 'html2canvas';

const ResponsiveGridLayout = WidthProvider(Responsive);
const { Header, Sider, Content } = Layout;
const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;

interface DashboardStudioProps {
  // Add props as needed
}

interface DashboardWidget {
  id: string;
  type: 'chart' | 'kpi' | 'table' | 'text' | 'image' | 'filter' | 'dropdown' | 'date-picker' | 'slider' | 'search';
  title: string;
  subtitle?: string;
  config: any;
  data?: any[];
  position: { x: number; y: number; w: number; h: number };
  style: {
    backgroundColor: string;
    borderColor: string;
    borderRadius: number;
    padding: number;
    fontSize: number;
    fontWeight: string;
    textAlign: 'left' | 'center' | 'right';
    color: string;
  };
  isSelected: boolean;
  isResizable: boolean;
  isDraggable: boolean;
}

interface DashboardPage {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  layout: any[];
}

// Custom ECharts React component compatible with ECharts v6
const ReactECharts = React.forwardRef<HTMLDivElement, { option: any; style?: React.CSSProperties; opts?: any }>(
  ({ option, style = {}, opts = {} }, ref) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<echarts.ECharts | null>(null);

    useEffect(() => {
      if (chartRef.current) {
        // Initialize chart
        chartInstance.current = echarts.init(chartRef.current, undefined, opts);
        
        // Set option
        if (option) {
          chartInstance.current.setOption(option);
        }

        // Handle resize
        const handleResize = () => {
          chartInstance.current?.resize();
        };
        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
          chartInstance.current?.dispose();
        };
      }
    }, []);

    useEffect(() => {
      if (chartInstance.current && option) {
        chartInstance.current.setOption(option, true);
      }
    }, [option]);

    return <div ref={chartRef} style={{ width: '100%', height: '100%', ...style }} />;
  }
);

ReactECharts.displayName = 'ReactECharts';

export const DashboardStudio: React.FC<DashboardStudioProps> = () => {
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [activeWidgets, setActiveWidgets] = useState<DashboardWidget[]>([]);
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<DashboardWidget | null>(null);
  const [dashboardTitle, setDashboardTitle] = useState('My Dashboard');
  const [dashboardSubtitle, setDashboardSubtitle] = useState('Professional Analytics Dashboard');
  const [showGrid, setShowGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const [canvasRef] = useState(useRef<HTMLDivElement>(null));
  const [pages, setPages] = useState<DashboardPage[]>([
    { id: 'page-1', name: 'Main Page', widgets: [], layout: [] }
  ]);
  const [currentPage, setCurrentPage] = useState('page-1');

  // Cross-widget filtering system
  const [globalFilters, setGlobalFilters] = useState<Record<string, any>>({});
  const [filterConnections, setFilterConnections] = useState<Record<string, string[]>>({});

  // Handle filter changes and propagate to connected widgets
  const handleFilterChange = useCallback((filterId: string, value: any) => {
    setGlobalFilters(prev => ({ ...prev, [filterId]: value }));
    
    // Find widgets connected to this filter
    const connectedWidgets = filterConnections[filterId] || [];
    connectedWidgets.forEach(widgetId => {
      const widget = activeWidgets.find(w => w.id === widgetId);
      if (widget && widget.type === 'chart') {
        // Apply filter to chart data
        applyFilterToWidget(widgetId, filterId, value);
      }
    });
  }, [filterConnections, activeWidgets]);

  // Apply filter to specific widget
  const applyFilterToWidget = useCallback((widgetId: string, filterId: string, filterValue: any) => {
    const widget = activeWidgets.find(w => w.id === widgetId);
    if (!widget || !widget.data) return;

    let filteredData = [...widget.data];
    
    // Apply filter logic based on filter type
    if (filterValue && filterValue.length > 0) {
      filteredData = widget.data.filter((item: any) => {
        const filterField = globalFilters[filterId]?.field;
        if (filterField && item[filterField]) {
          return filterValue.includes(item[filterField]);
        }
        return true;
      });
    }

    handleWidgetUpdate(widgetId, { data: filteredData });
  }, [activeWidgets, globalFilters]);

  // Handle data flow from SQL Editor to Charts
  const handleQueryExecution = useCallback((sql: string, results: any[]) => {
    setCurrentQuery(sql);
    setQueryResults(results);
  }, []);

  // Handle chart creation with data
  const handleChartCreation = useCallback((chartConfig: any, data: any[]) => {
    const newWidget: DashboardWidget = {
      id: `chart-${Date.now()}`,
      type: 'chart',
      title: chartConfig.title || 'New Chart',
      subtitle: chartConfig.subtitle,
      config: chartConfig,
      data: data,
      position: { x: 0, y: 0, w: 6, h: 4 },
      style: {
        backgroundColor: '#1f1f1f',
        borderColor: '#404040',
        borderRadius: 8,
        padding: 16,
        fontSize: 14,
        fontWeight: 'normal',
        textAlign: 'center',
        color: '#ffffff'
      },
      isSelected: false,
      isResizable: true,
      isDraggable: true
    };
    setActiveWidgets(prev => [...prev, newWidget]);
    setSelectedWidget(newWidget);
    message.success('Chart added to dashboard!');
  }, []);

  // Handle widget selection
  const handleWidgetSelect = useCallback((widget: DashboardWidget) => {
    setSelectedWidget(widget);
    setActiveWidgets(prev => 
      prev.map(w => ({ ...w, isSelected: w.id === widget.id }))
    );
  }, []);

  // Handle widget update
  const handleWidgetUpdate = useCallback((widgetId: string, updates: Partial<DashboardWidget>) => {
    setActiveWidgets(prev => 
      prev.map(w => 
        w.id === widgetId ? { ...w, ...updates } : w
      )
    );
    if (selectedWidget?.id === widgetId) {
      setSelectedWidget(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [selectedWidget]);

  // Handle widget deletion
  const handleWidgetDelete = useCallback((widgetId: string) => {
    setActiveWidgets(prev => prev.filter(w => w.id !== widgetId));
    if (selectedWidget?.id === widgetId) {
      setSelectedWidget(null);
    }
    message.success('Widget removed from dashboard');
  }, [selectedWidget]);

  // Handle drag and drop from chart toolbox
  const handleChartTypeDrop = useCallback((chartType: string) => {
    const newWidget: DashboardWidget = {
      id: `chart-${Date.now()}`,
      type: 'chart',
      title: `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`,
      config: {
        type: chartType,
        title: `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`,
        options: getDefaultChartOptions(chartType)
      },
      data: queryResults.length > 0 ? queryResults : [],
      position: { x: 0, y: 0, w: 6, h: 4 },
      style: {
        backgroundColor: '#1f1f1f',
        borderColor: '#404040',
        borderRadius: 8,
        padding: 16,
        fontSize: 14,
        fontWeight: 'normal',
        textAlign: 'center',
        color: '#ffffff'
      },
      isSelected: false,
      isResizable: true,
      isDraggable: true
    };
    setActiveWidgets(prev => [...prev, newWidget]);
    setSelectedWidget(newWidget);
    message.success(`${chartType.charAt(0).toUpperCase() + chartType.slice(1)} chart added!`);
  }, [queryResults]);

  // Handle layout change from React-Grid-Layout
  const handleLayoutChange = useCallback((layout: any[]) => {
    // Update widget positions based on new layout
    setActiveWidgets(prev => 
      prev.map(widget => {
        const layoutItem = layout.find(item => item.i === widget.id);
        if (layoutItem) {
          return {
            ...widget,
            position: {
              x: layoutItem.x,
              y: layoutItem.y,
              w: layoutItem.w,
              h: layoutItem.h
            }
          };
        }
        return widget;
      })
    );
  }, []);

  // Add new page
  const handleAddPage = useCallback(() => {
    const newPage: DashboardPage = {
      id: `page-${Date.now()}`,
      name: `Page ${pages.length + 1}`,
      widgets: [],
      layout: []
    };
    setPages(prev => [...prev, newPage]);
    setCurrentPage(newPage.id);
    message.success('New page added!');
  }, [pages]);

  // Delete page
  const handleDeletePage = useCallback((pageId: string) => {
    if (pages.length <= 1) {
      message.warning('Cannot delete the last page');
      return;
    }
    setPages(prev => prev.filter(p => p.id !== pageId));
    if (currentPage === pageId) {
      setCurrentPage(pages[0].id);
    }
    message.success('Page deleted!');
  }, [pages, currentPage]);

  // Get default chart options for new charts
  const getDefaultChartOptions = (chartType: string) => {
    const baseOptions = {
      title: {
        text: `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`,
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' }
      },
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      backgroundColor: 'transparent'
    };

    switch (chartType) {
      case 'bar':
        return {
          ...baseOptions,
          xAxis: { type: 'category', data: ['A', 'B', 'C', 'D'], axisLabel: { color: '#ffffff' } },
          yAxis: { type: 'value', axisLabel: { color: '#ffffff' } },
          series: [{ data: [120, 200, 150, 80], type: 'bar' }]
        };
      case 'line':
        return {
          ...baseOptions,
          xAxis: { type: 'category', data: ['A', 'B', 'C', 'D'], axisLabel: { color: '#ffffff' } },
          yAxis: { type: 'value', axisLabel: { color: '#ffffff' } },
          series: [{ data: [120, 200, 150, 80], type: 'line', smooth: true }]
        };
      case 'pie':
        return {
          ...baseOptions,
          series: [{
            type: 'pie',
            radius: '50%',
            data: [
              { value: 335, name: 'A' },
              { value: 310, name: 'B' },
              { value: 234, name: 'C' },
              { value: 135, name: 'D' }
            ]
          }]
        };
      default:
        return baseOptions;
    }
  };

  // Handle data source connection
  const handleDataSourceConnect = useCallback((dataSource: any) => {
    setDataSources(prev => [...prev, dataSource]);
  }, []);

  // Enhanced chart types with categories and tooltips
  const chartCategories = [
    {
      name: 'Basic Charts',
      icon: <BarChartOutlined />,
      charts: [
        { key: 'bar', label: 'Bar', icon: <BarChartOutlined />, color: '#1890ff', description: 'Simple bar chart for comparing values' },
        { key: 'line', label: 'Line', icon: <LineChartOutlined />, color: '#52c41a', description: 'Line chart for trends over time' },
        { key: 'pie', label: 'Pie', icon: <PieChartOutlined />, color: '#fa8c16', description: 'Pie chart for proportions' },
        { key: 'area', label: 'Area', icon: <AreaChartOutlined />, color: '#722ed1', description: 'Area chart for cumulative data' },
        { key: 'scatter', label: 'Scatter', icon: <DotChartOutlined />, color: '#eb2f96', description: 'Scatter plot for correlations' }
      ]
    },
    {
      name: 'Comparison Charts',
      icon: <BarChartOutlined />,
      charts: [
        { key: 'stacked-bar', label: 'Stacked Bar', icon: <BarChartOutlined />, color: '#13c2c2', description: 'Stacked bars for part-to-whole comparison' },
        { key: 'grouped-bar', label: 'Grouped Bar', icon: <BarChartOutlined />, color: '#faad14', description: 'Grouped bars for side-by-side comparison' },
        { key: 'horizontal-bar', label: 'Horizontal Bar', icon: <BarChartOutlined />, color: '#a0d911', description: 'Horizontal bars for long labels' },
        { key: 'stacked-area', label: 'Stacked Area', icon: <AreaChartOutlined />, color: '#eb2f96', description: 'Stacked areas for cumulative trends' }
      ]
    },
    {
      name: 'Advanced Charts',
      icon: <LineChartOutlined />,
      charts: [
        { key: 'radar', label: 'Radar', icon: <LineChartOutlined />, color: '#722ed1', description: 'Radar chart for multi-dimensional data' },
        { key: 'funnel', label: 'Funnel', icon: <BarChartOutlined />, color: '#fa8c16', description: 'Funnel chart for conversion analysis' },
        { key: 'gauge', label: 'Gauge', icon: <BarChartOutlined />, color: '#13c2c2', description: 'Gauge chart for progress indicators' },
        { key: 'heatmap', label: 'Heatmap', icon: <BarChartOutlined />, color: '#eb2f96', description: 'Heatmap for matrix data visualization' }
      ]
    }
  ];

  // Enhanced widget gallery with comprehensive chart types
  const WidgetGallery = () => {
    const handleDragStart = (e: React.DragEvent, type: string, widgetType: string) => {
      e.dataTransfer.setData('chartType', type);
      e.dataTransfer.setData('widgetType', widgetType);
      e.dataTransfer.effectAllowed = 'copy';
    };

    const handleWidgetDrop = (widgetType: string) => {
      const newWidget: DashboardWidget = {
        id: `widget-${Date.now()}`,
        type: widgetType as any,
        title: `${widgetType.charAt(0).toUpperCase() + widgetType.slice(1)} Widget`,
        config: {},
        data: widgetType === 'kpi' ? [{ value: 1234, label: 'Sample KPI' }] : 
              widgetType === 'table' ? queryResults.slice(0, 5) : [],
        position: { x: 0, y: 0, w: 4, h: 3 },
        style: {
          backgroundColor: '#1f1f1f',
          borderColor: '#404040',
          borderRadius: 8,
          padding: 16,
          fontSize: 14,
          fontWeight: 'normal',
          textAlign: 'center',
          color: '#ffffff'
        },
        isSelected: false,
        isResizable: true,
        isDraggable: true
      };
      setActiveWidgets(prev => [...prev, newWidget]);
      setSelectedWidget(newWidget);
      message.success(`${widgetType.charAt(0).toUpperCase() + widgetType.slice(1)} widget added!`);
    };

    return (
      <div className="widget-gallery">
        <Card title="Widget Gallery" size="small" style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
            Drag widgets to dashboard canvas
          </div>
          
          {/* Chart Widgets by Category */}
          {chartCategories.map((category) => (
            <div key={category.name} style={{ marginBottom: '16px' }}>
              <div style={{ 
                fontSize: '11px', 
                fontWeight: '600', 
                color: '#333', 
                marginBottom: '8px', 
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {category.icon} {category.name}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                {category.charts.map((chart) => (
                  <Tooltip
                    key={chart.key}
                    title={
                      <div>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{chart.label}</div>
                        <div style={{ fontSize: '12px' }}>{chart.description}</div>
                      </div>
                    }
                    placement="right"
                  >
                    <div
                      className="widget-gallery-item"
                      draggable
                      onDragStart={(e) => handleDragStart(e, chart.key, 'chart')}
                      style={{
                        padding: '6px',
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                        cursor: 'grab',
                        background: '#fafafa',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s ease',
                        userSelect: 'none',
                        fontSize: '11px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f0f0f0';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#fafafa';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      onClick={() => handleWidgetDrop('chart')}
                    >
                      <div style={{ color: chart.color, fontSize: '12px' }}>{chart.icon}</div>
                      <span>{chart.label}</span>
                    </div>
                  </Tooltip>
                ))}
              </div>
            </div>
          ))}

          {/* Data Widgets */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              fontSize: '11px', 
              fontWeight: '600', 
              color: '#333', 
              marginBottom: '8px', 
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <DatabaseOutlined /> Data Widgets
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              {[
                { type: 'kpi', icon: <DatabaseOutlined />, label: 'KPI', description: 'Key Performance Indicator display' },
                { type: 'table', icon: <TableOutlined />, label: 'Table', description: 'Data table with sorting and pagination' },
                { type: 'text', icon: <FontSizeOutlined />, label: 'Text', description: 'Rich text with markdown support' },
                { type: 'image', icon: <BgColorsOutlined />, label: 'Image', description: 'Image display with upload support' }
              ].map((widget) => (
                <Tooltip
                  key={widget.type}
                  title={
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{widget.label}</div>
                      <div style={{ fontSize: '12px' }}>{widget.description}</div>
                    </div>
                  }
                  placement="right"
                >
                  <div
                    className="widget-gallery-item"
                    draggable
                    onDragStart={(e) => handleDragStart(e, widget.type, widget.type)}
                    style={{ 
                      padding: '6px', 
                      border: '1px solid #d9d9d9', 
                      borderRadius: '4px', 
                      cursor: 'grab',
                      transition: 'all 0.2s ease',
                      userSelect: 'none',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f0f0f0';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fafafa';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onClick={() => handleWidgetDrop(widget.type)}
                  >
                    {widget.icon} {widget.label}
                  </div>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Filter Widgets */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              fontSize: '11px', 
              fontWeight: '600', 
              color: '#333', 
              marginBottom: '8px', 
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <FilterOutlined /> Filter Widgets
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              {[
                { type: 'dropdown', icon: <FilterOutlined />, label: 'Dropdown', description: 'Single/multi-select dropdown filter' },
                { type: 'date-picker', icon: <FilterOutlined />, label: 'Date Picker', description: 'Date range or single date filter' },
                { type: 'slider', icon: <FilterOutlined />, label: 'Slider', description: 'Range slider for numeric values' },
                { type: 'search', icon: <FilterOutlined />, label: 'Search', description: 'Text search filter' }
              ].map((widget) => (
                <Tooltip
                  key={widget.type}
                  title={
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{widget.label}</div>
                      <div style={{ fontSize: '12px' }}>{widget.description}</div>
                    </div>
                  }
                  placement="right"
                >
                  <div
                    className="widget-gallery-item"
                    draggable
                    onDragStart={(e) => handleDragStart(e, widget.type, widget.type)}
                    style={{ 
                      padding: '6px', 
                      border: '1px solid #d9d9d9', 
                      borderRadius: '4px', 
                      cursor: 'grab',
                      transition: 'all 0.2s ease',
                      userSelect: 'none',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f0f0f0';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fafafa';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onClick={() => handleWidgetDrop(widget.type)}
                  >
                    {widget.icon} {widget.label}
                  </div>
                </Tooltip>
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  };



  // Enhanced dashboard canvas with React-Grid-Layout
  const DashboardCanvas = () => {
    const layout = activeWidgets.map(widget => ({
      i: widget.id,
      x: widget.position.x,
      y: widget.position.y,
      w: widget.position.w,
      h: widget.position.h,
      minW: 2,
      minH: 2,
      isResizable: widget.isResizable,
      isDraggable: widget.isDraggable
    }));

    return (
      <div 
        ref={canvasRef}
        className="dashboard-canvas"
        style={{
          minHeight: '600px',
          background: showGrid ? `repeating-linear-gradient(
            0deg, transparent, transparent ${gridSize - 1}px, rgba(128, 128, 128, 0.05) ${gridSize - 1}px, rgba(128, 128, 128, 0.05) ${gridSize}px
          ), repeating-linear-gradient(
            90deg, transparent, transparent ${gridSize - 1}px, rgba(128, 128, 128, 0.05) ${gridSize - 1}px, rgba(128, 128, 128, 0.05) ${gridSize}px
          )` : '#2a2a2a',
          border: '2px dashed #404040',
          borderRadius: '8px',
          padding: '20px',
          position: 'relative',
          transition: 'all 0.3s ease'
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.style.borderColor = '#1890ff';
          e.currentTarget.style.backgroundColor = 'rgba(24, 144, 255, 0.05)';
        }}
        onDragLeave={(e) => {
          e.currentTarget.style.borderColor = '#404040';
          e.currentTarget.style.backgroundColor = showGrid ? 'transparent' : '#2a2a2a';
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.style.borderColor = '#404040';
          e.currentTarget.style.backgroundColor = showGrid ? 'transparent' : '#2a2a2a';
          
          const chartType = e.dataTransfer.getData('chartType');
          if (chartType) {
            handleChartTypeDrop(chartType);
          }
        }}
      >
        {activeWidgets.length === 0 ? (
          <div style={{ 
            height: '400px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#999',
            flexDirection: 'column'
          }}>
            <DragOutlined style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.6 }} />
            <div style={{ fontSize: '18px', marginBottom: '8px', fontWeight: '500' }}>Drag charts from the toolbox to get started</div>
            <div style={{ fontSize: '14px', color: '#666' }}>Or create charts in the Charts tab</div>
          </div>
        ) : (
          <ResponsiveGridLayout
            className="layout"
            layouts={{ lg: layout }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={gridSize}
            onLayoutChange={handleLayoutChange}
            isDraggable={!isPreviewMode}
            isResizable={!isPreviewMode}
            margin={[8, 8]}
            containerPadding={[0, 0]}
            useCSSTransforms={true}
            draggableHandle=".widget-drag-handle"
            onDrop={handleLayoutChange}
          >
            {activeWidgets.map((widget) => (
              <div key={widget.id} className="grid-item">
                <div
                  className={`dashboard-widget ${widget.isSelected ? 'selected' : ''}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: widget.style.backgroundColor,
                    border: `2px solid ${widget.isSelected ? '#1890ff' : widget.style.borderColor}`,
                    borderRadius: widget.style.borderRadius,
                    padding: widget.style.padding,
                    cursor: widget.isSelected ? 'default' : 'pointer',
                    overflow: 'hidden',
                    boxShadow: widget.isSelected ? '0 0 0 2px rgba(24, 144, 255, 0.2), 0 4px 12px rgba(0, 0, 0, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.2s ease',
                    zIndex: widget.isSelected ? 10 : 1,
                    position: 'relative'
                  }}
                  onClick={() => handleWidgetSelect(widget)}
                >
                  {/* Widget Header with Drag Handle */}
                  <div 
                    className="widget-drag-handle"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '8px',
                      fontSize: widget.style.fontSize,
                      fontWeight: widget.style.fontWeight,
                      color: widget.style.color,
                      textAlign: widget.style.textAlign,
                      padding: '4px 0',
                      cursor: 'move',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{widget.title}</div>
                      {widget.subtitle && (
                        <div style={{ fontSize: '12px', opacity: 0.7 }}>{widget.subtitle}</div>
                      )}
                    </div>
                    {widget.isSelected && !isPreviewMode && (
                      <Space size="small">
                        <Button size="small" icon={<EditOutlined />} style={{ minWidth: 'auto' }} />
                        <Button size="small" danger icon={<CloseOutlined />} style={{ minWidth: 'auto' }} 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWidgetDelete(widget.id);
                          }}
                        />
                      </Space>
                    )}
                  </div>
                  
                  {/* Widget Content */}
                  <div style={{ height: 'calc(100% - 40px)' }}>
                    {widget.type === 'chart' && widget.config.options ? (
                      <ReactECharts
                        option={widget.config.options}
                        style={{ height: '100%', width: '100%' }}
                        opts={{ renderer: 'canvas' }}
                      />
                    ) : widget.type === 'kpi' ? (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        height: '100%',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1890ff' }}>
                          {widget.data && widget.data.length > 0 ? 
                            typeof widget.data[0].value === 'number' ? 
                              widget.data[0].value.toLocaleString() : 
                              widget.data[0].value : 
                            '0'
                          }
                        </div>
                        <div style={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
                          {widget.subtitle || 'KPI Value'}
                        </div>
                      </div>
                    ) : widget.type === 'table' ? (
                      <div style={{ height: '100%', overflow: 'auto' }}>
                        {widget.data && widget.data.length > 0 ? (
                          <Table
                            dataSource={widget.data.slice(0, 5)}
                            columns={Object.keys(widget.data[0] || {}).map(key => ({
                              title: key.charAt(0).toUpperCase() + key.slice(1),
                              dataIndex: key,
                              key: key,
                              render: (value: any) => 
                                typeof value === 'number' ? value.toLocaleString() : String(value)
                            }))}
                            size="small"
                            pagination={widget.config.showPagination ? { pageSize: widget.config.pageSize || 10 } : false}
                            scroll={{ y: 200 }}
                          />
                        ) : (
                          <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
                            No data available
                          </div>
                        )}
                      </div>
                    ) : widget.type === 'text' ? (
                      <div style={{ 
                        height: '100%', 
                        overflow: 'auto',
                        padding: '8px',
                        color: widget.style.color
                      }}>
                        {widget.config.markdown ? (
                          <div dangerouslySetInnerHTML={{ 
                            __html: widget.config.content || 'Enter text here...' 
                          }} />
                        ) : (
                          <div style={{ whiteSpace: 'pre-wrap' }}>
                            {widget.config.content || 'Enter text here...'}
                          </div>
                        )}
                      </div>
                    ) : widget.type === 'dropdown' ? (
                      <div style={{ 
                        height: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        padding: '8px'
                      }}>
                        <Select
                          mode={widget.config.multiple ? 'multiple' : undefined}
                          placeholder="Select option..."
                          style={{ width: '100%' }}
                          size="small"
                          options={widget.config.options?.split('\n').map((opt: string) => ({ label: opt, value: opt })) || []}
                        />
                      </div>
                    ) : widget.type === 'date-picker' ? (
                      <div style={{ 
                        height: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        padding: '8px'
                      }}>
                        <div style={{ textAlign: 'center', color: '#999' }}>
                          <div style={{ fontSize: '12px', marginBottom: '4px' }}>Date Picker</div>
                          <div style={{ fontSize: '10px' }}>
                            {widget.config.range ? 'Range Selection' : 'Single Date'}
                          </div>
                        </div>
                      </div>
                    ) : widget.type === 'slider' ? (
                      <div style={{ 
                        height: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        padding: '8px'
                      }}>
                        <div style={{ textAlign: 'center', color: '#999' }}>
                          <div style={{ fontSize: '12px', marginBottom: '4px' }}>Range Slider</div>
                          <div style={{ fontSize: '10px' }}>Numeric Range Filter</div>
                        </div>
                      </div>
                    ) : widget.type === 'search' ? (
                      <div style={{ 
                        height: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        padding: '8px'
                      }}>
                        <div style={{ textAlign: 'center', color: '#999' }}>
                          <div style={{ fontSize: '12px', marginBottom: '4px' }}>Search Filter</div>
                          <div style={{ fontSize: '10px' }}>Text Search Input</div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        height: '100%',
                        color: '#999',
                        fontSize: '14px'
                      }}>
                        {widget.type === 'chart' ? 'Chart Preview' : 'Widget Content'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>
    );
  };

  // Enhanced property panel with comprehensive configuration options
  const PropertyPanel = () => (
    <div className="property-panel">
      {selectedWidget ? (
        <div>
          {/* Basic Widget Properties */}
          <Card title="Widget Properties" size="small" style={{ marginBottom: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>Title:</label>
                <Input
                  value={selectedWidget.title}
                  onChange={(e) => handleWidgetUpdate(selectedWidget.id, { title: e.target.value })}
                  size="small"
                  style={{ marginTop: 2 }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>Subtitle:</label>
                <Input
                  value={selectedWidget.subtitle || ''}
                  onChange={(e) => handleWidgetUpdate(selectedWidget.id, { subtitle: e.target.value })}
                  size="small"
                  style={{ marginTop: 2 }}
                />
              </div>

              <Divider style={{ margin: '8px 0' }} />

              {/* Widget-Specific Properties */}
              {selectedWidget.type === 'chart' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>Chart Type:</label>
                  <Select
                    value={selectedWidget.config.type || 'bar'}
                    onChange={(value) => handleWidgetUpdate(selectedWidget.id, {
                      config: { ...selectedWidget.config, type: value }
                    })}
                    size="small"
                    style={{ width: '100%', marginTop: 2 }}
                  >
                    {chartCategories.flatMap(category => 
                      category.charts.map(chart => (
                        <Option key={chart.key} value={chart.key}>
                          {chart.label}
                        </Option>
                      ))
                    )}
                  </Select>
                </div>
              )}

              {selectedWidget.type === 'kpi' && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>KPI Value:</label>
                    <InputNumber
                      value={selectedWidget.data?.[0]?.value || 0}
                      onChange={(value) => {
                        const newData = [{ ...selectedWidget.data?.[0], value: value || 0 }];
                        handleWidgetUpdate(selectedWidget.id, { data: newData });
                      }}
                      size="small"
                      style={{ width: '100%', marginTop: 2 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>KPI Label:</label>
                    <Input
                      value={selectedWidget.data?.[0]?.label || 'KPI'}
                      onChange={(e) => {
                        const newData = [{ ...selectedWidget.data?.[0], label: e.target.value }];
                        handleWidgetUpdate(selectedWidget.id, { data: newData });
                      }}
                      size="small"
                      style={{ marginTop: 2 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>Value Color:</label>
                    <ColorPicker
                      value={selectedWidget.style.color}
                      onChange={(color) => handleWidgetUpdate(selectedWidget.id, {
                        style: { ...selectedWidget.style, color: color.toHexString() }
                      })}
                      size="small"
                      style={{ marginTop: 2 }}
                    />
                  </div>
                </>
              )}

              {selectedWidget.type === 'text' && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>Text Content:</label>
                    <TextArea
                      value={selectedWidget.config.content || 'Enter text here...'}
                      onChange={(e) => handleWidgetUpdate(selectedWidget.id, {
                        config: { ...selectedWidget.config, content: e.target.value }
                      })}
                      rows={3}
                      size="small"
                      style={{ marginTop: 2 }}
                      placeholder="Enter text content..."
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>Markdown Support:</label>
                    <Switch
                      checked={selectedWidget.config.markdown || false}
                      onChange={(checked) => handleWidgetUpdate(selectedWidget.id, {
                        config: { ...selectedWidget.config, markdown: checked }
                      })}
                      size="small"
                    />
                  </div>
                </>
              )}

              {selectedWidget.type === 'table' && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>Show Pagination:</label>
                    <Switch
                      checked={selectedWidget.config.showPagination || false}
                      onChange={(checked) => handleWidgetUpdate(selectedWidget.id, {
                        config: { ...selectedWidget.config, showPagination: checked }
                      })}
                      size="small"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>Rows per Page:</label>
                    <InputNumber
                      value={selectedWidget.config.pageSize || 10}
                      onChange={(value) => handleWidgetUpdate(selectedWidget.id, {
                        config: { ...selectedWidget.config, pageSize: value || 10 }
                      })}
                      min={5}
                      max={100}
                      size="small"
                      style={{ width: '100%', marginTop: 2 }}
                    />
                  </div>
                </>
              )}

              {selectedWidget.type === 'dropdown' && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>Options:</label>
                    <TextArea
                      value={selectedWidget.config.options || 'Option 1\nOption 2\nOption 3'}
                      onChange={(e) => handleWidgetUpdate(selectedWidget.id, {
                        config: { ...selectedWidget.config, options: e.target.value }
                      })}
                      rows={3}
                      size="small"
                      style={{ marginTop: 2 }}
                      placeholder="Enter options (one per line)..."
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>Multiple Selection:</label>
                    <Switch
                      checked={selectedWidget.config.multiple || false}
                      onChange={(checked) => handleWidgetUpdate(selectedWidget.id, {
                        config: { ...selectedWidget.config, multiple: checked }
                      })}
                      size="small"
                    />
                  </div>
                </>
              )}

              {selectedWidget.type === 'date-picker' && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>Date Range:</label>
                    <Switch
                      checked={selectedWidget.config.range || false}
                      onChange={(checked) => handleWidgetUpdate(selectedWidget.id, {
                        config: { ...selectedWidget.config, range: checked }
                      })}
                      size="small"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>Default Value:</label>
                    <Input
                      value={selectedWidget.config.defaultValue || ''}
                      onChange={(e) => handleWidgetUpdate(selectedWidget.id, {
                        config: { ...selectedWidget.config, defaultValue: e.target.value }
                      })}
                      size="small"
                      style={{ marginTop: 2 }}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                </>
              )}

              <Divider style={{ margin: '8px 0' }} />

              {/* Style Properties */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>Background:</label>
                <ColorPicker
                  value={selectedWidget.style.backgroundColor}
                  onChange={(color) => handleWidgetUpdate(selectedWidget.id, {
                    style: { ...selectedWidget.style, backgroundColor: color.toHexString() }
                  })}
                  size="small"
                  style={{ marginTop: 2 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>Border:</label>
                <ColorPicker
                  value={selectedWidget.style.borderColor}
                  onChange={(color) => handleWidgetUpdate(selectedWidget.id, {
                    style: { ...selectedWidget.style, borderColor: color.toHexString() }
                  })}
                  size="small"
                  style={{ marginTop: 2 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>Radius: {selectedWidget.style.borderRadius}px</label>
                <Slider
                  min={0}
                  max={20}
                  value={selectedWidget.style.borderRadius}
                  onChange={(value) => handleWidgetUpdate(selectedWidget.id, {
                    style: { ...selectedWidget.style, borderRadius: value }
                  })}
                  style={{ marginTop: 2 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>Padding: {selectedWidget.style.padding}px</label>
                <Slider
                  min={0}
                  max={32}
                  value={selectedWidget.style.padding}
                  onChange={(value) => handleWidgetUpdate(selectedWidget.id, {
                    style: { ...selectedWidget.style, padding: value }
                  })}
                  style={{ marginTop: 2 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>Font Size: {selectedWidget.style.fontSize}px</label>
                <Slider
                  min={10}
                  max={24}
                  value={selectedWidget.style.fontSize}
                  onChange={(value) => handleWidgetUpdate(selectedWidget.id, {
                    style: { ...selectedWidget.style, fontSize: value }
                  })}
                  style={{ marginTop: 2 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>Text Align:</label>
                <Select
                  value={selectedWidget.style.textAlign}
                  onChange={(value) => handleWidgetUpdate(selectedWidget.id, {
                    style: { ...selectedWidget.style, textAlign: value }
                  })}
                  size="small"
                  style={{ width: '100%', marginTop: 2 }}
                >
                  <Option value="left"><AlignLeftOutlined /> Left</Option>
                  <Option value="center"><AlignCenterOutlined /> Center</Option>
                  <Option value="right"><AlignRightOutlined /> Right</Option>
                </Select>
              </div>

              <Divider style={{ margin: '8px 0' }} />

              <Button 
                danger 
                block 
                icon={<CloseOutlined />}
                onClick={() => handleWidgetDelete(selectedWidget.id)}
                size="small"
              >
                Delete Widget
              </Button>
            </Space>
          </Card>

          {/* Advanced Configuration Panels */}
          {selectedWidget.type === 'chart' && (
            <>
              <ChartTemplatesPanel />
              <ColorThemesPanel />
            </>
          )}

          <DataBindingPanel />
        </div>
      ) : (
        <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
          <SettingOutlined style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.6 }} />
          <div style={{ fontWeight: '500', marginBottom: '4px' }}>Widget Properties</div>
          <div style={{ fontSize: '12px' }}>Select a widget to configure</div>
        </div>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'dashboard':
        return (
          <div className="dashboard-workspace">
            <Row gutter={[12, 12]}>
              <Col span={16}>
                <Card 
                  title={
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <Input
                        value={dashboardTitle}
                        onChange={(e) => setDashboardTitle(e.target.value)}
                        style={{ 
                          border: 'none', 
                          fontSize: '16px', 
                          fontWeight: 'bold',
                          padding: 0,
                          background: 'transparent',
                          color: '#000',
                          height: 'auto'
                        }}
                        placeholder="Dashboard Title"
                      />
                      <Input
                        value={dashboardSubtitle}
                        onChange={(e) => setDashboardSubtitle(e.target.value)}
                        style={{ 
                          border: 'none', 
                          fontSize: '12px', 
                          color: '#666',
                          padding: 0,
                          background: 'transparent',
                          height: 'auto',
                          marginTop: '-4px'
                        }}
                        placeholder="Subtitle (optional)"
                      />
                    </div>
                  }
                  className="dashboard-canvas"
                  extra={
                    <Space size="small">
                      <Tooltip title="Grid Controls">
                        <Space size="small" style={{ background: '#f5f5f5', padding: '4px 8px', borderRadius: '4px' }}>
                          <Switch
                            checked={showGrid}
                            onChange={setShowGrid}
                            size="small"
                          />
                          <Slider
                            min={10}
                            max={50}
                            value={gridSize}
                            onChange={setGridSize}
                            style={{ width: '50px' }}
                          />
                          <span style={{ fontSize: '11px', color: '#666', minWidth: '30px' }}>{gridSize}px</span>
                        </Space>
                      </Tooltip>
                      <Divider type="vertical" />
                      <Tooltip title="Undo/Redo">
                        <Space size="small">
                          <Button icon={<UndoOutlined />} size="small" />
                          <Button icon={<RedoOutlined />} size="small" />
                        </Space>
                      </Tooltip>
                      <Button 
                        icon={<EyeOutlined />} 
                        size="small" 
                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                        type={isPreviewMode ? 'primary' : 'default'}
                        title={isPreviewMode ? 'Exit Preview' : 'Preview Mode'}
                      />
                      <Dropdown menu={{ items: dashboardActionsMenu }} placement="bottomRight">
                        <Button icon={<SettingOutlined />} size="small" />
                      </Dropdown>
                    </Space>
                  }
                >
                  <DashboardCanvas />
                </Card>
              </Col>
              <Col span={4}>
                <WidgetGallery />
              </Col>
              <Col span={4}>
                <PropertyPanel />
              </Col>
            </Row>
          </div>
        );
      
      case 'data':
        return (
          <div className="data-workspace">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card title="SQL Editor & Data Sources" className="sql-editor-panel">
                  <WorkingDataSourceConnector 
                    onDataSourceConnect={handleDataSourceConnect}
                    onQueryExecute={handleQueryExecution}
                    dataSources={dataSources}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card title="Query Results & Sample Data" className="results-panel">
                  {queryResults.length > 0 ? (
                    <div>
                      <div style={{ marginBottom: 16, fontSize: '14px', color: '#666' }}>
                        <strong>{queryResults.length}</strong> rows returned
                      </div>
                      <Table
                        dataSource={queryResults.slice(0, 10)}
                        columns={Object.keys(queryResults[0] || {}).map(key => ({
                          title: key.charAt(0).toUpperCase() + key.slice(1),
                          dataIndex: key,
                          key: key,
                          render: (value: any) => 
                            typeof value === 'number' ? value.toLocaleString() : String(value)
                        }))}
                        size="small"
                        pagination={false}
                        scroll={{ y: 300 }}
                      />
                      {queryResults.length > 10 && (
                        <div style={{ textAlign: 'center', padding: '8px', color: '#666' }}>
                          Showing first 10 of {queryResults.length} records
                        </div>
                      )}
                    </div>
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No query results yet"
                    />
                  )}
                </Card>
              </Col>
            </Row>
          </div>
        );
      
      case 'charts':
        return (
          <div className="charts-workspace">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card title="Chart Designer" className="chart-designer">
                  <EChartsIntegration 
                    data={queryResults}
                    onChartSave={handleChartCreation}
                  />
                </Card>
              </Col>
            </Row>
          </div>
        );
      
      case 'filters':
        return (
          <div className="filters-workspace">
            <Card title="Cross-Widget Filters & Controls">
              <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
                <FilterOutlined style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.6 }} />
                <div style={{ fontWeight: '500', marginBottom: '4px' }}>Cross-Widget Filters</div>
                <div style={{ fontSize: '12px' }}>Configure filters that affect multiple widgets</div>
              </div>
            </Card>
          </div>
        );
      
      default:
        return <div>Select a tab to get started</div>;
    }
  };

  // Chart templates with professional configurations
  const chartTemplates = {
    'bar': {
      name: 'Professional Bar Chart',
      options: {
        title: { text: 'Sales Performance', left: 'center', textStyle: { fontSize: 16, fontWeight: 'bold' } },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May'], axisLabel: { color: '#666' } },
        yAxis: { type: 'value', axisLabel: { color: '#666' } },
        series: [{ 
          data: [120, 200, 150, 80, 70], 
          type: 'bar',
          itemStyle: { 
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#83bff6' },
              { offset: 0.5, color: '#188df0' },
              { offset: 1, color: '#188df0' }
            ])
          }
        }]
      }
    },
    'line': {
      name: 'Trend Line Chart',
      options: {
        title: { text: 'Revenue Trends', left: 'center', textStyle: { fontSize: 16, fontWeight: 'bold' } },
        tooltip: { trigger: 'axis' },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: ['Q1', 'Q2', 'Q3', 'Q4'], axisLabel: { color: '#666' } },
        yAxis: { type: 'value', axisLabel: { color: '#666' } },
        series: [{ 
          data: [820, 932, 901, 934], 
          type: 'line',
          smooth: true,
          lineStyle: { width: 3, color: '#52c41a' },
          areaStyle: { 
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(82, 196, 26, 0.3)' },
              { offset: 1, color: 'rgba(82, 196, 26, 0.1)' }
            ])
          }
        }]
      }
    },
    'pie': {
      name: 'Market Share Pie',
      options: {
        title: { text: 'Market Distribution', left: 'center', textStyle: { fontSize: 16, fontWeight: 'bold' } },
        tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
        series: [{
          name: 'Market Share',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          label: { show: false, position: 'center' },
          emphasis: { label: { show: true, fontSize: '18', fontWeight: 'bold' } },
          labelLine: { show: false },
          data: [
            { value: 1048, name: 'Product A' },
            { value: 735, name: 'Product B' },
            { value: 580, name: 'Product C' },
            { value: 484, name: 'Product D' }
          ]
        }]
      }
    }
  };

  // Professional color themes
  const colorThemes = {
    'professional': {
      name: 'Professional',
      colors: ['#1890ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96', '#13c2c2', '#faad14', '#a0d911'],
      background: '#ffffff',
      text: '#262626'
    },
    'dark': {
      name: 'Dark Theme',
      colors: ['#177ddc', '#49aa19', '#d89614', '#642ab5', '#d63384', '#08979c', '#d48806', '#7cb305'],
      background: '#1f1f1f',
      text: '#ffffff'
    },
    'pastel': {
      name: 'Pastel',
      colors: ['#bae7ff', '#d9f7be', '#fff7e6', '#f4f0ff', '#fff0f6', '#e6fffb', '#fffbe6', '#f6ffed'],
      background: '#fafafa',
      text: '#595959'
    },
    'vibrant': {
      name: 'Vibrant',
      colors: ['#ff4d4f', '#ff7a45', '#ffa940', '#ffec3d', '#73d13d', '#36cfc9', '#40a9ff', '#9254de'],
      background: '#ffffff',
      text: '#000000'
    }
  };

  // Data binding interface for connecting SQL results to widgets
  const DataBindingPanel = () => {
    const [selectedDataSource, setSelectedDataSource] = useState<string>('');
    const [availableFields, setAvailableFields] = useState<string[]>([]);
    const [bindingConfig, setBindingConfig] = useState<any>({});

    useEffect(() => {
      if (queryResults.length > 0) {
        setAvailableFields(Object.keys(queryResults[0] || {}));
      }
    }, [queryResults]);

    const handleFieldBinding = (field: string, bindingType: string) => {
      if (selectedWidget) {
        const newConfig = {
          ...selectedWidget.config,
          dataBinding: {
            ...selectedWidget.config.dataBinding,
            [bindingType]: field
          }
        };
        handleWidgetUpdate(selectedWidget.id, { config: newConfig });
      }
    };

    return (
      <Card title="Data Binding" size="small" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>Data Source:</label>
            <Select
              value={selectedDataSource}
              onChange={setSelectedDataSource}
              size="small"
              style={{ width: '100%' }}
              placeholder="Select data source"
            >
              <Option value="query-results">Query Results ({queryResults.length} rows)</Option>
              <Option value="sample-data">Sample Data</Option>
            </Select>
          </div>

          {selectedDataSource && availableFields.length > 0 && (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>Available Fields:</label>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                  {availableFields.join(', ')}
                </div>
              </div>

              {selectedWidget?.type === 'chart' && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>X-Axis Field:</label>
                    <Select
                      value={bindingConfig.xAxis || ''}
                      onChange={(value) => handleFieldBinding(value, 'xAxis')}
                      size="small"
                      style={{ width: '100%' }}
                      placeholder="Select X-axis field"
                    >
                      {availableFields.map(field => (
                        <Option key={field} value={field}>{field}</Option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>Y-Axis Field:</label>
                    <Select
                      value={bindingConfig.yAxis || ''}
                      onChange={(value) => handleFieldBinding(value, 'yAxis')}
                      size="small"
                      style={{ width: '100%' }}
                      placeholder="Select Y-axis field"
                    >
                      {availableFields.map(field => (
                        <Option key={field} value={field}>{field}</Option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>Series Field:</label>
                    <Select
                      value={bindingConfig.series || ''}
                      onChange={(value) => handleFieldBinding(value, 'series')}
                      size="small"
                      style={{ width: '100%' }}
                      placeholder="Select series field (optional)"
                    >
                      <Option value="">None</Option>
                      {availableFields.map(field => (
                        <Option key={field} value={field}>{field}</Option>
                      ))}
                    </Select>
                  </div>
                </>
              )}

              {selectedWidget?.type === 'kpi' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>Value Field:</label>
                  <Select
                    value={bindingConfig.value || ''}
                    onChange={(value) => handleFieldBinding(value, 'value')}
                    size="small"
                    style={{ width: '100%' }}
                    placeholder="Select value field"
                  >
                    {availableFields.map(field => (
                      <Option key={field} value={field}>{field}</Option>
                    ))}
                  </Select>
                </div>
              )}

              <Button 
                size="small" 
                type="primary" 
                block
                onClick={() => {
                  if (selectedWidget) {
                    // Apply data binding and update widget
                    const newData = queryResults.slice(0, 10);
                    handleWidgetUpdate(selectedWidget.id, { data: newData });
                    message.success('Data binding applied!');
                  }
                }}
              >
                Apply Data Binding
              </Button>
            </>
          )}
        </Space>
      </Card>
    );
  };

  // Chart templates panel
  const ChartTemplatesPanel = () => (
    <Card title="Chart Templates" size="small" style={{ marginBottom: '16px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {Object.entries(chartTemplates).map(([key, template]) => (
          <div
            key={key}
            className="template-item"
            style={{
              padding: '8px',
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: '#fafafa'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f0f0f0';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fafafa';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onClick={() => {
              if (selectedWidget && selectedWidget.type === 'chart') {
                handleWidgetUpdate(selectedWidget.id, {
                  config: { ...selectedWidget.config, options: template.options }
                });
                message.success(`${template.name} applied!`);
              }
            }}
          >
            <div style={{ fontWeight: '500', fontSize: '12px', marginBottom: '2px' }}>{template.name}</div>
            <div style={{ fontSize: '10px', color: '#666' }}>Click to apply template</div>
          </div>
        ))}
      </Space>
    </Card>
  );

  // Color themes panel
  const ColorThemesPanel = () => (
    <Card title="Color Themes" size="small" style={{ marginBottom: '16px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {Object.entries(colorThemes).map(([key, theme]) => (
          <div
            key={key}
            className="theme-item"
            style={{
              padding: '8px',
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: theme.background
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            onClick={() => {
              if (selectedWidget) {
                // Apply color theme to widget
                const newStyle = { ...selectedWidget.style };
                if (selectedWidget.type === 'chart') {
                  // Update chart colors
                  const newConfig = {
                    ...selectedWidget.config,
                    color: theme.colors
                  };
                  handleWidgetUpdate(selectedWidget.id, { 
                    style: newStyle,
                    config: newConfig
                  });
                } else {
                  // Update widget colors
                  newStyle.backgroundColor = theme.background;
                  newStyle.color = theme.text;
                  handleWidgetUpdate(selectedWidget.id, { style: newStyle });
                }
                message.success(`${theme.name} theme applied!`);
              }
            }}
          >
            <div style={{ 
              fontWeight: '500', 
              fontSize: '12px', 
              marginBottom: '4px',
              color: theme.text 
            }}>
              {theme.name}
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {theme.colors.slice(0, 6).map((color, index) => (
                <div
                  key={index}
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: color,
                    borderRadius: '2px',
                    border: '1px solid #d9d9d9'
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </Space>
    </Card>
  );

  // Cross-widget filter panel
  const CrossWidgetFilterPanel = () => (
    <Card title="Cross-Widget Filters" size="small" style={{ marginBottom: '16px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
          Configure filters that affect multiple widgets
        </div>
        
        {Object.entries(globalFilters).map(([filterId, filter]) => (
          <div key={filterId} style={{ 
            padding: '8px', 
            border: '1px solid #d9d9d9', 
            borderRadius: '4px',
            background: '#fafafa'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: '500' }}>{filter.label}</span>
              <Button 
                size="small" 
                icon={<LinkOutlined />}
                onClick={() => {
                  // Show connection dialog
                  message.info('Click on widgets to connect them to this filter');
                }}
              >
                Connect
              </Button>
            </div>
            
            {filter.type === 'dropdown' && (
              <Select
                mode="multiple"
                placeholder="Select values..."
                value={filter.value || []}
                onChange={(value) => handleFilterChange(filterId, value)}
                size="small"
                style={{ width: '100%' }}
                options={filter.options?.map((opt: string) => ({ label: opt, value: opt })) || []}
              />
            )}
            
            {filter.type === 'date-picker' && (
              <div style={{ fontSize: '10px', color: '#666' }}>
                Date range filter: {filter.value ? 'Active' : 'Inactive'}
              </div>
            )}
            
            <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
              Connected to {filterConnections[filterId]?.length || 0} widgets
            </div>
          </div>
        ))}
        
        <Button 
          size="small" 
          icon={<PlusOutlined />}
          block
          onClick={() => {
            // Add new filter
            const newFilterId = `filter-${Date.now()}`;
            setGlobalFilters(prev => ({
              ...prev,
              [newFilterId]: {
                label: 'New Filter',
                type: 'dropdown',
                value: [],
                options: ['Option 1', 'Option 2', 'Option 3'],
                field: ''
              }
            }));
          }}
        >
          Add Filter
        </Button>
      </Space>
    </Card>
  );

  // Dashboard export functionality
  const exportDashboard = useCallback((format: 'json' | 'png' | 'pdf') => {
    if (format === 'json') {
      const dashboardData = {
        title: dashboardTitle,
        subtitle: dashboardSubtitle,
        widgets: activeWidgets,
        layout: activeWidgets.map(w => ({
          i: w.id,
          x: w.position.x,
          y: w.position.y,
          w: w.position.w,
          h: w.position.h
        })),
        metadata: {
          exportedAt: new Date().toISOString(),
          version: '1.0'
        }
      };
      
      const blob = new Blob([JSON.stringify(dashboardData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dashboardTitle.replace(/\s+/g, '_')}_dashboard.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('Dashboard exported as JSON!');
    } else if (format === 'png') {
      // Capture dashboard as PNG
      if (canvasRef.current) {
        html2canvas(canvasRef.current).then(canvas => {
          const link = document.createElement('a');
          link.download = `${dashboardTitle.replace(/\s+/g, '_')}_dashboard.png`;
          link.href = canvas.toDataURL();
          link.click();
        });
        message.success('Dashboard exported as PNG!');
      }
    }
  }, [dashboardTitle, dashboardSubtitle, activeWidgets, canvasRef]);

  // Embed code generator
  const generateEmbedCode = useCallback(() => {
    const embedCode = `
<!-- Dashboard Embed Code -->
<div id="aiser-dashboard-${Date.now()}" style="width: 100%; height: 600px;"></div>
<script>
  // Load dashboard data
  fetch('${window.location.origin}/api/dashboards/${dashboardTitle.replace(/\s+/g, '_')}')
    .then(response => response.json())
    .then(data => {
      // Initialize dashboard
      const container = document.getElementById('aiser-dashboard-${Date.now()}');
      // Dashboard rendering logic here
    });
</script>
    `.trim();

    // Copy to clipboard
    navigator.clipboard.writeText(embedCode).then(() => {
      message.success('Embed code copied to clipboard!');
    });
  }, [dashboardTitle]);

  // API endpoints generator
  const generateAPIEndpoints = useCallback(() => {
    const apiDocs = `
# Dashboard API Endpoints

## Get Dashboard Data
GET /api/dashboards/${dashboardTitle.replace(/\s+/g, '_')}

## Get Widget Data
GET /api/dashboards/${dashboardTitle.replace(/\s+/g, '_')}/widgets/{widgetId}

## Update Widget
PUT /api/dashboards/${dashboardTitle.replace(/\s+/g, '_')}/widgets/{widgetId}

## Export Dashboard
GET /api/dashboards/${dashboardTitle.replace(/\s+/g, '_')}/export?format={json|png|pdf}

## Authentication
Authorization: Bearer {your-api-key}
    `.trim();

    const blob = new Blob([apiDocs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dashboardTitle.replace(/\s+/g, '_')}_api_docs.txt`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('API documentation downloaded!');
  }, [dashboardTitle]);

  // Power Automate integration
  const generatePowerAutomateFlow = useCallback(() => {
    const flowDefinition = {
      "definition": {
        "triggers": {
          "manual": {
            "type": "Request",
            "kind": "PowerAutomate"
          }
        },
        "actions": {
          "getDashboardData": {
            "type": "Http",
            "inputs": {
              "method": "GET",
              "uri": `${window.location.origin}/api/dashboards/${dashboardTitle.replace(/\s+/g, '_')}`,
              "authentication": {
                "type": "Basic",
                "username": "{{$env:API_USERNAME}}",
                "password": "{{$env:API_PASSWORD}}"
              }
            }
          },
          "sendToTeams": {
            "type": "Teams",
            "inputs": {
              "action": "PostMessage",
              "teamId": "{{$env:TEAMS_TEAM_ID}}",
              "channelId": "{{$env:TEAMS_CHANNEL_ID}}",
              "message": "Dashboard Update: @{body('getDashboardData')['title']}"
            }
          }
        }
      }
    };

    const blob = new Blob([JSON.stringify(flowDefinition, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dashboardTitle.replace(/\s+/g, '_')}_power_automate_flow.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('Power Automate flow definition downloaded!');
  }, [dashboardTitle]);

  // Enhanced dashboard actions menu
  const dashboardActionsMenu: MenuProps['items'] = [
    {
      key: 'export',
      label: 'Export Dashboard',
      icon: <DownloadOutlined />,
      children: [
        { key: 'export-json', label: 'Export as JSON', icon: <DownloadOutlined />, onClick: () => exportDashboard('json') },
        { key: 'export-png', label: 'Export as PNG', icon: <DownloadOutlined />, onClick: () => exportDashboard('png') },
        { key: 'export-pdf', label: 'Export as PDF', icon: <DownloadOutlined />, onClick: () => exportDashboard('pdf') }
      ]
    },
    {
      key: 'embed',
      label: 'Embed & Share',
      icon: <ShareAltOutlined />,
      children: [
        { key: 'embed-code', label: 'Generate Embed Code', icon: <ShareAltOutlined />, onClick: generateEmbedCode },
        { key: 'api-endpoints', label: 'API Endpoints', icon: <DatabaseOutlined />, onClick: generateAPIEndpoints },
        { key: 'power-automate', label: 'Power Automate Flow', icon: <SettingOutlined />, onClick: generatePowerAutomateFlow }
      ]
    },
    { key: 'share', label: 'Share Dashboard', icon: <ShareAltOutlined /> },
    { key: 'settings', label: 'Dashboard Settings', icon: <SettingOutlined /> }
  ];

  return (
    <Layout className="dashboard-studio" style={{ height: '100vh' }}>
      <Header className="studio-header" style={{ 
        background: '#001529', 
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        height: '48px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
      }}>
        <div className="header-left">
          <DashboardOutlined style={{ marginRight: 8, fontSize: '20px' }} />
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
            Aiser Dashboard Studio
          </span>
        </div>
        
        <Space>
          <Tooltip title={`${activeWidgets.length} Active Widgets`}>
            <Badge count={activeWidgets.length} showZero>
              <Button icon={<DashboardOutlined />} size="small" />
            </Badge>
          </Tooltip>
          <Button 
            icon={<EyeOutlined />} 
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            type={isPreviewMode ? 'primary' : 'default'}
            size="small"
            title={isPreviewMode ? 'Exit Preview' : 'Preview Mode'}
          />
          <Button icon={<SaveOutlined />} type="primary" size="small">
            Save
          </Button>
        </Space>
      </Header>

      <Layout>
        <Sider width={200} className="studio-sider" style={{ background: '#fafafa', borderRight: '1px solid #f0f0f0' }}>
          <div className="sider-content" style={{ padding: '8px' }}>
            <Tabs 
              activeKey={selectedTab} 
              onChange={setSelectedTab}
              tabPosition="left"
              style={{ height: '100%' }}
            >
              <TabPane 
                tab={<span><DashboardOutlined />Dashboard</span>} 
                key="dashboard" 
              />
              <TabPane 
                tab={<span><DatabaseOutlined />Data</span>} 
                key="data" 
              />
              <TabPane 
                tab={<span><BarChartOutlined />Charts</span>} 
                key="charts" 
              />
              <TabPane 
                tab={<span><FilterOutlined />Filters</span>} 
                key="filters" 
              />
            </Tabs>
          </div>
        </Sider>

        <Content className="studio-content" style={{ padding: '16px', background: '#f0f2f5' }}>
          {renderTabContent()}
        </Content>
      </Layout>

      <style jsx>{`
        .dashboard-widget:hover {
          transform: translateY(-2px);
        }
        
        .dashboard-widget.selected {
          border-color: #1890ff !important;
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2), 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        }
        
        .widget-gallery-item:hover {
          background: #f0f0f0 !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .grid-item {
          transition: all 0.2s ease;
        }

        .react-grid-item {
          transition: all 0.2s ease;
        }

        .react-grid-item.react-grid-placeholder {
          background: rgba(24, 144, 255, 0.2);
          border: 2px dashed #1890ff;
          border-radius: 8px;
        }

        .widget-drag-handle {
          cursor: move !important;
        }

        .widget-drag-handle:hover {
          background: rgba(24, 144, 255, 0.1);
          border-radius: 4px;
        }

        .dashboard-canvas.drag-over {
          border-color: #1890ff !important;
          background-color: rgba(24, 144, 255, 0.05) !important;
        }

        .react-grid-item.react-draggable-dragging {
          z-index: 1000 !important;
          transform: rotate(5deg) !important;
        }

        .react-grid-item.react-resizable-resizing {
          z-index: 1000 !important;
        }

        .react-resizable-handle {
          background: rgba(24, 144, 255, 0.3);
          border-radius: 2px;
        }

        .react-resizable-handle:hover {
          background: rgba(24, 144, 255, 0.5);
        }

        .template-item:hover {
          background: #f0f0f0 !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .theme-item:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .property-panel .ant-card {
          margin-bottom: 16px;
        }

        .property-panel .ant-card:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </Layout>
  );
};
