import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
    Input, 
    Button, 
    Card, 
    Space, 
    Typography, 
    Avatar, 
    Divider, 
    Tag, 
    Tooltip, 
    Alert,
    Collapse,
    Tabs,
    Spin,
    Empty,
    message
} from 'antd';
import {
    SendOutlined,
    UserOutlined,
    RobotOutlined,
    CodeOutlined,
    BarChartOutlined,
    DatabaseOutlined,
    EyeOutlined,
    CopyOutlined,
    DownloadOutlined,
    ReloadOutlined,
    InfoCircleOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    MessageOutlined
} from '@ant-design/icons';
import { IFileUpload } from '@/app/components/FileUpload/types';
import UniversalDataSourceModal from '@/app/components/UniversalDataSourceModal/UniversalDataSourceModal';
import shortid from 'shortid';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;

interface DataSource {
    id: string;
    name: string;
    type: 'file' | 'database' | 'warehouse' | 'api';
    status: 'connected' | 'disconnected' | 'error';
    config: any;
    metadata?: any;
}

interface ExecutionMetadata {
    sql?: string;
    executionTime?: number;
    rowCount?: number;
    dataSource?: string;
    timestamp: string;
    queryType?: string;
    optimizationHints?: string[];
}

interface ChartResponse {
    chartType: string;
    chartConfig: any;
    data: any[];
    insights: string[];
    metadata: ExecutionMetadata;
}

interface EnhancedChatPanelProps {
    selectedDataSource?: DataSource | null;
}

const EnhancedChatPanel: React.FC<EnhancedChatPanelProps> = ({ selectedDataSource }) => {
    const [prompt, setPrompt] = useState<string>('');
    const [messages, setMessages] = useState<any[]>([]);
    const [chatLoading, setChatLoading] = useState<boolean>(false);
    const [dataSourceModalVisible, setDataSourceModalVisible] = useState<boolean>(false);
    const [executionMetadata, setExecutionMetadata] = useState<Record<string, ExecutionMetadata>>({});
    const [chartResponses, setChartResponses] = useState<Record<string, ChartResponse>>({});

    const containerRef = useRef<null | HTMLDivElement>(null);

    const handleSendMessage = async () => {
        if (!prompt.trim() || !selectedDataSource) {
            message.warning('Please select a data source and enter a message');
            return;
        }

        const userMessage = {
            id: shortid.generate(),
            content: prompt,
            role: 'user',
            timestamp: new Date().toISOString(),
            type: 'text'
        };

        setMessages(prev => [...prev, userMessage]);
        setPrompt('');
        setChatLoading(true);

        // Simulate AI response for now
        setTimeout(() => {
            const aiMessage = {
                id: shortid.generate(),
                content: 'I\'ve analyzed your data and found some interesting insights...',
                role: 'assistant',
                timestamp: new Date().toISOString(),
                type: 'analysis',
                loading: false
            };

            setMessages(prev => [...prev, aiMessage]);
            setChatLoading(false);
        }, 2000);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        message.success('Copied to clipboard!');
    };

    const renderExecutionMetadata = (messageId: string) => {
        const metadata = executionMetadata[messageId];
        if (!metadata) return null;

        return (
            <Card size="small" style={{ marginTop: '8px', backgroundColor: 'var(--color-surface-raised)' }}>
                <Collapse size="small" ghost>
                    <Panel 
                        header={
                            <Space>
                                <DatabaseOutlined />
                                <Text strong>Execution Details</Text>
                                <Tag color="blue">{metadata.queryType || 'Query'}</Tag>
                            </Space>
                        } 
                        key="execution"
                    >
                        <Space direction="vertical" style={{ width: '100%' }} size="small">
                            {metadata.sql && (
                                <div>
                                    <Text strong>SQL Query:</Text>
                                    <div style={{ 
                                        backgroundColor: 'var(--color-surface-raised)', 
                                        padding: '8px', 
                                        borderRadius: '4px',
                                        marginTop: '4px',
                                        fontFamily: 'monospace',
                                        fontSize: 'var(--font-size-sm)'
                                    }}>
                                        <Space>
                                            <Text code>{metadata.sql}</Text>
                                            <Button 
                                                type="text" 
                                                size="small" 
                                                icon={<CopyOutlined />}
                                                onClick={() => copyToClipboard(metadata.sql!)}
                                            />
                                        </Space>
                                    </div>
                                </div>
                            )}
                            
                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                {metadata.executionTime && (
                                    <Tag color="green">
                                        ⚡ {metadata.executionTime}ms
                                    </Tag>
                                )}
                                {metadata.rowCount && (
                                    <Tag color="blue">
                                        📊 {metadata.rowCount.toLocaleString()} rows
                                    </Tag>
                                )}
                                {metadata.dataSource && (
                                    <Tag color="purple">
                                        🗄️ {metadata.dataSource}
                                    </Tag>
                                )}
                                <Tag color="orange">
                                    🕒 {new Date(metadata.timestamp).toLocaleTimeString()}
                                </Tag>
                            </div>
                        </Space>
                    </Panel>
                </Collapse>
            </Card>
        );
    };

    const renderMessage = (msg: any) => {
        const isUser = msg.role === 'user';

        return (
            <div key={msg.id} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Avatar 
                        icon={isUser ? <UserOutlined /> : <RobotOutlined />}
                        style={{ 
                            backgroundColor: isUser ? 'var(--color-brand-primary)' : 'var(--color-functional-success)',
                            flexShrink: 0
                        }}
                    />
                    <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: '8px' }}>
                            <Text strong>{isUser ? 'You' : 'AI Assistant'}</Text>
                            <Text type="secondary" style={{ marginLeft: '8px', fontSize: 'var(--font-size-sm)' }}>
                                {new Date(msg.timestamp).toLocaleTimeString()}
                            </Text>
                        </div>
                        
                        <Card size="small" style={{ backgroundColor: isUser ? '#f0f8ff' : '#fafafa' }}>
                            {msg.loading ? (
                                <div style={{ textAlign: 'center', padding: '20px' }}>
                                    <Spin />
                                    <div style={{ marginTop: '8px' }}>{msg.content}</div>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                                    
                                    {/* Show execution metadata for AI responses */}
                                    {!isUser && renderExecutionMetadata(msg.id)}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="enhanced-chat-panel">
            {/* Header */}
            <div className="chat-header">
                <Space>
                    <Title level={4} style={{ margin: 0 }}>
                        <MessageOutlined /> AI Data Analyst
                    </Title>
                    {selectedDataSource && (
                        <Tag color="blue" icon={<DatabaseOutlined />}>
                            {selectedDataSource.name}
                        </Tag>
                    )}
                </Space>
                
                <Space>
                    {!selectedDataSource && (
                        <Button 
                            type="primary" 
                            icon={<DatabaseOutlined />}
                            onClick={() => setDataSourceModalVisible(true)}
                        >
                            Connect Data Source
                        </Button>
                    )}
                </Space>
            </div>

            {/* Messages Area */}
            <div className="chat-messages" ref={containerRef}>
                {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <Empty
                            description={
                                <div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <Text strong>Welcome to AI Data Analyst!</Text>
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <Text type="secondary">
                                            Ask questions about your data and get AI-powered insights, charts, and analysis.
                                        </Text>
                                    </div>
                                    {!selectedDataSource ? (
                                        <Button 
                                            type="primary" 
                                            icon={<DatabaseOutlined />}
                                            onClick={() => setDataSourceModalVisible(true)}
                                        >
                                            Connect Your First Data Source
                                        </Button>
                                    ) : (
                                        <div>
                                            <Text strong>Try asking:</Text>
                                            <div style={{ marginTop: '8px' }}>
                                                <Tag 
                                                    style={{ cursor: 'pointer', margin: '4px' }}
                                                    onClick={() => setPrompt('Show me a summary of the data')}
                                                >
                                                    "Show me a summary of the data"
                                                </Tag>
                                                <Tag 
                                                    style={{ cursor: 'pointer', margin: '4px' }}
                                                    onClick={() => setPrompt('What are the key trends?')}
                                                >
                                                    "What are the key trends?"
                                                </Tag>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            }
                        />
                    </div>
                ) : (
                    messages.map(renderMessage)
                )}
            </div>

            {/* Input Area */}
            <div className="chat-input">
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                    <TextArea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={
                            selectedDataSource 
                                ? "Ask about your data, request charts, or get insights..."
                                : "Connect a data source to start analyzing..."
                        }
                        autoSize={{ minRows: 2, maxRows: 6 }}
                        disabled={!selectedDataSource || chatLoading}
                        onPressEnter={(e) => {
                            if (!e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        style={{ flex: 1 }}
                    />
                    <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={handleSendMessage}
                        loading={chatLoading}
                        disabled={!prompt.trim() || !selectedDataSource}
                        size="large"
                    >
                        Send
                    </Button>
                </div>
            </div>

            {/* Data Source Modal */}
            <UniversalDataSourceModal
                isOpen={dataSourceModalVisible}
                onClose={() => setDataSourceModalVisible(false)}
                isChatIntegration={true}
                onDataSourceCreated={(dataSource) => {
                    setDataSourceModalVisible(false);
                    if (dataSource) {
                        console.log('Data source created:', dataSource);
                    }
                }}
            />
        </div>
    );
};

export default EnhancedChatPanel;
