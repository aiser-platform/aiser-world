"use client";

import React, { useState, useEffect } from 'react';
import {
  Layout,
  Card,
  Tabs,
  Form,
  Input,
  Button,
  Switch,
  Select,
  Avatar,
  Space,
  Typography,
  Row,
  Col,
  message,
  Modal,
  Table,
  Tag,
  Popconfirm,
  Badge,
  Alert,
  Radio,
  Slider
} from 'antd';
import { 
    UserOutlined, 
  SettingOutlined,
  SecurityScanOutlined,
  TeamOutlined,
  DatabaseOutlined,
  BellOutlined,
    GlobalOutlined, 
  KeyOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined
} from '@ant-design/icons';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [profileForm] = Form.useForm();
  const [orgForm] = Form.useForm();
  const [securityForm] = Form.useForm();

  const [userProfile, setUserProfile] = useState<any>(null);
  const [organizationSettings, setOrganizationSettings] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [dataSources, setDataSources] = useState<any[]>([]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Load user profile from real API
      const profileResponse = await fetch('/users/profile', { headers: { 'Content-Type': 'application/json' } });
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        setUserProfile(profile);
        profileForm.setFieldsValue(profile);
      }

      // Load organization settings from real API
      const orgResponse = await fetch('/api/organizations');
      if (orgResponse.ok) {
        const orgs = await orgResponse.json();
        if (orgs.length > 0) {
          setOrganizationSettings(orgs[0]);
          orgForm.setFieldsValue(orgs[0]);
        }
      }

      // Load API keys from real API
      const apiKeysResponse = await fetch('/users/api-keys');
      if (apiKeysResponse.ok) {
        const keys = await apiKeysResponse.json();
        setApiKeys(keys);
      }

      // Load team members from real API
      const teamResponse = await fetch('/api/organizations/1/members');
      if (teamResponse.ok) {
        const members = await teamResponse.json();
        setTeamMembers(members);
      }

      // Load data sources from real API
      const dataSourcesResponse = await fetch('/data/sources');
      if (dataSourcesResponse.ok) {
        const sources = await dataSourcesResponse.json();
        setDataSources(sources.data_sources || []);
      }

    } catch (error) {
      console.error('Error loading settings:', error);
      message.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch('/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });

      if (response.ok) {
        message.success('Profile updated successfully');
        loadSettings(); // Reload to get updated data
      } else {
        message.error('Failed to update profile');
      }
    } catch (error) {
      message.error('Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationUpdate = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/organizations/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });

      if (response.ok) {
        message.success('Organization settings updated successfully');
        loadSettings(); // Reload to get updated data
      } else {
        message.error('Failed to update organization settings');
      }
    } catch (error) {
      message.error('Error updating organization settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSecurityUpdate = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch('/users/security-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });

      if (response.ok) {
        message.success('Security settings updated successfully');
        loadSettings(); // Reload to get updated data
      } else {
        message.error('Failed to update security settings');
      }
    } catch (error) {
      message.error('Error updating security settings');
    } finally {
      setLoading(false);
    }
  };

  const apiKeyColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Key',
      dataIndex: 'key_preview',
      key: 'key_preview',
      render: (text: string) => <Text code>{text}</Text>,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Last Used',
      dataIndex: 'last_used',
      key: 'last_used',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : 'Never',
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: any) => (
        <Space>
          <Popconfirm
            title="Are you sure you want to delete this API key?"
            onConfirm={async () => {
              try {
                const response = await fetch(`/users/api-keys/${record.id}`, {
                  method: 'DELETE'
                });
                if (response.ok) {
                  message.success('API key deleted');
                  loadSettings();
                } else {
                  message.error('Failed to delete API key');
                }
              } catch (error) {
                message.error('Error deleting API key');
              }
            }}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const teamMemberColumns = [
    {
      title: 'User',
      key: 'user',
      render: (record: any) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <div>
            <div>{record.full_name}</div>
            <Text type="secondary">{record.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : role === 'developer' ? 'blue' : 'green'}>
          {role}
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
      title: 'Last Active',
      dataIndex: 'last_accessed',
      key: 'last_accessed',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : 'Never',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: any) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} />
          <Popconfirm
            title="Are you sure you want to remove this team member?"
            onConfirm={async () => {
              try {
                const response = await fetch(`/api/organizations/1/members/${record.user_id}`, {
                  method: 'DELETE'
                });
                if (response.ok) {
                  message.success('Team member removed');
                  loadSettings();
                } else {
                  message.error('Failed to remove team member');
                }
              } catch (error) {
                message.error('Error removing team member');
              }
            }}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const dataSourceColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'database' ? 'blue' : type === 'file' ? 'green' : 'orange'}>
          {type}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'connection_status',
      key: 'connection_status',
      render: (status: string) => (
        <Badge
          status={status === 'connected' ? 'success' : status === 'failed' ? 'error' : 'default'}
          text={status || 'Unknown'}
        />
      ),
    },
    {
      title: 'Last Accessed',
      dataIndex: 'last_accessed',
      key: 'last_accessed',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : 'Never',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: any) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} />
          <Button type="text" icon={<DeleteOutlined />} />
        </Space>
      ),
    },
    ];

    return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Content style={{ padding: '24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Title level={2} style={{ marginBottom: '24px' }}>
            <SettingOutlined /> Settings
                </Title>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'profile',
                label: (
                  <span>
                    <UserOutlined />
                    Profile
                  </span>
                ),
                children: (
                  <Card title="Profile Settings" loading={loading}>
                    <Form
                      form={profileForm}
                      layout="vertical"
                      onFinish={handleProfileUpdate}
                      initialValues={userProfile}
                    >
                      <Row gutter={24}>
                        <Col span={12}>
                          <Form.Item
                            name="username"
                            label="Username"
                            rules={[{ required: true, message: 'Please enter username' }]}
                          >
                            <Input prefix={<UserOutlined />} />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="email"
                            label="Email"
                            rules={[
                              { required: true, message: 'Please enter email' },
                              { type: 'email', message: 'Please enter valid email' }
                            ]}
                          >
                            <Input />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={24}>
                        <Col span={12}>
                          <Form.Item
                            name="full_name"
                            label="Full Name"
                            rules={[{ required: true, message: 'Please enter full name' }]}
                          >
                            <Input />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="role"
                            label="Role"
                          >
                            <Input disabled />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Form.Item>
                        <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                          Save Changes
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>
                )
              },
              {
                key: 'organization',
                label: (
                  <span>
                    <TeamOutlined />
                    Organization
                  </span>
                ),
                children: (
                  <Card title="Organization Settings" loading={loading}>
                    <Form
                      form={orgForm}
                      layout="vertical"
                      onFinish={handleOrganizationUpdate}
                      initialValues={organizationSettings}
                    >
                      <Row gutter={24}>
                        <Col span={12}>
                          <Form.Item
                            name="name"
                            label="Organization Name"
                            rules={[{ required: true, message: 'Please enter organization name' }]}
                          >
                            <Input />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="plan_type"
                            label="Plan Type"
                          >
                            <Input disabled />
                          </Form.Item>
                        </Col>
                      </Row>

                      {organizationSettings && (
                        <Alert
                          message="Plan Information"
                          description={
                            <div>
                              <p><strong>Plan:</strong> {organizationSettings.plan_type}</p>
                              <p><strong>Users:</strong> {organizationSettings.max_users}</p>
                              <p><strong>Projects:</strong> {organizationSettings.max_projects}</p>
                              <p><strong>AI Credits:</strong> {organizationSettings.ai_credits_used} / {organizationSettings.ai_credits_limit}</p>
                            </div>
                          }
                          type="info"
                          showIcon
                          style={{ marginBottom: '16px' }}
                        />
                      )}

                      <Form.Item>
                        <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                          Save Changes
                        </Button>
                      </Form.Item>
                    </Form>
                        </Card>
                )
              },
              {
                key: 'security',
                label: (
                  <span>
                    <SecurityScanOutlined />
                    Security
                  </span>
                ),
                children: (
                  <Card title="Security Settings" loading={loading}>
                    <Form
                      form={securityForm}
                      layout="vertical"
                      onFinish={handleSecurityUpdate}
                    >
                      <Form.Item
                        name="two_factor_enabled"
                        label="Two-Factor Authentication"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>

                      <Form.Item
                        name="session_timeout"
                        label="Session Timeout (minutes)"
                      >
                        <Slider
                          min={15}
                          max={480}
                          marks={{
                            15: '15m',
                            60: '1h',
                            240: '4h',
                            480: '8h'
                          }}
                        />
                      </Form.Item>

                      <Form.Item>
                        <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                          Save Changes
                    </Button>
                      </Form.Item>
                    </Form>
                  </Card>
                )
              },
              {
                key: 'api-keys',
                label: (
                  <span>
                    <KeyOutlined />
                    API Keys
                  </span>
                ),
                children: (
                  <Card
                    title="API Keys"
                    loading={loading}
                    extra={
                    <Button 
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={async () => {
                          try {
                            const response = await fetch('/users/api-keys', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ name: `API Key ${new Date().toISOString()}` })
                            });
                            if (response.ok) {
                              message.success('API key created successfully');
                              loadSettings();
                            } else {
                              message.error('Failed to create API key');
                            }
                          } catch (error) {
                            message.error('Error creating API key');
                          }
                        }}
                      >
                        Create API Key
                    </Button>
                    }
                  >
                    <Table
                      columns={apiKeyColumns}
                      dataSource={apiKeys}
                      rowKey="id"
                      pagination={false}
                    />
                  </Card>
                )
              },
              {
                key: 'team',
                label: (
                  <span>
                    <TeamOutlined />
                    Team
                  </span>
                ),
                children: (
                  <Card
                    title="Team Members"
                    loading={loading}
                    extra={
                                         <Button 
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={async () => {
                          try {
                            const email = prompt('Enter email address to invite:');
                            if (email) {
                              const response = await fetch('/api/organizations/1/members', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ email, role: 'member' })
                              });
                              if (response.ok) {
                                message.success('Team member invited successfully');
                                loadSettings();
                              } else {
                                message.error('Failed to invite team member');
                              }
                            }
                          } catch (error) {
                            message.error('Error inviting team member');
                          }
                        }}
                      >
                        Invite Member
                     </Button>
                    }
                  >
                    <Table
                      columns={teamMemberColumns}
                      dataSource={teamMembers}
                      rowKey="user_id"
                      pagination={false}
                    />
                  </Card>
                )
              },
              {
                key: 'data-sources',
                label: (
                  <span>
                    <DatabaseOutlined />
                    Data Sources
                  </span>
                ),
                children: (
                  <Card title="Data Sources" loading={loading}>
                    <Table
                      columns={dataSourceColumns}
                      dataSource={dataSources}
                      rowKey="id"
                      pagination={false}
                    />
                  </Card>
                )
              }
            ]}
          />
        </div>
      </Content>
    </Layout>
    );
};

export default SettingsPage;