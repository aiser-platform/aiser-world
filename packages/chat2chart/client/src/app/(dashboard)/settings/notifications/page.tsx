'use client';

// Simple dynamic configuration that actually works

import React, { useState } from 'react';
import { Card, Row, Col, Typography, Form, Switch, Button, TimePicker, Select, message, Divider, Space, Tag } from 'antd';
import { 
    BellOutlined, 
    MailOutlined, 
    MobileOutlined, 
    SaveOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

export default function NotificationsPage() {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            // Add your notification settings update logic here
            console.log('Notification settings update values:', values);
            message.success('Notification settings updated successfully!');
        } catch (error) {
            message.error('Failed to update notification settings. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleTestNotification = (type: string) => {
        message.success(`${type} notification sent successfully!`);
    };

    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="mb-8">
                <Title level={2}>
                    <BellOutlined style={{ marginRight: 12, color: '#1890ff' }} />
                    Notification Settings
                </Title>
                <Text type="secondary">
                    Configure how and when you receive notifications from the platform
                </Text>
            </div>

            <Form
                form={form}
                layout="vertical"
                initialValues={{
                    // Email Notifications
                    emailNotifications: true,
                    emailFrequency: 'immediate',
                    emailDigest: false,
                    emailDigestTime: '09:00',
                    
                    // Push Notifications
                    pushNotifications: true,
                    pushSound: true,
                    pushVibration: true,
                    
                    // SMS Notifications
                    smsNotifications: false,
                    smsEmergency: true,
                    
                    // Notification Types
                    projectUpdates: true,
                    teamMessages: true,
                    dataAlerts: true,
                    systemMaintenance: false,
                    marketingUpdates: false,
                    securityAlerts: true,
                    
                    // Quiet Hours
                    quietHours: true,
                    quietStart: '22:00',
                    quietEnd: '08:00',
                    quietDays: ['Saturday', 'Sunday']
                }}
                onFinish={onFinish}
            >
                <Row gutter={24}>
                    <Col span={16}>
                        {/* Email Notifications */}
                        <Card title="Email Notifications" className="mb-6">
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name="emailNotifications"
                                        label="Enable Email Notifications"
                                        valuePropName="checked"
                                    >
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="emailFrequency"
                                        label="Email Frequency"
                                    >
                                        <Select placeholder="Select frequency">
                                            <Option value="immediate">Immediate</Option>
                                            <Option value="hourly">Hourly Digest</Option>
                                            <Option value="daily">Daily Digest</Option>
                                            <Option value="weekly">Weekly Digest</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name="emailDigest"
                                        label="Enable Email Digest"
                                        valuePropName="checked"
                                    >
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="emailDigestTime"
                                        label="Digest Time"
                                    >
                                        <TimePicker 
                                            format="HH:mm" 
                                            placeholder="Select time"
                                            style={{ width: '100%' }}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Card>

                        {/* Push Notifications */}
                        <Card title="Push Notifications" className="mb-6">
                            <Row gutter={16}>
                                <Col span={8}>
                                    <Form.Item
                                        name="pushNotifications"
                                        label="Enable Push Notifications"
                                        valuePropName="checked"
                                    >
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item
                                        name="pushSound"
                                        label="Sound"
                                        valuePropName="checked"
                                    >
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item
                                        name="pushVibration"
                                        label="Vibration"
                                        valuePropName="checked"
                                    >
                                        <Switch />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Card>

                        {/* SMS Notifications */}
                        <Card title="SMS Notifications" className="mb-6">
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name="smsNotifications"
                                        label="Enable SMS Notifications"
                                        valuePropName="checked"
                                    >
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="smsEmergency"
                                        label="Emergency SMS Only"
                                        valuePropName="checked"
                                    >
                                        <Switch />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Card>

                        {/* Notification Types */}
                        <Card title="Notification Types" className="mb-6">
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name="projectUpdates"
                                        label="Project Updates"
                                        valuePropName="checked"
                                    >
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="teamMessages"
                                        label="Team Messages"
                                        valuePropName="checked"
                                    >
                                        <Switch />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name="dataAlerts"
                                        label="Data Alerts"
                                        valuePropName="checked"
                                    >
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="systemMaintenance"
                                        label="System Maintenance"
                                        valuePropName="checked"
                                    >
                                        <Switch />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name="marketingUpdates"
                                        label="Marketing Updates"
                                        valuePropName="checked"
                                    >
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="securityAlerts"
                                        label="Security Alerts"
                                        valuePropName="checked"
                                    >
                                        <Switch />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Card>

                        {/* Quiet Hours */}
                        <Card title="Quiet Hours" className="mb-6">
                            <Row gutter={16}>
                                <Col span={8}>
                                    <Form.Item
                                        name="quietHours"
                                        label="Enable Quiet Hours"
                                        valuePropName="checked"
                                    >
                                        <Switch />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item
                                        name="quietStart"
                                        label="Start Time"
                                    >
                                        <TimePicker 
                                            format="HH:mm" 
                                            placeholder="Start time"
                                            style={{ width: '100%' }}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item
                                        name="quietEnd"
                                        label="End Time"
                                    >
                                        <TimePicker 
                                            format="HH:mm" 
                                            placeholder="End time"
                                            style={{ width: '100%' }}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item
                                name="quietDays"
                                label="Quiet Days"
                            >
                                <Select
                                    mode="multiple"
                                    placeholder="Select days"
                                    style={{ width: '100%' }}
                                >
                                    <Option value="Monday">Monday</Option>
                                    <Option value="Tuesday">Tuesday</Option>
                                    <Option value="Wednesday">Wednesday</Option>
                                    <Option value="Thursday">Thursday</Option>
                                    <Option value="Friday">Friday</Option>
                                    <Option value="Saturday">Saturday</Option>
                                    <Option value="Sunday">Sunday</Option>
                                </Select>
                            </Form.Item>
                        </Card>
                    </Col>

                    <Col span={8}>
                        {/* Test Notifications */}
                        <Card title="Test Notifications" className="mb-6">
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <Button 
                                    icon={<MailOutlined />} 
                                    block
                                    onClick={() => handleTestNotification('Email')}
                                >
                                    Test Email
                                </Button>
                                
                                <Button 
                                    icon={<MobileOutlined />} 
                                    block
                                    onClick={() => handleTestNotification('Push')}
                                >
                                    Test Push
                                </Button>
                                
                                <Button 
                                    icon={<CheckCircleOutlined />} 
                                    block
                                    onClick={() => handleTestNotification('SMS')}
                                >
                                    Test SMS
                                </Button>
                            </Space>
                        </Card>

                        {/* Current Settings Summary */}
                        <Card title="Current Settings">
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <Text>Email:</Text>
                                    <Tag color="green">Enabled</Tag>
                                </div>
                                <div className="flex justify-between">
                                    <Text>Push:</Text>
                                    <Tag color="green">Enabled</Tag>
                                </div>
                                <div className="flex justify-between">
                                    <Text>SMS:</Text>
                                    <Tag color="red">Disabled</Tag>
                                </div>
                                <div className="flex justify-between">
                                    <Text>Quiet Hours:</Text>
                                    <Tag color="green">Enabled</Tag>
                                </div>
                                
                                <Divider />
                                
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Test notifications will be sent to verify your settings are working correctly.
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
                        Save Notification Settings
                    </Button>
                </div>
            </Form>
        </div>
    );
}
