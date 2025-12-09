'use client';

import React, { useEffect, useState } from 'react';
import { 
    Card, 
    Table, 
    Button, 
    Modal, 
    Form, 
    Input, 
    message, 
    Tag, 
    Space, 
    Typography, 
    Row, 
    Col, 
    Avatar, 
    Select, 
    Tooltip,
    Empty,
    Skeleton,
    Popconfirm,
    Badge,
    Statistic,
    Input as AntInput,
    Segmented,
    Alert
} from 'antd';
import { 
    PlusOutlined, 
    UserOutlined, 
    TeamOutlined, 
    CrownOutlined,
    EditOutlined,
    DeleteOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    ReloadOutlined,
    SearchOutlined,
    MailOutlined
} from '@ant-design/icons';
import { useOrganization } from '@/context/OrganizationContext';
import { usePermissions, Permission } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/PermissionGuard';
import { RoleBadge } from '@/components/RoleBadge';

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
    const { hasPermission, loading: permissionsLoading } = usePermissions({
        organizationId: currentOrganization?.id,
    });
    const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [form] = Form.useForm();
    
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'invited' | 'inactive'>('all');

    const canView = hasPermission(Permission.ORG_VIEW);
    const canManage = hasPermission(Permission.ORG_MANAGE_USERS);

    const fetchTeamMembers = React.useCallback(async () => {
        if (!currentOrganization?.id) {
            setFetching(false);
            return;
        }
        
        setFetching(true);
        try {
            const response = await fetch(`/api/organizations/${currentOrganization.id}/members`, {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const members = await response.json();
                const mappedMembers: TeamMember[] = members.map((m: any) => ({
                    id: parseInt(m.id || m.user_id) || Date.now(),
                    username: m.username || m.name || m.email?.split('@')[0] || 'user',
                    email: m.email || '',
                    role: m.role || 'member',
                    status: m.status === 'active' ? 'active' : m.status === 'invited' ? 'invited' : 'inactive',
                    joined_at: m.joined_at || m.joinDate || new Date().toISOString().split('T')[0],
                    avatar_url: m.avatar_url
                }));
                setTeamMembers(mappedMembers);
            } else {
                message.warning('Failed to load team members');
            }
        } catch (error) {
            console.error('Failed to fetch team members:', error);
            message.error('Failed to load team members');
        } finally {
            setFetching(false);
        }
    }, [currentOrganization]);

    useEffect(() => {
        fetchTeamMembers();
    }, [fetchTeamMembers]);

    const handleInviteMember = async (values: any) => {
        if (!currentOrganization?.id) {
            message.error('No organization selected');
            return;
        }
        
        try {
            setLoading(true);
            const response = await fetch(`/api/organizations/${currentOrganization.id}/members`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: values.email,
                    role: values.role
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    message.success('Team member invited successfully!');
                    setIsInviteModalVisible(false);
                    form.resetFields();
                    // Refresh team members list
                    const membersResponse = await fetch(`/api/organizations/${currentOrganization.id}/members`, {
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    if (membersResponse.ok) {
                        const members = await membersResponse.json();
                        const mappedMembers: TeamMember[] = members.map((m: any) => ({
                            id: parseInt(m.id || m.user_id) || Date.now(),
                            username: m.username || m.name || m.email?.split('@')[0] || 'user',
                            email: m.email || '',
                            role: m.role || 'member',
                            status: m.status === 'active' ? 'active' : m.status === 'invited' ? 'invited' : 'inactive',
                            joined_at: m.joined_at || m.joinDate || new Date().toISOString().split('T')[0],
                            avatar_url: m.avatar_url
                        }));
                        setTeamMembers(mappedMembers);
                    }
                } else {
                    message.error(result.message || 'Failed to invite team member');
                }
            } else {
                const errorText = await response.text();
                message.error(`Failed to invite team member: ${errorText}`);
            }
        } catch (error) {
            console.error('Failed to invite team member:', error);
            message.error('Failed to invite team member');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (memberId: number) => {
        if (!currentOrganization?.id) return;
        
        try {
            setLoading(true);
            const response = await fetch(`/api/organizations/${currentOrganization.id}/members/${memberId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                message.success('Team member removed successfully');
                setTeamMembers(teamMembers.filter(m => m.id !== memberId));
            } else {
                message.error('Failed to remove team member');
            }
        } catch (error) {
            console.error('Failed to remove team member:', error);
            message.error('Failed to remove team member');
        } finally {
            setLoading(false);
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin': return 'red';
            case 'owner': return 'gold';
            case 'manager': return 'blue';
            case 'member': return 'green';
            default: return 'default';
        }
    };

    // Check permissions before rendering
    if (permissionsLoading) {
        return (
            <div className="page-wrapper" style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '24px', paddingBottom: '24px' }}>
                <Skeleton active paragraph={{ rows: 8 }} />
            </div>
        );
    }

    if (!canView) {
        return (
            <div className="page-wrapper" style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '24px', paddingBottom: '24px' }}>
                <Card>
                    <Alert
                        message="Access Denied"
                        description="You do not have permission to view organization members."
                        type="warning"
                        showIcon
                    />
                </Card>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'success';
            case 'invited': return 'warning';
            case 'inactive': return 'error';
            default: return 'default';
        }
    };

    const columns = [
        {
            title: 'Member',
            key: 'member',
            render: (record: TeamMember) => (
                <Space>
                    <Badge 
                        dot 
                        color={record.status === 'active' ? '#52c41a' : record.status === 'invited' ? '#faad14' : '#ff4d4f'}
                    >
                        <Avatar 
                            src={record.avatar_url} 
                            icon={<UserOutlined />}
                            size="large"
                            style={{ border: '2px solid var(--ant-color-border)' }}
                        />
                    </Badge>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Text strong>{record.username}</Text>
                            {record.role === 'admin' || record.role === 'owner' && (
                                <CrownOutlined style={{ color: 'var(--ant-color-warning)' }} />
                            )}
                        </div>
                        <Text type="secondary" style={{ fontSize: '13px' }}>
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
            render: (role: string) => <RoleBadge role={role as any} size="small" />,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag 
                    color={getStatusColor(status)}
                    icon={status === 'active' ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
                    style={{ fontSize: '12px', padding: '2px 8px' }}
                >
                    {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
                </Tag>
            ),
        },
        {
            title: 'Joined',
            dataIndex: 'joined_at',
            key: 'joined_at',
            render: (date: string) => (
                <Text style={{ fontSize: '13px' }}>
                    {new Date(date).toLocaleDateString()}
                </Text>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (record: TeamMember) => (
                <PermissionGuard permission={Permission.ORG_MANAGE_USERS}>
                    <Space size="small">
                        <Tooltip title="Edit member">
                            <Button 
                                type="text" 
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => message.info('Edit functionality coming soon')}
                            />
                        </Tooltip>
                        <Popconfirm
                            title="Remove team member"
                            description={`Are you sure you want to remove ${record.username}?`}
                            onConfirm={() => handleRemoveMember(record.id)}
                            okText="Yes"
                            cancelText="No"
                        >
                            <Tooltip title="Remove member">
                                <Button 
                                    type="text" 
                                    size="small" 
                                    danger
                                    icon={<DeleteOutlined />}
                                />
                            </Tooltip>
                        </Popconfirm>
                    </Space>
                </PermissionGuard>
            ),
        },
    ];

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
                    <TeamOutlined style={{ color: 'var(--ant-color-primary)', fontSize: '24px' }} />
                    Team Management
                </Title>
                <Text type="secondary" className="page-description" style={{ marginTop: '4px', marginBottom: '0' }}>
                    Manage your team members and their roles
                </Text>
            </div>
            
            {/* Statistics Cards */}
            <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={6}>
                    <Card hoverable className="stat-card">
                        <Space direction="vertical" size="small" style={{ width: '100%', textAlign: 'center' }}>
                            <TeamOutlined style={{ fontSize: '32px', color: 'var(--ant-color-primary)' }} />
                            <div>
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--ant-color-text)' }}>
                                    {teamMembers.length}
                                </div>
                                <div style={{ color: 'var(--ant-color-text-secondary)', fontSize: '13px' }}>
                                    Team Members
                                </div>
                            </div>
                        </Space>
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card hoverable className="stat-card">
                        <Space direction="vertical" size="small" style={{ width: '100%', textAlign: 'center' }}>
                            <CheckCircleOutlined style={{ fontSize: '32px', color: 'var(--ant-color-success)' }} />
                            <div>
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--ant-color-text)' }}>
                                    {teamMembers.filter(m => m.status === 'active').length}
                                </div>
                                <div style={{ color: 'var(--ant-color-text-secondary)', fontSize: '13px' }}>
                                    Active Members
                                </div>
                            </div>
                        </Space>
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card hoverable className="stat-card">
                        <Space direction="vertical" size="small" style={{ width: '100%', textAlign: 'center' }}>
                            <ClockCircleOutlined style={{ fontSize: '32px', color: 'var(--ant-color-warning)' }} />
                            <div>
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--ant-color-text)' }}>
                                    {teamMembers.filter(m => m.status === 'invited').length}
                                </div>
                                <div style={{ color: 'var(--ant-color-text-secondary)', fontSize: '13px' }}>
                                    Pending Invites
                                </div>
                            </div>
                        </Space>
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card hoverable className="stat-card">
                        <Space direction="vertical" size="small" style={{ width: '100%', textAlign: 'center' }}>
                            <CrownOutlined style={{ fontSize: '32px', color: 'var(--ant-color-warning)' }} />
                            <div>
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--ant-color-text)' }}>
                                    {teamMembers.filter(m => m.role === 'admin' || m.role === 'owner').length}
                                </div>
                                <div style={{ color: 'var(--ant-color-text-secondary)', fontSize: '13px' }}>
                                    Admins
                                </div>
                            </div>
                        </Space>
                    </Card>
                </Col>
            </Row>

            <Card className="content-card" style={{ marginBottom: '24px' }}>
                <div className="page-toolbar" style={{ flexWrap: 'wrap', gap: 12 }}>
                    <Space size={12} wrap>
                        <AntInput
                            allowClear
                            prefix={<SearchOutlined />}
                            placeholder="Search team members"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: 240 }}
                        />
                        <Segmented
                            value={statusFilter}
                            onChange={(value) => setStatusFilter(value as typeof statusFilter)}
                            options={[
                                { label: 'All', value: 'all' },
                                { label: 'Active', value: 'active' },
                                { label: 'Invited', value: 'invited' },
                                { label: 'Inactive', value: 'inactive' },
                            ]}
                        />
                    </Space>
                    <Space size={12} wrap style={{ marginLeft: 'auto' }}>
                        <Button icon={<ReloadOutlined />} onClick={fetchTeamMembers}>
                            Refresh
                        </Button>
                        <PermissionGuard permission={Permission.ORG_MANAGE_USERS}>
                            <Button 
                                type="primary" 
                                icon={<PlusOutlined />}
                                onClick={() => setIsInviteModalVisible(true)}
                            >
                                Invite Member
                            </Button>
                        </PermissionGuard>
                    </Space>
                </div>
            </Card>
            
            {/* Team Members Table */}
            <Card className="content-card">
                {teamMembers.length === 0 ? (
                    <Empty 
                        description="No team members yet"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    >
                        <Button 
                            type="primary" 
                            icon={<PlusOutlined />}
                            onClick={() => setIsInviteModalVisible(true)}
                        >
                            Invite Your First Member
                        </Button>
                    </Empty>
                ) : (
                    <Table
                        columns={columns}
                        dataSource={teamMembers}
                        rowKey="id"
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `Total ${total} members`
                        }}
                        loading={loading}
                    />
                )}
            </Card>

            {/* Invite Member Modal */}
            <Modal
                title={
                    <Space>
                        <MailOutlined />
                        <span>Invite Team Member</span>
                    </Space>
                }
                open={isInviteModalVisible}
                onCancel={() => {
                    setIsInviteModalVisible(false);
                    form.resetFields();
                }}
                footer={null}
                width={500}
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
                        <Input 
                            prefix={<MailOutlined />}
                            placeholder="Enter email address"
                            size="large"
                        />
                    </Form.Item>
                    
                    <Form.Item
                        name="role"
                        label="Role"
                        rules={[{ required: true, message: 'Please select a role' }]}
                        tooltip="Select the role for this team member"
                    >
                        <Select placeholder="Select role" size="large">
                            <Option value="member">
                                <Space>
                                    <UserOutlined />
                                    <span>Member - Can view and collaborate</span>
                                </Space>
                            </Option>
                            <Option value="manager">
                                <Space>
                                    <TeamOutlined />
                                    <span>Manager - Can manage projects and data</span>
                                </Space>
                            </Option>
                            <Option value="admin">
                                <Space>
                                    <CrownOutlined />
                                    <span>Admin - Full access to organization</span>
                                </Space>
                            </Option>
                        </Select>
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
                        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Button 
                                onClick={() => {
                                    setIsInviteModalVisible(false);
                                    form.resetFields();
                                }}
                                size="large"
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="primary" 
                                htmlType="submit"
                                loading={loading}
                                size="large"
                                icon={<MailOutlined />}
                            >
                                Send Invite
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
