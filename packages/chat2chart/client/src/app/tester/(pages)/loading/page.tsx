'use client';

// Simple dynamic configuration that actually works

import React from 'react';
import { Spin, Card, Typography } from 'antd';

const { Title } = Typography;

export default function Loading() {
    return (
        <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '100vh',
            padding: '24px'
        }}>
            <Card style={{ textAlign: 'center', minWidth: '300px' }}>
                <Spin size="large" />
                <Title level={4} style={{ marginTop: '16px' }}>
                    Loading...
                </Title>
                <p>Please wait while the application initializes.</p>
            </Card>
        </div>
    );
}
