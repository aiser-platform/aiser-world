'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Row,
  Col,
  Tooltip,
  Dropdown,
  MenuProps,
  Modal,
  Input,
  Select,
  Switch,
  Slider,
  ColorPicker,
  message,
  Divider,
  Tabs,
  Badge,
  Tag,
  Popconfirm,
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
  LayoutOutlined,
  BgColorsOutlined,
  AppstoreOutlined,
  FilterOutlined,
  UndoOutlined,
  RedoOutlined,
  BarChartOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { useDashboardConfig, DashboardWidget, DashboardFilter } from '../DashboardConfiguration';
import { DashboardConfigPanel } from '../DashboardConfiguration';
import { EChartsConfigProvider, useEChartsConfig } from '../EChartsConfiguration';
import { EChartsOptionGenerator } from '../EChartsConfiguration';
import { useDarkMode } from '@/hooks/useDarkMode';
import './DashboardTab.css';

const { Option } = Select;
const { TabPane } = Tabs;
const ResponsiveGridLayout = WidthProvider(Responsive);

// Dashboard Tab Component
export const DashboardTab: React.FC = () => {
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

  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<DashboardWidget | null>(null);
  const [isWidgetConfigOpen, setIsWidgetConfigOpen] = useState(false);
  const [isFilterConfigOpen, setIsFilterConfigOpen] = useState(false);
  const [isLayoutConfigOpen, setIsLayoutConfigOpen] = useState(false);
  const [isThemeConfigOpen, setIsThemeConfigOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const { currentDashboard, availableThemes, availableLayouts } = dashboardState;
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
    setIsConfigPanelOpen(false);
  };

  return (
    <div className="dashboard-tab">
      {/* Dashboard Toolbar */}
      <div className="dashboard-toolbar">
        <div className="toolbar-left">
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsConfigPanelOpen(true)}
            >
              Add Widget
            </Button>
            <Button
              icon={<LayoutOutlined />}
              onClick={() => setIsLayoutConfigOpen(true)}
            >
              Layout
            </Button>
            <Button
              icon={<BgColorsOutlined />}
              onClick={() => setIsThemeConfigOpen(true)}
            >
              Theme
            </Button>
            <Button
              icon={<FilterOutlined />}
              onClick={() => setIsFilterConfigOpen(true)}
            >
              Filters
            </Button>
          </Space>
        </div>

        <div className="toolbar-center">
          <Space>
            <Button
              icon={<UndoOutlined />}
              disabled={!canUndo}
              onClick={() => dashboardDispatch({ type: 'UNDO' })}
            >
              Undo
            </Button>
            <Button
              icon={<RedoOutlined />}
              disabled={!canRedo}
              onClick={() => dashboardDispatch({ type: 'REDO' })}
            >
              Redo
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => message.success('Dashboard refreshed')}
            >
              Refresh
            </Button>
          </Space>
        </div>

        <div className="toolbar-right">
          <Space>
            <Button
              icon={isPreviewMode ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              type={isPreviewMode ? 'primary' : 'default'}
            >
              {isPreviewMode ? 'Preview' : 'Edit'}
            </Button>
            <Button icon={<SettingOutlined />}>
              Actions
            </Button>
          </Space>
        </div>
      </div>

      {/* Dashboard Canvas */}
      <div className="dashboard-canvas" ref={layoutRef}>
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: generateGridLayout() }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: currentDashboard.layout.columns, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={60}
          margin={[currentDashboard.layout.gap, currentDashboard.layout.gap]}
          containerPadding={[currentDashboard.layout.padding, currentDashboard.layout.padding]}
          onLayoutChange={handleLayoutChange}
          isDraggable={!isPreviewMode}
          isResizable={!isPreviewMode}
          style={{
            backgroundColor: currentDashboard.layout.backgroundColor,
            borderRadius: currentDashboard.layout.borderRadius,
            boxShadow: currentDashboard.layout.shadow ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none',
          }}
        >
          {currentDashboard.widgets
            .filter(widget => widget.isVisible)
            .map(widget => (
              <div key={widget.id} className="dashboard-widget">
                <Card
                  className={`widget-card ${widget.isLocked ? 'locked' : ''} ${isPreviewMode ? 'preview-mode' : ''}`}
                  title={widget.title}
                  size="small"
                  style={{
                    height: '100%',
                    backgroundColor: currentDashboard.theme.backgroundColor,
                    color: currentDashboard.theme.textColor,
                    borderColor: currentDashboard.theme.borderColor,
                  }}
                >
                  <div className="widget-content">
                    <div className="widget-placeholder">
                      <AppstoreOutlined style={{ fontSize: '24px', color: '#d9d9d9' }} />
                      <div>{widget.type}</div>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
        </ResponsiveGridLayout>
      </div>

      {/* Add Widget Modal */}
      <Modal
        title="Add Widget"
        open={isConfigPanelOpen}
        onCancel={() => setIsConfigPanelOpen(false)}
        footer={null}
        width={600}
      >
        <div className="widget-gallery">
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card
                hoverable
                className="widget-template"
                onClick={() => handleAddWidget('chart')}
              >
                <BarChartOutlined className="widget-icon" />
                <div className="widget-name">Chart</div>
                <div className="widget-desc">Data visualization charts</div>
              </Card>
            </Col>
            <Col span={8}>
              <Card
                hoverable
                className="widget-template"
                onClick={() => handleAddWidget('metric')}
              >
                <AppstoreOutlined className="widget-icon" />
                <div className="widget-name">Metric</div>
                <div className="widget-desc">Key performance indicators</div>
              </Card>
            </Col>
            <Col span={8}>
              <Card
                hoverable
                className="widget-template"
                onClick={() => handleAddWidget('table')}
              >
                <TableOutlined className="widget-icon" />
                <div className="widget-name">Table</div>
                <div className="widget-desc">Data tables and grids</div>
              </Card>
            </Col>
            <Col span={8}>
              <Card
                hoverable
                className="widget-template"
                onClick={() => handleAddWidget('text')}
              >
                <AppstoreOutlined className="widget-icon" />
                <div className="widget-name">Text</div>
                <div className="widget-desc">Rich text and markdown</div>
              </Card>
            </Col>
            <Col span={8}>
              <Card
                hoverable
                className="widget-template"
                onClick={() => handleAddWidget('image')}
              >
                <AppstoreOutlined className="widget-icon" />
                <div className="widget-name">Image</div>
                <div className="widget-desc">Images and media</div>
              </Card>
            </Col>
            <Col span={8}>
              <Card
                hoverable
                className="widget-template"
                onClick={() => handleAddWidget('filter')}
              >
                <FilterOutlined className="widget-icon" />
                <div className="widget-name">Filter</div>
                <div className="widget-desc">Data filtering controls</div>
              </Card>
            </Col>
          </Row>
        </div>
      </Modal>

      {/* Dashboard Configuration Panel */}
      <Modal
        title="Dashboard Configuration"
        open={isLayoutConfigOpen || isThemeConfigOpen}
        onCancel={() => {
          setIsLayoutConfigOpen(false);
          setIsThemeConfigOpen(false);
        }}
        footer={null}
        width={800}
        style={{ top: 20 }}
      >
        <DashboardConfigPanel />
      </Modal>

      {/* Filter Configuration Modal */}
      <Modal
        title="Filter Configuration"
        open={isFilterConfigOpen}
        onCancel={() => setIsFilterConfigOpen(false)}
        footer={null}
        width={600}
      >
        <div className="filter-config-panel">
          <div className="config-section">
            <div className="config-row">
              <span className="config-label">Filter Type:</span>
              <Select defaultValue="dropdown" style={{ width: '100%' }}>
                <Option value="dropdown">Dropdown</Option>
                <Option value="dateRange">Date Range</Option>
                <Option value="slider">Slider</Option>
                <Option value="search">Search</Option>
                <Option value="checkbox">Checkbox</Option>
              </Select>
            </div>
            <div className="config-row">
              <span className="config-label">Label:</span>
              <Input placeholder="Filter label" />
            </div>
            <div className="config-row">
              <span className="config-label">Field:</span>
              <Input placeholder="Data field name" />
            </div>
          </div>
          <div className="config-actions">
            <Button type="primary">Add Filter</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
