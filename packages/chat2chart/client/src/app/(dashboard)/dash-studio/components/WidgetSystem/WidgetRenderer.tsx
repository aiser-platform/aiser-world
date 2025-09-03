'use client';

import React from 'react';
import { Card, Typography, Image, Table, Statistic, Tag } from 'antd';
import { 
  BarChartOutlined, 
  FileTextOutlined, 
  PictureOutlined, 
  TableOutlined, 
  NumberOutlined, 
  FontSizeOutlined 
} from '@ant-design/icons';
import { DashboardWidget } from '../DashboardConfiguration/DashboardConfigProvider';
import ChartWidget from '../ChartWidget';
import EditableWidget from '../EditableWidget';

const { Text, Title } = Typography;

interface WidgetRendererProps {
  widget: DashboardWidget;
  isPreviewMode?: boolean;
  onConfigUpdate?: (config: any) => void;
  isDarkMode?: boolean;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ 
  widget, 
  isPreviewMode = false,
  onConfigUpdate,
  isDarkMode = false
}) => {
  console.log('WidgetRenderer called with widget:', widget);
  
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
  
  const renderWidgetContent = () => {
    switch (widget.type) {
      // Chart types - all chart subtypes map to 'chart'
      case 'chart':
        return (
          <ChartWidget
            widget={widget}
            config={widget.config}
            data={widget.data || []}
            onConfigUpdate={onConfigUpdate}
            isDarkMode={isDarkMode}
            showEditableTitle={true}
            onTitleChange={(title, subtitle) => {
              onConfigUpdate?.({
                title: { 
                  text: title,
                  subtext: subtitle,
                  left: 'left' // Left alignment as requested
                }
              });
            }}
          />
        );
      
      // Content types
      case 'text':
        return (
          <EditableWidget
            value={widget.config?.content || ''}
            onChange={(value) => onConfigUpdate?.({ content: value })}
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
        return <ImageWidgetContent widget={widget} onConfigUpdate={onConfigUpdate} />;
      
      // Data types
      case 'table':
        return <TableWidgetContent widget={widget} onConfigUpdate={onConfigUpdate} />;
      
      // Metric types
      case 'metric':
        return <MetricWidgetContent widget={widget} onConfigUpdate={onConfigUpdate} isDarkMode={isDarkMode} />;
      
      // Filter types
      case 'filter':
        return <FilterWidgetContent widget={widget} onConfigUpdate={onConfigUpdate} />;
      
      default:
        return <DefaultWidgetContent widget={widget} />;
    }
  };

  // Apply widget style properties with dark mode support
  const widgetStyle: React.CSSProperties = {
    height: '100%',
    width: '100%',
    // Ensure proper styling with dark mode awareness
    padding: typeof widget.style?.padding === 'number' ? widget.style.padding : 16,
    backgroundColor: widget.style?.backgroundColor || (isDarkMode ? '#2a2a2a' : '#ffffff'),
    borderColor: widget.style?.borderColor || (isDarkMode ? '#404040' : '#d9d9d9'),
    borderWidth: widget.style?.borderWidth || 1,
    borderStyle: widget.style?.borderStyle || 'solid',
    borderRadius: widget.style?.borderRadius || 8,
    boxShadow: widget.style?.boxShadow || (isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)'),
    opacity: widget.style?.opacity || 1,
    zIndex: widget.style?.zIndex || 1,
    overflow: widget.style?.overflow || 'auto',
    // Apply other style properties with dark mode defaults
    fontSize: widget.style?.fontSize,
    fontWeight: widget.style?.fontWeight,
    color: widget.style?.color || (isDarkMode ? '#ffffff' : '#000000'),
    fontFamily: widget.style?.fontFamily,
    textAlign: widget.style?.textAlign,
    lineHeight: widget.style?.lineHeight
  };

  return (
    <div style={widgetStyle}>
      {renderWidgetContent()}
    </div>
  );
};



// Markdown Widget Component
const MarkdownWidgetContent: React.FC<{ widget: DashboardWidget; onConfigUpdate?: (config: any) => void }> = ({ 
  widget, 
  onConfigUpdate 
}) => {
  const config = widget.config || {};
  const content = config.content || '# Markdown Widget\n\nAdd your markdown content here...';
  
  // Simple markdown renderer
  const renderMarkdown = (text: string) => {
    return text
      .replace(/^# (.*$)/gim, '<h1 style="font-size: 24px; font-weight: bold; margin: 16px 0 8px 0; color: #333;">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 style="font-size: 20px; font-weight: bold; margin: 14px 0 6px 0; color: #333;">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 style="font-size: 18px; font-weight: bold; margin: 12px 0 4px 0; color: #333;">$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong style="font-weight: bold;">$1</strong>')
      .replace(/\*(.*)\*/gim, '<em style="font-style: italic;">$1</em>')
      .replace(/`(.*)`/gim, '<code style="background: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>')
      .replace(/\n/gim, '<br>');
  };
  
  return (
    <div style={{ 
      height: '100%', 
      padding: '16px',
      background: 'transparent',
      overflow: 'auto'
    }}>
      <div style={{ 
        fontSize: '12px', 
        color: '#666', 
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <FileTextOutlined />
        Markdown Content
      </div>
      <div 
        style={{ 
          fontSize: config.fontSize || 14, 
          color: config.color || '#333',
          lineHeight: config.lineHeight || 1.6,
          fontFamily: config.fontFamily || 'system-ui, -apple-system, sans-serif',
          textAlign: config.textAlign || 'left'
        }}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      />
    </div>
  );
};

// Image Widget Component
const ImageWidgetContent: React.FC<{ widget: DashboardWidget; onConfigUpdate?: (config: any) => void }> = ({ 
  widget, 
  onConfigUpdate 
}) => {
  const config = widget.config || {};
  const imageUrl = config.imageUrl;
  
  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      padding: '16px',
      background: '#fafafa',
      borderRadius: '8px'
    }}>
      <div style={{ 
        fontSize: '12px', 
        color: '#666', 
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <PictureOutlined />
        Image Widget
      </div>
      
      <div style={{ 
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        borderRadius: '4px',
        border: '1px solid #e8e8e8',
        overflow: 'hidden'
      }}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={config.altText || 'Image'}
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%',
              objectFit: config.fitMode || 'contain'
            }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
          />
        ) : (
          <div style={{ textAlign: 'center' }}>
            <PictureOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '12px' }} />
            <div style={{ fontSize: '16px', color: '#666', marginBottom: '4px' }}>
              No Image URL
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              Add image URL in properties panel
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Table Widget Component
const TableWidgetContent: React.FC<{ widget: DashboardWidget; onConfigUpdate?: (config: any) => void }> = ({ 
  widget, 
  onConfigUpdate 
}) => {
  const config = widget.config || {};
  
  // Better sample data for table
  const sampleData = [
    { key: 1, name: 'Product A', sales: 1200, revenue: '$12,000', region: 'North' },
    { key: 2, name: 'Product B', sales: 800, revenue: '$8,000', region: 'South' },
    { key: 3, name: 'Product C', sales: 1500, revenue: '$15,000', region: 'East' },
    { key: 4, name: 'Product D', sales: 900, revenue: '$9,000', region: 'West' },
    { key: 5, name: 'Product E', sales: 1100, revenue: '$11,000', region: 'North' }
  ];
  
  const tableColumns = [
    { title: 'Product', dataIndex: 'name', key: 'name' },
    { title: 'Sales', dataIndex: 'sales', key: 'sales' },
    { title: 'Revenue', dataIndex: 'revenue', key: 'revenue' },
    { title: 'Region', dataIndex: 'region', key: 'region' }
  ];
  
  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      padding: '16px',
      background: '#fafafa',
      borderRadius: '8px'
    }}>
      <div style={{ 
        fontSize: '12px', 
        color: '#666', 
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <TableOutlined />
        Table Widget
      </div>
      
      <div style={{ 
        flex: 1,
        background: '#ffffff',
        borderRadius: '4px',
        border: '1px solid #e8e8e8',
        overflow: 'hidden'
      }}>
        <Table
          columns={tableColumns}
          dataSource={sampleData}
          pagination={config.pagination ? { pageSize: config.pageSize || 10 } : false}
          size="small"
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
};

// Metric Widget Component
const MetricWidgetContent: React.FC<{ widget: DashboardWidget; onConfigUpdate?: (config: any) => void; isDarkMode?: boolean }> = ({ 
  widget, 
  onConfigUpdate,
  isDarkMode = false
}) => {
  const config = widget.config || {};
  const title = config.title?.text || 'KPI Metric';
  const value = config.value || '1,234';
  const format = config.format || 'number';
  const prefix = config.prefix || '';
  const suffix = config.suffix || '';
  const showTrend = config.showTrend || false;
  const trendValue = config.trendValue || '+12.5%';
  
  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      padding: '16px',
      background: isDarkMode ? '#2a2a2a' : '#ffffff',
      borderRadius: '8px',
      border: '1px solid #e8e8e8'
    }}>
      <div style={{ 
        fontSize: '12px', 
        color: isDarkMode ? '#999' : '#666', 
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <NumberOutlined />
        <EditableWidget
          value={title}
          onChange={(value) => onConfigUpdate?.({ title: { text: value } })}
          placeholder="Click to edit title"
          fontSize={12}
          color={isDarkMode ? '#999' : '#666'}
          isDarkMode={isDarkMode}
          style={{ 
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        />
      </div>
      
      <div style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }}>
        <div style={{ 
          fontSize: '36px',
          fontWeight: 'bold',
          color: '#1890ff',
          marginBottom: '8px'
        }}>
          {prefix}{value}{suffix}
        </div>
        
        {showTrend && (
          <div style={{ 
            fontSize: '14px',
            color: trendValue.startsWith('+') ? '#52c41a' : '#f5222d',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>{trendValue}</span>
            <span>vs last period</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Text Widget Component
const TextWidgetContent: React.FC<{ widget: DashboardWidget; onConfigUpdate?: (config: any) => void }> = ({ 
  widget, 
  onConfigUpdate 
}) => {
  const config = widget.config || {};
  const content = config.content || 'New Text Widget\n\nAdd your text content here...';
  
  return (
    <div style={{ 
      height: '100%', 
      padding: '16px',
      background: 'transparent',
      overflow: 'auto'
    }}>
      <div style={{ 
        fontSize: '12px', 
        color: '#666', 
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <FontSizeOutlined />
        Text Content
      </div>
      <div style={{ 
        fontSize: config.fontSize || 14,
        fontWeight: config.fontWeight || 'normal',
        color: config.color || '#333',
        whiteSpace: 'pre-wrap',
        lineHeight: config.lineHeight || 1.6,
        fontFamily: config.fontFamily || 'system-ui, -apple-system, sans-serif',
        textAlign: config.textAlign || 'left',
        background: 'transparent',
        padding: '12px',
        borderRadius: '4px'
      }}>
        {content}
      </div>
    </div>
  );
};

// Default Widget Component
const DefaultWidgetContent: React.FC<{ widget: DashboardWidget }> = ({ widget }) => {
  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#f0f0f0',
      borderRadius: '8px',
      padding: '16px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <BarChartOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '12px' }} />
        <div style={{ fontSize: '16px', color: '#666', marginBottom: '4px' }}>
          {widget.type} Widget
        </div>
        <div style={{ fontSize: '12px', color: '#999' }}>
          Configure in properties panel
        </div>
      </div>
    </div>
  );
};

// Filter Widget Component
const FilterWidgetContent: React.FC<{ widget: DashboardWidget; onConfigUpdate?: (config: any) => void }> = ({ 
  widget, 
  onConfigUpdate 
}) => {
  const config = widget.config || {};
  const title = config.title?.text || 'Filter';
  
  const renderFilterContent = () => {
    // Check config for specific filter type
    const filterType = config.filterType || 'dropdown';
    
    switch (filterType) {
      case 'dateRange':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📅</div>
            <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Date Range</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Select date range</div>
          </div>
        );
      case 'dropdown':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📋</div>
            <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Dropdown</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Select from options</div>
          </div>
        );
      case 'slider':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎚️</div>
            <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Range Slider</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Adjust value range</div>
          </div>
        );
      case 'search':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
            <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Search</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Filter by text</div>
          </div>
        );
      case 'checkbox':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>☑️</div>
            <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Checkbox</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Multi-select options</div>
          </div>
        );
      default:
        return <div>Filter Widget</div>;
    }
  };
  
  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      padding: '16px',
      background: '#f0f8ff',
      borderRadius: '8px',
      border: '2px dashed #1890ff'
    }}>
      <div style={{ 
        fontSize: '12px', 
        color: '#1890ff', 
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <span>{title}</span>
      </div>
      <div style={{ 
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {renderFilterContent()}
      </div>
    </div>
  );
};



export default WidgetRenderer;
