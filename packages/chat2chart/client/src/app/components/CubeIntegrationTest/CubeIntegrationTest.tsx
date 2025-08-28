'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Alert, Spin, Tag, Divider, List, message } from 'antd';
import { 
    DatabaseOutlined, 
    CheckCircleOutlined, 
    ExclamationCircleOutlined,
    ReloadOutlined,
    PlayCircleOutlined,
    StopOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface CubeStatus {
    status: 'connected' | 'disconnected' | 'error';
    server_url?: string;
    response_time?: string;
    error?: string;
    timestamp?: string;
}

interface DeployedCube {
    name: string;
    dimensions: number;
    measures: number;
    status: string;
}

const CubeIntegrationTest: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [cubeStatus, setCubeStatus] = useState<CubeStatus | null>(null);
    const [deployedCubes, setDeployedCubes] = useState<DeployedCube[]>([]);
    const [testResults, setTestResults] = useState<any>(null);

    useEffect(() => {
        checkCubeStatus();
    }, []);

    const checkCubeStatus = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:8000/data/cube-status');
            if (response.ok) {
                const result = await response.json();
                setCubeStatus(result.cube_status);
                
                if (result.cube_status.status === 'connected') {
                    // Get deployed cubes
                    await getDeployedCubes();
                }
            } else {
                setCubeStatus({
                    status: 'error',
                    error: `HTTP ${response.status}`,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            setCubeStatus({
                status: 'disconnected',
                error: (error as Error).message,
                timestamp: new Date().toISOString()
            });
        } finally {
            setLoading(false);
        }
    };

    const getDeployedCubes = async () => {
        try {
            const response = await fetch('http://localhost:8000/data/cube-cubes');
            if (response.ok) {
                const result = await response.json();
                setDeployedCubes(result.cubes || []);
            }
        } catch (error) {
            console.error('Failed to get deployed cubes:', error);
        }
    };

    const testCubeQuery = async () => {
        setLoading(true);
        try {
            // Test a simple query to the Cube.js server
            const testQuery = {
                measures: ["*"],
                timeDimensions: [],
                dimensions: [],
                filters: [],
                timezone: "UTC"
            };

            const response = await fetch('http://localhost:4000/cubejs-api/v1/load', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer dev-cube-secret-key'
                },
                body: JSON.stringify(testQuery)
            });

            if (response.ok) {
                const result = await response.json();
                setTestResults({
                    success: true,
                    query: testQuery,
                    result: result,
                    message: 'Query executed successfully'
                });
                message.success('✅ Cube.js query test successful!');
            } else {
                setTestResults({
                    success: false,
                    error: `HTTP ${response.status}`,
                    message: 'Query test failed'
                });
                message.error('❌ Cube.js query test failed');
            }
        } catch (error) {
            setTestResults({
                success: false,
                error: (error as Error).message,
                message: 'Query test failed'
            });
            message.error('❌ Cube.js query test failed');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'connected': return 'success';
            case 'disconnected': return 'error';
            case 'error': return 'warning';
            default: return 'default';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'connected': return <CheckCircleOutlined />;
            case 'disconnected': return <ExclamationCircleOutlined />;
            case 'error': return <ExclamationCircleOutlined />;
            default: return <DatabaseOutlined />;
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            <Title level={2}>
                <DatabaseOutlined /> Cube.js Integration Test
            </Title>
            
            <Paragraph type="secondary">
                Test the real connection to the Cube.js server and verify functionality
            </Paragraph>

            <Card style={{ marginBottom: '24px' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Title level={4}>Server Status</Title>
                        <Button 
                            icon={<ReloadOutlined />} 
                            onClick={checkCubeStatus}
                            loading={loading}
                        >
                            Refresh Status
                        </Button>
                    </div>

                    {cubeStatus ? (
                        <Alert
                            message={`Cube.js Server: ${cubeStatus.status?.toUpperCase() || 'UNKNOWN'}`}
                            description={
                                <div>
                                    {cubeStatus.status === 'connected' && (
                                        <div>
                                            <Text>Server URL: {cubeStatus.server_url}</Text><br />
                                            <Text>Response Time: {cubeStatus.response_time}</Text><br />
                                            <Text>Last Check: {cubeStatus.timestamp}</Text>
                                        </div>
                                    )}
                                    {cubeStatus.error && (
                                        <Text type="danger">Error: {cubeStatus.error}</Text>
                                    )}
                                </div>
                            }
                            type={getStatusColor(cubeStatus.status) as any}
                            showIcon
                            icon={getStatusIcon(cubeStatus.status)}
                        />
                    ) : (
                        <Spin />
                    )}
                </Space>
            </Card>

            {cubeStatus?.status === 'connected' && (
                <>
                    <Card style={{ marginBottom: '24px' }}>
                        <Title level={4}>Deployed Cubes</Title>
                        {deployedCubes.length > 0 ? (
                            <List
                                dataSource={deployedCubes}
                                renderItem={(cube) => (
                                    <List.Item>
                                        <Space>
                                            <Tag color="blue">{cube.name}</Tag>
                                            <Text>{cube.dimensions} Dimensions</Text>
                                            <Text>{cube.measures} Measures</Text>
                                            <Tag color="green">{cube.status}</Tag>
                                        </Space>
                                    </List.Item>
                                )}
                            />
                        ) : (
                            <Alert
                                message="No Cubes Deployed"
                                description="No Cube.js schemas have been deployed yet. Deploy a schema to see it here."
                                type="info"
                                showIcon
                            />
                        )}
                    </Card>

                    <Card style={{ marginBottom: '24px' }}>
                        <Title level={4}>Query Test</Title>
                        <Paragraph type="secondary">
                            Test a simple query to verify Cube.js functionality
                        </Paragraph>
                        
                        <Space>
                            <Button 
                                type="primary"
                                icon={<PlayCircleOutlined />}
                                onClick={testCubeQuery}
                                loading={loading}
                            >
                                Test Query
                            </Button>
                        </Space>

                        {testResults && (
                            <div style={{ marginTop: '16px' }}>
                                <Divider />
                                <Alert
                                    message={testResults.message}
                                    description={
                                        <div>
                                            <Text strong>Query:</Text>
                                            <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                                                {JSON.stringify(testResults.query, null, 2)}
                                            </pre>
                                            {testResults.success && (
                                                <div>
                                                    <Text strong>Result:</Text>
                                                    <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                                                        {JSON.stringify(testResults.result, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                            {testResults.error && (
                                                <Text type="danger">Error: {testResults.error}</Text>
                                            )}
                                        </div>
                                    }
                                    type={testResults.success ? 'success' : 'error'}
                                    showIcon
                                />
                            </div>
                        )}
                    </Card>
                </>
            )}

            {cubeStatus?.status === 'disconnected' && (
                <Card>
                    <Title level={4}>Connection Troubleshooting</Title>
                    <Alert
                        message="Cube.js Server Not Accessible"
                        description={
                            <div>
                                <Paragraph>
                                    The Cube.js server appears to be offline or not accessible. Please check:
                                </Paragraph>
                                <ul>
                                    <li>Is the Cube.js server running on port 4000?</li>
                                    <li>Check Docker containers: <code>docker ps | grep cube</code></li>
                                    <li>Check server logs: <code>docker logs aiser-cube</code></li>
                                    <li>Verify environment variables in docker-compose.yml</li>
                                </ul>
                                <Paragraph>
                                    <Text code>docker-compose up cube-server</Text>
                                </Paragraph>
                            </div>
                        }
                        type="warning"
                        showIcon
                    />
                </Card>
            )}
        </div>
    );
};

export default CubeIntegrationTest;
