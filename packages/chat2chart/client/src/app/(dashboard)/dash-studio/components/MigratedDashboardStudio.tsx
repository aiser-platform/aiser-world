'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Layout, Button, Space, Typography, Breadcrumb, Tabs, Card, Input, Select, message, Collapse, Tooltip, Dropdown, Menu, Divider, Badge, Switch } from 'antd';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { useThemeMode } from '@/components/Providers/ThemeModeContext';
import { useAuth } from '@/context/AuthContext';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import '../design-system-overrides.css';
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
  LinkOutlined,
  SyncOutlined
} from '@ant-design/icons';

// Import new state management with error handling
import { useDashboardStore, useUndo, useRedo, useCanUndo, useCanRedo } from '@/stores/useDashboardStore';

// Safely import React Query hooks with fallback
let useDashboard: any = null;
let useSaveDashboard: any = null;
let useDeleteDashboard: any = null;

try {
  const dashboardQueries = require('@/queries/dashboards');
  useDashboard = dashboardQueries.useDashboard;
  useSaveDashboard = dashboardQueries.useSaveDashboard;
  useDeleteDashboard = dashboardQueries.useDeleteDashboard;
} catch (error) {
  console.warn('React Query hooks not available, using fallback:', error);
  // Fallback functions
  useDashboard = () => ({ data: null, isLoading: false, error: null });
  useSaveDashboard = () => ({ mutate: () => {}, isLoading: false });
  useDeleteDashboard = () => ({ mutate: () => {}, isLoading: false });
}

// Safely import collaboration hook
let useCollaboration: any = null;
try {
  const collaborationHook = require('@/hooks/useCollaboration');
  useCollaboration = collaborationHook.useCollaboration;
} catch (error) {
  console.warn('Collaboration hook not available, using fallback:', error);
  useCollaboration = () => ({});
}

// Safely import existing components with error handling
let WidgetRenderer: any = null;
let GlobalFiltersBar: any = null;
let CollaborationPresence: any = null;
let RefreshControls: any = null;
let ExportService: any = null;
let AdvancedDashboardCanvas: any = null;
let MonacoSQLEditor: any = null;
let EmbedModal: any = null;
let FullscreenPreviewModal: any = null;

try {
  WidgetRenderer = require('./WidgetSystem/WidgetRenderer').WidgetRenderer;
} catch (error) {
  console.warn('WidgetRenderer not available:', error);
  WidgetRenderer = () => <div>Widget Renderer not available</div>;
    }

    try {
  GlobalFiltersBar = require('./GlobalFiltersBar').GlobalFiltersBar;
    } catch (error) {
  console.warn('GlobalFiltersBar not available:', error);
  GlobalFiltersBar = () => null;
    }
    
    try {
  CollaborationPresence = require('./CollaborationPresence').CollaborationPresence;
    } catch (error) {
  console.warn('CollaborationPresence not available:', error);
  CollaborationPresence = () => null;
}

try {
  RefreshControls = require('./RefreshControls').RefreshControls;
} catch (error) {
  console.warn('RefreshControls not available:', error);
  RefreshControls = () => null;
}

try {
  ExportService = require('../services/ExportService').ExportService;
} catch (error) {
  console.warn('ExportService not available:', error);
  ExportService = { exportDashboard: () => Promise.resolve() };
}

try {
  AdvancedDashboardCanvas = require('./AdvancedDashboardCanvas').default;
} catch (error) {
  console.warn('AdvancedDashboardCanvas not available:', error);
  AdvancedDashboardCanvas = () => <div>Canvas not available</div>;
}

try {
  MonacoSQLEditor = require('./MonacoSQLEditor').default;
} catch (error) {
  console.warn('MonacoSQLEditor not available:', error);
  MonacoSQLEditor = () => <div>SQL Editor not available</div>;
    }
    
    try {
  EmbedModal = require('./EmbedModal').default;
    } catch (error) {
  console.warn('EmbedModal not available:', error);
  EmbedModal = () => null;
    }
    
    try {
  FullscreenPreviewModal = require('./FullscreenPreviewModal').default;
    } catch (error) {
  console.warn('FullscreenPreviewModal not available:', error);
  FullscreenPreviewModal = () => null;
}

// Safe imports for types and services
import { DashboardWidget } from '@/types/dashboard';
import { dashboardDataService, WidgetDataConfig } from '../services/DashboardDataService';
import { dashboardAPIService } from '../services/DashboardAPIService';
import dynamic from 'next/dynamic';
import { Modal, List } from 'antd';

// Lazy load heavy components to reduce initial bundle size with error handling
const UnifiedDesignPanel = dynamic(() => import('./UnifiedDesignPanel').catch(() => ({
  default: () => <div style={{ padding: '20px', textAlign: 'center' }}>Design panel not available</div>
})), {
  loading: () => <div style={{ padding: '20px', textAlign: 'center' }}>Loading design panel...</div>,
  ssr: false
});

const ResponsiveGridLayout = WidthProvider(Responsive);

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

// Helper function to map widget types to WidgetRenderer expected types
const mapWidgetTypeToRendererType = (widgetType: string) => {
  const chartTypes = ['bar', 'line', 'pie', 'area', 'scatter', 'radar', 'gauge', 'heatmap', 'funnel'];
  if (chartTypes.includes(widgetType)) {
    return 'chart';
  }
  return widgetType;
};

// Helper function to get chart subtype for ChartWidget
const getChartSubtype = (widgetType: string) => {
  const subtypeMap: Record<string, string> = {
    'bar': 'bar',
    'line': 'line',
    'pie': 'pie',
    'area': 'area',
    'scatter': 'scatter',
    'radar': 'radar',
    'gauge': 'gauge',
    'heatmap': 'heatmap',
    'funnel': 'funnel'
  };
  return subtypeMap[widgetType] || 'bar';
};

// Helper functions for widget defaults
const getDefaultConfigForWidgetType = (widgetType: string) => {
      const defaults: Record<string, any> = {
    // Chart widgets
    'bar': {
      title: 'Bar Chart',
          colorPalette: 'default',
      theme: 'auto',
      legendShow: true,
      legendPosition: 'top',
      tooltipShow: true,
      tooltipTrigger: 'axis',
          animation: true,
      animationDuration: 1000,
      seriesLabelShow: false,
      dataLabelsShow: false,
      xAxisField: 'category',
      showXAxis: true,
      yAxisField: 'value',
      showYAxis: true,
      seriesField: 'auto',
      dataLimit: 1000,
          responsive: true,
          draggable: true,
          resizable: true,
      padding: 0,
      margin: 0,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      textColor: '#000000',
      xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
      yAxis: { type: 'value' },
      series: [{ name: 'Sales', type: 'bar', data: [120, 200, 150, 80, 70, 110, 130] }],
      tooltip: { trigger: 'axis' },
      legend: { data: ['Sales'] }
    },
    'line': {
      title: 'Line Chart',
          colorPalette: 'default',
      theme: 'auto',
      legendShow: true,
      legendPosition: 'top',
      tooltipShow: true,
      tooltipTrigger: 'axis',
          animation: true,
      animationDuration: 1000,
      seriesLabelShow: false,
      dataLabelsShow: false,
      xAxisField: 'category',
      showXAxis: true,
      yAxisField: 'value',
      showYAxis: true,
      seriesField: 'auto',
      dataLimit: 1000,
          responsive: true,
          draggable: true,
          resizable: true,
      padding: 0,
      margin: 0,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      textColor: '#000000',
      xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
      yAxis: { type: 'value' },
      series: [{ name: 'Sales', type: 'line', data: [120, 200, 150, 80, 70, 110, 130] }],
      tooltip: { trigger: 'axis' },
      legend: { data: ['Sales'] }
    },
    'pie': {
      title: 'Pie Chart',
          colorPalette: 'default',
      theme: 'auto',
      legendShow: true,
      legendPosition: 'top',
      tooltipShow: true,
      tooltipTrigger: 'item',
      animation: true,
      animationDuration: 1000,
      seriesLabelShow: false,
      dataLabelsShow: false,
      xAxisField: 'category',
      showXAxis: false,
      yAxisField: 'value',
      showYAxis: false,
      seriesField: 'auto',
      dataLimit: 1000,
          responsive: true,
          draggable: true,
          resizable: true,
      padding: 0,
      margin: 0,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      textColor: '#000000',
      series: [{ 
        name: 'Sales', 
        type: 'pie',
        data: [
          { value: 1048, name: 'Search Engine' },
          { value: 735, name: 'Direct' },
          { value: 580, name: 'Email' },
          { value: 484, name: 'Union Ads' },
          { value: 300, name: 'Video Ads' }
        ]
      }],
      tooltip: { trigger: 'item' },
      legend: { orient: 'vertical', left: 'left' }
    },
    'area': {
      title: 'Area Chart',
          colorPalette: 'default',
      theme: 'auto',
      legendShow: true,
      legendPosition: 'top',
      tooltipShow: true,
      tooltipTrigger: 'axis',
      animation: true,
      animationDuration: 1000,
      seriesLabelShow: false,
      dataLabelsShow: false,
      xAxisField: 'category',
      showXAxis: true,
      yAxisField: 'value',
      showYAxis: true,
      seriesField: 'auto',
      dataLimit: 1000,
          responsive: true,
          draggable: true,
          resizable: true,
      padding: 0,
      margin: 0,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      textColor: '#000000',
      xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
      yAxis: { type: 'value' },
      series: [{ name: 'Sales', type: 'line', areaStyle: {}, data: [120, 200, 150, 80, 70, 110, 130] }],
      tooltip: { trigger: 'axis' },
      legend: { data: ['Sales'] }
    },
    'scatter': {
      title: 'Scatter Chart',
          colorPalette: 'default',
      theme: 'auto',
      legendShow: true,
      legendPosition: 'top',
      tooltipShow: true,
      tooltipTrigger: 'item',
      animation: true,
      animationDuration: 1000,
      seriesLabelShow: false,
      dataLabelsShow: false,
      xAxisField: 'value',
      showXAxis: true,
      yAxisField: 'value',
      showYAxis: true,
      seriesField: 'auto',
      dataLimit: 1000,
          responsive: true,
          draggable: true,
          resizable: true,
      padding: 0,
      margin: 0,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      textColor: '#000000',
      xAxis: { type: 'value' },
      yAxis: { type: 'value' },
      series: [{ name: 'Sales', type: 'scatter', data: [[10, 20], [20, 30], [30, 40], [40, 50], [50, 60]] }],
      tooltip: { trigger: 'item' }
    },
    'radar': {
      title: 'Radar Chart',
          colorPalette: 'default',
      theme: 'auto',
      legendShow: true,
      legendPosition: 'top',
      tooltipShow: true,
      tooltipTrigger: 'item',
      animation: true,
      animationDuration: 1000,
      seriesLabelShow: false,
      dataLabelsShow: false,
      xAxisField: 'category',
      showXAxis: false,
      yAxisField: 'value',
      showYAxis: false,
      seriesField: 'auto',
      dataLimit: 1000,
          responsive: true,
          draggable: true,
          resizable: true,
      padding: 0,
      margin: 0,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      textColor: '#000000',
      radar: {
        indicator: [
          { name: 'Sales', max: 6500 },
          { name: 'Administration', max: 16000 },
          { name: 'Information Technology', max: 30000 },
          { name: 'Customer Support', max: 38000 },
          { name: 'Development', max: 52000 },
          { name: 'Marketing', max: 25000 }
        ]
      },
      series: [{
        name: 'Budget vs spending',
        type: 'radar',
        data: [{ value: [4200, 3000, 20000, 35000, 50000, 18000], name: 'Allocated Budget' }]
      }]
    },
    'gauge': {
      title: 'Gauge Chart',
      colorPalette: 'default',
      theme: 'auto',
      legendShow: true,
      legendPosition: 'top',
      tooltipShow: true,
      tooltipTrigger: 'item',
      animation: true,
      animationDuration: 1000,
      seriesLabelShow: false,
      dataLabelsShow: true,
      dataLabelsFormat: 'percentage',
      xAxisField: 'category',
      showXAxis: false,
      yAxisField: 'value',
      showYAxis: false,
      seriesField: 'auto',
      dataLimit: 1000,
          responsive: true,
          draggable: true,
          resizable: true,
      padding: 0,
      margin: 0,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      textColor: '#000000',
      series: [{ 
        name: 'Pressure',
        type: 'gauge',
        data: [{ value: 50, name: 'SCORE' }],
        detail: { formatter: '{value}%' }
      }]
    },
    'heatmap': {
      title: 'Heatmap Chart',
      colorPalette: 'default',
      theme: 'auto',
      legendShow: true,
      legendPosition: 'top',
      tooltipShow: true,
      tooltipTrigger: 'item',
      animation: true,
      animationDuration: 1000,
      seriesLabelShow: false,
      dataLabelsShow: false,
      xAxisField: 'category',
      showXAxis: true,
      yAxisField: 'category',
      showYAxis: true,
      seriesField: 'auto',
      dataLimit: 1000,
          responsive: true,
          draggable: true,
          resizable: true,
      padding: 0,
      margin: 0,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      textColor: '#000000',
      xAxis: { type: 'category', data: ['12a', '1a', '2a', '3a', '4a', '5a', '6a', '7a', '8a', '9a', '10a', '11a', '12p', '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p', '10p', '11p'] },
      yAxis: { type: 'category', data: ['Saturday', 'Friday', 'Thursday', 'Wednesday', 'Tuesday', 'Monday', 'Sunday'] },
      series: [{ 
        name: 'Punch Card',
        type: 'heatmap',
        data: [[0, 0, 5], [0, 1, 1], [0, 2, 0], [0, 3, 0], [0, 4, 0], [0, 5, 0], [0, 6, 0], [0, 7, 0], [0, 8, 0], [0, 9, 0], [0, 10, 0], [0, 11, 2], [0, 12, 4], [0, 13, 1], [0, 14, 1], [0, 15, 3], [0, 16, 4], [0, 17, 6], [0, 18, 4], [0, 19, 4], [0, 20, 3], [0, 21, 3], [0, 22, 2], [0, 23, 5]],
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
      }]
    },
    'funnel': {
      title: 'Funnel Chart',
      colorPalette: 'default',
      theme: 'auto',
      legendShow: true,
      legendPosition: 'top',
      tooltipShow: true,
      tooltipTrigger: 'item',
      animation: true,
      animationDuration: 1000,
      seriesLabelShow: false,
      dataLabelsShow: true,
      dataLabelsFormat: 'percentage',
      xAxisField: 'category',
      showXAxis: false,
      yAxisField: 'value',
      showYAxis: false,
      seriesField: 'auto',
      dataLimit: 1000,
          responsive: true,
          draggable: true,
          resizable: true,
      padding: 0,
      margin: 0,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      textColor: '#000000',
          series: [{ 
        name: 'Funnel',
        type: 'funnel',
        left: '10%',
        top: 60,
        bottom: 60,
        width: '80%',
        min: 0,
        max: 100,
        minSize: '0%',
        maxSize: '100%',
        sort: 'descending',
        gap: 2,
        label: { show: true, position: 'inside' },
        labelLine: { length: 10, lineStyle: { width: 1, type: 'solid' } },
        itemStyle: { borderColor: '#fff', borderWidth: 1 },
        emphasis: { label: { fontSize: 20 } },
            data: [
          { value: 60, name: 'Visit' },
          { value: 40, name: 'Inquiry' },
          { value: 20, name: 'Order' },
          { value: 80, name: 'Click' },
          { value: 100, name: 'Show' }
            ]
          }]
        },
    
    // Data widgets
    'table': {
      title: 'Data Table',
        colorPalette: 'default',
      theme: 'auto',
      legendShow: false,
      legendPosition: 'top',
      tooltipShow: true,
      tooltipTrigger: 'axis',
      animation: true,
      animationDuration: 1000,
      seriesLabelShow: false,
      dataLabelsShow: false,
      xAxisField: 'category',
      showXAxis: false,
      yAxisField: 'value',
      showYAxis: false,
      seriesField: 'auto',
      dataLimit: 1000,
        responsive: true,
        draggable: true,
        resizable: true,
      padding: 0,
      margin: 0,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      textColor: '#000000',
      columns: [
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Age', dataIndex: 'age', key: 'age' },
        { title: 'Address', dataIndex: 'address', key: 'address' }
      ],
      pagination: { pageSize: 10 },
      scroll: { y: 240 }
    },
    'metric': {
      title: 'Metric',
          colorPalette: 'default',
      theme: 'auto',
      legendShow: false,
      legendPosition: 'top',
      tooltipShow: true,
      tooltipTrigger: 'axis',
      animation: true,
      animationDuration: 1000,
      seriesLabelShow: false,
      dataLabelsShow: false,
      xAxisField: 'category',
      showXAxis: false,
      yAxisField: 'value',
      showYAxis: false,
      seriesField: 'auto',
      dataLimit: 1000,
          responsive: true,
          draggable: true,
          resizable: true,
      padding: 0,
      margin: 0,
          backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      textColor: '#000000',
      value: 1234,
      prefix: '$',
      suffix: '',
      precision: 0,
      color: '#1890ff'
    },
    'kpi': {
      title: 'KPI',
          colorPalette: 'default',
      theme: 'auto',
      legendShow: false,
      legendPosition: 'top',
      tooltipShow: true,
      tooltipTrigger: 'axis',
      animation: true,
      animationDuration: 1000,
      seriesLabelShow: false,
      dataLabelsShow: false,
      xAxisField: 'category',
      showXAxis: false,
      yAxisField: 'value',
      showYAxis: false,
      seriesField: 'auto',
      dataLimit: 1000,
          responsive: true,
          draggable: true,
          resizable: true,
      padding: 0,
      margin: 0,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      textColor: '#000000',
      value: 85,
      suffix: '%',
      target: 90,
      color: '#52c41a'
    },
    
    // Content widgets
    'text': {
      title: 'Text Widget',
          colorPalette: 'default',
      theme: 'auto',
      legendShow: false,
      legendPosition: 'top',
      tooltipShow: true,
      tooltipTrigger: 'axis',
      animation: true,
      animationDuration: 1000,
      seriesLabelShow: false,
      dataLabelsShow: false,
      xAxisField: 'category',
      showXAxis: false,
      yAxisField: 'value',
      showYAxis: false,
      seriesField: 'auto',
      dataLimit: 1000,
          responsive: true,
          draggable: true,
          resizable: true,
      padding: 0,
      margin: 0,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      textColor: '#000000',
      content: 'This is a text widget. You can edit this content.',
      fontSize: 14,
      fontWeight: 'normal',
      textAlign: 'left'
    },
    'image': {
      title: 'Image Widget',
          colorPalette: 'default',
      theme: 'auto',
      legendShow: false,
      legendPosition: 'top',
      tooltipShow: true,
      tooltipTrigger: 'axis',
      animation: true,
      animationDuration: 1000,
      seriesLabelShow: false,
      dataLabelsShow: false,
      xAxisField: 'category',
      showXAxis: false,
      yAxisField: 'value',
      showYAxis: false,
      seriesField: 'auto',
      dataLimit: 1000,
          responsive: true,
          draggable: true,
          resizable: true,
      padding: 0,
      margin: 0,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      textColor: '#000000',
      src: 'https://via.placeholder.com/300x200',
      alt: 'Placeholder image',
      fit: 'cover'
    },
    'html': {
      title: 'HTML Widget',
          colorPalette: 'default',
      theme: 'auto',
      legendShow: false,
      legendPosition: 'top',
      tooltipShow: true,
      tooltipTrigger: 'axis',
      animation: true,
      animationDuration: 1000,
      seriesLabelShow: false,
      dataLabelsShow: false,
      xAxisField: 'category',
      showXAxis: false,
      yAxisField: 'value',
      showYAxis: false,
      seriesField: 'auto',
      dataLimit: 1000,
          responsive: true,
          draggable: true,
          resizable: true,
      padding: 0,
      margin: 0,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      textColor: '#000000',
      content: '<p>This is an HTML widget. You can add custom HTML content.</p>',
      sanitize: true
    },
    'iframe': {
      title: 'Iframe Widget',
          colorPalette: 'default',
      theme: 'auto',
      legendShow: false,
      legendPosition: 'top',
      tooltipShow: true,
      tooltipTrigger: 'axis',
      animation: true,
      animationDuration: 1000,
      seriesLabelShow: false,
      dataLabelsShow: false,
      xAxisField: 'category',
      showXAxis: false,
      yAxisField: 'value',
      showYAxis: false,
      seriesField: 'auto',
      dataLimit: 1000,
          responsive: true,
          draggable: true,
          resizable: true,
      padding: 0,
      margin: 0,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      textColor: '#000000',
      src: 'https://example.com',
      width: '100%',
      height: '400px'
    },
    
    // Filter widgets
    'filter': {
      title: 'Filter',
          colorPalette: 'default',
      theme: 'auto',
      legendShow: false,
      legendPosition: 'top',
      tooltipShow: true,
      tooltipTrigger: 'axis',
      animation: true,
      animationDuration: 1000,
      seriesLabelShow: false,
      dataLabelsShow: false,
      xAxisField: 'category',
      showXAxis: false,
      yAxisField: 'value',
      showYAxis: false,
      seriesField: 'auto',
      dataLimit: 1000,
          responsive: true,
          draggable: true,
          resizable: true,
      padding: 0,
      margin: 0,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      textColor: '#000000',
      type: 'select',
      options: ['Option 1', 'Option 2', 'Option 3'],
      placeholder: 'Select an option',
      multiple: false
    },
    'date-picker': {
      title: 'Date Picker',
          colorPalette: 'default',
      theme: 'auto',
      legendShow: false,
      legendPosition: 'top',
      tooltipShow: true,
      tooltipTrigger: 'axis',
      animation: true,
      animationDuration: 1000,
      seriesLabelShow: false,
      dataLabelsShow: false,
      xAxisField: 'category',
      showXAxis: false,
      yAxisField: 'value',
      showYAxis: false,
      seriesField: 'auto',
      dataLimit: 1000,
          responsive: true,
          draggable: true,
          resizable: true,
      padding: 0,
      margin: 0,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      textColor: '#000000',
      type: 'date',
      format: 'YYYY-MM-DD',
      placeholder: 'Select date'
    },
    'range-picker': {
      title: 'Date Range Picker',
          colorPalette: 'default',
      theme: 'auto',
      legendShow: false,
      legendPosition: 'top',
      tooltipShow: true,
      tooltipTrigger: 'axis',
      animation: true,
      animationDuration: 1000,
      seriesLabelShow: false,
      dataLabelsShow: false,
      xAxisField: 'category',
      showXAxis: false,
      yAxisField: 'value',
      showYAxis: false,
      seriesField: 'auto',
      dataLimit: 1000,
          responsive: true,
          draggable: true,
          resizable: true,
      padding: 0,
      margin: 0,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      textColor: '#000000',
      type: 'range',
      format: 'YYYY-MM-DD',
      placeholder: ['Start date', 'End date']
    },
    
    // Layout widgets
    'container': {
      title: 'Container',
      colorPalette: 'default',
      theme: 'auto',
      legendShow: false,
      legendPosition: 'top',
      tooltipShow: true,
      tooltipTrigger: 'axis',
      animation: true,
      animationDuration: 1000,
      seriesLabelShow: false,
      dataLabelsShow: false,
      xAxisField: 'category',
      showXAxis: false,
      yAxisField: 'value',
      showYAxis: false,
      seriesField: 'auto',
      dataLimit: 1000,
          responsive: true,
          draggable: true,
          resizable: true,
      padding: 0,
      margin: 0,
          backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      textColor: '#000000',
      background: '#ffffff',
          borderRadius: 8,
      border: '1px solid #d9d9d9'
    },
    'spacer': {
      title: 'Spacer',
      colorPalette: 'default',
      theme: 'auto',
      legendShow: false,
      legendPosition: 'top',
      tooltipShow: true,
      tooltipTrigger: 'axis',
      animation: true,
      animationDuration: 1000,
      seriesLabelShow: false,
      dataLabelsShow: false,
      xAxisField: 'category',
      showXAxis: false,
      yAxisField: 'value',
      showYAxis: false,
      seriesField: 'auto',
      dataLimit: 1000,
          responsive: true,
          draggable: true,
          resizable: true,
      padding: 0,
      margin: 0,
      backgroundColor: 'transparent',
      borderColor: '#d9d9d9',
      textColor: '#000000',
      height: 20,
      background: 'transparent'
    }
  };
  
  return defaults[widgetType] || {
    title: `New ${widgetType}`,
    colorPalette: 'default',
    theme: 'auto',
    legendShow: false,
    legendPosition: 'top',
    tooltipShow: true,
    tooltipTrigger: 'axis',
    animation: true,
    animationDuration: 1000,
    seriesLabelShow: false,
    dataLabelsShow: false,
    xAxisField: 'category',
    showXAxis: false,
    yAxisField: 'value',
    showYAxis: false,
    seriesField: 'auto',
    dataLimit: 1000,
    responsive: true,
    draggable: true,
    resizable: true,
    padding: 0,
    margin: 0,
    backgroundColor: 'transparent',
    borderColor: '#d9d9d9',
    textColor: '#000000',
    type: widgetType
  };
};

const getDefaultDataForWidgetType = (widgetType: string) => {
  const defaults: Record<string, any> = {
    // Chart widgets - provide proper data structure for ECharts
    'bar': {
      xAxis: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      yAxis: [120, 200, 150, 80, 70, 110, 130],
      series: [{ name: 'Sales', data: [120, 200, 150, 80, 70, 110, 130] }],
      chartType: 'bar'
    },
    'line': {
      xAxis: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      yAxis: [120, 200, 150, 80, 70, 110, 130],
      series: [{ name: 'Sales', data: [120, 200, 150, 80, 70, 110, 130] }],
      chartType: 'line'
    },
    'pie': {
      series: [
        { value: 1048, name: 'Search Engine' },
        { value: 735, name: 'Direct' },
        { value: 580, name: 'Email' },
        { value: 484, name: 'Union Ads' },
        { value: 300, name: 'Video Ads' }
      ],
      chartType: 'pie'
    },
    'area': {
      xAxis: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      yAxis: [120, 200, 150, 80, 70, 110, 130],
      series: [{ name: 'Sales', data: [120, 200, 150, 80, 70, 110, 130] }]
    },
    'scatter': {
      series: [[10, 20], [20, 30], [30, 40], [40, 50], [50, 60]]
    },
    'radar': {
      indicators: [
        { name: 'Sales', max: 6500 },
        { name: 'Administration', max: 16000 },
        { name: 'Information Technology', max: 30000 },
        { name: 'Customer Support', max: 38000 },
        { name: 'Development', max: 52000 },
        { name: 'Marketing', max: 25000 }
      ],
      series: [{ value: [4200, 3000, 20000, 35000, 50000, 18000], name: 'Allocated Budget' }]
    },
    'gauge': {
      value: 50,
      name: 'SCORE'
    },
    'heatmap': {
      xAxis: ['12a', '1a', '2a', '3a', '4a', '5a', '6a', '7a', '8a', '9a', '10a', '11a', '12p', '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p', '10p', '11p'],
      yAxis: ['Saturday', 'Friday', 'Thursday', 'Wednesday', 'Tuesday', 'Monday', 'Sunday'],
      series: [[0, 0, 5], [0, 1, 1], [0, 2, 0], [0, 3, 0], [0, 4, 0], [0, 5, 0], [0, 6, 0], [0, 7, 0], [0, 8, 0], [0, 9, 0], [0, 10, 0], [0, 11, 2], [0, 12, 4], [0, 13, 1], [0, 14, 1], [0, 15, 3], [0, 16, 4], [0, 17, 6], [0, 18, 4], [0, 19, 4], [0, 20, 3], [0, 21, 3], [0, 22, 2], [0, 23, 5]]
    },
    'funnel': {
      series: [
        { value: 60, name: 'Visit' },
        { value: 40, name: 'Inquiry' },
        { value: 20, name: 'Order' },
        { value: 80, name: 'Click' },
        { value: 100, name: 'Show' }
      ]
    },
    
    // Non-chart widgets
    'table': [
      { key: '1', name: 'John Brown', age: 32, address: 'New York No. 1 Lake Park' },
      { key: '2', name: 'Jim Green', age: 42, address: 'London No. 1 Lake Park' },
      { key: '3', name: 'Joe Black', age: 32, address: 'Sidney No. 1 Lake Park' }
    ],
    'metric': { value: 1234, trend: 5.2 },
    'kpi': { value: 85, target: 90, trend: 2.1 },
    'text': { content: 'This is a text widget. You can edit this content.' },
    'image': { src: 'https://via.placeholder.com/300x200', alt: 'Placeholder image' },
    'html': { content: '<p>This is an HTML widget. You can add custom HTML content.</p>' },
    'filter': { value: null, options: ['Option 1', 'Option 2', 'Option 3'] },
    'date-picker': { value: null },
    'range-picker': { value: null },
    'container': { children: [] },
    'spacer': { height: 20 }
  };
  
  const result = defaults[widgetType] || {
    xAxis: ['A', 'B', 'C'],
    yAxis: [1, 2, 3],
    series: [{ name: 'Default', data: [1, 2, 3] }],
    chartType: 'bar'
  };
  
  return result;
};

interface DashboardStudioProps {
  // Add any props if needed
}

const getCSSVar = (varName: string) => {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
};

function InternalMigratedDashboardStudio() {
  // Error boundary state
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Use theme from ThemeProvider for synchronized dark mode
  const themeContext = useThemeMode();
  const isDarkMode = themeContext?.isDarkMode || false;

  // Expose auth; useAuth is available (we provide a fallback in AuthContext)
  const auth = useAuth();
  
  // Client-side markers for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__migrated_dashboard_client_marker = true;
      (window as any).__migrated_dashboard_mounted = true;
    }
  }, []);

  // Get dashboard ID and tab from URL
  const searchParams = useSearchParams();
  const dashboardId = searchParams?.get('id') || '';
  const initialTab = searchParams?.get('tab') || 'dashboard';
  const router = useRouter();

  // Add core state management (Zustand hooks called unconditionally to satisfy hooks rules)
  const widgets = useDashboardStore((state: any) => state.widgets) || [];
  const selectedWidgetIds = useDashboardStore((state: any) => state.selectedWidgetIds) || [];
  const addWidget = useDashboardStore((state: any) => state.addWidget) || (() => {});
  const updateWidget = useDashboardStore((state: any) => state.updateWidget) || (() => {});
  const removeWidget = useDashboardStore((state: any) => state.removeWidget) || (() => {});
  const selectWidget = useDashboardStore((state: any) => state.selectWidget) || (() => {});
  const deselectAll = useDashboardStore((state: any) => state.deselectAll) || (() => {});
  const updateLayout = useDashboardStore((state: any) => state.updateLayout) || (() => {});
  
  // Undo/Redo
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  
  // React Query hooks with error handling (call unconditionally; fallbacks were set at module init)
  const dashboardQuery = useDashboard(dashboardId);
  const { data: dashboard, isLoading: isLoadingDashboard } = dashboardQuery;
  const saveDashboardMutation: any = useSaveDashboard();
  const saveDashboard = saveDashboardMutation.mutate;
  const isSaving: boolean = !!(saveDashboardMutation as any).isLoading;
  const deleteDashboardMutation: any = useDeleteDashboard();
  const deleteDashboard = deleteDashboardMutation.mutate;
  
  // Collaboration (hook called unconditionally; fallback is noop)
  useCollaboration(dashboardId);
  
  // Local state for UI
  const [isEditing, setIsEditing] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Sync activeTab with URL changes
  useEffect(() => {
    const currentTab = searchParams?.get('tab') || 'dashboard';
    if (currentTab !== activeTab) {
      setActiveTab(currentTab);
    }
  }, [searchParams, activeTab]);

  // Update URL when tab changes internally
  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key);
    try {
      const qp = new URLSearchParams();
      if (dashboardId) qp.set('id', dashboardId);
      qp.set('tab', key);
      router.replace(`/dash-studio?${qp.toString()}`);
    } catch (e) {
      router.replace(`/dash-studio?tab=${key}${dashboardId ? `&id=${dashboardId}` : ''}`);
    }
  }, [dashboardId, router]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  
  // Show design panel by default for Dashboard and Chart Designer tabs
  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'chart-designer') {
      setShowProperties(true);
    } else if (activeTab === 'query-editor') {
      setShowProperties(false);
    }
  }, [activeTab]);
  const [dashboardTitle, setDashboardTitle] = useState('My Dashboard');
  const [dashboardSubtitle, setDashboardSubtitle] = useState('');
  const [globalFilters, setGlobalFilters] = useState<any[]>([]);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [embedModalVisible, setEmbedModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [manageEmbedsVisible, setManageEmbedsVisible] = useState(false);
  const [embeds, setEmbeds] = useState<any[]>([]);
  const [isLoadingEmbeds, setIsLoadingEmbeds] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate selectedWidget reactively
  const selectedWidget = useMemo(() => {
    if (selectedWidgetIds.length > 0) {
      const widget = widgets.find((w: any) => selectedWidgetIds.includes(w.id));
      return widget;
    }
    return null;
  }, [selectedWidgetIds, widgets]);

  // Highlight selected widget visually by passing isSelected prop to widget renderer
  useEffect(() => {
    // ensure design panel opens on selection
    if (selectedWidgetIds.length > 0) {
      setShowProperties(true);
      setActiveTab('properties');
    }
  }, [selectedWidgetIds]);

  // Memoize layout to prevent infinite re-renders
  const layout = useMemo(() => {
    return widgets.map((w: { id: string; position: { x: number; y: number; w: number; h: number } }) => ({
      i: w.id,
      x: w.position.x,
      y: w.position.y,
      w: w.position.w,
      h: w.position.h
    }));
  }, [widgets]);

  // Handle adding widgets
  const handleAddWidget = useCallback((widgetType: string) => {
    // Create widget with proper structure for Zustand store
    const widgetData = getDefaultDataForWidgetType(widgetType);
    const newWidget = {
      id: `widget-${Date.now()}`,
      type: mapWidgetTypeToRendererType(widgetType),
      position: { x: 0, y: 0, w: 6, h: 4 },
      data: widgetData,
      config: {
        // All properties consolidated in config - no duplicates
        title: `New ${widgetType}`,
        subtitle: '',
        chartType: getChartSubtype(widgetType),
        widgetType: widgetType,
        originalType: widgetType,
        category: 'general',
        ...getDefaultConfigForWidgetType(widgetType),
        // Add data directly to config for easier access
        data: widgetData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
    
    try {
    addWidget(newWidget);
      selectWidget(newWidget.id);
    } catch (error) {
      console.error('❌ Failed to add widget to store:', error);
    }
  }, [addWidget, selectWidget]);

  // Handle save dashboard
  const handleSaveDashboard = useCallback(async () => {
    message.success('Dashboard saved!');
  }, []);

  // Handle widget updates
  const handleWidgetUpdate = useCallback((widgetId: string, updates: any) => {
    updateWidget(widgetId, updates);
  }, [updateWidget]);

  // Handle widget removal
  const handleWidgetRemove = useCallback((widgetId: string) => {
    removeWidget(widgetId);
    deselectAll();
  }, [removeWidget, deselectAll]);

  // Handle widget selection
  const handleWidgetSelect = useCallback((widgetId: string) => {
    selectWidget(widgetId);
  }, [selectWidget]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S: Save dashboard
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveDashboard();
      }

      // Delete: Delete selected widget
      if (e.key === 'Delete' && selectedWidgetIds.length > 0) {
        e.preventDefault();
        // Use existing handler to remove widgets
        handleWidgetRemove(selectedWidgetIds[0]);
      }

      // Escape: Deselect all widgets
      if (e.key === 'Escape') {
        deselectAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWidgetIds, handleSaveDashboard, handleWidgetRemove, deselectAll]);

  // Auto-save functionality
  useEffect(() => {
    if (widgets.length === 0) return;

    const autoSaveInterval = setInterval(() => {
      if (dashboardId && dashboardId !== 'new') {
        handleSaveDashboard();
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [widgets, dashboardId, handleSaveDashboard]);

  // Handle layout changes
  const handleLayoutChange = useCallback((newLayout: any[]) => {
    updateLayout(newLayout);
    // layout changed
  }, [updateLayout]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Trigger data refresh for all widgets
      window.dispatchEvent(new CustomEvent('dashboard:refresh'));
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate refresh
      message.success('Dashboard refreshed');
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      message.error('Failed to refresh dashboard');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Handle delete dashboard
  const handleDeleteDashboard = useCallback(async () => {
    if (!dashboardId) return;

    try {
      await dashboardAPIService.deleteDashboard(dashboardId);
      message.success('Dashboard deleted successfully');
      // Redirect to dashboard list or create new
      window.location.href = '/dash-studio';
    } catch (error) {
      console.error('Error deleting dashboard:', error);
      message.error('Failed to delete dashboard');
    }
  }, [dashboardId]);

  // Keyboard shortcuts for better UX
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveDashboard();
      }
      // Ctrl/Cmd + Z to undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl/Cmd + Shift + Z to redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      // Delete key to remove selected widget
      if (e.key === 'Delete' && selectedWidgetIds.length > 0) {
        e.preventDefault();
        selectedWidgetIds.forEach((id: string) => handleWidgetRemove(id));
      }
      // Escape to deselect all
      if (e.key === 'Escape') {
        deselectAll();
      }
      // Space to toggle edit mode
      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        setIsEditing(!isEditing);
      }
    };

    // Drag event listeners for drop zone
    const handleDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('application/json')) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      // Only set dragging to false if leaving the entire document
      if (!e.relatedTarget || e.relatedTarget === document.body) {
        setIsDragging(false);
      }
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragend', handleDragEnd);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, [handleSaveDashboard, undo, redo, selectedWidgetIds, handleWidgetRemove, deselectAll, isEditing]);

  // Render dashboard tab
  const renderDashboardTab = () => {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Card style={{ 
          background: 'var(--color-surface-raised)', 
          borderColor: 'var(--color-border-primary)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
            <Typography.Title level={4} style={{ margin: 0, color: 'var(--color-text-primary)' }}>
              Dashboard Canvas
            </Typography.Title>
            <Space>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => handleAddWidget('bar')}
              >
                Add Bar Chart
              </Button>
              <Button 
                icon={<SaveOutlined />}
                onClick={handleSaveDashboard}
                loading={isSaving}
              >
                Save Dashboard
              </Button>
            </Space>
        </div>
          
          <div 
            style={{ 
              background: 'var(--color-surface-primary)', 
          border: '1px solid var(--color-border-primary)',
              borderRadius: '6px',
          flex: 1,
          position: 'relative',
              minHeight: 'calc(100vh - 200px)'
            }}
          >
            {/* Drop overlay for drag-drop functionality - only captures drag events */}
            <div
              style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
                bottom: 0,
                zIndex: 10,
                pointerEvents: isDragging ? 'auto' : 'none', // Only capture events when dragging
                background: isDragging ? 'rgba(24, 144, 255, 0.1)' : 'transparent',
                border: isDragging ? '2px dashed var(--color-brand-primary)' : 'none',
                borderRadius: '6px'
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                // Add visual feedback for drag over
                const canvas = e.currentTarget.parentElement;
                if (canvas) {
                  canvas.style.borderColor = 'var(--color-brand-primary)';
                  canvas.style.backgroundColor = 'var(--color-brand-primary-light)';
                }
              }}
              onDragLeave={(e) => {
                // Remove visual feedback when drag leaves
                const canvas = e.currentTarget.parentElement;
                if (canvas) {
                  canvas.style.borderColor = 'var(--color-border-primary)';
                  canvas.style.backgroundColor = 'var(--color-surface-primary)';
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                // Reset visual feedback
                const canvas = e.currentTarget.parentElement;
                if (canvas) {
                  canvas.style.borderColor = 'var(--color-border-primary)';
                  canvas.style.backgroundColor = 'var(--color-surface-primary)';
                }
                
                try {
                  const widgetData = JSON.parse(e.dataTransfer.getData('application/json'));
                  // dropped widget debug logs removed
                  
                  // Create new widget from dropped data with comprehensive defaults
                  const newWidget = {
                    id: `widget-${Date.now()}`,
                    type: mapWidgetTypeToRendererType(widgetData.type),
                    position: { x: 0, y: 0, w: widgetData.defaultSize?.w || 6, h: widgetData.defaultSize?.h || 4 },
                    data: {
                      ...getDefaultDataForWidgetType(widgetData.type),
                      ...(widgetData.defaultData || {})
                    },
                    config: {
                      // All properties consolidated in config - no duplicates
                      title: widgetData.name || `New ${widgetData.type}`,
                      subtitle: '',
                      chartType: getChartSubtype(widgetData.type),
                      widgetType: widgetData.type,
                      originalType: widgetData.type,
                      category: widgetData.category || 'general',
                      ...getDefaultConfigForWidgetType(widgetData.type),
                      ...(widgetData.defaultConfig || {}),
                      // Add data directly to config for easier access
                      data: {
                        ...getDefaultDataForWidgetType(widgetData.type),
                        ...(widgetData.defaultData || {})
                      },
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    }
                  };
                  
                  // created widget
                  addWidget(newWidget);
                  selectWidget(newWidget.id);
                  message.success(`Added ${widgetData.name} widget`);
                } catch (error) {
                  console.error('Error handling drop:', error);
                  message.error('Failed to add widget');
                }
              }}
            />
            <ResponsiveGridLayout
              className="layout"
              layouts={{ lg: layout }}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={60}
              onLayoutChange={handleLayoutChange}
              isDraggable={isEditing}
              isResizable={isEditing}
              margin={[16, 16]}
              containerPadding={[16, 16]}
              useCSSTransforms={true}
              transformScale={1}
              preventCollision={false}
              compactType="vertical"
              allowOverlap={false}
            >
              {widgets.map((widget: { id: string; config?: any; data?: any; position?: any; }) => {
                // widget rendering
                const widgetData = widget.config?.data || widget.data || {};
    return (
                <div key={widget.id} style={{ 
              background: 'var(--color-surface-raised)', 
                  border: selectedWidgetIds.includes(widget.id) ? '2px solid var(--color-brand-primary)' : '1px solid var(--color-border-primary)',
                  borderRadius: '6px',
                  padding: '12px',
                  position: 'relative',
        height: '100%', 
                  width: '100%',
        display: 'flex', 
        flexDirection: 'column',
          overflow: 'hidden',
                  cursor: isEditing ? 'move' : 'default'
                }}
                onMouseDown={(e) => { 
                  e.stopPropagation(); 
                  handleWidgetSelect(widget.id); 
                }}
                onClick={(e) => { e.stopPropagation(); }}
                onMouseEnter={(e) => {
                  const controls = e.currentTarget.querySelector('.widget-controls');
                  if (controls) {
                    (controls as HTMLElement).style.opacity = '1';
                  }
                }}
                onMouseLeave={(e) => {
                  const controls = e.currentTarget.querySelector('.widget-controls');
                  if (controls && !selectedWidgetIds.includes(widget.id)) {
                    (controls as HTMLElement).style.opacity = '0';
                  }
                }}
                >
                  <div style={{ 
          flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    minHeight: 0,
                    width: '100%'
                  }}>
              <WidgetRenderer
                widget={{
                      ...widget,
                      data: widgetData
                    }}
                    config={widget.config}
                    data={widgetData}
                    onConfigUpdate={(updateConfig: any) => {
                    try {
                      const currentWidget = widgets.find((w: { id: string }) => w.id === widget.id);
                      if (!currentWidget) return;
                      
                      // Detect which specific properties changed for granular updates
                      const changedProperties = Object.keys(updateConfig || {}).filter(key => 
                        JSON.stringify(currentWidget.config?.[key]) !== JSON.stringify(updateConfig[key])
                      );
                      
                      const mergedConfig = { ...(currentWidget.config || {}), ...(updateConfig || {}) };
                      const widgetUpdate: any = { ...currentWidget, config: mergedConfig };
                      
                      // Only update if there are actual changes
                      if (changedProperties.length > 0) {
                        updateWidget(widget.id, widgetUpdate);
                        try { selectWidget(widget.id); } catch (e) {}
                        
                        // Dispatch granular update event
                        setTimeout(() => {
                          try { 
                            window.dispatchEvent(new CustomEvent('widget:updated', { 
                              detail: { 
                                id: widget.id, 
                                widget: widgetUpdate, 
                                changes: updateConfig,
                                changedProperties,
                                skipLayoutUpdate: updateConfig?.skipLayoutUpdate || false,
                                granularUpdate: updateConfig?.granularUpdate || false,
                                updatedProperty: updateConfig?.updatedProperty
                              } 
                            })); 
                          } catch (e) {}
                        }, 0);
                        
                        // end dispatch
                      }
                    } catch (e) {
                      console.error('Failed to handle onConfigUpdate for widget', widget.id, e);
                    }
                  }}
                    isSelected={selectedWidgetIds.includes(widget.id)}
                    onUpdate={(updateData: any) => {
                      // WidgetRenderer onUpdate called
                      const currentWidget = widgets.find((w: { id: string }) => w.id === widget.id);
                      if (currentWidget) {
                        const widgetUpdate = {
                          ...currentWidget,
                          ...updateData,
                          config: updateData.config ? {
                            ...(currentWidget.config || {}),
                            ...updateData.config
                          } : currentWidget.config,
                          layout: updateData.layout ? {
                            ...(currentWidget.layout || {}),
                            ...updateData.layout
                          } : currentWidget.layout,
                          data: updateData.data ? {
                            ...(currentWidget.data || {}),
                            ...updateData.data
                          } : currentWidget.data
                        };

                        updateWidget(widget.id, widgetUpdate);

                        // Immediate visual feedback
                        try {
                          selectWidget(widget.id);
                        } catch (e) {}

                        // Notify components of the update
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('widget:updated', { 
                            detail: { id: widget.id, widget: widgetUpdate } 
                          }));
                        }, 0);
                        
                        return Promise.resolve(widgetUpdate);
                      }
                    }}
                    onWidgetSelect={handleWidgetSelect}
                    onAddWidget={handleAddWidget}
                isDarkMode={isDarkMode}
                    showPanel={showProperties}
                    isPreviewMode={isPreviewMode}
                    isEditing={isEditing}
                    selectedWidgetIds={selectedWidgetIds}
                    onWidgetRemove={handleWidgetRemove}
                    dashboardId={dashboardId}
              />
            </div>
                  
                  {/* Widget controls overlay */}
                  {isEditing && (
                    <div className="widget-controls" style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      display: 'flex',
                      gap: '4px',
                      opacity: selectedWidgetIds.includes(widget.id) ? 1 : 0,
                      transition: 'opacity 0.2s',
                      zIndex: 1000
                    }}>
              <Button 
                        size="small"
                        type="text"
                        icon={<CloseOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          // close button clicked for widget
                          handleWidgetRemove(widget.id);
                        }}
            style={{ 
                          background: 'rgba(255, 255, 255, 0.9)',
                          border: 'none',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
              />
            </div>
        )}
      </div>
    );
              })}
            </ResponsiveGridLayout>
            
            {widgets.length === 0 && (
              <div style={{ 
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
          textAlign: 'center',
                color: 'var(--color-text-secondary)',
                pointerEvents: 'none',
                border: '2px dashed var(--color-border-primary)',
                borderRadius: '8px',
                padding: '40px',
                background: 'var(--color-surface-raised)'
              }}>
                <DashboardOutlined style={{ fontSize: '48px', marginBottom: '16px', color: 'var(--color-brand-primary)' }} />
                <Typography.Title level={4} style={{ color: 'var(--color-text-secondary)' }}>
                  Drop widgets here
                </Typography.Title>
          <Typography.Text style={{ color: 'var(--color-text-secondary)' }}>
                  Drag widgets from the design panel to start building your dashboard
          </Typography.Text>
                <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                  💡 Tip: Open the design panel (⚙️) to access the widget library
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  if (isLoadingDashboard) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading dashboard...</div>
      </div>
    );
  }

  // Error boundary - show error message if there's an error
  if (hasError) {
  return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--layout-background)',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <Typography.Title level={3} style={{ color: 'var(--color-text-primary)' }}>
          Dashboard Error
        </Typography.Title>
        <Typography.Text style={{ color: 'var(--color-text-secondary)' }}>
          {errorMessage}
        </Typography.Text>
        <Button 
          type="primary" 
          onClick={() => {
            setHasError(false);
            setErrorMessage('');
            window.location.reload();
          }}
        >
          Reload Dashboard
        </Button>
      </div>
    );
  }

  

  return (
    <div className="dashboard-studio" style={{ height: '100vh', background: 'var(--layout-background)', display: 'flex', flexDirection: 'column' }}>
      {/* Client-side markers for testing */}
      <div id="__migrated_dashboard_client_marker" style={{ display: 'none' }}>client-mounted</div>
      
      {/* Header */}
      <Header style={{ 
        background: 'var(--layout-header-background)', 
        borderBottom: '1px solid var(--color-border-primary)',
        padding: '0 24px',
        height: '64px',
        lineHeight: '64px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Input
              value={dashboardTitle}
              onChange={(e) => setDashboardTitle(e.target.value)}
              placeholder="Dashboard Title"
              style={{ 
                fontSize: '18px', 
                fontWeight: 'bold',
                background: 'transparent',
                border: 'none',
                boxShadow: 'none'
              }}
            />
          </div>
          
          <Space>
            <Button
              icon={<UndoOutlined />}
              onClick={() => undo()}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            />
            
            <Button
              icon={<RedoOutlined />}
              onClick={() => redo()}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
            />
            
            <Button
              icon={<SettingOutlined />}
              onClick={() => setShowProperties(!showProperties)}
              title={showProperties ? "Hide Design Panel" : "Show Design Panel"}
              type={showProperties ? "primary" : "default"}
            />
            
            <Button
              icon={<SyncOutlined />}
              onClick={handleRefresh}
              loading={isRefreshing}
              title="Refresh Dashboard"
            />
            
            <Button
              icon={<SaveOutlined />}
              onClick={handleSaveDashboard}
              loading={isSaving}
              title="Save Dashboard (Ctrl+S)"
              type="primary"
            />
            
            <Divider type="vertical" />
            
            <Button
              icon={isEditing ? <EyeOutlined /> : <EditOutlined />}
              onClick={() => setIsEditing(!isEditing)}
              title={isEditing ? "Preview Mode (Space)" : "Edit Mode (Space)"}
              type={isEditing ? "default" : "primary"}
            />
            
            <Button
              icon={<FullscreenOutlined />}
              onClick={() => setPreviewModalVisible(true)}
              title="Fullscreen Preview"
            />
            
            <Button
              icon={<ShareAltOutlined />}
              onClick={() => setEmbedModalVisible(true)}
              title="Share Dashboard"
            />
          </Space>
        </div>
      </Header>
      
      <Layout style={{ flex: 1, minHeight: 0 }}>
        {/* Left Sidebar with UnifiedDesignPanel */}
        <Sider 
          width={showProperties ? 350 : 0}
          style={{ 
            background: 'var(--layout-sider-background)', 
            borderRight: '1px solid var(--color-border-primary)',
            transition: 'width 0.3s ease',
            overflow: 'hidden',
            flexShrink: 0
          }}
        >
          {showProperties && (
            <div style={{ height: '100%', overflow: 'auto' }}>
              <UnifiedDesignPanel
                selectedWidget={widgets.find((w: { id: string }) => selectedWidgetIds.includes(w.id))}
                onConfigUpdate={(widgetId: string, config: any) => {
                  // Handle granular property updates
                  const changedProperties = Object.keys(config || {}).filter(key => {
                    const currentWidget = widgets.find((w: { id: string }) => w.id === widgetId);
                    return currentWidget && JSON.stringify(currentWidget.config?.[key]) !== JSON.stringify(config[key]);
                  });
                  
                  if (changedProperties.length > 0) {
                    const currentWidget = widgets.find((w: { id: string }) => w.id === widgetId);
                    if (currentWidget) {
                      const mergedConfig = { ...(currentWidget.config || {}), ...config };
                      updateWidget(widgetId, { ...currentWidget, config: mergedConfig });
                      selectWidget(widgetId);
                    }
                  }
                }}
                onWidgetSelect={handleWidgetSelect}
                onAddWidget={handleAddWidget}
                isDarkMode={isDarkMode}
                showPanel={showProperties}
                onClose={() => setShowProperties(false)}
              />
            </div>
          )}
        </Sider>

        <Content style={{ padding: '24px', overflow: 'auto', flex: 1, minHeight: 0, height: 'calc(100vh - 64px)' }}>
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            style={{ height: '100%' }}
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
                children: (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Card style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ marginBottom: '16px', flexShrink: 0 }}>
                        <Typography.Title level={4} style={{ margin: 0, color: 'var(--color-text-primary)' }}>
                          SQL Query Editor
                        </Typography.Title>
                        <Typography.Text style={{ color: 'var(--color-text-secondary)' }}>
                          Write and execute SQL queries for your dashboard data
                        </Typography.Text>
                      </div>
                      <div style={{ flex: 1, minHeight: '400px' }}>
                        <MonacoSQLEditor
                          value="-- Write your SQL query here\nSELECT * FROM your_table LIMIT 100;"
                                  onChange={(value: any) => console.log('SQL changed:', value)}
                                  onExecute={(query: any) => {
                            console.log('Executing query:', query);
                            message.info('Query execution will be implemented');
                          }}
                          isDarkMode={isDarkMode}
                        />
                      </div>
                    </Card>
                  </div>
                )
              },
              {
                key: 'chart-designer',
                label: (
                  <span>
                    <BarChartOutlined /> Chart Designer
                  </span>
                ),
                children: (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Card style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ marginBottom: '16px', flexShrink: 0 }}>
                        <Typography.Title level={4} style={{ margin: 0, color: 'var(--color-text-primary)' }}>
                          Chart Designer
                        </Typography.Title>
                        <Typography.Text style={{ color: 'var(--color-text-secondary)' }}>
                          Design and configure charts with ECharts
                        </Typography.Text>
                      </div>
                      <div style={{ flex: 1, minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                          <BarChartOutlined style={{ fontSize: '48px', marginBottom: '16px', color: 'var(--color-brand-primary)' }} />
                          <Typography.Title level={4} style={{ color: 'var(--color-text-secondary)' }}>
                            Chart Designer
                          </Typography.Title>
                          <Typography.Text style={{ color: 'var(--color-text-secondary)' }}>
                            Configure chart properties and preview your visualizations
                          </Typography.Text>
                          <div style={{ marginTop: '16px' }}>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddWidget('bar-chart')}>
                              Create Bar Chart
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                )
              }
            ]}
          />
        </Content>
      </Layout>

      {/* Status Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '32px',
        background: 'var(--color-surface-raised)',
        borderTop: '1px solid var(--color-border-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        fontSize: '12px',
        color: 'var(--color-text-secondary)',
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>Widgets: {widgets.length}</span>
          <span>Selected: {selectedWidgetIds.length}</span>
          <span>Mode: {isEditing ? 'Edit' : 'Preview'}</span>
          {isSaving && <span style={{ color: 'var(--color-brand-primary)' }}>Saving...</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>Ctrl+S: Save</span>
          <span>Ctrl+Z: Undo</span>
          <span>Del: Delete</span>
          <span>Esc: Deselect</span>
        </div>
      </div>
    </div>
  );
}

// Default export is a thin wrapper to ensure a clean component identity for consumers
export default function MigratedDashboardStudio(props: any) {
  return React.createElement(InternalMigratedDashboardStudio as React.ComponentType<any>, props);
}