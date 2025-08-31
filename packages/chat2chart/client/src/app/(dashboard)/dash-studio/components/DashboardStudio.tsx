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
  MoreOutlined
} from '@ant-design/icons';
import { PropertiesConfigPanel, EChartsConfigProvider } from './EChartsConfiguration';
import ChartWidget from './ChartWidget';
import MonacoSQLEditor from './MonacoSQLEditor';
import './DashboardStudio.css';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;

interface DashboardStudioProps {}

interface DashboardWidget {
  id: string;
  type: string;
  name: string;
  icon: React.ReactNode;
  category: string;
  tooltip: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config?: any;
  data?: any;
}

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

  const handleSave = () => message.success('Dashboard saved!');
  const handleUndo = () => message.info('Undo action');
  const handleRedo = () => message.info('Redo action');
  const handleShare = () => message.info('Share dashboard');
  const handleExport = () => message.info('Export dashboard');
  
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

  const handleOpenProperties = (widget: any) => {
    setSelectedWidget(widget);
    setShowProperties(true);
    
    // Each widget should have its own configuration
    // The PropertiesConfigPanel will handle this per-widget
  };

  // Update widget configuration
  const handleWidgetConfigUpdate = (widgetId: string, config: any) => {
    setDashboardWidgets(prev => prev.map(widget => 
      widget.id === widgetId 
        ? { ...widget, config: { ...widget.config, ...config } }
        : widget
    ));
  };

  const handleAddToDashboard = (widget: any) => {
    const newWidget: DashboardWidget = {
      ...widget,
      id: `widget-${Date.now()}`,
      position: { x: 0, y: 0 },
      size: { width: 6, height: 4 }
    };
    
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
    message.success(`${widget.name} added to dashboard`);
  };

  const handleLayoutChange = (newLayout: any[], layouts: any) => {
    setLayout(newLayout);
    // Update widget positions based on layout changes
    const updatedWidgets = dashboardWidgets.map(widget => {
      const layoutItem = newLayout.find(item => item.i === widget.id);
      if (layoutItem) {
        return {
          ...widget,
          position: { x: layoutItem.x, y: layoutItem.y },
          size: { width: layoutItem.w, height: layoutItem.h }
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
          size: { width: newItem.w, height: newItem.h }
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
          position: { x: newItem.x, y: newItem.y }
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
      position: { x: widget.position.x + 1, y: widget.position.y + 1 }
    };
    
    const newLayout = {
      i: newWidget.id,
      x: widget.position.x + 1,
      y: widget.position.y + 1,
      w: widget.size.width,
      h: widget.size.height,
      minW: 2,
      minH: 2,
      maxW: 12,
      maxH: 8,
      isResizable: true,
      isDraggable: true
    };
    
    setDashboardWidgets(prev => [...prev, newWidget]);
    setLayout(prev => [...prev, newLayout]);
    message.success(`${widget.name} duplicated`);
  };

  const handleDeleteWidget = (widgetId: string) => {
    setDashboardWidgets(prev => prev.filter(w => w.id !== widgetId));
    setLayout(prev => prev.filter(l => l.i !== widgetId));
    if (selectedWidget?.id === widgetId) {
      setSelectedWidget(null);
    }
    message.success('Widget deleted');
  };

  // Keyboard shortcuts


  const renderDashboardTab = () => {
    return (
      <div style={{ padding: '20px', minHeight: '600px' }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Title level={4} style={{ margin: 0, color: isDarkMode ? '#ffffff' : '#000000' }}>
              Dashboard Canvas
            </Title>
            <Tooltip title="Build your dashboard by selecting chart types from the library">
              <span style={{ color: isDarkMode ? '#666' : '#999', cursor: 'help', fontSize: '16px' }}>ℹ️</span>
            </Tooltip>
          </div>
          
          {/* Dashboard Controls */}
          <div style={{ marginTop: '8px' }}>
            <Space>
              <Button 
                size="small" 
                icon={<PlusOutlined />}
                onClick={() => setShowWidgetLibrary(true)}
              >
                Add Widget
              </Button>
              <Button 
                size="small" 
                icon={<SettingOutlined />}
                onClick={() => setShowProperties(true)}
                disabled={!selectedWidget}
              >
                Configure
              </Button>
              <Button 
                size="small" 
                icon={<SaveOutlined />}
                onClick={handleSave}
              >
                Save Layout
              </Button>
            </Space>
          </div>
        </div>
        
        {dashboardWidgets.length === 0 ? (
          <div 
            className={`dashboard-canvas ${isDragOver ? 'drag-over' : ''}`}
            style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              border: `2px dashed ${isDragOver ? '#1890ff' : isDarkMode ? '#303030' : '#d9d9d9'}`,
              borderRadius: '8px',
              background: isDragOver ? 'rgba(24, 144, 255, 0.05)' : isDarkMode ? '#1a1a1a' : '#fafafa',
              minHeight: '400px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
              setIsDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              try {
                const widgetData = JSON.parse(e.dataTransfer.getData('application/json'));
                handleAddToDashboard(widgetData);
              } catch (error) {
                console.error('Failed to parse dropped widget data:', error);
              }
            }}
          >
            <BarChartOutlined style={{ fontSize: '48px', color: isDragOver ? '#1890ff' : isDarkMode ? '#666' : '#ccc', marginBottom: '16px' }} />
            <Title level={5} style={{ color: isDragOver ? '#1890ff' : isDarkMode ? '#666' : '#999' }}>
              {isDragOver ? 'Drop Chart Here!' : 'Empty Dashboard'}
            </Title>
            <Text style={{ color: isDragOver ? '#1890ff' : isDarkMode ? '#666' : '#999' }}>
              {isDragOver 
                ? 'Release to add this chart to your dashboard' 
                : 'Drag chart types from the Widget Library, or click the button below'
              }
            </Text>
            <Button 
              type="primary" 
              icon={<AppstoreOutlined />} 
              style={{ marginTop: '16px' }}
              onClick={() => setShowWidgetLibrary(true)}
            >
              Open Widget Library
            </Button>
          </div>
        ) : (
          <div 
            className={`dashboard-canvas ${isDragOver ? 'drag-over' : ''}`}
            style={{ 
              background: isDarkMode ? '#1a1a1a' : '#fafafa',
              border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
              borderRadius: '8px',
              padding: '16px',
              minHeight: '600px'
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
              setIsDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              try {
                const widgetData = JSON.parse(e.dataTransfer.getData('application/json'));
                handleAddToDashboard(widgetData);
              } catch (error) {
                console.error('Failed to parse dropped widget data:', error);
              }
            }}
          >
            <ResponsiveGridLayout
              className="layout"
              layouts={{ lg: layout }}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={60}
              onLayoutChange={handleLayoutChange}
              onBreakpointChange={handleBreakpointChange}
              onResize={handleWidgetResize}
              isDraggable={true}
              isResizable={true}
              useCSSTransforms={true}
              compactType="vertical"
              preventCollision={false}
              margin={[16, 16]}
              containerPadding={[16, 16]}
            >
              {dashboardWidgets.map((widget) => (
                <div 
                  key={widget.id} 
                  className={`dashboard-widget ${selectedWidget?.id === widget.id ? 'selected' : ''}`}
                >
                  <ChartWidget
                    widget={widget}
                    config={widget.config || {}}
                    data={widget.data || {}}
                    onConfigUpdate={(config) => handleWidgetConfigUpdate(widget.id, config)}
                    onWidgetClick={() => setSelectedWidget(widget)}
                    onDelete={handleDeleteWidget}
                    isSelected={selectedWidget?.id === widget.id}
                    isDarkMode={isDarkMode}
                    showEditableTitle={true}
                    onTitleChange={(title, subtitle) => {
                      // Update the widget with new title/subtitle
                      handleWidgetConfigUpdate(widget.id, {
                        ...widget.config,
                        basic: {
                          ...widget.config?.basic,
                          title,
                          subtitle
                        }
                      });
                    }}
                  />
                </div>
              ))}
            </ResponsiveGridLayout>
          </div>
        )}
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
          <MonacoSQLEditor isDarkMode={isDarkMode} />
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
                  {React.isValidElement(selectedWidget.icon) ? selectedWidget.icon : <BarChartOutlined />}
                </div>
                <Title level={4} style={{ margin: 0, color: isDarkMode ? '#ffffff' : '#000000' }}>
                  {selectedWidget.name} Preview
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
                  Add {selectedWidget.name} to Dashboard
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

  // Main component return
  return (
    <div className={`dashboard-studio ${isDarkMode ? 'dark' : 'light'}`}>
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
                {activeTab === 'dashboard' && (
                  <div style={{ marginTop: '4px' }}>
                    <Input
                      placeholder="Dashboard Title"
                      value={dashboardTitle}
                      onChange={(e) => setDashboardTitle(e.target.value)}
                      style={{ 
                        width: '200px', 
                        textAlign: 'center',
                        border: 'none',
                        background: 'transparent',
                        color: isDarkMode ? '#ffffff' : '#000000',
                        fontSize: '16px',
                        fontWeight: 'bold'
                      }}
                      size="small"
                    />
                    <br />
                    <Input
                      placeholder="Dashboard Subtitle"
                      value={dashboardSubtitle}
                      onChange={(e) => setDashboardSubtitle(e.target.value)}
                      style={{ 
                        width: '200px', 
                        textAlign: 'center',
                        border: 'none',
                        background: 'transparent',
                        color: isDarkMode ? '#999' : '#666',
                        fontSize: '12px'
                      }}
                      size="small"
                    />
                  </div>
                )}
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
                
                {/* Properties Panel Toggle */}
                <Tooltip title={showProperties ? "Hide Properties Panel" : "Show Properties Panel"}>
                  <Button
                    type="text"
                    icon={<SettingOutlined />}
                    onClick={() => setShowProperties(!showProperties)}
                    style={{
                      color: showProperties ? (isDarkMode ? '#1890ff' : '#1890ff') : (isDarkMode ? '#666' : '#999'),
                      background: showProperties ? (isDarkMode ? 'rgba(24, 144, 255, 0.1)' : 'rgba(24, 144, 255, 0.05)') : 'transparent'
                    }}
                  />
                </Tooltip>
                
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
                <Button icon={<SaveOutlined />} type="primary" onClick={handleSave}>Save</Button>
                
                <Dropdown
                  overlay={
                    <Menu>
                      <Menu.Item key="export-png" icon={<DownloadOutlined />} onClick={handleExportPNG}>
                        Export as PNG
                      </Menu.Item>
                      <Menu.Item key="export-pdf" icon={<DownloadOutlined />} onClick={handleExportPDF}>
                        Export as PDF
                      </Menu.Item>
                      <Menu.Item key="export-html" icon={<DownloadOutlined />} onClick={handleExportHTML}>
                        Export as HTML
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
            {/* Left Sidebar - Widget Library */}
            {showWidgetLibrary && (
              <Sider
                width={380}
                theme={isDarkMode ? 'dark' : 'light'}
                style={{ 
                  borderRight: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
                  background: isDarkMode ? '#141414' : '#ffffff'
                }}
              >
                <div className="widget-library" style={{ padding: '16px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <Title level={5} style={{ margin: 0, color: isDarkMode ? '#ffffff' : '#000000' }}>Widget Library</Title>
                    <Button
                      icon={<CloseOutlined />}
                      size="small"
                      onClick={() => setShowWidgetLibrary(false)}
                    />
                  </div>

                  <Tabs
                    defaultActiveKey="charts"
                    size="small"
                    items={widgetCategories.map(category => ({
                      key: category.key,
                      label: (
                        <span>
                          {category.icon} {category.label}
                        </span>
                      ),
                      children: (
                        <div style={{ padding: '8px 0' }}>
                          {category.content}
                        </div>
                      )
                    }))}
                  />
                </div>
              </Sider>
            )}

            {/* Main Content with Tabs */}
            <Content style={{ 
              background: isDarkMode ? '#000000' : '#f5f5f5',
              padding: '16px',
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
                style={{ padding: '16px' }}
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

            {/* Right Sidebar - Properties Panel */}
            {showProperties && (
              <Sider
                width={320}
                theme={isDarkMode ? 'dark' : 'light'}
                style={{ 
                  borderLeft: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
                  background: isDarkMode ? '#141414' : '#ffffff'
                }}
              >
                <div className="properties-panel" style={{ padding: '16px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <Title level={5} style={{ margin: 0, color: isDarkMode ? '#ffffff' : '#000000' }}>Properties</Title>
                    <Button
                      icon={<CloseOutlined />}
                      size="small"
                      onClick={() => setShowProperties(false)}
                    />
                  </div>
                  
                  {selectedWidget ? (
                    <div>
                      <Title level={5} style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                        {selectedWidget.name} Properties
                      </Title>
                      {selectedWidget.type && Object.values(COMPREHENSIVE_CHART_TYPES)
                          .flatMap(cat => cat.charts)
                          .some(c => c.type === selectedWidget.type) ? (
                        <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                          <PropertiesConfigPanel 
                            chartType={selectedWidget.type} 
                            widgetId={selectedWidget.id}
                            onConfigUpdate={handleWidgetConfigUpdate}
                          />
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                          <Text style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                            Configure {selectedWidget.name} properties
                          </Text>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <Text style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                        Select a chart type from Widget Library to configure
                      </Text>
                    </div>
                  )}
                </div>
              </Sider>
            )}
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

          {!showProperties && (
            <Button
              type="primary"
              icon={<SettingOutlined />}
              onClick={() => setShowProperties(true)}
              style={{
                position: 'fixed',
                right: '20px',
                top: '80px',
                zIndex: 1000,
                borderRadius: '50%',
                width: '56px',
                height: '56px'
              }}
            />
          )}
        </div>
              );
      };

export default DashboardStudio;
