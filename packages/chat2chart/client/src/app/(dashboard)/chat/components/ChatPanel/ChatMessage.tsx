import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Space, Tag, Tooltip, message as antMessage, Popconfirm } from 'antd';
import { 
  SaveOutlined, 
  EditOutlined, 
  HeartOutlined, 
  HeartFilled,
  CommentOutlined,
  ShareAltOutlined,
  EyeOutlined
} from '@ant-design/icons';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import * as echarts from 'echarts';

// Custom ECharts component to avoid SSR issues
const ReactECharts = React.forwardRef<HTMLDivElement, { 
  option: any; 
  style?: React.CSSProperties; 
  opts?: any;
  onChartReady?: (chart: any) => void;
}>(
  ({ option, style = {}, opts = {}, onChartReady }, ref) => {
    const chartRef = React.useRef<HTMLDivElement>(null);
    const chartInstance = React.useRef<any>(null);

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

interface ChartConfig {
  type: string;
  title?: string;
  xAxis?: any;
  yAxis?: any;
  series?: any[];
  tooltip?: any;
  data?: any[];
  [key: string]: any;
}

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    chartConfig?: ChartConfig;
    dataSourceId?: string;
    query?: string;
    analysis?: any;
  };
  onSave?: (messageId: string, chartData: any) => void;
  onFavorite?: (messageId: string) => void;
  onComment?: (messageId: string, comment: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  onSave, 
  onFavorite, 
  onComment 
}) => {
  const [isFavorited, setIsFavorited] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const [chartInstance, setChartInstance] = useState<any>(null);
  const router = useRouter();

  // Chart options for ECharts
  const getChartOptions = (config: ChartConfig) => {
    const baseOptions = {
      title: {
        text: config.title || 'Chart',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: config.type === 'pie' ? 'item' : 'axis',
        ...config.tooltip
      },
      legend: {
        bottom: 10,
        left: 'center'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      }
    };

    switch (config.type) {
      case 'bar':
        return {
          ...baseOptions,
          xAxis: config.xAxis || { type: 'category', data: [] },
          yAxis: config.yAxis || { type: 'value' },
          series: config.series || [{
            type: 'bar',
            data: config.data || [],
            itemStyle: { color: '#1890ff' }
          }]
        };
      
      case 'line':
        return {
          ...baseOptions,
          xAxis: config.xAxis || { type: 'category', data: [] },
          yAxis: config.yAxis || { type: 'value' },
          series: config.series || [{
            type: 'line',
            data: config.data || [],
            smooth: true,
            itemStyle: { color: '#52c41a' }
          }]
        };
      
      case 'pie':
        return {
          ...baseOptions,
          series: [{
            type: 'pie',
            radius: config.radius || '50%',
            data: config.data || [],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }]
        };
      
      case 'scatter':
        return {
          ...baseOptions,
          xAxis: config.xAxis || { type: 'value' },
          yAxis: config.yAxis || { type: 'value' },
          series: [{
            type: 'scatter',
            data: config.data || [],
            symbolSize: 8,
            itemStyle: { color: '#fa8c16' }
          }]
        };
      
      default:
        return baseOptions;
    }
  };

  // Handle chart save
  const handleSaveChart = () => {
    if (!message.chartConfig) return;
    
    const chartData = {
      id: `chart_${Date.now()}`,
      title: message.chartConfig.title || 'Generated Chart',
      type: message.chartConfig.type,
      config: message.chartConfig,
      dataSourceId: message.dataSourceId,
      query: message.query,
      analysis: message.analysis,
      timestamp: new Date().toISOString(),
      createdFrom: 'ai_generated'
    };

    onSave?.(message.id, chartData);
    antMessage.success('Chart saved successfully!');
  };

  // Handle chart edit in chart builder
  const handleEditChart = () => {
    if (!message.chartConfig) return;
    
    const chartData = {
      id: `chart_${Date.now()}`,
      title: message.chartConfig.title || 'Generated Chart',
      type: message.chartConfig.type,
      config: message.chartConfig,
      dataSourceId: message.dataSourceId,
      query: message.query,
      analysis: message.analysis,
      timestamp: new Date().toISOString(),
      createdFrom: 'ai_generated'
    };

    // Navigate to chart builder with chart data
    const queryParams = new URLSearchParams({
      chartData: JSON.stringify(chartData),
      mode: 'edit',
      source: 'chat'
    });
    
    router.push(`/chart-builder?${queryParams.toString()}`);
  };

  // Handle favorite toggle
  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
    onFavorite?.(message.id);
    antMessage.success(isFavorited ? 'Removed from favorites' : 'Added to favorites');
  };

  // Handle comment submission
  const handleCommentSubmit = () => {
    if (!comment.trim()) return;
    
    onComment?.(message.id, comment);
    setComment('');
    antMessage.success('Comment added successfully!');
  };

  return (
    <Card 
      className={`chat-message ${message.role === 'assistant' ? 'assistant' : 'user'}`}
      style={{ 
        marginBottom: 16,
        backgroundColor: message.role === 'assistant' ? '#f8f9fa' : '#ffffff',
        border: message.role === 'assistant' ? '1px solid #e8e8e8' : '1px solid #d9d9d9'
      }}
    >
      <div className="message-header">
        <Space>
          <Tag color={message.role === 'assistant' ? 'blue' : 'green'}>
            {message.role === 'assistant' ? 'AI Assistant' : 'You'}
          </Tag>
          <span className="timestamp">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </Space>
      </div>

      <div className="message-content">
        <div className="text-content">
          {message.content}
        </div>

        {/* Chart Rendering */}
        {message.chartConfig && (
          <div className="chart-container" style={{ marginTop: 16 }}>
            <div className="chart-header">
              <h4>{message.chartConfig?.title || 'Generated Chart'}</h4>
              <Space>
                <Tooltip title="Save Chart">
                  <Button 
                    type="text" 
                    icon={<SaveOutlined />} 
                    onClick={handleSaveChart}
                  />
                </Tooltip>
                <Tooltip title="Edit in Chart Builder">
                  <Button 
                    type="text" 
                    icon={<EditOutlined />} 
                    onClick={handleEditChart}
                  />
                </Tooltip>
                <Tooltip title="View Full Screen">
                  <Button 
                    type="text" 
                    icon={<EyeOutlined />} 
                    onClick={() => {
                      // Open chart in full screen modal
                      const chartData = {
                        config: message.chartConfig,
                        title: message.chartConfig?.title
                      };
                      // You can implement a modal here
                      console.log('Full screen chart:', chartData);
                    }}
                  />
                </Tooltip>
              </Space>
            </div>
            
            <div className="chart-renderer" style={{ height: 400, width: '100%' }}>
              <ReactECharts
                option={getChartOptions(message.chartConfig)}
                style={{ height: '100%', width: '100%' }}
                onChartReady={(chart) => setChartInstance(chart)}
              />
            </div>

            <div className="chart-actions" style={{ marginTop: 8 }}>
              <Space>
                <Button 
                  type={isFavorited ? 'primary' : 'default'}
                  icon={isFavorited ? <HeartFilled /> : <HeartOutlined />}
                  onClick={handleFavorite}
                >
                  {isFavorited ? 'Favorited' : 'Favorite'}
                </Button>
                <Button 
                  icon={<CommentOutlined />}
                  onClick={() => setShowComments(!showComments)}
                >
                  Comment
                </Button>
                <Button icon={<ShareAltOutlined />}>
                  Share
                </Button>
              </Space>
            </div>

            {/* Comments Section */}
            {showComments && (
              <div className="comments-section" style={{ marginTop: 16 }}>
                <div className="comment-input">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit()}
                    style={{ 
                      width: '100%', 
                      padding: '8px 12px', 
                      border: '1px solid #d9d9d9',
                      borderRadius: '6px'
                    }}
                  />
                  <Button 
                    type="primary" 
                    size="small" 
                    onClick={handleCommentSubmit}
                    style={{ marginTop: 8 }}
                  >
                    Add Comment
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default ChatMessage;
