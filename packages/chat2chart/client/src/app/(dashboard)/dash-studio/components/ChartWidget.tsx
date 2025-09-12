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
import { Spin, Button, Dropdown, Input, Typography, Modal, message } from 'antd';

const { Text } = Typography;
import { 
  FullscreenOutlined, 
  ReloadOutlined, 
  DownloadOutlined,
  SettingOutlined,
  ShareAltOutlined,
  DeleteOutlined,
  MoreOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  UnlockOutlined
} from '@ant-design/icons';


interface ChartWidgetProps {
  widget: any;
  config: any;
  data: any;
  onConfigUpdate?: (config: any) => void;
  onWidgetClick?: (widget: any) => void;
  onDelete?: (widgetId: string) => void;
  onDuplicate?: (widget: any) => void;
  onUpdate?: (widgetId: string, updates: any) => void;
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
  onDuplicate,
  onUpdate,
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
  const [isConfigVisible, setIsConfigVisible] = useState(false);
  const [configJson, setConfigJson] = useState('');
  const [chartBox, setChartBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const resizingRef = useRef<{ handle: string | null; startX: number; startY: number; box: any } | null>(null);

  // Normalize incoming data into a common shape for chart generators
  const normalizeData = (rawData: any, chartType: string) => {
    const result: any = {
      xAxis: undefined,
      yAxis: undefined,
      series: undefined,
      indicators: undefined,
      value: undefined,
      query: undefined
    };

    if (!rawData) return result;

    // If rawData comes from SQL result-like { columns: [...], rows: [...] }
    if (rawData.columns && rawData.rows) {
      // simple mapping: first column -> x, second column -> y (series)
      try {
        result.xAxis = rawData.rows.map((r:any) => r[0]);
        result.yAxis = rawData.rows.map((r:any) => r[1]);
        result.series = [{ name: 'Series 1', data: result.yAxis }];
        result.query = rawData.query || null;
        return result;
      } catch (err) {
        return result;
      }
    }

    // If rawData already has xAxis / yAxis / series fields, use them
    if (rawData.xAxis || rawData.yAxis || rawData.series) {
      result.xAxis = rawData.xAxis;
      result.yAxis = rawData.yAxis;
      result.series = rawData.series;
      result.indicators = rawData.indicators;
      result.value = rawData.value;
      result.query = rawData.query || rawData.sql || null;
      return result;
    }

    // If rawData is an array of simple values, map to yAxis
    if (Array.isArray(rawData)) {
      result.yAxis = rawData;
      result.xAxis = rawData.map((v,i) => `Item ${i+1}`);
      result.series = [{ name: 'Series 1', data: rawData }];
      return result;
    }

    // Fallback: try to use series if object
    if (rawData.series && Array.isArray(rawData.series)) {
      result.series = rawData.series;
      return result;
    }

    return result;
  };

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
      backgroundColor: (config?.plotBackgroundColor ?? 'transparent'),
      // We render chart title/subtitle as HTML overlay for inline editing; hide ECharts title
      title: {
        show: false,
        text: '',
        subtext: ''
      },
      tooltip: {
        trigger: config?.tooltip?.trigger || 'axis',
        backgroundColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
        borderColor: isDarkMode ? '#404040' : '#d9d9d9',
        textStyle: {
          color: isDarkMode ? '#ffffff' : '#000000'
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
        top: config?.grid?.top || (config?.title?.subtext ? 90 : 70), // Dynamic top margin based on subtitle
        right: config?.grid?.right || 40,
        bottom: config?.grid?.bottom || 60,
        left: config?.grid?.left || 60,
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
      
      case 'groupedBar':
        // Expect data.series = [{ name, data: [...] }, ...]
        options.xAxis = {
          type: 'category',
          data: data?.xAxis || ['A','B','C','D','E'],
          axisLine: { show: true, lineStyle: { color: isDarkMode ? '#333333' : '#d9d9d9' } },
          axisLabel: { color: isDarkMode ? '#cccccc' : '#666666' }
        };
        options.yAxis = { type: 'value', axisLine: { lineStyle: { color: isDarkMode ? '#333333' : '#d9d9d9' } }, axisLabel: { color: isDarkMode ? '#cccccc' : '#666666' } };
        options.series = (data?.series && Array.isArray(data.series) ? data.series : [{ name: 'Series 1', data: data?.yAxis || [120,200,150,80,300] }]).map((s:any) => ({ type: 'bar', name: s.name, data: s.data }));
        break;

      case 'stackedBar':
        options.xAxis = {
          type: 'category',
          data: data?.xAxis || ['A','B','C','D','E'],
          axisLine: { show: true, lineStyle: { color: isDarkMode ? '#333333' : '#d9d9d9' } },
          axisLabel: { color: isDarkMode ? '#cccccc' : '#666666' }
        };
        options.yAxis = { type: 'value', axisLine: { lineStyle: { color: isDarkMode ? '#333333' : '#d9d9d9' } }, axisLabel: { color: isDarkMode ? '#cccccc' : '#666666' } };
        options.series = (data?.series && Array.isArray(data.series) ? data.series : [{ name: 'Series 1', data: data?.yAxis || [120,200,150,80,300] }]).map((s:any, idx:number) => ({ type: 'bar', stack: 'stack1', name: s.name || `S${idx+1}`, data: s.data }));
        break;

      case 'radar':
        // data.indicators: [{ name, max }], data.series: [{ name, value: [...] }]
        options.radar = {
          indicator: data?.indicators || [{ name: 'Metric1', max: 100 }, { name: 'Metric2', max: 100 }, { name: 'Metric3', max: 100 }],
          shape: 'polygon'
        };
        options.series = [{ type: 'radar', data: data?.series || [{ value: [50,60,70], name: 'Series' }] }];
        break;

      case 'gauge':
        options.series = [{ type: 'gauge', detail: { formatter: '{value}' }, data: [{ value: data?.value ?? (data?.series && data.series[0]?.value) ?? 75, name: config?.title?.text || widget.name }] }];
        break;

      case 'heatmap':
        // data.series expected as [[xIndex,yIndex,value], ...]
        options.xAxis = { type: 'category', data: data?.xAxis || ['A','B','C'] };
        options.yAxis = { type: 'category', data: data?.yAxis || ['1','2','3'] };
        options.series = [{ type: 'heatmap', data: data?.series || [[0,0,5],[0,1,1],[1,0,1]], progressive: 100 }];
        break;

      case 'funnel':
        options.series = [{ type: 'funnel', data: data?.series || [{ value: 60, name: 'Visit' }, { value: 40, name: 'Order' }, { value: 20, name: 'Purchase' }] }];
        break;

      case 'treemap':
        options.series = [{ type: 'treemap', data: data?.series || [{ name: 'A', value: 6 }, { name: 'B', value: 4 }], roam: false }];
        break;

      case 'bubble':
        options.xAxis = { type: 'value' };
        options.yAxis = { type: 'value' };
        options.series = [{ type: 'scatter', symbolSize: (val:any) => val[2] || 10, data: data?.series || [[10,20,40],[20,30,60]] }];
        break;
        
      default:
        // Fallback to basic line chart
        options.xAxis = { type: 'category', data: ['A', 'B', 'C', 'D', 'E'] };
        options.yAxis = { type: 'value' };
        options.series = [{ type: 'line', data: [120, 200, 150, 80, 300] }];
    }
    
    // If we have custom config, merge it with defaults
    if (config && Object.keys(config).length > 0) {
      // Apply legend position if provided
      if (config.showLegend === false) {
        options.legend = { show: false };
      } else if (config.legendPosition) {
        options.legend = { ...(options.legend || {}), orient: (config.legendPosition === 'left' || config.legendPosition === 'right') ? 'vertical' : 'horizontal', left: config.legendPosition === 'left' ? 'left' : (config.legendPosition === 'right' ? 'right' : 'center'), top: config.legendPosition === 'top' ? 'top' : (config.legendPosition === 'bottom' ? 'bottom' : 'top') };
      }

      // Axis labels
      if (config.showXAxisLabel === false) {
        if (options.xAxis) options.xAxis.axisLabel = { show: false };
      } else if (config.xAxisLabel) {
        if (options.xAxis) options.xAxis.name = config.xAxisLabel;
      }
      if (config.showYAxisLabel === false) {
        if (options.yAxis) options.yAxis.axisLabel = { show: false };
      } else if (config.yAxisLabel) {
        if (options.yAxis) options.yAxis.name = config.yAxisLabel;
      }

      // Data labels
      if (config.dataLabels) {
        options.series = (options.series || []).map((s:any) => ({ ...(s || {}), label: { show: true } }));
      }

      // Series label formatting / position
      if (config.seriesLabel) {
        options.series = (options.series || []).map((s:any) => ({ ...(s || {}), label: { ...(s.label||{}), show: !!config.seriesLabel.show, position: config.seriesLabel.position || 'top', formatter: config.seriesLabel.formatter || undefined } }));
      }

      // Tooltip formatter
      if (config.tooltipFormatter) {
        options.tooltip = { ...(options.tooltip || {}), formatter: config.tooltipFormatter };
      }

      // Axis tick formatter
      if (config.xAxisTick && options.xAxis) {
        options.xAxis.axisLabel = { ...(options.xAxis.axisLabel || {}), formatter: config.xAxisTick.formatter, rotate: config.xAxisTick.rotate };
      }
      if (config.yAxisTick && options.yAxis) {
        options.yAxis.axisLabel = { ...(options.yAxis.axisLabel || {}), formatter: config.yAxisTick.formatter, rotate: config.yAxisTick.rotate };
      }

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
        const chartType = config?.chartType || widget.type;
        const options = generateChartOptions(chartType, config, data);
        chartInstance.current.setOption(options, true);
        
        // Add event listeners for interactions
        chartInstance.current.on('click', (params) => {
          console.log('Chart clicked:', params);
          
          // Handle title editing - check if click is on title area
          if (showEditableTitle && params.componentType === 'title') {
            startEditingTitle();
            return;
          }
          
          // Handle drill-down or other interactions
        });
        
        // Add double-click handler for title editing as fallback
        chartInstance.current.on('dblclick', (params) => {
          if (showEditableTitle) {
            startEditingTitle();
          }
        });
        
        // Add click handler to the chart container for title editing
        if (chartRef.current && showEditableTitle) {
          const handleContainerClick = (event: MouseEvent) => {
            // Check if click is in the title area (top 20% of chart)
            const rect = chartRef.current!.getBoundingClientRect();
            const clickY = event.clientY - rect.top;
            const titleAreaHeight = rect.height * 0.2;
            
            if (clickY <= titleAreaHeight) {
              startEditingTitle();
            }
          };
          
          chartRef.current.addEventListener('click', handleContainerClick);
          
          // Cleanup
          return () => {
            if (chartRef.current) {
              chartRef.current.removeEventListener('click', handleContainerClick);
            }
          };
        }
        
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

    // Resize when widget container size changes - observe parent
    const parent = chartRef.current?.parentElement;
    if (parent) {
      const resizeObserver = new ResizeObserver(() => {
        if (chartInstance.current) chartInstance.current.resize();
        // update chartBox default if not customized
        if (!chartBox) {
          const rect = parent.getBoundingClientRect();
          setChartBox({ left: 0, top: 0, width: rect.width, height: rect.height });
        }
      });
      resizeObserver.observe(parent);
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

  // Initialize chartBox to full parent size on mount
  useEffect(() => {
    const parent = chartRef.current?.parentElement;
    if (parent && !chartBox) {
      const rect = parent.getBoundingClientRect();
      setChartBox({ left: 0, top: 0, width: rect.width, height: rect.height });
    }
  }, []);

  // Handle refresh
  const refreshChart = () => {
    if (chartInstance.current) {
      const chartType = config?.chartType || widget.type;
      const normalized = normalizeData(data, chartType);
      const options = generateChartOptions(chartType, config, normalized);
      chartInstance.current.setOption(options, true);
    }
  };

  const getExportBackgroundColor = () => {
    if (config?.plotBackgroundColor) return config.plotBackgroundColor;
    try {
      if (chartRef.current) {
        const c = window.getComputedStyle(chartRef.current).backgroundColor;
        if (c) return c;
      }
    } catch {}
    return isDarkMode ? '#0f1419' : '#ffffff';
  };

  const withVisibleTitleForExport = (action: () => void) => {
    if (!chartInstance.current) return;
    try {
      const prev = chartInstance.current.getOption();
      const prevShow = (prev as any)?.title?.[0]?.show;
      const prevText = (prev as any)?.title?.[0]?.text;
      const prevSub = (prev as any)?.title?.[0]?.subtext;
      chartInstance.current.setOption({
        title: {
          show: true,
          text: prevText || config?.title?.text || editingTitle || widget.name || 'Chart',
          subtext: prevSub || config?.title?.subtext || editingSubtitle || ''
        }
      }, false);
      action();
      chartInstance.current.setOption({ title: { show: prevShow ?? !isEditingTitle } }, false);
    } catch (err) {
      action();
    }
  };

  // Handle download (Export PNG)
  const downloadChart = () => {
    if (!chartInstance.current) return;
    const bg = getExportBackgroundColor();
    withVisibleTitleForExport(() => {
      const dataURL = chartInstance.current!.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: bg });
      const link = document.createElement('a');
      link.download = `${widget.name || 'chart'}-export.png`;
      link.href = dataURL;
      link.click();
    });
  };

  // Copy image to clipboard
  const copyChartImage = async () => {
    try {
      if (!chartInstance.current) return;
      const bg = getExportBackgroundColor();
      const dataURL = chartInstance.current.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: bg });
      const res = await fetch(dataURL);
      const blob = await res.blob();
      // @ts-ignore
      if (navigator.clipboard && window.ClipboardItem) {
        // @ts-ignore
        await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
        message.success('Chart image copied to clipboard');
      } else {
        downloadChart();
      }
    } catch (err) {
      console.error('Copy image failed:', err);
      downloadChart();
    }
  };

  // Export current options + data as JSON
  const exportJSON = () => {
    try {
      const chartType = config?.chartType || widget.type;
      const options = generateChartOptions(chartType, config, data);
      const payload = { id: widget.id, type: chartType, options, data };
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${widget.name || 'chart'}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export JSON failed:', err);
      message.error('Failed to export JSON');
    }
  };

  // Export basic CSV (x/y pairs or series flat)
  const exportCSV = () => {
    try {
      let csv = '';
      if (data?.xAxis && data?.yAxis) {
        csv += 'x,y\n';
        for (let i = 0; i < Math.max(data.xAxis.length, data.yAxis.length); i++) {
          csv += `${data.xAxis[i] ?? ''},${data.yAxis[i] ?? ''}\n`;
        }
      } else if (data?.series && Array.isArray(data.series)) {
        csv += 'name,value\n';
        for (const row of data.series) {
          if (Array.isArray(row)) csv += `${row[0] ?? ''},${row[1] ?? ''}\n`;
          else if (row && typeof row === 'object') csv += `${row.name ?? ''},${row.value ?? ''}\n`;
        }
      } else {
        csv = 'data\n' + JSON.stringify(data);
      }
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${widget.name || 'chart'}-data.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export CSV failed:', err);
      message.error('Failed to export CSV');
    }
  };

  // Share / Embed link (requires saved widget id)
  const copyEmbedLink = () => {
    try {
      const origin = window.location.origin;
      const id = widget.id || 'preview';
      const url = `${origin}/embedded/chart/${id}`;
      navigator.clipboard.writeText(url);
      message.success('Embed link copied');
    } catch (err) {
      console.error('Copy embed link failed:', err);
      message.error('Failed to copy embed link');
    }
  };

  // View config modal (ECharts options, SQL, metadata)
  const openConfigViewer = () => {
    const options = generateChartOptions(widget.type, config, data);
    const payload = {
      id: widget.id,
      type: widget.type,
      sql: data?.query || data?.sql || null,
      options,
      meta: {
        title: config?.title?.text || widget.name || 'Untitled',
        subtitle: config?.title?.subtext || '',
      }
    };
    setConfigJson(JSON.stringify(payload, null, 2));
    setIsConfigVisible(true);
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

  // Start handle resize
  const startHandleResize = (handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const target = chartRef.current?.parentElement;
    if (!target) return;
    const rect = (chartRef.current as HTMLDivElement).getBoundingClientRect();
    console.log('startHandleResize', handle, e.clientX, e.clientY);
    resizingRef.current = { handle, startX: e.clientX, startY: e.clientY, box: { ...rect } };
    const onMouseMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const { handle: h, startX, startY, box } = resizingRef.current;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let newLeft = box.left - (target.getBoundingClientRect().left);
      let newTop = box.top - (target.getBoundingClientRect().top);
      let newWidth = box.width;
      let newHeight = box.height;

      const minW = 120;
      const minH = 80;

      if (h === 'se') {
        newWidth = Math.max(minW, box.width + dx);
        newHeight = Math.max(minH, box.height + dy);
      } else if (h === 'sw') {
        newWidth = Math.max(minW, box.width - dx);
        newLeft = Math.max(0, newLeft + dx);
        newHeight = Math.max(minH, box.height + dy);
      } else if (h === 'ne') {
        newWidth = Math.max(minW, box.width + dx);
        newTop = Math.max(0, newTop + dy);
        newHeight = Math.max(minH, box.height - dy);
      } else if (h === 'nw') {
        newLeft = Math.max(0, newLeft + dx);
        newTop = Math.max(0, newTop + dy);
        newWidth = Math.max(minW, box.width - dx);
        newHeight = Math.max(minH, box.height - dy);
      }

      setChartBox({ left: newLeft, top: newTop, width: newWidth, height: newHeight });
      if (chartInstance.current) chartInstance.current.resize();
      console.log('resizing', h, dx, dy, { newLeft, newTop, newWidth, newHeight });
    };

    const onMouseUp = () => {
      console.log('end resize');
      resizingRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div 
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '200px',
        cursor: 'pointer'
      }}
      onClick={() => onWidgetClick?.(widget)}
    >
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
        
        {/* Single three-dot menu in chart plotting area */}
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          zIndex: 1000,
          opacity: 1,
          transition: 'opacity 0.2s ease'
        }}>
        <Dropdown
          menu={{
            items: [
              {
                  key: 'edit',
                  label: 'Edit',
                  icon: <EditOutlined />,
                  onClick: () => onWidgetClick?.(widget)
                },
                {
                  key: 'export-json',
                  label: 'Export JSON',
                icon: <DownloadOutlined />,
                  onClick: exportJSON
                },
                {
                  key: 'export-csv',
                  label: 'Export CSV',
                  icon: <DownloadOutlined />,
                  onClick: exportCSV
                },
                {
                  key: 'copy-image',
                  label: 'Copy Image',
                  icon: <DownloadOutlined />,
                  onClick: copyChartImage
                },
                {
                  key: 'embed',
                  label: 'Copy Embed Link',
                  icon: <ShareAltOutlined />,
                  onClick: copyEmbedLink
                },
                {
                  key: 'duplicate',
                  label: 'Duplicate',
                  icon: <CopyOutlined />,
                  onClick: () => onDuplicate?.(widget)
                },
                {
                  key: 'visibility',
                  label: widget.isVisible ? 'Hide' : 'Show',
                  icon: widget.isVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />,
                  onClick: () => onUpdate?.(widget.id, { isVisible: !widget.isVisible })
                },
                {
                  key: 'lock',
                  label: widget.isLocked ? 'Unlock' : 'Lock',
                  icon: widget.isLocked ? <UnlockOutlined /> : <LockOutlined />,
                  onClick: () => onUpdate?.(widget.id, { isLocked: !widget.isLocked })
                },
                {
                  type: 'divider' as const
                },
                {
                  key: 'view-config',
                  label: 'View Config',
                icon: <SettingOutlined />,
                  onClick: openConfigViewer
                },
                {
                key: 'delete',
                  label: 'Delete',
                icon: <DeleteOutlined />,
                danger: true,
                  onClick: () => onDelete?.(widget.id)
                }
            ]
          }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button
            size="small"
            type="text"
            icon={<MoreOutlined />}
            style={{ 
                color: isDarkMode ? '#ffffff' : '#000000',
                background: isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(4px)'
            }}
          />
        </Dropdown>
          </div>
        
              <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '200px' }}>
        <div 
          ref={chartRef} 
          style={chartBox ? {
            position: 'absolute',
            left: `${chartBox.left}px`,
            top: `${chartBox.top}px`,
            width: `${chartBox.width}px`,
            height: `${chartBox.height}px`,
            minHeight: '80px',
            overflow: 'hidden',
            border: '2px dashed transparent',
            transition: 'border-color 0.2s ease',
            zIndex: 1,
            background: config?.plotBackgroundColor ?? 'transparent'
          } : {
            width: '100%',
            height: '100%',
            minHeight: '200px',
            overflow: 'hidden',
            border: '2px dashed transparent',
            transition: 'border-color 0.2s ease',
            position: 'relative',
            zIndex: 1,
            background: config?.plotBackgroundColor ?? 'transparent'
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = '#1890ff';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent';
          }}
        />

        {/* Resize handles: two handles for plotting area (se and nw) */}
        <div
          style={chartBox ? {
            position: 'absolute',
            left: `${chartBox.left + chartBox.width - 14}px`,
            top: `${chartBox.top + chartBox.height - 14}px`,
            width: 18,
            height: 18,
            borderRadius: 3,
            background: 'transparent',
            border: '1px solid transparent',
            cursor: 'nwse-resize',
            zIndex: 1200,
            opacity: 0
          } : {
            position: 'absolute',
            right: '8px',
            bottom: '8px',
            width: 18,
            height: 18,
            borderRadius: 3,
            background: 'transparent',
            border: '1px solid transparent',
            cursor: 'nwse-resize',
            zIndex: 1200,
            opacity: 0
          }}
          onMouseDown={(e) => startHandleResize('se', e)}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; (e.currentTarget as HTMLDivElement).style.background = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'; (e.currentTarget as HTMLDivElement).style.border = isDarkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.12)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '0'; (e.currentTarget as HTMLDivElement).style.background = 'transparent'; (e.currentTarget as HTMLDivElement).style.border = '1px solid transparent'; }}
        />
        <div
          style={chartBox ? {
            position: 'absolute',
            left: `${chartBox.left}px`,
            top: `${chartBox.top}px`,
            width: 18,
            height: 18,
            borderRadius: 3,
            background: 'transparent',
            border: '1px solid transparent',
            cursor: 'nwse-resize',
            zIndex: 1200,
            opacity: 0
          } : {
            position: 'absolute',
            left: '8px',
            top: '8px',
            width: 18,
            height: 18,
            borderRadius: 3,
            background: 'transparent',
            border: '1px solid transparent',
            cursor: 'nwse-resize',
            zIndex: 1200,
            opacity: 0
          }}
          onMouseDown={(e) => startHandleResize('nw', e)}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; (e.currentTarget as HTMLDivElement).style.background = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'; (e.currentTarget as HTMLDivElement).style.border = isDarkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.12)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '0'; (e.currentTarget as HTMLDivElement).style.background = 'transparent'; (e.currentTarget as HTMLDivElement).style.border = '1px solid transparent'; }}
        />
        
        {/* Clickable title/subtitle overlay to start inline editing */}
        {!isEditingTitle && showEditableTitle && (
          <div
            onClick={startEditingTitle}
            style={{
              position: 'absolute',
              top: '8px',
              left: '12px',
              right: '12px',
              zIndex: 900,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              pointerEvents: 'auto'
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: isDarkMode ? '#fff' : '#000' }}>{getWidgetTitle()}</div>
            {getWidgetSubtitle() ? (
              <div style={{ fontSize: 12, color: isDarkMode ? '#ccc' : '#666' }}>{getWidgetSubtitle()}</div>
            ) : null}
          </div>
        )}

        {/* Inline title editing - overlay on chart title area */}
        {/* Inline editable HTML title/subtitle rendered above the chart */}
        <div style={{ position: 'absolute', top: 8, left: 12, right: 12, zIndex: 900, pointerEvents: 'auto' }}>
          {!isEditingTitle ? (
            <div onClick={startEditingTitle} style={{ cursor: 'text' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: isDarkMode ? '#fff' : '#000', textAlign: config?.title?.left || 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getWidgetTitle()}</div>
              {getWidgetSubtitle() ? <div style={{ fontSize: 12, color: isDarkMode ? '#ccc' : '#666', textAlign: config?.title?.left || 'left' }}>{getWidgetSubtitle()}</div> : null}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Input value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} onBlur={saveTitle} onPressEnter={saveTitle} autoFocus size="small" style={{ fontSize: 16, fontWeight: 600 }} />
              <Input value={editingSubtitle} onChange={(e) => setEditingSubtitle(e.target.value)} onBlur={saveTitle} onPressEnter={saveTitle} size="small" style={{ fontSize: 12 }} />
            </div>
          )}
        </div>
      </div>
      <Modal
        open={isConfigVisible}
        onCancel={() => setIsConfigVisible(false)}
        onOk={() => setIsConfigVisible(false)}
        title="Chart Configuration"
        width={720}
      >
        <pre style={{ maxHeight: 420, overflow: 'auto', background: '#0f172a', color: '#e2e8f0', padding: 12, borderRadius: 6 }}>
{configJson}
        </pre>
      </Modal>
      </div>
  );
};

export default ChartWidget;
