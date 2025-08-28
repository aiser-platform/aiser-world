'use client';

import React from 'react';
import { Card, Row, Col, Typography, Space, Button } from 'antd';
import { 
    UserOutlined, 
    GlobalOutlined, 
    BellOutlined, 
    SafetyOutlined, 
    TeamOutlined,
    CreditCardOutlined,
    SettingOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

export default function SettingsPage() {
    const router = useRouter();

    const settingsSections = [
        {
            title: 'Profile Settings',
            description: 'Manage your personal information and preferences',
            icon: <UserOutlined style={{ fontSize: 24, color: '#1890ff' }} />,
            route: '/settings/profile',
            color: '#1890ff'
        },
        {
            title: 'General Settings',
            description: 'Configure application preferences and defaults',
            icon: <GlobalOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
            route: '/settings/general',
            color: '#52c41a'
        },
        {
            title: 'Notifications',
            description: 'Control your notification preferences',
            icon: <BellOutlined style={{ fontSize: 24, color: '#faad14' }} />,
            route: '/settings/notifications',
            color: '#faad14'
        },
        {
            title: 'Security',
            description: 'Manage your account security settings',
            icon: <SafetyOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />,
            route: '/settings/security',
            color: '#ff4d4f'
        },
        {
            title: 'Team Management',
            description: 'Manage team members and permissions',
            icon: <TeamOutlined style={{ fontSize: 24, color: '#722ed1' }} />,
            route: '/team',
            color: '#722ed1'
        },
        {
            title: 'Billing & Usage',
            description: 'View usage statistics and manage billing',
            icon: <CreditCardOutlined style={{ fontSize: 24, color: '#13c2c2' }} />,
            route: '/billing',
            color: '#13c2c2'
        }
    ];

    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="mb-8">
                <Title level={2}>
                    <SettingOutlined style={{ marginRight: 12, color: '#1890ff' }} />
                    Settings
                </Title>
                <Text type="secondary">
                    Manage your account settings, preferences, and security options
                </Text>
            </div>

            <Row gutter={[24, 24]}>
                {settingsSections.map((section, index) => (
                    <Col xs={24} sm={12} lg={8} key={index}>
                        <Card
                            hoverable
                            className="h-full cursor-pointer transition-all duration-200 hover:shadow-lg"
                            onClick={() => router.push(section.route)}
                            bodyStyle={{ padding: '24px' }}
                        >
                            <div className="text-center">
                                <div className="mb-4">
                                    {section.icon}
                                </div>
                                <Title level={4} style={{ marginBottom: 8 }}>
                                    {section.title}
                                </Title>
                                <Text type="secondary" style={{ fontSize: '14px' }}>
                                    {section.description}
                                </Text>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <Title level={4}>Quick Actions</Title>
                <Space size="middle">
                    <Button 
                        type="primary" 
                        icon={<UserOutlined />}
                        onClick={() => router.push('/settings/profile')}
                    >
                        Edit Profile
                    </Button>
                    <Button 
                        icon={<BellOutlined />}
                        onClick={() => router.push('/settings/notifications')}
                    >
                        Notification Settings
                    </Button>
                                         <Button 
                         icon={<SafetyOutlined />}
                         onClick={() => router.push('/settings/security')}
                     >
                         Security Settings
                     </Button>
                </Space>
            </div>
        </div>
    );
}
