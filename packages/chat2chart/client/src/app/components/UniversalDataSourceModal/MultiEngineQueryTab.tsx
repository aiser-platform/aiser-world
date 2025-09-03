'use client';

import React, { useState, useEffect } from 'react';
import {
    Card,
    Row,
    Col,
    Typography,
    Alert,
    Tag,
    Progress,
    Button,
    Space,
    Tooltip,
    Divider,
} from 'antd';
import {
    ThunderboltOutlined,
    DatabaseOutlined,
    BarChartOutlined,
    RocketOutlined,
    CloudOutlined,
    CheckCircleOutlined,
} from '@ant-design/icons';
import { enhancedDataService } from '@/services/enhancedDataService';

const { Title, Text, Paragraph } = Typography;

const MultiEngineQueryTab: React.FC = () => {
    const [availableEngines, setAvailableEngines] = useState<any[]>([]);
    const [healthStatus, setHealthStatus] = useState<Record<string, boolean>>({});

    useEffect(() => {
        loadQueryEngines();
        checkEngineHealth();
    }, []);

    const loadQueryEngines = async () => {
        try {
            const engines = enhancedDataService.getAvailableQueryEngines();
            setAvailableEngines(engines);
        } catch (error) {
            console.error('Failed to load query engines:', error);
        }
    };

    const checkEngineHealth = async () => {
        try {
            const result = await enhancedDataService.healthCheck();
            if (result.success && result.services) {
                setHealthStatus(result.services);
            }
        } catch (error) {
            console.error('Failed to check engine health:', error);
        }
    };

    const getEngineIcon = (type: string) => {
        switch (type) {
            case 'duckdb':
                return '🦆';
            case 'cube':
                return '📊';
            case 'spark':
                return '⚡';
            case 'direct_sql':
                return '🗄️';
            case 'pandas':
                return '🐼';
            default:
                return '🔧';
        }
    };

    const getEngineColor = (type: string) => {
        switch (type) {
            case 'duckdb':
                return '#1890ff';
            case 'cube':
                return '#722ed1';
            case 'spark':
                return '#fa8c16';
            case 'direct_sql':
                return '#52c41a';
            case 'pandas':
                return '#eb2f96';
            default:
                return '#666';
        }
    };

    const getEnginePerformance = (type: string) => {
        switch (type) {
            case 'duckdb':
                return { speed: 95, memory: 80, scalability: 70 };
            case 'cube':
                return { speed: 90, memory: 75, scalability: 95 };
            case 'spark':
                return { speed: 85, memory: 60, scalability: 100 };
            case 'direct_sql':
                return { speed: 80, memory: 90, scalability: 60 };
            case 'pandas':
                return { speed: 70, memory: 85, scalability: 40 };
            default:
                return { speed: 50, memory: 50, scalability: 50 };
        }
    };

    return (
        <div>
            <Alert
                message="Multi-Engine Query Execution"
                description="Intelligent query engine selection based on data characteristics and performance requirements. The system automatically chooses the optimal engine for your queries."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {availableEngines.map((engine) => {
                    const performance = getEnginePerformance(engine.type);
                    const isHealthy = healthStatus[engine.type] !== false;
                    
                    return (
                        <Col xs={24} sm={12} md={8} key={engine.type}>
                            <Card
                                hoverable
                                style={{
                                    border: `1px solid ${getEngineColor(engine.type)}20`,
                                    borderLeft: `4px solid ${getEngineColor(engine.type)}`,
                                }}
                            >
                                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                                    <div style={{ fontSize: '32px', marginBottom: 8 }}>
                                        {getEngineIcon(engine.type)}
                                    </div>
                                    <Title level={5} style={{ margin: 0, color: getEngineColor(engine.type) }}>
                                        {engine.name}
                                    </Title>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        {engine.description}
                                    </Text>
                                    <div style={{ marginTop: 8 }}>
                                        {isHealthy ? (
                                            <Tag color="success" icon={<CheckCircleOutlined />}>
                                                Healthy
                                            </Tag>
                                        ) : (
                                            <Tag color="warning">
                                                Checking...
                                            </Tag>
                                        )}
                                    </div>
                                </div>

                                <Divider style={{ margin: '12px 0' }} />

                                <div style={{ marginBottom: 12 }}>
                                    <Text strong style={{ fontSize: '11px' }}>PERFORMANCE</Text>
                                    <div style={{ marginTop: 8 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                            <Text style={{ fontSize: '10px' }}>Speed</Text>
                                            <Text style={{ fontSize: '10px' }}>{performance.speed}%</Text>
                                        </div>
                                        <Progress 
                                            percent={performance.speed} 
                                            size="small" 
                                            strokeColor={getEngineColor(engine.type)}
                                            showInfo={false}
                                        />
                                    </div>
                                    <div style={{ marginTop: 8 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                            <Text style={{ fontSize: '10px' }}>Memory Efficiency</Text>
                                            <Text style={{ fontSize: '10px' }}>{performance.memory}%</Text>
                                        </div>
                                        <Progress 
                                            percent={performance.memory} 
                                            size="small" 
                                            strokeColor={getEngineColor(engine.type)}
                                            showInfo={false}
                                        />
                                    </div>
                                    <div style={{ marginTop: 8 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                            <Text style={{ fontSize: '10px' }}>Scalability</Text>
                                            <Text style={{ fontSize: '10px' }}>{performance.scalability}%</Text>
                                        </div>
                                        <Progress 
                                            percent={performance.scalability} 
                                            size="small" 
                                            strokeColor={getEngineColor(engine.type)}
                                            showInfo={false}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginTop: 12 }}>
                                    <Text strong style={{ fontSize: '11px' }}>BEST FOR</Text>
                                    <div style={{ marginTop: 6 }}>
                                        {engine.suitable_for.map((use: string) => (
                                            <Tag key={use} style={{ margin: '2px', fontSize: '9px' }}>
                                                {use}
                                            </Tag>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        </Col>
                    );
                })}
            </Row>

            <Card style={{ marginBottom: 16 }}>
                <Title level={4} style={{ marginBottom: 16 }}>
                    <ThunderboltOutlined style={{ marginRight: 8 }} />
                    Intelligent Engine Selection
                </Title>
                <Row gutter={[16, 16]}>
                    <Col span={12}>
                        <Card size="small" style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}>
                            <Text strong>Automatic Selection</Text>
                            <Paragraph style={{ margin: '8px 0 0 0', fontSize: '12px' }}>
                                The system analyzes your query complexity, data size, and performance requirements to automatically select the optimal engine.
                            </Paragraph>
                        </Card>
                    </Col>
                    <Col span={12}>
                        <Card size="small" style={{ background: '#f0f5ff', border: '1px solid #adc6ff' }}>
                            <Text strong>Manual Override</Text>
                            <Paragraph style={{ margin: '8px 0 0 0', fontSize: '12px' }}>
                                You can manually specify an engine for specific use cases or testing purposes using the query interface.
                            </Paragraph>
                        </Card>
                    </Col>
                </Row>
            </Card>

            <Alert
                message="Query Engine Optimization"
                description={
                    <div>
                        <Paragraph style={{ marginBottom: 8 }}>
                            <strong>Small Data (&lt;1MB):</strong> Pandas for fast in-memory processing
                        </Paragraph>
                        <Paragraph style={{ marginBottom: 8 }}>
                            <strong>Medium Data (1MB-1GB):</strong> DuckDB for analytical queries
                        </Paragraph>
                        <Paragraph style={{ marginBottom: 8 }}>
                            <strong>Large Data (&gt;1GB):</strong> Spark for distributed processing
                        </Paragraph>
                        <Paragraph style={{ marginBottom: 8 }}>
                            <strong>Business Intelligence:</strong> Cube.js for OLAP and pre-aggregations
                        </Paragraph>
                        <Paragraph style={{ marginBottom: 0 }}>
                            <strong>Real-time Data:</strong> Direct SQL for live database queries
                        </Paragraph>
                    </div>
                }
                type="success"
                showIcon
            />

            <div style={{ marginTop: 24, textAlign: 'center' }}>
                <Space>
                    <Button 
                        type="primary" 
                        icon={<RocketOutlined />}
                        onClick={() => window.location.href = '/dash-studio'}
                    >
                        Try Query Studio
                    </Button>
                    <Button 
                        icon={<BarChartOutlined />}
                        onClick={() => window.location.href = '/chat'}
                    >
                        AI-Powered Analysis
                    </Button>
                </Space>
            </div>
        </div>
    );
};

export default MultiEngineQueryTab;
