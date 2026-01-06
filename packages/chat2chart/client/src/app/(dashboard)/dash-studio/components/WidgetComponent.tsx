'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { widgetConfigManager } from '../config/WidgetConfigManager';

interface WidgetComponentProps {
  widgetId: string;
  onWidgetClick?: (widget: any) => void;
  onDelete?: (widgetId: string) => void;
}

// SINGLE SOURCE OF TRUTH: Widget Component
export const WidgetComponent: React.FC<WidgetComponentProps> = ({
  widgetId,
  onWidgetClick,
  onDelete
}) => {
  const widget = useDashboardStore((state: any) => state.getWidget(widgetId));
  const selectedWidgetIds = useDashboardStore((state: any) => state.selectedWidgetIds);
  const updateWidgetConfig = useDashboardStore((state: any) => state.updateWidgetConfig);
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingSubtitle, setIsEditingSubtitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingSubtitle, setEditingSubtitle] = useState('');
  
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<any>(null);
  
  const isSelected = selectedWidgetIds.includes(widgetId);
  
  // Initialize editing states
  useEffect(() => {
    if (widget) {
      setEditingTitle(widget.title || '');
      setEditingSubtitle(widget.subtitle || '');
    }
  }, [widget]);
  
  if (!widget) {
    return null;
  }
  
  const widgetType = widgetConfigManager.getWidgetType(widget.type);
  if (!widgetType) {
    return null;
  }
  
  // Handle title editing
  const handleTitleEdit = () => {
    setIsEditingTitle(true);
    setEditingTitle(widget.title || '');
  };
  
  const handleTitleSave = () => {
    if (editingTitle !== widget.title) {
      updateWidgetConfig(widgetId, { title: editingTitle });
    }
    setIsEditingTitle(false);
  };
  
  const handleTitleCancel = () => {
    setEditingTitle(widget.title || '');
    setIsEditingTitle(false);
  };
  
  // Handle subtitle editing
  const handleSubtitleEdit = () => {
    setIsEditingSubtitle(true);
    setEditingSubtitle(widget.subtitle || '');
  };
  
  const handleSubtitleSave = () => {
    if (editingSubtitle !== widget.subtitle) {
      updateWidgetConfig(widgetId, { subtitle: editingSubtitle });
    }
    setIsEditingSubtitle(false);
  };
  
  const handleSubtitleCancel = () => {
    setEditingSubtitle(widget.subtitle || '');
    setIsEditingSubtitle(false);
  };
  
  // Handle widget click
  const handleClick = (e: React.MouseEvent) => {
    if (onWidgetClick) {
      onWidgetClick(widget);
    }
  };
  
  // Render chart content based on widget type
  const renderChartContent = () => {
    if (widget.type === 'bar' || widget.type === 'line' || widget.type === 'pie') {
      return (
        <div
          ref={chartRef}
          style={{
            width: '100%',
            height: '100%',
            minHeight: '150px',
            minWidth: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: widget.config.backgroundColor || 'transparent',
            border: isSelected ? '2px solid #1890ff' : '1px solid #d9d9d9',
            borderRadius: '8px',
            position: 'relative'
          }}
        >
          {/* Placeholder for chart - will be replaced with actual ECharts implementation */}
          <div style={{
            color: '#666',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {widgetType.name}
            <br />
            <small>Chart will render here</small>
          </div>
        </div>
      );
    }
    
    return (
      <div style={{
        width: '100%',
        height: '100%',
        minHeight: '150px',
        minWidth: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: widget.config.backgroundColor || 'transparent',
        border: isSelected ? '2px solid #1890ff' : '1px solid #d9d9d9',
        borderRadius: '8px',
        position: 'relative'
      }}>
        <div style={{
          color: '#666',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          {widgetType.name}
          <br />
          <small>Widget content will render here</small>
        </div>
      </div>
    );
  };
  
  return (
    <div
      className={`dashboard-widget ${isSelected ? 'dashboard-widget--selected' : ''}`}
      data-grid-id={widgetId}
      onClick={handleClick}
      tabIndex={0}
      role="region"
      aria-label={`Widget: ${widget.title || 'Untitled Widget'}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        cursor: 'pointer'
      }}
    >
      {/* Widget Header */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '8px 12px',
        borderBottom: '1px solid #d9d9d9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Title */}
        <div style={{ flex: 1, marginRight: '8px' }}>
          {isEditingTitle ? (
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') handleTitleCancel();
              }}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: '14px',
                fontWeight: 'bold',
                backgroundColor: 'transparent'
              }}
              autoFocus
            />
          ) : (
            <div
              onClick={handleTitleEdit}
              style={{
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'text',
                minHeight: '20px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {widget.title || 'Untitled Widget'}
            </div>
          )}
          
          {/* Subtitle */}
          {isEditingSubtitle ? (
            <input
              type="text"
              value={editingSubtitle}
              onChange={(e) => setEditingSubtitle(e.target.value)}
              onBlur={handleSubtitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubtitleSave();
                if (e.key === 'Escape') handleSubtitleCancel();
              }}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: '12px',
                color: '#666',
                backgroundColor: 'transparent',
                marginTop: '2px'
              }}
              autoFocus
            />
          ) : (
            <div
              onClick={handleSubtitleEdit}
              style={{
                fontSize: '12px',
                color: '#666',
                cursor: 'text',
                minHeight: '16px',
                display: 'flex',
                alignItems: 'center',
                marginTop: '2px'
              }}
            >
              {widget.subtitle || 'Click to add subtitle'}
            </div>
          )}
        </div>
        
        {/* Widget Actions */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {onDelete && (
            <button
              onClick={() => onDelete(widgetId)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                color: '#ff4d4f'
              }}
              title="Delete widget"
              tabIndex={0}
              aria-label="Delete widget"
            >
              ×
            </button>
          )}
        </div>
      </div>
      
      {/* Widget Content */}
      <div style={{
        position: 'absolute',
        top: '40px', // Account for header height
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden'
      }}>
        {renderChartContent()}
      </div>
    </div>
  );
};

export default WidgetComponent;
