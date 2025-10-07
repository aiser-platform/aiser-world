'use client';

import React, { useState, useEffect } from 'react';
import { Select, Button, Modal, Form, Input, Typography, Space, Tag, Tooltip, Checkbox, Row, Col } from 'antd';
import { PlusOutlined, FolderOutlined, TeamOutlined, SettingOutlined, EditOutlined } from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { getBackendUrlForApi } from '@/utils/backendUrl';
import './ProjectSelector.css';

const { Option } = Select;
const { Text, Title } = Typography;

interface Project {
    id: number;
    name: string;
    description?: string;
    organization_id: number;
    created_by: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    data_source_count?: number;
    conversation_count?: number;
}

interface Organization {
    id: number;
    name: string;
    plan_type: 'free' | 'pro' | 'enterprise';
    max_projects: number;
    max_users: number;
    max_storage_gb: number;
}

interface ProjectSelectorProps {
    currentProjectId?: number;
    onProjectChange?: (projectId: number) => void;
    className?: string;
    isHeader?: boolean; // New prop to indicate if used in header
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
    currentProjectId,
    onProjectChange,
    className,
    isHeader = false
}) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();
    const { user } = useAuth();
    // Type assertion for user since the actual user object has more properties than the interface
    const userWithId = user as { id?: string };
    const router = useRouter();

    // Default project change handler for header usage
    const handleProjectChange = (v: any) => {
        const value = (v && typeof v === 'object') ? v.value : v;
        const numericProjectId = typeof value === 'string' ? parseInt(value, 10) : value;
        if (onProjectChange) {
            onProjectChange(numericProjectId);
        } else if (isHeader) {
            localStorage.setItem('currentProjectId', String(numericProjectId));
        }
    };

    useEffect(() => {
        loadProjects();
        loadOrganizations();
    }, []);

    const loadProjects = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${getBackendUrlForApi()}/api/projects?user_id=${userWithId?.id || 'default'}`);
            if (response.ok) {
                const data = await response.json();
                // API returns { items: [...], pagination: {...} }
                setProjects(data.items || []);
            }
        } catch (error) {
            console.error('Failed to load projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadOrganizations = async () => {
        try {
            const response = await fetch(`${getBackendUrlForApi()}/api/organizations`);
            if (response.ok) {
                const data = await response.json();
                // API returns array directly
                setOrganizations(data || []);
            }
        } catch (error) {
            console.error('Failed to load organizations:', error);
        }
    };

    const handleCreateProject = async (values: { name: string; description?: string; organization_id: number; category?: string; is_public?: boolean }) => {
        try {
            setLoading(true);
            const response = await fetch(`${getBackendUrlForApi()}/api/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...values,
                    user_id: userWithId?.id || 'default'
                }),
            });

            if (response.ok) {
                const newProject = await response.json();
                setProjects(prev => [...prev, newProject]);
                setModalVisible(false);
                form.resetFields();
                
                // Switch to the new project
                handleProjectChange(newProject.id);
            } else {
                throw new Error('Failed to create project');
            }
        } catch (error) {
            console.error('Failed to create project:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditProject = async (values: { name: string; description?: string; organization_id: number; category?: string; is_public?: boolean }) => {
        if (!editingProject) return;
        
        try {
            setLoading(true);
            const response = await fetch(`${getBackendUrlForApi()}/api/projects/${editingProject.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...values,
                    user_id: userWithId?.id || 'default'
                }),
            });

            if (response.ok) {
                const updatedProject = await response.json();
                setProjects(prev => prev.map(p => 
                    p.id === editingProject.id ? updatedProject : p
                ));
                setEditModalVisible(false);
                setEditingProject(null);
                editForm.resetFields();
            } else {
                throw new Error('Failed to update project');
            }
        } catch (error) {
            console.error('Failed to update project:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDoubleClickEdit = (project: Project) => {
        setEditingProject(project);
        editForm.setFieldsValue({
            name: project.name,
            description: project.description,
            organization_id: project.organization_id
        });
        setEditModalVisible(true);
    };

    const handleProjectSettings = () => {
        if (currentProject) {
            router.push('/projects');
        }
    };

    const getCurrentProject = () => {
        return projects.find(p => p.id === currentProjectId) || projects[0];
    };

    const getOrganizationForProject = (project: Project) => {
        return organizations.find(org => org.id === project.organization_id);
    };

    const canCreateProject = () => {
        const currentOrg = getCurrentProject() ? getOrganizationForProject(getCurrentProject()!) : organizations[0];
        if (!currentOrg) return false;
        
        const currentProjectCount = projects.filter(p => 
            p.organization_id === currentOrg.id
        ).length;
        
        return currentProjectCount < currentOrg.max_projects;
    };

    const getPlanColor = (planType: string) => {
        switch (planType) {
            case 'enterprise': return 'purple';
            case 'pro': return 'blue';
            case 'free': return 'green';
            default: return 'default';
        }
    };

    const getPlanDisplayName = (planType: string) => {
        switch (planType) {
            case 'enterprise': return 'Enterprise';
            case 'pro': return 'Pro';
            case 'free': return 'Free';
            default: return planType;
        }
    };

    const currentProject = getCurrentProject();

    // Don't render if user is not authenticated
    if (!user) {
        return null;
    }

    return (
        <div className={`project-selector ${className || ''} ${isHeader ? 'header-mode' : ''}`}>
            <Space size="small">
                <Tooltip title={isHeader ? "Double-click project to edit" : "Select Project"}>
                    <Select
                        labelInValue
                        value={currentProject ? { value: currentProject.id.toString(), label: currentProject.name } : undefined}
                        onChange={handleProjectChange}
                        loading={loading}
                        style={{ minWidth: isHeader ? 260 : 200 }}
                        dropdownMatchSelectWidth={false}
                        placeholder={projects.length === 0 ? "No Projects" : (currentProject ? currentProject.name : "Select Project")}
                        suffixIcon={<FolderOutlined />}
                        disabled={projects.length === 0}
                        optionLabelProp="label"
                    >
                        {projects.length === 0 ? (
                            <Option value="" disabled>
                                <Text type="secondary">No projects available</Text>
                            </Option>
                        ) : (
                            projects.map(project => (
                                <Option key={project.id} value={project.id} label={project.name}>
                                    <div 
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                        onDoubleClick={() => handleDoubleClickEdit(project)}
                                    >
                                        <Space>
                                            <FolderOutlined />
                                            <Text strong>{project.name}</Text>
                                        </Space>
                                        <Space size="small">
                                            {project.data_source_count && project.data_source_count > 0 && (
                                                <Tag color="blue">
                                                    {project.data_source_count} DS
                                                </Tag>
                                            )}
                                            {project.conversation_count && project.conversation_count > 0 && (
                                                <Tag color="green">
                                                    {project.conversation_count} Conv
                                                </Tag>
                                            )}
                                        </Space>
                                    </div>
                                </Option>
                            ))
                        )}
                    </Select>
                </Tooltip>

                {canCreateProject() && (
                    <Tooltip title="Create New Project">
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            size="small"
                            onClick={() => setModalVisible(true)}
                        />
                    </Tooltip>
                )}

                {currentProject && (
                    <Tooltip title="Project Settings">
                        <Button
                            type="text"
                            icon={<SettingOutlined />}
                            size="small"
                            onClick={handleProjectSettings}
                        />
                    </Tooltip>
                )}
            </Space>

            {/* Create Project Modal */}
            <Modal
                title="Create New Project"
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                destroyOnClose
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreateProject}
                    initialValues={{
                        category: 'general',
                        is_public: false
                    }}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="name"
                                label="Project Name"
                                rules={[{ required: true, message: 'Please enter project name' }]}
                            >
                                <Input placeholder="e.g., Sales Analytics, Marketing Campaign" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="category"
                                label="Project Category"
                                rules={[{ required: true, message: 'Please select a category' }]}
                            >
                                <Select placeholder="Select category">
                                    <Option value="general">General</Option>
                                    <Option value="sales">Sales & Revenue</Option>
                                    <Option value="marketing">Marketing & Campaigns</Option>
                                    <Option value="finance">Finance & Budget</Option>
                                    <Option value="operations">Operations & Logistics</Option>
                                    <Option value="customer">Customer Analytics</Option>
                                    <Option value="product">Product Development</Option>
                                    <Option value="hr">Human Resources</Option>
                                    <Option value="research">Research & Development</Option>
                                    <Option value="custom">Custom</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="description"
                        label="Description"
                    >
                        <Input.TextArea 
                            placeholder="Describe your project goals and objectives"
                            rows={3}
                        />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="is_public"
                                label="Project Visibility"
                                valuePropName="checked"
                            >
                                <Checkbox>Make project public</Checkbox>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="organization_id"
                                label="Organization"
                                rules={[{ required: true, message: 'Please select organization' }]}
                            >
                                <Select placeholder="Select organization">
                                    {organizations.map(org => (
                                        <Option key={org.id} value={org.id}>
                                            {org.name} ({getPlanDisplayName(org.plan_type)})
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <div style={{ textAlign: 'right', marginTop: 16 }}>
                        <Button onClick={() => setModalVisible(false)} style={{ marginRight: 8 }}>
                            Cancel
                        </Button>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            Create Project
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* Edit Project Modal */}
            <Modal
                title="Edit Project"
                open={editModalVisible}
                onCancel={() => setEditModalVisible(false)}
                footer={null}
                destroyOnClose
            >
                <Form
                    form={editForm}
                    layout="vertical"
                    onFinish={handleEditProject}
                >
                    <Form.Item
                        name="name"
                        label="Project Name"
                        rules={[{ required: true, message: 'Please enter project name' }]}
                    >
                        <Input placeholder="e.g., Sales Department, Marketing Analytics" />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="Description"
                    >
                        <Input.TextArea 
                            placeholder="Describe your project (optional)"
                            rows={3}
                        />
                    </Form.Item>

                    <Form.Item
                        name="organization_id"
                        label="Organization"
                    >
                        <Select placeholder="Select organization">
                            {organizations.map(org => (
                                <Option key={org.id} value={org.id}>
                                    <Space>
                                        <TeamOutlined />
                                        <Text>{org.name}</Text>
                                        <Tag color={getPlanColor(org.plan_type)}>
                                            {org.plan_type.toUpperCase()}
                                        </Tag>
                                    </Space>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button 
                                type="primary" 
                                htmlType="submit" 
                                loading={loading}
                            >
                                Update Project
                            </Button>
                            <Button onClick={() => setEditModalVisible(false)}>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ProjectSelector;
