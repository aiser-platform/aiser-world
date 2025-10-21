'use client';

import React from 'react';
import { Card, Button, Space, Typography } from 'antd';

const { Title, Text } = Typography;

export default function TestDesignSystem() {
  return (
    <div style={{ padding: '20px', background: 'var(--layout-background)', minHeight: '100vh' }}>
      <Title level={2}>Design System Test</Title>
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Test Panel Backgrounds */}
        <Card title="Panel Background Test" style={{ background: 'var(--layout-panel-background)' }}>
          <Text>This should have panel background</Text>
        </Card>
        
        <Card title="Subtle Panel Background Test" style={{ background: 'var(--layout-panel-background-subtle)' }}>
          <Text>This should have subtle panel background</Text>
        </Card>
        
        <Card title="Raised Panel Background Test" style={{ background: 'var(--layout-panel-background-raised)' }}>
          <Text>This should have raised panel background</Text>
        </Card>
        
        {/* Test Enhanced Panels */}
        <div className="enhanced-chat-panel test-panel" style={{ padding: '20px', height: '200px' }}>
          <Title level={4}>Enhanced Chat Panel</Title>
          <Text>This should have the enhanced chat panel styling with borders and shadows</Text>
        </div>
        
        <div className="enhanced-data-panel test-panel" style={{ padding: '20px', height: '200px' }}>
          <Title level={4}>Enhanced Data Panel</Title>
          <Text>This should have the enhanced data panel styling with borders and shadows</Text>
        </div>
        
        <div className="collapsible-history-panel test-panel" style={{ padding: '20px', height: '200px' }}>
          <Title level={4}>History Panel</Title>
          <Text>This should have the history panel styling with borders and shadows</Text>
        </div>
        
        {/* Debug Test */}
        <div className="test-panel">
          <Title level={4}>Debug Test Panel</Title>
          <Text>This panel uses the debug test-panel class to verify CSS variables are working</Text>
        </div>
        
        {/* Test Buttons */}
        <Space>
          <Button type="primary">Primary Button</Button>
          <Button>Default Button</Button>
          <Button type="dashed">Dashed Button</Button>
        </Space>
        
        {/* Test Text Colors */}
        <div>
          <Text style={{ color: 'var(--color-text-primary)' }}>Primary Text</Text><br/>
          <Text style={{ color: 'var(--color-text-secondary)' }}>Secondary Text</Text><br/>
          <Text style={{ color: 'var(--color-text-tertiary)' }}>Tertiary Text</Text>
        </div>
      </Space>
    </div>
  );
}
