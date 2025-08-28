import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Select, Space, Divider, Typography, Alert, Spin, Tag, Progress, Collapse } from 'antd';
import { RobotOutlined, BulbOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { unifiedAIService } from '@/services/unifiedAIService';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

interface AgenticAnalysisRequest {
  query: string;
  data_source_id: string;
  analysis_depth: 'basic' | 'intermediate' | 'advanced' | 'expert';
  include_recommendations: boolean;
  include_action_items: boolean;
  business_context?: string;
}

interface AgenticAnalysisResult {
  success: boolean;
  analysis_id: string;
  execution_time: number;
  query: string;
  business_context: any;
  reasoning_process: any;
  insights: any;
  recommendations: any[];
  action_plan: any;
  confidence_metrics: any;
  executive_summary: string;
  timestamp: string;
}

const AgenticAnalysisPanel: React.FC = () => {
  const [request, setRequest] = useState<AgenticAnalysisRequest>({
    query: '',
    data_source_id: 'default',
    analysis_depth: 'advanced',
    include_recommendations: true,
    include_action_items: true,
    business_context: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AgenticAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataSources] = useState([
    { id: 'default', name: 'Default Data Source' },
    { id: 'sales', name: 'Sales Data' },
    { id: 'users', name: 'User Analytics' },
    { id: 'finance', name: 'Financial Data' }
  ]);

  const analysisDepthOptions = [
    { value: 'basic', label: 'Basic', description: 'Simple analysis with basic insights' },
    { value: 'intermediate', label: 'Intermediate', description: 'Moderate analysis with trend identification' },
    { value: 'advanced', label: 'Advanced', description: 'Comprehensive analysis with predictive insights' },
    { value: 'expert', label: 'Expert', description: 'Deep analysis with autonomous reasoning and action planning' }
  ];

  const handleAnalysis = async () => {
    if (!request.query.trim()) {
      setError('Please enter a query for analysis');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await unifiedAIService.executeAgenticAnalysis(request);
      
      if (response.success) {
        setResult(response);
      } else {
        setError(response.error || 'Analysis failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.9) return 'Very High';
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.7) return 'Medium';
    if (confidence >= 0.6) return 'Low';
    return 'Very Low';
  };

  const renderReasoningSteps = (reasoningProcess: any) => {
    if (!reasoningProcess?.reasoning_steps) return null;

    return (
      <div className="space-y-4">
        <Title level={4}>🧠 Reasoning Process</Title>
        {reasoningProcess.reasoning_steps.map((step: any, index: number) => (
          <Card key={step.step_id} size="small" className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <Tag color="blue">{step.reasoning_type}</Tag>
              <Tag color={getConfidenceColor(step.confidence)}>
                Confidence: {(step.confidence * 100).toFixed(0)}%
              </Tag>
            </div>
            <Paragraph className="mb-2">
              <strong>Process:</strong> {step.reasoning_process}
            </Paragraph>
            <Paragraph className="mb-2">
              <strong>Conclusion:</strong> {step.conclusion}
            </Paragraph>
            {step.evidence && step.evidence.length > 0 && (
              <div>
                <Text strong>Evidence:</Text>
                <ul className="ml-4 mt-1">
                  {step.evidence.map((evidence: string, idx: number) => (
                    <li key={idx}>{evidence}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  };

  const renderInsights = (insights: any) => {
    if (!insights) return null;

    return (
      <div className="space-y-4">
        <Title level={4}>💡 Business Insights</Title>
        
        {insights.key_findings && insights.key_findings.length > 0 && (
          <Card size="small" title="Key Findings" className="mb-3">
            <ul className="space-y-2">
              {insights.key_findings.map((finding: string, index: number) => (
                <li key={index} className="flex items-start">
                  <CheckCircleOutlined className="text-green-500 mr-2 mt-1" />
                  {finding}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {insights.business_impact && (
          <Card size="small" title="Business Impact" className="mb-3">
            <div className="space-y-2">
              <div>
                <Text strong>Impact Level:</Text>
                <Tag color={insights.business_impact.impact_level === 'high' ? 'red' : 'orange'} className="ml-2">
                  {insights.business_impact.impact_level?.toUpperCase() || 'UNKNOWN'}
                </Tag>
              </div>
              <div>
                <Text strong>Description:</Text>
                <Paragraph className="mt-1">{insights.business_impact.impact_description}</Paragraph>
              </div>
              {insights.business_impact.estimated_value && (
                <div>
                  <Text strong>Estimated Value:</Text>
                  <Text className="ml-2 text-green-600">{insights.business_impact.estimated_value}</Text>
                </div>
              )}
            </div>
          </Card>
        )}

        {insights.insight_categories && (
          <Card size="small" title="Insight Categories" className="mb-3">
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(insights.insight_categories).map(([category, categoryInsights]: [string, any]) => (
                <div key={category}>
                  <Text strong className="capitalize">{category.replace('_', ' ')}:</Text>
                  <ul className="ml-4 mt-1">
                    {Array.isArray(categoryInsights) && categoryInsights.map((insight: string, idx: number) => (
                      <li key={idx} className="text-sm">{insight}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  };

  const renderRecommendations = (recommendations: any[]) => {
    if (!recommendations || recommendations.length === 0) return null;

    return (
      <div className="space-y-4">
        <Title level={4}>🎯 Recommendations</Title>
        <div className="space-y-3">
          {recommendations.map((rec, index) => (
            <Card key={index} size="small" className="border-l-4 border-blue-500">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Title level={5} className="mb-2">{rec.title}</Title>
                  <Paragraph className="mb-2">{rec.description}</Paragraph>
                  <div className="flex items-center space-x-4 text-sm">
                    <Tag color={rec.priority === 'high' ? 'red' : rec.priority === 'medium' ? 'orange' : 'green'}>
                      {rec.priority?.toUpperCase() || 'UNKNOWN'}
                    </Tag>
                    <Tag color="blue">{rec.effort}</Tag>
                    <div className="flex items-center">
                      <ClockCircleOutlined className="mr-1" />
                      {rec.timeline}
                    </div>
                  </div>
                </div>
                {rec.priority_score && (
                  <div className="text-right">
                    <Text strong>Priority Score</Text>
                    <div className="text-2xl font-bold text-blue-600">{rec.priority_score}</div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderActionPlan = (actionPlan: any) => {
    if (!actionPlan) return null;

    return (
      <div className="space-y-4">
        <Title level={4}>🚀 Action Plan</Title>
        <Card size="small" className="border-l-4 border-green-500">
          <div className="space-y-3">
            <div>
              <Text strong>Objective:</Text>
              <Paragraph className="mt-1">{actionPlan.objective}</Paragraph>
            </div>
            
            <div>
              <Text strong>Priority:</Text>
              <Tag color={actionPlan.priority === 'high' ? 'red' : 'orange'} className="ml-2">
                {actionPlan.priority?.toUpperCase() || 'UNKNOWN'}
              </Tag>
            </div>

            <div>
              <Text strong>Timeline:</Text>
              <Text className="ml-2">{actionPlan.timeline}</Text>
            </div>

            <div>
              <Text strong>Estimated Impact:</Text>
              <Text className="ml-2">{actionPlan.estimated_impact}</Text>
            </div>

            {actionPlan.required_resources && actionPlan.required_resources.length > 0 && (
              <div>
                <Text strong>Required Resources:</Text>
                <div className="mt-1">
                  {actionPlan.required_resources.map((resource: string, idx: number) => (
                    <Tag key={idx} color="blue" className="mr-1 mb-1">{resource}</Tag>
                  ))}
                </div>
              </div>
            )}

            {actionPlan.success_criteria && actionPlan.success_criteria.length > 0 && (
              <div>
                <Text strong>Success Criteria:</Text>
                <ul className="ml-4 mt-1">
                  {actionPlan.success_criteria.map((criterion: string, idx: number) => (
                    <li key={idx} className="text-sm">{criterion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  const renderConfidenceMetrics = (confidenceMetrics: any) => {
    if (!confidenceMetrics) return null;

    return (
      <div className="space-y-4">
        <Title level={4}>📊 Confidence & Reliability</Title>
        <div className="grid grid-cols-2 gap-4">
          <Card size="small" title="Overall Confidence">
            <div className="text-center">
              <Progress
                type="circle"
                percent={Math.round(confidenceMetrics.overall_confidence * 100)}
                strokeColor={getConfidenceColor(confidenceMetrics.overall_confidence)}
                format={(percent) => `${percent}%`}
              />
              <Text className="block mt-2">
                {getConfidenceText(confidenceMetrics.overall_confidence)}
              </Text>
            </div>
          </Card>

          <Card size="small" title="Reliability Score">
            <div className="text-center">
              <Progress
                type="circle"
                percent={Math.round(confidenceMetrics.reliability_score * 100)}
                strokeColor={getConfidenceColor(confidenceMetrics.reliability_score)}
                format={(percent) => `${percent}%`}
              />
            </div>
          </Card>
        </div>

        {confidenceMetrics.uncertainty_factors && confidenceMetrics.uncertainty_factors.length > 0 && (
          <Card size="small" title="Uncertainty Factors" className="mt-3">
            <ul className="space-y-1">
              {confidenceMetrics.uncertainty_factors.map((factor: string, idx: number) => (
                <li key={idx} className="flex items-start">
                  <span className="text-yellow-500 mr-2">⚠️</span>
                  {factor}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-0">
        <div className="text-center">
          <RobotOutlined className="text-4xl text-blue-600 mb-4" />
          <Title level={2} className="text-blue-800 mb-2">
            Agentic AI Analysis
          </Title>
          <Text className="text-lg text-blue-700">
            Advanced autonomous reasoning for comprehensive business intelligence
          </Text>
        </div>
      </Card>

      <Card title="🔍 Analysis Configuration" className="shadow-sm">
        <div className="space-y-4">
          <div>
            <Text strong>Natural Language Query</Text>
            <TextArea
              rows={4}
              placeholder="Describe your business question or analysis request..."
              value={request.query}
              onChange={(e) => setRequest({ ...request, query: e.target.value })}
              className="mt-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Text strong>Data Source</Text>
              <Select
                value={request.data_source_id}
                onChange={(value) => setRequest({ ...request, data_source_id: value })}
                className="w-full mt-2"
              >
                {dataSources.map(source => (
                  <Option key={source.id} value={source.id}>{source.name}</Option>
                ))}
              </Select>
            </div>

            <div>
              <Text strong>Analysis Depth</Text>
              <Select
                value={request.analysis_depth}
                onChange={(value) => setRequest({ ...request, analysis_depth: value })}
                className="w-full mt-2"
              >
                {analysisDepthOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.description}</div>
                    </div>
                  </Option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Text strong>Business Context (Optional)</Text>
              <Input
                placeholder="e.g., ecommerce, saas, finance..."
                value={request.business_context}
                onChange={(e) => setRequest({ ...request, business_context: e.target.value })}
                className="mt-2"
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={request.include_recommendations}
                  onChange={(e) => setRequest({ ...request, include_recommendations: e.target.checked })}
                  className="mr-2"
                />
                <Text>Include Recommendations</Text>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={request.include_action_items}
                  onChange={(e) => setRequest({ ...request, include_action_items: e.target.checked })}
                  className="mr-2"
                />
                <Text>Include Action Items</Text>
              </label>
            </div>
          </div>

          <Button
            type="primary"
            size="large"
            icon={<BulbOutlined />}
            onClick={handleAnalysis}
            loading={isLoading}
            disabled={!request.query.trim()}
            className="w-full"
          >
            {isLoading ? 'Executing Analysis...' : 'Execute Agentic Analysis'}
          </Button>
        </div>
      </Card>

      {error && (
        <Alert
          message="Analysis Error"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
        />
      )}

      {isLoading && (
        <Card className="text-center py-12">
          <Spin size="large" />
          <div className="mt-4">
            <Title level={4}>Executing Agentic Analysis</Title>
            <Text className="text-gray-500">
              AI is performing multi-step reasoning and generating comprehensive insights...
            </Text>
          </div>
        </Card>
      )}

      {result && (
        <div className="space-y-6">
          <Card title="📋 Executive Summary" className="bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="whitespace-pre-line font-medium text-gray-800">
              {result.executive_summary}
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>Analysis ID: {result.analysis_id}</span>
              <span>Execution Time: {result.execution_time.toFixed(2)}s</span>
            </div>
          </Card>

          <Collapse defaultActiveKey={['reasoning', 'insights']} ghost>
            <Panel header="🧠 Reasoning Process" key="reasoning">
              {renderReasoningSteps(result.reasoning_process)}
            </Panel>

            <Panel header="💡 Business Insights" key="insights">
              {renderInsights(result.insights)}
            </Panel>

            <Panel header="🎯 Recommendations" key="recommendations">
              {renderRecommendations(result.recommendations)}
            </Panel>

            <Panel header="🚀 Action Plan" key="actionPlan">
              {renderActionPlan(result.action_plan)}
            </Panel>

            <Panel header="📊 Confidence Metrics" key="confidence">
              {renderConfidenceMetrics(result.confidence_metrics)}
            </Panel>
          </Collapse>
        </div>
      )}
    </div>
  );
};

export default AgenticAnalysisPanel;
