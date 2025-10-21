'use client';

// Simple dynamic configuration that actually works

import React, { useState } from 'react';
import { Card, Row, Col, Typography, Space, Button, Table, Tag, Input, Select, DatePicker, Modal, Form, message } from 'antd';
import { 
    ProjectOutlined, 
    PlusOutlined, 
    SearchOutlined,
    TeamOutlined,
    CalendarOutlined,
    BarChartOutlined,
    EditOutlined,
    DeleteOutlined,
    EyeOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const ProjectsPage: React.FC = React.memo(() => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [form] = Form.useForm();

    // Mock data - replace with real data from your backend
    const projects = React.useMemo(() => [
        {
            id: 1,
            name: 'E-commerce Analytics Dashboard',
            description: 'Comprehensive analytics dashboard for online retail business',
            status: 'active',
            progress: 75,
            teamSize: 5,
            startDate: '2024-06-01',
            endDate: '2024-09-30',
            priority: 'high',
            category: 'analytics'
        },
        {
            id: 2,
            name: 'Customer Segmentation Model',
            description: 'AI-powered customer segmentation using machine learning',
            status: 'planning',
            progress: 25,
            teamSize: 3,
            startDate: '2024-08-01',
            endDate: '2024-11-30',
            priority: 'medium',
            category: 'ai'
        },
        {
            id: 3,
            name: 'Data Pipeline Optimization',
            description: 'Optimize ETL processes for better performance',
            status: 'completed',
            progress: 100,
            teamSize: 4,
            startDate: '2024-05-01',
            endDate: '2024-07-15',
            priority: 'low',
            category: 'infrastructure'
        }
    ], []);

    const getStatusColor = React.useCallback((status: string) => {
        switch (status) {
            case 'active': return 'blue';
            case 'planning': return 'orange';
            case 'completed': return 'green';
            case 'on-hold': return 'red';
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
            render: (text: string, record: any) => (
                <div>
                    <Text strong>{text}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                        {record.description}
                    </Text>
                </div>
            )
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={getStatusColor(status)}>
                    {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
                </Tag>
            )
        },
        {
            title: 'Progress',
            dataIndex: 'progress',
            key: 'progress',
            render: (progress: number) => (
                <div>
                    <Text strong>{progress}%</Text>
                    <div style={{ width: 100, marginTop: 4 }}>
                        <div 
                            style={{ 
                                width: `${progress}%`, 
                                height: 6, 
                                backgroundColor: progress === 100 ? 'var(--color-functional-success)' : 'var(--color-brand-primary)',
                                borderRadius: 3
                            }} 
                        />
                    </div>
                </div>
            )
        },
        {
            title: 'Team',
            dataIndex: 'teamSize',
            key: 'teamSize',
            render: (size: number) => (
                <div className="flex items-center">
                    <TeamOutlined style={{ marginRight: 4 }} />
                    <Text>{size} members</Text>
                </div>
            )
        },
        {
            title: 'Timeline',
            key: 'timeline',
            render: (record: any) => (
                <div>
                    <div className="flex items-center mb-1">
                        <CalendarOutlined style={{ marginRight: 4, fontSize: 'var(--font-size-sm)' }} />
                        <Text style={{ fontSize: 'var(--font-size-sm)' }}>
                            {new Date(record.startDate).toLocaleDateString()}
                        </Text>
                    </div>
                    <div className="flex items-center">
                        <CalendarOutlined style={{ marginRight: 4, fontSize: 'var(--font-size-sm)' }} />
                        <Text style={{ fontSize: 'var(--font-size-sm)' }}>
                            {new Date(record.endDate).toLocaleDateString()}
                        </Text>
                    </div>
                </div>
            )
        },
        {
            title: 'Priority',
            dataIndex: 'priority',
            key: 'priority',
            render: (priority: string) => (
                <Tag color={getPriorityColor(priority)}>
                    {priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'Unknown'}
                </Tag>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (record: any) => (
                <Space size="small">
                    <Button 
                        type="text" 
                        size="small" 
                        icon={<EyeOutlined />}
                        onClick={() => handleViewProject(record)}
                    />
                    <Button 
                        type="text" 
                        size="small" 
                        icon={<EditOutlined />}
                        onClick={() => handleEditProject(record)}
                    />
                    <Button 
                        type="text" 
                        size="small" 
                        icon={<DeleteOutlined />}
                        danger
                        onClick={() => handleDeleteProject(record)}
                    />
                </Space>
            )
        }
    ], [getStatusColor, getPriorityColor]);

    const handleCreateProject = () => {
        setEditingProject(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEditProject = (project: any) => {
        setEditingProject(project);
        form.setFieldsValue(project);
        setIsModalVisible(true);
    };

    const handleViewProject = (project: any) => {
        // Navigate to project detail page
        router.push(`/projects/${project.id}`);
    };

    const handleDeleteProject = (project: any) => {
        Modal.confirm({
            title: 'Delete Project',
            content: `Are you sure you want to delete "${project.name}"?`,
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: () => {
                message.success('Project deleted successfully');
                // Add your delete logic here
            }
        });
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            if (editingProject) {
                message.success('Project updated successfully');
            } else {
                message.success('Project created successfully');
            }
            setIsModalVisible(false);
            // Add your create/update logic here
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="mb-8">
                <Title level={2}>
                    <ProjectOutlined style={{ marginRight: 12, color: 'var(--color-brand-primary)' }} />
                    Project Management
                </Title>
                <Text type="secondary">
                    Manage your projects, track progress, and collaborate with your team
                </Text>
            </div>

            {/* Filters and Search */}
            <Card className="mb-6">
                <Row gutter={16} align="middle">
                    <Col span={6}>
                        <Search
                            placeholder="Search projects..."
                            allowClear
                            enterButton={<SearchOutlined />}
                        />
                    </Col>
                    <Col span={4}>
                        <Select placeholder="Status" allowClear style={{ width: '100%' }}>
                            <Option value="active">Active</Option>
                            <Option value="planning">Planning</Option>
                            <Option value="completed">Completed</Option>
                            <Option value="on-hold">On Hold</Option>
                        </Select>
                    </Col>
                    <Col span={4}>
                        <Select placeholder="Priority" allowClear style={{ width: '100%' }}>
                            <Option value="high">High</Option>
                            <Option value="medium">Medium</Option>
                            <Option value="low">Low</Option>
                        </Select>
                    </Col>
                    <Col span={4}>
                        <Select placeholder="Category" allowClear style={{ width: '100%' }}>
                            <Option value="analytics">Analytics</Option>
                            <Option value="ai">AI/ML</Option>
                            <Option value="infrastructure">Infrastructure</Option>
                        </Select>
                    </Col>
                    <Col span={6} style={{ textAlign: 'right' }}>
                        <Button 
                            type="primary" 
                            icon={<PlusOutlined />}
                            onClick={handleCreateProject}
                        >
                            New Project
                        </Button>
                    </Col>
                </Row>
            </Card>

            {/* Projects Table */}
            <Card>
                <Table 
                    columns={columns} 
                    dataSource={projects}
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
            </Card>

            {/* Create/Edit Project Modal */}
            <Modal
                title={editingProject ? 'Edit Project' : 'Create New Project'}
                open={isModalVisible}
                onOk={handleModalOk}
                onCancel={() => setIsModalVisible(false)}
                width={600}
                okText={editingProject ? 'Update' : 'Create'}
            >
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ status: 'planning', priority: 'medium' }}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="name"
                                label="Project Name"
                                rules={[{ required: true, message: 'Please enter project name' }]}
                            >
                                <Input placeholder="Enter project name" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="category"
                                label="Category"
                                rules={[{ required: true, message: 'Please select category' }]}
                            >
                                <Select placeholder="Select category">
                                    <Option value="analytics">Analytics</Option>
                                    <Option value="ai">AI/ML</Option>
                                    <Option value="infrastructure">Infrastructure</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <Form.Item
                        name="description"
                        label="Description"
                        rules={[{ required: true, message: 'Please enter project description' }]}
                    >
                        <Input.TextArea rows={3} placeholder="Enter project description" />
                    </Form.Item>
                    
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item
                                name="status"
                                label="Status"
                                rules={[{ required: true, message: 'Please select status' }]}
                            >
                                <Select>
                                    <Option value="planning">Planning</Option>
                                    <Option value="active">Active</Option>
                                    <Option value="on-hold">On Hold</Option>
                                    <Option value="completed">Completed</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="priority"
                                label="Priority"
                                rules={[{ required: true, message: 'Please select priority' }]}
                            >
                                <Select>
                                    <Option value="low">Low</Option>
                                    <Option value="medium">Medium</Option>
                                    <Option value="high">High</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="teamSize"
                                label="Team Size"
                                rules={[{ required: true, message: 'Please enter team size' }]}
                            >
                                <Input type="number" min={1} placeholder="Team size" />
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="startDate"
                                label="Start Date"
                                rules={[{ required: true, message: 'Please select start date' }]}
                            >
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="endDate"
                                label="End Date"
                                rules={[{ required: true, message: 'Please select end date' }]}
                            >
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </div>
    );
});

export default ProjectsPage;
