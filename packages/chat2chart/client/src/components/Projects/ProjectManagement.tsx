import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Input as TextArea, Tag, Switch, Row, Col, Modal, Dropdown, Menu, Table, Space, Typography, Form, Select, DatePicker, message } from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  MoreOutlined,
  FolderOutlined,
  TeamOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { getBackendUrlForApi } from '@/utils/backendUrl';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea: AntTextArea } = Input;

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'on-hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: string;
  endDate: string;
  teamMembers: string[];
  progress: number;
  tags: string[];
}

interface ProjectManagementProps {
  organizationId: number;
}

export const ProjectManagement: React.FC<ProjectManagementProps> = ({ organizationId }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchProjects();
  }, [organizationId]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getBackendUrlForApi()}/api/projects?user_id=default`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      const data = await response.json();
      setProjects(data.items || []);
    } catch (err) {
      message.error('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (values: any) => {
    try {
      const response = await fetch(`${getBackendUrlForApi()}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...values, user_id: 'default' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create project');
      }
      
      message.success('Project created successfully');
      setShowCreateModal(false);
      form.resetFields();
      fetchProjects();
    } catch (err) {
      message.error('Failed to create project');
    }
  };

  const handleUpdateProject = async (values: any) => {
    if (!editingProject) return;
    
    try {
      const response = await fetch(`${getBackendUrlForApi()}/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...values, user_id: 'default' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update project');
      }
      
      message.success('Project updated successfully');
      setEditingProject(null);
      form.resetFields();
      fetchProjects();
    } catch (err) {
      message.error('Failed to update project');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/v1/projects/${organizationId}/${projectId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete project');
      }
      
      message.success('Project deleted successfully');
      fetchProjects();
    } catch (err) {
      message.error('Failed to delete project');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'completed': return 'blue';
      case 'on-hold': return 'orange';
      case 'cancelled': return 'red';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={getStatusColor(status)}>{status}</Tag>
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => <Tag color={getPriorityColor(priority)}>{priority}</Tag>
    },
    {
      title: 'Progress',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number) => `${progress}%`
    },
    {
      title: 'Team',
      dataIndex: 'teamMembers',
      key: 'teamMembers',
      render: (members: string[]) => (
        <Space>
          {members.slice(0, 3).map((member, index) => (
            <Tag key={index} icon={<TeamOutlined />}>{member}</Tag>
          ))}
          {members.length > 3 && <Tag>+{members.length - 3}</Tag>}
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Project) => (
        <Space>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => {
              setEditingProject(record);
              form.setFieldsValue(record);
            }}
          />
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDeleteProject(record.id)}
          />
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2}>Project Management</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => setShowCreateModal(true)}
        >
          Create Project
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={projects}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* Create/Edit Modal */}
      <Modal
        title={editingProject ? 'Edit Project' : 'Create Project'}
        open={showCreateModal || !!editingProject}
        onCancel={() => {
          setShowCreateModal(false);
          setEditingProject(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingProject ? handleUpdateProject : handleCreateProject}
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
                name="status"
                label="Status"
                rules={[{ required: true, message: 'Please select status' }]}
              >
                <Select placeholder="Select status">
                  <Option value="active">Active</Option>
                  <Option value="completed">Completed</Option>
                  <Option value="on-hold">On Hold</Option>
                  <Option value="cancelled">Cancelled</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="Priority"
                rules={[{ required: true, message: 'Please select priority' }]}
              >
                <Select placeholder="Select priority">
                  <Option value="low">Low</Option>
                  <Option value="medium">Medium</Option>
                  <Option value="high">High</Option>
                  <Option value="urgent">Urgent</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="progress"
                label="Progress (%)"
                rules={[{ required: true, message: 'Please enter progress' }]}
              >
                <Input type="number" min={0} max={100} placeholder="0-100" />
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

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <AntTextArea rows={4} placeholder="Enter project description" />
          </Form.Item>

          <Form.Item
            name="teamMembers"
            label="Team Members"
          >
            <Select
              mode="tags"
              placeholder="Add team members"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="tags"
            label="Tags"
          >
            <Select
              mode="tags"
              placeholder="Add tags"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingProject ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => {
                setShowCreateModal(false);
                setEditingProject(null);
                form.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};