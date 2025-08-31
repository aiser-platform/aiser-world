'use client';

// Simple dynamic configuration that actually works

import React, { useState } from 'react';
import { Card, Row, Col, Typography, Space, Button, Progress, Table, Tag, Statistic, Divider } from 'antd';
import { 
    CreditCardOutlined, 
    DollarOutlined, 
    BarChartOutlined,
    CalendarOutlined,
    TeamOutlined,
    CrownOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

const BillingPage: React.FC = React.memo(() => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Mock data - replace with real data from your backend
    const billingData = React.useMemo(() => ({
        currentPlan: 'pro',
        planName: 'Pro Plan',
        monthlyCost: 29.99,
        nextBillingDate: '2024-09-18',
        usage: {
            aiCredits: { used: 1250, limit: 5000, percentage: 25 },
            storage: { used: 45.2, limit: 100, percentage: 45.2 },
            teamMembers: { used: 3, limit: 10, percentage: 30 }
        },
        invoices: [
            {
                id: 'INV-001',
                date: '2024-08-18',
                amount: 29.99,
                status: 'paid',
                description: 'Pro Plan - August 2024'
            },
            {
                id: 'INV-002',
                date: '2024-07-18',
                amount: 29.99,
                status: 'paid',
                description: 'Pro Plan - July 2024'
            }
        ]
    }), []);

    const getPlanColor = React.useCallback((plan: string) => {
        switch (plan) {
            case 'free': return 'default';
            case 'pro': return 'blue';
            case 'team': return 'purple';
            case 'enterprise': return 'gold';
            default: return 'default';
        }
    }, []);

    const columns = React.useMemo(() => [
        {
            title: 'Invoice ID',
            dataIndex: 'id',
            key: 'id',
            render: (text: string) => <Text code>{text}</Text>
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
            render: (amount: number) => <Text strong>${amount.toFixed(2)}</Text>
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={status === 'paid' ? 'green' : 'orange'}>
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

    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="mb-8">
                <Title level={2}>
                    <CreditCardOutlined style={{ marginRight: 12, color: '#1890ff' }} />
                    Billing & Usage
                </Title>
                <Text type="secondary">
                    Manage your subscription, view usage statistics, and access billing history
                </Text>
            </div>

            {/* Current Plan Overview */}
            <Card className="mb-6">
                <Row gutter={24} align="middle">
                    <Col span={16}>
                        <div className="flex items-center mb-4">
                            <CrownOutlined style={{ fontSize: 24, color: '#1890ff', marginRight: 12 }} />
                            <div>
                                <Title level={3} style={{ margin: 0 }}>
                                    {billingData.planName}
                                </Title>
                                <Text type="secondary">
                                    Next billing date: {new Date(billingData.nextBillingDate).toLocaleDateString()}
                                </Text>
                            </div>
                        </div>
                        
                        <Space size="large">
                            <Statistic
                                title="Monthly Cost"
                                value={billingData.monthlyCost}
                                prefix={<DollarOutlined />}
                                precision={2}
                            />
                            <Statistic
                                title="Plan Type"
                                value={billingData.currentPlan?.toUpperCase() || 'UNKNOWN'}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Space>
                    </Col>
                    <Col span={8} style={{ textAlign: 'right' }}>
                        <Button 
                            type="primary" 
                            size="large"
                            icon={<CrownOutlined />}
                            onClick={() => router.push('/billing')}
                        >
                            Upgrade Plan
                        </Button>
                    </Col>
                </Row>
            </Card>

            {/* Usage Statistics */}
            <Row gutter={[24, 24]} className="mb-6">
                <Col xs={24} md={8}>
                    <Card>
                        <div className="text-center">
                            <BarChartOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 16 }} />
                            <Title level={4}>AI Credits</Title>
                            <Progress 
                                percent={billingData.usage.aiCredits.percentage} 
                                status="active"
                                format={() => `${billingData.usage.aiCredits.used}/${billingData.usage.aiCredits.limit}`}
                            />
                            <Text type="secondary">Used this month</Text>
                        </div>
                    </Card>
                </Col>
                
                <Col xs={24} md={8}>
                    <Card>
                        <div className="text-center">
                            <BarChartOutlined style={{ fontSize: 32, color: '#52c41a', marginBottom: 16 }} />
                            <Title level={4}>Storage</Title>
                            <Progress 
                                percent={billingData.usage.storage.percentage} 
                                status="active"
                                format={() => `${billingData.usage.storage.used}GB/${billingData.usage.storage.limit}GB`}
                            />
                            <Text type="secondary">Used this month</Text>
                        </div>
                    </Card>
                </Col>
                
                <Col xs={24} md={8}>
                    <Card>
                        <div className="text-center">
                            <TeamOutlined style={{ fontSize: 32, color: '#722ed1', marginBottom: 16 }} />
                            <Title level={4}>Team Members</Title>
                            <Progress 
                                percent={billingData.usage.teamMembers.percentage} 
                                status="active"
                                format={() => `${billingData.usage.teamMembers.used}/${billingData.usage.teamMembers.limit}`}
                            />
                            <Text type="secondary">Active members</Text>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Billing History */}
            <Card title="Billing History">
                <Table 
                    columns={columns} 
                    dataSource={billingData.invoices}
                    rowKey="id"
                    pagination={false}
                    loading={loading}
                />
            </Card>
        </div>
    );
});

export default BillingPage;
