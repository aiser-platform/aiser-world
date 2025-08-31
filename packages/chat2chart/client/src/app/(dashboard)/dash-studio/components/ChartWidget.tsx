'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { Card, Spin, Tooltip, Button, Space, Dropdown } from 'antd';
import { 
  FullscreenOutlined, 
  ReloadOutlined, 
  DownloadOutlined,
  SettingOutlined,
  DeleteOutlined,
  MoreOutlined
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
  const [editableTitle, setEditableTitle] = useState(config?.basic?.title || widget?.name || 'Chart Title');
  const [editableSubtitle, setEditableSubtitle] = useState(config?.basic?.subtitle || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

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
    const baseOptions = {
      backgroundColor: 'transparent',
      title: {
        text: config?.basic?.title || widget.name,
        subtext: config?.basic?.subtitle || '',
        left: config?.basic?.titlePosition || 'center',
        textStyle: {
          color: isDarkMode ? '#ffffff' : '#000000',
          fontSize: config?.basicStyling?.fontSize || 14
        },
        subtextStyle: {
          color: isDarkMode ? '#999999' : '#666666',
          fontSize: 12
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDarkMode ? '#2a2a2a' : '#ffffff',
        borderColor: isDarkMode ? '#404040' : '#d9d9d9',
        textStyle: {
          color: isDarkMode ? '#ffffff' : '#000000'
        }
      },
      legend: {
        show: config?.basicStyling?.showLegend !== false,
        top: config?.standard?.legend?.position === 'bottom' ? 'bottom' : 'top',
        left: config?.standard?.legend?.position === 'left' ? 'left' : 'center',
        right: config?.standard?.legend?.position === 'right' ? 'right' : 'auto',
        orient: config?.standard?.legend?.orientation || 'horizontal',
        textStyle: {
          color: config?.standard?.legend?.textColor || (isDarkMode ? '#ffffff' : '#000000')
        }
      },
      grid: {
        left: config?.advanced?.grid?.left || '10%',
        right: config?.advanced?.grid?.right || '10%',
        top: config?.advanced?.grid?.top || '15%',
        bottom: config?.advanced?.grid?.bottom || '15%',
        containLabel: config?.advanced?.grid?.containLabel !== false
      },
      animation: config?.advanced?.animation?.show !== false
    };

    // Chart type specific options
    switch (chartType) {
      case 'bar':
        return {
          ...baseOptions,
          xAxis: {
            type: 'category',
            data: data?.xAxis || ['Category 1', 'Category 2', 'Category 3'],
            axisLabel: {
              color: isDarkMode ? '#ffffff' : '#000000',
              rotate: config?.axis?.xAxis?.labelRotation || 0
            },
            axisLine: {
              lineStyle: {
                color: isDarkMode ? '#404040' : '#d9d9d9'
              }
            }
          },
          yAxis: {
            type: 'value',
            axisLabel: {
              color: isDarkMode ? '#ffffff' : '#000000'
            },
            axisLine: {
              lineStyle: {
                color: isDarkMode ? '#404040' : '#d9d9d9'
              }
            },
            splitLine: {
              show: config?.axis?.yAxis?.gridLines !== false,
              lineStyle: {
                color: isDarkMode ? '#404040' : '#d9d9d9',
                opacity: 0.3
              }
            }
          },
          series: [{
            name: config?.standard?.series?.name || 'Series 1',
            type: 'bar',
            data: data?.yAxis || [120, 200, 150, 80, 70, 110],
            itemStyle: {
              color: config?.basicStyling?.colors?.[0] || '#1890ff'
            },
            label: {
              show: config?.standard?.series?.showLabels !== false,
              position: config?.standard?.series?.labelPosition || 'top'
            }
          }]
        };

      case 'line':
        return {
          ...baseOptions,
          xAxis: {
            type: 'category',
            data: data?.xAxis || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            axisLabel: {
              color: isDarkMode ? '#ffffff' : '#000000'
            }
          },
          yAxis: {
            type: 'value',
            axisLabel: {
              color: isDarkMode ? '#ffffff' : '#000000'
            }
          },
          series: [{
            name: config?.standard?.series?.name || 'Series 1',
            type: 'line',
            data: data?.yAxis || [820, 932, 901, 934, 1290, 1330],
            smooth: config?.standard?.series?.smooth !== false,
            symbolSize: config?.standard?.series?.symbolSize || 6,
            lineStyle: {
              color: config?.basicStyling?.colors?.[0] || '#1890ff'
            },
            areaStyle: config?.standard?.series?.areaStyle ? {
              color: config?.basicStyling?.colors?.[0] || '#1890ff',
              opacity: 0.3
            } : undefined
          }]
        };

      case 'pie':
        return {
          ...baseOptions,
          series: [{
            name: config?.standard?.series?.name || 'Series 1',
            type: 'pie',
            radius: '50%',
            data: data?.series || [
              { value: 1048, name: 'Search Engine' },
              { value: 735, name: 'Direct' },
              { value: 580, name: 'Email' },
              { value: 484, name: 'Union Ads' }
            ],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            label: {
              show: config?.standard?.series?.showLabels !== false,
              color: isDarkMode ? '#ffffff' : '#000000'
            }
          }]
        };

      case 'area':
        return {
          ...baseOptions,
          xAxis: {
            type: 'category',
            data: data?.xAxis || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            axisLabel: {
              color: isDarkMode ? '#ffffff' : '#000000'
            }
          },
          yAxis: {
            type: 'value',
            axisLabel: {
              color: isDarkMode ? '#ffffff' : '#000000'
            }
          },
          series: [{
            name: config?.standard?.series?.name || 'Series 1',
            type: 'line',
            data: data?.yAxis || [820, 932, 901, 934, 1290, 1330],
            smooth: true,
            areaStyle: {
              color: config?.basicStyling?.colors?.[0] || '#1890ff',
              opacity: 0.6
            },
            lineStyle: {
              color: config?.basicStyling?.colors?.[0] || '#1890ff'
            }
          }]
        };

      default:
        return {
          ...baseOptions,
          graphic: {
            type: 'text',
            left: 'center',
            top: 'middle',
            style: {
              text: 'Chart Type Not Supported',
              fill: isDarkMode ? '#ffffff' : '#000000',
              fontSize: 16
            }
          }
        };
    }
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

  return (
    <Card
      title={
        showEditableTitle ? (
          <div style={{ 
            display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          fontSize: '14px'
        }}>
            <div style={{ fontSize: '16px' }}>
              {React.isValidElement(widget.icon) ? widget.icon : <div>📊</div>}
            </div>
            {isEditingTitle ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={editableTitle}
                  onChange={(e) => setEditableTitle(e.target.value)}
                  style={{
                    width: '150px',
                    padding: '2px 6px',
                    border: `1px solid ${isDarkMode ? '#404040' : '#d9d9d9'}`,
                    borderRadius: '4px',
                    background: isDarkMode ? '#1a1a1a' : '#ffffff',
                    color: isDarkMode ? '#ffffff' : '#000000',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    textAlign: 'center'
                  }}
                  placeholder="Chart Title"
                />
                <input
                  type="text"
                  value={editableSubtitle}
                  onChange={(e) => setEditableSubtitle(e.target.value)}
                  style={{
                    width: '150px',
                    padding: '2px 6px',
                    border: `1px solid ${isDarkMode ? '#404040' : '#d9d9d9'}`,
                    borderRadius: '4px',
                    background: isDarkMode ? '#1a1a1a' : '#ffffff',
                    color: isDarkMode ? '#999' : '#666',
                    fontSize: '10px',
                    textAlign: 'center'
                  }}
                  placeholder="Subtitle (optional)"
                />
                <Space size="small">
                  <Button
                    size="small"
                    type="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingTitle(false);
                      onTitleChange?.(editableTitle, editableSubtitle);
                      // Update chart config
                      if (onConfigUpdate) {
                        onConfigUpdate({
                          ...config,
                          basic: {
                            ...config?.basic,
                            title: editableTitle,
                            subtitle: editableSubtitle
                          }
                        });
                      }
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingTitle(false);
                      setEditableTitle(config?.basic?.title || widget?.name || 'Chart Title');
                      setEditableSubtitle(config?.basic?.subtitle || '');
                    }}
                  >
                    Cancel
                  </Button>
                </Space>
              </div>
            ) : (
              <div style={{ cursor: 'pointer' }} onClick={() => setIsEditingTitle(true)}>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: 'bold', 
                  color: isDarkMode ? '#ffffff' : '#000000'
                }}>
                  {editableTitle}
                </div>
                {editableSubtitle && (
                  <div style={{ 
                    fontSize: '10px', 
                    color: isDarkMode ? '#999' : '#666'
                  }}>
                    {editableSubtitle}
                  </div>
                )}
                <div style={{ 
                  fontSize: '8px', 
                  color: isDarkMode ? '#666' : '#999'
                }}>
                  Click to edit
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            fontSize: '14px'
          }}>
            <div style={{ fontSize: '16px' }}>
              {React.isValidElement(widget.icon) ? widget.icon : <div>📊</div>}
            </div>
            <span>{widget.name}</span>
          </div>
        )
      }
      size="small"
      style={{
        height: '100%',
        border: `2px solid ${isSelected ? '#1890ff' : isDarkMode ? '#303030' : '#d9d9d9'}`,
        background: isDarkMode ? '#1f1f1f' : '#ffffff',
        cursor: 'pointer'
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
        
        <div 
          ref={chartRef}
          style={{ 
            width: '100%', 
            height: '100%',
            minHeight: '200px'
          }}
        />
        

      </div>
    </Card>
  );
};

export default ChartWidget;
