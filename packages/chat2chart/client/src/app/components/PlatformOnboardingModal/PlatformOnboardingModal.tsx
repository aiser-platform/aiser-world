'use client';

import React, { useState } from 'react';
import {
  Modal,
  Steps,
  Button,
  Typography,
  Space,
  Card,
  Row,
  Col,
  message,
  Progress,
  Avatar,
  Divider,
  Tag,
  List,
  Tooltip,
  Form,
  Input,
  Select,
  Checkbox,
  Radio,
  Slider,
  Switch
} from 'antd';
import {
  RocketOutlined,
  DatabaseOutlined,
  MessageOutlined,
  DashboardOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  StarOutlined,
  HeartOutlined,
  BulbOutlined,
  TeamOutlined,
  BarChartOutlined,
  FileTextOutlined,
  CloudOutlined,
  ApiOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useOnboarding } from '@/context/OnboardingContext';
import { useAuth } from '@/context/AuthContext';

const { Title, Text, Paragraph } = Typography;

const PlatformOnboardingModal: React.FC = () => {
  const { 
    isOnboardingActive, 
    currentStep, 
    totalSteps, 
    onboardingData,
    nextStep, 
    prevStep, 
    completeOnboarding, 
    skipOnboarding,
    updateOnboardingData,
    markStepCompleted
  } = useOnboarding();
  
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const steps = [
    {
      key: 'welcome',
      title: 'Welcome to Aiser',
      description: 'Tell us about yourself',
      icon: <RocketOutlined />,
      content: (
        <div style={{ padding: '16px', maxHeight: '500px', overflowY: 'auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <Avatar 
              size={60} 
              icon={<RocketOutlined />} 
              style={{ 
                backgroundColor: '#1890ff', 
                marginBottom: '12px',
                fontSize: '30px'
              }} 
            />
            <Title level={4} style={{ marginBottom: '8px' }}>
              Welcome to Aiser Platform! 🚀
            </Title>
            <Paragraph style={{ color: '#666', fontSize: '14px' }}>
              Hi {user?.email?.split('@')[0] || 'there'}! Let's personalize your experience.
            </Paragraph>
          </div>

          <Form
            form={form}
            layout="vertical"
            preserve={false}
            onFinish={(values) => {
              // Backwards compatibility: accept `fullName` or `name` and split to first/last
              try {
                if (values.fullName && (!values.firstName || !values.lastName)) {
                  const parts = String(values.fullName || '').trim().split(/\s+/);
                  values.firstName = values.firstName || parts.shift() || '';
                  values.lastName = values.lastName || parts.join(' ') || '';
                  delete values.fullName;
                }
                if (values.name && (!values.firstName || !values.lastName)) {
                  const parts = String(values.name || '').trim().split(/\s+/);
                  values.firstName = values.firstName || parts.shift() || '';
                  values.lastName = values.lastName || parts.join(' ') || '';
                  delete values.name;
                }
              } catch (e) {
                // ignore splitting errors and proceed with whatever was provided
              }

              updateOnboardingData(values);
              markStepCompleted('welcome');
            }}
          >
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Form.Item
                  name="firstName"
                  label="First Name"
                  rules={[{ required: true, message: 'Please enter your first name' }]}
                >
                  <Input placeholder="First name" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="lastName"
                  label="Last Name"
                  rules={[{ required: true, message: 'Please enter your last name' }]}
                >
                  <Input placeholder="Last name" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="username"
                  label="Username"
                  rules={[{ required: true, message: 'Please choose a username' }]}
                >
                  <Input placeholder="Username" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="jobTitle"
                  label="Job Title"
                  rules={[{ required: true, message: 'Please enter your job title' }]}
                >
                  <Input placeholder="e.g., Data Analyst, Manager, CEO" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Form.Item
                  name="organization"
                  label="Organization/Company"
                  rules={[{ required: true, message: 'Please enter your organization' }]}
                >
                  <Input placeholder="Your company or organization name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="industry"
                  label="Industry"
                  rules={[{ required: true, message: 'Please select your industry' }]}
                >
                  <Select placeholder="Select your industry">
                    <Select.Option value="technology">Technology</Select.Option>
                    <Select.Option value="finance">Finance & Banking</Select.Option>
                    <Select.Option value="healthcare">Healthcare</Select.Option>
                    <Select.Option value="retail">Retail & E-commerce</Select.Option>
                    <Select.Option value="manufacturing">Manufacturing</Select.Option>
                    <Select.Option value="education">Education</Select.Option>
                    <Select.Option value="government">Government</Select.Option>
                    <Select.Option value="nonprofit">Non-profit</Select.Option>
                    <Select.Option value="consulting">Consulting</Select.Option>
                    <Select.Option value="media">Media & Entertainment</Select.Option>
                    <Select.Option value="real_estate">Real Estate</Select.Option>
                    <Select.Option value="logistics">Logistics & Transportation</Select.Option>
                    <Select.Option value="energy">Energy & Utilities</Select.Option>
                    <Select.Option value="other">Other</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="companySize"
              label="Company Size"
              rules={[{ required: true, message: 'Please select company size' }]}
            >
              <Select placeholder="Select company size">
                <Select.Option value="1-10">1-10 employees</Select.Option>
                <Select.Option value="11-50">11-50 employees</Select.Option>
                <Select.Option value="51-200">51-200 employees</Select.Option>
                <Select.Option value="201-1000">201-1000 employees</Select.Option>
                <Select.Option value="1000+">1000+ employees</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="primaryUseCase"
              label="Primary Use Case for Aiser"
              rules={[{ required: true, message: 'Please select your primary use case' }]}
            >
              <Radio.Group>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Radio value="business_intelligence">Business Intelligence & Reporting</Radio>
                  </Col>
                  <Col span={12}>
                    <Radio value="data_analysis">Data Analysis & Exploration</Radio>
                  </Col>
                  <Col span={12}>
                    <Radio value="sales_analytics">Sales & Revenue Analytics</Radio>
                  </Col>
                  <Col span={12}>
                    <Radio value="marketing_analytics">Marketing & Campaign Analytics</Radio>
                  </Col>
                  <Col span={12}>
                    <Radio value="operational_monitoring">Operational Monitoring</Radio>
                  </Col>
                  <Col span={12}>
                    <Radio value="financial_reporting">Financial Reporting</Radio>
                  </Col>
                  <Col span={12}>
                    <Radio value="customer_analytics">Customer Analytics</Radio>
                  </Col>
                  <Col span={12}>
                    <Radio value="research">Research & Development</Radio>
                  </Col>
                </Row>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="dataExperience"
              label="Data Analysis Experience Level"
              rules={[{ required: true, message: 'Please select your experience level' }]}
            >
              <Radio.Group>
                <Radio value="beginner">Beginner - New to data analysis</Radio>
                <Radio value="intermediate">Intermediate - Some experience with data</Radio>
                <Radio value="advanced">Advanced - Experienced with BI tools</Radio>
                <Radio value="expert">Expert - Data scientist/analyst</Radio>
              </Radio.Group>
            </Form.Item>



            <Form.Item
              name="dataFrequency"
              label="How often do you work with data?"
              rules={[{ required: true, message: 'Please select frequency' }]}
            >
              <Radio.Group>
                <Radio value="daily">Daily</Radio>
                <Radio value="weekly">Weekly</Radio>
                <Radio value="monthly">Monthly</Radio>
                <Radio value="occasionally">Occasionally</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="goals"
              label="What are your main goals with Aiser?"
            >
              <Checkbox.Group>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Checkbox value="automate_reporting">Automate reporting</Checkbox>
                  </Col>
                  <Col span={12}>
                    <Checkbox value="improve_decisions">Improve decision making</Checkbox>
                  </Col>
                  <Col span={12}>
                    <Checkbox value="save_time">Save time on analysis</Checkbox>
                  </Col>
                  <Col span={12}>
                    <Checkbox value="team_collaboration">Team collaboration</Checkbox>
                  </Col>
                  <Col span={12}>
                    <Checkbox value="data_visualization">Better data visualization</Checkbox>
                  </Col>
                  <Col span={12}>
                    <Checkbox value="real_time_insights">Real-time insights</Checkbox>
                  </Col>
                </Row>
              </Checkbox.Group>
            </Form.Item>
          </Form>
        </div>
      )
    },
    {
      key: 'data-sources',
      title: 'Connect Your Data',
      description: 'Link your data sources',
      icon: <DatabaseOutlined />,
      content: (
        <div style={{ padding: '16px', maxHeight: '500px', overflowY: 'auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <Title level={4}>Connect Your Data Sources</Title>
            <Paragraph style={{ color: '#666', fontSize: '14px' }}>
              Choose how you'd like to get started with Aiser.
            </Paragraph>
          </div>

          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card 
                hoverable
                style={{ 
                  textAlign: 'center', 
                  height: '220px',
                  border: onboardingData.preferredDataSource === 'file' ? '2px solid #52c41a' : '1px solid #d9d9d9'
                }}
                onClick={() => {
                  updateOnboardingData({ preferredDataSource: 'file' });
                  markStepCompleted('data-sources');
                }}
              >
                <FileTextOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
                <Title level={4}>Upload Files</Title>
                <Text type="secondary">CSV, Excel, JSON files</Text>
                <div style={{ marginTop: '12px' }}>
                  <Tag color="green">Recommended for beginners</Tag>
                </div>
              </Card>
            </Col>
            <Col span={8}>
              <Card 
                hoverable
                style={{ 
                  textAlign: 'center', 
                  height: '220px',
                  border: onboardingData.preferredDataSource === 'database' ? '2px solid #1890ff' : '1px solid #d9d9d9'
                }}
                onClick={() => {
                  updateOnboardingData({ preferredDataSource: 'database' });
                  markStepCompleted('data-sources');
                }}
              >
                <DatabaseOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
                <Title level={4}>Connect Database</Title>
                <Text type="secondary">PostgreSQL, MySQL, etc.</Text>
                <div style={{ marginTop: '12px' }}>
                  <Tag color="blue">For live data</Tag>
                </div>
              </Card>
            </Col>
            <Col span={8}>
              <Card 
                hoverable
                style={{ 
                  textAlign: 'center', 
                  height: '220px',
                  border: onboardingData.preferredDataSource === 'api' ? '2px solid #fa8c16' : '1px solid #d9d9d9'
                }}
                onClick={() => {
                  updateOnboardingData({ preferredDataSource: 'api' });
                  markStepCompleted('data-sources');
                }}
              >
                <ApiOutlined style={{ fontSize: '48px', color: '#fa8c16', marginBottom: '16px' }} />
                <Title level={4}>Connect APIs</Title>
                <Text type="secondary">REST, GraphQL endpoints</Text>
                <div style={{ marginTop: '12px' }}>
                  <Tag color="orange">For real-time data</Tag>
                </div>
              </Card>
            </Col>
          </Row>

          <Divider />

          <Card style={{ backgroundColor: '#f0f9ff', border: '1px solid #91d5ff', marginBottom: '16px' }}>
            <Title level={4}>💡 Pro Tip</Title>
            <Paragraph style={{ margin: 0 }}>
              Don't have data yet? No problem! We'll provide sample datasets so you can explore Aiser's features right away.
            </Paragraph>
          </Card>

          <Card style={{ backgroundColor: '#fff7e6', border: '1px solid #ffd591' }}>
            <Title level={4}>🎯 Quick Start Options</Title>
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Card size="small" hoverable>
                  <Title level={5}>Sample Sales Data</Title>
                  <Text type="secondary">Pre-loaded dataset to explore</Text>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" hoverable>
                  <Title level={5}>Upload Your File</Title>
                  <Text type="secondary">CSV or Excel file</Text>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" hoverable>
                  <Title level={5}>Connect Database</Title>
                  <Text type="secondary">Live data connection</Text>
                </Card>
              </Col>
            </Row>
          </Card>
        </div>
      )
    },
    {
      key: 'chat-demo',
      title: 'Watch Chat Demo',
      description: 'See Aiser in action',
      icon: <MessageOutlined />,
      content: (
        <div style={{ padding: '16px', maxHeight: '500px', overflowY: 'auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <Title level={4}>Watch Aiser Chat Demo</Title>
            <Paragraph style={{ color: '#666', fontSize: '14px' }}>
              See how easy it is to ask questions and get instant visualizations.
            </Paragraph>
          </div>

          {/* Demo Placeholder */}
          <Card style={{ 
            backgroundColor: '#f5f5f5', 
            border: '2px dashed #d9d9d9',
            textAlign: 'center',
            padding: '40px',
            marginBottom: '24px'
          }}>
            <PlayCircleOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
            <Title level={4}>🎬 Interactive Demo</Title>
            <Paragraph style={{ color: '#666', marginBottom: '16px' }}>
              Watch how users ask questions like "Show me sales trends" and get instant charts
            </Paragraph>
            <Button type="primary" size="large" icon={<PlayCircleOutlined />}>
              Play Demo
            </Button>
          </Card>

          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card title="💬 Try These Examples" size="small">
                <List
                  size="small"
                  dataSource={[
                    'Show me sales trends over time',
                    'What are the top 10 products?',
                    'Create a pie chart of regions',
                    'Compare this year vs last year'
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <Text code style={{ fontSize: '12px' }}>{item}</Text>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="🎯 What You Get" size="small">
                <List
                  size="small"
                  dataSource={[
                    'Instant charts and graphs',
                    'AI-powered insights',
                    'One-click dashboard creation',
                    'Share with your team'
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                      <Text style={{ fontSize: '12px' }}>{item}</Text>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </div>
      )
    },

    {
      key: 'complete',
      title: 'You\'re All Set!',
      description: 'Start your journey',
      icon: <CheckCircleOutlined />,
      content: (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Avatar 
            size={100} 
            icon={<CheckCircleOutlined />} 
            style={{ 
              backgroundColor: '#52c41a', 
              marginBottom: '24px',
              fontSize: '48px'
            }} 
          />
          <Title level={2} style={{ marginBottom: '16px' }}>
            You're Ready to Go! 🎉
          </Title>
          <Paragraph style={{ fontSize: '18px', color: '#666', marginBottom: '32px' }}>
            Congratulations! You now know how to use Aiser to transform your data into insights.
          </Paragraph>
          
          <Card style={{ textAlign: 'left', marginBottom: '24px' }}>
            <Title level={4}>🎯 Your Next Steps:</Title>
            <List
              dataSource={[
                '1. Add your data source (CSV, database, or API)',
                '2. Go to Chat and ask: "Show me sales trends"',
                '3. Create your first chart with one click',
                '4. Add charts to your dashboard',
                '5. Share insights with your team'
              ]}
              renderItem={(item) => (
                <List.Item>
                  <Text strong>{item}</Text>
                </List.Item>
              )}
            />
          </Card>

          <div style={{ 
            background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
            borderRadius: '12px',
            padding: '24px',
            color: 'white',
            marginBottom: '24px'
          }}>
            <Title level={4} style={{ color: 'white', marginBottom: '16px' }}>
              🚀 Pro Tips for Success
            </Title>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text style={{ color: 'rgba(255,255,255,0.9)' }}>
                  • Start with simple questions
                </Text>
              </Col>
              <Col span={12}>
                <Text style={{ color: 'rgba(255,255,255,0.9)' }}>
                  • Use specific data references
                </Text>
              </Col>
              <Col span={12}>
                <Text style={{ color: 'rgba(255,255,255,0.9)' }}>
                  • Experiment with different chart types
                </Text>
              </Col>
              <Col span={12}>
                <Text style={{ color: 'rgba(255,255,255,0.9)' }}>
                  • Save your favorite queries
                </Text>
              </Col>
            </Row>
          </div>

          <Space size="large">
            <Tooltip title="Get help anytime">
              <Button size="large" icon={<TeamOutlined />}>
                Need Help?
              </Button>
            </Tooltip>
            <Tooltip title="Join our community">
              <Button size="large" icon={<StarOutlined />}>
                Community
              </Button>
            </Tooltip>
          </Space>
        </div>
      )
    }
  ];

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Send onboarding completion to backend
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.email,
          onboardingData,
          completedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        message.success('Welcome to Aiser! Your journey starts now.');
        completeOnboarding();
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

  const progress = ((currentStep + 1) / totalSteps) * 100;

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
      open={isOnboardingActive}
      onCancel={skipOnboarding}
      footer={null}
      width={700}
      centered
      closable={false}
      maskClosable={false}
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
            />
          ))}
        </Steps>

        <div style={{ marginBottom: '32px' }}>
          {steps[currentStep].content}
        </div>

        <Divider />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            onClick={prevStep}
            disabled={currentStep === 0}
            icon={<ArrowLeftOutlined />}
          >
            Previous
          </Button>

          <Space>
            <Button onClick={skipOnboarding}>
              Skip Tour
            </Button>
            <Text type="secondary">
              Step {currentStep + 1} of {totalSteps}
            </Text>
            <Button
              type="primary"
              onClick={currentStep === 0 ? () => form.submit() : currentStep === totalSteps - 1 ? handleComplete : nextStep}
              loading={loading}
              icon={currentStep === totalSteps - 1 ? <CheckCircleOutlined /> : <ArrowRightOutlined />}
            >
              {currentStep === 0 ? 'Continue' : currentStep === totalSteps - 1 ? 'Start Using Aiser' : 'Next'}
            </Button>
          </Space>
        </div>
      </div>
    </Modal>
  );
};

export default PlatformOnboardingModal;
