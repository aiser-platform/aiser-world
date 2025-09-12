'use client';

import React, { useState, useEffect } from 'react';
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

  // Initialize form with widget's current configuration
  useEffect(() => {
    if (widget && widget.config) {
      // Flatten nested config for form fields
      const formValues = {
        // Basic fields
        title: widget.config.title?.text || widget.title || '',
        subtitle: widget.config.title?.subtext || widget.config.subtitle || '',
        dataSource: widget.config.dataSource || 'sample',
        variant: widget.config.variant || 'standard',
        titlePosition: widget.config.title?.left || 'left',
        
        // Visual fields
        colorPalette: widget.config.colorPalette || 'default',
        theme: widget.config.theme || 'auto',
        showLegend: widget.config.showLegend !== false,
        showTooltip: widget.config.showTooltip !== false,
        animation: widget.config.animation !== false,
        animationDuration: widget.config.animationDuration || 1000,
        
        // Layout fields
        width: widget.config.width || 400,
        height: widget.config.height || 300,
        marginTop: widget.config.marginTop || 20,
        marginBottom: widget.config.marginBottom || 20,
        marginLeft: widget.config.marginLeft || 20,
        marginRight: widget.config.marginRight || 20,
        
        // Data fields
        xField: widget.config.xField || 'category',
        yField: widget.config.yField || 'value',
        seriesField: widget.config.seriesField || '',
        dataLimit: widget.config.dataLimit || 1000,
        
        // Advanced fields
        customOptions: widget.config.customOptions || '',
        responsive: widget.config.responsive !== false,
        autoResize: widget.config.autoResize !== false,
        performanceMode: widget.config.performanceMode || 'balanced'
        ,
        // Series / tooltip / axis formatting
        seriesLabelShow: widget.config.seriesLabel?.show === true,
        seriesLabelPosition: widget.config.seriesLabel?.position || 'top',
        seriesLabelFormatter: widget.config.seriesLabel?.formatter || '',
        tooltipFormatter: widget.config.tooltipFormatter || '',
        xAxisLabelFormatter: widget.config.xAxisTick?.formatter || '',
        xAxisLabelRotate: widget.config.xAxisTick?.rotate || 0,
        yAxisLabelFormatter: widget.config.yAxisTick?.formatter || '',
        yAxisLabelRotate: widget.config.yAxisTick?.rotate || 0
      };
      console.log('Setting form values:', formValues);
      form.setFieldsValue(formValues);
    }
  }, [widget, form]);

  const handleConfigUpdate = (changedValues: any, allValues: any) => {
    console.log('Form values changed:', { changedValues, allValues });
    
    // Get all current form values to ensure we don't lose any data
    const currentValues = form.getFieldsValue();
    console.log('Current form values:', currentValues);
    
    // Structure the configuration properly for the widget
    const structuredConfig = {
      // Basic configuration
      title: {
        text: currentValues.title || '',
        subtext: currentValues.subtitle || '',
        left: currentValues.titlePosition || 'left',
        textAlign: currentValues.titlePosition || 'left'
      },
      dataSource: currentValues.dataSource,
      variant: currentValues.variant,
      
      // Visual configuration
      colorPalette: currentValues.colorPalette,
      theme: currentValues.theme,
      showLegend: currentValues.showLegend,
      legendPosition: currentValues.legendPosition || 'top',
      showTooltip: currentValues.showTooltip,
      animation: currentValues.animation,
      animationDuration: currentValues.animationDuration,
      
      // Layout configuration
      width: currentValues.width,
      height: currentValues.height,
      marginTop: currentValues.marginTop,
      marginBottom: currentValues.marginBottom,
      marginLeft: currentValues.marginLeft,
      marginRight: currentValues.marginRight,
      
      // Data configuration
      xField: currentValues.xField,
      yField: currentValues.yField,
      seriesField: currentValues.seriesField,
      dataLimit: currentValues.dataLimit,
      // Axis & labels
      showXAxisLabel: currentValues.showXAxisLabel !== false,
      xAxisLabel: currentValues.xAxisLabel || '',
      showYAxisLabel: currentValues.showYAxisLabel !== false,
      yAxisLabel: currentValues.yAxisLabel || '',
      // Data labels
      dataLabels: currentValues.dataLabels === true,
      
      // Advanced configuration
      customOptions: currentValues.customOptions,
      responsive: currentValues.responsive,
      autoResize: currentValues.autoResize,
      performanceMode: currentValues.performanceMode
      ,
      // Series / tooltip / axis formatting
      seriesLabel: {
        show: currentValues.seriesLabelShow === true,
        position: currentValues.seriesLabelPosition || 'top',
        formatter: currentValues.seriesLabelFormatter || undefined
      },
      tooltipFormatter: currentValues.tooltipFormatter || undefined,
      xAxisTick: {
        formatter: currentValues.xAxisLabelFormatter || undefined,
        rotate: currentValues.xAxisLabelRotate || 0
      },
      yAxisTick: {
        formatter: currentValues.yAxisLabelFormatter || undefined,
        rotate: currentValues.yAxisLabelRotate || 0
      }
    };
    console.log('Sending structured config:', structuredConfig);
    onUpdate(structuredConfig);
  };

  return (
    <div style={{ maxHeight: '500px', overflow: 'auto' }}>
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
              Basic
            </span>
          } 
          key="basic"
        >
          <Form form={form} layout="horizontal" size="small" onValuesChange={handleConfigUpdate} labelCol={{ span: 8 }} wrapperCol={{ span: 16 }}>
            <Form.Item label="Chart Title" name="title" style={{ marginBottom: '8px' }}>
              <Input placeholder="Enter chart title" />
            </Form.Item>
            
            <Form.Item label="Subtitle" name="subtitle" style={{ marginBottom: '8px' }}>
              <Input placeholder="Enter subtitle" />
            </Form.Item>
            
            <Form.Item label="Data Source" name="dataSource" style={{ marginBottom: '8px' }}>
              <Select placeholder="Select data source" style={{ width: '100%' }}>
                <Option value="sample">Sample Data</Option>
                <Option value="database">Database</Option>
                <Option value="api">API</Option>
                <Option value="file">File Upload</Option>
              </Select>
            </Form.Item>
            
            <Form.Item label="Chart Variant" name="variant" style={{ marginBottom: '8px' }}>
              <Select placeholder="Select variant" style={{ width: '100%' }}>
                {chartConfig.features.map((feature, index) => (
                  <Option key={index} value={feature.toLowerCase()}>
                    {feature}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item label="Title Position" name="titlePosition" style={{ marginBottom: '8px' }}>
              <Select placeholder="Select title position" style={{ width: '100%' }}>
                <Option value="left">Left</Option>
                <Option value="center">Center</Option>
                <Option value="right">Right</Option>
              </Select>
            </Form.Item>
          </Form>
        </Panel>

        {/* Visual Configuration */}
        <Panel 
          header={
            <span>
              <BgColorsOutlined style={{ marginRight: '8px' }} />
              Visual
            </span>
          } 
          key="visual"
        >
          <Form form={form} layout="horizontal" size="small" onValuesChange={handleConfigUpdate} labelCol={{ span: 8 }} wrapperCol={{ span: 16 }}>
            <Form.Item label="Color Palette" name="colorPalette" style={{ marginBottom: '8px' }}>
              <Select placeholder="Select color palette" style={{ width: '100%' }}>
                <Option value="default">Default</Option>
                <Option value="vibrant">Vibrant</Option>
                <Option value="pastel">Pastel</Option>
                <Option value="monochrome">Monochrome</Option>
                <Option value="custom">Custom</Option>
              </Select>
            </Form.Item>

            <Form.Item label="Theme" name="theme" style={{ marginBottom: '8px' }}>
              <Select placeholder="Select theme" style={{ width: '100%' }}>
                <Option value="light">Light</Option>
                <Option value="dark">Dark</Option>
                <Option value="auto">Auto</Option>
              </Select>
            </Form.Item>

            <Form.Item label="Show Legend" name="showLegend" valuePropName="checked" style={{ marginBottom: '8px' }}>
              <Switch />
            </Form.Item>

            <Form.Item label="Legend Position" name="legendPosition" style={{ marginBottom: '8px' }}>
              <Select style={{ width: '100%' }}>
                <Option value="top">Top</Option>
                <Option value="bottom">Bottom</Option>
                <Option value="left">Left</Option>
                <Option value="right">Right</Option>
              </Select>
            </Form.Item>

            <Form.Item label="Show Tooltip" name="showTooltip" valuePropName="checked" style={{ marginBottom: '8px' }}>
              <Switch />
            </Form.Item>

            <Form.Item label="Animation" name="animation" valuePropName="checked" style={{ marginBottom: '8px' }}>
              <Switch />
            </Form.Item>

            <Form.Item label="Animation Duration" name="animationDuration" style={{ marginBottom: '8px' }}>
              <Slider min={0} max={2000} step={100} />
            </Form.Item>
            <Form.Item label="Series Labels" name="seriesLabelShow" valuePropName="checked" style={{ marginBottom: '8px' }}>
              <Switch />
            </Form.Item>
            <Form.Item label="Series Label Position" name="seriesLabelPosition" style={{ marginBottom: '8px' }}>
              <Select>
                <Option value="top">Top</Option>
                <Option value="inside">Inside</Option>
                <Option value="bottom">Bottom</Option>
                <Option value="left">Left</Option>
                <Option value="right">Right</Option>
              </Select>
            </Form.Item>
            <Form.Item label="Series Label Formatter" name="seriesLabelFormatter" style={{ marginBottom: '8px' }}>
              <Input placeholder="ECharts formatter (e.g. {c} or function)" />
            </Form.Item>
            <Form.Item label="Tooltip Formatter" name="tooltipFormatter" style={{ marginBottom: '8px' }}>
              <Input placeholder="ECharts tooltip formatter (template or function)" />
            </Form.Item>
          </Form>
        </Panel>

        {/* Layout Configuration */}
        <Panel 
          header={
            <span>
              <LayoutOutlined style={{ marginRight: '8px' }} />
              Layout
            </span>
          } 
          key="layout"
        >
          <Form form={form} layout="horizontal" size="small" onValuesChange={handleConfigUpdate} labelCol={{ span: 8 }} wrapperCol={{ span: 16 }}>
            <Form.Item label="Width" name="width" style={{ marginBottom: '8px' }}>
              <InputNumber min={100} max={2000} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="Height" name="height" style={{ marginBottom: '8px' }}>
              <InputNumber min={100} max={2000} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="Margin Top" name="marginTop" style={{ marginBottom: '8px' }}>
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="Margin Bottom" name="marginBottom" style={{ marginBottom: '8px' }}>
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="Margin Left" name="marginLeft" style={{ marginBottom: '8px' }}>
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="Margin Right" name="marginRight" style={{ marginBottom: '8px' }}>
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </Panel>

        {/* Data Configuration */}
        <Panel 
          header={
            <span>
              <DatabaseOutlined style={{ marginRight: '8px' }} />
              Data
            </span>
          } 
          key="data"
        >
          <Form form={form} layout="horizontal" size="small" onValuesChange={handleConfigUpdate} labelCol={{ span: 8 }} wrapperCol={{ span: 16 }}>
            <Form.Item label="X-Axis Field" name="xField" style={{ marginBottom: '8px' }}>
              <Select placeholder="Select X-axis field" style={{ width: '100%' }}>
                <Option value="category">Category</Option>
                <Option value="date">Date</Option>
                <Option value="name">Name</Option>
              </Select>
            </Form.Item>

            <Form.Item label="Show X Axis Label" name="showXAxisLabel" valuePropName="checked" style={{ marginBottom: '8px' }}>
              <Switch />
            </Form.Item>
            <Form.Item label="X Axis Label" name="xAxisLabel" style={{ marginBottom: '8px' }}>
              <Input placeholder="Label for X axis" />
            </Form.Item>

            <Form.Item label="Y-Axis Field" name="yField" style={{ marginBottom: '8px' }}>
              <Select placeholder="Select Y-axis field" style={{ width: '100%' }}>
                <Option value="value">Value</Option>
                <Option value="count">Count</Option>
                <Option value="percentage">Percentage</Option>
              </Select>
            </Form.Item>

            <Form.Item label="Show Y Axis Label" name="showYAxisLabel" valuePropName="checked" style={{ marginBottom: '8px' }}>
              <Switch />
            </Form.Item>
            <Form.Item label="Y Axis Label" name="yAxisLabel" style={{ marginBottom: '8px' }}>
              <Input placeholder="Label for Y axis" />
            </Form.Item>

            <Form.Item label="Series Field" name="seriesField" style={{ marginBottom: '8px' }}>
              <Select placeholder="Select series field (optional)" style={{ width: '100%' }}>
                <Option value="type">Type</Option>
                <Option value="region">Region</Option>
                <Option value="status">Status</Option>
              </Select>
            </Form.Item>

            <Form.Item label="Data Labels" name="dataLabels" valuePropName="checked" style={{ marginBottom: '8px' }}>
              <Switch />
            </Form.Item>

            <Form.Item label="Data Limit" name="dataLimit" style={{ marginBottom: '8px' }}>
              <InputNumber min={10} max={10000} style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </Panel>

        {/* Advanced Configuration */}
        <Panel 
          header={
            <span>
              <ToolOutlined style={{ marginRight: '8px' }} />
              Advanced
            </span>
          } 
          key="advanced"
        >
          <Form form={form} layout="horizontal" size="small" onValuesChange={handleConfigUpdate} labelCol={{ span: 8 }} wrapperCol={{ span: 16 }}>
            <Form.Item label="Custom ECharts Options" name="customOptions" style={{ marginBottom: '8px' }}>
              <TextArea 
                rows={4} 
                placeholder="Enter custom ECharts options (JSON format)"
                style={{ fontFamily: 'monospace', width: '100%' }}
              />
            </Form.Item>

            <Form.Item label="Responsive" name="responsive" valuePropName="checked" style={{ marginBottom: '8px' }}>
              <Switch />
            </Form.Item>

            <Form.Item label="Auto Resize" name="autoResize" valuePropName="checked" style={{ marginBottom: '8px' }}>
              <Switch />
            </Form.Item>

            <Form.Item label="Performance Mode" name="performanceMode" style={{ marginBottom: '8px' }}>
              <Select placeholder="Select performance mode" style={{ width: '100%' }}>
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
