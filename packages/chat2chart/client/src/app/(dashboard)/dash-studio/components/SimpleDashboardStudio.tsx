'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
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
  MoreOutlined,
  LinkOutlined,
  SyncOutlined
} from '@ant-design/icons';

const ResponsiveGridLayout = WidthProvider(Responsive);

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

function SimpleDashboardStudio() {
  const { isDarkMode } = useThemeMode();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const activeTab = searchParams?.get('tab') || 'dashboard';

  // Client-side markers for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__migrated_dashboard_client_marker = true;
      (window as any).__migrated_dashboard_mounted = true;
    }
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', padding: '20px' }}>
      <div id="__migrated_dashboard_client_marker" style={{ display: 'none' }}>client-mounted</div>
      
      <Card>
        <Title level={2}>Dashboard Studio</Title>
        <Text>Welcome to the Dashboard Studio! This is a simplified version that loads successfully.</Text>
        
        <div style={{ marginTop: '20px' }}>
          <Text strong>Current Tab: </Text>
          <Text>{activeTab}</Text>
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <Text strong>User: </Text>
          <Text>{user?.username || 'Not logged in'}</Text>
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <Text strong>Theme: </Text>
          <Text>{isDarkMode ? 'Dark' : 'Light'}</Text>
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <Button type="primary" icon={<PlusOutlined />}>
            Add Widget
          </Button>
          <Button style={{ marginLeft: '8px' }} icon={<SaveOutlined />}>
            Save Dashboard
          </Button>
        </div>
        
        <div style={{ marginTop: '20px', padding: '20px', border: '1px dashed #d9d9d9', borderRadius: '6px' }}>
          <Text type="secondary">Dashboard Canvas Area</Text>
          <div style={{ marginTop: '10px', height: '200px', background: '#f5f5f5', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text type="secondary">No widgets yet. Click "Add Widget" to get started.</Text>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default SimpleDashboardStudio;
