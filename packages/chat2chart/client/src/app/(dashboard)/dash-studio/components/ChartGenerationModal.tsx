'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Button, Space, Typography, Select, Row, Col, Card, Tag, Divider, message } from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  DotChartOutlined,
  AreaChartOutlined,
  RadarChartOutlined,
  DashboardOutlined,
  AppstoreOutlined,
  FunnelPlotOutlined,
  CloseOutlined,
  CheckOutlined,
  SettingOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

interface ChartGenerationModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerate: (chartConfig: any) => void;
  queryData: any[];
  queryColumns: string[];
  isDarkMode: boolean;
}

const ChartGenerationModal: React.FC<ChartGenerationModalProps> = ({
  visible,
  onClose,
  onGenerate,
  queryData,
  queryColumns,
  isDarkMode
}) => {
  const [selectedChartType, setSelectedChartType] = useState('bar');
  const [selectedXAxis, setSelectedXAxis] = useState('');
  const [selectedYAxis, setSelectedYAxis] = useState('');
  const [selectedSeries, setSelectedSeries] = useState('');
  const [chartConfig, setChartConfig] = useState<any>(null);

  // Auto-detect best chart type and columns
  useEffect(() => {
    if (queryData && queryData.length > 0 && queryColumns.length > 0) {
      const firstRow = queryData[0];
      const numericColumns = queryColumns.filter(col => 
        typeof firstRow[col] === 'number' || !isNaN(Number(firstRow[col]))
      );
      const textColumns = queryColumns.filter(col => 
        typeof firstRow[col] === 'string' && isNaN(Number(firstRow[col]))
      );

      // Auto-select best columns
      if (textColumns.length > 0 && numericColumns.length > 0) {
        setSelectedXAxis(textColumns[0]);
        setSelectedYAxis(numericColumns[0]);
        setSelectedSeries(numericColumns[0]);
      }

      // Auto-suggest chart type based on data
      if (numericColumns.length === 1 && textColumns.length > 0) {
        setSelectedChartType('bar');
      } else if (numericColumns.length >= 2) {
        setSelectedChartType('scatter');
      } else if (textColumns.length > 0 && numericColumns.length > 0) {
        setSelectedChartType('pie');
      }
    }
  }, [queryData, queryColumns]);

  // Generate chart configuration
  useEffect(() => {
    if (selectedChartType && selectedXAxis && selectedYAxis && queryData.length > 0) {
      const config = generateChartConfig();
      setChartConfig(config);
    }
  }, [selectedChartType, selectedXAxis, selectedYAxis, selectedSeries, queryData]);

  const generateChartConfig = () => {
    const firstRow = queryData[0];
    const numericColumns = queryColumns.filter(col => 
      typeof firstRow[col] === 'number' || !isNaN(Number(firstRow[col]))
    );
    const textColumns = queryColumns.filter(col => 
      typeof firstRow[col] === 'string' && isNaN(Number(firstRow[col]))
    );

    let chartData: any = {};
    let config: any = {};

    const baseConfig = {
      chartType: selectedChartType,
      title: {
        text: `${selectedChartType.charAt(0).toUpperCase() + selectedChartType.slice(1)} Chart`,
        subtext: `Based on ${queryData.length} data points`,
        textStyle: { fontSize: 16, fontWeight: 'bold', color: 'var(--color-text-primary)' },
        subtextStyle: { fontSize: 12, color: 'var(--color-text-secondary)' }
      },
      showTitle: true,
      showSubtitle: true,
      showLegend: true,
      showTooltip: true,
      showGrid: true,
      colors: ['var(--color-brand-primary)', 'var(--color-functional-success)', 'var(--color-functional-warning)', 'var(--color-functional-danger)', 'var(--color-functional-info)', 'var(--color-brand-primary-light)', 'var(--color-brand-primary-dark)'],
      animation: true,
      backgroundColor: 'var(--color-surface-base)',
      borderColor: 'var(--color-border-primary)',
      borderRadius: 8,
      padding: 16,
      boxShadow: 'var(--shadow-sm)'
    };

    switch (selectedChartType) {
      case 'bar':
      case 'line':
      case 'area':
        chartData = {
          xAxis: queryData.map(row => String(row[selectedXAxis])),
          yAxis: queryData.map(row => Number(row[selectedYAxis]) || 0)
        };
        config = {
          ...baseConfig,
          xAxis: {
            type: 'category',
            data: chartData.xAxis,
            name: selectedXAxis
          },
          yAxis: {
            type: 'value',
            name: selectedYAxis
          },
          series: [{
            name: selectedYAxis,
            type: selectedChartType,
            data: chartData.yAxis,
            smooth: selectedChartType === 'line',
            itemStyle: {
              color: selectedChartType === 'bar' ? 'var(--color-brand-primary)' : 
                     selectedChartType === 'line' ? 'var(--color-functional-success)' : 'var(--color-functional-warning)'
            }
          }]
        };
        break;

      case 'pie':
      case 'doughnut':
        chartData = {
          series: queryData.map(row => ({
            name: String(row[selectedXAxis]),
            value: Number(row[selectedYAxis]) || 0
          }))
        };
        config = {
          ...baseConfig,
          series: [{
            name: selectedXAxis,
            type: 'pie',
            radius: selectedChartType === 'doughnut' ? ['40%', '70%'] : '50%',
            data: chartData.series,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }]
        };
        break;

      case 'scatter':
        chartData = {
          series: queryData.map(row => ({
            value: [
              Number(row[selectedXAxis]) || 0,
              Number(row[selectedYAxis]) || 0
            ],
            name: `${row[selectedXAxis]}, ${row[selectedYAxis]}`
          }))
        };
        config = {
          ...baseConfig,
          xAxis: {
            type: 'value',
            name: selectedXAxis
          },
          yAxis: {
            type: 'value',
            name: selectedYAxis
          },
          series: [{
            name: 'Scatter',
            type: 'scatter',
            data: chartData.series,
            itemStyle: {
              color: 'var(--color-functional-warning)'
            }
          }]
        };
        break;

      default:
        config = baseConfig;
        chartData = queryData;
    }

    return {
      ...config,
      data: chartData,
      rawData: queryData,
      query: '', // Will be set by parent
      dataSourceId: '' // Will be set by parent
    };
  };

  const chartTypes = [
    { key: 'bar', name: 'Bar Chart', icon: <BarChartOutlined />, description: 'Compare values across categories' },
    { key: 'line', name: 'Line Chart', icon: <LineChartOutlined />, description: 'Show trends over time' },
    { key: 'area', name: 'Area Chart', icon: <AreaChartOutlined />, description: 'Show cumulative values' },
    { key: 'pie', name: 'Pie Chart', icon: <PieChartOutlined />, description: 'Show parts of a whole' },
    { key: 'scatter', name: 'Scatter Plot', icon: <DotChartOutlined />, description: 'Show correlation between variables' },
    { key: 'radar', name: 'Radar Chart', icon: <RadarChartOutlined />, description: 'Compare multiple variables' },
    { key: 'gauge', name: 'Gauge Chart', icon: <DashboardOutlined />, description: 'Show single value with range' },
    { key: 'heatmap', name: 'Heatmap', icon: <AppstoreOutlined />, description: 'Show data density' },
    { key: 'funnel', name: 'Funnel Chart', icon: <FunnelPlotOutlined />, description: 'Show process flow' }
  ];

  const firstRow = queryData[0] || {};
  const numericColumns = queryColumns.filter(col => 
    typeof firstRow[col] === 'number' || !isNaN(Number(firstRow[col]))
  );
  const textColumns = queryColumns.filter(col => 
    typeof firstRow[col] === 'string' && isNaN(Number(firstRow[col]))
  );

  const handleGenerate = () => {
    if (chartConfig) {
      onGenerate(chartConfig);
      message.success('Chart generated successfully!');
      onClose();
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BarChartOutlined style={{ fontSize: '20px', color: 'var(--color-brand-primary)' }} />
          <Title level={4} style={{ margin: 0, color: 'var(--color-text-primary)' }}>
            Generate Chart
          </Title>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button 
          key="generate" 
          type="primary" 
          icon={<CheckOutlined />}
          onClick={handleGenerate}
          disabled={!chartConfig}
        >
          Generate Chart
        </Button>
      ]}
      style={{
        top: 20
      }}
    >
      <div style={{ 
        background: 'var(--color-surface-base)',
        color: 'var(--color-text-primary)'
      }}>
        {/* Chart Type Selection */}
        <div style={{ marginBottom: '24px' }}>
          <Title level={5} style={{ marginBottom: '16px', color: 'var(--color-text-primary)' }}>
            Select Chart Type
          </Title>
          <Row gutter={[12, 12]}>
            {chartTypes.map(chart => (
              <Col span={8} key={chart.key}>
                <Card
                  hoverable
                  size="small"
                  style={{
                    border: selectedChartType === chart.key ? '2px solid var(--color-brand-primary)' : '1px solid var(--color-border-primary)',
                    background: selectedChartType === chart.key ? 
                      'var(--color-brand-primary-light)' : 
                      'var(--color-surface-base)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedChartType(chart.key)}
                >
                  <div style={{ textAlign: 'center', padding: '8px' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--color-brand-primary)' }}>
                      {chart.icon}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: '500', marginBottom: '4px' }}>
                      {chart.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>
                      {chart.description}
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        <Divider />

        {/* Data Configuration */}
        <div style={{ marginBottom: '24px' }}>
          <Title level={5} style={{ marginBottom: '16px', color: 'var(--color-text-primary)' }}>
            Configure Data
          </Title>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <div style={{ marginBottom: '12px' }}>
                <Text strong style={{ color: 'var(--color-text-primary)' }}>
                  X-Axis / Category
                </Text>
                <Select
                  style={{ width: '100%', marginTop: '8px' }}
                  value={selectedXAxis}
                  onChange={setSelectedXAxis}
                  placeholder="Select X-axis column"
                >
                  {textColumns.map(col => (
                    <Option key={col} value={col}>{col}</Option>
                  ))}
                </Select>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: '12px' }}>
                <Text strong style={{ color: 'var(--color-text-primary)' }}>
                  Y-Axis / Value
                </Text>
                <Select
                  style={{ width: '100%', marginTop: '8px' }}
                  value={selectedYAxis}
                  onChange={setSelectedYAxis}
                  placeholder="Select Y-axis column"
                >
                  {numericColumns.map(col => (
                    <Option key={col} value={col}>{col}</Option>
                  ))}
                </Select>
              </div>
            </Col>
          </Row>
        </div>

        {/* Data Preview */}
        {chartConfig && (
          <div style={{ marginBottom: '24px' }}>
            <Title level={5} style={{ marginBottom: '16px', color: 'var(--color-text-primary)' }}>
              Chart Preview
            </Title>
            <Card
              size="small"
              style={{
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border-primary)'
              }}
            >
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '32px', color: 'var(--color-brand-primary)', marginBottom: '12px' }}>
                  {chartTypes.find(c => c.key === selectedChartType)?.icon}
                </div>
                <div style={{ fontSize: 'var(--font-size-md)', fontWeight: '500', marginBottom: '8px' }}>
                  {chartConfig.title.text}
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
                  {queryData.length} data points • {selectedXAxis} vs {selectedYAxis}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Data Summary */}
        <div>
          <Title level={5} style={{ marginBottom: '16px', color: 'var(--color-text-primary)' }}>
            Data Summary
          </Title>
          <Row gutter={[16, 8]}>
            <Col span={8}>
              <Tag color="blue">Rows: {queryData.length}</Tag>
            </Col>
            <Col span={8}>
              <Tag color="green">Columns: {queryColumns.length}</Tag>
            </Col>
            <Col span={8}>
              <Tag color="orange">Numeric: {numericColumns.length}</Tag>
            </Col>
          </Row>
        </div>
      </div>
    </Modal>
  );
};

export default ChartGenerationModal;
