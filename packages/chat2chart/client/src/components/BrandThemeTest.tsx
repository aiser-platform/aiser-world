'use client';

import React from 'react';
import { Button, Card, Space, Typography, message } from 'antd';
import { useBrandTheme } from './Providers/BrandThemeProvider';
import { DEFAULT_BRAND_PRESETS } from './Providers/BrandThemeProvider';

const { Title, Text } = Typography;

export function BrandThemeTest() {
  const { brandTokens, updateBrandToken, resetBrandTheme, loadBrandPreset, isCustomBrand } = useBrandTheme();

  const testBrandChange = () => {
    // Test changing primary color
    updateBrandToken('--ant-primary-color', '#ff6b6b');
    message.success('Primary color changed to red!');
  };

  const testPreset = () => {
    const greenPreset = DEFAULT_BRAND_PRESETS.find(p => p.name === 'Modern Green');
    if (greenPreset) {
      loadBrandPreset(greenPreset);
      message.success('Applied Modern Green preset!');
    }
  };

  return (
    <Card title="Brand Theme Test" style={{ margin: '20px' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Title level={4}>Current Brand Status</Title>
          <Text>Custom Brand: {isCustomBrand ? 'Yes' : 'No'}</Text>
          <br />
          <Text>Primary Color: {brandTokens['--ant-primary-color'] || 'Default'}</Text>
        </div>
        
        <Space>
          <Button type="primary" onClick={testBrandChange}>
            Test Color Change
          </Button>
          <Button onClick={testPreset}>
            Apply Green Preset
          </Button>
          <Button onClick={resetBrandTheme}>
            Reset to Default
          </Button>
        </Space>
        
        <div>
          <Title level={5}>Current Brand Tokens:</Title>
          <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
            {JSON.stringify(brandTokens, null, 2)}
          </pre>
        </div>
      </Space>
    </Card>
  );
}

export default BrandThemeTest;
