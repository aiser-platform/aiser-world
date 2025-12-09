'use client';

import React from 'react';
import { Card, Typography, Image, Table, Statistic, Tag } from 'antd';
import { 
  BarChartOutlined, 
  FileTextOutlined, 
  PictureOutlined, 
  TableOutlined, 
  NumberOutlined, 
  FontSizeOutlined,
  FilterOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import { DashboardWidget } from '../DashboardConfiguration/DashboardConfigProvider';
import ChartWidget from '../ChartWidget';
import EditableWidget from '../EditableWidget';

const { Text, Title } = Typography;

interface WidgetRendererProps {
  widget: DashboardWidget;
  isPreviewMode?: boolean;
  // Accept either (widgetId, config) or (config) function signatures from parents.
  onConfigUpdate?: ((widgetId: string, config: any) => void) | ((config: any) => void);
  onWidgetClick?: (widget: any) => void;
  onDelete?: (widgetId: string) => void;
  onDuplicate?: (widget: any) => void;
  onUpdate?: (widgetId: string, updates: any) => void;
  isDarkMode?: boolean;
  isSelected?: boolean;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ 
  widget, 
  isPreviewMode = false,
  onConfigUpdate,
  onWidgetClick,
  onDelete,
  onDuplicate,
  onUpdate,
  isDarkMode = false,
  isSelected = false
}) => {
  // remove debug logging to satisfy lint rules
  
  // Debug: Check for React elements in widget data and config
  if (widget.data && typeof widget.data === 'object') {
    const hasReactElements = JSON.stringify(widget.data).includes('"type"') && 
                            JSON.stringify(widget.data).includes('"props"');
    if (hasReactElements) {
      console.warn('Widget data contains potential React elements:', widget.data);
    }
  }
  
  if (widget.config && typeof widget.config === 'object') {
    const hasReactElements = JSON.stringify(widget.config).includes('"type"') && 
                            JSON.stringify(widget.config).includes('"props"');
    if (hasReactElements) {
      console.warn('Widget config contains potential React elements:', widget.config);
    }
  }
  
  // Normalized onConfigUpdate that always calls the parent correctly.
  const normalizedOnConfigUpdate = (...args: any[]) => {
    if (!onConfigUpdate) return;
    try {
      // Handle both invocation styles from children:
      // 1) (widgetId, update)  -- child provides widget id explicitly
      // 2) (update)            -- child provides only the update object
      if (args.length === 2 && typeof args[0] === 'string') {
        const maybeWidgetId = args[0];
        const update = args[1];
        // If parent expects (widgetId, config)
      if ((onConfigUpdate as any).length >= 2) {
          (onConfigUpdate as any)(maybeWidgetId, update);
        } else {
          // Parent expects (config) and likely already bound to widget id
          (onConfigUpdate as any)(update);
        }
        return;
      }

      // Otherwise assume single-argument update
      const update = args[0];
      if ((onConfigUpdate as any).length >= 2) {
        // Parent expects widgetId first
        (onConfigUpdate as any)(widget.id, update);
      } else {
        (onConfigUpdate as any)(update);
      }
    } catch (e) {
      // Fallback: try both forms
      try { (onConfigUpdate as any)(widget.id, args[0]); } catch (err) { try { (onConfigUpdate as any)(args[0]); } catch (err2) {} }
    }
  };
  // Render function for widget content. Declared before useMemo to avoid temporal dead zone
  const renderWidgetContent = () => {
    switch (widget.type) {
      // Chart types - all chart subtypes are handled under 'chart'
      case 'chart':
        // Use consolidated config directly - no merging needed
        return (
          <ChartWidget
            widget={widget}
            config={widget.config || {}}
            data={widget.data || []}
            onConfigUpdate={normalizedOnConfigUpdate}
            onWidgetClick={onWidgetClick ? () => onWidgetClick(widget) : undefined}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onUpdate={onUpdate}
            isDarkMode={isDarkMode}
            showEditableTitle={true}
            isSelected={isSelected}
          />
        );
      
      // Content types
      case 'text':
        return (
          <EditableWidget
            value={widget.config?.content || ''}
            onChange={(value) => normalizedOnConfigUpdate({ content: value })}
            placeholder="Click to edit text"
            multiline={true}
            fontSize={widget.config?.fontSize || 14}
            fontWeight={widget.config?.fontWeight || 'normal'}
            color={widget.config?.color}
            isDarkMode={isDarkMode}
            style={{ 
              width: '100%', 
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          />
        );
      
      case 'image':
        return <ImageWidgetContent widget={widget} onConfigUpdate={normalizedOnConfigUpdate} />;
      
      // Data types
      case 'table':
        return <TableWidgetContent widget={widget} onConfigUpdate={normalizedOnConfigUpdate} />;
      
      // Metric types
      case 'metric':
        return <MetricWidgetContent widget={widget} onConfigUpdate={normalizedOnConfigUpdate} isDarkMode={isDarkMode} />;
      
      // Filter types
      case 'filter':
        return <FilterWidgetContent widget={widget} onConfigUpdate={normalizedOnConfigUpdate} />;
      
      default:
        return <DefaultWidgetContent widget={widget} />;
    }
  };

  // Memoize rendered content to avoid re-renders during drag which can cause layout thrash
  const rendered = React.useMemo(() => renderWidgetContent(), [widget.id, widget.type, JSON.stringify(widget.config || {}), JSON.stringify(widget.data || {})]);

  // Apply widget style properties with dark mode support
  const widgetStyle: React.CSSProperties = {
    height: '100%',
    width: '100%',
    // Ensure proper styling with dark mode awareness
    padding: typeof widget.style?.padding === 'number' ? widget.style.padding : 16,
    backgroundColor: widget.style?.backgroundColor || 'var(--ant-color-bg-container)',
    // Remove default border - only show if explicitly set
    borderColor: widget.style?.borderColor || 'transparent',
    borderWidth: widget.style?.borderWidth || 0,
    borderStyle: widget.style?.borderStyle || 'solid',
    borderRadius: widget.style?.borderRadius || 8,
    boxShadow: widget.style?.boxShadow || 'none',
    opacity: widget.style?.opacity || 1,
    zIndex: widget.style?.zIndex || 1,
    overflow: widget.style?.overflow || 'auto',
    // Apply other style properties with dark mode defaults
    fontSize: widget.style?.fontSize,
    fontWeight: widget.style?.fontWeight,
    color: widget.style?.color || 'var(--ant-color-text)',
    fontFamily: widget.style?.fontFamily,
    textAlign: widget.style?.textAlign,
    lineHeight: widget.style?.lineHeight
  };

  return (
    <div style={widgetStyle}>
      {/* Snapshot badge */}
      {widget?.data?.snapshotId && (
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
          <Tag color="blue" style={{ fontSize: 10 }}>Snapshot: {widget.data.snapshotId}</Tag>
        </div>
      )}
      {rendered}
    </div>
  );
};

// Widget Components
const ImageWidgetContent: React.FC<{ widget: DashboardWidget; onConfigUpdate?: (config: any) => void }> = ({ 
  widget, 
  onConfigUpdate 
}) => {
  const config = widget.config || {};
  const imageUrl = config.imageUrl || config.src || '';
  
  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'var(--color-surface-base)',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={config.alt || 'Widget Image'}
          style={{ 
            maxWidth: '100%', 
            maxHeight: '100%', 
            objectFit: config.fit || 'cover' 
          }}
          preview={false}
        />
      ) : (
        <div style={{ 
          textAlign: 'center', 
          color: 'var(--color-text-secondary)',
          padding: '20px'
        }}>
          <PictureOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />
          <div>No Image</div>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>Click to add image</div>
        </div>
      )}
    </div>
  );
};

const TableWidgetContent: React.FC<{ widget: DashboardWidget; onConfigUpdate?: (config: any) => void }> = ({ 
  widget, 
  onConfigUpdate 
}) => {
  const config = widget.config || {};
  const data = Array.isArray(widget.data) ? widget.data : [];
  
  // Convert data to table format
  const columns = data.length > 0 ? Object.keys(data[0]).map(key => ({
    title: key.charAt(0).toUpperCase() + key.slice(1),
    dataIndex: key,
    key: key,
  })) : [
    { title: 'Column 1', dataIndex: 'col1', key: 'col1' },
    { title: 'Column 2', dataIndex: 'col2', key: 'col2' },
  ];
  
  const tableData = data.length > 0 ? data : [
    { col1: 'Sample Data 1', col2: 'Sample Data 2' },
    { col1: 'Sample Data 3', col2: 'Sample Data 4' },
  ];
  
  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      padding: '8px',
      background: 'var(--color-surface-base)',
      borderRadius: '8px'
    }}>
      <Table
        columns={columns}
        dataSource={tableData}
        pagination={false}
        size="small"
        scroll={{ y: '100%' }}
        style={{ height: '100%' }}
      />
    </div>
  );
};

const MetricWidgetContent: React.FC<{ widget: DashboardWidget; onConfigUpdate?: (config: any) => void; isDarkMode?: boolean }> = ({ 
  widget, 
  onConfigUpdate,
  isDarkMode = false
}) => {
  const config = widget.config || {};
  const value = config.value || config.data || '0';
  const title = config.title || widget.title || 'Metric';
  const prefix = config.prefix || '';
  const suffix = config.suffix || '';
  const trend = config.trendValue || '';
  
  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '16px',
      background: 'var(--color-surface-base)',
      borderRadius: '8px'
    }}>
      <Statistic
        title={title}
        value={value}
        prefix={prefix}
        suffix={suffix}
        valueStyle={{ 
          color: config.color || 'var(--color-text-primary)',
          fontSize: config.fontSize || '24px',
          fontWeight: config.fontWeight || 'bold'
        }}
      />
      {trend && (
        <div style={{ 
          marginTop: '8px', 
          fontSize: '12px', 
          color: trend.startsWith('+') ? 'var(--color-functional-success)' : 'var(--color-functional-error)'
        }}>
          {trend}
        </div>
      )}
    </div>
  );
};

const FilterWidgetContent: React.FC<{ widget: DashboardWidget; onConfigUpdate?: (config: any) => void }> = ({ 
  widget, 
  onConfigUpdate 
}) => {
  const config = widget.config || {};
  const filterType = config.type || 'dropdown';
  const options = config.options || ['Option 1', 'Option 2', 'Option 3'];
  
  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '16px',
      background: 'var(--color-surface-base)',
      borderRadius: '8px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <FilterOutlined style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--color-text-secondary)' }} />
        <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Filter Widget</div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{filterType}</div>
      </div>
    </div>
  );
};

const DefaultWidgetContent: React.FC<{ widget: DashboardWidget }> = ({ widget }) => {
  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '16px',
      background: 'var(--color-surface-base)',
      borderRadius: '8px',
      textAlign: 'center'
    }}>
      <div>
        <AppstoreOutlined style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--color-text-secondary)' }} />
        <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>{widget.title || 'Widget'}</div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Type: {widget.type}</div>
      </div>
    </div>
  );
};

export default WidgetRenderer;