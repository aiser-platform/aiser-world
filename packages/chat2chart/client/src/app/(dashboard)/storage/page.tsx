'use client';

// Simple dynamic configuration that actually works

import React from 'react';
import { Card, Typography, Space, Button } from 'antd';
import { CloudUploadOutlined, FolderOutlined, DatabaseOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const StoragePage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Storage Management</Title>
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="File Storage" extra={<Button type="primary" icon={<CloudUploadOutlined />}>Upload Files</Button>}>
          <Text>Manage uploaded files, documents, and media assets.</Text>
        </Card>
        
        <Card title="Data Sources" extra={<Button type="primary" icon={<DatabaseOutlined />}>Add Source</Button>}>
          <Text>Configure and manage data source connections.</Text>
        </Card>
        
        <Card title="Project Files" extra={<Button type="primary" icon={<FolderOutlined />}>Browse</Button>}>
          <Text>Access project-specific files and resources.</Text>
        </Card>
      </Space>
    </div>
  );
};

export default StoragePage;
