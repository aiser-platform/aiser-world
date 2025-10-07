'use client';
export const dynamic = 'force-dynamic';
// Simple dynamic configuration that actually works

import { Tabs, Card, Row, Col, Button, Space, Tag, Typography, message, Tooltip } from 'antd';
import { MessageOutlined, DatabaseOutlined, BarChartOutlined, HistoryOutlined, SettingOutlined, DragOutlined, ArrowLeftOutlined, ArrowRightOutlined, FileTextOutlined, ExpandOutlined, PlusOutlined } from '@ant-design/icons';
import ModelSelector from '@/app/components/ModelSelector/ModelSelector';
import React, { useState, useEffect, useCallback } from 'react';
import ChatPanel from './components/ChatPanel/ChatPanel';
import EnhancedDataPanel from './components/DataPanel/EnhancedDataPanel';
import ChatHistoryPanel from './components/HistoryPanel/HistoryPanel';
import CollapsibleHistoryPanel from './components/HistoryPanel/CollapsibleHistoryPanel';
import UniversalDataSourceModal from '@/app/components/UniversalDataSourceModal/UniversalDataSourceModal';
import PlatformOnboardingModal from '@/app/components/PlatformOnboardingModal/PlatformOnboardingModal';
import { ExtendedTable, IConversation, IDatabase } from './types';
import { IFileUpload } from '@/app/components/FileUpload/types';
import { useSearchParams } from 'next/navigation';

interface DataSource {
    id: string;
    name: string;
    type: 'file' | 'database' | 'warehouse' | 'api' | 'cube';
    status: 'connected' | 'disconnected' | 'error';
    config: Record<string, any>;
    schema?: Record<string, any>;
    metadata?: Record<string, any>;
    row_count?: number;
    description?: string;
    lastUsed?: string;
    rowCount?: number;
    columns?: string[];
    size?: string;
}

// const { TabPane } = Tabs; // Deprecated - using items prop instead
const { Text } = Typography;

const ChatToChart = () => {
    const searchParams = useSearchParams();
    // State management for conversations
    const [conversations, setConversations] = useState<IConversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [conversationState, setConversationState] = useState<IConversation | undefined>(undefined);
    const [activeTab, setActiveTab] = React.useState<string>('chat');
    const [selectedDataSource, setSelectedDataSource] = React.useState<DataSource | null>(null);
    const [generatedCharts, setGeneratedCharts] = React.useState<Record<string, any>[]>([]);
    const [dataPanelCollapsed, setDataPanelCollapsed] = React.useState<boolean>(false);
    const [historyPanelCollapsed, setHistoryPanelCollapsed] = React.useState<boolean>(false);
    const [sqlResults, setSqlResults] = React.useState<Record<string, any>[]>([]);
    const [showDataSourceModal, setShowDataSourceModal] = React.useState<boolean>(false);
    const [dataPanelWidth, setDataPanelWidth] = React.useState<number>(5); // Dynamic width for data panel
    const [historyPanelWidth, setHistoryPanelWidth] = React.useState<number>(4); // Dynamic width for history panel
    const [isDragging, setIsDragging] = React.useState<boolean>(false);
    const [isDraggingHistory, setIsDraggingHistory] = React.useState<boolean>(false);
    const [selectedDataSources, setSelectedDataSources] = React.useState<DataSource[]>([]); // Data sources selected from DataPanel

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [dbList, setDbList] = React.useState<IDatabase[]>([]);
    const [db, setDb] = React.useState<IDatabase | undefined>(undefined);
    const [schema, setSchema] = React.useState<string | undefined>(undefined);
    const [tables, setTables] = React.useState<ExtendedTable[] | undefined>(
        undefined
    );
    const [file, setFile] = React.useState<IFileUpload | undefined>(undefined);
    const [openAIModel, setOpenAIModel] = React.useState<string | undefined>(
        undefined
    );

    // Load conversations on component mount and when returning to page
    useEffect(() => {
        loadConversations();
        
        // Also load current conversation messages if exists
        const currentId = localStorage.getItem('current_conversation_id');
        if (currentId) {
            const conversationKey = `conv_messages_${currentId}`;
            const savedMessages = localStorage.getItem(conversationKey);
            if (savedMessages) {
                console.log('Found saved messages for current conversation:', currentId);
            }
        }
    }, []);

    // Load conversations from localStorage or API
    const loadConversations = async () => {
        try {
            // Try to load from localStorage first
            const savedConversations = localStorage.getItem('chat_conversations');
            if (savedConversations) {
                const parsed = JSON.parse(savedConversations);
                setConversations(parsed);
                
                // Restore current conversation if exists
                const currentId = localStorage.getItem('current_conversation_id');
                if (currentId) {
                    const current = parsed.find((c: IConversation) => c.id === currentId);
                    if (current) {
                        setConversationState(current);
                        setCurrentConversationId(currentId);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load conversations from localStorage:', error);
        }
    };

    // Listen for page visibility changes to reload conversations
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                loadConversations();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [loadConversations]);

    // Save conversations to localStorage
    const saveConversations = useCallback((newConversations: IConversation[]) => {
        try {
            localStorage.setItem('chat_conversations', JSON.stringify(newConversations));
            setConversations(newConversations);
        } catch (error) {
            console.error('Failed to save conversations to localStorage:', error);
        }
    }, []);

    // Save current conversation ID
    const saveCurrentConversationId = useCallback((id: string | null) => {
        if (id) {
            localStorage.setItem('current_conversation_id', id);
        } else {
            localStorage.removeItem('current_conversation_id');
        }
        setCurrentConversationId(id);
    }, []);

    // Handle conversation selection
    const handleSelectConversation = useCallback((conversation: IConversation) => {
        // Save current messages to the previous conversation
        const currentMessages = localStorage.getItem('chat_messages');
        if (currentMessages && currentConversationId) {
            const conversationKey = `messages_${currentConversationId}`;
            localStorage.setItem(conversationKey, currentMessages);
            console.log('Saved messages for conversation:', currentConversationId);
        }
        
        setConversationState(conversation);
        saveCurrentConversationId(conversation.id);
        
        // Load messages for the selected conversation
        if (conversation.id) {
            const conversationKey = `messages_${conversation.id}`;
            const savedMessages = localStorage.getItem(conversationKey);
            if (savedMessages) {
                localStorage.setItem('chat_messages', savedMessages);
                console.log('Loaded messages for conversation:', conversation.id);
            } else {
                localStorage.removeItem('chat_messages');
                console.log('No saved messages for conversation:', conversation.id);
            }
        }
    }, [saveCurrentConversationId, currentConversationId]);

    // Handle new conversation
    const handleNewConversation = useCallback(() => {
        // Save current messages to the previous conversation before switching
        const currentMessages = localStorage.getItem('chat_messages');
        if (currentMessages && currentConversationId) {
            const conversationKey = `messages_${currentConversationId}`;
            localStorage.setItem(conversationKey, currentMessages);
            console.log('Saved messages for conversation:', currentConversationId);
        }
        
        const newConversation: IConversation = {
            id: crypto.randomUUID(),
            title: `New Conversation ${conversations.length + 1}`,
            messages: []
        };
        
        const updatedConversations = [newConversation, ...conversations];
        saveConversations(updatedConversations);
        setConversationState(newConversation);
        saveCurrentConversationId(newConversation.id);
        
        // Clear current chat messages for new conversation
        localStorage.removeItem('chat_messages');
        
        // Signal to ChatPanel to clear messages (will be handled via callback)
        setActiveTab('chat'); // Ensure we're on chat tab
    }, [conversations, saveConversations, saveCurrentConversationId, currentConversationId]);

    // Handle URL parameters for data source integration
    React.useEffect(() => {
        const dataSourceId = searchParams?.get ? searchParams.get('dataSource') : null;
        const modelingComplete = searchParams?.get ? searchParams.get('modeling') : null;
        
        if (dataSourceId) {
            // For now, we'll set a placeholder and let the EnhancedDataPanel handle the actual data source
            // The EnhancedDataPanel will load and set the real data source when it mounts
            console.log('Data source ID from URL:', dataSourceId);
            
            // If modeling is complete, show success message
            if (modelingComplete === 'complete') {
                // You can add a success notification here
                console.log('Data modeling completed for:', dataSourceId);
            }
        }
    }, [searchParams]);

    // Handle data source creation
    const handleDataSourceCreated = (dataSource: any) => {
        setSelectedDataSource(dataSource);
        setShowDataSourceModal(false);
        
        // Show success message
        console.log('New data source created:', dataSource);
        
        // Update chat state with the new data source
        if (dataSource.type === 'file') {
            setFile({
                filename: dataSource.config.connectionDetails.filename,
                content_type: dataSource.config.connectionDetails.content_type,
                storage_type: dataSource.config.connectionDetails.storage_type,
                file_size: dataSource.config.connectionDetails.file_size,
                uuid_filename: dataSource.config.connectionDetails.uuid_filename
            });
        } else if (dataSource.type === 'database' || dataSource.type === 'warehouse') {
            setDb({
                name: dataSource.name,
                type: dataSource.type,
                host: dataSource.config.connectionDetails.host || '',
                port: dataSource.config.connectionDetails.port || 5432,
                database: dataSource.config.connectionDetails.database || '',
                username: dataSource.config.connectionDetails.username || '',
                password: dataSource.config.connectionDetails.password || ''
            });
        }
        
        // Switch to chat tab to start analyzing
        setActiveTab('chat');
        
        // Show success notification
        message.success(`Data source "${dataSource.name}" connected successfully! You can now start chatting with your data.`);
    };

    // Calculate panel widths dynamically
    const getChatPanelWidth = () => {
        const totalWidth = 24;
        const historyWidth = historyPanelCollapsed ? 2 : historyPanelWidth; // Show small panel when collapsed
        const dataWidth = dataPanelCollapsed ? 2 : dataPanelWidth; // Show small panel when collapsed
        const usedWidth = historyWidth + dataWidth;
        return Math.max(8, totalWidth - usedWidth); // Minimum 8 columns for chat
    };

    // Ensure Data Panel is always the rightmost column
    const getDataPanelWidth = () => {
        return dataPanelCollapsed ? 2 : Math.max(4, 24 - historyPanelWidth - getChatPanelWidth());
    };

    // Panel width management for better content visibility
    const handleDataPanelExpand = () => {
        if (dataPanelCollapsed) {
            setDataPanelCollapsed(false);
            setDataPanelWidth(8); // Expanded size
        } else {
            setDataPanelCollapsed(true);
        }
    };

    const handleHistoryPanelExpand = () => {
        if (historyPanelCollapsed) {
            setHistoryPanelCollapsed(false);
            setHistoryPanelWidth(6); // Expanded size
        } else {
            setHistoryPanelCollapsed(true);
        }
    };

    const renderWelcomeCards = () => (
        <Row gutter={[16, 16]} style={{ padding: '24px' }}>
            <Col span={8}>
                <Card 
                    hoverable
                    onClick={() => setShowDataSourceModal(true)}
                    style={{ textAlign: 'center', height: 200 }}
                >
                    <DatabaseOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
                    <h3>Connect Data Sources</h3>
                    <p>Upload files or connect to databases to get started with your analysis</p>
                </Card>
            </Col>
            <Col span={8}>
                <Card 
                    hoverable
                    onClick={() => setActiveTab('chat')}
                    style={{ textAlign: 'center', height: 200 }}
                >
                    <MessageOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
                    <h3>Chat to Chart</h3>
                    <p>Ask questions in natural language and get instant visualizations</p>
                </Card>
            </Col>
            <Col span={8}>
                <Card 
                    hoverable
                    onClick={() => setActiveTab('charts')}
                    style={{ textAlign: 'center', height: 200 }}
                >
                    <BarChartOutlined style={{ fontSize: 48, color: '#fa8c16', marginBottom: 16 }} />
                    <h3>Generated Charts</h3>
                    <p>View and manage all your generated charts and visualizations</p>
                </Card>
            </Col>
        </Row>
    );

    const renderChartsGallery = () => (
        <div style={{ padding: '24px' }}>
            <Row gutter={[16, 16]}>
                {generatedCharts.length === 0 ? (
                    <Col span={24}>
                        <Card style={{ textAlign: 'center', padding: '48px' }}>
                            <BarChartOutlined style={{ fontSize: 64, color: '#d9d9d9', marginBottom: 16 }} />
                            <h3>No Charts Generated Yet</h3>
                            <p>Start by connecting a data source and asking questions in the chat</p>
                            <Space>
                                <Button type="primary" onClick={() => setActiveTab('datasources')}>
                                    Connect Data Source
                                </Button>
                                <Button onClick={() => setActiveTab('chat')}>
                                    Start Chatting
                                </Button>
                            </Space>
                        </Card>
                    </Col>
                ) : (
                    generatedCharts.map((chart, index) => (
                        <Col key={index} span={8}>
                            <Card
                                hoverable
                                cover={<div style={{ height: 200, backgroundColor: 'var(--ant-color-fill-secondary, #f5f5f5)' }}>Chart Preview</div>}
                                actions={[
                                    <Button key="view" type="text">View</Button>,
                                    <Button key="download" type="text">Download</Button>,
                                    <Button key="share" type="text">Share</Button>
                                ]}
                            >
                                <Card.Meta
                                    title={`Chart ${index + 1}`}
                                    description="Generated from your data analysis"
                                />
                            </Card>
                        </Col>
                    ))
                )}
            </Row>
        </div>
    );

    return (
        <div className="ChatToChart" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Tabs 
                activeKey={activeTab} 
                onChange={setActiveTab}
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                tabBarStyle={{ paddingLeft: 16, paddingRight: 16 }}
                items={[
                    {
                        key: 'chat',
                        label: (
                            <span>
                                <MessageOutlined />
                                Chat to Chart
                            </span>
                        ),
                        children: (
                            <Row style={{ height: 'calc(100vh - 120px)' }} className="chat-container">
                                {/* Left Panel: Chat History - Fixed width when expanded */}
                                <Col 
                                    span={historyPanelCollapsed ? 2 : 6}
                                    style={{ 
                                        borderRight: '1px solid var(--border-color-light)',
                                        background: 'var(--panel-background)',
                                        transition: 'all 0.3s ease',
                                        position: 'relative',
                                        minWidth: historyPanelCollapsed ? '50px' : '240px',
                                        maxWidth: historyPanelCollapsed ? '50px' : '240px'
                                    }}
                                >
                                    {/* History Panel Content */}
                                    <CollapsibleHistoryPanel
                                        id={conversationState?.id || ''}
                                        current={conversationState!}
                                        collapsed={historyPanelCollapsed}
                                        onClick={(props: IConversation) => {
                                            handleSelectConversation(props);
                                            setDb(undefined);
                                            setSchema(undefined);
                                            setTables(undefined);
                                        }}
                                        onCollapsedChange={handleHistoryPanelExpand}
                                        onNewChat={() => {
                                            handleNewConversation();
                                            setDb(undefined);
                                            setSchema(undefined);
                                            setTables(undefined);
                                            setFile(undefined);
                                        }}
                                    />
                                </Col>
                                
                                {/* Center Panel: Main Chat Interface - Flexible width */}
                                <Col 
                                    flex="1"
                                    style={{ 
                                        transition: 'all 0.3s ease',
                                        borderRight: dataPanelCollapsed ? 'none' : '1px solid var(--border-color-light)',
                                        background: 'var(--background)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        minWidth: '400px'
                                    }}
                                >
                                    <ChatPanel
                                        id="chat-panel"
                                        file={file}
                                        db={db}
                                        schema={schema}
                                        tables={tables}
                                        customAIModel={openAIModel}
                                        onDefaultDbChange={setDb}
                                        onDefaultSchemaChange={setSchema}
                                        onDefaultTablesChange={setTables}
                                        onFileChange={setFile}
                                        callback={(props: {
                                            conversation: IConversation;
                                        }) => {
                                            setConversationState(props.conversation);
                                        }}
                                        selectedDataSource={selectedDataSource}
                                        conversationId={currentConversationId}
                                        selectedDataSources={selectedDataSources}
                                    />
                                </Col>
                                
                                {/* Right Panel: Data Panel - Fixed width when expanded */}
                                <Col 
                                    span={dataPanelCollapsed ? 2 : 8}
                                    style={{ 
                                        borderLeft: '1px solid var(--border-color-light)',
                                        background: 'var(--panel-background)',
                                        transition: 'all 0.3s ease',
                                        position: 'relative',
                                        minWidth: dataPanelCollapsed ? '50px' : '320px',
                                        maxWidth: dataPanelCollapsed ? '50px' : '320px'
                                    }}
                                >
                                    {/* Data Panel Content - Show only icons when collapsed */}
                                    {dataPanelCollapsed ? (
                                        <div style={{ 
                                            padding: '16px 8px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '16px'
                                        }}>
                                            <Tooltip title="Expand" placement="left">
                                                <Button type="text" onClick={handleDataPanelExpand} icon={<ExpandOutlined />} />
                                            </Tooltip>
                                            <Tooltip title="Add Source" placement="left">
                                                <Button type="text" onClick={() => setShowDataSourceModal(true)} icon={<PlusOutlined />} />
                                            </Tooltip>
                                            <Tooltip title="Data Sources" placement="right">
                                                <DatabaseOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
                                            </Tooltip>
                                            <Tooltip title="Files" placement="right">
                                                <FileTextOutlined style={{ fontSize: '20px', color: '#52c41a' }} />
                                            </Tooltip>
                                            <Tooltip title="Settings" placement="right">
                                                <SettingOutlined style={{ fontSize: '20px', color: '#fa8c16' }} />
                                            </Tooltip>
                                        </div>
                                    ) : (
                                        <EnhancedDataPanel
                                            onDataSourceSelect={(dataSource) => {
                                                console.log('🔄 Chat page onDataSourceSelect called with:', dataSource);
                                                setSelectedDataSource(dataSource);
                                                
                                                // Update selectedDataSources for AI analysis
                                                if (dataSource) {
                                                    console.log('✅ Setting selectedDataSources to:', [dataSource]);
                                                    setSelectedDataSources([dataSource]);
                                                } else {
                                                    console.log('❌ Clearing selectedDataSources');
                                                    setSelectedDataSources([]);
                                                }
                                                
                                                // Also update the file/db state for backward compatibility
                                                if (dataSource && dataSource.type === 'file') {
                                                    setFile({
                                                        filename: dataSource.name,
                                                        content_type: 'application/octet-stream',
                                                        storage_type: 'local',
                                                        file_size: 0,
                                                        uuid_filename: dataSource.id
                                                    });
                                                } else if (dataSource && dataSource.type === 'database') {
                                                    setDb({
                                                        id: Number(dataSource.id) || undefined,
                                                        name: dataSource.name,
                                                        type: dataSource.config?.db_type || 'postgresql',
                                                        host: dataSource.config?.host || '',
                                                        port: Number(dataSource.config?.port) || 5432,
                                                        database: dataSource.config?.database || '',
                                                        username: dataSource.config?.username || ''
                                                    });
                                                }
                                            }}
                                            selectedDataSource={selectedDataSource}
                                            onCollapse={() => setDataPanelCollapsed(true)}
                                            onRefresh={() => {
                                                // Refresh data sources
                                                console.log('Refreshing data sources...');
                                            }}
                                            onDataSourcesChange={(sources) => {
                                                console.log('🔄 Chat page onDataSourcesChange called with:', sources);
                                                setSelectedDataSources(sources);
                                                console.log('✅ Updated selectedDataSources to:', sources);
                                            }}
                                        />
                                    )}
                                </Col>
                            </Row>
                        )
                    },
                    {
                        key: 'charts',
                        label: (
                            <span>
                                <BarChartOutlined />
                                Generated Charts
                            </span>
                        ),
                        children: renderChartsGallery()
                    }
                ]}
            />

            {/* Universal Data Source Modal */}
            <UniversalDataSourceModal
                isOpen={showDataSourceModal}
                onClose={() => setShowDataSourceModal(false)}
                onDataSourceCreated={handleDataSourceCreated}
                initialDataSourceType="file"
                isChatIntegration={true}
            />

            {/* Platform Onboarding Modal */}
            <PlatformOnboardingModal />
        </div>
    );
};

export default ChatToChart;
