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
      icon: <AppstoreOutlined style={{ fontSize: '24px', color: 'var(--color-brand-primary)' }} />,
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
      icon: <DragOutlined style={{ fontSize: '24px', color: 'var(--color-functional-success)' }} />,
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
      icon: <DatabaseOutlined style={{ fontSize: '24px', color: 'var(--color-functional-warning)' }} />,
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
      icon: <SettingOutlined style={{ fontSize: '24px', color: 'var(--color-functional-info)' }} />,
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
        background: 'var(--color-surface-base)',
        border: '1px solid var(--color-border-primary)',
        boxShadow: 'var(--shadow-lg)'
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BarChartOutlined style={{ fontSize: '20px', color: 'var(--color-brand-primary)' }} />
          <Title level={4} style={{ margin: 0, color: 'var(--color-text-primary)' }}>
            Dashboard Studio Guide
          </Title>
        </div>
      }
      extra={
        <Button type="text" onClick={onClose} style={{ color: 'var(--color-text-secondary)' }}>
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
            <Title level={5} style={{ margin: 0, color: 'var(--color-text-primary)' }}>
              {steps[currentStep].title}
            </Title>
            <Text type="secondary" style={{ fontSize: 'var(--font-size-base)' }}>
              {steps[currentStep].description}
            </Text>
          </Col>
        </Row>
        
        <Divider style={{ margin: '16px 0' }} />
        
        {steps[currentStep].content}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button onClick={onClose} style={{ color: 'var(--color-text-secondary)' }}>
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
