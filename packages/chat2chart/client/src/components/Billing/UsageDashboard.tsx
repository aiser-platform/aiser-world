import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  CreditCard, 
  TrendingUp, 
  Activity, 
  DollarSign,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

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
      const response = await fetch(`/api/v1/billing/usage/stats/${organizationId}`, {
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
    if (percentage >= 90) return 'destructive';
    if (percentage >= 75) return 'warning';
    return 'default';
  };

  const getUsageStatusIcon = (percentage: number) => {
    if (percentage >= 90) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
            <Button onClick={fetchUsageStats} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usageStats) return null;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Credits Used</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageStats.limits.ai_credits_used.toLocaleString()}
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <Progress 
                value={usageStats.limits.usage_percentage} 
                className="flex-1"
              />
              <Badge variant={getUsageStatusColor(usageStats.limits.usage_percentage)}>
                {Math.round(usageStats.limits.usage_percentage)}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {usageStats.limits.ai_credits_remaining.toLocaleString()} remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${usageStats.totals.cost_dollars.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              This billing period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Requests</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageStats.totals.total_requests.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total requests made
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            {getUsageStatusIcon(usageStats.limits.usage_percentage)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageStats.limits.usage_percentage >= 90 ? 'Warning' : 'Good'}
            </div>
            <p className="text-xs text-muted-foreground">
              Usage status
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Usage Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Usage Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={usageStats.daily_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: number, name: string) => [
                    name === 'tokens' ? value.toLocaleString() : `$${(value / 100).toFixed(2)}`,
                    name === 'tokens' ? 'Tokens' : 'Cost'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="tokens" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Usage by Model */}
        <Card>
          <CardHeader>
            <CardTitle>Usage by AI Model</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={usageStats.breakdown.by_model}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ model, percent }) => `${model} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="tokens"
                >
                  {usageStats.breakdown.by_model.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [value.toLocaleString(), 'Tokens']}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Usage by Request Type */}
        <Card>
          <CardHeader>
            <CardTitle>Usage by Request Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={usageStats.breakdown.by_type}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [value.toLocaleString(), 'Tokens']}
                />
                <Bar dataKey="tokens" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {usageStats.breakdown.by_model.map((model, index) => (
                <div key={model.model} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm font-medium">{model.model}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      ${(model.cost_cents / 100).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {model.tokens.toLocaleString()} tokens
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};