'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    Card,
    Input,
    Button,
    Space,
    Typography,
    message,
    Spin,
    Empty,
    Tag,
    Divider,
    Alert,
    List,
    Avatar
} from 'antd';
import {
    SendOutlined,
    RobotOutlined,
    UserOutlined,
    BarChartOutlined,
    BulbOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import { IDataSource, IQueryAnalysis, IChartConfig } from '../FileUpload/types';
import ChartVisualization from '../ChartVisualization/ChartVisualization';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export interface ChatToChartProps {
    dataSource: IDataSource;
    onChartGenerated?: (chartConfig: IChartConfig, analysis: IQueryAnalysis) => void;
}

interface ChatMessage {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    chartConfig?: IChartConfig;
    queryAnalysis?: IQueryAnalysis;
    businessInsights?: any[];
    loading?: boolean;
}

const ChatToChart: React.FC<ChatToChartProps> = ({
    dataSource,
    onChartGenerated
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Add welcome message when data source changes
        if (dataSource) {
            const welcomeMessage: ChatMessage = {
                id: `welcome_${Date.now()}`,
                type: 'assistant',
                content: `Hi! I'm ready to help you analyze your data from "${dataSource.name}". You can ask me questions like:
                
• "Show me trends over time"
• "What are the top categories?"
• "Compare values by different groups"
• "Are there any unusual patterns?"

What would you like to explore?`,
                timestamp: new Date()
            };
            setMessages([welcomeMessage]);
        }
    }, [dataSource]);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || loading) return;

        const userMessage: ChatMessage = {
            id: `user_${Date.now()}`,
            type: 'user',
            content: inputValue.trim(),
            timestamp: new Date()
        };

        const loadingMessage: ChatMessage = {
            id: `loading_${Date.now()}`,
            type: 'assistant',
            content: 'Analyzing your question and generating visualization...',
            timestamp: new Date(),
            loading: true
        };

        setMessages(prev => [...prev, userMessage, loadingMessage]);
        setInputValue('');
        setLoading(true);

        try {
            const response = await fetch('http://localhost:8000/api/v1/data/chat-to-chart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data_source_id: dataSource.id,
                    natural_language_query: inputValue.trim()
                })
            });

            const data = await response.json();

            // Remove loading message
            setMessages(prev => prev.filter(msg => msg.id !== loadingMessage.id));

            if (data.success) {
                const assistantMessage: ChatMessage = {
                    id: `assistant_${Date.now()}`,
                    type: 'assistant',
                    content: `I've analyzed your question "${data.natural_language_query}" and created a visualization based on ${data.data_source.row_count} rows of data.`,
                    timestamp: new Date(),
                    chartConfig: data.chart.config,
                    queryAnalysis: data.analytics.query_analysis,
                    businessInsights: data.analytics.business_insights
                };

                setMessages(prev => [...prev, assistantMessage]);

                if (onChartGenerated && data.chart.config) {
                    onChartGenerated(data.chart.config, data.analytics.query_analysis);
                }

                message.success('Chart generated successfully!');
            } else {
                const errorMessage: ChatMessage = {
                    id: `error_${Date.now()}`,
                    type: 'assistant',
                    content: `I encountered an error while processing your request: ${data.error}. Please try rephrasing your question or check your data source.`,
                    timestamp: new Date()
                };

                setMessages(prev => [...prev, errorMessage]);
                message.error('Failed to generate chart');
            }
        } catch (error) {
            console.error('Chat-to-chart error:', error);
            
            // Remove loading message
            setMessages(prev => prev.filter(msg => msg.id !== loadingMessage.id));
            
            const errorMessage: ChatMessage = {
                id: `error_${Date.now()}`,
                type: 'assistant',
                content: 'I encountered a technical error. Please try again or check your connection.',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, errorMessage]);
            message.error('Failed to process request');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const renderMessage = (message: ChatMessage) => {
        const isUser = message.type === 'user';
        
        return (
            <div
                key={message.id}
                style={{
                    display: 'flex',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                    marginBottom: 16
                }}
            >
                <div
                    style={{
                        maxWidth: '80%',
                        display: 'flex',
                        flexDirection: isUser ? 'row-reverse' : 'row',
                        alignItems: 'flex-start',
                        gap: 8
                    }}
                >
                    <Avatar
                        icon={isUser ? <UserOutlined /> : <RobotOutlined />}
                        style={{
                            backgroundColor: isUser ? '#1890ff' : '#52c41a',
                            flexShrink: 0
                        }}
                    />
                    
                    <div
                        style={{
                            backgroundColor: isUser ? '#e6f7ff' : '#f6ffed',
                            padding: '12px 16px',
                            borderRadius: 12,
                            border: `1px solid ${isUser ? '#91d5ff' : '#b7eb8f'}`,
                            maxWidth: '100%'
                        }}
                    >
                        {message.loading ? (
                            <Space>
                                <Spin size="small" />
                                <Text>{message.content}</Text>
                            </Space>
                        ) : (
                            <>
                                <Paragraph style={{ margin: 0, whiteSpace: 'pre-line' }}>
                                    {message.content}
                                </Paragraph>
                                
                                {message.queryAnalysis && (
                                    <div style={{ marginTop: 12 }}>
                                        <Space wrap>
                                            <Text type="secondary">Query Type:</Text>
                                            {message.queryAnalysis.queryType.map(type => (
                                                <Tag key={type} color="blue">{type}</Tag>
                                            ))}
                                        </Space>
                                        
                                        {message.queryAnalysis.enhancedByLlm && (
                                            <Tag color="gold" style={{ marginTop: 4 }}>
                                                Enhanced by AI
                                            </Tag>
                                        )}
                                    </div>
                                )}
                                
                                {message.chartConfig && (
                                    <div style={{ marginTop: 16 }}>
                                        <ChartVisualization
                                            config={message.chartConfig}
                                            height={300}
                                        />
                                    </div>
                                )}
                                
                                {message.businessInsights && message.businessInsights.length > 0 && (
                                    <div style={{ marginTop: 12 }}>
                                        <Divider style={{ margin: '8px 0' }} />
                                        <Space direction="vertical" style={{ width: '100%' }}>
                                            <Text strong>
                                                <BulbOutlined /> Business Insights:
                                            </Text>
                                            {message.businessInsights.map((insight, index) => (
                                                <Alert
                                                    key={index}
                                                    message={insight.title}
                                                    description={insight.description}
                                                    type="info"
                                                    size="small"
                                                    showIcon
                                                />
                                            ))}
                                        </Space>
                                    </div>
                                )}
                            </>
                        )}
                        
                        <Text
                            type="secondary"
                            style={{
                                fontSize: 11,
                                display: 'block',
                                textAlign: isUser ? 'right' : 'left',
                                marginTop: 4
                            }}
                        >
                            {message.timestamp.toLocaleTimeString()}
                        </Text>
                    </div>
                </div>
            </div>
        );
    };

    const suggestedQuestions = [
        "Show me trends over time",
        "What are the top 10 values?",
        "Compare different categories",
        "Are there any outliers or anomalies?",
        "Show me the distribution of values",
        "What patterns can you find?"
    ];

    return (
        <Card
            title={
                <Space>
                    <BarChartOutlined />
                    <Title level={4} style={{ margin: 0 }}>
                        Chat to Chart
                    </Title>
                    <Tag color="blue">{dataSource.name}</Tag>
                </Space>
            }
            extra={
                <Button
                    icon={<ReloadOutlined />}
                    onClick={() => setMessages([])}
                    disabled={loading}
                >
                    Clear Chat
                </Button>
            }
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0 }}
        >
            {/* Messages Area */}
            <div
                style={{
                    flex: 1,
                    padding: 16,
                    overflowY: 'auto',
                    maxHeight: 'calc(100vh - 300px)',
                    minHeight: 400
                }}
            >
                {messages.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Start a conversation to generate charts"
                    >
                        <div style={{ marginTop: 16 }}>
                            <Text type="secondary">Try asking:</Text>
                            <List
                                size="small"
                                dataSource={suggestedQuestions}
                                renderItem={question => (
                                    <List.Item>
                                        <Button
                                            type="link"
                                            size="small"
                                            onClick={() => setInputValue(question)}
                                            style={{ padding: 0, height: 'auto' }}
                                        >
                                            "{question}"
                                        </Button>
                                    </List.Item>
                                )}
                            />
                        </div>
                    </Empty>
                ) : (
                    <>
                        {messages.map(renderMessage)}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input Area */}
            <div style={{ padding: 16, borderTop: '1px solid #f0f0f0' }}>
                <Space.Compact style={{ width: '100%' }}>
                    <TextArea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask me anything about your data... (Press Enter to send, Shift+Enter for new line)"
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        disabled={loading}
                    />
                    <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={handleSendMessage}
                        loading={loading}
                        disabled={!inputValue.trim()}
                    >
                        Send
                    </Button>
                </Space.Compact>
            </div>
        </Card>
    );
};

export default ChatToChart;