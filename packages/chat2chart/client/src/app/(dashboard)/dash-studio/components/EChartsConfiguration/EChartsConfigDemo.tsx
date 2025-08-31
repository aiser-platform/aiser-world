'use client';

import React, { useEffect } from 'react';
import { Card, Row, Col, Button, Space, message } from 'antd';
import { 
  EChartsConfigProvider, 
  EChartsConfigurationPanel, 
  EChartsOptionGenerator 
} from './index';
import * as echarts from 'echarts';

// Sample data for demonstration
const SAMPLE_DATA = [
  { month: 'Jan', sales: 120, profit: 80, region: 'North' },
  { month: 'Feb', sales: 150, profit: 95, region: 'North' },
  { month: 'Mar', sales: 180, profit: 120, region: 'North' },
  { month: 'Apr', sales: 220, profit: 150, region: 'South' },
  { month: 'May', sales: 260, profit: 180, region: 'South' },
  { month: 'Jun', sales: 300, profit: 220, region: 'South' },
  { month: 'Jul', sales: 350, profit: 250, region: 'East' },
];

export const EChartsConfigDemo: React.FC = () => {
  return (
    <EChartsConfigProvider>
      <div style={{ padding: '20px' }}>
        <h2>ECharts Configuration Demo</h2>
        <p>Configure your chart using the panels below. Changes are reflected in real-time.</p>
        
        <Row gutter={[20, 20]}>
          {/* Configuration Panel */}
          <Col xs={24} lg={8}>
            <Card title="Chart Configuration" size="small">
              <EChartsConfigurationPanel />
            </Card>
          </Col>
          
          {/* Live Preview */}
          <Col xs={24} lg={16}>
            <Card title="Live Preview" size="small">
              <ChartPreview />
            </Card>
          </Col>
        </Row>
        
        <Row style={{ marginTop: '20px' }}>
          <Col span={24}>
            <Card title="Generated ECharts Options" size="small">
              <OptionsDisplay />
            </Card>
          </Col>
        </Row>
      </div>
    </EChartsConfigProvider>
  );
};

// Chart Preview Component
const ChartPreview: React.FC = () => {
  const { state } = useEChartsConfig();
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chartInstance = React.useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (chartRef.current && state.data.length > 0) {
      // Initialize chart
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
      }
      
      // Generate options
      const options = EChartsOptionGenerator.generateOption(state.basic, state.data);
      
      // Set options
      chartInstance.current.setOption(options, true);
      
      // Handle resize
      const handleResize = () => {
        chartInstance.current?.resize();
      };
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [state.basic, state.standard, state.advanced, state.data]);

  useEffect(() => {
    // Set sample data when component mounts
    if (state.data.length === 0) {
      // This would typically be done through the context
      // For demo purposes, we'll simulate it
    }
  }, []);

  return (
    <div>
      <div 
        ref={chartRef} 
        style={{ 
          width: '100%', 
          height: '400px',
          border: '1px solid #f0f0f0',
          borderRadius: '6px',
          background: '#fff'
        }} 
      />
      {state.data.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#8c8c8c',
          fontSize: '14px'
        }}>
          No data available. Please configure data fields.
        </div>
      )}
    </div>
  );
};

// Options Display Component
const OptionsDisplay: React.FC = () => {
  const { state } = useEChartsConfig();
  
  const getGeneratedOptions = () => {
    if (state.data.length === 0) return {};
    return EChartsOptionGenerator.generateOption(state.basic, state.data);
  };

  const handleExportOptions = () => {
    const options = getGeneratedOptions();
    const optionsStr = JSON.stringify(options, null, 2);
    
    // Create download link
    const blob = new Blob([optionsStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'echarts-options.json';
    a.click();
    URL.revokeObjectURL(url);
    
    message.success('Options exported successfully!');
  };

  const handleCopyOptions = () => {
    const options = getGeneratedOptions();
    const optionsStr = JSON.stringify(options, null, 2);
    
    navigator.clipboard.writeText(optionsStr).then(() => {
      message.success('Options copied to clipboard!');
    }).catch(() => {
      message.error('Failed to copy options');
    });
  };

  return (
    <div>
      <Space style={{ marginBottom: '16px' }}>
        <Button size="small" onClick={handleExportOptions}>
          Export JSON
        </Button>
        <Button size="small" onClick={handleCopyOptions}>
          Copy to Clipboard
        </Button>
      </Space>
      
      <div style={{ 
        background: '#f5f5f5', 
        padding: '16px', 
        borderRadius: '6px',
        maxHeight: '300px',
        overflow: 'auto',
        fontFamily: 'monospace',
        fontSize: '12px'
      }}>
        <pre>{JSON.stringify(getGeneratedOptions(), null, 2)}</pre>
      </div>
    </div>
  );
};

// Hook to use ECharts config (this would be imported from the context)
const useEChartsConfig = () => {
  // This is a placeholder - in real usage, this would come from the context
  return {
    state: {
      basic: {
        chartType: 'bar',
        title: 'Sample Chart',
        subtitle: 'Generated from sample data',
        dataBinding: {
          xField: 'month',
          yFields: ['sales', 'profit'],
          seriesField: 'region'
        },
        basicStyling: {
          colors: ['#5070dd', '#b6d634', '#505372'],
          fontSize: 12,
          showLegend: true
        }
      },
      standard: {},
      advanced: {},
      data: SAMPLE_DATA,
      level: 'basic'
    }
  };
};
