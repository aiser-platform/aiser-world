'use client';

// Simple dynamic configuration that actually works

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Tag, Space, Typography, Row, Col, Avatar, Select, Tooltip } from 'antd';
import { PlusOutlined, UserOutlined, MailOutlined, TeamOutlined, CrownOutlined } from '@ant-design/icons';
import { useOrganization } from '@/context/OrganizationContext';

const { Title, Text } = Typography;
const { Option } = Select;

interface TeamMember {
    id: number;
    username: string;
    email: string;
    role: string;
    status: 'active' | 'invited' | 'inactive';
    joined_at: string;
    avatar_url?: string;
}

export default function TeamManagementPage() {
    const { currentOrganization } = useOrganization();
    const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);
    const [form] = Form.useForm();
    
    // Mock data - replace with actual API call
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
        {
            id: 1,
            username: 'admin',
            email: 'admin@aiser.world',
            role: 'admin',
            status: 'active',
            joined_at: '2025-01-01',
        },
        {
            id: 2,
            username: 'john_doe',
            email: 'john@example.com',
            role: 'member',
            status: 'active',
            joined_at: '2025-01-15',
        },
        {
            id: 3,
            username: 'jane_smith',
            email: 'jane@example.com',
            role: 'member',
            status: 'invited',
            joined_at: '2025-02-01',
        }
    ]);

    const handleInviteMember = async (values: any) => {
        try {
            // Mock API call - replace with actual implementation
            const newMember: TeamMember = {
                id: Date.now(),
                username: values.email.split('@')[0],
                email: values.email,
                role: values.role,
                status: 'invited',
                joined_at: new Date().toISOString().split('T')[0],
            };
            
            setTeamMembers([...teamMembers, newMember]);
            message.success('Team member invited successfully!');
            setIsInviteModalVisible(false);
            form.resetFields();
        } catch (error) {
            message.error('Failed to invite team member');
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin': return 'red';
            case 'manager': return 'blue';
            case 'member': return 'green';
            default: return 'default';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'green';
            case 'invited': return 'orange';
            case 'inactive': return 'red';
            default: return 'default';
        }
    };

    const columns = [
        {
            title: 'Member',
            key: 'member',
            render: (record: TeamMember) => (
                <Space>
                    <Avatar 
                        src={record.avatar_url} 
                        icon={<UserOutlined />}
                        size="large"
                    />
                    <div>
                        <div>
                            <Text strong>{record.username}</Text>
                            {record.role === 'admin' && (
                                <CrownOutlined style={{ marginLeft: 8, color: '#faad14' }} />
                            )}
                        </div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            {record.email}
                        </Text>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            render: (role: string) => (
                <Tag color={getRoleColor(role)}>
                    {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown'}
                </Tag>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={getStatusColor(status)}>
                    {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
                </Tag>
            ),
        },
        {
            title: 'Joined',
            dataIndex: 'joined_at',
            key: 'joined_at',
            render: (date: string) => new Date(date).toLocaleDateString(),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (record: TeamMember) => (
                <Space>
                    <Button 
                        type="text" 
                        size="small"
                        onClick={() => message.info('Edit functionality coming soon')}
                    >
                        Edit
                    </Button>
                    <Button 
                        type="text" 
                        size="small" 
                        danger
                        onClick={() => message.info('Remove functionality coming soon')}
                    >
                        Remove
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col span={24}>
                    <Title level={2}>Team Management</Title>
                    <Text type="secondary">Manage your team members and their roles</Text>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card>
                        <div style={{ textAlign: 'center' }}>
                            <TeamOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 8 }} />
                            <div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                                    {teamMembers.length}
                                </div>
                                <div style={{ color: '#666' }}>Team Members</div>
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <div style={{ textAlign: 'center' }}>
                            <UserOutlined style={{ fontSize: 32, color: '#52c41a', marginBottom: 8 }} />
                            <div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                                    {teamMembers.filter(m => m.status === 'active').length}
                                </div>
                                <div style={{ color: '#666' }}>Active Members</div>
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <div style={{ textAlign: 'center' }}>
                            <MailOutlined style={{ fontSize: 32, color: '#faad14', marginBottom: 8 }} />
                            <div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                                    {teamMembers.filter(m => m.status === 'invited').length}
                                </div>
                                <div style={{ color: '#666' }}>Pending Invites</div>
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <div style={{ textAlign: 'center' }}>
                            <CrownOutlined style={{ fontSize: 32, color: '#faad14', marginBottom: 8 }} />
                            <div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                                    {teamMembers.filter(m => m.role === 'admin').length}
                                </div>
                                <div style={{ color: '#666' }}>Admins</div>
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            <Card
                title="Team Members"
                extra={
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />}
                        onClick={() => setIsInviteModalVisible(true)}
                    >
                        Invite Member
                    </Button>
                }
            >
                <Table
                    columns={columns}
                    dataSource={teamMembers}
                    rowKey="id"
                    pagination={false}
                />
            </Card>

            <Modal
                title="Invite Team Member"
                open={isInviteModalVisible}
                onCancel={() => setIsInviteModalVisible(false)}
                footer={null}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleInviteMember}
                >
                    <Form.Item
                        name="email"
                        label="Email Address"
                        rules={[
                            { required: true, message: 'Please enter email address' },
                            { type: 'email', message: 'Please enter a valid email' }
                        ]}
                    >
                        <Input placeholder="Enter email address" />
                    </Form.Item>
                    
                    <Form.Item
                        name="role"
                        label="Role"
                        rules={[{ required: true, message: 'Please select a role' }]}
                    >
                        <Select placeholder="Select role">
                            <Option value="member">Member</Option>
                            <Option value="manager">Manager</Option>
                            <Option value="admin">Admin</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                Send Invite
                            </Button>
                            <Button onClick={() => setIsInviteModalVisible(false)}>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
