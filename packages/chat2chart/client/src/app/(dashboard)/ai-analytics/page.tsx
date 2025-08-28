'use client';

import React, { useState, useEffect } from 'react';
import {
    Card,
    Button,
    Row,
    Col,
    Typography,
    Space,
    Tag,
    Statistic,
    Progress,
    Alert,
    Divider,
    List,
    Tooltip,
    Modal,
    message,
    Input
} from 'antd';
import {
    BulbOutlined,
    BarChartOutlined,
    DatabaseOutlined,
    RocketOutlined,
    CheckCircleOutlined,
    SyncOutlined,
    ExperimentOutlined,
    ThunderboltOutlined,
    CrownOutlined,
    ApiOutlined
} from '@ant-design/icons';
import { apiService } from '@/services/apiService';
import { unifiedAIService } from '@/services/unifiedAIService';

const { Title, Text, Paragraph } = Typography;

interface AIAnalyticsStats {
    total_requests: number;
    successful_requests: number;
    ai_enhanced_requests: number;
    average_response_time: number;
    success_rate: number;
    ai_enhancement_rate: number;
}

interface AICapability {
    name: string;
    description: string;
    status: 'active' | 'beta' | 'coming_soon';
    icon: React.ReactNode;
    endpoint: string;
}

export default function AIAnalyticsDashboard() {
    const [stats, setStats] = useState<AIAnalyticsStats | null>(null);
    const [healthStatus, setHealthStatus] = useState<any>(null);
    const [migrationStatus, setMigrationStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [testModalVisible, setTestModalVisible] = useState(false);
    const [testQuery, setTestQuery] = useState('Show me sales trends over the last 6 months');

    const aiCapabilities: AICapability[] = [
        {
            name: 'Intelligent Query Analysis',
            description: 'AI-powered natural language understanding and query routing',
            status: 'active',
            icon: <BulbOutlined />,
            endpoint: '/ai/intelligent-analysis'
        },
        {
            name: 'Unified Data Workflows',
            description: 'End-to-end data analysis workflows from ingestion to insights',
            status: 'active',
            icon: <RocketOutlined />,
            endpoint: '/ai/unified-workflow'
        },
        {
            name: 'Agentic AI Analysis',
            description: 'Advanced autonomous AI reasoning and deep analysis',
            status: 'active',
            icon: <CrownOutlined />,
            endpoint: '/ai/agentic-analysis'
        },
        {
            name: 'AI Schema Generation',
            description: 'Intelligent data modeling and Cube.js schema creation',
            status: 'active',
            icon: <DatabaseOutlined />,
            endpoint: '/ai/schema/generate'
        },
        {
            name: 'ECharts Visualization',
            description: 'AI-optimized chart generation and styling',
            status: 'active',
            icon: <BarChartOutlined />,
            endpoint: '/ai/visualization/echarts'
        },
        {
            name: 'Business Intelligence',
            description: 'Actionable insights and prescriptive recommendations',
            status: 'active',
            icon: <BulbOutlined />,
            endpoint: '/ai/insights/business'
        },
        {
            name: 'Function Calling',
            description: 'AI-powered tool integration and automation',
            status: 'active',
            icon: <ThunderboltOutlined />,
            endpoint: '/ai/function-calling'
        },
        {
            name: 'Analytics Dashboard',
            description: 'Comprehensive analytics and performance monitoring',
            status: 'active',
            icon: <BarChartOutlined />,
            endpoint: '/ai/dashboard/analytics'
        }
    ];

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            // Load AI health status
            const healthResult = await apiService.aiHealthCheck();
            if (healthResult.success) {
                setHealthStatus(healthResult.data);
            }

            // Load migration status
            const migrationResult = await apiService.getAIMigrationStatus();
            if (migrationResult.success) {
                setMigrationStatus(migrationResult.data);
            }

            // Mock stats for now (replace with real API call when available)
            setStats({
                total_requests: 1250,
                successful_requests: 1180,
                ai_enhanced_requests: 1100,
                average_response_time: 2.3,
                success_rate: 94.4,
                ai_enhancement_rate: 93.2
            });

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            message.error('Failed to load AI analytics dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const testAICapability = async () => {
        try {
            setTestModalVisible(false);
            message.loading('Testing AI capability...', 2);
            
            // Test the intelligent analysis endpoint
            const result = await unifiedAIService.intelligentQueryAnalysis({
                query: testQuery,
                business_context: 'e-commerce analytics'
            });

            if (result.success) {
                message.success('AI capability test successful! Check the console for details.');
                console.log('AI Test Result:', result);
            } else {
                throw new Error('AI test failed');
            }
        } catch (error) {
            console.error('AI test error:', error);
            message.error('AI capability test failed. Please check the console for details.');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'success';
            case 'beta': return 'warning';
            case 'coming_soon': return 'default';
            default: return 'default';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <CheckCircleOutlined />;
            case 'beta': return <SyncOutlined />;
            case 'coming_soon': return <SyncOutlined spin />;
            default: return <SyncOutlined />;
        }
    };

    return (
        <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <BulbOutlined style={{ color: '#1890ff' }} />
                    AI Analytics Dashboard
                </Title>
                <Text type="secondary">
                    Unified AI-powered analytics platform - World-leading data analysis and business intelligence
                </Text>
            </div>

            {/* AI Health Status */}
            {healthStatus && (
                <Alert
                    message={`AI Service Status: ${healthStatus.status}`}
                    description={`Version: ${healthStatus.version} | Models: ${healthStatus.ai_models?.join(', ') || 'N/A'}`}
                    type={healthStatus.status === 'healthy' ? 'success' : 'warning'}
                    icon={<BulbOutlined />}
                    style={{ marginBottom: '24px' }}
                    action={
                        <Button size="small" onClick={() => loadDashboardData()}>
                            Refresh
                        </Button>
                    }
                />
            )}

            {/* Migration Status */}
            {migrationStatus && (
                <Alert
                    message={`Migration Status: ${migrationStatus.migration_status}`}
                    description={`Consolidated: ${migrationStatus.consolidated_services?.length || 0} services | Remaining: ${migrationStatus.remaining_services?.length || 0} services`}
                    type="info"
                    icon={<SyncOutlined />}
                    style={{ marginBottom: '24px' }}
                />
            )}

            {/* Key Statistics */}
            {stats && (
                <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                    <Col xs={24} sm={12} md={6}>
                        <Card>
                            <Statistic
                                title="Total Requests"
                                value={stats.total_requests}
                                prefix={<BulbOutlined />}
                                suffix="requests"
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card>
                            <Statistic
                                title="Success Rate"
                                value={stats.success_rate}
                                prefix={<CheckCircleOutlined />}
                                suffix="%"
                                valueStyle={{ color: '#3f8600' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card>
                            <Statistic
                                title="AI Enhancement"
                                value={stats.ai_enhancement_rate}
                                prefix={<RocketOutlined />}
                                suffix="%"
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card>
                            <Statistic
                                title="Avg Response Time"
                                value={stats.average_response_time}
                                prefix={<ThunderboltOutlined />}
                                suffix="s"
                                valueStyle={{ color: '#fa8c16' }}
                            />
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Progress Indicators */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={24} md={12}>
                    <Card title="AI Enhancement Rate">
                        <Progress
                            percent={stats?.ai_enhancement_rate || 0}
                            status="active"
                            strokeColor={{
                                '0%': '#108ee9',
                                '100%': '#87d068',
                            }}
                        />
                        <Text type="secondary">
                            {stats?.ai_enhanced_requests || 0} of {stats?.successful_requests || 0} requests enhanced with AI
                        </Text>
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card title="Success Rate Trend">
                        <Progress
                            percent={stats?.success_rate || 0}
                            status="success"
                            strokeColor={{
                                '0%': '#52c41a',
                                '100%': '#1890ff',
                            }}
                        />
                        <Text type="secondary">
                            {stats?.successful_requests || 0} of {stats?.total_requests || 0} requests successful
                        </Text>
                    </Card>
                </Col>
            </Row>

            {/* AI Capabilities */}
            <Card title="AI Capabilities" style={{ marginBottom: '24px' }}>
                <Row gutter={[16, 16]}>
                    {aiCapabilities.map((capability, index) => (
                        <Col xs={24} sm={12} md={8} lg={6} key={index}>
                            <Card
                                size="small"
                                hoverable
                                style={{ height: '100%' }}
                                actions={[
                                    <Tooltip title="Test Capability" key="test">
                                        <Button
                                            type="text"
                                            icon={<ExperimentOutlined />}
                                            onClick={() => {
                                                setTestQuery(`Test ${capability.name.toLowerCase()}`);
                                                setTestModalVisible(true);
                                            }}
                                        />
                                    </Tooltip>
                                ]}
                            >
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '24px', marginBottom: '8px', color: '#1890ff' }}>
                                        {capability.icon}
                                    </div>
                                    <Title level={5} style={{ margin: '8px 0' }}>
                                        {capability.name}
                                    </Title>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        {capability.description}
                                    </Text>
                                    <div style={{ marginTop: '8px' }}>
                                        <Tag color={getStatusColor(capability.status)} icon={getStatusIcon(capability.status)}>
                                            {capability.status?.toUpperCase() || 'UNKNOWN'}
                                        </Tag>
                                    </div>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </Card>

            {/* Quick Actions */}
            <Card title="Quick Actions">
                <Space wrap>
                    <Button
                        type="primary"
                        icon={<BulbOutlined />}
                        onClick={() => window.location.href = '/chat'}
                    >
                        Start AI Analysis
                    </Button>
                    <Button
                        icon={<DatabaseOutlined />}
                        onClick={() => window.location.href = '/data'}
                    >
                        Manage Data Sources
                    </Button>
                    <Button
                        icon={<BarChartOutlined />}
                        onClick={() => window.location.href = '/chat?action=charts'}
                    >
                        View Generated Charts
                    </Button>
                    <Button
                        icon={<ExperimentOutlined />}
                        onClick={() => setTestModalVisible(true)}
                    >
                        Test AI Capabilities
                    </Button>
                </Space>
            </Card>

            {/* Test AI Modal */}
            <Modal
                title="Test AI Capabilities"
                open={testModalVisible}
                onCancel={() => setTestModalVisible(false)}
                onOk={testAICapability}
                okText="Test AI"
                cancelText="Cancel"
            >
                <div style={{ marginBottom: '16px' }}>
                    <Text strong>Test Query:</Text>
                    <Input.TextArea
                        value={testQuery}
                        onChange={(e) => setTestQuery(e.target.value)}
                        rows={3}
                        style={{ marginTop: '8px' }}
                        placeholder="Enter a test query to validate AI capabilities..."
                    />
                </div>
                <Alert
                    message="AI Test Information"
                    description="This will test the intelligent analysis endpoint with your query. Check the browser console for detailed results."
                    type="info"
                    showIcon
                />
            </Modal>
        </div>
    );
};
