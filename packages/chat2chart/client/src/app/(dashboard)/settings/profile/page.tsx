'use client';

import React, { useState } from 'react';
import { Card, Row, Col, Typography, Form, Input, Button, Avatar, Upload, message, Divider, Switch, Tag } from 'antd';
import { 
    UserOutlined, 
    MailOutlined, 
    PhoneOutlined,
    GlobalOutlined,
    CameraOutlined,
    SaveOutlined
} from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function ProfileSettingsPage() {
    const { user } = useAuth();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            // Add your profile update logic here
            console.log('Profile update values:', values);
            message.success('Profile updated successfully!');
        } catch (error) {
            message.error('Failed to update profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarChange = (info: any) => {
        if (info.file.status === 'done') {
            setAvatarUrl(info.file.response.url);
            message.success('Avatar updated successfully!');
        }
    };

    const uploadProps = {
        name: 'avatar',
        action: '/api/upload-avatar', // Add your upload endpoint
        headers: {
            authorization: 'authorization-text',
        },
        onChange: handleAvatarChange,
    };

    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="mb-8">
                <Title level={2}>
                    <UserOutlined style={{ marginRight: 12, color: '#1890ff' }} />
                    Profile Settings
                </Title>
                <Text type="secondary">
                    Manage your personal information, avatar, and account preferences
                </Text>
            </div>

            <Row gutter={24}>
                <Col span={16}>
                    <Card title="Personal Information" className="mb-6">
                        <Form
                            form={form}
                            layout="vertical"
                            initialValues={{
                                firstName: user?.firstName || '',
                                lastName: user?.lastName || '',
                                email: user?.email || '',
                                phone: user?.phone || '',
                                bio: user?.bio || '',
                                website: user?.website || '',
                                location: user?.location || '',
                                timezone: user?.timezone || 'UTC'
                            }}
                            onFinish={onFinish}
                        >
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name="firstName"
                                        label="First Name"
                                        rules={[{ required: true, message: 'Please enter your first name' }]}
                                    >
                                        <Input prefix={<UserOutlined />} placeholder="First Name" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="lastName"
                                        label="Last Name"
                                        rules={[{ required: true, message: 'Please enter your last name' }]}
                                    >
                                        <Input prefix={<UserOutlined />} placeholder="Last Name" />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name="email"
                                        label="Email Address"
                                        rules={[
                                            { required: true, message: 'Please enter your email' },
                                            { type: 'email', message: 'Please enter a valid email' }
                                        ]}
                                    >
                                        <Input prefix={<MailOutlined />} placeholder="Email Address" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="phone"
                                        label="Phone Number"
                                    >
                                        <Input prefix={<PhoneOutlined />} placeholder="Phone Number" />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item
                                name="bio"
                                label="Bio"
                            >
                                <TextArea 
                                    rows={4} 
                                    placeholder="Tell us about yourself..."
                                    maxLength={500}
                                    showCount
                                />
                            </Form.Item>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name="website"
                                        label="Website"
                                    >
                                        <Input prefix={<GlobalOutlined />} placeholder="https://yourwebsite.com" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="location"
                                        label="Location"
                                    >
                                        <Input placeholder="City, Country" />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item
                                name="timezone"
                                label="Timezone"
                            >
                                <Input placeholder="UTC" />
                            </Form.Item>

                            <Form.Item>
                                <Button 
                                    type="primary" 
                                    htmlType="submit" 
                                    loading={loading}
                                    icon={<SaveOutlined />}
                                    size="large"
                                >
                                    Save Changes
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>

                    <Card title="Preferences" className="mb-6">
                        <Row gutter={24}>
                            <Col span={12}>
                                <div className="mb-4">
                                    <Text strong>Email Notifications</Text>
                                    <div className="mt-2">
                                        <Switch defaultChecked /> <Text className="ml-2">Receive email updates</Text>
                                    </div>
                                </div>
                                
                                <div className="mb-4">
                                    <Text strong>Marketing Communications</Text>
                                    <div className="mt-2">
                                        <Switch /> <Text className="ml-2">Receive marketing emails</Text>
                                    </div>
                                </div>
                            </Col>
                            <Col span={12}>
                                <div className="mb-4">
                                    <Text strong>Two-Factor Authentication</Text>
                                    <div className="mt-2">
                                        <Switch /> <Text className="ml-2">Enable 2FA</Text>
                                    </div>
                                </div>
                                
                                <div className="mb-4">
                                    <Text strong>Public Profile</Text>
                                    <div className="mt-2">
                                        <Switch defaultChecked /> <Text className="ml-2">Make profile public</Text>
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    </Card>
                </Col>

                <Col span={8}>
                    <Card title="Profile Picture" className="mb-6">
                        <div className="text-center">
                            <div className="mb-4">
                                <Avatar 
                                    size={120} 
                                    src={avatarUrl}
                                    icon={<UserOutlined />}
                                    style={{ border: '4px solid #f0f0f0' }}
                                />
                            </div>
                            
                            <Upload {...uploadProps}>
                                <Button icon={<CameraOutlined />}>
                                    Change Avatar
                                </Button>
                            </Upload>
                            
                            <div className="mt-4">
                                <Text type="secondary">
                                    Recommended: Square image, at least 200x200 pixels
                                </Text>
                            </div>
                        </div>
                    </Card>

                    <Card title="Account Status">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Text>Account Type</Text>
                                <Tag color="blue">Pro</Tag>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <Text>Member Since</Text>
                                <Text>{new Date().toLocaleDateString()}</Text>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <Text>Last Login</Text>
                                <Text>{new Date().toLocaleDateString()}</Text>
                            </div>
                            
                            <Divider />
                            
                            <Button 
                                type="default" 
                                danger 
                                block
                            >
                                Delete Account
                            </Button>
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
