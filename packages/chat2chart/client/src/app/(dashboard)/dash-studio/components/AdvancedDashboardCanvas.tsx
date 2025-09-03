'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button, Space, Typography, Tooltip, Dropdown, Menu, message, Modal, Input, Select } from 'antd';
import { Responsive, WidthProvider } from 'react-grid-layout';
import {
  MoreOutlined,
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  UnlockOutlined,
  SettingOutlined,
  BarChartOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  SaveOutlined,
  UndoOutlined,
  RedoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { DashboardWidget } from './DashboardConfiguration/DashboardConfigProvider';
import { WidgetRenderer } from './WidgetSystem/WidgetRenderer';

const ResponsiveGridLayout = WidthProvider(Responsive);
const { Title, Text } = Typography;
const { Option } = Select;

interface AdvancedDashboardCanvasProps {
  widgets: DashboardWidget[];
  layout: any[];
  selectedWidget: DashboardWidget | null;
  isDarkMode: boolean;
  onLayoutChange: (layout: any[]) => void;
  onWidgetSelect: (widget: DashboardWidget | null) => void;
  onWidgetUpdate: (widgetId: string, updates: any) => void;
  onWidgetDelete: (widgetId: string) => void;
  onWidgetDuplicate: (widget: DashboardWidget) => void;
  onWidgetConfigUpdate: (widgetId: string, config: any) => void;
  onAddWidget?: (widgetData: any) => void;
  dashboardTitle?: string;
  dashboardSubtitle?: string;
  onTitleChange?: (title: string) => void;
  onSubtitleChange?: (subtitle: string) => void;
}

const AdvancedDashboardCanvas: React.FC<AdvancedDashboardCanvasProps> = ({
  widgets,
  layout,
  selectedWidget,
  isDarkMode,
  onLayoutChange,
  onWidgetSelect,
  onWidgetUpdate,
  onWidgetDelete,
  onWidgetDuplicate,
  onWidgetConfigUpdate,
  onAddWidget,
  dashboardTitle = 'Dashboard Title',
  dashboardSubtitle = 'Dashboard Subtitle',
  onTitleChange,
  onSubtitleChange
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showGrid, setShowGrid] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; widget: DashboardWidget } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            break;
          case 'c':
            if (selectedWidget) {
              e.preventDefault();
              handleDuplicate();
            }
            break;
          case 'd':
            if (selectedWidget) {
              e.preventDefault();
              handleDelete();
            }
            break;
          case 'f':
            e.preventDefault();
            setIsFullscreen(!isFullscreen);
            break;
        }
      }
      
      if (e.key === 'Delete' && selectedWidget) {
        handleDelete();
      }
      
      if (e.key === 'Escape') {
        onWidgetSelect(null);
        setContextMenu(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWidget, isFullscreen]);

  const handleSave = () => {
    message.success('Dashboard saved successfully!');
  };

  const handleUndo = () => {
    message.info('Undo functionality coming soon!');
  };

  const handleRedo = () => {
    message.info('Redo functionality coming soon!');
  };

  const handleDuplicate = () => {
    if (selectedWidget) {
      onWidgetDuplicate(selectedWidget);
      message.success('Widget duplicated!');
    }
  };

  const handleDelete = () => {
    if (selectedWidget) {
      Modal.confirm({
        title: 'Delete Widget',
        content: `Are you sure you want to delete "${selectedWidget.title}"?`,
        okText: 'Delete',
        okType: 'danger',
        cancelText: 'Cancel',
        onOk: () => {
          onWidgetDelete(selectedWidget.id);
          message.success('Widget deleted!');
        }
      });
    }
  };

  const handleContextMenu = (e: React.MouseEvent, widget: DashboardWidget) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      widget
    });
  };

  const contextMenuItems = [
    {
      key: 'edit',
      label: 'Edit',
      icon: <EditOutlined />,
      onClick: () => {
        if (contextMenu) {
          onWidgetSelect(contextMenu.widget);
          setContextMenu(null);
        }
      }
    },
    {
      key: 'duplicate',
      label: 'Duplicate',
      icon: <CopyOutlined />,
      onClick: () => {
        if (contextMenu) {
          onWidgetDuplicate(contextMenu.widget);
          setContextMenu(null);
        }
      }
    },
    {
      key: 'visibility',
      label: contextMenu?.widget.isVisible ? 'Hide' : 'Show',
      icon: contextMenu?.widget.isVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />,
      onClick: () => {
        if (contextMenu) {
          onWidgetUpdate(contextMenu.widget.id, { isVisible: !contextMenu.widget.isVisible });
          setContextMenu(null);
        }
      }
    },
    {
      key: 'lock',
      label: contextMenu?.widget.isLocked ? 'Unlock' : 'Lock',
      icon: contextMenu?.widget.isLocked ? <UnlockOutlined /> : <LockOutlined />,
      onClick: () => {
        if (contextMenu) {
          onWidgetUpdate(contextMenu.widget.id, { isLocked: !contextMenu.widget.isLocked });
          setContextMenu(null);
        }
      }
    },
    {
      type: 'divider' as const
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => {
        if (contextMenu) {
          handleDelete();
          setContextMenu(null);
        }
      }
    }
  ];

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 50));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  const handleRefresh = () => {
    message.success('Dashboard refreshed!');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const widgetData = JSON.parse(e.dataTransfer.getData('application/json'));
      if (onAddWidget) {
        onAddWidget(widgetData);
      }
    } catch (error) {
      console.error('Failed to parse dropped widget data:', error);
    }
  };

  const handleLayoutChange = (newLayout: any[]) => {
    onLayoutChange(newLayout);
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragStop = () => {
    setIsDragging(false);
  };

  const handleResizeStart = () => {
    setIsResizing(true);
  };

  const handleResizeStop = () => {
    setIsResizing(false);
  };

  return (
    <div 
      ref={canvasRef}
      style={{
        height: '100%',
        width: '100%',
        position: 'relative',
        background: isDarkMode ? '#1a1a1a' : '#f5f5f5',
        transform: `scale(${zoomLevel / 100})`,
        transformOrigin: 'top left',
        transition: isDragging || isResizing ? 'none' : 'transform 0.2s ease',
        border: isDragOver ? '2px dashed #1890ff' : '2px dashed transparent',
        borderRadius: '8px'
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Dashboard Title and Subtitle */}
      <div style={{ 
        marginBottom: '20px', 
        textAlign: 'left',
        borderBottom: `1px solid ${isDarkMode ? '#303030' : '#e8e8e8'}`,
        paddingBottom: '16px'
      }}>
        <Input
          placeholder="Dashboard Title"
          value={dashboardTitle}
          onChange={(e) => onTitleChange?.(e.target.value)}
          style={{ 
            border: 'none',
            background: 'transparent',
            color: isDarkMode ? '#ffffff' : '#000000',
            fontSize: '24px',
            fontWeight: 'bold',
            padding: '0',
            marginBottom: '4px'
          }}
          size="large"
        />
        <Input
          placeholder="Dashboard Subtitle"
          value={dashboardSubtitle}
          onChange={(e) => onSubtitleChange?.(e.target.value)}
          style={{ 
            border: 'none',
            background: 'transparent',
            color: isDarkMode ? '#999' : '#666',
            fontSize: '14px',
            padding: '0'
          }}
          size="small"
        />
      </div>

      {/* Grid Layout */}
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: layout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={60}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onResizeStart={handleResizeStart}
        onResizeStop={handleResizeStop}
        isDraggable={true}
        isResizable={true}
        useCSSTransforms={true}
        compactType="vertical"
        preventCollision={false}
        margin={[16, 16]}
        containerPadding={[16, 16]}
        style={{
          background: showGrid ? 
            (isDarkMode ? 'rgba(24, 144, 255, 0.05)' : 'rgba(24, 144, 255, 0.02)') : 
            'transparent'
        }}
      >
        {widgets.map((widget) => {
          const layoutItem = layout.find(item => item.i === widget.id);
          return (
            <div 
              key={widget.id} 
              data-grid={layoutItem || { x: 0, y: 0, w: 6, h: 4, minW: 2, minH: 2 }}
              className={`dashboard-widget ${selectedWidget?.id === widget.id ? 'selected' : ''} ${widget.isLocked ? 'locked' : ''}`}
              onClick={() => onWidgetSelect(widget)}
              onContextMenu={(e) => handleContextMenu(e, widget)}
              style={{
                cursor: widget.isLocked ? 'default' : 'pointer',
                border: selectedWidget?.id === widget.id ? '2px solid #1890ff' : '1px solid transparent',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                position: 'relative',
                background: 'transparent',
                boxShadow: selectedWidget?.id === widget.id ? 
                  '0 4px 12px rgba(24, 144, 255, 0.3)' : 
                  'none',
                opacity: widget.isVisible ? 1 : 0.5
              }}
            >
              {/* Widget Header */}
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                zIndex: 10,
                opacity: selectedWidget?.id === widget.id ? 1 : 0,
                transition: 'opacity 0.2s ease'
              }}>
                <Space size="small">
                  {!widget.isVisible && (
                    <Tooltip title="Hidden">
                      <EyeInvisibleOutlined style={{ color: '#999', fontSize: '12px' }} />
                    </Tooltip>
                  )}
                  {widget.isLocked && (
                    <Tooltip title="Locked">
                      <LockOutlined style={{ color: '#faad14', fontSize: '12px' }} />
                    </Tooltip>
                  )}
                  <Dropdown
                    menu={{ items: contextMenuItems }}
                    trigger={['click']}
                    placement="bottomRight"
                  >
                    <Button 
                      size="small" 
                      type="text" 
                      icon={<MoreOutlined />}
                      style={{ 
                        color: isDarkMode ? '#ffffff' : '#000000',
                        background: isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(4px)'
                      }}
                    />
                  </Dropdown>
                </Space>
              </div>

              {/* Widget Content */}
              <div style={{ 
                height: '100%', 
                overflow: 'hidden'
              }}>
                              <WidgetRenderer
                widget={widget}
                onConfigUpdate={(config) => onWidgetConfigUpdate(widget.id, config)}
                isDarkMode={isDarkMode}
              />
              </div>
            </div>
          );
        })}
      </ResponsiveGridLayout>

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 10000,
            background: isDarkMode ? '#2a2a2a' : '#ffffff',
            border: `1px solid ${isDarkMode ? '#404040' : '#d9d9d9'}`,
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            padding: '4px 0',
            minWidth: '150px'
          }}
          onClick={() => setContextMenu(null)}
        >
          <Menu
            items={contextMenuItems}
            style={{
              background: 'transparent',
              border: 'none',
              boxShadow: 'none'
            }}
          />
        </div>
      )}

      {/* Empty State */}
      {widgets.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: isDarkMode ? '#999' : '#666'
        }}>
          <BarChartOutlined style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }} />
          <Title level={4} style={{ color: isDarkMode ? '#999' : '#666', marginBottom: '8px' }}>
            Empty Dashboard
          </Title>
          <Text style={{ color: isDarkMode ? '#666' : '#999' }}>
            Drag widgets from the library to start building your dashboard
          </Text>
        </div>
      )}
    </div>
  );
};

export default AdvancedDashboardCanvas;
