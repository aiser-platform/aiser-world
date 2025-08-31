'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Layout,
  Button,
  Space,
  Tabs,
  Card,
  Row,
  Col,
  Input,
  Select,
  Switch,
  Slider,
  ColorPicker,
  message,
  Divider,
  Tooltip,
  Badge,
  Tag,
  Popconfirm,
  Dropdown,
  MenuProps,
  Collapse,
  Typography,
  Avatar,
  Breadcrumb,
  Drawer,
  Modal,
} from 'antd';
import {
  PlusOutlined,
  SettingOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  UnlockOutlined,
  DeleteOutlined,
  CopyOutlined,
  SaveOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  FullscreenOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  ScheduleOutlined,
  LayoutOutlined,
  BgColorsOutlined,
  AppstoreOutlined,
  FilterOutlined,
  UndoOutlined,
  RedoOutlined,
  BarChartOutlined,
  TableOutlined,
  LineChartOutlined,
  PieChartOutlined,
  AreaChartOutlined,
  DotChartOutlined,
  CompassOutlined,
  DashboardOutlined,
  BranchesOutlined,
  NumberOutlined,
  FileTextOutlined,
  PictureOutlined,
  CalendarOutlined,
  SearchOutlined,
  CheckSquareOutlined,
  SlidersOutlined,
  HomeOutlined,
  FolderOutlined,
  StarOutlined,
  UserOutlined,
  TeamOutlined,
  GlobalOutlined,
  CloudOutlined,
  DatabaseOutlined,
  ApiOutlined,
  LinkOutlined,
  ExportOutlined,
  ImportOutlined,
  SyncOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  RocketOutlined,
  CrownOutlined,
  TrophyOutlined,
  FireOutlined,
  HeartOutlined,
  SmileOutlined,
  MehOutlined,
  FrownOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  MinusCircleOutlined,
  PlusCircleOutlined,
  EditOutlined,
  FormOutlined,
  ProfileOutlined,
  ProjectOutlined,
  ExperimentOutlined,
  SafetyOutlined,
  SecurityScanOutlined,
  BugOutlined,
  CodeOutlined,
  ConsoleSqlOutlined,
  ToolOutlined,
  BuildOutlined,
  EnvironmentOutlined,
  FlagOutlined,
  GiftOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  FileOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FilePptOutlined,
  FileZipOutlined,
  FileUnknownOutlined,
  FileAddOutlined,
  FileSearchOutlined,
  FileMarkdownOutlined,
  FileProtectOutlined,
  FileSyncOutlined,
  FileExclamationOutlined,
  FileDoneOutlined,
  CloseOutlined,
  SelectOutlined,
} from '@ant-design/icons';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { useDashboardConfig, DashboardWidget, DashboardFilter } from '../DashboardConfiguration';
import { EChartsConfigProvider, useEChartsConfig } from '../EChartsConfiguration';
import { useDarkMode } from '@/hooks/useDarkMode';
import './BIDashboardStudio.css';

const { Header, Sider, Content } = Layout;
const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { Panel } = Collapse;
const { Option } = Select;
const ResponsiveGridLayout = WidthProvider(Responsive);

// BI-Style Dashboard Studio
export const BIDashboardStudio: React.FC = () => {
  const {
    state: dashboardState,
    dispatch: dashboardDispatch,
    addWidget,
    updateWidget,
    removeWidget,
    addFilter,
    updateFilter,
    removeFilter,
    canUndo,
    canRedo,
  } = useDashboardConfig();

  const [selectedWidget, setSelectedWidget] = useState<DashboardWidget | null>(null);
  const [isPropertiesPanelOpen, setIsPropertiesPanelOpen] = useState(true);
  const [isWidgetLibraryOpen, setIsWidgetLibraryOpen] = useState(true);
  const [isFiltersPanelOpen, setIsFiltersPanelOpen] = useState(true);
  const [isDataPanelOpen, setIsDataPanelOpen] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode] = useDarkMode();

  const { currentDashboard } = dashboardState;
  const layoutRef = useRef<HTMLDivElement>(null);

  // Generate grid layout from widgets
  const generateGridLayout = useCallback(() => {
    return currentDashboard.widgets.map(widget => ({
      i: widget.id,
      x: widget.position.x,
      y: widget.position.y,
      w: widget.position.w,
      h: widget.position.h,
      minW: 2,
      minH: 2,
      maxW: 12,
      maxH: 8,
      isDraggable: !widget.isLocked && !isPreviewMode,
      isResizable: !widget.isLocked && !isPreviewMode,
    }));
  }, [currentDashboard.widgets, isPreviewMode]);

  // Handle layout change
  const handleLayoutChange = useCallback((layout: any[]) => {
    layout.forEach(item => {
      const widget = currentDashboard.widgets.find(w => w.id === item.i);
      if (widget) {
        updateWidget(widget.id, {
          position: {
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
          },
        });
      }
    });
  }, [currentDashboard.widgets, updateWidget]);

  // Add new widget
  const handleAddWidget = (type: string) => {
    const newPosition = { x: 0, y: 0, w: 6, h: 4 };
    addWidget(type, newPosition);
    message.success(`${type.charAt(0).toUpperCase() + type.slice(1)} widget added`);
  };

  // Widget selection handler
  const handleWidgetSelect = (widget: DashboardWidget) => {
    setSelectedWidget(widget);
    setIsPropertiesPanelOpen(true);
  };

  return (
    <Layout className="bi-dashboard-studio">
      {/* Header */}
      <Header className="dashboard-header">
        <div className="header-left">
          <Breadcrumb>
            <Breadcrumb.Item>
              <HomeOutlined />
              <span>Dashboards</span>
            </Breadcrumb.Item>
            <Breadcrumb.Item>{currentDashboard.name}</Breadcrumb.Item>
          </Breadcrumb>
        </div>
        
        <div className="header-center">
          <Input
            value={currentDashboard.name}
            onChange={(e) => {
              const updatedDashboard = { ...currentDashboard, name: e.target.value };
              dashboardDispatch({ type: 'SET_DASHBOARD', payload: updatedDashboard });
            }}
            style={{ 
              border: 'none', 
              fontSize: '18px', 
              fontWeight: 'bold',
              background: 'transparent',
              textAlign: 'center',
              width: '300px'
            }}
            placeholder="Dashboard Name"
          />
        </div>

        <div className="header-right">
          <Space>
            <Button
              icon={<UndoOutlined />}
              disabled={!canUndo}
              onClick={() => dashboardDispatch({ type: 'UNDO' })}
              size="small"
            />
            <Button
              icon={<RedoOutlined />}
              disabled={!canRedo}
              onClick={() => dashboardDispatch({ type: 'REDO' })}
              size="small"
            />
            <Button
              icon={isPreviewMode ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              type={isPreviewMode ? 'primary' : 'default'}
              size="small"
            >
              {isPreviewMode ? 'Preview' : 'Edit'}
            </Button>
            <Button
              icon={<SaveOutlined />}
              type="primary"
              size="small"
              onClick={() => message.success('Dashboard saved')}
            >
              Save
            </Button>
            <Dropdown menu={{ items: getDashboardActions().items }} trigger={['click']}>
              <Button icon={<SettingOutlined />} size="small">
                Actions
              </Button>
            </Dropdown>
          </Space>
        </div>
      </Header>

      <Layout>
        {/* Left Sidebar - Widget Library & Data */}
        <Sider width={280} className="left-sidebar" theme="light">
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            tabPosition="left"
            style={{ height: '100%' }}
            className="sidebar-tabs"
          >
            <TabPane 
              tab={<Tooltip title="Widget Library"><AppstoreOutlined /></Tooltip>} 
              key="widgets" 
            >
              <WidgetLibraryPanel 
                onAddWidget={handleAddWidget}
                isOpen={isWidgetLibraryOpen}
              />
            </TabPane>
            <TabPane 
              tab={<Tooltip title="Data Sources"><DatabaseOutlined /></Tooltip>} 
              key="data" 
            >
              <DataPanel 
                isOpen={isDataPanelOpen}
              />
            </TabPane>
            <TabPane 
              tab={<Tooltip title="Filters"><FilterOutlined /></Tooltip>} 
              key="filters" 
            >
              <FiltersPanel 
                isOpen={isFiltersPanelOpen}
              />
            </TabPane>
          </Tabs>
        </Sider>

        {/* Main Canvas */}
        <Content className="dashboard-canvas">
          <div className="canvas-container" ref={layoutRef}>
            <ResponsiveGridLayout
              className="layout"
              layouts={{ lg: generateGridLayout() }}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={60}
              margin={[16, 16]}
              containerPadding={[20, 20]}
              onLayoutChange={handleLayoutChange}
              isDraggable={!isPreviewMode}
              isResizable={!isPreviewMode}
              style={{
                backgroundColor: currentDashboard.layout.backgroundColor,
                borderRadius: currentDashboard.layout.borderRadius,
                boxShadow: currentDashboard.layout.shadow ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none',
                minHeight: '600px',
              }}
            >
              {currentDashboard.widgets
                .filter(widget => widget.isVisible)
                .map(widget => (
                  <div key={widget.id} className="dashboard-widget">
                    <WidgetCard
                      widget={widget}
                      isSelected={selectedWidget?.id === widget.id}
                      isPreviewMode={isPreviewMode}
                      onSelect={() => handleWidgetSelect(widget)}
                      onUpdate={(updates) => updateWidget(widget.id, updates)}
                      onRemove={() => removeWidget(widget.id)}
                    />
                  </div>
                ))}
            </ResponsiveGridLayout>
          </div>
        </Content>

        {/* Right Sidebar - Properties Panel */}
        <Sider width={320} className="right-sidebar" theme="light">
          <PropertiesPanel
            widget={selectedWidget}
            isOpen={isPropertiesPanelOpen}
            onClose={() => setIsPropertiesPanelOpen(false)}
          />
        </Sider>
      </Layout>
    </Layout>
  );
};

// Dashboard Actions Menu
const getDashboardActions = (): MenuProps => ({
  items: [
    {
      key: 'share',
      label: 'Share Dashboard',
      icon: <ShareAltOutlined />,
      onClick: () => message.info('Share functionality coming soon'),
    },
    {
      key: 'export',
      label: 'Export Dashboard',
      icon: <ExportOutlined />,
      onClick: () => message.info('Export functionality coming soon'),
    },
    {
      key: 'schedule',
      label: 'Schedule Refresh',
      icon: <ScheduleOutlined />,
      onClick: () => message.info('Schedule functionality coming soon'),
    },
    {
      type: 'divider',
    },
    {
      key: 'fullscreen',
      label: 'Fullscreen',
      icon: <FullscreenOutlined />,
      onClick: () => message.info('Fullscreen functionality coming soon'),
    },
  ],
});

// Widget Library Panel
const WidgetLibraryPanel: React.FC<{
  onAddWidget: (type: string) => void;
  isOpen: boolean;
}> = ({ onAddWidget, isOpen }) => {
  const widgetCategories = [
    {
      name: 'Charts',
      icon: <BarChartOutlined />,
      widgets: [
        { type: 'bar', name: 'Bar Chart', icon: <BarChartOutlined />, desc: 'Vertical bar charts' },
        { type: 'line', name: 'Line Chart', icon: <LineChartOutlined />, desc: 'Line and area charts' },
        { type: 'pie', name: 'Pie Chart', icon: <PieChartOutlined />, desc: 'Circular charts' },
        { type: 'area', name: 'Area Chart', icon: <AreaChartOutlined />, desc: 'Filled area charts' },
        { type: 'scatter', name: 'Scatter Plot', icon: <DotChartOutlined />, desc: 'Point distribution' },
        { type: 'radar', name: 'Radar Chart', icon: <CompassOutlined />, desc: 'Radar/spider charts' },
        { type: 'gauge', name: 'Gauge', icon: <DashboardOutlined />, desc: 'Progress indicators' },
        { type: 'funnel', name: 'Funnel', icon: <FilterOutlined />, desc: 'Funnel charts' },
        { type: 'tree', name: 'Tree', icon: <BranchesOutlined />, desc: 'Hierarchical data' },
        { type: 'treemap', name: 'Treemap', icon: <AppstoreOutlined />, desc: 'Nested rectangles' },
      ],
    },
    {
      name: 'Data',
      icon: <TableOutlined />,
      widgets: [
        { type: 'table', name: 'Table', icon: <TableOutlined />, desc: 'Data tables' },
        { type: 'metric', name: 'Metric', icon: <NumberOutlined />, desc: 'KPI displays' },
        { type: 'text', name: 'Text', icon: <FileTextOutlined />, desc: 'Rich text content' },
        { type: 'image', name: 'Image', icon: <PictureOutlined />, desc: 'Media display' },
      ],
    },
    {
      name: 'Filters',
      icon: <FilterOutlined />,
      widgets: [
        { type: 'dropdown', name: 'Dropdown', icon: <SelectOutlined />, desc: 'Selection lists' },
        { type: 'dateRange', name: 'Date Range', icon: <CalendarOutlined />, desc: 'Date selection' },
        { type: 'slider', name: 'Slider', icon: <SlidersOutlined />, desc: 'Range sliders' },
        { type: 'search', name: 'Search', icon: <SearchOutlined />, desc: 'Text search' },
        { type: 'checkbox', name: 'Checkbox', icon: <CheckSquareOutlined />, desc: 'Multiple selection' },
      ],
    },
  ];

  return (
    <div className="widget-library-panel">
      <div className="panel-header">
        <Title level={5}>Widget Library</Title>
        <Text type="secondary">Drag widgets to canvas</Text>
      </div>
      
      <div className="widget-categories">
        {widgetCategories.map((category) => (
          <Collapse key={category.name} ghost>
            <Panel
              header={
                <span>
                  {category.icon} {category.name}
                </span>
              }
              key={category.name}
            >
              <div className="widget-grid">
                {category.widgets.map((widget) => (
                  <div
                    key={widget.type}
                    className="widget-item"
                    onClick={() => onAddWidget(widget.type)}
                    draggable
                  >
                    <div className="widget-icon">{widget.icon}</div>
                    <div className="widget-name">{widget.name}</div>
                    <div className="widget-desc">{widget.desc}</div>
                  </div>
                ))}
              </div>
            </Panel>
          </Collapse>
        ))}
      </div>
    </div>
  );
};

// Data Panel
const DataPanel: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
  <div className="data-panel">
    <div className="panel-header">
      <Title level={5}>Data Sources</Title>
      <Button type="primary" size="small" icon={<PlusOutlined />}>
        Add Source
      </Button>
    </div>
    
    <div className="data-sources">
      <Card size="small" className="data-source-item">
        <div className="source-info">
          <DatabaseOutlined className="source-icon" />
          <div className="source-details">
            <div className="source-name">Sample Database</div>
            <div className="source-type">PostgreSQL</div>
          </div>
        </div>
        <Badge status="success" text="Connected" />
      </Card>
      
      <Card size="small" className="data-source-item">
        <div className="source-info">
          <ApiOutlined className="source-icon" />
          <div className="source-details">
            <div className="source-name">REST API</div>
            <div className="source-type">JSON</div>
          </div>
        </div>
        <Badge status="processing" text="Connecting" />
      </Card>
    </div>
  </div>
);

// Filters Panel
const FiltersPanel: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
  <div className="filters-panel">
    <div className="panel-header">
      <Title level={5}>Filters</Title>
      <Button type="primary" size="small" icon={<PlusOutlined />}>
        Add Filter
      </Button>
    </div>
    
    <div className="filters-list">
      <Card size="small" className="filter-item">
        <div className="filter-info">
          <FilterOutlined className="filter-icon" />
          <div className="filter-details">
            <div className="filter-name">Date Range</div>
            <div className="filter-type">Global</div>
          </div>
        </div>
        <Switch size="small" defaultChecked />
      </Card>
    </div>
  </div>
);

// Widget Card Component
const WidgetCard: React.FC<{
  widget: DashboardWidget;
  isSelected: boolean;
  isPreviewMode: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<DashboardWidget>) => void;
  onRemove: () => void;
}> = ({ widget, isSelected, isPreviewMode, onSelect, onUpdate, onRemove }) => {
  const getWidgetIcon = (type: string) => {
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
        table: <TableOutlined />,
        metric: <NumberOutlined />,
        text: <FileTextOutlined />,
      image: <PictureOutlined />,
      dropdown: <SelectOutlined />,
      dateRange: <CalendarOutlined />,
      slider: <SlidersOutlined />,
      search: <SearchOutlined />,
      checkbox: <CheckSquareOutlined />,
    };
    return iconMap[type] || <AppstoreOutlined />;
  };

  return (
    <Card
      className={`widget-card ${isSelected ? 'selected' : ''} ${widget.isLocked ? 'locked' : ''}`}
      title={
        <div className="widget-header">
          <div className="widget-title-section">
            <Input
              value={widget.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              style={{ border: 'none', background: 'transparent', padding: 0 }}
              size="small"
            />
            {widget.subtitle && (
              <Input
                value={widget.subtitle}
                onChange={(e) => onUpdate({ subtitle: e.target.value })}
                style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '12px' }}
                size="small"
                placeholder="Subtitle"
              />
            )}
          </div>
          <div className="widget-badges">
            {widget.isLocked && <Tag color="orange" icon={<LockOutlined />}>Locked</Tag>}
            <Tag color="blue">{widget.type}</Tag>
          </div>
        </div>
      }
      extra={
        !isPreviewMode && (
          <Space size="small">
            <Tooltip title={widget.isVisible ? 'Hide Widget' : 'Show Widget'}>
              <Button
                type="text"
                size="small"
                icon={widget.isVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ isVisible: !widget.isVisible });
                }}
              />
            </Tooltip>
            <Tooltip title={widget.isLocked ? 'Unlock Widget' : 'Lock Widget'}>
              <Button
                type="text"
                size="small"
                icon={widget.isLocked ? <LockOutlined /> : <UnlockOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ isLocked: !widget.isLocked });
                }}
              />
            </Tooltip>
            <Tooltip title="Remove Widget">
              <Popconfirm
                title="Remove this widget?"
                onConfirm={onRemove}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            </Tooltip>
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
      <div className="widget-content">
        <div className="widget-placeholder">
          {getWidgetIcon(widget.type)}
          <div className="widget-type-name">{widget.type}</div>
          <div className="widget-status">Click to configure</div>
        </div>
      </div>
    </Card>
  );
};

// Properties Panel
const PropertiesPanel: React.FC<{
  widget: DashboardWidget | null;
  isOpen: boolean;
  onClose: () => void;
}> = ({ widget, isOpen, onClose }) => {
  if (!widget) {
    return (
      <div className="properties-panel empty">
        <div className="empty-state">
          <AppstoreOutlined className="empty-icon" />
          <Text>Select a widget to configure</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="properties-panel">
      <div className="panel-header">
        <Title level={5}>Properties</Title>
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose} />
      </div>
      
      <div className="properties-content">
        <Tabs defaultActiveKey="general" size="small">
          <TabPane tab="General" key="general">
            <GeneralProperties widget={widget} />
          </TabPane>
          <TabPane tab="Data" key="data">
            <DataProperties widget={widget} />
          </TabPane>
          <TabPane tab="Style" key="style">
            <StyleProperties widget={widget} />
          </TabPane>
          <TabPane tab="Layout" key="layout">
            <LayoutProperties widget={widget} />
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
};

// Property Components
const GeneralProperties: React.FC<{ widget: DashboardWidget }> = ({ widget }) => (
  <div className="properties-section">
    <div className="property-row">
      <span className="property-label">Title:</span>
      <Input value={widget.title} placeholder="Widget title" />
    </div>
    <div className="property-row">
      <span className="property-label">Subtitle:</span>
      <Input value={widget.subtitle || ''} placeholder="Widget subtitle" />
    </div>
    <div className="property-row">
      <span className="property-label">Type:</span>
      <Input value={widget.type} disabled />
    </div>
  </div>
);

const DataProperties: React.FC<{ widget: DashboardWidget }> = ({ widget }) => (
  <div className="properties-section">
    <div className="property-row">
      <span className="property-label">Data Source:</span>
      <Select placeholder="Select data source" style={{ width: '100%' }}>
        <Option value="sample">Sample Data</Option>
        <Option value="database">Database</Option>
        <Option value="api">API</Option>
      </Select>
    </div>
    <div className="property-row">
      <span className="property-label">Refresh:</span>
      <Select placeholder="Auto refresh" style={{ width: '100%' }}>
        <Option value="manual">Manual</Option>
        <Option value="5min">Every 5 minutes</Option>
        <Option value="1hour">Every hour</Option>
        <Option value="1day">Daily</Option>
      </Select>
    </div>
  </div>
);

const StyleProperties: React.FC<{ widget: DashboardWidget }> = ({ widget }) => (
  <div className="properties-section">
    <div className="property-row">
      <span className="property-label">Background:</span>
      <ColorPicker />
    </div>
    <div className="property-row">
      <span className="property-label">Border:</span>
      <ColorPicker />
    </div>
    <div className="property-row">
      <span className="property-label">Border Radius:</span>
      <Slider min={0} max={20} defaultValue={4} />
    </div>
  </div>
);

const LayoutProperties: React.FC<{ widget: DashboardWidget }> = ({ widget }) => (
  <div className="properties-section">
    <div className="property-row">
      <span className="property-label">Position X:</span>
      <Input type="number" value={widget.position.x} />
    </div>
    <div className="property-row">
      <span className="property-label">Position Y:</span>
      <Input type="number" value={widget.position.y} />
    </div>
    <div className="property-row">
      <span className="property-label">Width:</span>
      <Input type="number" value={widget.position.w} />
    </div>
    <div className="property-row">
      <span className="property-label">Height:</span>
      <Input type="number" value={widget.position.h} />
    </div>
  </div>
);
