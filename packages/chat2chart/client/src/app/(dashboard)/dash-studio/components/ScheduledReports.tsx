'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Form, 
  Input, 
  Select, 
  DatePicker, 
  TimePicker, 
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
  Tooltip
} from 'antd';
import {
  CalendarOutlined,
  MailOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  SendOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';

const { Option } = Select;
const { Text, Title } = Typography;
const { TextArea } = Input;

export interface ScheduledReport {
  id: string;
  name: string;
  dashboardId: string;
  dashboardName: string;
  schedule: {
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    time: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    cronExpression?: string;
  };
  recipients: {
    emails: string[];
    cc?: string[];
    bcc?: string[];
  };
  format: 'pdf' | 'png' | 'excel' | 'csv';
  subject: string;
  message: string;
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduledReportsProps {
  dashboardId: string;
  dashboardName: string;
  isDarkMode?: boolean;
  onReportCreate?: (report: Omit<ScheduledReport, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onReportUpdate?: (reportId: string, updates: Partial<ScheduledReport>) => Promise<void>;
  onReportDelete?: (reportId: string) => Promise<void>;
  onReportToggle?: (reportId: string, isActive: boolean) => Promise<void>;
}

export const ScheduledReports: React.FC<ScheduledReportsProps> = ({
  dashboardId,
  dashboardName,
  isDarkMode = false,
  onReportCreate,
  onReportUpdate,
  onReportDelete,
  onReportToggle
}) => {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);

  // Load reports on mount
  useEffect(() => {
    loadReports();
  }, [dashboardId]);

  const loadReports = useCallback(async () => {
    try {
      // Mock data - replace with actual API call
      const mockReports: ScheduledReport[] = [
        {
          id: '1',
          name: 'Daily Sales Report',
          dashboardId,
          dashboardName,
          schedule: {
            type: 'daily',
            time: '09:00'
          },
          recipients: {
            emails: ['manager@company.com', 'sales@company.com']
          },
          format: 'pdf',
          subject: 'Daily Sales Dashboard',
          message: 'Please find attached the daily sales dashboard.',
          isActive: true,
          lastRun: new Date('2024-01-15T09:00:00'),
          nextRun: new Date('2024-01-16T09:00:00'),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15')
        },
        {
          id: '2',
          name: 'Weekly Executive Summary',
          dashboardId,
          dashboardName,
          schedule: {
            type: 'weekly',
            time: '08:00',
            dayOfWeek: 1 // Monday
          },
          recipients: {
            emails: ['executive@company.com'],
            cc: ['analyst@company.com']
          },
          format: 'excel',
          subject: 'Weekly Executive Dashboard',
          message: 'Weekly executive summary dashboard.',
          isActive: false,
          lastRun: new Date('2024-01-08T08:00:00'),
          nextRun: new Date('2024-01-22T08:00:00'),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-08')
        }
      ];
      
      setReports(mockReports);
    } catch (error) {
      console.error('Failed to load reports:', error);
      message.error('Failed to load scheduled reports');
    }
  }, [dashboardId]);

  const handleCreateReport = useCallback(() => {
    setEditingReport(null);
    form.resetFields();
    setIsModalVisible(true);
  }, [form]);

  const handleEditReport = useCallback((report: ScheduledReport) => {
    setEditingReport(report);
    form.setFieldsValue({
      ...report,
      schedule: {
        ...report.schedule,
        time: dayjs(report.schedule.time, 'HH:mm')
      }
    });
    setIsModalVisible(true);
  }, [form]);

  const handleDeleteReport = useCallback(async (reportId: string) => {
    try {
      await onReportDelete?.(reportId);
      setReports(prev => prev.filter(r => r.id !== reportId));
      message.success('Report deleted successfully');
    } catch (error) {
      message.error('Failed to delete report');
    }
  }, [onReportDelete]);

  const handleToggleReport = useCallback(async (reportId: string, isActive: boolean) => {
    try {
      await onReportToggle?.(reportId, isActive);
      setReports(prev => prev.map(r => 
        r.id === reportId ? { ...r, isActive } : r
      ));
      message.success(`Report ${isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      message.error('Failed to toggle report status');
    }
  }, [onReportToggle]);

  const handleSubmit = useCallback(async (values: any) => {
    try {
      setIsLoading(true);
      
      const reportData = {
        ...values,
        dashboardId,
        dashboardName,
        schedule: {
          ...values.schedule,
          time: values.schedule.time.format('HH:mm')
        }
      };

      if (editingReport) {
        await onReportUpdate?.(editingReport.id, reportData);
        setReports(prev => prev.map(r => 
          r.id === editingReport.id ? { ...r, ...reportData } : r
        ));
        message.success('Report updated successfully');
      } else {
        await onReportCreate?.(reportData);
        message.success('Report created successfully');
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('Failed to save report');
    } finally {
      setIsLoading(false);
    }
  }, [editingReport, dashboardId, dashboardName, onReportCreate, onReportUpdate, form]);

  const generateCronExpression = useCallback((schedule: any) => {
    const { type, time, dayOfWeek, dayOfMonth } = schedule;
    const [hour, minute] = time.split(':');
    
    switch (type) {
      case 'daily':
        return `${minute} ${hour} * * *`;
      case 'weekly':
        return `${minute} ${hour} * * ${dayOfWeek}`;
      case 'monthly':
        return `${minute} ${hour} ${dayOfMonth} * *`;
      default:
        return schedule.cronExpression || '0 9 * * *';
    }
  }, []);

  const getScheduleDescription = useCallback((schedule: ScheduledReport['schedule']) => {
    const { type, time, dayOfWeek, dayOfMonth } = schedule;
    
    switch (type) {
      case 'daily':
        return `Daily at ${time}`;
      case 'weekly':
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `Weekly on ${days[dayOfWeek || 0]} at ${time}`;
      case 'monthly':
        return `Monthly on day ${dayOfMonth} at ${time}`;
      default:
        return 'Custom schedule';
    }
  }, []);

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ScheduledReport) => (
        <Space>
          <Text strong>{text}</Text>
          <Tag color={record.isActive ? 'green' : 'red'}>
            {record.isActive ? 'Active' : 'Inactive'}
          </Tag>
        </Space>
      )
    },
    {
      title: 'Schedule',
      dataIndex: 'schedule',
      key: 'schedule',
      render: (schedule: ScheduledReport['schedule']) => (
        <Space>
          <CalendarOutlined />
          <Text>{getScheduleDescription(schedule)}</Text>
        </Space>
      )
    },
    {
      title: 'Recipients',
      dataIndex: 'recipients',
      key: 'recipients',
      render: (recipients: ScheduledReport['recipients']) => (
        <Space>
          <MailOutlined />
          <Text>{recipients.emails.length} recipients</Text>
        </Space>
      )
    },
    {
      title: 'Format',
      dataIndex: 'format',
      key: 'format',
      render: (format: string) => (
        <Tag color="blue">{format.toUpperCase()}</Tag>
      )
    },
    {
      title: 'Last Run',
      dataIndex: 'lastRun',
      key: 'lastRun',
      render: (date: Date) => date ? dayjs(date).format('MMM DD, YYYY HH:mm') : 'Never'
    },
    {
      title: 'Next Run',
      dataIndex: 'nextRun',
      key: 'nextRun',
      render: (date: Date) => date ? dayjs(date).format('MMM DD, YYYY HH:mm') : 'Not scheduled'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ScheduledReport) => (
        <Space>
          <Tooltip title={record.isActive ? 'Pause' : 'Resume'}>
            <Button
              size="small"
              icon={record.isActive ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={() => handleToggleReport(record.id, !record.isActive)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditReport(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              size="small"
              icon={<DeleteOutlined />}
              danger
              onClick={() => handleDeleteReport(record.id)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

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
            <CalendarOutlined /> Scheduled Reports
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateReport}
          >
            Create Report
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={reports}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          style={{
            background: isDarkMode ? '#1f1f1f' : '#ffffff'
          }}
        />
      </Card>

      {/* Create/Edit Report Modal */}
      <Modal
        title={editingReport ? 'Edit Scheduled Report' : 'Create Scheduled Report'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={800}
        style={{
          background: isDarkMode ? '#1f1f1f' : '#ffffff'
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            schedule: { type: 'daily', time: dayjs('09:00', 'HH:mm') },
            format: 'pdf',
            recipients: { emails: [] },
            isActive: true
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Report Name"
                rules={[{ required: true, message: 'Please enter report name' }]}
              >
                <Input placeholder="Daily Sales Report" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="format"
                label="Export Format"
                rules={[{ required: true, message: 'Please select format' }]}
              >
                <Select>
                  <Option value="pdf">PDF</Option>
                  <Option value="png">PNG Image</Option>
                  <Option value="excel">Excel</Option>
                  <Option value="csv">CSV</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider>Schedule Settings</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name={['schedule', 'type']}
                label="Schedule Type"
                rules={[{ required: true, message: 'Please select schedule type' }]}
              >
                <Select>
                  <Option value="daily">Daily</Option>
                  <Option value="weekly">Weekly</Option>
                  <Option value="monthly">Monthly</Option>
                  <Option value="custom">Custom Cron</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['schedule', 'time']}
                label="Time"
                rules={[{ required: true, message: 'Please select time' }]}
              >
                <TimePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['schedule', 'dayOfWeek']}
                label="Day of Week"
                dependencies={[['schedule', 'type']]}
              >
                <Select placeholder="Select day">
                  <Option value={0}>Sunday</Option>
                  <Option value={1}>Monday</Option>
                  <Option value={2}>Tuesday</Option>
                  <Option value={3}>Wednesday</Option>
                  <Option value={4}>Thursday</Option>
                  <Option value={5}>Friday</Option>
                  <Option value={6}>Saturday</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider>Email Settings</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="subject"
                label="Email Subject"
                rules={[{ required: true, message: 'Please enter email subject' }]}
              >
                <Input placeholder="Daily Dashboard Report" />
              </Form.Item>
            </Col>
            <Col span={12}>
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
            label="Recipients"
            rules={[{ required: true, message: 'Please enter at least one email' }]}
          >
            <Select
              mode="tags"
              placeholder="Enter email addresses"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="message"
            label="Email Message"
          >
            <TextArea
              rows={3}
              placeholder="Please find attached the dashboard report..."
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={isLoading}>
                {editingReport ? 'Update' : 'Create'} Report
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ScheduledReports;


