'use client';

import { useState, useEffect } from 'react';
import { Card, Tabs, Layout, Menu, Button, Avatar, Typography, Space, Divider, message, Form, Input, Select } from 'antd';
import {
    UserOutlined,
    TeamOutlined,
    CreditCardOutlined,
    SettingOutlined,
    BellOutlined,
    SecurityScanOutlined,
    DatabaseOutlined,
    ApiOutlined
} from '@ant-design/icons';
import { useOrganization } from '@/context/OrganizationContext';
import { useAuth } from '@/context/AuthContext';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

export default function SettingsPage() {
    const [selectedTab, setSelectedTab] = useState('profile');
    const [collapsed, setCollapsed] = useState(false);
    const { user } = useAuth();
    const { 
        currentOrganization, 
        organizations, 
        loading, 
        error, 
        createOrganization, 
        updateOrganization 
    } = useOrganization();

    const menuItems = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Profile',
        },
        {
            key: 'organization',
            icon: <TeamOutlined />,
            label: 'Organization',
        },
        {
            key: 'billing',
            icon: <CreditCardOutlined />,
            label: 'Billing & Plans',
        },
        {
            key: 'security',
            icon: <SecurityScanOutlined />,
            label: 'Security',
        },
        {
            key: 'notifications',
            icon: <BellOutlined />,
            label: 'Notifications',
        },
        {
            key: 'integrations',
            icon: <ApiOutlined />,
            label: 'Integrations',
        },
        {
            key: 'data',
            icon: <DatabaseOutlined />,
            label: 'Data & Privacy',
        },
        {
            key: 'advanced',
            icon: <SettingOutlined />,
            label: 'Advanced',
        },
    ];

    const renderProfileTab = () => (
        <div className="space-y-6">
            <Card title="Personal Information">
                <div className="flex items-center space-x-4 mb-6">
                    <Avatar size={64} icon={<UserOutlined />} />
                    <div>
                        <Button type="primary">Change Photo</Button>
                        <Text type="secondary" className="block mt-2">
                            JPG, GIF or PNG. Max size 2MB
                        </Text>
                    </div>
                </div>
                
                <Form
                    layout="vertical"
                    initialValues={{
                        firstName: user?.firstName || '',
                        lastName: user?.lastName || '',
                        email: user?.email || user?.account || '',
                        bio: user?.bio || '',
                    }}
                    onFinish={(values) => {
                        message.success('Profile updated successfully');
                    }}
                >
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item label="First Name" name="firstName">
                            <Input placeholder="Enter first name" />
                        </Form.Item>
                        <Form.Item label="Last Name" name="lastName">
                            <Input placeholder="Enter last name" />
                        </Form.Item>
                        <Form.Item label="Email" name="email" className="col-span-2">
                            <Input placeholder="Enter email" disabled />
                        </Form.Item>
                        <Form.Item label="Bio" name="bio" className="col-span-2">
                            <Input.TextArea rows={3} placeholder="Tell us about yourself" />
                        </Form.Item>
                    </div>
                    
                    <div className="mt-6">
                        <Button type="primary" htmlType="submit">
                            Save Changes
                        </Button>
                    </div>
                </Form>
            </Card>
        </div>
    );

    const renderOrganizationTab = () => {
        if (loading) {
            return <div className="text-center py-8">Loading organization data...</div>;
        }

        if (error) {
            return (
                <div className="text-center py-8 text-red-500">
                    Error: {error}
                    <Button onClick={() => window.location.reload()} className="ml-4">
                        Retry
                    </Button>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {currentOrganization ? (
                    <Card title="Organization Details">
                        <Form
                            layout="vertical"
                            initialValues={{
                                name: currentOrganization.name,
                                description: currentOrganization.description,
                                website: currentOrganization.website,
                                logo_url: currentOrganization.logo_url,
                            }}
                            onFinish={async (values) => {
                                try {
                                    await updateOrganization(currentOrganization.id, values);
                                    message.success('Organization updated successfully');
                                } catch (err) {
                                    message.error('Failed to update organization');
                                }
                            }}
                        >
                            <div className="grid grid-cols-2 gap-4">
                                <Form.Item label="Organization Name" name="name">
                                    <Input placeholder="Enter organization name" />
                                </Form.Item>
                                <Form.Item label="Slug" name="slug">
                                    <Input placeholder="organization-slug" disabled />
                                </Form.Item>
                                <Form.Item label="Description" name="description" className="col-span-2">
                                    <Input.TextArea rows={3} placeholder="Describe your organization" />
                                </Form.Item>
                                <Form.Item label="Website" name="website">
                                    <Input placeholder="https://example.com" />
                                </Form.Item>
                                <Form.Item label="Logo URL" name="logo_url">
                                    <Input placeholder="https://example.com/logo.png" />
                                </Form.Item>
                            </div>
                            
                            <div className="mt-6">
                                <Button type="primary" htmlType="submit" loading={loading}>
                                    Update Organization
                                </Button>
                            </div>
                        </Form>
                    </Card>
                ) : (
                    <Card title="Create Organization">
                        <Form
                            layout="vertical"
                            onFinish={async (values) => {
                                try {
                                    await createOrganization(values);
                                    message.success('Organization created successfully');
                                } catch (err) {
                                    message.error('Failed to create organization');
                                }
                            }}
                        >
                            <Form.Item 
                                label="Organization Name" 
                                name="name"
                                rules={[{ required: true, message: 'Please enter organization name' }]}
                            >
                                <Input placeholder="Enter organization name" />
                            </Form.Item>
                            <Form.Item label="Description" name="description">
                                <Input.TextArea rows={3} placeholder="Describe your organization" />
                            </Form.Item>
                            <Form.Item label="Website" name="website">
                                <Input placeholder="https://example.com" />
                            </Form.Item>
                            
                            <div className="mt-6">
                                <Button type="primary" htmlType="submit" loading={loading}>
                                    Create Organization
                                </Button>
                            </div>
                        </Form>
                    </Card>
                )}

                <Card title="Organization Info">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Text strong>Plan Type</Text>
                                <Text className="block text-blue-600">{currentOrganization?.plan_type || 'Free'}</Text>
                            </div>
                            <div>
                                <Text strong>Status</Text>
                                <Text className="block text-green-600">{currentOrganization?.subscription_status || 'Active'}</Text>
                            </div>
                            <div>
                                <Text strong>AI Credits Used</Text>
                                <Text className="block">{currentOrganization?.ai_credits_used || 0} / {currentOrganization?.ai_credits_limit || 1000}</Text>
                            </div>
                            <div>
                                <Text strong>Created</Text>
                                <Text className="block">{currentOrganization?.created_at ? new Date(currentOrganization.created_at).toLocaleDateString() : 'N/A'}</Text>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        );
    };

    const renderBillingTab = () => (
        <div className="space-y-6">
            <Card title="Current Plan">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <Title level={3} className="text-blue-800">Free Plan</Title>
                            <Text className="text-blue-600">Basic features for individual users</Text>
                        </div>
                        <div className="text-right">
                            <Title level={2} className="text-blue-800">$0/month</Title>
                            <Text className="text-blue-600">No credit card required</Text>
                        </div>
                    </div>
                    
                    <div className="mt-4">
                        <Button type="primary" size="large">Upgrade Plan</Button>
                    </div>
                </div>
            </Card>

            <Card title="Usage Statistics">
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded">
                        <Title level={4}>AI Credits</Title>
                        <Text className="text-2xl font-bold text-blue-600">45/50</Text>
                        <Text type="secondary" className="block">Used this month</Text>
                    </div>
                    <div className="text-center p-4 border rounded">
                        <Title level={4}>Projects</Title>
                        <Text className="text-2xl font-bold text-green-600">1/1</Text>
                        <Text type="secondary" className="block">Active projects</Text>
                    </div>
                    <div className="text-center p-4 border rounded">
                        <Title level={4}>Team Members</Title>
                        <Text className="text-2xl font-bold text-purple-600">1/1</Text>
                        <Text type="secondary" className="block">Current limit</Text>
                    </div>
                </div>
            </Card>

            <Card title="Billing History">
                <div className="text-center py-8 text-gray-500">
                    <CreditCardOutlined className="text-4xl mb-4" />
                    <Text>No billing history yet</Text>
                    <Text className="block">Upgrade to a paid plan to see billing information</Text>
                </div>
            </Card>
        </div>
    );

    const renderSecurityTab = () => (
        <div className="space-y-6">
            <Card title="Password">
                <div className="space-y-4">
                    <div>
                        <Text strong>Current Password</Text>
                        <input 
                            type="password" 
                            className="w-full mt-2 p-2 border rounded"
                            placeholder="Enter current password"
                        />
                    </div>
                    <div>
                        <Text strong>New Password</Text>
                        <input 
                            type="password" 
                            className="w-full mt-2 p-2 border rounded"
                            placeholder="Enter new password"
                        />
                    </div>
                    <div>
                        <Text strong>Confirm New Password</Text>
                        <input 
                            type="password" 
                            className="w-full mt-2 p-2 border rounded"
                            placeholder="Confirm new password"
                        />
                    </div>
                    <Button type="primary">Change Password</Button>
                </div>
            </Card>

            <Card title="Two-Factor Authentication">
                <div className="flex justify-between items-center">
                    <div>
                        <Text strong>Two-Factor Authentication</Text>
                        <Text type="secondary" className="block">Add an extra layer of security to your account</Text>
                    </div>
                    <Button>Enable 2FA</Button>
                </div>
            </Card>

            <Card title="Active Sessions">
                <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 border rounded">
                        <div>
                            <Text strong>Current Session</Text>
                            <Text type="secondary" className="block">Chrome on Windows • Active now</Text>
                        </div>
                        <Button size="small" danger>Terminate</Button>
                    </div>
                </div>
            </Card>
        </div>
    );

    const renderTabContent = () => {
        switch (selectedTab) {
            case 'profile':
                return renderProfileTab();
            case 'organization':
                return renderOrganizationTab();
            case 'billing':
                return renderBillingTab();
            case 'security':
                return renderSecurityTab();
            default:
                return <div>Content for {selectedTab}</div>;
        }
    };

    return (
        <Layout className="min-h-screen">
            <Sider 
                collapsible 
                collapsed={collapsed} 
                onCollapse={setCollapsed}
                className="bg-white border-r"
            >
                <div className="p-4">
                    <Title level={4} className="text-center text-gray-800">
                        {collapsed ? 'S' : 'Settings'}
                    </Title>
                </div>
                <Menu
                    mode="inline"
                    selectedKeys={[selectedTab]}
                    items={menuItems}
                    onClick={({ key }) => setSelectedTab(key)}
                    className="border-0"
                />
            </Sider>
            
            <Layout>
                <Header className="bg-white border-b px-6 flex items-center justify-between">
                    <Title level={3} className="mb-0">
                        {menuItems.find(item => item.key === selectedTab)?.label}
                    </Title>
                    <Space>
                        <Button>Save Changes</Button>
                    </Space>
                </Header>
                
                <Content className="p-6 bg-gray-50 min-h-screen overflow-y-auto">
                    <div className="max-w-4xl mx-auto">
                        {renderTabContent()}
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
}
