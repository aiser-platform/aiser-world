'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Layout, Button, Space, Typography, Breadcrumb, Tabs, Card, Input, Select, message, Collapse, Tooltip, Dropdown, Menu } from 'antd';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
  HomeOutlined,
  DashboardOutlined,
  SettingOutlined,
  SaveOutlined,
  EditOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  BarChartOutlined,
  DatabaseOutlined,
  FilterOutlined,
  PlusOutlined,
  CloseOutlined,
  AppstoreOutlined,
  UndoOutlined,
  RedoOutlined,
  FullscreenOutlined,
  CompressOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  CopyOutlined,
  LineChartOutlined,
  PieChartOutlined,
  AreaChartOutlined,
  DotChartOutlined,
  RadarChartOutlined,
  HeatMapOutlined,
  FunnelPlotOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  PictureOutlined,
  FontSizeOutlined,
  TableOutlined,
  CalendarOutlined,
  DownOutlined,
  MenuOutlined,
  MoreOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { EChartsConfigProvider } from './EChartsConfiguration';
import { WidgetRenderer } from './WidgetSystem/WidgetRenderer';
import { DashboardWidget } from './DashboardConfiguration/DashboardConfigProvider';
import { dashboardDataService, WidgetDataConfig } from '../services/DashboardDataService';

import { dashboardAPIService } from '../services/DashboardAPIService';

import AdvancedDashboardCanvas from './AdvancedDashboardCanvas';
import dynamic from 'next/dynamic';

// Lazy load heavy components to reduce initial bundle size
const UnifiedDesignPanel = dynamic(() => import('./UnifiedDesignPanel'), {
  loading: () => <div>Loading design panel...</div>,
  ssr: false
});

const ChartWidget = dynamic(() => import('./ChartWidget'), {
  loading: () => <div>Loading chart...</div>,
  ssr: false
});

const MonacoSQLEditor = dynamic(() => import('./MonacoSQLEditor'), {
  loading: () => <div>Loading SQL editor...</div>,
  ssr: false
});
import './DashboardStudio.css';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;

interface DashboardStudioProps {}



const ResponsiveGridLayout = WidthProvider(Responsive);

// Comprehensive chart types from the Chart Config system
const COMPREHENSIVE_CHART_TYPES = {
  // Comparison charts
  comparison: {
    name: 'Comparison',
    color: '#1890ff',
    charts: [
      { type: 'bar', name: 'Bar', icon: <BarChartOutlined />, tooltip: 'Compare values across categories' },
      { type: 'column', name: 'Column', icon: <BarChartOutlined />, tooltip: 'Vertical bar comparison' },
      { type: 'groupedBar', name: 'Grouped', icon: <BarChartOutlined />, tooltip: 'Multiple series comparison' },
      { type: 'stackedBar', name: 'Stacked', icon: <BarChartOutlined />, tooltip: 'Cumulative values' },
      { type: 'radar', name: 'Radar', icon: <RadarChartOutlined />, tooltip: 'Compare multiple variables' },
      { type: 'gauge', name: 'Gauge', icon: <DashboardOutlined />, tooltip: 'Single value indicator' }
    ]
  },
  // Trend charts
  trend: {
    name: 'Trend',
    color: '#52c41a',
    charts: [
      { type: 'line', name: 'Line', icon: <LineChartOutlined />, tooltip: 'Show trends over time' },
      { type: 'area', name: 'Area', icon: <AreaChartOutlined />, tooltip: 'Show trends with filled areas' },
      { type: 'step', name: 'Step', icon: <LineChartOutlined />, tooltip: 'Step-wise progression' },
      { type: 'spline', name: 'Spline', icon: <LineChartOutlined />, tooltip: 'Smooth curved trends' }
    ]
  },
  // Distribution charts
  distribution: {
    name: 'Distribution',
    color: '#fa8c16',
    charts: [
      { type: 'pie', name: 'Pie', icon: <PieChartOutlined />, tooltip: 'Show parts of a whole' },
      { type: 'doughnut', name: 'Doughnut', icon: <PieChartOutlined />, tooltip: 'Ring distribution' },
      { type: 'funnel', name: 'Funnel', icon: <FunnelPlotOutlined />, tooltip: 'Process flow stages' }
    ]
  },
  // Correlation charts
  correlation: {
    name: 'Correlation',
    color: '#eb2f96',
    charts: [
      { type: 'scatter', name: 'Scatter', icon: <DotChartOutlined />, tooltip: 'Show relationships between variables' },
      { type: 'bubble', name: 'Bubble', icon: <DotChartOutlined />, tooltip: '3D correlation with size' },
      { type: 'heatmap', name: 'Heatmap', icon: <HeatMapOutlined />, tooltip: 'Show data density and patterns' }
    ]
  },
  // Hierarchy charts
  hierarchy: {
    name: 'Hierarchy',
    color: '#722ed1',
    charts: [
      { type: 'tree', name: 'Tree', icon: <BarChartOutlined />, tooltip: 'Hierarchical data structure' },
      { type: 'treemap', name: 'Treemap', icon: <BarChartOutlined />, tooltip: 'Hierarchical area visualization' }
    ]
  }
};

const generateId = () => `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const DashboardStudio: React.FC<DashboardStudioProps> = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isEditing, setIsEditing] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(true);
  const [showProperties, setShowProperties] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<DashboardWidget | null>(null);
  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidget[]>([]);
  const [layout, setLayout] = useState<any[]>([]);
  const [breakpoint, setBreakpoint] = useState('lg');
  const [isDragOver, setIsDragOver] = useState(false);
  const [dashboardTitle, setDashboardTitle] = useState('My Dashboard');
  const [dashboardSubtitle, setDashboardSubtitle] = useState('Professional BI Dashboard');
  const [dashboardId, setDashboardId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentQueryResult, setCurrentQueryResult] = useState<any>(null);
  const [selectedDataSource, setSelectedDataSource] = useState<string>('');




  // Generate widget configuration based on type
  const generateWidgetConfig = (type: string) => {
    switch (type) {
      case 'chart':
        return {
          chartType: 'bar',
          title: {
            text: 'New Bar Chart',
            subtext: '',
            left: 'left'
          },
          tooltip: { trigger: 'axis' },
          legend: { data: [] },
          color: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de'],
          animation: true,
          grid: { top: 60, right: 40, bottom: 60, left: 60 },
          xAxis: { type: 'category', data: [] },
          yAxis: { type: 'value' },
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

  // Ensure component is mounted before rendering (SSR fix)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // URL parameter handling for deep linking
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['dashboard', 'query-editor', 'chart', 'filter'].includes(tabParam)) {
      setActiveTab(tabParam);
      
      // Auto-hide Widget Library and Properties for Query Editor tab
      if (tabParam === 'query-editor') {
        setShowWidgetLibrary(false);
        setShowProperties(false);
      } else {
        // Show Widget Library and Properties for other tabs
        setShowWidgetLibrary(true);
        setShowProperties(true);
      }
    }
  }, []);

  // Update URL when tab changes
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    
    // Auto-hide Widget Library and Properties for Query Editor tab
    if (key === 'query-editor') {
      setShowWidgetLibrary(false);
      setShowProperties(false);
    } else {
      // Show Widget Library and Properties for other tabs
      setShowWidgetLibrary(true);
      setShowProperties(true);
    }
    
    const url = new URL(window.location.href);
    url.searchParams.set('tab', key);
    window.history.pushState({}, '', url.toString());
  };

  // Update activeTab state when URL changes
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam && ['dashboard', 'query-editor', 'chart', 'filter'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Auto-save layout changes
  useEffect(() => {
    if (layout.length > 0) {
      const timeoutId = setTimeout(() => {
        // Auto-save layout changes
        localStorage.setItem('dashboard-layout', JSON.stringify(layout));
        localStorage.setItem('dashboard-widgets', JSON.stringify(dashboardWidgets));
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [layout, dashboardWidgets]);

  // Load saved layout on mount
  useEffect(() => {
    const savedLayout = localStorage.getItem('dashboard-layout');
    const savedWidgets = localStorage.getItem('dashboard-widgets');
    
    if (savedLayout && savedWidgets) {
      try {
        setLayout(JSON.parse(savedLayout));
        setDashboardWidgets(JSON.parse(savedWidgets));
      } catch (error) {
        console.error('Failed to load saved layout:', error);
      }
    }
  }, []);

  // Don't render until mounted to avoid SSR issues
  if (!isMounted) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: isDarkMode ? '#ffffff' : '#000000'
      }}>
        Loading Dashboard Studio...
      </div>
    );
  }

  // Widget Library Categories - Comprehensive Widget Selection
  const widgetCategories = [
    {
      key: 'charts',
      label: 'Charts',
      icon: <BarChartOutlined />,
      description: 'Select chart types and add configured charts to dashboard',
      content: (
        <div>
          {/* Ultra-Compact Chart Categories */}
          {Object.entries(COMPREHENSIVE_CHART_TYPES).map(([categoryKey, category]) => (
            <div key={categoryKey} style={{ marginBottom: '12px' }}>
              {/* Ultra-Compact Category Header */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px', 
                marginBottom: '6px',
                padding: '2px 6px',
                background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderRadius: '3px',
                opacity: 0.6
              }}>
                <div style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  background: category.color 
                }} />
                <Text style={{ 
                  color: isDarkMode ? '#888' : '#777', 
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  fontWeight: 'normal'
                }}>
                  {category.name}
                </Text>
              </div>
              
              {/* Ultra-Compact Chart Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '4px' }}>
                {category.charts.map((chart) => (
                  <Tooltip key={chart.type} title={chart.tooltip} placement="top">
                    <Card
                      size="small"
                      style={{ 
                        cursor: 'grab',
                        border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
                        background: isDarkMode ? '#1f1f1f' : '#ffffff',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        padding: '4px 2px'
                      }}
                      hoverable
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify(chart));
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onClick={() => handleWidgetSelect(chart)}
                    >
                      <div style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                        <div style={{ fontSize: '16px', marginBottom: '1px' }}>
                          {React.isValidElement(chart.icon) ? chart.icon : <BarChartOutlined />}
                        </div>
                        <div style={{ fontWeight: 'bold', fontSize: '9px' }}>{chart.name}</div>
                      </div>
                    </Card>
                  </Tooltip>
                ))}
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      key: 'content',
      label: 'Content',
      icon: <FileTextOutlined />,
      description: 'Text, images, and content widgets',
      content: (
        <div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              marginBottom: '6px',
              padding: '2px 6px',
              background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              borderRadius: '3px',
              opacity: 0.6
            }}>
              <div style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                background: '#722ed1'
              }} />
              <Text style={{ 
                color: isDarkMode ? '#888' : '#777', 
                fontSize: '9px',
                textTransform: 'uppercase',
                fontWeight: 'normal'
              }}>
                Content
              </Text>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '4px' }}>
              <Tooltip title="Rich text editor with markdown support" placement="top">
                <Card
                  size="small"
                  style={{ 
                    cursor: 'grab',
                    border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
                    background: isDarkMode ? '#1f1f1f' : '#ffffff',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    padding: '8px 4px'
                  }}
                  hoverable
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      type: 'markdown',
                      name: 'Markdown',
                      icon: <FileTextOutlined />,
                      tooltip: 'Rich text editor with markdown support'
                    }));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => handleWidgetSelect({
                    type: 'markdown',
                    name: 'Markdown',
                    icon: <FileTextOutlined />,
                    tooltip: 'Rich text editor with markdown support'
                  })}
                >
                  <div style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                    <div style={{ fontSize: '16px', marginBottom: '1px' }}>
                      <FileTextOutlined />
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '9px' }}>Markdown</div>
                  </div>
                </Card>
              </Tooltip>
              
              <Tooltip title="Display images and media" placement="top">
                <Card
                  size="small"
                  style={{ 
                    cursor: 'grab',
                    border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
                    background: isDarkMode ? '#1f1f1f' : '#ffffff',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    padding: '8px 4px'
                  }}
                  hoverable
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      type: 'image',
                      name: 'Image',
                      icon: <PictureOutlined />,
                      tooltip: 'Display images and media'
                    }));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => handleWidgetSelect({
                    type: 'image',
                    name: 'Image',
                    icon: <PictureOutlined />,
                    tooltip: 'Display images and media'
                  })}
                >
                  <div style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                    <div style={{ fontSize: '16px', marginBottom: '1px' }}>
                      <PictureOutlined />
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '9px' }}>Image</div>
                  </div>
                </Card>
              </Tooltip>
              
              <Tooltip title="Simple text display" placement="top">
                <Card
                  size="small"
                  style={{ 
                    cursor: 'grab',
                    border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
                    background: isDarkMode ? '#1f1f1f' : '#ffffff',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    padding: '8px 4px'
                  }}
                  hoverable
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      type: 'text',
                      name: 'Text',
                      icon: <FontSizeOutlined />,
                      tooltip: 'Simple text display'
                    }));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => handleWidgetSelect({
                    type: 'text',
                    name: 'Text',
                    icon: <FontSizeOutlined />,
                    tooltip: 'Simple text display'
                  })}
                >
                  <div style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                    <div style={{ fontSize: '16px', marginBottom: '1px' }}>
                      <FontSizeOutlined />
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '9px' }}>Text</div>
                  </div>
                </Card>
              </Tooltip>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'data',
      label: 'Data',
      icon: <DatabaseOutlined />,
      description: 'Data display and analysis widgets',
      content: (
        <div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              marginBottom: '6px',
              padding: '2px 6px',
              background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              borderRadius: '3px',
              opacity: 0.6
            }}>
              <div style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                background: '#52c41a'
              }} />
              <Text style={{ 
                color: isDarkMode ? '#888' : '#777', 
                fontSize: '9px',
                textTransform: 'uppercase',
                fontWeight: 'normal'
              }}>
                Data
              </Text>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '4px' }}>
              <Tooltip title="Data table with sorting and filtering" placement="top">
                <Card
                  size="small"
                  style={{ 
                    cursor: 'grab',
                    border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
                    background: isDarkMode ? '#1f1f1f' : '#ffffff',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    padding: '8px 4px'
                  }}
                  hoverable
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      type: 'table',
                      name: 'Table',
                      icon: <TableOutlined />,
                      tooltip: 'Data table with sorting and filtering'
                    }));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => handleWidgetSelect({
                    type: 'table',
                    name: 'Table',
                    icon: <TableOutlined />,
                    tooltip: 'Data table with sorting and filtering'
                  })}
                >
                  <div style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                    <div style={{ fontSize: '18px', marginBottom: '2px' }}>
                      <TableOutlined />
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '10px' }}>Table</div>
                  </div>
                </Card>
              </Tooltip>
              
              <Tooltip title="Key performance indicators" placement="top">
                <Card
                  size="small"
                  style={{ 
                    cursor: 'grab',
                    border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
                    background: isDarkMode ? '#1f1f1f' : '#ffffff',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    padding: '8px 4px'
                  }}
                  hoverable
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      type: 'kpi',
                      name: 'KPI',
                      icon: <DashboardOutlined />,
                      tooltip: 'Key performance indicators'
                    }));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => handleWidgetSelect({
                    type: 'type',
                    name: 'KPI',
                    icon: <DashboardOutlined />,
                    tooltip: 'Key performance indicators'
                  })}
                >
                  <div style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                    <div style={{ fontSize: '18px', marginBottom: '2px' }}>
                      <DashboardOutlined />
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '10px' }}>KPI</div>
                  </div>
                </Card>
              </Tooltip>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'controls',
      label: 'Controls',
      icon: <FilterOutlined />,
      description: 'Interactive filters and controls',
      content: (
        <div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              marginBottom: '6px',
              padding: '2px 6px',
              background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              borderRadius: '3px',
              opacity: 0.6
            }}>
              <div style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                background: '#fa8c16'
              }} />
              <Text style={{ 
                color: isDarkMode ? '#888' : '#777', 
                fontSize: '9px',
                textTransform: 'uppercase',
                fontWeight: 'normal'
              }}>
                Filters
              </Text>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '4px' }}>
              <Tooltip title="Date range picker" placement="top">
                <Card
                  size="small"
                  style={{ 
                    cursor: 'grab',
                    border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
                    background: isDarkMode ? '#1f1f1f' : '#ffffff',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    padding: '8px 4px'
                  }}
                  hoverable
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      type: 'dateFilter',
                      name: 'Date Filter',
                      icon: <CalendarOutlined />,
                      tooltip: 'Date range picker'
                    }));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => handleWidgetSelect({
                    type: 'dateFilter',
                    name: 'Date Filter',
                    icon: <CalendarOutlined />,
                    tooltip: 'Date range picker'
                  })}
                >
                  <div style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                    <div style={{ fontSize: '18px', marginBottom: '2px' }}>
                      <CalendarOutlined />
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '10px' }}>Date</div>
                  </div>
                </Card>
              </Tooltip>
              
              <Tooltip title="Dropdown selection" placement="top">
                <Card
                  size="small"
                  style={{ 
                    cursor: 'grab',
                    border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
                    background: isDarkMode ? '#1f1f1f' : '#ffffff',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    padding: '8px 4px'
                  }}
                  hoverable
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      type: 'dropdownFilter',
                      name: 'Dropdown',
                      icon: <DownOutlined />,
                      tooltip: 'Dropdown selection'
                    }));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => handleWidgetSelect({
                    type: 'dropdownFilter',
                    name: 'Dropdown',
                    icon: <DownOutlined />,
                    tooltip: 'Dropdown selection'
                  })}
                >
                  <div style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                    <div style={{ fontSize: '18px', marginBottom: '2px' }}>
                      <DownOutlined />
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '10px' }}>Dropdown</div>
                  </div>
                </Card>
              </Tooltip>
              
              <Tooltip title="Slider control" placement="top">
                <Card
                  size="small"
                  style={{ 
                    cursor: 'grab',
                    border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
                    background: isDarkMode ? '#1f1f1f' : '#ffffff',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    padding: '8px 4px'
                  }}
                  hoverable
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      type: 'sliderFilter',
                      name: 'Slider',
                      icon: <MenuOutlined />,
                      tooltip: 'Slider control'
                    }));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => handleWidgetSelect({
                    type: 'sliderFilter',
                    name: 'Slider',
                    icon: <MenuOutlined />,
                    tooltip: 'Slider control'
                  })}
                >
                  <div style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                    <div style={{ fontSize: '18px', marginBottom: '2px' }}>
                      <MenuOutlined />
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '10px' }}>Slider</div>
                  </div>
                </Card>
              </Tooltip>
            </div>
          </div>
        </div>
      )
    }
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dashboardData = {
        title: dashboardTitle,
        subtitle: dashboardSubtitle,
        widgets: dashboardWidgets,
        layout: layout,
        metadata: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      let result;
      if (dashboardId) {
        // Update existing dashboard
        result = await dashboardAPIService.updateDashboard(dashboardId, dashboardData);
        message.success('Dashboard updated successfully!');
      } else {
        // Create new dashboard
        result = await dashboardAPIService.createDashboard(dashboardData);
        setDashboardId(result.id);
        message.success('Dashboard created successfully!');
      }
    } catch (error) {
      console.error('Failed to save dashboard:', error);
      message.error('Failed to save dashboard. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  const handleUndo = () => message.info('Undo action');
  const handleRedo = () => message.info('Redo action');
  const handleShare = async () => {
    if (!dashboardId) {
      message.warning('Please save the dashboard first before sharing.');
      return;
    }
    
    try {
      const shareData = {
        permissions: ['view'],
        expires_at: null,
        public: false
      };
      
      const result = await dashboardAPIService.shareDashboard(dashboardId, shareData);
      message.success('Dashboard shared successfully!');
      console.log('Share result:', result);
    } catch (error) {
      console.error('Failed to share dashboard:', error);
      message.error('Failed to share dashboard. Please try again.');
    }
  };

  const handleExport = async (format: string = 'json') => {
    if (!dashboardId) {
      message.warning('Please save the dashboard first before exporting.');
      return;
    }
    
    try {
      const result = await dashboardAPIService.exportDashboard(dashboardId, format);
      message.success(`Dashboard exported as ${format.toUpperCase()} successfully!`);
      console.log('Export result:', result);
    } catch (error) {
      console.error('Failed to export dashboard:', error);
      message.error('Failed to export dashboard. Please try again.');
    }
  };
  
  const handleExportPNG = () => {
    // Export dashboard as PNG (dashboard canvas only)
    message.info('Exporting dashboard as PNG...');
    // TODO: Implement PNG export using html2canvas or similar
  };
  
  const handleExportPDF = () => {
    // Export dashboard as PDF (dashboard canvas only)
    message.info('Exporting dashboard as PDF...');
    // TODO: Implement PDF export using jsPDF or similar
  };
  
  const handleExportHTML = () => {
    // Export dashboard as interactive HTML
    message.info('Exporting dashboard as HTML...');
    // TODO: Implement HTML export with all configurations
  };
  const handleToggleFullscreen = () => setIsFullscreen(!isFullscreen);

  const handleWidgetSelect = (widget: any) => {
    setSelectedWidget(widget);
  };

  const handleCanvasWidgetSelect = (widgetId: string) => {
    const widget = dashboardWidgets.find(w => w.id === widgetId);
    if (widget) {
      setSelectedWidget(widget);
    }
  };

  const handleOpenProperties = (widget: any) => {
    setSelectedWidget(widget);
    setShowProperties(true);
    
    // Each widget should have its own configuration
    // The PropertiesConfigPanel will handle this per-widget
  };

  // Update widget configuration with real-time updates
  const handleWidgetConfigUpdate = (widgetId: string, config: any) => {
    setDashboardWidgets(prev => prev.map(widget => {
      if (widget.id === widgetId) {
        const updatedWidget = { ...widget };
        
        // Handle different types of config updates
        if (config.title !== undefined) {
          updatedWidget.title = config.title;
        }
        if (config.style !== undefined) {
          updatedWidget.style = { ...updatedWidget.style, ...config.style };
        }
        if (config.isVisible !== undefined) {
          updatedWidget.isVisible = config.isVisible;
        }
        if (config.isLocked !== undefined) {
          updatedWidget.isLocked = config.isLocked;
        }
        if (config.refreshInterval !== undefined) {
          updatedWidget.refreshInterval = config.refreshInterval;
        }
        if (config.layout !== undefined) {
          updatedWidget.layout = { ...updatedWidget.layout, ...config.layout };
        }
        if (config.behavior !== undefined) {
          updatedWidget.behavior = { ...updatedWidget.behavior, ...config.behavior };
        }
        if (config.animation !== undefined) {
          updatedWidget.animation = { ...updatedWidget.animation, ...config.animation };
        }
        if (config.data !== undefined) {
          updatedWidget.data = { ...updatedWidget.data, ...config.data };
        }
        
        // Update the main config object
        updatedWidget.config = { ...updatedWidget.config, ...config };
        
        return updatedWidget;
      }
      return widget;
    }));
    
    // Update selected widget if it's the one being configured
    if (selectedWidget?.id === widgetId) {
      setSelectedWidget(prev => {
        if (prev) {
          const updatedWidget = { ...prev };
          
          if (config.title !== undefined) {
            updatedWidget.title = config.title;
          }
          if (config.style !== undefined) {
            updatedWidget.style = { ...updatedWidget.style, ...config.style };
          }
          if (config.isVisible !== undefined) {
            updatedWidget.isVisible = config.isVisible;
          }
          if (config.isLocked !== undefined) {
            updatedWidget.isLocked = config.isLocked;
          }
          if (config.refreshInterval !== undefined) {
            updatedWidget.refreshInterval = config.refreshInterval;
          }
          if (config.layout !== undefined) {
            updatedWidget.layout = { ...updatedWidget.layout, ...config.layout };
          }
          if (config.behavior !== undefined) {
            updatedWidget.behavior = { ...updatedWidget.behavior, ...config.behavior };
          }
          if (config.animation !== undefined) {
            updatedWidget.animation = { ...updatedWidget.animation, ...config.animation };
          }
          if (config.data !== undefined) {
            updatedWidget.data = { ...updatedWidget.data, ...config.data };
          }
          
          updatedWidget.config = { ...updatedWidget.config, ...config };
          
          return updatedWidget;
        }
        return prev;
      });
    }
  };

  const handleAddToDashboard = async (widget: any) => {
    // Map specific widget types to allowed types
    const mapWidgetType = (type: string) => {
      switch (type) {
        case 'bar':
        case 'line':
        case 'pie':
        case 'area':
        case 'scatter':
        case 'radar':
        case 'heatmap':
        case 'funnel':
        case 'gauge':
          return 'chart';
        case 'markdown':
        case 'text':
          return 'text';
        case 'image':
          return 'image';
        case 'table':
        case 'pivot':
          return 'table';
        case 'kpi':
        case 'metric':
        case 'trend':
          return 'metric';
        case 'dateFilter':
        case 'dropdownFilter':
        case 'sliderFilter':
        case 'searchFilter':
          return 'filter';
        default:
          return 'text';
      }
    };

    // Get real data for widget (with fallback to sample data)
    const getWidgetData = async (type: string, dataSourceId?: string, query?: string) => {
      // If we have a real data source and query, use it
      if (dataSourceId && query) {
        try {
          const result = await dashboardDataService.executeWidgetQuery({
            dataSourceId,
            query,
            cache: true,
            cacheTimeout: 300000 // 5 minutes
          });
          
          if (result.success) {
            return dashboardDataService.generateChartData(result, type);
          }
        } catch (error) {
          console.error('Failed to execute real query, falling back to sample data:', error);
        }
      }

      // Fallback to sample data
      switch (type) {
        case 'bar':
        case 'line':
        case 'area':
          return {
            xAxis: ['Product A', 'Product B', 'Product C', 'Product D', 'Product E'],
            yAxis: [120, 200, 150, 80, 300]
          };
        case 'pie':
        case 'doughnut':
          return {
            series: [
              { value: 335, name: 'Direct' },
              { value: 310, name: 'Email' },
              { value: 234, name: 'Union Ads' },
              { value: 135, name: 'Video Ads' },
              { value: 1548, name: 'Search Engine' }
            ]
          };
        case 'scatter':
          return {
            series: [
              { value: [10, 20], name: 'Point 1' },
              { value: [20, 30], name: 'Point 2' },
              { value: [30, 40], name: 'Point 3' },
              { value: [40, 50], name: 'Point 4' },
              { value: [50, 60], name: 'Point 5' }
            ]
          };
        case 'radar':
          return {
            indicators: [
              { name: 'Sales', max: 6500 },
              { name: 'Administration', max: 16000 },
              { name: 'Information Technology', max: 30000 },
              { name: 'Customer Support', max: 38000 },
              { name: 'Development', max: 52000 },
              { name: 'Marketing', max: 25000 }
            ],
            data: [4300, 10000, 28000, 35000, 50000, 19000]
          };
        case 'gauge':
          return {
            value: 75,
            name: 'Performance'
          };
        default:
          return [];
      }
    };

    // Define default configurations for each widget type
    const getDefaultConfig = (type: string) => {
      const mappedType = mapWidgetType(type);
      
      switch (mappedType) {
        case 'chart':
          return {
            chartType: type, // Keep original type for chart rendering
            title: { 
              text: `${widget.name || widget.title} Chart`, 
              subtext: 'Professional visualization',
              textStyle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
              subtextStyle: { fontSize: 12, color: '#666' }
            },
            showTitle: true,
            showSubtitle: true,
            showLegend: true,
            showTooltip: true,
            showGrid: true,
            showContainer: true,
            colors: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96'],
            animation: true,
            // Professional styling
            backgroundColor: '#ffffff',
            borderColor: '#e8e8e8',
            borderRadius: 8,
            padding: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          };
        case 'table':
          return {
            title: { 
              text: 'Professional Data Table', 
              subtext: 'Clean and organized data display',
              textStyle: { fontSize: 16, fontWeight: 'bold', color: '#333' }
            },
            showTitle: true,
            showSubtitle: true,
            pagination: true,
            pageSize: 10,
            showBorder: true,
            showContainer: true,
            striped: true,
            hoverable: true,
            sortable: true,
            filterable: true,
            // Professional styling
            backgroundColor: '#ffffff',
            borderColor: '#e8e8e8',
            borderRadius: 8,
            padding: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          };
        case 'metric':
          return {
            title: { 
              text: 'Key Performance Metric', 
              subtext: 'Real-time business indicator',
              textStyle: { fontSize: 14, fontWeight: '500', color: '#666' }
            },
            showTitle: true,
            showSubtitle: true,
            value: '1,234',
            format: 'number',
            prefix: '',
            suffix: '',
            showTrend: true,
            trendValue: '+12.5%',
            showContainer: true,
            // Professional styling
            backgroundColor: '#ffffff',
            borderColor: '#e8e8e8',
            borderRadius: 8,
            padding: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            valueStyle: { fontSize: 32, fontWeight: 'bold', color: '#1890ff' },
            trendStyle: { fontSize: 14, color: '#52c41a' }
          };
        case 'text':
          return {
            title: { 
              text: type === 'markdown' ? 'Rich Content Widget' : 'Text Widget', 
              subtext: type === 'markdown' ? 'Markdown support included' : 'Simple text display',
              textStyle: { fontSize: 16, fontWeight: 'bold', color: '#333' }
            },
            showTitle: true,
            showSubtitle: true,
            content: type === 'markdown' 
              ? '# Welcome to Your Dashboard\n\nThis is a **professional markdown widget** with:\n\n- *Italic text*\n- **Bold text**\n- `Code snippets`\n- Lists and more\n\nCustomize this content to fit your needs.'
              : 'Welcome to your professional dashboard! This text widget provides a clean and elegant way to display important information, announcements, or instructions to your users.',
            fontSize: 14,
            fontWeight: 'normal',
            color: '#333',
            textAlign: 'left',
            lineHeight: 1.6,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            showContainer: true,
            // Professional styling
            backgroundColor: '#ffffff',
            borderColor: '#e8e8e8',
            borderRadius: 8,
            padding: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          };
        case 'image':
          return {
            title: { text: 'Image Widget', subtext: '' },
            showTitle: true,
            showSubtitle: false,
            imageUrl: '',
            altText: 'Image',
            fitMode: 'contain',
            showContainer: false
          };
        case 'filter':
          return {
            title: { text: 'Filter Widget', subtext: '' },
            showTitle: true,
            showSubtitle: false,
            filterType: type === 'dateFilter' ? 'dateRange' : 
                       type === 'dropdownFilter' ? 'dropdown' :
                       type === 'sliderFilter' ? 'slider' :
                       type === 'searchFilter' ? 'search' : 'dropdown',
            showContainer: false
          };
        default:
          return {
            title: { text: widget.name || widget.title || 'Widget', subtext: '' },
            showTitle: true,
            showSubtitle: false,
            showContainer: false
          };
      }
    };

    const newWidget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      type: mapWidgetType(widget.type), // Use mapped type
      title: widget.name || widget.title || 'Untitled',
      position: { x: 0, y: 0, w: 6, h: 4 }, // Use correct position format
      config: getDefaultConfig(widget.type),
      dataSource: undefined,
      refreshInterval: undefined,
      isVisible: true,
      isLocked: false,
      
      // Enhanced layout properties (Tableau-style)
      layout: {
        x: 0,
        y: 0,
        width: 6,
        height: 4,
        minWidth: 2,
        minHeight: 2,
        maxWidth: 12,
        maxHeight: 20,
        responsive: true,
        isDraggable: true,
        isResizable: true,
        isBounded: true,
        static: false,
        containerPadding: [16, 16],
        margin: [8, 8]
      },
      
      // Enhanced style properties (Tableau-style)
      style: {
        backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
        borderColor: isDarkMode ? '#303030' : '#d9d9d9',
        borderWidth: 1,
        borderStyle: 'solid',
        borderRadius: 8,
        padding: 16,
        margin: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        opacity: 1,
        zIndex: 1,
        fontSize: 14,
        fontWeight: 'normal',
        textAlign: 'left',
        color: isDarkMode ? '#ffffff' : '#000000',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        lineHeight: 1.5,
        overflow: 'auto'
      },
      
      // Animation properties
      animation: {
        enabled: true,
        duration: 300,
        easing: 'ease-in-out',
        delay: 0,
        type: 'fade'
      },
      
      // Behavior properties
      behavior: {
        clickable: true,
        hoverable: true,
        selectable: true,
        draggable: true,
        resizable: true,
        onHover: 'highlight',
        onClick: 'select'
      },
      
      // Data properties
      data: {
        source: undefined,
        query: undefined,
        refreshInterval: undefined,
        autoRefresh: false,
        cache: true,
        cacheTimeout: 300
      }
    };

    // Get initial data for the widget (async, non-blocking)
    getWidgetData(widget.type, newWidget.dataSource, newWidget.data?.query).then(initialData => {
      // Update widget data after it's loaded
      setDashboardWidgets(prev => prev.map(w => 
        w.id === newWidget.id 
          ? { ...w, data: { ...w.data, ...initialData } }
          : w
      ));
    }).catch(error => {
      console.error('Failed to load initial widget data:', error);
    });
    
    const newLayout = {
      i: newWidget.id,
      x: 0,
      y: 0,
      w: 6,
      h: 4,
      minW: 2,
      minH: 2,
      maxW: 12,
      maxH: 8,
      isResizable: true,
      isDraggable: true
    };
    
    setDashboardWidgets(prev => [...prev, newWidget]);
    setLayout(prev => [...prev, newLayout]);
    
    // Automatically select the newly added widget for configuration
    setSelectedWidget(newWidget);
    
    message.success(`${widget.name || widget.title} added to dashboard`);
  };

  const handleLayoutChange = (newLayout: any[]) => {
    setLayout(newLayout);
    // Update widget positions based on layout changes
    const updatedWidgets = dashboardWidgets.map(widget => {
      const layoutItem = newLayout.find(item => item.i === widget.id);
      if (layoutItem) {
        return {
          ...widget,
          position: { x: layoutItem.x, y: layoutItem.y, w: layoutItem.w, h: layoutItem.h }
        };
      }
      return widget;
    });
    setDashboardWidgets(updatedWidgets);
  };

  const handleBreakpointChange = (newBreakpoint: string) => {
    setBreakpoint(newBreakpoint);
  };

  const handleWidgetResize = (layout: any[], oldItem: any, newItem: any) => {
    // Handle widget resize
    const updatedWidgets = dashboardWidgets.map(widget => {
      if (widget.id === newItem.i) {
        return {
          ...widget,
          position: { ...widget.position, w: newItem.w, h: newItem.h }
        };
      }
      return widget;
    });
    setDashboardWidgets(updatedWidgets);
  };

  const handleWidgetMove = (layout: any[], oldItem: any, newItem: any) => {
    // Handle widget move
    const updatedWidgets = dashboardWidgets.map(widget => {
      if (widget.id === newItem.i) {
        return {
          ...widget,
          position: { ...widget.position, x: newItem.x, y: newItem.y }
        };
      }
      return widget;
    });
    setDashboardWidgets(updatedWidgets);
  };

  const handleDuplicateWidget = (widget: DashboardWidget) => {
    const newWidget: DashboardWidget = {
      ...widget,
      id: `widget-${Date.now()}`,
      position: { ...widget.position, x: widget.position.x + 1, y: widget.position.y + 1 }
    };
    
    const newLayout = {
      i: newWidget.id,
      x: widget.position.x + 1,
      y: widget.position.y + 1,
      w: widget.position.w,
      h: widget.position.h,
      minW: 2,
      minH: 2,
      maxW: 12,
      maxH: 8,
      isResizable: true,
      isDraggable: true
    };
    
    setDashboardWidgets(prev => [...prev, newWidget]);
    setLayout(prev => [...prev, newLayout]);
    message.success(`${widget.title} duplicated`);
  };

  const handleDeleteWidget = (widgetId: string) => {
    setDashboardWidgets(prev => prev.filter(w => w.id !== widgetId));
    setLayout(prev => prev.filter(l => l.i !== widgetId));
    if (selectedWidget?.id === widgetId) {
      setSelectedWidget(null);
    }
  };



  // Handle query results from MonacoSQLEditor
  const handleQueryResult = (result: any) => {
    setCurrentQueryResult(result);
    message.success(`Query executed: ${result.rowCount} rows returned`);
  };

  // Handle chart creation from MonacoSQLEditor
  const handleChartCreate = async (chartData: any) => {
    try {
      // Create a new widget from the chart data
      const newWidget: DashboardWidget = {
        id: `widget-${Date.now()}`,
        type: 'chart',
        title: chartData.title,
        position: { x: 0, y: 0, w: 6, h: 4 },
        config: chartData.config,
        dataSource: chartData.dataSourceId,
        refreshInterval: undefined,
        isVisible: true,
        isLocked: false,
        
        // Enhanced properties
        layout: {
          x: 0,
          y: 0,
          width: 6,
          height: 4,
          minWidth: 2,
          minHeight: 2,
          maxWidth: 12,
          maxHeight: 20,
          responsive: true,
          isDraggable: true,
          isResizable: true,
          isBounded: true,
          static: false,
          containerPadding: [16, 16],
          margin: [8, 8]
        },
        
        style: {
          backgroundColor: isDarkMode ? '#1f1f1f' : '#ffffff',
          borderColor: isDarkMode ? '#303030' : '#d9d9d9',
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 8,
          padding: 16,
          margin: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          opacity: 1,
          zIndex: 1,
          fontSize: 14,
          fontWeight: 'normal',
          textAlign: 'left',
          color: isDarkMode ? '#ffffff' : '#000000',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          lineHeight: 1.5,
          overflow: 'auto'
        },
        
        animation: {
          enabled: true,
          duration: 300,
          easing: 'ease-in-out',
          delay: 0,
          type: 'fade'
        },
        
        behavior: {
          clickable: true,
          hoverable: true,
          selectable: true,
          draggable: true,
          resizable: true,
          onHover: 'highlight',
          onClick: 'select'
        },
        
        data: {
          source: chartData.dataSourceId,
          query: chartData.query,
          refreshInterval: undefined,
          autoRefresh: false,
          cache: true,
          cacheTimeout: 300,
          ...chartData.data
        }
      };

      // Add to layout
      const newLayout = {
        i: newWidget.id,
        x: 0,
        y: 0,
        w: 6,
        h: 4,
        minW: 2,
        minH: 2,
        maxW: 12,
        maxH: 8,
        isResizable: true,
        isDraggable: true
      };

      setDashboardWidgets(prev => [...prev, newWidget]);
      setLayout(prev => [...prev, newLayout]);
      
      // Automatically select the newly created chart
      setSelectedWidget(newWidget);
      
      message.success(`Chart "${chartData.title}" added to dashboard`);
    } catch (error) {
      console.error('Failed to create chart widget:', error);
      message.error('Failed to create chart widget');
    }
  };

  // Keyboard shortcuts


  const renderDashboardTab = () => {
    return (
      <div style={{ padding: '20px', minHeight: '600px' }}>
        <div style={{ marginBottom: '8px' }}>
          <Title level={4} style={{ margin: 0, color: isDarkMode ? '#ffffff' : '#000000' }}>
            Dashboard Canvas
          </Title>
        </div>
        
        <AdvancedDashboardCanvas
          widgets={dashboardWidgets}
          layout={layout}
          selectedWidget={selectedWidget}
          isDarkMode={isDarkMode}
          onLayoutChange={handleLayoutChange}
          onWidgetSelect={setSelectedWidget}
          onWidgetUpdate={handleWidgetConfigUpdate}
          onWidgetDelete={handleDeleteWidget}
          onWidgetDuplicate={handleDuplicateWidget}
          onWidgetConfigUpdate={handleWidgetConfigUpdate}
          onAddWidget={handleAddToDashboard}
          dashboardTitle={dashboardTitle}
          dashboardSubtitle={dashboardSubtitle}
          onTitleChange={setDashboardTitle}
          onSubtitleChange={setDashboardSubtitle}
        />

      </div>
    );
  };

  const renderDataTab = () => {
    return (
      <div style={{ padding: '20px', height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Title level={4} style={{ margin: 0, color: isDarkMode ? '#ffffff' : '#000000' }}>
              Query Editor
            </Title>
            <Tooltip title="Write and execute SQL queries against your connected data sources">
              <span style={{ color: isDarkMode ? '#666' : '#999', cursor: 'help', fontSize: '16px' }}>ℹ️</span>
            </Tooltip>
          </div>
          
          <Space>
            <Button 
              icon={<DatabaseOutlined />} 
              type="primary"
              onClick={() => {
                // Open Universal Data Source Modal
                window.open('/data', '_blank');
              }}
            >
              Connect Data
            </Button>
          </Space>
        </div>

        {/* Enhanced SQL Editor with better visibility */}
        <div style={{ 
          border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
          borderRadius: '8px',
          overflow: 'hidden',
          flex: 1,
          minHeight: '500px'
        }}>
          <MonacoSQLEditor 
            isDarkMode={isDarkMode}
            onQueryResult={handleQueryResult}
            onChartCreate={handleChartCreate}
            selectedDataSource={selectedDataSource}
            onDataSourceChange={setSelectedDataSource}
          />
        </div>
      </div>
    );
  };

  const renderChartsTab = () => {
    return (
      <div style={{ padding: '20px', height: 'calc(100vh - 200px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexShrink: 0 }}>
        <Title level={4} style={{ margin: 0, color: isDarkMode ? '#ffffff' : '#000000' }}>
          Chart Preview & Configuration
        </Title>
        <Tooltip title="Preview and configure your selected chart before adding it to the dashboard">
          <span style={{ color: isDarkMode ? '#666' : '#999', cursor: 'help', fontSize: '16px' }}>ℹ️</span>
        </Tooltip>
      </div>
      
      <div style={{ flex: 1, overflow: 'auto' }}>
        {selectedWidget && selectedWidget.type && Object.values(COMPREHENSIVE_CHART_TYPES)
            .flatMap(cat => cat.charts)
            .some(c => c.type === selectedWidget.type) ? (
          <div>
            {/* Chart Preview Canvas */}
            <div style={{ 
              background: isDarkMode ? '#1a1a1a' : '#ffffff',
              border: `2px solid ${isDarkMode ? '#1890ff' : '#1890ff'}`,
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
              minHeight: '400px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '24px' }}>
                  <BarChartOutlined />
                </div>
                <Title level={4} style={{ margin: 0, color: isDarkMode ? '#ffffff' : '#000000' }}>
                  {selectedWidget.title} Preview
                </Title>
              </div>
              
              {/* Real Chart Preview */}
              <div style={{ 
                width: '100%',
                height: '400px',
                background: isDarkMode ? '#1a1a1a' : '#ffffff',
                borderRadius: '6px',
                overflow: 'hidden'
              }}>
                <ChartWidget
                  widget={selectedWidget}
                  config={selectedWidget.config || {}}
                  data={selectedWidget.data || {}}
                  onConfigUpdate={(config) => {
                    // Update the selected widget config for preview
                    if (selectedWidget) {
                      setSelectedWidget({ ...selectedWidget, config: { ...selectedWidget.config, ...config } });
                    }
                  }}
                  onWidgetClick={() => {}}
                  isSelected={false}
                  isDarkMode={isDarkMode}
                  showEditableTitle={true}
                  onTitleChange={(title, subtitle) => {
                    // Update the selected widget with new title/subtitle
                    if (selectedWidget) {
                      setSelectedWidget({ 
                        ...selectedWidget, 
                        config: { 
                          ...selectedWidget.config, 
                          basic: {
                            ...selectedWidget.config?.basic,
                            title,
                            subtitle
                          }
                        } 
                      });
                    }
                  }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ textAlign: 'center' }}>
              <Space size="large">
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  size="large"
                  onClick={() => handleAddToDashboard(selectedWidget)}
                >
                  Add {selectedWidget.title} to Dashboard
                </Button>
                
                <Button 
                  icon={<SettingOutlined />} 
                  size="large"
                  onClick={() => setShowProperties(true)}
                >
                  Configure Chart
                </Button>
              </Space>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <BarChartOutlined style={{ fontSize: '48px', color: isDarkMode ? '#666' : '#ccc', marginBottom: '16px' }} />
            <Title level={5} style={{ color: isDarkMode ? '#666' : '#999' }}>Select a Chart Type</Title>
            <Text style={{ color: isDarkMode ? '#666' : '#999' }}>
              Choose a chart type from the Widget Library to see a preview
            </Text>
            <br />
            <Button 
              type="primary" 
              icon={<AppstoreOutlined />} 
              style={{ marginTop: '16px' }}
              onClick={() => setShowWidgetLibrary(true)}
            >
              Open Widget Library
            </Button>
          </div>
        )}
      </div>
      </div>
    );
  };

  const renderFilterTab = () => {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Title level={4} style={{ margin: 0, color: isDarkMode ? '#ffffff' : '#000000' }}>
              Filters & Controls
            </Title>
            <Tooltip title="Set up interactive filters and controls for your dashboard">
              <span style={{ color: isDarkMode ? '#666' : '#999', cursor: 'help', fontSize: '16px' }}>ℹ️</span>
            </Tooltip>
          </div>
          
          <Space>
            <Button icon={<PlusOutlined />} type="primary">
              Add Filter
            </Button>
            <Button icon={<SettingOutlined />}>
              Filter Settings
            </Button>
          </Space>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr',
          gap: '20px'
        }}>
          {/* Left Panel - Filter Configuration */}
          <div style={{
            background: isDarkMode ? '#1a1a1a' : '#fafafa',
            border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
            borderRadius: '8px',
            padding: '20px'
          }}>
            <Title level={5} style={{ marginBottom: '20px', color: isDarkMode ? '#ffffff' : '#000000' }}>
              <FilterOutlined style={{ marginRight: '8px' }} />
              Create New Filter
            </Title>
            
            <div style={{ marginBottom: '16px' }}>
              <Text strong style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Filter Type:</Text>
              <Select
                style={{ width: '100%', marginTop: '8px' }}
                placeholder="Select filter type"
                options={[
                  { value: 'date', label: '📅 Date Range' },
                  { value: 'dropdown', label: '📋 Dropdown' },
                  { value: 'slider', label: '🎚️ Slider' },
                  { value: 'search', label: '🔍 Search' },
                  { value: 'checkbox', label: '☑️ Checkbox Group' },
                  { value: 'radio', label: '🔘 Radio Group' },
                  { value: 'number', label: '🔢 Number Input' },
                  { value: 'text', label: '📝 Text Input' }
                ]}
              />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <Text strong style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Filter Label:</Text>
              <Input 
                placeholder="Enter filter label" 
                style={{ marginTop: '8px' }} 
              />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <Text strong style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Data Source:</Text>
              <Select
                style={{ width: '100%', marginTop: '8px' }}
                placeholder="Select data source"
                options={[
                  { value: 'users', label: 'users table' },
                  { value: 'orders', label: 'orders table' },
                  { value: 'products', label: 'products table' },
                  { value: 'custom', label: 'Custom values' }
                ]}
              />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <Text strong style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Default Value:</Text>
              <Input 
                placeholder="Enter default value" 
                style={{ marginTop: '8px' }} 
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <Text strong style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>Position:</Text>
              <Select
                style={{ width: '100%', marginTop: '8px' }}
                placeholder="Select position"
                options={[
                  { value: 'header', label: 'Dashboard Header' },
                  { value: 'sidebar', label: 'Left Sidebar' },
                  { value: 'top', label: 'Top of Canvas' },
                  { value: 'bottom', label: 'Bottom of Canvas' }
                ]}
              />
            </div>
            
            <Button type="primary" icon={<PlusOutlined />} size="large" block>
              Create Filter
            </Button>
          </div>

          {/* Right Panel - Active Filters */}
          <div style={{
            background: isDarkMode ? '#1a1a1a' : '#fafafa',
            border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
            borderRadius: '8px',
            padding: '20px'
          }}>
            <Title level={5} style={{ marginBottom: '20px', color: isDarkMode ? '#ffffff' : '#000000' }}>
              <SettingOutlined style={{ marginRight: '8px' }} />
              Active Filters
            </Title>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                padding: '12px',
                background: isDarkMode ? '#2a2a2a' : '#ffffff',
                border: `1px solid ${isDarkMode ? '#404040' : '#d9d9d9'}`,
                borderRadius: '6px',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>📅 Date Range</Text>
                    <div style={{ fontSize: '12px', color: isDarkMode ? '#999' : '#666', marginTop: '4px' }}>
                      Last 30 days
                    </div>
                  </div>
                  <Space>
                    <Button size="small" icon={<EditOutlined />}>Edit</Button>
                    <Button size="small" danger icon={<CloseOutlined />}>Remove</Button>
                  </Space>
                </div>
              </div>
              
              <div style={{
                padding: '12px',
                background: isDarkMode ? '#2a2a2a' : '#ffffff',
                border: `1px solid ${isDarkMode ? '#404040' : '#d9d9d9'}`,
                borderRadius: '6px',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>📋 Category</Text>
                    <div style={{ fontSize: '12px', color: isDarkMode ? '#999' : '#666', marginTop: '4px' }}>
                      All categories selected
                    </div>
                  </div>
                  <Space>
                    <Button size="small" icon={<EditOutlined />}>Edit</Button>
                    <Button size="small" danger icon={<CloseOutlined />}>Remove</Button>
                  </Space>
                </div>
              </div>
              
              <div style={{
                padding: '12px',
                background: isDarkMode ? '#2a2a2a' : '#ffffff',
                border: `1px solid ${isDarkMode ? '#404040' : '#d9d9d9'}`,
                borderRadius: '6px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>🔢 Price Range</Text>
                    <div style={{ fontSize: '12px', color: isDarkMode ? '#999' : '#666', marginTop: '4px' }}>
                      $0 - $1000
                    </div>
                  </div>
                  <Space>
                    <Button size="small" icon={<EditOutlined />}>Edit</Button>
                    <Button size="small" danger icon={<CloseOutlined />}>Remove</Button>
                  </Space>
                </div>
              </div>
            </div>
            
            <div style={{
              padding: '16px',
              background: isDarkMode ? '#2a2a2a' : '#f0f0f0',
              border: `1px dashed ${isDarkMode ? '#666' : '#ccc'}`,
              borderRadius: '6px',
              textAlign: 'center',
              color: isDarkMode ? '#999' : '#666'
            }}>
              <FilterOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
              <div>Drag filters here to arrange</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                Filters will appear on your dashboard
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Properties panel is now handled by UnifiedDesignPanel

  // Onboarding is now handled by PlatformOnboardingModal in the main app

  // Main component return
  return (
    <div className={`dashboard-studio ${isDarkMode ? 'dark' : 'light'}`}>
      {/* Onboarding is now handled by PlatformOnboardingModal in the main app */}
      {/* Header with Breadcrumbs and Actions */}
      <Header className="dashboard-header" style={{ 
        background: isDarkMode ? '#001529' : '#ffffff',
        borderBottom: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
        padding: '0 24px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div className="header-left">
          <Breadcrumb
            items={[
              { title: <HomeOutlined />, href: '/' },
              { title: 'Dashboards', href: '/dashboard' },
              { title: 'Aiser Dashboard Studio' }
            ]}
            style={{ color: isDarkMode ? '#ffffff' : '#000000' }}
          />
        </div>
        
        <div className="header-center">
          <div style={{ textAlign: 'center' }}>
            <Title level={4} style={{ margin: 0, color: isDarkMode ? '#ffffff' : '#000000' }}>
              Aiser Dashboard Studio
            </Title>

          </div>
        </div>

        <div className="header-right">
          <Space>
            {/* Widget Library Toggle */}
            <Tooltip title={showWidgetLibrary ? "Hide Widget Library" : "Show Widget Library"}>
              <Button
                type="text"
                icon={<AppstoreOutlined />}
                onClick={() => setShowWidgetLibrary(!showWidgetLibrary)}
                style={{
                  color: showWidgetLibrary ? (isDarkMode ? '#1890ff' : '#1890ff') : (isDarkMode ? '#666' : '#999'),
                  background: showWidgetLibrary ? (isDarkMode ? 'rgba(24, 144, 255, 0.1)' : 'rgba(24, 144, 255, 0.05)') : 'transparent'
                }}
              />
            </Tooltip>
            
                            {/* Properties are now integrated in the Unified Design Panel */}
            
            <Button
              icon={isEditing ? <EyeOutlined /> : <EditOutlined />}
              onClick={() => setIsEditing(!isEditing)}
              type={isEditing ? 'default' : 'primary'}
            >
              {isEditing ? 'Preview' : 'Edit'}
            </Button>
            
            <Button icon={<UndoOutlined />} disabled={!canUndo} onClick={handleUndo} />
            <Button icon={<RedoOutlined />} disabled={!canRedo} onClick={handleRedo} />
            <Button icon={isFullscreen ? <CompressOutlined /> : <FullscreenOutlined />} onClick={handleToggleFullscreen} />
            <Button 
              icon={<SaveOutlined />} 
              type="primary" 
              loading={isSaving}
              onClick={handleSave}
            >
              Save
            </Button>
            
            <Dropdown
              overlay={
                <Menu>
                  <Menu.Item key="export-png" icon={<DownloadOutlined />} onClick={handleExportPNG}>
                    Export as PNG
                  </Menu.Item>
                  <Menu.Item key="export-pdf" icon={<DownloadOutlined />} onClick={() => handleExport('pdf')}>
                    Export as PDF
                  </Menu.Item>
                  <Menu.Item key="export-json" icon={<DownloadOutlined />} onClick={() => handleExport('json')}>
                    Export as JSON
                  </Menu.Item>
                </Menu>
              }
              trigger={['click']}
            >
              <Button icon={<DownloadOutlined />}>
                Export
              </Button>
            </Dropdown>
            
            <Button icon={<SettingOutlined />} onClick={handleShare}>
              Share
            </Button>
          </Space>
        </div>
      </Header>

      <Layout style={{ height: 'calc(100vh - 64px)' }}>
        {/* Left Sidebar - Unified Design Panel */}
        {showWidgetLibrary && (
          <Sider
            width={300}
            theme={isDarkMode ? 'dark' : 'light'}
            style={{ 
              borderRight: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
              background: isDarkMode ? '#141414' : '#ffffff'
            }}
          >
            <UnifiedDesignPanel
              selectedWidget={selectedWidget}
              onConfigUpdate={handleWidgetConfigUpdate}
              onWidgetSelect={handleWidgetSelect}
              onAddWidget={handleAddToDashboard}
              isDarkMode={isDarkMode}
              showPanel={showWidgetLibrary}
              onClose={() => setShowWidgetLibrary(false)}
            />
          </Sider>
        )}

        {/* Main Content with Tabs */}
        <Content style={{ 
          background: isDarkMode ? '#000000' : '#f5f5f5',
          padding: '8px',
          overflow: 'auto'
        }}>
          <div className="dashboard-content" style={{ 
            background: isDarkMode ? '#141414' : '#ffffff',
            borderRadius: '8px',
            minHeight: '100%',
            position: 'relative'
          }}>
            <Tabs
              activeKey={activeTab}
              onChange={handleTabChange}
              type="card"
              size="large"
              style={{ padding: '8px' }}
              items={[
                {
                  key: 'dashboard',
                  label: (
                    <span>
                      <DashboardOutlined /> Dashboard
                    </span>
                  ),
                  children: renderDashboardTab()
                },
                {
                  key: 'query-editor',
                  label: (
                    <span>
                      <DatabaseOutlined /> Query Editor
                    </span>
                  ),
                  children: renderDataTab()
                },
                {
                  key: 'chart',
                  label: (
                    <span>
                      <BarChartOutlined /> Chart
                    </span>
                  ),
                  children: renderChartsTab()
                },
                {
                  key: 'filter',
                  label: (
                    <span>
                      <FilterOutlined /> Filter
                    </span>
                  ),
                  children: renderFilterTab()
                }
              ]}
            />
          </div>
        </Content>

        {/* Properties are now handled by the Unified Design Panel */}
      </Layout>

      {/* Floating Action Buttons */}
      {!showWidgetLibrary && (
        <Button
          type="primary"
          icon={<AppstoreOutlined />}
          onClick={() => setShowWidgetLibrary(true)}
          style={{
            position: 'fixed',
            left: '20px',
            top: '80px',
            zIndex: 1000,
            borderRadius: '50%',
            width: '56px',
            height: '56px'
          }}
        />
      )}

      {/* Properties button removed - now integrated in Unified Design Panel */}
      
      {/* Onboarding is now handled by PlatformOnboardingModal in the main app */}
    </div>
  );
};

export default DashboardStudio;
