'use client';

// Simple dynamic configuration that actually works

import React, { useState } from 'react';
import { Card, Row, Col, Typography, Form, Input, Button, Select, Switch, TimePicker, message, Divider, Space } from 'antd';
import { 
    GlobalOutlined, 
    BellOutlined, 
    SecurityScanOutlined,
    SaveOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import { useDarkMode } from '@/hooks/useDarkMode';

const { Title, Text } = Typography;
const { Option } = Select;

export default function GeneralSettingsPage() {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [isDarkMode, setIsDarkMode] = useDarkMode();

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            // Add your settings update logic here
            console.log('General settings update values:', values);
            message.success('Settings updated successfully!');
        } catch (error) {
            message.error('Failed to update settings. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        form.resetFields();
        message.info('Settings reset to defaults');
    };

    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="mb-8">
                <Title level={2}>
                    <GlobalOutlined style={{ marginRight: 12, color: '#1890ff' }} />
                    General Settings
                </Title>
                <Text type="secondary">
                    Configure application preferences, language, timezone, and display options
                </Text>
            </div>

            <Form
                form={form}
                layout="vertical"
                initialValues={{
                    language: 'en',
                    timezone: 'UTC',
                    dateFormat: 'MM/DD/YYYY',
                    timeFormat: '12h',
                    currency: 'USD',
                    theme: isDarkMode ? 'dark' : 'light',
                    autoSave: true,
                    notifications: true,
                    emailUpdates: true,
                    marketingEmails: false,
                    dataSharing: false
                }}
                onFinish={onFinish}
            >
                <Row gutter={24}>
                    <Col span={16}>
                        {/* Language & Regional Settings */}
                        <Card title="Language & Regional" className="mb-6">
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name="language"
                                        label="Language"
                                        rules={[{ required: true, message: 'Please select language' }]}
                                    >
                                        <Select placeholder="Select language">
                                            <Option value="en">English</Option>
                                            <Option value="es">Spanish</Option>
                                            <Option value="fr">French</Option>
                                            <Option value="de">German</Option>
                                            <Option value="zh">Chinese</Option>
                                            <Option value="ja">Japanese</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="timezone"
                                        label="Timezone"
                                        rules={[{ required: true, message: 'Please select timezone' }]}
                                    >
                                        <Select placeholder="Select timezone">
                                            <Option value="UTC">UTC (Coordinated Universal Time)</Option>
                                            <Option value="EST">EST (Eastern Standard Time)</Option>
                                            <Option value="PST">PST (Pacific Standard Time)</Option>
                                            <Option value="GMT">GMT (Greenwich Mean Time)</Option>
                                            <Option value="CET">CET (Central European Time)</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name="dateFormat"
                                        label="Date Format"
                                    >
                                        <Select placeholder="Select date format">
                                            <Option value="MM/DD/YYYY">MM/DD/YYYY</Option>
                                            <Option value="DD/MM/YYYY">DD/MM/YYYY</Option>
                                            <Option value="YYYY-MM-DD">YYYY-MM-DD</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="timeFormat"
                                        label="Time Format"
                                    >
                                        <Select placeholder="Select time format">
                                            <Option value="12h">12-hour (AM/PM)</Option>
                                            <Option value="24h">24-hour</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item
                                name="currency"
                                label="Currency"
                            >
                                <Select placeholder="Select currency">
                                    <Option value="USD">USD ($)</Option>
                                    <Option value="EUR">EUR (€)</Option>
                                    <Option value="GBP">GBP (£)</Option>
                                    <Option value="JPY">JPY (¥)</Option>
                                    <Option value="CAD">CAD (C$)</Option>
                                </Select>
                            </Form.Item>
                        </Card>

                        {/* Display & Interface */}
                        <Card title="Display & Interface" className="mb-6">
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name="theme"
                                        label="Theme"
                                    >
                                        <Select placeholder="Select theme">
                                            <Option value="light">Light</Option>
                                            <Option value="dark">Dark</Option>
                                            <Option value="auto">Auto (System)</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="fontSize"
                                        label="Font Size"
                                    >
                                        <Select placeholder="Select font size">
                                            <Option value="small">Small</Option>
                                            <Option value="medium">Medium</Option>
                                            <Option value="large">Large</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name="compactMode"
                                        label="Compact Mode"
                                        valuePropName="checked"
                                    >
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="showAnimations"
                                        label="Show Animations"
                                        valuePropName="checked"
                                    >
                                        <Switch defaultChecked />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Card>

                        {/* Data & Privacy */}
                        <Card title="Data & Privacy" className="mb-6">
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name="autoSave"
                                        label="Auto-save Changes"
                                        valuePropName="checked"
                                    >
                                        <Switch defaultChecked />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="dataSharing"
                                        label="Data Sharing for Analytics"
                                        valuePropName="checked"
                                    >
                                        <Switch />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name="sessionTimeout"
                                        label="Session Timeout (minutes)"
                                    >
                                        <Input type="number" min={5} max={480} placeholder="30" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="maxFileSize"
                                        label="Max File Upload Size (MB)"
                                    >
                                        <Input type="number" min={1} max={1000} placeholder="100" />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Card>
                    </Col>

                    <Col span={8}>
                        {/* Quick Actions */}
                        <Card title="Quick Actions" className="mb-6">
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <Button 
                                    icon={<ReloadOutlined />} 
                                    block
                                    onClick={handleReset}
                                >
                                    Reset to Defaults
                                </Button>
                                
                                <Button 
                                    type="default" 
                                    block
                                    onClick={() => setIsDarkMode(!isDarkMode)}
                                >
                                    Toggle Theme
                                </Button>
                                
                                <Button 
                                    type="default" 
                                    block
                                    onClick={() => window.location.reload()}
                                >
                                    Refresh Page
                                </Button>
                            </Space>
                        </Card>

                        {/* Current Settings Summary */}
                        <Card title="Current Settings">
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <Text>Language:</Text>
                                    <Text strong>English</Text>
                                </div>
                                <div className="flex justify-between">
                                    <Text>Theme:</Text>
                                    <Text strong>{isDarkMode ? 'Dark' : 'Light'}</Text>
                                </div>
                                <div className="flex justify-between">
                                    <Text>Timezone:</Text>
                                    <Text strong>UTC</Text>
                                </div>
                                <div className="flex justify-between">
                                    <Text>Auto-save:</Text>
                                    <Text strong>Enabled</Text>
                                </div>
                                
                                <Divider />
                                
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Changes will be applied immediately for most settings. Some changes may require a page refresh.
                                </Text>
                            </div>
                        </Card>
                    </Col>
                </Row>

                {/* Save Button */}
                <div className="mt-6 text-center">
                    <Button 
                        type="primary" 
                        htmlType="submit" 
                        loading={loading}
                        icon={<SaveOutlined />}
                        size="large"
                    >
                        Save All Settings
                    </Button>
                </div>
            </Form>
        </div>
    );
}
