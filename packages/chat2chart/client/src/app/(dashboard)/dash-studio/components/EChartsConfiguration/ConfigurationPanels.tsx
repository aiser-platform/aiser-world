'use client';

import React, { useState } from 'react';
import { Card, Tabs, Input, Select, Switch, Slider, InputNumber, ColorPicker, Space, Row, Col, Button, Tooltip, Divider, Collapse, Typography } from 'antd';
import {
  SettingOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  AreaChartOutlined,
  DotChartOutlined,
  HeatMapOutlined,
  RadarChartOutlined,
  FontSizeOutlined,
  BgColorsOutlined,
  EyeOutlined,
  ToolOutlined,
  CodeOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  MinusOutlined,
  FunnelPlotOutlined,
} from '@ant-design/icons';
import { useEChartsConfig, BasicChartConfig, StandardChartConfig, AdvancedChartConfig } from './EChartsConfigProvider';
import './EChartsConfig.css';

const { Option } = Select;
const { Panel } = Collapse;
const { Text } = Typography;

// Chart type icons mapping with categories
const CHART_ICONS: Record<string, { icon: React.ReactNode; category: string; tooltip: string }> = {
  // Comparison charts
  bar: { icon: <BarChartOutlined />, category: 'comparison', tooltip: 'Bar Chart - Compare values across categories' },
  column: { icon: <BarChartOutlined />, category: 'comparison', tooltip: 'Column Chart - Vertical bar comparison' },
  groupedBar: { icon: <BarChartOutlined />, category: 'comparison', tooltip: 'Grouped Bar Chart - Multiple series comparison' },
  stackedBar: { icon: <BarChartOutlined />, category: 'comparison', tooltip: 'Stacked Bar Chart - Cumulative values' },
  
  // Trend charts
  line: { icon: <LineChartOutlined />, category: 'trend', tooltip: 'Line Chart - Show trends over time' },
  area: { icon: <AreaChartOutlined />, category: 'trend', tooltip: 'Area Chart - Show trends with filled areas' },
  step: { icon: <LineChartOutlined />, category: 'trend', tooltip: 'Step Chart - Step-wise progression' },
  spline: { icon: <LineChartOutlined />, category: 'trend', tooltip: 'Spline Chart - Smooth curved trends' },
  
  // Distribution charts
  pie: { icon: <PieChartOutlined />, category: 'distribution', tooltip: 'Pie Chart - Show parts of a whole' },
  doughnut: { icon: <PieChartOutlined />, category: 'distribution', tooltip: 'Doughnut Chart - Ring distribution' },
  funnel: { icon: <FunnelPlotOutlined />, category: 'distribution', tooltip: 'Funnel Chart - Process flow stages' },
  
  // Correlation charts
  scatter: { icon: <DotChartOutlined />, category: 'correlation', tooltip: 'Scatter Plot - Show relationships between variables' },
  bubble: { icon: <DotChartOutlined />, category: 'correlation', tooltip: 'Bubble Chart - 3D correlation with size' },
  heatmap: { icon: <HeatMapOutlined />, category: 'correlation', tooltip: 'Heatmap - Show data density and patterns' },
  
  // Specialized charts
  radar: { icon: <RadarChartOutlined />, category: 'comparison', tooltip: 'Radar Chart - Compare multiple variables' },
  gauge: { icon: <BarChartOutlined />, category: 'comparison', tooltip: 'Gauge Chart - Single value indicator' },
  tree: { icon: <BarChartOutlined />, category: 'hierarchy', tooltip: 'Tree Chart - Hierarchical data structure' },
  treemap: { icon: <BarChartOutlined />, category: 'hierarchy', tooltip: 'Treemap - Hierarchical area visualization' },
};

// Chart categories for better organization
const CHART_CATEGORIES: Record<string, { name: string; color: string }> = {
  comparison: { name: 'Comparison', color: '#1890ff' },
  trend: { name: 'Trend', color: '#52c41a' },
  distribution: { name: 'Distribution', color: '#fa8c16' },
  correlation: { name: 'Correlation', color: '#eb2f96' },
};

// Basic Configuration Panel - Minimalist design
export const BasicConfigPanel: React.FC = () => {
  const { state, dispatch } = useEChartsConfig();
  const { basic } = state;

  const handleBasicUpdate = (updates: Partial<BasicChartConfig>) => {
    dispatch({ type: 'UPDATE_BASIC', payload: updates });
  };

  return (
    <div className="config-panel basic-panel">
      {/* Chart Type Display (Read-only) */}
      <div className="config-section">
        <div className="section-header">
          <BarChartOutlined className="section-icon" />
          <span>Chart Type</span>
        </div>
        <div className="config-row">
          <label>Selected Type:</label>
          <div style={{ 
            padding: '8px 12px', 
            background: '#f0f0f0', 
            borderRadius: '4px',
            fontWeight: 'bold',
            color: '#1890ff'
          }}>
            {basic.chartType ? basic.chartType.toUpperCase() : 'None Selected'}
          </div>
          <Text type="secondary" style={{ fontSize: '11px', marginTop: '4px' }}>
            Chart type is selected from Widget Library. Use Standard and Advanced tabs for configuration.
          </Text>
        </div>
      </div>

      {/* Data Binding Configuration */}
      <div className="config-section">
        <div className="section-header">
          <BarChartOutlined className="section-icon" />
          <span>Data Binding</span>
        </div>
        
        <div className="config-row">
          <label>X Field:</label>
          <Input
            value={basic.dataBinding.xField}
            onChange={(e) => handleBasicUpdate({ 
              dataBinding: { ...basic.dataBinding, xField: e.target.value }
            })}
            placeholder="Enter X field name"
            size="small"
          />
        </div>

        <div className="config-row">
          <label>Y Fields:</label>
          <Input
            value={basic.dataBinding.yFields.join(', ')}
            onChange={(e) => handleBasicUpdate({ 
              dataBinding: { ...basic.dataBinding, yFields: e.target.value.split(',').map(s => s.trim()) }
            })}
            placeholder="Enter Y field names (comma separated)"
            size="small"
          />
        </div>

        <div className="config-row">
          <label>Data Limit:</label>
          <InputNumber
            value={basic.dataBinding.dataLimit || 1000}
            onChange={(value) => handleBasicUpdate({ 
              dataBinding: { ...basic.dataBinding, dataLimit: value || undefined }
            })}
            placeholder="Max data points"
            size="small"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Title & Subtitle - Simple inputs */}
      <div className="config-section">
        <div className="section-header">
          <FontSizeOutlined className="section-icon" />
          <span>Title</span>
        </div>
        <div className="field-row">
          <span className="field-label">Title:</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Input
              value={basic.title}
              onChange={(e) => handleBasicUpdate({ title: e.target.value })}
              placeholder="Chart title"
              size="small"
              style={{ flex: 1 }}
            />
            <Select
              value={basic.titlePosition || 'center'}
              onChange={(value) => handleBasicUpdate({ titlePosition: value })}
              size="small"
              style={{ width: '80px' }}
            >
              <Select.Option value="left">Left</Select.Option>
              <Select.Option value="center">Center</Select.Option>
              <Select.Option value="right">Right</Select.Option>
            </Select>
          </div>
        </div>
        <div className="field-row">
          <span className="field-label">Subtitle:</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Input
              value={basic.subtitle || ''}
              onChange={(e) => handleBasicUpdate({ subtitle: e.target.value })}
              placeholder="Subtitle (optional)"
              size="small"
              style={{ flex: 1 }}
            />
            <Select
              value={basic.subtitlePosition || 'center'}
              onChange={(value) => handleBasicUpdate({ subtitlePosition: value })}
              size="small"
              style={{ width: '80px' }}
            >
              <Select.Option value="left">Left</Select.Option>
              <Select.Option value="center">Center</Select.Option>
              <Select.Option value="right">Right</Select.Option>
            </Select>
          </div>
        </div>
      </div>

      {/* Data Binding - Field selection */}
      <div className="config-section">
        <div className="section-header">
          <ToolOutlined className="section-icon" />
          <span>Data Fields</span>
        </div>
        <div className="field-binding">
          <div className="field-row">
            <span className="field-label">X-Axis:</span>
            <Select
              value={basic.dataBinding.xField}
              onChange={(value) => handleBasicUpdate({ 
                dataBinding: { ...basic.dataBinding, xField: value } 
              })}
              size="small"
              style={{ width: '100%' }}
              placeholder="Select X field"
              showSearch
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {state.data[0] && Object.keys(state.data[0]).map(field => (
                <Option key={field} value={field}>{field}</Option>
              ))}
            </Select>
          </div>
          <div className="field-row">
            <span className="field-label">Y-Axis:</span>
            <Select
              mode="multiple"
              value={basic.dataBinding.yFields}
              onChange={(value) => handleBasicUpdate({ 
                dataBinding: { ...basic.dataBinding, yFields: value } 
              })}
              size="small"
              style={{ width: '100%' }}
              placeholder="Select Y fields"
              showSearch
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {state.data[0] && Object.keys(state.data[0]).map(field => (
                <Option key={field} value={field}>{field}</Option>
              ))}
            </Select>
          </div>
          {basic.chartType !== 'pie' && (
            <div className="field-row">
              <span className="field-label">Series:</span>
              <Select
                value={basic.dataBinding.seriesField}
                onChange={(value) => handleBasicUpdate({ 
                  dataBinding: { ...basic.dataBinding, seriesField: value } 
                })}
                size="small"
                style={{ width: '100%' }}
                placeholder="Select series field (optional)"
                allowClear
                showSearch
                filterOption={(input, option) =>
                  (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {state.data[0] && Object.keys(state.data[0]).map(field => (
                  <Option key={field} value={field}>{field}</Option>
                ))}
              </Select>
            </div>
          )}
        </div>

        {/* Data Processing - Aggregation, filtering, sorting */}
        <div className="config-section">
          <div className="section-header">
            <ToolOutlined className="section-icon" />
            <span>Data Processing</span>
          </div>
          <div className="data-processing">
            <div className="field-row">
              <span className="field-label">Aggregation:</span>
              <Select
                value={basic.dataBinding.aggregation || 'sum'}
                onChange={(value) => handleBasicUpdate({ 
                  dataBinding: { ...basic.dataBinding, aggregation: value } 
                })}
                size="small"
                style={{ width: '100%' }}
              >
                <Select.Option value="sum">Sum</Select.Option>
                <Select.Option value="avg">Average</Select.Option>
                <Select.Option value="count">Count</Select.Option>
                <Select.Option value="min">Minimum</Select.Option>
                <Select.Option value="max">Maximum</Select.Option>
              </Select>
            </div>
            <div className="field-row">
              <span className="field-label">Data Limit:</span>
              <InputNumber
                value={basic.dataBinding.dataLimit || 100}
                onChange={(value) => handleBasicUpdate({ 
                  dataBinding: { ...basic.dataBinding, dataLimit: value || 100 } 
                })}
                size="small"
                style={{ width: '100%' }}
                min={1}
                max={1000}
                placeholder="Max rows to display"
              />
            </div>
            <div className="field-row">
              <span className="field-label">Sort By:</span>
              <Select
                value={basic.dataBinding.sortBy || ''}
                onChange={(value) => handleBasicUpdate({ 
                  dataBinding: { ...basic.dataBinding, sortBy: value } 
                })}
                size="small"
                style={{ width: '100%' }}
                placeholder="Select field to sort by"
                allowClear
              >
                {state.data[0] && Object.keys(state.data[0]).map(field => (
                  <Option key={field} value={field}>{field}</Option>
                ))}
              </Select>
            </div>
            <div className="field-row">
              <span className="field-label">Sort Order:</span>
              <Select
                value={basic.dataBinding.sortOrder || 'desc'}
                onChange={(value) => handleBasicUpdate({ 
                  dataBinding: { ...basic.dataBinding, sortOrder: value } 
                })}
                size="small"
                style={{ width: '100%' }}
              >
                <Select.Option value="asc">Ascending</Select.Option>
                <Select.Option value="desc">Descending</Select.Option>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Basic Styling - Color and font */}
      <div className="config-section">
        <div className="section-header">
          <BgColorsOutlined className="section-icon" />
          <span>Colors & Styling</span>
        </div>
        
        {/* Color Palette Selection */}
        <div className="color-palette-section">
          <div className="palette-header">Color Palette</div>
          <Select
            value={basic.basicStyling.colorPalette || 'default'}
            onChange={(value) => {
              const palettes = {
                'default': ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de'],
                'd3-category10': ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
                'd3-category20': ['#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c', '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5'],
                'echarts-vintage': ['#d87c7c', '#919e8b', '#d7ab82', '#6e7074', '#61a0a8', '#efa18d', '#787464', '#cc7e63', '#724e58'],
                'echarts-westeros': ['#516b91', '#59c4e6', '#edafda', '#93b7e3', '#a5e7f0', '#cbb0e3', '#59c4e6', '#f93f5e', '#f4e5c0'],
                'echarts-essos': ['#893448', '#d95850', '#eb8146', '#f4e874', '#f1f9c4', '#c8b273', '#c6e6c1', '#65cda3', '#55b4a8'],
                'echarts-wonderland': ['#4ea397', '#22c3aa', '#7bd9a5', '#d0648a', '#f58db2', '#f2b3c9', '#e6c7bf', '#e8d4b2', '#cee8ae'],
                'echarts-macarons': ['#2ec7c9', '#b6a2de', '#5ab1ef', '#ffb980', '#d87a80', '#8d98b3', '#e5cf0d', '#97b552', '#95706d'],
                'custom': basic.basicStyling.colors
              };
              
              if (value !== 'custom') {
                handleBasicUpdate({
                  basicStyling: { 
                    ...basic.basicStyling, 
                    colors: palettes[value as keyof typeof palettes],
                    colorPalette: value
                  }
                });
              }
            }}
            size="small"
            style={{ width: '100%', marginBottom: '12px' }}
          >
            <Option value="default">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Default</span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de'].map((color, i) => (
                    <div key={i} style={{ width: '12px', height: '12px', backgroundColor: color, borderRadius: '2px' }} />
                  ))}
                </div>
              </div>
            </Option>
            <Option value="d3-category10">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>D3 Category 10</span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'].map((color, i) => (
                    <div key={i} style={{ width: '12px', height: '12px', backgroundColor: color, borderRadius: '2px' }} />
                  ))}
                </div>
              </div>
            </Option>
            <Option value="d3-category20">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>D3 Category 20</span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {['#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c'].map((color, i) => (
                    <div key={i} style={{ width: '12px', height: '12px', backgroundColor: color, borderRadius: '2px' }} />
                  ))}
                </div>
              </div>
            </Option>
            <Option value="echarts-vintage">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>ECharts Vintage</span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {['#d87c7c', '#919e8b', '#d7ab82', '#6e7074', '#61a0a8'].map((color, i) => (
                    <div key={i} style={{ width: '12px', height: '12px', backgroundColor: color, borderRadius: '2px' }} />
                  ))}
                </div>
              </div>
            </Option>
            <Option value="echarts-westeros">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>ECharts Westeros</span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {['#516b91', '#59c4e6', '#edafda', '#93b7e3', '#a5e7f0'].map((color, i) => (
                    <div key={i} style={{ width: '12px', height: '12px', backgroundColor: color, borderRadius: '2px' }} />
                  ))}
                </div>
              </div>
            </Option>
            <Option value="echarts-essos">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>ECharts Essos</span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {['#893448', '#d95850', '#eb8146', '#f4e874', '#f1f9c4'].map((color, i) => (
                    <div key={i} style={{ width: '12px', height: '12px', backgroundColor: color, borderRadius: '2px' }} />
                  ))}
                </div>
              </div>
            </Option>
            <Option value="echarts-wonderland">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>ECharts Wonderland</span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {['#4ea397', '#22c3aa', '#7bd9a5', '#d0648a', '#f58db2'].map((color, i) => (
                    <div key={i} style={{ width: '12px', height: '12px', backgroundColor: color, borderRadius: '2px' }} />
                  ))}
                </div>
              </div>
            </Option>
            <Option value="echarts-macarons">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>ECharts Macarons</span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {['#2ec7c9', '#b6a2de', '#5ab1ef', '#ffb980', '#d87a80'].map((color, i) => (
                    <div key={i} style={{ width: '12px', height: '12px', backgroundColor: color, borderRadius: '2px' }} />
                  ))}
                </div>
              </div>
            </Option>
            <Option value="custom">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Custom</span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {basic.basicStyling.colors.slice(0, 5).map((color, i) => (
                    <div key={i} style={{ width: '12px', height: '12px', backgroundColor: color, borderRadius: '2px' }} />
                  ))}
                </div>
              </div>
            </Option>
          </Select>
          
          {/* Custom Color Picker */}
          {basic.basicStyling.colorPalette === 'custom' && (
            <div className="custom-colors">
              <div className="color-palette">
                {basic.basicStyling.colors.map((color, index) => (
                  <ColorPicker
                    key={index}
                    value={color}
                    onChange={(color) => {
                      const newColors = [...basic.basicStyling.colors];
                      newColors[index] = color.toHexString();
                      handleBasicUpdate({
                        basicStyling: { ...basic.basicStyling, colors: newColors }
                      });
                    }}
                    size="small"
                  />
                ))}
                <Button
                  icon={<PlusOutlined />}
                  size="small"
                  onClick={() => {
                    const newColors = [...basic.basicStyling.colors, '#000000'];
                    handleBasicUpdate({
                      basicStyling: { ...basic.basicStyling, colors: newColors }
                    });
                  }}
                />
                {basic.basicStyling.colors.length > 1 && (
                  <Button
                    icon={<MinusOutlined />}
                    size="small"
                    onClick={() => {
                      const newColors = basic.basicStyling.colors.slice(0, -1);
                      handleBasicUpdate({
                        basicStyling: { ...basic.basicStyling, colors: newColors }
                      });
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Font Controls */}
        <div className="font-controls">
          <span>Font Size:</span>
          <Slider
            min={8}
            max={24}
            value={basic.basicStyling.fontSize}
            onChange={(value) => handleBasicUpdate({
              basicStyling: { ...basic.basicStyling, fontSize: value }
            })}
            style={{ width: 100 }}
          />
        </div>
        
        {/* Legend Toggle */}
        <div className="legend-control">
          <Switch
            checked={basic.basicStyling.showLegend}
            onChange={(checked) => handleBasicUpdate({
              basicStyling: { ...basic.basicStyling, showLegend: checked }
            })}
            size="small"
          />
          <span style={{ marginLeft: 8 }}>Show Legend</span>
        </div>
      </div>
    </div>
  );
};

// Standard Configuration Panel - More options but still compact
export const StandardConfigPanel: React.FC = () => {
  const { state, dispatch } = useEChartsConfig();
  const { standard } = state;

  const handleStandardUpdate = (updates: Partial<StandardChartConfig>) => {
    dispatch({ type: 'UPDATE_STANDARD', payload: updates });
  };

  // Initialize standard config if not exists
  if (!standard.axis || !standard.series || !standard.legend || !standard.tooltip) {
    dispatch({
      type: 'UPDATE_STANDARD',
      payload: {
        axis: {
          xAxis: { show: true, labelRotation: 0, labelColor: '#54555a', gridLines: true },
          yAxis: { show: true, labelColor: '#54555a', gridLines: true, format: '' },
        },
        series: {
          showLabels: false,
          labelPosition: 'top',
          smooth: false,
          areaStyle: false,
          symbolSize: 6,
        },
        legend: {
          position: 'bottom',
          orientation: 'horizontal',
          textColor: '#54555a',
        },
        tooltip: {
          show: true,
          trigger: 'axis',
          backgroundColor: 'rgba(50, 50, 50, 0.9)',
          textColor: '#fff',
        },
        gridSpacing: 5,
      },
    });
    return null;
  }

  return (
    <div className="config-panel standard-panel">
      <Collapse ghost size="small">
        {/* Axis Configuration */}
        <Panel header="Axis Settings" key="axis">
          <div className="config-section">
            <div className="section-header">
              <span>X-Axis</span>
            </div>
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Switch
                  checked={standard.axis.xAxis.show}
                  onChange={(checked) => handleStandardUpdate({
                    axis: { ...standard.axis, xAxis: { ...standard.axis.xAxis, show: checked } }
                  })}
                  size="small"
                />
                <span style={{ marginLeft: 4 }}>Show</span>
              </Col>
              <Col span={12}>
                <span>Rotation:</span>
                <Slider
                  min={-90}
                  max={90}
                  value={standard.axis.xAxis.labelRotation}
                  onChange={(value) => handleStandardUpdate({
                    axis: { ...standard.axis, xAxis: { ...standard.axis.xAxis, labelRotation: value } }
                  })}
                  style={{ width: 80 }}
                />
              </Col>
            </Row>
            <ColorPicker
              value={standard.axis.xAxis.labelColor}
              onChange={(color) => handleStandardUpdate({
                axis: { ...standard.axis, xAxis: { ...standard.axis.xAxis, labelColor: color.toHexString() } }
              })}
              size="small"
            />
            <span style={{ marginLeft: 8 }}>Label Color</span>
          </div>
        </Panel>

        {/* Series Configuration */}
        <Panel header="Series Settings" key="series">
          <div className="config-section">
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Switch
                  checked={standard.series.showLabels}
                  onChange={(checked) => handleStandardUpdate({
                    series: { ...standard.series, showLabels: checked }
                  })}
                  size="small"
                />
                <span style={{ marginLeft: 4 }}>Show Labels</span>
              </Col>
              <Col span={12}>
                <span>Position:</span>
                <Select
                  value={standard.series.labelPosition}
                  onChange={(value) => handleStandardUpdate({
                    series: { ...standard.series, labelPosition: value }
                  })}
                  size="small"
                  style={{ width: 80 }}
                >
                  <Option value="top">Top</Option>
                  <Option value="bottom">Bottom</Option>
                  <Option value="left">Left</Option>
                  <Option value="right">Right</Option>
                  <Option value="inside">Inside</Option>
                </Select>
              </Col>
            </Row>
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Switch
                  checked={standard.series.smooth}
                  onChange={(checked) => handleStandardUpdate({
                    series: { ...standard.series, smooth: checked }
                  })}
                  size="small"
                />
                <span style={{ marginLeft: 4 }}>Smooth</span>
              </Col>
              <Col span={12}>
                <span>Symbol Size:</span>
                <Slider
                  min={2}
                  max={20}
                  value={standard.series.symbolSize}
                  onChange={(value) => handleStandardUpdate({
                    series: { ...standard.series, symbolSize: value }
                  })}
                  style={{ width: 80 }}
                />
              </Col>
            </Row>
          </div>
        </Panel>

        {/* Legend Configuration */}
        <Panel header="Legend Settings" key="legend">
          <div className="config-section">
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <span>Position:</span>
                <Select
                  value={standard.legend.position}
                  onChange={(value) => handleStandardUpdate({
                    legend: { ...standard.legend, position: value }
                  })}
                  size="small"
                  style={{ width: 80 }}
                >
                  <Option value="top">Top</Option>
                  <Option value="bottom">Bottom</Option>
                  <Option value="left">Left</Option>
                  <Option value="right">Right</Option>
                </Select>
              </Col>
              <Col span={12}>
                <span>Orientation:</span>
                <Select
                  value={standard.legend.orientation}
                  onChange={(value) => handleStandardUpdate({
                    legend: { ...standard.legend, orientation: value }
                  })}
                  size="small"
                  style={{ width: 80 }}
                >
                  <Option value="horizontal">Horizontal</Option>
                  <Option value="vertical">Vertical</Option>
                </Select>
              </Col>
            </Row>
          </div>
        </Panel>

        {/* Tooltip Configuration */}
        <Panel header="Tooltip Settings" key="tooltip">
          <div className="config-section">
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Switch
                  checked={standard.tooltip.show}
                  onChange={(checked) => handleStandardUpdate({
                    tooltip: { ...standard.tooltip, show: checked }
                  })}
                  size="small"
                />
                <span style={{ marginLeft: 4 }}>Show</span>
              </Col>
              <Col span={12}>
                <span>Trigger:</span>
                <Select
                  value={standard.tooltip.trigger}
                  onChange={(value) => handleStandardUpdate({
                    tooltip: { ...standard.tooltip, trigger: value }
                  })}
                  size="small"
                  style={{ width: 80 }}
                >
                  <Option value="item">Item</Option>
                  <Option value="axis">Axis</Option>
                  <Option value="none">None</Option>
                </Select>
              </Col>
            </Row>
            <ColorPicker
              value={standard.tooltip.backgroundColor}
              onChange={(color) => handleStandardUpdate({
                tooltip: { ...standard.tooltip, backgroundColor: color.toHexString() }
              })}
              size="small"
            />
            <span style={{ marginLeft: 8 }}>Background Color</span>
          </div>
        </Panel>

        {/* Grid Configuration */}
        <Panel header="Grid Layout" key="grid">
          <div className="config-section">
            <div className="section-header">
              <span>Grid Lines</span>
            </div>
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Switch
                  checked={standard.axis.xAxis.gridLines}
                  onChange={(checked) => handleStandardUpdate({
                    axis: { ...standard.axis, xAxis: { ...standard.axis.xAxis, gridLines: checked } }
                  })}
                  size="small"
                />
                <span style={{ marginLeft: 4 }}>X-Axis Grid</span>
              </Col>
              <Col span={12}>
                <Switch
                  checked={standard.axis.yAxis.gridLines}
                  onChange={(checked) => handleStandardUpdate({
                    axis: { ...standard.axis, yAxis: { ...standard.axis.yAxis, gridLines: checked } }
                  })}
                  size="small"
                />
                <span style={{ marginLeft: 4 }}>Y-Axis Grid</span>
              </Col>
            </Row>
            <div className="field-row">
              <span className="field-label">Grid Spacing:</span>
              <Slider
                min={1}
                max={20}
                value={standard.gridSpacing || 5}
                onChange={(value) => handleStandardUpdate({ gridSpacing: value })}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </Panel>
      </Collapse>
    </div>
  );
};

// Advanced Configuration Panel - Full control with code editor
export const AdvancedConfigPanel: React.FC = () => {
  const { state, dispatch } = useEChartsConfig();
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [customCode, setCustomCode] = useState('');

  const handleAdvancedUpdate = (updates: Partial<AdvancedChartConfig>) => {
    dispatch({ type: 'UPDATE_ADVANCED', payload: updates });
  };

  if (!state.advanced.grid) {
    // Initialize advanced config if not exists
    dispatch({
      type: 'UPDATE_ADVANCED',
      payload: {
        grid: {
          left: '10%',
          right: '10%',
          top: '15%',
          bottom: '20%',
          containLabel: true,
        },
        animation: {
          show: true,
          duration: 1000,
          easing: 'cubicInOut',
          delay: 0,
        },
        dataZoom: {
          show: false,
          type: 'slider',
          start: 0,
          end: 100,
        },
        toolbox: {
          show: false,
          features: ['saveAsImage', 'dataZoom', 'restore'],
        },
        customOptions: {},
      },
    });
    return null;
  }

  return (
    <div className="config-panel advanced-panel">
      <Collapse ghost size="small">
        {/* Grid Configuration */}
        <Panel header="Grid Layout" key="grid">
          <div className="config-section">
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <span>Left:</span>
                <Input
                  value={state.advanced.grid.left}
                  onChange={(e) => handleAdvancedUpdate({
                    grid: { ...state.advanced.grid, left: e.target.value }
                  })}
                  size="small"
                  style={{ width: 60 }}
                />
              </Col>
              <Col span={12}>
                <span>Right:</span>
                <Input
                  value={state.advanced.grid.right}
                  onChange={(e) => handleAdvancedUpdate({
                    grid: { ...state.advanced.grid, right: e.target.value }
                  })}
                  size="small"
                  style={{ width: 60 }}
                />
              </Col>
            </Row>
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <span>Top:</span>
                <Input
                  value={state.advanced.grid.top}
                  onChange={(e) => handleAdvancedUpdate({
                    grid: { ...state.advanced.grid, top: e.target.value }
                  })}
                  size="small"
                  style={{ width: 60 }}
                />
              </Col>
              <Col span={12}>
                <span>Bottom:</span>
                <Input
                  value={state.advanced.grid.bottom}
                  onChange={(e) => handleAdvancedUpdate({
                    grid: { ...state.advanced.grid, bottom: e.target.value }
                  })}
                  size="small"
                  style={{ width: 60 }}
                />
              </Col>
            </Row>
          </div>
        </Panel>

        {/* Animation Configuration */}
        <Panel header="Animation" key="animation">
          <div className="config-section">
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <span>Duration:</span>
                <InputNumber
                  value={state.advanced.animation.duration}
                  onChange={(value) => handleAdvancedUpdate({
                    animation: { ...state.advanced.animation, duration: value || 1000 }
                  })}
                  size="small"
                  style={{ width: 80 }}
                  min={0}
                  max={5000}
                />
              </Col>
              <Col span={12}>
                <span>Delay:</span>
                <InputNumber
                  value={state.advanced.animation.delay}
                  onChange={(value) => handleAdvancedUpdate({
                    animation: { ...state.advanced.animation, delay: value || 0 }
                  })}
                  size="small"
                  style={{ width: 80 }}
                  min={0}
                  max={2000}
                />
              </Col>
            </Row>
          </div>
        </Panel>

        {/* Data Zoom Configuration */}
        <Panel header="Data Zoom" key="dataZoom">
          <div className="config-section">
            <Switch
              checked={state.advanced.dataZoom.show}
              onChange={(checked) => handleAdvancedUpdate({
                dataZoom: { ...state.advanced.dataZoom, show: checked }
              })}
              size="small"
            />
            <span style={{ marginLeft: 8 }}>Enable Data Zoom</span>
            {state.advanced.dataZoom.show && (
              <div style={{ marginTop: 8 }}>
                <Select
                  value={state.advanced.dataZoom.type}
                  onChange={(value) => handleAdvancedUpdate({
                    dataZoom: { ...state.advanced.dataZoom, type: value }
                  })}
                  size="small"
                  style={{ width: 120 }}
                >
                  <Option value="slider">Slider</Option>
                  <Option value="inside">Inside</Option>
                  <Option value="select">Select</Option>
                </Select>
              </div>
            )}
          </div>
        </Panel>

        {/* Toolbox Configuration */}
        <Panel header="Toolbox" key="toolbox">
          <div className="config-section">
            <Switch
              checked={state.advanced.toolbox.show}
              onChange={(checked) => handleAdvancedUpdate({
                toolbox: { ...state.advanced.toolbox, show: checked }
              })}
              size="small"
            />
            <span style={{ marginLeft: 8 }}>Show Toolbox</span>
          </div>
        </Panel>

        {/* Custom Code Editor */}
        <Panel 
          header={
            <span>
              <CodeOutlined style={{ marginRight: 8 }} />
              Custom Code
            </span>
          } 
          key="customCode"
        >
          <div className="config-section">
            <Button
              type={showCodeEditor ? 'default' : 'primary'}
              icon={<CodeOutlined />}
              size="small"
              onClick={() => setShowCodeEditor(!showCodeEditor)}
            >
              {showCodeEditor ? 'Hide' : 'Show'} Code Editor
            </Button>
            {showCodeEditor && (
              <div style={{ marginTop: 8 }}>
                <Input.TextArea
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  placeholder="Enter custom ECharts options as JSON..."
                  rows={6}
                  size="small"
                />
                <Button
                  type="primary"
                  size="small"
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(customCode);
                      handleAdvancedUpdate({
                        customOptions: parsed
                      });
                    } catch (error) {
                      console.error('Invalid JSON:', error);
                    }
                  }}
                >
                  Apply Custom Options
                </Button>
              </div>
            )}
          </div>
        </Panel>
      </Collapse>
    </div>
  );
};

// Main Configuration Panel with progressive disclosure
export const EChartsConfigurationPanel: React.FC = () => {
  const { state, dispatch } = useEChartsConfig();
  const { level } = state;

  const handleLevelChange = (newLevel: string) => {
    dispatch({ type: 'SET_LEVEL', payload: newLevel as any });
  };

  return (
    <div className="echarts-config-panel">
      {/* Level Selector - Compact tabs */}
      <div className="level-selector">
        <Tabs
          activeKey={level}
          onChange={handleLevelChange}
          size="small"
          type="card"
          items={[
            {
              key: 'basic',
              label: (
                <span>
                  <SettingOutlined />
                  <span style={{ marginLeft: 4 }}>Basic</span>
                </span>
              ),
              children: <BasicConfigPanel />,
            },
            {
              key: 'standard',
              label: (
                <span>
                  <ToolOutlined />
                  <span style={{ marginLeft: 4 }}>Standard</span>
                </span>
              ),
              children: <StandardConfigPanel />,
            },
            {
              key: 'advanced',
              label: (
                <span>
                  <CodeOutlined />
                  <span style={{ marginLeft: 4 }}>Advanced</span>
                </span>
              ),
              children: <AdvancedConfigPanel />,
            },
          ]}
        />
      </div>
    </div>
  );
};

// Properties Panel Configuration - WITHOUT chart type selection
export const PropertiesConfigPanel: React.FC<{ 
  chartType?: string;
  widgetId?: string;
  onConfigUpdate?: (widgetId: string, config: any) => void;
}> = ({ chartType, widgetId, onConfigUpdate }) => {
  const { state, dispatch } = useEChartsConfig();
  const { level } = state;

  // Set the chart type when the component mounts or when chartType changes
  React.useEffect(() => {
    if (chartType && chartType !== state.basic.chartType) {
      dispatch({ type: 'UPDATE_BASIC', payload: { chartType } });
    }
  }, [chartType, dispatch, state.basic.chartType]);

  const handleLevelChange = (newLevel: string) => {
    dispatch({ type: 'SET_LEVEL', payload: newLevel as any });
  };

  return (
    <div className="echarts-config-panel">
      {/* Level Selector - Compact tabs */}
      <div className="level-selector">
        <Tabs
          activeKey={level}
          onChange={handleLevelChange}
          size="small"
          type="card"
          items={[
            {
              key: 'basic',
              label: (
                <span>
                  <SettingOutlined />
                  <span style={{ marginLeft: 4 }}>Basic</span>
                </span>
              ),
              children: <BasicConfigPanel />,
            },
            {
              key: 'standard',
              label: (
                <span>
                  <ToolOutlined />
                  <span style={{ marginLeft: 4 }}>Standard</span>
                </span>
              ),
              children: <StandardConfigPanel />,
            },
            {
              key: 'advanced',
              label: (
                <span>
                  <CodeOutlined />
                  <span style={{ marginLeft: 4 }}>Advanced</span>
                </span>
              ),
              children: <AdvancedConfigPanel />,
            },
          ]}
        />
      </div>
    </div>
    );
};

// Basic Configuration Panel WITHOUT chart type selection - for Properties Panel
export const BasicConfigPanelNoTypeSelection: React.FC = () => {
  const { state, dispatch } = useEChartsConfig();
  const { basic } = state;

  const handleBasicUpdate = (updates: Partial<BasicChartConfig>) => {
    dispatch({ type: 'UPDATE_BASIC', payload: updates });
  };

  return (
    <div className="config-panel basic-panel">
      {/* Title Configuration */}
      <div className="config-section">
        <div className="section-header">
          <FontSizeOutlined className="section-icon" />
          <span>Title & Labels</span>
        </div>
        
        <div className="config-row">
          <label>Chart Title:</label>
          <Input
            value={basic.title}
            onChange={(e) => handleBasicUpdate({ title: e.target.value })}
            placeholder="Enter chart title"
            size="small"
          />
        </div>

        <div className="config-row">
          <label>Subtitle:</label>
          <Input
            value={basic.subtitle || ''}
            onChange={(e) => handleBasicUpdate({ subtitle: e.target.value })}
            placeholder="Enter subtitle"
            size="small"
          />
        </div>

        <div className="config-row">
          <label>Title Position:</label>
          <Select
            value={basic.titlePosition || 'center'}
            onChange={(value) => handleBasicUpdate({ titlePosition: value })}
            size="small"
            style={{ width: '100%' }}
          >
            <Option value="left">Left</Option>
            <Option value="center">Center</Option>
            <Option value="right">Right</Option>
          </Select>
        </div>
      </div>

      {/* Data Binding Configuration */}
      <div className="config-section">
        <div className="section-header">
          <BarChartOutlined className="section-icon" />
          <span>Data Binding</span>
        </div>
        
        <div className="config-row">
          <label>X Field:</label>
          <Input
            value={basic.dataBinding.xField}
            onChange={(e) => handleBasicUpdate({ 
              dataBinding: { ...basic.dataBinding, xField: e.target.value }
            })}
            placeholder="Enter X field name"
            size="small"
          />
        </div>

        <div className="config-row">
          <label>Y Fields:</label>
          <Input
            value={basic.dataBinding.yFields.join(', ')}
            onChange={(e) => handleBasicUpdate({ 
              dataBinding: { ...basic.dataBinding, yFields: e.target.value.split(',').map(s => s.trim()) }
            })}
            placeholder="Enter Y field names (comma separated)"
            size="small"
          />
        </div>

        <div className="config-row">
          <label>Data Limit:</label>
          <InputNumber
            value={basic.dataBinding.dataLimit || 1000}
            onChange={(value) => handleBasicUpdate({ 
              dataBinding: { ...basic.dataBinding, dataLimit: value || undefined }
            })}
            placeholder="Max data points"
            size="small"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Basic Styling Configuration */}
      <div className="config-section">
        <div className="section-header">
          <BgColorsOutlined className="section-icon" />
          <span>Basic Styling</span>
        </div>
        
        <div className="config-row">
          <label>Font Size:</label>
          <InputNumber
            value={basic.basicStyling.fontSize}
            onChange={(value) => handleBasicUpdate({ 
              basicStyling: { ...basic.basicStyling, fontSize: value || 12 }
            })}
            min={8}
            max={24}
            size="small"
            style={{ width: '100%' }}
          />
        </div>

        <div className="config-row">
          <label>Show Legend:</label>
          <Switch
            checked={basic.basicStyling.showLegend}
            onChange={(checked) => handleBasicUpdate({ 
              basicStyling: { ...basic.basicStyling, showLegend: checked }
            })}
            size="small"
          />
        </div>

        <div className="config-row">
          <label>Color Palette:</label>
          <Select
            value={basic.basicStyling.colorPalette || 'default'}
            onChange={(value) => handleBasicUpdate({ 
              basicStyling: { ...basic.basicStyling, colorPalette: value }
            })}
            size="small"
            style={{ width: '100%' }}
          >
            <Option value="default">Default</Option>
            <Option value="colorful">Colorful</Option>
            <Option value="monochrome">Monochrome</Option>
            <Option value="professional">Professional</Option>
          </Select>
        </div>
      </div>
    </div>
  );
};
