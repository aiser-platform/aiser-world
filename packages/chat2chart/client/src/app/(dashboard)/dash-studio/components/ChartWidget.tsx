'use client';

import React, { useEffect, useRef, useState } from 'react';
// Import only the core ECharts module to reduce bundle size
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart, ScatterChart, RadarChart, GaugeChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Register the necessary components
echarts.use([
  BarChart, LineChart, PieChart, ScatterChart, RadarChart, GaugeChart,
  TitleComponent, TooltipComponent, LegendComponent, GridComponent,
  CanvasRenderer
]);
import { Card, Spin, Tooltip, Button, Space, Dropdown, Input, Typography } from 'antd';

const { Text } = Typography;
import { 
  FullscreenOutlined, 
  ReloadOutlined, 
  DownloadOutlined,
  SettingOutlined,
  DeleteOutlined,
  MoreOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons';


interface ChartWidgetProps {
  widget: any;
  config: any;
  data: any;
  onConfigUpdate?: (config: any) => void;
  onWidgetClick?: (widget: any) => void;
  onDelete?: (widgetId: string) => void;
  isSelected?: boolean;
  isDarkMode?: boolean;
  showEditableTitle?: boolean;
  onTitleChange?: (title: string, subtitle: string) => void;
}

const ChartWidget: React.FC<ChartWidgetProps> = ({
  widget,
  config,
  data,
  onConfigUpdate,
  onWidgetClick,
  onDelete,
  isSelected = false,
  isDarkMode = false,
  showEditableTitle = false,
  onTitleChange
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingSubtitle, setEditingSubtitle] = useState('');
  const [chartSize, setChartSize] = useState({
    width: '100%',
    height: '100%',
    aspectRatio: 'auto' // 'auto', '16:9', '4:3', '1:1', '3:2'
  });

  // Initialize ECharts instance
  useEffect(() => {
    if (chartRef.current && !chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, isDarkMode ? 'dark' : undefined, {
        renderer: 'canvas',
        useDirtyRect: true
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [isDarkMode]);

  // Generate ECharts options based on config and data
  const generateChartOptions = (chartType: string, config: any, data: any) => {
    // Create comprehensive chart configuration
    let options: any = {
      title: {
        show: true,
        text: isEditingTitle ? editingTitle : (config?.title?.text || widget.name || 'Chart'),
        subtext: isEditingTitle ? editingSubtitle : (config?.title?.subtext || ''),
        left: config?.title?.left || 'center',
        textStyle: {
          color: config?.title?.textStyle?.color || (isDarkMode ? '#ffffff' : '#000000'),
          fontSize: config?.title?.textStyle?.fontSize || 18,
          fontFamily: config?.title?.textStyle?.fontFamily || 'Arial',
          cursor: showEditableTitle ? 'pointer' : 'default'
        },
        subtextStyle: {
          color: config?.title?.subtextStyle?.color || (isDarkMode ? '#cccccc' : '#666666'),
          fontSize: config?.title?.subtextStyle?.fontSize || 12.6,
          fontFamily: config?.title?.subtextStyle?.fontFamily || 'Arial'
        }
      },
      tooltip: {
        trigger: config?.tooltip?.trigger || 'axis',
        backgroundColor: config?.tooltip?.backgroundColor || 'rgba(255,255,255,0.9)',
        borderColor: config?.tooltip?.borderColor || '#d9d9d9',
        textStyle: {
          color: config?.tooltip?.textStyle?.color || '#000000'
        }
      },
      legend: {
        show: config?.legend?.data !== undefined,
        data: config?.legend?.data || [],
        bottom: config?.legend?.bottom || 10,
        orient: config?.legend?.orient || 'horizontal',
        textStyle: {
          color: config?.legend?.textStyle?.color || (isDarkMode ? '#ffffff' : '#000000'),
          fontSize: config?.legend?.textStyle?.fontSize || 12
        }
      },
      color: config?.color || ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de'],
      animation: config?.animation !== false,
      grid: {
        top: config?.grid?.top || 60,
        right: config?.grid?.right || 40,
        bottom: config?.grid?.bottom || 60,
        left: config?.grid?.left || 60,
        backgroundColor: config?.grid?.backgroundColor || (isDarkMode ? '#1f1f1f' : '#ffffff'),
        show: config?.grid?.show !== false
      },
      xAxis: {
        type: config?.xAxis?.type || 'category',
        data: config?.xAxis?.data || [],
        axisLine: {
          show: config?.xAxis?.axisLine?.show !== false,
          lineStyle: {
            color: config?.xAxis?.axisLine?.lineStyle?.color || (isDarkMode ? '#333333' : '#d9d9d9')
          }
        },
        axisTick: {
          show: config?.xAxis?.axisTick?.show !== false
        },
        axisLabel: {
          show: config?.xAxis?.axisLabel?.show !== false,
          color: config?.xAxis?.axisLabel?.color || (isDarkMode ? '#cccccc' : '#666666'),
          fontSize: config?.xAxis?.axisLabel?.fontSize || 12,
          fontFamily: config?.xAxis?.axisLabel?.fontFamily || 'Arial'
        },
        splitLine: {
          show: config?.xAxis?.splitLine?.show !== false,
          lineStyle: {
            color: config?.xAxis?.splitLine?.lineStyle?.color || (isDarkMode ? '#333333' : '#d9d9d9')
          }
        }
      },
      yAxis: {
        type: config?.yAxis?.type || 'value',
        axisLine: {
          show: config?.yAxis?.axisLine?.show !== false,
          lineStyle: {
            color: config?.yAxis?.axisLine?.lineStyle?.color || (isDarkMode ? '#333333' : '#d9d9d9')
          }
        },
        axisTick: {
          show: config?.yAxis?.axisTick?.show !== false
        },
        axisLabel: {
          show: config?.yAxis?.axisLabel?.show !== false,
          color: config?.yAxis?.axisLabel?.color || (isDarkMode ? '#cccccc' : '#666666'),
          fontSize: config?.yAxis?.axisLabel?.fontSize || 12,
          fontFamily: config?.yAxis?.axisLabel?.fontFamily || 'Arial'
        },
        splitLine: {
          show: config?.yAxis?.splitLine?.show !== false,
          lineStyle: {
            color: config?.yAxis?.splitLine?.lineStyle?.color || (isDarkMode ? '#333333' : '#d9d9d9')
          }
        }
      },
      series: config?.series || []
    };
    
    // Add chart-specific configuration
    switch (chartType) {
      case 'line':
      case 'spline':
        options.xAxis = {
          type: 'category',
          data: data?.xAxis || ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
          axisLine: { show: true, lineStyle: { color: isDarkMode ? '#333333' : '#d9d9d9' } },
          axisLabel: { color: isDarkMode ? '#cccccc' : '#666666' }
        };
        options.yAxis = {
          type: 'value',
          axisLine: { show: true, lineStyle: { color: isDarkMode ? '#333333' : '#d9d9d9' } },
          axisLabel: { color: isDarkMode ? '#cccccc' : '#666666' }
        };
        options.series = [{
          type: 'line',
          data: data?.yAxis || [120, 200, 150, 80, 300],
          smooth: chartType === 'spline',
          symbol: 'circle',
          symbolSize: 6
        }];
        break;
        
      case 'bar':
      case 'column':
        options.xAxis = {
          type: 'category',
          data: data?.xAxis || ['Product A', 'Product B', 'Product C', 'Product D', 'Product E'],
          axisLine: { show: true, lineStyle: { color: isDarkMode ? '#333333' : '#d9d9d9' } },
          axisLabel: { color: isDarkMode ? '#cccccc' : '#666666' }
        };
        options.yAxis = {
          type: 'value',
          axisLine: { show: true, lineStyle: { color: isDarkMode ? '#333333' : '#d9d9d9' } },
          axisLabel: { color: isDarkMode ? '#cccccc' : '#666666' }
        };
        options.series = [{
          type: 'bar',
          data: data?.yAxis || [120, 200, 150, 80, 300]
        }];
        break;
        
      case 'pie':
      case 'doughnut':
        options.series = [{
          type: 'pie',
          radius: chartType === 'doughnut' ? ['40%', '70%'] : '50%',
          data: data?.series || [
            { value: 335, name: 'Direct' },
            { value: 310, name: 'Email' },
            { value: 234, name: 'Union Ads' },
            { value: 135, name: 'Video Ads' },
            { value: 1548, name: 'Search Engine' }
          ]
        }];
        break;
        
      case 'area':
        options.xAxis = {
          type: 'category',
          data: data?.xAxis || ['Q1', 'Q2', 'Q3', 'Q4'],
          axisLine: { show: true, lineStyle: { color: isDarkMode ? '#333333' : '#d9d9d9' } },
          axisLabel: { color: isDarkMode ? '#cccccc' : '#666666' }
        };
        options.yAxis = {
          type: 'value',
          axisLine: { show: true, lineStyle: { color: isDarkMode ? '#333333' : '#d9d9d9' } },
          axisLabel: { color: isDarkMode ? '#cccccc' : '#666666' }
        };
        options.series = [{
          type: 'line',
          areaStyle: {},
          data: data?.yAxis || [820, 932, 901, 934],
          smooth: true
        }];
        break;
        
      case 'scatter':
        options.xAxis = {
          type: 'value',
          axisLine: { show: true, lineStyle: { color: isDarkMode ? '#333333' : '#d9d9d9' } },
          axisLabel: { color: isDarkMode ? '#cccccc' : '#666666' }
        };
        options.yAxis = {
          type: 'value',
          axisLine: { show: true, lineStyle: { color: isDarkMode ? '#333333' : '#d9d9d9' } },
          axisLabel: { color: isDarkMode ? '#cccccc' : '#666666' }
        };
        options.series = [{
          type: 'scatter',
          data: data?.series || [[10, 8.04], [8, 6.95], [13, 7.58], [9, 8.81], [11, 8.33]]
        }];
        break;
        
      default:
        // Fallback to basic line chart
        options.xAxis = { type: 'category', data: ['A', 'B', 'C', 'D', 'E'] };
        options.yAxis = { type: 'value' };
        options.series = [{ type: 'line', data: [120, 200, 150, 80, 300] }];
    }
    
    // If we have custom config, merge it with defaults
    if (config && Object.keys(config).length > 0) {
      options = mergeConfig(options, config);
    }
    
    return options;
  };

  // Deep merge configuration
  const mergeConfig = (defaultConfig: any, customConfig: any): any => {
    const merged = { ...defaultConfig };
    
    Object.keys(customConfig).forEach(key => {
      if (customConfig[key] && typeof customConfig[key] === 'object' && !Array.isArray(customConfig[key])) {
        merged[key] = mergeConfig(merged[key] || {}, customConfig[key]);
      } else {
        merged[key] = customConfig[key];
      }
    });
    
    return merged;
  };

  // Update chart data based on chart type
  const updateChartData = (options: any, data: any, chartType: string): any => {
    const updated = { ...options };
    
    switch (chartType) {
      case 'line':
      case 'bar':
      case 'area':
        if (data.xAxis) {
          updated.xAxis = { ...updated.xAxis, data: data.xAxis };
        }
        if (data.yAxis) {
          if (updated.series && updated.series[0]) {
            updated.series[0].data = data.yAxis;
          }
        }
        break;
      case 'pie':
        if (data.series) {
          if (updated.series && updated.series[0]) {
            updated.series[0].data = data.series;
          }
        }
        break;
      case 'scatter':
        if (data.series) {
          if (updated.series && updated.series[0]) {
            updated.series[0].data = data.series;
          }
        }
        break;
    }
    
    return updated;
  };

  // Update chart when config or data changes
  useEffect(() => {
    if (chartInstance.current && widget.type) {
      setIsLoading(true);
      
      try {
        const options = generateChartOptions(widget.type, config, data);
        chartInstance.current.setOption(options, true);
        
        // Add event listeners for interactions
        chartInstance.current.on('click', (params) => {
          console.log('Chart clicked:', params);
          
          // Handle title editing
          if (showEditableTitle && params.componentType === 'title') {
            startEditingTitle();
            return;
          }
          
          // Handle drill-down or other interactions
        });
        
        chartInstance.current.on('legendselectchanged', (params) => {
          console.log('Legend changed:', params);
        });
        
      } catch (error) {
        console.error('Error setting chart options:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [widget.type, config, data, isDarkMode]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };

    // Resize when widget size changes
    if (chartRef.current) {
      const resizeObserver = new ResizeObserver(() => {
        if (chartInstance.current) {
          chartInstance.current.resize();
        }
      });
      resizeObserver.observe(chartRef.current);
      return () => resizeObserver.disconnect();
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (chartRef.current) {
      if (!isFullscreen) {
        chartRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
      setIsFullscreen(!isFullscreen);
    }
  };

  // Handle refresh
  const refreshChart = () => {
    if (chartInstance.current && widget.type) {
      const options = generateChartOptions(widget.type, config, data);
      chartInstance.current.setOption(options, true);
    }
  };

  // Handle download
  const downloadChart = () => {
    if (chartInstance.current) {
      const dataURL = chartInstance.current.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      
      const link = document.createElement('a');
      link.download = `${widget.name}-chart.png`;
      link.href = dataURL;
      link.click();
    }
  };

  // Get widget title - use ECharts config title if available, otherwise widget name, fallback to 'Untitled'
  const getWidgetTitle = () => {
    // Check ECharts config title first
    if (config?.title?.text) {
      return config.title.text;
    }
    // Check if title is a string in config
    if (typeof config?.title === 'string') {
      return config.title;
    }
    // Fallback to widget name
    if (widget.name && widget.name !== 'Chart Title') {
      return widget.name;
    }
    return 'Untitled';
  };

  // Get widget subtitle - use ECharts config subtitle
  const getWidgetSubtitle = () => {
    // Check ECharts config subtitle
    if (config?.title?.subtext) {
      return config.title.subtext;
    }
    return '';
  };

  // Get title alignment - default to left as requested
  const getTitleAlignment = () => {
    return config?.title?.left || 'left';
  };

  // Handle title editing
  const startEditingTitle = () => {
    setEditingTitle(getWidgetTitle());
    setEditingSubtitle(getWidgetSubtitle());
    setIsEditingTitle(true);
  };

  const saveTitle = () => {
    // Update the ECharts config with new title and subtitle
    if (onConfigUpdate) {
      const updatedConfig = {
        ...config,
        title: {
          ...config?.title,
          text: editingTitle,
          subtext: editingSubtitle
        }
      };
      onConfigUpdate(updatedConfig);
    }
    
    // Also call the legacy onTitleChange if provided
    if (onTitleChange) {
      onTitleChange(editingTitle, editingSubtitle);
    }
    setIsEditingTitle(false);
  };

  const cancelEditingTitle = () => {
    setIsEditingTitle(false);
    setEditingTitle('');
    setEditingSubtitle('');
  };

  // Handle aspect ratio change
  const handleAspectRatioChange = (ratio: string) => {
    setChartSize(prev => ({
      ...prev,
      aspectRatio: ratio
    }));
    
    // Update config with new aspect ratio
    if (onConfigUpdate) {
      const updatedConfig = {
        ...config,
        aspectRatio: ratio
      };
      onConfigUpdate(updatedConfig);
    }
  };

  // Get chart container style based on aspect ratio
  const getChartContainerStyle = () => {
    const baseStyle = {
      width: '100%',
      height: '100%',
      minHeight: '200px',
      resize: 'both',
      overflow: 'hidden',
      border: '1px dashed transparent',
      transition: 'border-color 0.2s ease',
      position: 'relative',
      zIndex: 1
    };

    // Apply aspect ratio if specified
    if (chartSize.aspectRatio !== 'auto') {
      const ratios: Record<string, string> = {
        '16:9': '56.25%', // 9/16 * 100
        '4:3': '75%',     // 3/4 * 100
        '1:1': '100%',    // 1/1 * 100
        '3:2': '66.67%'   // 2/3 * 100
      };
      
      if (ratios[chartSize.aspectRatio]) {
        return {
          ...baseStyle,
          aspectRatio: chartSize.aspectRatio,
          height: 'auto',
          paddingBottom: ratios[chartSize.aspectRatio]
        };
      }
    }

    return baseStyle;
  };

  return (
    <Card
      size="small"
      style={{
        height: '100%',
        border: `2px solid ${isSelected ? '#1890ff' : isDarkMode ? '#303030' : '#d9d9d9'}`,
        background: config?.showContainerBackground !== false ? (isDarkMode ? '#1f1f1f' : '#ffffff') : 'transparent',
        cursor: 'pointer',
        boxShadow: config?.showContainerShadow !== false ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
        overflow: 'hidden' // Keep chart within card boundaries
      }}
      extra={
        <Dropdown
          menu={{
            items: [
              {
                key: 'refresh',
                icon: <ReloadOutlined />,
                label: 'Refresh Chart',
                onClick: (e: any) => {
                  e.domEvent.stopPropagation();
                  refreshChart();
                }
              },
              {
                key: 'download',
                icon: <DownloadOutlined />,
                label: 'Download Chart',
                onClick: (e: any) => {
                  e.domEvent.stopPropagation();
                  downloadChart();
                }
              },
              {
                key: 'fullscreen',
                icon: <FullscreenOutlined />,
                label: 'Fullscreen',
                onClick: (e: any) => {
                  e.domEvent.stopPropagation();
                  toggleFullscreen();
                }
              },
              {
                key: 'edit-title',
                icon: <EditOutlined />,
                label: 'Edit Title',
                onClick: (e: any) => {
                  e.domEvent.stopPropagation();
                  startEditingTitle();
                }
              },
              {
                key: 'aspect-ratio',
                icon: <SettingOutlined />,
                label: 'Aspect Ratio',
                children: [
                  {
                    key: 'auto',
                    label: 'Auto',
                    onClick: (e: any) => {
                      e.domEvent.stopPropagation();
                      handleAspectRatioChange('auto');
                    }
                  },
                  {
                    key: '16:9',
                    label: '16:9 (Widescreen)',
                    onClick: (e: any) => {
                      e.domEvent.stopPropagation();
                      handleAspectRatioChange('16:9');
                    }
                  },
                  {
                    key: '4:3',
                    label: '4:3 (Standard)',
                    onClick: (e: any) => {
                      e.domEvent.stopPropagation();
                      handleAspectRatioChange('4:3');
                    }
                  },
                  {
                    key: '1:1',
                    label: '1:1 (Square)',
                    onClick: (e: any) => {
                      e.domEvent.stopPropagation();
                      handleAspectRatioChange('1:1');
                    }
                  },
                  {
                    key: '3:2',
                    label: '3:2 (Photo)',
                    onClick: (e: any) => {
                      e.domEvent.stopPropagation();
                      handleAspectRatioChange('3:2');
                    }
                  }
                ]
              },
              {
                key: 'configure',
                icon: <SettingOutlined />,
                label: 'Configure',
                onClick: (e: any) => {
                  e.domEvent.stopPropagation();
                  onWidgetClick?.(widget);
                }
              },
              ...(onDelete ? [{
                key: 'delete',
                icon: <DeleteOutlined />,
                label: 'Delete Widget',
                danger: true,
                onClick: (e: any) => {
                  e.domEvent.stopPropagation();
                  onDelete(widget.id);
                }
              }] : [])
            ]
          }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button
            size="small"
            type="text"
            icon={<MoreOutlined />}
            onClick={(e) => e.stopPropagation()}
            style={{ 
              color: isDarkMode ? '#999' : '#666',
              border: 'none',
              boxShadow: 'none'
            }}
          />
        </Dropdown>
      }
      onClick={() => onWidgetClick?.(widget)}
    >
      <div style={{ 
        position: 'relative',
        height: 'calc(100% - 60px)',
        minHeight: '200px'
      }}>
        {isLoading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10
          }}>
            <Spin size="large" />
          </div>
        )}
        
              <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '200px' }}>
        <div 
          ref={chartRef} 
          style={{
            width: '100%',
            height: '100%',
            minHeight: '200px',
            resize: 'both',
            overflow: 'auto',
            border: '2px dashed transparent',
            transition: 'border-color 0.2s ease',
            position: 'relative',
            zIndex: 1
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#1890ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'transparent';
          }}
        />
        
        {/* Title editing overlay */}
        {isEditingTitle && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px', // Left alignment as requested
            background: isDarkMode ? '#1f1f1f' : '#ffffff',
            border: '2px solid #1890ff',
            borderRadius: '6px',
            padding: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: '300px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <Text strong style={{ color: isDarkMode ? '#ffffff' : '#000000', fontSize: '12px' }}>
                  Chart Title:
                </Text>
                <Input
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  placeholder="Enter chart title"
                  size="small"
                  onPressEnter={saveTitle}
                  autoFocus
                  style={{ marginTop: '4px' }}
                />
              </div>
              <div>
                <Text strong style={{ color: isDarkMode ? '#ffffff' : '#000000', fontSize: '12px' }}>
                  Subtitle:
                </Text>
                <Input
                  value={editingSubtitle}
                  onChange={(e) => setEditingSubtitle(e.target.value)}
                  placeholder="Enter subtitle (optional)"
                  size="small"
                  onPressEnter={saveTitle}
                  style={{ marginTop: '4px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Button size="small" type="primary" icon={<CheckOutlined />} onClick={saveTitle}>
                  Save
                </Button>
                <Button size="small" icon={<CloseOutlined />} onClick={cancelEditingTitle}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </Card>
  );
};

export default ChartWidget;
