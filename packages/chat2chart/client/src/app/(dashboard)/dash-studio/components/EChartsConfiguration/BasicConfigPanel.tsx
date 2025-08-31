'use client';

import React from 'react';
import { Input, Select, Switch, Slider, ColorPicker, Button, Row, Col, Tooltip } from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  AreaChartOutlined,
  DotChartOutlined,
  HeatMapOutlined,
  RadarChartOutlined,
  FontSizeOutlined,
  BgColorsOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useEChartsConfig, BasicChartConfig } from './EChartsConfigProvider';

const { Option } = Select;

// Chart type icons mapping
const CHART_ICONS = {
  bar: <BarChartOutlined />,
  line: <LineChartOutlined />,
  pie: <PieChartOutlined />,
  area: <AreaChartOutlined />,
  scatter: <DotChartOutlined />,
  heatmap: <HeatMapOutlined />,
  radar: <RadarChartOutlined />,
};

export const BasicConfigPanel: React.FC = () => {
  const { state, dispatch } = useEChartsConfig();
  const { basic } = state;

  const handleBasicUpdate = (updates: Partial<BasicChartConfig>) => {
    dispatch({ type: 'UPDATE_BASIC', payload: updates });
  };

  return (
    <div className="config-panel basic-panel">
      {/* Chart Type Selection - Compact with icons */}
      <div className="config-section">
        <div className="section-header">
          <BarChartOutlined className="section-icon" />
          <span>Chart Type</span>
        </div>
        <div className="chart-type-grid">
          {Object.entries(CHART_ICONS).map(([type, icon]) => (
            <Tooltip key={type} title={type.charAt(0).toUpperCase() + type.slice(1)}>
              <Button
                type={basic.chartType === type ? 'primary' : 'default'}
                icon={icon}
                size="small"
                onClick={() => handleBasicUpdate({ chartType: type })}
                className="chart-type-btn"
              />
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Title & Subtitle - Simple inputs */}
      <div className="config-section">
        <div className="section-header">
          <FontSizeOutlined className="section-icon" />
          <span>Title</span>
        </div>
        <Input
          value={basic.title}
          onChange={(e) => handleBasicUpdate({ title: e.target.value })}
          placeholder="Chart title"
          size="small"
        />
        <Input
          value={basic.subtitle || ''}
          onChange={(e) => handleBasicUpdate({ subtitle: e.target.value })}
          placeholder="Subtitle (optional)"
          size="small"
          style={{ marginTop: 8 }}
        />
      </div>

      {/* Data Binding - Field selection */}
      <div className="config-section">
        <div className="section-header">
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
            >
              {state.data[0] && Object.keys(state.data[0]).map(field => (
                <Option key={field} value={field}>{field}</Option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Basic Styling - Color and font */}
      <div className="config-section">
        <div className="section-header">
          <BgColorsOutlined className="section-icon" />
          <span>Colors</span>
        </div>
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
        </div>
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
  );
};
