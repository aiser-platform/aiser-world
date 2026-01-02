'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Card, 
    Row, 
    Col, 
    Typography, 
    Space, 
    Button, 
    Table, 
    Tag, 
    Input, 
    Select, 
    Modal, 
    Form, 
    message,
    Empty,
    Skeleton,
    Progress,
    Tooltip,
    Statistic,
    Segmented,
    Alert
} from 'antd';
import { 
    ProjectOutlined, 
    PlusOutlined, 
    SearchOutlined,
    TeamOutlined,
    CalendarOutlined,
    EditOutlined,
    DeleteOutlined,
    EyeOutlined,
    ReloadOutlined,
    ArrowUpOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { usePlanRestrictions } from '@/hooks/usePlanRestrictions';
import { usePermissions, Permission } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/PermissionGuard';

const { Title, Text } = Typography;
const { Option } = Select;

const ProjectsPage: React.FC = React.memo(() => {
    const router = useRouter();
    const { showUpgradePrompt, UpgradeModal } = usePlanRestrictions();
    const { hasPermission } = usePermissions();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingProject, setEditingProject] = useState<any>(null);
    const [form] = Form.useForm();
    const [projects, setProjects] = useState<any[]>([]);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'planning' | 'completed' | 'on-hold'>('all');

    const fetchProjects = useCallback(async () => {
        setFetching(true);
        try {
            const response = await fetch('/api/projects', {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                const projectsList = data.items || data || [];
                const mappedProjects = projectsList.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    description: p.description || '',
                    status: p.status || 'active',
                    progress: 0,
                    teamSize: 0,
                    startDate: p.created_at || new Date().toISOString().split('T')[0],
                    endDate: p.updated_at || new Date().toISOString().split('T')[0],
                    priority: 'medium',
                    category: 'analytics'
                }));
                    setProjects(mappedProjects);
                    if (currentOrganization?.id) {
                        await getOrganizationUsage(currentOrganization.id);
                    }
            } else {
                message.warning('Failed to load projects');
            }
        } catch (error) {
            console.error('Failed to fetch projects:', error);
            message.error('Failed to load projects');
        } finally {
            setFetching(false);
        }
    }, [currentOrganization?.id, getOrganizationUsage]);

    useEffect(() => {
        if (currentOrganization?.id) {
            fetchProjects();
        }
    }, [currentOrganization?.id]); // Only depend on organization ID, not the entire function

    const filteredProjects = projects.filter(p => {
        const matchesSearch = !searchText || 
            p.name.toLowerCase().includes(searchText.toLowerCase()) ||
            (p.description && p.description.toLowerCase().includes(searchText.toLowerCase()));
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const stats = React.useMemo(() => ({
        total: projects.length,
        active: projects.filter(p => p.status === 'active').length,
        planning: projects.filter(p => p.status === 'planning').length,
        completed: projects.filter(p => p.status === 'completed').length,
        onHold: projects.filter(p => p.status === 'on-hold').length,
    }), [projects]);

    const projectsLimit = usageStats?.projects_limit ?? -1;
    const projectsUsedFromUsage = usageStats?.projects_count ?? stats.total;
    const projectsUsagePercent = projectsLimit > 0 ? Math.min(100, (projectsUsedFromUsage / projectsLimit) * 100) : 0;
    const canCreateMoreProjects = projectsLimit < 0 || projectsUsedFromUsage < projectsLimit;

    const getStatusColor = React.useCallback((status: string) => {
        switch (status) {
            case 'active': return 'success';
            case 'planning': return 'processing';
            case 'completed': return 'default';
            case 'on-hold': return 'error';
            default: return 'default';
        }
    }, []);

    const getPriorityColor = React.useCallback((priority: string) => {
        switch (priority) {
            case 'high': return 'red';
            case 'medium': return 'orange';
            case 'low': return 'green';
            default: return 'default';
        }
    }, []);

    const columns = React.useMemo(() => [
        {
            title: 'Project Name',
            dataIndex: 'name',
            key: 'name',
            width: '30%',
            render: (text: string, record: any) => (
                <Space direction="vertical" size={2}>
                    <Text strong style={{ fontSize: '15px' }}>{text}</Text>
                    {record.description && (
                        <Text type="secondary" style={{ fontSize: '12px' }} ellipsis>
                            {record.description}
                        </Text>
                    )}
                </Space>
            )
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: '12%',
            render: (status: string) => (
                <Tag color={getStatusColor(status)} style={{ fontSize: '12px', padding: '2px 8px' }}>
                    {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
                </Tag>
            )
        },
        {
            title: 'Progress',
            dataIndex: 'progress',
            key: 'progress',
            width: '15%',
            render: (progress: number) => (
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Progress 
                        percent={progress} 
                        size="small"
                        strokeColor={progress === 100 ? '#52c41a' : 'var(--ant-color-primary)'}
                        showInfo={false}
                    />
                    <Text style={{ fontSize: '12px' }}>{progress}%</Text>
                </Space>
            )
        },
        {
            title: 'Team',
            dataIndex: 'teamSize',
            key: 'teamSize',
            width: '10%',
            render: (size: number) => (
                <Space>
                    <TeamOutlined />
                    <Text>{size || 0} members</Text>
                </Space>
            )
        },
        {
            title: 'Created',
            key: 'created',
            width: '15%',
            render: (record: any) => (
                <Space>
                    <CalendarOutlined style={{ color: 'var(--ant-color-text-tertiary)' }} />
                    <Text style={{ fontSize: '13px' }}>
                        {new Date(record.startDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                    </Text>
                </Space>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            width: '18%',
            render: (record: any) => (
                <Space size="small">
                    <Tooltip title="View project">
                        <Button 
                            type="text" 
                            size="small" 
                            icon={<EyeOutlined />}
                            onClick={() => handleViewProject(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Edit project">
                        <Button 
                            type="text" 
                            size="small" 
                            icon={<EditOutlined />}
                            onClick={() => handleEditProject(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Delete project">
                        <Button 
                            type="text" 
                            size="small" 
                            icon={<DeleteOutlined />}
                            danger
                            onClick={() => handleDeleteProject(record)}
                        />
                    </Tooltip>
                </Space>
            )
        }
    ], [getStatusColor]);

    const handleCreateProject = () => {
        if (!canCreateMoreProjects) {
            const limitText = projectsLimit > -1 ? `${projectsLimit} project${projectsLimit === 1 ? '' : 's'}` : 'your current plan limits';
            showUpgradePrompt('projects_limit', `You've reached ${limitText}. Upgrade your plan to add more workspaces.`);
            return;
        }
        setEditingProject(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEditProject = (project: any) => {
        setEditingProject(project);
        form.setFieldsValue({
            ...project,
            startDate: project.startDate ? new Date(project.startDate) : null,
            endDate: project.endDate ? new Date(project.endDate) : null
        });
        setIsModalVisible(true);
    };

    const handleViewProject = (project: any) => {
        router.push(`/projects/${project.id}`);
    };

    const handleDeleteProject = (project: any) => {
        Modal.confirm({
            title: 'Delete Project',
            content: `Are you sure you want to delete "${project.name}"? This action cannot be undone.`,
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    setLoading(true);
                    const response = await fetch(`/api/projects/${project.id}`, {
                        method: 'DELETE',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    
                    if (response.ok) {
                        message.success('Project deleted successfully');
                        setProjects(projects.filter(p => p.id !== project.id));
                        if (currentOrganization?.id) {
                            await getOrganizationUsage(currentOrganization.id);
                        }
                    } else {
                        const errorText = await response.text();
                        message.error(`Failed to delete project: ${errorText}`);
                    }
                } catch (error) {
                    console.error('Failed to delete project:', error);
                    message.error('Failed to delete project');
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            
            const payload: any = {
                name: values.name,
                description: values.description,
                status: values.status || 'active'
            };
            
            if (editingProject) {
                const response = await fetch(`/api/projects/${editingProject.id}`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (response.ok) {
                    message.success('Project updated successfully');
                    setIsModalVisible(false);
                    const updatedProjects = projects.map(p => 
                        p.id === editingProject.id ? { ...p, ...payload } : p
                    );
                    setProjects(updatedProjects);
                } else {
                    const errorText = await response.text();
                    message.error(`Failed to update project: ${errorText}`);
                }
            } else {
                if (!canCreateMoreProjects) {
                    showUpgradePrompt(
                        'projects_limit',
                        `Your current plan allows ${projectsLimit > -1 ? projectsLimit : 1} project${projectsLimit === 1 ? '' : 's'}. Upgrade to add more workspaces.`
                    );
                    setLoading(false);
                    return;
                }
                // Add organization_id to payload
                if (!currentOrganization?.id) {
                    message.error('No organization selected. Please select an organization first.');
                    return;
                }
                
                const response = await fetch('/api/projects', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...payload,
                        organization_id: currentOrganization.id
                    })
                });
                
                if (response.ok) {
                    const newProject = await response.json();
                    message.success('Project created successfully');
                    setIsModalVisible(false);
                    form.resetFields();
                    setProjects([...projects, {
                        id: newProject.id,
                        name: newProject.name,
                        description: newProject.description || '',
                        status: newProject.status || 'active',
                        progress: 0,
                        teamSize: 0,
                        startDate: newProject.created_at || new Date().toISOString().split('T')[0],
                        endDate: newProject.updated_at || new Date().toISOString().split('T')[0],
                        priority: 'medium',
                        category: 'analytics'
                    }]);
                    await getOrganizationUsage(currentOrganization.id);
                } else {
                    const errorText = await response.text();
                    message.error(`Failed to create project: ${errorText}`);
                }
            }
        } catch (error) {
            console.error('Validation or API call failed:', error);
            message.error('Failed to save project');
        } finally {
            setLoading(false);
        }
    };

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
                    <ProjectOutlined style={{ color: 'var(--ant-color-primary)', fontSize: '24px' }} />
                    Project Management
                </Title>
                <Text type="secondary" className="page-description" style={{ marginTop: '4px', marginBottom: '0' }}>
                    Manage your projects, track progress, and collaborate with your team
                </Text>
            </div>
            <div className="page-body">
            <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={12} md={6}>
                    <Card className="stat-card">
                        <Statistic title="Total Projects" value={stats.total} prefix={<ProjectOutlined />} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card className="stat-card">
                        <Statistic title="Active" value={stats.active} valueStyle={{ color: 'var(--ant-color-success)' }} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card className="stat-card">
                        <Statistic title="Planning" value={stats.planning} valueStyle={{ color: 'var(--ant-color-warning)' }} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card className="stat-card">
                        <Statistic title="On Hold" value={stats.onHold} valueStyle={{ color: 'var(--ant-color-error)' }} />
                    </Card>
                </Col>
            </Row>

            <Card className="content-card" style={{ marginBottom: '24px' }}>
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={18}>
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                            <Text type="secondary">Project workspaces</Text>
                            <Progress
                                percent={projectsUsagePercent}
                                status={projectsUsagePercent >= 90 ? 'exception' : 'active'}
                                strokeColor={projectsUsagePercent >= 90 ? '#ff7875' : 'var(--ant-color-primary)'}
                                format={() =>
                                    projectsLimit < 0
                                        ? `${projectsUsedFromUsage} active`
                                        : `${projectsUsedFromUsage} / ${projectsLimit}`
                                }
                            />
                            <Text>
                                {projectsLimit < 0
                                    ? 'Unlimited workspaces on your plan'
                                    : `${projectsLimit - projectsUsedFromUsage} workspace${projectsLimit - projectsUsedFromUsage === 1 ? '' : 's'} remaining`}
                            </Text>
                        </Space>
                    </Col>
                    <Col xs={24} md={6} style={{ textAlign: 'right' }}>
                        <Button
                            icon={<ArrowUpOutlined />}
                            onClick={() => showUpgradePrompt('projects_limit', 'Upgrade to unlock more project workspaces.')}
                            block
                        >
                            View Plans
                        </Button>
                    </Col>
                </Row>
                {!canCreateMoreProjects && (
                    <Alert
                        type="warning"
                        showIcon
                        style={{ marginTop: 16 }}
                        message="You've reached your project workspace limit. Upgrade to create more."
                    />
                )}
            </Card>

            {/* Filters and Search */}
            <Card className="content-card" style={{ marginBottom: '24px' }}>
                <div className="page-toolbar" style={{ flexWrap: 'wrap', gap: 12 }}>
                    <Space size={12} wrap>
                        <Input
                            allowClear
                            prefix={<SearchOutlined />}
                            placeholder="Search projects"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{ width: 240 }}
                        />
                        <Segmented
                            value={statusFilter}
                            onChange={(value) => setStatusFilter(value as typeof statusFilter)}
                            options={[
                                { label: 'All', value: 'all' },
                                { label: 'Active', value: 'active' },
                                { label: 'Planning', value: 'planning' },
                                { label: 'On Hold', value: 'on-hold' },
                                { label: 'Completed', value: 'completed' },
                            ]}
                        />
                    </Space>
                    <Space size={12} wrap style={{ marginLeft: 'auto' }}>
                        <Button icon={<ReloadOutlined />} onClick={fetchProjects}>
                            Refresh
                        </Button>
                        <PermissionGuard permission={Permission.PROJECT_EDIT}>
                            <Tooltip
                                title={
                                    canCreateMoreProjects
                                        ? 'Create a new project workspace'
                                        : `Reached your plan limit of ${projectsLimit > -1 ? projectsLimit : 1} project${projectsLimit === 1 ? '' : 's'}`
                                }
                            >
                                <Button 
                                    type="primary" 
                                    icon={<PlusOutlined />}
                                    onClick={handleCreateProject}
                                    disabled={!canCreateMoreProjects}
                                >
                                    New Project
                                </Button>
                            </Tooltip>
                        </PermissionGuard>
                    </Space>
                </div>
            </Card>

            {/* Projects Table */}
            <Card className="content-card">
                {filteredProjects.length === 0 ? (
                    <Empty 
                        description={projects.length === 0 ? "No projects yet" : "No projects match your filters"}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    >
                        {projects.length === 0 && (
                            <Tooltip
                                title={
                                    canCreateMoreProjects
                                        ? 'Spin up your first workspace'
                                        : `Reached your plan limit of ${projectsLimit > -1 ? projectsLimit : 1} project${projectsLimit === 1 ? '' : 's'}`
                                }
                            >
                                <Button 
                                    type="primary" 
                                    icon={<PlusOutlined />}
                                    onClick={handleCreateProject}
                                    disabled={!canCreateMoreProjects}
                                >
                                    Create Your First Project
                                </Button>
                            </Tooltip>
                        )}
                    </Empty>
                ) : (
                    <Table 
                        columns={columns} 
                        dataSource={filteredProjects}
                        rowKey="id"
                        loading={loading}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total, range) => 
                                `${range[0]}-${range[1]} of ${total} projects`
                        }}
                    />
                )}
            </Card>

            {/* Create/Edit Project Modal */}
            <Modal
                title={
                    <Space>
                        <ProjectOutlined />
                        <span>{editingProject ? 'Edit Project' : 'Create New Project'}</span>
                    </Space>
                }
                open={isModalVisible}
                onOk={handleModalOk}
                onCancel={() => {
                    setIsModalVisible(false);
                    form.resetFields();
                }}
                width={600}
                okText={editingProject ? 'Update' : 'Create'}
                okButtonProps={{ loading: loading, size: 'large' }}
                cancelButtonProps={{ size: 'large' }}
            >
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ status: 'active' }}
                >
                    <Form.Item
                        name="name"
                        label="Project Name"
                        rules={[{ required: true, message: 'Please enter project name' }]}
                    >
                        <Input placeholder="Enter project name" size="large" />
                    </Form.Item>
                    
                    <Form.Item
                        name="description"
                        label="Description"
                        rules={[{ required: true, message: 'Please enter project description' }]}
                    >
                        <Input.TextArea 
                            rows={3} 
                            placeholder="Enter project description"
                            showCount
                            maxLength={500}
                        />
                    </Form.Item>
                    
                    <Form.Item
                        name="status"
                        label="Status"
                        rules={[{ required: true, message: 'Please select status' }]}
                    >
                        <Select size="large">
                            <Option value="planning">Planning</Option>
                            <Option value="active">Active</Option>
                            <Option value="on-hold">On Hold</Option>
                            <Option value="completed">Completed</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
            <UpgradeModal />
            </div>
        </div>
    );
});

export default ProjectsPage;
