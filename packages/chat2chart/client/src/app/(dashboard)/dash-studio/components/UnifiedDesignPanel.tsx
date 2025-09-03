'use client';

import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Form,
  Input,
  Select,
  InputNumber,
  ColorPicker,
  Switch,
  Button,
  Space,
  Typography,
  Divider,
  Card,
  Row,
  Col,
  Upload,
  Slider,
  Radio,
  Checkbox,
  Tooltip,
  message,
  Collapse,
  Badge,
  Avatar,
  Tag,
  Empty,
  Spin,
  Progress
} from 'antd';
import {
  // Widget Library Icons
  AppstoreOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  AreaChartOutlined,
  DotChartOutlined,
  RadarChartOutlined,
  HeatMapOutlined,
  FunnelPlotOutlined,
  DashboardOutlined,
  TableOutlined,
  NumberOutlined,
  FontSizeOutlined,
  FileTextOutlined,
  PictureOutlined,
  FilterOutlined,
  CalendarOutlined,
  DownOutlined,
  MenuOutlined,
  
  // Properties Icons
  SettingOutlined,
  EyeOutlined,
  LockOutlined,
  UnlockOutlined,
  SaveOutlined,
  UndoOutlined,
  RedoOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  FullscreenOutlined,
  CompressOutlined,
  
  // Layout Icons
  LayoutOutlined,
  BorderOutlined,
  ControlOutlined,
  FileOutlined,
  DatabaseOutlined,
  ApiOutlined,
  CloudUploadOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  
  // Advanced Icons
  ThunderboltOutlined,
  ExperimentOutlined,
  BulbOutlined,
  RocketOutlined,
  StarOutlined,
  HeartOutlined,
  FireOutlined,
  CrownOutlined,
  CloseOutlined,
  BgColorsOutlined,
  ToolOutlined,
  CodeOutlined
} from '@ant-design/icons';
import dynamic from 'next/dynamic';

// Lazy load heavy components
const AdvancedChartConfig = dynamic(() => import('./AdvancedChartConfig'), {
  loading: () => <Spin size="small" />,
  ssr: false
});

const DataSourceConfig = dynamic(() => import('./DataSourceConfig'), {
  loading: () => <Spin size="small" />,
  ssr: false
});

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Panel } = Collapse;

// Enhanced Widget Interface
interface EnhancedDashboardWidget {
  id: string;
  type: string;
  title: string;
  name: string;
  icon: React.ReactNode;
  category: string;
  tooltip: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config?: any;
  data?: any;
  content?: string;
  style: {
    backgroundColor: string;
    borderColor: string;
    borderRadius: number;
    padding: number;
    shadow: string;
    opacity: number;
    zIndex: number;
    fontSize?: number;
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right';
    color?: string;
  };
  isVisible: boolean;
  isSelected: boolean;
  isLocked: boolean;
  isResizable: boolean;
  isDraggable: boolean;
  refreshInterval?: number;
  lastRefresh?: Date;
  dataSource?: string;
  query?: string;
  filters?: string[];
  parameters?: string[];
  // Enhanced properties
  tags?: string[];
  description?: string;
  author?: string;
  createdAt?: Date;
  updatedAt?: Date;
  version?: string;
  isTemplate?: boolean;
  isPublic?: boolean;
  likes?: number;
  downloads?: number;
}

interface UnifiedDesignPanelProps {
  selectedWidget: any | null;
  onConfigUpdate: (widgetId: string, config: any) => void;
  onWidgetSelect: (widget: any) => void;
  onAddWidget: (widget: any) => void;
  isDarkMode: boolean;
  showPanel: boolean;
  onClose: () => void;
}

// Enhanced Widget Categories with PowerBI/Tableau inspiration
const ENHANCED_WIDGET_CATEGORIES = {
  // Charts (PowerBI style)
  charts: {
    name: 'Charts',
    icon: <BarChartOutlined />,
    color: '#1890ff',
    description: 'Interactive charts and visualizations',
          widgets: [
        { type: 'bar', name: 'Bar', icon: <BarChartOutlined />, tooltip: 'Compare values across categories', category: 'comparison', popularity: 95 },
        { type: 'line', name: 'Line', icon: <LineChartOutlined />, tooltip: 'Show trends over time', category: 'trend', popularity: 90 },
        { type: 'pie', name: 'Pie', icon: <PieChartOutlined />, tooltip: 'Show parts of a whole', category: 'distribution', popularity: 85 },
        { type: 'area', name: 'Area', icon: <AreaChartOutlined />, tooltip: 'Show trends with filled areas', category: 'trend', popularity: 80 },
        { type: 'scatter', name: 'Scatter', icon: <DotChartOutlined />, tooltip: 'Show relationships between variables', category: 'correlation', popularity: 75 },
        { type: 'radar', name: 'Radar', icon: <RadarChartOutlined />, tooltip: 'Compare multiple variables', category: 'comparison', popularity: 70 },
        { type: 'heatmap', name: 'Heatmap', icon: <HeatMapOutlined />, tooltip: 'Show data density and patterns', category: 'correlation', popularity: 65 },
        { type: 'funnel', name: 'Funnel', icon: <FunnelPlotOutlined />, tooltip: 'Show process flow stages', category: 'distribution', popularity: 60 },
        { type: 'gauge', name: 'Gauge', icon: <DashboardOutlined />, tooltip: 'Single value indicator', category: 'metric', popularity: 55 }
      ]
  },
  
  // Data Tables (Tableau style)
  data: {
    name: 'Data',
    icon: <TableOutlined />,
    color: '#52c41a',
    description: 'Data display and analysis',
    widgets: [
      { type: 'table', name: 'Table', icon: <TableOutlined />, tooltip: 'Data table with sorting and filtering', category: 'table', popularity: 90 },
      { type: 'pivot', name: 'Pivot', icon: <TableOutlined />, tooltip: 'Interactive pivot table', category: 'table', popularity: 85 },
      { type: 'crossfilter', name: 'Cross Filter', icon: <FilterOutlined />, tooltip: 'Interactive cross-filtering', category: 'filter', popularity: 80 }
    ]
  },
  
  // Metrics & KPIs (PowerBI style)
  metrics: {
    name: 'Metrics',
    icon: <NumberOutlined />,
    color: '#fa8c16',
    description: 'Key performance indicators',
    widgets: [
      { type: 'kpi', name: 'KPI', icon: <NumberOutlined />, tooltip: 'Key performance indicator', category: 'metric', popularity: 95 },
      { type: 'metric', name: 'Metric', icon: <DashboardOutlined />, tooltip: 'Single metric display', category: 'metric', popularity: 90 },
      { type: 'trend', name: 'Trend', icon: <LineChartOutlined />, tooltip: 'Trend indicator', category: 'metric', popularity: 85 }
    ]
  },
  
  // Content & Media (Superset style)
  content: {
    name: 'Content',
    icon: <FileTextOutlined />,
    color: '#722ed1',
    description: 'Text, images, and media',
    widgets: [
      { type: 'text', name: 'Text', icon: <FontSizeOutlined />, tooltip: 'Rich text content', category: 'content', popularity: 80 },
      { type: 'markdown', name: 'Markdown', icon: <FileTextOutlined />, tooltip: 'Markdown content', category: 'content', popularity: 75 },
      { type: 'image', name: 'Image', icon: <PictureOutlined />, tooltip: 'Image display', category: 'content', popularity: 70 },
      { type: 'iframe', name: 'Embed', icon: <FileOutlined />, tooltip: 'Embedded content', category: 'content', popularity: 65 }
    ]
  },
  
  // Filters & Controls (Tableau style)
  filters: {
    name: 'Filters',
    icon: <FilterOutlined />,
    color: '#eb2f96',
    description: 'Interactive filters and controls',
    widgets: [
      { type: 'dateFilter', name: 'Date Filter', icon: <CalendarOutlined />, tooltip: 'Date range picker', category: 'filter', popularity: 90 },
      { type: 'dropdownFilter', name: 'Dropdown', icon: <DownOutlined />, tooltip: 'Dropdown selection', category: 'filter', popularity: 85 },
      { type: 'sliderFilter', name: 'Slider', icon: <MenuOutlined />, tooltip: 'Range slider', category: 'filter', popularity: 80 },
      { type: 'searchFilter', name: 'Search', icon: <SearchOutlined />, tooltip: 'Search input', category: 'filter', popularity: 75 }
    ]
  },
  
  // Layout & Structure (PowerBI style)
  layout: {
    name: 'Layout',
    icon: <LayoutOutlined />,
    color: '#13c2c2',
    description: 'Layout and structural elements',
    widgets: [
      { type: 'container', name: 'Container', icon: <BorderOutlined />, tooltip: 'Widget container', category: 'layout', popularity: 70 },
      { type: 'spacer', name: 'Spacer', icon: <LayoutOutlined />, tooltip: 'Flexible spacing', category: 'layout', popularity: 65 },
      { type: 'divider', name: 'Divider', icon: <BorderOutlined />, tooltip: 'Visual separator', category: 'layout', popularity: 60 }
    ]
  }
};

const UnifiedDesignPanel: React.FC<UnifiedDesignPanelProps> = ({
  selectedWidget,
  onConfigUpdate,
  onWidgetSelect,
  onAddWidget,
  isDarkMode,
  showPanel,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('library');
  const [activeCategory, setActiveCategory] = useState('visualization');
  const [searchQuery, setSearchQuery] = useState('');
  const [form] = Form.useForm();

  // Initialize form with current widget config
  useEffect(() => {
    if (selectedWidget) {
      form.setFieldsValue({
        title: selectedWidget.title,
        content: selectedWidget.content,
        ...selectedWidget.config,
        ...(selectedWidget.style || {})
      });
    }
  }, [selectedWidget, form]);

  // Auto-switch to properties when widget is selected, back to library when deselected
  useEffect(() => {
    if (selectedWidget) {
      setActiveTab('properties');
    } else {
      setActiveTab('library');
    }
  }, [selectedWidget]);

  const handleConfigUpdate = (values: any) => {
    if (selectedWidget) {
      const updatedConfig = {
        ...selectedWidget.config,
        ...values
      };
      onConfigUpdate(selectedWidget.id, updatedConfig);
    }
  };

  const handleStyleUpdate = (styleUpdates: any) => {
    if (selectedWidget) {
      const updatedStyle = {
        ...(selectedWidget.style || {}),
        ...styleUpdates
      };
      onConfigUpdate(selectedWidget.id, {
        ...selectedWidget.config,
        style: updatedStyle
      });
    }
  };

  // Filter widgets based on search query
  const getFilteredWidgets = (category: string) => {
    const widgets = ENHANCED_WIDGET_CATEGORIES[category as keyof typeof ENHANCED_WIDGET_CATEGORIES]?.widgets || [];
    if (!searchQuery) return widgets;
    return widgets.filter(widget => 
      widget.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      widget.tooltip.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Render Widget Library Tab
  const renderWidgetLibrary = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Search Bar */}
      <div style={{ marginBottom: '16px' }}>
        <Input
          placeholder="Search widgets..."
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ borderRadius: '8px' }}
        />
      </div>

      {/* Category Tabs */}
              <Tabs
          activeKey={activeCategory}
          onChange={setActiveCategory}
          size="small"
          style={{ flex: 1 }}
          items={Object.entries(ENHANCED_WIDGET_CATEGORIES).map(([key, category]) => ({
            key,
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                {category.icon}
                <span style={{ fontSize: '11px' }}>{category.name}</span>
              </span>
            ),
          children: (
            <div style={{ height: '400px', overflow: 'auto' }}>
              <div style={{ marginBottom: '12px' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {category.description}
                </Text>
              </div>
              
              {getFilteredWidgets(key).length === 0 ? (
                <Empty 
                  description="No widgets found" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ marginTop: '40px' }}
                />
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
                  gap: '6px' 
                }}>
                  {getFilteredWidgets(key).map((widget) => (
                    <Tooltip key={widget.type} title={widget.tooltip} placement="top">
                      <Card
                        size="small"
                        style={{ 
                          cursor: 'grab',
                          border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
                          background: isDarkMode ? '#1f1f1f' : '#ffffff',
                          borderRadius: '8px',
                          transition: 'all 0.2s ease',
                          position: 'relative'
                        }}
                        hoverable
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/json', JSON.stringify(widget));
                          e.dataTransfer.effectAllowed = 'copy';
                          // Add visual feedback
                          e.currentTarget.style.opacity = '0.5';
                        }}
                        onDragEnd={(e) => {
                          e.currentTarget.style.opacity = '1';
                        }}
                        onClick={() => {
                          onWidgetSelect(widget);
                          // Don't auto-add on click, let user drag to canvas
                        }}
                        bodyStyle={{ padding: '8px', textAlign: 'center' }}
                      >
                        <div style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                          <div style={{ fontSize: '16px', marginBottom: '4px', color: category.color }}>
                            {React.isValidElement(widget.icon) ? widget.icon : <BarChartOutlined />}
                          </div>
                          <div style={{ fontWeight: '500', fontSize: '10px', marginBottom: '2px' }}>
                            {widget.name}
                          </div>
                          {widget.popularity > 80 && (
                            <div style={{ 
                              position: 'absolute', 
                              top: '4px', 
                              right: '4px',
                              color: '#faad14',
                              fontSize: '10px'
                            }}>
                              <StarOutlined />
                            </div>
                          )}
                        </div>
                      </Card>
                    </Tooltip>
                  ))}
                </div>
              )}
            </div>
          )
        }))}
      />
    </div>
  );

  // Render Properties Tab
  const renderProperties = () => {
    if (!selectedWidget) {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '400px',
          color: isDarkMode ? '#666' : '#999'
        }}>
          <AppstoreOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
          <Title level={4} style={{ color: isDarkMode ? '#666' : '#999' }}>
            Select a Widget
          </Title>
          <Text style={{ color: isDarkMode ? '#666' : '#999' }}>
            Choose a widget from the library to configure its properties
          </Text>
        </div>
      );
    }

    return (
      <div style={{ height: '100%', overflow: 'auto' }}>
        {/* Widget Header */}
        <div style={{ 
          padding: '16px', 
          background: isDarkMode ? '#1f1f1f' : '#f5f5f5',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <Avatar 
              size="small" 
              style={{ backgroundColor: ENHANCED_WIDGET_CATEGORIES[selectedWidget.category as keyof typeof ENHANCED_WIDGET_CATEGORIES]?.color || '#1890ff' }}
            >
              {selectedWidget.icon}
            </Avatar>
            <Title level={5} style={{ margin: '0 0 0 8px', color: isDarkMode ? '#ffffff' : '#000000' }}>
              {selectedWidget.name}
            </Title>
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {selectedWidget.tooltip}
          </Text>
        </div>

        {/* Properties Tabs */}
        <Tabs
          size="small"
          items={[
            {
              key: 'content',
              label: (
                <span>
                  <SettingOutlined />
                  <span style={{ marginLeft: '4px' }}>Content</span>
                </span>
              ),
              children: (
                <Form form={form} layout="vertical" onValuesChange={handleConfigUpdate} size="small">
                  {renderContentProperties()}
                </Form>
              )
            },
            {
              key: 'style',
              label: (
                <span>
                  <BgColorsOutlined />
                  <span style={{ marginLeft: '4px' }}>Style</span>
                </span>
              ),
              children: (
                <Form form={form} layout="vertical" onValuesChange={handleStyleUpdate} size="small">
                  {renderStyleProperties()}
                </Form>
              )
            },
            {
              key: 'data',
              label: (
                <span>
                  <DatabaseOutlined />
                  <span style={{ marginLeft: '4px' }}>Data</span>
                </span>
              ),
              children: renderDataProperties()
            },
            {
              key: 'behavior',
              label: (
                <span>
                  <CodeOutlined />
                  <span style={{ marginLeft: '4px' }}>Behavior</span>
                </span>
              ),
              children: (
                <Form form={form} layout="vertical" onValuesChange={handleConfigUpdate} size="small">
                  {renderBehaviorProperties()}
                </Form>
              )
            }
          ]}
        />
      </div>
    );
  };

  // Render Content Properties based on widget type
  const renderContentProperties = () => {
    if (!selectedWidget) return null;

    switch (selectedWidget.type) {
      case 'bar':
      case 'line':
      case 'pie':
      case 'area':
      case 'scatter':
      case 'radar':
      case 'heatmap':
      case 'funnel':
      case 'gauge':
        return <AdvancedChartConfig widget={selectedWidget} onUpdate={handleConfigUpdate} />;
      
      case 'table':
      case 'pivot':
        return (
          <div>
            <Collapse size="small" ghost>
              <Panel header="Table Configuration" key="table-config">
                <Row gutter={[8, 4]}>
                  <Col span={24}>
                    <Form.Item label="Table Title" name={['config', 'title', 'text']} style={{ marginBottom: '8px' }}>
                      <Input placeholder="Enter table title" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item label="Data Source" name="dataSource" style={{ marginBottom: '8px' }}>
                      <Select placeholder="Select data source">
                        <Option value="sample">Sample Data</Option>
                        <Option value="database">Database</Option>
                        <Option value="api">API</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={[8, 4]}>
                  <Col span={12}>
                    <Form.Item label="Show Pagination" name={['config', 'pagination']} valuePropName="checked" style={{ marginBottom: '4px' }}>
                      <Switch size="small" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Page Size" name={['config', 'pageSize']} style={{ marginBottom: '4px' }}>
                      <InputNumber min={5} max={100} defaultValue={10} size="small" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={[8, 4]}>
                  <Col span={8}>
                    <Form.Item label="Border" name={['config', 'showBorder']} valuePropName="checked" style={{ marginBottom: '4px' }}>
                      <Switch size="small" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Striped" name={['config', 'striped']} valuePropName="checked" style={{ marginBottom: '4px' }}>
                      <Switch size="small" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Hover" name={['config', 'hoverable']} valuePropName="checked" style={{ marginBottom: '4px' }}>
                      <Switch size="small" />
                    </Form.Item>
                  </Col>
                </Row>
              </Panel>
              
              <Panel header="Columns & Sorting" key="table-columns">
                <Form.Item label="Sortable" name={['config', 'sortable']} valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Form.Item label="Filterable" name={['config', 'filterable']} valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Form.Item label="Column Width" name={['config', 'columnWidth']}>
                  <Select placeholder="Select width mode">
                    <Option value="auto">Auto</Option>
                    <Option value="fixed">Fixed</Option>
                    <Option value="responsive">Responsive</Option>
                  </Select>
                </Form.Item>
              </Panel>
            </Collapse>
          </div>
        );
      
      case 'kpi':
      case 'metric':
        return (
          <div>
            <Collapse size="small" ghost>
              <Panel header="Metric Configuration" key="metric-config">
                <Row gutter={[8, 4]}>
                  <Col span={24}>
                    <Form.Item label="Metric Title" name={['config', 'title', 'text']} style={{ marginBottom: '8px' }}>
                      <Input placeholder="Enter metric title" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Value" name={['config', 'value']} style={{ marginBottom: '8px' }}>
                      <Input placeholder="Enter metric value" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Format" name={['config', 'format']} style={{ marginBottom: '8px' }}>
                      <Select placeholder="Select format">
                        <Option value="number">Number</Option>
                        <Option value="currency">Currency</Option>
                        <Option value="percentage">Percentage</Option>
                        <Option value="decimal">Decimal</Option>
                        <Option value="integer">Integer</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={[8, 4]}>
                  <Col span={8}>
                    <Form.Item label="Prefix" name={['config', 'prefix']} style={{ marginBottom: '4px' }}>
                      <Input placeholder="e.g., $, €" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Suffix" name={['config', 'suffix']} style={{ marginBottom: '4px' }}>
                      <Input placeholder="e.g., %, K, M" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Show Trend" name={['config', 'showTrend']} valuePropName="checked" style={{ marginBottom: '4px' }}>
                      <Switch size="small" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={[8, 4]}>
                  <Col span={24}>
                    <Form.Item label="Trend Value" name={['config', 'trendValue']} style={{ marginBottom: '4px' }}>
                      <Input placeholder="e.g., +12.5%" />
                    </Form.Item>
                  </Col>
                </Row>
              </Panel>
              
              <Panel header="Display" key="metric-display">
                <Form.Item label="Value Size" name={['style', 'fontSize']}>
                  <InputNumber min={12} max={72} />
                </Form.Item>
                <Form.Item label="Value Color" name={['style', 'color']}>
                  <ColorPicker />
                </Form.Item>
                <Form.Item label="Alignment" name={['style', 'textAlign']}>
                  <Select>
                    <Option value="left">Left</Option>
                    <Option value="center">Center</Option>
                    <Option value="right">Right</Option>
                  </Select>
                </Form.Item>
              </Panel>
            </Collapse>
          </div>
        );
      
      case 'text':
        return (
          <div>
            <Collapse size="small" ghost>
              <Panel header="Text Content" key="text-content">
                <Form.Item label="Content" name={['config', 'content']}>
                  <TextArea rows={6} placeholder="Enter text content..." />
                </Form.Item>
                <Form.Item label="Rich Text" name={['config', 'richText']} valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Panel>
              
              <Panel header="Typography" key="text-typography">
                <Form.Item label="Font Family" name={['style', 'fontFamily']}>
                  <Select placeholder="Select font">
                    <Option value="Arial">Arial</Option>
                    <Option value="Helvetica">Helvetica</Option>
                    <Option value="Times New Roman">Times New Roman</Option>
                    <Option value="Georgia">Georgia</Option>
                    <Option value="Verdana">Verdana</Option>
                    <Option value="system-ui">System UI</Option>
                  </Select>
                </Form.Item>
                <Form.Item label="Font Size" name={['style', 'fontSize']}>
                  <InputNumber min={8} max={72} />
                </Form.Item>
                <Form.Item label="Font Weight" name={['style', 'fontWeight']}>
                  <Select>
                    <Option value="normal">Normal</Option>
                    <Option value="bold">Bold</Option>
                    <Option value="lighter">Light</Option>
                    <Option value="bolder">Bolder</Option>
                  </Select>
                </Form.Item>
                <Form.Item label="Text Color" name={['style', 'color']}>
                  <ColorPicker />
                </Form.Item>
                <Form.Item label="Text Alignment" name={['style', 'textAlign']}>
                  <Select>
                    <Option value="left">Left</Option>
                    <Option value="center">Center</Option>
                    <Option value="right">Right</Option>
                    <Option value="justify">Justify</Option>
                  </Select>
                </Form.Item>
                <Form.Item label="Line Height" name={['style', 'lineHeight']}>
                  <InputNumber min={0.5} max={3} step={0.1} />
                </Form.Item>
              </Panel>
            </Collapse>
          </div>
        );
      
      case 'markdown':
        return (
          <div>
            <Collapse size="small" ghost>
              <Panel header="Markdown Content" key="markdown-content">
                <Form.Item label="Markdown Content" name={['config', 'content']}>
                  <TextArea rows={8} placeholder="# Markdown Content&#10;&#10;Add your markdown here..." />
                </Form.Item>
                <Form.Item label="Enable HTML" name={['config', 'enableHtml']} valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Form.Item label="Syntax Highlighting" name={['config', 'syntaxHighlight']} valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Panel>
              
              <Panel header="Rendering" key="markdown-rendering">
                <Form.Item label="Code Theme" name={['config', 'codeTheme']}>
                  <Select placeholder="Select theme">
                    <Option value="default">Default</Option>
                    <Option value="github">GitHub</Option>
                    <Option value="monokai">Monokai</Option>
                    <Option value="solarized">Solarized</Option>
                  </Select>
                </Form.Item>
                <Form.Item label="Table Styling" name={['config', 'tableStyle']} valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Form.Item label="Link Styling" name={['config', 'linkStyle']} valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Panel>
            </Collapse>
          </div>
        );
      
      case 'image':
        return (
          <div>
            <Collapse size="small" ghost>
              <Panel header="Image Configuration" key="image-config">
                <Form.Item label="Image URL" name={['config', 'imageUrl']}>
                  <Input placeholder="Enter image URL or upload" />
                </Form.Item>
                <Form.Item label="Alt Text" name={['config', 'altText']}>
                  <Input placeholder="Enter alt text for accessibility" />
                </Form.Item>
                <Form.Item label="Fit Mode" name={['config', 'fitMode']}>
                  <Select placeholder="Select fit mode">
                    <Option value="contain">Contain (fit within bounds)</Option>
                    <Option value="cover">Cover (fill bounds)</Option>
                    <Option value="fill">Fill (stretch to fit)</Option>
                    <Option value="scale-down">Scale Down</Option>
                    <Option value="none">None (original size)</Option>
                  </Select>
                </Form.Item>
                <Form.Item label="Lazy Loading" name={['config', 'lazy']} valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Panel>
              
              <Panel header="Display" key="image-display">
                <Form.Item label="Border Radius" name={['style', 'borderRadius']}>
                  <InputNumber min={0} max={50} />
                </Form.Item>
                <Form.Item label="Opacity" name={['style', 'opacity']}>
                  <Slider min={0} max={1} step={0.1} />
                </Form.Item>
                <Form.Item label="Shadow" name={['style', 'boxShadow']}>
                  <Select placeholder="Select shadow">
                    <Option value="none">None</Option>
                    <Option value="small">Small</Option>
                    <Option value="medium">Medium</Option>
                    <Option value="large">Large</Option>
                  </Select>
                </Form.Item>
              </Panel>
            </Collapse>
          </div>
        );
      
      default:
        return (
          <div>
            <Form.Item label="Content" name="content">
              <TextArea rows={3} placeholder="Enter content..." />
            </Form.Item>
          </div>
        );
    }
  };

  // Render Style Properties
  const renderStyleProperties = () => (
    <div>
      <Collapse size="small" ghost>
        <Panel header="Layout & Positioning" key="layout">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Width" name={['layout', 'width']}>
                <InputNumber min={100} max={2000} placeholder="px" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Height" name={['layout', 'height']}>
                <InputNumber min={100} max={2000} placeholder="px" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Min Width" name={['layout', 'minWidth']}>
                <InputNumber min={50} max={1000} placeholder="px" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Min Height" name={['layout', 'minHeight']}>
                <InputNumber min={50} max={1000} placeholder="px" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Responsive" name={['layout', 'responsive']} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Draggable" name={['layout', 'isDraggable']} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Resizable" name={['layout', 'isResizable']} valuePropName="checked">
            <Switch />
          </Form.Item>
        </Panel>
        
        <Panel header="Background & Borders" key="background">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Background" name={['style', 'backgroundColor']}>
                <ColorPicker />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Border Color" name={['style', 'borderColor']}>
                <ColorPicker />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Border Width" name={['style', 'borderWidth']}>
                <InputNumber min={0} max={10} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Border Style" name={['style', 'borderStyle']}>
                <Select>
                  <Option value="solid">Solid</Option>
                  <Option value="dashed">Dashed</Option>
                  <Option value="dotted">Dotted</Option>
                  <Option value="none">None</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Border Radius" name={['style', 'borderRadius']}>
            <InputNumber min={0} max={50} />
          </Form.Item>
        </Panel>
        
        <Panel header="Spacing & Padding" key="spacing">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Padding" name={['style', 'padding']}>
                <InputNumber min={0} max={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Margin" name={['style', 'margin']}>
                <InputNumber min={0} max={100} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Z-Index" name={['style', 'zIndex']}>
            <InputNumber min={0} max={9999} />
          </Form.Item>
        </Panel>
        
        <Panel header="Typography" key="typography">
          <Form.Item label="Font Family" name={['style', 'fontFamily']}>
            <Select placeholder="Select font">
              <Option value="Arial">Arial</Option>
              <Option value="Helvetica">Helvetica</Option>
              <Option value="Times New Roman">Times New Roman</Option>
              <Option value="Georgia">Georgia</Option>
              <Option value="Verdana">Verdana</Option>
              <Option value="system-ui">System UI</Option>
              <Option value="monospace">Monospace</Option>
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Font Size" name={['style', 'fontSize']}>
                <InputNumber min={8} max={72} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Font Weight" name={['style', 'fontWeight']}>
                <Select>
                  <Option value="normal">Normal</Option>
                  <Option value="bold">Bold</Option>
                  <Option value="lighter">Light</Option>
                  <Option value="bolder">Bolder</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Text Color" name={['style', 'color']}>
                <ColorPicker />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Text Align" name={['style', 'textAlign']}>
                <Select>
                  <Option value="left">Left</Option>
                  <Option value="center">Center</Option>
                  <Option value="right">Right</Option>
                  <Option value="justify">Justify</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Line Height" name={['style', 'lineHeight']}>
            <InputNumber min={0.5} max={3} step={0.1} />
          </Form.Item>
        </Panel>
        
        <Panel header="Effects & Animation" key="effects">
          <Form.Item label="Opacity" name={['style', 'opacity']}>
            <Slider min={0} max={1} step={0.1} />
          </Form.Item>
          <Form.Item label="Box Shadow" name={['style', 'boxShadow']}>
            <Select>
              <Option value="none">None</Option>
              <Option value="small">Small</Option>
              <Option value="medium">Medium</Option>
              <Option value="large">Large</Option>
              <Option value="custom">Custom</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Animation Enabled" name={['animation', 'enabled']} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Animation Duration" name={['animation', 'duration']}>
            <InputNumber min={100} max={3000} step={100} placeholder="ms" />
          </Form.Item>
          <Form.Item label="Animation Type" name={['animation', 'type']}>
            <Select>
              <Option value="fade">Fade</Option>
              <Option value="slide">Slide</Option>
              <Option value="zoom">Zoom</Option>
              <Option value="bounce">Bounce</Option>
              <Option value="none">None</Option>
            </Select>
          </Form.Item>
        </Panel>
      </Collapse>
    </div>
  );

  // Render Data Properties
  const renderDataProperties = () => (
    <div>
      <DataSourceConfig 
        widget={selectedWidget} 
        onUpdate={handleConfigUpdate} 
      />
    </div>
  );

  // Render Behavior Properties
  const renderBehaviorProperties = () => (
    <div>
      <Collapse size="small" ghost>
        <Panel header="Interaction & Behavior" key="interaction">
          <Form.Item label="Clickable" name={['behavior', 'clickable']} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Hoverable" name={['behavior', 'hoverable']} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Selectable" name={['behavior', 'selectable']} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Draggable" name={['behavior', 'draggable']} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Resizable" name={['behavior', 'resizable']} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="On Hover" name={['behavior', 'onHover']}>
            <Select>
              <Option value="highlight">Highlight</Option>
              <Option value="tooltip">Show Tooltip</Option>
              <Option value="none">None</Option>
            </Select>
          </Form.Item>
          <Form.Item label="On Click" name={['behavior', 'onClick']}>
            <Select>
              <Option value="select">Select</Option>
              <Option value="drill">Drill Down</Option>
              <Option value="navigate">Navigate</Option>
              <Option value="none">None</Option>
            </Select>
          </Form.Item>
        </Panel>
        
        <Panel header="Visibility & Display" key="visibility">
          <Form.Item label="Visible" name="isVisible" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Show on Mobile" name={['layout', 'showOnMobile']} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Show on Tablet" name={['layout', 'showOnTablet']} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Show on Desktop" name={['layout', 'showOnDesktop']} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Locked" name="isLocked" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Panel>
        
        <Panel header="Data & Refresh" key="data-refresh">
          <Form.Item label="Auto Refresh" name={['data', 'autoRefresh']} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Refresh Interval" name={['data', 'refreshInterval']}>
            <Select placeholder="Select interval">
              <Option value={0}>No auto refresh</Option>
              <Option value={30}>30 seconds</Option>
              <Option value={60}>1 minute</Option>
              <Option value={300}>5 minutes</Option>
              <Option value={900}>15 minutes</Option>
              <Option value={1800}>30 minutes</Option>
              <Option value={3600}>1 hour</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Cache Data" name={['data', 'cache']} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Cache Timeout" name={['data', 'cacheTimeout']}>
            <InputNumber min={60} max={3600} placeholder="seconds" />
          </Form.Item>
        </Panel>
        
        <Panel header="Responsive Behavior" key="responsive">
          <Form.Item label="Responsive" name={['layout', 'responsive']} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Breakpoint - Mobile" name={['layout', 'breakpoints', 'xs']}>
            <Input.Group compact>
              <InputNumber placeholder="W" min={1} max={12} style={{ width: '50%' }} />
              <InputNumber placeholder="H" min={1} max={20} style={{ width: '50%' }} />
            </Input.Group>
          </Form.Item>
          <Form.Item label="Breakpoint - Tablet" name={['layout', 'breakpoints', 'md']}>
            <Input.Group compact>
              <InputNumber placeholder="W" min={1} max={12} style={{ width: '50%' }} />
              <InputNumber placeholder="H" min={1} max={20} style={{ width: '50%' }} />
            </Input.Group>
          </Form.Item>
          <Form.Item label="Breakpoint - Desktop" name={['layout', 'breakpoints', 'lg']}>
            <Input.Group compact>
              <InputNumber placeholder="W" min={1} max={12} style={{ width: '50%' }} />
              <InputNumber placeholder="H" min={1} max={20} style={{ width: '50%' }} />
            </Input.Group>
          </Form.Item>
        </Panel>
      </Collapse>
    </div>
  );

  if (!showPanel) return null;

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      background: isDarkMode ? '#141414' : '#ffffff',
      border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Panel Header */}
      <div style={{ 
        padding: '16px', 
        borderBottom: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Title level={5} style={{ margin: 0, color: isDarkMode ? '#ffffff' : '#000000' }}>
          Design Panel
        </Title>
        <Button 
          type="text" 
          icon={<CloseOutlined />} 
          onClick={onClose}
          style={{ color: isDarkMode ? '#ffffff' : '#000000' }}
        />
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '16px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'library',
              label: (
                <span>
                  <AppstoreOutlined />
                  <span style={{ marginLeft: '4px' }}>Library</span>
                </span>
              ),
              children: (
                <div style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}>
                  {renderWidgetLibrary()}
                </div>
              )
            },
            {
              key: 'properties',
              label: (
                <span>
                  <SettingOutlined />
                  <span style={{ marginLeft: '4px' }}>Properties</span>
                  {selectedWidget && <Badge size="small" />}
                </span>
              ),
              children: (
                <div style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}>
                  {renderProperties()}
                </div>
              )
            }
          ]}
        />
      </div>
    </div>
  );
};

export default UnifiedDesignPanel;
