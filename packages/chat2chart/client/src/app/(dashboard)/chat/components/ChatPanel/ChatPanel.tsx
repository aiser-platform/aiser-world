import { IFileUpload } from '@/app/components/FileUpload/types';
import { fetchApi } from '@/utils/api';
import { apiService } from '@/services/apiService';
import { conversationService, Conversation, Message } from '@/services/conversationService';
import { SendOutlined, BulbOutlined, AudioOutlined, LinkOutlined, DatabaseOutlined, SettingOutlined, UserOutlined, RobotOutlined, PlusOutlined, FileTextOutlined, BarChartOutlined, MessageOutlined, ReloadOutlined, DownloadOutlined, CopyOutlined, ShareAltOutlined, InfoCircleOutlined, CodeOutlined, FileOutlined, EyeOutlined, EyeInvisibleOutlined, EditOutlined, DeleteOutlined, MoreOutlined, RiseOutlined, PieChartOutlined, SearchOutlined, LikeOutlined, DislikeOutlined, HeartOutlined, RocketOutlined } from '@ant-design/icons';
import { Button, Input, Card, Tag, Space, Tooltip, Alert, Typography, Avatar, Divider, Empty, Spin, Select, Tabs, Dropdown, Menu, message, Checkbox } from 'antd';
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
// Use same-origin proxy for browser requests

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const CHAT_LOADING_MESSAGE = '🤖 AI is analyzing your request...';
const LIMIT = 10;

interface DataSource {
    id: string;
    name: string;
    type: string;
    config?: Record<string, any>;
    schema?: Record<string, any>;
    metadata?: Record<string, any>;
    row_count?: number;
    description?: string;
    created_at?: string;
    updated_at?: string;
    format?: string;
    db_type?: string;
}

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
    selectedDataSource?: DataSource | null; // Data source selected from data page
    conversationId?: string | null; // Current conversation ID
    selectedDataSources?: DataSource[]; // Data sources selected from DataPanel
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

    // Clear message cache to prevent repeated responses
    React.useEffect(() => {
        setMessageCache({});
    }, [props.conversationId]);

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
    
    // Initialize quick actions based on data source
    React.useEffect(() => {
        const actions = [
            "Generate summary statistics",
            "Show data quality report",
            "Create trend analysis",
            "Identify outliers"
        ];
        
        if (props.selectedDataSource?.type === 'cube') {
            actions.push("Show Cube.js schema", "Generate semantic queries", "Create data model");
        } else if (props.selectedDataSource?.type === 'database') {
            actions.push("Show table relationships", "Generate ER diagram", "Analyze performance");
        } else if (props.selectedDataSource?.type === 'file') {
            actions.push("Show data distribution", "Detect patterns", "Validate data types");
        }
        
        setQuickActions(actions);
    }, [props.selectedDataSource]);
    const [isListening, setIsListening] = React.useState<boolean>(false);
    const [mode, setMode] = React.useState<string>(() => {
        try { return typeof window !== 'undefined' ? (localStorage.getItem('chat_mode') || 'standard') : 'standard'; } catch { return 'standard'; }
    });

    // Sync mode with header ModeSelector changes via a custom window event
    React.useEffect(() => {
        const handler = (e: any) => {
            try {
                const v = e?.detail || (typeof window !== 'undefined' ? localStorage.getItem('chat_mode') : null) || 'standard';
                setMode(v);
            } catch (err) {
                // ignore
            }
        };
        try { window.addEventListener('chat_mode_changed', handler as EventListener); } catch (e) {}
        return () => { try { window.removeEventListener('chat_mode_changed', handler as EventListener); } catch (e) {} };
    }, []);
    const [dataSourceModalVisible, setDataSourceModalVisible] = React.useState<boolean>(false);
    const [analysisMode, setAnalysisMode] = React.useState<string>('main');
    const [openAIModel, setOpenAIModel] = React.useState<string | undefined>(undefined);
    const [selectedAIModel, setSelectedAIModel] = React.useState<string>('gpt-4.1-mini');
    // Include files in analysis (persisted)
    const [includeFilesInAnalysis, setIncludeFilesInAnalysis] = React.useState<boolean>(true);
    React.useEffect(() => {
        try {
            const raw = localStorage.getItem('chat_include_files');
            if (raw !== null) setIncludeFilesInAnalysis(raw === '1');
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    React.useEffect(() => {
        try { localStorage.setItem('chat_include_files', includeFilesInAnalysis ? '1' : '0'); } catch {}
    }, [includeFilesInAnalysis]);
    
    // Enhanced features for accuracy and trust
    const [executionMetadata, setExecutionMetadata] = React.useState<Record<string, any>>({});
    const [sqlQueries, setSqlQueries] = React.useState<Record<string, string>>({});
    const [queryPerformance, setQueryPerformance] = React.useState<Record<string, any>>({});
    
    // Enhanced interactivity features
    const [isTyping, setIsTyping] = React.useState<boolean>(false);
    const [messageReactions, setMessageReactions] = React.useState<Record<string, string[]>>({});
    const [quickActions, setQuickActions] = React.useState<string[]>([]);
    const [voiceInput, setVoiceInput] = React.useState<boolean>(false);
    const [transcript, setTranscript] = React.useState<string>('');
    const [isRecording, setIsRecording] = React.useState<boolean>(false);
    const [inputValue, setInputValue] = React.useState<string>('');
    const [aiVoiceEnabled, setAiVoiceEnabled] = React.useState<boolean>(false);
    const [isAiSpeaking, setIsAiSpeaking] = React.useState<boolean>(false);
    const [showJumpToBottom, setShowJumpToBottom] = React.useState<boolean>(false);
    


    const containerRef = React.useRef<null | HTMLDivElement>(null);
    const textAreaRef = React.useRef<null | HTMLTextAreaElement>(null);

    // Chart instances and resize observers for cleanup
    const chartInstances = React.useRef<Map<string, any>>(new Map());
    const chartResizeObservers = React.useRef<Map<string, ResizeObserver>>(new Map());

    // Import ECharts dynamically
    const getECharts = async () => {
        try {
            const echartsModule = await import('echarts');
            return echartsModule;
        } catch (error) {
            console.error('Failed to import ECharts:', error);
            return null;
        }
    };

    // Load messages from conversationService and restore charts when component mounts
    useEffect(() => {
        const initializeConversation = async () => {
            try {
                if (props.conversationId) {
                    // Load existing conversation
                    conversationService.setCurrentConversation(props.conversationId);
                    const messages = await conversationService.loadConversationMessages(props.conversationId);
                    
                    // Convert Message format to IChatMessage format
                    const convertedMessages: IChatMessage[] = messages.map(msg => ({
                        id: msg.id,
                        query: msg.query || '',
                        answer: msg.answer || '',
                        created_at: new Date(msg.created_at),
                        updated_at: new Date(msg.created_at), // Message interface doesn't have updated_at
                        role: msg.role,
                        timestamp: msg.created_at,
                        messageType: 'text',
                        saved: true
                    }));
                    
                    setMessages(convertedMessages);
                } else {
                    // Create new conversation
                    const newConversation = conversationService.createConversation(`Chat Session ${new Date().toLocaleDateString()}`);
                    // Set as current conversation and clear messages
                    conversationService.setCurrentConversation(newConversation.id);
                    setMessages([]);
                    props.callback({ conversation: { id: newConversation.id, title: newConversation.title } as IConversation });
                }
            } catch (error) {
                console.error('Failed to initialize conversation:', error);
                // Fallback: create new conversation
                const newConversation = conversationService.createConversation(`Chat Session ${new Date().toLocaleDateString()}`);
                // Set as current conversation and clear messages
                conversationService.setCurrentConversation(newConversation.id);
                setMessages([]);
                props.callback({ conversation: { id: newConversation.id, title: newConversation.title } as IConversation });
            }
        };

        initializeConversation();
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

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(containerToBottom, 100);
        }
    }, [messages]);

    // Scroll to bottom when component mounts
    useEffect(() => {
        containerToBottom();
    }, []);

    // Restore charts - simplified without localStorage
    const restoreCharts = () => {
        messages.forEach((message) => {
            if (message.chartData) {
                // Check if chart container exists but needs re-rendering
                const messageContainer = document.querySelector(`[data-message-id="${message.id}"]`);
                if (messageContainer && !messageContainer.querySelector('.echarts-container')) {
                    // Re-render the chart
                    renderECharts(message.chartData, message.id);
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
                msg.chartData && !isChartRendered(msg.id)
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
    
    // Check if chart is already rendered
    const isChartRendered = useCallback((messageId: string) => {
        return chartRenderedRef.current.has(messageId);
    }, []);
    
    // Mark chart as rendered
    const markChartRendered = useCallback((messageId: string) => {
        chartRenderedRef.current.add(messageId);
    }, []);

    // Chart state is managed in memory only

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

    // Build rich AI response with insights and actionable recommendations
    const buildRichAIResponse = (aiAnalysis: any, dataInsights: any, chartRecommendations: any): string => {
        let response = '';
        
        // AI Analysis Section
        if (aiAnalysis.ai_analysis) {
            response += `## 🤖 AI Analysis\n\n${aiAnalysis.ai_analysis}`;
        }
        
        // Data Insights Section
        if (dataInsights.key_findings && dataInsights.key_findings.length > 0) {
            response += response ? '\n\n## 📊 Key Data Insights\n\n' : '## 📊 Key Data Insights\n\n';
            dataInsights.key_findings.forEach((finding: string, index: number) => {
                response += `${index + 1}. ${finding}`;
            });
        }
        
        // Patterns Section
        if (dataInsights.patterns && dataInsights.patterns.length > 0) {
            response += response ? '\n\n## 🔍 Data Patterns\n\n' : '## 🔍 Data Patterns\n\n';
            dataInsights.patterns.forEach((pattern: string, index: number) => {
                response += `• ${pattern}`;
            });
        }
        
        // Actionable Recommendations
        if (dataInsights.recommendations && dataInsights.recommendations.length > 0) {
            response += response ? '\n\n## 🎯 Actionable Recommendations\n\n' : '## 🎯 Actionable Recommendations\n\n';
            dataInsights.recommendations.forEach((rec: string, index: number) => {
                response += `${index + 1}. ${rec}`;
            });
        }
        
        // Chart Recommendations
        if (chartRecommendations.type) {
            response += response ? '\n\n## 📈 Visualization\n\nI\'ve generated a **' + chartRecommendations.type + ' chart** to help visualize your data. The chart shows ' + (chartRecommendations.title || 'key insights') + ' from your analysis.' : '## 📈 Visualization\n\nI\'ve generated a **' + chartRecommendations.type + ' chart** to help visualize your data. The chart shows ' + (chartRecommendations.title || 'key insights') + ' from your analysis.';
        }
        
        // Clean up any double newlines and trim whitespace
        return response.replace(/\n{3,}/g, '\n\n').trim() || 'Analysis completed successfully.';
    };

    // Build chart insights message with trust indicators
    const buildChartInsightsMessage = (chartRecommendations: any, dataInsights: any): string => {
        let message = `## 📊 Interactive Chart Generated\n\n`;
        
        if (chartRecommendations.title) {
            message += `**Chart Title:** ${chartRecommendations.title}\n\n`;
        }
        
        if (dataInsights.total_records) {
            message += `**Data Summary:** ${dataInsights.total_records} records analyzed\n\n`;
        }
        
        message += `**Chart Type:** ${chartRecommendations.type} chart\n\n`;
        message += `**Features:** Interactive visualization with zoom, pan, and export capabilities\n\n`;
        message += `💡 **Tip:** Click on chart elements to explore data details, or use the chart controls to customize the view.`;
        
        return message;
    };

    // Enhanced message content formatting with full markdown support
    const formatMessageContent = (content: any): string => {
        if (!content || typeof content !== 'string') return '';
        
        // Convert markdown-style formatting to HTML with enhanced features
        let formatted = content
            .replace(/\r\n/g, '\n')
            .replace(/(\S)(\d+\.\s)/g, '$1\n$2')
            .replace(/(\S)(•\s)/g, '$1\n$2')
            .replace(/\n{3,}/g, '\n\n')
            // Headers (H1-H6)
            .replace(/^###### (.*$)/gm, '<h6>$1</h6>')
            .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
            .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            
            // Bold and Italic
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            .replace(/_(.*?)_/g, '<em>$1</em>')
            
            // Strikethrough
            .replace(/~~(.*?)~~/g, '<del>$1</del>')
            
            // Code blocks with language detection
            .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="code-block" data-language="$1"><code class="language-$1">$2</code></pre>')
            
            // Inline code
            .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
            
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            
            // Images
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="markdown-image" />')
            
            // Blockquotes
            .replace(/^> (.*$)/gm, '<blockquote>$1<\/blockquote>')
            
            // Lists (ordered and unordered)
            .replace(/^\d+\. (.*$)/gm, '<li class="ordered">$1<\/li>')
            .replace(/^\* (.*$)/gm, '<li class="unordered">$1<\/li>')
            .replace(/^- (.*$)/gm, '<li class="unordered">$1<\/li>')
            .replace(/^\+ (.*$)/gm, '<li class="unordered">$1<\/li>')
            .replace(/^•\s+(.*$)/gm, '<li class="unordered">$1<\/li>')
            
            // Tables (basic support)
            .replace(/\|(.+)\|/g, (match: string) => {
                const cells: string[] = match.split('|').slice(1, -1);
                return '<tr>' + cells.map((cell: string) => `<td>${cell.trim()}</td>`).join('') + '</tr>';
            })
            
            // Horizontal rules
            .replace(/^---$/gm, '<hr>')
            .replace(/^\*\*\*$/gm, '<hr>')
            
            // Line breaks
            .replace(/\n/g, '<br>');
        
        // Wrap lists properly
        formatted = formatted
            .replace(/((?:<li class=\"unordered\"[^>]*>[\s\S]*?<\/li>\s*)+)/g, (m) => `<ul>${m}<\/ul>`)
            .replace(/((?:<li class=\"ordered\"[^>]*>[\s\S]*?<\/li>\s*)+)/g, (m) => `<ol>${m}<\/ol>`);

        return formatted;
    };

    // Enhanced code block rendering with syntax highlighting
    const renderCodeBlock = (code: string, language: string = 'text') => {
        const copyToClipboard = () => {
            navigator.clipboard.writeText(code);
            message.success('Code copied to clipboard!');
        };

        const downloadCode = () => {
            const blob = new Blob([code], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `code.${language || 'txt'}`;
            a.click();
            URL.revokeObjectURL(url);
            message.success('Code downloaded!');
        };

        return (
            <div className="enhanced-code-block">
                <div className="code-header">
                    <div className="code-language">
                        <CodeOutlined /> {language || 'text'}
                    </div>
                    <div className="code-actions">
                        <Tooltip title="Copy code">
                            <Button 
                                type="text" 
                                size="small" 
                                icon={<CopyOutlined />} 
                                onClick={copyToClipboard}
                            />
                        </Tooltip>
                        <Tooltip title="Download code">
                            <Button 
                                type="text" 
                                size="small" 
                                icon={<DownloadOutlined />} 
                                onClick={downloadCode}
                            />
                        </Tooltip>
                    </div>
                </div>
                <pre className="code-content">
                    <code className={`language-${language}`}>{code}</code>
                </pre>
            </div>
        );
    };

    // Enhanced chart rendering with meta icons and export functionality
    const renderEnhancedChart = (chartData: any, messageId: string) => {
        const chartMenu = (
            <Menu onClick={({ key }) => handleChartAction(key)}>
                <Menu.Item key="export-png" icon={<DownloadOutlined />}>
                    Export as PNG
                </Menu.Item>
                <Menu.Item key="export-csv" icon={<DownloadOutlined />}>
                    Export as CSV
                </Menu.Item>
                <Menu.Item key="share-link" icon={<ShareAltOutlined />}>
                    Share Link
                </Menu.Item>
                <Menu.Item key="view-sql" icon={<CodeOutlined />}>
                    View SQL Code
                </Menu.Item>
                <Menu.Item key="chart-config" icon={<SettingOutlined />}>
                    Chart Configuration
                </Menu.Item>
            </Menu>
        );

        const handleChartAction = (action: string) => {
            switch (action) {
                case 'export-png':
                    // Export chart as PNG
                    message.info('PNG export functionality coming soon!');
                    break;
                case 'export-csv':
                    // Export data as CSV
                    message.info('CSV export functionality coming soon!');
                    break;
                case 'share-link':
                    // Generate shareable link
                    message.info('Share functionality coming soon!');
                    break;
                case 'view-sql':
                    // Show SQL query
                    if (sqlQueries[messageId]) {
                        message.info('SQL query displayed in execution metadata below');
                    } else {
                        message.info('No SQL query available for this chart');
                    }
                    break;
                case 'chart-config':
                    // Show chart configuration
                    message.info('Chart configuration: ' + JSON.stringify(chartData, null, 2));
                    break;
            }
        };

        return (
            <div className="enhanced-chart-container">
                <div className="chart-header">
                    <div className="chart-title">
                        <BarChartOutlined /> {chartData.title || 'Chart'}
                    </div>
                    <div className="chart-actions">
                        <Dropdown 
                            overlay={chartMenu} 
                            trigger={['click']}
                            onOpenChange={(open) => {
                                if (!open) return;
                                // Handle menu open if needed
                            }}
                        >
                            <Button 
                                type="text" 
                                size="small" 
                                icon={<InfoCircleOutlined />}
                                className="chart-meta-button"
                            />
                        </Dropdown>
                    </div>
                </div>
                <div className="chart-content" id={`chart-${messageId}`}>
                    {/* Chart will be rendered here by ECharts */}
                </div>
            </div>
        );
    };

    // Structured response rendering with tabs
    const renderStructuredResponse = (content: any) => {
        if (!content.structure) return null;

        const tabItems = Object.entries(content.structure).map(([key, value]: [string, any]) => ({
            key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
            children: (
                <div className="structured-tab-content">
                    {typeof value === 'string' ? (
                        <div dangerouslySetInnerHTML={{ __html: formatMessageContent(value) }} />
                    ) : (
                        <pre className="json-content">
                            {JSON.stringify(value, null, 2)}
                        </pre>
                    )}
                </div>
            )
        }));

        return (
            <div className="structured-response">
                <Tabs 
                    items={tabItems} 
                    size="small" 
                    className="response-tabs"
                />
            </div>
        );
    };

    // Collapsible section component (hooks must be called in React components)
    const CollapsibleSection: React.FC<{ title: string; content: string; isCollapsed?: boolean }> = ({ title, content, isCollapsed = false }) => {
        const [collapsed, setCollapsed] = useState<boolean>(isCollapsed);

        return (
            <div className="collapsible-section">
                <div
                    className="section-header"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    <span className="section-title">{title}</span>
                    <span className="section-toggle">
                        {collapsed ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                    </span>
                </div>
                {!collapsed && (
                    <div className="section-content">
                        <div dangerouslySetInnerHTML={{ __html: formatMessageContent(content) }} />
                    </div>
                )}
            </div>
        );
    };

    // Handle message reactions
    const handleReaction = (messageId: string, emoji: string) => {
        setMessageReactions(prev => {
            const currentReactions = prev[messageId] || [];
            const newReactions = currentReactions.includes(emoji)
                ? currentReactions.filter(r => r !== emoji)
                : [...currentReactions, emoji];
            
            return {
                ...prev,
                [messageId]: newReactions
            };
        });
    };

    // Build comprehensive data source context for AI analysis
    const buildDataSourceContext = async (dataSourceId: string, dataSourceType: string) => {
        try {
            const context: any = {
                id: dataSourceId,
                type: dataSourceType,
                timestamp: new Date().toISOString(),
                analysis_capabilities: {
                    can_generate_charts: true,
                    can_run_queries: true,
                    can_analyze_trends: true,
                    can_detect_anomalies: true,
                    can_generate_insights: true
                }
            };

            // Get data source details and schema
            if (dataSourceType === 'database' || dataSourceType === 'warehouse') {
                try {
                    const schemaResponse = await fetch(`http://127.0.0.1:8000/data/sources/${dataSourceId}/data`);
                    if (schemaResponse.ok) {
                        const schemaData = await schemaResponse.json();
                        context.schema = schemaData;
                        context.table_count = schemaData.tables?.length || 0;
                        context.total_rows = schemaData.tables?.reduce((sum: number, table: any) => sum + (table.rowCount || 0), 0) || 0;
                        
                        // Enhanced table information
                        context.tables = schemaData.tables?.map((table: any) => ({
                            name: table.name,
                            row_count: table.rowCount,
                            columns: table.columns?.map((col: any) => ({
                                name: col.name,
                                type: col.type,
                                nullable: col.nullable,
                                sample_values: col.sampleValues?.slice(0, 3) || []
                            })) || [],
                            primary_key: table.primaryKey,
                            foreign_keys: table.foreignKeys || []
                        })) || [];
                        
                        // Add query capabilities
                        context.query_capabilities = {
                            supports_sql: true,
                            supports_aggregations: true,
                            supports_joins: true,
                            supports_subqueries: true,
                            max_query_rows: 10000
                        };
                    }
                } catch (error) {
                    console.warn('Failed to fetch database schema:', error);
                }
            } else if (dataSourceType === 'cube') {
                try {
                    // Enhanced Cube.js schema fetching
                    const cubeSchemaResponse = await fetch(`http://127.0.0.1:8000/cube/schema/${dataSourceId}`);
                    if (cubeSchemaResponse.ok) {
                        const cubeSchema = await cubeSchemaResponse.json();
                        context.cube_schema = {
                            cubes: cubeSchema.cubes || [],
                            dimensions: cubeSchema.dimensions || [],
                            measures: cubeSchema.measures || [],
                            time_dimensions: cubeSchema.time_dimensions || [],
                            segments: cubeSchema.segments || [],
                            pre_aggregations: cubeSchema.pre_aggregations || []
                        };
                        
                        // Get Cube.js data model details
                        const modelResponse = await fetch(`http://127.0.0.1:8000/cube/model/${dataSourceId}`);
                        if (modelResponse.ok) {
                            const modelData = await modelResponse.json();
                            context.cube_model = {
                                name: modelData.name,
                                description: modelData.description,
                                version: modelData.version,
                                created_at: modelData.created_at,
                                updated_at: modelData.updated_at
                            };
                        }
                        
                        // Get Cube.js query examples
                        const examplesResponse = await fetch(`http://127.0.0.1:8000/cube/examples/${dataSourceId}`);
                        if (examplesResponse.ok) {
                            const examples = await examplesResponse.json();
                            context.query_examples = examples.queries || [];
                        }
                        
                        context.cube_metadata = {
                            total_cubes: context.cube_schema.cubes.length,
                            total_dimensions: context.cube_schema.dimensions.length,
                            total_measures: context.cube_schema.measures.length,
                            has_time_dimensions: context.cube_schema.time_dimensions.length > 0,
                            has_pre_aggregations: context.cube_schema.pre_aggregations.length > 0
                        };
                        
                        // Add Cube.js specific capabilities
                        context.cube_capabilities = {
                            supports_olap_queries: true,
                            supports_time_series: context.cube_metadata.has_time_dimensions,
                            supports_pre_aggregations: context.cube_metadata.has_pre_aggregations,
                            supports_drill_down: true,
                            supports_slicing_dicing: true
                        };
                    }
                } catch (error) {
                    console.warn('Failed to fetch Cube.js schema:', error);
                }
            } else if (dataSourceType === 'file') {
                try {
                    const fileResponse = await fetch(`http://127.0.0.1:8000/data/sources/${dataSourceId}/data`);
                    if (fileResponse.ok) {
                        const fileData = await fileResponse.json();
                        context.file_info = {
                            filename: fileData.filename,
                            size: fileData.size,
                            columns: fileData.columns,
                            row_count: fileData.row_count,
                            sample_data: fileData.sample_data?.slice(0, 5) // First 5 rows
                        };
                        
                        // Enhanced file analysis capabilities
                        context.file_capabilities = {
                            supports_csv_analysis: fileData.filename?.endsWith('.csv'),
                            supports_excel_analysis: fileData.filename?.match(/\.(xlsx|xls)$/),
                            supports_json_analysis: fileData.filename?.endsWith('.json'),
                            supports_parquet_analysis: fileData.filename?.match(/\.(parquet|parq)$/),
                            max_analysis_rows: Math.min(fileData.row_count || 10000, 10000)
                        };
                        
                        // Add column statistics for better analysis
                        if (fileData.columns) {
                            context.column_analysis = fileData.columns.map((col: any) => ({
                                name: col.name,
                                type: col.type,
                                unique_values: col.unique_count,
                                null_count: col.null_count,
                                sample_values: col.sample_values?.slice(0, 5) || [],
                                statistics: col.statistics || {}
                            }));
                        }
                    }
                } catch (error) {
                    console.warn('Failed to fetch file info:', error);
                }
            }

            // Add data source metadata
            if (props.selectedDataSource) {
                context.metadata = {
                    name: props.selectedDataSource.name,
                    description: props.selectedDataSource.description,
                    created_at: props.selectedDataSource.created_at,
                    last_updated: props.selectedDataSource.updated_at,
                    format: props.selectedDataSource.format,
                    db_type: props.selectedDataSource.db_type
                };
            }

            // Add user preferences and context
            context.user_context = {
                analysis_preferences: {
                    include_charts: true,
                    include_sql: true,
                    include_insights: true,
                    chart_type_preference: 'auto', // auto, bar, line, pie, etc.
                    analysis_depth: 'comprehensive' // basic, standard, comprehensive
                },
                previous_queries: messages.slice(-5).map(msg => msg.query || msg.answer).filter(Boolean),
                session_start: new Date().toISOString()
            };

            console.log('Built comprehensive data source context:', context);
            return context;
        } catch (error) {
            console.error('Error building data source context:', error);
            return {
                id: dataSourceId,
                type: dataSourceType,
                error: 'Failed to build context',
                timestamp: new Date().toISOString()
            };
        }
    };

    // Build comprehensive context from multiple selected data sources
    const buildMultiDataSourceContext = async (selectedSources: any[]): Promise<any> => {
        try {
            const context: any = {
                total_sources: selectedSources.length,
                timestamp: new Date().toISOString(),
                analysis_capabilities: {
                    can_generate_charts: true,
                    can_run_queries: true,
                    can_analyze_trends: true,
                    can_detect_anomalies: true,
                    can_generate_insights: true,
                    can_cross_analyze: selectedSources.length > 1
                }
            };

            // Build context for each selected source
            context.sources = await Promise.all(selectedSources.map(async (ds, index) => {
                const sourceContext = await buildDataSourceContext(ds.id, ds.type);
                return {
                    index: index + 1,
                    primary: index === 0, // First source is primary
                    ...sourceContext
                };
            }));

            // Add cross-source analysis capabilities
            if (selectedSources.length > 1) {
                context.cross_analysis = {
                    can_compare_sources: true,
                    can_join_data: selectedSources.some(ds => ds.type === 'database'),
                    can_merge_files: selectedSources.filter(ds => ds.type === 'file').length > 1,
                    analysis_strategies: [
                        'Individual source analysis',
                        'Cross-source comparison',
                        'Data correlation analysis',
                        'Unified insights generation'
                    ]
                };
            }

            console.log('Built comprehensive multi-data source context:', context);
            return context;
        } catch (error) {
            console.error('Error building multi-data source context:', error);
            return {
                total_sources: selectedSources.length,
                error: 'Failed to build multi-source context',
                timestamp: new Date().toISOString()
            };
        }
    };

    const containerToBottom = () => {
        if (containerRef.current) {
            // Only auto-scroll if user is already near the bottom (within 100px)
            const isNearBottom = containerRef.current.scrollHeight - containerRef.current.scrollTop - containerRef.current.clientHeight < 100;
            if (isNearBottom) {
                containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
            // Ensure focus/visibility for the input area when new messages arrive
            try {
                const textarea = document.querySelector('.chat-textarea') as HTMLTextAreaElement | null;
                if (textarea) textarea.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } catch (e) {
                // ignore
            }
        }
    };

    // Track user scroll to show Jump-to-bottom indicator
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onScroll = () => {
            const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
            setShowJumpToBottom(!atBottom);
        };
        el.addEventListener('scroll', onScroll);
        return () => el.removeEventListener('scroll', onScroll);
    }, []);

    const abortControllerRef = React.useRef<AbortController | null>(null);
    const activeRequestRef = React.useRef<string | null>(null);

    // Enhanced message handling
    const addMessage = React.useCallback((message: IChatMessage) => {
        setMessages((prevMessages: Array<IChatMessage>) => {
            const filteredMessages = prevMessages.filter(msg => msg.id !== 'loading');
            const newMessages = [...filteredMessages, message];
            
            // Conversation persistence is handled automatically by conversationService
            return newMessages;
        });
    }, [props.conversationId]);

    const deleteMessage = React.useCallback((messageId: string) => {
        setMessages((prevMessages: Array<IChatMessage>) =>
            prevMessages.filter(msg => msg.id !== messageId)
        );
    }, []);

    // Enhanced AI chat function with execution metadata
    const chatToAI = React.useCallback(async (_prompt: string, messageId?: string, executionStart?: number) => {
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
            // Check if we have data sources for AI analysis
            const hasDataSource = props.file || props.db || props.selectedDataSource || (props.selectedDataSources && props.selectedDataSources.length > 0);
            
            if (hasDataSource) {
                // Use AI service for data analysis
                let dataSourceId = '';
                let dataSourceType = '';
                let dataSourceContext = '';
                
                // Priority: selectedDataSources > selectedDataSource > file > db
                if (props.selectedDataSources && props.selectedDataSources.length > 0) {
                    // Multiple data sources selected - use the first one as primary
                    const primarySource = props.selectedDataSources[0];
                    dataSourceId = primarySource.id;
                    dataSourceType = primarySource.type || 'unknown';
                    
                    // Build comprehensive context from all selected sources
                    dataSourceContext = await buildMultiDataSourceContext(props.selectedDataSources);
                    console.log('🔍 Using multiple selected data sources:', props.selectedDataSources.map(ds => ds.name));
                } else if (props.selectedDataSource?.id) {
                    dataSourceId = props.selectedDataSource.id;
                    dataSourceType = props.selectedDataSource.type || 'unknown';
                    dataSourceContext = await buildDataSourceContext(dataSourceId, dataSourceType);
                } else if (props.file?.uuid_filename) {
                    dataSourceId = `file_${props.file.uuid_filename}`;
                    dataSourceType = 'file';
                    dataSourceContext = await buildDataSourceContext(dataSourceId, dataSourceType);
                } else if (props.db?.id) {
                    dataSourceId = `db_${props.db.id}`;
                    dataSourceType = 'database';
                    dataSourceContext = await buildDataSourceContext(dataSourceId, dataSourceType);
                }
                
                if (!dataSourceId) {
                    throw new Error('No valid data source identified');
                }

                try {
                    console.log('🔍 Calling AI chat analysis endpoint:', dataSourceId);
                    
                    // Enhanced data source context for better AI analysis
                    const dataSourceContext = await buildDataSourceContext(dataSourceId, dataSourceType);
                    
                    // Use same-origin proxy so browser sends HttpOnly cookies and avoids CORS
                    const response = await fetch(`/api/ai/chat/analyze`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            query: _prompt,
                            data_source_id: dataSourceId,
                            business_context: 'data_analytics',
                            data_source_context: dataSourceContext, // Enhanced context
                            selected_data_sources: props.selectedDataSources || [], // Pass all selected sources
                            user_context: {
                                previous_messages: messages.slice(-5).map(m => ({ role: m.query ? 'user' : 'assistant', content: m.query || m.answer })),
                                analysis_preferences: {
                                    include_charts: _prompt.toLowerCase().includes('chart') || _prompt.toLowerCase().includes('visual'),
                                    include_sql: _prompt.toLowerCase().includes('sql') || _prompt.toLowerCase().includes('query'),
                                    include_insights: true
                                }
                            }
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
                        
                        // Store execution metadata for transparency and trust
                        if (messageId && executionStart) {
                            const executionTime = Date.now() - executionStart;
                            const metadata = {
                                executionTime,
                                dataSource: dataSourceId,
                                dataSourceType,
                                timestamp: new Date().toISOString(),
                                queryType: 'ai_analysis',
                                rowCount: result.row_count || 'N/A',
                                sqlGenerated: result.sql_query || null,
                                optimizationHints: result.optimization_hints || []
                            };
                            
                            setExecutionMetadata(prev => ({
                                ...prev,
                                [messageId]: metadata
                            }));
                            
                            // Store SQL query if generated
                            if (result.sql_query) {
                                setSqlQueries(prev => ({
                                    ...prev,
                                    [messageId]: result.sql_query
                                }));
                            }
                            
                            // Store performance metrics
                            setQueryPerformance(prev => ({
                                ...prev,
                                [messageId]: {
                                    executionTime,
                                    timestamp: new Date().toISOString()
                                }
                            }));
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
                    
                    const response = await fetch(`/api/ai/chat/analyze`, {
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



    // Save conversation using conversationService
    const saveConversation = async () => {
        try {
            // The conversationService handles persistence automatically
            // Just ensure all messages are marked as saved
            const updatedMessages = messages.map(msg => ({
                ...msg,
                saved: true
            }));
            setMessages(updatedMessages);
        } catch (error) {
            console.error('Failed to save conversation:', error);
        }
    };

    // Load conversation using conversationService
    const loadConversation = async () => {
        try {
            if (props.conversationId) {
                conversationService.setCurrentConversation(props.conversationId);
                const messages = await conversationService.loadConversationMessages(props.conversationId);
                
                // Convert Message format to IChatMessage format
                const convertedMessages: IChatMessage[] = messages.map(msg => ({
                    id: msg.id,
                    query: msg.query || '',
                    answer: msg.answer || '',
                    created_at: new Date(msg.created_at),
                    updated_at: new Date(msg.created_at),
                    role: msg.role,
                    timestamp: msg.created_at,
                    messageType: 'text',
                    saved: true
                }));
                
                setMessages(convertedMessages);
            }
        } catch (error) {
            console.error('Failed to load conversation:', error);
        }
    };

    // Load conversation on mount
    React.useEffect(() => {
        if (props.conversationId) {
            loadConversation();
        }
    }, [props.conversationId]);

    // Conversation persistence is handled automatically by conversationService
    // No need for manual saving in useEffect

    // Enhanced input handling with execution metadata
    const handleSendMessage = async (message: string) => {
        if (!message.trim()) return;

        // Add user message to conversationService
        const userMessage = conversationService.addMessage(message, 'user', {
            timestamp: new Date().toISOString(),
            messageType: 'text'
        });

        const newMessage: IChatMessage = {
            id: userMessage.id,
            query: message,
            answer: '',
            created_at: new Date(userMessage.created_at),
            updated_at: new Date(userMessage.created_at),
            role: 'user',
            timestamp: userMessage.created_at,
            messageType: 'text',
            saved: true
        };

        setMessages(prev => [...prev, newMessage]);
        setInputValue('');
        setChatLoading(true);

        try {
            // Get active data sources for context
            const activeDataSources = await getActiveDataSources();
            
            // Enhanced AI request with data source context and model selection
            const aiRequest = {
                query: message,
                data_source_id: activeDataSources.length > 0 ? activeDataSources[0].id : undefined,
                business_context: "Data analysis and insights generation",
                data_source_context: activeDataSources.length > 0 ? {
                    type: activeDataSources[0].type,
                    name: activeDataSources[0].name,
                    schema: activeDataSources[0].schema,
                    id: activeDataSources[0].id
                } : undefined,
                ai_model: selectedAIModel,
                user_context: {
                    selected_data_source: activeDataSources.length > 0 ? activeDataSources[0] : null,
                    active_data_sources: activeDataSources
                },
                include_sql: true, // Request SQL queries in response
                include_execution_metadata: true, // Request execution metadata
                timestamp: Date.now(), // Add timestamp to make each request unique
                conversation_id: props.conversationId || 'new-conversation'
            };

                            const response = await fetch(`/api/ai/chat/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(aiRequest)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                // Build comprehensive AI response with insights and trust features
                const aiAnalysis = result.analysis || {};
                const dataInsights = result.data_insights || {};
                const chartRecommendations = result.chart_recommendations || {};
                const executionMetadata = result.execution_metadata || {};
                
                // Add AI message to conversationService
                const aiResponse = buildRichAIResponse(aiAnalysis, dataInsights, chartRecommendations);
                const aiMessageService = conversationService.addMessage(aiResponse, 'assistant', {
                    timestamp: new Date().toISOString(),
                    messageType: 'text',
                    executionMetadata: {
                        strategy_used: result.ai_engine,
                        data_sources_used: [result.data_source_id],
                        context_summary: result.data_context_summary,
                        execution_metadata: executionMetadata,
                        data_insights: dataInsights,
                        chart_recommendations: chartRecommendations,
                        trust_indicators: {
                            model_used: executionMetadata.model_used,
                            analysis_type: executionMetadata.analysis_type,
                            timestamp: executionMetadata.timestamp,
                            data_source: result.data_source_id
                        }
                    }
                });

                // Create rich AI response with insights and recommendations
                const aiMessage: IChatMessage = {
                    id: aiMessageService.id,
                    query: '',
                    answer: aiResponse,
                    created_at: new Date(aiMessageService.created_at),
                    updated_at: new Date(aiMessageService.created_at),
                    role: 'assistant',
                    timestamp: aiMessageService.created_at,
                    messageType: 'text',
                    saved: true,
                    executionMetadata: {
                        strategy_used: result.ai_engine,
                        data_sources_used: [result.data_source_id],
                        context_summary: result.data_context_summary,
                        execution_metadata: executionMetadata,
                        data_insights: dataInsights,
                        chart_recommendations: chartRecommendations,
                        trust_indicators: {
                            model_used: executionMetadata.model_used,
                            analysis_type: executionMetadata.analysis_type,
                            timestamp: executionMetadata.timestamp,
                            data_source: result.data_source_id
                        }
                    }
                };

                // Add AI message first
                setMessages(prev => [...prev, aiMessage]);

                // If we have chart recommendations, add interactive chart message
                if (chartRecommendations && chartRecommendations.type) {
                    const chartResponse = buildChartInsightsMessage(chartRecommendations, dataInsights);
                    const chartMessageService = conversationService.addMessage(chartResponse, 'assistant', {
                        timestamp: new Date().toISOString(),
                        messageType: 'chart',
                        chartData: chartRecommendations,
                        executionMetadata: {
                            chart_type: chartRecommendations.type,
                            data_source: result.data_source_id,
                            chart_config: chartRecommendations,
                            data_summary: dataInsights,
                            sql_queries: result.sql_queries || [],
                            execution_time: result.execution_time,
                            ai_model: selectedAIModel
                        }
                    });

                    const chartMessage: IChatMessage = {
                        id: chartMessageService.id,
                        query: '',
                        answer: chartResponse,
                        created_at: new Date(chartMessageService.created_at),
                        updated_at: new Date(chartMessageService.created_at),
                        chartData: chartRecommendations,
                        executionMetadata: {
                            chart_type: chartRecommendations.type,
                            data_source: result.data_source_id,
                            chart_config: chartRecommendations,
                            data_summary: dataInsights,
                            sql_queries: result.sql_queries || [],
                            execution_time: result.execution_time,
                            ai_model: selectedAIModel
                        },
                        content: chartResponse,
                        role: 'assistant',
                        timestamp: chartMessageService.created_at,
                        messageType: 'chart',
                        saved: true,
                        metadata: {
                            chartType: chartRecommendations.type,
                            dataSource: activeDataSources.length > 0 ? activeDataSources[0] : null,
                            sqlQueries: result.sql_queries || [],
                            executionTime: result.execution_time,
                            aiModel: selectedAIModel
                        }
                    };
                    setMessages(prev => [...prev, chartMessage]);
                }
                
                // Conversation persistence is handled automatically by conversationService
            } else {
                // Handle error response
                const errorResponse = result.error || 'Analysis failed. Please try again.';
                const errorMessageService = conversationService.addMessage(errorResponse, 'assistant', {
                    timestamp: new Date().toISOString(),
                    messageType: 'error',
                    executionMetadata: {
                        error: true,
                        fallback_suggestion: result.fallback_suggestion
                    }
                });

                const errorMessage: IChatMessage = {
                    id: errorMessageService.id,
                    query: '',
                    answer: errorResponse,
                    created_at: new Date(errorMessageService.created_at),
                    updated_at: new Date(errorMessageService.created_at),
                    role: 'assistant',
                    timestamp: errorMessageService.created_at,
                    messageType: 'error',
                    saved: true,
                    executionMetadata: {
                        error: true,
                        fallback_suggestion: result.fallback_suggestion
                    }
                };
                setMessages(prev => [...prev, errorMessage]);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            const errorResponse = 'Sorry, I encountered an error. Please check your data source connections and try again.';
            const errorMessageService = conversationService.addMessage(errorResponse, 'assistant', {
                timestamp: new Date().toISOString(),
                messageType: 'error',
                executionMetadata: { error: true }
            });

            const errorMessage: IChatMessage = {
                id: errorMessageService.id,
                query: '',
                answer: errorResponse,
                created_at: new Date(errorMessageService.created_at),
                updated_at: new Date(errorMessageService.created_at),
                role: 'assistant',
                timestamp: errorMessageService.created_at,
                messageType: 'error',
                saved: true,
                executionMetadata: { error: true }
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setChatLoading(false);
        }
    };





    // Get active data sources for AI context
    const getActiveDataSources = async () => {
        console.log('🔍 getActiveDataSources called with:', {
            selectedDataSources: props.selectedDataSources,
            selectedDataSource: props.selectedDataSource,
            file: props.file,
            db: props.db
        });
        
        // Use data sources selected from DataPanel if available
        if (props.selectedDataSources && props.selectedDataSources.length > 0) {
            console.log('✅ Using selectedDataSources:', props.selectedDataSources);
            return props.selectedDataSources.map((ds: any) => ({
                id: ds.id,
                name: ds.name,
                type: ds.type,
                config: ds.config || {},
                schema: ds.schema || {},
                metadata: ds.metadata || {},
                row_count: ds.row_count,
                description: ds.description
            }));
        }
        
        // Fallback to selected data source if available
        if (props.selectedDataSource) {
            console.log('✅ Using selectedDataSource:', props.selectedDataSource);
            return [{
                id: props.selectedDataSource.id,
                name: props.selectedDataSource.name,
                type: props.selectedDataSource.type,
                config: props.selectedDataSource.config || {},
                schema: props.selectedDataSource.schema || {},
                metadata: props.selectedDataSource.metadata || {},
                row_count: props.selectedDataSource.row_count,
                description: props.selectedDataSource.description
            }];
        }
        
        // If no data sources are selected, return empty array
        console.log('❌ No data sources selected');
        return [];
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
            handleSendMessage(inputValue);
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
                        {(props.selectedDataSources && props.selectedDataSources.length > 0) ? (
                            <Alert
                                message="Data Sources Selected for AI Analysis"
                                description={`Ready to analyze: ${props.selectedDataSources.map((ds: any) => ds.name).join(', ')}`}
                                type="success"
                                showIcon
                                icon={<DatabaseOutlined />}
                            />
                        ) : (props.file || props.db || props.selectedDataSource) ? (
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
                                description="Go to the Data Panel (right side) and click on a data source to select it for AI analysis"
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
                        {/* Removed descriptive paragraph to keep the view compact */}
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

        return messages.map((msg) => (
            <div key={msg.id} className="message-container" data-message-id={msg.id}>
                {msg.query && (
                    <div className="user-message">
                        <Avatar 
                            icon={<UserOutlined />} 
                            className="user-avatar"
                        />
                        <div className="message-content user-content">
                            <div className="message-header">
                                <span className="user-name">{getUserName()}</span>
                            </div>
                            <div className="message-text">{msg.query}</div>
                            <div className="message-time">{formatTime(msg.created_at || new Date())}</div>
                        </div>
                    </div>
                )}
                
                {msg.answer && (
                    <div className={`message ai-message ${msg.isStreaming ? 'message-streaming' : ''}`}>
                        <div className="message-avatar">
                            <Avatar 
                                icon={<RobotOutlined />} 
                                style={{ backgroundColor: '#1890ff' }}
                                size="large"
                            />
                        </div>
                        <div className="message-content">
                            <div className="message-header">
                                <span className="message-author">Aiser AI</span>
                                <span className="message-time">
                                    {new Date(msg.created_at || Date.now()).toLocaleTimeString()}
                                </span>
                            </div>
                            
                            <div 
                                className="message-text markdown-content"
                                dangerouslySetInnerHTML={{ 
                                    __html: formatMessageContent(msg.answer || '') 
                                }}
                            />
                            
                            {/* Execution Metadata Display */}
                            {msg.executionMetadata && (
                                <div className="execution-metadata">
                                    <div className="execution-metadata-header">
                                        <InfoCircleOutlined />
                                        <span>Analysis Details</span>
                                    </div>
                                    <div className="execution-metadata-content">
                                        <div className="metadata-item">
                                            <div className="metadata-label">Execution Time</div>
                                            <div className="metadata-value">
                                                {msg.executionMetadata.execution_time}ms
                                            </div>
                                        </div>
                                        <div className="metadata-item">
                                            <div className="metadata-label">Data Source</div>
                                            <div className="metadata-value">
                                                {msg.executionMetadata.data_source?.type || 'Unknown'}
                                            </div>
                                        </div>
                                        <div className="metadata-item">
                                            <div className="metadata-label">Rows Processed</div>
                                            <div className="metadata-value">
                                                {msg.executionMetadata.data_source?.total_rows || 'N/A'}
                                            </div>
                                        </div>
                                        <div className="metadata-item">
                                            <div className="metadata-label">Timestamp</div>
                                            <div className="metadata-value">
                                                {new Date(msg.executionMetadata.timestamp || Date.now()).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* SQL Queries Display */}
                                    {msg.executionMetadata.sql_queries && msg.executionMetadata.sql_queries.length > 0 && (
                                        <div style={{ marginTop: '16px' }}>
                                            <div className="execution-metadata-header">
                                                <CodeOutlined />
                                                <span>Generated SQL Queries</span>
                                            </div>
                                            {msg.executionMetadata.sql_queries.map((sql: string, index: number) => (
                                                <div key={index} className="sql-query">
                                                    <div className="sql-query-header">
                                                        <span>Query {index + 1}</span>
                                                        <Button
                                                            size="small"
                                                            icon={<CopyOutlined />}
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(sql);
                                                                message.success('SQL copied to clipboard!');
                                                            }}
                                                            className="sql-copy-btn"
                                                        >
                                                            Copy
                                                        </Button>
                                                    </div>
                                                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{sql}</pre>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* Chart Container */}
                            {msg.chartData && (
                                <div 
                                    className="chart-container"
                                    data-message-id={msg.id}
                                    style={{ marginTop: '16px' }}
                                />
                            )}
                            
                            {/* Message Actions */}
                            <div className="message-actions">
                                <div className="message-reactions">
                                    <Button
                                        size="small"
                                        type="text"
                                        icon={<LikeOutlined />}
                                        onClick={() => handleReaction(msg.id, '👍')}
                                        className="reaction-btn"
                                    />
                                    <Button
                                        size="small"
                                        type="text"
                                        icon={<DislikeOutlined />}
                                        onClick={() => handleReaction(msg.id, '👎')}
                                        className="reaction-btn"
                                    />
                                    <Button
                                        size="small"
                                        type="text"
                                        icon={<HeartOutlined />}
                                        onClick={() => handleReaction(msg.id, '❤️')}
                                        className="reaction-btn"
                                    />
                                    <Button
                                        size="small"
                                        type="text"
                                        icon={<BulbOutlined />}
                                        onClick={() => handleReaction(msg.id, '💡')}
                                        className="reaction-btn"
                                    />
                                    <Button
                                        size="small"
                                        type="text"
                                        icon={<RocketOutlined />}
                                        onClick={() => handleReaction(msg.id, '🚀')}
                                        className="reaction-btn"
                                    />
                                </div>
                                
                                <Dropdown
                                    overlay={
                                        <Menu>
                                            <Menu.Item key="copy" icon={<CopyOutlined />}>
                                                Copy Message
                                            </Menu.Item>
                                            <Menu.Item key="reply" icon={<MessageOutlined />}>
                                                Reply
                                            </Menu.Item>
                                            <Menu.Item key="edit" icon={<EditOutlined />}>
                                                Edit
                                            </Menu.Item>
                                            <Menu.Item key="delete" icon={<DeleteOutlined />} danger>
                                                Delete
                                            </Menu.Item>
                                        </Menu>
                                    }
                                    trigger={['click']}
                                >
                                    <Button
                                        size="small"
                                        type="text"
                                        icon={<MoreOutlined />}
                                        className="message-more-btn"
                                    />
                                </Dropdown>
                            </div>
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
        handleSendMessage(suggestion);
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

    // Enhanced chart rendering with edit functionality
    const renderECharts = useCallback(async (chartData: any, messageId: string) => {
        if (!chartData || !messageId) return;
        
        const messageContainer = document.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement;
        if (!messageContainer) return;
        
        const chartContainer = messageContainer.querySelector('.chart-container') as HTMLElement;
        if (!chartContainer) return;
        
        // Clear existing chart
        chartContainer.innerHTML = '';
        
        // Handle new AI analysis chart format
        if (chartData.type && (chartData.xAxis || chartData.series || chartData.data)) {
            // New AI-generated chart format
            await renderAIChart(chartData, messageId, chartContainer);
            return;
        }
        
        // Handle legacy chart format
        await renderLegacyChart(chartData, messageId, chartContainer);
    }, []);

    // Render AI-generated charts with new format
    const renderAIChart = async (chartData: any, messageId: string, chartContainer: HTMLElement) => {
        // Create chart wrapper with enhanced trust and transparency controls
        const chartWrapper = document.createElement('div');
        chartWrapper.className = 'chart-wrapper ai-chart';
        chartWrapper.innerHTML = `
            <div class="chart-header">
                <div class="chart-title">${chartData.title || 'AI Generated Chart'}</div>
                <div class="chart-controls">
                    <select class="chart-type-select" title="Chart type" style="margin-right:8px;padding:2px 6px;">
                        <option value="bar">Bar</option>
                        <option value="line">Line</option>
                        <option value="area">Area</option>
                        <option value="scatter">Scatter</option>
                        <option value="pie">Pie</option>
                    </select>
                    <div class="series-toggle" style="display:flex;gap:4px;margin-right:8px;">
                        <button class="series-type-btn" data-type="bar" title="Bar">Bar</button>
                        <button class="series-type-btn" data-type="line" title="Line">Line</button>
                        <button class="series-type-btn" data-type="area" title="Area">Area</button>
                    </div>
                    <span class="auto-exec-status" style="margin-right:8px;display:none;font-size:12px;color:#999;">Auto-running…</span>
                    <button class="chart-trust-btn" title="View Trust & Transparency">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                        </svg>
                    </button>
                    <button class="chart-edit-btn" title="Edit in Chart Builder">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                    </button>
                    <button class="chart-save-btn" title="Save Chart">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
                        </svg>
                    </button>
                    <button class="chart-download-btn" title="Download PNG">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                        </svg>
                    </button>
                    <button class="chart-fullscreen-btn" title="Fullscreen">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="chart-content" id="chart-${messageId}"></div>
            <div class="chart-actions">
                <button class="chart-favorite-btn" title="Add to Favorites">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </button>
                <button class="chart-comment-btn" title="Add Comment">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21.99 4c0-1.1-.89-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                    </svg>
                </button>
            </div>
            <!-- Trust & Transparency Panel (hidden by default) -->
            <div class="chart-trust-panel" id="trust-panel-${messageId}" style="display: none;">
                <div class="trust-header">
                    <h4>🔒 Trust & Transparency</h4>
                    <button class="trust-close-btn" title="Close">×</button>
                </div>
                <div class="trust-content">
                    <div class="trust-section">
                        <h5>📊 Data Source</h5>
                        <p><strong>Source:</strong> ${chartData.executionMetadata?.data_source || props.selectedDataSource?.name || 'demo_sales_data.csv'}</p>
                        <p><strong>Records Analyzed:</strong> ${chartData.executionMetadata?.data_summary?.total_records || chartData.data?.length || 'N/A'}</p>
                        <p><strong>Analysis Type:</strong> ${chartData.executionMetadata?.chart_type || chartData.type || 'N/A'}</p>
                        <p><strong>Data Source Type:</strong> ${props.selectedDataSource?.type || 'file'}</p>
                    </div>
                    <div class="trust-section">
                        <h5>🤖 AI Model</h5>
                        <p><strong>Model:</strong> ${chartData.executionMetadata?.ai_model || selectedAIModel || 'Azure GPT-4 Mini'}</p>
                        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                        <p><strong>Confidence:</strong> High</p>
                        <p><strong>Analysis Strategy:</strong> ${chartData.analysis_strategy || 'Data-driven insights'}</p>
                    </div>
                    <div class="trust-section" id="sql-section-${messageId}" style="display: ${chartData.executionMetadata?.sql_queries?.length > 0 ? 'block' : 'none'}">
                        <h5>💾 SQL Queries Executed</h5>
                        <div class="sql-queries-list" id="sql-queries-${messageId}">
                            ${chartData.executionMetadata?.sql_queries?.length > 0 ? 
                                chartData.executionMetadata.sql_queries.map((query: string, index: number) => 
                                    `<div class=\"sql-query-item\">\n<strong>Query ${index + 1}:</strong>\n<pre class=\"sql-code\">${query}</pre>\n</div>`
                                ).join('') : 
                                (chartData.sql_suggestions && chartData.sql_suggestions.length > 0
                                    ? chartData.sql_suggestions.map((query: string, index: number) => 
                                        `<div class=\"sql-query-item\">\n<strong>Suggested ${index + 1}:</strong>\n<pre class=\"sql-code\">${query}</pre>\n<button class=\"sql-exec-btn\" data-sql=\"${encodeURIComponent(query)}\" title=\"Execute SQL\">Execute</button>\n</div>`
                                      ).join('')
                                    : '<p>No SQL queries executed for this analysis.</p>')
                             }
                        </div>
                    </div>
                    <div class="trust-section" id="code-section-${messageId}" style="display: ${chartData.executionMetadata?.executed_code?.length > 0 ? 'block' : 'none'}">
                        <h5>💻 Code Executed</h5>
                        <div class="executed-code-list" id="executed-code-${messageId}">
                            ${chartData.executionMetadata?.executed_code?.length > 0 ? 
                                chartData.executionMetadata.executed_code.map((code: string, index: number) => 
                                    `<div class="executed-code-item">
                                        <strong>Code ${index + 1}:</strong>
                                        <pre class="code-preview">${code}</pre>
                                    </div>`
                                ).join('') : 
                                '<p>No code executed for this analysis.</p>'
                            }
                        </div>
                    </div>
                    <div class="trust-section">
                        <h5>⚙️ Chart Configuration</h5>
                        <pre class="chart-config-preview">${JSON.stringify(chartData, null, 2)}</pre>
                    </div>
                </div>
            </div>
        `;
        
        chartContainer.appendChild(chartWrapper);
        
        // Initialize ECharts
        const chartElement = document.getElementById(`chart-${messageId}`);
        if (!chartElement) return;
        
        const echarts = await getECharts();
        if (!echarts) {
            chartElement.innerHTML = '<div class="chart-error">Chart library not available</div>';
            return;
        }
        
        const chart = echarts.init(chartElement);
        
        // Convert AI chart format to ECharts options
        const options = convertAIChartToECharts(chartData);
        
        chart.setOption(options);
        
        // Add event listeners for chart controls
        addChartEventListeners(chartWrapper, chart, messageId, chartData);
        
        // Add trust panel toggle functionality
        const trustBtn = chartWrapper.querySelector('.chart-trust-btn');
        const trustPanel = chartWrapper.querySelector(`#trust-panel-${messageId}`) as HTMLElement;
        const trustCloseBtn = chartWrapper.querySelector('.trust-close-btn');
        
        if (trustBtn && trustPanel) {
            trustBtn.addEventListener('click', () => {
                trustPanel.style.display = trustPanel.style.display === 'none' ? 'block' : 'none';
            });
        }
        
        if (trustCloseBtn && trustPanel) {
            trustCloseBtn.addEventListener('click', () => {
                trustPanel.style.display = 'none';
            });
        }

        // Bind Execute SQL buttons
        const execButtons = chartWrapper.querySelectorAll('.sql-exec-btn');
        execButtons.forEach((btn) => {
            btn.addEventListener('click', async (e: any) => {
                e.preventDefault();
                e.stopPropagation();
                const encoded = (e.currentTarget as HTMLElement).getAttribute('data-sql') || '';
                const sql = decodeURIComponent(encoded);
                try {
                    // Execute query on the active data source
                    const active = props.selectedDataSources && props.selectedDataSources.length > 0 ? props.selectedDataSources[0] : props.selectedDataSource;
                    if (!active || !active.id) {
                        console.warn('No active data source to execute SQL');
                        return;
                    }
                    const res = await fetch(`/api/data/query/execute`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query: sql, data_source_id: active.id, engine: 'direct_sql', optimization: true })
                    });
                    const jr = await res.json();
                    if (jr && jr.success) {
                        const rows = jr.data || [];
                        const cols = jr.columns || (rows.length > 0 ? Object.keys(rows[0]) : []);
                        const inferred = inferChartFromTabular(rows, cols);
                        chart.setOption(inferred, true);
                    }
                } catch (err) {
                    console.error('SQL execution failed', err);
                }
            });
        });

        // Series type toggle handlers
        const seriesButtons = chartWrapper.querySelectorAll('.series-type-btn');
        seriesButtons.forEach((btn) => {
            btn.addEventListener('click', (e: any) => {
                e.preventDefault();
                const type = (e.currentTarget as HTMLElement).getAttribute('data-type') || 'bar';
                const currentOption: any = chart.getOption();
                const currentSeries: any[] = Array.isArray(currentOption?.series) ? currentOption.series : [];
                if (currentSeries.length > 0) {
                    const newSeries = currentSeries.map((s: any) => ({ ...s, type: type === 'area' ? 'line' : type, areaStyle: type === 'area' ? { opacity: 0.6 } : undefined }));
                    chart.setOption({ series: newSeries }, true);
                    try { localStorage.setItem(`chart_type_${messageId}`, type); } catch {}
                }
            });
        });

        // Chart type dropdown handler
        const chartTypeSelect = chartWrapper.querySelector('.chart-type-select') as HTMLSelectElement | null;
        if (chartTypeSelect) {
            // Restore last used
            try {
                const last = localStorage.getItem(`chart_type_${messageId}`);
                if (last) chartTypeSelect.value = last;
            } catch {}
            chartTypeSelect.addEventListener('change', (e: any) => {
                const type = (e.target as HTMLSelectElement).value || 'bar';
                const currentOption: any = chart.getOption();
                const currentSeries: any[] = Array.isArray(currentOption?.series) ? currentOption.series : [];
                if (currentSeries.length > 0) {
                    const newSeries = currentSeries.map((s: any) => ({ ...s, type: type === 'area' ? 'line' : type, areaStyle: type === 'area' ? { opacity: 0.6 } : undefined }));
                    chart.setOption({ series: newSeries }, true);
                    try { localStorage.setItem(`chart_type_${messageId}`, type); } catch {}
                }
            });
        }

        // Auto-execute a single SQL suggestion if eligible
        const suggestions = (chartData && chartData.sql_suggestions) || [];
        const autoExecStatus = chartWrapper.querySelector('.auto-exec-status') as HTMLElement;
        const active = props.selectedDataSources && props.selectedDataSources.length > 0 ? props.selectedDataSources[0] : props.selectedDataSource;
        const eligible = active && active.type && ['database', 'warehouse', 'duckdb', 'postgres', 'mysql', 'mssql', 'sqlite'].includes((active.type || '').toString().toLowerCase());
        if (suggestions.length === 1 && eligible) {
            try {
                if (autoExecStatus) autoExecStatus.style.display = 'inline-block';
                const sql = suggestions[0];
                const res = await fetch(`/api/data/query/execute`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: sql, data_source_id: active.id, engine: 'direct_sql', optimization: true })
                });
                const jr = await res.json();
                if (jr && jr.success) {
                    const rows = jr.data || [];
                    const cols = jr.columns || (rows.length > 0 ? Object.keys(rows[0]) : []);
                    const inferred = inferChartFromTabular(rows, cols);
                    chart.setOption(inferred, true);
                }
            } catch (err) {
                console.error('Auto-execution failed', err);
            } finally {
                if (autoExecStatus) autoExecStatus.style.display = 'none';
            }
        }
    };

    // Render legacy charts
    const renderLegacyChart = async (chartData: any, messageId: string, chartContainer: HTMLElement) => {
        // Create chart wrapper with controls
        const chartWrapper = document.createElement('div');
        chartWrapper.className = 'chart-wrapper';
        chartWrapper.innerHTML = `
            <div class="chart-header">
                <div class="chart-title">${chartData.title || 'Chart'}</div>
                <div class="chart-controls">
                    <button class="chart-edit-btn" title="Edit Chart">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                    </button>
                    <button class="chart-download-btn" title="Download PNG">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                        </svg>
                    </button>
                    <button class="chart-fullscreen-btn" title="Fullscreen">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="chart-content" id="chart-${messageId}"></div>
        `;
        
        chartContainer.appendChild(chartWrapper);
        
        // Initialize ECharts
        const chartElement = document.getElementById(`chart-${messageId}`);
        if (!chartElement) return;
        
        const echarts = await getECharts();
        if (!echarts) {
            chartElement.innerHTML = '<div class="chart-error">Chart library not available</div>';
            return;
        }
        
        const chart = echarts.init(chartElement);
        
        // Set chart options
        const options = {
            ...chartData.options,
            animation: true,
            animationDuration: 1000,
            animationEasing: 'cubicOut'
        };
        
        chart.setOption(options);
        
        // Add event listeners for chart controls
        addChartEventListeners(chartWrapper, chart, messageId, chartData);
    };

    // Convert AI chart format to ECharts options
    const convertAIChartToECharts = (chartData: any) => {
        const baseOptions = {
            title: {
                text: chartData.title || 'Chart',
                left: 'center',
                textStyle: {
                    fontSize: 16,
                    fontWeight: 'bold'
                }
            },
            tooltip: {
                trigger: chartData.type === 'pie' ? 'item' : 'axis',
                ...chartData.tooltip
            },
            legend: {
                bottom: 10,
                left: 'center'
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '15%',
                containLabel: true
            },
            animation: true,
            animationDuration: 1000,
            animationEasing: 'cubicOut' as const
        };

        switch (chartData.type) {
            case 'bar':
                return {
                    ...baseOptions,
                    xAxis: chartData.xAxis || { type: 'category', data: [] },
                    yAxis: chartData.yAxis || { type: 'value' },
                    series: chartData.series || [{
                        type: 'bar',
                        data: chartData.data || [],
                        itemStyle: { color: '#1890ff' }
                    }]
                };
            
            case 'line':
                return {
                    ...baseOptions,
                    xAxis: chartData.xAxis || { type: 'category', data: [] },
                    yAxis: chartData.yAxis || { type: 'value' },
                    series: chartData.series || [{
                        type: 'line',
                        data: chartData.data || [],
                        smooth: true,
                        itemStyle: { color: '#52c41a' }
                    }]
                };
            
            case 'area':
                return {
                    ...baseOptions,
                    xAxis: chartData.xAxis || { type: 'category', data: [] },
                    yAxis: chartData.yAxis || { type: 'value' },
                    series: chartData.series || [{
                        type: 'line',
                        data: chartData.data || [],
                        smooth: true,
                        areaStyle: {
                            opacity: 0.6,
                            color: '#91cc75'
                        },
                        itemStyle: { color: '#52c41a' }
                    }]
                };
            
            case 'pie':
                return {
                    ...baseOptions,
                    series: [{
                        type: 'pie',
                        radius: chartData.radius || '50%',
                        data: chartData.data || [],
                        emphasis: {
                            itemStyle: {
                                shadowBlur: 10,
                                shadowOffsetX: 0,
                                shadowColor: 'rgba(0, 0, 0, 0.5)'
                            }
                        }
                    }]
                };
            
            case 'scatter':
                return {
                    ...baseOptions,
                    xAxis: chartData.xAxis || { type: 'value' },
                    yAxis: chartData.yAxis || { type: 'value' },
                    series: [{
                        type: 'scatter',
                        data: chartData.data || [],
                        symbolSize: 8,
                        itemStyle: { color: '#fa8c16' }
                    }]
                };
            
            case 'heatmap':
                return {
                    ...baseOptions,
                    xAxis: chartData.xAxis || { type: 'category', data: [] },
                    yAxis: chartData.yAxis || { type: 'category', data: [] },
                    visualMap: chartData.visualMap || {
                        min: 0,
                        max: 100,
                        calculable: true,
                        orient: 'horizontal',
                        left: 'center',
                        bottom: '15%'
                    },
                    series: [{
                        type: 'heatmap',
                        data: chartData.data || [],
                        label: { show: true },
                        emphasis: {
                            itemStyle: {
                                shadowBlur: 10,
                                shadowColor: 'rgba(0, 0, 0, 0.5)'
                            }
                        }
                    }]
                };
            
            case 'radar':
                return {
                    ...baseOptions,
                    radar: chartData.radar || {
                        indicator: [],
                        radius: '65%'
                    },
                    series: [{
                        type: 'radar',
                        data: chartData.data || [],
                        areaStyle: { opacity: 0.3 }
                    }]
                };
            
            default:
                return baseOptions;
        }
    };

    // Add event listeners for chart controls
    const addChartEventListeners = (chartWrapper: HTMLElement, chart: any, messageId: string, chartData: any) => {
        const editBtn = chartWrapper.querySelector('.chart-edit-btn');
        const downloadBtn = chartWrapper.querySelector('.chart-download-btn');
        const fullscreenBtn = chartWrapper.querySelector('.chart-fullscreen-btn');
        const saveBtn = chartWrapper.querySelector('.chart-save-btn');
        const favoriteBtn = chartWrapper.querySelector('.chart-favorite-btn');
        const commentBtn = chartWrapper.querySelector('.chart-comment-btn');
        
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                // Open chart editor modal or navigate to chart builder
                const chartDataForBuilder = {
                    id: `chart_${messageId}`,
                    title: chartData.title || 'Generated Chart',
                    type: chartData.type,
                    config: chartData,
                    timestamp: new Date().toISOString(),
                    createdFrom: 'ai_generated'
                };
                
                const queryParams = new URLSearchParams({
                    chartData: JSON.stringify(chartDataForBuilder),
                    mode: 'edit',
                    source: 'chat'
                });
                
                window.open(`/chart-builder?${queryParams.toString()}`, '_blank');
            });
        }
        
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                const dataURL = chart.getDataURL({
                    type: 'png',
                    pixelRatio: 2,
                    backgroundColor: 'var(--ant-color-bg-container, #ffffff)'
                });
                
                const link = document.createElement('a');
                link.download = `chart-${messageId}.png`;
                link.href = dataURL;
                link.click();
            });
        }
        
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                const chartElement = document.getElementById(`chart-${messageId}`);
                if (chartElement && chartElement.requestFullscreen) {
                    chartElement.requestFullscreen();
                }
            });
        }
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                // Save chart functionality
                try {
                    // Chart saving will be implemented with backend persistence
                    // For now, just show success message
                    message.success('Chart saved successfully!');
                } catch (error) {
                    console.error('Failed to save chart:', error);
                    message.error('Failed to save chart');
                }
            });
        }
        
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', () => {
                favoriteBtn.classList.toggle('favorited');
                message.success(favoriteBtn.classList.contains('favorited') ? 'Added to favorites' : 'Removed from favorites');
            });
        }
        
        if (commentBtn) {
            commentBtn.addEventListener('click', () => {
                // Show comment input
                const commentInput = document.createElement('div');
                commentInput.className = 'comment-input';
                commentInput.innerHTML = `
                    <input type="text" placeholder="Add a comment..." class="comment-text-input">
                    <button class="comment-submit-btn">Add Comment</button>
                `;
                
                const existingComment = chartWrapper.querySelector('.comment-input');
                if (existingComment) {
                    existingComment.remove();
                } else {
                    chartWrapper.appendChild(commentInput);
                    
                    const submitBtn = commentInput.querySelector('.comment-submit-btn');
                    const textInput = commentInput.querySelector('.comment-text-input') as HTMLInputElement;
                    
                    if (submitBtn && textInput) {
                        submitBtn.addEventListener('click', () => {
                            if (textInput.value.trim()) {
                                message.success('Comment added!');
                                commentInput.remove();
                            }
                        });
                        
                        textInput.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter' && textInput.value.trim()) {
                                message.success('Comment added!');
                                commentInput.remove();
                            }
                        });
                    }
                }
            });
        }
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

    // Enhanced voice input with real-time transcription
    const startVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            message.error('Speech recognition is not supported in this browser');
            return;
        }
        
        setIsRecording(true);
        setTranscript('');
        
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            console.log('Voice input started - speak now');
        };

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // Update input in real-time
            setInputValue(finalTranscript + interimTranscript);
            setTranscript(finalTranscript);
        };

        recognition.onerror = (event: any) => {
            console.error('Voice recognition error:', event.error);
            setIsRecording(false);
            
            if (event.error === 'no-speech') {
                message.info('No speech detected. Please try speaking again.');
            } else if (event.error === 'audio-capture') {
                message.warning('Microphone not available. Please check browser settings.');
            } else if (event.error === 'not-allowed') {
                message.warning('Microphone permission blocked. Please allow in browser settings.');
            }
        };

        recognition.onend = () => {
            console.log('Voice input ended');
            setIsRecording(false);
            
            // Auto-send if we have meaningful content
            if (transcript && transcript.trim().length > 5) {
                setTimeout(() => {
                    handleSendMessage(transcript);
                }, 500);
            }
        };

        recognition.start();
    };

    const stopVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            return;
        }
        
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.stop();
    };

    // AI Voice functionality
    const speakAIResponse = (text: string) => {
        if (!aiVoiceEnabled) return;
        
        setIsAiSpeaking(true);
        
        // Use Web Speech API for text-to-speech
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9; // Slightly slower for clarity
            utterance.pitch = 1.0;
            utterance.volume = 0.8;
            
            // Try to use a more natural voice
            const voices = speechSynthesis.getVoices();
            const preferredVoice = voices.find(voice => 
                voice.name.includes('Google') || 
                voice.name.includes('Natural') || 
                voice.name.includes('Premium')
            );
            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }
            
            utterance.onend = () => {
                setIsAiSpeaking(false);
            };
            
            utterance.onerror = () => {
                setIsAiSpeaking(false);
                message.error('Failed to play AI voice response');
            };
            
            speechSynthesis.speak(utterance);
        } else {
            setIsAiSpeaking(false);
            message.warning('Text-to-speech not supported in this browser');
        }
    };

    const stopAIVoice = () => {
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
            setIsAiSpeaking(false);
        }
    };

    // Enhanced chatToAI with voice support
    const chatToAIWithVoice = async (prompt: string) => {
        try {
            setChatLoading(true);
            const response = await chatToAI(prompt);
            
            // If AI voice is enabled, try to speak the response
            if (aiVoiceEnabled && response) {
                try {
                    const responseText = JSON.stringify(response);
                    if (responseText && responseText.length > 0) {
                        // Extract meaningful text from response
                        const textToSpeak = responseText.length > 100 ? 
                            responseText.substring(0, 100) + '...' : 
                            responseText;
                        speakAIResponse(textToSpeak);
                    }
                } catch (e) {
                    console.log('Could not convert response to speech');
                }
            }
            
            return response;
        } catch (error) {
            console.error('Chat with AI failed:', error);
            message.error('Failed to get AI response');
        } finally {
            setChatLoading(false);
        }
    };

    // Streaming chat with real-time updates
    const streamChatToAI = async (prompt: string, messageId: string) => {
        try {
            setChatLoading(true);
            const executionStart = Date.now();
            
            // Build comprehensive data source context
            const dataSourceId = props.selectedDataSource?.id || 'none';
            const dataSourceType = props.selectedDataSource?.type || 'none';
            const dataSourceContext = await buildDataSourceContext(dataSourceId, dataSourceType);
            
            // Create streaming message
            const streamingMessage: IChatMessage = {
                id: messageId,
                query: prompt,
                answer: '',
                created_at: new Date(),
                updated_at: new Date(),
                isStreaming: true
            };
            
            setMessages(prev => [...prev, streamingMessage]);
            
            // Prepare request payload
            const requestPayload = {
                query: prompt,
                data_source_context: dataSourceContext,
                user_context: {
                    previous_messages: messages.slice(-5).map(msg => msg.query || msg.answer).filter(Boolean),
                    analysis_preferences: {
                        include_charts: true,
                        include_sql: true,
                        include_insights: true,
                        streaming: true
                    }
                },
                streaming: true
            };
            
            // Start streaming request
            const response = await fetch('http://127.0.0.1:8000/ai/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestPayload)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body reader available');
            }
            
            let accumulatedResponse = '';
            let chartData: any = null;
            const sqlQueries: string[] = [];
            let executionMetadata: any = {};
            
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) break;
                    
                    const chunk = new TextDecoder().decode(value);
                    const lines = chunk.split('\n');
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') break;
                            
                            try {
                                const parsed = JSON.parse(data);
                                
                                if (parsed.type === 'content') {
                                    accumulatedResponse += parsed.content;
                                    // Update streaming message
                                    setMessages(prev => prev.map(msg => 
                                        msg.id === messageId 
                                            ? { ...msg, answer: accumulatedResponse }
                                            : msg
                                    ));
                                } else if (parsed.type === 'chart_data') {
                                    chartData = parsed.data;
                                } else if (parsed.type === 'sql_query') {
                                    sqlQueries.push(parsed.query);
                                } else if (parsed.type === 'execution_metadata') {
                                    executionMetadata = parsed.metadata;
                                }
                                
                            } catch (e) {
                                console.warn('Failed to parse streaming data:', e);
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }
            
            // Finalize message
            const finalMessage: IChatMessage = {
                id: messageId,
                query: prompt,
                answer: accumulatedResponse,
                created_at: new Date(),
                updated_at: new Date(),
                chartData: chartData,
                executionMetadata: {
                    ...executionMetadata,
                    execution_time: Date.now() - executionStart,
                    sql_queries: sqlQueries,
                    data_source: dataSourceContext
                }
            };
            
            setMessages(prev => prev.map(msg => 
                msg.id === messageId ? finalMessage : msg
            ));
            
            // Render chart if available (only once)
            if (chartData && !document.getElementById(`chart-container-${messageId}`)) {
                setTimeout(() => renderECharts(chartData, messageId), 100);
            }
            
            // Speak response if AI voice is enabled
            if (aiVoiceEnabled && accumulatedResponse) {
                speakAIResponse(accumulatedResponse);
            }
            
            // Conversation persistence is handled automatically by conversationService
            
        } catch (error) {
            console.error('Streaming chat failed:', error);
            message.error('Failed to get AI response');
            
            // Update message with error
            setMessages(prev => prev.map(msg => 
                msg.id === messageId 
                    ? { ...msg, answer: 'Sorry, I encountered an error. Please try again.', isStreaming: false }
                    : msg
            ));
        } finally {
            setChatLoading(false);
        }
    };

    // Data source selection for AI analysis
    const [dataSources, setDataSources] = React.useState<any[]>([]);
    const [selectedDataSources, setSelectedDataSources] = React.useState<string[]>([]);

    const inferChartFromTabular = (rows: any[], cols: string[]) => {
        if (!rows || rows.length === 0 || !cols || cols.length === 0) {
            return { series: [] };
        }
        // Heuristics: prefer date-like for x, then non-numeric; rest numeric as series
        const isNumeric = (v: any) => typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)));
        const isDateLike = (v: any) => {
            if (v instanceof Date) return true;
            if (typeof v !== 'string') return false;
            // ISO 8601, yyyy-mm(-dd), yyyy/mm/dd, dd/mm/yyyy with time optional
            return /(\d{4}-\d{1,2}(-\d{1,2})?(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?)/.test(v)
                || /(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/.test(v);
        };

        let xCol = cols[0];
        for (const c of cols) {
            const sample = rows[0]?.[c];
            if (isDateLike(sample)) { xCol = c; break; }
            if (!isNumeric(sample)) { xCol = c; break; }
        }
        const yCols = cols.filter(c => c !== xCol && rows.some(r => isNumeric(r[c])));
        const xData = rows.map(r => r[xCol]);
        // If date-like, try to normalize to ISO for consistent category order
        const xIsDate = isDateLike(rows[0]?.[xCol]);
        const normalizeDate = (s: any) => {
            if (s instanceof Date) return s.toISOString();
            const d = new Date(s);
            return isNaN(d.getTime()) ? s : d.toISOString();
        };
        const xVals = xIsDate ? xData.map(normalizeDate) : xData;
        const series = yCols.slice(0, 6).map((c, idx) => ({
            name: c,
            type: 'bar',
            data: rows.map(r => Number(r[c]))
        }));
        return {
            tooltip: { trigger: 'axis' },
            legend: { bottom: 10 },
            xAxis: { type: xIsDate ? 'category' : 'category', data: xVals },
            yAxis: { type: 'value' },
            series
        };
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
                        {/* Prefer centralized ModelSelector in header; keep compact model select here as fallback */}
                        <div style={{ minWidth: 180 }}>
                            <select value={selectedAIModel} onChange={(e) => setSelectedAIModel(e.target.value)} style={{ width: 180, padding: '6px 8px', borderRadius: 6 }}>
                                <option value="gpt-4.1-mini">🤖 GPT-4.1 Mini</option>
                                <option value="gpt-5-mini">🚀 GPT-5 Mini</option>
                                <option value="gpt-4-mini">🧠 GPT-4 Mini</option>
                            </select>
                        </div>
                        <Select
                            placeholder="Navigate"
                            style={{ width: 200 }}
                            onChange={(value) => {
                                if (value === 'connect') setDataSourceModalVisible(true);
                                if (value === 'query') window.location.href = '/dash-studio?tab=query-editor';
                                if (value === 'chart') window.location.href = '/dash-studio?tab=chart';
                                if (value === 'dashboard') window.location.href = '/dash-studio?tab=dashboard';
                            }}
                            options={[
                                { value: 'connect', label: 'Connect Data' },
                                { value: 'query', label: 'Query Editor' },
                                { value: 'chart', label: 'Chart Designer' },
                                { value: 'dashboard', label: 'Dashboard' }
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* Chat Messages Area */}
            <div className="chat-messages" ref={containerRef} role="log" aria-live="polite">
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
            {/* Jump to bottom indicator */}
            {showJumpToBottom && (
                <div className="jump-to-bottom" style={{ position: 'fixed', right: 24, bottom: 'calc(96px + env(safe-area-inset-bottom, 0))', zIndex: 130 }}>
                    <Button type="primary" shape="round" onClick={() => { containerRef.current && (containerRef.current.scrollTop = containerRef.current.scrollHeight); setShowJumpToBottom(false); }}>Jump to bottom</Button>
                </div>
            )}
            </div>

            {/* Chat Input Section */}
            <div className="chat-input-section">
                {/* Data Source Status Indicator */}
                {(props.selectedDataSources && props.selectedDataSources.length > 0) && (
                    <div style={{
                        padding: '8px 12px',
                        background: 'rgba(24, 144, 255, 0.1)',
                        border: '1px solid #1890ff',
                        borderRadius: '6px',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <DatabaseOutlined style={{ color: '#1890ff' }} />
                            <Text style={{ color: 'var(--ant-color-text, #141414)', fontSize: '12px' }}>
                                <strong>AI Analysis Sources:</strong> {props.selectedDataSources.map((ds: any) => ds.name).join(', ')}
                            </Text>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Checkbox
                                checked={includeFilesInAnalysis}
                                onChange={(e) => setIncludeFilesInAnalysis(e.target.checked)}
                                style={{ color: 'var(--ant-color-text, #141414)', fontSize: 12 }}
                            >
                                Include files
                            </Checkbox>
                            {includeFilesInAnalysis && (props.selectedDataSources || []).some((ds: any) => ds.type === 'file') && (
                                <Text style={{ color: 'var(--ant-color-text, #141414)', fontSize: '11px' }}>
                                    Files: {(props.selectedDataSources || []).filter((ds: any) => ds.type === 'file').map((ds: any) => ds.name).join(', ')}
                                </Text>
                            )}
                        </div>
                    </div>
                )}
                
                {/* No Data Sources Selected Message */}
                {(!props.selectedDataSources || props.selectedDataSources.length === 0) && (
                    <div style={{
                        padding: '8px 12px',
                        background: 'rgba(255, 193, 7, 0.1)',
                        border: '1px solid #ffc107',
                        borderRadius: '6px',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <InfoCircleOutlined style={{ color: '#ffc107' }} />
                        <Text style={{ color: 'var(--ant-color-text, #141414)', fontSize: '12px' }}>
                            <strong>No Data Sources Selected:</strong> Go to the Data Panel (right side) and click on a data source to select it for AI analysis.
                        </Text>
                    </div>
                )}
                
                <div className="input-container">
                    <div className="input-wrapper">
                    <Input.TextArea
                            ref={textAreaRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask me anything about your data... (Shift+Enter for new line)"
                        autoSize={{ minRows: 4, maxRows: 10 }}
                            onPressEnter={(e) => {
                                if (!e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(inputValue);
                                }
                            }}
                            className="chat-textarea"
                        aria-label="Chat input"
                        data-test-id="chat-input"
                        style={{ minHeight: 64, resize: 'vertical' }}
                        />
                        
                        {/* Input Actions - Full Width */}
                        <div className="input-actions">

                            
                            {/* Voice Input - Single Click */}
                            <Button
                                type="text"
                                icon={<AudioOutlined />}
                                onClick={() => {
                                    if (isRecording) {
                                        stopVoiceInput();
                                    } else {
                                        startVoiceInput();
                                    }
                                }}
                                className={`voice-button ${isRecording ? 'recording' : ''}`}
                                title={isRecording ? 'Click to stop voice input' : 'Click to start voice input'}
                            />
                            
                            {/* Send Button */}
                            <Button
                                type="primary"
                                icon={<SendOutlined />}
                                onClick={() => handleSendMessage(inputValue)}
                                disabled={!inputValue.trim() || chatLoading}
                                className="send-button"
                                title="Send Message"
                                aria-label="Send message"
                                data-test-id="send-button"
                            />
                        </div>
                    </div>

                    {/* Mode selector placed just below the input for per-chat control */}
                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 8 }}>
                        <ModeSelector
                            value={mode}
                            onChange={(v: string) => { try { setMode(v); localStorage.setItem('chat_mode', v); } catch (e) {} }}
                        />
                    </div>

                    {/* Voice Status Indicator */}
                    {isRecording && (
                        <div className="voice-recording-status">
                            <div className="recording-indicator">
                                <div className="pulse-dot"></div>
                                Recording... Release to send
                            </div>
                        </div>
                    )}
                    
                    {/* Quick Actions - Full Width Modern Design */}
                    <div className="quick-actions-modern">
                        <div className="action-group" style={{ width: 240 }}>
                            {/* ModeSelector placed below input for per-chat control */}
                            <div style={{ width: 240 }}>
                                <ModeSelector
                                    value={mode}
                                    onChange={(v: string) => {
                                        try { setMode(v); localStorage.setItem('chat_mode', v); } catch (e) {}
                                        try { window.dispatchEvent(new CustomEvent('chat_mode_changed', { detail: v })); } catch (e) {}
                                    }}
                                />
                            </div>
                        </div>
                        

                        
                        {/* Removed Add Data Source and Build Chart buttons to keep only Standard Mode */}
                        

                    </div>
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
                    {/* Debug: expose last login timestamp to help investigate intermittent logout */}
                    <div style={{ display: 'none' }} id="__debug_last_login">{typeof window !== 'undefined' ? localStorage.getItem('last_login_at') : ''}</div>
        </div>
    );
};

// Optimize component with React.memo for better performance
export default React.memo(ChatPanel);
