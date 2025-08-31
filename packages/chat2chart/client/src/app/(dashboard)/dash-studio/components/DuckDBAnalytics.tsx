'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Card,
    Button,
    Input,
    Space,
    Typography,
    message,
    Modal,
    Form,
    Row,
    Col,
    Divider,
    Alert,
    Spin,
    Tag,
    Tooltip,
    Badge,
    Tabs,
    Table,
    Progress,
    Statistic
} from 'antd';
import {
    DatabaseOutlined,
    PlayCircleOutlined,
    PauseCircleOutlined,
    ReloadOutlined,
    SettingOutlined,
    EyeOutlined,
    CodeOutlined,
    ThunderboltOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    SyncOutlined,
    DownloadOutlined,
    UploadOutlined,
    FileTextOutlined,
    BarChartOutlined,
    LineChartOutlined,
    PieChartOutlined,
    TableOutlined,
    ClearOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;

interface InBrowserQuery {
    id: string;
    name: string;
    sql: string;
    result?: any;
    executionTime?: number;
    status: 'pending' | 'running' | 'completed' | 'error';
    lastExecuted?: Date;
    rowCount?: number;
}

const InBrowserAnalytics: React.FC<{
    onDataUpdate: (data: any) => void;
    onQueryComplete: (query: InBrowserQuery) => void;
}> = ({
    onDataUpdate,
    onQueryComplete
}) => {
    const [queries, setQueries] = useState<InBrowserQuery[]>([]);
    const [currentQuery, setCurrentQuery] = useState<string>('');
    const [queryName, setQueryName] = useState<string>('');
    const [isExecuting, setIsExecuting] = useState<boolean>(false);
    const [showSampleData, setShowSampleData] = useState<boolean>(true);

    // Sample data for demonstration
    const sampleData = {
        sales: [
            { id: 1, product: 'Product A', amount: 1500, date: '2024-01-01', region: 'North' },
            { id: 2, product: 'Product B', amount: 2200, date: '2024-01-02', region: 'South' },
            { id: 3, product: 'Product C', amount: 1800, date: '2024-01-03', region: 'East' },
            { id: 4, product: 'Product A', amount: 1900, date: '2024-01-04', region: 'West' },
            { id: 5, product: 'Product B', amount: 2100, date: '2024-01-05', region: 'North' }
        ],
        users: [
            { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', lastLogin: '2024-01-01' },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', lastLogin: '2024-01-02' },
            { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User', lastLogin: '2024-01-03' }
        ]
    };

    // Execute query (simulated)
    const executeQuery = useCallback(async () => {
        if (!currentQuery.trim() || !queryName.trim()) {
            message.error('Please enter both query name and SQL');
            return;
        }

        const query: InBrowserQuery = {
            id: `query_${Date.now()}`,
            name: queryName,
            sql: currentQuery,
            status: 'running',
            lastExecuted: new Date()
        };

        setQueries(prev => [...prev, query]);
        setIsExecuting(true);

        // Simulate query execution
        setTimeout(() => {
            try {
                // Simple query parsing for demo
                const sql = currentQuery.toLowerCase();
                let result = [];
                let rowCount = 0;

                if (sql.includes('select') && sql.includes('from sales')) {
                    result = sampleData.sales;
                    rowCount = sampleData.sales.length;
                } else if (sql.includes('select') && sql.includes('from users')) {
                    result = sampleData.users;
                    rowCount = sampleData.users.length;
                } else if (sql.includes('count')) {
                    result = [{ count: sampleData.sales.length }];
                    rowCount = 1;
                } else {
                    result = sampleData.sales.slice(0, 3); // Default to first 3 sales records
                    rowCount = 3;
                }

                const completedQuery: InBrowserQuery = {
                    ...query,
                    result,
                    rowCount,
                    status: 'completed',
                    executionTime: Math.random() * 1000 + 100 // Random execution time
                };

                setQueries(prev => prev.map(q => 
                    q.id === query.id ? completedQuery : q
                ));

                onQueryComplete(completedQuery);
                onDataUpdate(result);
                message.success(`Query '${queryName}' executed successfully`);
            } catch (error) {
                const errorQuery: InBrowserQuery = {
                    ...query,
                    status: 'error',
                    result: { error: error instanceof Error ? error.message : 'Unknown error' }
                };

                setQueries(prev => prev.map(q => 
                    q.id === query.id ? errorQuery : q
                ));

                message.error(`Query '${queryName}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            } finally {
                setIsExecuting(false);
            }
        }, 1500);
    }, [currentQuery, queryName, onQueryComplete, onDataUpdate]);

    // Clear queries
    const clearQueries = () => {
        setQueries([]);
        message.success('Query history cleared');
    };

    // Export query results
    const exportResults = (query: InBrowserQuery) => {
        if (!query.result) return;
        
        const dataStr = JSON.stringify(query.result, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${query.name}_results.json`;
        link.click();
        URL.revokeObjectURL(url);
        message.success('Results exported successfully');
    };

    return (
        <div className="in-browser-analytics">
            <Card
                title={
                    <Space>
                        <ThunderboltOutlined />
                        <span>In-Browser Analytics</span>
                        <Tag color="blue">Fast & Local</Tag>
                    </Space>
                }
                extra={
                    <Space>
                        <Button
                            size="small"
                            icon={<ReloadOutlined />}
                            onClick={() => setShowSampleData(!showSampleData)}
                        >
                            {showSampleData ? 'Hide' : 'Show'} Sample Data
                        </Button>
                        <Button
                            size="small"
                            icon={<ClearOutlined />}
                            onClick={clearQueries}
                        >
                            Clear History
                        </Button>
                    </Space>
                }
            >
                <Row gutter={[24, 24]}>
                    {/* Query Editor */}
                    <Col xs={24} lg={12}>
                        <Card title="SQL Query Editor" size="small">
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <Input
                                    placeholder="Query Name (e.g., Sales Analysis)"
                                    value={queryName}
                                    onChange={(e) => setQueryName(e.target.value)}
                                    prefix={<FileTextOutlined />}
                                />
                                
                                <TextArea
                                    value={currentQuery}
                                    onChange={(e) => setCurrentQuery(e.target.value)}
                                    placeholder="Enter your SQL query here..."
                                    rows={8}
                                    style={{ fontFamily: 'monospace' }}
                                />
                                
                                <Button
                                    type="primary"
                                    icon={<PlayCircleOutlined />}
                                    onClick={executeQuery}
                                    loading={isExecuting}
                                    disabled={!currentQuery.trim() || !queryName.trim()}
                                    block
                                >
                                    Execute Query
                                </Button>
                            </Space>

                            <Divider />

                            <div>
                                <Text strong>Sample Queries:</Text>
                                <div style={{ marginTop: 8 }}>
                                    <Button
                                        size="small"
                                        onClick={() => {
                                            setQueryName('Sales Overview');
                                            setCurrentQuery('SELECT * FROM sales LIMIT 10');
                                        }}
                                        style={{ marginBottom: 4, display: 'block', width: '100%' }}
                                    >
                                        SELECT * FROM sales LIMIT 10
                                    </Button>
                                    <Button
                                        size="small"
                                        onClick={() => {
                                            setQueryName('User Count');
                                            setCurrentQuery('SELECT COUNT(*) as count FROM users');
                                        }}
                                        style={{ marginBottom: 4, display: 'block', width: '100%' }}
                                    >
                                        SELECT COUNT(*) as count FROM users
                                    </Button>
                                    <Button
                                        size="small"
                                        onClick={() => {
                                            setQueryName('Regional Sales');
                                            setCurrentQuery('SELECT region, SUM(amount) as total FROM sales GROUP BY region');
                                        }}
                                        style={{ marginBottom: 4, display: 'block', width: '100%' }}
                                    >
                                        SELECT region, SUM(amount) as total FROM sales GROUP BY region
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </Col>

                    {/* Sample Data */}
                    <Col xs={24} lg={12}>
                        {showSampleData && (
                            <Card title="Sample Data Tables" size="small">
                                <Tabs defaultActiveKey="sales">
                                    <TabPane tab="Sales" key="sales">
                                        <Table
                                            dataSource={sampleData.sales}
                                            columns={[
                                                { title: 'ID', dataIndex: 'id', key: 'id' },
                                                { title: 'Product', dataIndex: 'product', key: 'product' },
                                                { title: 'Amount', dataIndex: 'amount', key: 'amount' },
                                                { title: 'Date', dataIndex: 'date', key: 'date' },
                                                { title: 'Region', dataIndex: 'region', key: 'region' }
                                            ]}
                                            size="small"
                                            pagination={false}
                                            scroll={{ y: 200 }}
                                        />
                                    </TabPane>
                                    <TabPane tab="Users" key="users">
                                        <Table
                                            dataSource={sampleData.users}
                                            columns={[
                                                { title: 'ID', dataIndex: 'id', key: 'id' },
                                                { title: 'Name', dataIndex: 'name', key: 'name' },
                                                { title: 'Email', dataIndex: 'email', key: 'email' },
                                                { title: 'Role', dataIndex: 'role', key: 'role' },
                                                { title: 'Last Login', dataIndex: 'lastLogin', key: 'lastLogin' }
                                            ]}
                                            size="small"
                                            pagination={false}
                                            scroll={{ y: 200 }}
                                        />
                                    </TabPane>
                                </Tabs>
                            </Card>
                        )}
                    </Col>
                </Row>

                {/* Query Results */}
                {queries.length > 0 && (
                    <Card title="Query Results" size="small" style={{ marginTop: 24 }}>
                        <Tabs defaultActiveKey="latest">
                            {queries.map((query, index) => (
                                <TabPane
                                    tab={
                                        <span>
                                            {query.name}
                                            <Tag
                                                color={query.status === 'completed' ? 'success' : query.status === 'error' ? 'error' : 'processing'}
                                                style={{ marginLeft: 8 }}
                                            >
                                                {query.status}
                                            </Tag>
                                        </span>
                                    }
                                    key={query.id}
                                >
                                    <div style={{ marginBottom: 16 }}>
                                        <Row gutter={16}>
                                            <Col span={8}>
                                                <Statistic
                                                    title="Execution Time"
                                                    value={query.executionTime || 0}
                                                    suffix="ms"
                                                    precision={0}
                                                />
                                            </Col>
                                            <Col span={8}>
                                                <Statistic
                                                    title="Row Count"
                                                    value={query.rowCount || 0}
                                                />
                                            </Col>
                                            <Col span={8}>
                                                <Statistic
                                                    title="Last Executed"
                                                    value={query.lastExecuted?.toLocaleTimeString() || 'N/A'}
                                                />
                                            </Col>
                                        </Row>
                                    </div>

                                    {query.status === 'completed' && query.result && (
                                        <div>
                                            <div style={{ marginBottom: 16 }}>
                                                <Button
                                                    size="small"
                                                    icon={<DownloadOutlined />}
                                                    onClick={() => exportResults(query)}
                                                >
                                                    Export Results
                                                </Button>
                                            </div>
                                            <Table
                                                dataSource={query.result}
                                                columns={Object.keys(query.result[0] || {}).map(key => ({
                                                    title: key.charAt(0).toUpperCase() + key.slice(1),
                                                    dataIndex: key,
                                                    key: key
                                                }))}
                                                size="small"
                                                pagination={{ pageSize: 10 }}
                                                scroll={{ y: 300 }}
                                            />
                                        </div>
                                    )}

                                    {query.status === 'error' && (
                                        <Alert
                                            message="Query Error"
                                            description={query.result?.error || 'Unknown error occurred'}
                                            type="error"
                                            showIcon
                                        />
                                    )}

                                    {query.status === 'running' && (
                                        <div style={{ textAlign: 'center', padding: '40px' }}>
                                            <Spin size="large" />
                                            <div style={{ marginTop: 16 }}>Executing query...</div>
                                        </div>
                                    )}
                                </TabPane>
                            ))}
                        </Tabs>
                    </Card>
                )}
            </Card>
        </div>
    );
};

export default InBrowserAnalytics;
