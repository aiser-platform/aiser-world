'use client';

import React from 'react';
import { Button, Card, Space, Typography } from 'antd';
import { useThemeMode } from '@/components/Providers/ThemeModeContext';

const { Title, Text } = Typography;

export default function TestDarkModePage() {
  const { isDarkMode, setIsDarkMode } = useThemeMode();

  const testColors = [
    { name: 'Header Background', token: '--ant-color-bg-container' },
    { name: 'Sidebar Background', token: '--ant-color-bg-container' },
    { name: 'Main Content Background', token: '--ant-color-bg-layout' },
    { name: 'Chat Panel Background', token: '--ant-color-bg-container' },
    { name: 'Panel Background', token: '--ant-color-bg-elevated' },
    { name: 'Text Primary', token: '--ant-color-text' },
    { name: 'Border Primary', token: '--ant-color-border' },
  ];

  const getComputedColor = (token: string) => {
    if (typeof window !== 'undefined') {
      const s = getComputedStyle(document.documentElement);
      return s.getPropertyValue(token).trim();
    }
    return 'N/A';
  };

  return (
    <div style={{ 
      padding: '24px',
      background: 'var(--ant-color-bg-layout)',
      color: 'var(--ant-color-text)',
      minHeight: '100vh'
    }}>
      <Card style={{ marginBottom: '24px' }}>
        <Title level={2}>Dark Mode Test Page</Title>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text strong>Current Mode: </Text>
            <Text code>{isDarkMode ? 'Dark' : 'Light'}</Text>
          </div>
          
          <Button 
            type="primary" 
            onClick={() => setIsDarkMode(!isDarkMode)}
            size="large"
          >
            Toggle to {isDarkMode ? 'Light' : 'Dark'} Mode
          </Button>

          <div>
            <Text strong>Ant Design Theme: </Text>
            <Text code>{isDarkMode ? 'Dark Algorithm' : 'Default Algorithm'}</Text>
          </div>
        </Space>
      </Card>

      <Card title="Color Values">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {testColors.map((color) => (
            <div key={color.token} style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px',
              background: 'var(--ant-color-bg-elevated)',
              borderRadius: '4px',
              border: '1px solid var(--ant-color-border)'
            }}>
              <Text strong>{color.name}</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Text code>{color.token}</Text>
                <div style={{
                  width: '20px',
                  height: '20px',
                  background: getComputedColor(color.token),
                  border: '1px solid var(--ant-color-border)',
                  borderRadius: '2px'
                }} />
                <Text code>{getComputedColor(color.token)}</Text>
              </div>
            </div>
          ))}
        </Space>
      </Card>

      <Card title="Test Components" style={{ marginTop: '24px' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{
            padding: '16px',
            background: 'var(--ant-color-bg-container)',
            border: '1px solid var(--ant-color-border)',
            borderRadius: '8px'
          }}>
            <Text strong>Header Background Test</Text>
          </div>
          
          <div style={{
            padding: '16px',
            background: 'var(--ant-color-bg-container)',
            border: '1px solid var(--ant-color-border)',
            borderRadius: '8px'
          }}>
            <Text strong>Sidebar Background Test</Text>
          </div>
          
          <div style={{
            padding: '16px',
            background: 'var(--ant-color-bg-elevated)',
            border: '1px solid var(--ant-color-border)',
            borderRadius: '8px'
          }}>
            <Text strong>Panel Background Test</Text>
          </div>
          
          <div style={{
            padding: '16px',
            background: 'var(--ant-color-bg-layout)',
            border: '1px solid var(--ant-color-border)',
            borderRadius: '8px'
          }}>
            <Text strong>Main Content Background Test</Text>
          </div>
        </Space>
      </Card>
    </div>
  );
}
