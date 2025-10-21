'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Avatar, Badge, Tooltip, Space, Typography, Card, Button, Dropdown, Menu } from 'antd';
import { UserOutlined, EyeOutlined, EditOutlined, MoreOutlined } from '@ant-design/icons';
import { useCollaboration } from '@/hooks/useCollaboration';

const { Text } = Typography;

export interface UserPresence {
  id: string;
  name: string;
  avatar?: string;
  email: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
  currentWidget?: string;
  cursorPosition?: { x: number; y: number };
}

export interface CollaborationPresenceProps {
  dashboardId: string;
  currentUser: {
    id: string;
    name: string;
    avatar?: string;
    email: string;
  };
  isDarkMode?: boolean;
  onUserClick?: (user: UserPresence) => void;
}

export const CollaborationPresence: React.FC<CollaborationPresenceProps> = ({
  dashboardId,
  currentUser,
  isDarkMode = false,
  onUserClick
}) => {
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const cursorRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  const collaboration = useCollaboration(dashboardId);
  
  // Handle case where collaboration hook returns null
  const users: any[] = []; // Socket doesn't have users property
  const broadcastPresence = (_: any) => {}; // Placeholder
  const broadcastCursor = (_: any) => {}; // Placeholder
  const broadcastWidgetSelection = (_: any) => {}; // Placeholder
  const onUserJoined = (_: any) => {}; // Placeholder
  const onUserLeft = (_: any) => {}; // Placeholder
  const onCursorMoved = (_: any) => {}; // Placeholder
  const onWidgetSelected = (_: any) => {}; // Placeholder

  // Update active users when collaboration users change
  useEffect(() => {
    const presenceUsers: UserPresence[] = users.map(user => ({
      id: user.id,
      name: user.name || user.email.split('@')[0],
      avatar: user.avatar,
      email: user.email,
      status: user.isActive ? 'online' : 'away',
      lastSeen: new Date(),
      currentWidget: user.currentWidget,
      cursorPosition: user.cursorPosition
    }));

    setActiveUsers(presenceUsers);
  }, [users]);

  // Broadcast current user presence
  useEffect(() => {
    const interval = setInterval(() => {
      broadcastPresence({
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
        email: currentUser.email,
        isActive: true,
        currentWidget: undefined,
        cursorPosition: undefined
      });
    }, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, [currentUser, broadcastPresence]);

  // Handle cursor movement
  const handleCursorMove = useCallback((event: MouseEvent) => {
    broadcastCursor({
      x: event.clientX,
      y: event.clientY
    });
  }, [broadcastCursor]);

  // Add cursor movement listener
  useEffect(() => {
    if (isVisible) {
      document.addEventListener('mousemove', handleCursorMove);
      return () => document.removeEventListener('mousemove', handleCursorMove);
    }
  }, [isVisible, handleCursorMove]);

  // Handle widget selection
  const handleWidgetSelection = useCallback((widgetId: string) => {
    broadcastWidgetSelection(widgetId);
  }, [broadcastWidgetSelection]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#52c41a';
      case 'away': return '#faad14';
      case 'offline': return '#d9d9d9';
      default: return '#d9d9d9';
    }
  };

  // Render user avatar with status
  const renderUserAvatar = (user: UserPresence) => (
    <Tooltip
      key={user.id}
      title={
        <div>
          <div><strong>{user.name}</strong></div>
          <div>{user.email}</div>
          <div>Status: {user.status}</div>
          {user.currentWidget && (
            <div>Viewing: {user.currentWidget}</div>
          )}
        </div>
      }
    >
      <Badge
        dot
        color={getStatusColor(user.status)}
        offset={[-2, 2]}
      >
        <Avatar
          size="small"
          src={user.avatar}
          icon={<UserOutlined />}
          style={{
            cursor: 'pointer',
            border: `2px solid ${getStatusColor(user.status)}`
          }}
          onClick={() => onUserClick?.(user)}
        />
      </Badge>
    </Tooltip>
  );

  // Render cursor for remote users
  const renderUserCursors = () => {
    return activeUsers
      .filter(user => user.id !== currentUser.id && user.cursorPosition)
      .map(user => (
        <div
          key={`cursor-${user.id}`}
          ref={el => {
            if (el) {
              cursorRefs.current.set(user.id, el);
            }
          }}
          style={{
            position: 'fixed',
            left: user.cursorPosition!.x,
            top: user.cursorPosition!.y,
            pointerEvents: 'none',
            zIndex: 9999,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: getStatusColor(user.status),
            border: '2px solid white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Text style={{ fontSize: 10, color: 'white', fontWeight: 'bold' }}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </div>
        </div>
      ));
  };

  // Early return if no collaboration support
  if (!collaboration) {
    return null;
  }

  if (!isVisible) {
    return (
      <Button
        type="text"
        icon={<EyeOutlined />}
        onClick={() => setIsVisible(true)}
        style={{ color: isDarkMode ? '#ffffff' : '#000000' }}
      >
        Show Presence
      </Button>
    );
  }

  return (
    <>
      {/* User Cursors */}
      {renderUserCursors()}
      
      {/* Presence Bar */}
      <Card
        size="small"
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 1000,
          background: isDarkMode ? '#1f1f1f' : '#ffffff',
          border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
          borderRadius: 8,
          minWidth: 200
        }}
        bodyStyle={{ padding: '8px 12px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size="small">
            <Text strong style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
              <EyeOutlined /> {activeUsers.length} viewing
            </Text>
            <Space size={4}>
              {activeUsers.slice(0, 5).map(renderUserAvatar)}
              {activeUsers.length > 5 && (
                <Tooltip title={`+${activeUsers.length - 5} more users`}>
                  <Avatar size="small" style={{ background: '#f0f0f0' }}>
                    +{activeUsers.length - 5}
                  </Avatar>
                </Tooltip>
              )}
            </Space>
          </Space>
          
          <Dropdown
            menu={{
              items: [
                {
                  key: 'details',
                  label: showDetails ? 'Hide Details' : 'Show Details',
                  icon: <MoreOutlined />,
                  onClick: () => setShowDetails(!showDetails)
                },
                {
                  key: 'hide',
                  label: 'Hide Presence',
                  icon: <EyeOutlined />,
                  onClick: () => setIsVisible(false)
                }
              ]
            }}
            trigger={['click']}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </div>

        {/* Detailed User List */}
        {showDetails && (
          <div style={{ marginTop: 8, borderTop: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`, paddingTop: 8 }}>
            {activeUsers.map(user => (
              <div
                key={user.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 0',
                  cursor: 'pointer'
                }}
                onClick={() => onUserClick?.(user)}
              >
                <Space size="small">
                  <Avatar
                    size="small"
                    src={user.avatar}
                    icon={<UserOutlined />}
                    style={{
                      border: `1px solid ${getStatusColor(user.status)}`
                    }}
                  />
                  <div>
                    <Text style={{ fontSize: 12, color: isDarkMode ? '#ffffff' : '#000000' }}>
                      {user.name}
                    </Text>
                    <br />
                    <Text style={{ fontSize: 10, color: isDarkMode ? '#999999' : '#666666' }}>
                      {user.status} • {user.lastSeen.toLocaleTimeString()}
                    </Text>
                  </div>
                </Space>
                
                {user.currentWidget && (
                  <Tooltip title={`Currently viewing: ${user.currentWidget}`}>
                    <Button
                      size="small"
                      type="text"
                      icon={<EditOutlined />}
                      style={{ color: getStatusColor(user.status) }}
                    />
                  </Tooltip>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
};

export default CollaborationPresence;
