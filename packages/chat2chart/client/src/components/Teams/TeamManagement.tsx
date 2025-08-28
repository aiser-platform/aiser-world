import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Tag, Row, Col, Modal, Select, Table, Space, Typography, Form, message, Avatar, Dropdown, Menu } from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  MoreOutlined,
  UserOutlined,
  TeamOutlined,
  MailOutlined,
  PhoneOutlined
} from '@ant-design/icons';
import { getBackendUrlForApi } from '@/utils/backendUrl';

const { Title, Text } = Typography;
const { Option } = Select;

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  avatar?: string;
  phone?: string;
  department?: string;
  joinDate: string;
}

interface TeamManagementProps {
  organizationId: number;
}

export const TeamManagement: React.FC<TeamManagementProps> = ({ organizationId }) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchTeamMembers();
  }, [organizationId]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getBackendUrlForApi()}/api/organizations/${organizationId}/members`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }
      
      const data = await response.json();
      setTeamMembers(data);
    } catch (err) {
      message.error('Failed to fetch team members');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMember = async (values: any) => {
    try {
      const response = await fetch(`${getBackendUrlForApi()}/api/organizations/${organizationId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create team member');
      }
      
      message.success('Team member created successfully');
      setShowCreateModal(false);
      form.resetFields();
      fetchTeamMembers();
    } catch (err) {
      message.error('Failed to create team member');
    }
  };

  const handleUpdateMember = async (values: any) => {
    if (!editingMember) return;
    
    try {
      const response = await fetch(`${getBackendUrlForApi()}/api/organizations/${organizationId}/members/${editingMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update team member');
      }
      
      message.success('Team member updated successfully');
      setEditingMember(null);
      form.resetFields();
      fetchTeamMembers();
    } catch (err) {
      message.error('Failed to update team member');
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/v1/teams/${organizationId}/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete team member');
      }
      
      message.success('Team member deleted successfully');
      fetchTeamMembers();
    } catch (err) {
      message.error('Failed to delete team member');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'red';
      case 'pending': return 'orange';
      default: return 'default';
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

  const columns = [
    {
      title: 'Member',
      key: 'member',
      render: (record: TeamMember) => (
        <Space>
          <Avatar 
            src={record.avatar} 
            icon={<UserOutlined />}
            size="large"
          />
          <div>
            <div><Text strong>{record.name}</Text></div>
            <div><Text type="secondary">{record.email}</Text></div>
          </div>
        </Space>
      )
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => <Tag color={getRoleColor(role)}>{role}</Tag>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={getStatusColor(status)}>{status}</Tag>
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      render: (dept: string) => dept || 'N/A'
    },
    {
      title: 'Join Date',
      dataIndex: 'joinDate',
      key: 'joinDate',
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: TeamMember) => (
        <Space>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => {
              setEditingMember(record);
              form.setFieldsValue(record);
            }}
          />
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDeleteMember(record.id)}
          />
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2}>Team Management</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => setShowCreateModal(true)}
        >
          Add Team Member
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={teamMembers}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* Create/Edit Modal */}
      <Modal
        title={editingMember ? 'Edit Team Member' : 'Add Team Member'}
        open={showCreateModal || !!editingMember}
        onCancel={() => {
          setShowCreateModal(false);
          setEditingMember(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingMember ? handleUpdateMember : handleCreateMember}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Full Name"
                rules={[{ required: true, message: 'Please enter full name' }]}
              >
                <Input placeholder="Enter full name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input placeholder="Enter email address" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="role"
                label="Role"
                rules={[{ required: true, message: 'Please select role' }]}
              >
                <Select placeholder="Select role">
                  <Option value="admin">Admin</Option>
                  <Option value="manager">Manager</Option>
                  <Option value="member">Member</Option>
                </Select>
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
                  <Option value="inactive">Inactive</Option>
                  <Option value="pending">Pending</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Phone"
              >
                <Input placeholder="Enter phone number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="department"
                label="Department"
              >
                <Input placeholder="Enter department" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingMember ? 'Update' : 'Add Member'}
              </Button>
              <Button onClick={() => {
                setShowCreateModal(false);
                setEditingMember(null);
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