'use client';

// Simple dynamic configuration that actually works

import React, { useState } from 'react';
import { Card, Row, Col, Typography, Form, Input, Button, Switch, Select, message, Divider, Space, Tag, Alert, Modal } from 'antd';
import { 
    SafetyOutlined, 
    LockOutlined, 
    KeyOutlined,
    SaveOutlined,
    EyeOutlined,
    EyeInvisibleOutlined,
    MobileOutlined,
    MailOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

export default function SecurityPage() {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            // Add your security settings update logic here
            console.log('Security settings update values:', values);
            message.success('Security settings updated successfully!');
        } catch (error) {
            message.error('Failed to update security settings. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (values: any) => {
        if (values.newPassword !== values.confirmPassword) {
            message.error('New passwords do not match!');
            return;
        }

        try {
            // Add your password change logic here
            message.success('Password changed successfully!');
            form.resetFields(['currentPassword', 'newPassword', 'confirmPassword']);
        } catch (error) {
            message.error('Failed to change password. Please try again.');
        }
    };

    const handleEnable2FA = () => {
        Modal.info({
            title: 'Two-Factor Authentication',
            content: (
                <div>
                    <p>To enable 2FA, you'll need to:</p>
                    <ol>
                        <li>Download an authenticator app (Google Authenticator, Authy, etc.)</li>
                        <li>Scan the QR code that will be displayed</li>
                        <li>Enter the 6-digit code from your app</li>
                    </ol>
                    <p>Would you like to proceed with 2FA setup?</p>
                </div>
            ),
            onOk: () => {
                // Add your 2FA setup logic here
                message.info('2FA setup initiated. Please check your email for next steps.');
            }
        });
    };

    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="mb-8">
                <Title level={2}>
                    <SafetyOutlined style={{ marginRight: 12, color: 'var(--color-brand-primary)' }} />
                    Security Settings
                </Title>
                <Text type="secondary">
                    Manage your account security, passwords, and authentication methods
                </Text>
            </div>

            <Row gutter={24}>
                <Col span={16}>
                    {/* Password Change */}
                    <Card title="Change Password" className="mb-6">
                        <Form
                            layout="vertical"
                            onFinish={handlePasswordChange}
                        >
                            <Form.Item
                                name="currentPassword"
                                label="Current Password"
                                rules={[{ required: true, message: 'Please enter your current password' }]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined />}
                                    placeholder="Enter current password"
                                    iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                                />
                            </Form.Item>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name="newPassword"
                                        label="New Password"
                                        rules={[
                                            { required: true, message: 'Please enter new password' },
                                            { min: 8, message: 'Password must be at least 8 characters' },
                                            { 
                                                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                                                message: 'Password must contain uppercase, lowercase, number and special character'
                                            }
                                        ]}
                                    >
                                        <Input.Password
                                            prefix={<KeyOutlined />}
                                            placeholder="Enter new password"
                                            iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="confirmPassword"
                                        label="Confirm New Password"
                                        rules={[
                                            { required: true, message: 'Please confirm your new password' },
                                            ({ getFieldValue }) => ({
                                                validator(_, value) {
                                                    if (!value || getFieldValue('newPassword') === value) {
                                                        return Promise.resolve();
                                                    }
                                                    return Promise.reject(new Error('Passwords do not match!'));
                                                },
                                            }),
                                        ]}
                                    >
                                        <Input.Password
                                            prefix={<KeyOutlined />}
                                            placeholder="Confirm new password"
                                            iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item>
                                <Button 
                                    type="primary" 
                                    htmlType="submit"
                                    icon={<SaveOutlined />}
                                >
                                    Change Password
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>

                    {/* Two-Factor Authentication */}
                    <Card title="Two-Factor Authentication" className="mb-6">
                        <Row gutter={16} align="middle">
                            <Col span={16}>
                                <div className="mb-4">
                                    <Text strong>Status: </Text>
                                    <Tag color="red">Disabled</Tag>
                                </div>
                                <Text type="secondary">
                                    Add an extra layer of security to your account by requiring a second form of verification.
                                </Text>
                            </Col>
                            <Col span={8} style={{ textAlign: 'right' }}>
                                <Button 
                                    type="primary" 
                                    icon={<MobileOutlined />}
                                    onClick={handleEnable2FA}
                                >
                                    Enable 2FA
                                </Button>
                            </Col>
                        </Row>

                        <Divider />

                        <Row gutter={16}>
                            <Col span={12}>
                                <div className="mb-4">
                                    <Text strong>Authenticator App</Text>
                                    <div className="mt-2">
                                        <Switch /> <Text className="ml-2">Use authenticator app</Text>
                                    </div>
                                </div>
                            </Col>
                            <Col span={12}>
                                <div className="mb-4">
                                    <Text strong>SMS Verification</Text>
                                    <div className="mt-2">
                                        <Switch /> <Text className="ml-2">Use SMS verification</Text>
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    </Card>

                    {/* Login Security */}
                    <Card title="Login Security" className="mb-6">
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="loginNotifications"
                                    label="Login Notifications"
                                    valuePropName="checked"
                                >
                                    <Switch defaultChecked />
                                </Form.Item>
                                <Text type="secondary">Get notified when someone logs into your account</Text>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="suspiciousActivity"
                                    label="Suspicious Activity Alerts"
                                    valuePropName="checked"
                                >
                                    <Switch defaultChecked />
                                </Form.Item>
                                <Text type="secondary">Alert on unusual login patterns</Text>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="sessionTimeout"
                                    label="Session Timeout"
                                >
                                    <Select placeholder="Select timeout">
                                        <Option value="15">15 minutes</Option>
                                        <Option value="30">30 minutes</Option>
                                        <Option value="60">1 hour</Option>
                                        <Option value="1440">24 hours</Option>
                                        <Option value="never">Never</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="maxLoginAttempts"
                                    label="Max Login Attempts"
                                >
                                    <Input type="number" min={3} max={10} placeholder="5" />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Card>

                    {/* API Security */}
                    <Card title="API Security" className="mb-6">
                        <Alert
                            message="API Keys"
                            description="Manage your API keys for programmatic access to the platform."
                            type="info"
                            showIcon
                            className="mb-4"
                        />

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="apiKeyExpiry"
                                    label="API Key Expiry"
                                >
                                    <Select placeholder="Select expiry">
                                        <Option value="30">30 days</Option>
                                        <Option value="90">90 days</Option>
                                        <Option value="365">1 year</Option>
                                        <Option value="never">Never</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="ipWhitelist"
                                    label="IP Whitelist"
                                >
                                    <Input.TextArea 
                                        rows={3} 
                                        placeholder="Enter IP addresses (one per line)"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Card>
                </Col>

                <Col span={8}>
                    {/* Security Status */}
                    <Card title="Security Status" className="mb-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Text>Password Strength</Text>
                                <Tag color="green">Strong</Tag>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <Text>2FA Status</Text>
                                <Tag color="red">Disabled</Tag>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <Text>Last Password Change</Text>
                                <Text>{new Date().toLocaleDateString()}</Text>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <Text>Last Login</Text>
                                <Text>{new Date().toLocaleDateString()}</Text>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <Text>Active Sessions</Text>
                                <Text>2</Text>
                            </div>
                            
                            <Divider />
                            
                            <Button 
                                type="default" 
                                block
                                danger
                            >
                                Sign Out All Sessions
                            </Button>
                        </div>
                    </Card>

                    {/* Security Tips */}
                    <Card title="Security Tips">
                        <div className="space-y-3">
                            <div className="flex items-start">
                                <div style={{ width: 8, height: 8, background: 'var(--color-brand-primary)', borderRadius: '50%', marginTop: 8, marginRight: 8 }}></div>
                                <Text style={{ fontSize: 'var(--font-size-sm)' }}>
                                    Use a strong, unique password for your account
                                </Text>
                            </div>
                            
                            <div className="flex items-start">
                                <div style={{ width: 8, height: 8, background: 'var(--color-brand-primary)', borderRadius: '50%', marginTop: 8, marginRight: 8 }}></div>
                                <Text style={{ fontSize: 'var(--font-size-sm)' }}>
                                    Enable two-factor authentication for extra security
                                </Text>
                            </div>
                            
                            <div className="flex items-start">
                                <div style={{ width: 8, height: 8, background: 'var(--color-brand-primary)', borderRadius: '50%', marginTop: 8, marginRight: 8 }}></div>
                                <Text style={{ fontSize: 'var(--font-size-sm)' }}>
                                    Regularly review your active sessions
                                </Text>
                            </div>
                            
                            <div className="flex items-start">
                                <div style={{ width: 8, height: 8, background: 'var(--color-brand-primary)', borderRadius: '50%', marginTop: 8, marginRight: 8 }}></div>
                                <Text style={{ fontSize: 'var(--font-size-sm)' }}>
                                    Never share your API keys or credentials
                                </Text>
                            </div>
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
                    onClick={() => form.submit()}
                >
                    Save Security Settings
                </Button>
            </div>
        </div>
    );
}
