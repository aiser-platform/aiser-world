'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Select, Button, Space, Row, Col, Input, Form, message, Tabs, Divider } from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  AreaChartOutlined,
  RadarChartOutlined,
  DotChartOutlined,
  HeatMapOutlined,
  SettingOutlined,
  DownloadOutlined,
  SaveOutlined,
  EyeOutlined
} from '@ant-design/icons';
import * as echarts from 'echarts';

// Custom ECharts React component compatible with ECharts v6
const ReactECharts = React.forwardRef<HTMLDivElement, { 
  option: any; 
  style?: React.CSSProperties; 
  opts?: any;
  onChartReady?: (chart: any) => void;
}>(
  ({ option, style = {}, opts = {}, onChartReady }, ref) => {
    const chartRef = React.useRef<HTMLDivElement>(null);
    const chartInstance = React.useRef<echarts.ECharts | null>(null);

    React.useEffect(() => {
      if (chartRef.current) {
        // Initialize chart
        chartInstance.current = echarts.init(chartRef.current, undefined, opts);
        
        // Set option
        if (option) {
          chartInstance.current.setOption(option);
        }

        // Call onChartReady callback if provided
        if (onChartReady && chartInstance.current) {
          onChartReady(chartInstance.current);
        }

        // Handle resize
        const handleResize = () => {
          chartInstance.current?.resize();
        };
        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
          chartInstance.current?.dispose();
        };
      }
    }, []);

    React.useEffect(() => {
      if (chartInstance.current && option) {
        chartInstance.current.setOption(option, true);
      }
    }, [option]);

    return <div ref={chartRef} style={{ width: '100%', height: '100%', ...style }} />;
  }
);

ReactECharts.displayName = 'ReactECharts';

const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;

interface EChartsIntegrationProps {
  data?: any[];
  onChartSave?: (chartConfig: any, data: any[]) => void;
}

export const EChartsIntegration: React.FC<EChartsIntegrationProps> = ({
  data = [],
  onChartSave
}) => {
  const [chartType, setChartType] = useState<string>('bar');
  const [chartConfig, setChartConfig] = useState<any>({});
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartOptions, setChartOptions] = useState<any>({});
  const [activeTab, setActiveTab] = useState('designer');
  const [chartTitle, setChartTitle] = useState('New Chart');
  const [xAxisField, setXAxisField] = useState<string>('');
  const [yAxisField, setYAxisField] = useState<string>('');
  const [seriesField, setSeriesField] = useState<string>('');

  // Initialize with sample data if no data provided
  useEffect(() => {
    if (data.length > 0) {
      setChartData(data);
      // Auto-detect fields
      const firstRow = data[0];
      if (firstRow) {
        const fields = Object.keys(firstRow);
        if (fields.length >= 2) {
          setXAxisField(fields[0]);
          setYAxisField(fields[1]);
          if (fields.length >= 3) {
            setSeriesField(fields[2]);
          }
        }
      }
    } else {
      // Use sample data for demonstration
      const sampleData = [
        { product: 'Product A', sales: 1000, region: 'North' },
        { product: 'Product B', sales: 1500, region: 'South' },
        { product: 'Product C', sales: 800, region: 'East' },
        { product: 'Product D', sales: 1200, region: 'West' }
      ];
      setChartData(sampleData);
      setXAxisField('product');
      setYAxisField('sales');
      setSeriesField('region');
    }
  }, [data]);

  // Generate chart options based on type and data
  useEffect(() => {
    if (chartData.length === 0 || !xAxisField || !yAxisField) return;

    const options = generateChartOptions(chartType, chartData, xAxisField, yAxisField, seriesField);
    setChartOptions(options);
  }, [chartType, chartData, xAxisField, yAxisField, seriesField]);

  const generateChartOptions = (
    type: string, 
    data: any[], 
    xField: string, 
    yField: string, 
    seriesField?: string
  ) => {
    const baseOptions = {
      title: {
        text: chartTitle,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      }
    };

    switch (type) {
      case 'bar':
        return {
          ...baseOptions,
          xAxis: {
            type: 'category',
            data: data.map(item => item[xField]),
            axisLabel: { rotate: 45 }
          },
          yAxis: {
            type: 'value'
          },
          series: [{
            data: data.map(item => item[yField]),
            type: 'bar',
            name: yField,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#83bff6' },
                { offset: 0.5, color: '#188df0' },
                { offset: 1, color: '#188df0' }
              ])
            }
          }]
        };

      case 'line':
        return {
          ...baseOptions,
          xAxis: {
            type: 'category',
            data: data.map(item => item[xField])
          },
          yAxis: {
            type: 'value'
          },
          series: [{
            data: data.map(item => item[yField]),
            type: 'line',
            name: yField,
            smooth: true,
            lineStyle: {
              color: '#5470c6',
              width: 3
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(84, 112, 198, 0.3)' },
                { offset: 1, color: 'rgba(84, 112, 198, 0.1)' }
              ])
            }
          }]
        };

      case 'pie':
        return {
          ...baseOptions,
          series: [{
            type: 'pie',
            radius: '50%',
            data: data.map(item => ({
              name: item[xField],
              value: item[yField]
            })),
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }]
        };

      case 'area':
        return {
          ...baseOptions,
          xAxis: {
            type: 'category',
            data: data.map(item => item[xField])
          },
          yAxis: {
            type: 'value'
          },
          series: [{
            data: data.map(item => item[yField]),
            type: 'line',
            name: yField,
            smooth: true,
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(58, 132, 255, 0.8)' },
                { offset: 1, color: 'rgba(58, 132, 255, 0.1)' }
              ])
            }
          }]
        };

      case 'scatter':
        return {
          ...baseOptions,
          xAxis: {
            type: 'value',
            name: xField
          },
          yAxis: {
            type: 'value',
            name: yField
          },
          series: [{
            data: data.map(item => [item[xField], item[yField]]),
            type: 'scatter',
            name: `${xField} vs ${yField}`,
            symbolSize: 8
          }]
        };

      default:
        return baseOptions;
    }
  };

  const handleChartSave = () => {
    if (!chartTitle.trim()) {
      message.warning('Please enter a chart title');
      return;
    }

    const savedConfig = {
      type: chartType,
      title: chartTitle,
      xAxisField,
      yAxisField,
      seriesField,
      options: chartOptions,
      timestamp: new Date().toISOString()
    };

    if (onChartSave) {
      onChartSave(savedConfig, chartData);
      message.success('Chart saved successfully!');
    } else {
      message.info('Chart configuration saved locally');
    }
  };

  const exportChart = (format: 'png' | 'svg') => {
    // Find the chart container and get the ECharts instance
    const chartContainer = document.querySelector('.echarts-integration .chart-container');
    if (chartContainer) {
      const chart = echarts.getInstanceByDom(chartContainer as HTMLElement);
      if (chart) {
        const url = chart.getDataURL({
          type: format,
          pixelRatio: 2,
          backgroundColor: '#fff'
        });
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${chartTitle.replace(/\s+/g, '_')}.${format}`;
        a.click();
        
        message.success(`Chart exported as ${format.toUpperCase()}`);
      }
    } else {
      message.error('Chart container not found');
    }
  };

  const chartTypes = [
    { key: 'bar', label: 'Bar Chart', icon: <BarChartOutlined /> },
    { key: 'line', label: 'Line Chart', icon: <LineChartOutlined /> },
    { key: 'pie', label: 'Pie Chart', icon: <PieChartOutlined /> },
    { key: 'area', label: 'Area Chart', icon: <AreaChartOutlined /> },
    { key: 'scatter', label: 'Scatter Plot', icon: <DotChartOutlined /> }
  ];

  return (
    <div className="echarts-integration">
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Chart Designer" key="designer">
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card title="Chart Configuration" size="small">
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <div>
                    <label>Chart Title:</label>
                    <Input
                      value={chartTitle}
                      onChange={(e) => setChartTitle(e.target.value)}
                      placeholder="Enter chart title"
                      style={{ marginTop: 4 }}
                    />
                  </div>

                  <div>
                    <label>Chart Type:</label>
                    <Select
                      value={chartType}
                      onChange={setChartType}
                      style={{ width: '100%', marginTop: 4 }}
                    >
                      {chartTypes.map(type => (
                        <Option key={type.key} value={type.key}>
                          <Space>
                            {type.icon}
                            {type.label}
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label>X-Axis Field:</label>
                    <Select
                      value={xAxisField}
                      onChange={setXAxisField}
                      style={{ width: '100%', marginTop: 4 }}
                    >
                      {chartData.length > 0 && Object.keys(chartData[0]).map(field => (
                        <Option key={field} value={field}>{field}</Option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label>Y-Axis Field:</label>
                    <Select
                      value={yAxisField}
                      onChange={setYAxisField}
                      style={{ width: '100%', marginTop: 4 }}
                    >
                      {chartData.length > 0 && Object.keys(chartData[0]).map(field => (
                        <Option key={field} value={field}>{field}</Option>
                      ))}
                    </Select>
                  </div>

                  {chartType !== 'pie' && (
                    <div>
                      <label>Series Field (Optional):</label>
                      <Select
                        value={seriesField}
                        onChange={setSeriesField}
                        style={{ width: '100%', marginTop: 4 }}
                        allowClear
                      >
                        {chartData.length > 0 && Object.keys(chartData[0]).map(field => (
                          <Option key={field} value={field}>{field}</Option>
                        ))}
                      </Select>
                    </div>
                  )}

                  <Divider />

                  <Space style={{ width: '100%' }}>
                    <Button 
                      type="primary" 
                      icon={<SaveOutlined />}
                      onClick={handleChartSave}
                      style={{ flex: 1 }}
                    >
                      Save Chart
                    </Button>
                    <Button 
                      icon={<DownloadOutlined />}
                      onClick={() => exportChart('png')}
                    >
                      PNG
                    </Button>
                    <Button 
                      icon={<DownloadOutlined />}
                      onClick={() => exportChart('svg')}
                    >
                      SVG
                    </Button>
                  </Space>
                </Space>
              </Card>
            </Col>

            <Col span={16}>
              <Card title="Chart Preview" size="small">
                {chartOptions && Object.keys(chartOptions).length > 0 ? (
                  <div className="chart-container">
                    <ReactECharts
                      option={chartOptions}
                      style={{ height: '400px' }}
                      opts={{ renderer: 'canvas' }}
                    />
                  </div>
                ) : (
                  <div style={{ 
                    height: '400px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#999',
                    border: '2px dashed #d9d9d9',
                    borderRadius: '8px'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <BarChartOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                      <div>Configure chart settings to see preview</div>
                    </div>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="Data Preview" key="data">
          <Card title="Chart Data" size="small">
            <div style={{ marginBottom: 16 }}>
              <strong>Data Source:</strong> {data.length > 0 ? 'Query Results' : 'Sample Data'}
              <br />
              <strong>Records:</strong> {chartData.length}
              <br />
              <strong>Fields:</strong> {chartData.length > 0 ? Object.keys(chartData[0]).join(', ') : 'None'}
            </div>
            
            {chartData.length > 0 && (
              <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5' }}>
                      {Object.keys(chartData[0]).map(field => (
                        <th key={field} style={{ padding: '8px', border: '1px solid #d9d9d9', textAlign: 'left' }}>
                          {field}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.slice(0, 10).map((row, index) => (
                      <tr key={index}>
                        {Object.values(row).map((value, i) => (
                          <td key={i} style={{ padding: '8px', border: '1px solid #d9d9d9' }}>
                            {typeof value === 'number' ? value.toLocaleString() : String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {chartData.length > 10 && (
                  <div style={{ textAlign: 'center', padding: '8px', color: '#666' }}>
                    Showing first 10 of {chartData.length} records
                  </div>
                )}
              </div>
            )}
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};
