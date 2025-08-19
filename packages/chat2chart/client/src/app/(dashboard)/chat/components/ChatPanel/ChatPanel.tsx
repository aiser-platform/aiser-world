import { IFileUpload } from '@/app/components/FileUpload/types';
import { fetchApi } from '@/utils/api';
import { apiService } from '@/services/apiService';
import { SendOutlined, BulbOutlined, AudioOutlined, LinkOutlined, DatabaseOutlined, SettingOutlined, UserOutlined, RobotOutlined, PlusOutlined, FileTextOutlined, BarChartOutlined, MessageOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Input, Card, Tag, Space, Tooltip, Alert, Typography, Avatar, Divider, Empty, Spin, Select } from 'antd';
import UniversalDataSourceModal from '@/app/components/UniversalDataSourceModal/UniversalDataSourceModal';
import ModeSelector from '@/app/components/ModeSelector/ModeSelector';
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import shortid from 'shortid';
import {
    DataType,
    ExtendedTable,
    IChatMessage,
    IChatPrompt,
    IConversation,
    IDatabase,
    Pagination,
} from '../../types';
import ChatMessageBox from './MessageBox';
import './styles.css';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const CHAT_LOADING_MESSAGE = '🤖 AI is analyzing your request...';
const LIMIT = 10;

interface ChatPanelProps {
    id: string;
    file?: IFileUpload;
    db?: IDatabase;
    schema?: string;
    tables?: ExtendedTable[];
    customAIModel?: string;
    onDefaultDbChange?: (db?: IDatabase) => void;
    onDefaultSchemaChange?: (schema?: string) => void;
    onDefaultTablesChange?: (tables: ExtendedTable[]) => void;
    onFileChange?: (file?: IFileUpload) => void;
    callback: (props: { conversation: IConversation }) => void;
    selectedDataSource?: any; // Data source selected from data page
    conversationId?: string | null; // Current conversation ID
}

const ChatPanel: React.FC<ChatPanelProps> = (props) => {
    const [loading, setLoading] = React.useState(false);
    const [prompt, setPrompt] = React.useState<string>('');
    const [messages, setMessages] = React.useState<Array<IChatMessage>>([]);
    const [messageCache, setMessageCache] = React.useState<{
        [key: string]: {
            messages: IChatMessage[];
            conversation: IConversation;
            pagination: Pagination;
        };
    }>({});

    const [conversation, setConversation] = React.useState<IConversation | null>(null);
    const [pagination, setPagination] = React.useState<Pagination>({
        offset: 0,
        total_pages: 0,
        limit: LIMIT,
        total: 0,
        current_page: 0,
        has_more: false,
    });

    const [chatLoading, setChatLoading] = React.useState<boolean>(false);
    const suggestedQuestions = React.useMemo(() => [
        "Show me sales trends over the last 6 months",
        "What are the top performing products?",
        "Compare revenue by region",
        "Analyze customer satisfaction scores"
    ], []);
    const [isListening, setIsListening] = React.useState<boolean>(false);
    const [dataSourceModalVisible, setDataSourceModalVisible] = React.useState<boolean>(false);
    const [analysisMode, setAnalysisMode] = React.useState<string>('main');
    const [openAIModel, setOpenAIModel] = React.useState<string | undefined>(undefined);

    const containerRef = React.useRef<null | HTMLDivElement>(null);
    const textAreaRef = React.useRef<null | HTMLTextAreaElement>(null);

    // Load messages from localStorage and restore charts when component mounts
    useEffect(() => {
        // Load saved messages from localStorage
        const savedMessages = localStorage.getItem('chat_messages');
        if (savedMessages) {
            try {
                const parsedMessages = JSON.parse(savedMessages);
                setMessages(parsedMessages);
            } catch (error) {
                console.error('Failed to load saved messages:', error);
            }
        }
    }, []);

    // Load conversation-specific messages when conversationId changes
    useEffect(() => {
        if (props.conversationId) {
            const conversationKey = `conv_messages_${props.conversationId}`;
            const savedMessages = localStorage.getItem(conversationKey);
            if (savedMessages) {
                try {
                    const parsedMessages = JSON.parse(savedMessages);
                    setMessages(parsedMessages);
                } catch (error) {
                    console.error('Failed to load conversation messages:', error);
                }
            } else {
                // New conversation - clear messages
                setMessages([]);
            }
        }
    }, [props.conversationId]);

    // Handle conversation changes - clear messages when switching to new conversation
    useEffect(() => {
        if (props.conversationId) {
            const currentConversationId = localStorage.getItem('current_conversation_id');
            if (currentConversationId !== props.conversationId) {
                // New conversation - clear messages
                setMessages([]);
                localStorage.removeItem('chat_messages');
                localStorage.setItem('current_conversation_id', props.conversationId);
            }
        }
    }, [props.conversationId]);

    // Restore charts when component mounts or messages change
    useEffect(() => {
        if (messages.length > 0) {
            // Wait for DOM to be ready, then restore charts
            setTimeout(() => {
                restoreCharts();
            }, 100);
        }
    }, []); // Only run once on mount, not on every message change

    // Restore charts from localStorage
    const restoreCharts = () => {
        messages.forEach((message) => {
            if (message.chartData) {
                const chartDataKey = `chart_${message.id}`;
                const storedChartData = localStorage.getItem(chartDataKey);
                if (storedChartData) {
                    const chartData = JSON.parse(storedChartData);
                    // Check if chart container exists but needs re-rendering
                    const messageContainer = document.querySelector(`[data-message-id="${message.id}"]`);
                    if (messageContainer && !messageContainer.querySelector('.echarts-container')) {
                        // Re-render the chart
                        renderECharts(chartData, message.id);
                    }
                }
            }
        });
    };

    // Prevent chart re-rendering on scroll or other interactions
    const preventChartReRendering = useCallback(() => {
        const chartContainers = document.querySelectorAll('.echarts-container');
        chartContainers.forEach(container => {
            if (container instanceof HTMLElement) {
                container.style.pointerEvents = 'none';
                container.style.userSelect = 'none';
            }
        });
    }, []);

    // Add a separate effect to handle chart restoration when messages change
    useEffect(() => {
        if (messages.length > 0) {
            // Only restore charts for new messages that have chartData
            const newMessagesWithCharts = messages.filter(msg => 
                msg.chartData && !localStorage.getItem(`chart_${msg.id}`)
            );
            
            if (newMessagesWithCharts.length > 0) {
                setTimeout(() => {
                    newMessagesWithCharts.forEach(msg => {
                        if (msg.chartData) {
                            renderECharts(msg.chartData, msg.id);
                        }
                    });
                }, 100);
            }
        }
    }, [messages]);

    // Prevent unnecessary chart re-rendering
    const chartRenderedRef = useRef<Set<string>>(new Set());
    
    // Save chart rendered state to localStorage
    const saveChartState = useCallback(() => {
        const chartIds = Array.from(chartRenderedRef.current);
        localStorage.setItem('chart_rendered_state', JSON.stringify(chartIds));
    }, []);
    
    // Check if chart is already rendered
    const isChartRendered = useCallback((messageId: string) => {
        return chartRenderedRef.current.has(messageId);
    }, []);
    
    // Mark chart as rendered
    const markChartRendered = useCallback((messageId: string) => {
        chartRenderedRef.current.add(messageId);
        saveChartState(); // Save state immediately
    }, [saveChartState]);

    // Load chart rendered state from localStorage on mount
    useEffect(() => {
        const savedChartState = localStorage.getItem('chart_rendered_state');
        if (savedChartState) {
            try {
                const chartIds = JSON.parse(savedChartState);
                chartIds.forEach((id: string) => chartRenderedRef.current.add(id));
            } catch (error) {
                console.error('Failed to load chart state:', error);
            }
        }
    }, []);

    // Prevent chart re-rendering on scroll
    useEffect(() => {
        const handleScroll = () => {
            preventChartReRendering();
        };

        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
            chatMessages.addEventListener('scroll', handleScroll);
            return () => chatMessages.removeEventListener('scroll', handleScroll);
        }
    }, [preventChartReRendering]);

    // Format message content with proper markdown/HTML
    const formatMessageContent = (content: string): string => {
        if (!content) return '';
        
        return content
            // Convert markdown headers
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            // Convert bold text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Convert italic text
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Convert code blocks
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            // Convert inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Convert lists
            .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
            .replace(/^- (.*$)/gim, '<li>$1</li>')
            // Convert line breaks (but reduce excessive ones)
            .replace(/\n\s*\n\s*\n/g, '<br/><br/>')
            .replace(/\n\s*\n/g, '<br/>')
            .replace(/\n/g, ' ')
            // Convert links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            // Clean up excessive whitespace
            .replace(/\s+/g, ' ')
            .trim();
    };





    const containerToBottom = () => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    };

    const abortControllerRef = React.useRef<AbortController | null>(null);
    const activeRequestRef = React.useRef<string | null>(null);

    // Enhanced message handling
    const addMessage = React.useCallback((message: IChatMessage) => {
        setMessages((prevMessages: Array<IChatMessage>) => {
            const filteredMessages = prevMessages.filter(msg => msg.id !== 'loading');
            const newMessages = [...filteredMessages, message];
            
            // Save to localStorage for persistence
            localStorage.setItem('chat_messages', JSON.stringify(newMessages));
            
            // Also save to conversation-specific storage
            if (props.conversationId) {
                const conversationKey = `conv_messages_${props.conversationId}`;
                localStorage.setItem(conversationKey, JSON.stringify(newMessages));
            }
            
            return newMessages;
        });
    }, [props.conversationId]);

    const deleteMessage = React.useCallback((messageId: string) => {
        setMessages((prevMessages: Array<IChatMessage>) =>
            prevMessages.filter(msg => msg.id !== messageId)
        );
    }, []);

    // Enhanced AI chat function
    const chatToAI = React.useCallback(async (_prompt: string) => {
        if (!_prompt.trim()) return;
        
        setChatLoading(true);

        // Create user message
        const userMessage = {
            id: shortid.generate(),
            query: _prompt,
            answer: '',
            created_at: new Date(),
            updated_at: new Date()
        };
        addMessage(userMessage);

        // Create AI loading message
        const loadingMessage = {
            id: `loading-${shortid.generate()}`,
            query: '',
            answer: CHAT_LOADING_MESSAGE,
            created_at: new Date(),
            updated_at: new Date()
        };
        addMessage(loadingMessage);

        containerToBottom();

        try {
            // Check if we have a data source
            const hasDataSource = props.file || props.db || props.selectedDataSource;
            
            if (hasDataSource) {
                // Use AI service for data analysis
                let dataSourceId = '';
                let dataSourceType = '';
                
                if (props.selectedDataSource?.id) {
                    dataSourceId = props.selectedDataSource.id;
                    dataSourceType = props.selectedDataSource.type || 'unknown';
                } else if (props.file?.uuid_filename) {
                    dataSourceId = `file_${props.file.uuid_filename}`;
                    dataSourceType = 'file';
                } else if (props.db?.id) {
                    dataSourceId = `db_${props.db.id}`;
                    dataSourceType = 'database';
                }
                
                if (!dataSourceId) {
                    throw new Error('No valid data source identified');
                }

                try {
                    console.log('🔍 Calling AI chat analysis endpoint:', dataSourceId);
                    
                    const response = await fetch('http://localhost:8000/ai/chat/analyze', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            query: _prompt,
                            data_source_id: dataSourceId,
                            business_context: 'data_analytics'
                        }),
                    });
                    
                    console.log('📡 AI service response status:', response.status);

                    if (!response.ok) {
                        throw new Error('Failed to process your request with AI');
                    }

                    const result = await response.json();
                    console.log('📡 AI analysis response:', result);
                    
                    if (result.success) {
                        // Create clean AI response with only actual analysis
                        const aiMessage = {
                            id: shortid.generate(),
                            query: '',
                            answer: `${result.analysis}`,
                            created_at: new Date(),
                            updated_at: new Date()
                        };
                        
                        // Replace loading message with AI response
                        deleteMessage(loadingMessage.id);
                        addMessage(aiMessage);
                        
                        // Optionally generate ECharts visualization
                        if (dataSourceId && (_prompt.toLowerCase().includes('chart') || _prompt.toLowerCase().includes('visual'))) {
                            generateEChartsVisualization(_prompt, dataSourceId, dataSourceType);
                        }
                    } else {
                        throw new Error(result.error || 'AI analysis failed');
                    }
                } catch (error) {
                    console.error('AI service error:', error);
                    throw new Error('Failed to process your request with AI service');
                }
            } else {
                // Fallback to AI service without data source
                try {
                    console.log('🔍 Calling AI chat analysis without data source...');
                    
                    const response = await fetch('http://localhost:8000/ai/chat/analyze', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                        body: JSON.stringify({
                            query: _prompt,
                            business_context: 'general_assistance'
                        }),
                });
                    
                    console.log('📡 AI service response status:', response.status);

                if (!response.ok) {
                        throw new Error('Failed to process your request with AI');
                    }

                    const result = await response.json();
                    console.log('📡 AI analysis response:', result);
                    
                    if (result.success) {
                        const aiMessage = {
                            id: shortid.generate(),
                            query: '',
                            answer: `${result.analysis}`,
                            created_at: new Date(),
                            updated_at: new Date()
                        };
                        
                        // Replace loading message with AI response
                        deleteMessage(loadingMessage.id);
                        addMessage(aiMessage);
                    } else {
                        throw new Error(result.error || 'AI analysis failed');
                    }
                } catch (error) {
                    console.error('AI service error:', error);
                    // Show fallback response
                    const fallbackMessage = {
                        id: shortid.generate(),
                        query: '',
                        answer: `I'm here to help! To get the most out of our conversation:\n\n1. **Connect a data source** using the "Connect Data" button\n2. **Ask questions** about your data\n3. **Get AI-powered insights** and visualizations\n\n**Current Status:** No data source connected\n\n**Next Step:** Click "Connect Data" to upload files or connect databases!\n\n**🎯 Even without data, I can:**\n- Generate sample charts and data\n- Explain data analysis concepts\n- Help you plan your analytics strategy\n- Create ECharts configurations\n- Provide business intelligence insights\n\n**💭 Try asking:**\n- "Show me a sample bar chart"\n- "Generate some test sales data"\n- "Create a dashboard layout"\n- "Explain data visualization best practices"`,
                        created_at: new Date(),
                        updated_at: new Date()
                    };
                    
                    deleteMessage(loadingMessage.id);
                    addMessage(fallbackMessage);
                }
            }
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage = {
                id: shortid.generate(),
                query: '',
                answer: 'Sorry, I could not process your request. Please try again or check your data connection.',
                created_at: new Date(),
                updated_at: new Date()
            };
            
            deleteMessage(loadingMessage.id);
            addMessage(errorMessage);
        } finally {
            setChatLoading(false);
            containerToBottom();
            textAreaRef.current?.focus();
        }
    }, []);

    // ECharts visualization generation
    const generateEChartsVisualization = React.useCallback(async (query: string, dataSourceId: string, dataSourceType: string) => {
        try {
            const dataSummary = {
                data_source_id: dataSourceId,
                data_type: dataSourceType,
                query: query,
                timestamp: new Date().toISOString()
            };
            
            const response = await fetch('/api/ai/echarts/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: query,
                    data_source_id: dataSourceId,
                    data_summary: dataSummary
                }),
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    const chartMessage = {
                        id: shortid.generate(),
                        query: '',
                        answer: `## 📊 ECharts Visualization Generated\n\n**Query:** ${query}\n\n**Chart Type:** ${result.chart_type}\n\n**🤖 AI Engine:** ${result.ai_engine}\n\n**🎨 View Chart:** [Open in Chart Builder](/chart-builder?config=${encodeURIComponent(JSON.stringify(result.echarts_config))})`,
                        created_at: new Date(),
                        updated_at: new Date()
                    };
                    addMessage(chartMessage);
                }
            }
        } catch (error) {
            console.error('ECharts generation failed:', error);
        }
    }, []);

    // Enhanced input handling
    const handleSendMessage = () => {
        if (prompt.trim() && !chatLoading) {
            chatToAI(prompt.trim());
            setPrompt('');
        }
    };

    // Handle sample card click: create user message and pre-generated chart; don't auto-call AI
    const handleSampleCardClick = (item: any) => {
        // 1) Add the user message (the question)
        const userMessage = {
            id: shortid.generate(),
            query: item.question,
            answer: '',
            created_at: new Date(),
            updated_at: new Date()
        };
        addMessage(userMessage);

        // 2) Show the pre-generated analysis/chart immediately
        showPreGeneratedAnalysis(item);

        // 3) Populate input so user can continue if they want
        setPrompt(item.question);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Enhanced welcome message
    const renderWelcomeMessage = () => {
        if (messages.length === 0) {
            return (
                <div className="welcome-container">
                    <div className="welcome-header">
                        <RobotOutlined className="welcome-icon" />
                        <Title level={2}>Welcome to Aiser AI Data Analysis</Title>
                        <Paragraph className="welcome-subtitle">
                            Your AI-powered data companion. Start with sample data questions or connect your own sources. Type your message first, then see AI-powered insights and charts.
                        </Paragraph>
                    </div>
                    
                    <div className="data-source-status">
                        {props.file || props.db || props.selectedDataSource ? (
                            <Alert
                                message="Data Source Connected"
                                description={`Ready to analyze: ${props.file?.filename || props.db?.name || props.selectedDataSource?.name}`}
                                type="success"
                                showIcon
                                icon={<DatabaseOutlined />}
                            />
                        ) : (
                            <Alert
                                message="No Data Source Connected"
                                description="Connect a data source to start analyzing your data with AI"
                                type="info"
                                showIcon
                                icon={<LinkOutlined />}
                                action={
                                    <Button 
                                        size="small" 
                                        type="primary"
                                        onClick={() => setDataSourceModalVisible(true)}
                                    >
                                        Add Your Data
                                    </Button>
                                }
                            />
                        )}
                    </div>

                    <div className="suggested-questions">
                        <Title level={4}>🚀 Start with Sample Data</Title>
                        <Paragraph className="sample-data-intro">
                            Experience AI-powered analysis with these pre-built datasets. Click any card to use the question, then send your message to see insights and charts.
                        </Paragraph>
                        <div className="question-grid">
                            {[
                                {
                                    icon: "🏦",
                                    title: "Analyze Bank Data",
                                    tag: "bank_customers",
                                    question: "What is the total monthly transaction $?",
                                    preGeneratedInsights: "Based on our bank dataset with 1,000 customers and 15,000+ transactions, here are key insights:",
                                    preGeneratedChart: {
                                        title: "Monthly Transaction Volume Trends",
                                        type: "line",
                                        data: [125000, 118000, 132000, 145000, 158000, 167000, 172000, 169000, 181000, 195000, 210000, 225000],
                                        months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                                    }
                                },
                                {
                                    icon: "🛒",
                                    title: "Analyze E-commerce Data",
                                    tag: "ecommerce_sales",
                                    question: "Show me sales trends by category",
                                    preGeneratedInsights: "Our e-commerce dataset reveals sales patterns across 8 categories with 2,000+ transactions:",
                                    preGeneratedChart: {
                                        title: "Sales by Category",
                                        type: "bar",
                                        data: [45000, 38000, 29000, 22000, 18000, 15000, 12000, 10000],
                                        categories: ["Electronics", "Clothing", "Home & Garden", "Books", "Sports", "Beauty", "Toys", "Automotive"]
                                    }
                                },
                                {
                                    icon: "📱",
                                    title: "Analyze Telecom Data",
                                    tag: "telecom_customers",
                                    question: "What's the customer churn rate?",
                                    preGeneratedInsights: "Telecom dataset analysis shows customer behavior across 800 subscribers:",
                                    preGeneratedChart: {
                                        title: "Satisfaction Scores by Plan Type",
                                        type: "bar",
                                        data: [6.8, 7.2, 8.1, 8.9],
                                        plans: ["Basic", "Standard", "Premium", "Unlimited"]
                                    }
                                },
                                {
                                    icon: "🌍",
                                    title: "Analyze Poverty Data",
                                    tag: "poverty_indicators",
                                    question: "Show poverty rates by region",
                                    preGeneratedInsights: "Regional poverty analysis across 50 areas reveals geographic patterns:",
                                    preGeneratedChart: {
                                        title: "Poverty Rates by Region",
                                        type: "bar",
                                        data: [8.5, 15.2, 12.8, 9.1, 13.6],
                                        regions: ["North", "South", "East", "West", "Central"]
                                    }
                                }
                            ].map((item, index) => (
                                <div key={index} className="sample-data-card">
                                    <div className="card-icon">{item.icon}</div>
                                    <div className="card-title">{item.title}</div>
                                    <Tag color="blue" className="sample-tag">{item.tag}</Tag>
                                    <Button
                                        type="primary"
                                        size="small"
                                        className="analyze-button"
                                        onClick={() => handleSampleCardClick(item)}
                                        icon={<BulbOutlined />}
                                        block
                                    >
                                        Analyze
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Enhanced message rendering
    const renderMessages = () => {
        if (messages.length === 0) {
            return null; // No messages to render, welcome shown by renderWelcomeMessage
        }

        return messages.map((message) => (
            <div key={message.id} className="message-container" data-message-id={message.id}>
                {message.query && (
                    <div className="user-message">
                        <Avatar 
                            icon={<UserOutlined />} 
                            className="user-avatar"
                        />
                        <div className="message-content user-content">
                            <div className="message-header">
                                <span className="user-name">{getUserName()}</span>
                            </div>
                            <div className="message-text">{message.query}</div>
                            <div className="message-time">{formatTime(message.created_at || new Date())}</div>
                        </div>
                    </div>
                )}
                
                {message.answer && (
                    <div className="ai-message">
                        <Avatar 
                            icon={<RobotOutlined />} 
                            className="ai-avatar"
                        />
                        <div className="message-content ai-content">
                            <div className="message-header">
                                <span className="ai-name">Aiser AI</span>
                                <span className="ai-role">GPT-5 Mini</span>
                                <span className="ai-status">🟢 Online</span>
                            </div>
                            <div className="message-text">
                                <div 
                                    className="markdown-content"
                                    dangerouslySetInnerHTML={{ __html: formatMessageContent(message.answer) }}
                                />
                            </div>
                            <div className="message-time">{formatTime(message.created_at || new Date())}</div>
                </div>
            </div>
                )}
            </div>
        ));
    };

    // Get user name from email
    const getUserName = () => {
        // TODO: Get actual username from user context/API
        return 'Admin'; // Placeholder - should get from user context
    };

    // Format timestamp
    const formatTime = (timestamp: string | Date) => {
        if (!timestamp) return 'Now';
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    };

    // Handle suggestion clicks
    const handleSuggestionClick = (suggestion: string) => {
        setPrompt(suggestion);
        handleSendMessage();
    };

    // Show pre-generated analysis immediately
    const showPreGeneratedAnalysis = (item: any) => {
        // Create pre-generated chart message with simple structure
        const chartMessage = {
            id: shortid.generate(),
            query: undefined,
            answer: `
                <div class="pre-generated-analysis">
                    <div class="insights-text">📊 ${item.preGeneratedInsights}</div>
                    <div class="pre-generated-chart">
                        <h5>${item.preGeneratedChart.title}</h5>
                        <div class="chart-loading" id="loading-${shortid.generate()}">
                            <div class="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            created_at: new Date(),
            updated_at: new Date(),
            chartData: item.preGeneratedChart
        };
        addMessage(chartMessage);
        
        // Render chart immediately after message is added
        setTimeout(() => {
            renderECharts(chartMessage.chartData, chartMessage.id);
        }, 500);
    };

    const renderECharts = (chartData: any, messageId: string) => {
        // Find the message container and replace loading state with chart
        const messageContainer = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageContainer) return;

        // Check if chart is already rendered to prevent duplication
        if (isChartRendered(messageId) || messageContainer.getAttribute('data-chart-rendered') === 'true') {
            console.log('Chart already rendered for message:', messageId);
            return;
        }

        // Find the specific loading element for this chart
        const chartLoading = messageContainer.querySelector('.chart-loading');
        if (!chartLoading) return;

        // Store chart data in the message container for persistence
        messageContainer.setAttribute('data-chart-rendered', 'true');
        
        // Store chart data in localStorage for persistence across navigation
        const chartDataKey = `chart_${messageId}`;
        localStorage.setItem(chartDataKey, JSON.stringify(chartData));
        
        // Mark chart as rendered in component state
        markChartRendered(messageId);

        // Create chart container
        const chartContainer = document.createElement('div');
        chartContainer.className = 'echarts-container';
        chartContainer.style.width = '100%';
        chartContainer.style.height = '300px';

        // Replace loading state with chart container
        chartLoading.replaceWith(chartContainer);

        // Import ECharts dynamically (handle both default/named exports)
        import('echarts').then((mod) => {
            const echarts = (mod as any).default || mod;
            try {
                const chart = echarts.init(chartContainer);
                
                const option = {
                    backgroundColor: 'var(--background)',
                    textStyle: {
                        color: '#e1e8ed'
                    },
                    tooltip: {
                        trigger: chartData.type === 'line' ? 'axis' : 'item',
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        borderColor: '#1890ff',
                        textStyle: {
                            color: '#fff'
                        }
                    },
                    xAxis: chartData.type === 'line' ? {
                        type: 'category',
                        data: chartData.months || chartData.categories || chartData.plans || chartData.regions,
                        axisLabel: {
                            color: '#8b9bb4'
                        },
                        axisLine: {
                            lineStyle: {
                                color: '#2a2e39'
                            }
                        }
                    } : {
                        type: 'category',
                        data: chartData.categories || chartData.plans || chartData.regions || chartData.months,
                        axisLabel: {
                            color: '#8b9bb4'
                        },
                        axisLine: {
                            lineStyle: {
                                color: '#2a2e39'
                            }
                        }
                    },
                    yAxis: {
                        type: 'value',
                        axisLabel: {
                            color: '#8b9bb4'
                        },
                        axisLine: {
                            lineStyle: {
                                color: '#2a2e39'
                            }
                        },
                        splitLine: {
                            lineStyle: {
                                color: '#2a2e39'
                            }
                        }
                    },
                    series: [{
                        name: chartData.title,
                        type: chartData.type,
                        data: chartData.data,
                        itemStyle: {
                            color: chartData.type === 'line' ? '#1890ff' : 
                                   chartData.type === 'bar' ? '#52c41a' : '#722ed1'
                        },
                        smooth: chartData.type === 'line',
                        radius: chartData.type === 'pie' ? '50%' : undefined
                    }]
                };

                chart.setOption(option);
                
                // Handle window resize
                window.addEventListener('resize', () => chart.resize());
                
                // Log success for debugging
                console.log('Chart rendered successfully:', chartData.title);
            } catch (error) {
                console.error('Error rendering chart:', error);
                // Fallback: show error message
                chartContainer.innerHTML = '<div class="chart-error">Chart could not be rendered</div>';
            }
        }).catch((error) => {
            console.error('Failed to import ECharts:', error);
            // Fallback: show error message
            chartContainer.innerHTML = '<div class="chart-error">Chart library not available</div>';
        });
    };

    // Analyze sample data with AI
    const analyzeSampleData = async (datasetType: string, question: string) => {
        try {
            setChatLoading(true);
            
            // Call the sample data analysis endpoint
            const response = await fetch(`/api/ai/sample-data/${datasetType}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: question,
                    data_source_id: `sample_${datasetType}`,
                    data_summary: null
                }),
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    const aiMessage = {
                        id: shortid.generate(),
                        query: question,
                        answer: result.analysis,
                        created_at: new Date(),
                        updated_at: new Date()
                    };
                    addMessage(aiMessage);
                }
            } else {
                // Fallback to regular chat if sample data analysis fails
                chatToAI(question);
            }
        } catch (error) {
            console.error('Sample data analysis failed:', error);
            // Fallback to regular chat
            chatToAI(question);
        } finally {
            setChatLoading(false);
        }
    };

    return (
        <div className="enhanced-chat-panel">
            {/* Chat Header */}
            <div className="chat-header">
                <div className="header-content">
                    <Title level={4} className="chat-title">
                        <MessageOutlined /> AI-Native Chat
                    </Title>
                    <div className="header-actions">
                        <Button
                            icon={<DatabaseOutlined />}
                            onClick={() => setDataSourceModalVisible(true)}
                            type="primary"
                            ghost
                        >
                            {props.file || props.db || props.selectedDataSource ? 'Manage Data' : 'Connect Data'}
                        </Button>
                        <Button
                            icon={<BarChartOutlined />}
                            onClick={() => window.location.href = '/chart-builder'}
                            type="default"
                            ghost
                        >
                            Chart Builder
                        </Button>
                    </div>
                </div>
            </div>

            {/* Chat Messages Area */}
            <div className="chat-messages" ref={containerRef}>
                {renderWelcomeMessage()}
                {renderMessages()}
                
                {chatLoading && (
                    <div className="ai-typing-message">
                        <Avatar 
                            icon={<RobotOutlined />} 
                            className="ai-avatar"
                        />
                        <div className="message-content ai-content typing">
                            <div className="message-header">
                                <span className="ai-name">Aiser AI</span>
                                <span className="ai-role">GPT-5 Mini</span>
                                <span className="ai-status">🟡 Thinking...</span>
                            </div>
                            <div className="typing-indicator">
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                            </div>
                            <div className="typing-text">Analyzing your request...</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Enhanced Chat Input */}
            <div className="enhanced-chat-input">
                <div className="input-container">
                        <TextArea
                            ref={textAreaRef}
                            value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask me anything about your data... (Press Enter to send, Shift+Enter for new line)"
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        disabled={chatLoading}
                        className="chat-textarea"
                    />
                    <div className="input-actions">
                        <Button
                            icon={<AudioOutlined />}
                            onClick={() => setIsListening(!isListening)}
                            type={isListening ? 'primary' : 'default'}
                            disabled={chatLoading}
                            className="voice-button"
                        />
                        <Button
                            icon={<SendOutlined />}
                            onClick={handleSendMessage}
                            type="primary"
                            disabled={!prompt.trim() || chatLoading}
                            loading={chatLoading}
                            className="send-button"
                        >
                            Send
                        </Button>
                    </div>
                </div>
                
                {/* Quick Actions */}
                <div className="quick-actions">
                    <Select
                        defaultValue="standard"
                        style={{ width: 140 }}
                        size="small"
                    >
                        <Select.Option value="standard">Standard Mode</Select.Option>
                        <Select.Option value="deep" disabled>Deep Analysis (Coming Soon)</Select.Option>
                    </Select>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Select
                            value={openAIModel || 'gpt-5-mini'}
                            onChange={setOpenAIModel}
                            style={{ width: 140 }}
                            size="small"
                            placeholder="AI Model"
                        >
                            <Select.Option value="gpt-5-mini">GPT-5 Mini</Select.Option>
                            <Select.Option value="gpt-4o-mini">GPT-4o Mini</Select.Option>
                            <Select.Option value="gpt-3.5-turbo">GPT-3.5 Turbo</Select.Option>
                        </Select>
                        <Tooltip title="Refresh AI Model List">
                            <Button
                                type="text"
                                size="small"
                                icon={<ReloadOutlined />}
                                onClick={() => {
                                    // Refresh logic can be added here
                                    console.log('Refreshing AI model list...');
                                }}
                                style={{ padding: '4px' }}
                            />
                        </Tooltip>
                    </div>
                    
                    <Button
                        size="small"
                        onClick={() => setDataSourceModalVisible(true)}
                        icon={<PlusOutlined />}
                    >
                        Add Data
                    </Button>
                    <Button
                        size="small"
                        onClick={() => window.location.href = '/chart-builder'}
                        icon={<BarChartOutlined />}
                    >
                        Build Chart
                    </Button>
                </div>
            </div>

            {/* Universal Data Source Modal */}
            <UniversalDataSourceModal
                isOpen={dataSourceModalVisible}
                onClose={() => setDataSourceModalVisible(false)}
                onDataSourceCreated={(dataSource) => {
                    console.log('Data source created:', dataSource);
                    setDataSourceModalVisible(false);
                }}
                initialDataSourceType="file"
                isChatIntegration={true}
            />
        </div>
    );
};

// Optimize component with React.memo for better performance
export default React.memo(ChatPanel);
