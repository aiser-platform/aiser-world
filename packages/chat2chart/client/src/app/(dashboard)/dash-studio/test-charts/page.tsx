'use client';

import React, { useState } from 'react';
import { Card, Button, Space, Typography, Row, Col, Select, Input, Switch, Slider, ColorPicker, message, Tabs } from 'antd';
import { 
  BarChartOutlined, 
  LineChartOutlined, 
  PieChartOutlined, 
  AreaChartOutlined, 
  DotChartOutlined, 
  RadarChartOutlined, 
  HeatMapOutlined,
  FunnelPlotOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import ChartWidget from '../components/ChartWidget';
import { DashboardWidget } from '../components/DashboardConfiguration/DashboardConfigProvider';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

// Test data for different chart types
const TEST_DATA = {
  bar: {
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    series: [
      { name: 'Sales', data: [120, 200, 150, 80, 70, 110] },
      { name: 'Revenue', data: [100, 180, 130, 90, 60, 120] }
    ]
  },
  line: {
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    series: [
      { name: 'Temperature', data: [2, 3, 3, 4, 4, 3] },
      { name: 'Humidity', data: [80, 82, 81, 79, 78, 80] }
    ]
  },
  pie: {
    series: [
      { name: 'Desktop', value: 1048 },
      { name: 'Mobile', value: 735 },
      { name: 'Tablet', value: 580 },
      { name: 'TV', value: 484 }
    ]
  },
  area: {
    categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    series: [
      { name: 'Email', data: [120, 132, 101, 134, 90, 230, 210] },
      { name: 'Direct', data: [220, 182, 191, 234, 290, 330, 310] }
    ]
  },
  scatter: {
    series: [
      { name: 'Group A', data: [[161.2, 51.6], [167.5, 59.0], [159.5, 49.2], [157.0, 63.0], [155.8, 53.6]] },
      { name: 'Group B', data: [[174.0, 65.6], [175.3, 71.8], [193.5, 80.7], [186.5, 72.6], [187.2, 78.8]] }
    ]
  },
  radar: {
    indicators: [
      { name: 'Sales', max: 6500 },
      { name: 'Administration', max: 16000 },
      { name: 'Information Technology', max: 30000 },
      { name: 'Customer Support', max: 38000 },
      { name: 'Development', max: 52000 },
      { name: 'Marketing', max: 25000 }
    ],
    series: [
      { name: 'Allocated Budget', data: [4200, 3000, 20000, 35000, 50000, 18000] },
      { name: 'Actual Spending', data: [5000, 14000, 28000, 26000, 42000, 21000] }
    ]
  },
  heatmap: {
    series: [
      { name: 'Heatmap', data: [
        [0, 0, 5], [0, 1, 1], [0, 2, 0], [0, 3, 0], [0, 4, 0], [0, 5, 0],
        [1, 0, 7], [1, 1, 2], [1, 2, 0], [1, 3, 0], [1, 4, 0], [1, 5, 0]
      ]}
    ]
  },
  funnel: {
    series: [
      { name: 'Visit', value: 60 },
      { name: 'Inquiry', value: 40 },
      { name: 'Order', value: 20 },
      { name: 'Click', value: 80 },
      { name: 'Show', value: 100 }
    ]
  },
  gauge: {
    value: 20
  }
};

const CHART_TYPES = [
  { key: 'bar', name: 'Bar Chart', icon: <BarChartOutlined /> },
  { key: 'line', name: 'Line Chart', icon: <LineChartOutlined /> },
  { key: 'pie', name: 'Pie Chart', icon: <PieChartOutlined /> },
  { key: 'area', name: 'Area Chart', icon: <AreaChartOutlined /> },
  { key: 'scatter', name: 'Scatter Plot', icon: <DotChartOutlined /> },
  { key: 'radar', name: 'Radar Chart', icon: <RadarChartOutlined /> },
  { key: 'heatmap', name: 'Heatmap', icon: <HeatMapOutlined /> },
  { key: 'funnel', name: 'Funnel Chart', icon: <FunnelPlotOutlined /> },
  { key: 'gauge', name: 'Gauge Chart', icon: <DashboardOutlined /> }
];

export default function TestChartsPage() {
  const [selectedChartType, setSelectedChartType] = useState<string>('bar');
  const [widgetConfig, setWidgetConfig] = useState<any>({
    chartType: 'bar',
    title: {
      text: 'Test Chart',
      subtext: 'Chart configuration test',
      left: 'left'
    },
    tooltip: { trigger: 'axis' },
    legend: { data: [], show: true },
    color: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'],
    animation: true,
    grid: { top: 60, right: 40, bottom: 60, left: 60 },
    xAxis: { type: 'category', data: [] },
    yAxis: { type: 'value' },
    series: []
  });

  // Create test widget
  const testWidget: DashboardWidget = {
    id: 'test-widget',
    type: 'chart',
    title: 'Test Chart Widget',
    subtitle: 'Configuration validation',
    position: { x: 0, y: 0, w: 6, h: 4 },
    config: {
      ...widgetConfig,
      data: TEST_DATA[selectedChartType as keyof typeof TEST_DATA]
    },
    isVisible: true,
    isLocked: false
  };

  const handleChartTypeChange = (chartType: string) => {
    setSelectedChartType(chartType);
    setWidgetConfig((prev: any) => ({
      ...prev,
      chartType,
      series: []
    }));
    message.success(`Switched to ${chartType} chart`);
  };

  const handleConfigUpdate = (updates: any) => {
    setWidgetConfig((prev: any) => ({
      ...prev,
      ...updates
    }));
    message.success('Configuration updated');
  };

  // ChartWidget onTitleChange expects a single-arg signature; provide a compatible wrapper
  const handleTitleChange = (title: string, subtitle?: string) => {
    setWidgetConfig((prev: any) => ({
      ...prev,
      title: {
        ...prev.title,
        text: title,
        subtext: subtitle ?? prev.title.subtext
      }
    }));
  };

  return (
    <div style={{ padding: '20px', background: 'var(--color-surface-base)', minHeight: '100vh' }}>
      <Title level={2}>Chart Widget Testing Suite</Title>
      <Text type="secondary">
        Test all chart types and their configurations to ensure they work properly with ECharts best practices.
      </Text>

      <Row gutter={[16, 16]} style={{ marginTop: '20px' }}>
        {/* Chart Type Selector */}
        <Col span={24}>
          <Card title="Chart Type Selection" size="small">
            <Space wrap>
              {CHART_TYPES.map((chart) => (
                <Button
                  key={chart.key}
                  type={selectedChartType === chart.key ? 'primary' : 'default'}
                  icon={chart.icon}
                  onClick={() => handleChartTypeChange(chart.key)}
                  style={{ marginBottom: '8px' }}
                >
                  {chart.name}
                </Button>
              ))}
            </Space>
          </Card>
        </Col>

        {/* Configuration Panel */}
        <Col span={8}>
          <Card title="Configuration" size="small">
            <Tabs size="small" type="card">
              <TabPane tab="Basic" key="basic">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text strong>Chart Type:</Text>
                    <Select
                      value={selectedChartType}
                      onChange={handleChartTypeChange}
                      style={{ width: '100%', marginTop: '8px' }}
                    >
                      {CHART_TYPES.map((chart) => (
                        <Option key={chart.key} value={chart.key}>
                          {chart.icon} {chart.name}
                        </Option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <Text strong>Title:</Text>
                    <Input
                      value={widgetConfig.title.text}
                      onChange={(e) => handleConfigUpdate({
                        title: { ...widgetConfig.title, text: e.target.value }
                      })}
                      placeholder="Chart title"
                      style={{ marginTop: '8px' }}
                    />
                  </div>

                  <div>
                    <Text strong>Subtitle:</Text>
                    <Input
                      value={widgetConfig.title.subtext || ''}
                      onChange={(e) => handleConfigUpdate({
                        title: { ...widgetConfig.title, subtext: e.target.value }
                      })}
                      placeholder="Chart subtitle"
                      style={{ marginTop: '8px' }}
                    />
                  </div>

                  <div>
                    <Text strong>Show Legend:</Text>
                    <Switch
                      checked={widgetConfig.legend.show}
                      onChange={(checked) => handleConfigUpdate({
                        legend: { ...widgetConfig.legend, show: checked }
                      })}
                      style={{ marginTop: '8px' }}
                    />
                  </div>

                  <div>
                    <Text strong>Animation:</Text>
                    <Switch
                      checked={widgetConfig.animation}
                      onChange={(checked) => handleConfigUpdate({ animation: checked })}
                      style={{ marginTop: '8px' }}
                    />
                  </div>
                </Space>
              </TabPane>

              <TabPane tab="Colors" key="colors">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text strong>Primary Color:</Text>
                    <ColorPicker
                      value={widgetConfig.color[0]}
                      onChange={(color) => handleConfigUpdate({
                        color: [color.toHexString(), ...widgetConfig.color.slice(1)]
                      })}
                      style={{ marginTop: '8px' }}
                    />
                  </div>

                  <div>
                    <Text strong>Secondary Color:</Text>
                    <ColorPicker
                      value={widgetConfig.color[1]}
                      onChange={(color) => handleConfigUpdate({
                        color: [widgetConfig.color[0], color.toHexString(), ...widgetConfig.color.slice(2)]
                      })}
                      style={{ marginTop: '8px' }}
                    />
                  </div>
                </Space>
              </TabPane>

              <TabPane tab="Advanced" key="advanced">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text strong>Grid Top:</Text>
                    <Slider
                      min={0}
                      max={200}
                      value={widgetConfig.grid.top}
                      onChange={(value) => handleConfigUpdate({
                        grid: { ...widgetConfig.grid, top: value }
                      })}
                      style={{ marginTop: '8px' }}
                    />
                  </div>

                  <div>
                    <Text strong>Grid Bottom:</Text>
                    <Slider
                      min={0}
                      max={200}
                      value={widgetConfig.grid.bottom}
                      onChange={(value) => handleConfigUpdate({
                        grid: { ...widgetConfig.grid, bottom: value }
                      })}
                      style={{ marginTop: '8px' }}
                    />
                  </div>
                </Space>
              </TabPane>
            </Tabs>
          </Card>
        </Col>

        {/* Chart Preview */}
        <Col span={16}>
          <Card title={`${CHART_TYPES.find(c => c.key === selectedChartType)?.name} Preview`} size="small">
            <div style={{ height: '400px', width: '100%' }}>
              <ChartWidget
                widget={testWidget}
                config={widgetConfig}
                data={TEST_DATA[selectedChartType as keyof typeof TEST_DATA]}
                onConfigUpdate={handleConfigUpdate}
                onTitleChange={handleTitleChange}
                isDarkMode={false}
                showEditableTitle={true}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Configuration Details */}
      <Card title="Current Configuration" size="small" style={{ marginTop: '20px' }}>
        <pre style={{ 
          background: 'var(--color-surface-raised)', 
          padding: '12px', 
          borderRadius: '4px',
          fontSize: '12px',
          overflow: 'auto',
          maxHeight: '200px'
        }}>
          {JSON.stringify(widgetConfig, null, 2)}
        </pre>
      </Card>

      {/* Test Data Display */}
      <Card title="Test Data" size="small" style={{ marginTop: '20px' }}>
        <pre style={{ 
          background: 'var(--color-surface-raised)', 
          padding: '12px', 
          borderRadius: '4px',
          fontSize: '12px',
          overflow: 'auto',
          maxHeight: '200px'
        }}>
          {JSON.stringify(TEST_DATA[selectedChartType as keyof typeof TEST_DATA], null, 2)}
        </pre>
      </Card>
    </div>
  );
}
