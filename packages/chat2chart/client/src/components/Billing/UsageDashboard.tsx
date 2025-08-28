import React, { useState, useEffect } from 'react';
import { Card, Progress, Tag, Button, Row, Col, Statistic, Alert, Spin, Typography } from 'antd';
import { 
  CreditCardOutlined, 
  RiseOutlined, 
  PlayCircleOutlined, 
  DollarOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  DatabaseOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { getBackendUrlForApi } from '@/utils/backendUrl';

interface UsageStats {
  totals: {
    tokens_used: number;
    cost_dollars: number;
    total_requests: number;
  };
  limits: {
    ai_credits_limit: number;
    ai_credits_used: number;
    ai_credits_remaining: number;
    usage_percentage: number;
  };
  breakdown: {
    by_model: Array<{
      model: string;
      tokens: number;
      cost_cents: number;
      requests: number;
    }>;
    by_type: Array<{
      type: string;
      tokens: number;
      cost_cents: number;
      requests: number;
    }>;
  };
  daily_trend: Array<{
    date: string;
    tokens: number;
    cost_cents: number;
    requests: number;
  }>;
}

interface UsageDashboardProps {
  organizationId: number;
}

export const UsageDashboard: React.FC<UsageDashboardProps> = ({ organizationId }) => {
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsageStats();
  }, [organizationId]);

  const fetchUsageStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getBackendUrlForApi()}/api/organizations/${organizationId}/usage`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch usage statistics');
      }
      
      const data = await response.json();
      setUsageStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getUsageStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 75) return 'warning';
    return 'success';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={error}
        type="error"
        showIcon
      />
    );
  }

  if (!usageStats) {
    return (
      <Alert
        message="No Data"
        description="No usage statistics available"
        type="info"
        showIcon
      />
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <h2>Usage Dashboard</h2>
      
      {/* Summary Statistics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Tokens Used"
              value={usageStats.totals.tokens_used}
              prefix={<PlayCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Cost"
              value={usageStats.totals.cost_dollars}
              prefix={<DollarOutlined />}
              precision={2}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Requests"
              value={usageStats.totals.total_requests}
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="AI Credits Used"
              value={usageStats.limits.ai_credits_used}
              prefix={<CreditCardOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Usage Progress */}
      <Card title="AI Credits Usage" style={{ marginBottom: '24px' }}>
        <Progress
          percent={usageStats.limits.usage_percentage}
          status={getUsageStatusColor(usageStats.limits.usage_percentage) as any}
          format={(percent) => `${percent}%`}
        />
        <div style={{ marginTop: '16px' }}>
          <Tag color="blue">{usageStats.limits.ai_credits_used} used</Tag>
          <Tag color="green">{usageStats.limits.ai_credits_remaining} remaining</Tag>
          <Tag color="orange">Limit: {usageStats.limits.ai_credits_limit}</Tag>
        </div>
      </Card>

      {/* Model Breakdown */}
      <Card title="Usage by Model" style={{ marginBottom: '24px' }}>
        {usageStats.breakdown.by_model.map((item, index) => (
          <div key={index} style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{item.model}</span>
              <div>
                <Tag color="blue">{item.requests} requests</Tag>
                <Tag color="green">{item.tokens.toLocaleString()} tokens</Tag>
                <Tag color="orange">${(item.cost_cents / 100).toFixed(2)}</Tag>
              </div>
            </div>
          </div>
        ))}
      </Card>

      {/* Type Breakdown */}
      <Card title="Usage by Type">
        {usageStats.breakdown.by_type.map((item, index) => (
          <div key={index} style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{item.type}</span>
              <div>
                <Tag color="blue">{item.requests} requests</Tag>
                <Tag color="green">{item.tokens.toLocaleString()} tokens</Tag>
                <Tag color="orange">${(item.cost_cents / 100).toFixed(2)}</Tag>
              </div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
};