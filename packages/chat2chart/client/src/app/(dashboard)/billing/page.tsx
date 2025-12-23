'use client';

import React, { useState, useEffect } from 'react';
import { 
    Card, 
    Row, 
    Col, 
    Typography, 
    Space, 
    Button, 
    Progress, 
    Table, 
    Tag, 
    Statistic, 
    Divider, 
    message,
    Empty,
    Skeleton,
    Tooltip,
    Alert
} from 'antd';
import { 
    CreditCardOutlined, 
    DollarOutlined, 
    BarChartOutlined,
    CalendarOutlined,
    TeamOutlined,
    CrownOutlined,
    ArrowUpOutlined,
    CheckCircleOutlined,
    ProjectOutlined,
    DatabaseOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { usePlanRestrictions } from '@/hooks/usePlanRestrictions';

const { Title, Text } = Typography;
type PlanKey = 'free' | 'pro' | 'team' | 'enterprise';

const BillingPage: React.FC = React.memo(() => {
    const router = useRouter();
    const { showUpgradePrompt, UpgradeModal } = usePlanRestrictions();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    // Organization context removed - default to free plan
    const initialPlan = 'free' 
      : null;
    console.log('[BillingPage] Initial render - currentOrganization:', currentOrganization, 'initialPlan:', initialPlan);
    const [billingData, setBillingData] = useState({
        currentPlan: initialPlan || 'free', // Will be updated by useEffect
        planName: initialPlan ? (initialPlan.charAt(0).toUpperCase() + initialPlan.slice(1) + ' Plan') : 'Loading...',
        monthlyCost: 0,
        nextBillingDate: null as string | null,
        usage: {
            aiCredits: { used: 0, limit: 30, percentage: 0 },
            storage: { used: 0, limit: 5 * 1024, percentage: 0 },
            teamMembers: { used: 1, limit: 1, percentage: 0 },
            projects: { used: 1, limit: 1, percentage: 0 },
            dataSources: { used: 0, limit: 2, percentage: 0 },
        },
        planMeta: {
            dataHistoryDays: 7,
            seatsIncluded: 1,
            seatsUsed: 1,
        },
        invoices: [] as any[]
    });

    // Fetch billing data from API
    useEffect(() => {
        const fetchBillingData = async () => {
            if (!currentOrganization?.id) {
                setFetching(false);
                return;
            }
            
            setFetching(true);
            try {
                const usageResponse = await fetch(`/api/organizations/${currentOrganization.id}/usage`, {
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (usageResponse.ok) {
                    const usage = await usageResponse.json();
                    console.log('[BillingPage] Usage response:', usage);
                    console.log('[BillingPage] Current organization:', currentOrganization);
                    // CRITICAL: Only default to 'free' if plan_type is truly missing from both sources
                    const planType = (
                        (usage.plan_type && usage.plan_type.trim() !== '') 
                        ? usage.plan_type 
                        : (currentOrganization?.plan_type && currentOrganization.plan_type.trim() !== '') 
                          ? currentOrganization.plan_type 
                          : 'free'
                    ) as PlanKey;
                    console.log('[BillingPage] Resolved planType:', planType);

                    const basePlanConfig: Record<PlanKey, {
                        aiCredits: number;
                        storage: number;
                        teamMembers: number;
                        dataSources: number;
                        projects: number;
                        dataHistoryDays: number;
                        price: number;
                    }> = {
                        free: { aiCredits: 30, storage: 5, teamMembers: 1, dataSources: 2, projects: 1, dataHistoryDays: 7, price: 0 },
                        pro: { aiCredits: 300, storage: 90, teamMembers: 3, dataSources: -1, projects: -1, dataHistoryDays: 180, price: 25 },
                        team: { aiCredits: 2000, storage: 500, teamMembers: 5, dataSources: -1, projects: -1, dataHistoryDays: 365, price: 99 },
                        enterprise: { aiCredits: -1, storage: -1, teamMembers: -1, dataSources: -1, projects: -1, dataHistoryDays: -1, price: 0 },
                    };

                    const defaults = basePlanConfig[planType] || basePlanConfig.free;
                    const apiLimits = usage.limits || {};
                    const apiUsage = usage.usage || {};

                    const aiCreditsLimit = apiLimits.ai_credits_limit ?? defaults.aiCredits;
                    const aiCreditsUsed = apiUsage.ai_credits_used ?? apiLimits.ai_credits_used ?? 0;
                    const aiCreditsPercentage = aiCreditsLimit > 0 ? Math.min(100, (aiCreditsUsed / aiCreditsLimit) * 100) : 0;

                    const storageLimitGb = apiLimits.storage_limit_gb ?? defaults.storage;
                    const storageUsedGb = apiUsage.storage_used_gb ?? 0;
                    const storageLimitMb = storageLimitGb > 0 ? storageLimitGb * 1024 : storageLimitGb;
                    const storageUsedMb = storageUsedGb * 1024;
                    const storagePercentage = storageLimitGb > 0 ? Math.min(100, (storageUsedGb / storageLimitGb) * 100) : 0;

                    const teamMembersLimit = apiLimits.max_users ?? defaults.teamMembers;
                    const teamMembersUsed = apiUsage.active_users ?? 1;
                    const teamMembersPercentage = teamMembersLimit > 0 ? Math.min(100, (teamMembersUsed / teamMembersLimit) * 100) : 0;

                    const projectsLimit = apiLimits.max_projects ?? defaults.projects;
                    const projectsUsed = apiUsage.projects_used ?? apiUsage.projects_count ?? 0;
                    const projectsPercentage = projectsLimit > 0 ? Math.min(100, (projectsUsed / projectsLimit) * 100) : 0;

                    const dataSourcesLimit = apiLimits.max_data_sources ?? defaults.dataSources;
                    const dataSourcesUsed = apiUsage.data_sources_used ?? 0;
                    const dataSourcesPercentage = dataSourcesLimit > 0 ? Math.min(100, (dataSourcesUsed / dataSourcesLimit) * 100) : 0;

                    const dataHistoryDays = apiLimits.data_history_days ?? defaults.dataHistoryDays;
                    const seatsIncluded = apiLimits.included_seats ?? defaults.teamMembers;
                    const seatsUsed = teamMembersUsed;

                    setBillingData({
                        currentPlan: planType,
                        planName: planType.charAt(0).toUpperCase() + planType.slice(1) + ' Plan',
                        monthlyCost: basePlanConfig[planType]?.price ?? 0,
                        nextBillingDate: null,
                        usage: {
                            aiCredits: { 
                                used: aiCreditsUsed, 
                                limit: aiCreditsLimit, 
                                percentage: aiCreditsPercentage 
                            },
                            storage: { 
                                used: storageUsedMb, 
                                limit: storageLimitMb, 
                                percentage: storagePercentage 
                            },
                            teamMembers: { 
                                used: teamMembersUsed, 
                                limit: teamMembersLimit, 
                                percentage: teamMembersPercentage 
                            },
                            projects: {
                                used: projectsUsed,
                                limit: projectsLimit,
                                percentage: projectsPercentage
                            },
                            dataSources: {
                                used: dataSourcesUsed,
                                limit: dataSourcesLimit,
                                percentage: dataSourcesPercentage
                            }
                        },
                        planMeta: {
                            dataHistoryDays,
                            seatsIncluded,
                            seatsUsed,
                        },
                        invoices: []
                    });
                } else {
                    const errorText = await usageResponse.text().catch(() => 'Unknown error');
                    console.error('[BillingPage] Failed to load usage data:', errorText, 'status:', usageResponse.status);
                    // CRITICAL: Even if API fails, use plan_type from currentOrganization
                    if (currentOrganization?.plan_type && currentOrganization.plan_type.trim() !== '') {
                        const planType = currentOrganization.plan_type as PlanKey;
                        console.log('[BillingPage] Using plan_type from currentOrganization after API failure:', planType);
                        setBillingData(prev => ({
                            ...prev,
                            currentPlan: planType,
                            planName: planType.charAt(0).toUpperCase() + planType.slice(1) + ' Plan',
                            fetching: false
                        }));
                    } else {
                        message.warning('Failed to load usage data. Using default values.');
                        setBillingData(prev => ({
                            ...prev,
                            fetching: false
                        }));
                    }
                }
            } catch (error) {
                console.error('[BillingPage] Error fetching billing data:', error);
                // CRITICAL: Even on error, use plan_type from currentOrganization
                if (currentOrganization?.plan_type && currentOrganization.plan_type.trim() !== '') {
                    const planType = currentOrganization.plan_type as PlanKey;
                    console.log('[BillingPage] Using plan_type from currentOrganization after error:', planType);
                    setBillingData(prev => ({
                        ...prev,
                        currentPlan: planType,
                        planName: planType.charAt(0).toUpperCase() + planType.slice(1) + ' Plan',
                        fetching: false
                    }));
                } else {
                    message.error('Failed to load billing information. Please refresh the page.');
                    setBillingData(prev => ({
                        ...prev,
                        fetching: false
                    }));
                }
            } finally {
                setFetching(false);
            }
        };
        
        // CRITICAL: Also initialize from currentOrganization.plan_type if available, even without API call
        if (currentOrganization?.plan_type && currentOrganization.plan_type.trim() !== '') {
            const planType = currentOrganization.plan_type as PlanKey;
            console.log('[BillingPage] Initializing from currentOrganization.plan_type:', planType);
            setBillingData(prev => ({
                ...prev,
                currentPlan: planType,
                planName: planType.charAt(0).toUpperCase() + planType.slice(1) + ' Plan',
            }));
        }
        
        if (currentOrganization?.id) {
            fetchBillingData();
        } else {
            setFetching(false);
        }
    }, [currentOrganization?.id, currentOrganization?.plan_type]); // Also depend on plan_type

    const getPlanColor = React.useCallback((plan: string) => {
        switch (plan) {
            case 'free': return 'default';
            case 'pro': return 'blue';
            case 'team': return 'purple';
            case 'enterprise': return 'gold';
            default: return 'default';
        }
    }, []);

    const getUsageColor = (percentage: number) => {
        if (percentage >= 90) return '#ff4d4f';
        if (percentage >= 75) return '#faad14';
        return '#52c41a';
    };

    const columns = React.useMemo(() => [
        {
            title: 'Invoice ID',
            dataIndex: 'id',
            key: 'id',
            render: (text: string) => <Text code style={{ fontSize: '13px' }}>{text}</Text>
        },
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            render: (date: string) => <Text>{new Date(date).toLocaleDateString()}</Text>
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            render: (amount: number) => (
                <Text strong style={{ fontSize: '15px', color: 'var(--ant-color-success)' }}>
                    ${amount.toFixed(2)}
                </Text>
            )
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag 
                    color={status === 'paid' ? 'success' : 'warning'}
                    icon={status === 'paid' ? <CheckCircleOutlined /> : null}
                >
                    {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
                </Tag>
            )
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description'
        }
    ], []);

    if (fetching) {
        return (
            <div className="page-wrapper">
                <Skeleton active paragraph={{ rows: 8 }} />
            </div>
        );
    }

    return (
        <div className="page-wrapper" style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '24px', paddingBottom: '24px' }}>
            {/* Page Header */}
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <Title level={2} className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <CreditCardOutlined style={{ color: 'var(--ant-color-primary)', fontSize: '24px' }} />
                    Billing & Usage
                </Title>
                <Text type="secondary" className="page-description" style={{ marginTop: '4px', marginBottom: '0' }}>
                    Manage your subscription, view usage statistics, and access billing history
                </Text>
            </div>
            <div className="page-body">
            {/* Current Plan Overview */}
            <Card 
                style={{ marginBottom: '24px' }}
                className="billing-plan-card"
            >
                <Row gutter={24} align="middle">
                    <Col xs={24} md={16}>
                        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                            <Space size="large" align="start">
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, var(--ant-color-primary) 0%, var(--ant-color-primary-hover) 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                                }}>
                                    <CrownOutlined style={{ fontSize: '32px', color: '#fff' }} />
                                </div>
                                <div>
                                    <Title level={3} style={{ margin: 0, marginBottom: '4px' }}>
                                        {billingData.planName}
                                    </Title>
                                    {billingData.nextBillingDate ? (
                                        <Text type="secondary">
                                            <CalendarOutlined style={{ marginRight: '4px' }} />
                                            Next billing date: {new Date(billingData.nextBillingDate).toLocaleDateString()}
                                        </Text>
                                    ) : (
                                        <Text type="secondary">
                                            {billingData.currentPlan === 'free' 
                                                ? 'Upgrade to unlock more features' 
                                                : 'Active subscription'}
                                        </Text>
                                    )}
                                </div>
                            </Space>
                            
                            <Row gutter={24}>
                                <Col span={8}>
                                    <Statistic
                                        title="Monthly Cost"
                                        value={billingData.monthlyCost}
                                        prefix={<DollarOutlined />}
                                        precision={2}
                                        valueStyle={{ color: 'var(--ant-color-primary)' }}
                                    />
                                </Col>
                                <Col span={8}>
                                    <Statistic
                                        title="Plan Type"
                                        value={billingData.currentPlan?.toUpperCase() || 'UNKNOWN'}
                                        valueStyle={{ color: 'var(--ant-color-primary)' }}
                                    />
                                </Col>
                            </Row>
                        </Space>
                    </Col>
                    <Col xs={24} md={8} style={{ textAlign: 'right' }}>
                        {billingData.currentPlan !== 'enterprise' && (
                            <Button 
                                type="primary" 
                                size="large"
                                icon={<ArrowUpOutlined />}
                                onClick={() => showUpgradePrompt('plan_upgrade', 'Unlock more AI credits, storage, and seats by upgrading your plan.')}
                                block
                                style={{ marginBottom: '12px' }}
                            >
                                Upgrade Plan
                            </Button>
                        )}
                        <Button 
                            type="default"
                            size="large"
                            block
                        >
                            Manage Subscription
                        </Button>
                    </Col>
                </Row>
            </Card>

            {/* Usage Statistics */}
            <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={8}>
                    <Card 
                        hoverable
                        style={{ height: '100%' }}
                        className="usage-card"
                    >
                        <Space direction="vertical" size="middle" style={{ width: '100%', textAlign: 'center' }}>
                            <div style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, var(--ant-color-primary) 0%, var(--ant-color-primary-hover) 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto'
                            }}>
                                <BarChartOutlined style={{ fontSize: '24px', color: '#fff' }} />
                            </div>
                            <div>
                                <Title level={4} style={{ margin: 0, marginBottom: '8px' }}>AI Credits</Title>
                                <Progress 
                                    percent={billingData.usage.aiCredits.percentage} 
                                    status={billingData.usage.aiCredits.percentage >= 90 ? 'exception' : 'active'}
                                    strokeColor={getUsageColor(billingData.usage.aiCredits.percentage)}
                                    format={() => `${billingData.usage.aiCredits.used}/${billingData.usage.aiCredits.limit === -1 ? '∞' : billingData.usage.aiCredits.limit}`}
                                />
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Used this month
                                </Text>
                            </div>
                        </Space>
                    </Card>
                </Col>
                
                <Col xs={24} sm={8}>
                    <Card 
                        hoverable
                        style={{ height: '100%' }}
                        className="usage-card"
                    >
                        <Space direction="vertical" size="middle" style={{ width: '100%', textAlign: 'center' }}>
                            <div style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto'
                            }}>
                                <BarChartOutlined style={{ fontSize: '24px', color: '#fff' }} />
                            </div>
                            <div>
                                <Title level={4} style={{ margin: 0, marginBottom: '8px' }}>Storage</Title>
                                <Progress 
                                    percent={billingData.usage.storage.percentage} 
                                    status={billingData.usage.storage.percentage >= 90 ? 'exception' : 'active'}
                                    strokeColor={getUsageColor(billingData.usage.storage.percentage)}
                                    format={() => `${(billingData.usage.storage.used / 1024).toFixed(1)}GB/${billingData.usage.storage.limit === -1 ? '∞' : (billingData.usage.storage.limit / 1024).toFixed(0)}GB`}
                                />
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Used this month
                                </Text>
                            </div>
                        </Space>
                    </Card>
                </Col>
                
                <Col xs={24} sm={8}>
                    <Card 
                        hoverable
                        style={{ height: '100%' }}
                        className="usage-card"
                    >
                        <Space direction="vertical" size="middle" style={{ width: '100%', textAlign: 'center' }}>
                            <div style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto'
                            }}>
                                <TeamOutlined style={{ fontSize: '24px', color: '#fff' }} />
                            </div>
                            <div>
                                <Title level={4} style={{ margin: 0, marginBottom: '8px' }}>Team Members</Title>
                                <Progress 
                                    percent={billingData.usage.teamMembers.percentage} 
                                    status={billingData.usage.teamMembers.percentage >= 90 ? 'exception' : 'active'}
                                    strokeColor={getUsageColor(billingData.usage.teamMembers.percentage)}
                                    format={() => `${billingData.usage.teamMembers.used}/${billingData.usage.teamMembers.limit === -1 ? '∞' : billingData.usage.teamMembers.limit}`}
                                />
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Active members
                                </Text>
                            </div>
                        </Space>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12}>
                    <Card 
                        hoverable
                        style={{ height: '100%' }}
                        className="usage-card"
                    >
                        <Space direction="vertical" size="middle" style={{ width: '100%', textAlign: 'center' }}>
                            <div style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #13c2c2 0%, #08979c 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto'
                            }}>
                                <ProjectOutlined style={{ fontSize: '24px', color: '#fff' }} />
                            </div>
                            <div>
                                <Title level={4} style={{ margin: 0, marginBottom: '8px' }}>Projects</Title>
                                <Progress 
                                    percent={billingData.usage.projects.percentage} 
                                    status={billingData.usage.projects.percentage >= 90 ? 'exception' : 'active'}
                                    strokeColor={getUsageColor(billingData.usage.projects.percentage)}
                                    format={() => billingData.usage.projects.limit === -1
                                        ? `${billingData.usage.projects.used}`
                                        : `${billingData.usage.projects.used}/${billingData.usage.projects.limit}`}
                                />
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Active project workspaces
                                </Text>
                            </div>
                        </Space>
                    </Card>
                </Col>
                <Col xs={24} sm={12}>
                    <Card 
                        hoverable
                        style={{ height: '100%' }}
                        className="usage-card"
                    >
                        <Space direction="vertical" size="middle" style={{ width: '100%', textAlign: 'center' }}>
                            <div style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto'
                            }}>
                                <DatabaseOutlined style={{ fontSize: '24px', color: '#fff' }} />
                            </div>
                            <div>
                                <Title level={4} style={{ margin: 0, marginBottom: '8px' }}>Data Sources</Title>
                                <Progress 
                                    percent={billingData.usage.dataSources.percentage} 
                                    status={billingData.usage.dataSources.percentage >= 90 ? 'exception' : 'active'}
                                    strokeColor={getUsageColor(billingData.usage.dataSources.percentage)}
                                    format={() => billingData.usage.dataSources.limit === -1
                                        ? `${billingData.usage.dataSources.used}`
                                        : `${billingData.usage.dataSources.used}/${billingData.usage.dataSources.limit}`}
                                />
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Connected sources
                                </Text>
                            </div>
                        </Space>
                    </Card>
                </Col>
            </Row>

            <Card className="content-card" style={{ marginBottom: 24 }}>
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={6}>
                        <Space direction="vertical" size={0}>
                            <Text type="secondary">Data history window</Text>
                            <Text strong>
                                {billingData.planMeta.dataHistoryDays < 0 ? 'Custom retention' : `${billingData.planMeta.dataHistoryDays} days`}
                            </Text>
                        </Space>
                    </Col>
                    <Col xs={24} md={6}>
                        <Space direction="vertical" size={0}>
                            <Text type="secondary">Included seats</Text>
                            <Text strong>
                                {billingData.planMeta.seatsIncluded < 0
                                    ? 'Unlimited'
                                    : `${billingData.planMeta.seatsUsed}/${billingData.planMeta.seatsIncluded}`}
                            </Text>
                        </Space>
                    </Col>
                    <Col xs={24} md={6}>
                        <Space direction="vertical" size={0}>
                            <Text type="secondary">AI credits / month</Text>
                            <Text strong>
                                {billingData.usage.aiCredits.limit === -1 ? 'Unlimited' : `${billingData.usage.aiCredits.limit}`}
                            </Text>
                        </Space>
                    </Col>
                    <Col xs={24} md={6}>
                        <Space direction="vertical" size={0}>
                            <Text type="secondary">Storage included</Text>
                            <Text strong>
                                {billingData.usage.storage.limit === -1 ? 'Unlimited' : `${(billingData.usage.storage.limit / 1024).toFixed(0)} GB`}
                            </Text>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* Billing History */}
            <Card 
                title={
                    <Space>
                        <CreditCardOutlined />
                        <span>Billing History</span>
                    </Space>
                }
            >
                {billingData.invoices.length === 0 ? (
                    <Empty 
                        description="No billing history available"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                ) : (
                    <Table 
                        columns={columns} 
                        dataSource={billingData.invoices}
                        rowKey="id"
                        pagination={false}
                        loading={loading}
                    />
                )}
            </Card>
            <UpgradeModal />
            </div>
        </div>
    );
});

export default BillingPage;
