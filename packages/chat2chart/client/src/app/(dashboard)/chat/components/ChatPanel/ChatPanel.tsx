import { IFileUpload } from '@/app/components/FileUpload/types';
import { fetchApi } from '@/utils/api';
import { apiService } from '@/services/apiService';
import { conversationService, Conversation, Message } from '@/services/conversationService';
import { conversationSessionManager } from '@/services/conversationSessionManager';
import { isStreamingEnabled, setStreamingEnabled, toggleStreaming } from '@/utils/streamingConfig';
import { SendOutlined, BulbOutlined, AudioOutlined, LinkOutlined, DatabaseOutlined, SettingOutlined, UserOutlined, PlusOutlined, FileTextOutlined, BarChartOutlined, MessageOutlined, ReloadOutlined, DownloadOutlined, CopyOutlined, ShareAltOutlined, InfoCircleOutlined, CodeOutlined, FileOutlined, EyeOutlined, EyeInvisibleOutlined, EditOutlined, DeleteOutlined, MoreOutlined, RiseOutlined, PieChartOutlined, SearchOutlined, LikeOutlined, DislikeOutlined, HeartOutlined, RocketOutlined, StopOutlined, DownOutlined, SaveOutlined, HistoryOutlined, CrownOutlined, TableOutlined, PaperClipOutlined, CloseOutlined } from '@ant-design/icons';
import { Button, Input, Card, Tag, Space, Tooltip, Alert, Typography, Avatar, Divider, Empty, Spin, Select, Tabs, Dropdown, Menu, message as antMessage, Checkbox, Modal, Progress, Switch, Table } from 'antd';
import UniversalDataSourceModal from '@/app/components/UniversalDataSourceModal/UniversalDataSourceModal';
import InlineModeSelector from './InlineModeSelector';
import ModelSelector from '@/app/components/ModelSelector/ModelSelector';
import MarkdownRenderer from './MarkdownRenderer';
import AnimatedAIAvatar from './AnimatedAIAvatar';
import SessionHistoryDropdown from './SessionHistoryDropdown';
import AssetLibraryDropdown from './AssetLibraryDropdown';
import AiserAIIcon from '@/app/components/AiserAIIcon/AiserAIIcon';
import { usePlanRestrictions } from '@/hooks/usePlanRestrictions';
import { makeMessageUserFriendly, makeProgressMessageUserFriendly, makeErrorMessageUserFriendly } from '@/utils/userFriendlyMessages';
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
// Removed: MessageBox and EnhancedChatMessage components deleted
import './styles.css';
import { useAuth } from '@/context/AuthContext';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import * as echarts from 'echarts';
import { addWatermarkToChart } from '@/utils/watermark';
import { useOrganization } from '@/context/OrganizationContext';
import { getSecureAuthHeaders, isValidToken, sanitizeErrorMessage, isAuthError, handleAuthError } from '@/utils/secureAuth';
import ChartMessage from './ChartMessage';
import DeepAnalysisReport from './DeepAnalysisReport';
import ThoughtProcessDisplay from './ThoughtProcessDisplay';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const AISER_AI_NAME = 'Aicser AI';
const AISER_AI_HANDLE = '@AicserAI';
const CHAT_LOADING_MESSAGE = `${AISER_AI_NAME} is analyzing your request...`;
const LIMIT = 10;

const sanitizeMessages = (msgs: IChatMessage[] = []) =>
    msgs.filter(
        (msg) => msg && msg.id !== 'processing' && msg.messageType !== 'processing'
    );

interface ChatPanelProps {
    conversationId?: string;
    callback: (data: { conversation: IConversation }) => void;
    selectedDataSource?: any;
    selectedDataSources?: any[];
    mode?: string;
    onModeChange?: (mode: string) => void;
    model?: string;
    onModelChange?: (modelId: string) => void;
    onSelectConversation?: (conversation: IConversation) => void;
    onNewConversation?: () => void;
    onConversationDeleted?: () => void;
    onDataSourceSelect?: (dataSource: any) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = (props) => {
    // CRITICAL: All hooks must be called unconditionally at the top level
    // This prevents "Rendered more hooks than during the previous render" errors
    const { isAuthenticated, loading: authLoading, user } = useAuth();
    const { hasFeature, canPerformAction, showUpgradePrompt, UpgradeModal } = usePlanRestrictions();
    const { currentOrganization, getOrganizationUsage } = useOrganization();
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState<IChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState<string>('');
    const [streamingEnabled, setStreamingEnabledState] = useState(isStreamingEnabled());
    const [progressState, setProgressState] = useState<{
        percentage: number;
        message: string;
        stage: string;
    } | null>(null);
    const [showDataSourceModal, setShowDataSourceModal] = useState(false);
    const [currentMode, setCurrentMode] = useState(props.mode || 'standard');
    const [currentModel, setCurrentModel] = useState(props.model || 'auto'); // Default to 'auto'
    const [availableModels, setAvailableModels] = useState<any[]>([]);
    const [reactions, setReactions] = useState<Record<string, string[]>>({});
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [comments, setComments] = useState<Record<string, string[]>>({});
    const [isTyping, setIsTyping] = useState(false);
    const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
    const [messageCache, setMessageCache] = useState<{
        [key: string]: {
            messages: IChatMessage[];
            conversation: IConversation;
            pagination: Pagination;
        };
    }>({});
    const [uploadingFile, setUploadingFile] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null); // Track selected file before upload
    const [filePreviewVisible, setFilePreviewVisible] = useState(false); // Show file preview before sending
    const fileInputRef = useRef<HTMLInputElement>(null);

    const authGuardActive = !authLoading && !isAuthenticated;
    const isSendBusy = isLoading || isStreaming;
    const sendButtonDisabled = authGuardActive || (!prompt.trim() && !isSendBusy);
    const sendButtonTooltip = authGuardActive
        ? 'Sign in to chat with Aicser AI'
        : isSendBusy
            ? 'Click to stop'
            : '💡 Tip: Use Ctrl+Enter to send, Esc to clear';
    const sendButtonType = authGuardActive || isSendBusy ? 'default' : 'primary';
    const sendButtonIcon = isSendBusy ? <StopOutlined /> : <SendOutlined />;
    const sendButtonText = isSendBusy ? 'Stop' : 'Send';

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const progressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const chatMessagesRef = useRef<HTMLDivElement>(null);
    // REMOVED: chartInstancesRef - no longer needed, ChartMessage component manages its own instances
    const uploadedDataSourceIdRef = useRef<string | undefined>(undefined); // Store uploaded data source ID across async operations
    
    // Render real-time progress based on actual state (simplified, no duplication)
    const renderProgressSteps = (progress: { percentage: number; message: string; stage: string } | null) => {
        if (!progress) {
            return <span>Starting workflow...</span>;
        }
        
        const currentStage = progress.stage || 'start';
        const currentMessage = progress.message || 'Processing...';
        
        // Use user-friendly message utility
        const friendlyMessage = makeProgressMessageUserFriendly(currentStage, currentMessage);
        
        // Map stages to icons
        const stageIcons: Record<string, string> = {
            'start': '🚀',
            'route_query': '🔍',
            'nl2sql': '💾',
            'nl2sql_complete': '✓',
            'validate_sql': '✓',
            'sql_validated': '✓',
            'execute_query': '⚡',
            'query_executed': '✓',
            'validate_results': '✓',
            'results_validated': '✓',
            'generate_chart': '📊',
            'generate_insights': '💡',
            'unified_chart_insights': '📊',
            'complete': '✅'
        };
        
        const icon = stageIcons[currentStage] || '⏳';
        
        return (
            <>
                <span style={{ fontSize: '14px' }}>{icon}</span>
                <span>{friendlyMessage}</span>
            </>
        );
    };

    // Fetch available models on component mount
    useEffect(() => {
        const fetchModels = async () => {
            try {
                const response = await fetch('/api/models', {
                    method: 'GET',
                    credentials: 'include',
                    headers: getSecureAuthHeaders(false) // Prefer cookies for auth
                });
                const result = await response.json();
                if (result.success && result.models) {
                    setAvailableModels(result.models);
                    // Set default model if not already set (but prefer explicit prop)
                    if (result.default_model && !props.model) {
                        setCurrentModel(result.default_model);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch models:', error);
            }
        };
        fetchModels();
    }, []);

    // Load persisted appearance settings (including ai_model) and apply model preference
    useEffect(() => {
        const loadAppearanceSettings = async () => {
            try {
                const resp = await fetch('/api/users/preferences/ai-model', {
                    method: 'GET',
                    credentials: 'include',
                    headers: getSecureAuthHeaders(false) // Prefer cookies for auth
                });
                if (resp.ok) {
                    const data = await resp.json();
                    if (data && data.ai_model) {
                        setCurrentModel(data.ai_model);
                        props.onModelChange?.(data.ai_model);
                    }
                }
            } catch (e) {
                console.debug('Failed to load appearance settings', e);
            }
        };
        loadAppearanceSettings();
    }, []);

    // Sync external model prop changes into internal state
    useEffect(() => {
        if (props.model && props.model !== currentModel) {
            setCurrentModel(props.model);
        }
    }, [props.model]);

    // REMOVED: Chart rendering logic moved to ChartMessage component
    // This eliminates the need for document.getElementById, setTimeout, and complex useEffect hooks
    // Charts now render directly in their own component with proper React lifecycle
    // No cleanup needed - ChartMessage component handles its own lifecycle
    
    // CRITICAL FIX: Only restore charts from localStorage when conversationId changes, NOT on every message update
    // This prevents spamming localStorage during streaming and race conditions
    useEffect(() => {
        if (!props.conversationId) return;
        
        // Only restore charts once when conversation changes
        try {
            const chartsKey = `conv_charts_${props.conversationId}`;
            const savedCharts = localStorage.getItem(chartsKey);
            if (savedCharts && messages.length > 0) {
                const chartsData = JSON.parse(savedCharts);
                const chartsMap = new Map(chartsData.map((c: any) => [c.id, c]));
                
                // Restore chart configs to messages that don't already have them
                let chartsRestored = false;
                const updatedMessages = messages.map((msg: IChatMessage) => {
                    // Only restore if message doesn't already have chart config
                    if (msg.echartsConfig || msg.chartConfig) {
                        return msg; // Already has chart, skip
                    }
                    
                    const chartData: any = chartsMap.get(msg.id);
                    if (chartData) {
                        chartsRestored = true;
                        const msgAny: any = { ...msg };
                        const echartsConfig = chartData.echartsConfig || chartData.chartConfig;
                        const chartConfig = chartData.chartConfig || chartData.echartsConfig;
                        if (echartsConfig) {
                            msgAny.echartsConfig = echartsConfig;
                        }
                        if (chartConfig) {
                            msgAny.chartConfig = chartConfig;
                        }
                        // Also restore query results and insights if available
                        if (chartData.queryResult && !msgAny.queryResult) {
                            msgAny.queryResult = chartData.queryResult;
                        }
                        if (chartData.insights && !msgAny.insights) {
                            msgAny.insights = chartData.insights;
                        }
                        if (chartData.recommendations && !msgAny.recommendations) {
                            msgAny.recommendations = chartData.recommendations;
                        }
                        return msgAny;
                    }
                    return msg;
                });
                
                // Update messages state if charts were restored
                if (chartsRestored) {
                    console.log('✅ Restored chart configs from localStorage for conversation:', props.conversationId);
                    setMessages(updatedMessages);
                }
            }
        } catch (e) {
            console.warn('Failed to restore charts from localStorage:', e);
        }
    }, [props.conversationId]); // CRITICAL: Only depend on conversationId, NOT messages

    const prevConversationIdRef = useRef<string | undefined>(props.conversationId);
    
    useEffect(() => {
        // CRITICAL: On mount or when conversationId is set, immediately try to restore from cache
        // This prevents chart loss when switching screens (component remounts)
        if (props.conversationId && messages.length === 0 && !isLoading && !isStreaming) {
            const cacheKey = `conv_messages_${props.conversationId}`;
            const cachedMessages = localStorage.getItem(cacheKey);
            if (cachedMessages) {
                try {
                    const parsed = JSON.parse(cachedMessages);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const restoredMessages = parsed.map((msg: any) => {
                            let echartsConfig = msg.echartsConfig || msg.chartConfig;
                            if (!echartsConfig && msg.executionMetadata) {
                                echartsConfig = msg.executionMetadata.echarts_config || 
                                               msg.executionMetadata.chart_config ||
                                               msg.executionMetadata.echartsConfig ||
                                               msg.executionMetadata.chartConfig;
                            }
                            if (echartsConfig && typeof echartsConfig === 'object' && echartsConfig.primary_chart) {
                                echartsConfig = echartsConfig.primary_chart;
                            }
                            return {
                                ...msg,
                                created_at: msg.created_at ? new Date(msg.created_at) : new Date(),
                                updated_at: msg.updated_at ? new Date(msg.updated_at) : new Date(),
                                echartsConfig: echartsConfig,
                                chartConfig: echartsConfig || msg.chartConfig,
                                sqlQuery: msg.sqlQuery,
                                queryResult: msg.queryResult,
                                insights: msg.insights,
                                recommendations: msg.recommendations,
                                executionMetadata: msg.executionMetadata
                            };
                        });
                        setMessages(restoredMessages);
                        console.log('✅ Immediately restored messages from cache on mount/remount:', restoredMessages.length);
                    }
                } catch (e) {
                    console.warn('Failed to restore from cache on mount:', e);
                }
            }
        }
        
        // Clear messages when conversationId changes or is null
        if (!props.conversationId) {
            setMessages([]);
            setMessageCache({});
            prevConversationIdRef.current = undefined;
            return;
        }
        
        // CRITICAL: Don't clear messages if we're currently loading/streaming (content is arriving)
        const isOperationInProgress = isLoading || isStreaming;
        
        // CRITICAL: Only clear messages when switching to a DIFFERENT conversation
        // Never clear messages if it's the same conversation or initial load
        if (prevConversationIdRef.current && prevConversationIdRef.current !== props.conversationId) {
            // Switching to a different conversation
            // CRITICAL: Don't clear if operation is in progress (might lose messages)
            if (!isOperationInProgress) {
                console.log('🔄 Conversation changed, saving and loading messages:', prevConversationIdRef.current, '->', props.conversationId);
                // CRITICAL: Save current messages to cache before switching (with chart configs preserved)
                if (prevConversationIdRef.current && messages.length > 0) {
                    const cacheKey = `conv_messages_${prevConversationIdRef.current}`;
                    try {
                        const serializable = messages.map(msg => {
                            // CRITICAL: Preserve all chart-related data
                            return {
                                ...msg,
                                created_at: msg.created_at instanceof Date ? msg.created_at.toISOString() : msg.created_at,
                                updated_at: msg.updated_at instanceof Date ? msg.updated_at.toISOString() : msg.updated_at,
                                // Explicitly preserve chart configs
                                echartsConfig: msg.echartsConfig,
                                chartConfig: msg.chartConfig || msg.echartsConfig,
                                sqlQuery: msg.sqlQuery,
                                queryResult: msg.queryResult,
                                insights: msg.insights,
                                recommendations: msg.recommendations,
                                executionMetadata: msg.executionMetadata
                            };
                        });
                        localStorage.setItem(cacheKey, JSON.stringify(serializable));
                        console.log('💾 Saved messages with chart configs to cache before conversation switch');
                    } catch (e) {
                        console.warn('Failed to save messages before switch:', e);
                    }
                }
                // CRITICAL: Clear messages to trigger loadMessages for new conversation
                // But loadMessages will restore from cache/API immediately
                setMessages([]);
                setMessageCache({});
                // CRITICAL: Force reload messages for new conversation
                setIsLoading(true);
                // CRITICAL: Update ref immediately so loadMessages knows it's a new conversation
                prevConversationIdRef.current = props.conversationId;
            } else {
                console.log('⏸️ Operation in progress, deferring message clear until completion');
                // Defer clearing until operation completes - don't update ref yet
                // This prevents messages from being lost during active operations
            }
        } else if (!prevConversationIdRef.current && props.conversationId) {
            // Initial load - set ref but don't clear messages (let loadMessages handle it)
            prevConversationIdRef.current = props.conversationId;
        } else if (prevConversationIdRef.current === props.conversationId) {
            // Same conversation - ensure messages are loaded if empty
            // CRITICAL: Don't reload if operation is in progress
            if (messages.length === 0 && !isLoading && !isStreaming) {
                console.log('🔄 Same conversation but no messages, triggering reload');
                setIsLoading(true);
            }
        }

        const loadMessages = async () => {
            if (!props.conversationId) {
                console.log('No conversation ID, clearing messages');
                setMessages([]);
                return;
            }

            try {
                setIsLoading(true);
                
                // CRITICAL: Try cache FIRST for instant restoration on refresh
                const cacheKey = `conv_messages_${props.conversationId}`;
                const cachedMessages = localStorage.getItem(cacheKey);
                if (cachedMessages) {
                    try {
                        const parsed = JSON.parse(cachedMessages);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            const loadedMessages = parsed.map((msg: any) => {
                                // CRITICAL: Ensure chart configs are properly restored from cache
                                // Check multiple possible locations for chart config
                                let echartsConfig = msg.echartsConfig || msg.chartConfig;
                                
                                // Also check executionMetadata if chart config is nested there
                                if (!echartsConfig && msg.executionMetadata) {
                                    echartsConfig = msg.executionMetadata.echarts_config || 
                                                   msg.executionMetadata.chart_config ||
                                                   msg.executionMetadata.echartsConfig ||
                                                   msg.executionMetadata.chartConfig ||
                                                   // Check for deep_analysis_charts (array of charts)
                                                   (msg.executionMetadata.deep_analysis_charts && 
                                                    msg.executionMetadata.deep_analysis_charts.length > 0 ? 
                                                    msg.executionMetadata.deep_analysis_charts[0] : null);
                                }
                                
                                // Handle primary_chart structure
                                if (echartsConfig && typeof echartsConfig === 'object' && echartsConfig.primary_chart) {
                                    echartsConfig = echartsConfig.primary_chart;
                                }
                                
                                return {
                                    ...msg,
                                    created_at: msg.created_at ? new Date(msg.created_at) : new Date(),
                                    updated_at: msg.updated_at ? new Date(msg.updated_at) : new Date(),
                                    // Explicitly restore chart configs
                                    echartsConfig: echartsConfig,
                                    chartConfig: echartsConfig || msg.chartConfig,
                                    // Ensure other fields are preserved
                                    sqlQuery: msg.sqlQuery,
                                    queryResult: msg.queryResult,
                                    insights: msg.insights,
                                    recommendations: msg.recommendations,
                                    executiveSummary: msg.executiveSummary || msg.executive_summary,
                                    // CRITICAL: Preserve executionMetadata including deep_analysis_charts
                                    executionMetadata: {
                                        ...msg.executionMetadata,
                                        deep_analysis_charts: msg.executionMetadata?.deep_analysis_charts || 
                                                             msg.executionMetadata?.deepAnalysisCharts ||
                                                             (echartsConfig ? [echartsConfig] : undefined)
                                    }
                                };
                            });
                            
                            // Filter out ONLY truly empty generic error messages (be less aggressive)
                            const errorMessagePatterns = [
                                /^I apologize, but I could not generate a response\.?$/i,
                                /^I encountered an error\.?$/i
                            ];
                            
                            const filteredMessages = loadedMessages.filter((msg: any) => {
                                // Always keep user messages
                                if (msg.role === 'user' && (msg.query || msg.content)) {
                                    return true;
                                }
                                // Keep messages with any meaningful content (including deep analysis charts)
                                if (msg.echarts_config || msg.chartConfig || msg.insights || msg.sql_query || msg.queryResult || 
                                    msg.executionMetadata || msg.executionMetadata?.deep_analysis_charts || 
                                    msg.executiveSummary || msg.executive_summary) {
                                    return true;
                                }
                                // For assistant messages, only filter if it's a generic error with NO other content
                                if (msg.role === 'assistant') {
                                    const content = msg.answer || msg.message || msg.content || msg.narration || '';
                                    // Only filter if it matches generic error pattern AND has no other content
                                    if (errorMessagePatterns.some(pattern => pattern.test(content.trim()))) {
                                        // Check if it has any other meaningful content
                                        return msg.executionMetadata || msg.aiEngine || content.length > 50;
                                    }
                                    // Keep if has any content
                                    return content.length > 0;
                                }
                                return true;
                            });
                            
                            const sanitized = sanitizeMessages(filteredMessages);
                            setMessages(sanitized);
                            console.log('✅ Loaded messages from cache (instant restore):', sanitized.length);
                            setIsLoading(false);
                            
                            // Then refresh from API in background (merge with cache, don't replace)
                            conversationSessionManager.loadMessages(props.conversationId, false).then(apiMessages => {
                                if (apiMessages && apiMessages.length > 0) {
                                    // Merge API messages with cache (API takes precedence, but don't lose cache messages)
                                    const apiMessageIds = new Set(apiMessages.map((m: any) => m.id));
                                    const cacheOnlyMessages = filteredMessages.filter((m: any) => !apiMessageIds.has(m.id));
                                    
                                    const errorMessagePatterns = [
                                        /^I apologize, but I could not generate a response\.?$/i,
                                        /^I encountered an error\.?$/i
                                    ];
                                    
                                    const filtered = apiMessages.filter((msg: any) => {
                                        // Always keep user messages
                                        if (msg.role === 'user' && (msg.query || msg.content)) {
                                            return true;
                                        }
                                        // Keep messages with any meaningful content
                                        if (msg.echarts_config || msg.chartConfig || msg.insights || msg.sql_query || msg.queryResult || msg.executionMetadata) {
                                            return true;
                                        }
                                        // For assistant messages, only filter if it's a generic error with NO other content
                                        if (msg.role === 'assistant') {
                                            const content = msg.answer || msg.message || msg.content || msg.narration || '';
                                            if (errorMessagePatterns.some(pattern => pattern.test(content.trim()))) {
                                                return msg.executionMetadata || msg.aiEngine || content.length > 50;
                                            }
                                            return content.length > 0;
                                        }
                                        return true;
                                    });
                                    
                                    // Merge: API messages first, then cache-only messages
                                    const merged = [...filtered, ...cacheOnlyMessages].sort((a, b) => {
                                        const aTime = new Date(a.created_at || a.timestamp || 0).getTime();
                                        const bTime = new Date(b.created_at || b.timestamp || 0).getTime();
                                        return aTime - bTime;
                                    });
                                    
                                    const sanitizedMerged = sanitizeMessages(merged);
                                    // Defer setState to avoid "setState during render" warning
                                    setTimeout(() => {
                                        setMessages(sanitizedMerged);
                                        console.log('✅ Merged messages from API and cache:', sanitizedMerged.length, `(API: ${filtered.length}, Cache-only: ${cacheOnlyMessages.length})`);
                                    }, 0);
                                } else {
                                    // API returned empty, keep cache messages
                                    console.log('⚠️ API returned no messages, keeping cache messages:', filteredMessages.length);
                                }
                            }).catch(err => {
                                console.warn('⚠️ Failed to refresh messages from API (using cache):', err);
                                // Keep cache messages on API error
                            });
                            return;
                        }
                    } catch (e) {
                        console.warn('Failed to parse cached messages:', e);
                    }
                }
                
                // If no cache, load from API
                try {
                    const loadedMessages = await conversationSessionManager.loadMessages(props.conversationId, false);
                    
                    if (loadedMessages && loadedMessages.length > 0) {
                        // Filter out ONLY truly empty generic error messages (be less aggressive)
                        const errorMessagePatterns = [
                            /^I apologize, but I could not generate a response\.?$/i,
                            /^I encountered an error\.?$/i
                        ];
                        
                        const filteredMessages = loadedMessages.filter((msg: any) => {
                            // Always keep user messages
                            if (msg.role === 'user' && (msg.query || msg.content)) {
                                return true;
                            }
                            // Keep messages with any meaningful content
                            if (msg.echarts_config || msg.chartConfig || msg.insights || msg.sql_query || msg.queryResult || msg.executionMetadata) {
                                return true;
                            }
                            // For assistant messages, only filter if it's a generic error with NO other content
                            if (msg.role === 'assistant') {
                                const content = msg.answer || msg.message || msg.content || msg.narration || '';
                                // Only filter if it matches generic error pattern AND has no other content
                                if (errorMessagePatterns.some(pattern => pattern.test(content.trim()))) {
                                    // Check if it has any other meaningful content
                                    return msg.executionMetadata || msg.aiEngine || content.length > 50;
                                }
                                // Keep if has any content
                                return content.length > 0;
                            }
                            return true;
                        });
                        
                        const sanitized = sanitizeMessages(filteredMessages);
                        // Defer setState to avoid "setState during render" warning
                        setTimeout(() => {
                            setMessages(sanitized);
                            console.log('✅ Loaded messages from API:', sanitized.length, 'of', loadedMessages.length, 'total');
                        }, 0);
                        
                        // Update cache with loaded messages
                        try {
                            const cacheKey = `conv_messages_${props.conversationId}`;
                            const serializable = sanitized.map(msg => {
                                // CRITICAL: Ensure chart configs are preserved when serializing
                                return {
                                    ...msg,
                                    created_at: msg.created_at instanceof Date ? msg.created_at.toISOString() : msg.created_at,
                                    updated_at: msg.updated_at instanceof Date ? msg.updated_at.toISOString() : msg.updated_at,
                                    // Explicitly preserve chart configs
                                    echartsConfig: msg.echartsConfig,
                                    chartConfig: msg.chartConfig || msg.echartsConfig,
                                    // Preserve other important fields
                                    sqlQuery: msg.sqlQuery,
                                    queryResult: msg.queryResult,
                                    insights: msg.insights,
                                    recommendations: msg.recommendations,
                                    executionMetadata: msg.executionMetadata
                                };
                            });
                            localStorage.setItem(cacheKey, JSON.stringify(serializable));
                            console.log('💾 Updated cache with API messages (including chart configs)');
                        } catch (e) {
                            console.warn('Failed to update cache:', e);
                        }
                    } else {
                        // Try cache as last resort
                        const cacheKey = `conv_messages_${props.conversationId}`;
                        const cachedMessages = localStorage.getItem(cacheKey);
                        if (cachedMessages) {
                            try {
                                const parsed = JSON.parse(cachedMessages);
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                    const loadedMessages = parsed.map((msg: any) => {
                                        // CRITICAL: Ensure chart configs are properly restored from cache
                                        let echartsConfig = msg.echartsConfig || msg.chartConfig;
                                        if (!echartsConfig && msg.executionMetadata) {
                                            echartsConfig = msg.executionMetadata.echarts_config || 
                                                           msg.executionMetadata.chart_config ||
                                                           msg.executionMetadata.echartsConfig ||
                                                           msg.executionMetadata.chartConfig;
                                        }
                                        if (echartsConfig && typeof echartsConfig === 'object' && echartsConfig.primary_chart) {
                                            echartsConfig = echartsConfig.primary_chart;
                                        }
                                        return {
                                            ...msg,
                                            created_at: msg.created_at ? new Date(msg.created_at) : new Date(),
                                            updated_at: msg.updated_at ? new Date(msg.updated_at) : new Date(),
                                            echartsConfig: echartsConfig,
                                            chartConfig: echartsConfig || msg.chartConfig,
                                            sqlQuery: msg.sqlQuery,
                                            queryResult: msg.queryResult,
                                            insights: msg.insights,
                                            recommendations: msg.recommendations,
                                            executionMetadata: msg.executionMetadata
                                        };
                                    });
                                    const sanitized = sanitizeMessages(loadedMessages);
                                    setMessages(sanitized);
                                    console.log('✅ Loaded messages from cache (fallback) with chart configs:', sanitized.length);
                                    setIsLoading(false);
                                    return;
                                }
                            } catch (e) {
                                console.warn('Failed to parse cache:', e);
                            }
                        }
                        setMessages([]);
                        console.log('ℹ️ No messages found for conversation:', props.conversationId);
                    }
                    
                    setIsLoading(false);
                    setProgressState(null);
                    setStreamingMessage('');
                } catch (error) {
                    console.error('❌ Failed to load messages:', error);
                    // CRITICAL: Try cache as last resort before clearing messages
                    try {
                        const cacheKey = `conv_messages_${props.conversationId}`;
                        const cachedMessages = localStorage.getItem(cacheKey);
                        if (cachedMessages) {
                            const parsed = JSON.parse(cachedMessages);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                const loadedMessages = parsed.map((msg: any) => {
                                    // CRITICAL: Ensure chart configs are properly restored from cache
                                    let echartsConfig = msg.echartsConfig || msg.chartConfig;
                                    if (!echartsConfig && msg.executionMetadata) {
                                        echartsConfig = msg.executionMetadata.echarts_config || 
                                                       msg.executionMetadata.chart_config ||
                                                       msg.executionMetadata.echartsConfig ||
                                                       msg.executionMetadata.chartConfig;
                                    }
                                    if (echartsConfig && typeof echartsConfig === 'object' && echartsConfig.primary_chart) {
                                        echartsConfig = echartsConfig.primary_chart;
                                    }
                                    return {
                                        ...msg,
                                        created_at: msg.created_at ? new Date(msg.created_at) : new Date(),
                                        updated_at: msg.updated_at ? new Date(msg.updated_at) : new Date(),
                                        echartsConfig: echartsConfig,
                                        chartConfig: echartsConfig || msg.chartConfig,
                                        sqlQuery: msg.sqlQuery,
                                        queryResult: msg.queryResult,
                                        insights: msg.insights,
                                        recommendations: msg.recommendations,
                                        executionMetadata: msg.executionMetadata
                                    };
                                });
                                const sanitized = sanitizeMessages(loadedMessages);
                                setMessages(sanitized);
                                console.log('✅ Restored messages from cache after API error (with chart configs):', sanitized.length);
                                setIsLoading(false);
                                return;
                            }
                        }
                    } catch (e) {
                        console.warn('Failed to load from cache after error:', e);
                    }
                    // Only clear if we truly have no messages anywhere
                    setMessages([]);
                    setIsLoading(false);
                }
            } catch (outerError) {
                console.error('❌ Outer error in loadMessages:', outerError);
                setMessages([]);
                setIsLoading(false);
            }
        };

        loadMessages();
    }, [props.conversationId]);

    // CRITICAL: Persist progress state to localStorage for restoration on screen switch
    useEffect(() => {
        if (!props.conversationId) return;
        
        if (progressState) {
            try {
                const cacheKey = `conv_progress_${props.conversationId}`;
                localStorage.setItem(cacheKey, JSON.stringify(progressState));
            } catch (e) {
                console.warn('Failed to persist progress state:', e);
            }
        } else {
            // Clear progress when it's null
            try {
                const cacheKey = `conv_progress_${props.conversationId}`;
                localStorage.removeItem(cacheKey);
            } catch (e) {
                // Ignore
            }
        }
    }, [progressState, props.conversationId]);
    
    // CRITICAL: Restore progress state from localStorage when conversation loads
    useEffect(() => {
        if (!props.conversationId) {
            setProgressState(null);
            return;
        }
        
        try {
            const cacheKey = `conv_progress_${props.conversationId}`;
            const savedProgress = localStorage.getItem(cacheKey);
            if (savedProgress) {
                const progress = JSON.parse(savedProgress);
                // Only restore if it's recent (within last 5 minutes)
                const progressAge = Date.now() - (progress.timestamp || 0);
                if (progressAge < 5 * 60 * 1000) {
                    setProgressState({
                        percentage: progress.percentage || 0,
                        message: progress.message || '',
                        stage: progress.stage || 'start'
                    });
                    console.log('✅ Restored progress state from localStorage:', progress.stage);
                } else {
                    // Progress is stale, clear it
                    localStorage.removeItem(cacheKey);
                }
            }
        } catch (e) {
            console.warn('Failed to restore progress state:', e);
        }
    }, [props.conversationId]);
    
    // CRITICAL: Persist messages to localStorage immediately whenever they change
    // This ensures messages are never lost on refresh
    useEffect(() => {
        // CRITICAL: Don't save if logout is in progress
        if (typeof window !== 'undefined' && window.sessionStorage.getItem('logout_in_progress') === 'true') {
            return;
        }
        
        if (!props.conversationId) return;
        const sanitized = sanitizeMessages(messages);
        const cacheKey = `conv_messages_${props.conversationId}`;
        if (sanitized.length === 0) {
            localStorage.removeItem(cacheKey);
            return;
        }
        try {
            const serializable = sanitized.map(msg => {
                // CRITICAL: Ensure chart configs are preserved when serializing
                const serialized: any = {
                    ...msg,
                    created_at: msg.created_at instanceof Date ? msg.created_at.toISOString() : msg.created_at,
                    updated_at: msg.updated_at instanceof Date ? msg.updated_at.toISOString() : msg.updated_at,
                    // Explicitly preserve chart configs
                    echartsConfig: msg.echartsConfig,
                    chartConfig: msg.chartConfig || msg.echartsConfig,
                    // Preserve other important fields
                    sqlQuery: msg.sqlQuery,
                    queryResult: msg.queryResult,
                    insights: msg.insights,
                    recommendations: msg.recommendations,
                    executiveSummary: msg.executiveSummary || msg.executive_summary,
                    // CRITICAL: Preserve executionMetadata including deep_analysis_charts
                    executionMetadata: msg.executionMetadata
                };
                return serialized;
            });
            localStorage.setItem(cacheKey, JSON.stringify(serializable));
            console.log('💾 Persisted', sanitized.length, 'messages to localStorage with chart configs');
            
            setMessageCache(prev => ({
                ...prev,
                [props.conversationId!]: {
                    ...prev[props.conversationId!],
                    messages: sanitized
                }
            }));
        } catch (e) {
            console.error('❌ Failed to persist messages to localStorage:', e);
        }
    }, [messages, props.conversationId]);

    // Save messages before page unload/navigation
    useEffect(() => {
        const handleBeforeUnload = () => {
            // CRITICAL: Don't save if logout is in progress
            if (typeof window !== 'undefined' && window.sessionStorage.getItem('logout_in_progress') === 'true') {
                return;
            }
            
            if (props.conversationId && messages.length > 0) {
                try {
                    const cacheKey = `conv_messages_${props.conversationId}`;
                    const sanitized = sanitizeMessages(messages);
                    if (sanitized.length > 0) {
                        const serializable = sanitized.map(msg => ({
                            ...msg,
                            created_at: msg.created_at instanceof Date ? msg.created_at.toISOString() : msg.created_at,
                            updated_at: msg.updated_at instanceof Date ? msg.updated_at.toISOString() : msg.updated_at
                        }));
                        localStorage.setItem(cacheKey, JSON.stringify(serializable));
                        console.log('💾 Saved messages before navigation:', sanitized.length);
                    } else {
                        localStorage.removeItem(cacheKey);
                    }
                } catch (e) {
                    console.warn('Failed to save messages before navigation:', e);
                }
            }
        };
        
        // Also save on visibility change (tab switch)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                handleBeforeUnload();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [props.conversationId, messages]);

    // Reload messages when page becomes visible (user navigates back)
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (!document.hidden && props.conversationId) {
                console.log('🔄 Page visible, checking conversation state:', props.conversationId);
                
                // CRITICAL: Clear loading/streaming state if no active request
                if (!isStreaming && !abortControllerRef.current) {
                    setIsLoading(false);
                    setProgressState(null);
                    setStreamingMessage('');
                    console.log('🧹 Cleared stale loading state');
                }
                
                // CRITICAL FIX: Check for recent messages AND charts in memory
                const hasRecentMessages = messages.length > 0 && messages.some(m => {
                    const msgTime = new Date(m.created_at || 0).getTime();
                    const now = Date.now();
                    return (now - msgTime) < 60000; // Messages less than 1 minute old
                });
                
                const hasChartInMemory = messages.some(m => m.echartsConfig || m.chartConfig);
                
                if (hasRecentMessages && hasChartInMemory) {
                    console.log('✅ Recent messages with charts exist, preserving state');
                    return; // DON'T reload - preserve charts
                }
                
                // Only reload if truly stale or no charts
                try {
                    const loadedMessages = await conversationSessionManager.loadMessages(props.conversationId, false);
                    
                    if (loadedMessages && loadedMessages.length > 0) {
                        const sanitized = sanitizeMessages(loadedMessages);
                        setMessages(sanitized);
                        console.log('✅ Reloaded messages on visibility change:', sanitized.length);
                    }
                    
                    setIsLoading(false);
                    setProgressState(null);
                    setStreamingMessage('');
                } catch (error) {
                    console.warn('⚠️ Failed to reload messages on visibility change:', error);
                    setIsLoading(false);
                    setProgressState(null);
                    setStreamingMessage('');
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [props.conversationId, isStreaming, messages.length]);

    // CRITICAL FIX: Modern chat interface rendering - NO HOOKS INSIDE THIS FUNCTION
    // This prevents "Rendered more hooks than during the previous render" error
    const renderMessages = () => {
        if (messages.length === 0) {
            return null; // No messages to render, welcome shown by renderWelcomeMessage
        }

        return messages.map((msg, index) => {
            // Convert IChatMessage to EnhancedChatMessage format
            const enhancedMessage = {
                        id: msg.id,
                role: msg.query ? 'user' : 'assistant' as 'user' | 'assistant',
                content: msg.query || msg.answer || '',
                timestamp: new Date(msg.created_at || Date.now()),
                chartConfig: msg.chartConfig,
                echarts_config: msg.echartsConfig,
                dataSourceId: msg.dataSourceId,
                query: msg.query,
                analysis: msg.analysis,
                execution_metadata: msg.executionMetadata,
                sql_query: msg.sqlQuery,  // CRITICAL: Include SQL query for non-file data sources
                insights: msg.insights,
                recommendations: msg.recommendations,
                sql_suggestions: Array.isArray(msg.sqlSuggestions) ? 
                    msg.sqlSuggestions.map((sql: any, index: number) => 
                        typeof sql === 'string' ? {
                            query: sql,
                            explanation: `Generated SQL query ${index + 1}`,
                            confidence: 0.8,
                            execution_time_estimate: 1000,
                            optimization_tips: []
                        } : sql
                    ) : [],
                ai_capabilities: msg.aiCapabilities,
                user_pattern_analysis: msg.userPatternAnalysis
            };

            return (
                <div key={msg.id} className={`modern-message ${msg.query ? 'user-message' : 'ai-message'}`}>
                    {/* User Avatar - Left side */}
                    {msg.query && (
                        <div className="message-avatar user-avatar">
                            <Avatar 
                                size={40}
                                icon={<UserOutlined />}
                                src={user?.avatar_url}
                                style={{ 
                                    backgroundColor: 'var(--ant-color-primary)',
                                    flexShrink: 0
                                }}
                            />
                        </div>
                    )}
                    
                    {/* AI Avatar - Right side */}
                    {!msg.query && (
                        <div className="message-avatar ai-avatar">
                            <AnimatedAIAvatar 
                                size={40} 
                                isThinking={msg.messageType === 'processing'}
                                isSpeaking={msg.messageType === 'ai_response' && !msg.query}
                            />
                        </div>
                    )}
                    
                    <div className="message-content-wrapper">
                        <div className="message-header">
                            {msg.query ? (
                                <>
                                    <span className="message-author">
                                        {(() => {
                                            const displayName = user?.username || 
                                                              (user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}`.trim() : null) ||
                                                              (user?.first_name || user?.firstName || null) ||
                                                              (user?.email?.split('@')[0] || 'You');
                                            return displayName;
                                        })()}
                                    </span>
                                    <span className="message-time">{formatTime(msg.created_at || new Date())}</span>
                                </>
                            ) : (
                                <>
                                    <span className="message-time">{formatTime(msg.created_at || new Date())}</span>
                                    <span className="message-author">{AISER_AI_HANDLE} · {AISER_AI_NAME}</span>
                                </>
                            )}
                        </div>
                        
                        <div className="message-bubble">
                            {/* Show file attachment if present */}
                            {msg.fileInfo && (
                                <div className="file-attachment-container" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    marginBottom: msg.query ? '8px' : '0',
                                    background: 'var(--ant-color-bg-container)',
                                    borderRadius: '6px',
                                    border: '1px solid var(--ant-color-border)',
                                    transition: 'all 0.2s ease',
                                    width: 'fit-content',
                                    maxWidth: '100%'
                                }}>
                                    <PaperClipOutlined style={{ fontSize: '14px', color: 'var(--ant-color-primary)', flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ 
                                            fontSize: '13px', 
                                            fontWeight: '500', 
                                            color: 'var(--ant-color-text)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {msg.fileInfo.name}
                                        </div>
                                        <div style={{ 
                                            fontSize: '11px', 
                                            color: 'var(--ant-color-text-tertiary)',
                                            marginTop: '2px'
                                        }}>
                                            {(msg.fileInfo.size / 1024 / 1024).toFixed(2)} MB
                                        </div>
                                    </div>
                                </div>
                            )}
                            {msg.query ? (
                                <div className="message-text">{msg.query}</div>
                            ) : msg.messageType === 'processing' ? (
                                <div className="ai-response-content" style={{ 
                                    padding: '20px', 
                                    background: 'var(--ant-color-bg-container)',
                                    borderRadius: '12px',
                                    color: 'var(--ant-color-text)',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                                    border: '1px solid var(--ant-color-border)'
                                }}>
                                    {/* Show loading message only if no progress/thought process available */}
                                    {!(msg.progress || progressState || msg.executionMetadata?.reasoning_steps) && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                            <Spin size="small" style={{ color: 'var(--ant-color-primary)' }} />
                                            <span 
                                                className="progress-text-animated"
                                                style={{ 
                                                    fontWeight: 600, 
                                                    fontSize: '16px', 
                                                    color: 'var(--ant-color-text)',
                                                    position: 'relative',
                                                    display: 'inline-block'
                                                }}
                                            >
                                                {CHAT_LOADING_MESSAGE}
                                            </span>
                                        </div>
                                    )}
                                    
                                    {/* Enhanced Thought Process Display - Single unified view (replaces loading message) */}
                                    {(msg.progress || progressState || msg.executionMetadata?.reasoning_steps) && (
                                        <ThoughtProcessDisplay
                                            reasoningSteps={msg.executionMetadata?.reasoning_steps}
                                            currentStage={msg.progress?.stage || progressState?.stage || msg.currentStage}
                                            progressMessage={msg.progress?.message || progressState?.message || msg.progressMessage}
                                            progressPercentage={msg.progress?.percentage || progressState?.percentage || msg.progressPercentage}
                                            isDark={document.documentElement.classList.contains('dark-mode') || 
                                                    document.documentElement.getAttribute('data-theme') === 'dark'}
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="ai-response-content" style={{ padding: '12px 0' }}>
                                    {/* CRITICAL: Display message/narration - prioritize message field */}
                                    <MarkdownRenderer 
                                        content={(() => {
                                            const rawContent = msg.message || msg.narration || msg.answer || msg.content || 'No response available.';
                                            // MINIMAL formatting fixes - only fix obvious corruption, preserve normal text
                                            return rawContent
                                                // Fix excessive newlines (max 2 consecutive)
                                                .replace(/\n{3,}/g, '\n\n')
                                                // Fix number spacing ONLY when there's a comma: "2 , 408" -> "2,408"
                                                // Must have digit, space, comma, space, digit pattern
                                                .replace(/(\d)\s+,\s*(\d)/g, '$1,$2')
                                                // Fix broken words ONLY if ALL parts are single letters (very strict)
                                                // Pattern: word boundary, single letter, space, single letter (repeated 4+ times), word boundary
                                                // This requires at least 5 single-letter parts to avoid matching normal words like "I encountered"
                                                // CRITICAL: Don't match if it's part of a larger word or sentence
                                                .replace(/\b([a-z])(\s+[a-z]){4,}\b/gi, (match, firstLetter, spacesAndLetter) => {
                                                    const parts = match.trim().split(/\s+/);
                                                    // Only fix if ALL parts are exactly 1 character and are letters
                                                    // AND the match is isolated (not part of normal text)
                                                    if (parts.length >= 5 && parts.every(p => p.length === 1 && /[a-z]/i.test(p))) {
                                                        const combined = parts.join('').toLowerCase();
                                                        // Only fix if it matches a known broken word pattern
                                                        // AND it's clearly corrupted (all single letters with spaces)
                                                        const knownBrokenWords = ['averaging', 'revenue', 'following', 'sampled'];
                                                        const found = knownBrokenWords.find(word => 
                                                            word.length === combined.length && 
                                                            word === combined
                                                        );
                                                        // Additional check: if it's a real word that could be normal text, don't fix
                                                        // "I encountered" would be "i e n c o u n t e r e d" - 13 parts, but we only match 5+
                                                        // So this should be safe, but add extra check for common words
                                                        if (found && combined.length >= 8) { // Only fix longer broken words
                                                            return found;
                                                        }
                                                    }
                                                    return match; // Keep original
                                                })
                                                // Fix punctuation spacing (very conservative)
                                                .replace(/\s+([.,;:!?])/g, '$1')  // Remove space before punctuation
                                                .replace(/([.,;:!?])([A-Za-z])/g, '$1 $2')  // Add space after punctuation before letter
                                                .trim();
                                        })()}
                                        className="ai-response-text"
                                    />
                                    
                                    {/* Show warning if no results/chart but message exists - but only if we truly have no data */}
                                    {!msg.echartsConfig && !msg.chartConfig && !msg.queryResult && msg.message && !msg.sqlQuery && (
                                        <Alert
                                            message="No data visualization available"
                                            description="The query was processed, but no chart or data results were generated. This may be due to query execution failure or empty results."
                                            type="warning"
                                            showIcon
                                            style={{ marginTop: '16px', marginBottom: '16px' }}
                                        />
                                    )}
                                    
                                    {/* Show SQL query button if available (for non-file data sources) - separate standalone button */}
                                    {msg.sqlQuery && !msg.echartsConfig && !msg.chartConfig && (
                                        <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                                            <Button 
                                                type="default"
                                                icon={<CodeOutlined />}
                                                onClick={() => {
                                                    if (msg.sqlQuery) {
                                                        // Lazy import MemoryOptimizedEditor for better SQL viewing
                                                        import('@/app/components/MemoryOptimizedEditor').then(({ default: MemoryOptimizedEditor }) => {
                                                            const isDark = document.documentElement.classList.contains('dark-mode') || 
                                                                          document.documentElement.getAttribute('data-theme') === 'dark';
                                                            const modal = Modal.info({
                                                                title: 'SQL Query',
                                                                width: '90%',
                                                                style: { maxWidth: 1200 },
                                                                styles: {
                                                                    body: { padding: '0' }
                                                                },
                                                                content: (
                                                                    <div style={{ 
                                                                        height: '500px',
                                                                        border: '1px solid var(--ant-color-border)',
                                                                        borderRadius: '4px',
                                                                        overflow: 'hidden'
                                                                    }}>
                                                                        <MemoryOptimizedEditor
                                                                            value={msg.sqlQuery || ''}
                                                                            onChange={() => {}} // Read-only
                                                                            language="sql"
                                                                            theme={isDark ? 'vs-dark' : 'vs-light'}
                                                                            height="500px"
                                                                            options={{
                                                                                readOnly: true,
                                                                                minimap: { enabled: false },
                                                                                scrollBeyondLastLine: false,
                                                                                wordWrap: 'on',
                                                                                fontSize: 14,
                                                                                lineNumbers: 'on',
                                                                                automaticLayout: true
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ),
                                                                onOk: () => modal.destroy()
                                                            });
                                                        }).catch(() => {
                                                            // Fallback to simple pre tag if Monaco fails
                                                            const fallbackModal = Modal.info({
                                                                title: 'SQL Query',
                                                                width: '90%',
                                                                style: { maxWidth: 1200 },
                                                                content: (
                                                                    <pre style={{ 
                                                                        background: 'var(--ant-color-bg-container)', 
                                                                        padding: '16px', 
                                                                        borderRadius: '4px',
                                                                        overflow: 'auto',
                                                                        maxHeight: '500px',
                                                                        color: 'var(--ant-color-text)',
                                                                        border: '1px solid var(--ant-color-border)',
                                                                        fontSize: '13px',
                                                                        lineHeight: '1.6',
                                                                        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, "source-code-pro", monospace'
                                                                    }}>
                                                                        {msg.sqlQuery}
                                                                    </pre>
                                                                ),
                                                                onOk: () => fallbackModal.destroy()
                                                            });
                                                        });
                                                    } else {
                                                        antMessage.info('No SQL query available');
                                                    }
                                                }}
                                            >
                                                View SQL Query
                                            </Button>
                                        </div>
                                    )}
                                    
                                    {/* Deep Analysis Report (for multi-chart results) */}
                                    {msg.executionMetadata?.deep_analysis_charts && Array.isArray(msg.executionMetadata.deep_analysis_charts) && msg.executionMetadata.deep_analysis_charts.length > 0 && (
                                        <DeepAnalysisReport
                                            messageId={msg.id}
                                            charts={msg.executionMetadata.deep_analysis_charts}
                                            insights={msg.insights || []}
                                            recommendations={msg.recommendations || []}
                                            executiveSummary={msg.executiveSummary || msg.analysis || msg.message || ''}
                                            isDark={document.documentElement.classList.contains('dark-mode') || 
                                                    document.documentElement.getAttribute('data-theme') === 'dark'}
                                            planType={currentOrganization?.plan_type}
                                            conversationId={props.conversationId}
                                            selectedDataSourceId={props.selectedDataSource?.id}
                                            queryResults={msg.queryResult ? (Array.isArray(msg.queryResult) ? msg.queryResult : [msg.queryResult]) : undefined}
                                        />
                                    )}
                                    
                                    {/* Single Chart Display (standard mode) - Show if chart config exists and no deep analysis charts */}
                                    {/* CRITICAL: Also show if deep_analysis_charts exists but is empty array (fallback to single chart) */}
                                    {((msg.echartsConfig || msg.chartConfig) && 
                                      (!msg.executionMetadata?.deep_analysis_charts || 
                                       (Array.isArray(msg.executionMetadata.deep_analysis_charts) && 
                                        msg.executionMetadata.deep_analysis_charts.length === 0))) && (
                                        <ChartMessage
                                            messageId={msg.id}
                                            config={msg.echartsConfig || msg.chartConfig}
                                            isDark={document.documentElement.classList.contains('dark-mode') || 
                                                    document.documentElement.getAttribute('data-theme') === 'dark'}
                                            planType={currentOrganization?.plan_type}
                                            conversationId={props.conversationId}
                                            selectedDataSourceId={props.selectedDataSource?.id}
                                            sqlQuery={msg.sqlQuery}
                                            queryResult={msg.queryResult}
                                        />
                                    )}
                                    {msg.insights && Array.isArray(msg.insights) && msg.insights.length > 0 && (
                                        <div className="insights-container" style={{ 
                                            marginTop: '12px', 
                                            padding: '12px',
                                            background: 'var(--ant-color-bg-container)',
                                            borderRadius: '8px',
                                            border: '1px solid var(--ant-color-border)'
                                        }}>
                                            <div style={{ 
                                                fontSize: '16px', 
                                                fontWeight: '600', 
                                                marginBottom: '12px',
                                                color: document.documentElement.classList.contains('dark-mode') || 
                                                       document.documentElement.getAttribute('data-theme') === 'dark'
                                                       ? '#ffffff' : '#000000',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '8px'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '20px' }}>💡</span>
                                                    <span style={{ 
                                                        color: document.documentElement.classList.contains('dark-mode') || 
                                                               document.documentElement.getAttribute('data-theme') === 'dark'
                                                               ? '#ffffff' : '#000000'
                                                    }}>Key Insights ({msg.insights.length})</span>
                                                </div>
                                                <Tooltip title="Save Insights to Library">
                                                    <Button 
                                                        type="text" 
                                                        size="small"
                                                        icon={<SaveOutlined />} 
                                                        onClick={async () => {
                                                            if (!props.conversationId) {
                                                                antMessage.warning('Please wait for the conversation to be created');
                                                                return;
                                                            }
                                                            try {
                                                                const { assetService } = await import('@/services/assetService');
                                                                await assetService.saveAsset({
                                                                    conversation_id: props.conversationId,
                                                                    message_id: msg.id,
                                                                    asset_type: 'insight',
                                                                    title: `Insights (${msg.insights?.length || 0})`,
                                                                    content: msg.insights || [],
                                                                    data_source_id: props.selectedDataSource?.id,
                                                                    metadata: { insight_count: msg.insights?.length || 0 }
                                                                });
                                                            } catch (error: any) {
                                                                antMessage.error(error.message || 'Failed to save insights');
                                                            }
                                                        }}
                                                        style={{ color: 'var(--ant-color-text-secondary)' }}
                                                    />
                                                </Tooltip>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {msg.insights.map((insight: any, idx: number) => {
                                                    // Vary icons to avoid repetition
                                                    const icons = ['💡', '📈', '🔍', '📊', '⚡', '🎯', '✨', '🌟'];
                                                    const iconIndex = idx % icons.length;
                                                    const icon = typeof insight === 'object' && insight.type 
                                                        ? (insight.type === 'trend' ? '📈' : insight.type === 'anomaly' ? '⚠️' : insight.type === 'kpi' ? '📊' : insight.type === 'data_quality' ? '🔍' : icons[iconIndex])
                                                        : icons[iconIndex];
                                                    
                                                    return (
                                                        <div 
                                                            key={idx} 
                                                            style={{ 
                                                                display: 'flex', 
                                                                alignItems: 'start', 
                                                                gap: '12px',
                                                                padding: '12px',
                                                                borderRadius: '8px',
                                                                background: 'var(--ant-color-fill-tertiary)',
                                                                transition: 'background-color 0.2s ease'
                                                            }}
                                                        >
                                                            <div style={{ fontSize: '18px', flexShrink: 0, marginTop: '2px' }}>
                                                                {icon}
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--ant-color-text)', marginBottom: '4px' }}>
                                                                    {typeof insight === 'string' ? insight : (insight.title || 'Insight')}
                                                                </div>
                                                                {typeof insight === 'object' && insight.description && (
                                                                    <div style={{ fontSize: '13px', color: 'var(--ant-color-text-secondary)', lineHeight: '1.5' }}>
                                                                        {insight.description}
                                                                    </div>
                                                                )}
                                                                {typeof insight === 'object' && insight.confidence && (
                                                                    <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--ant-color-text-tertiary)' }}>
                                                                        Confidence: {(insight.confidence * 100).toFixed(0)}%
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {msg.recommendations && Array.isArray(msg.recommendations) && msg.recommendations.length > 0 && (
                                        <div className="recommendations-container" style={{ 
                                            marginTop: '12px', 
                                            padding: '12px',
                                            background: 'var(--ant-color-bg-container)',
                                            borderRadius: '8px',
                                            border: '1px solid var(--ant-color-border)'
                                        }}>
                                            <div style={{ 
                                                fontSize: '16px', 
                                                fontWeight: '600', 
                                                marginBottom: '12px',
                                                color: document.documentElement.classList.contains('dark-mode') || 
                                                       document.documentElement.getAttribute('data-theme') === 'dark'
                                                       ? '#ffffff' : '#000000',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '8px'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '20px' }}>🎯</span>
                                                    <span style={{ 
                                                        color: document.documentElement.classList.contains('dark-mode') || 
                                                               document.documentElement.getAttribute('data-theme') === 'dark'
                                                               ? '#ffffff' : '#000000'
                                                    }}>Recommendations ({msg.recommendations?.length || 0})</span>
                                                </div>
                                                <Tooltip title="Save Recommendations to Library">
                                                    <Button 
                                                        type="text" 
                                                        size="small"
                                                        icon={<SaveOutlined />} 
                                                        onClick={async () => {
                                                            if (!props.conversationId) {
                                                                antMessage.warning('Please wait for the conversation to be created');
                                                                return;
                                                            }
                                                            try {
                                                                const { assetService } = await import('@/services/assetService');
                                                                await assetService.saveAsset({
                                                                    conversation_id: props.conversationId,
                                                                    message_id: msg.id,
                                                                    asset_type: 'recommendation',
                                                                    title: `Recommendations (${msg.recommendations?.length || 0})`,
                                                                    content: msg.recommendations || [],
                                                                    data_source_id: props.selectedDataSource?.id,
                                                                    metadata: { recommendation_count: msg.recommendations?.length || 0 }
                                                                });
                                                            } catch (error: any) {
                                                                antMessage.error(error.message || 'Failed to save recommendations');
                                                            }
                                                        }}
                                                        style={{ color: 'var(--ant-color-text-secondary)' }}
                                                    />
                                                </Tooltip>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {msg.recommendations.map((rec: any, idx: number) => {
                                                    // Vary icons to avoid repetition
                                                    const icons = ['🎯', '🚀', '💡', '⚡', '✨', '🌟', '🔥', '📌'];
                                                    const iconIndex = idx % icons.length;
                                                    const priorityIcon = typeof rec === 'object' && rec.priority
                                                        ? (rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢')
                                                        : icons[iconIndex];
                                                    
                                                    return (
                                                        <div 
                                                            key={idx} 
                                                            style={{ 
                                                                display: 'flex', 
                                                                alignItems: 'start', 
                                                                gap: '12px',
                                                                padding: '12px',
                                                                borderRadius: '8px',
                                                                background: 'var(--ant-color-fill-tertiary)',
                                                                transition: 'background-color 0.2s ease'
                                                            }}
                                                        >
                                                            <div style={{ fontSize: '18px', flexShrink: 0, marginTop: '2px' }}>
                                                                {priorityIcon}
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--ant-color-text)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    {typeof rec === 'string' ? rec : (rec.title || 'Recommendation')}
                                                                    {typeof rec === 'object' && rec.priority && (
                                                                        <Tag color={rec.priority === 'high' ? 'red' : rec.priority === 'medium' ? 'orange' : 'green'}>
                                                                            {rec.priority}
                                                                        </Tag>
                                                                    )}
                                                                </div>
                                                                {typeof rec === 'object' && rec.description && (
                                                                    <div style={{ fontSize: '13px', color: 'var(--ant-color-text-secondary)', lineHeight: '1.5', marginTop: '4px' }}>
                                                                        {rec.description}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        <div className="message-actions">
                            <Button 
                                size="small" 
                                type="text"
                                icon={<CopyOutlined />} 
                                onClick={() => handleCopy(msg.query || msg.answer || '')}
                                className="action-btn"
                                title="Copy"
                            />
                            <Button 
                                size="small" 
                                type="text" 
                                icon={<ShareAltOutlined />} 
                                onClick={() => handleShare(msg.id)}
                                className="action-btn"
                                title="Share"
                            />
                            <Button 
                                size="small" 
                                type="text"
                                icon={<HeartOutlined />} 
                                onClick={() => handleFavorite(msg.id)}
                                className={`action-btn ${favorites.has(msg.id) ? 'favorited' : ''}`}
                                title="Favorite"
                            />
                    </div>
                </div>
            </div>
        );
        });
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

    // Handle suggestion clicks with animation
    const handleSuggestionClick = (suggestion: string) => {
        setPrompt(suggestion);
        textareaRef.current?.focus();
    };

    // Handle keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Ctrl/Cmd + Enter to send
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSendMessage();
        }
        // Escape to clear input
        if (e.key === 'Escape') {
            setPrompt('');
            textareaRef.current?.focus();
        }
    };

    // Handle message reactions
    const handleReaction = (messageId: string, emoji: string) => {
        setReactions(prev => {
            const currentReactions = prev[messageId] || [];
            const newReactions = currentReactions.includes(emoji)
                ? currentReactions.filter(e => e !== emoji)
                : [...currentReactions, emoji];
            return {
                ...prev,
                [messageId]: newReactions
            };
        });
    };
    
    // Handle user feedback for AI responses
    const handleFeedback = async (messageId: string, feedback: 'positive' | 'negative') => {
        try {
            const message = messages.find(m => m.id === messageId);
            if (!message) return;
            
            const response = await fetch('/chats/chat/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    conversation_id: props.conversationId,
                    message_id: messageId,
                    query: message.query || message.content || '',
                    satisfactory: feedback === 'positive',
                    feedback_text: feedback === 'positive' ? 'Helpful response' : 'Response needs improvement',
                    agent_id: 'orchestrator'
                })
            });
            
            const result = await response.json();
            if (result.success) {
                antMessage.success('Thank you for your feedback! It helps us improve.');
            } else {
                antMessage.warning('Failed to submit feedback. Please try again.');
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
            antMessage.error('Failed to submit feedback. Please try again.');
        }
    };

    // Handle favorites
    const handleFavorite = (messageId: string) => {
        setFavorites(prev => {
            const newFavorites = new Set(prev);
            if (newFavorites.has(messageId)) {
                newFavorites.delete(messageId);
            } else {
                newFavorites.add(messageId);
            }
            return newFavorites;
        });
    };

    // Handle comments
    const handleComment = (messageId: string, comment: string) => {
        setComments(prev => ({
            ...prev,
            [messageId]: [...(prev[messageId] || []), comment]
        }));
    };

    // Handle sharing
    const handleShare = (messageId: string) => {
        const message = messages.find(m => m.id === messageId);
        if (message) {
            const shareData = {
                title: 'Aicser AI Analysis',
                text: message.answer || message.query || '',
                url: window.location.href
            };
            if (navigator.share) {
                navigator.share(shareData);
            } else {
                navigator.clipboard.writeText(shareData.text);
                antMessage.success('Message copied to clipboard!');
            }
        }
    };

    // Handle copying
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        antMessage.success('Text copied to clipboard!');
    };

    // Handle downloading charts
    const handleDownloadChart = (messageId: string) => {
        const message = messages.find(m => m.id === messageId);
        if (message && message.chartConfig) {
            // Implement chart download logic
            console.log('Downloading chart:', messageId);
        }
    };

    // File upload validation
    const validateFile = (file: File): { valid: boolean; error?: string } => {
        const ALLOWED_TYPES = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/json',
            'application/x-parquet',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        
        const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.json', '.parquet'];
        const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
        
        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            return { valid: false, error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` };
        }
        
        // Check file extension
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
            return { valid: false, error: `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` };
        }
        
        // Check MIME type (optional, as some browsers may not report correctly)
        if (file.type && !ALLOWED_TYPES.includes(file.type) && !file.type.includes('sheet') && !file.type.includes('csv')) {
            // Allow if extension is valid (MIME type can be unreliable)
            console.warn('MIME type check failed, but extension is valid:', file.type);
        }
        
        return { valid: true };
    };

    // Handle file upload
    const handleFileUpload = async (file: File) => {
        // Validate file
        const validation = validateFile(file);
        if (!validation.valid) {
            antMessage.error(validation.error || 'Invalid file');
            return;
        }

        setUploadingFile(true);
        setUploadProgress(0);

        try {
            // Create FormData
            const formData = new FormData();
            formData.append('file', file);
            formData.append('include_preview', 'true');

            // Upload file with progress tracking
            const xhr = new XMLHttpRequest();
            
            // Track upload progress
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    setUploadProgress(Math.round(percentComplete));
                }
            });

            // Create promise for upload
            const uploadPromise = new Promise<any>((resolve, reject) => {
                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const result = JSON.parse(xhr.responseText);
                            resolve(result);
                        } catch (e) {
                            reject(new Error('Invalid response from server'));
                        }
                    } else {
                        try {
                            const error = JSON.parse(xhr.responseText);
                            reject(new Error(error.detail || error.message || `Upload failed: ${xhr.statusText}`));
                        } catch {
                            reject(new Error(`Upload failed: ${xhr.statusText}`));
                        }
                    }
                });

                xhr.addEventListener('error', () => {
                    reject(new Error('Network error during upload'));
                });

                xhr.addEventListener('abort', () => {
                    reject(new Error('Upload cancelled'));
                });

                // Start upload - use correct endpoint path
                xhr.open('POST', '/api/data/upload');
                xhr.withCredentials = true; // Include cookies for auth
                xhr.send(formData);
            });

            const result = await uploadPromise;

            if (result.success && result.data_source) {
                const dataSource = result.data_source;
                
                // Auto-select the uploaded file as data source
                const newDataSource = {
                    id: dataSource.id || dataSource.data_source_id,
                    name: dataSource.name || file.name,
                    type: 'file' as const,
                    status: 'connected' as const,
                    config: dataSource.config || {},
                    columns: dataSource.columns || dataSource.schema || [],
                    rowCount: dataSource.row_count || dataSource.rowCount || 0
                };

                // Notify parent component to select this data source
                props.onDataSourceSelect?.(newDataSource);

                antMessage.success(`File "${file.name}" uploaded successfully! ${dataSource.row_count || 0} rows processed.`);
                
                // Clear file selection after successful upload
                setSelectedFile(null);
                setFilePreviewVisible(false);
                
                // The prompt is already set in the input box, so user can click Send to analyze
                // Or if prompt contains the analysis query, auto-send it
                const currentPrompt = prompt.trim();
                if (currentPrompt && currentPrompt.includes('comprehensive analysis')) {
                    // Auto-send the analysis query with deep mode
                    setTimeout(async () => {
                        // Ensure data source is selected
                        if (!props.selectedDataSource || props.selectedDataSource.id !== newDataSource.id) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                        
                        // Ensure we have conversationId
                        const currentConvId = props.conversationId;
                        if (!currentConvId) {
                            console.error('❌ Cannot send auto-analyze: no conversationId');
                            return;
                        }
                        
                        // Set mode to deep for file analysis
                        setCurrentMode('deep');
                        props.onModeChange?.('deep');
                        
                        // Send the analysis query
                        setTimeout(() => {
                            handleSendMessage(currentPrompt);
                        }, 500);
                    }, 1000);
                }

            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error: any) {
            console.error('File upload error:', error);
            const errorMessage = error.message || 'Failed to upload file. Please try again.';
            console.error('Upload error details:', {
                message: errorMessage,
                status: error.status,
                response: error.response
            });
            antMessage.error(errorMessage);
        } finally {
            setUploadingFile(false);
            setUploadProgress(0);
            // Don't reset file input here - let user see the file was processed
        }
    };

    // Handle drag and drop
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            const file = files[0];
            // Validate file first
            const validation = validateFile(file);
            if (!validation.valid) {
                antMessage.error(validation.error || 'Invalid file');
                return;
            }
            // Set selected file and show preview (same as file input)
            setSelectedFile(file);
            setFilePreviewVisible(true);
            
            // Set the analysis prompt in the input box (user can edit before sending) - single line
            const analysisPrompt = `Perform a comprehensive analysis of this dataset. Include: 1. Data structure and schema overview 2. Key statistics and summary metrics with any proper cleanings required 3. Data quality assessment (missing values, duplicates, outliers) 4. Identify trends, patterns, and anomalies 5. Generate actionable insights and recommendations 6. Create visualizations for the most important findings`;
            
            setPrompt(analysisPrompt);
            // DO NOT add message to conversation - wait until user clicks Send
            
            if (files.length > 1) {
                antMessage.info(`Only the first file "${files[0].name}" was processed. Please upload other files separately.`);
            }
        }
    };

    // Handle file input change - show preview instead of auto-upload
    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            // Validate file first
            const validation = validateFile(file);
            if (!validation.valid) {
                antMessage.error(validation.error || 'Invalid file');
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                return;
            }
            // Set selected file and show preview (DO NOT add message to conversation yet)
            setSelectedFile(file);
            setFilePreviewVisible(true);
            
            // Set the analysis prompt in the input box (user can edit before sending) - single line
            const analysisPrompt = `Perform a comprehensive analysis of this dataset. Include: 1. Data structure and schema overview 2. Key statistics and summary metrics with any proper cleanings required 3. Data quality assessment (missing values, duplicates, outliers) 4. Identify trends, patterns, and anomalies 5. Generate actionable insights and recommendations 6. Create visualizations for the most important findings`;
            
            setPrompt(analysisPrompt);
            // DO NOT add message to conversation - wait until user clicks Send
        }
    };
    
    // Handle file removal
    const handleFileRemove = () => {
        setSelectedFile(null);
        setFilePreviewVisible(false);
        setPrompt(''); // Clear the prompt
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        // No need to remove messages - we never added a file message
    };
    
    // Handle file upload when Send button is clicked (file is uploaded first, then message is sent)
    const handleFileUploadBeforeSend = async (file: File): Promise<string | boolean> => {
        if (!file) return true; // No file to upload, proceed with message
        
        const validation = validateFile(file);
        if (!validation.valid) {
            antMessage.error(validation.error || 'Invalid file');
            return false;
        }

        setUploadingFile(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('include_preview', 'true');

            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    setUploadProgress(Math.round(percentComplete));
                }
            });

            const uploadPromise = new Promise<any>((resolve, reject) => {
                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const result = JSON.parse(xhr.responseText);
                            resolve(result);
                        } catch (e) {
                            reject(new Error('Invalid response from server'));
                        }
                    } else {
                        try {
                            const error = JSON.parse(xhr.responseText);
                            reject(new Error(error.detail || error.message || `Upload failed: ${xhr.statusText}`));
                        } catch {
                            reject(new Error(`Upload failed: ${xhr.statusText}`));
                        }
                    }
                });

                xhr.addEventListener('error', () => {
                    reject(new Error('Network error during upload'));
                });

                xhr.addEventListener('abort', () => {
                    reject(new Error('Upload cancelled'));
                });

                xhr.open('POST', '/api/data/upload');
                xhr.withCredentials = true;
                xhr.send(formData);
            });

            const result = await uploadPromise;

            if (result.success && result.data_source) {
                const dataSource = result.data_source;
                const dataSourceId = dataSource.id || dataSource.data_source_id;
                const newDataSource = {
                    id: dataSourceId,
                    name: dataSource.name || file.name,
                    type: 'file' as const,
                    status: 'connected' as const,
                    config: dataSource.config || {},
                    columns: dataSource.columns || dataSource.schema || [],
                    rowCount: dataSource.row_count || dataSource.rowCount || 0
                };

                // CRITICAL: Select the data source immediately so it's available for the message
                props.onDataSourceSelect?.(newDataSource);
                
                // CRITICAL: Dispatch event to notify data panel to refresh
                try {
                    window.dispatchEvent(new CustomEvent('datasource-created', {
                        detail: {
                            data_source: newDataSource,
                            data_source_id: dataSourceId
                        }
                    }));
                    console.log('📡 Dispatched datasource-created event');
                } catch (e) {
                    console.warn('Failed to dispatch datasource-created event:', e);
                }
                
                // Store the data source ID for use in the message
                console.log('📊 File uploaded, data source ID:', dataSourceId);
                
                setSelectedFile(null);
                setFilePreviewVisible(false);
                return dataSourceId; // Return data source ID instead of just true
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error: any) {
            console.error('File upload error:', error);
            antMessage.error(error.message || 'Failed to upload file. Please try again.');
            return false; // Upload failed, don't send message
        } finally {
            setUploadingFile(false);
            setUploadProgress(0);
        }
    };

    // Handle send message
    const handleSendMessage = async (messageText?: string) => {
        // CRITICAL: Check authentication before allowing any action
        if (!isAuthenticated || !user) {
            antMessage.error('Your session has expired. Please sign in again to continue.');
            // Redirect to login immediately
            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);
            return;
        }
        // Check if user has API access for chart generation
        if (!canPerformAction('generate_chart')) {
            showUpgradePrompt('api_access', 'Chart generation requires Pro plan or higher. Upgrade to unlock AI-powered chart generation!');
            return;
        }
        // If file is selected, upload it first before sending message
        let uploadedDataSourceId: string | undefined = undefined;
        uploadedDataSourceIdRef.current = undefined; // Reset before upload
        if (selectedFile && filePreviewVisible) {
            const uploadResult = await handleFileUploadBeforeSend(selectedFile);
            if (!uploadResult) {
                setIsLoading(false);
                return; // Upload failed, don't send message
            }
            // Upload result is now the data source ID (string) or true (boolean)
            if (typeof uploadResult === 'string') {
                uploadedDataSourceId = uploadResult;
            } else {
                // Fallback: wait for data source to be selected via callback
                await new Promise(resolve => setTimeout(resolve, 500));
                uploadedDataSourceId = props.selectedDataSource?.id;
            }
            // CRITICAL: Store in ref for use in processAIResponse
            uploadedDataSourceIdRef.current = uploadedDataSourceId;
            console.log('📊 Using data source ID for file analysis:', uploadedDataSourceId);
        }
        
        const textToSend = messageText || prompt.trim();
        if (!textToSend) {
            setIsLoading(false);
            return;
        }

        // CRITICAL: Set mode to deep if file was just uploaded (file sources always use deep analysis)
        // Also set to deep if prompt contains analysis keywords
        const isAnalysisQuery = textToSend.toLowerCase().includes('comprehensive analysis') || 
                                textToSend.toLowerCase().includes('deep analysis') ||
                                textToSend.toLowerCase().includes('data quality assessment') ||
                                textToSend.toLowerCase().includes('key statistics');
        
        // CRITICAL: File data sources ALWAYS use deep analysis workflow
        const shouldUseDeepMode = uploadedDataSourceId || 
                                  (props.selectedDataSource?.type === 'file') ||
                                  selectedFile || 
                                  isAnalysisQuery;
        
        const effectiveMode = shouldUseDeepMode ? 'deep' : currentMode;
        
        if (shouldUseDeepMode && currentMode !== 'deep') {
            setCurrentMode('deep');
            props.onModeChange?.('deep');
            console.log('📊 File data source detected - using deep analysis mode');
        }

        setIsLoading(true);
        setPrompt('');

        // Ensure we have a conversation (create if needed)
        let conversationId = props.conversationId;
        if (!conversationId) {
            try {
                const newConv = await conversationSessionManager.createNewConversation();
                conversationId = newConv.id || undefined;
                if (conversationId) {
                    props.callback?.({ conversation: newConv });
                    // Notify parent to update conversationId
                    if (props.onSelectConversation) {
                        props.onSelectConversation(newConv);
                    }
                }
            } catch (error) {
                console.error('Failed to create conversation:', error);
                antMessage.error('Failed to create conversation. Please try again.');
                setIsLoading(false);
                return;
            }
        }

        // Add user message using session manager
        const userMessage: IChatMessage = {
            id: shortid.generate(),
            query: textToSend,
            answer: '',
            created_at: new Date(),
            updated_at: new Date(),
            role: 'user',
            timestamp: new Date().toISOString(),
            messageType: 'text',
            saved: false, // Will be saved by session manager
            // CRITICAL: Include file info if file was uploaded
            fileInfo: selectedFile && uploadedDataSourceId ? {
                name: selectedFile.name,
                size: selectedFile.size,
                type: selectedFile.type,
                dataSourceId: uploadedDataSourceId
            } : undefined
        };

        // CRITICAL: Only add to local state, NOT session manager (to avoid duplicates)
        // Session manager will be updated when backend saves the message
        // Update local state
        setMessages(prev => {
            // Check if message already exists (prevent duplicates)
            const exists = prev.some(m => {
                if (m.id === userMessage.id) return true;
                if (m.role === 'user' && m.query === userMessage.query) {
                    const mTime = m.created_at ? new Date(m.created_at).getTime() : 0;
                    const userTime = userMessage.created_at ? new Date(userMessage.created_at).getTime() : 0;
                    return Math.abs(mTime - userTime) < 1000;
                }
                return false;
            });
            if (exists) {
                console.warn('⚠️ Duplicate message detected, skipping:', userMessage.id);
                return prev;
            }
            const updated = [...prev, userMessage];
            
            // CRITICAL: Update conversation metadata with data source when user sends message
            if (conversationId && props.selectedDataSource) {
                // Don't await - fire and forget to avoid blocking
                const metadataObj = {
                    last_data_source_id: props.selectedDataSource.id,
                    data_source_name: props.selectedDataSource.name,
                    data_source_type: props.selectedDataSource.type,
                    last_updated: new Date().toISOString()
                };
                // Type assertion needed because json_metadata can be string or object
                conversationSessionManager.updateConversationMetadata(conversationId, {
                    json_metadata: JSON.stringify(metadataObj) as any
                }).catch(e => console.warn('Failed to update conversation metadata:', e));
                
                // Also save to localStorage for immediate persistence
                try {
                    const metadataKey = `conv_metadata_${conversationId}`;
                    localStorage.setItem(metadataKey, JSON.stringify({
                        last_data_source_id: props.selectedDataSource.id,
                        data_source_name: props.selectedDataSource.name,
                        data_source_type: props.selectedDataSource.type
                    }));
                } catch (e) {
                    console.warn('Failed to save data source to localStorage:', e);
                }
            }
            
            // CRITICAL: Immediately save to localStorage with proper serialization
            try {
                const cacheKey = `conv_messages_${conversationId}`;
                // Serialize with proper date handling
                const serializable = updated.map(msg => ({
                    ...msg,
                    created_at: msg.created_at instanceof Date ? msg.created_at.toISOString() : msg.created_at,
                    updated_at: msg.updated_at instanceof Date ? msg.updated_at.toISOString() : msg.updated_at
                }));
                localStorage.setItem(cacheKey, JSON.stringify(serializable));
                console.log('💾 Immediately saved', updated.length, 'messages to localStorage (including user message)');
            } catch (e) {
                console.error('❌ Failed to save to localStorage:', e);
            }
            return updated;
        });

        // CRITICAL: Start progress immediately (don't wait for response)
        // Use 'start' stage instead of 'initializing' to avoid duplicates
        const initialProgress = {
            percentage: 5,
            message: 'Understanding your question...',  // More specific than "Starting analysis"
            stage: 'start',
            timestamp: Date.now()  // Add timestamp for stale detection
        };
        setProgressState(initialProgress);
        
        // Add processing message with initial progress
        const processingMessage: IChatMessage = {
            id: 'processing',
            query: '',
            answer: '',
            created_at: new Date(),
            updated_at: new Date(),
            role: 'assistant',
            timestamp: new Date().toISOString(),
            messageType: 'processing',
            saved: false,
            progress: { percentage: 5, message: 'Starting analysis...', stage: 'start' }  // Changed from 'initializing'
        };
        setMessages(prev => [...prev, processingMessage]);
        
        // Simulate initial progress steps while waiting for response
        const progressSimulator = async () => {
            const steps = [
                { percentage: 10, message: 'Analyzing query...', stage: 'analyzing', delay: 300 },
                { percentage: 20, message: 'Preparing data source...', stage: 'preparing', delay: 400 },
            ];
            
            for (const step of steps) {
                await new Promise(resolve => setTimeout(resolve, step.delay));
                // Only update if still loading (response hasn't arrived yet)
                if (isLoading || isStreaming) {
                    setProgressState({
                        percentage: step.percentage,
                        message: step.message,
                        stage: step.stage
                    });
                    setMessages(prev => prev.map(msg => 
                        msg.id === 'processing' 
                            ? { ...msg, progress: { percentage: step.percentage, message: step.message, stage: step.stage } }
                            : msg
                    ));
                } else {
                    break; // Response arrived, stop simulation
                }
            }
        };
        
        // Start progress simulation in background
        progressSimulator();

        try {
            // Respect user's streaming preference - DEFAULT TO STREAMING for better UX
            const enableStreaming = streamingEnabled !== false; // Stream by default unless explicitly disabled
            console.log(`🌊 Streaming ${enableStreaming ? 'ENABLED' : 'DISABLED'} for this request`);
            
            if (enableStreaming) {
                // Use streaming with SSE (Server-Sent Events)
                console.log('🚀 Calling handleStreamingRequest...');
                await handleStreamingRequest(
                    textToSend,
                    uploadedDataSourceId || props.selectedDataSource?.id,
                    conversationId || props.conversationId,
                    effectiveMode, // Use effective mode (deep for files)
                    currentModel
                );
                // CRITICAL: Return here to prevent fall-through to non-streaming
                return;
            }
            
            // Non-streaming fallback (only if streaming explicitly disabled)
            console.log('📡 Using non-streaming request...');
            const response = await fetch('/api/ai/chat/analyze', {
                method: 'POST',
                credentials: 'include',
                headers: getSecureAuthHeaders(false),
                body: JSON.stringify({
                    query: textToSend,
                    data_source_id: uploadedDataSourceId || props.selectedDataSource?.id,
                    business_context: 'data_analysis',
                    conversation_id: conversationId || props.conversationId,
                    analysis_mode: effectiveMode, // Use effective mode (deep for files)
                    ai_model: currentModel === 'auto' ? 'azure_gpt5_mini' : currentModel,
                    stream: false,
                    organization_id: currentOrganization?.id ? String(currentOrganization.id) : undefined
                })
            });

            // Check response status before parsing
            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { detail: errorText || `HTTP ${response.status}: ${response.statusText}` };
                }
                
                // Handle authentication errors
                if (response.status === 401 || response.status === 403) {
                    antMessage.error('Authentication failed. Please log in again.');
                    localStorage.removeItem('token');
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 2000);
                    return;
                }
                
                throw new Error(errorData.detail || errorData.message || `Request failed with status ${response.status}`);
            }
            
            const result = await response.json();
            
            // Add timeout protection
            const timeoutId = setTimeout(() => {
                if (isLoading || isStreaming) {
                    antMessage.warning('Response is taking longer than expected. Please wait...');
                }
            }, 30000);
            
            try {
                await handleNonStreamingResult(result, textToSend);
            } finally {
                clearTimeout(timeoutId);
            }
        } catch (error) {
            console.error('Error in handleSendMessage:', error);
            setIsLoading(false);
            setIsStreaming(false);
            setMessages(prev => prev.filter(m => m.id !== 'processing'));
            setProgressState(null);
            
            // Show sanitized error message (no sensitive data leaks)
            const sanitizedError = sanitizeErrorMessage(error);
            const errorMessage: IChatMessage = {
                            id: shortid.generate(),
                            query: '',
                answer: `I encountered an error: ${sanitizedError}. Please try again.`,
                            created_at: new Date(),
                    updated_at: new Date(),
                    role: 'assistant',
            timestamp: new Date().toISOString(),
            messageType: 'text',
                saved: false
            };
            setMessages(prev => [...prev, errorMessage]);
        }
    };

    // Handle stop/cancel request
    const handleStopRequest = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsLoading(false);
        setIsStreaming(false);
        setProgressState(null);
        if (progressTimeoutRef.current) {
            clearTimeout(progressTimeoutRef.current);
            progressTimeoutRef.current = null;
        }
        setMessages(prev => prev.filter(m => m.id !== 'processing'));
        antMessage.info('Request cancelled');
    }, []);

    // Handle streaming request with real-time progress updates
    const handleStreamingRequest = async (
        query: string,
        dataSourceId: string | undefined,
        conversationId: string | undefined,
        analysisMode: string,
        aiModel: string
    ) => {
        // Create abort controller for cancellation
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;
        
        // Set timeout to ensure progress completes (fix stuck at 90%)
        if (progressTimeoutRef.current) {
            clearTimeout(progressTimeoutRef.current);
        }
        progressTimeoutRef.current = setTimeout(() => {
            if (progressState && progressState.percentage < 100 && progressState.percentage >= 90) {
                setProgressState(prev => prev ? { ...prev, percentage: 100, message: 'Completing...', stage: 'complete' } : null);
            }
        }, 30000); // 30 second timeout for stuck progress
        
        try {
            // Use streaming endpoint if enabled
            // CRITICAL: Use correct endpoint path - /api/ai/chat/analyze routes to backend /ai/chat/analyze
            const endpoint = streamingEnabled ? '/api/ai/chat/analyze/stream' : '/api/ai/chat/analyze';
            const response = await fetch(endpoint, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    ...getSecureAuthHeaders(false), // Prefer cookies for auth
                    'Accept': streamingEnabled ? 'text/event-stream' : 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: query,
                    data_source_id: dataSourceId,
                    business_context: 'data_analysis',
                    conversation_id: conversationId,
                    analysis_mode: analysisMode,
                    ai_model: aiModel === 'auto' ? 'azure_gpt5_mini' : aiModel, // Convert 'auto' to default model
                    stream: streamingEnabled,
                    user_context: { stream: streamingEnabled },
                    // CRITICAL: Include organization_id for streaming endpoint
                    organization_id: currentOrganization?.id ? String(currentOrganization.id) : undefined
                }),
                signal: signal
            });

            if (!response.ok) {
                // Handle authentication errors securely
                if (isAuthError(response)) {
                    antMessage.error('Authentication failed. Please log in again.');
                    handleAuthError();
                    return;
                }
                
                // Try to get error message from response
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json().catch(() => null);
                    if (errorData && errorData.detail) {
                        errorMessage = errorData.detail;
                    } else if (errorData && errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch (e) {
                    // Response might not be JSON, use status text
                    errorMessage = response.statusText || errorMessage;
                }
                // Sanitize error message to prevent leaks
                throw new Error(sanitizeErrorMessage(errorMessage));
            }

            // Check if response is streaming (text/event-stream)
            const contentType = response.headers.get('content-type') || '';
            console.log('📡 Response content-type:', contentType);
            console.log('📡 Response status:', response.status);
            console.log('📡 Response ok:', response.ok);
            console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
            
            // Check if it's a stream (SSE) or if we should treat it as one
            const isStreaming = contentType.includes('text/event-stream') || 
                               contentType.includes('text/plain') ||
                               response.body;
            
            if (isStreaming && response.body) {
                console.log('✅ Detected streaming response (SSE or stream)');
                // Handle SSE streaming
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let eventCount = 0;
                let lastProgressState: any = null;
                let receivedCompleteEvent = false;
                
                console.log('📖 Starting to read stream...');
                
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        
                        if (done) {
                            console.log(`📖 Stream reading complete. Total events received: ${eventCount}`);
                            if (eventCount === 0) {
                                console.warn('⚠️ No streaming events received! This might indicate a streaming issue.');
                            }
                            
                            // CRITICAL: If stream ended without a complete event, handle completion manually
                            if (!receivedCompleteEvent) {
                                console.warn('⚠️ Stream ended without complete event, attempting to complete manually');
                                
                                if (lastProgressState && lastProgressState.partial_results) {
                                    // Try to construct complete event from partial results
                                    console.log('📊 Using last progress state with partial results to complete');
                                    const syntheticComplete = {
                                        type: 'complete',
                                        success: true,
                                        query: query,
                                        message: lastProgressState.message || 'Analysis complete!',
                                        progress: {
                                            percentage: 100,
                                            message: 'Analysis complete!',
                                            stage: 'complete'
                                        },
                                        // Extract data from partial results
                                        echarts_config: lastProgressState.partial_results?.echarts_config,
                                        insights: lastProgressState.partial_results?.insights || [],
                                        recommendations: lastProgressState.partial_results?.recommendations || [],
                                        sql_query: lastProgressState.partial_results?.sql_query,
                                        query_result: lastProgressState.partial_results?.query_result
                                    };
                                    await handleStreamingComplete(syntheticComplete, query);
                                } else {
                                    // No progress state or partial results - create minimal complete event
                                    console.warn('⚠️ No partial results available, creating minimal complete event');
                                    const minimalComplete = {
                                        type: 'complete',
                                        success: true,
                                        query: query,
                                        message: 'Analysis complete! Please check the results below.',
                                        progress: {
                                            percentage: 100,
                                            message: 'Analysis complete!',
                                            stage: 'complete'
                                        }
                                    };
                                    await handleStreamingComplete(minimalComplete, query);
                                }
                            }
                            break;
                        }

                    const chunk = decoder.decode(value, { stream: true });
                    console.log('📦 Received chunk:', chunk.length, 'bytes');
                    buffer += chunk;
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep incomplete line in buffer

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const jsonStr = line.slice(6).trim();
                                if (!jsonStr) continue; // Skip empty lines
                                const data = JSON.parse(jsonStr);
                                eventCount++;
                                console.log(`📨 Received SSE event #${eventCount}:`, data.type, {
                                    percentage: data.progress?.percentage,
                                    stage: data.progress?.stage,
                                    message: data.progress?.message?.substring(0, 50)
                                });
                                
                                // Track completion and progress state BEFORE processing
                                if (data.type === 'complete') {
                                    receivedCompleteEvent = true;
                                } else if (data.type === 'progress' && data.progress) {
                                    lastProgressState = {
                                        percentage: data.progress.percentage,
                                        message: data.progress.message,
                                        stage: data.progress.stage,
                                        partial_results: data.partial_results || {}
                                    };
                                }
                                
                                await handleStreamingEvent(data, query);
                            } catch (e) {
                                console.warn('Failed to parse SSE data:', e, line);
                            }
                        } else if (line.trim() && !line.startsWith(':') && !line.startsWith('event:')) {
                            // Log non-data lines for debugging (skip SSE metadata)
                            if (line.length < 100) { // Only log short lines to avoid spam
                                console.log('📨 SSE line (not data):', line);
                            }
                        }
                    }
                    
                        // Log progress every few chunks
                        if (eventCount > 0 && eventCount % 5 === 0) {
                            console.log(`📊 Processed ${eventCount} streaming events so far`);
                        }
                    }
                } catch (streamError) {
                    console.error('❌ Error reading stream:', streamError);
                    // Ensure completion even on stream error
                    if (!receivedCompleteEvent) {
                        const errorComplete = {
                            type: 'complete',
                            success: false,
                            query: query,
                            message: 'Stream reading error occurred. Please try again.',
                            error: streamError instanceof Error ? streamError.message : String(streamError),
                            progress: {
                                percentage: 100,
                                message: 'Error occurred',
                                stage: 'error'
                            }
                        };
                        await handleStreamingComplete(errorComplete, query);
                    }
                    throw streamError;
                }
            } else {
                // Fallback: response is JSON (non-streaming)
                console.warn('⚠️ Response is not streaming (content-type:', contentType, '), using non-streaming handler');
                const result = await response.json();
                await handleNonStreamingResult(result, query);
            }
        } catch (error) {
            console.error('Streaming request failed:', error);
            throw error;
        }
    };

    // Handle individual streaming events
    const handleStreamingEvent = async (data: any, query: string) => {
        console.log('📨 Processing SSE event:', data.type, data);
        
        if (data.type === 'progress') {
            // Update progress in real-time - ensure percentage only increases
            const incomingPercentage = data.progress?.percentage || 0;
            const currentPercentage = progressState?.percentage || 0;
            
            // CRITICAL: Only update if new percentage is higher (prevents going backwards)
            const newPercentage = incomingPercentage > currentPercentage ? incomingPercentage : currentPercentage;
            
            // Make messages user-friendly
            const friendlyMessage = makeProgressMessageUserFriendly(
                data.progress?.stage || 'unknown',
                data.progress?.message
            );
            
            const newProgress = {
                percentage: newPercentage,
                message: friendlyMessage,
                stage: data.progress?.stage || 'unknown'
            };
            
            console.log('🔄 Updating progress:', newProgress, 'from node:', data.node, `(incoming: ${incomingPercentage}%, current: ${currentPercentage}%)`);
            
            // CRITICAL: Update progress state immediately for real-time updates
            // Update progress state (this triggers re-render)
            setProgressState(newProgress);
            
            // If there's an error in a progress update, display user-friendly error
            if (data.error) {
                const friendlyError = makeErrorMessageUserFriendly(data.error, {
                    stage: data.node || data.progress?.stage,
                    query: query
                });
                antMessage.error(friendlyError);
            }
            
            // Update processing message with progress to trigger re-render
            // Use functional update to ensure we get the latest state
            setMessages(prev => {
                // Find processing message and update it
                const hasProcessing = prev.some(m => m.id === 'processing');
                if (!hasProcessing) {
                    // If no processing message, add one
                    return [...prev, {
                        id: 'processing',
                        query: '',
                        answer: '',
                        created_at: new Date(),
                        updated_at: new Date(),
                        role: 'assistant' as const,
                        timestamp: new Date().toISOString(),
                        messageType: 'processing' as const,
                        saved: false,
                        progress: newProgress
                    }];
                }
                
                // Update existing processing message - create new object to force re-render
                const updated = prev.map(m => {
                    if (m.id === 'processing') {
                        return { 
                            ...m, 
                            progress: newProgress, 
                            updated_at: new Date()
                        };
                    }
                    return m;
                });
                
                // Return new array to ensure React detects the change
                return updated;
            });

            // Log partial results if available
            if (data.partial_results) {
                console.log('📊 Progress update with partial results:', {
                    node: data.node,
                    progress: newProgress,
                    partial: data.partial_results
                });
            }
        } else if (data.type === 'complete') {
            // Final result received
            await handleStreamingComplete(data, query);
        } else if (data.type === 'error') {
            // Error occurred - use user-friendly message
            setIsLoading(false);
            setIsStreaming(false);
            setProgressState(null);
            if (progressTimeoutRef.current) {
                clearTimeout(progressTimeoutRef.current);
                progressTimeoutRef.current = null;
            }
            setMessages(prev => prev.filter(m => m.id !== 'processing'));
            
            const friendlyError = makeErrorMessageUserFriendly(data.error || 'An error occurred during processing.', {
                stage: data.node,
                query: query
            });
            
            const errorMessage: IChatMessage = {
                id: shortid.generate(),
                query: '',
                answer: friendlyError,
                created_at: new Date(),
                updated_at: new Date(),
                role: 'assistant',
                    timestamp: new Date().toISOString(),
                    messageType: 'text',
                saved: false
            };
            setMessages(prev => [...prev, errorMessage]);
            antMessage.error(friendlyError);
        }
    };

    // Handle streaming complete event
    const handleStreamingComplete = async (result: any, query: string) => {
        setIsLoading(false);
        setIsStreaming(false);
        
        // Clear timeout
        if (progressTimeoutRef.current) {
            clearTimeout(progressTimeoutRef.current);
            progressTimeoutRef.current = null;
        }
        
        // Refresh organization usage stats after successful AI call (credits consumed)
        if (currentOrganization?.id) {
            try {
                await getOrganizationUsage(currentOrganization.id);
                console.log('✅ Refreshed organization usage stats after streaming AI call');
            } catch (error) {
                console.warn('⚠️ Failed to refresh usage stats:', error);
            }
        }
        
        // Update progress one last time from final result if available - ensure 100%
        if (result.progress) {
            const friendlyMessage = makeProgressMessageUserFriendly(
                result.progress.stage || 'complete',
                result.progress.message
            );
            const finalProgress = {
                percentage: 100, // Always complete at 100%
                message: friendlyMessage,
                stage: 'complete'
            };
            setProgressState(finalProgress);
            console.log('✅ Final progress:', finalProgress);
        } else {
            // Ensure progress completes even if not in result
            setProgressState({
                percentage: 100,
                message: 'Analysis complete!',
                stage: 'complete'
            });
        }
        
        // Remove processing message
        setMessages(prev => prev.filter(m => m.id !== 'processing'));
        
        // Clear progress state after a brief delay (ensure it clears even if stuck)
        if (progressTimeoutRef.current) {
            clearTimeout(progressTimeoutRef.current);
        }
        progressTimeoutRef.current = setTimeout(() => {
            setProgressState(null);
            console.log('✅ Progress state cleared (streaming)');
        }, 2000); // Increased to 2 seconds to ensure visibility
        
        // Check which orchestrator was used
        const aiEngine = result.ai_engine || 'Unknown';
        console.log(`🤖 AI Engine: ${aiEngine}`);
        if (aiEngine.includes('LangGraph')) {
            console.log('✅ LangGraph orchestrator is active!');
        }

        if (result.success !== false) {
            // Extract all components
            await processAIResponse(result, query);
            } else {
            // Handle error result
                const errorMessage: IChatMessage = {
                    id: shortid.generate(),
                    query: '',
                answer: result.error 
                    ? makeErrorMessageUserFriendly(result.error, { query: query })
                    : makeMessageUserFriendly(result.message || 'Analysis complete.'),
                    created_at: new Date(),
                    updated_at: new Date(),
                    role: 'assistant',
                    timestamp: new Date().toISOString(),
                    messageType: 'text',
                saved: false
                };
                setMessages(prev => [...prev, errorMessage]);
            }
    };

    // Handle non-streaming result (fallback)
    const handleNonStreamingResult = async (result: any, query: string) => {
        setIsLoading(false);
        setIsStreaming(false); // Ensure streaming state is cleared
        
        // Continue progress from where we left off (we started at 5-20% already)
        const currentProgress = progressState?.percentage || 20;
        
        // For non-streaming, continue progress updates from current state
        if (!result.progress || result.progress.percentage === 0) {
            // Continue progress from current state to 100% in steps
            const progressSteps = [
                { percentage: Math.max(currentProgress, 30), message: 'Generating SQL...', stage: 'sql_generation' },
                { percentage: Math.max(currentProgress, 45), message: 'Executing query...', stage: 'query_execution' },
                { percentage: Math.max(currentProgress, 60), message: 'Creating visualization...', stage: 'chart_generation' },
                { percentage: Math.max(currentProgress, 75), message: 'Generating insights...', stage: 'insights' },
                { percentage: Math.max(currentProgress, 90), message: 'Finalizing results...', stage: 'finalizing' },
                { percentage: 100, message: 'Complete', stage: 'complete' }
            ];
            
            for (let i = 0; i < progressSteps.length; i++) {
                const step = progressSteps[i];
                // Only update if higher than current
                if (step.percentage > currentProgress) {
                    setProgressState({
                        percentage: step.percentage,
                        message: step.message,
                        stage: step.stage
                    });
                    setMessages(prev => prev.map(msg => 
                        msg.id === 'processing' 
                            ? { ...msg, progress: { percentage: step.percentage, message: step.message, stage: step.stage } }
                            : msg
                    ));
                    
                    // Wait before next step
                    const delay = i < 2 ? 400 : i < 4 ? 500 : 300;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        } else {
            // Use provided progress (ensure it's higher than current)
            const newProgress = {
                percentage: Math.max(result.progress.percentage || 0, currentProgress),
                message: result.progress.message || 'Processing...',
                stage: result.progress.stage || 'unknown'
            };
            setProgressState(newProgress);
        }
        
        // CRITICAL: Don't remove processing message until we have actual content
        // This prevents message loss during non-streaming operations
        const hasContent = result.message || result.narration || result.analysis || 
                          result.echarts_config || result.chart_config || 
                          result.insights?.length > 0 || result.recommendations?.length > 0 ||
                          result.query_result || result.sql_query;
        
        if (hasContent) {
            // Only remove processing message if we have actual content
            setMessages(prev => prev.filter(m => m.id !== 'processing'));
        } else {
            // Keep processing message but mark it as error
            setMessages(prev => prev.map(m => 
                m.id === 'processing' 
                    ? { ...m, messageType: 'error' as const, answer: 'No content received from server' }
                    : m
            ));
        }
        
        // Clear progress state after a brief delay (ensure it clears even if stuck)
        if (progressTimeoutRef.current) {
            clearTimeout(progressTimeoutRef.current);
        }
        progressTimeoutRef.current = setTimeout(() => {
            setProgressState(null);
            console.log('✅ Progress state cleared (non-streaming)');
        }, 2000); // Increased to 2 seconds to ensure visibility
        
        // Check which orchestrator was used
        const aiEngine = result.ai_engine || 'Unknown';
        console.log(`🤖 AI Engine: ${aiEngine}`);
        if (aiEngine.includes('LangGraph')) {
            console.log('✅ LangGraph orchestrator is active!');
        }
        
        if (result.success !== false) {
            await processAIResponse(result, query);
            
            // Refresh organization usage stats after successful AI call (credits consumed)
            if (currentOrganization?.id) {
                try {
                    await getOrganizationUsage(currentOrganization.id);
                    console.log('✅ Refreshed organization usage stats after AI call');
                } catch (error) {
                    console.warn('⚠️ Failed to refresh usage stats:', error);
                }
            }
        } else {
            // Handle error
            const errorMessage: IChatMessage = {
                id: shortid.generate(),
                query: '',
                answer: result.error 
                    ? makeErrorMessageUserFriendly(result.error, { query: query })
                    : makeMessageUserFriendly(result.message || 'Analysis complete.'),
                created_at: new Date(),
                updated_at: new Date(),
                role: 'assistant',
                timestamp: new Date().toISOString(),
                messageType: 'text',
                saved: false
            };
            setMessages(prev => [...prev, errorMessage]);
        }
    };

    // Process AI response (extracted to avoid duplication)
    const processAIResponse = async (result: any, query: string) => {
        // Refresh organization usage stats after successful AI response (credits consumed)
        if (currentOrganization?.id) {
            try {
                await getOrganizationUsage(currentOrganization.id);
                console.log('✅ Refreshed organization usage stats after AI response');
            } catch (error) {
                console.warn('⚠️ Failed to refresh usage stats:', error);
            }
        }
        
        // CRITICAL: Extract all components - prioritize message/narration
        let aiAnalysis = makeMessageUserFriendly(result.message || result.narration || result.analysis || result.answer || '');
        const executionMetadata = result.execution_metadata || {};
        
        // Check if response is empty or missing content
        const hasContent = aiAnalysis.trim().length > 0 || 
                          result.echarts_config || 
                          result.chart_config || 
                          result.insights?.length > 0 || 
                          result.recommendations?.length > 0 ||
                          result.query_result ||
                          result.sql_query;
        
        if (!hasContent) {
            console.warn('⚠️ Empty content in AI response:', result);
            // Improved fallback message - more helpful and actionable
            aiAnalysis = 'I\'m having trouble processing your request right now. This could be due to:\n\n' +
                        '• The data source may need to be reconnected\n' +
                        '• The query might need to be rephrased\n' +
                        '• There may be a temporary service issue\n\n' +
                        'Please try again, or contact support if the issue persists.';
        }
        
        // Extract chart config - handle primary_chart structure and nested configs
        let echartsConfig = result.echarts_config || result.chart_config;
        if (echartsConfig && typeof echartsConfig === 'object') {
            // Handle primary_chart structure
            if (echartsConfig.primary_chart) {
                echartsConfig = echartsConfig.primary_chart;
                console.log('✅ Extracted primary_chart from echarts_config');
            }
            // CRITICAL: Validate chart config has required structure (series with data)
            if (echartsConfig && (!echartsConfig.series || !Array.isArray(echartsConfig.series) || echartsConfig.series.length === 0)) {
                console.warn('⚠️ Chart config missing series or series is empty, setting to null');
                echartsConfig = null;
            } else if (echartsConfig && echartsConfig.series) {
                // Check if any series has data
                const hasData = echartsConfig.series.some((s: any) => s.data && (Array.isArray(s.data) ? s.data.length > 0 : true));
                if (!hasData) {
                    console.warn('⚠️ Chart config series has no data, setting to null');
                    echartsConfig = null;
                } else {
                    console.log('✅ Chart config validated - has series with data');
                }
            }
        }
        
        const insights = result.insights || [];
        const recommendations = result.recommendations || [];
        // CRITICAL: Extract SQL query from multiple possible locations
        const sqlQuery = result.sql_query || result.sqlQuery || (result.execution_metadata && result.execution_metadata.sql_query) || (result.executionMetadata && result.executionMetadata.sql_query);
        
        // Handle query_result - it might be nested or direct
        let queryResult = result.query_result;
        if (queryResult && typeof queryResult === 'object' && 'data' in queryResult) {
            queryResult = queryResult.data || queryResult;
        } else if (!queryResult && result.query_result_data) {
            queryResult = result.query_result_data;
        }
        
        // Check if we have meaningful content (not just generic error)
        const hasMeaningfulContent = echartsConfig || 
            (insights && insights.length > 0) || 
            (recommendations && recommendations.length > 0) || 
            sqlQuery || 
            (queryResult && Array.isArray(queryResult) && queryResult.length > 0);
        
        // If aiAnalysis is just a generic error and we have no meaningful content, use a better message
        const errorMessagePatterns = [
            /^I apologize, but I could not generate a response\.?$/i,
            /^I apologize, but I encountered an error/i
        ];
        
        if (errorMessagePatterns.some(pattern => pattern.test(aiAnalysis)) && !hasMeaningfulContent) {
            // Replace generic error with a more helpful message or skip if no content
            if (queryResult && Array.isArray(queryResult) && queryResult.length > 0) {
                aiAnalysis = `I've analyzed your query: "${query}". Here are the results.`;
            } else if (sqlQuery) {
                aiAnalysis = `I've generated a SQL query for your request: "${query}".`;
            } else {
                // If we truly have nothing, use a generic but helpful message
                aiAnalysis = `I've processed your query: "${query}".`;
            }
        }
        
        console.log('📤 Response components received:');
        console.log('  - message/narration:', aiAnalysis ? `${aiAnalysis.length} chars` : 'MISSING');
        console.log('  - chart config:', echartsConfig ? 'Yes' : 'No');
        console.log('  - insights:', insights.length);
        console.log('  - recommendations:', recommendations.length);
        console.log('  - sql_query:', sqlQuery ? 'Yes' : 'No');
        console.log('  - query_result:', queryResult ? 'Yes' : 'No');
        
        const componentsGenerated = executionMetadata.components_generated || {};
        const sqlSuggestions = (result.sql_suggestions || []).map((sql: string, index: number) => ({
            query: sql,
            explanation: `Generated SQL query ${index + 1}`,
            confidence: 0.8,
            execution_time_estimate: 1000,
            optimization_tips: []
        }));
        
        // CRITICAL: Always create a message, even if it's just conversational
        // If no meaningful content, create a helpful conversational message
        if (!hasMeaningfulContent && errorMessagePatterns.some(pattern => pattern.test(aiAnalysis))) {
            // Replace with a helpful conversational message
            aiAnalysis = `I understand your question: "${query}". ${result.message || 'Let me help you with that.'}`;
            console.log('💬 Creating conversational message (no data source):', aiAnalysis);
        }
        
        // If we have no content at all, still create a message to show the user something
        if (!aiAnalysis || aiAnalysis.trim().length === 0) {
            aiAnalysis = `I've processed your query: "${query}". ${hasMeaningfulContent ? 'Here are the results.' : 'How can I help you further?'}`;
        }
                
        // CRITICAL: Apply watermark to chart config if needed (for free plan users)
        // Note: Watermark will be applied when rendering in ChatMessage component
        // We store the original config here, watermark is applied at render time
        
        // CRITICAL: Create enhanced AI message with ALL components
        // Use UUID format for backend compatibility (not shortid)
        const messageId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        
        const aiMessage: IChatMessage = {
            id: messageId,
            query: '',
            answer: aiAnalysis || 'Analysis complete.',
            content: aiAnalysis || 'Analysis complete.',
            message: aiAnalysis,
            narration: result.narration || aiAnalysis,
            created_at: new Date(),
            updated_at: new Date(),
            role: 'assistant',
            timestamp: new Date().toISOString(),
            messageType: 'ai_response',
            saved: false,
            executionMetadata: executionMetadata,
            echartsConfig: echartsConfig,
            chartConfig: echartsConfig,
            insights: insights,
            recommendations: recommendations,
            sqlSuggestions: sqlSuggestions,
            sqlQuery: sqlQuery || result.sqlQuery || (result.execution_metadata && result.execution_metadata.sql_query) || (result.executionMetadata && result.executionMetadata.sql_query),
            queryResult: queryResult,
            analysis: aiAnalysis,
            aiCapabilities: result.capabilities || [],
            aiEngine: result.ai_engine || 'LangGraph Multi-Agent Framework',
            dataSourceId: props.selectedDataSource?.id || uploadedDataSourceIdRef.current || undefined,
            progress: result.progress ? {
                percentage: result.progress.percentage || 100,
                message: result.progress.message || 'Completed',
                stage: result.progress.stage || 'complete'
            } : undefined
        };
        
        console.log('✅ Creating AI message with:', {
            hasMessage: !!aiMessage.message,
            hasChart: !!aiMessage.echartsConfig,
            hasInsights: !!(aiMessage.insights && aiMessage.insights.length > 0),
            hasRecommendations: !!(aiMessage.recommendations && aiMessage.recommendations.length > 0),
            hasSQL: !!aiMessage.sqlQuery,
            queryResultPresent: !!aiMessage.queryResult
        });

        // CRITICAL: Check for duplicates before adding
        setMessages(prev => {
            // Enhanced duplicate detection: check by ID, content, and timestamp
            const exists = prev.some(m => {
                // Exact ID match
                if (m.id === aiMessage.id) {
                    console.warn('⚠️ Duplicate detected: same ID', aiMessage.id);
                    return true;
                }
                // Same role and similar content (for assistant messages)
                if (m.role === 'assistant' && aiMessage.role === 'assistant') {
                    // Check if answer content is very similar (first 150 chars match for better detection)
                    const mAnswer = (m.answer || '').trim();
                    const aiAnswer = (aiMessage.answer || '').trim();
                    
                    // Also check if both have same chart config (indicates duplicate chart generation)
                    const mHasChart = !!(m.echartsConfig || m.chartConfig);
                    const aiHasChart = !!(aiMessage.echartsConfig || aiMessage.chartConfig);
                    
                    if (mAnswer && aiAnswer) {
                        // More lenient matching: check first 150 chars or if both are very short, check full match
                        const contentMatch = mAnswer.length < 200 && aiAnswer.length < 200
                            ? mAnswer === aiAnswer
                            : mAnswer.substring(0, 150) === aiAnswer.substring(0, 150);
                        
                        if (contentMatch) {
                            const mTime = m.created_at ? new Date(m.created_at).getTime() : 0;
                            const aiTime = aiMessage.created_at ? new Date(aiMessage.created_at).getTime() : 0;
                            // If within 3 seconds and content matches, it's likely a duplicate
                            // Also check if both have charts (indicates duplicate chart generation) - allow 10s window
                            if (Math.abs(mTime - aiTime) < 3000 || (mHasChart && aiHasChart && Math.abs(mTime - aiTime) < 10000)) {
                                console.warn('⚠️ Duplicate detected: similar content', {
                                    existing: m.id,
                                    new: aiMessage.id,
                                    timeDiff: Math.abs(mTime - aiTime),
                                    bothHaveCharts: mHasChart && aiHasChart
                                });
                                return true;
                            }
                        }
                    }
                }
                return false;
            });
            if (exists) {
                console.warn('⚠️ Duplicate AI message detected, skipping:', aiMessage.id);
                return prev;
            }
            const updated = [...prev, aiMessage];
            
            // Update session manager (backend already saved via /chat endpoint)
            if (props.conversationId) {
                conversationSessionManager.addMessage(aiMessage, props.conversationId);
            }
            
            // CRITICAL: Update conversation metadata with data source and latest state
            if (props.conversationId && props.selectedDataSource) {
                // Don't await - fire and forget to avoid blocking
                const metadata = {
                    last_data_source_id: props.selectedDataSource.id,
                    data_source_name: props.selectedDataSource.name,
                    data_source_type: props.selectedDataSource.type,
                    data_sources_used: [props.selectedDataSource.id],
                    last_updated: new Date().toISOString()
                };
                // Type assertion needed because json_metadata can be string or object
                conversationSessionManager.updateConversationMetadata(props.conversationId, {
                    json_metadata: JSON.stringify(metadata) as any
                }).catch(e => console.warn('Failed to update conversation metadata:', e));
            }
            
            // CRITICAL: Immediately save to localStorage to prevent loss on navigation
            // Also save chart configs separately for persistence
            if (props.conversationId) {
                try {
                    const cacheKey = `conv_messages_${props.conversationId}`;
                    // Serialize with proper date handling and ensure chart configs are preserved
                    const serializable = updated.map(msg => ({
                        ...msg,
                        created_at: msg.created_at instanceof Date ? msg.created_at.toISOString() : msg.created_at,
                        updated_at: msg.updated_at instanceof Date ? msg.updated_at.toISOString() : msg.updated_at,
                        // CRITICAL: Ensure echartsConfig is preserved
                        echartsConfig: msg.echartsConfig || msg.chartConfig,
                        chartConfig: msg.chartConfig || msg.echartsConfig
                    }));
                    localStorage.setItem(cacheKey, JSON.stringify(serializable));
                    
                    // CRITICAL: Also save chart configs separately for quick restoration
                    // This ensures charts persist across navigation and screen switches
                    const chartsWithConfigs = updated.filter(msg => msg.echartsConfig || msg.chartConfig);
                    if (chartsWithConfigs.length > 0) {
                        const chartsKey = `conv_charts_${props.conversationId}`;
                        const chartsData = chartsWithConfigs.map(msg => ({
                            id: msg.id,
                            echartsConfig: msg.echartsConfig || msg.chartConfig,
                            chartConfig: msg.chartConfig || msg.echartsConfig,
                            // Also save query result and insights for complete restoration
                            queryResult: msg.queryResult,
                            insights: msg.insights,
                            recommendations: msg.recommendations
                        }));
                        localStorage.setItem(chartsKey, JSON.stringify(chartsData));
                        console.log('💾 Saved', chartsData.length, 'chart configs to localStorage');
                    }
                    
                    console.log('💾 Immediately saved', updated.length, 'messages to localStorage (including new AI message)');
                } catch (e) {
                    console.error('❌ Failed to save AI message to localStorage:', e);
                }
            }
            
            // Auto-name conversation based on first user message if title is still "New Conversation"
            if (props.conversationId && query && prev.length === 1 && prev[0]?.role === 'user') {
                // This is the first AI response - check if we need to auto-name
                const conversationTitle = props.callback ? (props.callback as any).conversation?.title : null;
                if (!conversationTitle || conversationTitle === 'New Conversation') {
                    // Auto-generate title from first user message
                    const title = query.length > 50 ? query.substring(0, 50) + '...' : query;
                    fetch(`/api/conversations/${props.conversationId}`, {
                        method: 'PUT',
                        credentials: 'include',
                        headers: getSecureAuthHeaders(false), // Prefer cookies for auth
                        body: JSON.stringify({ title })
                    }).then(() => {
                        console.log('✅ Auto-named conversation:', title);
                    }).catch((error) => {
                        console.warn('Failed to auto-name conversation:', error);
                    });
                }
            }
            
            return updated;
        });

        // Update cache
        if (props.conversationId) {
            setMessageCache(prev => {
                const cached = prev[props.conversationId!] || { messages: [], conversation: {}, pagination: {} };
                const userMessage = messages.find(m => m.role === 'user' && m.query === query);
                return {
                    ...prev,
                    [props.conversationId!]: {
                        ...cached,
                        messages: [...cached.messages, ...(userMessage ? [userMessage] : []), aiMessage]
                    }
                };
            });
        }

        // Note: Backend already saves messages via /chat endpoint, so no need to save again here
        // The session manager is only used for optimistic UI updates and caching
    };

    // Handle key press
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Handle typing
    const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setPrompt(e.target.value);
        
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        
        setIsTyping(true);
        const timeout = setTimeout(() => {
            setIsTyping(false);
        }, 1000);
        setTypingTimeout(timeout);
    };

    // Auto-scroll: Only scroll when a NEW message is sent (not on every message change)
    // CRITICAL: Declare refs at component top level (before any conditional logic)
    const prevMessagesLengthRef = useRef(0);
    const isUserAtBottomRef = useRef(true);
    
    // Setup scroll tracking (separate effect to avoid hook count changes)
    useEffect(() => {
        const chatContainer = chatMessagesRef.current;
        if (!chatContainer) return;

        const handleScroll = () => {
            // Check if user is at bottom (within 100px threshold)
            const scrollBottom = chatContainer.scrollHeight - chatContainer.scrollTop;
            const containerHeight = chatContainer.clientHeight;
            const isAtBottom = scrollBottom <= containerHeight + 100;
            isUserAtBottomRef.current = isAtBottom;
        };

        chatContainer.addEventListener('scroll', handleScroll);
        handleScroll(); // Check initial position
        
        return () => {
            chatContainer.removeEventListener('scroll', handleScroll);
        };
    }, []); // Only setup once
    
    // Auto-scroll effect (separate from scroll tracking)
    useEffect(() => {
        // CRITICAL: Only auto-scroll when a NEW message is added (length increased)
        // Don't scroll on every message change (e.g., updates, edits, etc.)
        const currentLength = messages.length;
        const prevLength = prevMessagesLengthRef.current;
        const isNewMessage = currentLength > prevLength;
        
        // Update ref for next comparison
        prevMessagesLengthRef.current = currentLength;
        
        // Only auto-scroll if:
        // 1. A new message was added (not just updated)
        // 2. User is at bottom (hasn't scrolled up)
        if (isNewMessage && isUserAtBottomRef.current) {
            // Small delay to ensure DOM is updated
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [messages]);

    // Render welcome message with enhanced UX
    const renderWelcomeMessage = () => {
        if (messages.length > 0) return null;

            return (
            <div className="welcome-message">
                <div className="welcome-content">
                    <Title level={2}>
                        <AiserAIIcon size={28} />
                        Welcome to Aicser AI
                    </Title>
                    <Paragraph style={{ fontSize: '16px', color: 'var(--ant-color-text-secondary)', marginBottom: 24 }}>
                        Your AI-powered data companion. Ask questions about your data and get instant insights, charts, and recommendations.
                        </Paragraph>
                    
                    <div className="data-source-status">
                        {props.selectedDataSource && props.selectedDataSource.name && props.selectedDataSource.type ? (
                            <Alert
                                message={`Connected: ${props.selectedDataSource.name || 'Unknown'}`}
                                description={`Type: ${props.selectedDataSource.type || 'Unknown'} • Ready for analysis`}
                                type="success"
                                showIcon
                                icon={<DatabaseOutlined />}
                                style={{ marginBottom: 16 }}
                                action={
                                    <Button 
                                        size="small" 
                                        onClick={() => setShowDataSourceModal(true)}
                                    >
                                        Change
                                    </Button>
                                }
                            />
                        ) : (
                            <Alert
                                message="No data source connected"
                                description="Connect a data source to get started with AI analysis"
                                type="info"
                                showIcon
                                icon={<DatabaseOutlined />}
                                action={
                                    <Button 
                                        size="small" 
                                        type="primary"
                                        onClick={() => setShowDataSourceModal(true)}
                                    >
                                        Connect Now
                                    </Button>
                                }
                                style={{ marginBottom: 16 }}
                            />
                        )}
                    </div>

                    <div className="suggested-questions">
                        <Title level={4}>
                            <BulbOutlined style={{ marginRight: 8, color: 'var(--ant-color-warning)' }} />
                            Try asking:
                        </Title>
                        <div className="suggestions-compact">
                            {[
                                { text: "📈 Sales trends", query: "Show me sales trends for the last quarter" },
                                { text: "🏆 Top products", query: "What are the top performing products?" },
                                { text: "📊 Customer insights", query: "Create a dashboard with customer insights" },
                                { text: "🔍 Revenue analysis", query: "Analyze revenue by region" },
                                { text: "💡 Data insights", query: "What insights can you provide about our data?" },
                                { text: "📈 Growth chart", query: "Generate a chart showing monthly growth" }
                            ].map((suggestion, index) => (
                                    <Button
                                    key={index}
                                    type="text" 
                                        size="small"
                                    onClick={() => handleSuggestionClick(suggestion.query)}
                                    className="suggestion-compact"
                                >
                                    {suggestion.text}
                                    </Button>
                            ))}
                        </div>
                        </div>
                    </div>
                </div>
            );
    };

    return (
        <div className="chat-panel">
            <div className="chat-header">
                <div className="chat-title">
                    <MessageOutlined className="chat-icon" />
                    <span className="chat-title-text">Aicser AI Chat</span>
                            </div>
                <div className="chat-actions">
                    <Space size={8}>
                        <SessionHistoryDropdown
                            currentConversationId={props.conversationId}
                            onSelectConversation={(conversation) => {
                                props.onSelectConversation?.(conversation);
                            }}
                            onNewConversation={() => {
                                props.onNewConversation?.();
                            }}
                            onConversationDeleted={() => {
                                props.onConversationDeleted?.();
                            }}
                        />
                        <AssetLibraryDropdown
                            conversationId={props.conversationId}
                            onSelectAsset={(asset) => {
                                // Handle asset selection - could insert into conversation or show details
                                antMessage.info(`Selected asset: ${asset.title}`);
                            }}
                        />
                    </Space>
                </div>
            </div>

            {/* Removed redundant auth alert - auth check happens in handleSendMessage and ProtectRoute handles redirects */}

            {/* Inline Mode Selector - moved into input area for compact layout */}

            <div className="chat-messages" ref={chatMessagesRef}>
                {renderWelcomeMessage()}
                {renderMessages()}
                {isLoading && (
                    <div className="loading-message">
                        <Spin size="small" />
                        <span style={{ marginLeft: 8 }}>{CHAT_LOADING_MESSAGE}</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input">
                <div 
                    className="input-container"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    style={{
                        border: isDragging ? '2px dashed var(--ant-color-primary)' : undefined,
                        backgroundColor: isDragging ? 'var(--ant-color-primary-bg)' : undefined,
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        minHeight: 'auto',
                        height: 'auto',
                        alignItems: 'stretch'
                    }}
                >
                    {/* File preview - compact, at top */}
                    {selectedFile && filePreviewVisible && (
                        <div style={{
                            padding: '6px 10px',
                            background: 'var(--ant-color-fill-tertiary)',
                            borderRadius: '6px',
                            border: '1px solid var(--ant-color-border)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            flexShrink: 0,
                            width: 'fit-content',
                            maxWidth: 'calc(100% - 16px)',
                            alignSelf: 'flex-start',
                            marginBottom: '4px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                <PaperClipOutlined style={{ fontSize: '14px', color: 'var(--ant-color-primary)', flexShrink: 0 }} />
                                <div style={{ flexShrink: 0, minWidth: 0, maxWidth: '280px', overflow: 'hidden' }}>
                                    <div style={{ 
                                        fontWeight: 500, 
                                        fontSize: '13px', 
                                        lineHeight: '1.4',
                                        color: 'var(--ant-color-text)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {selectedFile.name}
                                    </div>
                                    <div style={{ 
                                        fontSize: '12px', 
                                        lineHeight: '1.4',
                                        color: 'var(--ant-color-text-secondary)', 
                                        marginTop: '2px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                    </div>
                                </div>
                            </div>
                            <Button
                                type="text"
                                size="small"
                                icon={<CloseOutlined />}
                                onClick={handleFileRemove}
                                disabled={uploadingFile}
                                style={{ padding: '0 4px', minWidth: '24px', height: '24px', flexShrink: 0 }}
                            />
                        </div>
                    )}
                    {isDragging && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(24, 144, 255, 0.1)',
                            borderRadius: '8px',
                            zIndex: 10,
                            pointerEvents: 'none'
                        }}>
                            <div style={{
                                textAlign: 'center',
                                color: 'var(--ant-color-primary)',
                                fontWeight: 600,
                                fontSize: '14px'
                            }}>
                                📎 Drop file here to analyze
                            </div>
                        </div>
                    )}
                    {/* Input row: TextArea + Attachment + Send button on same line */}
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'flex-end', 
                        gap: '6px',
                        width: '100%'
                    }}>
                        <TextArea
                            ref={textareaRef}
                            value={prompt}
                            onChange={handleTyping}
                            onKeyPress={handleKeyPress}
                            onKeyDown={handleKeyDown}
                            placeholder={selectedFile && filePreviewVisible ? 
                                `Analysis prompt is ready. Click Send to upload and analyze "${selectedFile.name}"...` :
                                (props.selectedDataSource ? 
                                    `Ask me anything about ${props.selectedDataSource.name}...` : 
                                    "Ask me anything about your data...")
                            }
                            autoSize={{ minRows: 1, maxRows: 8 }}
                            disabled={authGuardActive || isLoading || uploadingFile}
                            className="resizable-textarea"
                            style={{ 
                                resize: 'vertical',
                                fontSize: '14px',
                                lineHeight: '1.4',
                                minHeight: '36px',
                                maxHeight: '200px',
                                flex: 1,
                                padding: '8px 12px',
                                margin: 0
                            }}
                        />
                        {/* Attachment icon and Send button on same line */}
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            flexShrink: 0,
                            paddingBottom: '2px'
                        }}>
                            <Tooltip title={uploadingFile ? `Uploading... ${uploadProgress}%` : "Upload file for analysis"}>
                                <div
                                    onClick={() => !uploadingFile && !authGuardActive && !isLoading && fileInputRef.current?.click()}
                                    style={{ 
                                        height: '32px',
                                        width: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '6px',
                                        cursor: (uploadingFile || authGuardActive || isLoading) ? 'not-allowed' : 'pointer',
                                        color: uploadingFile ? 'var(--ant-color-primary)' : 'var(--ant-color-text-secondary)',
                                        opacity: (uploadingFile || authGuardActive || isLoading) ? 0.5 : 1,
                                        transition: 'all 0.2s ease',
                                        fontSize: '14px'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!uploadingFile && !authGuardActive && !isLoading) {
                                            e.currentTarget.style.color = 'var(--ant-color-primary)';
                                            e.currentTarget.style.background = 'var(--ant-color-fill-tertiary)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = uploadingFile ? 'var(--ant-color-primary)' : 'var(--ant-color-text-secondary)';
                                        e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    {uploadingFile ? (
                                        <Spin size="small" />
                                    ) : (
                                        <PaperClipOutlined style={{ fontSize: '14px' }} />
                                    )}
                                </div>
                            </Tooltip>
                            <Button
                                type={isLoading ? "default" : "primary"}
                                icon={isLoading ? <StopOutlined /> : <SendOutlined />}
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (isLoading) {
                                        handleStopRequest();
                                    } else {
                                        handleSendMessage();
                                    }
                                }}
                                disabled={authGuardActive || uploadingFile || (!prompt.trim() && !selectedFile)}
                                danger={isLoading}
                                style={{
                                    height: '32px',
                                    minWidth: '80px',
                                    padding: '0 12px',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: 500
                                }}
                            >
                                {isLoading ? 'Stop' : 'Send'}
                            </Button>
                        </div>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls,.json,.parquet"
                        style={{ display: 'none' }}
                        onChange={handleFileInputChange}
                    />
                    {uploadingFile && uploadProgress > 0 && (
                        <div style={{
                            position: 'absolute',
                            bottom: '-24px',
                            left: '8px',
                            right: '8px',
                            fontSize: '11px',
                            color: 'var(--ant-color-text-secondary)'
                        }}>
                            <Progress 
                                percent={uploadProgress} 
                                size="small" 
                                showInfo={false}
                                strokeColor="var(--ant-color-primary)"
                            />
                            <span style={{ marginLeft: '6px' }}>{uploadProgress}%</span>
                        </div>
                    )}
                </div>
                {/* Controls below the input: Mode selector and AI model selector (left aligned) */}
                <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginTop: 8, gap: 12 }}>
                    <InlineModeSelector
                        currentMode={currentMode}
                        onModeChange={(mode: string) => {
                            setCurrentMode(mode);
                            props.onModeChange?.(mode);
                        }}
                        currentModel={currentModel}
                        onModelChange={(model: string) => {
                            setCurrentModel(model);
                            props.onModelChange?.(model);
                        }}
                        availableModels={availableModels}
                        isCompact={true}
                        hideModelSelector={true} /* hide duplicate model control here */
                    />

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <ModelSelector
                        compact
                        onModelChange={async (id: string) => {
                            try {
                                setCurrentModel(id);
                                props.onModelChange?.(id);
                                // Persist user preference to appearance settings
                                await fetch('/api/users/preferences/ai-model', {
                                    method: 'PUT',
                                    credentials: 'include',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        // Rely on cookies for auth (more secure) - use getSecureAuthHeaders if needed
                                    },
                                    body: JSON.stringify({ ai_model: id })
                                });
                            } catch (e) {
                                console.warn('Failed to persist ai_model preference', e);
                            }
                        }}
                    />
                    <Tooltip title={streamingEnabled ? "Real-time progress updates enabled" : "Real-time progress updates disabled"}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '12px', color: 'var(--ant-color-text-secondary)' }}>Streaming</span>
                            <Switch
                                size="small"
                                checked={streamingEnabled}
                                onChange={(checked) => {
                                    setStreamingEnabled(checked);
                                    setStreamingEnabledState(checked);
                                    antMessage.info(`Real-time progress updates ${checked ? 'enabled' : 'disabled'}`);
                                }}
                            />
                        </div>
                    </Tooltip>
                    {props.selectedDataSource ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: '16px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--ant-color-text-secondary)' }}>
                                Connected:
                            </span>
                            <Tag color="blue" style={{ margin: 0 }}>
                                {props.selectedDataSource.name}
                            </Tag>
                                <Button
                            type="link" 
                            size="small" 
                            onClick={() => setShowDataSourceModal(true)}
                                style={{ padding: '0 4px', height: 'auto', fontSize: '11px' }}
                        >
                            Change
                                </Button>
                    </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: '16px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--ant-color-text-secondary)' }}>
                                Connected:
                            </span>
                            <Tag color="default" style={{ margin: 0, opacity: 0.6 }}>
                                None
                            </Tag>
                            <Button
                                type="link"
                                size="small"
                                onClick={() => setShowDataSourceModal(true)}
                                style={{ padding: '0 4px', height: 'auto', fontSize: '11px' }}
                            >
                                Connect
                                </Button>
                    </div>
                )}
                    </div>
                </div>
            </div>
                        
            {/* Data Source Modal */}
            <UniversalDataSourceModal
                isOpen={showDataSourceModal}
                onClose={() => setShowDataSourceModal(false)}
                onDataSourceCreated={(dataSource: any) => {
                    console.log('Created data source:', dataSource);
                    setShowDataSourceModal(false);
                }}
            />
            <UpgradeModal />
        </div>
    );
};

export default ChatPanel;