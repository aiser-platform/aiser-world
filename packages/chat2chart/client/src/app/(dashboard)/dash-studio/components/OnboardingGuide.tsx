'use client';

import React, { useState } from 'react';
import { Card, Button, Space, Typography, Steps, Row, Col, Divider } from 'antd';
import {
  AppstoreOutlined,
  BarChartOutlined,
  DatabaseOutlined,
  PlayCircleOutlined,
  DragOutlined,
  SettingOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface OnboardingGuideProps {
  isDarkMode: boolean;
  onClose: () => void;
  onStart: () => void;
}

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ isDarkMode, onClose, onStart }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to Dashboard Studio',
      description: 'Create professional BI dashboards with drag-and-drop widgets',
      icon: <AppstoreOutlined style={{ fontSize: '24px', color: '#1890ff' }} />,
      content: (
        <div>
          <Paragraph>
            Dashboard Studio is your comprehensive BI solution for creating, designing, and sharing 
            professional dashboards. Get started by exploring the widget library and creating your first dashboard.
          </Paragraph>
        </div>
      )
    },
    {
      title: 'Widget Library',
      description: 'Drag widgets from the library to your canvas',
      icon: <DragOutlined style={{ fontSize: '24px', color: '#52c41a' }} />,
      content: (
        <div>
          <Paragraph>
            <strong>Charts:</strong> Bar, Line, Pie, Scatter, and more chart types
          </Paragraph>
          <Paragraph>
            <strong>Data:</strong> Tables, Metrics, KPIs for data visualization
          </Paragraph>
          <Paragraph>
            <strong>Content:</strong> Text, Markdown, Images for rich content
          </Paragraph>
          <Paragraph>
            <strong>Filters:</strong> Date, Dropdown, Slider filters for interactivity
          </Paragraph>
        </div>
      )
    },
    {
      title: 'Query & Data',
      description: 'Connect to your data sources and create visualizations',
      icon: <DatabaseOutlined style={{ fontSize: '24px', color: '#faad14' }} />,
      content: (
        <div>
          <Paragraph>
            <strong>SQL Editor:</strong> Write queries against your connected data sources
          </Paragraph>
          <Paragraph>
            <strong>Chart Suggestions:</strong> Get intelligent chart recommendations based on your data
          </Paragraph>
          <Paragraph>
            <strong>Real-time Data:</strong> Connect to databases, APIs, and files
          </Paragraph>
        </div>
      )
    },
    {
      title: 'Customize & Configure',
      description: 'Fine-tune your widgets with comprehensive properties',
      icon: <SettingOutlined style={{ fontSize: '24px', color: '#722ed1' }} />,
      content: (
        <div>
          <Paragraph>
            <strong>Content:</strong> Configure titles, data, and content
          </Paragraph>
          <Paragraph>
            <strong>Style:</strong> Customize colors, fonts, spacing, and layout
          </Paragraph>
          <Paragraph>
            <strong>Behavior:</strong> Set interactions, animations, and responsiveness
          </Paragraph>
        </div>
      )
    }
  ];

  const next = () => {
    setCurrentStep(currentStep + 1);
  };

  const prev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleStart = () => {
    onStart();
    onClose();
  };

  return (
    <Card
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        maxHeight: '80vh',
        zIndex: 1000,
        background: isDarkMode ? '#1f1f1f' : '#ffffff',
        border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BarChartOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0, color: isDarkMode ? '#ffffff' : '#000000' }}>
            Dashboard Studio Guide
          </Title>
        </div>
      }
      extra={
        <Button type="text" onClick={onClose} style={{ color: isDarkMode ? '#999' : '#666' }}>
          ✕
        </Button>
      }
    >
      <div style={{ marginBottom: '24px' }}>
        <Steps current={currentStep} size="small">
          {steps.map((step, index) => (
            <Step key={index} title={step.title} />
          ))}
        </Steps>
      </div>

      <div style={{ minHeight: '200px', marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col span={4} style={{ textAlign: 'center' }}>
            {steps[currentStep].icon}
          </Col>
          <Col span={20}>
            <Title level={5} style={{ margin: 0, color: isDarkMode ? '#ffffff' : '#000000' }}>
              {steps[currentStep].title}
            </Title>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              {steps[currentStep].description}
            </Text>
          </Col>
        </Row>
        
        <Divider style={{ margin: '16px 0' }} />
        
        {steps[currentStep].content}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button onClick={onClose} style={{ color: isDarkMode ? '#999' : '#666' }}>
          Skip Guide
        </Button>
        
        <Space>
          {currentStep > 0 && (
            <Button onClick={prev}>
              Previous
            </Button>
          )}
          
          {currentStep < steps.length - 1 ? (
            <Button type="primary" onClick={next}>
              Next
            </Button>
          ) : (
            <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleStart}>
              Get Started
            </Button>
          )}
        </Space>
      </div>
    </Card>
  );
};

export default OnboardingGuide;
