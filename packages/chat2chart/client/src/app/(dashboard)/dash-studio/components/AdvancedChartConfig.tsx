'use client';

import React, { useState } from 'react';
import {
  Form,
  Input,
  Select,
  InputNumber,
  ColorPicker,
  Switch,
  Slider,
  Row,
  Col,
  Collapse,
  Divider,
  Space,
  Typography,
  Button,
  Card,
  Tag,
  Tooltip,
  message
} from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  SettingOutlined,
  BgColorsOutlined,
  LayoutOutlined,
  DatabaseOutlined,
  EyeOutlined,
  ToolOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  BulbOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Panel } = Collapse;

interface AdvancedChartConfigProps {
  widget: any;
  onUpdate: (config: any) => void;
}

const AdvancedChartConfig: React.FC<AdvancedChartConfigProps> = ({ widget, onUpdate }) => {
  const [form] = Form.useForm();
  const [activePanel, setActivePanel] = useState(['basic']);

  // Chart type specific configurations
  const getChartTypeConfig = (type: string) => {
    const configs = {
      bar: {
        name: 'Bar Chart',
        icon: <BarChartOutlined />,
        color: '#1890ff',
        description: 'Compare values across categories',
        features: ['Stacked', 'Grouped', 'Horizontal', '3D']
      },
      line: {
        name: 'Line Chart',
        icon: <LineChartOutlined />,
        color: '#52c41a',
        description: 'Show trends over time',
        features: ['Smooth', 'Step', 'Area', 'Multi-line']
      },
      pie: {
        name: 'Pie Chart',
        icon: <PieChartOutlined />,
        color: '#fa8c16',
        description: 'Show parts of a whole',
        features: ['Doughnut', 'Rose', '3D', 'Exploded']
      }
    };
    return configs[type as keyof typeof configs] || configs.bar;
  };

  const chartConfig = getChartTypeConfig(widget.type);

  const handleConfigUpdate = (values: any) => {
    onUpdate(values);
  };

  return (
    <div style={{ maxHeight: '500px', overflow: 'auto' }}>
      {/* Chart Type Header */}
      <Card 
        size="small" 
        style={{ 
          marginBottom: '16px',
          background: `linear-gradient(135deg, ${chartConfig.color}15, ${chartConfig.color}05)`,
          border: `1px solid ${chartConfig.color}30`
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ 
            fontSize: '20px', 
            color: chartConfig.color, 
            marginRight: '8px' 
          }}>
            {chartConfig.icon}
          </div>
          <Title level={5} style={{ margin: 0 }}>
            {chartConfig.name}
          </Title>
        </div>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {chartConfig.description}
        </Text>
        <div style={{ marginTop: '8px' }}>
          {chartConfig.features.map((feature, index) => (
            <Tag key={index} color={chartConfig.color}>
              {feature}
            </Tag>
          ))}
        </div>
      </Card>

      <Collapse 
        activeKey={activePanel} 
        onChange={setActivePanel}
        ghost
        size="small"
      >
        {/* Basic Configuration */}
        <Panel 
          header={
            <span>
              <SettingOutlined style={{ marginRight: '8px' }} />
              Basic Configuration
            </span>
          } 
          key="basic"
        >
          <Form layout="vertical" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Chart Title" name="title">
                  <Input placeholder="Enter chart title" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Subtitle" name="subtitle">
                  <Input placeholder="Enter subtitle" />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Data Source" name="dataSource">
                  <Select placeholder="Select data source">
                    <Option value="sample">Sample Data</Option>
                    <Option value="database">Database</Option>
                    <Option value="api">API</Option>
                    <Option value="file">File Upload</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Chart Type Variant" name="variant">
                  <Select placeholder="Select variant">
                    {chartConfig.features.map((feature, index) => (
                      <Option key={index} value={feature.toLowerCase()}>
                        {feature}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Panel>

        {/* Visual Configuration */}
        <Panel 
          header={
            <span>
              <BgColorsOutlined style={{ marginRight: '8px' }} />
              Visual Configuration
            </span>
          } 
          key="visual"
        >
          <Form layout="vertical" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Color Palette" name="colorPalette">
                  <Select placeholder="Select color palette">
                    <Option value="default">Default</Option>
                    <Option value="vibrant">Vibrant</Option>
                    <Option value="pastel">Pastel</Option>
                    <Option value="monochrome">Monochrome</Option>
                    <Option value="custom">Custom</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Theme" name="theme">
                  <Select placeholder="Select theme">
                    <Option value="light">Light</Option>
                    <Option value="dark">Dark</Option>
                    <Option value="auto">Auto</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Show Legend" name="showLegend" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item label="Show Tooltip" name="showTooltip" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item label="Animation" name="animation" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item label="Animation Duration" name="animationDuration">
              <Slider min={0} max={2000} step={100} />
            </Form.Item>
          </Form>
        </Panel>

        {/* Layout Configuration */}
        <Panel 
          header={
            <span>
              <LayoutOutlined style={{ marginRight: '8px' }} />
              Layout Configuration
            </span>
          } 
          key="layout"
        >
          <Form layout="vertical" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Width" name="width">
                  <InputNumber min={100} max={2000} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Height" name="height">
                  <InputNumber min={100} max={2000} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Margin Top" name="marginTop">
                  <InputNumber min={0} max={100} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Margin Bottom" name="marginBottom">
                  <InputNumber min={0} max={100} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Margin Left" name="marginLeft">
                  <InputNumber min={0} max={100} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Margin Right" name="marginRight">
                  <InputNumber min={0} max={100} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Panel>

        {/* Data Configuration */}
        <Panel 
          header={
            <span>
              <DatabaseOutlined style={{ marginRight: '8px' }} />
              Data Configuration
            </span>
          } 
          key="data"
        >
          <Form layout="vertical" size="small">
            <Form.Item label="X-Axis Field" name="xField">
              <Select placeholder="Select X-axis field">
                <Option value="category">Category</Option>
                <Option value="date">Date</Option>
                <Option value="name">Name</Option>
              </Select>
            </Form.Item>

            <Form.Item label="Y-Axis Field" name="yField">
              <Select placeholder="Select Y-axis field">
                <Option value="value">Value</Option>
                <Option value="count">Count</Option>
                <Option value="percentage">Percentage</Option>
              </Select>
            </Form.Item>

            <Form.Item label="Series Field" name="seriesField">
              <Select placeholder="Select series field (optional)">
                <Option value="type">Type</Option>
                <Option value="region">Region</Option>
                <Option value="status">Status</Option>
              </Select>
            </Form.Item>

            <Form.Item label="Data Limit" name="dataLimit">
              <InputNumber min={10} max={10000} style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </Panel>

        {/* Advanced Configuration */}
        <Panel 
          header={
            <span>
              <ToolOutlined style={{ marginRight: '8px' }} />
              Advanced Configuration
            </span>
          } 
          key="advanced"
        >
          <Form layout="vertical" size="small">
            <Form.Item label="Custom ECharts Options" name="customOptions">
              <TextArea 
                rows={4} 
                placeholder="Enter custom ECharts options (JSON format)"
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>

            <Form.Item label="Responsive" name="responsive" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item label="Auto Resize" name="autoResize" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item label="Performance Mode" name="performanceMode">
              <Select placeholder="Select performance mode">
                <Option value="normal">Normal</Option>
                <Option value="high">High Performance</Option>
                <Option value="ultra">Ultra Performance</Option>
              </Select>
            </Form.Item>
          </Form>
        </Panel>
      </Collapse>

      {/* Action Buttons */}
      <Divider />
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Button 
          type="text" 
          icon={<ExperimentOutlined />}
          onClick={() => message.info('Preview mode activated')}
        >
          Preview
        </Button>
        <Space>
          <Button 
            type="text" 
            icon={<ThunderboltOutlined />}
            onClick={() => message.success('Auto-optimized!')}
          >
            Auto-Optimize
          </Button>
          <Button 
            type="primary" 
            icon={<BulbOutlined />}
            onClick={() => message.success('Configuration saved!')}
          >
            Apply
          </Button>
        </Space>
      </Space>
    </div>
  );
};

export default AdvancedChartConfig;
