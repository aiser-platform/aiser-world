import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, Typography, Button, Space, Tag, Alert, Spin, Timeline, List, Avatar } from 'antd';
import { 
  RiseOutlined, 
  UserOutlined, 
  DollarOutlined, 
  BarChartOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { unifiedAIService } from '@/services/unifiedAIService';
import AgenticAnalysisPanel from './AgenticAnalysisPanel';
import AiserAIIcon from '@/app/components/AiserAIIcon/AiserAIIcon';

const { Title, Text, Paragraph } = Typography;

interface BusinessMetrics {
  revenue_growth: number;
  user_engagement: number;
  conversion_rate: number;
  customer_satisfaction: number;
  operational_efficiency: number;
  market_position: number;
}

interface AIInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  timestamp: string;
  actionable: boolean;
}

interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to: string;
  due_date: string;
  impact_score: number;
}

const BusinessIntelligenceDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [showAgenticAnalysis, setShowAgenticAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load business metrics
      const metricsData = await loadBusinessMetrics();
      setMetrics(metricsData);
      
      // Load AI insights
      const insightsData = await loadAIInsights();
      setInsights(insightsData);
      
      // Load action items
      const actionItemsData = await loadActionItems();
      setActionItems(actionItemsData);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBusinessMetrics = async (): Promise<BusinessMetrics> => {
    // Simulated data - in production this would come from the API
    return {
      revenue_growth: 15.2,
      user_engagement: 78.5,
      conversion_rate: 3.2,
      customer_satisfaction: 4.6,
      operational_efficiency: 82.1,
      market_position: 67.8
    };
  };

  const loadAIInsights = async (): Promise<AIInsight[]> => {
    // Simulated data - in production this would come from the AI analysis
    return [
      {
        id: '1',
        type: 'trend',
        title: 'Revenue Growth Acceleration',
        description: 'Q4 revenue growth is 23% higher than Q3, indicating successful marketing campaigns and product improvements.',
        impact: 'high',
        confidence: 0.89,
        timestamp: '2024-01-15T10:30:00Z',
        actionable: true
      },
      {
        id: '2',
        type: 'opportunity',
        title: 'Customer Segment Expansion',
        description: 'Analysis shows untapped potential in the 25-34 age demographic with 40% higher conversion rates.',
        impact: 'medium',
        confidence: 0.76,
        timestamp: '2024-01-15T09:15:00Z',
        actionable: true
      },
      {
        id: '3',
        type: 'anomaly',
        title: 'Unusual Drop in User Engagement',
        description: 'User engagement dropped 12% in the last week, requiring immediate investigation.',
        impact: 'high',
        confidence: 0.82,
        timestamp: '2024-01-15T08:45:00Z',
        actionable: true
      },
      {
        id: '4',
        type: 'risk',
        title: 'Competitive Pressure Increase',
        description: 'Market analysis indicates new competitors entering the space with aggressive pricing strategies.',
        impact: 'medium',
        confidence: 0.71,
        timestamp: '2024-01-15T07:30:00Z',
        actionable: true
      }
    ];
  };

  const loadActionItems = async (): Promise<ActionItem[]> => {
    // Simulated data - in production this would come from the AI action planning
    return [
      {
        id: '1',
        title: 'Investigate User Engagement Drop',
        description: 'Analyze recent changes and user behavior patterns to identify root cause of engagement decline.',
        priority: 'high',
        status: 'in_progress',
        assigned_to: 'Data Analytics Team',
        due_date: '2024-01-20',
        impact_score: 85
      },
      {
        id: '2',
        title: 'Develop 25-34 Demographic Campaign',
        description: 'Create targeted marketing campaign for the identified high-conversion demographic segment.',
        priority: 'medium',
        status: 'pending',
        assigned_to: 'Marketing Team',
        due_date: '2024-01-25',
        impact_score: 72
      },
      {
        id: '3',
        title: 'Competitive Analysis Update',
        description: 'Conduct comprehensive competitive analysis and update pricing strategy accordingly.',
        priority: 'medium',
        status: 'pending',
        assigned_to: 'Strategy Team',
        due_date: '2024-01-30',
        impact_score: 68
      }
    ];
  };

  const getMetricColor = (value: number, threshold: number = 0) => {
    if (value >= threshold + 20) return '#52c41a';
    if (value >= threshold + 10) return '#faad14';
    if (value >= threshold) return '#1890ff';
    return '#ff4d4f';
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend': return <RiseOutlined className="text-green-500" />;
      case 'opportunity': return <BulbOutlined className="text-blue-500" />;
      case 'anomaly': return <ExclamationCircleOutlined className="text-orange-500" />;
      case 'risk': return <ExclamationCircleOutlined className="text-red-500" />;
      default: return <BulbOutlined className="text-gray-500" />;
    }
  };

  const getInsightColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'blue';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'blue';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'in_progress': return 'blue';
      case 'pending': return 'orange';
      default: return 'gray';
    }
  };

  if (showAgenticAnalysis) {
    return (
      <div>
        <Button 
          onClick={() => setShowAgenticAnalysis(false)}
          className="mb-4"
          icon={<BarChartOutlined />}
        >
          Back to Dashboard
        </Button>
        <AgenticAnalysisPanel />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Spin size="large" />
        <div className="mt-4">
          <Title level={4}>Loading Business Intelligence Dashboard</Title>
          <Text className="text-gray-500">Gathering insights and metrics...</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Dashboard Error"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={loadDashboardData}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-0">
        <div className="flex items-center justify-between">
          <div>
            <Title level={2} className="text-blue-800 mb-2">
              Business Intelligence Dashboard
            </Title>
            <Text className="text-lg text-blue-700">
              AI-powered insights for data-driven decision making
            </Text>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<AiserAIIcon size={20} />}
            onClick={() => setShowAgenticAnalysis(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Launch Agentic Analysis
          </Button>
        </div>
      </Card>

      {/* Key Metrics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Revenue Growth"
              value={metrics?.revenue_growth}
              suffix="%"
              valueStyle={{ color: getMetricColor(metrics?.revenue_growth || 0, 10) }}
              prefix={<DollarOutlined />}
            />
            <Progress 
              percent={Math.min(100, (metrics?.revenue_growth || 0) * 2)} 
              strokeColor={getMetricColor(metrics?.revenue_growth || 0, 10)}
              showInfo={false}
              className="mt-2"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="User Engagement"
              value={metrics?.user_engagement}
              suffix="%"
              valueStyle={{ color: getMetricColor(metrics?.user_engagement || 0, 70) }}
              prefix={<UserOutlined />}
            />
            <Progress 
              percent={metrics?.user_engagement || 0} 
              strokeColor={getMetricColor(metrics?.user_engagement || 0, 70)}
              showInfo={false}
              className="mt-2"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Conversion Rate"
              value={metrics?.conversion_rate}
              suffix="%"
              valueStyle={{ color: getMetricColor(metrics?.conversion_rate || 0, 2) }}
              prefix={<RiseOutlined />}
            />
            <Progress 
              percent={Math.min(100, (metrics?.conversion_rate || 0) * 20)} 
              strokeColor={getMetricColor(metrics?.conversion_rate || 0, 2)}
              showInfo={false}
              className="mt-2"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Customer Satisfaction"
              value={metrics?.customer_satisfaction}
              suffix="/5"
              valueStyle={{ color: getMetricColor(metrics?.customer_satisfaction || 0, 4) }}
              prefix={<UserOutlined />}
            />
            <Progress 
              percent={Math.min(100, (metrics?.customer_satisfaction || 0) * 20)} 
              strokeColor={getMetricColor(metrics?.customer_satisfaction || 0, 4)}
              showInfo={false}
              className="mt-2"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Operational Efficiency"
              value={metrics?.operational_efficiency}
              suffix="%"
              valueStyle={{ color: getMetricColor(metrics?.operational_efficiency || 0, 80) }}
              prefix={<BarChartOutlined />}
            />
            <Progress 
              percent={metrics?.operational_efficiency || 0} 
              strokeColor={getMetricColor(metrics?.operational_efficiency || 0, 80)}
              showInfo={false}
              className="mt-2"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Market Position"
              value={metrics?.market_position}
              suffix="%"
              valueStyle={{ color: getMetricColor(metrics?.market_position || 0, 60) }}
              prefix={<RiseOutlined />}
            />
            <Progress 
              percent={metrics?.market_position || 0} 
              strokeColor={getMetricColor(metrics?.market_position || 0, 60)}
              showInfo={false}
              className="mt-2"
            />
          </Card>
        </Col>
      </Row>

      {/* AI Insights and Action Items */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <BulbOutlined className="text-blue-500" />
                <span>AI-Generated Insights</span>
                <Tag color="blue">{insights.length} insights</Tag>
              </Space>
            }
            className="h-full"
          >
            <List
              dataSource={insights}
              renderItem={(insight) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={getInsightIcon(insight.type)} />}
                    title={
                      <div className="flex items-center justify-between">
                        <span>{insight.title}</span>
                        <Tag color={getInsightColor(insight.impact)}>
                          {insight.impact?.toUpperCase() || 'UNKNOWN'}
                        </Tag>
                      </div>
                    }
                    description={
                      <div className="space-y-2">
                        <Text>{insight.description}</Text>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>Confidence: {(insight.confidence * 100).toFixed(0)}%</span>
                          <span>{new Date(insight.timestamp).toLocaleDateString()}</span>
                        </div>
                        {insight.actionable && (
                          <Tag color="green" icon={<CheckCircleOutlined />}>
                            Actionable
                          </Tag>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <CheckCircleOutlined className="text-green-500" />
                <span>Action Items</span>
                <Tag color="green">{actionItems.length} items</Tag>
              </Space>
            }
            className="h-full"
          >
            <List
              dataSource={actionItems}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        style={{ backgroundColor: getPriorityColor(item.priority) }}
                        icon={<ClockCircleOutlined />}
                      />
                    }
                    title={
                      <div className="flex items-center justify-between">
                        <span>{item.title}</span>
                        <Tag color={getPriorityColor(item.priority)}>
                          {item.priority?.toUpperCase() || 'UNKNOWN'}
                        </Tag>
                      </div>
                    }
                    description={
                      <div className="space-y-2">
                        <Text>{item.description}</Text>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>Assigned: {item.assigned_to}</span>
                          <span>Due: {item.due_date}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <Tag color={getStatusColor(item.status)}>
                            {item.status?.replace('_', ' ')?.toUpperCase() || 'UNKNOWN'}
                          </Tag>
                          <span className="text-sm">
                            Impact Score: <strong>{item.impact_score}</strong>
                          </span>
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Card title="Quick Actions" className="bg-gray-50">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Button 
              type="primary" 
              block 
              icon={<BulbOutlined />}
              onClick={() => setShowAgenticAnalysis(true)}
              className="h-20 text-lg"
            >
              Launch AI Analysis
            </Button>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Button 
              type="default" 
              block 
              icon={<BarChartOutlined />}
              className="h-20 text-lg"
            >
              Generate Report
            </Button>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Button 
              type="default" 
              block 
              icon={<RiseOutlined />}
              className="h-20 text-lg"
            >
              View Trends
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Footer */}
      <Card className="text-center bg-gray-50">
        <Text className="text-gray-500">
          Last updated: {new Date().toLocaleString()} | 
          Powered by AI-Native Business Intelligence Platform
        </Text>
      </Card>
    </div>
  );
};

export default BusinessIntelligenceDashboard;
