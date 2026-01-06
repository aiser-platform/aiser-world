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
  Typography,
  Divider,
  Card,
  Row,
  Col,
  Slider,
  Tooltip,
  message,
  Collapse,
  Badge,
  Empty,
  Spin,
  Modal,
} from 'antd';
import {
  // Widget Library Icons
  AppstoreOutlined,
  BarChartOutlined,
  DotChartOutlined,
  FontSizeOutlined,
  FileTextOutlined,

  // Properties Icons
  SettingOutlined,
  EyeOutlined,
  ToolOutlined,
  EditOutlined,
  // Layout Icons
  LayoutOutlined,
  DatabaseOutlined,
  SearchOutlined,

  // Advanced Icons
  ThunderboltOutlined,
  StarOutlined,
  CloseOutlined,
  BgColorsOutlined,
  ZoomInOutlined,
} from '@ant-design/icons';
import dynamic from 'next/dynamic';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { ENHANCED_WIDGET_CATEGORIES } from './EnhancedWidgetCategories';
import { getDefaultConfig } from './WidgetDefaultConfigs';

// Lazy load heavy components
const DataSourceConfig = dynamic(() => import('./DataSourceConfig'), {
  loading: () => <Spin size="small" />,
  ssr: false,
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

const UnifiedDesignPanel: React.FC<UnifiedDesignPanelProps> = ({
  selectedWidget,
  onConfigUpdate,
  onWidgetSelect,
  isDarkMode,
  onClose,
}) => {
  const [form] = Form.useForm();

  const isUpdatingFormRef = React.useRef(false);

  // Listen for inline editing updates to sync with form
  useEffect(() => {
    const handleTitleUpdate = (event: CustomEvent) => {
      if (selectedWidget && event.detail.widgetId === selectedWidget.id) {
        isUpdatingFormRef.current = true;
        form.setFieldValue('title', event.detail.title);
        isUpdatingFormRef.current = false;
      }
    };

    const handleSubtitleUpdate = (event: CustomEvent) => {
      if (selectedWidget && event.detail.widgetId === selectedWidget.id) {
        isUpdatingFormRef.current = true;
        form.setFieldValue('subtitle', event.detail.subtitle);
        isUpdatingFormRef.current = false;
      }
    };

    window.addEventListener(
      'widget:title:updated',
      handleTitleUpdate as EventListener
    );
    window.addEventListener(
      'widget:subtitle:updated',
      handleSubtitleUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        'widget:title:updated',
        handleTitleUpdate as EventListener
      );
      window.removeEventListener(
        'widget:subtitle:updated',
        handleSubtitleUpdate as EventListener
      );
    };
  }, [selectedWidget?.id, form]);

  // Always initialize hooks unconditionally. Use `isVisible` later in render to shortcut UI.
  const [snapshotsList, setSnapshotsList] = useState<any[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<number | null>(
    null
  );
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [permEmail, setPermEmail] = useState('');
  const [permLoading, setPermLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('library');
  const [activeCategory, setActiveCategory] = useState('charts');
  const [searchQuery, setSearchQuery] = useState('');

  // Get selectedWidgetIds from Zustand store for debugging
  const selectedWidgetIds = useDashboardStore(
    (state: any) => state.selectedWidgetIds
  );
  const deselectAll = useDashboardStore((state: any) => state.deselectAll);

  // Also subscribe directly to the store's widget entry for the active widget id to ensure reactive updates
  const storeWidget = useDashboardStore((state: any) => {
    const activeId =
      selectedWidget?.id ||
      (selectedWidgetIds && selectedWidgetIds.length > 0
        ? selectedWidgetIds[0]
        : null);
    if (!activeId) return null;
    return state.widgets.find((w: any) => w.id === activeId) || null;
  });

  // Initialize form with current widget config from Zustand store (Single Source of Truth)
  useEffect(() => {
    // prefer storeWidget (subscribed to zustand) as the single source of truth for live updates
    const widgetToUse = storeWidget || selectedWidget;

    if (widgetToUse) {
      const widgetType =
        widgetToUse.config?.widgetType || widgetToUse.type || 'bar';

      const allProperties = {
        ...getDefaultConfig(widgetType),
        title: widgetToUse.title || '',
        subtitle: widgetToUse.subtitle || '',
        content: widgetToUse.content || '',
        ...(widgetToUse.config || {}),
        ...(widgetToUse.style || {}),
        behaviorClickable: widgetToUse.behavior?.clickable || false,
        behaviorHoverable: widgetToUse.behavior?.hoverable || false,
        behaviorSelectable: widgetToUse.behavior?.selectable || false,
        behaviorOnHover: widgetToUse.behavior?.onHover || 'highlight',
        behaviorOnClick: widgetToUse.behavior?.onClick || 'select',
        layoutShowOnMobile: widgetToUse.layout?.showOnMobile !== false,
        layoutShowOnTablet: widgetToUse.layout?.showOnTablet !== false,
        layoutShowOnDesktop: widgetToUse.layout?.showOnDesktop !== false,
        layoutBreakpointsXs: widgetToUse.layout?.breakpoints?.xs || undefined,
        layoutBreakpointsMd: widgetToUse.layout?.breakpoints?.md || undefined,
        layoutBreakpointsLg: widgetToUse.layout?.breakpoints?.lg || undefined,
        dataAutoRefresh: widgetToUse.data?.autoRefresh || false,
        dataRefreshInterval: widgetToUse.data?.refreshInterval || 0,
        dataCache: widgetToUse.data?.cache || false,
        dataCacheTimeout: widgetToUse.data?.cacheTimeout || 300,
      };

      try {
        const isInlineEditing =
          (window as any).__widgetInlineEditing &&
          (window as any).__widgetInlineEditing.id === widgetToUse.id;
        const isInlineEditingPending =
          (window as any).__widgetInlineEditingPending &&
          (window as any).__widgetInlineEditingPending.id === widgetToUse.id;
        if (isInlineEditing || isInlineEditingPending) {
        } else {
          // Merge only changed fields to avoid stomping user edits
          const currentValues = form.getFieldsValue(true) || {};
          const merged: any = { ...currentValues };
          let hasChanges = false;
          Object.keys(allProperties).forEach((k) => {
            // Only set if different to avoid unnecessary re-renders
            if (
              JSON.stringify(currentValues[k]) !==
              JSON.stringify(allProperties[k])
            ) {
              merged[k] = allProperties[k];
              hasChanges = true;
            }
          });
          if (hasChanges) {
            isUpdatingFormRef.current = true;
            form.setFieldsValue(merged);
            isUpdatingFormRef.current = false;
          }
        }
      } catch (err) {
        try {
          isUpdatingFormRef.current = true;
          form.setFieldsValue(allProperties);
          isUpdatingFormRef.current = false;
        } catch (e) {}
      }
      // also listen to global widget:update events to force immediate sync
      const onWidgetUpdated = (e: any) => {
        try {
          const detail = e.detail;
          if (!detail) return;
          if (detail.id === widgetToUse.id) {
            const payload = detail.widget || detail.changes || {};
            // Build nested payload to respect Form.Item names
            const nestedValues: any = {};
            if (payload.title) nestedValues.title = payload.title;
            if (payload.subtitle) nestedValues.subtitle = payload.subtitle;
            if (payload.content) nestedValues.content = payload.content;
            if (payload.config) nestedValues.config = payload.config;
            if (payload.style) nestedValues.style = payload.style;
            if (payload.behavior) nestedValues.behavior = payload.behavior;
            if (payload.layout) nestedValues.layout = payload.layout;
            if (payload.data) nestedValues.data = payload.data;
            // flat shortcuts
            nestedValues.behaviorClickable =
              payload.behavior?.clickable || false;
            nestedValues.behaviorHoverable =
              payload.behavior?.hoverable || false;
            nestedValues.behaviorSelectable =
              payload.behavior?.selectable || false;

            isUpdatingFormRef.current = true;
            form.setFieldsValue(nestedValues);
            isUpdatingFormRef.current = false;
          }
        } catch (err) {}
      };
      window.addEventListener(
        'widget:updated',
        onWidgetUpdated as EventListener
      );
      // cleanup
      return () => {
        try {
          window.removeEventListener(
            'widget:updated',
            onWidgetUpdated as EventListener
          );
        } catch (e) {}
      };
    } else {
      isUpdatingFormRef.current = true;
      form.resetFields();
      isUpdatingFormRef.current = false;
    }
  }, [storeWidget, selectedWidget?.id, form]);

  // Auto-switch to properties when widget is selected, back to library when deselected
  useEffect(() => {
    if (selectedWidget) {
      setActiveTab('properties');
    } else {
      setActiveTab('library');
    }
  }, [selectedWidget]);

  // Handle form changes from AntD Form. AntD calls onValuesChange with
  // (changedValues, allValues). We prefer to receive the changedValues and
  // construct a minimal update payload that merges nested objects (config,
  // style, behavior, layout, data) into the widget so updates apply in real-time
  // without stomping unrelated fields.
  // Deep merge helper for handleConfigUpdate
  const deepMerge = (target: any, source: any) => {
    const result = { ...target };
    Object.keys(source).forEach((key) => {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        result[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    });
    return result;
  };

  // Debounce pending changes to avoid stomping user typing (especially title/subtitle/content)
  const pendingChangesRef = React.useRef<any>({});
  const pendingTimeoutRef = React.useRef<number | null>(null);
  const TEXT_DEBOUNCE_KEYS = [
    'title',
    'subtitle',
    'content',
    'tooltipCustomFormatter',
  ];

  React.useEffect(() => {
    return () => {
      if (pendingTimeoutRef.current) {
        try {
          window.clearTimeout(pendingTimeoutRef.current as unknown as number);
        } catch (e) {}
        pendingTimeoutRef.current = null;
      }
    };
  }, []);

  const applyChanges = (changes: any) => {
    if (!selectedWidget) return;
    const updateData: any = {};
    const configUpdates: any = {};
    const styleUpdates: any = {};

    // Explicit list of properties that belong at the root of a Widget object
    const ROOT_PROPS = [
      'id',
      'type',
      'title',
      'subtitle',
      'content',
      'data',
      'config',
      'style',
      'behavior',
      'layout',
      'isVisible',
      'isLocked',
      'isResizable',
      'isDraggable',
      'dataSource',
      'query',
    ];

    Object.keys(changes).forEach((key) => {
      let value = changes[key];

      // Handle ColorPicker objects from AntD
      if (value && typeof value === 'object' && value.toHexString) {
        value = value.toHexString();
      }

      if (ROOT_PROPS.includes(key)) {
        // Direct root property - use deep merge for nested root props
        if (
          ['config', 'style', 'behavior', 'layout', 'data'].includes(key) &&
          typeof value === 'object'
        ) {
          updateData[key] = deepMerge(selectedWidget[key] || {}, value);
        } else {
          updateData[key] = value;
        }
      } else if (key.startsWith('behavior') && key !== 'behavior') {
        // Map behaviorClickable etc to behavior object
        const behaviorKey = key.replace('behavior', '');
        const normalizedKey =
          behaviorKey.charAt(0).toLowerCase() + behaviorKey.slice(1);
        updateData.behavior = deepMerge(
          updateData.behavior || selectedWidget.behavior || {},
          {
            [normalizedKey]: value,
          }
        );
      } else if (key.startsWith('layout') && key !== 'layout') {
        // Map layoutShowOnMobile etc to layout object
        if (key.includes('Breakpoints')) {
          const bpKey = key.replace('layoutBreakpoints', '').toLowerCase();
          updateData.layout = deepMerge(
            updateData.layout || selectedWidget.layout || {},
            {
              breakpoints: { [bpKey]: value },
            }
          );
        } else {
          let layoutKey = key.replace('layout', '');
          layoutKey = layoutKey.charAt(0).toLowerCase() + layoutKey.slice(1);
          updateData.layout = deepMerge(
            updateData.layout || selectedWidget.layout || {},
            {
              [layoutKey]: value,
            }
          );
        }
      } else if (
        [
          'padding',
          'margin',
          'backgroundColor',
          'borderColor',
          'borderRadius',
          'fontSize',
          'fontWeight',
          'color',
          'opacity',
          'boxShadow',
          'borderWidth',
        ].includes(key)
      ) {
        styleUpdates[key] = value;
      } else {
        // Everything else is considered part of the widget's config (Chart settings)
        configUpdates[key] = value;
      }
    });

    if (Object.keys(configUpdates).length > 0) {
      updateData.config = deepMerge(
        updateData.config || selectedWidget.config || {},
        configUpdates
      );
    }

    if (Object.keys(styleUpdates).length > 0) {
      updateData.style = deepMerge(
        updateData.style || selectedWidget.style || {},
        styleUpdates
      );
    }

    // Crucial: preserve chart type if it's missing in the update for any reason
    if (
      selectedWidget.config?.widgetType &&
      updateData.config &&
      !updateData.config.widgetType
    ) {
      updateData.config.widgetType = selectedWidget.config.widgetType;
    }

    if (Object.keys(updateData).length > 0) {
      onConfigUpdate?.(selectedWidget.id, updateData);
    }
  };

  const handleConfigUpdate = (changedValues: any) => {
    if (!selectedWidget || isUpdatingFormRef.current) return;
    const changes = changedValues || {};

    // Merge into pending changes
    pendingChangesRef.current = {
      ...(pendingChangesRef.current || {}),
      ...changes,
    };

    const hasTextKey = Object.keys(changes).some((k) =>
      TEXT_DEBOUNCE_KEYS.includes(k)
    );

    if (hasTextKey) {
      // debounce text keys to avoid interfering with typing
      if (pendingTimeoutRef.current) {
        try {
          window.clearTimeout(pendingTimeoutRef.current as unknown as number);
        } catch (e) {}
      }
      pendingTimeoutRef.current = window.setTimeout(() => {
        const toApply = pendingChangesRef.current;
        pendingChangesRef.current = {};
        pendingTimeoutRef.current = null;
        applyChanges(toApply);
      }, 500) as unknown as number;
    } else {
      // apply immediately for other keys
      applyChanges(changes);
    }
  };

  // SINGLE SOURCE OF TRUTH: All updates go through handleConfigUpdate
  // No separate style update needed - everything flows through Zustand store

  // Filter widgets based on search query
  const getFilteredWidgets = (category: string) => {
    const widgets =
      ENHANCED_WIDGET_CATEGORIES[
        category as keyof typeof ENHANCED_WIDGET_CATEGORIES
      ]?.widgets || [];
    if (!searchQuery) return widgets;
    return widgets.filter(
      (widget) =>
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
        items={Object.entries(ENHANCED_WIDGET_CATEGORIES).map(
          ([key, category]) => ({
            key,
            label: (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
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
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fill, minmax(80px, 1fr))',
                      gap: '6px',
                    }}
                  >
                    {getFilteredWidgets(key).map((widget) => (
                      <Tooltip
                        key={widget.type}
                        title={widget.tooltip}
                        placement="top"
                      >
                        <Card
                          size="small"
                          style={{
                            cursor: 'grab',
                            border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
                            background: isDarkMode ? '#1f1f1f' : '#ffffff',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease',
                            position: 'relative',
                          }}
                          hoverable
                          draggable
                          onClick={() => {
                            // Single click selects in panel; adding is done via drag or the + button
                            onWidgetSelect?.(widget);
                          }}
                          onDragStart={(e) => {
                            e.dataTransfer.setData(
                              'application/json',
                              JSON.stringify(widget)
                            );
                            e.dataTransfer.effectAllowed = 'copy';
                            // Add visual feedback
                            e.currentTarget.style.opacity = '0.5';
                          }}
                          onDragEnd={(e) => {
                            e.currentTarget.style.opacity = '1';
                          }}
                          // removed duplicate onClick to avoid handler conflicts
                          styles={{
                            body: {
                              padding: '8px',
                              textAlign: 'center',
                            },
                          }}
                        >
                          <div
                            style={{
                              color: isDarkMode ? '#ffffff' : '#000000',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '16px',
                                marginBottom: '4px',
                                color: category.color,
                              }}
                            >
                              {React.isValidElement(widget.icon) ? (
                                widget.icon
                              ) : (
                                <BarChartOutlined />
                              )}
                            </div>
                            <div
                              style={{
                                fontWeight: '500',
                                fontSize: '10px',
                                marginBottom: '2px',
                              }}
                            >
                              {widget.name}
                            </div>
                            {widget.popularity > 80 && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '4px',
                                  right: '4px',
                                  color: '#faad14',
                                  fontSize: '10px',
                                }}
                              >
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
            ),
          })
        )}
      />
    </div>
  );

  // Render Style Properties - NO DUPLICATIONS with Content tab
  const renderStyleProperties = () => {
    const items = [
      {
        key: 'appearance',
        label: 'Appearance',
        children: (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Background" name="backgroundColor">
                  <ColorPicker />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Border Color" name="borderColor">
                  <ColorPicker />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Border Width" name="borderWidth">
                  <InputNumber min={0} max={10} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Border Radius" name="borderRadius">
                  <InputNumber min={0} max={50} />
                </Form.Item>
              </Col>
            </Row>
          </>
        ),
      },
      {
        key: 'style_layout',
        label: 'Layout',
        children: (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Padding" name="padding">
                <InputNumber min={0} max={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Margin" name="margin">
                <InputNumber min={0} max={100} />
              </Form.Item>
            </Col>
          </Row>
        ),
      },
      {
        key: 'style_effects',
        label: 'Effects',
        children: (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Opacity" name="opacity">
                <Slider min={0} max={1} step={0.1} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Box Shadow" name="boxShadow">
                <Select>
                  <Option value="none">None</Option>
                  <Option value="small">Small</Option>
                  <Option value="medium">Medium</Option>
                  <Option value="large">Large</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        ),
      },
    ];

    return (
      <div>
        <Collapse size="small" ghost items={items} />
      </div>
    );
  };

  // Render Data Properties
  const renderDataProperties = () => (
    <div>
      <DataSourceConfig widget={selectedWidget} onUpdate={handleConfigUpdate} />

      <Divider />
      <div style={{ marginBottom: 12 }}>
        <Title level={5} style={{ margin: 0 }}>
          Snapshots
        </Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Bind saved snapshots to this widget
        </Text>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <Button
          size="small"
          onClick={async () => {
            try {
              const res = await fetch('/api/queries/snapshots', {
                credentials: 'include',
              });
              if (res.status === 403) {
                setPermissionModalVisible(true);
                return;
              }
              if (!res.ok) throw new Error('Failed to load');
              const j = await res.json();
              setSnapshotsList(Array.isArray(j.items) ? j.items : []);
              message.success('Snapshots loaded');
            } catch (e) {
              message.error('Failed to load snapshots');
            }
          }}
        >
          Load Snapshots
        </Button>
        <Select
          size="small"
          style={{ minWidth: 220 }}
          placeholder="Select snapshot to bind"
          value={selectedSnapshotId || undefined}
          onChange={(v) => setSelectedSnapshotId(v)}
          options={(snapshotsList || []).map((s) => ({
            value: s.id,
            label: `${s.name || 'snapshot-' + s.id} (${s.row_count || 0} rows)`,
          }))}
        />
        <Button
          size="small"
          type="primary"
          onClick={async () => {
            if (!selectedWidget)
              return message.warning('Select a widget first');
            if (!selectedSnapshotId)
              return message.warning('Select a snapshot');
            try {
              const confirmed = await new Promise<boolean>((resolve) => {
                Modal.confirm({
                  title: 'Bind Snapshot',
                  content:
                    'Bind selected snapshot to this widget? This can be undone.',
                  okText: 'Bind',
                  cancelText: 'Cancel',
                  onOk: () => resolve(true),
                  onCancel: () => resolve(false),
                });
              });
              if (!confirmed) return;

              const res = await fetch(
                `/api/queries/snapshots/${selectedSnapshotId}`,
                { credentials: 'include' }
              );
              if (res.status === 403) {
                setPermissionModalVisible(true);
                return;
              }
              if (!res.ok) throw new Error('Failed to fetch snapshot');
              const j = await res.json();
              const snap = j.snapshot;
              if (!snap) throw new Error('Snapshot empty');

              // Save previous state for undo
              const prevData = selectedWidget.data || {};

              // Bind snapshot to widget by updating widget data
              onConfigUpdate(selectedWidget.id, {
                data: {
                  snapshotId: snap.id,
                  rows: snap.rows,
                  columns: snap.columns,
                },
                dataSource: snap.data_source_id,
                query: snap.sql,
              });

              // Show undo option
              message.success({
                content: 'Snapshot bound to widget',
                duration: 5,
                onClose: undefined,
              });

              // Visual badge update: optimistic UI
              try {
                // if widget object has an id and we're using a live dashboard, persist widget change
                if (selectedWidget && selectedWidget.dashboardId) {
                  await fetch(
                    `/api/charts/builder/widget/${selectedWidget.id}`,
                    {
                      method: 'PUT',
                      credentials: 'include',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        data: {
                          snapshotId: snap.id,
                          rows: snap.rows,
                          columns: snap.columns,
                        },
                        dataSource: snap.data_source_id,
                        query: snap.sql,
                      }),
                    }
                  );
                }
              } catch (e) {
                // swallow persistence errors; user already has undo available
                console.warn('Failed to persist widget binding', e);
              }

              // Add Undo action via notification
              message.info({
                content: (
                  <span>
                    Bound.{' '}
                    <a
                      onClick={() => {
                        onConfigUpdate(selectedWidget.id, { data: prevData });
                        message.success('Undo complete');
                      }}
                    >
                      Undo
                    </a>
                  </span>
                ),
                duration: 8,
              });
            } catch (e: any) {
              console.error(e);
              message.error(e.message || 'Bind failed');
            }
          }}
        >
          Bind Snapshot
        </Button>
        <Button
          size="small"
          onClick={async () => {
            if (!selectedWidget)
              return message.warning('Select a widget first');
            const sid = selectedWidget.data?.snapshotId;
            if (!sid) return message.warning('Widget not bound to snapshot');
            try {
              const res = await fetch(`/api/queries/snapshots/${sid}`, {
                credentials: 'include',
              });
              if (res.status === 403) {
                setPermissionModalVisible(true);
                return;
              }
              if (!res.ok) throw new Error('Failed to fetch snapshot');
              const j = await res.json();
              const snap = j.snapshot;
              onConfigUpdate(selectedWidget.id, {
                data: {
                  snapshotId: snap.id,
                  rows: snap.rows,
                  columns: snap.columns,
                },
              });
              message.success('Snapshot refreshed');
            } catch (e: any) {
              console.error(e);
              message.error(e.message || 'Refresh failed');
            }
          }}
        >
          Refresh Snapshot
        </Button>
        <Button
          size="small"
          danger
          onClick={async () => {
            if (!selectedWidget)
              return message.warning('Select a widget first');
            const confirmed = await new Promise<boolean>((resolve) => {
              Modal.confirm({
                title: 'Unbind Snapshot',
                content:
                  'Are you sure you want to unbind the snapshot from this widget? This can be undone.',
                okText: 'Unbind',
                cancelText: 'Cancel',
                onOk: () => resolve(true),
                onCancel: () => resolve(false),
              });
            });
            if (!confirmed) return;

            // Save previous state for undo
            const prevData = selectedWidget.data || {};

            onConfigUpdate(selectedWidget.id, {
              data: { snapshotId: null, rows: [], columns: [] },
              dataSource: undefined,
              query: undefined,
            });
            message.success({
              content: 'Snapshot unbound',
              duration: 5,
            });
            message.info({
              content: (
                <span>
                  Unbound.{' '}
                  <a
                    onClick={() => {
                      onConfigUpdate(selectedWidget.id, {
                        data: prevData,
                      });
                      message.success('Undo complete');
                    }}
                  >
                    Undo
                  </a>
                </span>
              ),
              duration: 8,
            });
          }}
        >
          Unbind
        </Button>
      </div>
    </div>
  );

  // Render Behavior Properties
  const renderBehaviorProperties = () => {
    const items = [
      {
        key: 'interaction',
        label: 'Interaction & Behavior',
        children: (
          <>
            <Form.Item
              label="Clickable"
              name="behaviorClickable"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item
              label="Hoverable"
              name="behaviorHoverable"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item
              label="Selectable"
              name="behaviorSelectable"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item label="On Hover" name="behaviorOnHover">
              <Select>
                <Option value="highlight">Highlight</Option>
                <Option value="tooltip">Show Tooltip</Option>
                <Option value="none">None</Option>
              </Select>
            </Form.Item>
            <Form.Item label="On Click" name="behaviorOnClick">
              <Select>
                <Option value="select">Select</Option>
                <Option value="drill">Drill Down</Option>
                <Option value="navigate">Navigate</Option>
                <Option value="none">None</Option>
              </Select>
            </Form.Item>
          </>
        ),
      },
      {
        key: 'visibility',
        label: 'Visibility & Display',
        children: (
          <>
            <Form.Item label="Visible" name="isVisible" valuePropName="checked">
              <Switch size="small" />
            </Form.Item>
            <Form.Item
              label="Show on Mobile"
              name="layoutShowOnMobile"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item
              label="Show on Tablet"
              name="layoutShowOnTablet"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item
              label="Show on Desktop"
              name="layoutShowOnDesktop"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item label="Locked" name="isLocked" valuePropName="checked">
              <Switch size="small" />
            </Form.Item>
          </>
        ),
      },
      {
        key: 'data-refresh',
        label: 'Data & Refresh',
        children: (
          <>
            <Form.Item
              label="Auto Refresh"
              name="dataAutoRefresh"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item label="Refresh Interval" name="dataRefreshInterval">
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
            <Form.Item
              label="Cache Data"
              name="dataCache"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item label="Cache Timeout" name="dataCacheTimeout">
              <InputNumber min={60} max={3600} placeholder="seconds" />
            </Form.Item>
          </>
        ),
      },
      {
        key: 'responsive',
        label: 'Responsive Behavior',
        children: (
          <>
            <Form.Item
              label="Responsive"
              name="responsive"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item
              label="Draggable"
              name="draggable"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item
              label="Resizable"
              name="resizable"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item label="Breakpoint - Mobile">
              <Input.Group compact>
                <Form.Item name={['layout', 'breakpoints', 'xs', 'w']} noStyle>
                  <InputNumber
                    placeholder="W"
                    min={1}
                    max={12}
                    style={{ width: '50%' }}
                  />
                </Form.Item>
                <Form.Item name={['layout', 'breakpoints', 'xs', 'h']} noStyle>
                  <InputNumber
                    placeholder="H"
                    min={1}
                    max={20}
                    style={{ width: '50%' }}
                  />
                </Form.Item>
              </Input.Group>
            </Form.Item>
            <Form.Item label="Breakpoint - Tablet">
              <Input.Group compact>
                <Form.Item name={['layout', 'breakpoints', 'md', 'w']} noStyle>
                  <InputNumber
                    placeholder="W"
                    min={1}
                    max={12}
                    style={{ width: '50%' }}
                  />
                </Form.Item>
                <Form.Item name={['layout', 'breakpoints', 'md', 'h']} noStyle>
                  <InputNumber
                    placeholder="H"
                    min={1}
                    max={20}
                    style={{ width: '50%' }}
                  />
                </Form.Item>
              </Input.Group>
            </Form.Item>
            <Form.Item label="Breakpoint - Desktop">
              <Input.Group compact>
                <Form.Item name={['layout', 'breakpoints', 'lg', 'w']} noStyle>
                  <InputNumber
                    placeholder="W"
                    min={1}
                    max={12}
                    style={{ width: '50%' }}
                  />
                </Form.Item>
                <Form.Item name={['layout', 'breakpoints', 'lg', 'h']} noStyle>
                  <InputNumber
                    placeholder="H"
                    min={1}
                    max={20}
                    style={{ width: '50%' }}
                  />
                </Form.Item>
              </Input.Group>
            </Form.Item>
          </>
        ),
      },
    ];

    return (
      <div>
        <Collapse size="small" ghost items={items} />
      </div>
    );
  };

  // Render Properties Tab
  const renderProperties = () => {
    if (!selectedWidget) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '400px',
            color: isDarkMode ? '#666' : '#999',
          }}
        >
          <AppstoreOutlined
            style={{ fontSize: '48px', marginBottom: '16px' }}
          />
          <Title level={4} style={{ color: isDarkMode ? '#666' : '#999' }}>
            Select a Widget
          </Title>
          <Text style={{ color: isDarkMode ? '#666' : '#999' }}>
            Choose a widget from the library to configure its properties
          </Text>
        </div>
      );
    }

    // FORCE RE-RENDER: Clear any cached content and show widget properties

    return (
      <div style={{ height: '100%', overflow: 'auto' }}>
        {/* DEBUG: Visual indicator that renderProperties is working */}
        <div
          style={{
            background: '#52c41a',
            color: 'white',
            padding: '8px',
            marginBottom: '16px',
            borderRadius: '4px',
            fontSize: '12px',
          }}
        >
          ✅ PROPERTIES PANEL WORKING - Widget: (ID: {selectedWidget.id})
        </div>

        {/* Widget Header */}
        <div
          style={{
            padding: '16px',
            borderBottom: `1px solid ${isDarkMode ? '#333' : '#f0f0f0'}`,
            marginBottom: '16px',
          }}
        >
          <Title level={5} style={{ margin: 0, marginBottom: '8px' }}>
            Properties
          </Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Configure the properties for your {selectedWidget.type} widget
          </Text>
        </div>

        {/* Properties Form */}
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleConfigUpdate}
          style={{ padding: '0 16px' }}
        >
          {/* Content Tab */}
          <Collapse
            defaultActiveKey={['content']}
            size="small"
            style={{ marginBottom: '16px' }}
            items={[
              {
                key: 'content',
                label: (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <FileTextOutlined />
                    <span>Content</span>
                  </span>
                ),
                children: renderContentProperties(),
              },
              {
                key: 'style',
                label: (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <BgColorsOutlined />
                    <span>Style</span>
                  </span>
                ),
                children: renderStyleProperties(),
              },
              {
                key: 'data',
                label: (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <DatabaseOutlined />
                    <span>Data</span>
                  </span>
                ),
                children: renderDataProperties(),
              },
              {
                key: 'behavior',
                label: (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <SettingOutlined />
                    <span>Behavior</span>
                  </span>
                ),
                children: renderBehaviorProperties(),
              },
            ]}
          />
        </Form>
      </div>
    );
  };

  // Render Style Properties - NO DUPLICATIONS with Content tab

  // Render Content Properties based on widget type
  const renderContentProperties = () => {
    if (!selectedWidget) return null;

    switch (selectedWidget.type) {
      case 'chart':
      case 'bar':
      case 'line':
      case 'pie':
      case 'area':
      case 'scatter':
      case 'radar':
      case 'heatmap':
      case 'funnel':
      case 'gauge':
        return renderChartContentProperties();

      case 'table':
      case 'pivot':
        return (
          <div>
            <Collapse
              size="small"
              ghost
              items={[
                {
                  key: 'table-config',
                  label: 'Table',
                  children: (
                    <>
                      <Row gutter={[8, 4]}>
                        <Col span={24}>
                          <Form.Item
                            label="Table Title"
                            name={['config', 'title', 'text']}
                            style={{
                              marginBottom: '8px',
                            }}
                          >
                            <Input placeholder="Enter table title" />
                          </Form.Item>
                        </Col>
                        <Col span={24}>
                          <Form.Item
                            label="Data Source"
                            name="dataSource"
                            style={{
                              marginBottom: '8px',
                            }}
                          >
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
                          <Form.Item
                            label="Show Pagination"
                            name={['config', 'pagination']}
                            valuePropName="checked"
                            style={{
                              marginBottom: '8px',
                            }}
                          >
                            <Switch size="small" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            label="Page Size"
                            name={['config', 'pageSize']}
                            style={{
                              marginBottom: '8px',
                            }}
                          >
                            <InputNumber
                              min={5}
                              max={100}
                              defaultValue={10}
                              size="small"
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Row gutter={[8, 4]}>
                        <Col span={8}>
                          <Form.Item
                            label="Border"
                            name={['config', 'showBorder']}
                            valuePropName="checked"
                            style={{
                              marginBottom: '8px',
                            }}
                          >
                            <Switch size="small" />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item
                            label="Striped"
                            name={['config', 'striped']}
                            valuePropName="checked"
                            style={{
                              marginBottom: '8px',
                            }}
                          >
                            <Switch size="small" />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item
                            label="Hover"
                            name={['config', 'hoverable']}
                            valuePropName="checked"
                            style={{
                              marginBottom: '8px',
                            }}
                          >
                            <Switch size="small" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </>
                  ),
                },
                {
                  key: 'table-columns',
                  label: 'Columns & Sorting',
                  children: (
                    <>
                      <Form.Item
                        label="Sortable"
                        name={['config', 'sortable']}
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                      <Form.Item
                        label="Filterable"
                        name={['config', 'filterable']}
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                      <Form.Item
                        label="Column Width"
                        name={['config', 'columnWidth']}
                      >
                        <Select placeholder="Select width mode">
                          <Option value="auto">Auto</Option>
                          <Option value="fixed">Fixed</Option>
                          <Option value="responsive">Responsive</Option>
                        </Select>
                      </Form.Item>
                    </>
                  ),
                },
              ]}
            />
          </div>
        );

      case 'kpi':
      case 'metric':
        return (
          <div>
            <Collapse
              size="small"
              ghost
              items={[
                {
                  key: 'metric-config',
                  label: 'Metric',
                  children: (
                    <>
                      <Row gutter={[8, 4]}>
                        <Col span={24}>
                          <Form.Item
                            label="Metric Title"
                            name={['config', 'title', 'text']}
                            style={{
                              marginBottom: '8px',
                            }}
                          >
                            <Input placeholder="Enter metric title" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            label="Value"
                            name={['config', 'value']}
                            style={{
                              marginBottom: '8px',
                            }}
                          >
                            <Input placeholder="Enter metric value" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            label="Format"
                            name={['config', 'format']}
                            style={{
                              marginBottom: '8px',
                            }}
                          >
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
                          <Form.Item
                            label="Prefix"
                            name={['config', 'prefix']}
                            style={{
                              marginBottom: '8px',
                            }}
                          >
                            <Input placeholder="e.g., $, €" />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item
                            label="Suffix"
                            name={['config', 'suffix']}
                            style={{
                              marginBottom: '8px',
                            }}
                          >
                            <Input placeholder="e.g., %, K, M" />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item
                            label="Show Trend"
                            name={['config', 'showTrend']}
                            valuePropName="checked"
                            style={{
                              marginBottom: '8px',
                            }}
                          >
                            <Switch size="small" />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Row gutter={[8, 4]}>
                        <Col span={24}>
                          <Form.Item
                            label="Trend Value"
                            name={['config', 'trendValue']}
                            style={{
                              marginBottom: '8px',
                            }}
                          >
                            <Input placeholder="e.g., +12.5%" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </>
                  ),
                },
                {
                  key: 'metric-display',
                  label: 'Display',
                  children: (
                    <>
                      <Form.Item
                        label="Value Size"
                        name={['style', 'fontSize']}
                      >
                        <InputNumber min={12} max={72} />
                      </Form.Item>
                      <Form.Item label="Value Color" name={['style', 'color']}>
                        <ColorPicker />
                      </Form.Item>
                      <Form.Item
                        label="Alignment"
                        name={['style', 'textAlign']}
                      >
                        <Select>
                          <Option value="left">Left</Option>
                          <Option value="center">Center</Option>
                          <Option value="right">Right</Option>
                        </Select>
                      </Form.Item>
                    </>
                  ),
                },
              ]}
            />
          </div>
        );

      case 'text':
        return (
          <div>
            <Collapse
              size="small"
              ghost
              items={[
                {
                  key: 'text-content',
                  label: 'Text Content',
                  children: (
                    <>
                      <Form.Item label="Content" name={['config', 'content']}>
                        <TextArea
                          rows={6}
                          placeholder="Enter text content..."
                        />
                      </Form.Item>
                      <Form.Item
                        label="Rich Text"
                        name={['config', 'richText']}
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </>
                  ),
                },
                {
                  key: 'text-typography',
                  label: 'Typography',
                  children: (
                    <>
                      <Form.Item
                        label="Font Family"
                        name={['style', 'fontFamily']}
                      >
                        <Select placeholder="Select font">
                          <Option value="Arial">Arial</Option>
                          <Option value="Helvetica">Helvetica</Option>
                          <Option value="Times New Roman">
                            Times New Roman
                          </Option>
                          <Option value="Georgia">Georgia</Option>
                          <Option value="Verdana">Verdana</Option>
                          <Option value="system-ui">System UI</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item label="Font Size" name={['style', 'fontSize']}>
                        <InputNumber min={8} max={72} />
                      </Form.Item>
                      <Form.Item
                        label="Font Weight"
                        name={['style', 'fontWeight']}
                      >
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
                      <Form.Item
                        label="Text Alignment"
                        name={['style', 'textAlign']}
                      >
                        <Select>
                          <Option value="left">Left</Option>
                          <Option value="center">Center</Option>
                          <Option value="right">Right</Option>
                          <Option value="justify">Justify</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item
                        label="Line Height"
                        name={['style', 'lineHeight']}
                      >
                        <InputNumber min={0.5} max={3} step={0.1} />
                      </Form.Item>
                    </>
                  ),
                },
              ]}
            />
          </div>
        );

      case 'markdown':
        return (
          <div>
            <Collapse
              size="small"
              ghost
              items={[
                {
                  key: 'markdown-content',
                  label: 'Markdown Content',
                  children: (
                    <>
                      <Form.Item
                        label="Markdown Content"
                        name={['config', 'content']}
                      >
                        <TextArea
                          rows={8}
                          placeholder="# Markdown Content&#10;&#10;Add your markdown here..."
                        />
                      </Form.Item>
                      <Form.Item
                        label="Enable HTML"
                        name={['config', 'enableHtml']}
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                      <Form.Item
                        label="Syntax Highlighting"
                        name={['config', 'syntaxHighlight']}
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </>
                  ),
                },
                {
                  key: 'markdown-rendering',
                  label: 'Rendering',
                  children: (
                    <>
                      <Form.Item
                        label="Code Theme"
                        name={['config', 'codeTheme']}
                      >
                        <Select placeholder="Select theme">
                          <Option value="default">Default</Option>
                          <Option value="github">GitHub</Option>
                          <Option value="monokai">Monokai</Option>
                          <Option value="solarized">Solarized</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item
                        label="Table Styling"
                        name={['config', 'tableStyle']}
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                      <Form.Item
                        label="Link Styling"
                        name={['config', 'linkStyle']}
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </>
                  ),
                },
              ]}
            />
          </div>
        );

      case 'image':
        return (
          <div>
            <Collapse
              size="small"
              ghost
              items={[
                {
                  key: 'image-config',
                  label: 'Image',
                  children: (
                    <>
                      <Form.Item
                        label="Image URL"
                        name={['config', 'imageUrl']}
                      >
                        <Input placeholder="Enter image URL or upload" />
                      </Form.Item>
                      <Form.Item label="Alt Text" name={['config', 'altText']}>
                        <Input placeholder="Enter alt text for accessibility" />
                      </Form.Item>
                      <Form.Item label="Fit Mode" name={['config', 'fitMode']}>
                        <Select placeholder="Select fit mode">
                          <Option value="contain">
                            Contain (fit within bounds)
                          </Option>
                          <Option value="cover">Cover (fill bounds)</Option>
                          <Option value="fill">Fill (stretch to fit)</Option>
                          <Option value="scale-down">Scale Down</Option>
                          <Option value="none">None (original size)</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item
                        label="Lazy Loading"
                        name={['config', 'lazy']}
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </>
                  ),
                },
                {
                  key: 'image-display',
                  label: 'Display',
                  children: (
                    <>
                      <Form.Item
                        label="Border Radius"
                        name={['style', 'borderRadius']}
                      >
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
                    </>
                  ),
                },
              ]}
            />
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

  // Get default configuration for widget type
  // const getDefaultConfig = (widgetType: string) => {
  //   const defaults: Record<string, any> = {
  //     bar: {
  //       // Title & Subtitle
  //       title: 'Bar Chart',
  //       subtitle: 'Professional visualization',

  //       // Visual Configuration
  //       colorPalette: 'default',
  //       theme: 'auto',
  //       legendShow: true,
  //       legendPosition: 'top',
  //       tooltipShow: true,
  //       tooltipTrigger: 'axis',
  //       tooltipFormatter: 'default',
  //       tooltipCustomFormatter: '',
  //       animation: true,
  //       animationDuration: 1000,
  //       seriesLabelShow: false,
  //       seriesLabelPosition: 'top',

  //       // Data Configuration
  //       xAxisField: 'category',
  //       yAxisField: 'value',
  //       seriesField: 'auto',
  //       dataLimit: 1000,
  //       showXAxis: true,
  //       showYAxis: true,
  //       dataLabelsShow: false,
  //       dataLabelsFormat: 'auto',

  //       // Layout & Positioning
  //       responsive: true,
  //       draggable: true,
  //       resizable: true,
  //       backgroundColor: 'transparent',
  //       borderColor: '#d9d9d9',
  //       padding: 16,
  //       margin: 8,

  //       // Typography
  //       fontFamily: 'Arial',
  //       fontSize: 12,
  //       fontWeight: 'normal',
  //       textColor: '#000000',

  //       // Effects & Animation
  //       animationType: 'fadeIn',
  //       animationDelay: 0,
  //       shadowEffect: false,
  //       glowEffect: false,

  //       // Advanced
  //       customOptions: '',
  //       performanceMode: false,
  //       autoResize: true,
  //       lazyLoading: false,

  //       // Data Zoom
  //       dataZoomShow: false,
  //       dataZoomType: 'inside',
  //       dataZoomStart: 0,
  //       dataZoomEnd: 100,

  //       // Mark Points & Lines
  //       markPointShow: false,
  //       markLineShow: false,
  //       markPointMax: false,
  //       markPointMin: false,
  //       markLineAverage: false,

  //       // Brush Selection
  //       brushShow: false,
  //       brushType: 'rect',

  //       // Visual Mapping
  //       visualMapShow: false,
  //       visualMapDimension: '0',
  //       visualMapMin: undefined,
  //       visualMapMax: undefined,

  //       // Accessibility
  //       ariaEnabled: true,
  //       ariaLabel: 'Bar chart showing data values',
  //     },
  //     line: {
  //       // Title & Subtitle
  //       title: 'Line Chart',
  //       subtitle: 'Trend visualization',

  //       // Visual Configuration
  //       colorPalette: 'default',
  //       theme: 'auto',
  //       legendShow: true,
  //       legendPosition: 'top',
  //       tooltipShow: true,
  //       tooltipTrigger: 'axis',
  //       tooltipFormatter: 'default',
  //       tooltipCustomFormatter: '',
  //       animation: true,
  //       animationDuration: 1000,
  //       seriesLabelShow: false,
  //       seriesLabelPosition: 'top',

  //       // Data Configuration
  //       xAxisField: 'time',
  //       yAxisField: 'value',
  //       seriesField: 'auto',
  //       dataLimit: 1000,
  //       showXAxis: true,
  //       showYAxis: true,
  //       dataLabelsShow: false,
  //       dataLabelsFormat: 'auto',

  //       // Layout & Positioning
  //       responsive: true,
  //       draggable: true,
  //       resizable: true,
  //       backgroundColor: 'transparent',
  //       borderColor: '#d9d9d9',
  //       padding: 16,
  //       margin: 8,

  //       // Typography
  //       fontFamily: 'Arial',
  //       fontSize: 12,
  //       fontWeight: 'normal',
  //       textColor: '#000000',

  //       // Effects & Animation
  //       animationType: 'fadeIn',
  //       animationDelay: 0,
  //       shadowEffect: false,
  //       glowEffect: false,

  //       // Advanced
  //       customOptions: '',
  //       performanceMode: false,
  //       autoResize: true,
  //       lazyLoading: false,

  //       // Data Zoom
  //       dataZoomShow: true,
  //       dataZoomType: 'inside',
  //       dataZoomStart: 0,
  //       dataZoomEnd: 100,

  //       // Mark Points & Lines
  //       markPointShow: true,
  //       markLineShow: true,
  //       markPointMax: true,
  //       markPointMin: true,
  //       markLineAverage: true,

  //       // Brush Selection
  //       brushShow: false,
  //       brushType: 'rect',

  //       // Visual Mapping
  //       visualMapShow: false,
  //       visualMapDimension: '0',
  //       visualMapMin: undefined,
  //       visualMapMax: undefined,

  //       // Accessibility
  //       ariaEnabled: true,
  //       ariaLabel: 'Line chart showing trend data',
  //     },
  //     pie: {
  //       // Title & Subtitle
  //       title: 'Pie Chart',
  //       subtitle: 'Proportion visualization',

  //       // Visual Configuration
  //       colorPalette: 'default',
  //       theme: 'auto',
  //       legendShow: true,
  //       legendPosition: 'right',
  //       tooltipShow: true,
  //       tooltipTrigger: 'item',
  //       tooltipFormatter: 'percentage',
  //       tooltipCustomFormatter: '{b}: {d}%',
  //       animation: true,
  //       animationDuration: 1000,
  //       seriesLabelShow: true,
  //       seriesLabelPosition: 'outside',

  //       // Data Configuration
  //       xAxisField: 'category',
  //       yAxisField: 'value',
  //       seriesField: 'auto',
  //       dataLimit: 1000,
  //       showXAxis: false,
  //       showYAxis: false,
  //       dataLabelsShow: true,
  //       dataLabelsFormat: 'percentage',

  //       // Layout & Positioning
  //       responsive: true,
  //       draggable: true,
  //       resizable: true,
  //       backgroundColor: 'transparent',
  //       borderColor: '#d9d9d9',
  //       padding: 16,
  //       margin: 8,

  //       // Typography
  //       fontFamily: 'Arial',
  //       fontSize: 12,
  //       fontWeight: 'normal',
  //       textColor: '#000000',

  //       // Effects & Animation
  //       animationType: 'fadeIn',
  //       animationDelay: 0,
  //       shadowEffect: false,
  //       glowEffect: false,

  //       // Advanced
  //       customOptions: '',
  //       performanceMode: false,
  //       autoResize: true,
  //       lazyLoading: false,

  //       // Data Zoom
  //       dataZoomShow: false,
  //       dataZoomType: 'inside',
  //       dataZoomStart: 0,
  //       dataZoomEnd: 100,

  //       // Mark Points & Lines
  //       markPointShow: false,
  //       markLineShow: false,
  //       markPointMax: false,
  //       markPointMin: false,
  //       markLineAverage: false,

  //       // Brush Selection
  //       brushShow: false,
  //       brushType: 'rect',

  //       // Visual Mapping
  //       visualMapShow: false,
  //       visualMapDimension: '0',
  //       visualMapMin: undefined,
  //       visualMapMax: undefined,

  //       // Accessibility
  //       ariaEnabled: true,
  //       ariaLabel: 'Pie chart showing data proportions',
  //     },
  //     area: {
  //       // Title & Subtitle
  //       title: 'Area Chart',
  //       subtitle: 'Area visualization',

  //       // Visual Configuration
  //       colorPalette: 'default',
  //       theme: 'auto',
  //       legendShow: true,
  //       legendPosition: 'top',
  //       tooltipShow: true,
  //       tooltipTrigger: 'axis',
  //       tooltipFormatter: 'default',
  //       tooltipCustomFormatter: '',
  //       animation: true,
  //       animationDuration: 1000,
  //       seriesLabelShow: false,
  //       seriesLabelPosition: 'top',

  //       // Data Configuration
  //       xAxisField: 'time',
  //       yAxisField: 'value',
  //       seriesField: 'auto',
  //       dataLimit: 1000,
  //       showXAxis: true,
  //       showYAxis: true,
  //       dataLabelsShow: false,
  //       dataLabelsFormat: 'auto',

  //       // Layout & Positioning
  //       responsive: true,
  //       draggable: true,
  //       resizable: true,
  //       backgroundColor: 'transparent',
  //       borderColor: '#d9d9d9',
  //       padding: 16,
  //       margin: 8,

  //       // Typography
  //       fontFamily: 'Arial',
  //       fontSize: 12,
  //       fontWeight: 'normal',
  //       textColor: '#000000',

  //       // Effects & Animation
  //       animationType: 'fadeIn',
  //       animationDelay: 0,
  //       shadowEffect: false,
  //       glowEffect: false,

  //       // Advanced
  //       customOptions: '',
  //       performanceMode: false,
  //       autoResize: true,
  //       lazyLoading: false,

  //       // Data Zoom
  //       dataZoomShow: true,
  //       dataZoomType: 'inside',
  //       dataZoomStart: 0,
  //       dataZoomEnd: 100,

  //       // Mark Points & Lines
  //       markPointShow: false,
  //       markLineShow: false,
  //       markPointMax: false,
  //       markPointMin: false,
  //       markLineAverage: false,

  //       // Brush Selection
  //       brushShow: false,
  //       brushType: 'rect',

  //       // Visual Mapping
  //       visualMapShow: false,
  //       visualMapDimension: '0',
  //       visualMapMin: undefined,
  //       visualMapMax: undefined,

  //       // Accessibility
  //       ariaEnabled: true,
  //       ariaLabel: 'Area chart showing filled data visualization',
  //     },
  //     scatter: {
  //       // Title & Subtitle
  //       title: 'Scatter Plot',
  //       subtitle: 'Correlation visualization',

  //       // Visual Configuration
  //       colorPalette: 'default',
  //       theme: 'auto',
  //       legendShow: true,
  //       legendPosition: 'top',
  //       tooltipShow: true,
  //       tooltipTrigger: 'item',
  //       tooltipFormatter: 'default',
  //       tooltipCustomFormatter: '',
  //       animation: true,
  //       animationDuration: 1000,
  //       seriesLabelShow: false,
  //       seriesLabelPosition: 'top',

  //       // Data Configuration
  //       xAxisField: 'x',
  //       yAxisField: 'y',
  //       seriesField: 'auto',
  //       dataLimit: 1000,
  //       showXAxis: true,
  //       showYAxis: true,
  //       dataLabelsShow: false,
  //       dataLabelsFormat: 'auto',

  //       // Layout & Positioning
  //       responsive: true,
  //       draggable: true,
  //       resizable: true,
  //       backgroundColor: 'transparent',
  //       borderColor: '#d9d9d9',
  //       padding: 16,
  //       margin: 8,

  //       // Typography
  //       fontFamily: 'Arial',
  //       fontSize: 12,
  //       fontWeight: 'normal',
  //       textColor: '#000000',

  //       // Effects & Animation
  //       animationType: 'fadeIn',
  //       animationDelay: 0,
  //       shadowEffect: false,
  //       glowEffect: false,

  //       // Advanced
  //       customOptions: '',
  //       performanceMode: false,
  //       autoResize: true,
  //       lazyLoading: false,

  //       // Data Zoom
  //       dataZoomShow: true,
  //       dataZoomType: 'inside',
  //       dataZoomStart: 0,
  //       dataZoomEnd: 100,

  //       // Mark Points & Lines
  //       markPointShow: false,
  //       markLineShow: false,
  //       markPointMax: false,
  //       markPointMin: false,
  //       markLineAverage: false,

  //       // Brush Selection
  //       brushShow: true,
  //       brushType: 'rect',

  //       // Visual Mapping
  //       visualMapShow: false,
  //       visualMapDimension: '0',
  //       visualMapMin: undefined,
  //       visualMapMax: undefined,

  //       // Accessibility
  //       ariaEnabled: true,
  //       ariaLabel: 'Scatter plot showing data correlation',
  //     },
  //     radar: {
  //       // Title & Subtitle
  //       title: 'Radar Chart',
  //       subtitle: 'Multi-dimensional visualization',

  //       // Visual Configuration
  //       colorPalette: 'default',
  //       theme: 'auto',
  //       legendShow: true,
  //       legendPosition: 'top',
  //       tooltipShow: true,
  //       tooltipTrigger: 'item',
  //       tooltipFormatter: 'default',
  //       tooltipCustomFormatter: '',
  //       animation: true,
  //       animationDuration: 1000,
  //       seriesLabelShow: false,
  //       seriesLabelPosition: 'top',

  //       // Data Configuration
  //       xAxisField: 'category',
  //       yAxisField: 'value',
  //       seriesField: 'auto',
  //       dataLimit: 1000,
  //       showXAxis: false,
  //       showYAxis: false,
  //       dataLabelsShow: false,
  //       dataLabelsFormat: 'auto',

  //       // Layout & Positioning
  //       responsive: true,
  //       draggable: true,
  //       resizable: true,
  //       backgroundColor: 'transparent',
  //       borderColor: '#d9d9d9',
  //       padding: 16,
  //       margin: 8,

  //       // Typography
  //       fontFamily: 'Arial',
  //       fontSize: 12,
  //       fontWeight: 'normal',
  //       textColor: '#000000',

  //       // Effects & Animation
  //       animationType: 'fadeIn',
  //       animationDelay: 0,
  //       shadowEffect: false,
  //       glowEffect: false,

  //       // Advanced
  //       customOptions: '',
  //       performanceMode: false,
  //       autoResize: true,
  //       lazyLoading: false,

  //       // Data Zoom
  //       dataZoomShow: false,
  //       dataZoomType: 'inside',
  //       dataZoomStart: 0,
  //       dataZoomEnd: 100,

  //       // Mark Points & Lines
  //       markPointShow: false,
  //       markLineShow: false,
  //       markPointMax: false,
  //       markPointMin: false,
  //       markLineAverage: false,

  //       // Brush Selection
  //       brushShow: false,
  //       brushType: 'rect',

  //       // Visual Mapping
  //       visualMapShow: false,
  //       visualMapDimension: '0',
  //       visualMapMin: undefined,
  //       visualMapMax: undefined,

  //       // Accessibility
  //       ariaEnabled: true,
  //       ariaLabel: 'Radar chart showing multi-dimensional data',
  //     },
  //     heatmap: {
  //       // Title & Subtitle
  //       title: 'Heatmap',
  //       subtitle: 'Density visualization',

  //       // Visual Configuration
  //       colorPalette: 'default',
  //       theme: 'auto',
  //       legendShow: true,
  //       legendPosition: 'right',
  //       tooltipShow: true,
  //       tooltipTrigger: 'item',
  //       tooltipFormatter: 'default',
  //       tooltipCustomFormatter: '',
  //       animation: true,
  //       animationDuration: 1000,
  //       seriesLabelShow: false,
  //       seriesLabelPosition: 'top',

  //       // Data Configuration
  //       xAxisField: 'x',
  //       yAxisField: 'y',
  //       seriesField: 'value',
  //       dataLimit: 1000,
  //       showXAxis: true,
  //       showYAxis: true,
  //       dataLabelsShow: false,
  //       dataLabelsFormat: 'auto',

  //       // Layout & Positioning
  //       responsive: true,
  //       draggable: true,
  //       resizable: true,
  //       backgroundColor: 'transparent',
  //       borderColor: '#d9d9d9',
  //       padding: 16,
  //       margin: 8,

  //       // Typography
  //       fontFamily: 'Arial',
  //       fontSize: 12,
  //       fontWeight: 'normal',
  //       textColor: '#000000',

  //       // Effects & Animation
  //       animationType: 'fadeIn',
  //       animationDelay: 0,
  //       shadowEffect: false,
  //       glowEffect: false,

  //       // Advanced
  //       customOptions: '',
  //       performanceMode: false,
  //       autoResize: true,
  //       lazyLoading: false,

  //       // Data Zoom
  //       dataZoomShow: true,
  //       dataZoomType: 'inside',
  //       dataZoomStart: 0,
  //       dataZoomEnd: 100,

  //       // Mark Points & Lines
  //       markPointShow: false,
  //       markLineShow: false,
  //       markPointMax: false,
  //       markPointMin: false,
  //       markLineAverage: false,

  //       // Brush Selection
  //       brushShow: true,
  //       brushType: 'rect',

  //       // Visual Mapping
  //       visualMapShow: true,
  //       visualMapDimension: '2',
  //       visualMapMin: 0,
  //       visualMapMax: 100,

  //       // Accessibility
  //       ariaEnabled: true,
  //       ariaLabel: 'Heatmap showing data density',
  //     },
  //     funnel: {
  //       // Title & Subtitle
  //       title: 'Funnel Chart',
  //       subtitle: 'Conversion visualization',

  //       // Visual Configuration
  //       colorPalette: 'default',
  //       theme: 'auto',
  //       legendShow: true,
  //       legendPosition: 'top',
  //       tooltipShow: true,
  //       tooltipTrigger: 'item',
  //       tooltipFormatter: 'percentage',
  //       tooltipCustomFormatter: '{b}: {d}%',
  //       animation: true,
  //       animationDuration: 1000,
  //       seriesLabelShow: true,
  //       seriesLabelPosition: 'inside',

  //       // Data Configuration
  //       xAxisField: 'category',
  //       yAxisField: 'value',
  //       seriesField: 'auto',
  //       dataLimit: 1000,
  //       showXAxis: false,
  //       showYAxis: false,
  //       dataLabelsShow: true,
  //       dataLabelsFormat: 'percentage',

  //       // Layout & Positioning
  //       responsive: true,
  //       draggable: true,
  //       resizable: true,
  //       backgroundColor: 'transparent',
  //       borderColor: '#d9d9d9',
  //       padding: 16,
  //       margin: 8,

  //       // Typography
  //       fontFamily: 'Arial',
  //       fontSize: 12,
  //       fontWeight: 'normal',
  //       textColor: '#000000',

  //       // Effects & Animation
  //       animationType: 'fadeIn',
  //       animationDelay: 0,
  //       shadowEffect: false,
  //       glowEffect: false,

  //       // Advanced
  //       customOptions: '',
  //       performanceMode: false,
  //       autoResize: true,
  //       lazyLoading: false,

  //       // Data Zoom
  //       dataZoomShow: false,
  //       dataZoomType: 'inside',
  //       dataZoomStart: 0,
  //       dataZoomEnd: 100,

  //       // Mark Points & Lines
  //       markPointShow: false,
  //       markLineShow: false,
  //       markPointMax: false,
  //       markPointMin: false,
  //       markLineAverage: false,

  //       // Brush Selection
  //       brushShow: false,
  //       brushType: 'rect',

  //       // Visual Mapping
  //       visualMapShow: false,
  //       visualMapDimension: '0',
  //       visualMapMin: undefined,
  //       visualMapMax: undefined,

  //       // Accessibility
  //       ariaEnabled: true,
  //       ariaLabel: 'Funnel chart showing conversion process',
  //     },
  //     gauge: {
  //       // Title & Subtitle
  //       title: 'Gauge Chart',
  //       subtitle: 'Progress visualization',

  //       // Visual Configuration
  //       colorPalette: 'default',
  //       theme: 'auto',
  //       legendShow: false,
  //       legendPosition: 'top',
  //       tooltipShow: true,
  //       tooltipTrigger: 'item',
  //       tooltipFormatter: 'default',
  //       tooltipCustomFormatter: '',
  //       animation: true,
  //       animationDuration: 1000,
  //       seriesLabelShow: true,
  //       seriesLabelPosition: 'inside',

  //       // Data Configuration
  //       xAxisField: 'category',
  //       yAxisField: 'value',
  //       seriesField: 'auto',
  //       dataLimit: 1000,
  //       showXAxis: false,
  //       showYAxis: false,
  //       dataLabelsShow: true,
  //       dataLabelsFormat: 'percentage',

  //       // Layout & Positioning
  //       responsive: true,
  //       draggable: true,
  //       resizable: true,
  //       backgroundColor: 'transparent',
  //       borderColor: '#d9d9d9',
  //       padding: 16,
  //       margin: 8,

  //       // Typography
  //       fontFamily: 'Arial',
  //       fontSize: 12,
  //       fontWeight: 'normal',
  //       textColor: '#000000',

  //       // Effects & Animation
  //       animationType: 'fadeIn',
  //       animationDelay: 0,
  //       shadowEffect: false,
  //       glowEffect: false,

  //       // Advanced
  //       customOptions: '',
  //       performanceMode: false,
  //       autoResize: true,
  //       lazyLoading: false,

  //       // Data Zoom
  //       dataZoomShow: false,
  //       dataZoomType: 'inside',
  //       dataZoomStart: 0,
  //       dataZoomEnd: 100,

  //       // Mark Points & Lines
  //       markPointShow: false,
  //       markLineShow: false,
  //       markPointMax: false,
  //       markPointMin: false,
  //       markLineAverage: false,

  //       // Brush Selection
  //       brushShow: false,
  //       brushType: 'rect',

  //       // Visual Mapping
  //       visualMapShow: false,
  //       visualMapDimension: '0',
  //       visualMapMin: undefined,
  //       visualMapMax: undefined,

  //       // Accessibility
  //       ariaEnabled: true,
  //       ariaLabel: 'Gauge chart showing progress value',
  //     },
  //   };

  //   return defaults[widgetType] || defaults.bar;
  // };

  // Render Chart Content Properties - ALL chart properties consolidated
  const renderChartContentProperties = () => {
    // Get defaults for the current widget type
    const widgetType =
      selectedWidget?.config?.widgetType || selectedWidget?.type || 'bar';
    const widgetDefaults = getDefaultConfig(widgetType);

    return (
      <div>
        <Collapse
          size="small"
          ghost
          defaultActiveKey={['title', 'visual', 'data', 'layout']}
        >
          {/* Title & Subtitle */}
          <Panel
            header={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <EditOutlined />
                <span>Title & Subtitle</span>
              </div>
            }
            key="title"
          >
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={24}>
                <Form.Item
                  label="Title"
                  name="title"
                  style={{ marginBottom: '8px' }}
                >
                  <Input placeholder="Chart Title" size="small" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={24}>
                <Form.Item
                  label="Subtitle"
                  name="subtitle"
                  style={{ marginBottom: '8px' }}
                >
                  <Input placeholder="Chart Subtitle (optional)" size="small" />
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          {/* Visual Configuration */}
          <Panel
            header={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <BgColorsOutlined />
                <span>Visual</span>
              </div>
            }
            key="visual"
          >
            {/* Color Palette */}
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={24}>
                <Form.Item
                  label="Color Palette"
                  name="colorPalette"
                  style={{ marginBottom: '8px' }}
                >
                  <Select placeholder="Select color palette" size="small">
                    <Option value="default">Default</Option>
                    <Option value="vibrant">Vibrant</Option>
                    <Option value="pastel">Pastel</Option>
                    <Option value="monochrome">Monochrome</Option>
                    <Option value="categorical">Categorical</Option>
                    <Option value="tableau">Tableau</Option>
                    <Option value="d3">D3</Option>
                    <Option value="material">Material</Option>
                    <Option value="highContrast">High Contrast</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Theme */}
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={24}>
                <Form.Item
                  label="Theme"
                  name="theme"
                  style={{ marginBottom: '8px' }}
                >
                  <Select placeholder="Select theme" size="small">
                    <Option value="light">Light</Option>
                    <Option value="dark">Dark</Option>
                    <Option value="auto">Auto</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Legend Configuration */}
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={12}>
                <Form.Item
                  label="Show Legend"
                  name="legendShow"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch size="small" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Legend Position"
                  name="legendPosition"
                  style={{ marginBottom: '8px' }}
                >
                  <Select placeholder="Position" size="small">
                    <Option value="top">Top</Option>
                    <Option value="bottom">Bottom</Option>
                    <Option value="left">Left</Option>
                    <Option value="right">Right</Option>
                    <Option value="inside">Inside</Option>
                    <Option value="insideTop">Inside Top</Option>
                    <Option value="insideBottom">Inside Bottom</Option>
                    <Option value="insideLeft">Inside Left</Option>
                    <Option value="insideRight">Inside Right</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Tooltip Configuration */}
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={12}>
                <Form.Item
                  label="Show Tooltip"
                  name="tooltipShow"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch size="small" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Tooltip Trigger"
                  name="tooltipTrigger"
                  style={{ marginBottom: '8px' }}
                >
                  <Select placeholder="Trigger" size="small">
                    <Option value="axis">Axis</Option>
                    <Option value="item">Item</Option>
                    <Option value="none">None</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Animation */}
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={12}>
                <Form.Item
                  label="Animation"
                  name="animation"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch size="small" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Animation Duration"
                  name="animationDuration"
                  style={{ marginBottom: '8px' }}
                >
                  <InputNumber
                    min={0}
                    max={5000}
                    step={100}
                    size="small"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Series Label */}
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={12}>
                <Form.Item
                  label="Show Series Label"
                  name="seriesLabelShow"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch size="small" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Label Position"
                  name="seriesLabelPosition"
                  style={{ marginBottom: '8px' }}
                >
                  <Select placeholder="Position" size="small">
                    <Option value="top">Top</Option>
                    <Option value="bottom">Bottom</Option>
                    <Option value="left">Left</Option>
                    <Option value="right">Right</Option>
                    <Option value="inside">Inside</Option>
                    <Option value="outside">Outside</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Tooltip Formatter */}
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={24}>
                <Form.Item
                  label="Tooltip Formatter"
                  name="tooltipFormatter"
                  style={{ marginBottom: '8px' }}
                >
                  <Select placeholder="Select tooltip format" size="small">
                    <Option value="default">Default Format</Option>
                    <Option value="currency">Currency ($1,234.56)</Option>
                    <Option value="percentage">Percentage (12.34%)</Option>
                    <Option value="decimal">Decimal (1,234.56)</Option>
                    <Option value="integer">Integer (1,234)</Option>
                    <Option value="custom">Custom Format...</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Custom Tooltip Formatter */}
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={24}>
                <Form.Item
                  label="Custom Format"
                  name="tooltipCustomFormatter"
                  style={{ marginBottom: '8px' }}
                  extra={
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#666',
                        marginTop: '4px',
                      }}
                    >
                      Variables: {'{b}'} = name, {'{c}'} = value, {'{d}'} =
                      percentage
                    </div>
                  }
                >
                  <TextArea
                    placeholder="Example: '{b}: ${c}' (name: value)"
                    rows={2}
                    size="small"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          {/* Data Configuration */}
          <Panel
            header={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <DatabaseOutlined />
                <span>Data</span>
              </div>
            }
            key="data"
          >
            {/* X Axis Configuration */}
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={12}>
                <Form.Item
                  label="X Axis Field"
                  name="xAxisField"
                  style={{ marginBottom: '8px' }}
                >
                  <Select placeholder="Select X axis field" size="small">
                    <Option value="category">Category</Option>
                    <Option value="value">Value</Option>
                    <Option value="time">Time</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Show X Axis"
                  name="showXAxis"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch size="small" />
                </Form.Item>
              </Col>
            </Row>

            {/* Y Axis Configuration */}
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={12}>
                <Form.Item
                  label="Y Axis Field"
                  name="yAxisField"
                  style={{ marginBottom: '8px' }}
                >
                  <Select placeholder="Select Y axis field" size="small">
                    <Option value="value">Value</Option>
                    <Option value="category">Category</Option>
                    <Option value="time">Time</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Show Y Axis"
                  name="showYAxis"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch size="small" />
                </Form.Item>
              </Col>
            </Row>

            {/* Series Field */}
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={12}>
                <Form.Item
                  label="Series Field"
                  name="seriesField"
                  style={{ marginBottom: '8px' }}
                >
                  <Select placeholder="Select series field" size="small">
                    <Option value="auto">Auto</Option>
                    <Option value="manual">Manual</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Data Limit"
                  name="dataLimit"
                  style={{ marginBottom: '8px' }}
                >
                  <InputNumber
                    min={1}
                    max={10000}
                    size="small"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Data Labels */}
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={12}>
                <Form.Item
                  label="Show Data Labels"
                  name="dataLabelsShow"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch size="small" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Label Format"
                  name="dataLabelsFormat"
                  style={{ marginBottom: '8px' }}
                >
                  <Select placeholder="Format" size="small">
                    <Option value="auto">Auto</Option>
                    <Option value="number">Number</Option>
                    <Option value="percentage">Percentage</Option>
                    <Option value="currency">Currency</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          {/* Layout & Positioning */}
          <Panel
            header={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <LayoutOutlined />
                <span>Layout & Positioning</span>
              </div>
            }
            key="chart_layout"
          >
            {/* Responsive Settings */}
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={8}>
                <Form.Item
                  label="Responsive"
                  name="responsive"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch size="small" defaultChecked />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label="Draggable"
                  name="draggable"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch size="small" defaultChecked />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label="Resizable"
                  name="resizable"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch size="small" defaultChecked />
                </Form.Item>
              </Col>
            </Row>

            {/* Background & Borders */}
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={12}>
                <Form.Item
                  label="Background Color"
                  name="backgroundColor"
                  style={{ marginBottom: '8px' }}
                >
                  <ColorPicker size="small" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Border Color"
                  name="borderColor"
                  style={{ marginBottom: '8px' }}
                >
                  <ColorPicker size="small" />
                </Form.Item>
              </Col>
            </Row>

            {/* Spacing & Padding */}
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={12}>
                <Form.Item
                  label="Padding"
                  name="padding"
                  style={{ marginBottom: '8px' }}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    size="small"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Margin"
                  name="margin"
                  style={{ marginBottom: '8px' }}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    size="small"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          {/* Duplicate Typography panel removed (kept the main Typography Tab below) */}

          {/* Effects & Animation */}
          <Panel
            header={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ThunderboltOutlined />
                <span>Effects & Animation</span>
              </div>
            }
            key="chart_effects"
          >
            {/* Animation Settings */}
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={12}>
                <Form.Item
                  label="Animation Type"
                  name="animationType"
                  style={{ marginBottom: '8px' }}
                >
                  <Select placeholder="Animation type" size="small">
                    <Option value="fadeIn">Fade In</Option>
                    <Option value="slideIn">Slide In</Option>
                    <Option value="bounceIn">Bounce In</Option>
                    <Option value="zoomIn">Zoom In</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Animation Delay"
                  name="animationDelay"
                  style={{ marginBottom: '8px' }}
                >
                  <InputNumber
                    min={0}
                    max={2000}
                    step={100}
                    size="small"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Effects */}
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={12}>
                <Form.Item
                  label="Shadow Effect"
                  name="shadowEffect"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch size="small" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Glow Effect"
                  name="glowEffect"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch size="small" />
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          {/* Advanced */}
          <Panel
            header={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ToolOutlined />
                <span>Advanced</span>
              </div>
            }
            key="advanced_echarts"
          >
            {/* Custom ECharts Options */}
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={24}>
                <Form.Item
                  label="Custom ECharts Options"
                  name="customOptions"
                  style={{ marginBottom: '8px' }}
                >
                  <TextArea
                    placeholder="Custom ECharts configuration (JSON)"
                    rows={4}
                    size="small"
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Performance Settings */}
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={8}>
                <Form.Item
                  label="Performance Mode"
                  name="performanceMode"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch size="small" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label="Auto Resize"
                  name="autoResize"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch size="small" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label="Lazy Loading"
                  name="lazyLoading"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch size="small" />
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          {/* Data Zoom Configuration */}
          <Panel
            header={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ZoomInOutlined />
                <span>Data Zoom</span>
              </div>
            }
            key="dataZoom"
          >
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={12}>
                <Form.Item
                  label="Enable Data Zoom"
                  name="dataZoomShow"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch size="small" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Zoom Type"
                  name="dataZoomType"
                  style={{ marginBottom: '8px' }}
                >
                  <Select placeholder="Select type" size="small">
                    <Option value="inside">Inside</Option>
                    <Option value="slider">Slider</Option>
                    <Option value="both">Both</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={12}>
                <Form.Item
                  label="Start Range"
                  name="dataZoomStart"
                  style={{ marginBottom: '8px' }}
                >
                  <InputNumber min={0} max={100} placeholder="0" size="small" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="End Range"
                  name="dataZoomEnd"
                  style={{ marginBottom: '8px' }}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    placeholder="100"
                    size="small"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          {/* Mark Points & Lines */}
          <Panel
            header={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <DotChartOutlined />
                <span>Mark Points & Lines</span>
              </div>
            }
            key="markPoints"
          >
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={12}>
                <Form.Item
                  label="Show Mark Points"
                  name="markPointShow"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch size="small" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Show Mark Lines"
                  name="markLineShow"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch size="small" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={8}>
                <Form.Item
                  label="Max Point"
                  name="markPointMax"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch size="small" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label="Min Point"
                  name="markPointMin"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch size="small" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label="Average Line"
                  name="markLineAverage"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch size="small" />
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          {/* Brush Selection */}
          <Panel
            header={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <EditOutlined />
                <span>Brush Selection</span>
              </div>
            }
            key="brush"
          >
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={12}>
                <Form.Item
                  label="Enable Brush"
                  name="brushShow"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch size="small" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Brush Type"
                  name="brushType"
                  style={{ marginBottom: '8px' }}
                >
                  <Select placeholder="Select type" size="small">
                    <Option value="rect">Rectangle</Option>
                    <Option value="polygon">Polygon</Option>
                    <Option value="lineX">Line X</Option>
                    <Option value="lineY">Line Y</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          {/* Visual Mapping */}
          <Panel
            header={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <BgColorsOutlined />
                <span>Visual Mapping</span>
              </div>
            }
            key="visualMap"
          >
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={12}>
                <Form.Item
                  label="Enable Visual Map"
                  name="visualMapShow"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch size="small" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Map Dimension"
                  name="visualMapDimension"
                  style={{ marginBottom: '8px' }}
                >
                  <Select placeholder="Select dimension" size="small">
                    <Option value="0">X Axis</Option>
                    <Option value="1">Y Axis</Option>
                    <Option value="2">Value</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={12}>
                <Form.Item
                  label="Min Value"
                  name="visualMapMin"
                  style={{ marginBottom: '8px' }}
                >
                  <InputNumber placeholder="Auto" size="small" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Max Value"
                  name="visualMapMax"
                  style={{ marginBottom: '8px' }}
                >
                  <InputNumber placeholder="Auto" size="small" />
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          {/* Aria Labels (Accessibility) */}
          <Panel
            header={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <EyeOutlined />
                <span>Accessibility</span>
              </div>
            }
            key="aria"
          >
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={24}>
                <Form.Item
                  label="Enable Aria"
                  name="ariaEnabled"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch size="small" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={24}>
                <Form.Item
                  label="Aria Label"
                  name="ariaLabel"
                  style={{ marginBottom: '8px' }}
                >
                  <Input
                    placeholder="Chart description for screen readers"
                    size="small"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          {/* Typography Tab */}
          <Panel
            header={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FontSizeOutlined />
                <span>Typography</span>
              </div>
            }
            key="typography"
          >
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={24}>
                <Form.Item
                  label="Font Family"
                  name="fontFamily"
                  style={{ marginBottom: '8px' }}
                >
                  <Select placeholder="Select font family" size="small">
                    <Option value="Arial">Arial</Option>
                    <Option value="Helvetica">Helvetica</Option>
                    <Option value="Times New Roman">Times New Roman</Option>
                    <Option value="Georgia">Georgia</Option>
                    <Option value="Verdana">Verdana</Option>
                    <Option value="system">System Font</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={12}>
                <Form.Item
                  label="Font Size"
                  name="fontSize"
                  style={{ marginBottom: '8px' }}
                >
                  <InputNumber min={8} max={72} placeholder="14" size="small" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Font Weight"
                  name="fontWeight"
                  style={{ marginBottom: '8px' }}
                >
                  <Select placeholder="Normal" size="small">
                    <Option value="100">Thin</Option>
                    <Option value="300">Light</Option>
                    <Option value="400">Normal</Option>
                    <Option value="500">Medium</Option>
                    <Option value="600">Semi Bold</Option>
                    <Option value="700">Bold</Option>
                    <Option value="800">Extra Bold</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={12}>
                <Form.Item
                  label="Line Height"
                  name="lineHeight"
                  style={{ marginBottom: '8px' }}
                >
                  <InputNumber
                    min={0.5}
                    max={3}
                    step={0.1}
                    placeholder="1.2"
                    size="small"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Letter Spacing"
                  name="letterSpacing"
                  style={{ marginBottom: '8px' }}
                >
                  <InputNumber
                    min={-2}
                    max={5}
                    step={0.1}
                    placeholder="0"
                    size="small"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          {/* Effects Tab */}
          <Panel
            header={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <EyeOutlined />
                <span>Effects</span>
              </div>
            }
            key="effects"
          >
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={24}>
                <Form.Item
                  label="Shadow"
                  name="boxShadow"
                  style={{ marginBottom: '8px' }}
                >
                  <Select placeholder="Select shadow" size="small">
                    <Option value="none">None</Option>
                    <Option value="small">Small</Option>
                    <Option value="medium">Medium</Option>
                    <Option value="large">Large</Option>
                    <Option value="custom">Custom</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={12}>
                <Form.Item
                  label="Border Radius"
                  name="borderRadius"
                  style={{ marginBottom: '8px' }}
                >
                  <InputNumber min={0} max={20} placeholder="6" size="small" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Opacity"
                  name="opacity"
                  style={{ marginBottom: '8px' }}
                >
                  <InputNumber
                    min={0}
                    max={1}
                    step={0.1}
                    placeholder="1"
                    size="small"
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={24}>
                <Form.Item
                  label="Blur Effect"
                  name="blurEffect"
                  valuePropName="checked"
                  style={{ marginBottom: '8px' }}
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          {/* Advanced Tab */}
          <Panel
            header={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ToolOutlined />
                <span>Advanced</span>
              </div>
            }
            key="advanced_general"
          >
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={24}>
                <Form.Item
                  label="Custom CSS"
                  name="customCSS"
                  style={{ marginBottom: '8px' }}
                >
                  <TextArea
                    rows={4}
                    placeholder="Enter custom CSS..."
                    size="small"
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={24}>
                <Form.Item
                  label="Data Source"
                  name="dataSource"
                  style={{ marginBottom: '8px' }}
                >
                  <Select placeholder="Select data source" size="small">
                    <Option value="static">Static Data</Option>
                    <Option value="api">API Endpoint</Option>
                    <Option value="database">Database</Option>
                    <Option value="file">File Upload</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[8, 4]} style={{ marginBottom: '12px' }}>
              <Col span={12}>
                <Form.Item
                  label="Refresh Interval"
                  name="refreshInterval"
                  style={{ marginBottom: '8px' }}
                >
                  <InputNumber
                    min={0}
                    max={3600}
                    placeholder="0"
                    size="small"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Cache Duration"
                  name="cacheDuration"
                  style={{ marginBottom: '8px' }}
                >
                  <InputNumber
                    min={0}
                    max={86400}
                    placeholder="300"
                    size="small"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Panel>
        </Collapse>
      </div>
    );
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: isDarkMode ? '#141414' : '#ffffff',
        border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Title
          level={5}
          style={{
            margin: 0,
            color: isDarkMode ? '#ffffff' : '#000000',
          }}
        >
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
          key={selectedWidget ? `properties-${selectedWidget.id}` : 'library'}
          activeKey={selectedWidget ? 'properties' : activeTab}
          onChange={(key) => {
            // Allow switching to Library even when a widget is selected.
            // If user chooses Library, clear selection so they can add new widgets.
            if (key === 'library') {
              try {
                deselectAll();
              } catch (e) {}
              setActiveTab('library');
              return;
            }
            setActiveTab(key);
          }}
          size="small"
          style={{ marginTop: '-8px' }}
          items={[
            {
              key: 'library',
              label: (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <AppstoreOutlined />
                  <span>Library</span>
                </span>
              ),
              children: (
                <div
                  style={{
                    height: 'calc(100vh - 200px)',
                    overflow: 'auto',
                  }}
                >
                  {renderWidgetLibrary()}
                </div>
              ),
            },
            {
              key: 'properties',
              label: (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <SettingOutlined />
                  <span>Properties</span>
                  {selectedWidget && <Badge size="small" />}
                </span>
              ),
              children: (
                <div
                  style={{
                    height: 'calc(100vh - 200px)',
                    overflow: 'auto',
                  }}
                >
                  {renderProperties()}
                </div>
              ),
            },
          ]}
        />
      </div>
      {/* Permission Modal */}
      <Modal
        open={permissionModalVisible}
        title="Request Access"
        onCancel={() => setPermissionModalVisible(false)}
        footer={null}
      >
        <div style={{ marginBottom: 12 }}>
          <Text>
            You're missing permissions to perform this action. Enter admin email
            to request access.
          </Text>
        </div>
        <Input
          placeholder="Admin email"
          value={permEmail}
          onChange={(e) => setPermEmail(e.target.value)}
        />
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <Button onClick={() => setPermissionModalVisible(false)}>
            Cancel
          </Button>
          <Button
            type="primary"
            loading={permLoading}
            onClick={async () => {
              setPermLoading(true);
              try {
                await fetch('/api/organization/request-access', {
                  method: 'POST',
                  credentials: 'include',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    email: permEmail,
                  }),
                });
                message.success('Access request sent');
                setPermissionModalVisible(false);
              } catch {
                message.error('Failed to send request');
              } finally {
                setPermLoading(false);
              }
            }}
          >
            Request Access
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default UnifiedDesignPanel;
