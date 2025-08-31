'use client';

import React, { useState } from 'react';
import {
  Card,
  Tabs,
  Input,
  Select,
  Switch,
  Slider,
  ColorPicker,
  Button,
  Space,
  Row,
  Col,
  Divider,
  Collapse,
  Tooltip,
  InputNumber,
  Tag,
  message,
} from 'antd';
import {
  SettingOutlined,
  LayoutOutlined,
  BgColorsOutlined,
  AppstoreOutlined,
  FilterOutlined,
  PlusOutlined,
  MinusOutlined,
  EyeOutlined,
  LockOutlined,
  UnlockOutlined,
  SaveOutlined,
  UndoOutlined,
  RedoOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import { useDashboardConfig, DashboardWidget, DashboardFilter } from './DashboardConfigProvider';
import './DashboardConfig.css';

const { Option } = Select;
const { Panel } = Collapse;
const { TabPane } = Tabs;

// Dashboard Configuration Panel
export const DashboardConfigPanel: React.FC = () => {
  const {
    state,
    dispatch,
    addWidget,
    updateWidget,
    removeWidget,
    addFilter,
    updateFilter,
    removeFilter,
    canUndo,
    canRedo,
  } = useDashboardConfig();

  const { currentDashboard, availableThemes, availableLayouts, selectedWidget } = state;
  const [activeTab, setActiveTab] = useState('layout');

  // Layout Configuration
  const LayoutConfig = () => (
    <div className="dashboard-config-section">
      <div className="section-header">
        <LayoutOutlined className="section-icon" />
        <span>Layout Settings</span>
      </div>

      <div className="config-row">
        <span className="config-label">Layout Type:</span>
        <Select
          value={currentDashboard.layout.type}
          onChange={(value) => dispatch({ type: 'UPDATE_LAYOUT', payload: { type: value } })}
          style={{ width: '100%' }}
        >
          <Option value="grid">Grid Layout</Option>
          <Option value="flexbox">Flexbox Layout</Option>
          <Option value="freeform">Freeform Layout</Option>
        </Select>
      </div>

      {currentDashboard.layout.type === 'grid' && (
        <>
          <div className="config-row">
            <span className="config-label">Columns:</span>
            <InputNumber
              value={currentDashboard.layout.columns}
              onChange={(value) => dispatch({ type: 'UPDATE_LAYOUT', payload: { columns: value || 12 } })}
              min={1}
              max={24}
              style={{ width: '100%' }}
            />
          </div>
          <div className="config-row">
            <span className="config-label">Rows:</span>
            <InputNumber
              value={currentDashboard.layout.rows}
              onChange={(value) => dispatch({ type: 'UPDATE_LAYOUT', payload: { rows: value || 8 } })}
              min={1}
              max={20}
              style={{ width: '100%' }}
            />
          </div>
        </>
      )}

      <div className="config-row">
        <span className="config-label">Gap:</span>
        <Slider
          value={currentDashboard.layout.gap}
          onChange={(value) => dispatch({ type: 'UPDATE_LAYOUT', payload: { gap: value } })}
          min={0}
          max={32}
          style={{ width: '100%' }}
        />
      </div>

      <div className="config-row">
        <span className="config-label">Padding:</span>
        <Slider
          value={currentDashboard.layout.padding}
          onChange={(value) => dispatch({ type: 'UPDATE_LAYOUT', payload: { padding: value } })}
          min={0}
          max={48}
          style={{ width: '100%' }}
        />
      </div>

      <div className="config-row">
        <span className="config-label">Background Color:</span>
        <ColorPicker
          value={currentDashboard.layout.backgroundColor}
          onChange={(color) => dispatch({ type: 'UPDATE_LAYOUT', payload: { backgroundColor: color.toHexString() } })}
        />
      </div>

      <div className="config-row">
        <span className="config-label">Border Radius:</span>
        <Slider
          value={currentDashboard.layout.borderRadius}
          onChange={(value) => dispatch({ type: 'UPDATE_LAYOUT', payload: { borderRadius: value } })}
          min={0}
          max={20}
          style={{ width: '100%' }}
        />
      </div>

      <div className="config-row">
        <span className="config-label">Shadow:</span>
        <Switch
          checked={currentDashboard.layout.shadow}
          onChange={(checked) => dispatch({ type: 'UPDATE_LAYOUT', payload: { shadow: checked } })}
        />
      </div>

      <Divider />

      <div className="section-header">
        <span>Quick Layouts</span>
      </div>
      <div className="quick-layouts">
        {availableLayouts.map((layout) => (
          <Button
            key={layout.id}
            size="small"
            onClick={() => dispatch({ type: 'UPDATE_LAYOUT', payload: layout })}
            style={{ margin: '4px' }}
          >
            {layout.name}
          </Button>
        ))}
      </div>
    </div>
  );

  // Theme Configuration
  const ThemeConfig = () => (
    <div className="dashboard-config-section">
      <div className="section-header">
        <BgColorsOutlined className="section-icon" />
        <span>Theme Settings</span>
      </div>

      <div className="config-row">
        <span className="config-label">Theme:</span>
        <Select
          value={currentDashboard.theme.id}
          onChange={(value) => {
            const theme = availableThemes.find(t => t.id === value);
            if (theme) {
              dispatch({ type: 'UPDATE_THEME', payload: theme });
            }
          }}
          style={{ width: '100%' }}
        >
          {availableThemes.map((theme) => (
            <Option key={theme.id} value={theme.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{theme.name}</span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: theme.primaryColor, borderRadius: '2px' }} />
                  <div style={{ width: '12px', height: '12px', backgroundColor: theme.secondaryColor, borderRadius: '2px' }} />
                  <div style={{ width: '12px', height: '12px', backgroundColor: theme.accentColor, borderRadius: '2px' }} />
                </div>
              </div>
            </Option>
          ))}
        </Select>
      </div>

      <Divider />

      <div className="section-header">
        <span>Custom Colors</span>
      </div>

      <div className="config-row">
        <span className="config-label">Primary Color:</span>
        <ColorPicker
          value={currentDashboard.theme.primaryColor}
          onChange={(color) => {
            const updatedTheme = { ...currentDashboard.theme, primaryColor: color.toHexString() };
            dispatch({ type: 'UPDATE_THEME', payload: updatedTheme });
          }}
        />
      </div>

      <div className="config-row">
        <span className="config-label">Secondary Color:</span>
        <ColorPicker
          value={currentDashboard.theme.secondaryColor}
          onChange={(color) => {
            const updatedTheme = { ...currentDashboard.theme, secondaryColor: color.toHexString() };
            dispatch({ type: 'UPDATE_THEME', payload: updatedTheme });
          }}
        />
      </div>

      <div className="config-row">
        <span className="config-label">Background Color:</span>
        <ColorPicker
          value={currentDashboard.theme.backgroundColor}
          onChange={(color) => {
            const updatedTheme = { ...currentDashboard.theme, backgroundColor: color.toHexString() };
            dispatch({ type: 'UPDATE_THEME', payload: updatedTheme });
          }}
        />
      </div>

      <div className="config-row">
        <span className="config-label">Text Color:</span>
        <ColorPicker
          value={currentDashboard.theme.textColor}
          onChange={(color) => {
            const updatedTheme = { ...currentDashboard.theme, textColor: color.toHexString() };
            dispatch({ type: 'UPDATE_THEME', payload: updatedTheme });
          }}
        />
      </div>

      <div className="config-row">
        <span className="config-label">Accent Color:</span>
        <ColorPicker
          value={currentDashboard.theme.accentColor}
          onChange={(color) => {
            const updatedTheme = { ...currentDashboard.theme, accentColor: color.toHexString() };
            dispatch({ type: 'UPDATE_THEME', payload: updatedTheme });
          }}
        />
      </div>

      <div className="config-row">
        <span className="config-label">Border Color:</span>
        <ColorPicker
          value={currentDashboard.theme.borderColor}
          onChange={(color) => {
            const updatedTheme = { ...currentDashboard.theme, borderColor: color.toHexString() };
            dispatch({ type: 'UPDATE_THEME', payload: updatedTheme });
          }}
        />
      </div>
    </div>
  );

  // Widget Configuration
  const WidgetConfig = () => (
    <div className="dashboard-config-section">
      <div className="section-header">
        <AppstoreOutlined className="section-icon" />
        <span>Widget Management</span>
      </div>

      <div className="widget-actions">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            const newWidget: DashboardWidget = {
              id: `widget-${Date.now()}`,
              type: 'chart',
              title: 'New Chart',
              subtitle: '',
              position: { x: 0, y: 0, w: 6, h: 4 },
              config: {},
              isVisible: true,
              isLocked: false,
            };
            addWidget('chart', { x: 0, y: 0, w: 6, h: 4 });
            message.success('Widget added successfully');
          }}
          style={{ marginBottom: '16px' }}
        >
          Add Widget
        </Button>
      </div>

      <div className="widget-list">
        {currentDashboard.widgets.map((widget) => (
          <Card
            key={widget.id}
            size="small"
            className={`widget-item ${selectedWidget?.id === widget.id ? 'selected' : ''}`}
            onClick={() => dispatch({ type: 'SET_SELECTED_WIDGET', payload: widget })}
            style={{ marginBottom: '8px', cursor: 'pointer' }}
          >
            <div className="widget-header">
              <div className="widget-info">
                <div className="widget-title">{widget.title}</div>
                <div className="widget-type">
                  <Tag color="blue">{widget.type}</Tag>
                </div>
              </div>
              <div className="widget-controls">
                <Tooltip title={widget.isVisible ? 'Hide Widget' : 'Show Widget'}>
                  <Button
                    type="text"
                    size="small"
                    icon={widget.isVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateWidget(widget.id, { isVisible: !widget.isVisible });
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
                      updateWidget(widget.id, { isLocked: !widget.isLocked });
                    }}
                  />
                </Tooltip>
                <Tooltip title="Remove Widget">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<MinusOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeWidget(widget.id);
                      message.success('Widget removed');
                    }}
                  />
                </Tooltip>
              </div>
            </div>

            {selectedWidget?.id === widget.id && (
              <div className="widget-details">
                <Divider style={{ margin: '12px 0' }} />
                <div className="config-row">
                  <span className="config-label">Title:</span>
                  <Input
                    value={widget.title}
                    onChange={(e) => updateWidget(widget.id, { title: e.target.value })}
                    size="small"
                  />
                </div>
                <div className="config-row">
                  <span className="config-label">Subtitle:</span>
                  <Input
                    value={widget.subtitle || ''}
                    onChange={(e) => updateWidget(widget.id, { subtitle: e.target.value })}
                    size="small"
                  />
                </div>
                <div className="config-row">
                  <span className="config-label">Position:</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <InputNumber
                      value={widget.position.x}
                      onChange={(value) => updateWidget(widget.id, { position: { ...widget.position, x: value || 0 } })}
                      size="small"
                      placeholder="X"
                      style={{ width: '60px' }}
                    />
                    <InputNumber
                      value={widget.position.y}
                      onChange={(value) => updateWidget(widget.id, { position: { ...widget.position, y: value || 0 } })}
                      size="small"
                      placeholder="Y"
                      style={{ width: '60px' }}
                    />
                    <InputNumber
                      value={widget.position.w}
                      onChange={(value) => updateWidget(widget.id, { position: { ...widget.position, w: value || 1 } })}
                      size="small"
                      placeholder="W"
                      style={{ width: '60px' }}
                    />
                    <InputNumber
                      value={widget.position.h}
                      onChange={(value) => updateWidget(widget.id, { position: { ...widget.position, h: value || 1 } })}
                      size="small"
                      placeholder="H"
                      style={{ width: '60px' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );

  // Filter Configuration
  const FilterConfig = () => (
    <div className="dashboard-config-section">
      <div className="section-header">
        <FilterOutlined className="section-icon" />
        <span>Filter Management</span>
      </div>

      <div className="filter-actions">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            const newFilter: DashboardFilter = {
              id: `filter-${Date.now()}`,
              type: 'dropdown',
              label: 'New Filter',
              field: '',
              defaultValue: '',
              isGlobal: true,
              affects: [],
            };
            addFilter(newFilter);
            message.success('Filter added successfully');
          }}
          style={{ marginBottom: '16px' }}
        >
          Add Filter
        </Button>
      </div>

      <div className="filter-list">
        {currentDashboard.filters.map((filter) => (
          <Card
            key={filter.id}
            size="small"
            style={{ marginBottom: '8px' }}
          >
            <div className="filter-header">
              <div className="filter-info">
                <div className="filter-title">{filter.label}</div>
                <div className="filter-type">
                  <Tag color="green">{filter.type}</Tag>
                  {filter.isGlobal && <Tag color="orange">Global</Tag>}
                </div>
              </div>
              <div className="filter-controls">
                <Tooltip title="Remove Filter">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<MinusOutlined />}
                    onClick={() => {
                      removeFilter(filter.id);
                      message.success('Filter removed');
                    }}
                  />
                </Tooltip>
              </div>
            </div>

            <div className="filter-details">
              <Divider style={{ margin: '12px 0' }} />
              <div className="config-row">
                <span className="config-label">Label:</span>
                <Input
                  value={filter.label}
                  onChange={(e) => updateFilter(filter.id, { label: e.target.value })}
                  size="small"
                />
              </div>
              <div className="config-row">
                <span className="config-label">Type:</span>
                <Select
                  value={filter.type}
                  onChange={(value) => updateFilter(filter.id, { type: value })}
                  style={{ width: '100%' }}
                >
                  <Option value="dropdown">Dropdown</Option>
                  <Option value="dateRange">Date Range</Option>
                  <Option value="slider">Slider</Option>
                  <Option value="search">Search</Option>
                  <Option value="checkbox">Checkbox</Option>
                </Select>
              </div>
              <div className="config-row">
                <span className="config-label">Field:</span>
                <Input
                  value={filter.field}
                  onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
                  size="small"
                  placeholder="Data field name"
                />
              </div>
              <div className="config-row">
                <span className="config-label">Global Filter:</span>
                <Switch
                  checked={filter.isGlobal}
                  onChange={(checked) => updateFilter(filter.id, { isGlobal: checked })}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  // Dashboard Settings
  const DashboardSettings = () => (
    <div className="dashboard-config-section">
      <div className="section-header">
        <SettingOutlined className="section-icon" />
        <span>Dashboard Settings</span>
      </div>

      <div className="config-row">
        <span className="config-label">Dashboard Name:</span>
        <Input
          value={currentDashboard.name}
          onChange={(e) => {
            const updatedDashboard = { ...currentDashboard, name: e.target.value };
            dispatch({ type: 'SET_DASHBOARD', payload: updatedDashboard });
          }}
        />
      </div>

      <div className="config-row">
        <span className="config-label">Description:</span>
        <Input.TextArea
          value={currentDashboard.description || ''}
          onChange={(e) => {
            const updatedDashboard = { ...currentDashboard, description: e.target.value };
            dispatch({ type: 'SET_DASHBOARD', payload: updatedDashboard });
          }}
          rows={3}
        />
      </div>

      <div className="config-row">
        <span className="config-label">Refresh Interval (seconds):</span>
        <InputNumber
          value={currentDashboard.refreshInterval}
          onChange={(value) => {
            const updatedDashboard = { ...currentDashboard, refreshInterval: value || 300 };
            dispatch({ type: 'SET_DASHBOARD', payload: updatedDashboard });
          }}
          min={0}
          max={3600}
          style={{ width: '100%' }}
        />
      </div>

      <div className="config-row">
        <span className="config-label">Auto Save:</span>
        <Switch
          checked={currentDashboard.autoSave}
          onChange={(checked) => {
            const updatedDashboard = { ...currentDashboard, autoSave: checked };
            dispatch({ type: 'SET_DASHBOARD', payload: updatedDashboard });
          }}
        />
      </div>

      <Divider />

      <div className="section-header">
        <span>Actions</span>
      </div>

      <div className="action-buttons">
        <Space>
          <Button
            icon={<UndoOutlined />}
            disabled={!canUndo}
            onClick={() => dispatch({ type: 'UNDO' })}
          >
            Undo
          </Button>
          <Button
            icon={<RedoOutlined />}
            disabled={!canRedo}
            onClick={() => dispatch({ type: 'REDO' })}
          >
            Redo
          </Button>
          <Button
            icon={<SaveOutlined />}
            type="primary"
            onClick={() => {
              message.success('Dashboard saved successfully');
            }}
          >
            Save
          </Button>
        </Space>
      </div>
    </div>
  );

  return (
    <div className="dashboard-config-panel">
      <Card title="Dashboard Configuration" size="small">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="Layout" key="layout">
            <LayoutConfig />
          </TabPane>
          <TabPane tab="Theme" key="theme">
            <ThemeConfig />
          </TabPane>
          <TabPane tab="Widgets" key="widgets">
            <WidgetConfig />
          </TabPane>
          <TabPane tab="Filters" key="filters">
            <FilterConfig />
          </TabPane>
          <TabPane tab="Settings" key="settings">
            <DashboardSettings />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};
