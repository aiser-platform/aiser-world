'use client';

import React, { useState } from 'react';
import { Layout, Row, Col, Card, Typography, Space, Button, Tabs, Alert } from 'antd';
import {
    DatabaseOutlined,
    BarChartOutlined,
    MessageOutlined,
    TableOutlined,
    PlusOutlined
} from '@ant-design/icons';
import DataSourceManager from '../DataSourceManager/DataSourceManager';
import ChatToChart from '../ChatToChart/ChatToChart';
import ChartVisualization from '../ChartVisualization/ChartVisualization';
import { IDataSource, IChartConfig, IQueryAnalysis } from '../FileUpload/types';

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const { TabPane } = Tabs;

const Dashboard: React.FC = () => {
    const [selectedDataSource, setSelectedDataSource] = useState<IDataSource | null>(null);
    const [generatedCharts, setGeneratedCharts] = useState<Array<{
        id: string;
        config: IChartConfig;
        analysis: IQueryAnalysis;
        timestamp: Date;
    }>>([]);
    const [activeTab, setActiveTab] = useState<string>('data-sources');

    const handleDataSourceSelect = (dataSource: IDataSource) => {
        setSelectedDataSource(dataSource);
        setActiveTab('chat-to-chart');
    };

    const handleChartGenerated = (chartConfig: IChartConfig, analysis: IQueryAnalysis) => {
        const newChart = {
            id: `chart_${Date.now()}`,
            config: chartConfig,
            analysis,
            timestamp: new Date()
        };
        
        setGeneratedCharts(prev => [newChart, ...prev]);
        setActiveTab('charts');
    };

    const renderWelcomeCard = () => (
        <Card style={{ marginBottom: 24 }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div style={{ textAlign: 'center' }}>
                    <Title level={2}>
                        Welcome to Aiser Analytics
                    </Title>
                    <Paragraph type="secondary" style={{ fontSize: 16 }}>
                        Transform your data into insights with AI-powered analytics and natural language queries
                    </Paragraph>
                </div>
                
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={8}>
                        <Card size="small" style={{ textAlign: 'center', height: '100%' }}>
                            <Space direction="vertical">
                                <DatabaseOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                                <Title level={4}>Connect Data</Title>
                                <Paragraph type="secondary">
                                    Upload files or connect to databases with Cube.js pre-built connectors
                                </Paragraph>
                            </Space>
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card size="small" style={{ textAlign: 'center', height: '100%' }}>
                            <Space direction="vertical">
                                <MessageOutlined style={{ fontSize: 32, color: '#52c41a' }} />
                                <Title level={4}>Ask Questions</Title>
                                <Paragraph type="secondary">
                                    Use natural language to explore your data and generate insights
                                </Paragraph>
                            </Space>
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card size="small" style={{ textAlign: 'center', height: '100%' }}>
                            <Space direction="vertical">
                                <BarChartOutlined style={{ fontSize: 32, color: '#faad14' }} />
                                <Title level={4}>Get Insights</Title>
                                <Paragraph type="secondary">
                                    Receive intelligent visualizations and business insights powered by AI
                                </Paragraph>
                            </Space>
                        </Card>
                    </Col>
                </Row>
                
                <div style={{ textAlign: 'center' }}>
                    <Button
                        type="primary"
                        size="large"
                        icon={<PlusOutlined />}
                        onClick={() => setActiveTab('data-sources')}
                    >
                        Get Started - Connect Your Data
                    </Button>
                </div>
            </Space>
        </Card>
    );

    const renderDataSourcesTab = () => (
        <DataSourceManager
            onDataSourceSelect={handleDataSourceSelect}
            selectedDataSourceId={selectedDataSource?.id}
        />
    );

    const renderChatToChartTab = () => {
        if (!selectedDataSource) {
            return (
                <Card style={{ textAlign: 'center', padding: 48 }}>
                    <Space direction="vertical" size="large">
                        <MessageOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
                        <Title level={3} type="secondary">
                            Select a Data Source First
                        </Title>
                        <Paragraph type="secondary">
                            Choose a data source from the Data Sources tab to start asking questions and generating charts.
                        </Paragraph>
                        <Button
                            type="primary"
                            onClick={() => setActiveTab('data-sources')}
                        >
                            Go to Data Sources
                        </Button>
                    </Space>
                </Card>
            );
        }

        return (
            <ChatToChart
                dataSource={selectedDataSource}
                onChartGenerated={handleChartGenerated}
            />
        );
    };

    const renderChartsTab = () => {
        if (generatedCharts.length === 0) {
            return (
                <Card style={{ textAlign: 'center', padding: 48 }}>
                    <Space direction="vertical" size="large">
                        <BarChartOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
                        <Title level={3} type="secondary">
                            No Charts Generated Yet
                        </Title>
                        <Paragraph type="secondary">
                            Use the Chat to Chart feature to generate your first visualization.
                        </Paragraph>
                        <Button
                            type="primary"
                            onClick={() => setActiveTab('chat-to-chart')}
                            disabled={!selectedDataSource}
                        >
                            Start Chatting
                        </Button>
                    </Space>
                </Card>
            );
        }

        return (
            <div>
                <Alert
                    message="Generated Charts"
                    description={`You have generated ${generatedCharts.length} chart(s). Click on any chart to view it in fullscreen.`}
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
                
                <Row gutter={[16, 16]}>
                    {generatedCharts.map((chart) => (
                        <Col xs={24} lg={12} xl={8} key={chart.id}>
                            <ChartVisualization
                                config={chart.config}
                                title={`${chart.analysis.originalQuery} (${chart.timestamp.toLocaleTimeString()})`}
                                height={300}
                                showControls={true}
                            />
                        </Col>
                    ))}
                </Row>
            </div>
        );
    };

    return (
        <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
            <Content style={{ padding: 24 }}>
                {renderWelcomeCard()}
                
                <Card>
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        size="large"
                        items={[
                            {
                                key: 'data-sources',
                                label: (
                                    <Space>
                                        <TableOutlined />
                                        Data Sources
                                    </Space>
                                ),
                                children: renderDataSourcesTab()
                            },
                            {
                                key: 'chat-to-chart',
                                label: (
                                    <Space>
                                        <MessageOutlined />
                                        Chat to Chart
                                        {selectedDataSource && (
                                            <span style={{ 
                                                background: '#52c41a', 
                                                color: 'white', 
                                                borderRadius: 10, 
                                                padding: '2px 6px', 
                                                fontSize: 10 
                                            }}>
                                                {selectedDataSource.name}
                                            </span>
                                        )}
                                    </Space>
                                ),
                                children: renderChatToChartTab()
                            },
                            {
                                key: 'charts',
                                label: (
                                    <Space>
                                        <BarChartOutlined />
                                        Generated Charts
                                        {generatedCharts.length > 0 && (
                                            <span style={{ 
                                                background: '#1890ff', 
                                                color: 'white', 
                                                borderRadius: 10, 
                                                padding: '2px 6px', 
                                                fontSize: 10 
                                            }}>
                                                {generatedCharts.length}
                                            </span>
                                        )}
                                    </Space>
                                ),
                                children: renderChartsTab()
                            }
                        ]}
                    />
                </Card>
            </Content>
        </Layout>
    );
};

export default Dashboard;