'use client';

import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const StoragePage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Storage Management</Title>
      <Card>
        <p>Storage management features coming soon...</p>
      </Card>
    </div>
  );
};

export default StoragePage;
