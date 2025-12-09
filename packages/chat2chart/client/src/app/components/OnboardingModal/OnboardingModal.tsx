"use client";

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Steps,
  Form,
  Input,
  Button,
  Select,
  Card,
  Typography,
  Space,
  Divider,
  Row,
  Col,
  message,
  Progress,
  Alert,
  Checkbox,
  Upload,
  Avatar,
  Radio
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  DatabaseOutlined,
  DashboardOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  RocketOutlined,
  StarOutlined,
  HeartOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

interface OnboardingModalProps {
  visible: boolean;
  onComplete: () => void;
  onCancel: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({
  visible,
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const [onboardingData, setOnboardingData] = useState({
    // Step 1: Welcome
    welcome: {
      name: '',
      role: '',
      company: '',
      goals: []
    },
    // Step 2: Organization Setup
    organization: {
      name: '',
      description: '',
      industry: '',
      team_size: '',
      use_cases: []
    },
    // Step 3: Data Sources
    data_sources: {
      sources: [],
      has_data: false,
      data_types: []
    },
    // Step 4: Dashboard Preferences
    dashboard: {
      template: '',
      widgets: [],
      layout: 'grid',
      theme: 'light'
    },
    // Step 5: Team Setup
    team: {
      invite_members: false,
      member_emails: [],
      roles: []
    }
  });

  const steps: OnboardingStep[] = [
    {
      key: 'welcome',
      title: 'Welcome to Aicser',
      description: 'Tell us about yourself',
      icon: <UserOutlined />,
      component: (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Avatar size={80} icon={<RocketOutlined />} style={{ backgroundColor: '#1890ff', marginBottom: '16px' }} />
            <Title level={2}>Welcome to Aiser Platform! 🚀</Title>
            <Paragraph style={{ fontSize: '16px', color: '#666' }}>
              Let's get you set up in just a few minutes. We'll help you create your first dashboard and connect your data.
            </Paragraph>
          </div>

          <Form.Item
            name="name"
            label="What's your name?"
            rules={[{ required: true, message: 'Please enter your name' }]}
          >
            <Input size="large" placeholder="Enter your full name" />
          </Form.Item>

          <Form.Item
            name="role"
            label="What's your role?"
            rules={[{ required: true, message: 'Please select your role' }]}
          >
            <Select size="large" placeholder="Select your role">
              <Option value="data_analyst">Data Analyst</Option>
              <Option value="business_analyst">Business Analyst</Option>
              <Option value="data_scientist">Data Scientist</Option>
              <Option value="product_manager">Product Manager</Option>
              <Option value="executive">Executive</Option>
              <Option value="developer">Developer</Option>
              <Option value="other">Other</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="company"
            label="Company/Organization"
            rules={[{ required: true, message: 'Please enter your company' }]}
          >
            <Input size="large" placeholder="Enter your company name" />
          </Form.Item>

          <Form.Item
            name="goals"
            label="What are your main goals with Aiser?"
          >
            <Checkbox.Group>
              <Row>
                <Col span={12}>
                  <Checkbox value="data_visualization">Create data visualizations</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="business_intelligence">Business intelligence</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="reporting">Automated reporting</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="analytics">Advanced analytics</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="monitoring">Real-time monitoring</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="collaboration">Team collaboration</Checkbox>
                </Col>
              </Row>
            </Checkbox.Group>
          </Form.Item>
        </div>
      )
    },
    {
      key: 'organization',
      title: 'Organization Setup',
      description: 'Configure your workspace',
      icon: <TeamOutlined />,
      component: (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Title level={3}>Let's set up your organization</Title>
            <Paragraph style={{ color: '#666' }}>
              This will help us customize your experience and provide relevant features.
            </Paragraph>
          </div>

          <Form.Item
            name="org_name"
            label="Organization Name"
            rules={[{ required: true, message: 'Please enter organization name' }]}
          >
            <Input size="large" placeholder="Enter your organization name" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description (Optional)"
          >
            <TextArea rows={3} placeholder="Tell us about your organization" />
          </Form.Item>

          <Form.Item
            name="industry"
            label="Industry"
            rules={[{ required: true, message: 'Please select your industry' }]}
          >
            <Select size="large" placeholder="Select your industry">
              <Option value="technology">Technology</Option>
              <Option value="finance">Finance</Option>
              <Option value="healthcare">Healthcare</Option>
              <Option value="retail">Retail</Option>
              <Option value="manufacturing">Manufacturing</Option>
              <Option value="education">Education</Option>
              <Option value="government">Government</Option>
              <Option value="nonprofit">Non-profit</Option>
              <Option value="other">Other</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="team_size"
            label="Team Size"
            rules={[{ required: true, message: 'Please select team size' }]}
          >
            <Select size="large" placeholder="Select your team size">
              <Option value="1-10">1-10 people</Option>
              <Option value="11-50">11-50 people</Option>
              <Option value="51-200">51-200 people</Option>
              <Option value="201-1000">201-1000 people</Option>
              <Option value="1000+">1000+ people</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="use_cases"
            label="Primary Use Cases"
          >
            <Checkbox.Group>
              <Row>
                <Col span={12}>
                  <Checkbox value="sales_analytics">Sales Analytics</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="marketing_analytics">Marketing Analytics</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="financial_reporting">Financial Reporting</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="operational_monitoring">Operational Monitoring</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="customer_analytics">Customer Analytics</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="performance_tracking">Performance Tracking</Checkbox>
                </Col>
              </Row>
            </Checkbox.Group>
          </Form.Item>
        </div>
      )
    },
    {
      key: 'data_sources',
      title: 'Data Sources',
      description: 'Connect your data',
      icon: <DatabaseOutlined />,
      component: (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Title level={3}>Connect your data sources</Title>
            <Paragraph style={{ color: '#666' }}>
              Aiser works with many data sources. Let's connect yours to get started.
            </Paragraph>
          </div>

          <Alert
            message="Don't worry if you don't have data yet!"
            description="You can always connect data sources later. We'll provide sample data to help you explore Aiser's features."
            type="info"
            showIcon
            style={{ marginBottom: '24px' }}
          />

          <Form.Item
            name="has_data"
            label="Do you have data sources to connect?"
            rules={[{ required: true, message: 'Please select an option' }]}
          >
            <Select size="large" placeholder="Select an option">
              <Option value={true}>Yes, I have data sources</Option>
              <Option value={false}>No, I'll use sample data for now</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="data_types"
            label="What types of data do you work with?"
          >
            <Checkbox.Group>
              <Row>
                <Col span={12}>
                  <Checkbox value="databases">Databases (PostgreSQL, MySQL, etc.)</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="files">Files (CSV, Excel, JSON)</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="apis">APIs (REST, GraphQL)</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="cloud">Cloud Services (AWS, Google Cloud)</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="crm">CRM Systems (Salesforce, HubSpot)</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="analytics">Analytics Tools (Google Analytics, Mixpanel)</Checkbox>
                </Col>
              </Row>
            </Checkbox.Group>
          </Form.Item>

          <Card style={{ marginTop: '24px', backgroundColor: '#f9f9f9' }}>
            <Title level={4}>🎯 Quick Start Options</Title>
            <Row gutter={16}>
              <Col span={8}>
                <Card size="small" hoverable>
                  <Title level={5}>Sample Data</Title>
                  <Text>Explore with pre-built datasets</Text>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" hoverable>
                  <Title level={5}>Upload File</Title>
                  <Text>Upload CSV or Excel files</Text>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" hoverable>
                  <Title level={5}>Connect Database</Title>
                  <Text>Connect to your database</Text>
                </Card>
              </Col>
            </Row>
          </Card>
        </div>
      )
    },
    {
      key: 'dashboard',
      title: 'Dashboard Setup',
      description: 'Choose your template',
      icon: <DashboardOutlined />,
      component: (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Title level={3}>Create your first dashboard</Title>
            <Paragraph style={{ color: '#666' }}>
              Choose a template that matches your needs, or start with a blank canvas.
            </Paragraph>
          </div>

          <Form.Item
            name="template"
            label="Dashboard Template"
            rules={[{ required: true, message: 'Please select a template' }]}
          >
            <Select size="large" placeholder="Select a template">
              <Option value="blank">Blank Dashboard</Option>
              <Option value="executive">Executive Dashboard</Option>
              <Option value="sales">Sales Analytics</Option>
              <Option value="marketing">Marketing Analytics</Option>
              <Option value="financial">Financial Reporting</Option>
              <Option value="operational">Operational Monitoring</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="layout"
            label="Layout Preference"
          >
            <Radio.Group>
              <Radio value="grid">Grid Layout</Radio>
              <Radio value="freeform">Freeform Layout</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="theme"
            label="Theme Preference"
          >
            <Radio.Group>
              <Radio value="light">Light Theme</Radio>
              <Radio value="dark">Dark Theme</Radio>
              <Radio value="auto">Auto (System)</Radio>
            </Radio.Group>
          </Form.Item>

          <Card style={{ marginTop: '24px' }}>
            <Title level={4}>🎨 Preview</Title>
            <div style={{ 
              height: '200px', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <div style={{ textAlign: 'center' }}>
                <DashboardOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                <Title level={4} style={{ color: 'white', margin: 0 }}>
                  Your Dashboard Preview
                </Title>
                <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                  This is how your dashboard will look
                </Text>
              </div>
            </div>
          </Card>
        </div>
      )
    },
    {
      key: 'team',
      title: 'Team Setup',
      description: 'Invite your team',
      icon: <TeamOutlined />,
      component: (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Title level={3}>Invite your team</Title>
            <Paragraph style={{ color: '#666' }}>
              Collaboration makes everything better. Invite your team members to get started together.
            </Paragraph>
          </div>

          <Form.Item
            name="invite_members"
            label="Would you like to invite team members now?"
            rules={[{ required: true, message: 'Please select an option' }]}
          >
            <Radio.Group>
              <Radio value={true}>Yes, invite team members</Radio>
              <Radio value={false}>No, I'll do this later</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="member_emails"
            label="Team Member Emails"
            extra="Enter email addresses separated by commas"
          >
            <TextArea 
              rows={4} 
              placeholder="john@company.com, jane@company.com, bob@company.com"
            />
          </Form.Item>

          <Card style={{ marginTop: '24px', backgroundColor: '#f0f9ff' }}>
            <Title level={4}>👥 Team Benefits</Title>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Collaborate on dashboards in real-time</li>
              <li>Share insights and reports</li>
              <li>Set up automated alerts</li>
              <li>Manage permissions and access</li>
              <li>Track team activity and usage</li>
            </ul>
          </Card>
        </div>
      )
    }
  ];

  const handleNext = async () => {
    try {
      const values = await form.validateFields();
      
      // Save current step data
      const stepKey = steps[currentStep].key;
      setOnboardingData(prev => ({
        ...prev,
        [stepKey]: values
      }));

      // Mark step as completed
      setCompletedSteps(prev => [...prev, currentStep]);

      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        // Complete onboarding
        await handleComplete();
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Send onboarding data to backend
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(onboardingData)
      });

      if (response.ok) {
        message.success('Welcome to Aiser! Your workspace is ready.');
        onComplete();
      } else {
        message.error('Failed to complete onboarding');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      message.error('Error completing onboarding');
    } finally {
      setLoading(false);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Modal
      title={
        <div style={{ textAlign: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>
            <RocketOutlined /> Welcome to Aiser Platform
          </Title>
          <Progress 
            percent={progress} 
            size="small" 
            style={{ marginTop: '8px' }}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      centered
      closable={false}
    >
      <div style={{ minHeight: '500px' }}>
        <Steps
          current={currentStep}
          size="small"
          style={{ marginBottom: '32px' }}
        >
          {steps.map((step, index) => (
            <Steps.Step
              key={step.key}
              title={step.title}
              description={step.description}
              icon={step.icon}
              status={completedSteps.includes(index) ? 'finish' : currentStep === index ? 'process' : 'wait'}
            />
          ))}
        </Steps>

        <Form
          form={form}
          layout="vertical"
          preserve={false}
        >
          {steps[currentStep].component}
        </Form>

        <Divider />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            onClick={handlePrev}
            disabled={currentStep === 0}
            icon={<ArrowLeftOutlined />}
          >
            Previous
          </Button>

          <Space>
            <Text type="secondary">
              Step {currentStep + 1} of {steps.length}
            </Text>
            <Button
              type="primary"
              onClick={handleNext}
              loading={loading}
              icon={currentStep === steps.length - 1 ? <CheckCircleOutlined /> : <ArrowRightOutlined />}
            >
              {currentStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
            </Button>
          </Space>
        </div>
      </div>
    </Modal>
  );
};

export default OnboardingModal;
