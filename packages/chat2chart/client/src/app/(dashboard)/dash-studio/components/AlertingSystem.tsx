'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Form, 
  Input, 
  Select, 
  InputNumber, 
  Switch, 
  Space, 
  Typography, 
  Table, 
  Tag, 
  Modal, 
  message,
  Row,
  Col,
  Divider,
  Tooltip,
  Alert,
  Badge
} from 'antd';
import {
  BellOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  MailOutlined,
  MessageOutlined,
  SlackOutlined,
  ApiOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { Text, Title } = Typography;
const { TextArea } = Input;

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  widgetId: string;
  widgetName: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'contains' | 'not_contains';
  threshold: number | string;
  timeWindow: number; // minutes
  isActive: boolean;
  channels: {
    email: boolean;
    slack: boolean;
    webhook: boolean;
  };
  recipients: {
    emails: string[];
    slackChannel?: string;
    webhookUrl?: string;
  };
  cooldown: number; // minutes
  lastTriggered?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertInstance {
  id: string;
  ruleId: string;
  ruleName: string;
  widgetName: string;
  metric: string;
  value: number | string;
  threshold: number | string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  status: 'active' | 'acknowledged' | 'resolved';
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  acknowledgedBy?: string;
}

export interface AlertingSystemProps {
  dashboardId: string;
  widgets: Array<{ id: string; title: string; type: string }>;
  isDarkMode?: boolean;
  onRuleCreate?: (rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onRuleUpdate?: (ruleId: string, updates: Partial<AlertRule>) => Promise<void>;
  onRuleDelete?: (ruleId: string) => Promise<void>;
  onRuleToggle?: (ruleId: string, isActive: boolean) => Promise<void>;
  onAlertAcknowledge?: (alertId: string, userId: string) => Promise<void>;
  onAlertResolve?: (alertId: string, userId: string) => Promise<void>;
}

export const AlertingSystem: React.FC<AlertingSystemProps> = ({
  dashboardId,
  widgets,
  isDarkMode = false,
  onRuleCreate,
  onRuleUpdate,
  onRuleDelete,
  onRuleToggle,
  onAlertAcknowledge,
  onAlertResolve
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'alerts'>('rules');
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [alerts, setAlerts] = useState<AlertInstance[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadRules();
    loadAlerts();
  }, [dashboardId]);

  const loadRules = useCallback(async () => {
    try {
      // Mock data - replace with actual API call
      const mockRules: AlertRule[] = [
        {
          id: '1',
          name: 'High Error Rate',
          description: 'Alert when error rate exceeds 5%',
          widgetId: 'widget-1',
          widgetName: 'Error Rate Chart',
          metric: 'error_rate',
          condition: 'greater_than',
          threshold: 5,
          timeWindow: 5,
          isActive: true,
          channels: {
            email: true,
            slack: true,
            webhook: false
          },
          recipients: {
            emails: ['devops@company.com'],
            slackChannel: '#alerts'
          },
          cooldown: 30,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15')
        },
        {
          id: '2',
          name: 'Low Response Time',
          description: 'Alert when response time drops below 100ms',
          widgetId: 'widget-2',
          widgetName: 'Response Time Chart',
          metric: 'response_time',
          condition: 'less_than',
          threshold: 100,
          timeWindow: 10,
          isActive: false,
          channels: {
            email: true,
            slack: false,
            webhook: true
          },
          recipients: {
            emails: ['performance@company.com'],
            webhookUrl: 'https://hooks.slack.com/services/...'
          },
          cooldown: 60,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-10')
        }
      ];
      
      setRules(mockRules);
    } catch (error) {
      console.error('Failed to load rules:', error);
      message.error('Failed to load alert rules');
    }
  }, [dashboardId]);

  const loadAlerts = useCallback(async () => {
    try {
      // Mock data - replace with actual API call
      const mockAlerts: AlertInstance[] = [
        {
          id: '1',
          ruleId: '1',
          ruleName: 'High Error Rate',
          widgetName: 'Error Rate Chart',
          metric: 'error_rate',
          value: 7.2,
          threshold: 5,
          severity: 'high',
          message: 'Error rate has exceeded threshold: 7.2% > 5%',
          status: 'active',
          triggeredAt: new Date('2024-01-15T14:30:00')
        },
        {
          id: '2',
          ruleId: '1',
          ruleName: 'High Error Rate',
          widgetName: 'Error Rate Chart',
          metric: 'error_rate',
          value: 6.8,
          threshold: 5,
          severity: 'medium',
          message: 'Error rate has exceeded threshold: 6.8% > 5%',
          status: 'acknowledged',
          triggeredAt: new Date('2024-01-15T13:45:00'),
          acknowledgedAt: new Date('2024-01-15T13:50:00'),
          acknowledgedBy: 'john.doe@company.com',
        }
      ];
      
      setAlerts(mockAlerts);
    } catch (error) {
      console.error('Failed to load alerts:', error);
      message.error('Failed to load alerts');
    }
  }, [dashboardId]);

  const handleCreateRule = useCallback(() => {
    setEditingRule(null);
    form.resetFields();
    setIsModalVisible(true);
  }, [form]);

  const handleEditRule = useCallback((rule: AlertRule) => {
    setEditingRule(rule);
    form.setFieldsValue(rule);
    setIsModalVisible(true);
  }, [form]);

  const handleDeleteRule = useCallback(async (ruleId: string) => {
    try {
      await onRuleDelete?.(ruleId);
      setRules(prev => prev.filter(r => r.id !== ruleId));
      message.success('Alert rule deleted successfully');
    } catch (error) {
      message.error('Failed to delete alert rule');
    }
  }, [onRuleDelete]);

  const handleToggleRule = useCallback(async (ruleId: string, isActive: boolean) => {
    try {
      await onRuleToggle?.(ruleId, isActive);
      setRules(prev => prev.map(r => 
        r.id === ruleId ? { ...r, isActive } : r
      ));
      message.success(`Alert rule ${isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      message.error('Failed to toggle alert rule');
    }
  }, [onRuleToggle]);

  const handleAcknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      await onAlertAcknowledge?.(alertId, 'current-user');
      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { 
          ...a, 
          status: 'acknowledged' as const,
          acknowledgedAt: new Date(),
          acknowledgedBy: 'current-user'
        } : a
      ));
      message.success('Alert acknowledged');
    } catch (error) {
      message.error('Failed to acknowledge alert');
    }
  }, [onAlertAcknowledge]);

  const handleResolveAlert = useCallback(async (alertId: string) => {
    try {
      await onAlertResolve?.(alertId, 'current-user');
      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { 
          ...a, 
          status: 'resolved' as const,
          resolvedAt: new Date()
        } : a
      ));
      message.success('Alert resolved');
    } catch (error) {
      message.error('Failed to resolve alert');
    }
  }, [onAlertResolve]);

  const handleSubmit = useCallback(async (values: any) => {
    try {
      setIsLoading(true);
      
      const ruleData = {
        ...values,
        dashboardId,
      };

      if (editingRule) {
        await onRuleUpdate?.(editingRule.id, ruleData);
        setRules(prev => prev.map(r => 
          r.id === editingRule.id ? { ...r, ...ruleData } : r
        ));
        message.success('Alert rule updated successfully');
      } else {
        await onRuleCreate?.(ruleData);
        message.success('Alert rule created successfully');
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('Failed to save alert rule');
    } finally {
      setIsLoading(false);
    }
  }, [editingRule, dashboardId, onRuleCreate, onRuleUpdate, form]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'blue';
      case 'medium': return 'orange';
      case 'high': return 'red';
      case 'critical': return 'purple';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'red';
      case 'acknowledged': return 'orange';
      case 'resolved': return 'green';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <AlertOutlined />;
      case 'acknowledged': return <ExclamationCircleOutlined />;
      case 'resolved': return <CheckCircleOutlined />;
      default: return null;
    }
  };

  const rulesColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: AlertRule) => (
        <Space>
          <Text strong>{text}</Text>
          <Tag color={record.isActive ? 'green' : 'red'}>
            {record.isActive ? 'Active' : 'Inactive'}
          </Tag>
        </Space>
      )
    },
    {
      title: 'Widget',
      dataIndex: 'widgetName',
      key: 'widgetName'
    },
    {
      title: 'Condition',
      key: 'condition',
      render: (_: any, record: AlertRule) => (
        <Text>
          {record.metric} {record.condition.replace('_', ' ')} {record.threshold}
        </Text>
      )
    },
    {
      title: 'Channels',
      dataIndex: 'channels',
      key: 'channels',
      render: (channels: AlertRule['channels']) => (
        <Space>
          {channels.email && <Tag icon={<MailOutlined />}>Email</Tag>}
          {channels.slack && <Tag icon={<SlackOutlined />}>Slack</Tag>}
          {channels.webhook && <Tag icon={<ApiOutlined />}>Webhook</Tag>}
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: AlertRule) => (
        <Space>
          <Tooltip title={record.isActive ? 'Pause' : 'Resume'}>
            <Button
              size="small"
              icon={record.isActive ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={() => handleToggleRule(record.id, !record.isActive)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditRule(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              size="small"
              icon={<DeleteOutlined />}
              danger
              onClick={() => handleDeleteRule(record.id)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  const alertsColumns = [
    {
      title: 'Rule',
      dataIndex: 'ruleName',
      key: 'ruleName',
      render: (text: string, record: AlertInstance) => (
        <Space>
          <Text strong>{text}</Text>
          <Tag color={getSeverityColor(record.severity)}>
            {record.severity.toUpperCase()}
          </Tag>
        </Space>
      )
    },
    {
      title: 'Widget',
      dataIndex: 'widgetName',
      key: 'widgetName'
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Triggered',
      dataIndex: 'triggeredAt',
      key: 'triggeredAt',
      render: (date: Date) => new Date(date).toLocaleString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: AlertInstance) => (
        <Space>
          {record.status === 'active' && (
            <Button
              size="small"
              onClick={() => handleAcknowledgeAlert(record.id)}
            >
              Acknowledge
            </Button>
          )}
          {record.status === 'acknowledged' && (
            <Button
              size="small"
              type="primary"
              onClick={() => handleResolveAlert(record.id)}
            >
              Resolve
            </Button>
          )}
        </Space>
      )
    }
  ];

  const activeAlertsCount = alerts.filter(a => a.status === 'active').length;
  const totalRulesCount = rules.length;
  const activeRulesCount = rules.filter(r => r.isActive).length;

  return (
    <div style={{ padding: 24 }}>
      <Card
        style={{
          background: isDarkMode ? '#1f1f1f' : '#ffffff',
          border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0, color: isDarkMode ? '#ffffff' : '#000000' }}>
            <BellOutlined /> Alerting System
          </Title>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateRule}
            >
              Create Rule
            </Button>
          </Space>
        </div>

        {/* Summary Cards */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Badge count={activeAlertsCount} style={{ backgroundColor: '#ff4d4f' }}>
                <BellOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
              </Badge>
              <div style={{ marginTop: 8 }}>
                <Text strong>Active Alerts</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Badge count={activeRulesCount} style={{ backgroundColor: '#52c41a' }}>
                <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
              </Badge>
              <div style={{ marginTop: 8 }}>
                <Text strong>Active Rules</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Badge count={totalRulesCount} style={{ backgroundColor: '#1890ff' }}>
                <AlertOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              </Badge>
              <div style={{ marginTop: 8 }}>
                <Text strong>Total Rules</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Badge count={alerts.length} style={{ backgroundColor: '#722ed1' }}>
                <MessageOutlined style={{ fontSize: 24, color: '#722ed1' }} />
              </Badge>
              <div style={{ marginTop: 8 }}>
                <Text strong>Total Alerts</Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Tab Navigation */}
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button
              type={activeTab === 'rules' ? 'primary' : 'default'}
              onClick={() => setActiveTab('rules')}
            >
              Alert Rules ({totalRulesCount})
            </Button>
            <Button
              type={activeTab === 'alerts' ? 'primary' : 'default'}
              onClick={() => setActiveTab('alerts')}
            >
              Active Alerts ({activeAlertsCount})
            </Button>
          </Space>
        </div>

        {/* Tables */}
        {activeTab === 'rules' && (
          <Table
            columns={rulesColumns}
            dataSource={rules}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        )}

        {activeTab === 'alerts' && (
          <Table
            columns={alertsColumns}
            dataSource={alerts}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      {/* Create/Edit Rule Modal */}
      <Modal
        title={editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            channels: { email: true, slack: false, webhook: false },
            cooldown: 30,
            timeWindow: 5,
            isActive: true
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Rule Name"
                rules={[{ required: true, message: 'Please enter rule name' }]}
              >
                <Input placeholder="High Error Rate" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="widgetId"
                label="Widget"
                rules={[{ required: true, message: 'Please select widget' }]}
              >
                <Select placeholder="Select widget">
                  {widgets.map(widget => (
                    <Option key={widget.id} value={widget.id}>
                      {widget.title}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea rows={2} placeholder="Alert when error rate exceeds 5%" />
          </Form.Item>

          <Divider>Alert Condition</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="metric"
                label="Metric"
                rules={[{ required: true, message: 'Please enter metric' }]}
              >
                <Input placeholder="error_rate" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="condition"
                label="Condition"
                rules={[{ required: true, message: 'Please select condition' }]}
              >
                <Select>
                  <Option value="greater_than">Greater Than</Option>
                  <Option value="less_than">Less Than</Option>
                  <Option value="equals">Equals</Option>
                  <Option value="not_equals">Not Equals</Option>
                  <Option value="contains">Contains</Option>
                  <Option value="not_contains">Not Contains</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="threshold"
                label="Threshold"
                rules={[{ required: true, message: 'Please enter threshold' }]}
              >
                <InputNumber placeholder="5" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Notification Settings</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="timeWindow"
                label="Time Window (minutes)"
                rules={[{ required: true, message: 'Please enter time window' }]}
              >
                <InputNumber placeholder="5" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="cooldown"
                label="Cooldown (minutes)"
                rules={[{ required: true, message: 'Please enter cooldown' }]}
              >
                <InputNumber placeholder="30" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="isActive"
                label="Active"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name={['recipients', 'emails']}
            label="Email Recipients"
            rules={[{ required: true, message: 'Please enter at least one email' }]}
          >
            <Select
              mode="tags"
              placeholder="Enter email addresses"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={isLoading}>
                {editingRule ? 'Update' : 'Create'} Rule
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AlertingSystem;


