'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Space, Tooltip, Badge, Dropdown, Menu, message, Typography, Row, Col } from 'antd';
import {
  ReloadOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  MoreOutlined,
  SettingOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useDashboardStore } from '@/stores/useDashboardStore';

const { Text } = Typography;

export interface RefreshControlsProps {
  widgets: any[];
  onRefreshAll: () => Promise<void>;
  onRefreshWidget: (widgetId: string) => Promise<void>;
  lastRefreshTime?: Date;
  isDarkMode?: boolean;
  className?: string;
}

export const RefreshControls: React.FC<RefreshControlsProps> = ({
  widgets,
  onRefreshAll,
  onRefreshWidget,
  lastRefreshTime,
  isDarkMode = false,
  className = ''
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshingWidgets, setRefreshingWidgets] = useState<Set<string>>(new Set());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(300); // 5 minutes
  const [refreshCount, setRefreshCount] = useState(0);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(async () => {
      try {
        await handleRefreshAll();
      } catch (error) {
        console.error('Auto-refresh failed:', error);
        message.error('Auto-refresh failed');
      }
    }, autoRefreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, autoRefreshInterval]);

  // Handle refresh all widgets
  const handleRefreshAll = useCallback(async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      setRefreshCount(prev => prev + 1);
      await onRefreshAll();
      message.success('Dashboard refreshed successfully');
    } catch (error) {
      console.error('Refresh all failed:', error);
      message.error('Failed to refresh dashboard');
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onRefreshAll]);

  // Handle refresh single widget
  const handleRefreshWidget = useCallback(async (widgetId: string) => {
    if (refreshingWidgets.has(widgetId)) return;
    
    try {
      setRefreshingWidgets(prev => new Set(prev).add(widgetId));
      await onRefreshWidget(widgetId);
      message.success('Widget refreshed successfully');
    } catch (error) {
      console.error('Widget refresh failed:', error);
      message.error('Failed to refresh widget');
    } finally {
      setRefreshingWidgets(prev => {
        const newSet = new Set(prev);
        newSet.delete(widgetId);
        return newSet;
      });
    }
  }, [refreshingWidgets, onRefreshWidget]);

  // Toggle auto-refresh
  const toggleAutoRefresh = useCallback(() => {
    setAutoRefreshEnabled(prev => !prev);
    message.info(`Auto-refresh ${!autoRefreshEnabled ? 'enabled' : 'disabled'}`);
  }, [autoRefreshEnabled]);

  // Format last refresh time
  const formatLastRefresh = useCallback((time?: Date) => {
    if (!time) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }, []);

  // Auto-refresh interval options
  const intervalOptions = [
    { label: '30 seconds', value: 30 },
    { label: '1 minute', value: 60 },
    { label: '5 minutes', value: 300 },
    { label: '15 minutes', value: 900 },
    { label: '30 minutes', value: 1800 },
    { label: '1 hour', value: 3600 }
  ];

  return (
    <div className={`refresh-controls ${className}`} style={{
      background: isDarkMode ? '#1f1f1f' : '#ffffff',
      border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
      borderRadius: 8,
      padding: '12px 16px'
    }}>
      <Row align="middle" justify="space-between">
        <Col>
          <Space size="middle">
            {/* Manual Refresh Button */}
            <Tooltip title="Refresh all widgets">
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                loading={isRefreshing}
                onClick={handleRefreshAll}
                disabled={isRefreshing}
              >
                Refresh All
              </Button>
            </Tooltip>

            {/* Auto-refresh Toggle */}
            <Tooltip title={autoRefreshEnabled ? 'Disable auto-refresh' : 'Enable auto-refresh'}>
              <Button
                type={autoRefreshEnabled ? 'primary' : 'default'}
                icon={<SyncOutlined />}
                onClick={toggleAutoRefresh}
                style={{
                  background: autoRefreshEnabled ? '#52c41a' : undefined,
                  borderColor: autoRefreshEnabled ? '#52c41a' : undefined
                }}
              >
                Auto Refresh
              </Button>
            </Tooltip>

            {/* Auto-refresh Interval */}
            {autoRefreshEnabled && (
              <Dropdown
                menu={{
                  items: intervalOptions.map(option => ({
                    key: option.value,
                    label: option.label,
                    onClick: () => setAutoRefreshInterval(option.value)
                  }))
                }}
                trigger={['click']}
              >
                <Button icon={<ClockCircleOutlined />}>
                  {intervalOptions.find(opt => opt.value === autoRefreshInterval)?.label}
                </Button>
              </Dropdown>
            )}

            {/* Refresh Stats */}
            <Space size="small">
              <Badge 
                count={refreshCount} 
                style={{ 
                  backgroundColor: isDarkMode ? '#1890ff' : '#52c41a' 
                }}
              />
              <Text style={{ 
                fontSize: 12, 
                color: isDarkMode ? '#ffffff' : '#666666' 
              }}>
                Last: {formatLastRefresh(lastRefreshTime)}
              </Text>
            </Space>
          </Space>
        </Col>

        <Col>
          <Space size="small">
            {/* Widget Refresh Dropdown */}
            <Dropdown
              menu={{
                items: widgets.map(widget => ({
                  key: widget.id,
                  label: (
                    <Space>
                      <span>{widget.title || `Widget ${widget.id}`}</span>
                      {refreshingWidgets.has(widget.id) && (
                        <SyncOutlined spin style={{ color: '#1890ff' }} />
                      )}
                    </Space>
                  ),
                  onClick: () => handleRefreshWidget(widget.id),
                  disabled: refreshingWidgets.has(widget.id)
                }))
              }}
              trigger={['click']}
              disabled={widgets.length === 0}
            >
              <Button 
                icon={<MoreOutlined />}
                disabled={widgets.length === 0}
              >
                Refresh Widget ({widgets.length})
              </Button>
            </Dropdown>

            {/* Performance Indicator */}
            <Tooltip title="Performance metrics">
              <Badge 
                dot 
                style={{ 
                  backgroundColor: '#52c41a' 
                }}
              >
                <Button 
                  icon={<ThunderboltOutlined />}
                  type="text"
                  size="small"
                />
              </Badge>
            </Tooltip>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default RefreshControls;


