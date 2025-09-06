'use client';

import React from 'react';
import { Spin, Skeleton, Card, Space, Typography, Progress } from 'antd';
import { LoadingOutlined, DatabaseOutlined, BarChartOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface LoadingStatesProps {
  type?: 'default' | 'chart' | 'data' | 'query' | 'dashboard';
  message?: string;
  progress?: number;
  size?: 'small' | 'default' | 'large';
}

const LoadingStates: React.FC<LoadingStatesProps> = ({
  type = 'default',
  message,
  progress,
  size = 'default'
}) => {
  const getLoadingIcon = () => {
    switch (type) {
      case 'chart':
        return <BarChartOutlined style={{ fontSize: 24, color: '#1890ff' }} spin />;
      case 'data':
        return <DatabaseOutlined style={{ fontSize: 24, color: '#52c41a' }} spin />;
      case 'query':
        return <LoadingOutlined style={{ fontSize: 24, color: '#722ed1' }} spin />;
      default:
        return <LoadingOutlined style={{ fontSize: 24, color: '#1890ff' }} spin />;
    }
  };

  const getLoadingMessage = () => {
    if (message) return message;
    
    switch (type) {
      case 'chart':
        return 'Generating chart...';
      case 'data':
        return 'Loading data...';
      case 'query':
        return 'Executing query...';
      case 'dashboard':
        return 'Loading dashboard...';
      default:
        return 'Loading...';
    }
  };

  const getSkeletonConfig = () => {
    switch (type) {
      case 'chart':
        return {
          rows: 3,
          title: { width: '60%' },
          paragraph: { rows: 2, width: ['100%', '80%'] }
        };
      case 'data':
        return {
          rows: 4,
          title: { width: '40%' },
          paragraph: { rows: 3, width: ['100%', '90%', '70%'] }
        };
      case 'dashboard':
        return {
          rows: 6,
          title: { width: '50%' },
          paragraph: { rows: 4, width: ['100%', '95%', '85%', '75%'] }
        };
      default:
        return {
          rows: 2,
          title: { width: '30%' },
          paragraph: { rows: 1, width: ['100%'] }
        };
    }
  };

  if (type === 'chart') {
    return (
      <Card 
        style={{ 
          height: '300px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: '2px dashed #d9d9d9',
          borderRadius: '8px'
        }}
      >
        <Space direction="vertical" align="center" size="large">
          {getLoadingIcon()}
          <Text type="secondary">{getLoadingMessage()}</Text>
          {progress !== undefined && (
            <Progress 
              percent={progress} 
              size="small" 
              style={{ width: '200px' }}
              showInfo={false}
            />
          )}
        </Space>
      </Card>
    );
  }

  if (type === 'data') {
    return (
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div style={{ textAlign: 'center' }}>
            {getLoadingIcon()}
            <Title level={4} style={{ marginTop: '16px', marginBottom: '8px' }}>
              {getLoadingMessage()}
            </Title>
            {progress !== undefined && (
              <Progress 
                percent={progress} 
                style={{ width: '300px', margin: '0 auto' }}
              />
            )}
          </div>
          <Skeleton {...getSkeletonConfig()} />
        </Space>
      </Card>
    );
  }

  if (type === 'dashboard') {
    return (
      <div style={{ padding: '20px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ textAlign: 'center' }}>
            {getLoadingIcon()}
            <Title level={3} style={{ marginTop: '16px', marginBottom: '8px' }}>
              {getLoadingMessage()}
            </Title>
            {progress !== undefined && (
              <Progress 
                percent={progress} 
                style={{ width: '400px', margin: '0 auto' }}
              />
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <Skeleton {...getSkeletonConfig()} />
              </Card>
            ))}
          </div>
        </Space>
      </div>
    );
  }

  // Default loading state
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      minHeight: '200px',
      flexDirection: 'column'
    }}>
      <Spin 
        indicator={getLoadingIcon()} 
        size={size}
      />
      <Text type="secondary" style={{ marginTop: '16px' }}>
        {getLoadingMessage()}
      </Text>
      {progress !== undefined && (
        <Progress 
          percent={progress} 
          style={{ width: '200px', marginTop: '16px' }}
        />
      )}
    </div>
  );
};

// Specific loading components for common use cases
export const ChartLoading: React.FC<{ message?: string; progress?: number }> = ({ message, progress }) => (
  <LoadingStates type="chart" message={message} progress={progress} />
);

export const DataLoading: React.FC<{ message?: string; progress?: number }> = ({ message, progress }) => (
  <LoadingStates type="data" message={message} progress={progress} />
);

export const QueryLoading: React.FC<{ message?: string; progress?: number }> = ({ message, progress }) => (
  <LoadingStates type="query" message={message} progress={progress} />
);

export const DashboardLoading: React.FC<{ message?: string; progress?: number }> = ({ message, progress }) => (
  <LoadingStates type="dashboard" message={message} progress={progress} />
);

export default LoadingStates;
